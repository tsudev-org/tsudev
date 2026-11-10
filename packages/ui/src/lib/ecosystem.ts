/**
 * Danh mục sản phẩm của hệ sinh thái tsudev - các app có WEBSITE RIÊNG (*.tsudev.com)
 * hoặc trang phát hành riêng trên GitHub, nằm NGOÀI cơ sở dữ liệu của tsudev.com.
 *
 * Vì sao là dữ liệu tĩnh chứ không phải bảng `Project` trong DB:
 *  - Đây là danh bạ ĐIỀU HƯỚNG ra các website khác, không phải bản phát hành do
 *    tsudev.com niêm phong + ký. Bản phát hành có chữ ký vẫn đi qua `/projects`.
 *  - SiteFooter (packages/ui) cũng cần danh sách này, mà footer không gọi API.
 *
 * Mọi đường link dưới đây ĐÃ ĐO ngày 10/11/2026 (curl: website 200 kèm <title>
 * đúng sản phẩm; `releases/latest` có bản phát hành; gói winget có thư mục phiên
 * bản trong microsoft/winget-pkgs). Thêm mục mới thì đo lại như vậy - một nút
 * "Tải về" trỏ vào trang 404 tệ hơn không có nút.
 *
 * Repo nằm ở `tsudev-org` - KHÔNG BAO GIỜ trỏ về tên cũ dưới `tsudev-tsudev`
 * (xem CLAUDE.md: tên repo cũ là bất khả xâm phạm).
 */

export type EcoPlatform = 'windows' | 'android' | 'apple' | 'linux';

export const ECO_PLATFORM_LABEL: Record<EcoPlatform, string> = {
  windows: 'Windows',
  android: 'Android',
  apple: 'macOS / iOS',
  linux: 'Linux',
};

export type EcoCategory = 'system' | 'files' | 'network' | 'utility';

export const ECO_CATEGORY_LABEL: Record<EcoCategory, string> = {
  system: 'Hệ thống',
  files: 'Tệp & dữ liệu',
  network: 'Mạng & chia sẻ',
  utility: 'Tiện ích',
};

export type EcoApp = {
  /** Khoá ổn định - dùng cho React key và tham số chọn nhiều. */
  id: string;
  name: string;
  /** Một dòng, hiện trên thẻ. */
  tagline: string;
  category: EcoCategory;
  platforms: EcoPlatform[];
  /** Trang sản phẩm riêng - mở tab mới. */
  website?: string;
  /** Trang phát hành mới nhất (GitHub Releases) - mở tab mới. */
  releases?: string;
  /** Mã gói winget ĐÃ có trong microsoft/winget-pkgs. */
  winget?: string;
  /** Mã nguồn mở hay độc quyền - hiện thành nhãn. */
  openSource: boolean;
  /** Ghi công dự án gốc (bắt buộc với bản Việt hoá theo giấy phép). */
  basedOn?: string;
};

export const ECOSYSTEM_APPS: EcoApp[] = [
  {
    id: 'trafficmonitor',
    name: 'TrafficMonitor-VN',
    tagline:
      'Theo dõi tốc độ mạng, CPU, RAM ngay trên thanh tác vụ Windows - tiếng Việt, gia cố bảo mật.',
    category: 'system',
    platforms: ['windows'],
    website: 'https://trafficmonitor.tsudev.com',
    releases: 'https://github.com/tsudev-org/tsudev-trafficmonitor/releases/latest',
    openSource: true,
    basedOn: 'TrafficMonitor',
  },
  {
    id: 'cwico',
    name: 'cwico',
    tagline:
      'Rà quét sâu và gỡ phần mềm thừa trên Windows - chặn cứng thành phần hệ thống, tạo điểm khôi phục trước mỗi lần chạy.',
    category: 'system',
    platforms: ['windows'],
    website: 'https://cwico.tsudev.com',
    releases: 'https://github.com/tsudev-org/tsudev-cwico/releases/latest',
    winget: 'tsudev.cwico',
    openSource: true,
  },
  {
    id: 'swico',
    name: 'tsudev SWICO',
    tagline:
      'Kiểm tra bản quyền Windows, Office và thu thập cấu hình phần cứng bằng một tệp .exe - dữ liệu không rời khỏi máy.',
    category: 'system',
    platforms: ['windows'],
    website: 'https://swico.tsudev.com',
    releases: 'https://github.com/tsudev-org/tsudev-swico/releases/latest',
    winget: 'tsudev.SWICO',
    openSource: true,
  },
  {
    id: 'files',
    name: 'tsudev-files',
    tagline: 'Chuyển đổi tệp ngoại tuyến bằng kéo thả - hơn 260 định dạng, không tải tệp lên mạng.',
    category: 'files',
    platforms: ['windows', 'apple', 'linux'],
    website: 'https://files.tsudev.com',
    openSource: true,
    basedOn: 'Filee',
  },
  {
    id: 'lotus',
    name: 'tsudev-lotus',
    tagline:
      'Gửi tệp và tin nhắn giữa điện thoại, máy tính trong cùng mạng Wi-Fi - không cần Internet, mã hoá đầu cuối.',
    category: 'network',
    platforms: ['windows', 'android', 'apple', 'linux'],
    website: 'https://lotus.tsudev.com',
    openSource: true,
    basedOn: 'LocalSend',
  },
  {
    id: 'compass',
    name: 'La bàn',
    tagline:
      'La bàn thông minh: bắc thực theo mô hình từ trường WMM, toạ độ, độ cao, thước thuỷ - không quảng cáo theo dõi.',
    category: 'utility',
    platforms: ['android'],
    website: 'https://compass.tsudev.com',
    openSource: false,
  },
  {
    id: 'contact',
    name: 'tsudev-contact',
    tagline: 'Chuyển danh bạ CSV sang vCard (.vcf) để nạp vào điện thoại, có xem trước từng trang.',
    category: 'files',
    platforms: ['windows'],
    releases: 'https://github.com/tsudev-org/tsudev-contact/releases/latest',
    openSource: true,
  },
];

/** Lệnh winget cài MỘT LƯỢT mọi app đã chọn (chỉ app có gói winget). */
export function wingetCommand(apps: EcoApp[]): string {
  const ids = apps.map((a) => a.winget).filter((x): x is string => Boolean(x));
  if (ids.length === 0) return '';
  return ids.map((id) => `winget install --id ${id} -e --accept-package-agreements`).join(' ; ');
}
