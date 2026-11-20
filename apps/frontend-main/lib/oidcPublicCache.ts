/**
 * Bộ đệm cho HAI tài liệu OIDC công khai, tĩnh theo bản phát hành: discovery và JWKS.
 *
 * Sự cố (ISS-20261120-1459-46b8, lặp lại 20:46-20:48 UTC 20/11/2026): request con từ Worker tới
 * `tsudev-backend.onrender.com` thỉnh thoảng bị lớp Cloudflare trước Render trả 429 + trang thách
 * thức "Just a moment...", vài phút rồi tự hết. Gọi thẳng Render từ máy khác vẫn 200. Mọi RP
 * (qulythuchi, sound-db, Cwico...) đọc discovery TRƯỚC khi bắt đầu đăng nhập ⇒ cả hệ không đăng
 * nhập được trong mấy phút đó.
 *
 * Cách giảm: giữ bản tốt gần nhất trong bộ nhớ isolate - mới trong FRESH_MS thì phục vụ luôn
 * (bớt request con), upstream hỏng thì phục vụ bản cũ tới STALE_MS. Chỉ nhận 200 JSON vào bộ đệm.
 * Hai tài liệu này giống nhau cho mọi người gọi (proxy đặt host cố định), nên bộ đệm chung không
 * lộ dữ liệu của ai.
 */
export const CACHEABLE_PATHS = new Set(['.well-known/openid-configuration', 'jwks']);
export const FRESH_MS = 5 * 60_000;
export const STALE_MS = 24 * 60 * 60_000;

export interface CachedDoc {
  status: number;
  contentType: string;
  body: Uint8Array;
  at: number;
}

const store = new Map<string, CachedDoc>();

export function getCached(
  path: string,
  now = Date.now()
): { doc: CachedDoc; fresh: boolean } | null {
  const doc = store.get(path);
  if (!doc) return null;
  const age = now - doc.at;
  if (age > STALE_MS) {
    store.delete(path);
    return null;
  }
  return { doc, fresh: age <= FRESH_MS };
}

export function putCached(path: string, contentType: string, body: Uint8Array, now = Date.now()) {
  if (!CACHEABLE_PATHS.has(path) || !contentType.includes('json')) return;
  store.set(path, { status: 200, contentType, body, at: now });
}

/** Upstream trả lỗi tạm (bị chặn/thách thức/quá tải) - đáng phục vụ bản cũ hoặc báo thử lại. */
export function isTransientUpstream(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/** Chỉ cho test. */
export function _clearOidcCache() {
  store.clear();
}
