// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { readFileSync } from 'fs';
import { join } from 'path';
import { upstreamPath } from '../lib/identity';

/**
 * Proxy BFF ghép đường dẫn người dùng gửi vào URL tới service. Next đã giải mã
 * từng đoạn, nên `..` (hoặc `%2e%2e`) tới đây nguyên dạng và `fetch` chuẩn hoá nó
 * thành một route KHÁC - vượt danh sách tiền tố của proxy (CodeQL
 * js/request-forgery, vá 05/11/2026).
 */
describe('upstreamPath', () => {
  test('đường dẫn bình thường đi qua, mỗi đoạn được mã hoá', () => {
    expect(upstreamPath(['posts', 'xin chào'])).toBe('posts/xin%20ch%C3%A0o');
    expect(upstreamPath('files')).toBe('files');
    expect(upstreamPath(undefined)).toBe('');
  });

  test.each([
    [['posts', '..', 'admin']],
    [['.', 'admin']],
    [['posts', '']],
    [['posts', '../admin']],
    [['posts', '..\\admin']],
  ])('từ chối %j', (parts) => {
    expect(upstreamPath(parts)).toBeNull();
  });
});

describe('không proxy nào ghép đoạn đường dẫn trần vào URL', () => {
  // Quét NGUỒN: bản lỗi là `catchAllSegments(...).join('/')` hoặc `parts.join('/')`
  // đi thẳng vào fetch. Thêm proxy mới mà quay lại mẫu đó thì test này đỏ.
  const tep = ['pages/api/content/[...path].ts', 'pages/api/storage/[...path].ts', 'lib/bff.ts'];
  test.each(tep)('%s dùng upstreamPath', (f) => {
    const src = readFileSync(join(__dirname, '..', f), 'utf8');
    expect(src).toMatch(/upstreamPath\(/);
    expect(src).not.toMatch(/catchAllSegments\([^)]*\)\.join\('\/'\)/);
    expect(src).not.toMatch(/const path = parts\.join\('\/'\)/);
  });

  test('lib/api.ts mã hoá slug trước khi ghép', () => {
    const src = readFileSync(join(__dirname, '..', 'lib/api.ts'), 'utf8');
    expect(src).not.toMatch(/\/\$\{slug\}/);
  });
});
