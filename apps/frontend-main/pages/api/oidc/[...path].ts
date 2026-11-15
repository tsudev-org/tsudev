import type { NextApiRequest, NextApiResponse } from 'next';

import { IDENTITY } from '../../../lib/services';
import { upstreamPath } from '../../../lib/identity';

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

const PASS_REQ = ['content-type', 'accept', 'authorization', 'cookie', 'user-agent', 'dpop'];
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
  const headers: Record<string, string> = { 'x-forwarded-proto': 'https' };
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
  try {
    const up = await fetch(`${IDENTITY}/oidc/${path}${qs}`, {
      method: req.method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
      redirect: 'manual',
    });
    for (const h of PASS_RES) {
      const v = up.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    const cookies = up.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    res.status(up.status).send(Buffer.from(await up.arrayBuffer()));
  } catch {
    res.status(502).json({ error: 'Không kết nối được dịch vụ đăng nhập' });
  }
}
