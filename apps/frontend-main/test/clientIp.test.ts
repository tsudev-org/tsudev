// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { readFileSync } from 'fs';
import { join } from 'path';
import { clientIp } from '../lib/clientIp';

/**
 * IP chuyển xuống auth-service để giới hạn tần suất đăng nhập phải là IP THẬT.
 * Trên Cloudflare, phần tử ĐẦU của X-Forwarded-For do người gửi tự đặt - đọc nó
 * là cho kẻ tấn công một "IP mới" ở mỗi request. Lỗi này chỉ tồn tại sau
 * Cloudflare (HTTPS thật), nên canh bằng unit + quét NGUỒN.
 */
describe('clientIp', () => {
  test('ưu tiên CF-Connecting-IP, bỏ qua X-Forwarded-For giả', () => {
    expect(
      clientIp({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '1.2.3.4, 203.0.113.7' })
    ).toBe('203.0.113.7');
  });

  test('không có CF-Connecting-IP ⇒ phần tử CUỐI của X-Forwarded-For, không phải phần tử đầu', () => {
    expect(clientIp({ 'x-forwarded-for': '6.6.6.6, 10.0.0.2' })).toBe('10.0.0.2');
  });

  test('không header nào ⇒ địa chỉ socket', () => {
    expect(clientIp({}, '127.0.0.1')).toBe('127.0.0.1');
  });
});

describe('BFF không tự đọc X-Forwarded-For', () => {
  const ROOT = join(__dirname, '..');
  test.each(['pages/api/identity/[...path].ts', 'pages/api/auth/[...nextauth].ts'])(
    '%s đi qua clientIp()',
    (p) => {
      const src = readFileSync(join(ROOT, p), 'utf8');
      expect(src).toMatch(/clientIp\(req\.headers/);
      expect(src).not.toMatch(/headers\['x-forwarded-for'\]/);
    }
  );
});
