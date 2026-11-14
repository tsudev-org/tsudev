/**
 * Cloudflare Turnstile (P1.7, quyết định D9) - chống bot ở đăng ký, quên mật
 * khẩu, và đăng nhập sau 3 lần sai.
 *
 * Kiểm token ở MÁY CHỦ (siteverify) - widget ở trình duyệt chỉ PHÁT token, tự
 * nó không chứng minh gì. Token dùng một lần, sống 300 giây (Cloudflare quyết).
 *
 * Ba trạng thái cấu hình:
 *   - có `TURNSTILE_SECRET_KEY` ⇒ kiểm thật;
 *   - thiếu khoá, `TURNSTILE_REQUIRED=1` ⇒ từ chối khởi động (`assertTurnstileConfig`);
 *   - thiếu khoá ⇒ BỎ QUA, kèm log lỗi lúc khởi động ở production. Chốt 14/11/2026:
 *     chưa từ chối khởi động khi thiếu khoá vì tạo widget là việc 👤 của chủ dự
 *     án - từ chối ngay hôm nay là sập cả site vì một việc chưa ai làm được.
 *
 * siteverify không trả lời (mạng) ⇒ FAIL-OPEN có log, cùng lý do D7: một dịch vụ
 * ngoài sập không được biến thành "không ai đăng ký được". Token SAI thì luôn chặn.
 */
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export type TurnstileResult = 'ok' | 'skipped' | 'invalid' | 'unavailable'

export type SiteVerifyFetcher = (
  body: URLSearchParams
) => Promise<{ success?: boolean; 'error-codes'?: string[] } | null>

const defaultFetcher: SiteVerifyFetcher = async (body) => {
  try {
    const res = await fetch(SITEVERIFY, { method: 'POST', body, signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    return (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
  } catch {
    return null
  }
}

export const turnstileSecret = (): string => (process.env.TURNSTILE_SECRET_KEY || '').trim()

/** Gọi MỘT lần lúc khởi động. Ném khi đã đòi bắt buộc mà thiếu khoá. */
export function assertTurnstileConfig(env: NodeJS.ProcessEnv = process.env): void {
  if ((env.TURNSTILE_SECRET_KEY || '').trim()) return
  if (env.TURNSTILE_REQUIRED === '1') {
    throw new Error('TURNSTILE_REQUIRED=1 nhưng thiếu TURNSTILE_SECRET_KEY - từ chối khởi động')
  }
  if (env.NODE_ENV === 'production') {
    console.error(
      '[auth] THIẾU TURNSTILE_SECRET_KEY - chống bot ở đăng ký/quên mật khẩu/đăng nhập đang TẮT (P1.7)'
    )
  }
}

export async function verifyTurnstile(
  token: unknown,
  ip: string | null,
  fetcher: SiteVerifyFetcher = defaultFetcher,
  secret: string = turnstileSecret()
): Promise<TurnstileResult> {
  if (!secret) return 'skipped'
  if (typeof token !== 'string' || !token || token.length > 2048) return 'invalid'
  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.set('remoteip', ip)
  const r = await fetcher(body)
  if (!r) {
    console.warn('[auth] Turnstile siteverify không trả lời - cho qua (fail-open, D9)')
    return 'unavailable'
  }
  return r.success ? 'ok' : 'invalid'
}

/** Kết quả nào CHẶN yêu cầu. Chỉ token sai/thiếu khi đã bật. */
export const turnstileBlocks = (r: TurnstileResult): boolean => r === 'invalid'

/** Số lần đăng nhập sai (theo tài khoản) từ đó trở đi phải qua Turnstile. */
export const LOGIN_TURNSTILE_AFTER = 3
