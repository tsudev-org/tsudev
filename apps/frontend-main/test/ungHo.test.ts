import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  KENH,
  KENH_THANH_TOAN,
  crc16,
  kiemKenh,
  kiemVietQr,
  noiDungTsu,
  vietQrDong,
} from '../lib/ungHo';
import duLieu from '../data/ung-ho.json';

/**
 * Cổng chống tráo QR / số tài khoản của trang /ung-ho (phiếu 20261112-01 mục 3.4).
 * Chạy trong CI VÀ trong scripts/deploy-frontend.js trước khi dựng bản production.
 */
const PUBLIC = join(__dirname, '..', 'public');
const PAYLOAD =
  '00020101021138530010A0000007270123000697044101090564855060208QRIBFTTA53037045802VN63040B90';

describe('trang ủng hộ trung tâm', () => {
  it('đúng MỘT kênh, đúng thông tin chuẩn của phiếu gốc mục 2', () => {
    expect(KENH).toHaveLength(1);
    const k = KENH[0]!;
    expect(k.soTaiKhoan).toBe('056485506');
    expect(k.chuTaiKhoan).toBe('NGUYEN TRANG TINH SU');
    expect(k.vietqr).toEqual({ bin: '970441', soTaiKhoan: '056485506', payload: PAYLOAD });
  });

  it('ảnh QR trên đĩa khớp SHA-256 đã ghim (tráo ảnh ⇒ đỏ)', () => {
    for (const k of KENH) {
      const that = createHash('sha256')
        .update(readFileSync(join(PUBLIC, k.anhQr)))
        .digest('hex');
      expect(that).toBe(k.anhQrSha256);
    }
    expect(KENH[0]!.anhQrSha256).toBe(
      '7209698f1393857607ec7bea95b06349ca8ce332d6fb0c9f1774d6beab4cecae'
    );
  });

  it('CRC-16 của VietQR chuẩn là 0B90', () => {
    expect(crc16(PAYLOAD.slice(0, -4))).toBe('0B90');
  });

  it('VietQR bị sửa số tài khoản (kể cả tính lại CRC) thì bị từ chối', () => {
    const body = PAYLOAD.slice(0, -4).replace('056485506', '056485507');
    const forged = body + crc16(body);
    expect(() => kiemVietQr({ bin: '970441', soTaiKhoan: '056485506', payload: forged })).toThrow(
      /khác 970441\/056485506/
    );
    expect(() =>
      kiemVietQr({ bin: '970441', soTaiKhoan: '056485506', payload: PAYLOAD.slice(0, -1) + '1' })
    ).toThrow(/CRC/);
  });

  it('số tài khoản in bằng chữ lệch VietQR, tên tệp không mang băm, kênh cũ ⇒ dừng', () => {
    const goc = duLieu.kenh[0];
    expect(() => kiemKenh([{ ...goc, soTaiKhoan: '0123456789' }])).toThrow(/in bằng chữ/);
    expect(() => kiemKenh([{ ...goc, anhQr: '/ung-ho/vietqr-vib.svg' }])).toThrow(/8 ký tự/);
    expect(() => kiemKenh([{ ...goc, moTa: 'hoặc ko-fi.com/abc' }])).toThrow(/kênh cũ/);
    expect(() => kiemKenh([])).toThrow(/không có kênh/);
  });

  it('ảnh QR có Cache-Control immutable (tên tệp đổi khi đổi QR)', () => {
    const headers = readFileSync(join(PUBLIC, '_headers'), 'utf8');
    expect(headers).toMatch(/\/ung-ho\/\*\n\s+Cache-Control: public,max-age=31536000,immutable/);
  });
});

describe('VietQR động cho thanh toán Pro / ủng hộ (B3)', () => {
  const GOC = { bin: '970441', soTaiKhoan: '056485506', payload: PAYLOAD };

  it('dựng đúng từng byte: tag 01=12, 54 số tiền, 62/08 nội dung, CRC tính lại', () => {
    // Dựng tay độc lập với vietQrDong: chèn 54 sau 53, thêm 62 trước 63.
    const body =
      '00020101021238530010A0000007270123000697044101090564855060208QRIBFTTA5303704' +
      '5406490000' +
      '5802VN' +
      '62160812TSU ABCDEFGH' +
      '6304';
    expect(vietQrDong(GOC, 490_000, 'TSU ABCDEFGH')).toBe(body + crc16(body));
  });

  it('kết quả vẫn qua kiemVietQr (đúng ngân hàng + tài khoản, CRC hợp lệ)', () => {
    const p = vietQrDong(GOC, 20_000, noiDungTsu('7K3M9QX2'));
    expect(() => kiemVietQr({ ...GOC, payload: p })).not.toThrow();
    expect(p).toContain('540520000');
    expect(p).toContain('0812TSU 7K3M9QX2');
  });

  it('số tiền sai (0, âm, lẻ, quá trần) ⇒ ném', () => {
    for (const x of [0, -1, 1.5, 1_000_000_000, Number.NaN])
      expect(() => vietQrDong(GOC, x, 'TSU ABCDEFGH')).toThrow(/Số tiền/);
  });

  it('nội dung sai (chữ thường, dấu, quá 25 ký tự, rỗng) ⇒ ném', () => {
    for (const x of ['tsu abcdefgh', 'TSU ĐẠI', 'TSU ' + 'A'.repeat(22), ''])
      expect(() => vietQrDong(GOC, 490_000, x)).toThrow(/Nội dung/);
  });

  it('payload gốc bị tráo tài khoản ⇒ ném, không vẽ mã chuyển tiền đi nơi khác', () => {
    const body = PAYLOAD.slice(0, -4).replace('056485506', '056485507');
    expect(() =>
      vietQrDong({ ...GOC, payload: body + crc16(body) }, 490_000, 'TSU ABCDEFGH')
    ).toThrow();
  });

  it('kênh thanh toán là kênh đầu của /ung-ho và dựng được mã động', () => {
    expect(KENH_THANH_TOAN).toBe(KENH[0]);
    expect(() => vietQrDong(KENH_THANH_TOAN.vietqr, 490_000, noiDungTsu('ABCDEFGH'))).not.toThrow();
  });
});
