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

export function buildConsoleCsp(nonce: string, dev = DEV): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? ' ws:' : ''}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
    ...(dev
      ? []
      : [
          "require-trusted-types-for 'script'",
          "trusted-types default nextjs#bundler nextjs 'allow-duplicates'",
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
