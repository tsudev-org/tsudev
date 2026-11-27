// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DUOI_THEO_NEN_TANG,
  TRAN_BYTE,
  acceptCho,
  duoiHopLe,
  kiemTep,
  thanhLoiApi,
  thongDiepLoi,
  thongDiepPut,
} from '../lib/releaseUpload';

/**
 * Luật tải lên phía giao diện là BẢN CHÉP của content-service. Lệch nhau thì
 * hoặc giao diện chặn một tệp máy chủ nhận, hoặc cho qua một tệp để người dùng
 * đợi tải xong mới bị từ chối - không cái nào làm CI đỏ, nên canh bằng quét NGUỒN.
 */
describe('khớp danh sách trắng của content-service', () => {
  const nguon = readFileSync(
    join(__dirname, '../../../services/content-service/src/objectStore.ts'),
    'utf8'
  );

  test('cùng đuôi cho từng nền tảng', () => {
    // `exe: loai('.exe', ...` ⇒ khoá LOAI → đuôi.
    const duoiCuaLoai: Record<string, string> = {};
    for (const m of nguon.matchAll(/^\s*(\w+): loai\(\s*'([^']+)'/gm)) duoiCuaLoai[m[1]!] = m[2]!;
    const khoi = nguon.match(/RELEASE_FILE_TYPES[^=]*=\s*\{([\s\S]*?)\n\}/);
    expect(khoi).not.toBeNull();
    const mayChu: Record<string, (string | undefined)[]> = {};
    for (const m of khoi![1]!.matchAll(/(\w+):\s*\[([^\]]*)\]/g))
      mayChu[m[1]!] = m[2]!
        .split(',')
        .map((s) => s.trim().replace(/^LOAI\./, ''))
        .filter(Boolean)
        .map((k) => duoiCuaLoai[k]);
    expect(Object.keys(mayChu).length).toBeGreaterThan(0);
    expect(mayChu).toEqual(
      Object.fromEntries(Object.entries(DUOI_THEO_NEN_TANG).map(([k, v]) => [k, [...v!]]))
    );
  });

  test('cùng trần 2 GiB', () => {
    expect(TRAN_BYTE).toBe(2 * 1024 ** 3);
    const khoi = nguon.match(/MAX_RELEASE_BYTES[^=]*=\s*\{([\s\S]*?)\n\}/);
    expect(khoi).not.toBeNull();
    const dong = khoi![1]!.match(/\w+:\s*[^,\n]+/g) ?? [];
    expect(dong.length).toBeGreaterThan(0);
    for (const d of dong) expect(d).toMatch(/:\s*2 \* 1024 \*\* 3$/);
  });

  test('ReleaseManager không còn gửi contentType lên upload-url', () => {
    const comp = readFileSync(join(__dirname, '../components/ReleaseManager.tsx'), 'utf8');
    expect(comp).not.toMatch(/tep\.type/);
    expect(comp).toMatch(/fileSize: tep\.size/);
  });
});

describe('kiểm tệp phía giao diện', () => {
  test('đuôi không phân biệt hoa thường, đuôi dài xét trước', () => {
    expect(duoiHopLe('ANDROID', 'APP.APK')).toBe('.apk');
    expect(duoiHopLe('LINUX', 'x.appimage')).toBe('.AppImage');
    expect(duoiHopLe('LINUX', 'src.tar.gz')).toBe('.tar.gz');
    expect(duoiHopLe('LINUX', 'src.gz')).toBeNull();
    expect(duoiHopLe('ANDROID', '.apk')).toBeNull();
    expect(duoiHopLe('WEB', 'a.zip')).toBeNull();
  });

  test('accept theo nền tảng', () => {
    expect(acceptCho('ANDROID')).toBe('.apk,.aab');
    expect(acceptCho('WEB')).toBeUndefined();
  });

  test('chặn sai đuôi, 0 byte, vượt trần', () => {
    expect(kiemTep('ANDROID', { name: 'a.apk', size: 10 })).toBeNull();
    expect(kiemTep('ANDROID', { name: 'a.exe', size: 10 })).toMatch(/chỉ nhận: \.apk \.aab/);
    expect(kiemTep('ANDROID', { name: 'a.apk', size: 0 })).toMatch(/0 byte/);
    expect(kiemTep('ANDROID', { name: 'a.apk', size: TRAN_BYTE })).toBeNull();
    expect(kiemTep('ANDROID', { name: 'a.apk', size: TRAN_BYTE + 1 })).toBe('Tệp vượt trần 2 GB');
  });

  test('PUT 403 nói ra nguyên nhân', () => {
    expect(thongDiepPut(403)).toBe('Tệp đổi kích thước hoặc URL hết hạn - chọn lại tệp');
    expect(thongDiepPut(500)).toMatch(/HTTP 500/);
  });
});

describe('ánh xạ mã lỗi', () => {
  test('SAI_LOAI_TEP: không gợi ý thử lại, nói đuôi, gợi ý xoá nháp', () => {
    const r = thongDiepLoi({ message: 'x', code: 'SAI_LOAI_TEP', status: 422 }, '.apk');
    expect(r.thuLai).toBe(false);
    expect(r.text).toMatch(/không đúng loại \.apk - đã từ chối niêm phong, bản vẫn là nháp/);
    expect(r.text).toMatch(/Xoá mềm bản nháp/);
    expect(r.text).not.toMatch(/thử lại/i);
  });

  test('502 là lỗi tạm, thử lại được', () => {
    const r = thongDiepLoi({ message: 'Không đọc được tệp', status: 502 });
    expect(r.thuLai).toBe(true);
  });

  test('các mã còn lại', () => {
    expect(
      thongDiepLoi({ message: 'chỉ nhận: .apk', code: 'DUOI_TEP_KHONG_CHO_PHEP', status: 400 })
    ).toEqual({ text: 'chỉ nhận: .apk', thuLai: false });
    expect(thongDiepLoi({ message: 'x', code: 'VUOT_TRAN_KICH_THUOC' }).text).toBe(
      'Tệp vượt trần 2 GB'
    );
    expect(thongDiepLoi({ message: 'x', code: 'FILE_SIZE_KHONG_HOP_LE' }).thuLai).toBe(false);
  });

  test('thanhLoiApi đọc code/status gắn trên Error', () => {
    const e = Object.assign(new Error('m'), { code: 'SAI_LOAI_TEP', status: 422 });
    expect(thanhLoiApi(e)).toEqual({ message: 'm', code: 'SAI_LOAI_TEP', status: 422 });
    expect(thanhLoiApi('chuỗi')).toEqual({ message: 'chuỗi' });
  });
});
