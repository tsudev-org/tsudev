// @ts-check
// Đăng nhập chéo thiết bị bằng QR + mã khớp (CROSS_DEVICE_LOGIN). Hai trình duyệt độc lập = hai thiết bị: một đã
// đăng nhập (xác nhận), một chưa (mới). QR là ảnh nên lấy id + bí mật từ phản hồi tạo phiên - đúng nội dung QR mã hoá.
const { test, expect } = require('@playwright/test');
const { loadTopology, publicUrl } = require('../../scripts/topology/load');
const { signIn } = require('./helpers/login');

const BASE = process.env.E2E_MAIN_URL || publicUrl(loadTopology(), 'main');

const sessionUser = async (page) =>
  page.evaluate(async () => (await (await fetch('/api/auth/session')).json())?.user?.name || null);

test('Đ1 đẩy: máy đã đăng nhập hiện QR ⇒ máy mới quét ⇒ Cho phép ⇒ gõ mã ⇒ máy mới đăng nhập', async ({
  browser,
}) => {
  const pc = await (await browser.newContext()).newPage();
  const phone = await (await browser.newContext()).newPage();
  await signIn(pc, BASE, 'alice');
  await pc.goto(`${BASE}/settings/security`, { waitUntil: 'networkidle' });
  const created = pc.waitForResponse((r) => r.url().endsWith('/api/xd/create-push'));
  await pc.getByRole('button', { name: 'Hiện mã QR' }).click();
  const { id, k } = await (await created).json();

  await phone.goto(`${BASE}/x/${id}?f=d#${k}`);
  await expect(phone.getByText('Bấm Cho phép trên máy tính')).toBeVisible();
  expect(new URL(phone.url()).hash).toBe('');

  await pc.getByRole('button', { name: 'Cho phép' }).click();
  const code = (await pc.locator('p.font-mono').innerText()).trim();
  expect(code).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}$/);

  await phone.getByRole('button', { name: 'Đúng tài khoản của tôi' }).click({ timeout: 10000 });
  await phone.fill('#xd-code', code);
  await phone.getByRole('button', { name: 'Xác nhận' }).click();
  await phone.waitForURL((u) => u.pathname === '/');
  expect(await sessionUser(phone)).toBe('alice');
});

test('Đ2 kéo: máy mới hiện QR ở /login ⇒ máy đã đăng nhập quét ⇒ Cho phép ⇒ gõ mã', async ({
  browser,
}) => {
  const pc = await (await browser.newContext()).newPage();
  const phone = await (await browser.newContext()).newPage();
  await signIn(phone, BASE, 'alice');

  await pc.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await pc.check('input[name="consent"]');
  const created = pc.waitForResponse((r) => r.url().endsWith('/api/xd/create-pull'));
  await pc.getByRole('button', { name: 'Đăng nhập bằng mã QR' }).click();
  const body = await (await created).json();
  expect(body.poll).toBeUndefined();

  await phone.goto(`${BASE}/x/${body.id}?f=k#${body.k}`);
  await expect(phone.getByText('Chỉ cho phép nếu bạn đang cầm cả hai thiết bị.')).toBeVisible();
  await phone.getByRole('button', { name: 'Cho phép' }).click();
  const code = (await phone.locator('p.font-mono').innerText()).trim();

  await pc.fill('#xd-code', 'ZZZZ-ZZZZ');
  await pc.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(pc.getByText(/Mã chưa đúng\. Còn 2 lần thử\./)).toBeVisible();
  await pc.fill('#xd-code', code);
  await pc.getByRole('button', { name: 'Xác nhận' }).click();
  await pc.waitForURL((u) => !u.pathname.startsWith('/login'));
  expect(await sessionUser(pc)).toBe('alice');
});

test('ô đồng ý chưa tích ⇒ bấm lối vào hiện bảng "Đồng ý và tiếp tục"', async ({ page }) => {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Đăng nhập bằng mã QR' }).click();
  await expect(page.getByRole('button', { name: 'Đồng ý và tiếp tục' })).toBeVisible();
  await page.getByRole('button', { name: 'Đồng ý và tiếp tục' }).click();
  await expect(page.locator('input[name="consent"]')).toBeChecked();
});
