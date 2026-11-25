import React, { useMemo } from 'react';
import { renderMarkdown } from '../../lib/md';
import { contentChecks, type CheckInput, type CheckLevel } from '../../lib/contentChecks';

/**
 * Xem trước (ED-11) và bảng Kiểm tra (ED-12) - cùng một chunk NẠP LƯỜI vì cả hai
 * cần `marked`. Trang soạn import tĩnh thì `marked` vào JS tải ban đầu.
 *
 * Xem trước dùng ĐÚNG `renderMarkdown` + lớp `prose-tsu` của `/blog/[slug]`:
 * thấy gì ở đây thì trang công khai vẽ y như vậy (cùng bộ lọc XSS). Chế độ
 * Sáng/Tối theo bộ chọn ở chân trang - token treo ở `:root`, không gói lại được
 * trong một khung con mà không nhân đôi bảng màu.
 */
export type Device = 'desktop' | 'mobile';

export function PostPreview({
  title,
  contentMd,
  device,
}: {
  title: string;
  contentMd: string;
  device: Device;
}) {
  const html = useMemo(() => renderMarkdown(contentMd), [contentMd]);
  return (
    <div className="rounded-md border border-line bg-subtle p-3 sm:p-5">
      <article
        aria-label="Xem trước bài"
        className={`mx-auto rounded-md border border-line bg-base px-4 py-6 sm:px-8 ${
          device === 'mobile' ? 'max-w-[390px]' : 'max-w-3xl'
        }`}
      >
        <h1 className="mb-6 text-3xl font-semibold text-fg">{title || 'Tiêu đề bài'}</h1>
        {contentMd.trim() ? (
          // eslint-disable-next-line react/no-danger -- HTML đã qua bộ lọc của renderMarkdown (SEC-06), như trang công khai
          <div className="prose-tsu min-w-0" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="text-sm text-fg-muted">Chưa có nội dung.</p>
        )}
      </article>
    </div>
  );
}

const MARK: Record<CheckLevel, { sign: string; cls: string; sr: string }> = {
  ok: { sign: '✓', cls: 'text-success-ink', sr: 'Đạt' },
  warn: { sign: '!', cls: 'text-warning-ink', sr: 'Nên sửa' },
  error: { sign: '✕', cls: 'text-danger-ink', sr: 'Cần sửa' },
};

export function PostChecks(input: CheckInput) {
  const { checks, words, minutes } = useMemo(
    () => contentChecks(input),
    // Đối tượng `input` mới mỗi lần vẽ - phụ thuộc theo từng trường.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.title, input.contentMd, input.metaDescription, input.excerpt, input.coverImageUrl]
  );
  const errors = checks.filter((c) => c.level === 'error').length;
  const warns = checks.filter((c) => c.level === 'warn').length;
  return (
    <div>
      <p className="mt-1 text-xs text-fg-muted">
        {words} từ · ~{minutes} phút đọc ·{' '}
        {errors || warns ? `${errors} cần sửa, ${warns} nên sửa` : 'mọi mục đều đạt'}
      </p>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {checks.map((c) => (
          <li key={c.id} className="flex gap-2">
            <span
              aria-hidden="true"
              className={`w-4 shrink-0 text-center font-semibold ${MARK[c.level].cls}`}
            >
              {MARK[c.level].sign}
            </span>
            <span className="text-fg-secondary">
              <span className="sr-only">{MARK[c.level].sr}: </span>
              {c.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
