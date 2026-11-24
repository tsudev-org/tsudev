// Proxy đăng nhập QR (CROSS_DEVICE_LOGIN) tới auth-service `/api/identity/xd/*`.
//
// Hai nhóm, khai TÁCH BẠCH như hai proxy identity/account: thiết bị MỚI (chưa đăng nhập) và thiết bị XÁC NHẬN (bắt
// buộc phiên, ký khẳng định danh tính). `redeem` KHÔNG có ở đây - chỉ NextAuth phía máy chủ gọi.
import type { NextApiRequest, NextApiResponse } from 'next';

import { clientIp } from '../../../lib/clientIp';
import { XD_POLL_COOKIE, XD_TICKET_COOKIE, readCookie, xdCookie } from '../../../lib/crossDevice';
import { proxyEntitlement } from '../../../lib/entitlementProxy';
import { catchAllSegments, identityHeaders } from '../../../lib/identity';
import { IDENTITY, internalHeaders } from '../../../lib/services';
import { readSessionToken } from '../../../lib/sessionCookie';

const REQUESTER = ['create-pull', 'claim', 'status', 'verify'] as const;
const APPROVER = ['create-push', 'scan', 'peek', 'approve', 'deny'] as const;
type Action = (typeof REQUESTER)[number] | (typeof APPROVER)[number];
const isApprover = (a: Action) => (APPROVER as readonly string[]).includes(a);
/** Hành động app gọi bằng access token OIDC (CROSS_DEVICE_LOGIN mục 1, QR2b). */
const APP_APPROVER = ['scan', 'approve', 'deny'] as const;

function callerHeaders(req: NextApiRequest): Record<string, string> {
  const ip = clientIp(req.headers, req.socket?.remoteAddress);
  const cc = req.headers['cf-ipcountry'];
  const country = (Array.isArray(cc) ? cc[0] : cc)?.trim() || '';
  const ua = String(req.headers['user-agent'] || '').slice(0, 400);
  return {
    ...(ip ? { 'x-forwarded-for': ip } : {}),
    ...(country ? { 'cf-ipcountry': country } : {}),
    ...(ua ? { 'user-agent': ua } : {}),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  }
  const parts = catchAllSegments(req.query.path);
  // Tên hành động đi vào URL gọi xuống lấy từ HẰNG trong mã, không từ chuỗi người gửi (chống SSRF/CodeQL
  // js/request-forgery): tìm phần tử khớp trong danh sách trắng rồi dùng chính phần tử đó.
  const action: Action | undefined =
    parts.length === 1 ? [...REQUESTER, ...APPROVER].find((a) => a === parts[0]) : undefined;
  if (!action) return res.status(404).json({ error: 'Không tìm thấy' });

  // QR2b: app đã đăng nhập (vai xác nhận Đ2) gửi access token OIDC scope `tsudev.xd` thay cho cookie phiên. Trình
  // duyệt khác origin không tự gắn được header `Authorization` (CORS) ⇒ nhánh này không mở đường CSRF. Chuyển tới
  // `/ent/xd/*` của auth-service, KHÔNG kèm cookie hay INTERNAL_API_TOKEN - service tự kiểm token.
  const authz = req.headers.authorization;
  if (typeof authz === 'string' && /^Bearer\s/.test(authz)) {
    const appAction = APP_APPROVER.find((a) => a === action);
    if (!appAction) return res.status(404).json({ error: 'Không tìm thấy' });
    return proxyEntitlement(req, res, `/ent/xd/${appAction}`, 'POST');
  }

  const input = (req.body || {}) as Record<string, unknown>;
  const body: Record<string, unknown> = {
    id: typeof input.id === 'string' ? input.id.slice(0, 40) : undefined,
    k: typeof input.k === 'string' ? input.k.slice(0, 80) : undefined,
    code: typeof input.code === 'string' ? input.code.slice(0, 20) : undefined,
  };
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...internalHeaders(),
    ...callerHeaders(req),
  };

  if (isApprover(action)) {
    const token = await readSessionToken(req);
    if (!token) return res.status(401).json({ error: 'unauthenticated' });
    headers = { ...headers, ...(await identityHeaders(token)) };
  } else if (action === 'status' || action === 'verify') {
    body.poll = readCookie(req.headers.cookie, XD_POLL_COOKIE);
  }

  try {
    const upstream = await fetch(`${IDENTITY}/api/identity/xd/${action}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
    if (upstream.ok && typeof data.poll === 'string') {
      res.setHeader('Set-Cookie', xdCookie(XD_POLL_COOKIE, data.poll, '/api/xd', 600));
      delete data.poll;
    }
    if (upstream.ok && action === 'verify' && typeof data.ticket === 'string') {
      res.setHeader('Set-Cookie', [
        xdCookie(XD_TICKET_COOKIE, data.ticket, '/api/auth', 60),
        xdCookie(XD_POLL_COOKIE, '', '/api/xd', 0),
      ]);
      return res.status(200).json({ ok: true });
    }
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ error: 'Không kết nối được dịch vụ xác thực' });
  }
}
