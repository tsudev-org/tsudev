import React from 'react';
import Seo from './Seo';
import PageHeader from './PageHeader';
import { Layout, TableOfContents } from '@tsudev/ui';

// Khung chung cho các trang văn bản dài (Điều khoản, Quyền riêng tư, Nội quy).
// Mỗi mục có `id` để trích dẫn được bằng liên kết neo - văn bản pháp lý hay bị
// dẫn chiếu tới từng mục nên đây là yêu cầu bắt buộc, không phải trang trí.
/** Một mục trong văn bản pháp lý. `id` là neo trích dẫn, bắt buộc. */
export type LegalSection = {
  id: string;
  heading: React.ReactNode;
  body?: React.ReactNode;
};

type LegalDocProps = {
  eyebrow?: React.ReactNode;
  title?: string;
  lead?: string;
  updated?: React.ReactNode;
  effective?: React.ReactNode;
  sections: LegalSection[];
  note?: React.ReactNode;
  active?: string;
};

export const LegalDoc = ({
  eyebrow,
  title,
  lead,
  updated,
  effective,
  sections,
  note,
  active,
}: LegalDocProps) => (
  <Layout active={active} bare>
    <Seo title={title} path={active} description={lead} />

    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={lead}
      meta={
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
          <div className="flex gap-1.5">
            <dt>Hiệu lực</dt>
            <dd className="font-medium text-fg-secondary">{effective}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Cập nhật</dt>
            <dd className="font-medium text-fg-secondary">{updated}</dd>
          </div>
        </dl>
      }
    />

    <div className="max-w-6xl mx-auto px-4 pb-12">
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <div className="prose-tsu max-w-3xl order-2 lg:order-1">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="flex items-baseline gap-3">
                <span className="font-mono text-base text-accent shrink-0">{i + 1}.</span>
                <span>{s.heading}</span>
              </h2>
              {s.body}
            </section>
          ))}
          {note && (
            <aside className="mt-14 border-t border-line-strong pt-6 text-sm text-fg-muted">
              {note}
            </aside>
          )}
        </div>

        {/* Cùng MỘT component mục lục với blog và tài liệu. Bản trước ở đây là
            một danh sách viết tay chỉ có viền trái - nghĩa là ba trang dài nhất
            của site có ba kiểu mục lục khác nhau, và chỉ có kiểu này không có
            nền riêng nên nó lẫn vào thân bài ở chế độ sáng. */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-20">
          <TableOfContents
            items={sections.map((s, i) => ({
              id: s.id,
              // Số thứ tự giữ lại: văn bản pháp lý được dẫn chiếu theo số mục.
              text: `${i + 1}. ${typeof s.heading === 'string' ? s.heading : ''}`,
              level: 2,
            }))}
          />
        </aside>
      </div>
    </div>
  </Layout>
);

export default LegalDoc;
