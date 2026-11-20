/**
 * Máy khách của `/api/identity/pay/*` và `/api/identity/payadmin/*` (PRO-B bước B3), qua proxy
 * CÓ PHIÊN `pages/api/account/[...path].ts`. Bảng giá ở đây chỉ để VẼ - số tiền thật do
 * auth-service gán (`PLANS` trong services/auth-service/src/paymentRoutes.ts) và trang luôn vẽ
 * VietQR theo `amountVnd` máy chủ trả về, không theo bảng này.
 */
import type { TsuBadgeValue } from '@tsudev/ui';

export type PlanKind =
  'pro_month' | 'pro_year' | 'donate_20k' | 'donate_50k' | 'donate_100k' | 'donate_200k';

export const PLAN_LABEL: Record<PlanKind, string> = {
  pro_month: 'TsuDEV Pro - 1 tháng',
  pro_year: 'TsuDEV Pro - 1 năm',
  donate_20k: 'Ủng hộ 20.000 ₫',
  donate_50k: 'Ủng hộ 50.000 ₫',
  donate_100k: 'Ủng hộ 100.000 ₫',
  donate_200k: 'Ủng hộ 200.000 ₫',
};

export const PLAN_PRICE: Record<PlanKind, number> = {
  pro_month: 49_000,
  pro_year: 490_000,
  donate_20k: 20_000,
  donate_50k: 50_000,
  donate_100k: 100_000,
  donate_200k: 200_000,
};

export const DONATE_KINDS: PlanKind[] = ['donate_20k', 'donate_50k', 'donate_100k', 'donate_200k'];

export type IntentStatus = 'pending' | 'confirmed' | 'expired' | 'rejected';

export const STATUS_LABEL: Record<IntentStatus, string> = {
  pending: 'Chờ đối soát',
  confirmed: 'Đã xác nhận',
  expired: 'Hết hạn',
  rejected: 'Đã từ chối',
};

export type Intent = {
  code: string;
  kind: PlanKind;
  amountVnd: number;
  status: IntentStatus;
  app: string | null;
  expiresAt: string;
  confirmedAt: string | null;
  createdAt: string;
};

export type BadgeDisplay = 'AUTO' | 'PRO' | 'DONOR' | 'BOTH' | 'HIDDEN';

export type PayStatus = {
  proUntil: string | null;
  proActive: boolean;
  proSource: string | null;
  donor: boolean;
  badgeDisplay: BadgeDisplay;
  badge: TsuBadgeValue;
  intents: Intent[];
};

/** Giống `badgeFor` của auth-service - CHỈ để xem trước; giá trị thật do máy chủ trả. */
export function previewBadge(pro: boolean, donor: boolean, d: BadgeDisplay): TsuBadgeValue {
  if (d === 'HIDDEN') return 'none';
  if (d === 'PRO') return pro ? 'pro' : 'none';
  if (d === 'DONOR') return donor ? 'donor' : 'none';
  return pro && donor ? 'both' : pro ? 'pro' : donor ? 'donor' : 'none';
}

/** 49000 ⇒ "49.000 ₫" (không phụ thuộc ICU của môi trường chạy). */
export const vnd = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;

/** `?app=` (client_id OIDC) - sai dạng thì bỏ, máy chủ cũng bỏ. */
export function appParam(v: unknown): string | null {
  const s = (Array.isArray(v) ? v[0] : v) as string | undefined;
  return typeof s === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/.test(s) ? s : null;
}

export const PAY_ERR: Record<string, string> = {
  unauthenticated: 'Phiên đăng nhập đã hết - đăng nhập lại.',
  invalid_kind: 'Gói không hợp lệ.',
  too_many_pending: 'Bạn đang có 5 mã chờ đối soát. Đợi mã cũ được xác nhận hoặc hết hạn (72 giờ).',
  code_collision: 'Không tạo được mã, thử lại.',
  invalid_code: 'Mã không hợp lệ (8 ký tự, có thể kèm "TSU").',
  not_found: 'Không có mã này.',
  already_confirmed: 'Mã đã được xác nhận trước đó.',
  already_rejected: 'Mã đã bị từ chối trước đó.',
  forbidden: 'Chỉ tài khoản chủ sở hữu mới vào được trang này.',
  rate_limited: 'Thao tác quá nhanh, đợi một phút.',
};

export const payErr = (data: { error?: string }) =>
  PAY_ERR[data?.error || ''] || data?.error || 'Có lỗi xảy ra.';

export async function payCall<T = Record<string, unknown>>(
  action: string,
  body: Record<string, unknown> = {},
  signal?: AbortSignal
) {
  const r = await fetch(`/api/account/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string; code?: string };
  return { ok: r.ok, status: r.status, data } as const;
}

/**
 * Điều khoản kênh web, đứng TRƯỚC nút mua (khuôn PRODUCT_POLICY 7.5). Web là trả trước từng kỳ,
 * KHÔNG tự gia hạn ⇒ không dùng câu "tự gia hạn" của thuê bao cửa hàng.
 */
export const webTerms = (price: number, period: string) =>
  `TsuDEV Pro ${vnd(price)}/${period}, trả trước một kỳ, không tự gia hạn. Muốn dùng tiếp thì mua thêm kỳ mới tại tsudev.com/pro, thời gian được cộng dồn; quyền Pro dùng tới hết kỳ đã trả.`;
