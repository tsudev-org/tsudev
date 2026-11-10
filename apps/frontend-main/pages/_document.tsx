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
 * tím, chủ dự án chọn 10/11/2026) cho khách vãng lai - xem ghi chú ở đầu ThemeToggle.tsx.
 *
 * Bọc trong try/catch vì localStorage ném lỗi khi cookie bên thứ ba bị chặn hoặc
 * khi trang chạy trong iframe sandbox. Hỏng ở đây phải là "hiện chế độ tối mặc
 * định", không phải "trang trắng vì script chết".
 */
const THEME_SCRIPT = `
(function () {
  var BASE = { light: '${LIGHT_BASE}', dark: '${DARK_BASE}' };
  var mode = 'dark';
  try {
    var saved = localStorage.getItem('tsudev-theme');
    if (saved === 'system') {
      mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light';
    } else if (saved === 'dark' || saved === 'light') {
      mode = saved;
    } else if (saved === 'warm') {
      mode = 'light';
    }
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', mode);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', BASE[mode]);
})();
`;

export default function Document() {
  return (
    <Html lang="vi" data-theme="dark">
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
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
