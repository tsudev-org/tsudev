#!/usr/bin/env node
'use strict';
// CP3 (ADR-0005, .standards CONTROL_PLANE.md mục 3 + 9): bundle CÔNG KHAI của tsudev.com không được mang mã điều
// hành. Mọi thao tác quản trị, Studio, duyệt bài, thanh toán thủ công, quản lý tài khoản đã dời sang
// console.tsudev.com (sau Cloudflare Access). Một import vô tình kéo lại một trang hay một proxy quản trị vào
// apps/frontend-main thì cổng nguồn (consoleSplit.test.ts) có thể không thấy - cổng này đọc ĐẦU RA của bản dựng.
//
// Quét sau `next build` (hay `opennextjs-cloudflare build`):
//   - `.next/static/**/*.js`         - mã gửi xuống trình duyệt
//   - `.next/server/pages/**/*.js`   - trang + route proxy API của chính app (không gồm node_modules)
//
//   node scripts/check-public-bundle.js          # chặn (mã thoát 1) nếu thấy chuỗi cấm
const fs = require('fs');
const path = require('path');

const NEXT_DIR = path.join(__dirname, '..', 'apps', 'frontend-main', '.next');

// Đường gọi backend chỉ trạm điều hành được dùng. `/api/content/` và `/api/storage/` công khai đã gỡ ở CP3.
const FORBIDDEN = [
  /\/api\/admin\b/,
  /\/api\/author\b/,
  /\/api\/internal\b/,
  /\/api\/pipeline\/(?!versions\b)/, // pipeline chỉ có bản kê phiên bản đi qua proxy công khai
  /\buseradmin\b/,
  /\bpayadmin\b/,
  /\/api\/identity\/alias\b/,
  /\/api\/storage\//,
  /\/api\/content\//,
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

if (!fs.existsSync(path.join(NEXT_DIR, 'build-manifest.json'))) {
  console.error(
    `[check-public-bundle] Không thấy bản dựng ở ${NEXT_DIR} - chạy \`next build\` trước.`
  );
  process.exit(2);
}

const files = [
  ...walk(path.join(NEXT_DIR, 'static')),
  ...walk(path.join(NEXT_DIR, 'server', 'pages')),
];
const hits = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const re of FORBIDDEN) {
    const m = re.exec(src);
    if (m) {
      const at = Math.max(0, m.index - 60);
      hits.push(
        `${path.relative(NEXT_DIR, f)}: ${re} ⇒ …${src.slice(at, m.index + 60).replace(/\s+/g, ' ')}…`
      );
    }
  }
}

console.log(`[check-public-bundle] đã quét ${files.length} tệp JS của bản dựng công khai`);
if (files.length === 0) {
  console.error(
    '[check-public-bundle] không có tệp nào để quét - đường bản dựng đổi? Cổng này không được rỗng.'
  );
  process.exit(1);
}
if (hits.length) {
  console.error(
    '[check-public-bundle] bundle công khai mang mã điều hành (CP3 - dời sang apps/console):'
  );
  for (const h of hits) console.error(`  - ${h}`);
  process.exit(1);
}
console.log('[check-public-bundle] sạch: không có đường điều hành nào trong bundle công khai');
