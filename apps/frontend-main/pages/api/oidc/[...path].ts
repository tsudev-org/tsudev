import type { NextApiRequest, NextApiResponse } from 'next';

import { MAIN_URL } from '@tsudev/ui';

import { IDENTITY, edgeHeaders } from '../../../lib/services';
import { upstreamPath } from '../../../lib/identity';
import {
  CACHEABLE_PATHS,
  getCached,
  isTransientUpstream,
  putCached,
} from '../../../lib/oidcPublicCache';

/**
 * P4 OIDC: `https://tsudev.com/oidc/*` (issuer) → auth-service `/oidc/*` trên Render.
 * `next.config.js` rewrite NỘI BỘ `/oidc/:path*` về đây; địa chỉ service đọc LÚC CHẠY
 * (lib/services) - KHÔNG rewrite ra URL ngoài trong next.config, vì biến đó lúc build
 * trên máy dev là địa chỉ local (CLAUDE.md: giá trị dev lọt vào bản production).
 *
 * Trong suốt với giao thức: giữ nguyên phương thức, thân request THÔ (token endpoint
 * nhận form-urlencoded - bodyParser của Next sẽ phá nó), cookie của provider, mọi
 * Set-Cookie, Location, mã trạng thái. `/oidc/interaction/*` KHÔNG tới đây: đó là
 * trang đồng ý của Next (`pages/oidc/interaction`).
 */
export const config = { api: { bodyParser: false } };

const ISSUER_HOST = new URL(MAIN_URL).host;

// `x-tsu-app`: INT1-b - cổng phiên bản của userinfo (`/oidc/me`) ở auth-service.
const PASS_REQ = [
  'content-type',
  'accept',
  'authorization',
  'cookie',
  'user-agent',
  'dpop',
  'x-tsu-app',
];
const PASS_RES = [
  'content-type',
  'location',
  'cache-control',
  'pragma',
  'www-authenticate',
  'access-control-allow-origin',
  'dpop-nonce',
];

async function rawBody(req: NextApiRequest): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    // Trần 64 KB: thân request OIDC hợp lệ chỉ vài trăm byte.
    if (size > 64 * 1024) throw new Error('quá lớn');
    chunks.push(c as Buffer);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Cùng bộ kiểm đường dẫn với mọi proxy khác (chặn `..`, đoạn mã hoá lạ).
  const path = upstreamPath(req.query.path);
  if (!path) return res.status(400).json({ error: 'Đường dẫn không hợp lệ' });
  const qs = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  // `oidc-provider` (proxy = true) dựng MỌI URL tuyệt đối trong discovery + chuyển hướng từ X-Forwarded-Host/Proto.
  // Thiếu host ⇒ nó dùng host của Render: discovery công bố `tsudev-backend.onrender.com/oidc/auth`, trình duyệt
  // rời tsudev.com, và đường tương đối `/oidc/interaction/<uid>` (trang đồng ý của Next) mở trên Render - nơi
  // không có trang đó (đo 17/11/2026, phiếu 20261117-SD1). Host lấy từ CẤU HÌNH, không từ request: người gọi
  // không giả được tên miền in vào discovery.
  const headers: Record<string, string> = {
    'x-forwarded-proto': 'https',
    'x-forwarded-host': ISSUER_HOST,
  };
  for (const h of PASS_REQ) {
    const v = req.headers[h];
    if (typeof v === 'string') headers[h] = v;
  }
  let body: Buffer | undefined;
  try {
    body = await rawBody(req);
  } catch {
    return res.status(413).json({ error: 'Thân request quá lớn' });
  }
  // Discovery + JWKS: phục vụ từ bộ đệm isolate khi còn mới (lib/oidcPublicCache.ts).
  const cacheable = req.method === 'GET' && !qs && CACHEABLE_PATHS.has(path);
  const hit = cacheable ? getCached(path) : null;
  const sendCached = (doc: { contentType: string; body: Uint8Array }) => {
    res.setHeader('content-type', doc.contentType);
    res.setHeader('cache-control', 'public, max-age=300');
    // Như oidc-provider: hai tài liệu công khai này đọc được từ mọi origin (RP web).
    res.setHeader('access-control-allow-origin', '*');
    return res.status(200).send(Buffer.from(doc.body));
  };
  if (hit?.fresh) return sendCached(hit.doc);
  try {
    const url = `${IDENTITY}/oidc/${path}${qs}`;
    const up = await fetch(url, {
      method: req.method,
      // CP1: chữ ký biên, KHÔNG kèm INTERNAL_API_TOKEN (người gọi là RP/app, không phải BFF).
      headers: { ...headers, ...edgeHeaders(req.method || 'GET', url) },
      body: body ? new Uint8Array(body) : undefined,
      redirect: 'manual',
    });
    if (isTransientUpstream(up.status)) {
      // Lớp Cloudflare trước Render trả 429 + trang HTML "Just a moment..." - KHÔNG chuyển nguyên
      // văn cho RP (họ nhận HTML ở chỗ chờ JSON). Có bản cũ thì phục vụ; không thì 503 + Retry-After.
      if (hit) return sendCached(hit.doc);
      console.error(`[oidc] upstream ${up.status} cho /oidc/${path}`);
      res.setHeader('Retry-After', '30');
      res.setHeader('cache-control', 'no-store');
      return res.status(503).json({
        error: 'temporarily_unavailable',
        error_description: 'Dịch vụ đăng nhập tạm bận, thử lại sau.',
      });
    }
    for (const h of PASS_RES) {
      const v = up.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    const cookies = up.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    const buf = new Uint8Array(await up.arrayBuffer());
    if (cacheable && up.status === 200) putCached(path, up.headers.get('content-type') || '', buf);
    res.status(up.status).send(Buffer.from(buf));
  } catch {
    if (hit) return sendCached(hit.doc);
    res.status(502).json({ error: 'Không kết nối được dịch vụ đăng nhập' });
  }
}
