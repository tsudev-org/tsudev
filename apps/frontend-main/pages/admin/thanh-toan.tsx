import React, { useCallback, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Badge, Button, Card, Input, Layout } from '@tsudev/ui';
import type { BadgeTone } from '@tsudev/ui';
import Seo from '../../components/Seo';
import { MfaRequiredNotice } from '../../components/MfaRequiredNotice';
import { isMfaRequired } from '../../lib/mfa';
import { useLoader } from '../../lib/useLoader';
import { formatDateTimeVN } from '../../lib/format';
import { PLAN_LABEL, STATUS_LABEL, payCall, payErr, vnd } from '../../lib/pay';
import type { Intent, IntentStatus } from '../../lib/pay';

/**
 * Đối soát chuyển khoản VietQR (PRO-B bước B3) - CHỈ OWNER, bắt buộc TOTP.
 *
 * Cổng thật ở auth-service (`requireOwner` của paymentRoutes.ts: vai trò TỪ DB, fail closed,
 * `requireSecondFactor`; mỗi lần xác nhận/từ chối ghi `actorId` vào nhật ký useradmin). Trang
 * này KHÔNG tin `session.role` - nó hỏi máy chủ rồi vẽ theo 401/403/MFA_REQUIRED.
 *
 * Quy trình: mở sao kê ngân hàng ⇒ tìm dòng có nội dung `TSU <mã>` ⇒ dán mã vào ô tìm ⇒ đối chiếu
 * SỐ TIỀN ⇒ Xác nhận. Xác nhận hai lần chỉ ghi MỘT sự kiện (máy chủ khoá trạng thái trước khi
 * ghi sổ). Mã đã hết hạn 72 giờ vẫn xác nhận được (tiền về trễ).
 */
type Row = Intent & { username: string; displayName: string | null; confirmedBy: string | null };

const TABS: { value: IntentStatus; label: string }[] = [
  { value: 'pending', label: 'Chờ đối soát' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'rejected', label: 'Đã từ chối' },
];

const TONE: Record<IntentStatus, BadgeTone> = {
  pending: 'warning',
  confirmed: 'success',
  expired: 'neutral',
  rejected: 'danger',
};

