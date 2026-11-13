/**
 * BẢNG ICON - dữ liệu thuần, tách khỏi component.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * MÀU ĐI THEO CHỨC NĂNG, KHÔNG THEO Ý THÍCH TỪNG TRANG
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Mỗi icon gắn cứng với MỘT nhóm hành động, và nhóm đó quyết định màu:
 *
 *   nav     xanh dương  điều hướng, liên kết, mở
 *   create  xanh lá     tạo, thêm, tải lên, tải về
 *   edit    hổ phách    sửa, cấu hình, vận hành
 *   danger  đỏ          xoá, thu hồi, huỷ, cảnh báo
 *   info    tím         siêu dữ liệu, thời gian, số liệu, nền tảng
 *   trust   ngọc        con dấu, xác minh, chữ ký, bảo mật
 *
 * Vì sao gắn cứng chứ không cho truyền màu: khi mỗi trang tự chọn, cùng một
 * hành động "xoá" sẽ đỏ ở trang này và xám ở trang kia, và người dùng mất khả
 * năng đọc màu như một tín hiệu. Cần một sắc khác nghĩa là cần một CHỨC NĂNG
 * khác - thêm vào bảng, đừng ghi đè tại chỗ gọi.
 *
 * Sáu màu được canh tương phản ≥4.5:1 với cả ba tầng bề mặt ở CẢ BA chế độ
 * (`test/contrast.test.ts`). Icon ở đây mang thông tin, nên nó chịu ngưỡng của
 * CHỮ chứ không phải của đồ hoạ trang trí.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * QUY TẮC VẼ - theo đúng để bộ icon trông như MỘT bộ
 * ──────────────────────────────────────────────────────────────────────────────
 *
 *   · lưới 24×24, vùng an toàn 2px mỗi bên (nét nằm trong 2..22)
 *   · nét 1.6, `strokeLinecap="round"`, `strokeLinejoin="round"`
 *   · KHÔNG tô (`fill`), chỉ nét - trừ `dot` dùng `circle` đặc có chủ đích, và
 *     bốn DẤU HIỆU HÃNG nền tảng (`fill: true`, xem khối "nền tảng phát hành")
 *   · không nét nào mảnh hơn 1.6: ở 16px nó biến mất trên màn hình thường
 *   · hình học càng ít điểm càng tốt; icon 20 điểm ở 16px chỉ là một vệt xám
 *
 * Vẽ TAY, không nhập thư viện ngoài. Ba lý do, cả ba đều thật: (1) đây là bộ
 * biểu tượng RIÊNG của tsudev, nhập Lucide là mang bộ icon mà hàng vạn site
 * khác đang dùng; (2) app chạy trên Cloudflare Workers nên mỗi dependency là
 * bundle phải trả tiền; (3) hệ màu theo vai trò ở trên không tồn tại trong bất
 * kỳ thư viện nào, nên nhập vào rồi cũng phải bọc lại.
 *
 * `npm run icons:check` canh ba chuyện: mọi `IconName` được dùng trong mã phải
 * có trong bảng này, mọi icon trong bảng phải có `role` hợp lệ, và mọi đường vẽ
 * phải nằm trong vùng an toàn.
 */

export type IconRole = 'nav' | 'create' | 'edit' | 'danger' | 'info' | 'trust';

export type IconSpec = {
  role: IconRole;
  /** Đường vẽ chính. */
  d: string;
  /** `[cx, cy, r]` - hình tròn vẽ THÊM, không thay cho `d`. */
  circle?: readonly [number, number, number];
  /** Hình tròn ĐẶC (có `fill`). Chỉ dùng cho chấm trạng thái. */
  solidCircle?: readonly [number, number, number];
  /** `d` là hình ĐẶC chứ không phải nét. Chỉ dành cho dấu hiệu hãng (nền tảng). */
  fill?: boolean;
  /** Dấu hiệu của hãng nào - quyết định màu hãng khi rê chuột. */
  brand?: PlatformBrand;
};

export type PlatformBrand = 'windows' | 'android' | 'apple' | 'linux';

