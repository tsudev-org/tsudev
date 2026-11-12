import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { KENH, crc16, kiemKenh, kiemVietQr } from '../lib/ungHo';
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
