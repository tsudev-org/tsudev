import '../styles/globals.css';
import type { AppProps } from 'next/app';

// Không có SessionProvider: phiên đọc ở máy chủ cho từng trang (getServerSideProps) - xem lib/server.ts.
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
