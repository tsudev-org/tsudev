/**
 * Cookie ý định liên kết (STD43). Cookie này quyết định callback OAuth GẮN tài khoản bên
 * thứ ba vào phiên hiện tại thay vì đăng nhập - giả được nó là gắn GitHub của kẻ tấn công
 * vào tài khoản nạn nhân. Canh: chữ ký, hạn, đúng người, đúng nhà cung cấp, thuộc tính cookie.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  LINK_INTENT_TTL_S,
  createLinkIntent,
  linkIntentCookie,
  verifyLinkIntent,
} from '../lib/linkIntent';

const SECRET = 'bi-mat-test-du-dai-cho-hmac-256!!';
const NOW = 1_800_000_000_000;

test('khứ hồi: tạo rồi kiểm ra đúng nhà cung cấp + username', async () => {
  const v = await createLinkIntent(SECRET, 'github', 'alice', 'tok.en-_1', NOW);
  expect(await verifyLinkIntent(SECRET, v, NOW)).toEqual({
    provider: 'github',
    username: 'alice',
    stepUp: 'tok.en-_1',
  });
});

test('sửa bất kỳ trường nào ⇒ null', async () => {
  const v = await createLinkIntent(SECRET, 'github', 'alice', 'tok.en-_1', NOW);
  const [p, exp, u, st, sig] = v.split('|');
  for (const bad of [
    `google|${exp}|${u}|${st}|${sig}`,
    `${p}|${Number(exp) + 999}|${u}|${st}|${sig}`,
    `${p}|${exp}|mallory|${st}|${sig}`,
    // ACC1: token step-up nằm trong chữ ký - thay/bỏ token ⇒ null.
    `${p}|${exp}|${u}|tok-khac|${sig}`,
    `${p}|${exp}|${u}||${sig}`,
    `${p}|${exp}|${u}|${st}|${'0'.repeat(64)}`,
    `${p}|${exp}|${u}|${sig}`,
    '',
  ]) {
    expect(await verifyLinkIntent(SECRET, bad, NOW)).toBeNull();
  }
});

test('khoá khác ⇒ null; hết hạn ⇒ null', async () => {
  const v = await createLinkIntent(SECRET, 'google', 'bob', '', NOW);
  expect(await verifyLinkIntent('khoa-khac-hoan-toan-du-dai-32-ky-tu', v, NOW)).toBeNull();
  expect(await verifyLinkIntent(SECRET, v, NOW + (LINK_INTENT_TTL_S + 1) * 1000)).toBeNull();
  expect(await verifyLinkIntent('', v, NOW)).toBeNull();
});

test('cookie: HttpOnly, SameSite=Lax, chỉ đường /api/auth, Secure theo cờ', () => {
  const c = linkIntentCookie('x', true);
  expect(c).toContain('HttpOnly');
  expect(c).toContain('SameSite=Lax');
  expect(c).toContain('Path=/api/auth');
  expect(c).toContain('Secure');
  expect(linkIntentCookie('x', false)).not.toContain('Secure');
});

test('stepUp sai hình dạng (chứa |, khoảng trắng) ⇒ ném khi tạo', async () => {
  await expect(createLinkIntent(SECRET, 'github', 'alice', 'a|b', NOW)).rejects.toThrow();
  await expect(createLinkIntent(SECRET, 'github', 'alice', 'a b', NOW)).rejects.toThrow();
});

test('nhánh liên kết ở next-auth đòi phiên ĐÚNG người trong cookie', () => {
  const src = readFileSync(
    join(__dirname, '..', 'pages', 'api', 'auth', '[...nextauth].ts'),
    'utf8'
  );
  expect(src).toMatch(/usernameFromToken\(token\) !== intent\.username\) return null/);
  expect(src).toMatch(/parts\[1\] !== intent\.provider/);
  // oauth/link không được mở qua proxy trình duyệt.
  const proxy = readFileSync(
    join(__dirname, '..', 'pages', 'api', 'account', '[...path].ts'),
    'utf8'
  );
  expect(proxy).not.toMatch(/^\s*'oauth\/link',/m);
  // ACC1: link-check thì MỞ (trang Bảo mật gọi để lấy step-up trước khi rời trang), và
  // token step-up đi tới oauth/link.
  expect(proxy).toMatch(/^\s*'oauth\/link-check',/m);
  expect(src).toMatch(/stepUp: intent\.stepUp/);
  expect(src).toMatch(/STEP_UP_REQUIRED'\) return 'step_up_required'/);
});
