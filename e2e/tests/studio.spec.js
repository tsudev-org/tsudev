const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { loadTopology, publicUrl } = require('../../scripts/topology/load');
const { signIn } = require('./helpers/login');

// Nghiệm thu UX1-d (PR 4.7, phiếu 20261124-UX1): Studio đi trọn một vòng bằng ĐÚNG
// đường của tác giả thật - đăng nhập mật khẩu + TOTP (bob là AUTHOR, đường GHI đòi
// 2FA từ P1.2) → viết → menu `/` chèn hộp ghi chú + bảng → TỰ LƯU 30 s (không bấm
// Lưu) → gửi duyệt. Khẳng định trên Markdown máy chủ đã lưu, không chỉ trên DOM:
// trình soạn hiện bảng mà Markdown mất bảng thì bài công khai vẫn hỏng.
const MAIN = process.env.E2E_MAIN_URL || publicUrl(loadTopology(), 'main');

// axe-core nạp từ node_modules và tiêm vào trang - không qua CDN (CSP của site
// chặn script ngoài, và CI không nên phụ thuộc mạng ngoài cho một phép đo).
const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const THEMES = ['dark', 'light'];

// Đặt chế độ TRƯỚC KHI VẼ, đúng như script chống nháy đọc lựa chọn đã lưu.
const useTheme = (ctx, theme) =>
  ctx.addInitScript((t) => {
    try {
      localStorage.setItem('tsudev-theme', t);
    } catch {
      /* trang chạy ở chế độ cấm lưu trữ - chế độ mặc định vẫn đo được */
    }
  }, theme);

/** Lỗi axe mức critical/serious (WCAG A/AA) - rỗng là đạt. */
const axeSerious = async (page) => {
  await page.addScriptTag({ content: AXE_SOURCE });
  const violations = await page.evaluate(async () => {
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return r.violations
      .filter((v) => v.impact === 'critical' || v.impact === 'serious')
      .map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
      }));
  });
  return violations;
};

/**
 * Markdown máy chủ đang giữ cho bài - đọc qua đúng proxy BFF mà trang dùng.
 * `fetch` CHẠY TRONG TRANG chứ không qua `page.request`: Node không phân giải
 * `*.localhost` trên mọi máy (WSL: ENOTFOUND), Chromium thì luôn phân giải.
 */
const savedMarkdown = async (page, slug) => {
  const out = await page.evaluate(async (s) => {
    const res = await fetch(`/api/content/author/posts/${encodeURIComponent(s)}`);
    return { ok: res.ok, j: await res.json().catch(() => ({})) };
  }, slug);
  expect(out.ok).toBeTruthy();
  return String(out.j.contentMd ?? out.j.post?.contentMd ?? '');
};

/** Đặt con trỏ ở cuối đoạn văn ĐẦU TIÊN của trình soạn. */
const caretToEndOfFirstParagraph = async (page) => {
  await page.evaluate(() => {
    const root = document.querySelector('.ProseMirror');
    const p = root.querySelector(':scope > p');
    root.focus();
    const r = document.createRange();
    r.selectNodeContents(p);
    r.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  });
  // Chờ ProseMirror nhận vùng chọn: đoạn chứa con trỏ phải là đoạn đầu.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const n = window.getSelection().anchorNode;
        const el = n && (n.nodeType === 1 ? n : n.parentElement);
        return el?.closest('td, th') ? 'cell' : el?.closest('.ProseMirror > p') ? 'p1' : 'other';
      })
    )
    .toBe('p1');
};

/** Gõ `/<lọc>` ở đoạn trống hiện tại rồi chọn khối có nhãn `label`. Lọc KHÔNG có
 * dấu cách: dấu cách đóng menu (giống Notion), nên "/ghi chu" là chữ thường. */
