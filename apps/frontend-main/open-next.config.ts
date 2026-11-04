// Cache ở biên cho các trang ISR (kế hoạch Q4/2026 §6.2, lib/isr.ts).
//
// R2 giữ bản dựng của các trang đọc công khai, nên lượt xem KHÔNG chạm Render hay
// Neon - chỉ lượt dựng lại mới chạm. Hệ quả có chủ đích: database chết thì site
// vẫn phục vụ bản cache gần nhất với nội dung ĐẦY ĐỦ thay vì 503.
//
// Hàng đợi dựng lại là memoryQueue: nó gọi lại chính Worker qua service binding
// WORKER_SELF_REFERENCE (đã khai trong wrangler.jsonc). Đủ cho lưu lượng của một
// site cá nhân; doQueue (Durable Object) chỉ đáng khi cần khử trùng toàn cục.
//
// KHÔNG có tagCache: trang Pages Router ở đây chỉ dựng lại theo thời gian
// (`revalidate`), không dùng revalidateTag/revalidatePath.
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import memoryQueue from '@opennextjs/cloudflare/overrides/queue/memory-queue';

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: memoryQueue,
});
