/**
 * Tách vùng công khai / điều hành (CP2, ADR-0005 mục 1 + 4): Worker công khai KHÔNG nhập mã của `apps/console` và
 * KHÔNG biết bí mật ký của vùng console - bị chiếm cũng không ký được khẳng định điều hành.
 * CP3: không còn trang, proxy hay lời gọi điều hành nào ở app công khai (bản dựng được quét thêm ở CI bằng
 * `scripts/check-public-bundle.js`).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const APP = join(__dirname, '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = ['pages', 'lib', 'components']
  .flatMap((d) => walk(join(APP, d)))
  .concat(join(APP, 'proxy.ts'), join(APP, 'wrangler.jsonc'));

test('không tệp nào của vùng công khai nhập apps/console hay đọc bí mật vùng console', () => {
  const bad = files.filter((f) =>
    /from '[./]*\/console\/|INTERNAL_IDENTITY_SECRET_CONSOLE|EDGE_SIGNING_KEY_CONSOLE|'console'\s*\)/.test(
      readFileSync(f, 'utf8')
    )
  );
  expect(bad).toEqual([]);
});

describe('CP3 - điều hành đã rời site công khai', () => {
  test('không còn trang điều hành, trang Studio hay proxy ghi nội dung', () => {
    for (const gone of ['pages/admin', 'pages/studio', 'pages/api/content', 'pages/api/storage'])
      expect({ gone, co: existsSync(join(APP, gone)) }).toEqual({ gone, co: false });
  });
  test('không mã nào gọi route điều hành của backend', () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '');
      if (/\/api\/(content|admin|author)\/|['"`](useradmin|payadmin|alias)\//.test(src))
        bad.push(f);
    }
    // `lib/pay.ts` dùng chung chỉ nhận tên thao tác từ nơi gọi - chuỗi điều hành nằm ở console.
    expect(bad).toEqual([]);
  });
  test('/admin* chuyển sang console (308)', () => {
    const cfg = readFileSync(join(APP, 'next.config.js'), 'utf8');
    expect(cfg).toContain("{ source: '/admin', destination: `${CONSOLE_URL}/`, permanent: true }");
    expect(cfg).toContain(
      "{ source: '/admin/:path*', destination: `${CONSOLE_URL}/:path*`, permanent: true }"
    );
    expect(cfg).toContain("'https://console.tsudev.com'");
  });
});
