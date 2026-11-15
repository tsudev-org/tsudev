/**
 * Menu tài khoản ở header (13/11/2026) - test quét NGUỒN, vì header chỉ hiện nhánh
 * đã-đăng-nhập ở trình duyệt có phiên (HTML ISR luôn dựng ở trạng thái khách).
 *
 * Chủ dự án yêu cầu: avatar bên trái tên; bấm avatar/tên mở menu gồm "Hồ sơ tài khoản"
 * và "Đăng xuất". Nút "Đăng xuất" KHÔNG được nằm trần trên thanh nữa.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const header = readFileSync(
  join(__dirname, '..', '..', '..', 'packages', 'ui', 'src', 'components', 'SiteHeader.tsx'),
  'utf8'
);
const menu = header.slice(header.indexOf('const UserMenu'));

describe('menu tài khoản ở header', () => {
  test('avatar nằm trong nút mở menu, có aria-expanded', () => {
    expect(menu).toContain('<Avatar');
    expect(menu).toMatch(/aria-expanded=\{open\}/);
    expect(menu).toContain('aria-controls="tsu-user-menu"');
  });

  test('menu có đúng hai đích: Hồ sơ tài khoản và Đăng xuất', () => {
    expect(menu).toContain('href="/settings/profile"');
    expect(menu).toContain('Hồ sơ tài khoản');
    expect(menu).toMatch(/onClick=\{onLogout\}/);
  });

  test('"Đăng xuất" chỉ xuất hiện trong UserMenu, không còn nút trần trên thanh', () => {
    const outside = header.slice(0, header.indexOf('const UserMenu'));
    expect(outside).not.toMatch(/>\s*Đăng xuất\s*</);
  });

  test('Esc và bấm ra ngoài đều đóng menu', () => {
    expect(menu).toContain("e.key === 'Escape'");
    expect(menu).toContain("addEventListener('mousedown'");
  });
});
