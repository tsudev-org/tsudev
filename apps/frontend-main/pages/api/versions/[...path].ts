import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { NextApiRequest, NextApiResponse } from 'next';

import { CONTENT, edgeHeaders, internalHeaders } from '../../../lib/services';

/**
 * INT1-a - bản kê phiên bản có chữ ký (tsudev-standards APP_INTEGRITY 2.1).
 *
 * `next.config.js` rewrite `/.well-known/tsudev/<tệp>` về đây:
 *   GET  versions.json | versions.json.sig | versions-jwks.json  → content-service
 *   POST raise/<sản phẩm>/<kênh>  (pipeline, header `x-versions-token`)
 *        → content-service `POST /api/pipeline/versions/<sản phẩm>/<kênh>`
 *
 * Chữ ký phủ ĐÚNG các byte của versions.json, nên ở đây chuyển BYTE NGUYÊN VĂN - không
 * parse/serialize lại. `.json` và `.sig` được lấy THEO CẶP và đệm cùng nhau trong isolate:
 * phục vụ hai nửa từ hai lần dựng khác nhau là app thấy "chữ ký sai" và bỏ bản kê.
 * Upstream hỏng ⇒ phục vụ cặp cũ (app tự bỏ khi quá `expires_at`), giống lib/oidcPublicCache.
 *
 * VS1 mục 4 (CP4): bộ nhớ isolate mất khi isolate mới khởi động đúng lúc backend ngủ ⇒ 503. Cặp tốt gần nhất
 * nay được ghi BỀN vào R2 (`NEXT_INC_CACHE_R2_BUCKET`, khoá riêng ngoài tiền tố của OpenNext) MỖI KHI cặp đổi,
 * và đọc lại từ đó khi upstream hỏng mà isolate còn rỗng. Cặp được ghi thành MỘT đối tượng để hai nửa không
 * bao giờ lệch nhau.
 */
const FRESH_MS = 5 * 60_000;
const FILES = new Set(['versions.json', 'versions.json.sig', 'versions-jwks.json']);
const PRODUCT_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
const CHANNEL_RE = /^[a-z][a-z0-9-]{1,23}$/;

type Pair = { body: Buffer; sig: Buffer; at: number };
let pair: Pair | null = null;
let jwks: { body: Buffer; at: number } | null = null;

export const DURABLE_KEY = 'tsudev-durable/versions-pair.json';

type R2Like = {
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  put(key: string, value: string, opts?: unknown): Promise<unknown>;
};

function durableBucket(): R2Like | null {
  try {
    return (
      (getCloudflareContext().env as { NEXT_INC_CACHE_R2_BUCKET?: R2Like })
        .NEXT_INC_CACHE_R2_BUCKET ?? null
    );
  } catch {
    return null; // next dev / test không có binding
  }
}

/** Chữ ký của cặp đã ghi bền gần nhất trong isolate này - chỉ ghi lại khi cặp đổi. */
let persistedSig: string | null = null;

async function persistPair(p: Pair): Promise<void> {
  const sig = p.sig.toString('base64');
  if (sig === persistedSig) return;
  const bucket = durableBucket();
  if (!bucket) return;
  try {
    await bucket.put(
      DURABLE_KEY,
      JSON.stringify({ body: p.body.toString('base64'), sig, at: p.at }),
      { httpMetadata: { contentType: 'application/json' } }
    );
    persistedSig = sig;
  } catch {
    // ghi bền hỏng không được làm hỏng lượt phục vụ
  }
}

async function loadDurablePair(): Promise<Pair | null> {
  const bucket = durableBucket();
  if (!bucket) return null;
  try {
    const obj = await bucket.get(DURABLE_KEY);
    if (!obj) return null;
    const d = JSON.parse(await obj.text()) as { body?: string; sig?: string; at?: number };
    if (typeof d.body !== 'string' || typeof d.sig !== 'string' || typeof d.at !== 'number')
      return null;
    persistedSig = d.sig;
    return { body: Buffer.from(d.body, 'base64'), sig: Buffer.from(d.sig, 'base64'), at: d.at };
  } catch {
    return null;
  }
}

async function fetchBytes(file: string): Promise<Buffer> {
  const url = `${CONTENT}/.well-known/tsudev/${file}`;
  const r = await fetch(url, { headers: edgeHeaders('GET', url) });
  if (r.status !== 200) throw new Error(`upstream ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function getPair(now: number): Promise<Pair | null> {
  if (pair && now - pair.at < FRESH_MS) return pair;
  try {
    // Lấy `.json` rồi `.sig`, kiểm lại `.json` không đổi giữa hai lượt (dựng lại đúng lúc đó).
    for (let i = 0; i < 2; i++) {
      const body = await fetchBytes('versions.json');
      const sig = await fetchBytes('versions.json.sig');
      const again = await fetchBytes('versions.json');
      if (again.equals(body)) {
        pair = { body, sig, at: now };
        await persistPair(pair);
        return pair;
      }
    }
  } catch {
    // rơi xuống bản cũ
  }
  if (pair) return pair;
  // Isolate mới + upstream hỏng: lấy cặp bền. Giữ `at` cũ để lượt sau vẫn thử upstream trước.
  pair = await loadDurablePair();
  return pair;
}

/** Chỉ cho test. */
export function _clearVersionsCache() {
  pair = null;
  jwks = null;
  persistedSig = null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const segs = ([] as string[]).concat(req.query.path ?? []);

  if (req.method === 'GET' && segs.length === 1 && FILES.has(segs[0]!)) {
    const file = segs[0]!;
    const now = Date.now();
    if (file === 'versions-jwks.json') {
      if (!jwks || now - jwks.at > FRESH_MS) {
        try {
          jwks = { body: await fetchBytes(file), at: now };
        } catch {
          if (!jwks) return res.status(503).json({ error: 'versions_unavailable' });
        }
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(jwks.body);
    }
    const p = await getPair(now);
    if (!p) {
      res.setHeader('Retry-After', '300');
      return res.status(503).json({ error: 'versions_unavailable' });
    }
    res.setHeader('Content-Type', file === 'versions.json' ? 'application/json' : 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(file === 'versions.json' ? p.body : p.sig);
  }

  if (req.method === 'POST' && segs.length === 3 && segs[0] === 'raise') {
    const [, product, channel] = segs as [string, string, string];
    if (!PRODUCT_RE.test(product) || !CHANNEL_RE.test(channel)) {
      return res.status(400).json({ error: 'invalid_target' });
    }
    const token = req.headers['x-versions-token'];
    if (typeof token !== 'string' || !token) {
      return res.status(401).json({ error: 'invalid_versions_token' });
    }
    try {
      const r = await fetch(`${CONTENT}/api/pipeline/versions/${product}/${channel}`, {
        method: 'POST',
        headers: {
          ...internalHeaders('POST', `${CONTENT}/api/pipeline/versions/${product}/${channel}`),
          'Content-Type': 'application/json',
          'x-versions-token': token,
        },
        body: JSON.stringify({ latest: req.body?.latest, url: req.body?.url }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 200) pair = null; // lượt đọc kế tiếp lấy bản kê mới
      return res.status(r.status).json(data);
    } catch {
      return res.status(502).json({ error: 'upstream_unavailable' });
    }
  }

  return res.status(404).json({ error: 'not_found' });
}
