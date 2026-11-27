// CP4 (ADR-0005, chuẩn "một cổng đăng nhập" AUTH_AND_ACCOUNT mục 2.1): tsudev.com KHÔNG còn trang hay provider nhận
// thông tin đăng nhập; mọi trang tài khoản chuyển 308 sang cổng `id.`; đích quay về chỉ ba origin của hệ.
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// `@tsudev/ui` gốc kéo JSX của SiteHeader; ở đây chỉ cần ba URL của hệ.
jest.mock('@tsudev/ui', () => jest.requireActual('../../../packages/ui/src/lib/siteUrls'));

/* eslint-disable @typescript-eslint/no-require-imports */
const config = require('../next.config.js');
const { getPathMatch } = require('next/dist/shared/lib/router/utils/path-match');
/* eslint-enable @typescript-eslint/no-require-imports */

import { safeReturn } from '../lib/safeNext';
import { oauthStartUrl } from '../lib/oauthBridge';

// Ba origin dev do packages/ui/src/lib/siteUrls.ts suy (topology) - không ghi cứng cổng ở đây.
import {
  ID_URL as ID,
  MAIN_URL as MAIN,
  CONSOLE_URL as CONSOLE,
} from '../../../packages/ui/src/lib/siteUrls';

type Redirect = { source: string; destination: string; permanent: boolean };

test('không trang đăng nhập/tài khoản nào còn trong bundle công khai; mỗi trang có 308 sang cổng', async () => {
  const pages: string[] = config.ID_PAGES;
  expect(pages).toEqual(
    expect.arrayContaining(['/login', '/signup', '/settings/security', '/settings/profile'])
  );
  const redirects = (await config.redirects()) as Redirect[];
  for (const p of pages) {
    expect(existsSync(join(__dirname, '../pages', `${p}.tsx`))).toBe(false);
    expect(existsSync(join(__dirname, '../../id/pages', `${p}.tsx`))).toBe(true);
    const r = redirects.find((x) => x.source === p)!;
    expect(r).toMatchObject({ destination: `${ID}${p}`, permanent: true });
  }
  expect(existsSync(join(__dirname, '../pages/oidc/interaction/[uid].tsx'))).toBe(false);
  expect(existsSync(join(__dirname, '../pages/api/identity/[...path].ts'))).toBe(false);
  const oidc = redirects.find((x) => x.source.startsWith('/oidc/interaction/'))!;
  const m = getPathMatch(oidc.source, { removeUnnamedParams: true, strict: true });
  expect(m('/oidc/interaction/AbC_123-x')).toBeTruthy();
  // `/confirm` KHÔNG bị chuyển: nó cần cookie `_interaction` của host tsudev.com.
  expect(m('/oidc/interaction/AbC_123-x/confirm')).toBeFalsy();
  // QR: trang ở cổng; tsudev.com/x/<id> (tiền tố ghim trong app, T9) chuyển 308.
  expect(existsSync(join(__dirname, '../pages/x/[id].tsx'))).toBe(false);
  expect(existsSync(join(__dirname, '../../id/pages/x/[id].tsx'))).toBe(true);
  expect(redirects.find((x) => x.source.startsWith('/x/'))).toMatchObject({
    destination: `${ID}/x/:id`,
    permanent: true,
  });
  for (const f of ['QrLogin', 'QrPush'])
    expect(readFileSync(join(__dirname, `../components/${f}.tsx`), 'utf8')).toContain(
      '${MAIN_URL}/x/'
    );
});

test('NextAuth của tsudev.com không có provider mật khẩu/passkey/QR', () => {
  delete process.env.NEXTAUTH_ZONE;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authOptions, NEXTAUTH_ZONE } = require('../pages/api/auth/[...nextauth]');
    expect(NEXTAUTH_ZONE).toBe('main');
    const ids = (authOptions.providers as { id: string; options?: { id?: string } }[]).map(
      (p) => p.options?.id ?? p.id
    );
    expect(ids).not.toEqual(expect.arrayContaining(['credentials']));
    expect(ids).not.toContain('passkey');
    expect(ids).not.toContain('qr');
  });
});

test('NextAuth của cổng (NEXTAUTH_ZONE=id) giữ mật khẩu, passkey, QR', () => {
  process.env.NEXTAUTH_ZONE = 'id';
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authOptions } = require('../pages/api/auth/[...nextauth]');
    const ids = (authOptions.providers as { id: string; options?: { id?: string } }[]).map(
      (p) => p.options?.id ?? p.id
    );
    expect(ids).toEqual(expect.arrayContaining(['credentials', 'passkey', 'qr']));
  });
  delete process.env.NEXTAUTH_ZONE;
});

test('redirect callback chỉ nhận ba origin của hệ', () => {
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { safeRedirect } = require('../pages/api/auth/[...nextauth]');
    expect(safeRedirect('/blog', MAIN)).toBe(`${MAIN}/blog`);
    expect(safeRedirect(`${CONSOLE}/accounts`, ID)).toBe(`${CONSOLE}/accounts`);
    expect(safeRedirect(`${ID}/settings/security`, MAIN)).toBe(`${ID}/settings/security`);
    expect(safeRedirect('https://ke-tan-cong.example/x', MAIN)).toBe(MAIN);
    expect(safeRedirect('javascript:alert(1)', MAIN)).toBe(MAIN);
  });
});

test('safeReturn: tương đối hoặc origin trong danh sách; còn lại về mặc định', () => {
  const o = [MAIN, CONSOLE, ID];
  expect(safeReturn('/settings/security', o, 'F')).toBe('/settings/security');
  expect(safeReturn(`${CONSOLE}/`, o, 'F')).toBe(`${CONSOLE}/`);
  expect(safeReturn('https://ke-tan-cong.example/', o, 'F')).toBe('F');
  expect(safeReturn(MAIN.replace('://', '://u:p@') + '/', o, 'F')).toBe('F');
  expect(safeReturn('//ke-tan-cong.example', o, 'F')).toBe('F');
  expect(safeReturn(undefined, o, 'F')).toBe('F');
});

test('cầu OAuth: đích tương đối giải theo cổng; trang cầu không có ô nhập', () => {
  const u = new URL(oauthStartUrl('google', '/settings/security#lien-ket', MAIN, ID));
  expect(u.origin + u.pathname).toBe(`${MAIN}/oauth-start`);
  expect(u.searchParams.get('provider')).toBe('google');
  expect(u.searchParams.get('callbackUrl')).toBe(`${ID}/settings/security#lien-ket`);
  const src = readFileSync(join(__dirname, '../pages/oauth-start.tsx'), 'utf8');
  expect(src).not.toMatch(/<input|<form|type="password"/i);
});
