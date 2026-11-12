#!/usr/bin/env node
'use strict';
/**
 * Chụp `https://pkg.tsudev.com/catalog.json` (kho APT/RPM của tsudev-org/linux-packages)
 * thành `packages/ui/src/lib/pkgCatalog.generated.ts`.
 *
 *   npm run pkg:catalog            # tải + kiểm + ghi bản chụp
 *   npm run pkg:catalog -- --check # chỉ báo bản chụp có lệch kho không (exit 1 nếu lệch)
 *
 * Vì sao BẢN CHỤP đã commit chứ không tải lúc chạy: trang /apps là trang tĩnh (không
 * gọi backend), R2 của kho chưa bật CORS nên trình duyệt không tải được, và bản dựng
 * không được phụ thuộc mạng (phiếu 20261113-02 của linux-packages). Trước bản chụp này
 * trường `pkg` được GÕ TAY trong ecosystem.ts - đúng kiểu chép tay đã để tên cũ
 * "TrafficMonitor-VN" sống trên site nhiều ngày sau khi app đổi tên.
 *
 * Kiểm trước khi ghi (sai một điều là DỪNG, không ghi):
 *   - `schema === 1` (hợp đồng của kho: đổi/bỏ trường thì tăng schema);
 *   - vân tay khoá ký khớp giá trị CỨNG dưới đây - không tin vân tay tải về;
 *   - tên gói `^[a-z][a-z0-9-]+$`, `homepage` là https://*.tsudev.com.
 */

const fs = require('fs');
const path = require('path');

const URL = 'https://pkg.tsudev.com/catalog.json';
// PHẢI khớp PKG_REPO.fingerprint ở packages/ui/src/lib/ecosystem.ts và keys/ của
// tsudev-org/linux-packages (test ecosystem.test.ts canh cả hai).
const FINGERPRINT = '388310F47FA8224D76C0A9C79745B6AF3EA33C74';
const OUT = path.join(__dirname, '..', 'packages', 'ui', 'src', 'lib', 'pkgCatalog.generated.ts');

function fail(msg) {
  console.error(`pkg-catalog: ${msg}`);
  process.exit(1);
}

function render(cat) {
  const packages = cat.packages
    .map((p) => ({
      name: p.name,
      version: p.version,
      arch: [...p.arch].sort(),
      homepage: p.homepage,
      displayName: p.displayName,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const body = JSON.stringify(
    { schema: cat.schema, updated: cat.updated, fingerprint: cat.key.fingerprint, packages },
    null,
    2
  );
  return `// SINH TỰ ĐỘNG bởi scripts/pkg-catalog-sync.js từ ${URL} - ĐỪNG SỬA TAY.
// Cập nhật: \`npm run pkg:catalog\`. Chỉ gồm gói ĐÃ có trong kho (PACKAGING.md mục 8).
/* eslint-disable */
export const PKG_CATALOG = ${body} as const;
`;
}

async function main() {
  const res = await fetch(URL, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) fail(`${URL} trả ${res.status}`);
  const cat = await res.json();
  if (cat.schema !== 1)
    fail(`schema ${cat.schema} - script chỉ hiểu schema 1, đọc phiếu của linux-packages`);
  if (cat.key?.fingerprint !== FINGERPRINT)
    fail(`vân tay khoá ${cat.key?.fingerprint} KHÁC giá trị cứng ${FINGERPRINT} - dừng`);
  if (!Array.isArray(cat.packages)) fail('thiếu mảng packages');
  for (const p of cat.packages) {
    if (!/^[a-z][a-z0-9-]+$/.test(p.name || '')) fail(`tên gói không hợp lệ: ${p.name}`);
    if (!/^https:\/\/[a-z0-9-]+\.tsudev\.com\/?$/.test(p.homepage || ''))
      fail(`${p.name}: homepage ${p.homepage} không phải https://*.tsudev.com`);
    if (!Array.isArray(p.arch) || p.arch.length === 0) fail(`${p.name}: thiếu arch`);
  }

  // Định dạng bằng prettier của repo để tệp sinh ra khớp `format:check` và `--check` ổn định.
  const prettier = require('prettier');
  const next = await prettier.format(render(cat), {
    ...(await prettier.resolveConfig(OUT)),
    filepath: OUT,
  });
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  // So phần gói, bỏ qua dấu thời gian `updated` (kho xuất bản lại mỗi giờ dù không đổi gói).
  const strip = (s) => s.replace(/"updated": "[^"]*"/, '');
  if (process.argv.includes('--check')) {
    if (strip(cur) !== strip(next)) fail('bản chụp LỆCH kho - chạy `npm run pkg:catalog`');
    console.log(`pkg-catalog: khớp kho (${cat.packages.length} gói).`);
    return;
  }
  if (strip(cur) === strip(next)) {
    console.log(`pkg-catalog: không đổi (${cat.packages.length} gói).`);
    return;
  }
  fs.writeFileSync(OUT, next);
  console.log(
    `pkg-catalog: đã ghi ${path.relative(process.cwd(), OUT)} - ${cat.packages.map((p) => p.name).join(', ')}`
  );
}

main().catch((e) => fail(e.message));
