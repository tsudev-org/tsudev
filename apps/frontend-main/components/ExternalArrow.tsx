import React from 'react';
import { Icon } from '@tsudev/ui';

/**
 * Dấu "mở tab mới" cho nút liên kết ra ngoài: mũi tên chéo trong một ô tròn nhỏ,
 * nhích lên-phải khi rê chuột (nút cha mang lớp `group`). Thay ký tự `↗` - ký tự vẽ
 * theo phông nên lệch cỡ, lệch nét so với icon SVG đi cạnh. Màu ăn theo chữ của nút
 * (`currentColor`), nên dùng được cho cả nút đặc lẫn nút viền ở hai chế độ.
 * Trang trí thuần: nhãn "(mở tab mới)" cho trình đọc màn hình do nút tự đặt.
 */
export default function ExternalArrow() {
  return (
    <span
      aria-hidden="true"
      className="-mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/15 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px motion-reduce:transition-none"
    >
      <Icon name="arrow-up-right" size={12} className="text-current!" />
    </span>
  );
}
