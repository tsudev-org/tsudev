/**
 * IP THẬT của người gọi, để chuyển xuống auth-service giới hạn tần suất.
 *
 * 🔴 KHÔNG đọc phần tử đầu của `X-Forwarded-For`. Trên Cloudflare, header đó do
 * NGƯỜI GỬI đặt được - Cloudflare chỉ NỐI THÊM IP thật vào CUỐI. Bản trước lấy
 * phần tử đầu, nên kẻ tấn công đổi giá trị header ở mỗi request là có "IP mới"
 * và vượt giới hạn đăng nhập theo IP (dò mật khẩu hàng loạt tài khoản). Phát hiện
 * khi rà soát an toàn thông tin 05/11/2026.
 *
 * `CF-Connecting-IP` do Cloudflare GHI ĐÈ ở tầng biên - client không giả được.
 * Ở dev (không qua Cloudflare) không có header đó; khi ấy mới lùi về phần tử
 * CUỐI của X-Forwarded-For (do proxy gần nhất thêm vào) rồi tới địa chỉ socket.
 */
type HeaderBag = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v)?.trim() || '';

export function clientIp(headers: HeaderBag, socketAddress?: string | null): string {
  const cf = one(headers['cf-connecting-ip']);
  if (cf) return cf.slice(0, 45);
  const xff = one(headers['x-forwarded-for']);
  const last =
    xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .pop() || '';
  return (last || socketAddress || '').slice(0, 45);
}
