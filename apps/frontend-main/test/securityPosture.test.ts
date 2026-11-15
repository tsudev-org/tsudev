import { postureItems, type Posture } from '../lib/securityPosture';

// P1.1: thẻ "Mức an toàn". Điều phải canh: "chưa kiểm được mật khẩu lộ" là
// 'unknown', KHÔNG BAO GIỜ là 'ok' - fail-open của HIBP không được hiện thành
// một dấu xanh.
const noop = () => {};
const on = { enableTotp: noop, regenerateBackupCodes: noop };
const base: Posture = {
  emailVerified: true,
  totp: true,
  passkeys: 1,
  backupCodesRemaining: 8,
  password: { set: true, checkedAt: '2026-11-14T00:00:00.000Z', breached: false },
};
const state = (p: Posture, id: string) => postureItems(p, on).find((i) => i.id === id)?.state;

test('đủ mọi mục ⇒ tất cả ok', () => {
  expect(postureItems(base, on).every((i) => i.state === 'ok')).toBe(true);
});

test('HIBP chưa rõ ⇒ unknown, không phải ok', () => {
  expect(
    state({ ...base, password: { set: true, checkedAt: null, breached: null } }, 'password')
  ).toBe('unknown');
});

test('mật khẩu lộ ⇒ todo kèm nút đổi mật khẩu', () => {
  const item = postureItems(
    { ...base, password: { set: true, checkedAt: base.password.checkedAt, breached: true } },
    on
  ).find((i) => i.id === 'password');
  expect(item?.state).toBe('todo');
  expect(item?.action?.href).toBe('/settings/profile');
});

test('chưa có TOTP ⇒ todo có nút bật, không hiện mục mã dự phòng', () => {
  const p = { ...base, totp: false, backupCodesRemaining: null };
  expect(state(p, 'totp')).toBe('todo');
  expect(state(p, 'backup')).toBeUndefined();
});

test('còn dưới 3 mã dự phòng ⇒ nhắc tạo lại', () => {
  expect(state({ ...base, backupCodesRemaining: 2 }, 'backup')).toBe('todo');
});

test('tài khoản chỉ OAuth (không mật khẩu) ⇒ không có mục mật khẩu', () => {
  expect(
    state({ ...base, password: { set: false, checkedAt: null, breached: null } }, 'password')
  ).toBeUndefined();
});
