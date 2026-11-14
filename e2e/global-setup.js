const { loadTopology, publicUrl } = require('../scripts/topology/load');

// Làm ấm `next dev` TRƯỚC test đầu tiên.
//
// Vì sao: `next dev` biên dịch từng trang ở lần gọi ĐẦU TIÊN. Trang admin nặng
// (bảng, trình soạn) biên dịch nguội trên máy CI mất 5-10s, vượt `expect.timeout`
// 5s - nên lượt chạy đỏ đúng ở TEST #1, mỗi lần một test khác nhau (#253: lần 1
// `release-security`, lần 2 `react-hooks-7 accounts`), 21/22 test còn lại xanh, và
// chạy lại thì qua. Test sau không gặp vì trang đã biên dịch xong.
//
// Cách làm: gọi GET trần (không đăng nhập) mọi trang/route bộ test sẽ mở. Không
// cần phiên: Next biên dịch trang (cả bản server lẫn bản trình duyệt) khi có yêu
// cầu HTML, kể cả khi trang đó rồi chuyển hướng về /login. KHÔNG đăng nhập ở đây
// vì mã TOTP vừa dùng có thể bị từ chối là dùng lại ở test đầu tiên.
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
  '/api/auth/session',
  '/api/auth/providers',
];

const warm = async (path) => {
  const started = Date.now();
  try {
    const res = await fetch(`${MAIN}${path}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(120 * 1000),
    });
    await res.arrayBuffer();
    return `${path} ${res.status} ${Date.now() - started}ms`;
  } catch (err) {
    return `${path} LỖI ${err.message}`;
  }
};

module.exports = async () => {
  if (process.env.E2E_SKIP_WARMUP === '1') return;
  const started = Date.now();
  // Tuần tự: `next dev` biên dịch song song thì từng trang còn chậm hơn, và
  // chính việc tranh CPU là thứ làm test đầu vượt timeout.
  const lines = [];
  for (const path of PATHS) lines.push(await warm(path));
  console.log(`[làm ấm] ${Date.now() - started}ms\n  ${lines.join('\n  ')}`);
};
