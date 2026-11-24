import React, { useMemo } from 'react';
import qrcode from 'qrcode-generator';

/**
 * Vẽ mã QR thành SVG INLINE bằng phần tử React (một `<path>`), không `dangerouslySetInnerHTML`,
 * không ảnh `data:` và không gọi dịch vụ QR bên thứ ba - hợp CSP `img-src 'self'` và không để
 * lộ mã thanh toán của người dùng ra ngoài.
 *
 * Mức sửa lỗi M, vùng lặng 4 ô (chuẩn ISO/IEC 18004). Luôn nền trắng/ô đen ở CẢ hai chế độ:
 * ứng dụng ngân hàng không quét được mã đảo màu.
 */
export function QrSvg({
  value,
  label,
  size = 232,
}: {
  value: string;
  label: string;
  size?: number;
}) {
  const { d, n } = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(value, 'Byte');
    q.make();
    const count = q.getModuleCount();
    let path = '';
    for (let r = 0; r < count; r++)
      for (let c = 0; c < count; c++) if (q.isDark(r, c)) path += `M${c + 4} ${r + 4}h1v1h-1z`;
    return { d: path, n: count + 8 };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className="block h-auto w-full"
    >
      <rect width={n} height={n} fill="#FFFFFF" />
      <path d={d} fill="#000000" />
    </svg>
  );
}
