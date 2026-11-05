// Luật tải lên bản phát hành PHÍA GIAO DIỆN (§3.3 kế hoạch ATTT, G3).
//
// Mọi thứ ở đây CHỈ là trải nghiệm: chặn sớm để người dùng không đợi tải 1 GB
// rồi mới bị từ chối. Cổng thật nằm ở content-service (`objectStore.ts`:
// `RELEASE_FILE_TYPES`, `MAX_RELEASE_BYTES`, magic bytes lúc niêm phong) và ở
// chữ ký `Content-Length`/`Content-Type` của URL presign. Danh sách dưới đây là
// BẢN CHÉP của danh sách máy chủ - `test/releaseUpload.test.ts` quét nguồn
// service để hai bên không lệch nhau mà không ai biết.

import type { ReleasePlatform } from './types';

/** Đuôi được phép theo nền tảng - khớp `RELEASE_FILE_TYPES` của content-service. */
export const DUOI_THEO_NEN_TANG: Partial<Record<ReleasePlatform, readonly string[]>> = {
  WINDOWS: ['.exe', '.msi', '.msix', '.zip'],
  ANDROID: ['.apk', '.aab'],
  MACOS: ['.dmg', '.pkg', '.zip'],
  LINUX: ['.AppImage', '.deb', '.rpm', '.tar.gz'],
  SOURCE: ['.zip', '.tar.gz'],
};

/** Trần mỗi tệp - khớp `MAX_RELEASE_BYTES` của content-service (2 GiB mọi nền tảng). */
export const TRAN_BYTE = 2 * 1024 ** 3;

/** Giá trị `accept` cho ô chọn tệp, hoặc undefined nếu nền tảng không có tệp. */
export function acceptCho(platform: ReleasePlatform): string | undefined {
  const ds = DUOI_THEO_NEN_TANG[platform];
  // `.tar.gz` trong `accept` bị một số trình duyệt đọc thành `.gz`; vẫn để
  // nguyên - `accept` chỉ lọc hộp thoại, phép kiểm thật nằm ở `kiemTep`.
  return ds ? ds.join(',') : undefined;
}

/**
 * Đuôi chính tắc của `fileName` nếu nằm trong danh sách của nền tảng, không thì
 * null. Không phân biệt hoa thường; đuôi dài xét trước (`.tar.gz` trước `.gz`) -
 * cùng luật với `loaiTepPhatHanh` của máy chủ.
 */
export function duoiHopLe(platform: ReleasePlatform, fileName: string): string | null {
  const ds = DUOI_THEO_NEN_TANG[platform];
  if (!ds) return null;
  const ten = String(fileName || '').toLowerCase();
  return (
    [...ds]
      .sort((a, b) => b.length - a.length)
      .find((d) => ten.length > d.length && ten.endsWith(d.toLowerCase())) ?? null
  );
}

/** Lỗi chặn sớm của một tệp vừa chọn, hoặc null nếu tệp qua được. */
export function kiemTep(
  platform: ReleasePlatform,
  tep: { name: string; size: number }
): string | null {
  const ds = DUOI_THEO_NEN_TANG[platform];
  if (!ds) return `Nền tảng ${platform} không nhận tệp tải lên - dùng đường dẫn ngoài`;
  if (!duoiHopLe(platform, tep.name))
    return `Đuôi tệp không được phép cho ${platform} - chỉ nhận: ${ds.join(' ')}`;
  if (tep.size <= 0) return 'Tệp rỗng (0 byte) - chọn lại tệp';
  if (tep.size > TRAN_BYTE) return 'Tệp vượt trần 2 GB';
  return null;
}

/** Thông điệp khi kho trả lỗi cho lượt PUT qua URL presign. */
export function thongDiepPut(status: number): string {
  // URL ký cả `Content-Length` lẫn `Content-Type` và có hạn dùng: tệp bị sửa
  // sau khi xin URL, hoặc để quá hạn, đều ra 403. Thử lại cùng URL vô ích.
  if (status === 403) return 'Tệp đổi kích thước hoặc URL hết hạn - chọn lại tệp';
  return `Kho lưu trữ từ chối tệp (HTTP ${status})`;
}

/** Lỗi mà `goiJson` ném: `message` là `body.error`, kèm `code`/`status` nếu có. */
export type LoiApi = { message: string; code?: string; status?: number };

export type ThongDiepLoi = {
  text: string;
  /// Thử lại (bấm "Niêm phong") có thể thành công không. SAI: lỗi nằm ở chính
  /// tệp, thử lại chỉ cho cùng một kết quả.
  thuLai: boolean;
};

/**
 * Ánh xạ lỗi của luồng tải lên/niêm phong sang lời nói với người dùng, theo
 * `code` ổn định của content-service. `duoi` là đuôi của tệp đang xử lý (để
 * nói "không đúng loại .apk").
 */
export function thongDiepLoi(err: LoiApi, duoi?: string | null): ThongDiepLoi {
  switch (err.code) {
    case 'DUOI_TEP_KHONG_CHO_PHEP':
      // Lời máy chủ đã liệt kê đúng danh sách được nhận - giữ nguyên văn.
      return { text: err.message, thuLai: false };
    case 'VUOT_TRAN_KICH_THUOC':
      return { text: 'Tệp vượt trần 2 GB', thuLai: false };
    case 'FILE_SIZE_KHONG_HOP_LE':
      return { text: 'Kích thước tệp không hợp lệ (tệp rỗng?) - chọn lại tệp', thuLai: false };
    case 'SAI_LOAI_TEP':
      return {
        text: `Nội dung tệp không đúng loại ${
          duoi || 'đã khai'
        } - đã từ chối niêm phong, bản vẫn là nháp. Xoá mềm bản nháp này rồi tải lên đúng tệp.`,
        thuLai: false,
      };
  }
  if (err.status === 502)
    return {
      text: `${err.message} (lỗi tạm khi đọc kho lưu trữ)`,
      thuLai: true,
    };
  return { text: err.message, thuLai: true };
}

/** Chuẩn hoá một giá trị `catch` thành `LoiApi`. */
export function thanhLoiApi(err: unknown): LoiApi {
  if (err instanceof Error) {
    const e = err as Error & { code?: unknown; status?: unknown };
    return {
      message: e.message,
      code: typeof e.code === 'string' ? e.code : undefined,
      status: typeof e.status === 'number' ? e.status : undefined,
    };
  }
  return { message: String(err) };
}
