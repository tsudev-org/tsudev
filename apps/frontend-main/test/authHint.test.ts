/**
 * Chống chớp "chưa đăng nhập" (13/11/2026) - test quét NGUỒN, vì lỗi này chỉ thấy
 * bằng mắt ở trình duyệt: HTML ISR luôn dựng ở trạng thái chưa đăng nhập.
 *
 * Ba mảnh phải khớp nhau, lệch một mảnh là chớp quay lại mà không gì đỏ:
 *   1. khoá + hình dạng JSON ở packages/ui/src/lib/authHint.ts (nơi GHI),
 *   2. script nội tuyến trong pages/_document.tsx (nơi ĐỌC, trước lần vẽ đầu),
 *   3. luật CSS trong styles/globals.css + class trong SiteHeader.tsx (nơi ẨN).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { AUTH_HINT_KEY } from '../../../packages/ui/src/lib/authHint';

const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');
const doc = read('pages', '_document.tsx');
const css = read('styles', 'globals.css');
const header = read('..', '..', 'packages', 'ui', 'src', 'components', 'SiteHeader.tsx');

describe('gợi ý phiên cho lần vẽ đầu', () => {
  test('script ở _document đọc ĐÚNG khoá mà authHint.ts ghi', () => {
    const script = doc.match(/const THEME_SCRIPT = `([\s\S]*?)`;/)?.[1] ?? '';
    expect(script).toContain(`localStorage.getItem('${AUTH_HINT_KEY}')`);
    // Hình dạng: n = tên, a === 1 = tài khoản đăng bài.
    expect(script).toMatch(/h\.a === 1/);
    expect(script).toMatch(/typeof h\.n === 'string'/);
    expect(script).toContain("setAttribute('data-auth', 'in')");
    expect(script).toContain("setAttribute('data-auth-author', '')");
    expect(script).toContain("'--tsu-user-name'");
  });

  test('CSS ẩn biến thể sai theo đúng thuộc tính script đặt', () => {
    expect(css).toMatch(/html:not\(\[data-auth='in'\]\) \.tsu-auth-in/);
    expect(css).toMatch(/html\[data-auth='in'\] \.tsu-auth-out/);
    expect(css).toMatch(/html:not\(\[data-auth-author\]\) \.tsu-auth-author/);
    expect(css).toMatch(/\.tsu-user-name::before\s*\{\s*content: var\(--tsu-user-name/);
  });

  test('SiteHeader vẽ CẢ HAI biến thể khi loading, không coi loading là chưa đăng nhập', () => {
    expect(header).toContain("status === 'loading'");
    expect(header).toContain('tsu-auth-in');
    expect(header).toContain('tsu-auth-out');
    expect(header).toContain('tsu-auth-author');
    // Ghi gợi ý khi phiên đã rõ, xoá khi đăng xuất.
    expect(header).toMatch(/status === 'authenticated'\) saveAuthHint\(/);
    expect(header).toMatch(/status === 'unauthenticated'\) saveAuthHint\(null\)/);
    // Nhánh cũ: chỉ hiện nút Đăng nhập theo `session ? ... : ...` - chính là cú chớp.
    expect(header).not.toMatch(/\{session \? \(/);
  });
});

describe('không còn lối vào trang trống /projects', () => {
  test('menu chính không có mục /projects', () => {
    expect(header).not.toMatch(/path: '\/projects'/);
  });

  test('trang chủ và /apps không dẫn tới /projects (trừ khối chỉ hiện khi CÓ dự án)', () => {
    const link = /href[=:]\s*["'{`]*\/projects/;
    expect(read('pages', 'apps.tsx')).not.toMatch(link);
    const home = read('pages', 'index.tsx');
    const start = home.indexOf('---------- PROJECTS ----------');
    const end = home.indexOf('---------- FEATURED POSTS ----------');
    expect(start).toBeGreaterThan(0);
    expect(home.slice(start, end)).toContain('(projectsFailed || projects.length > 0) &&');
    expect(home.slice(0, start) + home.slice(end)).not.toMatch(link);
  });

  test('/projects chuyển về /apps khi KHÔNG có dự án (và chỉ khi tải thành công)', () => {
    const src = read('pages', 'projects', 'index.tsx');
    expect(src).toMatch(/if \(!r\.failed && r\.data\.length === 0\)/);
    expect(src).toMatch(/redirect: \{ destination: '\/apps', permanent: false \}/);
  });
});
