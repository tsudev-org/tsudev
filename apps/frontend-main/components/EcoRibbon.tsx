import React from 'react';

/**
 * Nhãn OPEN / PRIVATE góc trên phải của thẻ app/trò chơi (phiếu ECO2, tsudev-standards PRODUCT_POLICY
 * 3.7.7). `open` lấy từ `openSource` - suy từ `visibility` của repo GitHub trong bản chụp, KHÔNG khai tay.
 * Chữ hiển thị tiếng Anh, ẩn với trình đọc màn hình; nhãn đọc màn hình tiếng Việt là `ribbonSrLabel()`,
 * đặt ngay sau tên sản phẩm để thứ tự đọc là "tên - mã nguồn ...". Hình dáng/màu: `.tsu-ribbon` ở
 * globals.css (chuyển sắc + kính bóng, token ribbon-*).
 */
export default function EcoRibbon({ open }: { open: boolean }) {
  return (
    <div className={`tsu-ribbon ${open ? 'tsu-ribbon--open' : 'tsu-ribbon--private'}`}>
      <span className="tsu-ribbon__band" aria-hidden="true">
        {open ? 'OPEN' : 'PRIVATE'}
      </span>
    </div>
  );
}

/** Nhãn đọc màn hình của dải (PRODUCT_POLICY 3.7.7). */
export function ribbonSrLabel(open: boolean): string {
  return open ? ' - mã nguồn mở' : ' - mã nguồn riêng tư';
}
