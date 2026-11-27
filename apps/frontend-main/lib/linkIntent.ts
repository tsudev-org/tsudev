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
 *
 * ACC1 (26/11/2026): cookie mang thêm token step-up (rỗng nếu tài khoản chưa có TOTP), ký
 * chung trong HMAC. BFF KHÔNG kiểm token này - nó chuyển nguyên cho auth-service ở
 * `oauth/link`, nơi `stepUpIfTotp` quyết định. Token sống 5 phút, nên chặng ở nhà cung cấp
 * lâu hơn thế thì liên kết trả `step_up_required` và người dùng làm lại.
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

const payloadOf = (provider: string, exp: number, username: string, stepUp: string) =>
  `link-intent-v2\n${provider}\n${exp}\n${username}\n${stepUp}`;

/** Token step-up hợp lệ về HÌNH DẠNG (base64url + dấu chấm), hoặc rỗng. Không chứa `|`. */
const STEP_UP_SHAPE = /^[A-Za-z0-9._-]{0,512}$/;
export const stepUpShapeOk = (v: string): boolean => STEP_UP_SHAPE.test(v);

export async function createLinkIntent(
  secret: string,
  provider: string,
  username: string,
  stepUp = '',
  nowMs = Date.now()
): Promise<string> {
  if (!stepUpShapeOk(stepUp)) throw new Error('stepUp sai định dạng');
  const exp = Math.floor(nowMs / 1000) + LINK_INTENT_TTL_S;
  const sig = await hmacHex(secret, payloadOf(provider, exp, username, stepUp));
  return `${provider}|${exp}|${username}|${stepUp}|${sig}`;
}

export interface LinkIntent {
  provider: string;
  username: string;
  /** Token step-up chuyển cho auth-service (rỗng = không kèm). */
  stepUp: string;
}

export async function verifyLinkIntent(
  secret: string,
  value: string | undefined,
  nowMs = Date.now()
): Promise<LinkIntent | null> {
  if (!secret || !value) return null;
  const parts = value.split('|');
  if (parts.length !== 5) return null;
  const [provider, expRaw, username, stepUp, sig] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];
  const exp = Number(expRaw);
  if (!provider || !username || !Number.isInteger(exp) || !stepUpShapeOk(stepUp)) return null;
  if (exp < Math.floor(nowMs / 1000)) return null;
  const want = await hmacHex(secret, payloadOf(provider, exp, username, stepUp));
  return sameHex(want, sig) ? { provider, username, stepUp } : null;
}

/** Chuỗi Set-Cookie. `secure` theo NEXTAUTH_URL (https ở production, http ở dev). */
export function linkIntentCookie(
  value: string,
  secure: boolean,
  maxAge = LINK_INTENT_TTL_S,
  // CP4a: cổng `id.` đặt cookie, chặng callback OAuth chạy ở tsudev.com (cầu OAuth) ⇒ cùng Domain với cookie phiên.
  domain?: string
) {
  return [
    `${LINK_INTENT_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/api/auth',
    ...(domain ? [`Domain=${domain}`] : []),
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
