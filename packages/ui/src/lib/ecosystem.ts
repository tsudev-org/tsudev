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
 * bản trong microsoft/winget-pkgs; gói Scoop / Homebrew được CI của bucket và tap
 * cài thử thật - đo 11/11/2026; gói `pkg` trong kho APT/RPM pkg.tsudev.com được CI
 * của tsudev-org/linux-packages cài thật trên Ubuntu, Debian, Fedora - đo 11/11/2026). Thêm mục mới thì đo lại như vậy - một nút
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
  /** Gói Scoop trong bucket tsudev-org/scoop-bucket (lệnh `scoop install tsudev/<gói>`). */
  scoop?: string;
  /** Cask trong tap tsudev-org/homebrew-tap (lệnh `brew install --cask tsudev-org/tap/<cask>`). */
  brew?: string;
  /** Gói ĐÃ có trong kho APT/RPM `pkg.tsudev.com` (lệnh `apt install` / `dnf install <gói>`). */
  pkg?: string;
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
    scoop: 'tsudev-trafficmonitor',
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
    scoop: 'tsudev-swico',
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
    scoop: 'tsudev-files',
    brew: 'tsudev-files',
    openSource: true,
    basedOn: 'Filee',
    icon: 'M6 3h7l5 5v4M6 3v18h6M13 3v5h5M14.5 17H21M18.5 14.5 21 17l-2.5 2.5',
  },
  {
    id: 'lotus',
    // Đổi tên thành Lotus Share 12/11/2026 (phiếu ~/projects/logs/handover/20261112-02_yeu-cau-dong-goi-
    // doi-ten-lotus-share.md): repo, gói APT/RPM, Scoop, Homebrew đều là `lotus-share`; gói cũ
    // `tsudev-lotus` chỉ còn là gói chuyển tiếp. Website giữ lotus.tsudev.com. Đo 12/11/2026.
    name: 'Lotus Share',
    tagline:
      'Gửi tệp và tin nhắn giữa điện thoại, máy tính trong cùng mạng Wi-Fi - không cần Internet, mã hoá đầu cuối.',
    category: 'network',
    platforms: ['windows', 'android', 'apple', 'linux'],
    website: 'https://lotus.tsudev.com',
    releases: 'https://github.com/tsudev-org/lotus-share/releases/latest',
    scoop: 'lotus-share',
    brew: 'lotus-share',
    pkg: 'lotus-share',
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

/**
 * Trò chơi của hệ sinh thái (org GitHub `TsuGameLabs`) - chạy trên TRÌNH DUYỆT ở
 * `<id>.tsudev.com` (Cloudflare Pages): không bản cài, không GitHub Releases, repo
 * private. Tách khỏi `ECOSYSTEM_APPS` vì không có lệnh cài, không lọc theo hệ điều hành.
 *
 * Nguồn sự thật: `danh-muc.json` của repo `TsuGameLabs/tsudev-game-kit` (phiếu
 * 20261112-02). `tagline` chép NGUYÊN VĂN `mo_ta` của tệp đó. Đã đo 12/11/2026: trang
 * chủ 200 + `<title>` đúng tên, `og-image.png` 200.
 *
 * CHỈ LIÊN KẾT, không nhúng iframe: game đặt `X-Frame-Options: SAMEORIGIN` và
 * `frame-ancestors 'self'`. KHÔNG đưa link studio World Editor của Núi Cấm 3D (sau
 * Cloudflare Access).
 */
export type EcoGame = {
  id: string;
  name: string;
  /** Thể loại (`the_loai` trong danh-muc.json). */
  genre: string;
  tagline: string;
  website: string;
  openSource: false;
  /** Đường vẽ SVG 24x24, nét 1.6 - cùng ngữ pháp với `EcoApp.icon`. */
  icon: string;
};

export const ECO_GAMES: EcoGame[] = [
  {
    id: 'xin-chao-nui-cam',
    name: 'Xin Chào Núi Cấm',
    genre: 'Trò chơi khám phá',
    tagline:
      'Trò chơi khám phá vùng Núi Cấm (An Giang): ghép các ô cùng cấp trên lưới để nâng dần lên các biểu tượng của Núi Cấm. Phù hợp trẻ em, đồ hoạ tươi sáng, âm thanh nhẹ nhàng.',
    website: 'https://xin-chao-nui-cam.tsudev.com',
    openSource: false,
    icon: 'M3 19 9.5 8l4 6.5 2-3L21 19zM16.5 6a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0',
  },
  {
    id: 'chu-chim-vo-canh',
    name: 'Chú Chim Vỗ Cánh',
    genre: 'Trò chơi hành động',
    tagline:
      'Điều khiển chú chim sáo vỗ cánh bay qua các vách đá Núi Cấm (An Giang), nhặt trái thốt nốt để thêm điểm. Sáu chặng từ Chân núi tới Vồ Bồ Hong, rèn tập trung và phản xạ.',
    website: 'https://chu-chim-vo-canh.tsudev.com',
    openSource: false,
    icon: 'M3 11c3-4 6-4 9 0 3-4 6-4 9 0M12 11v4.5M9.5 18.5h5',
  },
  {
    id: 'lat-manh-ghep',
    name: 'Lật Mảnh Ghép',
    genre: 'Trò chơi giải đố',
    tagline:
      'Lật thẻ tìm cặp hình giống nhau qua nhiều cấp độ và chủ đề - rèn trí nhớ, sự tập trung và tư duy logic.',
    website: 'https://lat-manh-ghep.tsudev.com',
    openSource: false,
    icon: 'M3.5 6h8v12h-8zM14.5 7.5 20 6l2 11.5-5.5 1.5M7.5 10.5v3',
  },
  {
    id: 'noi-hinh-giong-nhau',
    name: 'Nối Hình Giống Nhau',
    genre: 'Trò chơi trí tuệ',
    tagline:
      'Nối các cặp hình giống nhau bằng đường gấp khúc tối đa hai lần rẽ để xoá khỏi bảng; có điểm, combo và cấp độ tăng dần.',
    website: 'https://noi-hinh-giong-nhau.tsudev.com',
    openSource: false,
    icon: 'M4 4h5v5H4zM15 15h5v5h-5zM6.5 9v8.5H15',
  },
  {
    id: 'luyen-go-phim',
    name: 'Luyện Gõ Phím',
    genre: 'Công cụ luyện tập',
    tagline:
      'Luyện gõ phím ngoại tuyến: đo WPM, độ chính xác, theo dõi tiến bộ cục bộ. Phát triển từ dự án mã nguồn mở giấy phép MIT.',
    website: 'https://luyen-go-phim.tsudev.com',
    openSource: false,
    icon: 'M3 7h18v10H3zM6.5 10.5h.01M10 10.5h.01M13.5 10.5h.01M17 10.5h.01M8 14h8',
  },
  {
    id: 'nuicam3d',
    name: 'Núi Cấm 3D',
    genre: 'Trò chơi thế giới mở 3D',
    tagline:
      'Tham quan xã Núi Cấm trong thế giới 3D (three.js + Rapier), có studio World Editor riêng.',
    website: 'https://nuicam3d.tsudev.com',
    openSource: false,
    icon: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  },
];

/**
 * Kho APT/RPM `pkg.tsudev.com` (tsudev-standards PACKAGING.md mục 5). Khóa chính RSA-4096 giữ ngoại tuyến;
 * CI chỉ có khóa con ký. Vân tay này PHẢI khớp `keys/` của tsudev-org/linux-packages.
 */
export const PKG_REPO = {
  url: 'https://pkg.tsudev.com',
  source: 'https://github.com/tsudev-org/linux-packages',
  keyring: 'https://pkg.tsudev.com/tsudev-archive-keyring.gpg',
  fingerprint: '3883 10F4 7FA8 224D 76C0  A9C7 9745 B6AF 3EA3 3C74',
} as const;

/** Lệnh thêm kho APT (dạng `signed-by`, không dùng `apt-key`) rồi cài gói. */
export function aptCommand(pkg: string): string {
  return (
    `curl -fsSL ${PKG_REPO.keyring} | sudo tee /usr/share/keyrings/tsudev.gpg >/dev/null && ` +
    `echo "deb [signed-by=/usr/share/keyrings/tsudev.gpg] ${PKG_REPO.url}/apt stable main" | ` +
    `sudo tee /etc/apt/sources.list.d/tsudev.list >/dev/null && sudo apt update && sudo apt install ${pkg}`
  );
}

/** Lệnh thêm kho RPM rồi cài gói (dnf kiểm chữ ký cả siêu dữ liệu lẫn gói). */
export function dnfCommand(pkg: string): string {
  return `sudo curl -fsSLo /etc/yum.repos.d/tsudev.repo ${PKG_REPO.url}/rpm/tsudev.repo && sudo dnf install ${pkg}`;
}

/** Lệnh winget cài MỘT LƯỢT mọi app đã chọn (chỉ app có gói winget). */
export function wingetCommand(apps: EcoApp[]): string {
  const ids = apps.map((a) => a.winget).filter((x): x is string => Boolean(x));
  if (ids.length === 0) return '';
  return ids.map((id) => `winget install --id ${id} -e --accept-package-agreements`).join(' ; ');
}

/** Mọi lệnh cài bằng terminal của một app, theo thứ tự ưu tiên (tsudev-standards PACKAGING.md). */
export function installCommands(app: EcoApp): { channel: string; cmd: string }[] {
  const out: { channel: string; cmd: string }[] = [];
  if (app.winget) out.push({ channel: 'winget', cmd: `winget install --id ${app.winget} -e` });
  if (app.scoop)
    out.push({
      channel: 'Scoop',
      cmd: `scoop bucket add tsudev https://github.com/tsudev-org/scoop-bucket; scoop install tsudev/${app.scoop}`,
    });
  if (app.brew)
    out.push({ channel: 'Homebrew', cmd: `brew install --cask tsudev-org/tap/${app.brew}` });
  if (app.pkg) {
    out.push({ channel: 'APT', cmd: aptCommand(app.pkg) });
    out.push({ channel: 'DNF', cmd: dnfCommand(app.pkg) });
  }
  return out;
}
