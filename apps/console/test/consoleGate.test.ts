/**
 * Bất biến của Worker `console.` (CP2, CONTROL_PLANE.md mục 3 + mục 9). Quét NGUỒN cho những thứ chỉ lộ trên HTTPS
 * hoặc ở cấu hình phát hành, cộng kiểm hàm thuần của CSP.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

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
    expect(csp).not.toMatch(/https?:/);
  });
  test('Trusted Types bắt buộc + khung bị cấm', () => {
    expect(csp).toContain("require-trusted-types-for 'script'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'none'");
  });
  test('chính sách TT mặc định chỉ tạo URL script cùng origin - không createHTML/createScript', () => {
    const doc = read('pages/_document.tsx');
    const tt = doc.slice(doc.indexOf('const TT_SCRIPT'), doc.indexOf('type Props'));
    expect(tt).toContain('createScriptURL');
    expect(tt).toContain("'/_next/static/'");
    expect(tt).not.toMatch(/createHTML\s*:|createScript\s*:/);
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
    for (const a of actions) expect(a).toMatch(/^(useradmin\/|alias\/|step-up$)/);
    expect(s).toContain('accessForwardHeaders(req.headers)');
  });
  test('proxy.ts xoá header chuyển tiếp do client tự đặt', () => {
    expect(read('proxy.ts')).toContain("headers.delete('x-tsu-access-jwt')");
  });
});
