import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Badge, Button, EmptyState, Icon, Modal, RecordFooter } from '@tsudev/ui';
import { WorkspaceLayout } from '../../../components/WorkspaceLayout';
import { formatDateTimeVN } from '../../../lib/format';
import { useLoader } from '../../../lib/useLoader';
import { useUrlPaging, useUrlPagingSync } from '../../../lib/useUrlPaging';
import { POST_STATUSES, STATUS_LABEL, type PostStatus } from '../../../lib/postStatus';

/**
 * `/studio/posts` - bảng bài viết của tác giả (TDD 8.3, ED-02, IA-04). Tách khỏi
 * `/author` cũ: MỘT danh sách mỗi URL, lọc theo trạng thái (chip có số đếm), tìm
 * theo chữ, sắp xếp - tất cả sống trên URL (`status`, `q`, `sort`, `page`,
 * `page_size`) để liên kết chia sẻ mở đúng chỗ. Máy chủ lọc (`postListFilter`).
 *
 * Màn 390 px: mỗi bài là một khối xếp dọc, không phải bảng cuộn ngang.
 */
type Row = {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  tags: string[];
  publishedAt: string | null;
  updatedAt: string;
  views?: number;
};

const SORTS: { id: string; label: string }[] = [
  { id: 'newest', label: 'Sửa gần nhất' },
  { id: 'oldest', label: 'Sửa lâu nhất' },
  { id: 'created', label: 'Tạo gần nhất' },
  { id: 'published', label: 'Ngày đăng' },
  { id: 'title', label: 'Tiêu đề A-Z' },
];

const asStatus = (v: unknown): PostStatus | '' =>
  POST_STATUSES.includes(v as PostStatus) ? (v as PostStatus) : '';
const asSort = (v: unknown): string => (SORTS.some((s) => s.id === v) ? String(v) : 'newest');
const num = (n: number) => n.toLocaleString('vi-VN');

