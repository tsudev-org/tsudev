import React from 'react';

type LogoProps = {
  size?: number;
  withWordmark?: boolean;
  className?: string;
};

// Bậc chiều cao của bản nhỏ do packages/brand/build-assets.js sinh ra.
// Đổi ở đây thì đổi cùng vòng `for (const h of [...])` trong script đó.
const MARK_SIZES = [64, 96, 128] as const;
// Tỉ lệ rộng/cao của dấu hiệu (512x626) - để khai bề rộng THẬT cho srcset `w`.
const MARK_RATIO = 512 / 626;

const srcSet = (ext: 'avif' | 'webp') =>
  MARK_SIZES.map((h) => `/brand/logo-mark-${h}.${ext} ${Math.round(h * MARK_RATIO)}w`).join(', ');

// Biểu tượng thương hiệu tsudev (chim cú mạch điện), sinh từ packages/brand.
// Chỉ dùng phần biểu tượng ở đây; chữ "tsudev" render bằng text để ăn theo
// token màu của giao diện và luôn sắc nét ở mọi kích thước.
//
// Ảnh đi qua <picture>: trình duyệt lấy bản AVIF (~2-6 kB), không hỗ trợ thì
// WebP, cuối cùng mới tới PNG 512px (~131 kB) - trước đây PNG đó là thứ DUY
// NHẤT được tải, để vẽ một con cú 32px trên mọi trang. `sizes` khai đúng bề
// rộng hiển thị nên máy mật độ 1x lấy bản nhỏ nhất, màn retina lấy bản lớn hơn.
export const Logo = ({ size = 32, withWordmark = true, className = '' }: LogoProps) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <picture className="contents">
      <source
        type="image/avif"
        srcSet={srcSet('avif')}
        sizes={`${Math.round(size * MARK_RATIO)}px`}
      />
      <source
        type="image/webp"
        srcSet={srcSet('webp')}
        sizes={`${Math.round(size * MARK_RATIO)}px`}
      />
      <img
        src="/brand/logo-mark.png"
        alt=""
        width={size}
        height={size}
        decoding="async"
        className="object-contain shrink-0"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    </picture>
    {/* Chữ hiệu dùng bậc h4 (18px) của thang §4, không phải một giá trị tuỳ ý.
        Trước đây nó là 1.05rem ≈ 16.8px - không nằm trên thang nào và không đổi
        theo token. Đừng viết lại giá trị cũ ở đây kể cả trong chú thích: Tailwind
        quét NGUYÊN VĂN file, nên một class nằm trong comment vẫn được sinh ra
        CSS thật. */}
    {withWordmark && (
      <span className="font-bold text-h4 tracking-heading text-fg">
        tsu<span className="text-link">dev</span>
      </span>
    )}
  </span>
);

export default Logo;
