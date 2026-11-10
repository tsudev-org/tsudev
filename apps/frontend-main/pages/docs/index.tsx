import React from 'react';
import { useRecoverBuildPlaceholder } from '../../lib/useRecoverBuildPlaceholder';
import Seo from '../../components/Seo';
import { Layout, Card, EmptyState, Icon, Button } from '@tsudev/ui';
import PageHeader from '../../components/PageHeader';
import { docCategory } from '../../lib/docCategories';
import { formatDateVN } from '../../lib/format';
import { api } from '../../lib/api';
import type { Doc } from '../../lib/types';
import { keepStaleOnFailure } from '../../lib/isr';

type DocGroup = { category: string; items: Doc[] };
type DocsIndexProps = { groups: DocGroup[]; failed: boolean };

export default function DocsIndex({ groups, failed }: DocsIndexProps) {
  const retrying = useRecoverBuildPlaceholder(failed);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <Layout active="/docs" bare>
      <Seo
        title="Tài liệu"
        path="/docs"
        description="Hướng dẫn cài đặt, nhật ký thay đổi và cách xử lý sự cố cho các ứng dụng của tsudev."
      />
      <PageHeader
        eyebrow="Tài liệu"
        title="Hướng dẫn & tài liệu"
        description="Cài đặt, cập nhật và xử lý sự cố cho từng ứng dụng tsudev phát hành - kèm cách tự kiểm SHA-256 và chữ ký trước khi cài."
        meta={
          total > 0 ? (
            <span className="text-sm text-fg-muted">
              {total} tài liệu · {groups.length} chuyên mục
            </span>
          ) : undefined
        }
        actions={
          <Button as="a" href="/search" variant="secondary">
            <Icon name="search" size={16} />
            Tìm trong tài liệu
          </Button>
        }
      />
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Kiểm `failed` TRƯỚC `length === 0` - xem lý do ở blog/index.tsx. */}
        {failed ? (
          <EmptyState
            kind="failed"
            icon="warning"
            title={retrying ? 'Đang cập nhật nội dung…' : 'Không tải được mục lục tài liệu'}
            explain="Máy chủ nội dung không trả lời. Tài liệu đã đăng vẫn còn nguyên; thử tải lại sau ít phút."
          />
        ) : (
          groups.length === 0 && (
            <EmptyState
              icon="doc"
              title="Chưa có tài liệu"
              explain="Tài liệu được viết kèm từng bản phát hành - hướng dẫn cài đặt, nhật ký thay đổi, xử lý sự cố - nên mục lục dày lên theo nhịp phát hành ứng dụng."
              action={{ label: 'Đọc blog', href: '/blog' }}
            />
          )
        )}

        {groups.length > 1 && (
          <nav aria-label="Chuyên mục" className="mb-10 flex flex-wrap gap-2">
            {groups.map((g) => {
              const c = docCategory(g.category);
              return (
                <a
                  key={g.category}
                  href={`#cm-${c.key}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg-secondary hover:border-line-strong hover:text-fg transition-colors"
                >
                  <Icon name={c.icon} size={15} />
                  {c.label}
                  <span className="text-xs text-fg-muted">{g.items.length}</span>
                </a>
              );
            })}
          </nav>
        )}

        <div className="space-y-12">
          {groups.map((g: DocGroup) => {
            const c = docCategory(g.category);
            return (
              <section key={g.category} id={`cm-${c.key}`} className="scroll-mt-24">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-glow">
                    <Icon name={c.icon} size={20} />
                  </span>
                  <h2 className="text-xl font-bold text-fg">{c.label}</h2>
                  <span className="text-sm text-fg-muted">{g.items.length}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {g.items.map((d: Doc) => (
                    <Card
                      as="a"
                      hover
                      key={d.slug}
                      href={`/docs/${d.slug}`}
                      className="group flex items-start gap-3 p-4"
                    >
                      <span className="mt-0.5 text-fg-muted">
                        <Icon name="doc" size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-fg group-hover:text-link transition-colors text-balance">
                          {d.title}
                        </span>
                        {d.updatedAt && (
                          <span className="mt-1 block text-xs text-fg-muted">
                            Cập nhật {formatDateVN(d.updatedAt)}
                          </span>
                        )}
                      </span>
                      <span
                        className="text-fg-muted group-hover:text-link transition-colors"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  const r = await api.docs();
  const docs = r.data;
  const revalidate = keepStaleOnFailure(r.failed, '/docs');
  // `d.category` có thể null. Bản cũ dùng nó làm khoá object, nên nhóm không
  // phân loại hiện ra với tiêu đề "null" trên trang thật.
  const byCat: Record<string, Doc[]> = {};
  for (const d of docs) {
    const cat = d.category || 'Khác';
    (byCat[cat] = byCat[cat] || []).push(d);
  }
  const groups: DocGroup[] = Object.keys(byCat)
    .map((category) => ({ category, items: byCat[category] ?? [] }))
    // Chuyên mục theo thứ tự có nghĩa (Hướng dẫn → Cài đặt → ... → Chung), không
    // theo thứ tự tài liệu đầu tiên của mỗi nhóm tình cờ được tạo.
    .sort((a, b) => docCategory(a.category).order - docCategory(b.category).order);
  return { revalidate, props: { groups, failed: r.failed } };
}
