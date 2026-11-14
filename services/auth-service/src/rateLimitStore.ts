import { prisma } from '@tsudev/db'
import type { RateLimitStore } from '@tsudev/ratelimit'

/**
 * Kho đếm tần suất trên Postgres (G9, quyết định D8 - bảng `RateLimitBucket`).
 *
 * MỘT câu SQL: `INSERT … ON CONFLICT DO UPDATE … RETURNING`. Không dùng
 * `prisma.upsert` - nó là đọc-rồi-ghi, hai yêu cầu đồng thời cùng thấy "chưa có
 * dòng", cùng INSERT, một cái vỡ khoá chính, và bộ đếm hụt đúng lúc bị dò dồn dập.
 *
 * Dọn rác ở đường ghi (như `logSecurity`), không cần cron: lượt đầu của mỗi cửa
 * sổ mới (count = 1) xoá các dòng cũ hơn 1 ngày, theo chỉ mục `windowStart`.
 */
const RETENTION_MS = 24 * 60 * 60 * 1000

export const postgresRateLimitStore: RateLimitStore = {
  async hit(key, windowStart) {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimitBucket" ("key", "windowStart", "count")
      VALUES (${key.slice(0, 200)}, ${windowStart}, 1)
      ON CONFLICT ("key", "windowStart")
      DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
      RETURNING "count"`
    const count = Number(rows[0]?.count ?? 1)
    if (count === 1) {
      prisma.rateLimitBucket
        .deleteMany({ where: { windowStart: { lt: new Date(Date.now() - RETENTION_MS) } } })
        .catch((e) =>
          console.error('[auth] dọn RateLimitBucket hỏng:', e instanceof Error ? e.message : e)
        )
    }
    return count
  },
}
