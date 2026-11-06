#!/usr/bin/env node
// Kiểm kiểu toàn repo bằng TypeScript 7 (trình biên dịch viết lại bằng Go), CHỈ
// kiểm - không phát sinh mã.
//
// Vì sao chạy SONG SONG với TypeScript 5.9 thay vì thay hẳn: TS 7 không còn API
// JavaScript cổ điển (`ts.createProgram`, `ts.transpileModule`... đều undefined,
// chỉ có `typescript/unstable/*`), mà ba thứ trong repo sống bằng API đó: Next.js
// (kiểm kiểu lúc build), ts-jest, typescript-eslint (peer `typescript <6.1`).
// Nên `typescript` vẫn là 5.9 cho build/test/lint, còn TS 7 chỉ chạy ở đây.
//
// TS 7 KHÔNG nằm trong package.json: thử cài dạng alias (`typescript-7@npm:
// typescript@7`) thì npm trỏ `node_modules/.bin/tsc` sang TS 7 - hai gói cùng
// khai bin `tsc` - và `build:services` lặng lẽ phát sinh mã bằng TS 7 (đã đo
// 07/11/2026). Lấy qua `npx` ghim đúng phiên bản: nó nằm trong bộ đệm của npx,
// không bao giờ chạm `.bin` của repo.
//
// Cổng này giữ cho cấu hình KHÔNG trôi về dạng TS 7 đã gỡ - `moduleResolution:
// "node"`, dựa vào `types` tự nạp... - để ngày đổi hẳn sang 7 chỉ còn là đổi
// phiên bản. Nó nhanh: ~12s cho 13 project, so với ~30s của `npm run typecheck`.
'use strict';

const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// Nâng TS 7: đổi số này (Dependabot không thấy nó).
const TS7_VERSION = '7.0.2';

// Khẳng định trước: lệnh `tsc` của repo vẫn là TS 5 - bắt lại đúng tai nạn ở
// trên nếu ai đó thêm TS 7 vào package.json.
const tsc5 = execFileSync(path.join(ROOT, 'node_modules', '.bin', 'tsc'), ['-v'], {
  encoding: 'utf8',
}).trim();
if (!/^Version 5\./.test(tsc5)) {
  console.error(`✗ node_modules/.bin/tsc phải là TypeScript 5, đang là: ${tsc5}`);
  process.exit(1);
}

// Lấy từ `references` của tsconfig gốc (đọc bằng TS 5 - tệp có chú thích nên
// JSON.parse không đọc được), cộng hai project kiểm kiểu nằm ngoài `tsc -b`.
// Viết tay danh sách thì package mới sẽ lọt khỏi cổng mà không gì báo.
const ts5 = require('typescript');
const rootCfg = ts5.parseConfigFileTextToJson(
  'tsconfig.json',
  require('fs').readFileSync(path.join(ROOT, 'tsconfig.json'), 'utf8')
).config;
const PROJECTS = [
  ...rootCfg.references.map((r) => r.path.replace(/^\.\//, '').replace(/\/tsconfig\.json$/, '')),
  'apps/frontend-main',
  'infrastructure/canh-site-cron',
];

const TS7 = execFileSync(
  'npx',
  ['--yes', '--package', `typescript@${TS7_VERSION}`, '-c', 'command -v tsc'],
  { cwd: ROOT, encoding: 'utf8' }
).trim();

let failed = 0;
for (const p of PROJECTS) {
  const r = spawnSync(TS7, ['--noEmit', '-p', path.join(p, 'tsconfig.json')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    failed++;
    console.error(`✗ ${p}\n${r.stdout}${r.stderr}`);
  }
}

const v7 = execFileSync(TS7, ['-v'], { encoding: 'utf8' }).trim();
if (failed) {
  console.error(`✗ TypeScript 7 (${v7}): ${failed}/${PROJECTS.length} project lỗi`);
  process.exit(1);
}
console.log(`✓ TypeScript 7 (${v7}): ${PROJECTS.length} project sạch; tsc của repo: ${tsc5}`);
