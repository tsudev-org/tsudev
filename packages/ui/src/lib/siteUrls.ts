// tsudev là MỘT site. Trước đây có hai origin (trang chính và diễn đàn) nên mọi
// link điều hướng phải là URL tuyệt đối dựng từ siteUrl(); bỏ diễn đàn rồi thì
// link tương đối vừa đúng vừa gọn hơn - và không nhúng cứng origin vào HTML.
//
// MAIN_URL giữ lại cho các chỗ BẮT BUỘC cần URL tuyệt đối: thẻ canonical, ảnh
// Open Graph, URL nhúng trong huy hiệu con dấu.
//
// process.env.NEXT_PUBLIC_* phải viết nguyên literal - Next inline giá trị lúc
// build, đọc động qua biến trung gian sẽ ra undefined ở phía trình duyệt.
// Giá trị dự phòng khớp config/topology.json.
const stripSlash = (u: unknown): string => String(u || '').replace(/\/+$/, '');

export const MAIN_URL = stripSlash(
  process.env.NEXT_PUBLIC_MAIN_URL || 'http://tsudev.localhost:8080'
);

/** Trạm điều hành (CP3, ADR-0005): Studio và mọi trang quản trị ở đó, khác origin với site công khai. */
export const CONSOLE_URL = stripSlash(
  process.env.NEXT_PUBLIC_CONSOLE_URL || 'http://console.tsudev.localhost:8080'
);

/**
 * Cổng xác thực (CP4, ADR-0005): đăng nhập, đăng ký, khôi phục, bảo mật tài khoản. Liên kết tới các trang đó PHẢI
 * dùng URL tuyệt đối dựng từ đây - tsudev.com chỉ còn chuyển hướng 308 (chuẩn "một cổng đăng nhập").
 */
export const ID_URL = stripSlash(
  process.env.NEXT_PUBLIC_ID_URL || 'http://id.tsudev.localhost:8080'
);
