import React from 'react';
import { useRecoverBuildPlaceholder } from '../../lib/useRecoverBuildPlaceholder';
import Seo from '../../components/Seo';
import { Layout, TableOfContents, EmptyState, Icon } from '@tsudev/ui';
import PageHeader from '../../components/PageHeader';
import { docCategory } from '../../lib/docCategories';
import { formatDateVN } from '../../lib/format';
import type { TocItem } from '@tsudev/ui';
import { api } from '../../lib/api';
import { extractHeadings, renderMarkdown } from '../../lib/md';
import type { GetStaticPropsContext } from 'next';
import type { Doc } from '../../lib/types';
import { routeParam } from '../../lib/identity';
import { keepStaleOnFailure } from '../../lib/isr';

type SiblingDoc = { slug: string; title: string };
type DocPageProps = {
  doc: Doc | null;
  siblings: SiblingDoc[];
  failed: boolean;
  slug: string;
  toc: TocItem[];
};

export default function DocPage({ doc, siblings, failed, slug, toc }: DocPageProps) {
  const retrying = useRecoverBuildPlaceholder(failed);
  if (failed)
    return (
      <Layout active="/docs">
        <Seo title="Không tải được tài liệu" path={`/docs/${slug}`} noindex />
        <EmptyState
          kind="failed"
          icon="warning"
          title={retrying ? 'Đang cập nhật nội dung…' : 'Không tải được tài liệu'}
          explain={
            <>
              Tài liệu này có thể vẫn còn nguyên - lượt gọi tới máy chủ nội dung đã thất bại. Thử
              tải lại sau ít phút.
            </>
          }
          action={{ label: 'Về mục lục tài liệu', href: '/docs' }}
          className="my-10"
        />
      </Layout>
    );
  if (!doc)
    return (
      <Layout active="/docs">
        <Seo title="Không tìm thấy tài liệu" path={`/docs/${slug}`} noindex />
        <EmptyState
          icon="doc"
          title="Không tìm thấy tài liệu"
          explain="Đường dẫn này không trỏ tới tài liệu nào. Có thể nó đã được đổi slug."
          action={{ label: 'Về mục lục tài liệu', href: '/docs' }}
          className="my-10"
        />
      </Layout>
    );
  const cat = docCategory(doc.category);
  // Lưới 3 cột CHỈ khi thanh bên thật sự hiện - khai cột mà không có phần tử
  // thì thân bài rơi vào cột hẹp 14rem.
  const hasNav = siblings.length > 1;
  const idx = siblings.findIndex((d) => d.slug === doc.slug);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  return (
    <Layout active="/docs" bare>
      <Seo title={doc.title} path={`/docs/${slug}`} type="article" />
      <PageHeader
        crumbs={[
          { label: 'Tài liệu', href: '/docs' },
          { label: cat.label, href: `/docs#cm-${cat.key}` },
          { label: doc.title },
        ]}
        eyebrow={cat.label}
        title={doc.title}
        meta={
          doc.updatedAt ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-fg-muted">
              <Icon name="clock" size={15} />
              Cập nhật {formatDateVN(doc.updatedAt)}
            </span>
          ) : undefined
        }
      />
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Ba cột từ xl: danh sách cùng chuyên mục · thân bài · mục lục. Dưới xl
            bỏ cột trái (danh sách có ở cuối bài qua nút trước/sau), mục lục lên
            TRƯỚC thân bài trên màn hình hẹp - xem lý do ở bản trước của trang. */}
        <div
          className={`grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start ${
            hasNav ? 'xl:grid-cols-[14rem_minmax(0,1fr)_15rem]' : ''
          }`}
        >
          {hasNav && (
            <aside
              className="hidden xl:block xl:sticky xl:top-20"
              aria-label={`Tài liệu ${cat.label}`}
            >
              <div className="mb-2 text-xs font-semibold text-fg-muted">{cat.label}</div>
              <ul className="space-y-0.5 border-l border-line">
                {siblings.map((d) => (
                  <li key={d.slug}>
                    <a
                      href={`/docs/${d.slug}`}
                      aria-current={d.slug === doc.slug ? 'page' : undefined}
                      className={`-ml-px block border-l-2 py-1.5 pl-3 text-sm transition-colors ${
                        d.slug === doc.slug
                          ? 'border-primary font-medium text-link'
                          : 'border-transparent text-fg-secondary hover:border-line-strong hover:text-fg'
                      }`}
                    >
                      {d.title}
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          )}
          <article className="order-2 lg:order-1 xl:order-0 min-w-0">
            <div
              className="prose-tsu"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.contentMd || '') }}
            />
            {(prev || next) && (
              <nav aria-label="Tài liệu kế tiếp" className="mt-12 grid gap-3 sm:grid-cols-2">
                {prev ? (
                  <a
                    href={`/docs/${prev.slug}`}
                    className="rounded-lg border border-line bg-surface p-4 hover:border-line-strong transition-colors"
                  >
                    <span className="text-xs text-fg-muted">← Trước</span>
                    <span className="mt-1 block font-semibold text-fg">{prev.title}</span>
                  </a>
                ) : (
                  <span />
                )}
                {next && (
                  <a
                    href={`/docs/${next.slug}`}
                    className="rounded-lg border border-line bg-surface p-4 text-right hover:border-line-strong transition-colors"
                  >
                    <span className="text-xs text-fg-muted">Tiếp theo →</span>
                    <span className="mt-1 block font-semibold text-fg">{next.title}</span>
                  </a>
                )}
              </nav>
            )}
          </article>
          <aside className="order-1 lg:order-2 xl:order-0 lg:sticky lg:top-20">
            {toc.length > 0 && <TableOfContents items={toc} />}
          </aside>
        </div>
      </div>
    </Layout>
  );
}

