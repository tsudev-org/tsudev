import { formatDateVN } from './format';

/**
 * Nhắc gia hạn Pro trên web (PRODUCT_POLICY 7.6, phiếu `20261120-PRO2` mục 2.1): hiện khi
 * 0 < pro_until - bây giờ ≤ 7 ngày. Câu chữ là NGUYÊN VĂN bộ quy ước - `test/proRenewal.test.ts`
 * đối chiếu với `.standards/docs/PRODUCT_POLICY.md`, đổi bên kia mà không đổi ở đây thì đỏ.
 */
export const RENEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const RENEWAL_TEXT = {
  title: 'Gia hạn TsuDEV Pro',
  body: 'Gói TsuDEV Pro của bạn hết hạn sau {n} ngày (ngày {ngày}). Gia hạn để giữ huy hiệu và giao diện Pro. Nếu không gia hạn, tài khoản sẽ trở về bản miễn phí; mọi tính năng và dữ liệu trên thiết bị vẫn giữ nguyên.',
  primary: 'Gia hạn',
  secondary: 'Để sau',
} as const;

export type RenewalNotice = { days: number; date: string; body: string };

/** `null` ngoài cửa sổ 7 ngày (còn xa, đã hết hạn, chưa từng Pro, ngày hỏng). */
export function renewalNotice(
  proUntil: string | null | undefined,
  now: number = Date.now()
): RenewalNotice | null {
  if (!proUntil) return null;
  const until = new Date(proUntil).getTime();
  if (Number.isNaN(until)) return null;
  const left = until - now;
  if (left <= 0 || left > RENEW_WINDOW_MS) return null;
  const days = Math.max(1, Math.ceil(left / DAY_MS));
  const date = formatDateVN(until);
  return {
    days,
    date,
    body: RENEWAL_TEXT.body.replace('{n}', String(days)).replace('{ngày}', date),
  };
}
