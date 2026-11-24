#!/usr/bin/env node
'use strict';
// Ngân sách JS tải ban đầu của web (.standards LANGUAGE_SELECTION.md mục 5.1):
// mỗi trang ≤ 170 KB gzip JavaScript tải ngay khi mở (vượt ⇒ CI đỏ).
//
// Đọc `apps/frontend-main/.next/build-manifest.json` SAU `next build` (Pages
// Router): JS ban đầu của một trang = chunk của `/_app` + chunk của chính trang,
// đếm mỗi tệp MỘT lần. `polyfillFiles` (nomodule) bị trừ - trình duyệt hiện đại
// không tải chúng. Chunk nạp lười (`dynamic()`/`import()`) không nằm trong
// manifest này nên không bị tính: đó là đúng ý ngân sách "tải ban đầu".
//
//   node scripts/ngan-sach-js.js            # in bảng + chặn nếu vượt
//   NGAN_SACH_KB=200 node scripts/...       # thử ngưỡng khác (đừng nới trong CI)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const NEXT_DIR = path.join(__dirname, '..', 'apps', 'frontend-main', '.next');
const LIMIT_KB = Number(process.env.NGAN_SACH_KB || 170);

const manifestPath = path.join(NEXT_DIR, 'build-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`[ngan-sach-js] Không thấy ${manifestPath} - chạy \`next build\` trước.`);
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const polyfills = new Set(manifest.polyfillFiles || []);
const gzCache = new Map();

function gzipBytes(file) {
  if (!gzCache.has(file)) {
    const buf = fs.readFileSync(path.join(NEXT_DIR, file));
    gzCache.set(file, zlib.gzipSync(buf, { level: 9 }).length);
  }
  return gzCache.get(file);
}

const jsOf = (route) =>
  (manifest.pages[route] || []).filter((f) => f.endsWith('.js') && !polyfills.has(f));
const appFiles = jsOf('/_app');

const rows = Object.keys(manifest.pages)
  .filter((r) => r !== '/_app' && r !== '/_error' && r !== '/_document')
  .map((route) => {
    const files = new Set([...appFiles, ...jsOf(route)]);
    let bytes = 0;
    for (const f of files) bytes += gzipBytes(f);
    return { route, kb: bytes / 1024 };
  })
  .sort((a, b) => b.kb - a.kb);

if (rows.length === 0) {
  console.error('[ngan-sach-js] build-manifest không có trang nào - bản dựng hỏng?');
  process.exit(2);
}

const over = rows.filter((r) => r.kb > LIMIT_KB);
console.log(`JS tải ban đầu (gzip), ngưỡng ${LIMIT_KB} KB - ${rows.length} trang, nặng nhất:`);
for (const r of rows.slice(0, 8)) {
  console.log(`  ${r.kb > LIMIT_KB ? '✗' : '✓'} ${r.kb.toFixed(1).padStart(6)} KB  ${r.route}`);
}
if (over.length) {
  console.error(
    `\n[ngan-sach-js] ${over.length} trang vượt ngân sách: ${over.map((r) => r.route).join(', ')}`
  );
  console.error('Tách phần nặng bằng dynamic() hoặc gỡ thư viện; ĐỪNG nới ngưỡng trong CI.');
  process.exit(1);
}
