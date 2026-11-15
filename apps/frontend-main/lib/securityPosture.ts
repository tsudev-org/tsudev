import { formatDateVN } from './format';

/**
 * Logic THUẦN của thẻ "Mức an toàn" (P1.1) - tách khỏi component để test được
 * không cần DOM. Dữ liệu là SỰ KIỆN THÔ từ `POST /api/identity/security/posture`.
 *
 * Ba trạng thái, không phải hai: `ok` / `todo` / `unknown`. "Chưa kiểm được mật
 * khẩu lộ" (HIBP không trả lời, hoặc tài khoản chưa đăng nhập bằng mật khẩu từ
 * khi có kiểm) KHÔNG được vẽ thành dấu xanh - đó là chưa biết, không phải an toàn.
 */
export type Posture = {
  emailVerified: boolean;
  totp: boolean;
  passkeys: number;
  backupCodesRemaining: number | null;
  password: { set: boolean; checkedAt: string | null; breached: boolean | null };
};

export type PostureState = 'ok' | 'todo' | 'unknown';
export type PostureItem = {
  id: string;
  label: string;
  state: PostureState;
  detail: string;
  action?: { label: string; href?: string; onClick?: () => void };
};

/** Dưới ngưỡng này thì nhắc tạo lại - còn 1-2 mã là sát mất tài khoản. */
const LOW_BACKUP = 3;

export function postureItems(
  p: Posture,
  on: { enableTotp: () => void; regenerateBackupCodes: () => void }
): PostureItem[] {
  const items: PostureItem[] = [
    {
      id: 'email',
      label: 'Email đã xác minh',
      state: p.emailVerified ? 'ok' : 'todo',
      detail: p.emailVerified
        ? 'Đường khôi phục tài khoản đã được chứng minh là của bạn.'
        : 'Chưa xác minh thì không đặt lại được mật khẩu khi quên.',
      action: p.emailVerified ? undefined : { label: 'Xác minh', href: '/settings/profile' },
    },
    {
      id: 'totp',
      label: 'Xác thực hai bước (TOTP)',
      state: p.totp ? 'ok' : 'todo',
      detail: p.totp
        ? 'Mật khẩu lộ thôi chưa đủ để vào tài khoản.'
        : 'Lộ mật khẩu là mất tài khoản. Bật trong 1 phút với ứng dụng xác thực.',
      action: p.totp ? undefined : { label: 'Bật ngay', onClick: on.enableTotp },
    },
    {
      id: 'passkey',
      label: 'Passkey',
      state: p.passkeys > 0 ? 'ok' : 'todo',
      detail:
        p.passkeys > 0
          ? `${p.passkeys} passkey - đăng nhập không gõ được vào trang giả.`
          : 'Passkey chống được trang đăng nhập giả mạo; mật khẩu và mã thì không.',
      action: p.passkeys > 0 ? undefined : { label: 'Thêm passkey', href: '#passkey' },
    },
  ];

  if (p.totp && p.backupCodesRemaining !== null) {
    const low = p.backupCodesRemaining < LOW_BACKUP;
    items.push({
      id: 'backup',
      label: 'Mã dự phòng',
      state: low ? 'todo' : 'ok',
      detail: `Còn ${p.backupCodesRemaining} mã chưa dùng.${low ? ' Mất điện thoại lúc này là khó vào lại.' : ''}`,
      action: low ? { label: 'Tạo lại', onClick: on.regenerateBackupCodes } : undefined,
    });
  }

  if (p.password.set) {
    const { breached, checkedAt } = p.password;
    items.push({
      id: 'password',
      label: 'Mật khẩu không nằm trong kho rò rỉ',
      state: breached === null ? 'unknown' : breached ? 'todo' : 'ok',
      detail:
        breached === null
          ? 'Chưa đối chiếu được (kiểm ở lần đăng nhập bằng mật khẩu kế tiếp).'
          : breached
            ? 'Mật khẩu này đã xuất hiện trong một vụ rò rỉ dữ liệu công khai. Đổi ngay.'
            : `Đã đối chiếu với kho HaveIBeenPwned ngày ${formatDateVN(checkedAt as string)}.`,
      action: breached ? { label: 'Đổi mật khẩu', href: '/settings/profile' } : undefined,
    });
  }
  return items;
}
