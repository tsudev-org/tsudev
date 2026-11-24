import React from 'react';

/**
 * Huy hiệu Pro / Ủng hộ cạnh tên tài khoản - tsudev-standards PRODUCT_POLICY mục 4 (PRO-C).
 *
 * Nhận ĐÚNG giá trị `badge` của JWS quyền lợi (`pro` | `donor` | `both` | `none`) - giá trị đó
 * đã áp lựa chọn hiển thị của người dùng ở máy chủ (`badge_display`), nên component KHÔNG tự
 * suy từ trạng thái Pro/Ủng hộ: tự suy là đường hiện lại thứ người dùng đã chọn ẩn.
 *
 * Màu lấy từ token `--badge-*` (mã gốc ở tsudev-standards `assets/badges/README.md`),
 * contrast.test.ts canh. Kích thước, shimmer, nhịp tim và tắt chuyển động: khối `.tsu-badge`
 * trong apps/frontend-main/styles/globals.css. Pro đứng trước Ủng hộ (bảng 4.1).
 */
export type TsuBadgeValue = 'pro' | 'donor' | 'both' | 'none';

const LABELS = {
  vi: { pro: 'Tài khoản Pro', donor: 'Đã ủng hộ TsuDEV', donorText: 'Ủng hộ' },
  en: { pro: 'Pro account', donor: 'Supported TsuDEV', donorText: 'Supporter' },
} as const;

type TsuBadgeProps = {
  badge: TsuBadgeValue | null | undefined;
  lang?: 'vi' | 'en';
  className?: string;
};

const Heart = () => (
  <svg viewBox="8 6 10 10" width="1em" height="1em" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M13 15.2l-.7-.64C9.8 12.3 8.2 10.85 8.2 9.1c0-1.45 1.13-2.6 2.6-2.6.82 0 1.6.38 2.2.98.6-.6 1.38-.98 2.2-.98 1.47 0 2.6 1.15 2.6 2.6 0 1.75-1.6 3.2-4.1 5.46z"
    />
  </svg>
);

export const TsuBadge = ({ badge, lang = 'vi', className = '' }: TsuBadgeProps) => {
  if (badge !== 'pro' && badge !== 'donor' && badge !== 'both') return null;
  const t = LABELS[lang] ?? LABELS.vi;
  const pro = badge === 'pro' || badge === 'both';
  const donor = badge === 'donor' || badge === 'both';
  return (
    <span className={`tsu-badges ${className}`.trim()}>
      {pro && (
        <span className="tsu-badge tsu-badge--pro" role="img" aria-label={t.pro} title={t.pro}>
          <span aria-hidden="true">PRO</span>
        </span>
      )}
      {donor && (
        <span
          className="tsu-badge tsu-badge--donor"
          role="img"
          aria-label={t.donor}
          title={t.donor}
        >
          <span className="tsu-badge__heart">
            <Heart />
          </span>
          <span aria-hidden="true">{t.donorText}</span>
        </span>
      )}
    </span>
  );
};
