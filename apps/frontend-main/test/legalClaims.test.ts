// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Văn bản pháp lý phải khớp với thứ hệ thống THẬT SỰ làm.
 *
 * Bản 01/08/2026 của /terms và /privacy cam kết xác thực tài khoản bằng số điện
 * thoại (NĐ 147/2024, Đ23 k3 điểm e) trong khi schema không có trường nào để lưu
 * nó - một lời cam kết tuân thủ không ai thực hiện. Đổi 05/11/2026: site không
 * cung cấp mạng xã hội nên nghĩa vụ đó không áp dụng, và văn bản nói đúng thế.
 *
 * Test canh CẢ HAI chiều, vì cả hai đều là hỏng im lặng:
 *  - schema có trường điện thoại/định danh ⇒ văn bản phải khai việc thu nó;
 *  - schema không có ⇒ văn bản không được cam kết thu nó.
 * Mở lại tính năng cho người dùng đăng/trao đổi công khai (bình luận, diễn đàn,
 * tin nhắn) thì nghĩa vụ xác thực bật lại: xem docs/auth.md.
 */
const ROOT = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const userModel = (() => {
  const schema = read('packages/db/prisma/schema.prisma');
  const start = schema.indexOf('model User {');
  return schema.slice(start, schema.indexOf('\n}', start));
})();
const COLLECTS_PHONE = /^\s+(phone|phoneNumber|nationalId|citizenId)\w*\s/im.test(userModel);

const PAGES = ['apps/frontend-main/pages/terms.tsx', 'apps/frontend-main/pages/privacy.tsx'];
const PROMISES_PHONE =
  /xác thực tài\s+khoản bằng số điện\s+thoại|Dữ liệu xác thực:<\/strong> số điện thoại/;

describe('văn bản pháp lý khớp dữ liệu thật về xác thực tài khoản', () => {
  test.each(PAGES)('%s', (p) => {
    const src = read(p);
    if (COLLECTS_PHONE) {
      expect(src).toMatch(/số điện thoại/);
    } else {
      expect(src).not.toMatch(PROMISES_PHONE);
    }
  });

  test('schema hiện KHÔNG thu số điện thoại người dùng (đổi thì cập nhật văn bản + test này)', () => {
    expect(COLLECTS_PHONE).toBe(false);
  });
});
