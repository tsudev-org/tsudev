/**
 * Bộ đệm discovery/JWKS của proxy OIDC (ISS-20261120-1459-46b8): lớp Cloudflare trước Render
 * thỉnh thoảng trả 429 "Just a moment..." cho request con từ Worker ⇒ mọi RP không bắt đầu đăng
 * nhập được. Canh: chỉ đệm 2 tài liệu công khai, chỉ JSON, hạn mới/cũ, và proxy KHÔNG chuyển
 * nguyên văn 429 HTML cho RP.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  FRESH_MS,
  STALE_MS,
  _clearOidcCache,
  getCached,
  isTransientUpstream,
  putCached,
} from '../lib/oidcPublicCache';

const body = new TextEncoder().encode('{"issuer":"https://tsudev.com/oidc"}');

beforeEach(() => _clearOidcCache());

test('mới ⇒ fresh; quá FRESH ⇒ cũ nhưng còn; quá STALE ⇒ bỏ', () => {
  putCached('.well-known/openid-configuration', 'application/json; charset=utf-8', body, 0);
  expect(getCached('.well-known/openid-configuration', FRESH_MS)?.fresh).toBe(true);
  expect(getCached('.well-known/openid-configuration', FRESH_MS + 1)?.fresh).toBe(false);
  expect(getCached('.well-known/openid-configuration', STALE_MS + 1)).toBeNull();
});

test('chỉ đệm discovery + jwks, chỉ JSON', () => {
  putCached('token', 'application/json', body, 0);
  putCached('auth', 'application/json', body, 0);
  putCached('jwks', 'text/html', body, 0);
  expect(getCached('token', 1)).toBeNull();
  expect(getCached('auth', 1)).toBeNull();
  expect(getCached('jwks', 1)).toBeNull();
  putCached('jwks', 'application/jwk-set+json', body, 0);
  expect(getCached('jwks', 1)).not.toBeNull();
});

test('lỗi tạm của upstream', () => {
  for (const s of [429, 502, 503, 504]) expect(isTransientUpstream(s)).toBe(true);
  for (const s of [200, 302, 400, 401, 404, 500]) expect(isTransientUpstream(s)).toBe(false);
});

test('proxy: chỉ GET không query mới dùng bộ đệm; 429 ⇒ bản cũ hoặc 503 + Retry-After', () => {
  const src = readFileSync(join(__dirname, '..', 'pages', 'api', 'oidc', '[...path].ts'), 'utf8');
  expect(src).toContain("req.method === 'GET' && !qs && CACHEABLE_PATHS.has(path)");
  expect(src).toMatch(
    /isTransientUpstream\(up\.status\)[\s\S]*?if \(hit\) return sendCached[\s\S]*?Retry-After/
  );
  expect(src).toContain('up.status === 200) putCached(');
});
