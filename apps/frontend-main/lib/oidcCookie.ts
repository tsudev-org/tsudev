/**
 * Chỉ giữ cookie của `oidc-provider` (`_interaction`, `_interaction_resume`, `_session`
 * và biến thể `.legacy`/`.sig`) để chuyển xuống auth-service. Cookie phiên tsudev KHÔNG
 * đi theo - service nhận danh tính qua khẳng định có chữ ký, không qua cookie.
 */
export function oidcCookies(header: string | undefined): string {
  return String(header || '')
    .split(';')
    .map((c) => c.trim())
    .filter((c) => /^_(interaction|interaction_resume|session)(\.legacy)?(\.sig)?=/.test(c))
    .join('; ')
    .slice(0, 8192);
}
