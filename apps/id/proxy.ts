import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Cổng của Worker `id.` (CP4, CONTROL_PLANE.md mục 2.4 - luật riêng của cổng).
 *
 * 1. **Chỉ phục vụ đường của cổng.** Trang dùng lại `Layout` của tsudev.com nên có liên kết tương đối (`/blog`,
 *    `/projects`...); mọi đường ngoài `GATE_PATHS` được trả về tsudev.com (307 - không ghim vĩnh viễn ở trình
 *    duyệt). Cổng không có trang thứ hai nào để chiếm.
 * 2. **CSP nonce + Trusted Types**: `script-src` nonce + `'strict-dynamic'`, không `'unsafe-inline'`; ngoại lệ bên thứ
 *    ba DUY NHẤT là Turnstile (`challenges.cloudflare.com`, CONTROL_PLANE 2.4 "Turnstile khi có dấu hiệu dò").
 *    `form-action` mở thêm tsudev.com cho nút Cho phép/Từ chối của trang đồng ý OIDC (cookie `_interaction`).
 */
const DEV = process.env.NODE_ENV !== 'production';
const MAIN = (process.env.NEXT_PUBLIC_MAIN_URL || 'https://tsudev.com').replace(/\/+$/, '');
export const CF_TURNSTILE = 'https://challenges.cloudflare.com';
const CDN_SRC = 'https://cdn.tsudev.com';

/** Đường của cổng. Thêm trang vào cổng ⇒ thêm vào đây (test canh hai chiều với `pages/`). */
export const GATE_PATHS: RegExp[] = [
  /^\/$/,
  /^\/(login|signup|forgot-password|reset-password|verify-email|confirm-email-change|revoke-sessions)\/?$/,
  /^\/settings\/(security|profile)\/?$/,
  /^\/oidc\/interaction\/[A-Za-z0-9_-]{1,64}\/?$/,
  /^\/x\/[A-Za-z0-9_-]{1,64}\/?$/,
  /^\/api\/(auth|identity|account|xd)\/.+$/,
  /^\/api\/(account-link|turnstile-site-key|healthz)\/?$/,
  /^\/(robots\.txt|favicon\.ico|favicon-16x16\.png|favicon-32x32\.png|apple-touch-icon\.png)$/,
  /^\/(fonts|brand)\/[\w.-]+$/,
  /^\/_next\//,
];

export function isGatePath(pathname: string): boolean {
  return GATE_PATHS.some((re) => re.test(pathname));
}

function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function buildIdCsp(nonce: string, dev = DEV, main = MAIN): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: ${CDN_SRC}${dev ? ' http:' : ''}`,
    "font-src 'self'",
    `connect-src 'self' ${CF_TURNSTILE}${dev ? ' ws: http:' : ''}`,
    `frame-src ${CF_TURNSTILE}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    `form-action 'self' ${main}`,
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

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!isGatePath(pathname)) {
    return NextResponse.redirect(`${MAIN}${pathname}${search}`, 307);
  }
  const nonce = newNonce();
  const headers = new Headers(req.headers);
  headers.set('x-nonce', nonce);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set('content-security-policy', buildIdCsp(nonce));
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico|fonts/).*)'],
};
