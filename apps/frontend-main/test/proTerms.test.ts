import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { PLAN_PRICE, PRO_CONSENT, PRO_POSITIONING, webTerms } from '../lib/pay';

/**
 * PRO2: điều khoản trên /pro phải là NGUYÊN VĂN PRODUCT_POLICY 7.5 của bộ quy ước đang ghim
 * (`.standards/`, v4.0.0), và /pro chỉ bán gói 1 năm (7.2). Bộ quy ước đổi câu chữ mà web
 * không đổi theo thì không gì đỏ - ngoài test này.
 */
const POLICY = readFileSync(
  join(__dirname, '..', '..', '..', '.standards', 'docs', 'PRODUCT_POLICY.md'),
  'utf8'
);

/** Lấy câu (vi) trong ngoặc kép sau "nguyên văn (vi):", gộp xuống dòng thành dấu cách. */
function policyTermsVi(): string {
  const m = POLICY.match(/nguyên văn \(vi\): "([^"]+)"/);
  if (!m) throw new Error('không thấy câu điều khoản (vi) ở PRODUCT_POLICY 7.5');
  return m[1]!.replace(/\s*\n\s*/g, ' ');
}

describe('/pro - điều khoản và gói (PRODUCT_POLICY 7.2, 7.5)', () => {
  it('webTerms() = nguyên văn 7.5 với {giá} = 490.000 ₫', () => {
    expect(webTerms(PLAN_PRICE.pro_year)).toBe(policyTermsVi().replace('{giá}', '490.000 ₫'));
  });

  it('giá 1 năm = 490.000 ₫ như 7.2', () => {
    expect(PLAN_PRICE.pro_year).toBe(490_000);
    expect(POLICY).toContain('kỳ 1 năm: 490.000 ₫');
  });

  it('trang /pro chỉ mua gói năm - không còn pro_month', () => {
    const src = readFileSync(join(__dirname, '..', 'pages', 'pro.tsx'), 'utf8');
    expect(src).not.toMatch(/pro_month/);
    expect(src).not.toMatch(/\/tháng/);
    expect(src).toContain("const PLAN: PlanKind = 'pro_year'");
  });
});

/**
 * PRO3 (PRODUCT_POLICY 3.7.3, v6.1.0): câu định vị + ô xác nhận NGUYÊN VĂN, ô KHÔNG chọn sẵn,
 * nút mua vô hiệu tới khi đánh dấu; trang pháp lý gọi Pro là gói dịch vụ không bắt buộc;
 * không chữ "phi lợi nhuận/non-profit" ở nội dung công khai (3.7.4).
 */
function policyQuoteVi(after: string): string {
  const i = POLICY.indexOf(after);
  if (i < 0) throw new Error(`không thấy "${after}" ở PRODUCT_POLICY 3.7.3`);
  const m = POLICY.slice(i).match(/- vi: "([^"]+)"/);
  if (!m) throw new Error(`không thấy câu vi sau "${after}"`);
  return m[1]!.replace(/\s*\n\s*/g, ' ');
}

describe('/pro - gói tự nguyện ủng hộ tác giả (PRODUCT_POLICY 3.7)', () => {
  const FE = join(__dirname, '..');
  const src = (p: string) => readFileSync(join(FE, p), 'utf8');

  it('câu định vị và ô xác nhận = nguyên văn 3.7.3', () => {
    expect(PRO_POSITIONING).toBe(policyQuoteVi('**Câu định vị**'));
    expect(PRO_CONSENT).toBe(policyQuoteVi('**Ô xác nhận**'));
  });

  it('ô xác nhận không chọn sẵn và khoá cả hai nút mua', () => {
    const pro = src('pages/pro.tsx');
    expect(pro).toContain('useState(false)');
    expect(pro).toMatch(/disabled=\{!agreed \|\| busy !== null\}/);
    expect(pro).toMatch(/agreed \? \(\s*<Button as="a" href=\{loginHref\(here\)\}>/);
    expect(pro).toContain('{PRO_POSITIONING}');
    expect(pro).toContain('{PRO_CONSENT}');
    expect(pro).toContain('href="/chinh-sach-thanh-toan"');
  });

  it('thứ tự trước nút mua: định vị → quyền lợi → điều khoản → ô xác nhận', () => {
    const pro = src('pages/pro.tsx');
    const order = [
      '{PRO_POSITIONING}',
      'aria-label="Quyền lợi Pro"',
      'webTerms(',
      '{PRO_CONSENT}',
      'buy(PLAN)',
    ].map((k) => pro.lastIndexOf(k));
    expect(order.every((v) => v > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('/terms và /chinh-sach-thanh-toan gọi Pro là gói dịch vụ không bắt buộc', () => {
    expect(src('pages/terms.tsx')).toMatch(/gói dịch vụ trả phí không bắt buộc/);
    expect(src('pages/chinh-sach-thanh-toan.tsx')).toMatch(
      /gói dịch vụ trả phí(\{' '\}|\s)*<strong>không bắt buộc/
    );
    expect(src('pages/terms.tsx')).toContain('không được dùng tên &quot;TsuDEV Pro&quot;');
  });

  it('không chữ "phi lợi nhuận/non-profit/từ thiện/tax-deductible" ở trang công khai', () => {
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = join(d, f);
        return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|json|md)$/.test(f) ? [p] : [];
      });
    const ROOT = join(FE, '..', '..');
    const files = [
      ...walk(join(FE, 'pages')),
      ...walk(join(FE, 'components')),
      ...walk(join(FE, 'data')),
      ...walk(join(ROOT, 'packages', 'ui', 'src')),
      join(ROOT, 'README.md'),
    ];
    const BANNED = /phi lợi nhuận|non-?profit|quỹ từ thiện|tax-deductible|khấu trừ thuế/i;
    expect(files.filter((f) => BANNED.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
});
