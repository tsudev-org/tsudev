/**
 * Danh sách nhà cung cấp đăng nhập bên ngoài mà IdP tsudev.com ĐANG BẬT - nguồn cho
 * `GET /api/v1/auth/providers` (bộ quy ước v4.3.0, AUTH_AND_ACCOUNT mục 3.2 + 15).
 *
 * RP (qulythuchi, sound-db...) dựng nút "Tiếp tục với ..." từ đây rồi gửi `idp_hint=<id>`
 * vào `/oidc/auth`. Quy ước cấm RP gõ cứng danh sách: nút của nhà cung cấp IdP chưa bật
 * là nút chết (vd. Apple trước khi có Apple Developer Program).
 *
 * Nguồn sự thật là CHÍNH mảng provider của NextAuth - provider chỉ được đẩy vào mảng đó
 * khi đủ biến môi trường, nên danh sách này không thể nói "có Google" trong khi /login
 * không có nút Google. Chỉ giữ provider `oauth`/`oidc` nằm trong `IDP_HINT_IDS`: mật
 * khẩu và passkey không phải nhà cung cấp mà RP dựng nút được.
 */

/** Phải khớp `IDP_HINTS` ở services/auth-service/src/oidc.ts và trang /oidc/interaction. */
export const IDP_HINT_IDS = ['google', 'github'] as const;

export interface IdpProvider {
  id: string;
  name: string;
  /** Giá trị đặt vào tham số `idp_hint` của `/oidc/auth`. */
  idp_hint: string;
}

interface ProviderLike {
  id: string;
  name?: string;
  type: string;
}

export function listIdpProviders(providers: readonly ProviderLike[]): IdpProvider[] {
  const allowed = new Set<string>(IDP_HINT_IDS);
  return providers
    .filter((p) => (p.type === 'oauth' || p.type === 'oidc') && allowed.has(p.id))
    .map((p) => ({ id: p.id, name: p.name || p.id, idp_hint: p.id }));
}
