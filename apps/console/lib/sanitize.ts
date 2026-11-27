/**
 * Bộ lọc HTML của chính sách Trusted Types `default` (CP3). Mọi chuỗi đi vào sink HTML ở console - xem trước
 * Markdown (`dangerouslySetInnerHTML`), trình soạn tiptap/ProseMirror đọc HTML - phải qua đây. Đây là lớp THỨ HAI:
 * `lib/md.ts` của frontend-main vẫn là ranh giới chính.
 *
 * `iframe` chỉ giữ đúng hai nguồn nhúng video mà `lib/md.ts` sinh ra (và `frame-src` của CSP cho phép).
 */
import DOMPurify from 'dompurify';

export const VIDEO_SRC =
  /^https:\/\/(?:www\.youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/)[\w-]+$/;

export function installSanitizer(): void {
  if (typeof window === 'undefined') return;
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName !== 'iframe') return;
    const el = node as Element;
    if (!VIDEO_SRC.test(el.getAttribute('src') || '')) el.remove();
  });
  window.tsuSanitizeHtml = (html: string) =>
    DOMPurify.sanitize(html, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['target', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy', 'sandbox'],
    });
}

declare global {
  interface Window {
    tsuSanitizeHtml?: (html: string) => string;
  }
}
