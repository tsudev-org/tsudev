const WORDS_PER_MINUTE = 200;

/**
 * Phút đọc ước lượng (200 từ/phút), ít nhất 1 khi có chữ. Tệp riêng, không phụ
 * thuộc gì: trình soạn (chunk nạp lười) dùng nó mà không kéo theo `marked` của
 * `lib/contentChecks.ts`.
 */
export const readingMinutes = (words: number) =>
  words <= 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
