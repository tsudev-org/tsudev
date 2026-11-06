// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  MFA_REQUIRED,
  MFA_SETUP_PATH,
  MfaRequiredError,
  STEP_UP_REQUIRED,
  isMfaRequired,
  isStepUpRequired,
} from '../lib/mfa';

/**
 * Backend trả 403 `{ error, code: 'MFA_REQUIRED' }` khi ADMIN/OWNER chưa bật 2FA.
 * Giao diện phải nhận ra nó theo `code` - không theo câu chữ - và chỉ đường tới
 * trang bật 2FA thay cho "không có quyền".
 */
describe('isMfaRequired', () => {
  test('403 + code MFA_REQUIRED ⇒ true', () => {
    expect(isMfaRequired(403, { error: 'bất kỳ câu chữ nào', code: 'MFA_REQUIRED' })).toBe(true);
  });

  test('403 không có code ⇒ false (vẫn là "không có quyền")', () => {
    expect(isMfaRequired(403, { error: 'forbidden' })).toBe(false);
  });

  test('nhận theo code, KHÔNG theo chuỗi error', () => {
    expect(isMfaRequired(403, { error: 'MFA_REQUIRED' })).toBe(false);
  });

  test('status khác 403 ⇒ false dù code khớp', () => {
    expect(isMfaRequired(401, { code: 'MFA_REQUIRED' })).toBe(false);
    expect(isMfaRequired(200, { code: 'MFA_REQUIRED' })).toBe(false);
  });

  test('body không phải object ⇒ false, không ném', () => {
    expect(isMfaRequired(403, null)).toBe(false);
    expect(isMfaRequired(403, undefined)).toBe(false);
    expect(isMfaRequired(403, 'MFA_REQUIRED')).toBe(false);
  });

  test('MfaRequiredError mang code để nơi bắt phân biệt được', () => {
    const e = new MfaRequiredError();
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe(MFA_REQUIRED);
  });
});

describe('isStepUpRequired', () => {
  test('401 + code STEP_UP_REQUIRED ⇒ true', () => {
    expect(isStepUpRequired(401, { error: 'x', code: 'STEP_UP_REQUIRED' })).toBe(true);
  });
  test('401 thường (chưa đăng nhập) ⇒ false', () => {
    expect(isStepUpRequired(401, { error: 'unauthenticated' })).toBe(false);
    expect(isStepUpRequired(403, { code: 'STEP_UP_REQUIRED' })).toBe(false);
    expect(isStepUpRequired(401, null)).toBe(false);
  });
});

describe('hợp đồng với backend', () => {
  test('STEP_UP_REQUIRED khớp hằng của @tsudev/auth', () => {
    const src = readFileSync(join(__dirname, '../../../packages/auth/src/index.ts'), 'utf8');
    expect(src).toMatch(new RegExp(`export const STEP_UP_REQUIRED = '${STEP_UP_REQUIRED}'`));
  });

  test('trang tài khoản xử lý step-up cho đổi vai trò và xoá (G7)', () => {
    const src = readFileSync(join(__dirname, '../pages/admin/accounts.tsx'), 'utf8');
    expect(src).toContain('isStepUpRequired(');
    expect(src).toMatch(/guarded\(\s*'useradmin\/role'/);
    expect(src).toMatch(/guarded\(\s*'useradmin\/delete'/);
  });

  test('hằng cục bộ khớp hằng của @tsudev/auth (quét nguồn - app không được import package đó)', () => {
    const src = readFileSync(join(__dirname, '../../../packages/auth/src/index.ts'), 'utf8');
    expect(src).toMatch(new RegExp(`export const MFA_REQUIRED = '${MFA_REQUIRED}'`));
  });

  test('đường dẫn bật 2FA là TƯƠNG ĐỐI và trang đó tồn tại', () => {
    expect(MFA_SETUP_PATH.startsWith('/')).toBe(true);
    expect(MFA_SETUP_PATH.startsWith('//')).toBe(false);
    const page = join(__dirname, '../pages', `${MFA_SETUP_PATH}.tsx`);
    expect(() => readFileSync(page)).not.toThrow();
  });

  test('mọi chỗ gọi API quản trị đều nhận diện MFA_REQUIRED', () => {
    for (const f of [
      'pages/admin/projects.tsx',
      'pages/admin/content.tsx',
      'pages/admin/accounts.tsx',
      'pages/admin/security.tsx',
      'components/ReleaseManager.tsx',
      'components/EmailAliases.tsx',
    ]) {
      const src = readFileSync(join(__dirname, '..', f), 'utf8');
      expect({ f, ok: src.includes('isMfaRequired(') }).toEqual({ f, ok: true });
    }
  });

  test('app KHÔNG import @tsudev/auth (kéo Prisma, không chạy trên Workers)', () => {
    const src = readFileSync(join(__dirname, '../lib/mfa.ts'), 'utf8');
    expect(src).not.toMatch(/from '@tsudev\/auth'/);
  });
});
