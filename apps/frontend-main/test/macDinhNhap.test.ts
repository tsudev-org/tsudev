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
  return m[1];
};

describe('ED-01 / AD-03 - form tạo mới mặc định là Nháp', () => {
  test.each(['pages/author.tsx', 'pages/admin/projects.tsx'])(
    '%s: published khởi tạo = false',
    (file) => {
      const block = emptyBlock(file);
      expect(block).toMatch(/\bpublished:\s*false\b/);
      expect(block).not.toMatch(/\bpublished:\s*true\b/);
    }
  );
});
