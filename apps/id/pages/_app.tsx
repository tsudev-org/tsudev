import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import NextApp from 'next/app';
import type { AppContext, AppProps } from 'next/app';

import { installSanitizer } from '../lib/sanitize';

// Gắn bộ lọc của chính sách Trusted Types TRƯỚC khi trang nào vẽ (nạp module là chạy).
installSanitizer();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}

/**
 * BẮT BUỘC: tắt tối ưu tĩnh cho MỌI trang của cổng. CSP dùng nonce theo từng request (proxy.ts); trang dựng sẵn lúc
 * build (○) không mang nonce nên trình duyệt chặn toàn bộ script - trang kẹt "Đang tải…" mà máy chủ vẫn trả 200
 * (đã xảy ra ở bản deploy đầu của cổng, 27/11/2026). Cổng là trang tài khoản, `no-store`, nên không mất gì.
 */
App.getInitialProps = async (ctx: AppContext) => NextApp.getInitialProps(ctx);
