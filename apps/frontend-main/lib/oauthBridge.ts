import { signIn } from 'next-auth/react';
import { ID_URL, MAIN_URL } from '@tsudev/ui';

/**
 * Cầu OAuth (CP4a). Nút Google/GitHub chỉ nằm ở cổng `id.`, nhưng callback đã đăng ký ở Google/GitHub vẫn là
 * `tsudev.com/api/auth/callback/<id>` cho tới khi chủ dự án đổi sang cổng (👤, CP4b). Trong lúc đó cổng chuyển cả
 * trang sang `tsudev.com/oauth-start` - một trang không có ô nhập nào, chỉ gọi `signIn()` của NextAuth ở đó - và
 * NextAuth quay về `callbackUrl` tuyệt đối (redirect callback chỉ nhận ba origin của hệ).
 *
 * `NEXT_PUBLIC_OAUTH_VIA_MAIN` (nội suy lúc build, đặt ở next.config của cổng): danh sách provider đi qua cầu.
 * Rỗng ⇒ gọi `signIn()` tại chỗ như trước (tsudev.com và cổng sau CP4b).
 */
export const OAUTH_VIA_MAIN: readonly string[] = String(
  process.env.NEXT_PUBLIC_OAUTH_VIA_MAIN || ''
)
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s === 'google' || s === 'github');
const VIA_MAIN = new Set(OAUTH_VIA_MAIN);

/** Tên hiển thị của provider đi qua cầu (cổng không có provider đó trong NextAuth của mình). */
export const BRIDGE_NAMES: Record<string, string> = { google: 'Google', github: 'GitHub' };

export const OAUTH_START_PATH = '/oauth-start';

export function viaMain(provider: string): boolean {
  return VIA_MAIN.has(provider);
}

/** URL tuyệt đối của cầu ở tsudev.com. `callbackUrl` tương đối được giải theo cổng. */
export function oauthStartUrl(
  provider: string,
  callbackUrl: string,
  main = MAIN_URL,
  id = ID_URL
): string {
  const back = callbackUrl.startsWith('/') ? `${id}${callbackUrl}` : callbackUrl;
  const q = new URLSearchParams({ provider, callbackUrl: back });
  return `${main}${OAUTH_START_PATH}?${q}`;
}

export async function startOAuth(provider: string, callbackUrl: string): Promise<void> {
  if (viaMain(provider)) {
    window.location.assign(oauthStartUrl(provider, callbackUrl));
    return;
  }
  await signIn(provider, { callbackUrl });
}
