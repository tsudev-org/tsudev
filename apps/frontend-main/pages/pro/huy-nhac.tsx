import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@tsudev/ui';

import { AuthShell, Notice } from '../../components/AuthShell';

/**
 * Huỷ nhận thư nhắc gia hạn TsuDEV Pro (PRO2 2.4) - đích của link trong thư.
 *
 * Cố ý PHẢI BẤM NÚT, không tự gọi API khi mở trang: trình quét link của hộp thư (Outlook Safe
 * Links, máy quét chống lừa đảo) mở mọi link trong thư, và trang tự huỷ khi mở nghĩa là thư bị
 * huỷ hộ người dùng. Một cú bấm từ hộp thư (One-Click RFC 8058) đi thẳng vào `/api/pro/huy-nhac`.
 */
type State = 'idle' | 'busy' | 'ok' | 'failed';

export default function ProUnsubscribePage() {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const u = typeof router.query.u === 'string' ? router.query.u : '';
  const t = typeof router.query.t === 'string' ? router.query.t : '';
  const broken = router.isReady && (!u || !t);

  const submit = async () => {
    setState('busy');
    try {
      const res = await fetch('/api/pro/huy-nhac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ u, t }),
      });
      setState(res.ok ? 'ok' : 'failed');
    } catch {
      setState('failed');
    }
  };

  if (state === 'ok') {
    return (
      <AuthShell title="Đã huỷ nhận thư nhắc" noindex>
        <Notice kind="ok">
          Bạn sẽ không nhận thư nhắc gia hạn TsuDEV Pro nữa. Thư bảo mật và giao dịch vẫn gửi bình
          thường.
        </Notice>
        <Button as="a" href="/pro" variant="secondary" className="mt-4 w-full">
          Xem TsuDEV Pro
        </Button>
      </AuthShell>
    );
  }

  if (broken || state === 'failed') {
    return (
      <AuthShell title="Không huỷ được" noindex>
        <Notice kind="error">
          Liên kết không hợp lệ. Hãy mở lại đúng liên kết trong thư nhắc gia hạn.
        </Notice>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Huỷ nhận thư nhắc gia hạn"
      description="Ngừng nhận thư nhắc khi TsuDEV Pro sắp hết hạn, đã hết hạn và trước khi bản sao đám mây bị xoá."
      noindex
    >
      <Button
        onClick={submit}
        disabled={!router.isReady || state === 'busy'}
        className="mt-2 w-full"
      >
        {state === 'busy' ? 'Đang huỷ…' : 'Huỷ nhận thư nhắc'}
      </Button>
    </AuthShell>
  );
}
