/**
 * Ý định LIÊN KẾT tài khoản bên thứ ba (STD43, trang /settings/security).
 *
 * Vấn đề: callback OAuth của next-auth không phân biệt "đăng nhập bằng Google" với "gắn
 * Google vào tài khoản đang mở". Không có tín hiệu riêng thì bấm "Liên kết GitHub" với một
 * GitHub khác email sẽ ĐĂNG NHẬP SANG (hoặc tạo) tài khoản khác - người dùng tưởng đã gắn.
 *
 * Tín hiệu: cookie HttpOnly sống 10 phút, ký HMAC bằng NEXTAUTH_SECRET, gói (nhà cung cấp,
 * username, hạn). Callback chỉ đi nhánh liên kết khi cookie hợp lệ VÀ username trong cookie
 * trùng phiên đang đăng nhập VÀ nhà cung cấp trùng - cookie bị đánh cắp sang trình duyệt
 * khác vô dụng vì thiếu phiên của chủ. Cookie chỉ được đặt từ POST /api/account-link (đòi
 * phiên, JSON ⇒ trang lạ không gửi được vì cần preflight CORS).
 */
export const LINK_INTENT_COOKIE = 'tsu-link-intent';
export const LINK_INTENT_TTL_S = 600;

async function hmacHex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
  return Array.from(sig, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** So sánh hằng thời gian trên hai chuỗi hex cùng độ dài. */
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const payloadOf = (provider: string, exp: number, username: string) =>
  `link-intent\n${provider}\n${exp}\n${username}`;

export async function createLinkIntent(
  secret: string,
  provider: string,
  username: string,
  nowMs = Date.now()
): Promise<string> {
  const exp = Math.floor(nowMs / 1000) + LINK_INTENT_TTL_S;
  const sig = await hmacHex(secret, payloadOf(provider, exp, username));
  return `${provider}|${exp}|${username}|${sig}`;
}

export interface LinkIntent {
  provider: string;
  username: string;
}

export async function verifyLinkIntent(
  secret: string,
  value: string | undefined,
  nowMs = Date.now()
): Promise<LinkIntent | null> {
  if (!secret || !value) return null;
  const parts = value.split('|');
  if (parts.length !== 4) return null;
  const [provider, expRaw, username, sig] = parts as [string, string, string, string];
  const exp = Number(expRaw);
  if (!provider || !username || !Number.isInteger(exp)) return null;
  if (exp < Math.floor(nowMs / 1000)) return null;
  const want = await hmacHex(secret, payloadOf(provider, exp, username));
  return sameHex(want, sig) ? { provider, username } : null;
}

/** Chuỗi Set-Cookie. `secure` theo NEXTAUTH_URL (https ở production, http ở dev). */
export function linkIntentCookie(value: string, secure: boolean, maxAge = LINK_INTENT_TTL_S) {
  return [
    `${LINK_INTENT_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/api/auth',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
