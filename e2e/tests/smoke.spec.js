const { test, expect } = require('@playwright/test');
const { loadTopology, publicUrl } = require('../../scripts/topology/load');
const { signIn: signInAs, submitPassword, TOTP_INPUT } = require('./helpers/login');

// LƯỚI AN TOÀN cho việc chuyển thành website dự án cá nhân.
//
// Thay cho cross-origin-session.spec.js: khi chỉ còn MỘT app thì không còn
// "xuyên origin" để kiểm. Cái cần bảo vệ bây giờ là những trang được GIỮ LẠI
// vẫn sống sót qua đợt gỡ 32 route và 12 model.
//
// Test này phải xanh TRƯỚC khi gỡ bất cứ thứ gì, và xanh lại sau mỗi giai đoạn.
// Nó cố ý khẳng định NỘI DUNG THẬT (tiêu đề bài viết lấy từ DB), không chỉ
// "trang trả về 200" - trang rỗng vẫn trả 200.

const MAIN = process.env.E2E_MAIN_URL || publicUrl(loadTopology(), 'main');

// Đăng nhập bằng ĐÚNG luồng của người dùng thật - mật khẩu Argon2id trong DB,
// kiểm bởi auth-service, rồi mã TOTP cho tài khoản đã bật 2FA. Helper dùng
// chung: e2e/tests/helpers/login.js.
const signIn = (page, user = 'tsudev') => signInAs(page, MAIN, user);

test('trang chủ dựng được và mang thương hiệu tsudev', async ({ page }) => {
  await page.goto(MAIN, { waitUntil: 'networkidle' });
  await expect(page.locator('header')).toBeVisible();
  await expect(page).toHaveTitle(/tsudev/i);
});

test('blog: danh sách có bài thật và mở được bài chi tiết', async ({ page }) => {
  await page.goto(`${MAIN}/blog`, { waitUntil: 'networkidle' });
  // Nội dung từ content-service qua getServerSideProps. Rỗng = service chết
  // hoặc route /api/posts đã bị gỡ nhầm.
  const first = page.locator('a[href^="/blog/"]').first();
  await expect(first).toBeVisible();

  // Khẳng định ĐÚNG tiêu đề lấy từ DB, không phải "có một thẻ h1 nào đó" -
  // trang lỗi vẫn có h1. (Bài viết render markdown nên có nhiều h1, lấy cái đầu.)
  await page.goto(`${MAIN}/blog/welcome-to-tsudev`, { waitUntil: 'networkidle' });
  await expect(page.locator('h1').first()).toHaveText('Chào mừng đến với tsudev');
});

test('tài liệu: danh sách có mục thật và mở được trang chi tiết', async ({ page }) => {
  await page.goto(`${MAIN}/docs`, { waitUntil: 'networkidle' });
  await expect(page.locator('a[href^="/docs/"]').first()).toBeVisible();

  await page.goto(`${MAIN}/docs/getting-started`, { waitUntil: 'networkidle' });
  await expect(page.locator('h1').first()).toHaveText('Bắt đầu nhanh');
});

// Con dấu tín nhiệm đã GỠ 04/11/2026 (docs/refactor-tsudev-2026-q4.md §7). Gỡ
// cũng là đổi bề mặt: trang cũ phải 404 thật, không phải còn sót một trang mồ côi
// gọi tới backend đã không còn.
test('con dấu đã gỡ: /trust/* trả 404 và không còn trong điều hướng', async ({ page }) => {
  for (const path of ['/trust', '/trust/verify', '/trust/directory', '/admin/trust']) {
    const res = await page.request.get(`${MAIN}${path}`);
    expect(res.status(), `${path} lẽ ra phải 404`).toBe(404);
  }
  await page.goto(MAIN, { waitUntil: 'networkidle' });
  await expect(page.locator('a[href^="/trust"]')).toHaveCount(0);
});

test('sitemap không còn liệt kê trang nào của con dấu', async ({ page }) => {
  const res = await page.request.get(`${MAIN}/sitemap.xml`);
  expect(res.status()).toBe(200);
  const xml = await res.text();
  // '/trust/' chứ không phải '/trust': dự án `tsudev-trust-crypto` có chữ trust
  // trong slug và vẫn phải nằm trong sitemap.
  expect(xml).not.toContain('/trust/');
  expect(xml).not.toContain('/trust<');
});

