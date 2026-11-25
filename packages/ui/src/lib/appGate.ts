/**
 * Cổng phiên bản + "phiên bản không chính thức" cho web/PWA (tsudev-standards v7.0.0
 * `APP_INTEGRITY.md` mục 2.2-2.3, phiếu `20261125-INT1` việc (e)). Câu chữ là NGUYÊN VĂN bộ quy ước -
 * `test/appGate.test.ts` đối chiếu `.standards/docs/APP_INTEGRITY.md`, đổi bên kia mà không đổi ở đây
 * thì đỏ. Mô-đun thuần (không DOM) để dùng được ở service worker, SSR và test node.
 */

export type GateLang = 'vi' | 'en';
export type GateKind = 'update' | 'unofficial';

export const GATE_TEXT = {
  update: {
    vi: {
      title: 'Cần cập nhật ứng dụng',
      body: 'Đã có phiên bản {mới}. Để bảo vệ an toàn cho bạn và hệ thống, phiên bản {cũ} không còn được sử dụng. Vui lòng cập nhật lên phiên bản mới nhất.',
      primary: 'Cập nhật ngay',
      secondary: 'Xuất dữ liệu',
    },
    en: {
      title: 'Update required',
      body: 'Version {mới} is available. To keep you and the system safe, version {cũ} can no longer be used. Please update to the latest version.',
      primary: 'Update now',
      secondary: 'Export data',
    },
  },
  unofficial: {
    vi: {
      title: 'Phiên bản không chính thức',
      body: 'Ứng dụng này đã bị sửa đổi hoặc không được tải từ nguồn chính thức nên không thể kết nối với hệ thống TsuDEV. Hãy tải bản chính thức tại tsudev.com.',
      primary: 'Tải bản chính thức',
      secondary: 'Xuất dữ liệu',
    },
    en: {
      title: 'Unofficial version',
      body: 'This app has been modified or was not downloaded from an official source, so it cannot connect to TsuDEV. Please download the official version from tsudev.com.',
      primary: 'Download official version',
      secondary: 'Export data',
    },
  },
} as const;

export type GateCopy = { title: string; body: string; primary: string; secondary: string };

/** Câu chữ đã điền `{mới}`/`{cũ}` (chỉ modal cập nhật có biến). */
export function gateCopy(
  kind: GateKind,
  lang: GateLang,
  versions: { latest?: string; current?: string } = {}
): GateCopy {
  const t = GATE_TEXT[kind][lang];
  return {
    ...t,
    body: t.body.replace('{mới}', versions.latest ?? '').replace('{cũ}', versions.current ?? ''),
  };
}

/**
 * So hai phiên bản `YY.M.DDNN` (VERSIONING.md 2.1 - SemVer toàn số, có thể kèm `-beta.N`/`-rc.N`).
 * Trả âm/0/dương như `Array.prototype.sort`. Chuỗi hỏng ⇒ `null` (bên gọi KHÔNG được coi là "cũ
 * hơn" - không khoá người dùng vì dữ liệu hỏng).
 */
export function compareVersions(a: string, b: string): number | null {
  const parse = (v: string) => {
    const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(v.trim());
    if (!m) return null;
    return { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ?? null };
  };
  const x = parse(a);
  const y = parse(b);
  if (!x || !y) return null;
  for (let i = 0; i < 3; i++) {
    const d = (x.core[i] ?? 0) - (y.core[i] ?? 0);
    if (d !== 0) return d;
  }
  if (x.pre === y.pre) return 0;
  if (x.pre === null) return 1; // bản chính thức > bản thử cùng số
  if (y.pre === null) return -1;
  const px = x.pre.split('.');
  const py = y.pre.split('.');
  for (let i = 0; i < Math.max(px.length, py.length); i++) {
    const a1 = px[i];
    const b1 = py[i];
    if (a1 === undefined) return -1;
    if (b1 === undefined) return 1;
    const numA = /^\d+$/.test(a1);
    const numB = /^\d+$/.test(b1);
    if (numA && numB) {
      if (Number(a1) !== Number(b1)) return Number(a1) - Number(b1);
    } else if (a1 !== b1) {
      return a1 < b1 ? -1 : 1;
    }
  }
  return 0;
}

/** Header `X-Tsu-App: <ma-san-pham>/<phiên bản>/<kênh>` (APP_INTEGRITY 2.1). */
export function xTsuApp(product: string, version: string, channel: string): string {
  return `${product}/${version}/${channel}`;
}

export type GateVerdict =
  { kind: 'update'; latest: string; url: string | null } | { kind: 'unofficial' } | null;

/**
 * Đọc phản hồi API: `426 {"error":"update_required","latest","url"}` ⇒ modal khoá;
 * `403 {"error":"untrusted_client"}` ⇒ modal không chính thức. Mọi thứ khác ⇒ `null`.
 */
export function gateFromResponse(status: number, body: unknown): GateVerdict {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (status === 426 && b.error === 'update_required' && typeof b.latest === 'string') {
    return { kind: 'update', latest: b.latest, url: typeof b.url === 'string' ? b.url : null };
  }
  if (status === 403 && b.error === 'untrusted_client') return { kind: 'unofficial' };
  return null;
}
