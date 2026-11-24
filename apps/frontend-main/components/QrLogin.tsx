import React, { useCallback, useEffect, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button, Input } from '@tsudev/ui';

import { Notice } from './AuthShell';
import { QrSvg } from './QrSvg';
import { useLoader } from '../lib/useLoader';

/**
 * Đ2 KÉO - thiết bị MỚI hiện QR (CROSS_DEVICE_LOGIN mục 4.1, 6.2). Thiết bị đã đăng nhập quét bằng camera, bấm
 * Cho phép, đọc mã khớp; người dùng gõ mã ở đây. `poll` và vé nằm trong cookie HttpOnly (proxy `/api/xd`) - trang
 * này không thấy chúng. QR đổi mỗi 30 giây khi chưa ai quét; hết 120 giây thì tạo phiên mới.
 */
const POLL_MS = 2000;
const ROTATE_MS = 30_000;

type Phase = 'loading' | 'qr' | 'scanned' | 'code' | 'signing' | 'error';

export const xdMessage = (error: string | undefined, left?: number): string => {
  switch (error) {
    case 'wrong_code':
      return `Mã chưa đúng. Còn ${left ?? 0} lần thử.`;
    case 'too_many_attempts':
    case 'used_or_expired':
    case 'expired':
      return 'Mã QR đã hết hạn. Đang tạo mã mới...';
    case 'country_mismatch':
      return 'Không thể xác nhận: hai thiết bị đang ở hai quốc gia khác nhau.';
    case 'conflict':
      return 'Mã QR này đã được dùng. Tạo mã mới trên thiết bị kia.';
    default:
      return 'Không kết nối được dịch vụ xác thực. Thử lại sau.';
  }
};

const call = async (action: string, body: object = {}) => {
  const r = await fetch(`/api/xd/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return {
    ok: r.ok,
    status: r.status,
    data: (await r.json().catch(() => ({}))) as Record<string, unknown>,
  };
};

export function QrLogin({ callbackUrl }: { callbackUrl: string }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const session = useRef<{ id: string; at: number } | null>(null);

  const start = useCallback(async () => {
    const r = await call('create-pull');
    if (!r.ok) {
      setPhase('error');
      setMsg(xdMessage(String(r.data.error || '')));
      return;
    }
    const id = String(r.data.id);
    session.current = { id, at: Date.now() };
    setQr(`${window.location.origin}/x/${id}?f=k#${String(r.data.k)}`);
    setCode('');
    setPhase('qr');
  }, []);

  useLoader(start);

  useEffect(() => {
    if (phase !== 'qr' && phase !== 'scanned') return undefined;
    const t = setInterval(async () => {
      const s = session.current;
      if (!s) return;
      if (phase === 'qr' && Date.now() - s.at > ROTATE_MS) return void start();
      const r = await call('status', { id: s.id });
      const state = String(r.data.state || '');
      if (!r.ok || state === 'dead') {
        setMsg(r.ok ? 'Yêu cầu đăng nhập đã bị từ chối trên thiết bị kia.' : xdMessage('expired'));
        return void start();
      }
      if (state === 'scanned') setPhase('scanned');
      if (state === 'awaiting_code') setPhase('code');
    }, POLL_MS);
    return () => clearInterval(t);
  }, [phase, start]);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = session.current;
    if (!s) return;
    setMsg('');
    const r = await call('verify', { id: s.id, code });
    if (!r.ok) {
      setMsg(xdMessage(String(r.data.error || ''), Number(r.data.attemptsLeft)));
      if (r.status === 410) void start();
      return;
    }
    setPhase('signing');
    const res = await signIn('qr', { redirect: false });
    if (res?.error) {
      setPhase('error');
      setMsg('Không đăng nhập được bằng mã QR. Thử lại.');
      return;
    }
    window.location.assign(callbackUrl);
  };

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {msg && <Notice kind="error">{msg}</Notice>}
      {(phase === 'loading' || phase === 'qr') && (
        <>
          <div className="w-52 rounded-lg bg-white p-2 ring-1 ring-line">
            {qr ? (
              <QrSvg value={qr} label="Mã QR đăng nhập" size={192} />
            ) : (
              <div className="aspect-square" />
            )}
          </div>
          <p className="text-sm text-fg-muted">
            Trên điện thoại <strong>đã đăng nhập</strong> TsuDEV, mở camera hoặc app TsuDEV và quét
            mã này.
          </p>
        </>
      )}
      {phase === 'scanned' && (
        <p className="text-sm text-fg-muted" role="status">
          Đã quét. Bấm <strong>Cho phép</strong> trên điện thoại để nhận mã.
        </p>
      )}
      {phase === 'code' && (
        <form onSubmit={onVerify} className="flex w-full flex-col gap-3">
          <Input
            id="xd-code"
            name="code"
            label="Nhập mã hiện trên điện thoại"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX"
            maxLength={9}
            required
          />
          <Button type="submit" className="w-full">
            Xác nhận
          </Button>
        </form>
      )}
      {phase === 'signing' && (
        <p className="text-sm text-fg-muted" role="status">
          Đang đăng nhập...
        </p>
      )}
      {phase === 'error' && (
        <Button variant="secondary" onClick={() => void start()}>
          Tạo mã mới
        </Button>
      )}
    </div>
  );
}
