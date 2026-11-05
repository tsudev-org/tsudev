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
 * Một slug CHƯA TỪNG được dựng (bài mới, chưa ai mở) mà backend đang chết thì
 * không có bản cũ nào để phục vụ, và trả props lỗi thì sẽ cache lỗi - nên vẫn
 * phải NÉM. Lỗi ném ra mang `code = UPSTREAM_UNAVAILABLE`; `pages/_error.tsx` nhận
 * ra mã đó và trả **503 + Retry-After** kèm trang "tạm thời chưa tải được" thay
 * cho 500 trần. Trang lỗi không vào cache: Next gắn `no-store` cho mọi phản hồi
 * lỗi, và lượt dựng thất bại không ghi gì vào R2.
 */

/** Nhịp dựng lại khi mọi thứ bình thường. Nội dung đổi vài lần một ngày. */
export const REVALIDATE_SECONDS = 300;

/** Nhịp dựng lại cho trang dựng ra lúc build trong khi backend đang chết. */
export const REVALIDATE_ON_FAILURE_SECONDS = 30;

const isBuildPhase = (): boolean => process.env.NEXT_PHASE === 'phase-production-build';

/**
 * Mã nhận diện lỗi "backend không trả lời". Đọc bằng `code`, KHÔNG bằng
 * `instanceof` hay tên lớp: bản dựng Worker đi qua bundler, lớp có thể bị nạp
 * hai lần hoặc đổi tên, còn một thuộc tính chuỗi thì sống qua mọi thứ đó.
 */
export const UPSTREAM_UNAVAILABLE = 'UPSTREAM_UNAVAILABLE';

/** Nhịp gợi ý thử lại (giây) trong `Retry-After` của trang 503. */
export const RETRY_AFTER_SECONDS = 60;

/** Lỗi có tên riêng để log của Worker nói rõ đây là "giữ bản cũ", không phải bug. */
export class UpstreamUnavailableError extends Error {
  readonly code = UPSTREAM_UNAVAILABLE;
  constructor(page: string) {
    super(`[isr] ${page}: backend không trả lời - giữ bản cache gần nhất, không ghi đè`);
    this.name = 'UpstreamUnavailableError';
  }
}

/** Lỗi này có phải "backend tạm thời không trả lời" không (⇒ 503, không phải 500). */
export function isUpstreamUnavailable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; name?: unknown };
  return e.code === UPSTREAM_UNAVAILABLE || e.name === 'UpstreamUnavailableError';
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

/** Phần của ServerResponse mà `pages/_error.tsx` cần - đủ hẹp để test bằng đối tượng giả. */
export type ErrorResponseLike = {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
};

/**
 * Chọn mã trạng thái cho trang lỗi. Backend tạm thời không trả lời ⇒ 503 +
 * Retry-After (ghi thẳng vào `res`); mọi lỗi khác giữ mã Next đã đặt (500).
 */
export function resolveErrorStatus(res: ErrorResponseLike | undefined, err: unknown): number {
  if (res && isUpstreamUnavailable(err)) {
    res.statusCode = 503;
    res.setHeader('Retry-After', String(RETRY_AFTER_SECONDS));
    return 503;
  }
  const code = res?.statusCode ?? (err as { statusCode?: number } | null)?.statusCode ?? 500;
  return code >= 400 ? code : 500;
}
