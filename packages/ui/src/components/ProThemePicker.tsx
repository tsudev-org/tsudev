import React, { useSyncExternalStore } from 'react';
import { PRODUCT_PRIMARY } from '../lib/productAccents.generated';
import { PRO_THEMES, readProTheme, setProTheme, subscribeProTheme } from '../lib/proTheme';
import type { ProThemeId } from '../lib/proTheme';

/**
 * Bộ chọn chủ đề màu Pro (Q2) cho Cài đặt → Giao diện (DESIGN_SYSTEM.md mục 1.3).
 *
 * - `pro` = máy chủ quyền lợi nói tài khoản đang có Pro: chọn được mọi chủ đề.
 * - Chưa có Pro: vẫn THẤY mẫu màu thật của cả hai chế độ (xem trước), chỉ "Mặc định" chọn được,
 *   kèm MỘT liên kết "Tìm hiểu TsuDEV Pro" - không khoá mờ cả màn, không chữ "nâng cấp" trên từng
 *   ô (PRODUCT_POLICY 3.7.1-3.7.2).
 *
 * Ô màu vẽ `primary` của chủ đề ở CẢ HAI chế độ (nửa trái Sáng, nửa phải Tối) - người dùng đổi
 * Sáng/Tối không phải chọn lại. Radio thật (ẩn) trong nhãn: bàn phím và trình đọc màn hình đi
 * theo hành vi gốc của trình duyệt.
 */
type Option = { id: ProThemeId | null; label: string; light: string; dark: string };

const DEFAULT = PRODUCT_PRIMARY['tsudev'] ?? { light: '#0868C4', dark: '#38BDF8' };
const OPTIONS: Option[] = [
  { id: null, label: 'Mặc định', light: DEFAULT.light, dark: DEFAULT.dark },
  ...PRO_THEMES.map((t) => ({ id: t.id, label: t.label, light: t.light, dark: t.dark })),
];

const serverSnapshot = (): ProThemeId | null | undefined => undefined;

export const ProThemePicker = ({
  pro,
  learnMoreHref = '/pro',
  className = '',
}: {
  pro: boolean;
  learnMoreHref?: string;
  className?: string;
}) => {
  // `undefined` = đang dựng ở máy chủ / lượt hydrat: chưa đánh dấu ô nào.
  const saved = useSyncExternalStore(subscribeProTheme, readProTheme, serverSnapshot);
  // Chưa Pro thì lựa chọn đang có hiệu lực là Mặc định (lựa chọn cũ vẫn được nhớ ở máy).
  const current = saved === undefined ? undefined : pro ? saved : null;
  return (
    <div className={className}>
      <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <legend className="sr-only">Chủ đề màu</legend>
        {OPTIONS.map((o) => {
          const checked = current !== undefined && current === o.id;
          const disabled = !pro && o.id !== null;
          return (
            <label
              key={o.id ?? 'mac-dinh'}
              className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-focus ${
                checked
                  ? 'border-primary text-fg'
                  : disabled
                    ? 'cursor-default border-line text-fg-secondary'
                    : 'cursor-pointer border-line text-fg-secondary hover:border-line-strong'
              }`}
            >
              <input
                type="radio"
                name="pro-theme"
                value={o.id ?? ''}
                checked={checked}
                disabled={disabled}
                onChange={() => setProTheme(o.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="inline-flex h-4 w-8 shrink-0 overflow-hidden rounded-full border border-line-strong"
              >
                <span className="h-full w-1/2" style={{ background: o.light }} />
                <span className="h-full w-1/2" style={{ background: o.dark }} />
              </span>
              {o.label}
            </label>
          );
        })}
      </fieldset>
      {!pro && (
        <p className="mt-3 text-sm text-fg-secondary">
          Các chủ đề màu ngoài Mặc định thuộc gói TsuDEV Pro không bắt buộc.{' '}
          <a href={learnMoreHref} className="text-link hover:underline">
            Tìm hiểu TsuDEV Pro
          </a>
        </p>
      )}
    </div>
  );
};
