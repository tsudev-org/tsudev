/**
 * Cột "Tài khoản" ở chân trang theo phiên (13/11/2026) - test quét NGUỒN: HTML ISR
 * luôn dựng ở trạng thái khách, nên nhánh đã-đăng-nhập chỉ thấy ở trình duyệt.
 * Trước đó cột này cố định "Đăng nhập" kể cả khi đã đăng nhập.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const footer = readFileSync(
  join(__dirname, '..', '..', '..', 'packages', 'ui', 'src', 'components', 'SiteFooter.tsx'),
  'utf8'
);

describe('cột Tài khoản ở chân trang', () => {
  test('đã đăng nhập: Bảo mật tài khoản → /settings/security', () => {
    expect(footer).toMatch(/\['Bảo mật tài khoản', '\/settings\/security'\]/);
    expect(footer).toMatch(/status === 'authenticated'/);
  });

  test('"Đăng nhập" chỉ còn trong danh sách của khách', () => {
    const guest = footer.slice(footer.indexOf('GUEST_LINKS'), footer.indexOf('MEMBER_LINKS'));
    expect(guest).toContain("'/login'");
    expect(footer.split("'/login'").length - 1).toBe(1);
  });

  test('lúc phiên đang tải dùng cùng class chống nháy với header', () => {
    expect(footer).toContain('tsu-auth-in');
    expect(footer).toContain('tsu-auth-out');
  });
});
