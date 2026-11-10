import React from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

type LayoutProps = {
  children?: React.ReactNode;
  active?: string;
  bare?: boolean;
};

export const Layout = ({ children, active = '/', bare = false }: LayoutProps) => (
  // KHÔNG đặt bg-base ở đây: nền trang do <body> vẽ (globals.css), và lớp quầng
  // xanh `.tsu-backdrop` nằm ở z-index -1 - một nền đặc ở khung này sẽ che mất nó.
  // Không dùng z-index dương cho <main>: nó tạo ngữ cảnh xếp chồng và nhốt Modal
  // (z-modal) xuống dưới header dính (z-40).
  <div className="min-h-screen flex flex-col text-fg font-sans">
    <div className="tsu-backdrop" style={{ zIndex: -1 }} aria-hidden="true" />
    <SiteHeader active={active} />
    <main
      id="main-content"
      role="main"
      className={bare ? 'flex-1' : 'flex-1 max-w-6xl w-full mx-auto px-4 py-10'}
    >
      {children}
    </main>
    <SiteFooter />
  </div>
);

export default Layout;
