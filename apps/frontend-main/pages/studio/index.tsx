import React, { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button, Card, Icon, Badge, EmptyState } from '@tsudev/ui';
import { WorkspaceLayout } from '../../components/WorkspaceLayout';
import { formatDateTimeVN } from '../../lib/format';
import { useLoader } from '../../lib/useLoader';
import { STATUS_LABEL, type PostStatus } from '../../lib/postStatus';

/**
 * `/studio` - Tổng quan cá nhân (TDD 8.2, ED-02). Thay trang `/author` cũ: KHÔNG
 * còn form "Viết bài mới" 13 ô ở đây - MỘT lối tạo bài là nút "+ Viết bài" →
 * `/studio/posts/new` (F-04, F-05).
 *
 * Một lời gọi duy nhất: `/api/author/posts` trả kèm `counts` (theo trạng thái,
 * trên MỌI bài của tác giả) và `views` (tổng lượt xem) bất kể bộ lọc - nên lọc
 * `status=DRAFT` lấy luôn danh sách "Tiếp tục viết".
 */
type Card3 = { id: string; slug: string; title: string; status: PostStatus; updatedAt: string };
type Overview = {
  counts: Record<PostStatus, number>;
  views: { total: number; last30: number; windowDays: number } | null;
  drafts: Card3[];
};

const num = (n: number) => n.toLocaleString('vi-VN');

const STATS: { key: PostStatus; label: string }[] = [
  { key: 'DRAFT', label: 'Nháp của tôi' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'SCHEDULED', label: 'Hẹn giờ' },
  { key: 'PUBLISHED', label: 'Đã công bố' },
];

export default function StudioOverview() {
  const { data: session } = useSession();
  const [data, setData] = useState<Overview | null>(null);
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch('/api/content/author/posts?status=DRAFT&page=1&page_size=10', {
      signal,
    }).catch(() => null);
    if (signal?.aborted) return;
    if (res?.status === 403) return setDenied(true);
    if (!res?.ok) return setFailed(true);
    const body = (await res.json()) as {
      data?: Card3[];
      counts?: Record<PostStatus, number>;
      views?: Overview['views'];
    };
    if (signal?.aborted) return;
    setData({
      counts: body.counts ?? ({} as Record<PostStatus, number>),
      views: body.views ?? null,
      drafts: (body.data ?? []).slice(0, 3),
    });
  }, []);
  useLoader(load, !!session);

  return (
    <WorkspaceLayout
      section="overview"
      title="Tổng quan"
      path="/studio"
      denied={denied}
      actions={
        <Button as="a" href="/studio/posts/new" size="sm">
          <Icon name="plus" />
          Viết bài
        </Button>
      }
    >
      {failed && (
        <EmptyState
          kind="failed"
          title="Không tải được số liệu"
          explain="Máy chủ nội dung không trả lời. Thử tải lại trang sau ít phút."
        />
      )}

      <section aria-label="Số liệu" className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {STATS.map((s) => (
          <a
            key={s.key}
            href={`/studio/posts?status=${s.key}`}
            className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong"
          >
            <p className="text-2xl font-semibold text-fg tabular-nums">
              {data ? num(data.counts[s.key] ?? 0) : '-'}
            </p>
            <p className="text-sm text-fg-muted">{s.label}</p>
          </a>
        ))}
        <div className="col-span-2 lg:col-span-1 rounded-lg border border-line bg-surface p-4">
          <p className="text-2xl font-semibold text-fg tabular-nums">
            {data?.views ? num(data.views.last30) : '-'}
          </p>
          <p className="text-sm text-fg-muted">
            Lượt xem {data?.views?.windowDays ?? 30} ngày
            {data?.views && <> · tổng {num(data.views.total)}</>}
          </p>
        </div>
      </section>

      <section aria-labelledby="tiep-tuc">
        <div className="flex items-center justify-between mb-3">
          <h2 id="tiep-tuc" className="font-semibold text-fg">
            Tiếp tục viết
          </h2>
          <a href="/studio/posts?status=DRAFT" className="text-sm text-link hover:underline">
            Mọi bản nháp
          </a>
        </div>
        {data && data.drafts.length === 0 && (
          <EmptyState
            icon="edit"
            title="Chưa có bản nháp nào"
            explain="Bài mới luôn bắt đầu là bản nháp - chỉ bạn thấy cho tới khi gửi duyệt."
            action={{ label: 'Viết bài đầu tiên', href: '/studio/posts/new' }}
          />
        )}
        <div className="grid gap-2">
          {data?.drafts.map((p) => (
            <Card key={p.id} className="p-0">
              <a
                href={`/studio/posts/${encodeURIComponent(p.slug)}`}
                className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-hovered rounded-lg"
              >
                <span className="min-w-0 font-medium text-fg truncate">
                  {p.title || '(chưa có tiêu đề)'}
                </span>
                <span className="flex items-center gap-2 text-xs text-fg-muted">
                  <Badge tone={STATUS_LABEL[p.status].tone}>{STATUS_LABEL[p.status].text}</Badge>
                  Sửa {formatDateTimeVN(p.updatedAt)}
                </span>
              </a>
            </Card>
          ))}
        </div>
      </section>
    </WorkspaceLayout>
  );
}
