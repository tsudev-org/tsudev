// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

/**
 * Cổng hạn mức Neon của Worker canh site (kế hoạch Q4/2026 §6.7).
 *
 * Test nằm ở đây vì Worker không có bộ test riêng và đây là workspace có jest
 * gần nhất chạy trong CI. Hàm được test là THUẦN - không fetch, không runtime
 * Cloudflare - nên chạy được trên Node.
 */
import { danhGiaNeon } from '../../../infrastructure/canh-site-cron/src/hanMuc';

const KY = {
  consumption_period_start: '2026-11-01T00:00:00Z',
  consumption_period_end: '2026-12-01T00:00:00Z',
};
const cuGio = (h: number) => ({ ...KY, compute_time_seconds: h * 3600 });

describe('danhGiaNeon', () => {
  test('tiêu ít, nhịp thấp ⇒ không cảnh báo', () => {
    const dg = danhGiaNeon(cuGio(5), 100, new Date('2026-11-15T00:00:00Z'));
    expect(dg.cuGio).toBe(5);
    expect(dg.canhBao).toEqual([]);
  });

  test('đã tiêu ≥ 80% ⇒ cảnh báo ĐÃ TIÊU', () => {
    const dg = danhGiaNeon(cuGio(85), 100, new Date('2026-11-29T00:00:00Z'));
    expect(dg.canhBao.join(' ')).toMatch(/ĐÃ TIÊU 85\.0\/100/);
  });

  // Đúng hình dạng sự cố tháng 10: Neon không bao giờ ngủ ⇒ ~0,25 CU × 24 giờ
  // = 6 CU-giờ/ngày. Tới ngày 10 mới tiêu 54/100 - chưa tới 80% - nhưng đang
  // trên đường tới ~180. Đây là lúc cổng phải kêu, không phải ngày 17.
  test('mới tiêu 54% nhưng tốc độ vỡ hạn mức ⇒ cảnh báo DỰ BÁO', () => {
    const dg = danhGiaNeon(cuGio(54), 100, new Date('2026-11-10T00:00:00Z'));
    expect(dg.phanTram).toBeLessThan(0.8);
    expect(dg.duBaoCuoiKy).toBeCloseTo(180, 0);
    expect(dg.canhBao.join(' ')).toMatch(/DỰ BÁO/);
  });

  test('chưa đủ một ngày dữ liệu ⇒ không dự báo (tránh báo động oan đầu kỳ)', () => {
    const dg = danhGiaNeon(cuGio(2), 100, new Date('2026-11-01T06:00:00Z'));
    expect(dg.duBaoCuoiKy).toBeNull();
    expect(dg.canhBao).toEqual([]);
  });

  test('API thiếu trường ⇒ coi như 0, không ném', () => {
    const dg = danhGiaNeon({}, 100, new Date());
    expect(dg.cuGio).toBe(0);
    expect(dg.duBaoCuoiKy).toBeNull();
  });
});
