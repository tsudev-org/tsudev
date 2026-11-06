import React, { useCallback, useState } from 'react';
import Seo from '../../components/Seo';
import { useSession, signIn } from 'next-auth/react';
import { Layout, Card, Button, SectionHeading, Badge, Modal, Input, Stat } from '@tsudev/ui';
import type { BadgeTone } from '@tsudev/ui';
import type { PageMeta } from '@tsudev/types';

import { useUrlPaging, useUrlPagingSync } from '../../lib/useUrlPaging';
import { MfaRequiredNotice } from '../../components/MfaRequiredNotice';
import { isMfaRequired } from '../../lib/mfa';
import { formatDateTimeVN, NO_DATE } from '../../lib/format';
import { useLoader } from '../../lib/useLoader';

// Trung tâm an ninh phát hành (docs/security-plan.md §3, B5).
//
// Mọi trạng thái ở đây do MÁY CHỦ tính (content-service `trangThaiAnNinh`) - trang
// chỉ hiển thị. Cổng thật: requireAdmin (vai trò từ DB + ép TOTP) cho mọi thao
// tác; thu hồi/khôi phục/ký lại còn đòi step-up: mã TOTP đổi lấy token 5 phút ở
// auth-service, rồi token đi trong THÂN request tới content-service.

type State =
  | 'OK'
  | 'CHUA_NIEM_PHONG'
  | 'KHOA_DA_NGHI'
  | 'LECH_TOAN_VEN'
  | 'NGHI_MA_DOC'
  | 'DA_THU_HOI'
  | 'CHU_KY_LOI'
  | 'DUONG_DAN_NGOAI';

type Row = {
  id: string;
  project: { slug: string; name: string };
  version: string;
  channel: string;
  platform: string;
  arch: string | null;
  fileName: string | null;
  fileSize: number | null;
  sha256: string | null;
  signingKid: string | null;
  hasFile: boolean;
  publishedAt: string | null;
  downloadCount: number;
  lastIntegrityAt: string | null;
  integrityStale: boolean;
  revokedAt: string | null;
  revokeReason: string | null;
  scanResult: { status: string; malicious?: number; suspicious?: number } | null;
  state: State;
  stateDetail: string | null;
};

type HistoryItem = {
  id: string;
  actorName: string;
  action: string;
  note: string | null;
  createdAt: string;
};

const STATE_LABEL: Record<State, { label: string; tone: BadgeTone }> = {
  OK: { label: 'An toàn', tone: 'success' },
  CHUA_NIEM_PHONG: { label: 'Chưa niêm phong', tone: 'warning' },
  KHOA_DA_NGHI: { label: 'Khoá đã nghỉ', tone: 'info' },
  LECH_TOAN_VEN: { label: 'Lệch toàn vẹn', tone: 'danger' },
  NGHI_MA_DOC: { label: 'Nghi mã độc', tone: 'danger' },
  DA_THU_HOI: { label: 'Đã thu hồi', tone: 'neutral' },
  CHU_KY_LOI: { label: 'Chữ ký lỗi', tone: 'danger' },
  DUONG_DAN_NGOAI: { label: 'Đường dẫn ngoài', tone: 'outline' },
};
const STATES = Object.keys(STATE_LABEL) as State[];
const PLATFORMS = ['ANDROID', 'WINDOWS', 'MACOS', 'LINUX', 'WEB', 'SOURCE'];

const SCAN_LABEL: Record<string, string> = {
  CHUA_QUET: 'Chưa quét (thiếu khoá)',
  CHUA_CO_DU_LIEU: 'VirusTotal chưa có dữ liệu',
  SACH: 'Sạch',
  PHAT_HIEN: 'Có phát hiện',
  LOI: 'Lỗi khi tra',
};

const ACTION_LABEL: Record<string, string> = {
  RELEASE_SEAL: 'Niêm phong',
  RELEASE_PUBLISH: 'Công bố',
  RELEASE_UNPUBLISH: 'Gỡ công bố',
  RELEASE_INTEGRITY_MISMATCH: 'Lệch toàn vẹn - tự gỡ công bố',
  RELEASE_INTEGRITY_RESTORED: 'Tệp khớp lại',
  RELEASE_MALWARE_FLAGGED: 'Nghi mã độc - tự gỡ công bố',
  RELEASE_MALWARE_CLEARED: 'Gỡ cờ mã độc',
  RELEASE_REVOKE: 'Thu hồi',
  RELEASE_RESTORE: 'Khôi phục',
  RELEASE_RESIGN: 'Ký lại',
};

