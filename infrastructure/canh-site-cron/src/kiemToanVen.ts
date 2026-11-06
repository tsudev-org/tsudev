/**
 * Lượt KIỂM TOÀN VẸN bản phát hành (G5, docs/security-plan.md §3.3 mục 4; B4).
 *
 * Gọi `POST /api/internal/releases/integrity` của backend: máy chủ băm lại từng
 * tệp đã niêm phong trong R2 và so với sha256 đã ký; lệch ⇒ tự gỡ công bố. Ở
 * đây chỉ đọc báo cáo, ghi log, và BÁO ĐỘNG khi có lệch, có phát hiện mã độc,
 * hoặc khi lượt kiểm không chạy được - im lặng là thứ duy nhất không được phép.
 *
 * 🔴 CHỈ chạy ở nhịp THƯA (`23 1,13`): route này CHẠM DATABASE (đọc bảng phát
 * hành) và đọc R2. Gắn vào nhịp 5 phút là giữ Neon thức suốt ngày - đúng cái
 * bẫy mà chú thích ở wrangler.jsonc kể. Tách khỏi index.ts cũng để hợp đồng
 * `cronContract.test.ts` ("nhịp giữ ấm chỉ gọi /health") vẫn đọc được thẳng.
 *
 * Secret (đặt bằng `npm run cron:secret-integrity`):
 *   RELEASE_INTEGRITY_TOKEN - PHẢI GIỐNG giá trị ở Render. Thiếu ⇒ bỏ qua + log.
 *   INTERNAL_API_TOKEN      - nếu backend bật cổng `/api` bằng token này.
 */

export type BaoCao = {
  checked: number;
  khop: number;
  lech: Array<{ id: string; nhan: string; lyDo: string }>;
  loi: Array<{ id: string; lyDo: string }>;
  conLai: number;
  quetLai: number;
  phatHien: string[];
};

export type KetQuaKiem =
  | { chay: false; lyDo: string }
  | { chay: true; ok: false; lyDo: string }
  | { chay: true; ok: true; bc: BaoCao };

export async function goiKiemToanVen(
  backendUrl: string,
  tokens: { integrity?: string; internal?: string },
  fetchFn: typeof fetch = fetch
): Promise<KetQuaKiem> {
  if (!tokens.integrity) return { chay: false, lyDo: 'thiếu RELEASE_INTEGRITY_TOKEN' };
  if (!backendUrl) return { chay: false, lyDo: 'thiếu BACKEND_URL' };
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-release-integrity-token': tokens.integrity,
  };
  if (tokens.internal) headers['x-internal-token'] = tokens.internal;
  try {
    const res = await fetchFn(`${backendUrl}/api/internal/releases/integrity`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ budgetMs: 120_000 }),
      signal: AbortSignal.timeout(300_000),
    });
    if (!res.ok) {
      const than = (await res.text().catch(() => '')).slice(0, 300);
      return { chay: true, ok: false, lyDo: `HTTP ${res.status} ${than}` };
    }
    return { chay: true, ok: true, bc: (await res.json()) as BaoCao };
  } catch (e) {
    return { chay: true, ok: false, lyDo: e instanceof Error ? e.message : String(e) };
  }
}

/** Dòng log + (nếu cần) nội dung báo động. `baoDong: null` = không cần báo. */
export function dienGiai(kq: KetQuaKiem): { log: string; baoDong: string | null } {
  if (!kq.chay)
    return { log: `[cron] kiểm toàn vẹn: BỎ QUA - ${kq.lyDo} (G5 chưa được canh)`, baoDong: null };
  if (!kq.ok)
    return {
      log: `[cron] kiểm toàn vẹn: HỎNG - ${kq.lyDo}`,
      baoDong: `Lượt kiểm toàn vẹn bản phát hành KHÔNG chạy được: ${kq.lyDo}\nTệp trong R2 lúc này không được ai canh.`,
    };
  const bc = kq.bc;
  const log =
    `[cron] kiểm toàn vẹn: ${bc.checked} tệp, khớp ${bc.khop}, lệch ${bc.lech.length}, ` +
    `lỗi ${bc.loi.length}, còn ${bc.conLai}, tra lại VirusTotal ${bc.quetLai}, phát hiện ${bc.phatHien.length}`;
  const dong: string[] = [];
  for (const l of bc.lech) dong.push(`LỆCH TOÀN VẸN - đã gỡ công bố: ${l.nhan}\n  ${l.lyDo}`);
  for (const p of bc.phatHien) dong.push(`NGHI MÃ ĐỘC (VirusTotal) - đã gỡ công bố: ${p}`);
  return {
    log,
    baoDong: dong.length
      ? dong.join('\n') +
        '\n\nXem /admin/release-security. Đừng niêm phong lại - phát hành phiên bản mới.'
      : null,
  };
}
