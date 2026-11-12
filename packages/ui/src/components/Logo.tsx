import React from 'react';

type LogoProps = {
  /** Cạnh của khung vuông chứa logo, tính bằng px. */
  size?: number;
  className?: string;
};

// Bậc cạnh của bản nhỏ do packages/brand/build-assets.js sinh ra. Đổi ở đây thì
// đổi cùng vòng `for (const s of [...])` trong script đó.
const LOGO_SIZES = [48, 96, 144, 192] as const;

const srcSet = (ext: 'avif' | 'webp') =>
  LOGO_SIZES.map((s) => `/brand/logo-tsudev-${s}.${ext} ${s}w`).join(', ');

// Logo tsudev HOÀN CHỈNH (cú + chữ "tsudev"), sinh từ
// packages/brand/source/logo-tsudev.png - chủ dự án chốt 13/11/2026 dùng nguyên
// logo ở mọi chỗ, chỉ xoá nền. Vì chữ "tsudev" đã nằm TRONG logo nên không vẽ
// thêm chữ bằng HTML bên cạnh (lặp chữ trông nghiệp dư); tên đọc màn hình do
// thẻ <a> bao ngoài (`aria-label`) hoặc `alt` ở đây cung cấp.
//
// Khung luôn VUÔNG và ảnh `object-contain`: logo không bao giờ bị kéo giãn.
// <picture>: AVIF (~2-13 kB) trước, WebP sau, PNG 256 cuối cùng.
export const Logo = ({ size = 48, className = '' }: LogoProps) => (
  <picture className={`inline-flex shrink-0 ${className}`}>
    <source type="image/avif" srcSet={srcSet('avif')} sizes={`${size}px`} />
    <source type="image/webp" srcSet={srcSet('webp')} sizes={`${size}px`} />
    <img
      src="/brand/logo-tsudev-256.png"
      alt="tsudev"
      width={size}
      height={size}
      decoding="async"
      className="object-contain"
      style={{ width: size, height: size }}
    />
  </picture>
);

export default Logo;
