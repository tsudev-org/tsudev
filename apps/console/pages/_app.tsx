import '../styles/globals.css';
import type { AppProps } from 'next/app';

import { installSanitizer } from '../lib/sanitize';
import { ViewerProvider } from '../lib/session';
import type { Viewer } from '../lib/server';

// Gắn bộ lọc của chính sách Trusted Types TRƯỚC khi trang nào vẽ (nạp module là chạy).
installSanitizer();

// Không có SessionProvider: phiên đọc ở máy chủ cho từng trang (getServerSideProps, lib/ssr.ts).
export default function App({ Component, pageProps }: AppProps<{ viewer?: Viewer }>) {
  return (
    <ViewerProvider viewer={pageProps.viewer ?? null}>
      <Component {...pageProps} />
    </ViewerProvider>
  );
}
