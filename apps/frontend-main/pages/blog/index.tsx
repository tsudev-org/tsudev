import React from 'react';
import { useRecoverBuildPlaceholder } from '../../lib/useRecoverBuildPlaceholder';
import Seo from '../../components/Seo';
import { Layout, Card, Badge, Avatar, Button, Icon, EmptyState } from '@tsudev/ui';
import PageHeader from '../../components/PageHeader';
import { api } from '../../lib/api';
import type { Post } from '../../lib/types';
import { keepStaleOnFailure } from '../../lib/isr';

function timeAgo(d: string | Date): string {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 86400) return `${Math.max(1, Math.floor(s / 3600))} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}

type BlogIndexProps = { posts: Post[]; failed: boolean };

export default function BlogIndex({ posts, failed }: BlogIndexProps) {
  const retrying = useRecoverBuildPlaceholder(failed);
  const [featured, ...rest] = posts;
  const byline = (p: Post) => (
    <div className="mt-4 flex items-center gap-2 text-xs text-fg-muted">
      <Avatar name={p.author?.displayName || 'tsudev'} size={22} />
      {p.author?.displayName || 'tsudev'} · {timeAgo(p.publishedAt || p.createdAt)}
    </div>
  );
  const tags = (p: Post, n = 3) =>
    (p.tags || []).length > 0 && (
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(p.tags || []).slice(0, n).map((t: string) => (
          <Badge key={t} tone="neutral">
            {t}
          </Badge>
        ))}
      </div>
    );
  return (
    <Layout active="/blog" bare>
      <Seo title="Blog" path="/blog" description="Bài viết và hướng dẫn kỹ thuật trên tsudev." />
      <PageHeader
        eyebrow="Blog"
        title="Bài viết & góc nhìn kỹ thuật"
        description="Ghi chép từ quá trình xây và phát hành ứng dụng: kiến trúc, bảo mật, hiệu năng và những bài học đã trả giá."
        actions={
          <Button as="a" href="/search?type=post" variant="secondary">
            <Icon name="search" size={16} />
            Tìm bài viết
          </Button>
        }
      />
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Kiểm `failed` TRƯỚC `length === 0`: gọi thất bại thì danh sách cũng
            rỗng, nên đảo thứ tự là nhánh lỗi không bao giờ chạy tới. */}
        {failed ? (
          <EmptyState
            kind="failed"
            icon="warning"
            title={retrying ? 'Đang cập nhật nội dung…' : 'Không tải được danh sách bài viết'}
            explain="Máy chủ nội dung không trả lời, nên đây không phải là một blog trống - các bài đã đăng vẫn còn nguyên. Thử tải lại sau ít phút."
          />
        ) : (
          posts.length === 0 && (
            <EmptyState
              icon="doc"
              title="Chưa có bài viết"
              explain="Bài viết do tác giả đăng thủ công, nên khoảng trống giữa hai bài là bình thường."
              action={{ label: 'Tìm trong toàn bộ nội dung', href: '/search' }}
            />
          )
        )}

        {featured && (
          <Card
            as="a"
            hover
            href={`/blog/${featured.slug}`}
            className="group mb-8 grid overflow-hidden md:grid-cols-[1.1fr_1fr]"
          >
            <div className="relative min-h-44 tsu-cta-bg flex items-center justify-center border-b md:border-b-0 md:border-r border-line">
              {featured.coverImageUrl ? (
                <img
                  src={featured.coverImageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-lg bg-surface shadow-sm">
                  <Icon name="doc" size={30} />
                </span>
              )}
            </div>
            <div className="p-6 md:p-8 flex flex-col">
              <span className="mb-3 text-xs font-semibold text-accent">Bài mới nhất</span>
              {tags(featured)}
              <h2 className="text-2xl font-bold text-fg leading-snug group-hover:text-link transition-colors text-balance">
                {featured.title}
              </h2>
              <p className="mt-3 text-fg-secondary line-clamp-3">{featured.excerpt}</p>
              <div className="mt-auto">{byline(featured)}</div>
            </div>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p: Post) => (
            <Card
              key={p.id}
              as="a"
              href={`/blog/${p.slug}`}
              hover
              className="p-5 flex flex-col group"
            >
              {/* Thẻ của RIÊNG bài này để nhận diện chủ đề khi lướt; lọc theo
                  thẻ nằm ở /search, cạnh chuyên mục và loại nội dung. */}
              {tags(p, 2)}
              <h2 className="text-lg font-bold text-fg leading-snug group-hover:text-link transition-colors text-balance">
                {p.title}
              </h2>
              <p className="mt-2 text-sm text-fg-muted flex-1 line-clamp-3">{p.excerpt}</p>
              {byline(p)}
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  const r = await api.posts(50);
  const revalidate = keepStaleOnFailure(r.failed, '/blog');
  return { revalidate, props: { posts: r.data, failed: r.failed } };
}
