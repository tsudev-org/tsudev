const { test, expect } = require('@playwright/test');
const { loadTopology, publicUrl } = require('../../scripts/topology/load');
const { signIn } = require('./helpers/login');

// Canh các hành vi được viết lại khi lên eslint-plugin-react-hooks 7 (phiên 42,
// 07/11/2026): nạp dữ liệu chuyển sang `useLoader` (lib/useLoader.ts), đồng bộ
// state theo URL/prop chuyển vào render, cờ "đã gắn" chuyển sang
// useSyncExternalStore. Mỗi test khẳng định NỘI DUNG, không chỉ mã 200 - một
// effect không còn chạy cho ra trang 200 rỗng.

const MAIN = process.env.E2E_MAIN_URL || publicUrl(loadTopology(), 'main');
const CONSOLE = process.env.E2E_CONSOLE_URL || publicUrl(loadTopology(), 'console');

test('accounts: bộ lọc trong URL được nhận vào ô tìm và giữ trên URL', async ({ page }) => {
  await signIn(page, MAIN, 'tsudev');
  await page.goto(`${CONSOLE}/accounts?q=alice`, { waitUntil: 'networkidle' });
  const box = page.getByPlaceholder('Tìm tên đăng nhập, email, tên hiển thị…');
  await expect(box).toHaveValue('alice');
  // Effect ghi ngược KHÔNG được xoá bộ lọc vừa mở từ liên kết.
  await expect(page).toHaveURL(/[?&]q=alice/);
  await expect(page.locator('table tbody')).toContainText('alice');
  await expect(page.locator('table tbody')).not.toContainText('bob');
});

test('accounts: xoá ô tìm thì URL bỏ tham số và bảng có lại mọi người', async ({ page }) => {
  await signIn(page, MAIN, 'tsudev');
  await page.goto(`${CONSOLE}/accounts?q=alice`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Tìm tên đăng nhập, email, tên hiển thị…').fill('');
  await expect(page).not.toHaveURL(/[?&]q=/);
  await expect(page.locator('table tbody')).toContainText('bob');
});

test('các trang nạp dữ liệu bằng useLoader có nội dung thật', async ({ page }) => {
  await signIn(page, MAIN, 'tsudev');
  for (const [path, text] of [
    ['/security', 'Đăng nhập'],
    // Lọc mặc định là nội dung do agent sinh (Toà soạn đã gỡ) ⇒ rỗng là ĐÚNG; câu
    // này chỉ hiện SAU khi lượt nạp xong, nên nó chứng minh loader đã chạy.
    ['/content', 'Không có mục nào khớp bộ lọc'],
    ['/settings/profile', 'Hồ sơ'],
  ]) {
    await page.goto(`${CONSOLE}${path}`, { waitUntil: 'networkidle' });
    await expect(page.locator('main'), path).toContainText(text);
    await expect(page.getByText('Đang tải…'), `${path} kẹt ở "Đang tải…"`).toHaveCount(0);
  }
});

test('bộ chọn giao diện ở chân trang: đổi chế độ, nhớ qua lần tải lại', async ({ page }) => {
  await page.goto(MAIN, { waitUntil: 'networkidle' });
  const group = page.getByRole('radiogroup', { name: 'Giao diện' });
  // Mặc định Hệ thống (PRODUCT_POLICY 1.2) - chọn Sáng tường minh để chứng minh việc đổi + nhớ.
  await group.getByRole('radio', { name: 'Sáng' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(group.getByRole('radio', { name: 'Sáng' })).toHaveAttribute('aria-checked', 'true');
});
