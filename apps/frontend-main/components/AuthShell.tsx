import React from 'react';
import { Layout, Logo, Icon } from '@tsudev/ui';
import type { IconName } from '@tsudev/ui';

import Seo from './Seo';

/**
 * Khung chung cho năm trang xác thực (/login, /signup, /forgot-password,
 * /reset-password, /verify-email).
 *
 * Một cột hẹp, căn giữa, không có gì khác trên màn hình. Trang xác thực là nơi
 * người dùng dễ bị dẫn dụ nhất, nên nó cố ý KHÔNG có điều hướng phụ, banner hay
 * ô tìm kiếm - càng ít thứ bấm được thì càng ít thứ để giả mạo.
 */
type AuthShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

// Cột thương hiệu nói đúng ba cơ chế bảo vệ tài khoản ĐANG chạy (docs/auth.md) -
// không có liên kết nào, đúng nguyên tắc "càng ít thứ bấm được càng ít thứ để
// giả mạo" ở trên. Ẩn dưới lg: trên điện thoại form phải là thứ đầu tiên.
const GUARANTEES: [IconName, string, string][] = [
  ['lock', 'Mật khẩu băm Argon2id', 'Máy chủ không bao giờ lưu mật khẩu dạng rõ.'],
  ['shield', 'Xác thực hai lớp', 'Mã TOTP từ ứng dụng xác thực, kèm mã dự phòng.'],
  ['passkey', 'Passkey', 'Đăng nhập bằng vân tay hoặc khoá thiết bị, không cần mật khẩu.'],
];

export const AuthShell = ({ title, description, children, footer }: AuthShellProps) => (
  <Layout active="/login" bare>
    <Seo title={`${title} - tsudev`} description={description} />
    <div className="tsu-hero-bg border-b border-line">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-12 md:py-16 lg:grid-cols-[1fr_26rem]">
        <div className="hidden lg:block">
          <Logo size={40} />
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-fg text-balance">
            Một tài khoản cho mọi ứng dụng tsudev
          </h2>
          <ul className="mt-8 space-y-5">
            {GUARANTEES.map(([icon, head, text]) => (
              <li key={head} className="flex gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface shadow-sm">
                  <Icon name={icon} size={20} />
                </span>
                <span>
                  <span className="block font-semibold text-fg">{head}</span>
                  <span className="block text-sm text-fg-muted">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-auto w-full max-w-104">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-lg sm:p-8">
            <h1 className="text-2xl font-bold text-fg">{title}</h1>
            {description && <p className="mt-1.5 text-sm text-fg-muted">{description}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-4 text-center text-sm text-fg-muted">{footer}</div>}
        </div>
      </div>
    </div>
  </Layout>
);

/**
 * Ô thông báo lỗi/thành công.
 *
 * `role="alert"` để trình đọc màn hình đọc ngay khi nó xuất hiện - không có nó
 * thì người dùng bàn phím gửi form, không nghe thấy gì, và không biết vì sao
 * trang không đi tiếp.
 */
export const Notice = ({ kind, children }: { kind: 'error' | 'ok'; children: React.ReactNode }) => (
  <div
    role="alert"
    className={`mb-4 rounded-lg border px-3 py-2.5 text-sm ${
      kind === 'error'
        ? 'border-transparent bg-danger-tint text-danger-ink'
        : 'border-transparent bg-success-tint text-success-ink'
    }`}
  >
    {children}
  </div>
);

export default AuthShell;
