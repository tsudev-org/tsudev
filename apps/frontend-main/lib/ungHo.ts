/**
 * Kênh ủng hộ của hệ sinh thái (trang trung tâm /ung-ho, phiếu 20261112-01).
 *
 * Chống tráo QR / số tài khoản - kiểu lừa đảo phổ biến nhất với trang ủng hộ:
 *  - `kiemVietQr`: CRC đúng, NAPAS, VND/VN, BIN + số tài khoản trùng số in bằng chữ.
 *    Trang gọi `KENH` ở cấp module ⇒ dữ liệu sai thì `next build` DỪNG (prerender lỗi).
 *  - SHA-256 của ảnh QR ghim trong data/ung-ho.json; test/ungHo.test.ts đối chiếu với
 *    tệp thật (CI, và scripts/deploy-frontend.js chạy test đó TRƯỚC khi dựng).
 *
 * TypeScript thuần, không Buffer/fs: chạy được cả ở Workers lẫn trình duyệt. Thuật
 * toán chép từ tsudev-files/website/src/lib/ung-ho.ts (bản tham chiếu).
 */
import duLieu from '../data/ung-ho.json';

export type VietQr = { bin: string; soTaiKhoan: string; payload: string };
export type KenhUngHo = {
  ten: string;
  moTa: string;
  nganHang: string;
  soTaiKhoan: string;
  chuTaiKhoan: string;
  anhQr: string;
  anhQrSha256: string;
  vietqr: VietQr;
};

/** CRC-16/CCITT-FALSE của VietQR (EMVCo), 4 chữ số hex in hoa. */
export function crc16(s: string): string {
  let c = 0xffff;
  for (let i = 0; i < s.length; i++) {
    c ^= (s.charCodeAt(i) & 0xff) << 8;
    for (let b = 0; b < 8; b++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, '0');
}

/** Tách chuỗi TLV (tag 2 số, độ dài 2 số) thành bảng tag -> giá trị. */
function tlv(s: string): Map<string, string> {
  const m = new Map<string, string>();
  for (let i = 0; i < s.length;) {
    const tag = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(len) || i + 4 + len > s.length)
      throw new Error('VietQR sai cấu trúc TLV');
    m.set(tag, s.slice(i + 4, i + 4 + len));
    i += 4 + len;
  }
  return m;
}

/** VietQR hợp lệ (CRC đúng) và chuyển tiền tới đúng BIN + số tài khoản đã khai. */
export function kiemVietQr(q: VietQr): void {
  const { payload, bin, soTaiKhoan } = q;
  if (payload.slice(-8, -4) !== '6304' || !payload.endsWith(crc16(payload.slice(0, -4))))
    throw new Error('VietQR sai CRC');
  const goc = tlv(payload);
  const tk = tlv(goc.get('38') ?? '');
  if (tk.get('00') !== 'A000000727') throw new Error('VietQR không phải của NAPAS');
  if (goc.get('53') !== '704' || goc.get('58') !== 'VN')
    throw new Error('VietQR không phải VND/VN');
  const nhan = tlv(tk.get('01') ?? '');
  if (nhan.get('00') !== bin || nhan.get('01') !== soTaiKhoan)
    throw new Error(
      `VietQR chuyển tới ${nhan.get('00')}/${nhan.get('01')}, khác ${bin}/${soTaiKhoan} đã khai`
    );
}

// Tên/miền của dự án gốc và kênh tài trợ cũ: không bao giờ xuất hiện ở trang ủng hộ tsudev.
const CAM = /knifelemon|ko-fi|patreon|paypal|buymeacoffee|github\.com\/sponsors\/(?!tsudev)/i;

