import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  ACCESS_HEADER,
  accessDecision,
  accessMode,
  readAccessConfig,
  verifyAccessJwt,
} from '@tsudev/identity-token';

/**
 * Cổng của Worker `console.` (CP2, CONTROL_PLANE.md mục 3 L2 + "thêm cho vùng điều hành").
 *
 * 1. **L2 JWT Access**: kiểm `Cf-Access-Jwt-Assertion` (RS256, `aud` = AUD của ứng dụng Access, `iss` = miền nhóm).
 *    `CF_ACCESS_MODE=ghi` (mặc định) cho qua + một dòng log mỗi lý do; `chan` ⇒ 403, thiếu cấu hình/không tải được
 *    JWKS ⇒ 503. Lớp này bắt lượt vào thẳng `*.workers.dev` hay một đường quên nằm trong ứng dụng Access.
 * 2. **CSP nonce + Trusted Types**: không tài nguyên bên thứ ba, `require-trusted-types-for 'script'` (chỉ chính sách
 *    của bộ nạp webpack của Next), `frame-ancestors 'none'`. Nonce đi xuống `_document` qua header `x-nonce`.
 *
 * Không có miễn trừ nào - kể cả `/api/healthz`: máy giám sát đi bằng Service Token của Access, vẫn mang JWT.
 */
const DEV = process.env.NODE_ENV !== 'production';
const seen = new Set<string>();

function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

// Tải tệp phát hành đi THẲNG từ trình duyệt lên R2 bằng URL presign (`ReleaseManager`) - đúng endpoint S3 của tài
// khoản Cloudflare tsudev (không phải bí mật; trùng `CF_ACCOUNT` của scripts/deploy-frontend.js).
const R2_HOST = '9541f44e84433a32b013ec31bae14848.r2.cloudflarestorage.com';
const UPLOAD_SRC = `https://${R2_HOST} https://*.${R2_HOST}`;
// Ảnh trong bản xem trước bài viết; và hai nguồn nhúng video mà `lib/md.ts` sinh ra.
const CDN_SRC = 'https://cdn.tsudev.com';
const VIDEO_FRAMES = 'https://www.youtube-nocookie.com https://player.vimeo.com';

export function buildConsoleCsp(nonce: string, dev = DEV): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${CDN_SRC}${dev ? ' http:' : ''}`,
    "font-src 'self'",
    // Dev: MinIO cục bộ và websocket nạp nóng.
    `connect-src 'self' ${UPLOAD_SRC}${dev ? ' ws: http:' : ''}`,
    `frame-src ${VIDEO_FRAMES}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
    ...(dev
      ? []
      : [
          "require-trusted-types-for 'script'",
          "trusted-types default nextjs#bundler nextjs dompurify 'allow-duplicates'",
        ]),
  ].join('; ');
}

export async function proxy(req: NextRequest) {
  const mode = accessMode(process.env.CF_ACCESS_MODE);
  if (mode !== 'tat') {
    const verdict = await verifyAccessJwt(
      req.headers.get(ACCESS_HEADER),
      readAccessConfig(process.env)
    );
    if (verdict.result !== 'ok' && !seen.has(verdict.result)) {
      seen.add(verdict.result);
      console.warn(`[console] [access] JWT Access không đạt (${mode}): ${verdict.result}`);
    }
    const d = accessDecision(verdict, mode);
    if (!d.allow) {
      return new NextResponse(
        d.status === 503 ? 'Tạm thời không kiểm được Cloudflare Access.' : 'Forbidden',
        {
          status: d.status,
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'no-store',
            'x-robots-tag': 'noindex, nofollow',
          },
        }
      );
    }
  }

  const nonce = newNonce();
  const headers = new Headers(req.headers);
  headers.set('x-nonce', nonce);
  // Chặn giả mạo: header chuyển tiếp JWT Access chỉ do proxy route đặt từ header của Cloudflare.
  headers.delete('x-tsu-access-jwt');
  const res = NextResponse.next({ request: { headers } });
  res.headers.set('content-security-policy', buildConsoleCsp(nonce));
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico|fonts/).*)'],
};
