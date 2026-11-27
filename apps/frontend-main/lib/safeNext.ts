/**
 * Đích chuyển hướng AN TOÀN sau đăng nhập: luôn là đường dẫn trong site.
 *
 * Bản cũ chỉ đòi `startsWith('/') && !startsWith('//')`. Trình duyệt coi `\`
 * như `/` trong URL, nên `/\ke-tan-cong.example` qua được kiểm tra rồi được
 * hiểu là `//ke-tan-cong.example` - chuyển hướng MỞ sang tên miền khác ngay sau
 * khi người dùng đăng nhập (CodeQL js/client-side-unvalidated-url-redirection).
 *
 * Cách đúng là để parser URL của chính trình duyệt quyết định: phân giải giá
 * trị trên một gốc giả, đòi gốc không đổi, rồi chỉ trả phần path+query+hash đã
 * chuẩn hoá. Ký tự điều khiển (tab, xuống dòng - trình duyệt xoá chúng khỏi URL)
 * bị từ chối trước.
 */
const GOC = 'https://tsudev.invalid';

export function safeNext(raw: unknown, fallback = '/'): string {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return fallback;
  // eslint-disable-next-line no-control-regex -- CỐ Ý: chặn ký tự điều khiển (CR/LF, tab…)
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  let u: URL;
  try {
    u = new URL(raw, GOC);
  } catch {
    return fallback;
  }
  if (u.origin !== GOC) return fallback;
  return `${u.pathname}${u.search}${u.hash}`;
}

/**
 * CP4: đích quay về sau đăng nhập ở cổng `id.` - đường tương đối (qua `safeNext`) HOẶC URL tuyệt đối thuộc đúng
 * một trong ba origin của hệ (tsudev.com, console., id.). Origin khác ⇒ `fallback` (chống open redirect).
 */
export function safeReturn(raw: unknown, origins: readonly string[], fallback = '/'): string {
  if (typeof raw === 'string' && raw.startsWith('/')) return safeNext(raw, fallback);
  if (typeof raw !== 'string') return fallback;
  // eslint-disable-next-line no-control-regex -- CỐ Ý: chặn ký tự điều khiển (CR/LF, tab…)
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return fallback;
  }
  if (u.username || u.password) return fallback;
  return origins.includes(u.origin) ? u.href : fallback;
}