export default function AdminPayments() {
  const { status } = useSession();
  const [tab, setTab] = useState<IntentStatus>('pending');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: BadgeTone; text: string } | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      const r = await payCall<{ items?: Row[] }>(
        'payadmin/list',
        { status: tab, ...(query ? { q: query } : {}) },
        signal
      );
      if (signal?.aborted) return;
      setLoading(false);
      if (isMfaRequired(r.status, r.data)) return setMfaRequired(true);
      if (r.status === 401 || r.status === 403) return setDenied(true);
      if (!r.ok) return setMsg({ tone: 'danger', text: payErr(r.data) });
      setRows(Array.isArray(r.data.items) ? r.data.items : []);
    },
    [tab, query]
  );
  useLoader(load, status === 'authenticated' && !denied && !mfaRequired);

  const act = async (row: Row, action: 'confirm' | 'reject') => {
    const label = action === 'confirm' ? 'XÁC NHẬN đã nhận' : 'TỪ CHỐI';
    if (
      !window.confirm(
        `${label} ${vnd(row.amountVnd)} của @${row.username}, nội dung TSU ${row.code}?\n\nĐối chiếu số tiền với sao kê trước khi bấm.`
      )
    )
      return;
    setBusy(row.code);
    setMsg(null);
    const r = await payCall<{ recorded?: boolean; proUntil?: string | null }>(
      `payadmin/${action}`,
      { code: row.code }
    );
    setBusy(null);
    if (isMfaRequired(r.status, r.data)) return setMfaRequired(true);
    if (!r.ok) return setMsg({ tone: 'danger', text: payErr(r.data) });
    setMsg({
      tone: 'success',
      text:
        action === 'confirm'
          ? `Đã xác nhận TSU ${row.code}${r.data.proUntil ? ` - Pro tới ${formatDateTimeVN(r.data.proUntil)}` : ''}.`
          : `Đã từ chối TSU ${row.code}.`,
    });
    load();
  };

  if (status === 'loading')
    return (
      <Layout>
        <Seo title="Thanh toán" path="/admin/thanh-toan" noindex />
        <Card className="p-8 text-center text-fg-muted">Đang tải…</Card>
      </Layout>
    );

  if (status !== 'authenticated')
    return (
      <Layout>
        <Seo title="Thanh toán" path="/admin/thanh-toan" noindex />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-fg mb-2">Đối soát thanh toán</h1>
          <p className="text-fg-muted mb-4">Đăng nhập bằng tài khoản chủ sở hữu.</p>
          <Button onClick={() => signIn()}>Đăng nhập</Button>
        </div>
      </Layout>
    );

  if (mfaRequired)
    return (
      <Layout>
        <Seo title="Thanh toán" path="/admin/thanh-toan" noindex />
        <MfaRequiredNotice className="mt-10" />
      </Layout>
    );

  if (denied)
    return (
      <Layout>
        <Seo title="Thanh toán" path="/admin/thanh-toan" noindex />
        <Card className="mx-auto mt-10 max-w-md p-8 text-center" role="alert">
          <h1 className="mb-2 text-lg font-semibold text-fg">Không có quyền</h1>
          <p className="text-fg-secondary">Chỉ tài khoản chủ sở hữu mới vào được trang này.</p>
        </Card>
      </Layout>
    );

  return (
    <Layout active="/admin">
      <Seo title="Thanh toán" path="/admin/thanh-toan" noindex />
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold text-fg">Đối soát thanh toán VietQR</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Tìm nội dung <code className="font-mono">TSU …</code> trên sao kê, dán vào ô dưới, đối
          chiếu số tiền rồi xác nhận. Mỗi thao tác được ghi vào nhật ký với tài khoản của bạn.
        </p>

        <form
          className="mt-5 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q.trim());
          }}
        >
          <div className="min-w-56 flex-1">
            <Input
              label="Mã (từ nội dung chuyển khoản)"
              value={q}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
              placeholder="TSU 7K2M9QXA"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <Button type="submit" variant="secondary">
            Tìm
          </Button>
          {query && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQ('');
                setQuery('');
              }}
            >
              Bỏ tìm
            </Button>
          )}
        </form>

        {!query && (
          <div className="mt-4 flex flex-wrap gap-1" role="tablist" aria-label="Trạng thái">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={`h-8 rounded-md px-3 text-sm ${
                  tab === t.value ? 'bg-subtle text-fg' : 'text-fg-secondary hover:bg-hovered'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {msg && (
          <div className="mt-4" role="status">
            <Badge tone={msg.tone}>{msg.text}</Badge>
          </div>
        )}

        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-fg-secondary">
              <tr>
                <th className="px-3 py-2 font-medium">Mã</th>
                <th className="px-3 py-2 font-medium">Tài khoản</th>
                <th className="px-3 py-2 font-medium">Gói</th>
                <th className="px-3 py-2 text-right font-medium">Số tiền</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
                <th className="px-3 py-2 font-medium">Tạo lúc</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.code}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-fg">TSU {r.code}</td>
                  <td className="px-3 py-2 text-fg">
                    @{r.username}
                    {r.app && <span className="block text-xs text-fg-muted">app: {r.app}</span>}
                  </td>
                  <td className="px-3 py-2 text-fg-secondary">{PLAN_LABEL[r.kind] ?? r.kind}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-fg">
                    {vnd(r.amountVnd)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={TONE[r.status] ?? 'neutral'}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-fg-secondary">
                    {formatDateTimeVN(r.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {(r.status === 'pending' || r.status === 'expired') && (
                      <span className="inline-flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => act(r, 'confirm')}
                          disabled={busy !== null}
                        >
                          {busy === r.code ? '…' : 'Xác nhận'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => act(r, 'reject')}
                          disabled={busy !== null}
                        >
                          Từ chối
                        </Button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-fg-muted">
                    {query ? 'Không có mã này.' : 'Không có mục nào.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
