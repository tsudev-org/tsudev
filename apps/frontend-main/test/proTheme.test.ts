import { readFileSync } from 'fs';
import { join } from 'path';
import { PRO_OK_KEY, PRO_THEME_IDS, PRO_THEME_KEY } from '../../../packages/ui/src/lib/proTheme';

/**
 * Chủ đề giao diện Pro (Q2, PRO3 (c), .standards DESIGN_SYSTEM.md mục 1.3).
 *
 * Script chống nháy ở `_document.tsx` viết THẲNG khoá localStorage và danh sách id (nó được băm
 * cho CSP, không import được), nên phải khớp `@tsudev/ui` - lệch thì chủ đề mới không bao giờ áp
 * trước khi vẽ, hoặc id đã gỡ vẫn được đặt. Trang /pro phải liệt kê Q2 (danh sách quyền lợi CHỈ
 * gồm thứ đang chạy thật), và globals.css phải nạp pro-themes.css SAU products.css.
 */
const ROOT = join(__dirname, '..');
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');

test('script chống nháy dùng đúng khoá và danh sách id chủ đề Pro', () => {
  const src = read('pages', '_document.tsx');
  expect(src).toContain(`localStorage.getItem('${PRO_THEME_KEY}')`);
  expect(src).toContain(`localStorage.getItem('${PRO_OK_KEY}') === '1'`);
  const m = src.match(/var ids = (\[[^\]]*\]);/);
  expect(m).not.toBeNull();
  expect(JSON.parse((m![1] as string).replace(/'/g, '"'))).toEqual([...PRO_THEME_IDS]);
});

test('mọi id chủ đề Pro có khối CSS trong .standards/tokens/pro-themes.css', () => {
  const css = readFileSync(
    join(ROOT, '..', '..', '.standards', 'tokens', 'pro-themes.css'),
    'utf8'
  );
  for (const id of PRO_THEME_IDS) expect(css).toContain(`:root[data-pro-theme="${id}"]`);
});

test('globals.css nạp pro-themes.css SAU products.css', () => {
  const css = read('styles', 'globals.css');
  const a = css.indexOf("tokens/products.css'");
  const b = css.indexOf("tokens/pro-themes.css'");
  expect(a).toBeGreaterThan(0);
  expect(b).toBeGreaterThan(a);
});

test('/pro liệt kê quyền lợi Giao diện Pro (Q2)', () => {
  expect(read('pages', 'pro.tsx')).toMatch(/'Giao diện Pro: [^']+'/);
});
