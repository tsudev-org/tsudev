const { chromium } = require('@playwright/test');
const { loadTopology, publicUrl } = require('../scripts/topology/load');

// Làm ấm `next dev` TRƯỚC test đầu tiên.
//
// Vì sao: `next dev` biên dịch từng trang ở lần gọi ĐẦU TIÊN. Trang admin nặng
// (bảng, trình soạn) biên dịch nguội trên máy CI mất 5-10s, vượt `expect.timeout`
// 5s - nên lượt chạy đỏ đúng ở TEST #1, mỗi lần một test khác nhau (#253: lần 1
// `release-security`, lần 2 `react-hooks-7 accounts`), 21/22 test còn lại xanh, và
// chạy lại thì qua. Test sau không gặp vì trang đã biên dịch xong.
//
// Cách làm: MỞ BẰNG TRÌNH DUYỆT THẬT (không đăng nhập) mọi trang bộ test sẽ mở.
// ⚠️ `fetch` trần KHÔNG đủ - đã đo ở #256: mỗi trang admin trả HTML trong ~150ms
// vì Turbopack chỉ dựng phần server; bundle trình duyệt chỉ biên dịch khi trình
// duyệt xin chunk, mà lỗi cũ chính là heading vẽ phía client không kịp hiện.
// Không cần phiên: trang chưa đăng nhập vẫn nạp đủ chunk của chính nó. KHÔNG
// đăng nhập ở đây vì mã TOTP vừa dùng có thể bị từ chối là dùng lại ở test đầu.
//
// Webserver của Playwright đã lên trước globalSetup, nên URL đã sống. Một trang
// làm ấm hỏng KHÔNG làm đỏ cả lượt - test thật sẽ nói lỗi rõ hơn; chỉ ghi log.
const MAIN = process.env.E2E_MAIN_URL || publicUrl(loadTopology(), 'main');

const PATHS = [
  '/',
  '/login',
  '/blog',
  '/docs',
  '/projects',
  '/apps',
  '/admin',
  '/admin/accounts',
  '/admin/release-security',
  '/admin/security',
  '/admin/content',
  '/admin/projects',
  '/settings/profile',
  '/settings/security',
  '/author',
];

// Route proxy BFF mà trang gọi SAU khi đăng nhập - mỗi tệp `pages/api/*` cũng
// biên dịch nguội ở lần gọi đầu. Gọi trần (chưa đăng nhập) chỉ cần nó dựng
// xong; 401/404/405 đều được.
const API = [
  '/api/auth/session',
  '/api/auth/providers',
  '/api/auth/csrf',
  '/api/account/session',
  '/api/content/projects',
  '/api/identity/health',
  '/api/storage/health',
  '/api/search?q=a',
  '/api/releases/jwks',
];

const warm = async (page, path) => {
  const started = Date.now();
  try {
    const res = await page.goto(`${MAIN}${path}`, { waitUntil: 'load', timeout: 120 * 1000 });
    return `${path} ${res ? res.status() : '-'} ${Date.now() - started}ms`;
  } catch (err) {
    return `${path} LỖI ${err.message.split('\n')[0]}`;
  }
};

module.exports = async () => {
  if (process.env.E2E_SKIP_WARMUP === '1') return;
  const started = Date.now();
  // Tuần tự: `next dev` biên dịch song song thì từng trang còn chậm hơn, và
  // chính việc tranh CPU là thứ làm test đầu vượt timeout.
  const browser = await chromium.launch();
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const lines = [];
  for (const path of PATHS) lines.push(await warm(page, path));
  for (const path of API) {
    const started = Date.now();
    const res = await page.request.get(`${MAIN}${path}`, { timeout: 120 * 1000 }).catch((e) => e);
    lines.push(
      `${path} ${res.status ? res.status() : `LỖI ${res.message}`} ${Date.now() - started}ms`
    );
  }
  await browser.close();
  console.log(`[làm ấm] ${Date.now() - started}ms\n  ${lines.join('\n  ')}`);
};
