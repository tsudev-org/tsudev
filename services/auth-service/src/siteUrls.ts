/**
 * Địa chỉ công khai của hai vùng mà auth-service phải biết (CP4, ADR-0005).
 *
 * - `mainUrl()`: `tsudev.com` - issuer OIDC (`/oidc`) và rpID passkey suy từ đây, BẤT BIẾN.
 * - `idUrl()`: cổng `id.tsudev.com` - nơi đặt giao diện đăng nhập, đồng ý OIDC, bảo mật tài khoản, và đích của
 *   mọi link trong thư tài khoản. `ID_URL` (hoặc `NEXT_PUBLIC_ID_URL`) nếu đặt; không thì suy `id.<host của main>`
 *   (giữ giao thức + cổng) - nhờ vậy production không cần thêm biến Render, dev ra `id.` + host dev.
 */
export function mainUrl(): string {
  return (process.env.NEXT_PUBLIC_MAIN_URL || '').replace(/\/+$/, '')
}

export function idUrl(): string {
  const explicit = (process.env.ID_URL || process.env.NEXT_PUBLIC_ID_URL || '').replace(/\/+$/, '')
  if (explicit) return explicit
  const main = mainUrl()
  if (!main) return ''
  const u = new URL(main)
  u.hostname = `id.${u.hostname}`
  return u.origin
}
