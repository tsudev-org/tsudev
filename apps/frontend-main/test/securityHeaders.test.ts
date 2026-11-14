// P1.8: header bảo mật đặt ở next.config.js `headers()`. Test quét CẤU HÌNH chứ
// không gọi HTTP: dev/E2E chạy http://localhost nên không bộ test nào thấy được
// header như production (CLAUDE.md, bài học "lỗi chỉ tồn tại trên HTTPS").
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../next.config.js');

type Header = { key: string; value: string };

const headersFor = async (): Promise<Record<string, string>> => {
  const rules = (await config.headers()) as { source: string; headers: Header[] }[];
  const all = rules.find((r) => r.source === '/:path*');
  if (!all) throw new Error('thiếu luật header cho /:path*');
  return Object.fromEntries(all.headers.map((h) => [h.key.toLowerCase(), h.value]));
};

test('đủ bộ header bảo mật cho mọi đường dẫn', async () => {
  const h = await headersFor();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['cross-origin-opener-policy']).toBe('same-origin');
  expect(h['cross-origin-resource-policy']).toBe('same-site');
  expect(h['strict-transport-security']).toMatch(/max-age=(\d+); includeSubDomains; preload/);
  const maxAge = Number(/max-age=(\d+)/.exec(h['strict-transport-security'] ?? '')?.[1]);
  // preload đòi tối thiểu 1 năm (hstspreload.org).
  expect(maxAge).toBeGreaterThanOrEqual(31536000);
});

test('Permissions-Policy tắt camera, micro, vị trí, thanh toán, USB', async () => {
  const h = await headersFor();
  for (const f of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) {
    expect(h['permissions-policy']).toContain(`${f}=()`);
  }
});
