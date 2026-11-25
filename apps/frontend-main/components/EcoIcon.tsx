import React from 'react';

/**
 * Biểu tượng một sản phẩm trên danh bạ - mỗi app/game nhận ra được bằng mắt.
 *
 * - App có LOGO THẬT (`logo`, tự lưu ở /eco/): vẽ đúng logo đó, giữ tỉ lệ. Có `logoLight` (logo vector
 *   xoá nền, 24/11/2026) thì vẽ CẢ HAI bản, `globals.css` (`.tsu-eco-dark`/`.tsu-eco-light`) chỉ hiện bản
 *   hợp với `data-theme` - không đợi JavaScript, không nháy.
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
  logoLight?: string;
  tint: readonly [string, string];
  icon: string;
  size?: number;
  /**
   * Logo là Ô NỀN ĐẶC bo góc (sáu trò chơi - `mark-tile` ở build-eco-icons.js): thêm viền
   * hairline để ô tối không chìm vào nền Tối và ô trắng không chìm vào nền Sáng.
   */
  tile?: boolean;
  /** Logo ở MÀN ĐẦU: tải ngay (không lazy) với ưu tiên cao. `lazy` chờ trình duyệt dựng bố cục
   *  xong mới tải, nên logo màn đầu hiện muộn ~0,3-0,5 s trên ô trống (đo 25/11/2026, phiếu UX2). */
  eager?: boolean;
};

export default function EcoIcon({
  name,
  logo,
  logoLight,
  tint,
  icon,
  size = 48,
  tile,
  eager,
}: Props) {
  const load = eager
    ? ({ loading: 'eager', fetchPriority: 'high' } as const)
    : ({ loading: 'lazy' } as const);
  if (logo && logoLight) {
    return (
      <span
        className="inline-flex shrink-0"
        style={{ width: size, height: size }}
        data-eco-logo={name}
      >
        {[
          [logo, 'tsu-eco-dark'],
          [logoLight, 'tsu-eco-light'],
        ].map(([src, cls]) => (
          <img
            key={cls}
            src={src}
            alt=""
            width={size}
            height={size}
            {...load}
            decoding="async"
            className={`${cls} shrink-0 object-contain`}
            style={{ width: size, height: size }}
          />
        ))}
      </span>
    );
  }
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        width={size}
        height={size}
        {...load}
        decoding="async"
        className={`shrink-0 object-contain ${tile ? 'rounded-[22%] ring-1 ring-line' : ''}`}
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
