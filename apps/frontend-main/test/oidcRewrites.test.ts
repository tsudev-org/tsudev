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
  expect(r.afterFiles).toContainEqual({ source: '/oidc/:path*', destination: '/api/oidc/:path*' });
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
