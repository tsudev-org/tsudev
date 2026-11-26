/**
 * Nối BFF của console tới backend (CP2). Dùng lại địa chỉ + chữ ký biên của `tsudev.com` (một nguồn, `topology:check`
 * canh) nhưng KÝ KHẲNG ĐỊNH DANH TÍNH Ở VÙNG `console` bằng bí mật riêng `INTERNAL_IDENTITY_SECRET_CONSOLE`.
 *
 * Worker này đặt `EDGE_SIGNING_KEY` = khoá biên RIÊNG của console (backend nhận nó qua `EDGE_SIGNING_KEY_CONSOLE`).
 */
import type { JWT } from 'next-auth/jwt';

import {
  ACCESS_FORWARD_HEADER,
  ACCESS_HEADER,
  MIN_SECRET_LEN,
  ZONE_SECRET_ENV,
  readSecret,
  signIdentity,
} from '@tsudev/identity-token';

import { roleFromToken, usernameFromToken } from '../../frontend-main/lib/identity';

export { IDENTITY, internalHeaders } from '../../frontend-main/lib/services';
export { readSessionToken } from '../../frontend-main/lib/sessionCookie';
export { catchAllSegments, queryStringOf, upstreamPath } from '../../frontend-main/lib/identity';
export { CONTENT } from '../../frontend-main/lib/services';

/**
 * Lượt GHI phải đến từ chính trang console. Cookie phiên mang `Domain=.tsudev.com` và `SameSite=Lax`, nên một trang
 * ở tên miền con khác vẫn là "same-site" - chặn ở đây, không dựa vào cookie. Không có cả `Sec-Fetch-Site` lẫn
 * `Origin` ⇒ từ chối (trình duyệt luôn gửi `Origin` cho POST/PUT/PATCH/DELETE).
 */
export function isSameOrigin(h: Record<string, string | string[] | undefined>): boolean {
  const site = h['sec-fetch-site'];
  if (typeof site === 'string') return site === 'same-origin';
  const origin = h.origin;
  if (typeof origin !== 'string' || typeof h.host !== 'string') return false;
  try {
    return new URL(origin).host === h.host;
  } catch {
    return false;
  }
}

export async function consoleIdentityHeaders(token: JWT): Promise<Record<string, string>> {
  const secret = readSecret(process.env, 'console');
  if (!secret) {
    throw new Error(
      `${ZONE_SECRET_ENV.console} thiếu hoặc ngắn hơn ${MIN_SECRET_LEN} ký tự - console không ký được khẳng định danh tính`
    );
  }
  const assertion = await signIdentity(
    {
      sub: usernameFromToken(token),
      role: roleFromToken(token),
      sv: typeof token.sessionVersion === 'number' ? token.sessionVersion : undefined,
    },
    secret,
    'console'
  );
  return { Authorization: `Bearer ${assertion}` };
}

/** Chuyển tiếp JWT Access (do Cloudflare gắn) xuống backend để kiểm L2 lần nữa ở đó. */
export function accessForwardHeaders(
  h: Record<string, string | string[] | undefined>
): Record<string, string> {
  const v = h[ACCESS_HEADER];
  const s = Array.isArray(v) ? v[0] : v;
  return s ? { [ACCESS_FORWARD_HEADER]: s } : {};
}

/** Người đang xem - chỉ để HIỂN THỊ (vai trò thật đọc từ DB ở backend cho mỗi request ghi). */
export type Viewer = { username: string; role: string } | null;
export const viewerFrom = (token: JWT | null): Viewer =>
  token ? { username: usernameFromToken(token), role: roleFromToken(token) } : null;