const fmtSize = (n: number | null) =>
  n == null
    ? NO_DATE
    : n >= 1048576
      ? `${(n / 1048576).toFixed(1)} MB`
      : `${Math.ceil(n / 1024)} kB`;

async function api(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>) {
  const r = await fetch(`/api/content/admin/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data } as const;
}

async function stepUp(code: string): Promise<string | null> {
  const r = await fetch('/api/account/step-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = (await r.json().catch(() => ({}))) as { token?: string };
  return r.ok && data.token ? data.token : null;
}

type Dialog =
  | { kind: 'revoke' | 'restore' | 'resign'; row: Row }
  | { kind: 'history'; row: Row; items: HistoryItem[] | null }
  | null;

export default function ReleaseSecurity() {
  const { status } = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Partial<Record<State, number>>>({});
  const [vtConfigured, setVtConfigured] = useState(true);
  const [stateFilter, setStateFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [denied, setDenied] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booted, setBooted] = useState(false);
  const [notice, setNotice] = useState<{ tone: BadgeTone; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [chain, setChain] = useState<{
    ok: boolean;
    total: number;
    breaks: { id: string }[];
  } | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState('');
  const [code, setCode] = useState('');
  const [dialogError, setDialogError] = useState('');

  const paging = useUrlPaging('admin-release-security');
  const { page, setPage, pageSize, meta } = paging;
  useUrlPagingSync([paging]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!paging.ready || mfaRequired) return;
      setLoading(true);
      const qs = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (stateFilter) qs.set('state', stateFilter);
      if (platformFilter) qs.set('platform', platformFilter);
      const r = await api('GET', `release-security?${qs}`);
      if (signal?.aborted) return;
      setLoading(false);
      setBooted(true);
      if (isMfaRequired(r.status, r.data)) return setMfaRequired(true);
      if (r.status === 401 || r.status === 403) return setDenied(true);
      const body = r.data as {
        items?: Row[];
        summary?: Partial<Record<State, number>>;
        virusTotalConfigured?: boolean;
      } & Partial<PageMeta>;
      setRows(Array.isArray(body.items) ? body.items : []);
      setSummary(body.summary ?? {});
      setVtConfigured(body.virusTotalConfigured !== false);
      if (typeof body.total === 'number')
        paging.setMeta({
          total: body.total,
          page: body.page ?? page,
          page_size: body.page_size ?? pageSize,
          total_pages: body.total_pages ?? 1,
        } as PageMeta);
    },
    // `paging` cố ý không nằm trong deps: object mới mỗi lần dựng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, paging.ready, mfaRequired, stateFilter, platformFilter]
  );

  useLoader(load, status === 'authenticated');

  const checkIntegrity = async (row: Row) => {
    setBusy(row.id);
    const r = await api('POST', `releases/${row.id}/integrity`);
    setBusy(null);
    const kq = (r.data as { ketQua?: string; lyDo?: string; error?: string }) ?? {};
    setNotice(
      kq.ketQua === 'KHOP'
        ? { tone: 'success', text: `${row.project.name} ${row.version}: tệp khớp sha256 đã ký.` }
        : kq.ketQua === 'LECH'
          ? {
              tone: 'danger',
              text: `${row.project.name} ${row.version}: LỆCH - đã gỡ công bố. ${kq.lyDo ?? ''}`,
            }
          : { tone: 'warning', text: kq.lyDo || kq.error || `Không kiểm được (HTTP ${r.status}).` }
    );
    load();
  };

  const checkChain = async () => {
    setBusy('chain');
    const r = await api('GET', 'release-security/audit-chain');
    setBusy(null);
    if (r.ok) setChain(r.data as { ok: boolean; total: number; breaks: { id: string }[] });
  };

  const openHistory = async (row: Row) => {
    setDialog({ kind: 'history', row, items: null });
    const r = await api('GET', `releases/${row.id}/history`);
    const items = (r.data as { items?: HistoryItem[] }).items ?? [];
    setDialog({ kind: 'history', row, items });
  };

  const openGuarded = (kind: 'revoke' | 'restore' | 'resign', row: Row) => {
    setReason('');
    setCode('');
    setDialogError('');
    setDialog({ kind, row });
  };

  const submitGuarded = async () => {
    if (!dialog || dialog.kind === 'history') return;
    const needReason = dialog.kind !== 'resign';
    if (needReason && reason.trim().length < 10)
      return setDialogError('Lý do bắt buộc, tối thiểu 10 ký tự.');
    if (!/^\d{6}$/.test(code.trim())) return setDialogError('Nhập mã TOTP 6 chữ số.');
    setBusy('dialog');
    setDialogError('');
    const token = await stepUp(code.trim());
    if (!token) {
      setBusy(null);
      return setDialogError('Mã TOTP không đúng hoặc đã hết hạn.');
    }
    const r = await api('POST', `releases/${dialog.row.id}/${dialog.kind}`, {
      stepUp: token,
      ...(needReason ? { reason: reason.trim() } : {}),
    });
    setBusy(null);
    if (!r.ok)
      return setDialogError((r.data as { error?: string }).error || `Lỗi HTTP ${r.status}`);
    const done = { revoke: 'Đã thu hồi', restore: 'Đã khôi phục', resign: 'Đã ký lại' }[
      dialog.kind
    ];
    setNotice({
      tone: 'success',
      text: `${done}: ${dialog.row.project.name} ${dialog.row.version}.`,
    });
    setDialog(null);
    load();
  };

  const shell = (children: React.ReactNode) => (
    <Layout>
      <Seo title="An ninh phát hành" path="/admin/release-security" noindex />
      {children}
    </Layout>
  );

  if (status === 'loading' || (status === 'authenticated' && !booted && loading))
    return shell(<Card className="p-8 text-center text-fg-muted">Đang tải…</Card>);
  if (status === 'unauthenticated')
    return shell(
      <Card className="mx-auto max-w-md p-8 text-center">
        <p className="mb-4 text-fg-secondary">Bạn cần đăng nhập để tiếp tục.</p>
        <Button onClick={() => signIn()} size="lg">
          Đăng nhập
        </Button>
      </Card>
    );
  if (mfaRequired) return shell(<MfaRequiredNotice />);
  if (denied)
    return shell(
      <Card className="mx-auto max-w-md p-8 text-center">
        <h1 className="mb-2 text-lg font-semibold text-fg">Không có quyền</h1>
        <p className="text-fg-secondary">Trang này dành cho quản trị viên.</p>
      </Card>
    );

  const canhBao =
    (summary.LECH_TOAN_VEN ?? 0) + (summary.NGHI_MA_DOC ?? 0) + (summary.CHU_KY_LOI ?? 0);

  return shell(
    <>
      <SectionHeading eyebrow="Quản trị" title="An ninh phát hành" />
      <p className="mt-2 text-sm text-fg-muted">
        Theo dõi, kiểm tra và thu hồi mọi tệp phần mềm đang phát hành. Máy chủ băm lại tệp trong kho
        hai lần mỗi ngày; tệp lệch sha256 đã ký bị gỡ công bố tự động.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <Stat value={summary.OK ?? 0} label="An toàn" />
        </Card>
        <Card className="p-4">
          <Stat value={canhBao} label="Cần xử lý ngay" />
        </Card>
        <Card className="p-4">
          <Stat
            value={(summary.CHUA_NIEM_PHONG ?? 0) + (summary.KHOA_DA_NGHI ?? 0)}
            label="Cần chú ý"
          />
        </Card>
        <Card className="p-4">
          <Stat value={summary.DA_THU_HOI ?? 0} label="Đã thu hồi" />
        </Card>
      </div>

      {!vtConfigured && (
        <Card className="mt-4 p-4 text-sm text-fg-secondary">
          <Badge tone="warning">Chưa quét mã độc</Badge> Máy chủ chưa có{' '}
          <code>VIRUSTOTAL_API_KEY</code>: tệp mới niêm phong được ghi &quot;chưa quét&quot;, không
          được coi là đã quét.
        </Card>
      )}

      {notice && (
        <Card className="mt-4 flex items-start justify-between gap-3 p-4 text-sm" role="status">
          <span>
            <Badge tone={notice.tone}>{notice.tone === 'success' ? 'Xong' : 'Chú ý'}</Badge>{' '}
            <span className="text-fg-secondary">{notice.text}</span>
          </span>
          <button
            className="text-fg-muted hover:text-fg"
            onClick={() => setNotice(null)}
            aria-label="Đóng"
          >
            ×
          </button>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="text-sm text-fg-secondary">
          Trạng thái
          <select
            className="mt-1 block rounded-md border border-line-control bg-surface px-2 py-1.5 text-fg"
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {STATE_LABEL[s].label} ({summary[s] ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-fg-secondary">
          Nền tảng
          <select
            className="mt-1 block rounded-md border border-line-control bg-surface px-2 py-1.5 text-fg"
            value={platformFilter}
            onChange={(e) => {
              setPlatformFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <Button variant="secondary" size="sm" onClick={() => load()}>
          Làm mới
        </Button>
      </div>

      <Card className="mt-4 overflow-hidden p-0">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-fg-muted">
            {loading ? 'Đang tải…' : 'Không có bản phát hành nào.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="bg-subtle text-xs uppercase text-fg-muted">
                <tr>
                  <th className="px-3 py-2">Bản phát hành</th>
                  <th className="px-3 py-2">Tệp</th>
                  <th className="px-3 py-2">sha256 · khoá</th>
                  <th className="px-3 py-2">Kiểm toàn vẹn</th>
                  <th className="px-3 py-2">Quét</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line align-top" data-state={r.state}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-fg">{r.project.name}</div>
                      <div className="text-fg-muted">
                        {r.version} · {r.platform}
                        {r.arch ? `/${r.arch}` : ''} · {r.channel}
                      </div>
                      <div className="text-xs text-fg-muted">
                        {r.publishedAt
                          ? `Công bố ${formatDateTimeVN(r.publishedAt)}`
                          : 'Chưa công bố'}{' '}
                        · {r.downloadCount} lượt tải
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="break-all text-fg-secondary">{r.fileName ?? NO_DATE}</div>
                      <div className="text-xs text-fg-muted">{fmtSize(r.fileSize)}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.sha256 ? (
                        <button
                          className="text-link hover:underline"
                          title="Sao chép sha256"
                          onClick={() => navigator.clipboard?.writeText(r.sha256 as string)}
                        >
                          {r.sha256.slice(0, 12)}…
                        </button>
                      ) : (
                        NO_DATE
                      )}
                      <div className="text-fg-muted">{r.signingKid ?? NO_DATE}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.hasFile ? (
                        <>
                          <div className="text-fg-secondary">
                            {r.lastIntegrityAt ? formatDateTimeVN(r.lastIntegrityAt) : 'Chưa kiểm'}
                          </div>
                          {r.integrityStale && <Badge tone="warning">Quá 24 giờ</Badge>}
                        </>
                      ) : (
                        <span className="text-fg-muted">Không có tệp</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-fg-secondary">
                      {r.scanResult
                        ? (SCAN_LABEL[r.scanResult.status] ?? r.scanResult.status)
                        : NO_DATE}
                      {r.scanResult?.malicious ? ` (${r.scanResult.malicious} máy quét)` : ''}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={STATE_LABEL[r.state]?.tone ?? 'neutral'}>
                        {STATE_LABEL[r.state]?.label ?? r.state}
                      </Badge>
                      {(r.stateDetail || r.revokeReason) && (
                        <div className="mt-1 max-w-[14rem] text-xs text-fg-muted">
                          {r.revokeReason ?? r.stateDetail}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-1">
                        {r.hasFile && r.sha256 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy === r.id}
                            onClick={() => checkIntegrity(r)}
                          >
                            {busy === r.id ? 'Đang băm…' : 'Kiểm lại'}
                          </Button>
                        )}
                        {r.revokedAt ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openGuarded('restore', r)}
                          >
                            Khôi phục
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openGuarded('revoke', r)}
                          >
                            Thu hồi
                          </Button>
                        )}
                        {r.state === 'KHOA_DA_NGHI' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openGuarded('resign', r)}
                          >
                            Ký lại
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openHistory(r)}>
                          Lịch sử
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-3 py-2 text-sm">
            <span className="text-fg-muted">
              Trang {meta.page}/{meta.total_pages} · {meta.total} bản
            </span>
            <span className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= meta.total_pages}
                onClick={() => setPage(page + 1)}
              >
                Sau
              </Button>
            </span>
          </div>
        )}
      </Card>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm">
          <div className="font-medium text-fg">Nhật ký chỉ-thêm</div>
          <div className="text-fg-muted">
            {chain
              ? chain.ok
                ? `Chuỗi băm nguyên vẹn - ${chain.total} dòng.`
                : `ĐỨT CHUỖI tại ${chain.breaks.length} chỗ trên ${chain.total} dòng: có dòng nhật ký đã bị xoá.`
              : 'Mỗi dòng mang băm của dòng trước; xoá một dòng ở giữa làm đứt chuỗi.'}
          </div>
        </div>
        <span className="flex items-center gap-2">
          {chain && (
            <Badge tone={chain.ok ? 'success' : 'danger'}>
              {chain.ok ? 'Nguyên vẹn' : 'Đứt chuỗi'}
            </Badge>
          )}
          <Button size="sm" variant="secondary" disabled={busy === 'chain'} onClick={checkChain}>
            Kiểm chuỗi
          </Button>
        </span>
      </Card>

      <Modal
        open={dialog !== null && dialog.kind !== 'history'}
        onClose={() => setDialog(null)}
        title={
          dialog?.kind === 'revoke'
            ? 'Thu hồi bản phát hành'
            : dialog?.kind === 'restore'
              ? 'Khôi phục bản phát hành'
              : 'Ký lại bằng khoá hiện hành'
        }
      >
        {dialog && dialog.kind !== 'history' && (
          <div className="space-y-4">
            <p className="text-sm text-fg-secondary">
              {dialog.row.project.name} {dialog.row.version} · {dialog.row.platform}.{' '}
              {dialog.kind === 'revoke'
                ? 'Bản này biến khỏi trang công khai và link tải chết ngay; tệp được giữ lại để điều tra.'
                : dialog.kind === 'restore'
                  ? 'Bản này hiện lại nếu không còn sự cố an ninh nào khác.'
                  : 'Chỉ chủ sở hữu. Chữ ký mới phủ đúng sha256 đã niêm phong.'}
            </p>
            {dialog.kind !== 'resign' && (
              <Input
                id="rs-reason"
                label="Lý do (bắt buộc, ghi vào nhật ký)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
            <Input
              id="rs-code"
              label="Mã TOTP - xác thực lại cho thao tác này"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6 chữ số"
            />
            {dialogError && (
              <p className="text-sm text-danger-ink" role="alert">
                {dialogError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Huỷ
              </Button>
              <Button
                variant={dialog.kind === 'revoke' ? 'danger' : 'primary'}
                disabled={busy === 'dialog'}
                onClick={submitGuarded}
              >
                {busy === 'dialog' ? 'Đang xử lý…' : 'Xác nhận'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'history'}
        onClose={() => setDialog(null)}
        title="Lịch sử bản phát hành"
      >
        {dialog?.kind === 'history' &&
          (dialog.items === null ? (
            <p className="text-fg-muted">Đang tải…</p>
          ) : dialog.items.length === 0 ? (
            <p className="text-fg-muted">Chưa có sự kiện nào.</p>
          ) : (
            <ol className="space-y-3 text-sm">
              {dialog.items.map((h) => (
                <li key={h.id} className="border-l-2 border-line pl-3">
                  <div className="font-medium text-fg">{ACTION_LABEL[h.action] ?? h.action}</div>
                  <div className="text-xs text-fg-muted">
                    {formatDateTimeVN(h.createdAt)} · {h.actorName}
                  </div>
                  {h.note && (
                    <div className="mt-1 break-all text-xs text-fg-secondary">{h.note}</div>
                  )}
                </li>
              ))}
            </ol>
          ))}
      </Modal>
    </>
  );
}
