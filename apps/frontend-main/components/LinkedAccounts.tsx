import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { Badge, Button } from '@tsudev/ui';

import { formatDateVN } from '../lib/format';
import { useLoader } from '../lib/useLoader';

/**
 * Tài khoản liên kết (STD43, AUTH_AND_ACCOUNT mục 15 `/me/identities`): xem, liên kết,
 * gỡ Google/GitHub. Danh sách nhà cung cấp lấy từ CHÍNH `GET /api/v1/auth/providers` -
 * nguồn mà RP cũng dùng - nên chỉ nhà cung cấp IdP đang bật mới có nút.
 *
 * Liên kết: POST /api/account-link (cookie ý định ký, 10 phút) rồi `signIn(provider)`; callback
 * gắn tài khoản vào phiên HIỆN TẠI và quay về đây với `?linked=` hoặc `?link_error=`.
 */

type Res = { ok: boolean; status: number; data: Record<string, unknown> };
type Post = (path: string, body?: unknown) => Promise<Res>;
type StepUp = { run: (label: string, fn: (token?: string) => Promise<Res>) => Promise<Res | null> };
type Msg = { kind: 'error' | 'ok'; text: string } | null;

type Provider = { id: string; name: string };
type Linked = { provider: string; createdAt: string };

const LINK_ERRORS: Record<string, string> = {
  oauth_linked_elsewhere:
    'Tài khoản này đã gắn với một tài khoản TsuDEV khác. Đăng nhập tài khoản đó và gỡ liên kết trước.',
  oauth_provider_already_linked:
    'Tài khoản của bạn đã liên kết một tài khoản khác của nhà cung cấp này.',
  unauthenticated: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi thử lại.',
};

const UNLINK_ERRORS: Record<string, string> = {
  last_login_method:
    'Đây là cách đăng nhập duy nhất của tài khoản. Hãy đặt mật khẩu hoặc thêm passkey trước khi gỡ.',
  not_linked: 'Nhà cung cấp này chưa được liên kết.',
};

export function LinkedAccounts({
  post,
  stepUp,
  setMsg,
  onChanged,
}: {
  post: Post;
  stepUp: StepUp;
  setMsg: (m: Msg) => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [linked, setLinked] = useState<Linked[]>([]);
  const [busy, setBusy] = useState('');

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const [p, l] = await Promise.all([
        fetch('/api/v1/auth/providers', { signal })
          .then((r) => (r.ok ? r.json() : { providers: [] }))
          .catch(() => ({ providers: [] })),
        post('oauth/list'),
      ]);
      if (signal?.aborted) return;
      setProviders(Array.isArray(p?.providers) ? (p.providers as Provider[]) : []);
      const accounts = (l.data as { accounts?: unknown }).accounts;
      if (l.ok && Array.isArray(accounts)) setLinked(accounts as Linked[]);
    },
    [post]
  );
  useLoader(refresh, true);

  // Quay về từ nhà cung cấp: báo kết quả, dọn cookie ý định (dùng một lần), bỏ query.
  const linkedQ = typeof router.query.linked === 'string' ? router.query.linked : '';
  const errorQ = typeof router.query.link_error === 'string' ? router.query.link_error : '';
  useEffect(() => {
    if (!linkedQ && !errorQ) return;
    void fetch('/api/account-link', { method: 'DELETE' }).catch(() => undefined);
    setMsg(
      linkedQ
        ? { kind: 'ok', text: 'Đã liên kết tài khoản đăng nhập bên thứ ba.' }
        : { kind: 'error', text: LINK_ERRORS[errorQ] ?? 'Không liên kết được. Hãy thử lại.' }
    );
    void router.replace('/settings/security#lien-ket', undefined, { shallow: true });
  }, [linkedQ, errorQ, router, setMsg]);

  const link = async (id: string) => {
    setBusy(id);
    const res = await fetch('/api/account-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: id }),
    }).catch(() => null);
    if (!res?.ok) {
      setBusy('');
      setMsg({ kind: 'error', text: 'Không bắt đầu liên kết được. Hãy thử lại.' });
      return;
    }
    await signIn(id, { callbackUrl: '/settings/security#lien-ket' });
  };

  const unlink = async (id: string, name: string) => {
    if (!confirm(`Gỡ liên kết ${name}? Bạn sẽ không đăng nhập bằng ${name} được nữa.`)) return;
    setBusy(id);
    const r = await stepUp.run(`Gỡ liên kết ${name}`, (token) =>
      post('oauth/unlink', { provider: id, stepUp: token })
    );
    setBusy('');
    if (!r) return;
    if (!r.ok) {
      const code = String((r.data as { error?: unknown }).error ?? '');
      setMsg({ kind: 'error', text: UNLINK_ERRORS[code] ?? 'Không gỡ được liên kết.' });
      return;
    }
    setMsg({ kind: 'ok', text: `Đã gỡ liên kết ${name}.` });
    void refresh();
    onChanged();
  };

  if (providers === null) return <p className="text-sm text-fg-muted">Đang tải…</p>;
  if (providers.length === 0) {
    return (
      <p className="text-sm text-fg-muted">
        Chưa có nhà cung cấp đăng nhập bên ngoài nào được bật.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-line">
      {providers.map((p) => {
        const row = linked.find((l) => l.provider === p.id);
        return (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{p.name}</p>
              <p className="text-xs text-fg-muted">
                {row ? (
                  <>
                    <Badge tone="success">Đã liên kết</Badge> từ {formatDateVN(row.createdAt)}
                  </>
                ) : (
                  'Chưa liên kết'
                )}
              </p>
            </div>
            {row ? (
              <Button variant="ghost" onClick={() => unlink(p.id, p.name)} disabled={busy === p.id}>
                Gỡ liên kết
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => link(p.id)} disabled={busy === p.id}>
                {busy === p.id ? 'Đang chuyển…' : `Liên kết ${p.name}`}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
