/**
 * Cache ở biên cho các trang ĐỌC công khai (kế hoạch Q4/2026 §6.3).
 *
 * Trước đây 7 trang đọc dùng getServerSideProps: MỖI lượt xem đi Worker → Render
 * → Neon. Hai hệ quả, cả hai đã xảy ra: hạn mức compute của database thành sự cố
 * toàn site, và chính lượt xem trang TIÊU hạn mức đó. Nay các trang này là ISR:
 * bản dựng nằm trong R2 (open-next.config.ts), lượt xem đọc từ cache, chỉ lượt
 * DỰNG LẠI mới chạm backend.
 *
 * 🔴 Bất biến quan trọng nhất của tệp: một lượt dựng lại THẤT BẠI không bao giờ
 * được GHI ĐÈ bản cache tốt. Next chỉ giữ bản cũ khi getStaticProps NÉM LỖI; trả
 * về props `failed: true` thì Next coi đó là trang mới hợp lệ và cache luôn trang
 * lỗi. Vì thế lúc chạy thật, backend chết ⇒ `keepStaleOnFailure` ném ⇒ người đọc
 * vẫn thấy nội dung ĐẦY ĐỦ của lần dựng tốt gần nhất. Đó chính là điều biến
 * "database chết = site chết" thành "database chết = chưa đăng được bài mới".
 *
 * Ngoại lệ duy nhất là lúc `next build`: chưa có bản cache nào để giữ, ném lỗi thì
 * cả lần build hỏng. Khi đó trả trang trạng thái lỗi với nhịp dựng lại NGẮN để
 * lượt xem đầu tiên sau khi backend sống lại dựng ra bản thật.
 *
 * Đánh đổi đã biết: một slug CHƯA TỪNG được dựng (bài mới, chưa ai mở) mà backend
 * đang chết thì người đọc thấy trang 500 thay vì khối "không tải được". Không có
 * bản cũ nào để phục vụ, và trả props lỗi thì sẽ cache lỗi - nên 500 là đúng.
 */

/** Nhịp dựng lại khi mọi thứ bình thường. Nội dung đổi vài lần một ngày. */
export const REVALIDATE_SECONDS = 300;

/** Nhịp dựng lại cho trang dựng ra lúc build trong khi backend đang chết. */
export const REVALIDATE_ON_FAILURE_SECONDS = 30;

const isBuildPhase = (): boolean => process.env.NEXT_PHASE === 'phase-production-build';

/** Lỗi có tên riêng để log của Worker nói rõ đây là "giữ bản cũ", không phải bug. */
export class UpstreamUnavailableError extends Error {
  constructor(page: string) {
    super(`[isr] ${page}: backend không trả lời - giữ bản cache gần nhất, không ghi đè`);
    this.name = 'UpstreamUnavailableError';
  }
}

/**
 * Gọi ngay sau lượt đọc dữ liệu chính của trang. `failed` lúc chạy ⇒ ném (giữ bản
 * cũ). Lúc build ⇒ trả về nhịp dựng lại ngắn để trang lỗi không sống lâu.
 */
export function keepStaleOnFailure(failed: boolean, page: string): number {
  if (!failed) return REVALIDATE_SECONDS;
  if (isBuildPhase()) return REVALIDATE_ON_FAILURE_SECONDS;
  throw new UpstreamUnavailableError(page);
}
