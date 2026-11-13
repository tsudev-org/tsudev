import React from 'react';

/**
 * Ô chọn TRÒN cho thẻ sản phẩm (chọn nhiều để lấy một lệnh cài gộp).
 *
 * Vẫn là `<input type="checkbox">` thật (ẩn bằng `sr-only`, không `display:none`)
 * nên bàn phím (Tab, Space) và trình đọc màn hình dùng y như ô chọn gốc; vòng tròn
 * chỉ là lớp vẽ đi theo trạng thái `peer-checked` / `peer-focus-visible`.
 */
export default function SelectCircle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-subtle"
      data-select-circle
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
        aria-label={label}
      />
      <span
        aria-hidden="true"
        className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-line-control bg-surface text-transparent transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4.5 12.5l5 5 10-10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
}

/**
 * Bấm vào VÙNG TRỐNG của thẻ để chọn/bỏ chọn - như winstall. Bỏ qua cú bấm rơi vào
 * phần tử tương tác (liên kết, nút, ô nhập, khối lệnh để chép) và cú kéo bôi đen chữ,
 * để người dùng vẫn chép được lệnh/mô tả mà không vô tình đổi lựa chọn.
 */
export function toggleOnCardClick(e: React.MouseEvent<HTMLElement>, toggle: () => void) {
  const t = e.target as HTMLElement;
  if (t.closest('a, button, input, label, select, textarea, code, [data-no-card-toggle]')) return;
  const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
  if (sel && sel.toString().length > 0) return;
  toggle();
}
