import type { TsuBadgeValue } from '../components/TsuBadge';

/**
 * Huy hiệu của CHÍNH người đang đăng nhập, cho menu tài khoản ở đầu trang (PRO-B bước B3).
 *
 * Nguồn: `POST /api/account/pay/status` (auth-service áp `badgeDisplay` ở máy chủ, nên giá trị
 * đã là thứ người dùng chọn cho hiện). Đệm trong sessionStorage 10 phút để mỗi lần chuyển
 * trang không tốn một lượt gọi backend (Render free + Neon ngủ); trang Tài khoản → Huy hiệu
 * ghi đè bộ đệm ngay khi đổi lựa chọn.
 *
 * Gắn với `user` (tên phiên) - đổi tài khoản trong cùng tab không hiện huy hiệu của người
 * trước. Chỉ để VẼ, không phải cổng quyền.
 */
export const BADGE_CACHE_KEY = 'tsu.badge';
export const BADGE_CACHE_TTL_MS = 10 * 60_000;

type Cached = { u: string; b: TsuBadgeValue; t: number };

const VALUES: readonly TsuBadgeValue[] = ['pro', 'donor', 'both', 'none'];

export function readBadgeCache(user: string, now = Date.now()): TsuBadgeValue | null {
  try {
    const c = JSON.parse(window.sessionStorage.getItem(BADGE_CACHE_KEY) || 'null') as Cached | null;
    if (!c || c.u !== user || !VALUES.includes(c.b)) return null;
    if (!(now - c.t >= 0 && now - c.t < BADGE_CACHE_TTL_MS)) return null;
    return c.b;
  } catch {
    return null;
  }
}

export function writeBadgeCache(user: string, badge: TsuBadgeValue | null): void {
  try {
    if (badge && VALUES.includes(badge))
      window.sessionStorage.setItem(
        BADGE_CACHE_KEY,
        JSON.stringify({ u: user, b: badge, t: Date.now() } satisfies Cached)
      );
    else window.sessionStorage.removeItem(BADGE_CACHE_KEY);
  } catch {
    /* chế độ riêng tư / iframe sandbox */
  }
}

/**
 * Gọi máy chủ; lỗi mạng/backend ngủ ⇒ null (không vẽ huy hiệu, không báo lỗi ở header).
 * `proActive` đi kèm để header gỡ chủ đề giao diện Pro (Q2) khi Pro đã hết hạn - `null` khi
 * không biết (lỗi mạng), và khi đó KHÔNG gỡ gì: backend ngủ không phải lý do đổi màu của ai.
 */
export async function fetchOwnStatus(
  signal?: AbortSignal
): Promise<{ badge: TsuBadgeValue | null; proActive: boolean | null }> {
  try {
    const r = await fetch('/api/account/pay/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal,
    });
    if (!r.ok) return { badge: null, proActive: null };
    const j = (await r.json()) as { badge?: unknown; proActive?: unknown };
    return {
      badge: VALUES.includes(j?.badge as TsuBadgeValue) ? (j.badge as TsuBadgeValue) : null,
      proActive: typeof j?.proActive === 'boolean' ? j.proActive : null,
    };
  } catch {
    return { badge: null, proActive: null };
  }
}

export async function fetchOwnBadge(signal?: AbortSignal): Promise<TsuBadgeValue | null> {
  return (await fetchOwnStatus(signal)).badge;
}
