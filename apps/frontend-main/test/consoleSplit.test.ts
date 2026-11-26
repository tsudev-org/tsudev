/**
 * Tách vùng công khai / điều hành (CP2, ADR-0005 mục 1 + 4): Worker công khai KHÔNG nhập mã của `apps/console` và
 * KHÔNG biết bí mật ký của vùng console - bị chiếm cũng không ký được khẳng định điều hành. (CP3 thêm quét bundle.)
 */
import { readFileSync, readdirSync, statSync } from 'fs';
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
