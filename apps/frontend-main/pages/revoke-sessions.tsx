import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@tsudev/ui';

import { AuthShell, Notice } from '../components/AuthShell';

/**
 * "Không phải tôi" (P1.5) - đích của nút trong thư cảnh báo đăng nhập thiết bị mới.
 *
 * KHÁC verify-email / confirm-email-change: trang này KHÔNG tự gọi API khi mở.
 * Trình quét thư (Gmail, Outlook, phần mềm diệt virus) mở trước mọi liên kết
 * trong thư; một liên kết tự thu hồi phiên khi mở sẽ đăng xuất chính chủ ở MỖI
 * lần họ đăng nhập máy mới - và dạy họ bỏ qua thư cảnh báo. Thu hồi chỉ xảy ra
 * khi người dùng BẤM nút (POST).
 */
type State = 'idle' | 'busy' | 'ok' | 'failed';

export default function RevokeSessionsPage() {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const revoke = async () => {
    setState('busy');
    try {
      const res = await fetch('/api/identity/revoke-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? 'ok' : 'failed');
    } catch {
      setState('failed');
    }
  };

  if (state === 'ok') {
    return (
      <AuthShell noindex title="Đã đăng xuất mọi thiết bị">
        <Notice kind="ok">
          Mọi phiên đăng nhập của tài khoản (kể cả phiên lạ vừa rồi) đã mất hiệu lực. Bước tiếp theo
          BẮT BUỘC: đặt lại mật khẩu - kẻ đã đăng nhập được thì đang biết mật khẩu của bạn.
        </Notice>
        <Button as="a" href="/forgot-password" className="mt-4 w-full">
          Đặt lại mật khẩu
        </Button>
      </AuthShell>
    );
  }

  if (state === 'failed' || (router.isReady && !token)) {
    return (
      <AuthShell noindex title="Liên kết không còn dùng được">
        <Notice kind="error">
          Liên kết đã hết hạn (7 ngày), đã được dùng, hoặc đã có thư cảnh báo mới hơn. Nếu vẫn nghi
          ngờ, đặt lại mật khẩu - thao tác đó cũng đăng xuất mọi thiết bị.
        </Notice>
        <Button as="a" href="/forgot-password" variant="secondary" className="mt-4 w-full">
          Đặt lại mật khẩu
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell noindex title="Không phải bạn đăng nhập?">
      <p className="text-sm text-fg-secondary">
        Bấm nút dưới đây để đăng xuất tài khoản khỏi MỌI thiết bị ngay lập tức, kể cả thiết bị lạ
        trong thư cảnh báo. Sau đó hãy đặt lại mật khẩu.
      </p>
      <Button className="mt-4 w-full" onClick={revoke} disabled={state === 'busy' || !token}>
        {state === 'busy' ? 'Đang xử lý…' : 'Đăng xuất mọi thiết bị'}
      </Button>
    </AuthShell>
  );
}