export const ICONS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // nav - điều hướng, liên kết, mở
  // ═══════════════════════════════════════════════════════════════════════════
  home: { role: 'nav', d: 'M3.5 10.5 12 3.5l8.5 7M5.5 9.2V20h13V9.2M9.8 20v-5.5h4.4V20' },
  external: {
    role: 'nav',
    d: 'M14 4h6v6M20 4l-8.5 8.5M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5',
  },
  search: { role: 'nav', circle: [11, 11, 7], d: 'M20 20l-3.2-3.2' },
  chevron: { role: 'nav', d: 'M9 5l7 7-7 7' },
  'chevron-down': { role: 'nav', d: 'M5 9l7 7 7-7' },
  'chevron-left': { role: 'nav', d: 'M15 5l-7 7 7 7' },
  'arrow-right': { role: 'nav', d: 'M4 12h15M13 6l6 6-6 6' },
  'arrow-left': { role: 'nav', d: 'M20 12H5M11 6l-6 6 6 6' },
  // Mũi tên chéo lên-phải: nút mở trang ở tab mới (thay ký tự ↗ - ký tự đó vẽ theo
  // phông, lệch cỡ và lệch nét so với icon đi cạnh).
  'arrow-up-right': { role: 'nav', d: 'M7 17 17 7M8.5 7H17v8.5' },
  'arrow-up': { role: 'nav', d: 'M12 20V5M6 11l6-6 6 6' },
  doc: { role: 'nav', d: 'M6 3h7l5 5v13H6zM13 3v5h5M9 12.5h6M9 16.5h6' },
  menu: { role: 'nav', d: 'M4 6.5h16M4 12h16M4 17.5h16' },
  close: { role: 'nav', d: 'M6 6l12 12M18 6L6 18' },
  link: {
    role: 'nav',
    d: 'M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1.5 1.5M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1.5-1.5',
  },
  grid: { role: 'nav', d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  list: { role: 'nav', d: 'M4 6.5h2M9 6.5h11M4 12h2M9 12h11M4 17.5h2M9 17.5h11' },
  filter: { role: 'nav', d: 'M3.5 5.5h17l-6.5 7.5V20l-4-2.5v-4.5z' },
  sort: { role: 'nav', d: 'M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3' },
  book: {
    role: 'nav',
    d: 'M4 5a1 1 0 0 1 1-1h6v16H5a1 1 0 0 1-1-1zM20 5a1 1 0 0 0-1-1h-6v16h6a1 1 0 0 0 1-1zM11 4v16',
  },
  rss: { role: 'nav', solidCircle: [6, 18, 1.6], d: 'M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8' },

  // ═══════════════════════════════════════════════════════════════════════════
  // create - tạo, thêm, tải lên, tải về
  // ═══════════════════════════════════════════════════════════════════════════
  plus: { role: 'create', d: 'M12 5v14M5 12h14' },
  upload: {
    role: 'create',
    d: 'M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  },
  // Mũi tên CHĨA XUỐNG, đối xứng với `upload`. Cặp này phải đọc được ngay cả
  // khi đứng riêng, nên cùng một khay dưới và chỉ khác chiều mũi tên.
  download: {
    role: 'create',
    d: 'M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  },
  check: { role: 'create', d: 'M4.5 12.5l5 5 10-10' },
  'check-circle': { role: 'create', circle: [12, 12, 8.5], d: 'M8.4 12.2l2.6 2.6 4.6-5' },
  save: { role: 'create', d: 'M5 4h11l3 3v13H5zM8.5 4v5h7V4M8.5 20v-5.5h7V20' },
  copy: { role: 'create', d: 'M9 9h10v11H9zM15 9V4H5v10h4' },
  send: { role: 'create', d: 'M20.5 3.5 3.5 10l6.5 2.8L13 20z M10 12.8 20.5 3.5' },
  package: {
    role: 'create',
    d: 'M12 3.2 20.5 7.5v9L12 20.8 3.5 16.5v-9zM3.5 7.5 12 11.8l8.5-4.3M12 11.8v9M7.7 5.3l8.6 4.4',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // edit - sửa, cấu hình, vận hành
  // ═══════════════════════════════════════════════════════════════════════════
  edit: { role: 'edit', d: 'M4 20h4L19 9l-4-4L4 16v4zM14.5 5.5l4 4' },
  settings: {
    role: 'edit',
    circle: [12, 12, 3.2],
    d: 'M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9',
  },
  pen: { role: 'edit', d: 'M4.5 19.5 9 18l10-10a2.5 2.5 0 0 0-3.5-3.5L5.5 14.5zM14.5 5.5l4 4' },
  refresh: {
    role: 'edit',
    d: 'M20 6v5h-5M4 18v-5h5M19.3 13a7.5 7.5 0 0 1-12.6 3.4L4 13.8M4.7 11a7.5 7.5 0 0 1 12.6-3.4L20 10.2',
  },
  play: { role: 'edit', d: 'M7 4.5 19 12 7 19.5z' },
  pause: { role: 'edit', d: 'M8.5 4.5v15M15.5 4.5v15' },
  stop: { role: 'edit', d: 'M5.5 5.5h13v13h-13z' },
  sliders: {
    role: 'edit',
    circle: [9, 7, 2.4],
    d: 'M4 7h2.6M11.4 7H20M4 17h5.6M14.4 17H20M12 14.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8',
  },
  flag: { role: 'edit', d: 'M5.5 20V4.5h10l-1.5 4 1.5 4h-10' },
  bell: { role: 'edit', d: 'M6.5 10a5.5 5.5 0 0 1 11 0v4l1.5 3H5l1.5-3zM10 20a2.2 2.2 0 0 0 4 0' },

  // ═══════════════════════════════════════════════════════════════════════════
  // danger - xoá, thu hồi, huỷ, cảnh báo
  // ═══════════════════════════════════════════════════════════════════════════
  trash: {
    role: 'danger',
    d: 'M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5V20a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V6.5M10 11v5M14 11v5',
  },
  warning: { role: 'danger', d: 'M12 3.5 21 20H3zM12 9.5v4.5M12 16.8v.2' },
  'x-circle': { role: 'danger', circle: [12, 12, 8.5], d: 'M9 9l6 6M15 9l-6 6' },
  ban: { role: 'danger', circle: [12, 12, 8.5], d: 'M6 6l12 12' },
  'lock-open': { role: 'danger', d: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 5.8-1' },

  // ═══════════════════════════════════════════════════════════════════════════
  // info - siêu dữ liệu, thời gian, số liệu, nền tảng
  // ═══════════════════════════════════════════════════════════════════════════
  clock: { role: 'info', circle: [12, 12, 8.5], d: 'M12 7.2V12l3.2 2' },
  tag: { role: 'info', d: 'M3.5 11.4V4.5a1 1 0 0 1 1-1h6.9l9.1 9.1-7.9 7.9zM8 8v.2' },
  info: { role: 'info', circle: [12, 12, 8.5], d: 'M12 11v5.5M12 7.8v.2' },
  question: {
    role: 'info',
    circle: [12, 12, 8.5],
    d: 'M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.4M12 16.8v.2',
  },
  calendar: { role: 'info', d: 'M4.5 6.5h15V20h-15zM4.5 11h15M8.5 4v3M15.5 4v3' },
  user: { role: 'info', circle: [12, 8, 3.6], d: 'M5 20.5a7 7 0 0 1 14 0' },
  users: {
    role: 'info',
    circle: [9.5, 8, 3.2],
    d: 'M3.5 20.5a6 6 0 0 1 12 0M16 5.3a3.2 3.2 0 0 1 0 5.4M17.5 15.6a6 6 0 0 1 3 4.9',
  },
  chart: { role: 'info', d: 'M4 20h16M7 20v-6M12 20V7M17 20v-9' },
  activity: { role: 'info', d: 'M3 12h3.5l2.5-6 3 13 3-8 2 1h4' },
  database: {
    role: 'info',
    d: 'M4.5 6.5c0-1.4 3.4-2.5 7.5-2.5s7.5 1.1 7.5 2.5-3.4 2.5-7.5 2.5S4.5 7.9 4.5 6.5M4.5 6.5v11c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-11M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5',
  },
  server: { role: 'info', d: 'M4.5 4.5h15v6h-15zM4.5 13.5h15v6h-15zM8 7.5v.2M8 16.5v.2' },
  folder: { role: 'info', d: 'M4 6.5a1 1 0 0 1 1-1h4l2 2.5h8a1 1 0 0 1 1 1V19H4z' },
  image: { role: 'info', circle: [9, 9.5, 1.8], d: 'M4 5h16v14H4zM4 16l4.5-4 4 3.5L16 12l4 4' },
  code: { role: 'info', d: 'M9 7.5 4.5 12 9 16.5M15 7.5 19.5 12 15 16.5' },
  mail: { role: 'info', d: 'M4 6h16v12H4zM4 6.5l8 6 8-6' },
  // --- nền tảng phát hành ---
  // DẤU HIỆU CHÍNH THỨC của hãng, KHÔNG vẽ tay (đổi 05/11/2026 theo yêu cầu chủ
  // dự án - bản vẽ tay trước đó chỉ là dáng xấp xỉ, nhìn không ra hãng ở 15px).
  // Dùng logo hãng để báo "có bản cho nền tảng này" là cách dùng DANH NGHĨA
  // (nominative use) - đúng việc mọi trang tải phần mềm đều làm - không phải
  // mượn nhãn hiệu làm nhận diện của tsudev.
  //
  // Nguồn: bản `mono` 24×24 của thesvg.org (github.com/glincker/thesvg).
  // Giấy phép từng dấu hiệu theo danh mục của họ: Apple, Linux (Tux) CC0-1.0;
  // Android CC-BY-3.0 (Google) - ghi công ở `docs/design-system.md` §Icon nền
  // tảng, đừng xoá dòng đó; Windows: hình bốn ô vuông của Windows 11, viết lại
  // path vì danh mục không có bản mono.
  //
  // Ba điểm KHÁC bộ icon nét ở trên, cố ý:
  //   · `fill: true` - logo hãng là hình đặc; vẽ nét quanh nó là méo dấu hiệu.
  //   · Icon.tsx vẽ chúng trong viewBox nới 2 đơn vị mỗi bên, nên khối đặc nằm
  //     đúng vùng an toàn 2..22 như icon nét và không trông to hơn hàng xóm.
  //   · `brand` - khi rê chuột vào ô chứa (`PLATFORM_CHIP_CLASS`), ô ra MÀU HÃNG
  //     và dấu hiệu đổi sang mực tương phản. Mặc định vẫn một màu theo `role`.
  //     Cặp màu hãng/mực bị contrast.test.ts canh ở cả ba chế độ.
  android: {
    role: 'info',
    fill: true,
    brand: 'android',
    d: 'M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z',
  },
  windows: {
    role: 'info',
    fill: true,
    brand: 'windows',
    d: 'M1.5 1.5h10v10h-10zm11 0h10v10h-10zm-11 11h10v10h-10zm11 0h10v10h-10z',
  },
  apple: {
    role: 'info',
    fill: true,
    brand: 'apple',
    d: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701',
  },
  linux: {
    role: 'info',
    fill: true,
    brand: 'linux',
    d: 'M12.504 0c-.155 0-.315 .008-.48 .021-4.226 .333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278 .832-.41 1.684-.287 2.489a.424 .424 0 0 0-.11 .135c-.26 .268-.45 .6-.663 .839-.199 .199-.485 .267-.797 .4-.313 .136-.658 .269-.864 .68-.09 .189-.136 .394-.132 .602 0 .199 .027 .4 .055 .536 .058 .399 .116 .728 .04 .97-.249 .68-.28 1.145-.106 1.484 .174 .334 .535 .47 .94 .601 .81 .2 1.91 .135 2.774 .6 .926 .466 1.866 .67 2.616 .47 .526-.116 .97-.464 1.208-.946 .587-.003 1.23-.269 2.26-.334 .699-.058 1.574 .267 2.577 .2 .025 .134 .063 .198 .114 .333l.003 .003c.391 .778 1.113 1.132 1.884 1.071 .771-.06 1.592-.536 2.257-1.306 .631-.765 1.683-1.084 2.378-1.503 .348-.199 .629-.469 .649-.853 .023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357 .357 0 0 0-.19-.064c.431-1.278 .264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368 .026-2.152 .236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396 .062 .584 .198 .19 .135 .33 .332 .438 .533 .105 .259 .158 .459 .166 .724 0-.02 .006-.04 .006-.06v.105a.086 .086 0 0 1-.004-.021l-.004-.024a1.807 1.807 0 0 1-.15 .706 .953 .953 0 0 1-.213 .335 .71 .71 0 0 0-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 0 0-.22-.066c.05-.06 .146-.133 .183-.198 .053-.128 .082-.264 .088-.402v-.02a1.21 1.21 0 0 0-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176 .03-.262 .132a.8 .8 0 0 0-.205 .334 1.18 1.18 0 0 0-.09 .4v.019c.002 .089 .008 .179 .02 .267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 0 1-.018-.2v-.02a1.772 1.772 0 0 1 .15-.768c.082-.22 .232-.406 .43-.533a.985 .985 0 0 1 .594-.2zm-2.962 .059h.036c.142 0 .27 .048 .399 .135 .146 .129 .264 .288 .344 .465 .09 .199 .14 .4 .153 .667v.004c.007 .134 .006 .2-.002 .266v.08c-.03 .007-.056 .018-.083 .024-.152 .055-.274 .135-.393 .2 .012-.09 .013-.18 .003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613 .613 0 0 0-.166-.267 .248 .248 0 0 0-.183-.064h-.021c-.071 .006-.13 .04-.186 .132a.552 .552 0 0 0-.12 .27 .944 .944 0 0 0-.023 .33v.015c.012 .135 .037 .2 .08 .334 .046 .134 .098 .2 .166 .268 .01 .009 .02 .018 .034 .024-.07 .057-.117 .07-.176 .136a.304 .304 0 0 1-.131 .068 2.62 2.62 0 0 1-.275-.402 1.772 1.772 0 0 1-.155-.667 1.759 1.759 0 0 1 .08-.668 1.43 1.43 0 0 1 .283-.535c.128-.133 .26-.2 .418-.2zm1.37 1.706c.332 0 .733 .065 1.216 .399 .293 .2 .523 .269 1.052 .468h.003c.255 .136 .405 .266 .478 .399v-.131a.571 .571 0 0 1 .016 .47c-.123 .31-.516 .643-1.063 .842v.002c-.268 .135-.501 .333-.775 .465-.276 .135-.588 .292-1.012 .267a1.139 1.139 0 0 1-.448-.067 3.566 3.566 0 0 1-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47 .193-.6 .224-.135 .38-.271 .483-.336 .104-.074 .143-.102 .176-.131h.002v-.003c.169-.202 .436-.47 .839-.601 .139-.036 .294-.065 .466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473 .286 .534 .855 1.659 1.102 3.024 .156-.005 .33 .018 .513 .064 .646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335 .59 .534 1.365 1.572 1.646 2.757 .13 .535 .16 1.104 .021 1.67 .067 .028 .135 .06 .205 .067 1.032 .534 1.413 .938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77 .465-.008 .043-.013 .066-.018 .135-.068 .023-.139 .053-.209 .064-.43 .268-.662 .669-.793 1.187-.13 .533-.17 1.156-.205 1.869v.003c-.02 .334-.17 .838-.319 1.35-1.5 1.072-3.58 1.538-5.348 .334a2.645 2.645 0 0 0-.402-.533 1.45 1.45 0 0 0-.275-.333c.182 0 .338-.03 .465-.067a.615 .615 0 0 0 .314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645 .245-1.07 .873-2.11 1.274-2.763 .107-.065 .037 .135-.408 .974-.396 .751-1.14 2.497-.122 3.854a8.123 8.123 0 0 1 .647-2.876c.564-1.278 1.743-3.504 1.836-5.268 .048 .036 .217 .135 .289 .202 .218 .133 .38 .333 .59 .465 .21 .201 .477 .335 .876 .335 .039 .003 .075 .006 .11 .006 .412 0 .73-.134 .997-.268 .29-.134 .52-.334 .74-.4h.005c.467-.135 .835-.402 1.044-.7zm2.185 8.958c.037 .6 .343 1.245 .882 1.377 .588 .134 1.434-.333 1.791-.765l.211-.01c.315-.007 .577 .01 .847 .268l.003 .003c.208 .199 .305 .53 .391 .876 .085 .4 .154 .78 .409 1.066 .486 .527 .645 .906 .636 1.14l.003-.007v.018l-.003-.012c-.015 .262-.185 .396-.498 .595-.63 .401-1.746 .712-2.457 1.57-.618 .737-1.37 1.14-2.036 1.191-.664 .053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025 .056-1.69 .176-.668 .428-1.344 .463-1.897 .037-.714 .076-1.335 .195-1.814 .12-.465 .308-.797 .641-.984l.045-.022zm-10.814 .049h.01c.053 0 .105 .005 .157 .014 .376 .055 .706 .333 1.023 .752l.91 1.664 .003 .003c.243 .533 .754 1.064 1.189 1.637 .434 .598 .77 1.131 .729 1.57v.006c-.057 .744-.48 1.148-1.125 1.294-.645 .135-1.52 .002-2.395-.464-.968-.536-2.118-.469-2.857-.602-.369-.066-.61-.2-.723-.4-.11-.2-.113-.602 .123-1.23v-.004l.002-.003c.117-.334 .03-.752-.027-1.118-.055-.401-.083-.71 .043-.94 .16-.334 .396-.4 .69-.533 .294-.135 .64-.202 .915-.47h.002v-.002c.256-.268 .445-.601 .668-.838 .19-.201 .38-.336 .663-.336zm7.159-9.074c-.435 .201-.945 .535-1.488 .535-.542 0-.97-.267-1.28-.466-.154-.134-.28-.268-.373-.335-.164-.134-.144-.333-.074-.333 .109 .016 .129 .134 .199 .2 .096 .066 .215 .2 .36 .333 .292 .2 .68 .467 1.167 .467 .485 0 1.053-.267 1.398-.466 .195-.135 .445-.334 .648-.467 .156-.136 .149-.267 .279-.267 .128 .016 .034 .134-.147 .332a8.097 8.097 0 0 1-.69 .468zm-1.082-1.583V5.64c-.006-.02 .013-.042 .029-.05 .074-.043 .18-.027 .26 .004 .063 0 .16 .067 .15 .135-.006 .049-.085 .066-.135 .066-.055 0-.092-.043-.141-.068-.052-.018-.146-.008-.163-.065zm-.551 0c-.02 .058-.113 .049-.166 .066-.047 .025-.086 .068-.14 .068-.05 0-.13-.02-.136-.068-.01-.066 .088-.133 .15-.133 .08-.031 .184-.047 .259-.005 .019 .009 .036 .03 .03 .05v.02h.003z',
  },
  web: {
    role: 'info',
    circle: [12, 12, 8.5],
    d: 'M3.5 12h17M12 3.5c2.2 2.3 3.4 5.3 3.4 8.5S14.2 18.2 12 20.5c-2.2-2.3-3.4-5.3-3.4-8.5S9.8 5.8 12 3.5',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // trust - con dấu, xác minh, chữ ký, bảo mật
  // ═══════════════════════════════════════════════════════════════════════════
  seal: {
    role: 'trust',
    d: 'M12 3l7.5 3.2v5.1c0 4.4-3 8.2-7.5 9.7-4.5-1.5-7.5-5.3-7.5-9.7V6.2zM8.8 12.2l2.4 2.4 4.2-4.6',
  },
  key: { role: 'trust', circle: [8.5, 12, 3.8], d: 'M12.3 12H21M17.5 12v3M20 12v2.2' },
  shield: {
    role: 'trust',
    d: 'M12 3l7.5 3.2v5.1c0 4.4-3 8.2-7.5 9.7-4.5-1.5-7.5-5.3-7.5-9.7V6.2z',
  },
  lock: { role: 'trust', d: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3' },
  fingerprint: {
    role: 'trust',
    d: 'M12 4a8 8 0 0 0-8 8M20 12a8 8 0 0 0-8-8M7.5 13a4.5 4.5 0 0 1 9 0v1.5M10.2 14.2a1.8 1.8 0 0 1 3.6 0v4M6.2 16.5A6 6 0 0 1 6 15M17.8 17v2',
  },
  certificate: { role: 'trust', circle: [12, 9.5, 5], d: 'M9.6 13.8 8.5 20.5l3.5-2 3.5 2-1.1-6.7' },
  // Chữ ký số: ngòi bút kéo một nét trên đường nền. Phân biệt với `pen` (sửa)
  // bằng đường nền ngang - thứ nói "đây là việc ĐÓNG DẤU lên một tài liệu".
  signature: {
    role: 'trust',
    d: 'M3.5 17.5h17M4.5 14c2-5 3.5-7.5 4.5-7.5s1 3 1.5 5.5 1.3 3 2.5 1.5 2-4 3.5-4 2 1.5 2.5 2.5',
  },
  hash: { role: 'trust', d: 'M9 4 7 20M17 4l-2 16M4.5 9h15.5M3.5 15H19' },
  scan: {
    role: 'trust',
    d: 'M4 8.5V5a1 1 0 0 1 1-1h3.5M15.5 4H19a1 1 0 0 1 1 1v3.5M20 15.5V19a1 1 0 0 1-1 1h-3.5M8.5 20H5a1 1 0 0 1-1-1v-3.5M4 12h16',
  },
  globe: {
    role: 'trust',
    circle: [12, 12, 8.5],
    d: 'M3.5 12h17M12 3.5c2.2 2.3 3.4 5.3 3.4 8.5S14.2 18.2 12 20.5',
  },
  eye: {
    role: 'trust',
    circle: [12, 12, 2.8],
    d: 'M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12',
  },
  'eye-off': {
    role: 'trust',
    d: 'M4 4l16 16M9.5 9.7a2.8 2.8 0 0 0 3.9 3.9M6.3 6.5C4 8.2 2.5 12 2.5 12s3.5 5.5 9.5 5.5c1.6 0 3-.4 4.2-1M18.4 15.2c1.9-1.7 3.1-3.2 3.1-3.2S18 6.5 12 6.5c-.6 0-1.2.1-1.7.2',
  },
  // Passkey: người + chìa khoá. Icon này từng được vẽ INLINE trong
  // `pages/login.tsx` - tức một icon mang nghĩa bảo mật nằm ngoài hệ thống màu,
  // nên nó không đổi màu theo chế độ và không bị cổng tương phản nào canh.
  passkey: {
    role: 'trust',
    circle: [9, 8, 3.4],
    d: 'M3.5 20c0-3.2 2.7-5.2 5.5-5.2 0.9 0 1.8 0.2 2.5 0.5M20.5 13.2a2.6 2.6 0 1 0-4 2.2V21l1.4-1.2 1.4 1.2v-5.6c0.7-0.5 1.2-1.3 1.2-2.2z',
  },
  robot: {
    role: 'trust',
    d: 'M6.5 8.5h11v9h-11zM12 8.5V5.5M9.8 12.2v.2M14.2 12.2v.2M9.5 15.2h5M4 11v4M20 11v4',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // chấm trạng thái - hình tròn ĐẶC có chủ đích
  // ═══════════════════════════════════════════════════════════════════════════
  // Lý do dùng `solidCircle` thay vì nét: chấm trạng thái phải đọc được ở 8px,
  // và ở kích thước đó một hình tròn chỉ-nét biến thành một vòng xám mờ.
  dot: { role: 'info', solidCircle: [12, 12, 4], d: '' },
} as const satisfies Record<string, IconSpec>;

export type IconName = keyof typeof ICONS;

/**
 * Class cho Ô CHỨA dấu hiệu nền tảng: rê chuột thì ô ra màu hãng, dấu hiệu bên
 * trong (Icon.tsx gắn `group-hover:text-on-platform-*`) đổi sang mực tương
 * phản. Chuỗi viết NGUYÊN VĂN để Tailwind quét được - đừng ghép chuỗi.
 */
export const PLATFORM_CHIP_CLASS: Record<PlatformBrand, string> = {
  windows: 'group transition-colors hover:bg-platform-windows',
  android: 'group transition-colors hover:bg-platform-android',
  apple: 'group transition-colors hover:bg-platform-apple',
  linux: 'group transition-colors hover:bg-platform-linux',
};

export const PLATFORM_INK_CLASS: Record<PlatformBrand, string> = {
  windows: 'group-hover:text-on-platform-windows',
  android: 'group-hover:text-on-platform-android',
  apple: 'group-hover:text-on-platform-apple',
  linux: 'group-hover:text-on-platform-linux',
};

/** Class ô chứa cho một icon: chuỗi rỗng nếu icon không phải dấu hiệu hãng. */
export function platformChipClass(name: IconName): string {
  const brand = (ICONS[name] as IconSpec).brand;
  return brand ? PLATFORM_CHIP_CLASS[brand] : '';
}

/** Class mực khi rê chuột - cho CHỮ đặt cạnh dấu hiệu trong cùng ô chứa. */
export function platformInkClass(name: IconName): string {
  const brand = (ICONS[name] as IconSpec).brand;
  return brand ? PLATFORM_INK_CLASS[brand] : '';
}

export const ROLE_CLASS: Record<IconRole, string> = {
  nav: 'text-icon-nav',
  create: 'text-icon-create',
  edit: 'text-icon-edit',
  danger: 'text-icon-danger',
  info: 'text-icon-info',
  trust: 'text-icon-trust',
};
