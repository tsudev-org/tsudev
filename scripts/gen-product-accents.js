#!/usr/bin/env node
'use strict';
/**
 * Sinh `packages/ui/src/lib/productAccents.generated.ts` từ `.standards/tokens/products/*.json`
 * (tsudev-standards v5.0.0, DESIGN_SYSTEM.md mục 1.2): màu `primary` của TỪNG sản phẩm ở hai
 * chế độ, để thẻ /apps tô viền điểm nhấn theo sản phẩm (phiếu 20261121-STD50, mục MAY).
 *
 *   npm run products:gen            # ghi lại tệp sinh
 *   npm run products:gen -- --check # chỉ kiểm tệp sinh khớp .standards (exit 1 nếu lệch) - chạy trong tokens:check
 *
 * Vì sao tệp sinh ĐÃ COMMIT chứ không import thẳng JSON: `packages/ui` dựng bằng tsc với
 * rootDir riêng và image Docker của backend không COPY `.standards/` vào chỗ packages/ui
 * đọc được; bản chụp + cổng --check là đúng khuôn `pkgCatalog.generated.ts`. Lệch nguồn thì
 * CI đỏ, không trôi im lặng như bản sao token v1.0.0 từng trôi (CLAUDE.md, QU-STD-1).
 *
 * Chỉ lấy `primary`: viền/điểm nhấn là trang trí (không mang chữ) nên không cần cặp tương
 * phản, và `primary` đã được cổng của bộ quy ước đo trên nền chuẩn của cả hai chế độ.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, '.standards', 'tokens', 'products');
const OUT = path.join(ROOT, 'packages', 'ui', 'src', 'lib', 'productAccents.generated.ts');
const HEX = /^#[0-9A-Fa-f]{6}$/;

function build() {
  const files = fs
    .readdirSync(SRC)
    .filter((f) => f.endsWith('.json') && f !== 'product.schema.json')
    .sort();
  const rows = [];
  for (const f of files) {
    const p = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
    const light = p.colors?.light?.primary;
    const dark = p.colors?.dark?.primary;
    if (!/^[a-z][a-z0-9]*$/.test(p.id || '')) throw new Error(`${f}: id không hợp lệ: ${p.id}`);
    if (!HEX.test(light || '') || !HEX.test(dark || ''))
      throw new Error(`${f}: thiếu colors.light/dark.primary dạng #RRGGBB`);
    rows.push(`  ${p.id}: { light: '${light}', dark: '${dark}' },`);
  }
  return [
    '// SINH TỰ ĐỘNG bởi scripts/gen-product-accents.js - ĐỪNG SỬA TAY. Cập nhật: `npm run products:gen`.',
    '// Nguồn: .standards/tokens/products/*.json (màu `primary` của từng sản phẩm, hai chế độ).',
    '/* eslint-disable */',
    'export const PRODUCT_PRIMARY: Readonly<Record<string, { light: string; dark: string }>> = {',
    ...rows,
    '};',
    '',
  ].join('\n');
}

const next = build();
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== next) {
    console.error(
      'products: productAccents.generated.ts lệch .standards/tokens/products - chạy `npm run products:gen`.'
    );
    process.exit(1);
  }
  console.log('products: productAccents.generated.ts khớp .standards.');
} else {
  fs.writeFileSync(OUT, next);
  console.log(`products: đã ghi ${path.relative(ROOT, OUT)}`);
}
