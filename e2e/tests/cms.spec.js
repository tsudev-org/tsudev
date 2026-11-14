const { test, expect } = require('@playwright/test');
const { loadTopology, publicUrl } = require('../../scripts/topology/load');
const { signIn } = require('./helpers/login');

// Nghiệm thu P2 (docs/de-xuat-bao-mat-cms-cai-bang-lenh.md): AUTHOR viết bằng trình
// soạn Tiptap → gửi duyệt → người kiểm duyệt duyệt ở /admin/review → bài hiện ở
// /blog. Khẳng định NỘI DUNG trên trang công khai, không chỉ mã 200.
const MAIN = process.env.E2E_MAIN_URL || publicUrl(loadTopology(), 'main');

test('AUTHOR viết → gửi duyệt → duyệt → bài hiện ở /blog', async ({ browser }) => {
  const stamp = Date.now();
  const title = `Bài E2E CMS ${stamp}`;

  const authorCtx = await browser.newContext({ ignoreHTTPSErrors: true });
  const author = await authorCtx.newPage();
  await signIn(author, MAIN, 'bob');
  await author.goto(`${MAIN}/author/posts/new`, { waitUntil: 'networkidle' });
  await author.fill('#title', title);
  const editor = author.getByRole('textbox', { name: 'Nội dung' });
  await editor.click();
  await author.keyboard.type('Đoạn mở đầu có dấu tiếng Việt.');
  await author.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(author).toHaveURL(/\/author\/posts\/(?!new)[a-z0-9-]+$/, { timeout: 15000 });
  await expect(author.getByText('Bản nháp', { exact: true })).toBeVisible();
  await author.getByRole('button', { name: 'Gửi duyệt' }).click();
  await expect(author.getByText('Chờ duyệt', { exact: true }).first()).toBeVisible();

  // Chưa duyệt ⇒ chưa có ở /blog.
  const anon = await browser.newPage();
  await anon.goto(`${MAIN}/blog`, { waitUntil: 'networkidle' });
  await expect(anon.getByText(title)).toHaveCount(0);

  const modCtx = await browser.newContext({ ignoreHTTPSErrors: true });
  const mod = await modCtx.newPage();
  await signIn(mod, MAIN, 'tsudev');
  await mod.goto(`${MAIN}/admin/review`, { waitUntil: 'networkidle' });
  const row = mod.locator('li', { hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Duyệt' }).click();
  await expect(mod.getByText(`"${title}": Đã đăng.`)).toBeVisible();

  // ISR ở production; `next dev` dựng mỗi lượt nên bài hiện ngay.
  await anon.goto(`${MAIN}/blog`, { waitUntil: 'networkidle' });
  await expect(anon.getByText(title)).toBeVisible();

  await authorCtx.close();
  await modCtx.close();
});
