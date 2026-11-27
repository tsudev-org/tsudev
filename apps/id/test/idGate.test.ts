/**
 * Bất biến của Worker `id.` (CP4, CONTROL_PLANE.md mục 2 + AUTH_AND_ACCOUNT mục 2.1 "một cổng đăng nhập"). Quét
 * NGUỒN cho những thứ chỉ lộ trên HTTPS hoặc ở cấu hình phát hành, cộng kiểm hàm thuần của CSP và bảng đường.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { buildIdCsp, isGatePath } from '../proxy';

const APP = join(__dirname, '..');
const read = (f: string) => readFileSync(join(APP, f), 'utf8');
const walk = (dir: string): string[] =>
  readdirSync(join(APP, dir)).flatMap((n) => {
    const rel = `${dir}/${n}`;
    return statSync(join(APP, rel)).isDirectory() ? walk(rel) : [rel];
  });

/** `pages/a/[b].tsx` ⇒ đường mẫu `/a/x1234567890` để thử bảng GATE_PATHS. */
const sample = (f: string) =>
  f
    .replace(/^pages/, '')
    .replace(/\.tsx?$/, '')
    .replace(/\/index$/, '/')
    .replace(/\[\.\.\.[^\]]+\]/g, 'x/y')
    .replace(/\[[^\]]+\]/g, 'AbCdEf_123-x') || '/';

describe('bảng đường của cổng', () => {
  test('mọi trang + API trong pages/ đều nằm trong GATE_PATHS (thiếu là 307 về tsudev.com)', () => {
    const pages = walk('pages').filter((f) => !/\/_(app|document)\.tsx$/.test(f));
    expect(pages.length).toBeGreaterThan(10);
    for (const f of pages) expect({ f, ok: isGatePath(sample(f)) }).toEqual({ f, ok: true });
  });
  test('đường không thuộc cổng bị trả về tsudev.com', () => {
    for (const p of [
      '/blog',
      '/projects',
      '/admin',
      '/api/admin/x',
      '/api/oidc/auth',
      '/login/x',
      '/oidc/interaction/a/confirm',
    ]) {
      expect({ p, gate: isGatePath(p) }).toEqual({ p, gate: false });
    }
  });
});

describe('CSP', () => {
  const csp = buildIdCsp('abc', false, 'https://tsudev.com');
  test('nonce + strict-dynamic; ngoại lệ bên thứ ba DUY NHẤT là Turnstile', () => {
    const script = csp.split('; ').find((d) => d.startsWith('script-src ')) as string;
    expect(script).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    const external = new Set(csp.match(/https?:[^ ;]*/g));
    for (const u of external) {
      expect(u).toMatch(/^https:\/\/(challenges\.cloudflare\.com|cdn\.tsudev\.com|tsudev\.com)$/);
    }
    expect(csp).toContain("form-action 'self' https://tsudev.com");
  });
  test('Trusted Types bắt buộc + khung bị cấm', () => {
    expect(csp).toContain("require-trusted-types-for 'script'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("object-src 'none'");
  });
  test('chính sách TT mặc định: script cùng origin + đúng Turnstile, HTML qua bộ lọc, không createScript', () => {
    const doc = read('pages/_document.tsx');
    const tt = doc.slice(doc.indexOf('const TT_SCRIPT'), doc.indexOf('type Props'));
    expect(tt).toContain("'/_next/static/'");
    expect(tt).toContain("x.pathname==='/turnstile/v0/api.js'");
    expect(tt).not.toMatch(/createScript\s*:/);
    expect(tt).toMatch(/createHTML:function[^}]*throw new TypeError/);
    expect(read('pages/_app.tsx')).toMatch(/^installSanitizer\(\);/m);
  });
});

describe('nonce tới được mọi trang', () => {
  test('_app có getInitialProps (không trang nào dựng tĩnh - trang tĩnh không mang nonce, CSP chặn hết script)', () => {
    expect(read('pages/_app.tsx')).toMatch(/App\.getInitialProps\s*=/);
    const pages = walk('pages').filter((f) => !f.startsWith('pages/api/'));
    for (const f of pages)
      expect({ f, staticProps: /getStaticProps/.test(read(f)) }).toEqual({ f, staticProps: false });
  });
});

describe('cấu hình phát hành', () => {
  const w = read('wrangler.jsonc').replace(/^\s*\/\/.*$/gm, '');
  test('chỉ id.tsudev.com; workers.dev và preview tắt', () => {
    expect(w).toContain('"id.tsudev.com"');
    expect(w).toContain('"workers_dev": false');
    expect(w).toContain('"preview_urls": false');
    expect(w).toContain('"name": "tsudev-id"');
  });
  test('NextAuth chạy vùng id, URL là cổng; không bí mật trong vars', () => {
    expect(w).toContain('"NEXTAUTH_ZONE": "id"');
    expect(w).toContain('"NEXTAUTH_URL": "https://id.tsudev.com"');
    expect(w).not.toMatch(/"[A-Z_]*(SECRET|KEY|TOKEN)[A-Z_]*"\s*:/);
  });
  test('noindex mọi trang trừ /login; không cache', () => {
    const cfg = read('next.config.js');
    expect(cfg).toContain('noindex');
    expect(cfg).toContain('no-store');
    expect(read('public/robots.txt')).toMatch(/Disallow: \//);
  });
});

describe('trang đồng ý OIDC', () => {
  const src = read('pages/oidc/interaction/[uid].tsx');
  test('Cho phép/Từ chối là FORM POST về tsudev.com/.../confirm (cookie _interaction), không fetch', () => {
    expect(src).toContain('<form method="post" action={action}');
    expect(src).toContain('/oidc/interaction/${encodeURIComponent(props.uid)}/confirm');
    expect(src).not.toMatch(/fetch\([^)]*confirm/);
  });
  test('đọc tóm tắt theo uid qua auth-service, chưa đăng nhập ⇒ /login', () => {
    expect(src).toContain('/api/identity/oidc-summary/');
    expect(src).toContain('destination: `/login?${q}`');
  });
});
