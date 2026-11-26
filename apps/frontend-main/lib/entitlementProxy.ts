import type { NextApiRequest, NextApiResponse } from 'next';

import { clientIp } from './clientIp';
import { IDENTITY, edgeHeaders } from './services';

/**
 * PRO-B (ADR-0002): proxy CÔNG KHAI tới máy chủ quyền lợi của auth-service (`/ent/*`).
 *
 *   GET /api/me/entitlements          → /ent/me       (access token OIDC, scope tsudev.entitlements)
 *   GET /api/rp/entitlements/{sub}    → /ent/rp/{sub} (private_key_jwt của máy chủ RP)
 *   POST /api/rp/entitlements/status  → /ent/status   (PRO2: kênh trạng thái, ADR-0004)
 *   POST /api/rp/entitlements/play    → /ent/play     (B2: biên nhận Google Play, phiếu QT5)
 *   POST /api/xd/scan|approve|deny    → /ent/xd/*     (QR2b: app xác nhận đăng nhập QR, kèm Bearer)
 *
 * Service tự xác thực từng request - proxy chỉ chuyển ĐÚNG các header cần, không kèm
 * cookie phiên tsudev và không kèm INTERNAL_API_TOKEN (người gọi không phải BFF).
 * IP thật lấy từ CF-Connecting-IP (lib/clientIp.ts) cho giới hạn tần suất của service.
 */
// `cf-ipcountry` do Cloudflare đặt - đăng nhập QR so quốc gia hai thiết bị (CROSS_DEVICE_LOGIN T1).
const PASS_REQ = [
  'authorization',
  'dpop',
  'x-tsu-installation',
  'x-tsu-platform',
  'user-agent',
  'cf-ipcountry',
  // INT1-b: cổng phiên bản ở auth-service (400/426) - thiếu dòng này thì MỌI app bị coi như không gửi header.
  'x-tsu-app',
];

export async function proxyEntitlement(
  req: NextApiRequest,
  res: NextApiResponse,
  upstream: string,
  method: 'GET' | 'POST' = 'GET'
): Promise<void> {
  if (req.method !== method) {
    res.setHeader('Allow', method);
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const headers: Record<string, string> = {};
  for (const h of PASS_REQ) {
    const v = req.headers[h];
    if (typeof v === 'string' && v.length <= 4096) headers[h] = v;
  }
  const ip = clientIp(req.headers, req.socket?.remoteAddress);
  if (ip) headers['x-forwarded-for'] = ip;
  res.setHeader('Cache-Control', 'no-store');
  try {
    // POST: thân JSON đã được Next đọc (giới hạn mặc định 1 MB); gửi lại đúng đối tượng đó.
    if (method === 'POST') headers['content-type'] = 'application/json';
    const url = `${IDENTITY}${upstream}`;
    const up = await fetch(url, {
      method,
      // CP1: chữ ký biên - không kèm INTERNAL_API_TOKEN (người gọi không phải BFF).
      headers: { ...headers, ...edgeHeaders(method, url) },
      redirect: 'manual',
      ...(method === 'POST' ? { body: JSON.stringify(req.body ?? {}) } : {}),
    });
    const ct = up.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    const ra = up.headers.get('retry-after');
    if (ra) res.setHeader('Retry-After', ra);
    res.status(up.status).send(Buffer.from(await up.arrayBuffer()));
  } catch {
    res.status(502).json({ error: 'entitlements_unavailable' });
  }
}
