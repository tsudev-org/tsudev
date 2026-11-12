import React from 'react';

/**
 * Biểu tượng một sản phẩm trên danh bạ - mỗi app/game nhận ra được bằng mắt.
 *
 * - App có LOGO THẬT (`logo`, tự lưu ở /eco/*.webp): vẽ đúng logo đó, giữ tỉ lệ.
 * - App chưa có logo riêng: ô bo góc kiểu biểu tượng ứng dụng, dải chuyển sắc
 *   `tint` riêng của app + glyph trắng. Trước 13/11/2026 mọi thẻ dùng CÙNG một ô
 *   tím nhạt với glyph mảnh, nên người dùng khó phân biệt app nào với app nào.
 *
 * Màu `tint` là dữ liệu sản phẩm (ecosystem.ts), không phải token giao diện: nó
 * giống nhau ở cả hai chế độ, như logo thật của một app.
 */
type Props = {
  name: string;
  logo?: string;
  tint: readonly [string, string];
  icon: string;
  size?: number;
};

export default function EcoIcon({ name, logo, tint, icon, size = 48 }: Props) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
        data-eco-logo={name}
      />
    );
  }
  const glyph = Math.round(size * 0.52);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-inset ring-white/15"
      style={{
        width: size,
        height: size,
        backgroundImage: `linear-gradient(140deg, ${tint[0]}, ${tint[1]})`,
      }}
      aria-hidden="true"
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={icon} />
      </svg>
    </span>
  );
}
