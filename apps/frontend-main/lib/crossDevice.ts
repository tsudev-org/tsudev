/**
 * Cookie của đăng nhập QR (CROSS_DEVICE_LOGIN, auth-service `crossDevice.ts`).
 *
 * Hai bí mật của thiết bị MỚI không bao giờ chạm tới JavaScript của trang (XSS có cũng không lấy được):
 *   - `poll` (quyền thăm dò + gõ mã của đúng thiết bị đã tạo/nhận phiên) - cookie HttpOnly `Path=/api/xd`;
 *   - vé đăng nhập sau khi gõ đúng mã - cookie HttpOnly `Path=/api/auth`, provider NextAuth `qr` đọc rồi XOÁ.
 * Đây là ràng buộc "bí mật gắn với thiết bị" của chuẩn (mục 3 T5) cho trình duyệt; app native dùng DPoP (QR3).
 */
export const XD_POLL_COOKIE = 'tsu-xd';
export const XD_TICKET_COOKIE = 'tsu-xd-ticket';

const secureFlag = () => (process.env.NEXTAUTH_URL || '').startsWith('https://');

export function xdCookie(name: string, value: string, path: string, maxAge: number): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Strict',
    ...(secureFlag() ? ['Secure'] : []),
  ].join('; ');
}

export function readCookie(header: string | undefined, name: string): string {
  for (const part of (header || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return '';
}