/// 🔴 BA MÃ TRẠNG THÁI, KHÔNG PHẢI MỘT. Đọc trước khi gộp lại cho gọn.
///
/// Bản trước gọi `api.doc()` rồi render "Không tìm thấy tài liệu" cho MỌI trường
/// hợp nó trả về null - kể cả khi lượt gọi THẤT BẠI. Nghĩa là lúc content-service
/// hoặc database chết, một tài liệu đang tồn tại thật sẽ trả HTTP 200 kèm dòng chữ
/// "không tìm thấy". Với công cụ tìm kiếm đó là soft 404: nó gỡ URL khỏi chỉ mục,
/// và nó không đọc lại nữa vì ta đã trả lời 200 rất dứt khoát.
///
/// Đã xảy ra thật: ngày 28/10/2026 Neon treo compute và toàn bộ nội dung
/// tsudev.com biến mất khỏi mọi trang trong khi mọi trang vẫn 200 (xem
/// `lib/api.ts` § vì sao `Fetched` tồn tại).
///
///   gọi thất bại         -> 503, "không tải được"  -> crawler THỬ LẠI, không gỡ
///   gọi xong, null       -> 404, "không tìm thấy"  -> đúng, tài liệu này không có
///   gọi xong, có dữ liệu -> 200
// Không dựng trước slug nào lúc build: bài được dựng ở lượt xem ĐẦU TIÊN rồi nằm
// trong cache. 'blocking' để người đọc đầu tiên nhận trang hoàn chỉnh, không
// nhận khung rỗng rồi nháy nội dung vào.
export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' };
}

export async function getStaticProps({ params }: GetStaticPropsContext) {
  // Hai lượt gọi song song: tài liệu và mục lục (để dựng danh sách cùng chuyên
  // mục). Chỉ lượt gọi TÀI LIỆU quyết định giữ-bản-cũ; mục lục lỗi thì trang
  // vẫn có giá trị, chỉ thiếu thanh bên.
  const [r, rList] = await Promise.all([api.doc(routeParam(params, 'slug')), api.docs()]);
  const doc = r.data;
  const revalidate = keepStaleOnFailure(r.failed, '/docs/[slug]');
  if (!r.failed && !doc) return { notFound: true, revalidate };
  // Mục lục dựng ở SERVER: dựng ở client thì nó nháy vào sau khi bài đã hiện,
  // và bố cục hai cột nhảy một nhịp ở mỗi lần tải trang.
  const toc = extractHeadings(doc?.contentMd || '');
  const cat = (doc?.category || 'general').toLowerCase();
  const siblings: SiblingDoc[] = (rList.data || [])
    .filter((d) => (d.category || 'general').toLowerCase() === cat)
    .map((d) => ({ slug: d.slug, title: d.title }));
  return {
    revalidate,
    props: { failed: r.failed, doc, siblings, slug: routeParam(params, 'slug'), toc },
  };
}
