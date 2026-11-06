import React from 'react';

/**
 * Dải đầu trang dùng chung cho mọi trang con (tài liệu, blog, dự án, tìm kiếm,
 * pháp lý). Trước đây mỗi trang tự đặt một SectionHeading trên nền trống, và
 * kết quả là trang con trông như bản nháp so với trang chủ. Một component thì
 * nhịp khoảng cách, nền chàm và breadcrumb giống nhau ở mọi nơi.
 */
type Crumb = { label: string; href?: string };

type PageHeaderProps = {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  /** Bề rộng khối chữ - trang đọc dài dùng hẹp hơn để khớp cột nội dung. */
  width?: 'wide' | 'narrow';
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  crumbs,
  actions,
  meta,
  width = 'wide',
}: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden border-b border-line tsu-hero-bg">
      <div
        className={`relative mx-auto px-4 pt-10 pb-10 md:pt-14 md:pb-12 ${
          width === 'wide' ? 'max-w-6xl' : 'max-w-4xl'
        }`}
      >
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Đường dẫn" className="mb-4 text-sm text-fg-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              {crumbs.map((c, i) => (
                <li key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {c.href ? (
                    <a href={c.href} className="hover:text-link transition-colors">
                      {c.label}
                    </a>
                  ) : (
                    <span className="text-fg-secondary line-clamp-1" aria-current="page">
                      {c.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            {eyebrow && (
              <div className="mb-3 inline-flex items-center rounded-full bg-glow px-3 py-1 text-xs font-semibold text-link">
                {eyebrow}
              </div>
            )}
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-fg text-balance leading-tight md:leading-(--text-4xl--line-height)">
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-base md:text-lg text-fg-secondary text-pretty">
                {description}
              </p>
            )}
            {meta && <div className="mt-4 flex flex-wrap items-center gap-3">{meta}</div>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </section>
  );
}
