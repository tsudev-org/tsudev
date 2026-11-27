/**
 * Canh bản kê phiên bản (VS1 mục 4, CP4): `GET <SITE_URL>/.well-known/tsudev/versions.json` và `.sig` phải 200.
 *
 * Bản kê là đường app đã cài ghim; 503 ở đây là app không biết có bản mới (VS1: isolate mới đúng lúc backend
 * ngủ). Đọc qua Worker công khai - đúng đường app đi - nên KHÔNG chạm database trực tiếp; vẫn chỉ gắn vào nhịp
 * THƯA cho khỏi đánh thức backend ngoài giờ giữ ấm.
 */
export type KetQuaPhienBan =
  { chay: false; lyDo: string } | { chay: true; ok: boolean; lyDo: string };

export async function kiemPhienBan(
  siteUrl: string,
  fetchFn: typeof fetch = fetch
): Promise<KetQuaPhienBan> {
  if (!siteUrl) return { chay: false, lyDo: 'thiếu SITE_URL' };
  // Không regex `/\/+$/` (CodeQL js/polynomial-redos trên chuỗi nhiều '/'): cắt tay.
  let base = siteUrl;
  while (base.endsWith('/')) base = base.slice(0, -1);
  const loi: string[] = [];
  for (const tep of ['versions.json', 'versions.json.sig']) {
    try {
      const r = await fetchFn(`${base}/.well-known/tsudev/${tep}`, {
        headers: { 'user-agent': 'tsudev-canh-site' },
      });
      if (r.status !== 200) loi.push(`${tep} HTTP ${r.status}`);
    } catch (e) {
      loi.push(`${tep} ${(e as Error).message}`);
    }
  }
  return loi.length
    ? { chay: true, ok: false, lyDo: loi.join('; ') }
    : { chay: true, ok: true, lyDo: 'ok' };
}
