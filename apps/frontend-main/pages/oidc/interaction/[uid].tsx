import React, { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { Button } from '@tsudev/ui';

import { AuthShell, Notice } from '../../../components/AuthShell';
import { IDENTITY, internalHeaders } from '../../../lib/services';
import { identityHeaders } from '../../../lib/identity';
import { readSessionToken } from '../../../lib/sessionCookie';
import { oidcCookies } from '../../../lib/oidcCookie';

/**
 * Trang đồng ý "Đăng nhập bằng tài khoản tsudev" (P4, D1). `oidc-provider` chuyển
 * trình duyệt tới đây với cookie `_interaction` gắn đúng đường dẫn này. Chưa đăng nhập
 * tsudev.com ⇒ về /login rồi quay lại. Đã đăng nhập ⇒ hiện site con xin những gì.
 */
type Props =
  { ok: true; uid: string; clientName: string; scopes: string[] } | { ok: false; uid: string };

const SCOPE_TEXT: Record<string, string> = {
  openid: 'Biết bạn là ai (mã tài khoản tsudev)',
  profile: 'Tên hiển thị, tên đăng nhập, ảnh đại diện',
  email: 'Địa chỉ email và trạng thái xác minh',
  offline_access: 'Giữ đăng nhập khi bạn không mở trang (tối đa 30 ngày)',
};

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, params }) => {
  const uid = String(params?.uid || '');
  const token = await readSessionToken(req);
  if (!token) {
    return {
      redirect: {
        destination: `/login?callbackUrl=${encodeURIComponent(`/oidc/interaction/${uid}`)}`,
        permanent: false,
      },
    };
  }
  try {
    const r = await fetch(`${IDENTITY}/api/identity/oidc/interaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...internalHeaders(),
        ...(await identityHeaders(token)),
        'x-oidc-cookie': oidcCookies(req.headers.cookie),
      },
      body: '{}',
    });
    if (!r.ok) return { props: { ok: false, uid } };
    const d = (await r.json()) as { clientName: string; scopes: string[] };
    return { props: { ok: true, uid, clientName: d.clientName, scopes: d.scopes } };
  } catch {
    return { props: { ok: false, uid } };
  }
};

export default function OidcConsent(props: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!props.ok) {
    return (
      <AuthShell noindex title="Phiên đăng nhập đã hết hạn">
        <Notice kind="error">
          Yêu cầu đăng nhập này đã hết hạn hoặc không hợp lệ. Quay lại ứng dụng và bấm đăng nhập
          lại.
        </Notice>
      </AuthShell>
    );
  }

  const decide = async (allow: boolean) => {
    setBusy(true);
    setErr('');
    const r = await fetch(`/oidc/interaction/${encodeURIComponent(props.uid)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allow }),
    }).catch(() => null);
    const d = r ? ((await r.json().catch(() => ({}))) as { redirectTo?: string }) : {};
    if (!r?.ok || !d.redirectTo) {
      setBusy(false);
      return setErr('Không hoàn tất được. Quay lại ứng dụng và thử đăng nhập lại.');
    }
    window.location.assign(d.redirectTo);
  };

  return (
    <AuthShell noindex title={`${props.clientName} muốn dùng tài khoản tsudev của bạn`}>
      {err && <Notice kind="error">{err}</Notice>}
      <p className="text-sm text-fg-secondary">Ứng dụng sẽ được biết:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg">
        {props.scopes.map((s) => (
          <li key={s}>{SCOPE_TEXT[s] || s}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-fg-muted">
        Mật khẩu của bạn KHÔNG được chia sẻ. Thu hồi bất cứ lúc nào bằng &quot;Đăng xuất khỏi mọi
        thiết bị&quot; ở Bảo mật tài khoản.
      </p>
      <div className="mt-5 flex gap-2">
        <Button className="flex-1" onClick={() => decide(true)} disabled={busy}>
          Cho phép
        </Button>
        <Button
          className="flex-1"
          variant="secondary"
          onClick={() => decide(false)}
          disabled={busy}
        >
          Từ chối
        </Button>
      </div>
    </AuthShell>
  );
}
