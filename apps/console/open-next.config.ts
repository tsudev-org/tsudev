// Trạm điều hành: mọi trang SSR theo người dùng, KHÔNG có ISR ⇒ không cần incremental cache (R2) hay hàng đợi dựng
// lại. Đệm dữ liệu điều hành ở biên là lỗi (CONTROL_PLANE.md mục 3: `no-store`).
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({});
