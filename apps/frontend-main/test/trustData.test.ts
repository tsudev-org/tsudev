// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { readFileSync } from 'fs';
import { join } from 'path';
import trust from '../data/trust.json';
import { ECOSYSTEM_APPS } from '../../../packages/ui/src/lib/ecosystem';

/**
 * Dữ liệu trang /security (phiếu SEC2, mục 0 - chủ dự án chốt 25/11/2026): KHÔNG nhãn trang trí.
 * Mỗi bằng chứng phải có liên kết https tới trang kết quả + ngày đo thật; số đo không được để quá
 * cũ (một điểm A+ đo từ năm ngoái là một lời khẳng định không còn kiểm được).
 */
describe('data/trust.json - bằng chứng tự kiểm chứng được', () => {
  it('mỗi bằng chứng có tên, trạng thái, liên kết https và ngày đo YYYY-MM-DD', () => {
    expect(trust.evidence.length).toBeGreaterThan(0);
    for (const e of trust.evidence) {
      expect(e.name.trim()).not.toBe('');
      expect(e.status.trim()).not.toBe('');
      expect(e.url).toMatch(/^https:\/\//);
      expect(e.measured).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('không có số đo cũ hơn 400 ngày', () => {
    const now = Date.now();
    for (const e of trust.evidence) {
      const days = (now - Date.parse(`${e.measured}T00:00:00Z`)) / 86_400_000;
      expect(days).toBeLessThan(400);
    }
  });

  it('không có chữ trang trí bị cấm', () => {
    const raw = JSON.stringify(trust).toLowerCase();
    for (const bad of ['secured by', '100%', 'an toàn tuyệt đối', 'dmca']) {
      expect(raw).not.toContain(bad);
    }
  });

  it('mục không áp dụng phải có lý do', () => {
    for (const m of trust.notApplicable) expect(m.reason.length).toBeGreaterThan(20);
  });

  it('trang An toàn của sản phẩm trỏ đúng sản phẩm có trong danh bạ, bằng https', () => {
    const ids = new Set(ECOSYSTEM_APPS.map((a) => a.id));
    for (const [id, url] of Object.entries(trust.products)) {
      expect(ids.has(id)).toBe(true);
      expect(url).toMatch(/^https:\/\/[a-z0-9-]+\.tsudev\.com\//);
    }
  });

  it('security.txt trỏ Policy về trang /security, và chân trang có liên kết', () => {
    const txt = readFileSync(join(__dirname, '../public/.well-known/security.txt'), 'utf8');
    expect(txt).toMatch(/^Policy: https:\/\/tsudev\.com\/security$/m);
    const footer = readFileSync(
      join(__dirname, '../../../packages/ui/src/components/SiteFooter.tsx'),
      'utf8'
    );
    expect(footer).toContain("'/security'");
  });
});
