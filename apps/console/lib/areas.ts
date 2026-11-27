/**
 * Các khu của trạm điều hành - một nguồn cho thanh điều hướng và trang Tổng quan. `min` chỉ để ẨN mục không dùng
 * được; cổng quyền thật ở backend (đọc `User.role` trong DB, fail closed).
 */
import { hasAtLeastRole, type Role } from '@tsudev/types';

export type Area = { href: string; label: string; desc: string; min: Role };

export const AREAS: Area[] = [
  {
    href: '/studio',
    label: 'Studio',
    desc: 'Soạn bài viết và tài liệu, lịch sử phiên bản, gửi duyệt.',
    min: 'AUTHOR',
  },
  {
    href: '/review',
    label: 'Duyệt bài',
    desc: 'Hàng chờ duyệt, xuất bản, trả lại và ghim bài.',
    min: 'MODERATOR',
  },
  {
    href: '/content',
    label: 'Kiểm duyệt nội dung',
    desc: 'Ẩn hoặc khôi phục hàng loạt bài viết, tài liệu.',
    min: 'ADMIN',
  },
  {
    href: '/projects',
    label: 'Dự án & phát hành',
    desc: 'Dự án, bản phát hành, giấy phép và trạng thái đăng ký bản quyền.',
    min: 'ADMIN',
  },
  {
    href: '/release-security',
    label: 'An ninh phát hành',
    desc: 'Toàn vẹn tệp cài đặt, quét mã độc, thu hồi bản phát hành, nhật ký chỉ-thêm.',
    min: 'ADMIN',
  },
  {
    href: '/accounts',
    label: 'Tài khoản & phân quyền',
    desc: 'Tạo tài khoản, đổi vai trò, thu hồi phiên, tạm khoá, bí danh thư. Chỉ chủ sở hữu, cần 2FA.',
    min: 'OWNER',
  },
  {
    href: '/thanh-toan',
    label: 'Đối soát thanh toán',
    desc: 'Xác nhận chuyển khoản VietQR cho Pro và ủng hộ. Chỉ chủ sở hữu, bắt buộc 2FA.',
    min: 'OWNER',
  },
  {
    href: '/security',
    label: 'Nhật ký bảo mật',
    desc: 'Sự kiện bảo mật xuyên tài khoản. Chỉ chủ sở hữu.',
    min: 'OWNER',
  },
];

export const areasFor = (role: string | undefined): Area[] =>
  AREAS.filter((a) => hasAtLeastRole(role, a.min));
