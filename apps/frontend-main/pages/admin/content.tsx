import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Seo from '../../components/Seo';
import { useSession, signIn } from 'next-auth/react';
import { Layout, Card, Button, Badge, SectionHeading, RecordFooter, Modal } from '@tsudev/ui';
import type { PageMeta } from '@tsudev/types';
import { useUrlPaging, useUrlPagingSync } from '../../lib/useUrlPaging';
import { formatDateTimeVN } from '../../lib/format';

/**
 * Kiểm duyệt nội dung (bài viết, tài liệu) cho ADMIN.
 *
 * Lý do tồn tại: route của tác giả chỉ gỡ được bài CỦA CHÍNH MÌNH, nên hàng chục
 * tài liệu trùng lặp do Toà soạn AI (đã gỡ 29/10/2026) sinh ra không ai gỡ được
 * qua giao diện. Bộ lọc "Toà soạn AI" đọc cột `authoredByAgentId` - một dấu hiệu
 * CHÍNH XÁC, không phải đoán theo tiêu đề.
 *
 * Chỉ ẩn (xoá mềm) và khôi phục; mọi thao tác ghi nhật ký quản trị ở máy chủ.
 * Trang gác bằng UX; cổng thật là requireAdmin() của content-service.
 */
type Kind = 'post' | 'doc';
type State = 'active' | 'deleted';
type Origin = 'all' | 'agent' | 'human';
type Row = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  deletedAt: string | null;
  origin: 'agent' | 'human';
  contentLength: number;
};

