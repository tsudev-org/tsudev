const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { loadTopology, publicUrl } = require('../../scripts/topology/load');

// Nghiệm thu ECO1-a (phiếu 20261125-ECO1): thẻ app ở trang chủ + /apps mang dải chéo góc
// "Open"/"Private" và dòng "Author: TsuDEV…" dưới tên app; axe 0 critical/serious ở CẢ HAI chế
// độ; ở 390 px trang không cuộn ngang (dải tuyệt đối ở góc không được đẩy bề rộng).
const MAIN = process.env.E2E_MAIN_URL || publicUrl(loadTopology(), 'main');

// axe-core nạp từ node_modules (CSP chặn script ngoài) - cùng cách studio.spec.js.
const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const useTheme = (ctx, theme) =>
  ctx.addInitScript((t) => {
    try {
      localStorage.setItem('tsudev-theme', t);
    } catch {
      /* chế độ cấm lưu trữ - chế độ mặc định vẫn đo được */
    }
  }, theme);

const axeSerious = async (page) => {
  await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(async () => {
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return r.violations
      .filter((v) => v.impact === 'critical' || v.impact === 'serious')
      .map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
  });
};

for (const theme of ['dark', 'light']) {
  for (const width of [1280, 390]) {
    test(`thẻ app ${theme} ${width}px: dải Open/Private + Author, axe sạch, không cuộn ngang`, async ({
      browser,
    }, testInfo) => {
      test.setTimeout(120 * 1000);
      const ctx = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width, height: 900 },
      });
      await useTheme(ctx, theme);
      const page = await ctx.newPage();
      for (const path of ['/', '/apps']) {
        await page.goto(`${MAIN}${path}`, { waitUntil: 'networkidle' });
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        const cards = page.locator('article:has(.tsu-ribbon)');
        expect(await cards.count(), `${path}: có thẻ app`).toBeGreaterThan(0);
        // Nhãn chữ cũ đã thay bằng dải chéo góc.
        await expect(cards.getByText('Mã nguồn mở', { exact: true })).toHaveCount(0);
        await expect(cards.first().locator('.tsu-ribbon__band')).toHaveText(/^(Open|Private)$/);
        await expect(
          cards.first().getByText(/^Author: TsuDEV( \+ \d+ Contributors?)?/)
        ).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow, `${path} cuộn ngang ở ${width}px`).toBeLessThanOrEqual(0);
        expect(await axeSerious(page), `${path} (${theme})`).toEqual([]);
        await testInfo.attach(`${theme}-${width}${path.replace(/\//g, '_') || '_'}.png`, {
          body: await page.screenshot({ fullPage: false }),
          contentType: 'image/png',
        });
      }
      await ctx.close();
    });
  }
}