export default function StudioPosts() {
  const router = useRouter();
  const { data: session } = useSession();
  const paging = useUrlPaging('studio-posts');
  const { page, setPage, pageSize, setPageSize, meta } = paging;

  // Bộ lọc nhận từ URL MỘT lần khi router sẵn sàng (cùng lý do với useUrlPaging):
  // chỉnh trong render theo `router.isReady`, không trong effect.
  const [adopted, setAdopted] = useState(false);
  const [status, setStatus] = useState<PostStatus | ''>('');
  const [sort, setSort] = useState('newest');
  const [q, setQ] = useState('');
  const [typed, setTyped] = useState('');
  if (router.isReady && !adopted) {
    setAdopted(true);
    setStatus(asStatus(router.query.status));
    setSort(asSort(router.query.sort));
    const q0 = typeof router.query.q === 'string' ? router.query.q.slice(0, 200) : '';
    setQ(q0);
    setTyped(q0);
  }
  useUrlPagingSync([paging], {
    status,
    q,
    sort: sort === 'newest' ? '' : sort,
  });

  // Gõ tìm: đợi 300 ms ngừng gõ rồi mới hỏi máy chủ.
  useEffect(() => {
    if (typed === q) return;
    const t = setTimeout(() => {
      setQ(typed.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [typed, q, setPage]);

  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<PostStatus, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Tăng để nạp lại (sau khi xoá, bấm "Thử lại") - nằm trong deps của `load`.
  const [nonce, setNonce] = useState(0);
  const reload = () => setNonce((n) => n + 1);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!paging.ready || !adopted) return;
      setLoading(true);
      const qs = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort,
      });
      if (status) qs.set('status', status);
      if (q) qs.set('q', q);
      const res = await fetch(`/api/content/author/posts?${qs}`, { signal }).catch(() => null);
      if (signal?.aborted) return;
      setLoading(false);
      if (res?.status === 403) return setDenied(true);
      if (!res?.ok) return setFailed(true);
      setFailed(false);
      const body = (await res.json()) as {
        data?: Row[];
        meta?: typeof meta;
        counts?: Record<PostStatus, number>;
      };
      if (signal?.aborted) return;
      setRows(Array.isArray(body.data) ? body.data : []);
      if (body.counts) setCounts(body.counts);
      if (body.meta) paging.setMeta(body.meta);
    },
    // `paging` là object mới mỗi lần dựng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, paging.ready, adopted, status, q, sort, nonce]
  );
  useLoader(load, !!session);

  const chooseStatus = (s: PostStatus | '') => {
    setStatus(s);
    setPage(1);
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    const res = await fetch(`/api/content/author/posts/${encodeURIComponent(removing.slug)}`, {
      method: 'DELETE',
    }).catch(() => null);
    setBusy(false);
    setNote(res?.ok ? `Đã xoá "${removing.title}".` : 'Xoá không được - thử lại sau.');
    setRemoving(null);
    reload();
  };

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;
  const chips: { id: PostStatus | ''; label: string; n: number | null }[] = [
    { id: '', label: 'Tất cả', n: total },
    ...POST_STATUSES.map((s) => ({ id: s, label: STATUS_LABEL[s].text, n: counts?.[s] ?? null })),
  ];

  return (
    <WorkspaceLayout
      section="posts"
      title="Bài viết"
      path="/studio/posts"
      denied={denied}
      actions={
        <Button as="a" href="/studio/posts/new" size="sm">
          <Icon name="plus" />
          Viết bài
        </Button>
      }
    >
      <div
        role="group"
        aria-label="Lọc theo trạng thái"
        className="flex gap-1.5 overflow-x-auto pb-1 mb-4"
      >
        {chips.map((c) => {
          const on = c.id === status;
          return (
            <button
              key={c.id || 'all'}
              type="button"
              aria-pressed={on}
              onClick={() => chooseStatus(c.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                on
                  ? 'border-primary bg-subtle text-fg font-medium'
                  : 'border-line text-fg-secondary hover:text-fg hover:border-line-strong'
              }`}
            >
              {c.label}
              {c.n != null && (
                <span className="text-xs text-fg-muted tabular-nums">{num(c.n)}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="flex-1 min-w-48">
          <span className="sr-only">Tìm bài viết</span>
          <span className="flex items-center gap-2 h-9 px-3 rounded-md border border-line-control bg-surface focus-within:border-primary">
            <Icon name="search" size={15} />
            <input
              type="search"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Tìm theo tiêu đề hoặc nội dung…"
              maxLength={200}
              className="w-full bg-transparent text-sm text-fg outline-hidden placeholder:text-fg-muted"
            />
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm text-fg-secondary">
          Sắp xếp
          <select
            value={sort}
            onChange={(e) => {
              setSort(asSort(e.target.value));
              setPage(1);
            }}
            className="h-9 rounded-md border border-line-control bg-surface px-2 text-sm text-fg"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {note && (
        <p role="status" className="mb-3 text-sm text-fg-secondary">
          {note}
        </p>
      )}

      {failed ? (
        <EmptyState
          kind="failed"
          title="Không tải được danh sách bài"
          explain="Máy chủ nội dung không trả lời. Thử lại sau ít phút."
          action={{ label: 'Thử lại', onClick: reload }}
        />
      ) : !loading && rows.length === 0 ? (
        <EmptyState
          icon="edit"
          title={q || status ? 'Không có bài nào khớp bộ lọc' : 'Bạn chưa có bài nào'}
          explain={
            q || status
              ? 'Bỏ bớt bộ lọc hoặc đổi từ khoá.'
              : 'Bài mới bắt đầu là bản nháp - chỉ bạn thấy cho tới khi gửi duyệt.'
          }
          action={
            q || status
              ? {
                  label: 'Xoá bộ lọc',
                  onClick: () => {
                    setTyped('');
                    setQ('');
                    chooseStatus('');
                  },
                }
              : { label: 'Viết bài', href: '/studio/posts/new' }
          }
        />
      ) : (
        <ul
          className="divide-y divide-line rounded-lg border border-line bg-surface"
          aria-busy={loading}
        >
          {rows.map((p) => {
            const href = `/studio/posts/${encodeURIComponent(p.slug)}`;
            const scheduled =
              p.status === 'SCHEDULED' && p.publishedAt
                ? `Hẹn ${formatDateTimeVN(p.publishedAt)}`
                : `Sửa ${formatDateTimeVN(p.updatedAt)}`;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <div className="min-w-0 flex-1 basis-64">
                  <a href={href} className="font-medium text-fg hover:text-link break-words">
                    {p.title || '(chưa có tiêu đề)'}
                  </a>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
                    <Badge tone={STATUS_LABEL[p.status].tone}>{STATUS_LABEL[p.status].text}</Badge>
                    <span>{scheduled}</span>
                    {typeof p.views === 'number' && <span>· {num(p.views)} lượt xem</span>}
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="ghost" as="a" href={href}>
                    <Icon name="edit" />
                    Sửa
                  </Button>
                  {p.status === 'PUBLISHED' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      as="a"
                      href={`/blog/${encodeURIComponent(p.slug)}`}
                      aria-label={`Xem bài ${p.title} trên blog`}
                    >
                      <Icon name="eye" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    as="a"
                    href={`${href}/history`}
                    aria-label={`Lịch sử bài ${p.title}`}
                  >
                    <Icon name="clock" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRemoving(p)}
                    aria-label={`Xoá bài ${p.title}`}
                  >
                    <Icon name="trash" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {rows.length > 0 && (
        <RecordFooter
          meta={meta}
          pageSize={pageSize}
          loading={loading}
          label="bài viết"
          onPageSize={(size, nextPage) => {
            setPageSize(size);
            setPage(nextPage);
          }}
          onPage={setPage}
        />
      )}

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Xoá bài viết?"
        closeButton={false}
      >
        <p className="text-sm text-fg-secondary">
          Bài <strong className="text-fg">{removing?.title}</strong> sẽ bị gỡ khỏi Studio và trang
          công khai (trang đã lưu đệm có thể còn tới 5 phút).
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            Huỷ
          </Button>
          <Button variant="danger" onClick={remove} disabled={busy}>
            {busy ? 'Đang xoá…' : 'Xoá bài'}
          </Button>
        </div>
      </Modal>
    </WorkspaceLayout>
  );
}
