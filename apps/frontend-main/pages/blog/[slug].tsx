import React from 'react';
import { useRecoverBuildPlaceholder } from '../../lib/useRecoverBuildPlaceholder';
import Seo from '../../components/Seo';
import { Layout, Badge, Avatar, TableOfContents, EmptyState, Card, Icon } from '@tsudev/ui';
import PageHeader from '../../components/PageHeader';
import type { TocItem } from '@tsudev/ui';
import { api } from '../../lib/api';
import { extractHeadings, renderMarkdown } from '../../lib/md';
import type { GetStaticPropsContext } from 'next';
import type { Post } from '../../lib/types';
import { routeParam } from '../../lib/identity';
import { formatDateVN } from '../../lib/format';
import { keepStaleOnFailure } from '../../lib/isr';

/** Thời gian đọc ước lượng: ~220 từ/phút, tối thiểu 1 phút; bỏ khối code. */
function readingMinutes(md: string): number {
  const words = md
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

type RelatedPost = { slug: string; title: string; excerpt: string | null };
type BlogPostProps = {
  post: Post | null;
  related: RelatedPost[];
  failed: boolean;
  slug: string;
  toc: TocItem[];
};

export default function BlogPost({ post, related, failed, slug, toc }: BlogPostProps) {
  const retrying = useRecoverBuildPlaceholder(failed);
  // Hai nhánh, không một nhánh. Mã trạng thái tương ứng đã được đặt ở
  // getServerSideProps - xem khối chú thích ở đó.
  if (failed)
    return (
      <Layout active="/blog">
        <Seo title="Không tải được bài viết" path={`/blog/${slug}`} noindex />
        <EmptyState
          kind="failed"
          icon="warning"
          title={retrying ? 'Đang cập nhật nội dung…' : 'Không tải được bài viết'}
          explain={
            <>
              Bài viết này có thể vẫn còn nguyên - lượt gọi tới máy chủ nội dung đã thất bại. Thử
              tải lại sau ít phút.
            </>
          }
          action={{ label: 'Về danh sách bài viết', href: '/blog' }}
          className="my-10"
        />
      </Layout>
    );
  if (!post)
    return (
      <Layout active="/blog">
        <Seo title="Không tìm thấy bài viết" path={`/blog/${slug}`} noindex />
        <EmptyState
          icon="doc"
          title="Không tìm thấy bài viết"
          explain="Đường dẫn này không trỏ tới bài viết nào. Có thể nó đã được đổi slug."
          action={{ label: 'Về danh sách bài viết', href: '/blog' }}
          className="my-10"
        />
      </Layout>
    );
  return (
    <Layout active="/blog" bare>
      <Seo
        title={post.title}
        path={`/blog/${slug}`}
        description={post.metaDescription || post.excerpt || undefined}
        image={post.coverImageUrl || undefined}
        type="article"
        publishedAt={post.publishedAt || post.createdAt}
      />
      <PageHeader
        crumbs={[{ label: 'Blog', href: '/blog' }, { label: post.title }]}
        title={post.title}
        description={post.excerpt || undefined}
        meta={
          <>
            <span className="inline-flex items-center gap-2 text-sm">
              <Avatar name={post.author?.displayName || 'tsudev'} size={28} />
              <span className="font-medium text-fg-secondary">
                {post.author?.displayName || 'tsudev'}
              </span>
            </span>
            <span className="text-sm text-fg-muted">
              {formatDateVN(post.publishedAt || post.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1 text-sm text-fg-muted">
              <Icon name="clock" size={15} />
              {readingMinutes(post.contentMd || '')} phút đọc
            </span>
            {(post.tags || []).map((t: string) => (
              <a
                key={t}
                href={`/search?tag=${encodeURIComponent(t)}`}
                aria-label={`Tìm theo thẻ ${t}`}
              >
                <Badge tone="neutral">{t}</Badge>
              </a>
            ))}
          </>
        }
      />
      <div className="max-w-6xl mx-auto px-4 py-10">
        {post.coverImageUrl && (
          <img
            src={post.coverImageUrl}
            alt=""
            className="w-full rounded-xl mb-8 max-h-96 object-cover border border-line"
          />
        )}
        {/* Hai cột từ lg trở lên: thân bài giữ bề rộng đọc được, mục lục bám
            dính bên phải. Dưới lg thì mục lục nằm TRÊN thân bài - trên màn hình
            hẹp nó phải là thứ người đọc gặp trước, không phải thứ họ cuộn qua
            hết bài mới thấy. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
          <div
            className="prose-tsu order-2 lg:order-1 min-w-0"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.contentMd || '') }}
          />
          <aside className="order-1 lg:order-2 lg:sticky lg:top-20">
            <TableOfContents items={toc} />
          </aside>
        </div>

        {(post.references?.length ?? 0) > 0 && (
          <section
            aria-labelledby="nguon-tham-khao"
            className="mt-12 pt-6 border-t border-line max-w-[minmax(0,1fr)]"
          >
            <h2 id="nguon-tham-khao" className="text-lg font-bold text-fg mb-3">
              Nguồn tham khảo
            </h2>
            <ol className="list-decimal pl-5 space-y-1.5 marker:text-fg-muted">
              {(post.references || []).map((r, i) => (
                <li key={i} className="text-sm">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link hover:underline wrap-break-word"
                  >
                    {r.label || r.url}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}
        {related.length > 0 && (
          <section aria-labelledby="bai-khac" className="mt-14 pt-8 border-t border-line">
            <h2 id="bai-khac" className="text-xl font-bold text-fg mb-4">
              Bài viết khác
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <Card key={r.slug} as="a" hover href={`/blog/${r.slug}`} className="group p-5">
                  <h3 className="font-semibold text-fg leading-snug group-hover:text-link transition-colors text-balance">
                    {r.title}
                  </h3>
                  {r.excerpt && (
                    <p className="mt-2 text-sm text-fg-muted line-clamp-2">{r.excerpt}</p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

/// 🔴 BA MÃ TRẠNG THÁI, KHÔNG PHẢI MỘT. Đọc trước khi gộp lại cho gọn.
///
/// Bản trước gọi `api.post()` rồi render "Không tìm thấy bài viết" cho MỌI trường
/// hợp nó trả về null - kể cả khi lượt gọi THẤT BẠI. Nghĩa là lúc content-service
/// hoặc database chết, một bài viết đang tồn tại thật sẽ trả HTTP 200 kèm dòng chữ
/// "không tìm thấy". Với công cụ tìm kiếm đó là soft 404: nó gỡ URL khỏi chỉ mục,
/// và nó không đọc lại nữa vì ta đã trả lời 200 rất dứt khoát.
///
/// Đã xảy ra thật: ngày 28/10/2026 Neon treo compute và toàn bộ nội dung
/// tsudev.com biến mất khỏi mọi trang trong khi mọi trang vẫn 200 (xem
/// `lib/api.ts` § vì sao `Fetched` tồn tại).
///
///   gọi thất bại         -> 503, "không tải được"  -> crawler THỬ LẠI, không gỡ
///   gọi xong, null       -> 404, "không tìm thấy"  -> đúng, bài viết này không có
///   gọi xong, có dữ liệu -> 200
// Không dựng trước slug nào lúc build: bài được dựng ở lượt xem ĐẦU TIÊN rồi nằm
// trong cache. 'blocking' để người đọc đầu tiên nhận trang hoàn chỉnh, không
// nhận khung rỗng rồi nháy nội dung vào.
export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' };
}

export async function getStaticProps({ params }: GetStaticPropsContext) {
  // Bài liên quan là phần phụ: lượt gọi đó lỗi thì trang vẫn dựng, chỉ thiếu mục
  // "Bài viết khác". Chỉ lượt gọi BÀI quyết định giữ-bản-cũ.
  const [r, rRecent] = await Promise.all([api.post(routeParam(params, 'slug')), api.posts(4)]);
  const post = r.data;
  const revalidate = keepStaleOnFailure(r.failed, '/blog/[slug]');
  // 404 cũng được cache (revalidate): bài xoá rồi thì dựng lại sẽ ra 404 thật.
  if (!r.failed && !post) return { notFound: true, revalidate };
  // Mục lục dựng ở SERVER: dựng ở client thì nó nháy vào sau khi bài đã hiện,
  // và bố cục hai cột nhảy một nhịp ở mỗi lần tải trang.
  const toc = extractHeadings(post?.contentMd || '');
  const related: RelatedPost[] = (rRecent.data || [])
    .filter((p) => p.slug !== post?.slug)
    .slice(0, 3)
    .map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt ?? null }));
  return {
    revalidate,
    props: { failed: r.failed, post, related, slug: routeParam(params, 'slug'), toc },
  };
}
