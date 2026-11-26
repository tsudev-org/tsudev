import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container, Logo, ThemeToggle } from '@tsudev/ui';

import type { Viewer } from '../lib/server';

/**
 * Khung trang của trạm điều hành (CP2). CỐ Ý không dùng `Layout`/`SiteHeader` của `@tsudev/ui`: hai thành phần đó
 * gọi `useSession()` (NextAuth chạy ở tsudev.com, không ở đây) và mang menu công khai. Một nền liền mạch, đen tuyền
 * mặc định, bộ chọn chế độ ở chân trang cạnh `© tsudev` như toàn hệ (CLAUDE.md "Giao diện").
 */
const NAV = [
  { href: '/', label: 'Tổng quan' },
  { href: '/accounts', label: 'Tài khoản & phân quyền' },
];

export function ConsoleLayout({
  title,
  viewer,
  children,
}: {
  title: string;
  viewer: Viewer;
  children: React.ReactNode;
}) {
  const { pathname } = useRouter();
  return (
    <div className="flex min-h-screen flex-col font-sans text-fg">
      <Head>
        <title>{`${title} · Trạm điều hành TsuDEV`}</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </Head>
      <header className="border-b border-line">
        <Container className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-fg">
            <Logo size={28} />
            <span>
              tsudev <span className="text-fg-muted">console</span>
            </span>
          </Link>
          <nav aria-label="Điều hành" className="flex flex-wrap gap-4 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname === n.href ? 'page' : undefined}
                className={
                  pathname === n.href ? 'font-semibold text-fg' : 'text-fg-secondary hover:text-fg'
                }
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto text-sm text-fg-secondary">
            {viewer ? (
              <span>
                <span className="font-mono">{viewer.username}</span>
              </span>
            ) : (
              <a href="/login" className="hover:text-fg">
                Đăng nhập ở tsudev.com
              </a>
            )}
          </div>
        </Container>
      </header>
      <main id="main-content" className="flex-1 py-8">
        <Container>{children}</Container>
      </main>
      <footer className="border-t border-line py-4 text-sm text-fg-muted">
        <Container className="flex items-center justify-between gap-4">
          <span>© tsudev · Trạm điều hành</span>
          <ThemeToggle />
        </Container>
      </footer>
    </div>
  );
}
