const { test, expect } = require('@playwright/test');
const { loadTopology, publicUrl } = require('../../scripts/topology/load');
const { signIn } = require('./helpers/login');

// Gõ tiếng Việt trong trình soạn Tiptap (ADR-0001, RICH_TEXT_EDITOR.md mục 11:
// "không mất ký tự, không nhảy con trỏ - thử với ít nhất hai bộ gõ").
//
// ĐÂY LÀ GIẢ LẬP, không phải bộ gõ thật: máy CI không có Unikey/EVKey hay
// ibus-bamboo. Hai test tái hiện đúng HAI CƠ CHẾ mà hai họ bộ gõ đó dùng để đưa
// chữ vào ô soạn - vốn là chỗ trình soạn contenteditable hay hỏng:
//   1. Unikey/EVKey (Windows, mặc định): KHÔNG dùng composition. Mỗi phím dấu,
//      bộ gõ gửi Backspace xoá phần âm tiết đã gõ rồi chèn lại âm tiết có dấu.
//   2. ibus-bamboo (Linux, chế độ preedit): chuỗi compositionstart/update/end -
//      chữ nằm ở vùng soạn tạm, chỉ được "chốt" khi kết thúc âm tiết.
// Kiểm bằng bộ gõ thật trên máy người vẫn là việc của người (ghi ở ADR-0001).
const MAIN = process.env.E2E_MAIN_URL || publicUrl(loadTopology(), 'main');

async function moTrinhSoan(browser) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await signIn(page, MAIN, 'bob');
  await page.goto(`${MAIN}/author/posts/new`, { waitUntil: 'networkidle' });
  const editor = page.getByRole('textbox', { name: 'Nội dung' });
  await editor.click();
  return { ctx, page, editor };
}

// Telex "Tieesng Vieejt cos daaus" theo kiểu Unikey: [gõ thường | xoá n ký tự rồi chèn].
const UNIKEY = [
  ['T'],
  ['i'],
  ['e'],
  ['bs', 1, 'ê'],
  ['bs', 1, 'ế'],
  ['n'],
  ['g'],
  [' '],
  ['V'],
  ['i'],
  ['e'],
  ['bs', 1, 'ê'],
  ['bs', 1, 'ệ'],
  ['t'],
  [' '],
  ['c'],
  ['o'],
  ['bs', 1, 'ó'],
  [' '],
  ['d'],
  ['a'],
  ['bs', 1, 'â'],
  ['u'],
  ['bs', 2, 'ấu'],
];

test('kiểu Unikey/EVKey (xoá lùi + chèn): không mất ký tự, con trỏ ở cuối', async ({ browser }) => {
  const { ctx, page, editor } = await moTrinhSoan(browser);
  for (const [k, n, chen] of UNIKEY) {
    if (k === 'bs') {
      for (let i = 0; i < n; i++) await page.keyboard.press('Backspace');
      await page.keyboard.insertText(chen);
    } else {
      await page.keyboard.type(k);
    }
  }
  // Gõ tiếp sau chuỗi dấu: chữ phải vào CUỐI (con trỏ không nhảy).
  await page.keyboard.type('.');
  await expect(editor).toHaveText('Tiếng Việt có dấu.');
  await ctx.close();
});

test('kiểu ibus-bamboo (composition/preedit): không mất ký tự, không nhân đôi', async ({
  browser,
}) => {
  const { ctx, page, editor } = await moTrinhSoan(browser);
  const cdp = await page.context().newCDPSession(page);
  const amTiet = async (cacBuoc) => {
    for (const s of cacBuoc)
      await cdp.send('Input.imeSetComposition', {
        text: s,
        selectionStart: s.length,
        selectionEnd: s.length,
      });
    await cdp.send('Input.insertText', { text: cacBuoc[cacBuoc.length - 1] });
  };
  await amTiet(['t', 'ti', 'tie', 'tiê', 'tiế', 'tiến', 'tiếng']);
  await page.keyboard.type(' ');
  await amTiet(['V', 'Vi', 'Vie', 'Viê', 'Việ', 'Việt']);
  await page.keyboard.type(' ');
  await amTiet(['đ', 'đư', 'đươ', 'được']);
  await page.keyboard.type('.');
  await expect(editor).toHaveText('tiếng Việt được.');
  await ctx.close();
});
