// Thẻ deploy của tsudev.com (`scripts/release-tag.js`).
//
// Phiếu toàn hệ 20261117-V1 bước 8: thẻ `v...` trong hệ tsudev dành cho PHIÊN BẢN APP
// (`v26.11.1704`), nên website đổi sang `deploy-YYYY.MM.DD.N`. Thẻ `v20...` cũ là bất
// biến và vẫn phải được tính khi đếm N trong ngày - nếu không, ngày đổi khuôn sẽ có
// `deploy-2026.11.17.1` đứng SAU `v2026.11.17.6`, đọc như một bước lùi.
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { nextTagName, TAG_RE } = require(path.join(__dirname, '../../../scripts/release-tag.js'));

test('khuôn mới là deploy-YYYY.MM.DD.N', () => {
  expect(nextTagName('2026.11.18', [])).toBe('deploy-2026.11.18.1');
});

test('N nối tiếp thẻ v20... cũ cùng ngày', () => {
  expect(nextTagName('2026.11.17', ['v2026.11.17.5', 'v2026.11.17.6'])).toBe('deploy-2026.11.17.7');
  expect(nextTagName('2026.11.17', ['v2026.11.17.6', 'deploy-2026.11.17.7'])).toBe(
    'deploy-2026.11.17.8'
  );
});

test('thẻ ngày khác và thẻ app không ảnh hưởng', () => {
  expect(nextTagName('2026.11.18', ['deploy-2026.11.17.9', 'v26.11.1801'])).toBe(
    'deploy-2026.11.18.1'
  );
  expect(TAG_RE.test('v26.11.1704')).toBe(false);
  expect(TAG_RE.test('deploy-2026.11.17.7')).toBe(true);
});
