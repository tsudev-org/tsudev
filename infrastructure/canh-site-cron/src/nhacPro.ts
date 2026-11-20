/**
 * PRO2 2.4 - thư nhắc gia hạn TsuDEV Pro: gọi `POST {BACKEND_URL}/ent/reminders/run`
 * (auth-service, proReminders.ts) MỘT lần mỗi ngày - lượt 01:23 UTC = 08:23 giờ Việt Nam.
 * Backend tự chống gửi trùng (mỗi mốc tối đa một thư), nên lỡ tay chạy thêm cũng vô hại;
 * giới hạn một lần/ngày chỉ để không đánh thức Neon thêm lần nữa.
 *
 * Gác bằng INTERNAL_API_TOKEN (đã có ở Render và ở Worker này) - không thêm bí mật mới.
 * Thiếu ⇒ BỎ QUA và log, không im lặng.
 */
export type KetQuaNhac =
  | { chay: false; lyDo: string }
  | { chay: true; ok: false; lyDo: string }
  | { chay: true; ok: true; sent: number; failed: number; skipped: number; candidates: number };

/** Giờ UTC của lượt chạy mỗi ngày (một trong hai giờ của nhịp `23 1,13`). */
export const GIO_NHAC_UTC = 1;

export async function goiNhacPro(
  backendUrl: string,
  internal: string | undefined,
  fetchFn: typeof fetch = fetch
): Promise<KetQuaNhac> {
  if (!internal) return { chay: false, lyDo: 'thiếu INTERNAL_API_TOKEN' };
  if (!backendUrl) return { chay: false, lyDo: 'thiếu BACKEND_URL' };
  try {
    const res = await fetchFn(`${backendUrl}/ent/reminders/run`, {
      method: 'POST',
      headers: { 'x-internal-token': internal },
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const than = (await res.text().catch(() => '')).slice(0, 300);
      return { chay: true, ok: false, lyDo: `HTTP ${res.status} ${than}` };
    }
    const r = (await res.json()) as {
      sent: number;
      failed: number;
      skipped: number;
      candidates: number;
    };
    return { chay: true, ok: true, ...r };
  } catch (e) {
    return { chay: true, ok: false, lyDo: e instanceof Error ? e.message : String(e) };
  }
}
