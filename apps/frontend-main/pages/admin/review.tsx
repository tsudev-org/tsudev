import React, { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, Button, Layout, RecordFooter } from '@tsudev/ui';
import type { PageMeta } from '@tsudev/types';

import Seo from '../../components/Seo';
import { Notice } from '../../components/AuthShell';
import { MfaRequiredNotice } from '../../components/MfaRequiredNotice';
import { formatDateTimeVN } from '../../lib/format';
import { isMfaRequired } from '../../lib/mfa';
import { POST_STATUSES, STATUS_LABEL, type PostStatus } from '../../lib/postStatus';
import { renderMarkdown } from '../../lib/md';
import { useLoader } from '../../lib/useLoader';
import { useUrlPaging, useUrlPagingSync } from '../../lib/useUrlPaging';

/**
 * Hàng chờ duyệt (P2.3, MODERATOR+): bài mọi tác giả, mặc định PENDING cũ nhất
 * trước. Duyệt / trả về (BẮT BUỘC lý do - tác giả đọc ở trang soạn) / lưu trữ /
 * ghim. Quyền do content-service quyết (`requireModerator`, đọc vai trò từ DB +
 * ép 2FA); trang chỉ hiện phản hồi.
 */
type Row = {
  id: string;
  slug: string;
  title: string;
  contentMd: string;
  status: PostStatus;
  pinned: boolean;
  updatedAt: string;
  author: { displayName?: string | null; username?: string | null } | null;
};

export default function ReviewQueue() {
  const { status: auth } = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Partial<Record<PostStatus, number>>>({});
  const [filter, setFilter] = useState<PostStatus>('PENDING');
  const [open, setOpen] = useState<string | null>(null);
  const [state, setState] = useState<'ok' | 'denied' | 'mfa'>('ok');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const paging = useUrlPaging('admin-review');
  const { page, setPage, pageSize, setPageSize, meta } = paging;
  useUrlPagingSync([paging]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!paging.ready) return;
      const r = await fetch(
        `/api/content/admin/posts?status=${filter}&page=${page}&page_size=${pageSize}`,
        {
          signal,
        }
      );
      if (signal?.aborted) return;
      const body = await r.json().catch(() => ({}));
      if (isMfaRequired(r.status, body)) return setState('mfa');
      if (r.status === 403) return setState('denied');
      if (!r.ok) return setMsg({ kind: 'error', text: 'Không tải được hàng chờ.' });
      setState('ok');
      setRows(body.data as Row[]);
      setCounts(body.counts || {});
      if (body.meta) paging.setMeta(body.meta as PageMeta);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, page, pageSize, paging.ready]
  );
  useLoader(load, auth === 'authenticated');

  const act = async (row: Row, action: string) => {
    let note: string | null = null;
    if (action === 'reject') {
      note = window.prompt(`Lý do trả bài "${row.title}" về cho tác giả:`);
      if (!note?.trim()) return;
    }
    const r = await fetch(`/api/content/admin/posts/${row.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note }),
    });
    const body = await r.json().catch(() => ({}));
    setMsg(
      r.ok
        ? { kind: 'ok', text: `"${row.title}": ${STATUS_LABEL[(body as Row).status].text}.` }
        : { kind: 'error', text: String(body.error || 'Không thực hiện được.') }
    );
    load();
  };

  const pin = async (row: Row) => {
    const r = await fetch(`/api/content/admin/posts/${row.id}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !row.pinned }),
    });
    if (!r.ok) setMsg({ kind: 'error', text: 'Chỉ ghim được bài đang công khai.' });
    load();
  };

  if (state === 'mfa') {
    return (
      <Layout active="/admin">
        <Seo title="Duyệt bài" path="/admin/review" noindex />
        <MfaRequiredNotice />
      </Layout>
    );
  }

  return (
    <Layout active="/admin">
      <Seo title="Duyệt bài" path="/admin/review" noindex />
      <h1 className="text-xl font-semibold text-fg">Duyệt bài</h1>
      {state === 'denied' && (
        <div className="mt-4">
          <Notice kind="error">Trang này dành cho người kiểm duyệt (MODERATOR trở lên).</Notice>
        </div>
      )}
      {msg && (
        <div className="mt-4">
          <Notice kind={msg.kind}>{msg.text}</Notice>
        </div>
      )}
      <div role="tablist" aria-label="Lọc theo trạng thái" className="mt-5 flex flex-wrap gap-1.5">
        {POST_STATUSES.map((s) => (
          <button
            key={s}
            role="tab"
            type="button"
            aria-selected={filter === s}
            onClick={() => {
              setFilter(s);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-sm ${
              filter === s ? 'bg-glow text-link' : 'text-fg-secondary hover:bg-hovered'
            }`}
          >
            {STATUS_LABEL[s].text} ({counts[s] ?? 0})
          </button>
        ))}
      </div>
      <ul className="mt-4 flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
        {rows.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium text-fg">
                  {r.title}
                  <Badge tone={STATUS_LABEL[r.status].tone}>{STATUS_LABEL[r.status].text}</Badge>
                  {r.pinned && <Badge tone="brand">Đã ghim</Badge>}
                </p>
                <p className="text-xs text-fg-muted">
                  {r.author?.displayName || r.author?.username || 'Không rõ tác giả'} · cập nhật{' '}
                  {formatDateTimeVN(r.updatedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                >
                  {open === r.id ? 'Đóng' : 'Xem'}
                </Button>
                {r.status === 'PENDING' && (
                  <>
                    <Button size="sm" onClick={() => act(r, 'approve')}>
                      Duyệt
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => act(r, 'reject')}>
                      Trả về
                    </Button>
                  </>
                )}
                {(r.status === 'PUBLISHED' || r.status === 'SCHEDULED') && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => pin(r)}>
                      {r.pinned ? 'Bỏ ghim' : 'Ghim'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => act(r, 'archive')}>
                      Lưu trữ
                    </Button>
                  </>
                )}
              </div>
            </div>
            {open === r.id && (
              <div
                className="prose-tsu mt-3 border-t border-line pt-3"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(r.contentMd) }}
              />
            )}
          </li>
        ))}
        {rows.length === 0 && state === 'ok' && (
          <li className="p-4 text-sm text-fg-muted">Không có bài nào ở trạng thái này.</li>
        )}
      </ul>
      <RecordFooter
        meta={meta}
        pageSize={pageSize}
        loading={false}
        label="bài"
        onPageSize={(size, next) => {
          setPageSize(size);
          setPage(next);
        }}
        onPage={setPage}
      />
    </Layout>
  );
}
