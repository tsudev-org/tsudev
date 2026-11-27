import type { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../../../frontend-main/pages/api/auth/[...nextauth]';
import { viaMain } from '../../../frontend-main/lib/oauthBridge';
import { listIdpProviders } from '../../../frontend-main/lib/idpProviders';
import { usernameFromToken } from '../../../frontend-main/lib/identity';
import {
  createLinkIntent,
  linkIntentCookie,
  stepUpShapeOk,
} from '../../../frontend-main/lib/linkIntent';
import { readSessionToken } from '../../../frontend-main/lib/sessionCookie';

/**
 * POST /api/account-link { provider } - đặt cookie ý định liên kết (lib/linkIntent.ts) rồi
 * trang gọi `startOAuth(provider)` (cầu OAuth ở tsudev.com trong CP4a). Chỉ nhà cung cấp IdP đang bật; đòi phiên.
 * DELETE /api/account-link - xoá cookie đó.
 */
const COOKIE_DOMAIN = process.env.NEXTAUTH_COOKIE_DOMAIN || process.env.COOKIE_DOMAIN || undefined;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secure = (process.env.NEXTAUTH_URL || '').startsWith('https://');
  // DELETE: trang Bảo mật dọn cookie ý định khi quay về từ nhà cung cấp (dùng một lần).
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', linkIntentCookie('', secure, 0, COOKIE_DOMAIN));
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  }
  // JSON bắt buộc: form HTML từ trang lạ không gửi được application/json mà không preflight.
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    return res.status(415).json({ error: 'Cần application/json' });
  }
  const token = await readSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Bạn cần đăng nhập' });
  const provider = typeof req.body?.provider === 'string' ? req.body.provider : '';
  if (
    !viaMain(provider) &&
    !listIdpProviders(authOptions.providers).some((p) => p.id === provider)
  ) {
    return res.status(400).json({ error: 'Nhà cung cấp không được hỗ trợ' });
  }
  const secret = process.env.NEXTAUTH_SECRET || '';
  if (!secret) return res.status(503).json({ error: 'Máy chủ chưa cấu hình phiên' });
  // ACC1: token step-up (từ POST /api/account/oauth/link-check) đi kèm cookie; auth-service
  // kiểm lại ở chặng liên kết. Sai hình dạng ⇒ 400 (không đặt cookie).
  const stepUp = typeof req.body?.stepUp === 'string' ? req.body.stepUp : '';
  if (!stepUpShapeOk(stepUp))
    return res.status(400).json({ error: 'Token xác thực lại không hợp lệ' });
  const value = await createLinkIntent(secret, provider, usernameFromToken(token), stepUp);
  res.setHeader('Set-Cookie', linkIntentCookie(value, secure, undefined, COOKIE_DOMAIN));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true });
}
