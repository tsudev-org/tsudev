// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Logo vector nền trong suốt (Tsu Swico, Disk, SoundDB, Contact) có HAI bản: `logo` nét trắng cho
 * nền Tối và `logoLight` nét tối cho nền Sáng. Nơi nào vẽ logo app mà chỉ dùng `logo` thì ở chế độ
 * Sáng logo trắng chìm vào nền - không cổng nào đỏ, chỉ người xem thấy (chủ dự án báo 26/11/2026 ở
 * khối "Danh sách ứng dụng" trang chủ). Canh bằng quét NGUỒN: mọi tệp tham chiếu `.logo` của app
 * phải cũng xử lý `logoLight` + hai lớp `.tsu-eco-dark`/`.tsu-eco-light`.
 */
const ROOT = join(__dirname, '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('logo app đổi bản theo chế độ Sáng/Tối', () => {
  it.each(['components/HomeShowcase.tsx', 'components/EcoIcon.tsx'])('%s', (f) => {
    const src = read(f);
    expect(src).toContain('logoLight');
    expect(src).toContain('tsu-eco-dark');
    expect(src).toContain('tsu-eco-light');
  });

  it('globals.css ẩn bản không hợp chế độ', () => {
    const css = read('styles/globals.css');
    expect(css).toMatch(
      /\[data-theme='light'\] \.tsu-eco-dark,\s*:root:not\(\[data-theme='light'\]\) \.tsu-eco-light\s*\{\s*display: none;/
    );
  });
});
