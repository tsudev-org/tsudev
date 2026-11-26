import { createHmac } from 'node:crypto';

// Địa chỉ NỘI BỘ của các service. Một chỗ duy nhất trong app này - trước đây sáu
// file mỗi file tự khai một giá trị dự phòng riêng, sáu cơ hội lệch nhau.
//
// Không đọc thẳng config/topology.json ở đây: app này build cho Cloudflare
// Workers, nơi không có filesystem của repo. Giá trị dự phòng vì thế vẫn là
// literal - nhưng chỉ còn MỘT bản, và `npm run topology:check` vẫn kiểm số cổng.
// Ở production ba biến môi trường dưới đây là bắt buộc.
export const CONTENT = process.env.CONTENT_SERVICE_URL || 'http://localhost:4001';
export const STORAGE = process.env.STORAGE_SERVICE_URL || 'http://localhost:4002';
export const IDENTITY = process.env.AUTH_SERVICE_URL || 'http://localhost:4004';

// Ba service trên Render nằm ở URL công khai; khi INTERNAL_API_TOKEN được đặt
// thì chúng từ chối request thiếu header này. Không đặt (local, CI) → chuỗi rỗng
// và service bỏ qua. Mọi BFF phải trải header này vào request đi ra.
// Kiểu trả về khai TƯỜNG MINH là Record<string, string>. Không có nó, TypeScript
// suy ra một union trong đó một nhánh có `'x-internal-token'?: undefined`, và
// union đó không gán được vào `HeadersInit` của fetch - biểu hiện là lỗi
// "No overload matches this call" ở mọi nơi gọi, rất khó lần ra nguồn.
//
// CP1 (ADR-0005 mục 5): thêm chữ ký biên `X-Tsu-Edge` buộc vào METHOD + đường dẫn,
// nên hàm đòi cả hai - thiếu là lỗi biên dịch, không phải một lượt `thieu` im lặng.
export const internalHeaders = (method: string, url: string): Record<string, string> => ({
  ...(process.env.INTERNAL_API_TOKEN ? { 'x-internal-token': process.env.INTERNAL_API_TOKEN } : {}),
  ...edgeHeaders(method, url),
});

/**
 * Chữ ký biên `X-Tsu-Edge: <ts>.<base64url HMAC-SHA256(EDGE_SIGNING_KEY, "<ts>.<METHOD>.<pathname>")>`.
 * Dùng RIÊNG cho proxy công khai không mang INTERNAL_API_TOKEN (OIDC, quyền lợi, JWKS): người gọi không phải BFF
 * nhưng request vẫn do Worker này gửi. Không có khoá (dev, CI) ⇒ không thêm header, backend cũng không đòi.
 * PHẢI khớp `edgeSigningInput` của `@tsudev/auth` (edge.ts) - test/edgeSign.test.ts giữ vectơ chung.
 * `node:crypto` chạy được trên Workers nhờ `nodejs_compat` (wrangler.jsonc).
 */
export const edgeHeaders = (
  method: string,
  url: string,
  nowMs = Date.now()
): Record<string, string> => {
  const key = process.env.EDGE_SIGNING_KEY;
  if (!key) return {};
  const ts = Math.floor(nowMs / 1000);
  const pathname = new URL(url).pathname;
  const mac = createHmac('sha256', key)
    .update(`${ts}.${(method || 'GET').toUpperCase()}.${pathname}`)
    .digest('base64url');
  return { 'x-tsu-edge': `${ts}.${mac}` };
};
