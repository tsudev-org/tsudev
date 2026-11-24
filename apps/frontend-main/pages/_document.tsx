import { Html, Head, Main, NextScript } from 'next/document';

// Màu nền của HAI chế độ, phải khớp `--bg-base` trong packages/ui/src/tokens.css
// (bản sinh ra từ .standards/tokens/design-tokens.json). Dùng cho <meta name="theme-color">
// (thanh địa chỉ trên di động) và cho nền vẽ trước khi CSS tải xong.
// test/themeTokens.test.ts canh cho hai giá trị này không trôi lệch khỏi nguồn.
const LIGHT_BASE = '#fafafa';
const DARK_BASE = '#0a0a0a';

/**
 * Áp chế độ hiển thị TRƯỚC KHI TRANG ĐƯỢC VẼ.
 *
 * Phải là script đồng bộ, nội tuyến, đặt trong <head>. Bất cứ thứ gì chạy sau
 * lần vẽ đầu - useEffect, script defer, next/script - đều cho ra một khung hình
 * sáng trắng trước khi chuyển sang tối, và cú nháy đó xuất hiện ở MỌI lần tải
 * trang.
 *
 * Script này GIẢI lựa chọn của người dùng thành một bảng màu cụ thể: 'system'
 * là một lựa chọn được lưu, không phải một bảng màu, nên chỉ ở đây nó mới hỏi
 * `prefers-color-scheme`. Bản thân tokens.css KHÔNG có @media
 * prefers-color-scheme, và đó là điều kiện để mặc định vẫn là Tối (đen tuyền +
 * xanh logo, chủ dự án chọn 16/11/2026) cho khách vãng lai - xem ghi chú ở đầu ThemeToggle.tsx.
 *
 * Bọc trong try/catch vì localStorage ném lỗi khi cookie bên thứ ba bị chặn hoặc
 * khi trang chạy trong iframe sandbox. Hỏng ở đây phải là "hiện chế độ tối mặc
 * định", không phải "trang trắng vì script chết".
 *
 * Cùng lúc, script đọc GỢI Ý PHIÊN `tsu-auth` (packages/ui/src/lib/authHint.ts) và
 * đặt `data-auth="in"` (+ `data-auth-author`, `--tsu-user-name`) lên <html>. Trang
 * công khai là ISR nên HTML luôn dựng ở trạng thái chưa đăng nhập, và `useSession()`
 * chỉ biết phiên SAU một lượt gọi /api/auth/session - trước 13/11/2026 khoảng đó
 * hiện nút "Đăng nhập" rồi mới đổi sang tên người dùng, ở MỌI lần tải trang. Nay
 * SiteHeader vẽ cả hai biến thể khi đang `loading` và CSS ẩn biến thể sai theo thuộc
 * tính này, trước lần vẽ đầu. Gợi ý chỉ để vẽ giao diện - KHÔNG phải bằng chứng đăng
 * nhập; mọi cổng quyền vẫn ở máy chủ.
 *
 * Đổi script này ⇒ cập nhật `THEME_SCRIPT_HASH` trong proxy.ts (test/csp.test.ts bắt).
 */
const PRELOAD_FONTS = [
  'be-vietnam-pro-400-latin',
  'be-vietnam-pro-400-vietnamese',
  'be-vietnam-pro-600-latin',
  'be-vietnam-pro-600-vietnamese',
];

const THEME_SCRIPT = `
(function () {
  var BASE = { light: '${LIGHT_BASE}', dark: '${DARK_BASE}' };
  var mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark' : 'light';
  try {
    var saved = localStorage.getItem('tsudev-theme');
    if (saved === 'system' || saved === null) {
      // Hệ thống (mặc định, PRODUCT_POLICY 1.2): giữ chế độ của máy đã giải ở trên.
    } else if (saved === 'dark' || saved === 'light') {
      mode = saved;
    } else if (saved === 'warm') {
      mode = 'light';
    }
  } catch (e) {}
  var d = document.documentElement;
  d.setAttribute('data-theme', mode);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', BASE[mode]);
  try {
    var h = JSON.parse(localStorage.getItem('tsu-auth') || 'null');
    if (h && typeof h === 'object') {
      d.setAttribute('data-auth', 'in');
      if (h.a === 1) d.setAttribute('data-auth-author', '');
      if (typeof h.n === 'string' && h.n) d.style.setProperty('--tsu-user-name', JSON.stringify(h.n.slice(0, 40)));
    }
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html lang="vi" data-theme="dark" data-product="tsudev">
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        {/* PRELOAD font của màn đầu (25/11/2026, phiếu 20261125-UX2). Không có nó trình duyệt chỉ
            biết cần font SAU KHI tải xong CSS và dựng cây - chữ vẽ bằng font dự phòng rồi đổi
            sang Be Vietnam Pro, cả trang "nhúng" một nhịp ở mỗi lần Ctrl+F5 (đo bằng quay khung
            hình: chữ đổi bề rộng ở ~2,7 s trên mạng 4 Mbps). Chỉ nét 400 + 600, subset latin +
            vietnamese: ~67 KB. Nạp thêm nét khác là tranh băng thông với CSS. `crossOrigin`
            BẮT BUỘC - font luôn tải ở chế độ CORS, thiếu nó thì bản preload bị bỏ và tải lại. */}
        {PRELOAD_FONTS.map((f) => (
          <link
            key={f}
            rel="preload"
            href={`/fonts/${f}.woff2`}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
        {/* Giá trị mặc định là chế độ TỐI; script bên dưới đổi nó khi cần. */}
        <meta name="theme-color" content={DARK_BASE} />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </Head>
      {/* data-platform quyết định cỡ chữ thân bài (DESIGN_SYSTEM.md §7): web dùng
          15px, công cụ desktop dùng 14px. */}
      <body data-platform="web">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
