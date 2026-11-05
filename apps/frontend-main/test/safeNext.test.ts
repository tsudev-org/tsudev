// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { safeNext } from '../lib/safeNext';

describe('safeNext - đích chuyển hướng sau đăng nhập', () => {
  test.each([
    ['/', '/'],
    ['/settings/security', '/settings/security'],
    ['/blog/bai-viet?tag=a#muc', '/blog/bai-viet?tag=a#muc'],
    ['/a/../b', '/b'],
  ])('giữ đường dẫn trong site: %s', (vao, ra) => {
    expect(safeNext(vao)).toBe(ra);
  });

  test.each([
    'https://ke-tan-cong.example',
    '//ke-tan-cong.example',
    '/\\ke-tan-cong.example',
    '/\\/ke-tan-cong.example',
    '/\t/ke-tan-cong.example',
    'javascript:alert(1)',
    '',
    undefined,
    ['/', '/x'],
  ])('từ chối %j', (vao) => {
    expect(safeNext(vao)).toBe('/');
  });
});
