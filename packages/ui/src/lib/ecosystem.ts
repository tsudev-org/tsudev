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
  /**
   * Biểu tượng của app: một đường vẽ SVG nét 1.6 trên lưới 24x24 (cùng ngữ pháp
   * với `ICONS` của packages/ui). Vẽ inline chứ không lấy favicon từ website của
   * app: CSP `img-src` của tsudev.com chỉ cho 'self', và favicon các site con hiện
   * là CÙNG một ảnh thương hiệu chung - không phân biệt được app nào với app nào.
   */
  icon: string;
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
    icon: 'M4.5 17a7.5 7.5 0 1 1 15 0M12 17l3.6-5.2M7.6 13.4h.01M12 9.6v.01M16.4 13.4h.01',
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
    icon: 'M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5.5M14 11v5.5',
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
    icon: 'M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6zM8.8 12.2l2.2 2.2 4.4-4.4',
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
    icon: 'M6 3h7l5 5v4M6 3v18h6M13 3v5h5M14.5 17H21M18.5 14.5 21 17l-2.5 2.5',
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
    icon: 'M20.5 3.5 3.5 10l6.5 2.8L13 20zM10 12.8 20.5 3.5',
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
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
  },
  {
    id: 'contact',
    name: 'tsudev-contact',
    tagline: 'Chuyển danh bạ CSV sang vCard (.vcf) để nạp vào điện thoại, có xem trước từng trang.',
    category: 'files',
    platforms: ['windows'],
    // Website lên 10/11/2026 (phiếu 20261110-04 của repo tsudev-contact; đo 200 + <title>).
    website: 'https://contact.tsudev.com',
    releases: 'https://github.com/tsudev-org/tsudev-contact/releases/latest',
    openSource: true,
    icon: 'M4 5h16v14H4zM9 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.8 16.5a3.4 3.4 0 0 1 6.4 0M14 9.5h4M14 13h4',
  },
];

/** Lệnh winget cài MỘT LƯỢT mọi app đã chọn (chỉ app có gói winget). */
export function wingetCommand(apps: EcoApp[]): string {
  const ids = apps.map((a) => a.winget).filter((x): x is string => Boolean(x));
  if (ids.length === 0) return '';
  return ids.map((id) => `winget install --id ${id} -e --accept-package-agreements`).join(' ; ');
}
