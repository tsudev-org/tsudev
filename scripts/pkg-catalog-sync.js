#!/usr/bin/env node
'use strict';
/**
 * Chụp `catalog.json` của BA kho gói (APT/RPM `pkg.tsudev.com`, Scoop bucket, Homebrew tap)
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
 *   - (APT/RPM) vân tay khoá ký khớp giá trị CỨNG dưới đây - không tin vân tay tải về;
 *   - tên gói `^[a-z][a-z0-9-]+$`, `homepage` là https://*.tsudev.com.
 */

const fs = require('fs');
const path = require('path');

// Ba kho gói của hệ sinh thái, cùng hợp đồng `catalog.json` schema 1 (trường chung: name,
// version, arch, homepage, install, replacedBy). Mỗi kho có CI từ chối catalog cũ và chỉ
// sinh lại catalog SAU bước cài thử thật - catalog = gói đã cài được.
const SOURCES = {
  pkg: 'https://pkg.tsudev.com/catalog.json',
  scoop: 'https://raw.githubusercontent.com/tsudev-org/scoop-bucket/main/catalog.json',
  brew: 'https://raw.githubusercontent.com/tsudev-org/homebrew-tap/main/catalog.json',
};
// PHẢI khớp PKG_REPO.fingerprint ở packages/ui/src/lib/ecosystem.ts và keys/ của
// tsudev-org/linux-packages (test ecosystem.test.ts canh cả hai).
const FINGERPRINT = '388310F47FA8224D76C0A9C79745B6AF3EA33C74';
const OUT = path.join(__dirname, '..', 'packages', 'ui', 'src', 'lib', 'pkgCatalog.generated.ts');

function fail(msg) {
  console.error(`pkg-catalog: ${msg}`);
  process.exit(1);
}

async function load(kind, url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) fail(`${url} trả ${res.status}`);
  const cat = await res.json();
  if (cat.schema !== 1) fail(`${kind}: schema ${cat.schema} - script chỉ hiểu schema 1`);
  if (kind === 'pkg' && cat.key?.fingerprint !== FINGERPRINT)
    fail(`vân tay khoá ${cat.key?.fingerprint} KHÁC giá trị cứng ${FINGERPRINT} - dừng`);
  if (!Array.isArray(cat.packages)) fail(`${kind}: thiếu mảng packages`);
  for (const p of cat.packages) {
    if (!/^[a-z][a-z0-9-]+$/.test(p.name || '')) fail(`${kind}: tên gói không hợp lệ: ${p.name}`);
    if (!/^https:\/\/[a-z0-9-]+\.tsudev\.com\/?$/.test(p.homepage || ''))
      fail(`${kind}/${p.name}: homepage ${p.homepage} không phải https://*.tsudev.com`);
    if (!Array.isArray(p.arch) || p.arch.length === 0) fail(`${kind}/${p.name}: thiếu arch`);
  }
  // Gói đã đổi tên (`replacedBy`) chỉ là gói chuyển tiếp - website hiện gói MỚI, không tên cũ.
  return cat.packages
    .filter((p) => !p.replacedBy)
    .map((p) => ({
      name: p.name,
      version: p.version,
      arch: [...p.arch].sort(),
      homepage: p.homepage.replace(/\/$/, ''),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  const out = {};
  for (const [kind, url] of Object.entries(SOURCES)) out[kind] = await load(kind, url);
  // KHÔNG ghi dấu thời gian `updated`: các kho xuất bản lại mỗi giờ dù gói không đổi, và
  // bản chụp chỉ được đổi khi GÓI đổi.
  const body = JSON.stringify({ schema: 1, fingerprint: FINGERPRINT, ...out }, null, 2);
  const src = `// SINH TỰ ĐỘNG bởi scripts/pkg-catalog-sync.js - ĐỪNG SỬA TAY. Cập nhật: \`npm run pkg:catalog\`.
// Nguồn: ${Object.values(SOURCES).join(' · ')}
// Chỉ gồm gói ĐÃ cài thử được trong từng kho (PACKAGING.md mục 8); bỏ gói có replacedBy.
/* eslint-disable */
export const PKG_CATALOG = ${body} as const;
`;
  // Định dạng bằng prettier của repo để tệp sinh ra khớp `format:check` và `--check` ổn định.
  const prettier = require('prettier');
  const next = await prettier.format(src, {
    ...(await prettier.resolveConfig(OUT)),
    filepath: OUT,
  });
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const summary = Object.entries(out)
    .map(([k, v]) => `${k}: ${v.map((p) => p.name).join(', ')}`)
    .join(' | ');
  if (process.argv.includes('--check')) {
    if (cur !== next) fail('bản chụp LỆCH kho - chạy `npm run pkg:catalog`');
    console.log(`pkg-catalog: khớp kho (${summary}).`);
    return;
  }
  if (cur === next) {
    console.log(`pkg-catalog: không đổi (${summary}).`);
    return;
  }
  fs.writeFileSync(OUT, next);
  console.log(`pkg-catalog: đã ghi ${path.relative(process.cwd(), OUT)} - ${summary}`);
}

main().catch((e) => fail(e.message));
