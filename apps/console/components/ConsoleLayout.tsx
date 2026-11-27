import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container, Logo, ThemeToggle } from '@tsudev/ui';

import { areasFor } from '../lib/areas';
import { useViewer } from '../lib/session';

/**
 * Khung trang của trạm điều hành (CP2). CỐ Ý không dùng `Layout`/`SiteHeader` của `@tsudev/ui`: hai thành phần đó
 * gọi `useSession()` (NextAuth chạy ở tsudev.com, không ở đây) và mang menu công khai. Một nền liền mạch, đen tuyền
 * mặc định, bộ chọn chế độ ở chân trang cạnh `© tsudev` như toàn hệ (CLAUDE.md "Giao diện").
 */
export function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useRouter();
  const viewer = useViewer();
  const current = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <div className="flex min-h-screen flex-col font-sans text-fg">
      <header className="border-b border-line">
        <Container className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-fg">
            <Logo size={28} />
            <span>
              tsudev <span className="text-fg-muted">console</span>
            </span>
          </Link>
          <nav aria-label="Điều hành" className="flex flex-wrap gap-4 text-sm">
            {[{ href: '/', label: 'Tổng quan' }, ...areasFor(viewer?.role)].map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={current(n.href) ? 'page' : undefined}
                className={
                  current(n.href) ? 'font-semibold text-fg' : 'text-fg-secondary hover:text-fg'
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
      <main id="main-content" className="flex-1">
        {children}
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
