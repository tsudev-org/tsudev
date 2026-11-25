// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Bản sắc TsuDEV theo tsudev-standards v5.0.0 (phiếu 20261121-STD50, PR 2): bố cục `cong`, hoạ
 * tiết `quang-sang`, dải màu sản phẩm ở thẻ /apps.
 *
 * Canh bằng quét NGUỒN: hoạ tiết hay bố cục trôi khỏi chuẩn không làm test hành vi nào đỏ - trang
 * vẫn 200, chỉ là "nhìn khác". Các điều kiện ở đây là ràng buộc CỨNG của DESIGN_SYSTEM.md mục 1.2.
 */
const ROOT = join(__dirname, '..');
const REPO = join(ROOT, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const product = JSON.parse(
  readFileSync(join(REPO, '.standards/tokens/products/tsudev.json'), 'utf8')
) as { layout: string; motif: string };

/** Thân một luật CSS (khối đầu tiên khớp bộ chọn chính xác). */
function rule(css: string, selector: string): string {
  const i = css.indexOf(`${selector} {`);
  if (i < 0) throw new Error(`thiếu luật ${selector}`);
  return css.slice(i, css.indexOf('}', i));
}

describe('bản sắc tsudev - bố cục cong + hoạ tiết quang-sang', () => {
  const css = read('styles/globals.css');
  const home = read('pages/index.tsx');

  it('tsudev.json vẫn khai cong + quang-sang (đổi ở bộ quy ước ⇒ phải dựng lại trang chủ)', () => {
    expect(product.layout).toBe('cong');
    expect(product.motif).toBe('quang-sang');
  });

  // 25/11/2026: chủ dự án dời lưới thẻ danh mục từ trang chủ sang ĐẦU /apps (trang chủ gọn).
  // Lệch bố cục `cong` của bộ quy ước - đề xuất đẩy ngược ở phiếu 20261125-UX2.
  it('hero trang chủ nằm trên hoạ tiết quang-sang, không hiệu ứng ẩn, rồi tới thẳng sản phẩm', () => {
    expect(home).toMatch(/data-layout="cong"/);
    expect(home).toMatch(/className="tsu-quang-sang"/);
    const hero = home.indexOf('data-layout="cong"');
    const products = home.indexOf('id="he-sinh-thai"');
    expect(hero).toBeGreaterThan(0);
    expect(products).toBeGreaterThan(hero);
    // Khối màn đầu không được bắt đầu ở opacity 0 (nháy mỗi lần tải trang).
    expect(home.slice(hero, home.indexOf('</section>', hero))).not.toMatch(/animate-fade|reveal/);
  });

  it('lưới danh mục nằm ở đầu /apps, nhiều cột ở màn rộng, thẻ nhóm là nút lọc', () => {
    const apps = read('pages/apps.tsx');
    expect(apps.indexOf('<CategoryTiles')).toBeGreaterThan(0);
    expect(apps.indexOf('<CategoryTiles')).toBeLessThan(apps.indexOf('role="search"'));
    const tiles = read('components/CategoryTiles.tsx');
    expect(tiles).toMatch(/lg:grid-cols-[4-9]/);
    expect(tiles).toMatch(/aria-pressed=\{on\}/);
    // Hàng chip nhóm trong thanh lọc đã gỡ (trùng chức năng với thẻ nhóm).
    expect(apps).not.toMatch(/CATEGORIES\.map/);
  });

  it('quang-sang vẽ bằng glow/accent của sản phẩm, phủ ≤ 15%, TĨNH', () => {
    const body = rule(css, '.tsu-quang-sang') + rule(css, '.tsu-quang-sang::after');
    expect(body).toMatch(/var\(--glow\)/);
    expect(body).toMatch(/var\(--accent\)/);
    // Không mã màu cứng: màu chỉ đến từ token của sản phẩm (#000 của mask chỉ là kênh alpha).
    const paint = body.replace(/^\s*(-webkit-)?mask-image:.*$/gm, '');
    expect(paint).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    for (const m of body.matchAll(/color-mix\(in srgb, var\(--accent\) (\d+)%/g))
      expect(Number(m[1])).toBeLessThanOrEqual(15);
    expect(body).not.toMatch(/animation|transition/);
  });

  it('og-image sinh từ tsudev.json, cùng hoạ tiết, trần 15%', () => {
    const src = readFileSync(join(REPO, 'packages/brand/build-assets.js'), 'utf8');
    expect(src).toMatch(/tokens', 'products', 'tsudev\.json'/);
    expect(src).toMatch(/motif !== 'quang-sang'/);
    expect(src).toMatch(/Math\.min\(Number\(m\[4\]\), 0\.15\)/);
  });

  // 25/11/2026: dải màu 3px trên đầu thẻ đã gỡ (chủ dự án) - màu sản phẩm chỉ còn ở viền khi rê.
  it('thẻ /apps mang màu sản phẩm theo chế độ ở viền khi rê, không dải trên đầu thẻ', () => {
    expect(css).not.toMatch(/\.tsu-sp-accent::before/);
    expect(css).toMatch(/\.tsu-sp-accent:hover,\s*\.tsu-sp-accent:focus-within \{[^}]*var\(--sp\)/);
    expect(rule(css, '.tsu-sp-accent')).toMatch(/--sp: var\(--sp-dark\)/);
    expect(rule(css, "[data-theme='light'] .tsu-sp-accent")).toMatch(/--sp: var\(--sp-light\)/);
    expect(css).not.toMatch(/\.tsu-sp-accent\s*\{[^}]*box-shadow/);
    expect(read('components/EcoAppCard.tsx')).toMatch(/PRODUCT_PRIMARY\[id\]/);
  });
});
