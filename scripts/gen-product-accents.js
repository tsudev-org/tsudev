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
 *
 * Tệp sinh thứ hai - `packages/ui/src/lib/proThemes.generated.ts` (PRO3 (c), Q2): id, tên và màu
 * mẫu của các chủ đề Pro trong `.standards/tokens/pro-themes.json` (DESIGN_SYSTEM.md mục 1.3).
 * CSS của chủ đề thì nạp THẲNG `.standards/tokens/pro-themes.css` (globals.css), không chép.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, '.standards', 'tokens', 'products');
const OUT = path.join(ROOT, 'packages', 'ui', 'src', 'lib', 'productAccents.generated.ts');
const PRO_SRC = path.join(ROOT, '.standards', 'tokens', 'pro-themes.json');
const OUT_PRO = path.join(ROOT, 'packages', 'ui', 'src', 'lib', 'proThemes.generated.ts');
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

function buildPro() {
  const { themes } = JSON.parse(fs.readFileSync(PRO_SRC, 'utf8'));
  const rows = [];
  for (const t of themes) {
    if (!/^[a-z][a-z0-9-]*$/.test(t.id || ''))
      throw new Error(`pro-themes: id không hợp lệ: ${t.id}`);
    const c = (m, r) => {
      const v = t.colors?.[m]?.[r];
      if (!HEX.test(v || '')) throw new Error(`pro-themes ${t.id}: thiếu colors.${m}.${r}`);
      return v;
    };
    rows.push(
      `  { id: '${t.id}', label: ${JSON.stringify(t.name.vi)}, ` +
        `light: '${c('light', 'primary')}', dark: '${c('dark', 'primary')}', ` +
        `ring: { light: ['${c('light', 'pro-ring-start')}', '${c('light', 'pro-ring-end')}'], ` +
        `dark: ['${c('dark', 'pro-ring-start')}', '${c('dark', 'pro-ring-end')}'] } },`
    );
  }
  return [
    '// SINH TỰ ĐỘNG bởi scripts/gen-product-accents.js - ĐỪNG SỬA TAY. Cập nhật: `npm run products:gen`.',
    '// Nguồn: .standards/tokens/pro-themes.json (chủ đề Pro Q2, DESIGN_SYSTEM.md mục 1.3).',
    '/* eslint-disable */',
    '// prettier-ignore',
    'export const PRO_THEME_DATA = [',
    ...rows,
    '] as const;',
    '',
  ].join('\n');
}

const outputs = [
  [OUT, build()],
  [OUT_PRO, buildPro()],
];
if (process.argv.includes('--check')) {
  let bad = false;
  for (const [file, next] of outputs) {
    const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (cur !== next) {
      bad = true;
      console.error(
        `products: ${path.basename(file)} lệch .standards/tokens - chạy \`npm run products:gen\`.`
      );
    }
  }
  if (bad) process.exit(1);
  console.log('products: productAccents.generated.ts + proThemes.generated.ts khớp .standards.');
} else {
  for (const [file, next] of outputs) {
    fs.writeFileSync(file, next);
    console.log(`products: đã ghi ${path.relative(ROOT, file)}`);
  }
}