/** Kiểm một danh sách kênh; sai thì NÉM (dừng build), không lặng lẽ bỏ qua. */
export function kiemKenh(kenh: unknown[]): KenhUngHo[] {
  if (!Array.isArray(kenh) || kenh.length === 0) throw new Error('ung-ho.json: không có kênh nào');
  return kenh.map((k, i) => {
    const r = (k ?? {}) as Record<string, unknown>;
    const loi = (m: string) => new Error(`ung-ho.json, kênh #${i + 1}: ${m}`);
    for (const f of ['ten', 'moTa', 'nganHang', 'soTaiKhoan', 'chuTaiKhoan', 'anhQr'] as const)
      if (typeof r[f] !== 'string' || !(r[f] as string).trim()) throw loi(`thiếu "${f}"`);
    if (!/^\/ung-ho\/[a-z0-9-]+\.(svg|png|webp)$/.test(r.anhQr as string))
      throw loi('"anhQr" phải dạng "/ung-ho/<ten-tep>.svg"');
    if (typeof r.anhQrSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(r.anhQrSha256))
      throw loi('thiếu "anhQrSha256"');
    // Tên tệp mang tiền tố băm (cache immutable): đổi ảnh mà quên đổi tên ⇒ trình
    // duyệt giữ ảnh cũ tới một năm.
    if (!(r.anhQr as string).includes(r.anhQrSha256.slice(0, 8)))
      throw loi('tên tệp "anhQr" phải chứa 8 ký tự đầu của "anhQrSha256"');
    const q = r.vietqr as VietQr | undefined;
    if (
      !q ||
      typeof q.bin !== 'string' ||
      typeof q.soTaiKhoan !== 'string' ||
      typeof q.payload !== 'string'
    )
      throw loi('"vietqr" cần bin, soTaiKhoan, payload');
    try {
      kiemVietQr(q);
    } catch (e) {
      throw loi((e as Error).message);
    }
    if ((r.soTaiKhoan as string).replace(/\s/g, '') !== q.soTaiKhoan)
      throw loi('số tài khoản in bằng chữ khác số tài khoản của VietQR');
    if (CAM.test(JSON.stringify(k))) throw loi('còn trỏ tới dự án gốc/kênh cũ');
    return r as unknown as KenhUngHo;
  });
}

export const KENH: KenhUngHo[] = kiemKenh(duLieu.kenh);

// ---------------------------------------------------------------------------
// VietQR ĐỘNG cho thanh toán Pro / ủng hộ có huy hiệu (PRO-B bước B3).
//
// Dựng từ payload TĨNH đã kiểm ở trên (cùng BIN + số tài khoản), chỉ đổi:
//  - tag 01 = "12" (mã dùng một lần, có số tiền) thay cho "11";
//  - thêm tag 54 = số tiền VND (số nguyên);
//  - thêm tag 62 / con 08 = nội dung chuyển khoản `TSU <mã 8 ký tự>`;
//  - tính lại CRC tag 63.
// Kết quả được kiểm lại bằng `kiemVietQr` (CRC, NAPAS, VND/VN, đúng tài khoản) trước khi
// trả về - sai là NÉM, trang hiện lỗi thay vì vẽ một mã chuyển tiền đi nơi khác.
// ---------------------------------------------------------------------------

/** Nội dung chuyển khoản hợp lệ: chữ in hoa, số, khoảng trắng; ≤ 25 ký tự (giới hạn ngân hàng). */
const NOI_DUNG_RE = /^[A-Z0-9 ]{1,25}$/;

const truong = (tag: string, v: string) => tag + String(v.length).padStart(2, '0') + v;

export function vietQrDong(goc: VietQr, soTienVnd: number, noiDung: string): string {
  if (!Number.isSafeInteger(soTienVnd) || soTienVnd <= 0 || soTienVnd > 999_999_999)
    throw new Error('Số tiền VietQR không hợp lệ');
  if (!NOI_DUNG_RE.test(noiDung)) throw new Error('Nội dung chuyển khoản không hợp lệ');
  kiemVietQr(goc);
  const tags = tlv(goc.payload);
  let s = '';
  for (const [tag, v] of tags) {
    if (tag === '54' || tag === '62' || tag === '63') continue;
    s += truong(tag, tag === '01' ? '12' : v);
    if (tag === '53') s += truong('54', String(soTienVnd));
  }
  s += truong('62', truong('08', noiDung));
  s += '6304';
  const payload = s + crc16(s);
  kiemVietQr({ ...goc, payload });
  const dung = tlv(payload);
  if (dung.get('54') !== String(soTienVnd) || tlv(dung.get('62') ?? '').get('08') !== noiDung)
    throw new Error('VietQR động dựng sai');
  return payload;
}

/** Kênh nhận cho thanh toán Pro/ủng hộ có huy hiệu: kênh đầu tiên của trang /ung-ho. */
export const KENH_THANH_TOAN: KenhUngHo = KENH[0]!;

/** `TSU XXXXXXXX` - đúng chuỗi auth-service nhận ở /admin/thanh-toan (normalizeCode). */
export const noiDungTsu = (ma: string) => `TSU ${ma}`;
