/**
 * Trạm điều hành `console.tsudev.com` (CP2, ADR-0005, `.standards` CONTROL_PLANE.md mục 3).
 *
 * Bản dựng RIÊNG, Worker riêng: mã điều hành không nằm trong bundle công khai của `tsudev.com`. Trang ở đây được
 * phép nhập thành phần/hàm thuần từ `apps/frontend-main` (`externalDir`) - chiều ngược lại (công khai nhập mã điều
 * hành) bị test quét nguồn chặn (`apps/frontend-main/test/consoleSplit.test.ts`).
 *
 * Mọi trang là SSR có dữ liệu ⇒ `Cache-Control: no-store`; `noindex` ở cả header lẫn robots.txt. CSP nonce + Trusted
 * Types do `proxy.ts` đặt theo từng request.
 *
 * @type {import('next').NextConfig}
 */
// Dev đọc từ `.env.local`, deploy truyền qua shell; thiếu cả hai thì là production thật.
const MAIN = (process.env.NEXT_PUBLIC_MAIN_URL || 'https://tsudev.com').replace(/\/+$/, '');
const ID = (process.env.NEXT_PUBLIC_ID_URL || 'https://id.tsudev.com').replace(/\/+$/, '');
const SELF = (process.env.NEXT_PUBLIC_CONSOLE_URL || 'https://console.tsudev.com').replace(
  /\/+$/,
  ''
);

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { externalDir: true },
  transpilePackages: ['@tsudev/ui', 'next-auth'],
  outputFileTracingIncludes: {
    '**': ['../../node_modules/jose/dist/browser/**', '../../node_modules/@panva/hkdf/dist/web/**'],
  },

  // Đường dẫn tương đối kế thừa từ thành phần của tsudev.com (cài 2FA, đăng nhập) ⇒ về đúng chỗ. Đăng nhập và
  // trang tài khoản ở cổng `id.` (CP4); quay về console sau khi đăng nhập.
  async redirects() {
    return [
      {
        source: '/settings/:path(security|profile)',
        destination: `${ID}/settings/:path`,
        permanent: false,
      },
      { source: '/settings/:path*', destination: `${MAIN}/settings/:path*`, permanent: false },
      {
        source: '/login',
        destination: `${ID}/login?callbackUrl=${encodeURIComponent(`${SELF}/`)}`,
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
