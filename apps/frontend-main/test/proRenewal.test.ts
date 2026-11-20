import { readFileSync } from 'fs';
import { join } from 'path';
import { RENEWAL_TEXT, renewalNotice } from '../lib/proRenewal';

/**
 * PRO2 (phiếu 20261120-PRO2 mục 2.1): băng nhắc 7 ngày cuối trên web. Câu chữ phải NGUYÊN VĂN
 * PRODUCT_POLICY 7.6 của bộ quy ước đang ghim - bên kia đổi mà web không đổi thì chỉ test này đỏ.
 */
const POLICY = readFileSync(
  join(__dirname, '..', '..', '..', '.standards', 'docs', 'PRODUCT_POLICY.md'),
  'utf8'
);
const section = POLICY.slice(POLICY.indexOf('### 7.6.'), POLICY.indexOf('## 8.'));
/** Cột vi của dòng bảng `| <nhãn> | <vi> | <en> |` đầu tiên (khối "Nhắc gia hạn"). */
const vi = (label: string) => {
  const row = section.split('\n').find((l) => l.startsWith(`  | ${label} |`));
  if (!row) throw new Error(`không thấy dòng ${label} ở PRODUCT_POLICY 7.6`);
  return row.split('|')[2]!.trim();
};

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 20, 5, 0, 0); // 12:00 20/11/2026 giờ Việt Nam
const at = (ms: number) => new Date(NOW + ms).toISOString();

describe('nhắc gia hạn Pro trên web (PRODUCT_POLICY 7.6)', () => {
  it('câu chữ nguyên văn 7.6', () => {
    expect(RENEWAL_TEXT.title).toBe(vi('Tiêu đề'));
    expect(RENEWAL_TEXT.body).toBe(vi('Thân'));
    expect(RENEWAL_TEXT.primary).toBe(vi('Nút chính'));
    expect(RENEWAL_TEXT.secondary).toBe(vi('Nút phụ'));
  });

  it('còn 8 ngày ⇒ không nhắc; còn đúng 7 ngày ⇒ nhắc', () => {
    expect(renewalNotice(at(8 * DAY), NOW)).toBeNull();
    expect(renewalNotice(at(7 * DAY + 1), NOW)).toBeNull();
    expect(renewalNotice(at(7 * DAY), NOW)?.days).toBe(7);
  });

  it('{n} làm tròn lên, tối thiểu 1; {ngày} dạng DD/MM/YYYY', () => {
    const n = renewalNotice(at(2 * DAY + 60_000), NOW)!;
    expect(n.days).toBe(3);
    expect(n.body).toContain('hết hạn sau 3 ngày (ngày 22/11/2026)');
    expect(renewalNotice(at(60_000), NOW)?.days).toBe(1);
  });

  it('đã hết hạn, chưa từng Pro, ngày hỏng ⇒ không nhắc', () => {
    expect(renewalNotice(at(0), NOW)).toBeNull();
    expect(renewalNotice(at(-DAY), NOW)).toBeNull();
    expect(renewalNotice(null, NOW)).toBeNull();
    expect(renewalNotice('không phải ngày', NOW)).toBeNull();
  });

  it('gia hạn (pro_until xa hơn) ⇒ thôi nhắc', () => {
    expect(renewalNotice(at(3 * DAY), NOW)).not.toBeNull();
    expect(renewalNotice(at(3 * DAY + 365 * DAY), NOW)).toBeNull();
  });
});
