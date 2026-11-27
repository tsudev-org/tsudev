import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';

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
