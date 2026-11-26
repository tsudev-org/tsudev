import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * IA-02 / ED-02 / F-08 (UX1-a): khu soạn bài là /studio.
 * Quét NGUỒN - chuyển hướng của next.config.js chỉ chạy được khi dựng thật.
 */
const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return d.name === 'node_modules' || d.name.startsWith('.') ? [] : files(p);
    return /\.(tsx?|js)$/.test(p) ? [p] : [];
  });
}

describe('UX1-a - /author → /studio', () => {
  test('/studio* và /author* chuyển hướng permanent (308) sang console, ?tab=docs đứng trước luật chung', () => {
    const cfg = read('next.config.js');
    const docs = cfg.indexOf('destination: `${CONSOLE_URL}/studio/docs`');
    const base = cfg.indexOf(
      "{ source: '/author', destination: `${CONSOLE_URL}/studio`, permanent: true }"
    );
    expect(docs).toBeGreaterThan(-1);
    expect(base).toBeGreaterThan(docs);
    for (const src of ['/author/:path*', '/studio/:path*'])
      expect(cfg).toContain(
        `{ source: '${src}', destination: \`\${CONSOLE_URL}/studio/:path*\`, permanent: true }`
      );
  });

  test('trang cũ đã gỡ, trang Studio có đủ ở console', () => {
    for (const gone of ['pages/author.tsx', 'pages/author', 'pages/studio', 'pages/admin'])
      expect(existsSync(join(root, gone))).toBe(false);
    for (const p of [
      'pages/studio/index.tsx',
      'pages/studio/posts/index.tsx',
      'pages/studio/posts/[slug].tsx',
      'pages/studio/posts/[slug]/history.tsx',
      'pages/studio/docs/index.tsx',
    ])
      expect(existsSync(join(root, '..', 'console', p))).toBe(true);
  });

  test('không còn liên kết tới /author (ngoài bảng chuyển hướng và đường API)', () => {
    const dirs = [join(root, 'pages'), join(root, 'components'), join(root, 'lib')];
    dirs.push(join(root, '..', '..', 'packages', 'ui', 'src'));
    for (const d of ['pages', 'components', 'lib']) dirs.push(join(root, '..', 'console', d));
    const sai: string[] = [];
    for (const f of dirs.flatMap(files)) {
      // Bỏ chú thích: lịch sử đổi tên được phép nhắc tới đường cũ.
      const src = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      // href="/author", `/author/posts/...`, '/author' - bỏ qua /api/author và content/author.
      if (/(?<![\w/])['"`]\/author(?:[/'"`?])/.test(src)) sai.push(relative(root, f));
    }
    expect(sai).toEqual([]);
  });

  test('F-08: "Viết bài" rời menu công khai, Studio nằm trong menu tài khoản', () => {
    const header = read('../../packages/ui/src/components/SiteHeader.tsx');
    const nav = header.slice(
      header.indexOf('const NAV'),
      header.indexOf('];', header.indexOf('const NAV'))
    );
    expect(nav).not.toMatch(/path: '\/(author|studio)'/);
    const menu = header.slice(header.indexOf('const UserMenu'));
    expect(menu).toMatch(/canAuthor && \(\s*<a href=\{`\$\{CONSOLE_URL\}\/studio`\}/);
  });
});
