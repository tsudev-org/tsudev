import React from 'react';
import { Card } from '@tsudev/ui';

import { MFA_SETUP_PATH } from '../lib/mfa';

/**
 * Khối hướng dẫn hiện THAY cho "Không có quyền" khi backend trả 403
 * `code: 'MFA_REQUIRED'`. Người dùng ở đây CÓ vai trò quản trị - chỉ thiếu yếu tố
 * thứ hai - nên nói "không có quyền" là chỉ sai đường: họ sẽ đi hỏi xin quyền
 * thay vì tự bật 2FA trong một phút.
 */
export function MfaRequiredNotice({ className = '' }: { className?: string }) {
  return (
    <Card role="alert" className={`mx-auto max-w-md p-8 text-center ${className}`}>
      <h1 className="mb-2 text-lg font-semibold text-fg">Cần bật xác thực hai lớp</h1>
      <p className="mb-4 text-fg-secondary">
        Tài khoản quản trị phải bật ứng dụng xác thực (TOTP) trước khi dùng các trang quản trị.
        Passkey hiện chưa được tính cho khu quản trị. Bật TOTP ở trang bảo mật tài khoản, rồi quay
        lại đây.
      </p>
      <a
        href={MFA_SETUP_PATH}
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover"
      >
        Bật ứng dụng xác thực ở trang bảo mật
      </a>
    </Card>
  );
}

export default MfaRequiredNotice;