const slashInsert = async (page, query, label) => {
  await page.keyboard.type(`/${query}`);
  const menu = page.getByRole('listbox', { name: 'Chèn khối' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('option').first()).toContainText(label);
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
};

test('Studio: viết → menu / chèn hộp ghi chú + bảng → tự lưu → gửi duyệt', async ({
  browser,
}, testInfo) => {
  // Tự lưu là hẹn giờ 30 s THẬT (AUTOSAVE_MS) - không giả đồng hồ: thứ cần chứng
  // minh chính là hẹn giờ đó chạy trong trình duyệt và tới được endpoint autosave.
  test.setTimeout(150 * 1000);
  const stamp = Date.now();
  const title = `Bài E2E Studio ${stamp}`;

  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await signIn(page, MAIN, 'bob');
  await page.goto(`${MAIN}/studio/posts/new`, { waitUntil: 'networkidle' });

  await page.fill('#title', title);
  const editor = page.getByRole('textbox', { name: 'Nội dung' });
  await editor.click();
  await page.keyboard.type('Đoạn mở đầu E2E.');

  // Lần ghi đầu TẠO bản nháp (bài mới chưa có slug để tự lưu vào).
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/posts\/(?!new)[a-z0-9-]+$/, { timeout: 15000 });
  const slug = new URL(page.url()).pathname.split('/').pop();
  await expect(page.getByText(/^Đã lưu \d{2}:\d{2}$/)).toBeVisible();

  // Mở lại bài vừa tạo: lần lưu đầu đổi URL rồi trình soạn nạp lại nội dung từ máy
  // chủ - phím gõ trong khoảnh khắc đó bị nuốt (đo ở máy dev: "E2E.g"). Người thật
  // không gõ trong 100 ms đó; test thì có.
  await page.goto(`${MAIN}/studio/posts/${slug}`, { waitUntil: 'networkidle' });
  await expect(page.locator('#title')).toHaveValue(title, { timeout: 20000 });
  await expect(editor.getByText('Đoạn mở đầu E2E.')).toBeVisible();

  // Bảng ở cuối bài; hộp ghi chú chen giữa đoạn mở đầu và bảng.
  await editor.getByText('Đoạn mở đầu E2E.').click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await slashInsert(page, 'bang', 'Bảng');
  await page.keyboard.type('Cột A');
  await expect(editor.locator('table')).toHaveCount(1);

  // Về cuối đoạn ĐẦU bằng vùng chọn DOM, không click/phím: ở CI cả click lẫn
  // Ctrl+Home đều để con trỏ ở lại ô bảng (#393 hai lần: ghi chú rơi vào ô).
  // ProseMirror nhận vùng chọn qua `selectionchange`, rồi Enter tách đoạn đúng chỗ.
  await caretToEndOfFirstParagraph(page);
  await page.keyboard.press('Enter');
  await slashInsert(page, 'ghi', 'Hộp ghi chú');
  await page.keyboard.type('Nội dung hộp ghi chú.');
  // Hộp ghi chú phải nằm NGOÀI bảng (GFM làm phẳng khối trong ô thành `<br>`).
  await expect(editor.locator('table aside')).toHaveCount(0);
  await expect(editor.locator('aside[data-callout="note"]')).toContainText('Nội dung hộp ghi chú.');

  // KHÔNG bấm Lưu: chờ hẹn giờ tự lưu. Trước khi nó chạy, máy chủ chưa có bảng.
  await expect(page.getByText('Có thay đổi chưa lưu')).toBeVisible();
  expect(await savedMarkdown(page, slug)).not.toContain('[!NOTE]');
  await expect(page.getByText(/^Đã lưu \d{2}:\d{2}$/)).toBeVisible({ timeout: 45 * 1000 });

  const md = await savedMarkdown(page, slug);
  expect(md).toContain('Đoạn mở đầu E2E.');
  expect(md).toMatch(/^> \[!NOTE\]\s*$/m);
  expect(md).toContain('Nội dung hộp ghi chú.');
  expect(md).toMatch(/^\|\s*Cột A\s*\|/m);
  expect(md).toMatch(/^\|\s*-+\s*\|/m);
  // Thứ tự: ghi chú đứng trước bảng.
  expect(md.indexOf('[!NOTE]')).toBeLessThan(md.indexOf('Cột A'));

  // Tải lại ⇒ trình soạn dựng lại đúng hai khối từ Markdown (khứ hồi qua máy chủ).
  await page.reload({ waitUntil: 'networkidle' });
  // Bài nạp qua `useLoader` SAU khi trang vẽ - chờ dữ liệu, rồi mới đếm khối.
  await expect(page.locator('#title')).toHaveValue(title, { timeout: 20000 });
  await expect(editor.locator('table')).toHaveCount(1, { timeout: 10000 });
  await expect(editor.locator('aside[data-callout="note"]')).toContainText('Nội dung hộp ghi chú.');

  await page.getByRole('button', { name: 'Gửi duyệt' }).click();
  await expect(page.getByText('Chờ duyệt', { exact: true }).first()).toBeVisible();

  await testInfo.attach('studio-trinh-soan.png', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await ctx.close();
});

// Ảnh chụp + axe cho MỌI trang Studio ở CẢ HAI chế độ. Ảnh là tệp đính kèm của báo
// cáo (người duyệt xem), không so pixel - phông chữ máy CI khác máy dev.
for (const theme of THEMES) {
  test(`Studio ${theme}: axe 0 critical/serious + ảnh chụp`, async ({ browser }, testInfo) => {
    test.setTimeout(120 * 1000);
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    await useTheme(ctx, theme);
    const page = await ctx.newPage();
    await signIn(page, MAIN, 'bob');

    for (const path of ['/studio', '/studio/posts', '/studio/docs', '/studio/posts/new']) {
      await page.goto(`${MAIN}${path}`, { waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      // Trang đã vẽ nội dung đăng nhập (không phải khung chờ phiên).
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('status', { name: 'Đang tải' })).toHaveCount(0);
      if (path === '/studio/posts/new') {
        await expect(page.getByRole('textbox', { name: 'Nội dung' })).toBeVisible();
      }
      const found = await axeSerious(page);
      expect(found, `${path} (${theme})`).toEqual([]);
      await testInfo.attach(`${theme}${path.replace(/\//g, '_')}.png`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    }
    await ctx.close();
  });
}
