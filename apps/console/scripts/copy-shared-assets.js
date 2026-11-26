#!/usr/bin/env node
'use strict';
// Phông tự host + favicon dùng chung với tsudev.com: NGUỒN ở apps/frontend-main/public, chép vào public/ của console
// lúc dựng (đã gitignore) - không giữ hai bản nhị phân trong git, không tải phông từ bên thứ ba (CSP `font-src 'self'`).
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../../frontend-main/public');
const DST = path.resolve(__dirname, '../public');
fs.mkdirSync(path.join(DST, 'fonts'), { recursive: true });
let n = 0;
for (const f of fs.readdirSync(path.join(SRC, 'fonts'))) {
  if (!f.endsWith('.woff2')) continue;
  fs.copyFileSync(path.join(SRC, 'fonts', f), path.join(DST, 'fonts', f));
  n++;
}
for (const f of ['favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png']) {
  fs.copyFileSync(path.join(SRC, f), path.join(DST, f));
  n++;
}
fs.mkdirSync(path.join(DST, 'brand'), { recursive: true });
for (const f of fs.readdirSync(path.join(SRC, 'brand'))) {
  if (!f.startsWith('logo-tsudev-')) continue;
  fs.copyFileSync(path.join(SRC, 'brand', f), path.join(DST, 'brand', f));
  n++;
}
console.log(`[console] đã chép ${n} tệp dùng chung từ frontend-main/public`);
