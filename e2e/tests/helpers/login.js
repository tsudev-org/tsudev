const path = require('path');

// Helper đăng nhập DUY NHẤT của bộ E2E - đi qua ĐÚNG trang /login như người dùng
// thật: mật khẩu Argon2id trong DB, kiểm bởi auth-service, rồi bước hai TOTP nếu
// tài khoản đã bật. Không có cờ bỏ qua nào; một E2E đi cửa sau chỉ chứng minh
// cửa sau chạy được.
//
// Tài khoản và bí mật do `npm run db:seed:dev` đặt: `tsudev` (OWNER) mang một
// TOTP ĐÃ XÁC NHẬN với bí mật dev `DEV_SEED_TOTP_SECRET`; alice/bob không có.

const DEV_PASSWORD = process.env.DEV_SEED_PASSWORD || 'tsudev-dev-2026!';
const DEV_TOTP_SECRET = process.env.DEV_SEED_TOTP_SECRET || 'TSUDEVDEVONLYTOTPTSUDEVDEVONLY22';

const LOGIN_FORM = 'form:has(input[name="identifier"])';
const TOTP_INPUT = 'input[name="totp"]';

// Tính mã bằng CHÍNH hàm của auth-service (dist/ - `e2e`/`e2e:app` và CI đều
// `build:services` trước) thay vì cài lại thuật toán ở đây: hai bản cài đặt có
// thể lệch nhau mà cả hai vẫn "trông đúng". Nạp lười để các test không đăng
// nhập không phụ thuộc vào dist/.
const totpCode = () => {
  const mod = require(path.resolve(__dirname, '../../../services/auth-service/dist/totp'));
  return mod.totpCode(DEV_TOTP_SECRET);
};

const onLoginPage = (page) => new URL(page.url()).pathname.startsWith('/login');

// KHÔNG chờ `waitForNavigation` ở đây: trang gọi signIn(redirect:false), nên khi
// máy chủ đòi bước hai thì KHÔNG có điều hướng nào - chờ nó là treo tới hết
// timeout 60s của test. Việc chờ kết quả nằm ở `settle` / `waitForURL` bên dưới.
//
// Phải NEO vào chính biểu mẫu đăng nhập. Từ 26/08/2026 (SEARCH-HEADER) ô tìm
// kiếm ở header là <form> THẬT và mang một nút gửi `sr-only` - nút đó nằm
// TRƯỚC nút của trang trong DOM, nên `button[type="submit"]` trần khớp 2 phần
// tử và Playwright bấm nhầm cái ở header (bị icon kính lúp che ⇒ treo 60s).
const submit = (page) => page.click(`${LOGIN_FORM} button[type="submit"]`);

// Đợi cho tới khi trang hoặc rời /login (đăng nhập xong) hoặc hiện ô mã
// (cần bước hai). Không đợi thì `isVisible` đọc DOM trước khi signIn() trả lời.
const settle = (page) =>
  Promise.race([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 10000 }),
    page.waitForSelector(TOTP_INPUT, { state: 'visible', timeout: 10000 }),
  ]).catch(() => {});

// Chỉ gửi bước MỘT (tên + mật khẩu). Dùng riêng cho ca khẳng định rằng mật khẩu
// đúng mà thiếu mã thì KHÔNG có phiên.
const submitPassword = async (page, baseUrl, user) => {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="identifier"]', user);
  await page.fill('input[name="password"]', DEV_PASSWORD);
  await submit(page);
  await settle(page);
};

const signIn = async (page, baseUrl, user = 'tsudev') => {
  await submitPassword(page, baseUrl, user);
  if (!onLoginPage(page) || !(await page.locator(TOTP_INPUT).isVisible())) return;

  // Ranh giới 30 giây: mã tính ngay trước khi cửa sổ lật có thể tới máy chủ
  // sau khi lật. verifyTotp chấp nhận ±1 bước nên hiếm khi trượt, nhưng nếu bị
  // từ chối (vẫn ở /login) thì tính lại ĐÚNG MỘT lần - thử nhiều hơn là đốt hạn
  // mức thất bại của tài khoản (ACCOUNT_MAX_FAILURES) và che lỗi thật.
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.fill(TOTP_INPUT, totpCode());
    await submit(page);
    await page
      .waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 10000 })
      .catch(() => {});
    if (!onLoginPage(page)) return;
  }
};

module.exports = { signIn, submitPassword, TOTP_INPUT, DEV_PASSWORD };
