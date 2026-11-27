/**
 * Bộ lọc HTML của chính sách Trusted Types `default` ở cổng `id.` (CP4). Trang của cổng không có sink HTML nào
 * của chính nó; lớp này chỉ để thư viện bên dưới (React, next-auth, Turnstile) nếu có ghi HTML thì đi qua DOMPurify
 * thay vì làm vỡ trang hay được thả qua.
 */
import DOMPurify from 'dompurify';

export function installSanitizer(): void {
  if (typeof window === 'undefined') return;
  window.tsuSanitizeHtml = (html: string) => DOMPurify.sanitize(html);
}

declare global {
  interface Window {
    tsuSanitizeHtml?: (html: string) => string;
  }
}
