/**
 * Cổng xác thực `id.tsudev.com` (CP4, ADR-0005, `.standards` CONTROL_PLANE.md mục 2 + AUTH_AND_ACCOUNT mục 2.1).
 *
 * Bản dựng RIÊNG, Worker riêng: nơi DUY NHẤT có giao diện đăng nhập, đăng ký, khôi phục, 2FA, passkey, QR, đồng ý
 * OIDC và bảo mật tài khoản. Issuer OIDC KHÔNG ở đây - vẫn là `https://tsudev.com/oidc`. Trang dùng lại thành phần của
 * `apps/frontend-main` qua `externalDir` (như console); đường không thuộc cổng được `proxy.ts` trả về tsudev.com.
 *
 * Mọi trang `no-store`; `noindex` ở mọi trang trừ `/login` (CONTROL_PLANE mục 2.4). CSP nonce + Trusted Types do
 * `proxy.ts` đặt theo từng request.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { externalDir: true },
  transpilePackages: ['@tsudev/ui', 'next-auth'],
  outputFileTracingIncludes: {
    '**': ['../../node_modules/jose/dist/browser/**', '../../node_modules/@panva/hkdf/dist/web/**'],
  },

  // Provider đi qua cầu OAuth ở tsudev.com (lib/oauthBridge.ts) tới khi callback Google/GitHub trỏ về cổng (CP4b).
  // Dev mặc định rỗng: máy dev thường không có khoá Google/GitHub, nút chết còn tệ hơn không có nút.
  env: {
    NEXT_PUBLIC_OAUTH_VIA_MAIN:
      process.env.NEXT_PUBLIC_OAUTH_VIA_MAIN ??
      (process.env.NODE_ENV === 'production' ? 'google,github' : ''),
  },

  async redirects() {
    return [{ source: '/', destination: '/settings/security', permanent: false }];
  },

  async headers() {
    const common = [
      { key: 'Cache-Control', value: 'no-store, max-age=0' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      // Trang đăng nhập/đồng ý được mở từ RP và website sản phẩm: chỉ gửi origin, không gửi đường dẫn + query.
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      {
        key: 'Permissions-Policy',
        value:
          'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), publickey-credentials-get=(self), publickey-credentials-create=(self)',
      },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    ];
    return [
      { source: '/:path*', headers: common },
      // noindex mọi trang trừ trang đăng nhập (regex phủ định của path-to-regexp).
      {
        source: '/:path((?!login$).*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ];
  },
};

module.exports = nextConfig;
