import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@tsudev/ui';

import { Notice } from './AuthShell';
import { QrApproveCard, QrCodeShow } from './QrApprove';
import type { XdRequester } from './QrApprove';
import { xdMessage } from './QrLogin';
import { QrSvg } from './QrSvg';

/**
 * Đ1 ĐẨY - thiết bị ĐÃ đăng nhập hiện QR để đăng nhập điện thoại (CROSS_DEVICE_LOGIN mục 4.2). Điện thoại quét bằng
 * camera (hoặc "Quét để đăng nhập" trong app), máy này bấm Cho phép rồi đọc mã khớp cho điện thoại gõ.
 */
type Phase = 'idle' | 'qr' | 'approve' | 'code' | 'done';

const call = async (action: string, body: object = {}) => {
  const r = await fetch(`/api/xd/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { ok: r.ok, data: (await r.json().catch(() => ({}))) as Record<string, unknown> };
};

export function QrPush() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [requester, setRequester] = useState<XdRequester | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const session = useRef<{ id: string; at: number } | null>(null);

  const start = useCallback(async () => {
    setMsg('');
    const r = await call('create-push');
    if (!r.ok) return setMsg(xdMessage(String(r.data.error || '')));
    const id = String(r.data.id);
    session.current = { id, at: Date.now() };
    setQr(`${window.location.origin}/x/${id}?f=d#${String(r.data.k)}`);
    setPhase('qr');
  }, []);

  useEffect(() => {
    if (phase !== 'qr') return undefined;
    const t = setInterval(async () => {
      const s = session.current;
      if (!s) return;
      if (Date.now() - s.at > 30_000) return void start();
      const r = await call('peek', { id: s.id });
      if (!r.ok) return void start();
      if (r.data.state === 'scanned' && r.data.requester) {
        setRequester(r.data.requester as XdRequester);
        setPhase('approve');
      }
    }, 2000);
    return () => clearInterval(t);
  }, [phase, start]);

  const approve = async () => {
    setBusy(true);
    const r = await call('approve', { id: session.current?.id });
    setBusy(false);
    if (!r.ok) {
      setMsg(xdMessage(String(r.data.error || '')));
      return setPhase('idle');
    }
    setCode(String(r.data.code));
    setPhase('code');
  };
  const deny = async () => {
    setBusy(true);
    await call('deny', { id: session.current?.id });
    setBusy(false);
    setPhase('idle');
  };

  return (
    <div className="flex flex-col gap-4">
      {msg && <Notice kind="error">{msg}</Notice>}
      {phase === 'idle' && (
        <>
          <p className="text-sm text-fg-muted">
            Đăng nhập app hoặc trình duyệt trên điện thoại mà không gõ mật khẩu: điện thoại quét mã,
            máy này xác nhận và hiện mã khớp để bạn nhập trên điện thoại.
          </p>
          <Button variant="secondary" onClick={() => void start()} className="self-start">
            Hiện mã QR
          </Button>
        </>
      )}
      {phase === 'qr' && (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-52 rounded-lg bg-white p-2 ring-1 ring-line">
            <QrSvg value={qr} label="Mã QR đăng nhập trên điện thoại" size={192} />
          </div>
          <p className="text-sm text-fg-muted">
            Quét bằng camera điện thoại. Mã tự đổi sau 30 giây.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setPhase('idle')}>
            Đóng
          </Button>
        </div>
      )}
      {phase === 'approve' && requester && (
        <QrApproveCard requester={requester} busy={busy} onApprove={approve} onDeny={deny} />
      )}
      {phase === 'code' && (
        <>
          <QrCodeShow code={code} />
          <Button
            variant="ghost"
            size="sm"
            className="self-center"
            onClick={() => setPhase('idle')}
          >
            Xong
          </Button>
        </>
      )}
    </div>
  );
}
