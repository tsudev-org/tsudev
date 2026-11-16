export const SITE_NAME = 'tsudev';

/**
 * Tiêu đề tab "Trang - tsudev". Trang đã kết bằng tên site (vd "Nội quy tsudev") thì không nối thêm, nếu không tab
 * đọc "Nội quy tsudev - tsudev" (công cụ quét giao diện của phiếu 20261113-07 bắt lỗi "tiêu đề lặp").
 */
export function tieuDeDayDu(title?: string): string {
  if (!title) return `${SITE_NAME} - Phát hành ứng dụng tự phát triển`;
  const t = title.trim();
  return new RegExp(`(^|\\s)${SITE_NAME}$`, 'i').test(t) ? t : `${t} - ${SITE_NAME}`;
}
