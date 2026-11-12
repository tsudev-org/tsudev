/**
 * GỢI Ý PHIÊN cho lần vẽ đầu - chống chớp "chưa đăng nhập" ở header.
 *
 * Trang công khai là ISR (HTML dựng sẵn, giống nhau cho mọi người), còn
 * `useSession()` chỉ biết phiên sau một lượt gọi `/api/auth/session`. Trước
 * 13/11/2026 khoảng trống đó hiện nút "Đăng nhập" rồi mới đổi sang tên người
 * dùng, ở MỌI lần tải trang và mọi cú bấm điều hướng.
 *
 * SiteHeader ghi gợi ý này mỗi khi phiên đã rõ; script nội tuyến trong
 * `apps/frontend-main/pages/_document.tsx` đọc nó TRƯỚC lần vẽ đầu và đặt
 * `data-auth` / `data-auth-author` / `--tsu-user-name` lên <html>. Khoá và hình
 * dạng JSON dưới đây phải khớp script đó (test `authHint.test.ts` canh).
 *
 * ⚠️ Chỉ để VẼ giao diện. Không phải bằng chứng đăng nhập, không chứa token, không
 * cổng quyền nào được đọc nó - phân quyền thật ở máy chủ (`@tsudev/auth`).
 */
export const AUTH_HINT_KEY = 'tsu-auth';

export type AuthHint = {
  /** Tên hiển thị (cắt 40 ký tự khi vẽ). */
  n?: string;
  /** 1 = tài khoản đăng bài trở lên (hiện mục "Viết bài"). */
  a?: 1;
};

/** Ghi (hoặc xoá khi `null`) gợi ý. localStorage có thể ném lỗi - nuốt, vì đây chỉ là tối ưu hiển thị. */
export function saveAuthHint(hint: AuthHint | null): void {
  try {
    if (hint) window.localStorage.setItem(AUTH_HINT_KEY, JSON.stringify(hint));
    else window.localStorage.removeItem(AUTH_HINT_KEY);
  } catch {
    /* chế độ riêng tư / iframe sandbox */
  }
}
