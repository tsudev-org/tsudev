import React from 'react';

type SectionHeadingProps = {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Tiêu đề CHÍNH của trang (trang không có PageHeader) thì truyền `h1`. Mặc định `h2`. */
  headingAs?: 'h1' | 'h2';
};

export const SectionHeading = ({
  eyebrow,
  title,
  action,
  className = '',
  headingAs: H = 'h2',
}: SectionHeadingProps) => (
  <div className={`flex items-end justify-between gap-4 mb-6 ${className}`}>
    <div>
      {eyebrow && (
        <div className="inline-flex items-center rounded-full bg-glow px-3 py-1 text-xs font-semibold text-link mb-2.5">
          {eyebrow}
        </div>
      )}
      <H className="text-2xl md:text-3xl font-bold tracking-heading text-fg text-balance">
        {title}
      </H>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export default SectionHeading;
