import fs from 'fs';
import path from 'path';
// P4: `/oidc/*` (issuer https://tsudev.com/oidc) đi qua route proxy đọc địa chỉ service
// LÚC CHẠY. Không luật rewrite nào được trỏ ra URL ngoài: next.config đánh giá lúc build
// trên máy dev, nơi địa chỉ service là localhost (CLAUDE.md - giá trị dev lọt production).
// Giữ tệp là MODULE: thiếu dòng này thì `config` đụng tên với tệp test khác (TS2451).
export {};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../next.config.js');

type Rule = { source: string; destination: string };

test('nút đồng ý (beforeFiles) đứng trước luật /oidc/:path* (afterFiles)', async () => {
  const r = (await config.rewrites()) as { beforeFiles: Rule[]; afterFiles: Rule[] };
  expect(r.beforeFiles).toContainEqual({
    source: '/oidc/interaction/:uid/confirm',
    destination: '/api/oidc-consent?uid=:uid',
  });
  expect(r.afterFiles.some((x) => x.source.startsWith('/oidc/'))).toBe(true);
});

// afterFiles chạy TRƯỚC route động, nên luật /oidc phải tự chừa trang `/oidc/interaction/[uid]`.
// Thiếu ⇒ trang đăng nhập/đồng ý 404 và mọi client OIDC tắc (17/11/2026). Đo bằng CHÍNH bộ so
// khớp + thay đích của Next, không bằng regex tự viết.
test('/oidc/interaction/<uid> tới TRANG, mọi đường /oidc khác tới proxy', async () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { getPathMatch } = require('next/dist/shared/lib/router/utils/path-match');
  const { prepareDestination } = require('next/dist/shared/lib/router/utils/prepare-destination');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const r = (await config.rewrites()) as { afterFiles: Rule[] };
  const rule = r.afterFiles.find((x) => x.source.startsWith('/oidc/'))!;
  const match = getPathMatch(rule.source, { removeUnnamedParams: true, strict: true });
  const dest = (p: string) => {
    const params = match(p);
    if (!params) return null;
    return prepareDestination({
      appendParamsToQuery: false,
      destination: rule.destination,
      params,
      query: {},
    }).parsedDestination.pathname;
  };
  expect(dest('/oidc/interaction/AbC_123-x')).toBeNull();
  expect(dest('/oidc/interaction/AbC_123-x/')).toBeNull();
  expect(dest('/oidc/auth')).toBe('/api/oidc/auth');
  expect(dest('/oidc/auth/AbC_123')).toBe('/api/oidc/auth/AbC_123');
  expect(dest('/oidc/token')).toBe('/api/oidc/token');
  expect(dest('/oidc/.well-known/openid-configuration')).toBe(
    '/api/oidc/.well-known/openid-configuration'
  );
  expect(dest('/oidc/session/end')).toBe('/api/oidc/session/end');
});

test('không rewrite nào trỏ ra URL tuyệt đối', async () => {
  const r = (await config.rewrites()) as Record<string, Rule[]>;
  for (const rule of Object.values(r).flat()) expect(rule.destination).not.toMatch(/^https?:/);
});

test('proxy /oidc gửi X-Forwarded-Host cố định của tsudev.com (không lấy từ request)', () => {
  // Thiếu header này, discovery công bố endpoint ở tên miền Render và trang đồng ý mở sai host (phiếu 20261117-SD1).
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'pages', 'api', 'oidc', '[...path].ts'),
    'utf8'
  );
  expect(src).toMatch(/'x-forwarded-host':\s*ISSUER_HOST/);
  expect(src).toMatch(/const ISSUER_HOST = new URL\(MAIN_URL\)\.host/);
  expect(src).not.toMatch(/'x-forwarded-host'[^\n]*req\.headers/);
});
