import { readFileSync } from 'fs';
import { join } from 'path';

// security.txt (RFC 9116) là đầu mối ATTT công khai mà chứng nhận Tín nhiệm mạng đòi (phiếu DK2).
// `Expires` qua đi thì tệp vô hiệu IM LẶNG - test đỏ trước 60 ngày để kịp gia hạn.
const txt = readFileSync(join(__dirname, '../public/.well-known/security.txt'), 'utf8');

test('có Contact và Canonical đúng tên miền', () => {
  expect(txt).toMatch(/^Contact: (https|mailto):/m);
  expect(txt).toMatch(/^Canonical: https:\/\/tsudev\.com\/\.well-known\/security\.txt$/m);
});

test('Expires còn ít nhất 60 ngày và không quá 1 năm (khuyến nghị RFC 9116)', () => {
  const m = txt.match(/^Expires: (.+)$/m);
  expect(m).not.toBeNull();
  const days = (Date.parse((m as RegExpMatchArray)[1]) - Date.now()) / 86_400_000;
  expect(days).toBeGreaterThan(60);
  expect(days).toBeLessThanOrEqual(366);
});
