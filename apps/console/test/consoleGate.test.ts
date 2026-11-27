/**
 * Bất biến của Worker `console.` (CP2, CONTROL_PLANE.md mục 3 + mục 9). Quét NGUỒN cho những thứ chỉ lộ trên HTTPS
 * hoặc ở cấu hình phát hành, cộng kiểm hàm thuần của CSP.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { isSameOrigin } from '../lib/server';
import { buildConsoleCsp } from '../proxy';

const APP = join(__dirname, '..');
const read = (f: string) => readFileSync(join(APP, f), 'utf8');
const walk = (dir: string): string[] =>
  readdirSync(join(APP, dir)).flatMap((n) => {
    const rel = `${dir}/${n}`;
    return statSync(join(APP, rel)).isDirectory() ? walk(rel) : [rel];
  });
const code = ['pages', 'lib', 'components'].flatMap(walk).concat('proxy.ts');

describe('CSP', () => {
  const csp = buildConsoleCsp('abc', false);
  test('nonce + strict-dynamic, không unsafe-inline/eval cho script, không nguồn bên thứ ba', () => {
    const script = csp.split('; ').find((d) => d.startsWith('script-src ')) as string;
    expect(script).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    // Nguồn ngoài DUY NHẤT: R2 (tải tệp phát hành), CDN ảnh và hai khung nhúng video của lib/md.ts.
    const external = new Set(csp.match(/https?:[^ ;]*/g));
    for (const u of external) {
      expect(u).toMatch(
        /^https:\/\/((\*\.)?[0-9a-f]{32}\.r2\.cloudflarestorage\.com|cdn\.tsudev\.com|www\.youtube-nocookie\.com|player\.vimeo\.com)$/
      );
    }
  });
  test('Trusted Types bắt buộc + khung bị cấm', () => {
    expect(csp).toContain("require-trusted-types-for 'script'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'none'");
  });
  test('chính sách TT mặc định: URL script cùng origin, HTML qua bộ lọc (thiếu thì ném), không createScript', () => {
    const doc = read('pages/_document.tsx');
    const tt = doc.slice(doc.indexOf('const TT_SCRIPT'), doc.indexOf('type Props'));
    expect(tt).toContain('createScriptURL');
    expect(tt).toContain("'/_next/static/'");
    expect(tt).not.toMatch(/createScript\s*:/);
    expect(tt).toContain('window.tsuSanitizeHtml');
    expect(tt).toMatch(/createHTML:function[^}]*throw new TypeError/);
    expect(read('pages/_app.tsx')).toMatch(/^installSanitizer\(\);/m);
    expect(read('lib/sanitize.ts')).toContain('DOMPurify.sanitize');
    expect(read('components/MarkdownEditor.tsx')).toContain('injectCSS: false');
  });
});

describe('cấu hình phát hành', () => {
  const w = read('wrangler.jsonc').replace(/^\s*\/\/.*$/gm, '');
  test('chỉ console.tsudev.com; workers.dev và preview tắt', () => {
    expect(w).toContain('"console.tsudev.com"');
    expect(w).toContain('"workers_dev": false');
    expect(w).toContain('"preview_urls": false');
  });
  test('không bí mật nào nằm trong vars', () => {
    expect(w).not.toMatch(/"[A-Z_]*(SECRET|KEY|TOKEN)[A-Z_]*"\s*:/);
  });
  test('noindex + no-store ở header; robots chặn hết', () => {
    const n = read('next.config.js');
    expect(n).toContain('noindex, nofollow, noarchive');
    expect(n).toContain('no-store, max-age=0');
    expect(read('public/robots.txt')).toContain('Disallow: /');
  });
});

describe('khẳng định danh tính', () => {
  test('mọi route proxy ký ở vùng console, không dùng identityHeaders của vùng công khai', () => {
    for (const f of code) {
      const s = read(f);
      expect({ f, main: /\bidentityHeaders\(/.test(s) }).toEqual({ f, main: false });
    }
    expect(read('lib/server.ts')).toMatch(/signIdentity\([\s\S]*'console'\s*\)/);
  });
  test('proxy tài khoản: chỉ POST, danh sách trắng chỉ gồm thao tác điều hành', () => {
    const s = read('pages/api/account/[...path].ts');
    const block = s.slice(s.indexOf('new Set(['), s.indexOf(']);'));
    const actions = [...block.matchAll(/'([a-z-]+(?:\/[a-z-]+)?)'/g)].map((m) => m[1] as string);
    expect(actions.length).toBeGreaterThan(5);
    for (const a of actions) expect(a).toMatch(/^(useradmin\/|alias\/|payadmin\/|step-up$)/);
    expect(s).toContain('accessForwardHeaders(req.headers)');
  });
  test('proxy.ts xoá header chuyển tiếp do client tự đặt', () => {
    expect(read('proxy.ts')).toContain("headers.delete('x-tsu-access-jwt')");
  });
});

describe('proxy điều hành (CP3)', () => {
  const proxies = code.filter((f) => /^pages\/api\/(content|account)\//.test(f));
  test('cả hai proxy: chặn lượt ghi khác origin, ký vùng console, chuyển tiếp JWT Access', () => {
    expect(proxies).toHaveLength(2);
    for (const f of proxies) {
      const s = read(f);
      for (const need of ['isSameOrigin(req.headers)', 'consoleIdentityHeaders(token)'])
        expect({ f, need, ok: s.includes(need) }).toEqual({ f, need, ok: true });
      expect(s).toContain('accessForwardHeaders(req.headers)');
    }
  });
  test('proxy nội dung: chỉ nhánh admin và author, đường dẫn qua upstreamPath', () => {
    const s = read('pages/api/content/[...path].ts');
    expect(s).toContain("new Set(['admin', 'author'])");
    expect(s).toContain('upstreamPath(parts)');
  });
  test('isSameOrigin: Sec-Fetch-Site thắng, thiếu cả hai thì từ chối', () => {
    const host = 'console.tsudev.com';
    expect(isSameOrigin({ host, 'sec-fetch-site': 'same-origin' })).toBe(true);
    expect(isSameOrigin({ host, 'sec-fetch-site': 'same-site' })).toBe(false);
    expect(isSameOrigin({ host, origin: `https://${host}` })).toBe(true);
    expect(isSameOrigin({ host, origin: 'https://blog.tsudev.com' })).toBe(false);
    expect(isSameOrigin({ host, origin: 'null' })).toBe(false);
    expect(isSameOrigin({ host })).toBe(false);
  });
  test('mọi lời gọi /api/<miền>/ của trang điều hành có route proxy ở console', () => {
    const used = new Set<string>();
    for (const f of code.concat('../frontend-main/lib/pay.ts', '../frontend-main/lib/mfa.ts'))
      for (const m of read(f)
        .replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '')
        .matchAll(/['`]\/api\/([a-z]+)\//g))
        used.add(m[1] as string);
    expect([...used].sort()).toEqual(['account', 'content']);
    expect(read('pages/studio/posts/[slug]/history.tsx')).not.toContain('/api/content/studio/');
  });
});
