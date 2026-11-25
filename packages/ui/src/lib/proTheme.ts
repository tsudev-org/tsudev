import { PRO_THEME_DATA } from './proThemes.generated';

/**
 * Chủ đề giao diện Pro - quyền lợi Q2 (PRODUCT_POLICY 3.7.1, DESIGN_SYSTEM.md mục 1.3, phiếu
 * PRO3 (c)). Màu nằm ở `.standards/tokens/pro-themes.css` (nạp ở globals.css SAU products.css),
 * repo này không tự chế chủ đề nào. Sáng / Tối / Hệ thống (ThemeToggle) vẫn miễn phí và độc
 * lập: mỗi chủ đề có đủ bản Sáng lẫn Tối, `contrast.test.ts` đo cả hai.
 *
 * HAI khoá localStorage, cả hai đọc TRƯỚC KHI VẼ bởi script nội tuyến của
 * `apps/frontend-main/pages/_document.tsx`:
 *  - `tsudev-pro-theme` = lựa chọn của người dùng. GIỮ khi Pro hết hạn ("lựa chọn được nhớ để
 *    dùng lại", mục 1.3) - chỉ thôi áp.
 *  - `tsudev-pro-ok` = "1" khi máy chủ quyền lợi vừa nói tài khoản đang có Pro (SiteHeader ghi
 *    sau mỗi lần hỏi `pay/status`, xoá khi máy chủ nói không hoặc đăng xuất).
 * `data-pro-theme` chỉ được đặt khi có CẢ HAI và id nằm trong danh sách chuẩn (id lạ ⇒ bỏ).
 * Đây là tiện nghi chạy trên máy, không phải cổng quyền: bản fork tự bật được là chấp nhận
 * (PRODUCT_POLICY 3.7.6).
 */
export const PRO_THEME_KEY = 'tsudev-pro-theme';
export const PRO_OK_KEY = 'tsudev-pro-ok';

export const PRO_THEMES = PRO_THEME_DATA;
export type ProThemeId = (typeof PRO_THEME_DATA)[number]['id'];
export const PRO_THEME_IDS: readonly ProThemeId[] = PRO_THEME_DATA.map((t) => t.id);

export const isProThemeId = (v: unknown): v is ProThemeId =>
  typeof v === 'string' && (PRO_THEME_IDS as readonly string[]).includes(v);

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((cb) => cb());

function get(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function put(key: string, v: string | null): void {
  try {
    if (v === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, v);
  } catch {
    /* chế độ riêng tư / iframe sandbox: vẫn đổi cho phiên này */
  }
}

/** Đặt/bỏ `data-pro-theme` trên <html> đúng theo hai khoá - cùng luật với script ở _document. */
function apply(): void {
  const id = get(PRO_THEME_KEY);
  const d = document.documentElement;
  if (get(PRO_OK_KEY) === '1' && isProThemeId(id)) d.setAttribute('data-pro-theme', id);
  else d.removeAttribute('data-pro-theme');
}

/** Lựa chọn đã lưu ở máy này; `null` = Mặc định (bảng của sản phẩm). */
export function readProTheme(): ProThemeId | null {
  const v = get(PRO_THEME_KEY);
  return isProThemeId(v) ? v : null;
}

/** Đổi chủ đề ngay (không tải lại) và nhớ cho lần sau; `null` = về Mặc định. */
export function setProTheme(id: ProThemeId | null): void {
  put(PRO_THEME_KEY, id);
  apply();
  notify();
}

/**
 * Trạng thái Pro mà máy chủ vừa trả lời. `false` (hết hạn / chưa mua / đăng xuất) ⇒ thôi áp chủ đề
 * nhưng GIỮ lựa chọn, không hộp thoại nào (mục 1.3). `null` (lỗi mạng) thì đừng gọi hàm này.
 */
export function setProEntitled(active: boolean): void {
  if (typeof window === 'undefined') return;
  put(PRO_OK_KEY, active ? '1' : null);
  apply();
  notify();
}

export function subscribeProTheme(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== PRO_THEME_KEY && e.key !== PRO_OK_KEY) return;
    apply();
    cb();
  };
  listeners.add(cb);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}
