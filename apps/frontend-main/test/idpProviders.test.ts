/**
 * `GET /api/v1/auth/providers` (STD43): danh sách RP dựng nút. Canh hai chiều lệch:
 * provider lạ lọt ra (nút chết ở RP) và tập idp_hint lệch với auth-service / trang
 * /oidc/interaction (RP gửi hint mà IdP lờ đi).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { IDP_HINT_IDS, listIdpProviders } from '../lib/idpProviders';

const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8');

describe('listIdpProviders', () => {
  test('chỉ giữ provider OAuth đã bật, bỏ mật khẩu/passkey', () => {
    const out = listIdpProviders([
      { id: 'credentials', name: 'Mật khẩu', type: 'credentials' },
      { id: 'passkey', name: 'Passkey', type: 'credentials' },
      { id: 'google', name: 'Google', type: 'oauth' },
      { id: 'github', name: 'GitHub', type: 'oauth' },
    ]);
    expect(out).toEqual([
      { id: 'google', name: 'Google', idp_hint: 'google' },
      { id: 'github', name: 'GitHub', idp_hint: 'github' },
    ]);
  });

  test('provider OAuth chưa có idp_hint (vd. apple chưa nối) KHÔNG lọt ra', () => {
    expect(listIdpProviders([{ id: 'apple', name: 'Apple', type: 'oauth' }])).toEqual([]);
  });

  test('không provider nào bật ⇒ mảng rỗng', () => {
    expect(listIdpProviders([])).toEqual([]);
  });
});

describe('tập idp_hint khớp ba nơi', () => {
  test('auth-service IDP_HINTS', () => {
    const src = read('..', '..', 'services', 'auth-service', 'src', 'oidc.ts');
    const m = src.match(/export const IDP_HINTS = \[([^\]]*)\]/);
    const ids = (m?.[1] ?? '').match(/'([a-z]+)'/g)?.map((s) => s.slice(1, -1));
    expect(ids).toEqual([...IDP_HINT_IDS]);
  });

  test('trang /oidc/interaction', () => {
    const src = read('pages', 'oidc', 'interaction', '[uid].tsx');
    const m = src.match(/const IDP_HINTS = new Set\(\[([^\]]*)\]\)/);
    const ids = (m?.[1] ?? '').match(/'([a-z]+)'/g)?.map((s) => s.slice(1, -1));
    expect(ids).toEqual([...IDP_HINT_IDS]);
  });

  test('route trả qua listIdpProviders từ chính mảng provider của NextAuth', () => {
    const src = read('pages', 'api', 'v1', 'auth', 'providers.ts');
    expect(src).toContain('listIdpProviders(authOptions.providers)');
  });
});
