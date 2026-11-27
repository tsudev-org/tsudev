import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { signIn, useSession } from 'next-auth/react';
import { Button, Input } from '@tsudev/ui';

import { AuthShell, Notice } from '../../../frontend-main/components/AuthShell';
import { QrApproveCard, QrCodeShow } from '../../../frontend-main/components/QrApprove';
import type { XdRequester } from '../../../frontend-main/components/QrApprove';
import { xdMessage } from '../../../frontend-main/components/QrLogin';

/**
 * Đích của MỌI mã QR đăng nhập (CROSS_DEVICE_LOGIN): `/x/<id>?f=k#<bí mật>` (Đ2 kéo) hoặc `?f=d` (Đ1 đẩy). Quét bằng
 * camera điện thoại là tới đây, không cần app. Vai do trạng thái đăng nhập của trình duyệt này quyết định:
 *   - Đ2 + đã đăng nhập ⇒ thiết bị XÁC NHẬN (Cho phép ⇒ hiện mã);
 *   - Đ1 + chưa đăng nhập ⇒ thiết bị MỚI (thấy tài khoản sắp vào ⇒ gõ mã hiện trên máy kia ⇒ đăng nhập).
 * Bí mật nằm sau `#` (không tới máy chủ, không vào log); đọc xong xoá khỏi thanh địa chỉ và lịch sử.
 */
type View =
  | { kind: 'loading' }
  | { kind: 'info'; text: string }
  | { kind: 'approve'; requester: XdRequester }
  | { kind: 'code'; code: string }
  | { kind: 'waiting' }
  | { kind: 'confirm-account'; email: string; name: string }
  | { kind: 'enter-code'; email: string };

const call = async (action: string, body: object) => {
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

export default function QrLanding() {
  const router = useRouter();
  const { status } = useSession();
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const started = useRef(false);
  const secret = useRef('');
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const flow = router.query.f === 'd' ? 'push' : 'pull';

  useEffect(() => {
    if (!router.isReady || status === 'loading' || started.current) return;
    started.current = true;
    secret.current = window.location.hash.slice(1);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    void (async () => {
      if (!secret.current || !id)
        return setView({ kind: 'info', text: 'Mã QR này không phải của tsudev.' });
      if (flow === 'pull') {
        if (status !== 'authenticated') {
          return setView({
            kind: 'info',
            text: 'Mở mã này bằng thiết bị ĐÃ đăng nhập TsuDEV (đăng nhập trên thiết bị này rồi quét lại).',
          });
        }
        const r = await call('scan', { id, k: secret.current });
        if (!r.ok)
          return setView({ kind: 'info', text: xdMessage(String(r.data.error || 'expired')) });
        return setView({ kind: 'approve', requester: r.data.requester as XdRequester });
      }
      if (status === 'authenticated') {
        return setView({
          kind: 'info',
          text: 'Thiết bị này đã đăng nhập TsuDEV - không cần quét mã.',
        });
      }
      const r = await call('claim', { id, k: secret.current });
      if (!r.ok)
        return setView({ kind: 'info', text: xdMessage(String(r.data.error || 'expired')) });
      setView({ kind: 'waiting' });
    })();
  }, [router.isReady, status, id, flow]);

  // Đ1, thiết bị mới: chờ máy kia bấm Cho phép.
  useEffect(() => {
    if (view.kind !== 'waiting') return undefined;
    const t = setInterval(async () => {
      const r = await call('status', { id });
      const state = String(r.data.state || '');
      if (!r.ok || state === 'dead') {
        clearInterval(t);
        setView({ kind: 'info', text: 'Yêu cầu đăng nhập đã bị từ chối trên thiết bị kia.' });
      } else if (state === 'awaiting_code') {
        clearInterval(t);
        const acc = (r.data.account || {}) as { email?: string; displayName?: string };
        setView({ kind: 'confirm-account', email: acc.email || '', name: acc.displayName || '' });
      }
    }, 2000);
    return () => clearInterval(t);
  }, [view.kind, id]);

  const approve = async () => {
    setBusy(true);
    const r = await call('approve', { id });
    setBusy(false);
    if (!r.ok) return setView({ kind: 'info', text: xdMessage(String(r.data.error || '')) });
    setView({ kind: 'code', code: String(r.data.code) });
  };
  const deny = async () => {
    setBusy(true);
    await call('deny', { id });
    setBusy(false);
    setView({ kind: 'info', text: 'Đã từ chối. Thiết bị kia không đăng nhập được.' });
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    const r = await call('verify', { id, code });
    if (!r.ok) {
      setBusy(false);
      if (r.status === 410) return setView({ kind: 'info', text: xdMessage('expired') });
      return setMsg(xdMessage(String(r.data.error || ''), Number(r.data.attemptsLeft)));
    }
    const res = await signIn('qr', { redirect: false });
    if (res?.error) {
      setBusy(false);
      return setMsg('Không đăng nhập được bằng mã QR. Thử lại.');
    }
    window.location.assign('/');
  };

  return (
    <AuthShell
      title="Đăng nhập bằng mã QR"
      description="Xác nhận đăng nhập giữa hai thiết bị của bạn."
    >
      {msg && <Notice kind="error">{msg}</Notice>}
      {view.kind === 'loading' && <p className="text-sm text-fg-muted">Đang kiểm tra mã...</p>}
      {view.kind === 'info' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg">{view.text}</p>
          <Button variant="secondary" onClick={() => router.push('/')}>
            Về trang chủ
          </Button>
        </div>
      )}
      {view.kind === 'approve' && (
        <QrApproveCard requester={view.requester} busy={busy} onApprove={approve} onDeny={deny} />
      )}
      {view.kind === 'code' && <QrCodeShow code={view.code} />}
      {view.kind === 'waiting' && (
        <p className="text-sm text-fg-muted" role="status">
          Đã quét. Bấm <strong>Cho phép</strong> trên máy tính đang đăng nhập để nhận mã.
        </p>
      )}
      {view.kind === 'confirm-account' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg">
            Bạn sắp đăng nhập vào tài khoản <strong>{view.name}</strong> ({view.email}).
          </p>
          <Button onClick={() => setView({ kind: 'enter-code', email: view.email })}>
            Đúng tài khoản của tôi
          </Button>
          <Button variant="secondary" onClick={() => router.push('/')}>
            Không phải tôi
          </Button>
        </div>
      )}
      {view.kind === 'enter-code' && (
        <form onSubmit={verify} className="flex flex-col gap-3">
          <Input
            id="xd-code"
            name="code"
            label="Nhập mã hiện trên máy tính"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX"
            maxLength={9}
            required
          />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Đang đăng nhập...' : 'Xác nhận'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