test('JWKS ký bản phát hành công khai ở đường chuẩn', async ({ page }) => {
  const res = await page.request.get(`${MAIN}/.well-known/tsudev-release-jwks.json`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.keys[0]).toMatchObject({ kty: 'OKP', crv: 'Ed25519' });
});

test('đăng nhập dev hoạt động', async ({ page }) => {
  await signIn(page);
  await page.goto(MAIN, { waitUntil: 'networkidle' });
  await expect(page.locator('header button:has-text("Đăng xuất")')).toBeVisible({ timeout: 10000 });
});

// alice không bật 2FA: đăng nhập phải xong ở bước MỘT, không bị đòi mã. Canh
// để việc ép 2FA cho quản trị không lan sang tài khoản thường.
test('alice (không TOTP) đăng nhập một bước', async ({ page }) => {
  await submitPassword(page, MAIN, 'alice');
  await expect(page.locator(TOTP_INPUT)).toHaveCount(0);
  await page.goto(MAIN, { waitUntil: 'networkidle' });
  await expect(page.locator('header button:has-text("Đăng xuất")')).toBeVisible({ timeout: 10000 });
});

// tsudev là OWNER và có TOTP đã xác nhận (seed dev). Mật khẩu đúng mà thiếu mã
// thì PHẢI dừng ở bước hai, không có phiên. Hỏng chỗ này là 2FA chỉ để trang trí:
// lộ mật khẩu là đủ vào khu quản trị.
test('tsudev: mật khẩu đúng mà thiếu mã TOTP thì không có phiên', async ({ page }) => {
  await submitPassword(page, MAIN, 'tsudev');
  await expect(page.locator(TOTP_INPUT)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/login');

  const session = await page.request.get(`${MAIN}/api/auth/session`);
  const body = await session.json().catch(() => ({}));
  expect(body?.user ?? null).toBeNull();

  await page.goto(MAIN, { waitUntil: 'networkidle' });
  await expect(page.locator('header button:has-text("Đăng xuất")')).toHaveCount(0);
});

test('khu vực quản trị mở được sau khi đăng nhập bằng tsudev', async ({ page }) => {
  await signIn(page);
  await page.goto(`${MAIN}/admin`, { waitUntil: 'networkidle' });
  // Chưa đăng nhập thì trang hiện lời mời đăng nhập - thấy nút đó nghĩa là hỏng.
  await expect(page.locator('button:has-text("Đăng nhập")')).toHaveCount(0);
});

test('điều hướng chính không có link chết', async ({ page }) => {
  await page.goto(MAIN, { waitUntil: 'networkidle' });
  const hrefs = await page.locator('header nav a').evaluateAll((els) => els.map((e) => e.href));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    const res = await page.request.get(href);
    expect(res.status(), `link chết trong điều hướng: ${href}`).toBeLessThan(400);
  }
});

test('dự án: danh sách có dự án thật và mở được trang chi tiết', async ({ page }) => {
  await page.goto(`${MAIN}/projects`, { waitUntil: 'networkidle' });
  const first = page.locator('a[href^="/projects/"]').first();
  await expect(first).toBeVisible();

  await page.goto(`${MAIN}/projects/tsudev-trust-crypto`, { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toHaveText('Ký bản phát hành tsudev');
  // Dự án này seed ở trạng thái REGISTERED - số giấy chứng nhận PHẢI hiện ra.
  // Đây là khẳng định trung tâm của mục bản quyền, không phải trang trí.
  await expect(page.getByText('TSD-2026-0001')).toBeVisible();
});

test('đường ghi dự án từ chối người chưa đăng nhập', async ({ page }) => {
  // BFF không được để lọt request ghi nào ra content-service khi không có phiên.
  // Hỏng chỗ này là bất kỳ ai cũng sửa được danh mục dự án.
  const res = await page.request.post(`${MAIN}/api/content/admin/projects`, {
    data: { slug: 'ke-gian', name: 'x', summary: 'x' },
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(401);
});

test('quản trị dự án mở được và thấy danh sách', async ({ page }) => {
  await signIn(page);
  await page.goto(`${MAIN}/admin/projects`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Dự án & bản quyền' })).toBeVisible();
  await expect(page.getByText('tsudev-platform')).toBeVisible({ timeout: 10000 });
});
