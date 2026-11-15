/**
 * Gộp LƯỢT XEM BÀI từ D1 vào Neon - MỘT lô mỗi ngày.
 *
 * Trang bài viết gửi beacon tới `/api/views` của Worker chính, Worker ghi D1
 * (`tsudev-luot-xem`, bảng `luot_xem`: một dòng cho mỗi ngày + bài + khách). Ở đây:
 * đếm các ngày ĐÃ QUA (giờ Việt Nam), đẩy một lô vào `POST /api/internal/post-views`
 * (backend ĐẶT `PostViewDaily.count`, idempotent), rồi CHỈ KHI backend nhận mới xoá
 * các dòng đó khỏi D1. Hỏng giữa chừng ⇒ lần chạy sau gửi lại đúng số cũ.
 *
 * 🔴 Chỉ ở nhịp THƯA (`23 1,13`): route chạm database. Không có dòng nào ⇒ KHÔNG gọi
 * backend (không đánh thức Neon vô ích).
 *
 * Secret: `POST_VIEWS_TOKEN` (PHẢI GIỐNG Render) - `npm run secret-views`.
 */
export interface D1Like {
  prepare(sql: string): {
    bind(...v: unknown[]): {
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
  };
}

export type KetQuaGop =
  | { chay: false; lyDo: string }
  | { chay: true; ok: false; lyDo: string }
  | { chay: true; ok: true; dong: number; ghi: number; boQua: number };

export const ngayVN = (now: Date): string =>
  new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);

export async function gopLuotXem(
  db: D1Like | undefined,
  backendUrl: string,
  tokens: { views?: string; internal?: string },
  now: Date = new Date(),
  fetchFn: typeof fetch = fetch
): Promise<KetQuaGop> {
  if (!db) return { chay: false, lyDo: 'thiếu binding VIEWS_DB' };
  if (!tokens.views) return { chay: false, lyDo: 'thiếu POST_VIEWS_TOKEN' };
  if (!backendUrl) return { chay: false, lyDo: 'thiếu BACKEND_URL' };
  const homNay = ngayVN(now);
  try {
    const { results } = await db
      .prepare(
        'SELECT ngay AS day, slug, COUNT(*) AS count FROM luot_xem WHERE ngay < ?1 GROUP BY ngay, slug LIMIT 5000'
      )
      .bind(homNay)
      .all<{ day: string; slug: string; count: number }>();
    if (!results.length) return { chay: true, ok: true, dong: 0, ghi: 0, boQua: 0 };

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-post-views-token': tokens.views,
    };
    if (tokens.internal) headers['x-internal-token'] = tokens.internal;
    const res = await fetchFn(`${backendUrl}/api/internal/post-views`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items: results.map((r) => ({ ...r, count: Number(r.count) })) }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const than = (await res.text().catch(() => '')).slice(0, 300);
      return { chay: true, ok: false, lyDo: `HTTP ${res.status} ${than}` };
    }
    const bc = (await res.json()) as { ghi: number; boQua: number };
    // Chỉ xoá đúng các ngày vừa gửi (LIMIT 5000 có thể chưa lấy hết - phần còn lại đi lần sau).
    const ngays = [...new Set(results.map((r) => r.day))];
    for (const ngay of ngays) {
      const slugs = results.filter((r) => r.day === ngay).map((r) => r.slug);
      await db
        .prepare(
          `DELETE FROM luot_xem WHERE ngay = ?1 AND slug IN (${slugs.map((_, i) => `?${i + 2}`).join(',')})`
        )
        .bind(ngay, ...slugs)
        .run();
    }
    return { chay: true, ok: true, dong: results.length, ghi: bc.ghi, boQua: bc.boQua };
  } catch (e) {
    return { chay: true, ok: false, lyDo: e instanceof Error ? e.message : String(e) };
  }
}
