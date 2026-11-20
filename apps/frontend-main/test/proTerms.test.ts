import { readFileSync } from 'fs';
import { join } from 'path';
import { PLAN_PRICE, webTerms } from '../lib/pay';

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
