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
  test('/author* chuyển hướng permanent (308), ?tab=docs đứng trước luật chung', () => {
    const cfg = read('next.config.js');
    const docs = cfg.indexOf("destination: '/studio/docs'");
    const base = cfg.indexOf("{ source: '/author', destination: '/studio', permanent: true }");
    const deep = cfg.indexOf(
      "{ source: '/author/:path*', destination: '/studio/:path*', permanent: true }"
    );
    expect(docs).toBeGreaterThan(-1);
    expect(base).toBeGreaterThan(docs);
    expect(deep).toBeGreaterThan(-1);
  });

  test('trang cũ đã gỡ, trang Studio có đủ', () => {
    expect(existsSync(join(root, 'pages/author.tsx'))).toBe(false);
    expect(existsSync(join(root, 'pages/author'))).toBe(false);
    for (const p of [
      'pages/studio/index.tsx',
      'pages/studio/posts/index.tsx',
      'pages/studio/posts/[slug].tsx',
      'pages/studio/posts/[slug]/history.tsx',
      'pages/studio/docs/index.tsx',
    ])
      expect(existsSync(join(root, p))).toBe(true);
  });

  test('không còn liên kết tới /author (ngoài bảng chuyển hướng và đường API)', () => {
    const dirs = [join(root, 'pages'), join(root, 'components'), join(root, 'lib')];
    dirs.push(join(root, '..', '..', 'packages', 'ui', 'src'));
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
    expect(menu).toMatch(/canAuthor && \(\s*<a href="\/studio"/);
  });
});
