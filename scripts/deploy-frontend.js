#!/usr/bin/env node
'use strict';
// Dựng và phát hành frontend-main lên Cloudflare Workers.
//
// TỒN TẠI VÌ MỘT LỖ HỔNG THẬT, đã xảy ra trên production ngày 16/08/2026:
//
// `apps/frontend-main/.env.local` là BẢN SAO NGUYÊN VĂN của `.env` gốc (do
// scripts/write-env-local.js sinh ra), gồm cả NEXTAUTH_SECRET=change-me-secret,
// khoá ký dev, và - vào thời điểm sự cố - hai cờ bỏ qua xác thực dùng cho dev
// và E2E. Next xếp `.env.local` CAO HƠN `.env.production`,
// còn lệnh deploy thì chạy trên máy dev - nên mọi giá trị dev bị nướng vào bản
// production. Hậu quả đã đo được: NextAuth bật provider `e2e-dev`, tức là BẤT KỲ
// AI cũng đăng nhập được vào tài khoản ADMIN bằng mật khẩu `devpass`.
//
// Provider đó nay đã bị gỡ hẳn, nhưng lỗ hổng thì KHÔNG phải là nó: lỗ hổng là
// việc giá trị dev đi được vào bản dựng production. Biến dev tiếp theo sẽ khác
// tên, và tệp này tồn tại để chặn cả những biến chưa được đặt ra.
//
// Chặn từng biến một là trò đuổi bắt: mỗi biến dev mới thêm vào `.env` lại là
// một lỗ mới, và không có gì báo lỗi. Nên ở đây làm điều dứt khoát: DỜI
// `.env.local` RA KHỎI ĐƯỜNG trong suốt lúc dựng, rồi trả lại.
//
// Biến môi trường production đến từ hai nguồn, cả hai đều không phải file này:
//   - NEXT_PUBLIC_* (nội suy lúc build) ← apps/frontend-main/.env.production
//   - biến/secret lúc chạy            ← wrangler.jsonc `vars` + `wrangler secret`

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadTopology, prodUrl } = require('./topology/load');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'apps', 'frontend-main');
const ENV_LOCAL = path.join(APP, '.env.local');
const STASHED = path.join(APP, '.env.local.deploy-stash');
// Tài khoản Cloudflare chứa Worker `tsudev` và bucket `tsudev-next-cache` (không phải bí mật:
// nó nằm trong mọi URL API của Cloudflare). Khớp `node_modules/.cache/wrangler/wrangler-account.json`.
const CF_ACCOUNT = '9541f44e84433a32b013ec31bae14848';

const action = process.argv[2] || 'deploy';
if (!['deploy', 'preview', 'upload'].includes(action)) {
  console.error(`Không biết hành động "${action}". Dùng: deploy | preview | upload`);
  process.exit(1);
}

// Lần chạy trước bị giết cứng có thể để lại file dời dở. Trả lại TRƯỚC khi làm gì
// khác, nếu không máy dev im lặng mất .env.local.
if (fs.existsSync(STASHED) && !fs.existsSync(ENV_LOCAL)) {
  fs.renameSync(STASHED, ENV_LOCAL);
  console.log('↩ trả lại .env.local còn sót từ lần chạy trước');
}

let stashed = false;
function restore() {
  if (stashed && fs.existsSync(STASHED)) {
    fs.renameSync(STASHED, ENV_LOCAL);
    stashed = false;
    console.log('↩ đã trả lại .env.local');
  }
}
process.on('exit', restore);
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach((s) => process.on(s, () => process.exit(130)));

try {
  if (fs.existsSync(ENV_LOCAL)) {
    fs.renameSync(ENV_LOCAL, STASHED);
    stashed = true;
    console.log('⇢ tạm dời .env.local ra khỏi bản dựng production');
  }

  const mainUrl = prodUrl(loadTopology(), 'main');
  console.log(`⇢ NEXT_PUBLIC_MAIN_URL=${mainUrl}`);

  const env = {
    ...process.env,
    NEXT_PUBLIC_MAIN_URL: mainUrl,
    // Hai cờ dev từng được xoá tường minh ở đây làm đai an toàn thứ hai. Cả hai
    // nay đã bị GỠ KHỎI MÃ NGUỒN - không còn dòng nào đọc chúng - nên việc xoá
    // ở đây là mã chết, và mã chết trong một tệp bảo mật đọc như một lớp phòng
    // thủ đang hoạt động.
    //
    // Lớp phòng thủ THẬT vẫn là việc dời .env.local ra khỏi đường ở trên: nó bảo
    // vệ mọi biến dev, kể cả những biến chưa tồn tại lúc viết dòng này.
  };

  // execFileSync, KHÔNG qua shell: `action` đã qua danh sách trắng ở đầu tệp,
  // nhưng ghép nó vào một chuỗi shell là để lớp an toàn duy nhất nằm cách đó 40
  // dòng. Truyền dạng mảng đối số thì không ký tự nào thành lệnh được.
  const opts = { cwd: APP, stdio: 'inherit', env };

  // Tài khoản Cloudflare TRƯỚC khi dựng. `~/.config/.wrangler` dùng CHUNG cho mọi
  // phiên trên máy, và ngày 12/11/2026 nó đã bị đăng nhập sang tài khoản khác. Khi
  // đó deploy không báo "sai tài khoản": bước đẩy cache R2 thử lại VÔ HẠN với lỗi
  // "Failed to send request to R2 worker ... timeout" (thật ra là 403). Cấu hình
  // RIÊNG của hệ tsudev: XDG_CONFIG_HOME=$HOME/.config/wrangler-tsudev.
  let accounts = [];
  try {
    const out = execFileSync('npx', ['wrangler', 'whoami', '--json'], {
      cwd: APP,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    accounts = (JSON.parse(out).accounts || []).map((a) => a.id);
  } catch {
    // chưa đăng nhập ⇒ accounts rỗng ⇒ dừng ở dưới với hướng dẫn
  }
  if (!accounts.includes(CF_ACCOUNT)) {
    console.error(
      `✘ wrangler không thấy tài khoản Cloudflare của tsudev (${CF_ACCOUNT.slice(0, 8)}…); đang thấy: ${
        accounts.map((a) => a.slice(0, 8)).join(', ') || '(chưa đăng nhập)'
      }.\n  Chạy lại với cấu hình riêng: XDG_CONFIG_HOME=$HOME/.config/wrangler-tsudev npm --workspace apps/frontend-main run deploy\n  KHÔNG chạy \`wrangler login\` trên cấu hình chung - nó đổi tài khoản của mọi phiên khác.`
    );
    process.exit(1);
  }
  console.log(`⇢ tài khoản Cloudflare ${CF_ACCOUNT.slice(0, 8)}… - khớp`);

  // Cổng chống tráo QR / số tài khoản của /ung-ho (phiếu 20261112-01 mục 3.4): ảnh QR
  // phải khớp SHA-256 đã ghim và VietQR phải trỏ đúng tài khoản - lệch thì KHÔNG dựng.
  execFileSync('npx', ['jest', 'test/ungHo.test.ts'], {
    ...opts,
    env: { ...env, NODE_ENV: 'test' },
  });
  execFileSync('npx', ['opennextjs-cloudflare', 'build'], opts);
  execFileSync('npx', ['opennextjs-cloudflare', action], opts);
} finally {
  restore();
}
