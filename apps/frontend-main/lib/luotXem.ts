/**
 * Lượt xem bài - phía Worker và trình duyệt.
 *
 * Đếm ở D1 (binding `VIEWS_DB`), KHÔNG ở Neon: ghi Neon mỗi lượt xem giữ compute
 * thức liên tục và đốt hạn mức 100 CU-giờ/tháng (docs/free-tier.md). Cron
 * `canh-site-cron` gộp các ngày đã qua thành MỘT lô/ngày vào `PostViewDaily`.
 *
 * Mỗi (ngày, bài, khách) là MỘT dòng - `INSERT OR IGNORE` - nên tải lại trang
 * không đếm thêm, và lượt ghi trùng không tốn hạn mức ghi của D1. "Khách" là
 * HMAC-SHA-256(IP + user-agent) với khoá bí mật của máy chủ, cắt 16 byte: không
 * lưu IP, và không đảo được về IP khi không có khoá. Dòng bị xoá sau khi gộp.
 */
import { useEffect } from 'react';

export const SLUG_XEM_RE = /^[a-z0-9-]{1,160}$/;

/** Bot tự xưng - beacon cần JavaScript nên phần lớn bot vốn không tới được đây. */
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|fetch|curl|wget|python|java\//i;

export const laBot = (ua: string): boolean => !ua || BOT_RE.test(ua);

/** Ngày theo giờ Việt Nam (UTC+7), dạng YYYY-MM-DD. */
export function ngayVN(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Đọc slug từ thân beacon (chuỗi JSON text/plain hoặc object đã parse). */
export function docSlug(body: unknown): string | null {
  let b = body;
  if (typeof b === 'string') {
    try {
      b = JSON.parse(b);
    } catch {
      return null;
    }
  }
  const slug = (b as { slug?: unknown } | null)?.slug;
  return typeof slug === 'string' && SLUG_XEM_RE.test(slug) ? slug : null;
}

export async function maKhach(khoa: string, ip: string, ua: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(khoa),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${ip}\n${ua}`)));
  return Array.from(sig.slice(0, 16), (x) => x.toString(16).padStart(2, '0')).join('');
}

/** Gửi MỘT beacon khi trang bài viết có nội dung được mở. */
export function useGhiLuotXem(slug: string | null): void {
  useEffect(() => {
    if (!slug || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
    navigator.sendBeacon('/api/views', JSON.stringify({ slug }));
  }, [slug]);
}