const KIND_LABEL: Record<Kind, string> = { post: 'Bài viết', doc: 'Tài liệu' };
const ORIGIN_LABEL: Record<Origin, string> = {
  all: 'Mọi nguồn',
  agent: 'Toà soạn AI (đã gỡ)',
  human: 'Người viết',
};

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-lg border border-line bg-surface p-0.5"
    >
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`px-3 h-8 rounded-md text-sm font-medium transition-colors ${
            value === v ? 'bg-glow text-link' : 'text-fg-secondary hover:bg-hovered hover:text-fg'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export default function AdminContent() {
  const { data: session, status } = useSession();
  const [kind, setKind] = useState<Kind>('doc');
  const [state, setState] = useState<State>('active');
  const [origin, setOrigin] = useState<Origin>('agent');
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const paging = useUrlPaging('admin-content');
  const { page, setPage, pageSize, setPageSize, meta } = paging;
  useUrlPagingSync([paging]);

  const load = useCallback(async () => {
    if (!paging.ready) return;
    setLoading(true);
    const q = new URLSearchParams({
      kind,
      state,
      page: String(page),
      page_size: String(pageSize),
    });
    if (origin !== 'all') q.set('origin', origin);
    const res = await fetch(`/api/content/admin/content?${q}`);
    setLoading(false);
    if (!res.ok) {
      setMsg({ tone: 'danger', text: 'Không tải được danh sách. Bạn có quyền quản trị không?' });
      return;
    }
    const body = (await res.json()) as { data?: Row[]; meta?: PageMeta };
    setRows(Array.isArray(body.data) ? body.data : []);
    if (body.meta) paging.setMeta(body.meta);
    setSelected(new Set());
    // `paging` cố ý không nằm trong deps: nó là object mới mỗi lần dựng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, state, origin, page, pageSize, paging.ready]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  // Đổi bộ lọc ⇒ về trang 1 (trang 4 của một tập khác là trang rỗng).
  const resetTo =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.slug));
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.slug)));
  const toggle = (slug: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const action = state === 'active' ? 'hide' : 'restore';
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.slug)), [rows, selected]);

  const apply = async () => {
    setBusy(true);
    const res = await fetch('/api/content/admin/content/bulk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, action, slugs: [...selected] }),
    });
    setBusy(false);
    setConfirmOpen(false);
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg({ tone: 'danger', text: e.error || 'Thao tác thất bại.' });
      return;
    }
    const body = (await res.json()) as { changed: string[] };
    setMsg({
      tone: 'success',
      text: `${action === 'hide' ? 'Đã ẩn' : 'Đã khôi phục'} ${body.changed.length} ${KIND_LABEL[
        kind
      ].toLowerCase()}. Trang công khai cập nhật trong tối đa 5 phút.`,
    });
    load();
  };

  if (status === 'loading')
    return (
      <Layout>
        <Seo title="Kiểm duyệt nội dung" path="/admin/content" noindex />
        <Card className="p-8 text-center text-fg-muted">Đang tải…</Card>
      </Layout>
    );

  if (!session)
    return (
      <Layout>
        <Seo title="Kiểm duyệt nội dung" path="/admin/content" noindex />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-fg mb-2">Kiểm duyệt nội dung</h1>
          <p className="text-fg-muted mb-4">Đăng nhập bằng tài khoản quản trị.</p>
          <Button onClick={() => signIn()}>Đăng nhập</Button>
        </div>
      </Layout>
    );

  return (
    <Layout active="/admin" bare>
      <Seo title="Kiểm duyệt nội dung" path="/admin/content" noindex />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <a href="/admin" className="text-sm text-link hover:underline">
          ← Quản trị
        </a>
        <SectionHeading className="mt-3" eyebrow="Kiểm duyệt" title="Bài viết & tài liệu" />
        <p className="-mt-3 mb-6 text-sm text-fg-muted max-w-3xl">
          Ẩn hàng loạt nội dung trùng lặp hoặc kém chất lượng - nhất là nội dung do Toà soạn AI (đã
          gỡ) sinh ra. Ẩn là xoá mềm: khôi phục được ở thẻ “Đã ẩn”, và mọi thao tác được ghi vào
          nhật ký quản trị.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Segmented<Kind>
            label="Loại nội dung"
            value={kind}
            onChange={resetTo(setKind)}
            options={[
              ['doc', 'Tài liệu'],
              ['post', 'Bài viết'],
            ]}
          />
          <Segmented<State>
            label="Trạng thái"
            value={state}
            onChange={resetTo(setState)}
            options={[
              ['active', 'Đang hiện'],
              ['deleted', 'Đã ẩn'],
            ]}
          />
          <Segmented<Origin>
            label="Nguồn"
            value={origin}
            onChange={resetTo(setOrigin)}
            options={(['agent', 'human', 'all'] as Origin[]).map((o) => [o, ORIGIN_LABEL[o]])}
          />
        </div>

        {msg && (
          <div
            role="status"
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              msg.tone === 'success'
                ? 'bg-success-tint text-success-ink border-transparent'
                : 'bg-danger-tint text-danger-ink border-transparent'
            }`}
          >
            {msg.text}
          </div>
        )}

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line bg-subtle">
            <label className="inline-flex items-center gap-2 text-sm text-fg-secondary">
              <input
                type="checkbox"
                checked={allOnPage}
                onChange={toggleAll}
                disabled={rows.length === 0}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Chọn cả trang
            </label>
            <Button
              size="sm"
              variant={action === 'hide' ? 'danger' : 'primary'}
              disabled={selected.size === 0 || busy}
              onClick={() => setConfirmOpen(true)}
            >
              {action === 'hide' ? 'Ẩn' : 'Khôi phục'} {selected.size || ''} mục đã chọn
            </Button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-fg-muted">Đang tải…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-fg-muted">Không có mục nào khớp bộ lọc.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-fg-muted">
                <tr className="border-b border-line">
                  <th className="w-10 px-4 py-2" />
                  <th className="px-2 py-2 font-medium">Tiêu đề</th>
                  <th className="px-2 py-2 font-medium hidden md:table-cell">Nguồn</th>
                  <th className="px-2 py-2 font-medium hidden md:table-cell text-right">Độ dài</th>
                  <th className="px-4 py-2 font-medium hidden sm:table-cell">
                    {state === 'active' ? 'Tạo lúc' : 'Ẩn lúc'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-line last:border-0 ${
                      selected.has(r.slug) ? 'bg-glow' : 'hover:bg-hovered'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${r.title}`}
                        checked={selected.has(r.slug)}
                        onChange={() => toggle(r.slug)}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <a
                        href={`/${kind === 'post' ? 'blog' : 'docs'}/${r.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-fg hover:text-link"
                      >
                        {r.title}
                      </a>
                      <div className="font-mono text-xs text-fg-muted truncate max-w-[28rem]">
                        {r.slug}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 hidden md:table-cell">
                      <Badge tone={r.origin === 'agent' ? 'warning' : 'neutral'}>
                        {r.origin === 'agent' ? 'Toà soạn AI' : 'Người viết'}
                      </Badge>
                    </td>
                    <td className="px-2 py-2.5 hidden md:table-cell text-right font-mono text-xs text-fg-muted">
                      {r.contentLength.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-xs text-fg-muted">
                      {formatDateTimeVN(state === 'active' ? r.createdAt : r.deletedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="px-4">
            <RecordFooter
              meta={meta}
              pageSize={pageSize}
              loading={loading}
              label={KIND_LABEL[kind].toLowerCase()}
              selectedCount={selected.size}
              onClearSelection={() => setSelected(new Set())}
              onPageSize={(size, nextPage) => {
                setPageSize(size);
                setPage(nextPage);
              }}
              onPage={setPage}
            />
          </div>
        </Card>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`${action === 'hide' ? 'Ẩn' : 'Khôi phục'} ${selectedRows.length} ${KIND_LABEL[
          kind
        ].toLowerCase()}?`}
      >
        <p className="text-sm text-fg-secondary">
          {action === 'hide'
            ? 'Các mục sẽ biến khỏi trang công khai và tìm kiếm. Bạn khôi phục được bất cứ lúc nào ở thẻ “Đã ẩn”.'
            : 'Các mục sẽ hiện lại trên trang công khai.'}
        </p>
        <ul className="mt-3 max-h-48 overflow-auto text-sm text-fg list-disc pl-5">
          {selectedRows.map((r) => (
            <li key={r.id}>{r.title}</li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Huỷ
          </Button>
          <Button
            variant={action === 'hide' ? 'danger' : 'primary'}
            disabled={busy}
            onClick={apply}
          >
            {busy ? 'Đang xử lý…' : action === 'hide' ? 'Ẩn' : 'Khôi phục'}
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}
