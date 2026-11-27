// Cổng xác thực: mọi trang SSR theo người dùng, KHÔNG có ISR ⇒ không cần incremental cache (R2). Đệm trang đăng
// nhập/tài khoản ở biên là lỗi (CONTROL_PLANE.md mục 2: `no-store`).
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({});
