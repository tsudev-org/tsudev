import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ED-01 (F-01) + AD-03 (F-P1-08): form tạo mới phải mặc định CHƯA công bố.
 * Ô "Công bố" tích sẵn nghĩa là một cú bấm "Đăng bài" vội đưa bản nháp ra
 * công khai - và ISR giữ nó trong cache tới 5 phút sau khi gỡ.
 *
 * Quét NGUỒN: giá trị khởi tạo nằm trong hằng `EMPTY` của từng trang.
 */
const emptyBlock = (file: string): string => {
  const src = readFileSync(join(__dirname, '..', file), 'utf8');
  const m = src.match(/const EMPTY[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!m) throw new Error(`không tìm thấy hằng EMPTY trong ${file}`);
  return m[1] as string;
};

describe('ED-01 / AD-03 - form tạo mới mặc định là Nháp', () => {
  test.each(['../console/pages/projects.tsx'])('%s: published khởi tạo = false', (file) => {
    const block = emptyBlock(file);
    expect(block).toMatch(/\bpublished:\s*false\b/);
    expect(block).not.toMatch(/\bpublished:\s*true\b/);
  });

  // ED-02 (UX1-a): form tạo nhanh 13 ô của /author đã gỡ hẳn - MỘT lối tạo bài là
  // trình soạn /studio/posts/new, luôn tạo với `status: 'DRAFT'`.
  test('trình soạn Studio tạo bài mới là DRAFT', () => {
    const src = readFileSync(
      join(__dirname, '..', '../console/pages/studio/posts/[slug].tsx'),
      'utf8'
    );
    expect(src).toMatch(/status: 'DRAFT'/);
    expect(src).not.toMatch(/\bpublished:\s*true\b/);
  });
});
