const { test, expect } = require('@playwright/test');
const { loadTopology, publicUrl } = require('../../scripts/topology/load');
const { signIn } = require('./helpers/login');

// Trung tâm an ninh phát hành (docs/security-plan.md §3, B5/B6).
//
// Luồng lệch toàn vẹn THẬT (sửa byte trong kho ⇒ tự gỡ công bố) cần MinIO và
// được canh ở services/content-service/test/releaseSecurity.test.ts (DB thật,
// kho giả). Ở đây canh phần chỉ trình duyệt mới chứng minh được: trang dựng ra
// qua ĐÚNG BFF, và cổng step-up đứng vững khi đi qua proxy (proxy có thể làm rơi
// thân request hay header - test service không thấy được điều đó).

const MAIN = process.env.E2E_MAIN_URL || publicUrl(loadTopology(), 'main');
const THEMES = ['light', 'dark'];

test('OWNER có TOTP mở được trang, thấy bảng kê và kiểm được chuỗi nhật ký', async ({ page }) => {
  await signIn(page, MAIN);
  await page.goto(`${MAIN}/admin/release-security`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'An ninh phát hành' })).toBeVisible();
  await expect(page.locator('button:has-text("Đăng nhập")')).toHaveCount(0);
  await page.click('button:has-text("Kiểm chuỗi")');
  await expect(page.locator('text=/Chuỗi băm nguyên vẹn|ĐỨT CHUỖI/')).toBeVisible();

  // Ảnh nghiệm thu B5: ba chế độ màu + bề ngang điện thoại. Bảng cuộn TRONG thẻ,
  // trang không được cuộn ngang.
  for (const theme of THEMES) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await page.screenshot({ path: `test-results/release-security-${theme}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/release-security-390.png', fullPage: true });
  const tran = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(tran).toBeLessThanOrEqual(0);
});

// Gọi từ CHÍNH trang (fetch cùng origin, mang cookie phiên) - đúng đường mà giao
// diện đi, và không phụ thuộc DNS của tiến trình Node chạy test.
const goi = (page, method, path, body) =>
  page.evaluate(
    async ([m, p, b]) => {
      const r = await fetch(p, {
        method: m,
        headers: { 'Content-Type': 'application/json' },
        body: b ? JSON.stringify(b) : undefined,
      });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    },
    [method, path, body]
  );

test('thu hồi qua BFF mà thiếu step-up ⇒ 401 STEP_UP_REQUIRED', async ({ page }) => {
  await signIn(page, MAIN);
  await page.goto(`${MAIN}/admin/release-security`, { waitUntil: 'networkidle' });
  const res = await goi(page, 'POST', '/api/content/admin/releases/khong-ton-tai/revoke', {
    reason: 'thử cổng step-up từ E2E',
  });
  expect(res.status).toBe(401);
  expect(res.body.code).toBe('STEP_UP_REQUIRED');
});

test('mã TOTP sai không đổi được token step-up', async ({ page }) => {
  await signIn(page, MAIN);
  await page.goto(`${MAIN}/admin/release-security`, { waitUntil: 'networkidle' });
  const res = await goi(page, 'POST', '/api/account/step-up', { code: '000000' });
  // 000000 trùng mã thật một lần trên một triệu - chấp nhận.
  expect(res.status).toBe(401);
  expect(res.body.token).toBeUndefined();
});

test('route cron nội bộ KHÔNG mở qua proxy BFF', async ({ page }) => {
  await signIn(page, MAIN);
  await page.goto(`${MAIN}/admin/release-security`, { waitUntil: 'networkidle' });
  const res = await goi(page, 'POST', '/api/content/internal/releases/integrity');
  expect(res.status).toBe(404);
});
