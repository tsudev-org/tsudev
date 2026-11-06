// Lượt kiểm toàn vẹn bản phát hành của Worker cron (B4, G5).
//
// Sống ở đây cùng cronContract.test.ts vì Worker không có bộ test riêng. Canh hai
// điều: lượt kiểm CHỈ gắn vào nhịp thưa (route chạm database + R2), và nó không
// bao giờ im lặng - thiếu secret thì log, hỏng hay lệch thì báo động.
import { readFileSync } from 'fs';
import { join } from 'path';
import { dienGiai, goiKiemToanVen } from '../../../infrastructure/canh-site-cron/src/kiemToanVen';

const src = readFileSync(
  join(__dirname, '../../../infrastructure/canh-site-cron/src/index.ts'),
  'utf8'
);

const bc = (o: Partial<Record<string, unknown>> = {}) => ({
  checked: 2,
  khop: 2,
  lech: [],
  loi: [],
  conLai: 0,
  quetLai: 0,
  phatHien: [],
  ...o,
});

describe('Worker cron - kiểm toàn vẹn', () => {
  test('chỉ chạy trong nhánh CRON_DEM_NOI_DUNG, không ở nhịp giữ ấm', () => {
    const nhanh = src.match(/event\.cron === CRON_DEM_NOI_DUNG\s*\?([^:]+):\s*keepWarm\(env\)/);
    expect(nhanh?.[1]).toContain('kiemToanVenPhatHanh(env)');
    expect(src.match(/kiemToanVenPhatHanh\(env\)/g)).toHaveLength(1);
  });

  test('thiếu token ⇒ không gọi mạng, log BỎ QUA', async () => {
    const fetchFn = jest.fn();
    const kq = await goiKiemToanVen('https://be.test', {}, fetchFn as unknown as typeof fetch);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(dienGiai(kq).log).toContain('BỎ QUA');
    expect(dienGiai(kq).baoDong).toBeNull();
  });

  test('gửi đủ hai header, đúng đường', async () => {
    const fetchFn = jest.fn(async () => new Response(JSON.stringify(bc()), { status: 200 }));
    await goiKiemToanVen(
      'https://be.test',
      { integrity: 'tk', internal: 'it' },
      fetchFn as unknown as typeof fetch
    );
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://be.test/api/internal/releases/integrity');
    expect(init.headers).toMatchObject({
      'x-release-integrity-token': 'tk',
      'x-internal-token': 'it',
    });
  });

  test('tất cả khớp ⇒ không báo động', async () => {
    const fetchFn = async () => new Response(JSON.stringify(bc()), { status: 200 });
    const kq = await goiKiemToanVen(
      'https://be.test',
      { integrity: 'tk' },
      fetchFn as typeof fetch
    );
    expect(dienGiai(kq).baoDong).toBeNull();
    expect(dienGiai(kq).log).toContain('khớp 2');
  });

  test('có lệch hoặc phát hiện mã độc ⇒ báo động nêu tên bản', async () => {
    const fetchFn = async () =>
      new Response(
        JSON.stringify(
          bc({
            lech: [{ id: 'r1', nhan: 'app 1.0 ANDROID', lyDo: 'sha khác' }],
            phatHien: ['app 2.0'],
          })
        ),
        { status: 200 }
      );
    const kq = await goiKiemToanVen(
      'https://be.test',
      { integrity: 'tk' },
      fetchFn as typeof fetch
    );
    const { baoDong } = dienGiai(kq);
    expect(baoDong).toContain('app 1.0 ANDROID');
    expect(baoDong).toContain('app 2.0');
  });

  test('backend từ chối (401/503) ⇒ báo động, không im lặng', async () => {
    const fetchFn = async () => new Response('{"error":"x"}', { status: 401 });
    const kq = await goiKiemToanVen(
      'https://be.test',
      { integrity: 'tk' },
      fetchFn as typeof fetch
    );
    expect(dienGiai(kq).baoDong).toContain('KHÔNG chạy được');
  });
});
