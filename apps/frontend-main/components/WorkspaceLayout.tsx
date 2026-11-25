import React, { useCallback, useRef, useSyncExternalStore } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Layout, Button, Icon, EmptyState } from '@tsudev/ui';
import type { IconName } from '@tsudev/ui';
import { hasAtLeastRole } from '@tsudev/types';
import Seo from './Seo';

/**
 * Vỏ trang của vùng Studio (TDD 4.1, 8.1 - ED-03, UX1-a): thanh bên thu gọn được
 * + thanh tiêu đề dính (đường dẫn vụn + hành động) + vùng làm việc.
 *
 * Giữ `Layout` (SiteHeader + chân trang) bên ngoài để menu tài khoản, đổi giao
 * diện và lối về site công khai vẫn ở đúng chỗ người dùng quen - Studio là MỘT
 * vùng của tsudev.com, không phải một app riêng.
 *
 * Gác ở đây chỉ để dọn giao diện. Cổng quyền THẬT là `requireAuthor` của
 * content-service (đọc `User.role` trong DB, fail closed) - trang nhận 403 thì
 * truyền `denied` vào đây.
 */
export type StudioSection = 'overview' | 'posts' | 'docs' | 'media' | 'review';

type NavItem = {
  key: StudioSection;
  href: string;
  label: string;
  icon: IconName;
  /** Vai trò tối thiểu để HIỆN mục (giao diện - không phải cổng quyền). */
  min?: 'MODERATOR';
  /** Chưa có chức năng ⇒ vẽ "Sắp có" vô hiệu, không ẩn (PR-08). */
  soon?: string;
};

const NAV: NavItem[] = [
  { key: 'overview', href: '/studio', label: 'Tổng quan', icon: 'grid' },
  { key: 'posts', href: '/studio/posts', label: 'Bài viết', icon: 'edit' },
  { key: 'docs', href: '/studio/docs', label: 'Tài liệu', icon: 'book' },
  // Ảnh cần bucket công khai `tsudev-media` (TDD 22.1, SEC-05) - phase UX1-c.
  { key: 'media', href: '/studio/media', label: 'Ảnh', icon: 'image', soon: 'Sắp có' },
  // Hàng chờ chuyển sang /studio/review ở P7 (IA-03); tới lúc đó trỏ trang quản trị.
  {
    key: 'review',
    href: '/admin/review',
    label: 'Hàng chờ duyệt',
    icon: 'check-circle',
    min: 'MODERATOR',
  },
];

// Trạng thái thu gọn sống ở localStorage. `useSyncExternalStore` thay cho
// useState + useEffect: HTML dựng sẵn luôn vẽ bản MỞ (server snapshot), trình
// duyệt đọc lựa chọn đã nhớ ngay lần hydrat - không lệch hydrat, không vi phạm
// `set-state-in-effect`.
const COLLAPSE_KEY = 'tsu-studio-nav';
const listeners = new Set<() => void>();
const readCollapsed = () => {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const setCollapsed = (v: boolean) => {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0');
  } catch {
    /* chế độ riêng tư: chỉ nhớ trong phiên */
  }
  listeners.forEach((fn) => fn());
};

type Props = {
  section: StudioSection;
  /** Tiêu đề trang (h1) và `<title>`. */
  title: string;
  /** Đường dẫn của trang cho `Seo` (noindex). */
  path: string;
  /** Mục cha ở đường dẫn vụn, ví dụ Bài viết khi đang ở trình soạn. */
  parent?: { label: string; href: string };
  /** Nút ở thanh tiêu đề dính (bên phải). */
  actions?: React.ReactNode;
  /** Dòng phụ dưới tiêu đề (trạng thái lưu, nhãn). */
  meta?: React.ReactNode;
  /** Backend trả 403 - vẽ trạng thái thiếu quyền thay nội dung. */
  denied?: boolean;
  children: React.ReactNode;
};

export function WorkspaceLayout({
  section,
  title,
  path,
  parent,
  actions,
  meta,
  denied,
  children,
}: Props) {
  const { data: session, status } = useSession();
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  // Chiều cao thanh tiêu đề dính đổi theo bề rộng (hành động xuống dòng) - đặt
  // thành biến CSS trên vùng nội dung để thanh công cụ trình soạn dính NGAY dưới
  // nó (`.tsu-editor-toolbar`). Ghi thẳng style: không cần vẽ lại React.
  // Callback ref, KHÔNG useEffect([]): thanh được dựng lại khi phiên nạp xong (cây
  // khác nhau trước/sau đăng nhập) - effect một lần theo dõi nút DOM đã gỡ, biến
  // đứng ở chiều cao cũ và thanh công cụ chui dưới thanh tiêu đề (đo 25/11/2026).
  const roRef = useRef<ResizeObserver | null>(null);
  const barRef = useCallback((bar: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    const host = bar?.parentElement;
    if (!bar || !host || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() =>
      host.style.setProperty('--studio-bar-h', `${bar.offsetHeight}px`)
    );
    ro.observe(bar);
    roRef.current = ro;
  }, []);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const nav = NAV.filter((n) => !n.min || hasAtLeastRole(role, n.min));

  let body: React.ReactNode = children;
  if (status === 'loading') {
    body = (
      <div className="grid gap-3" role="status" aria-label="Đang tải">
        <div className="h-24 rounded-lg bg-subtle animate-pulse" />
        <div className="h-48 rounded-lg bg-subtle animate-pulse" />
      </div>
    );
  } else if (!session) {
    body = (
      <div className="max-w-md mx-auto py-12 text-center">
        <p className="text-fg-muted mb-4">Cần đăng nhập bằng tài khoản có quyền đăng bài.</p>
        <Button onClick={() => signIn()}>Đăng nhập</Button>
      </div>
    );
  } else if (denied) {
    body = (
      <EmptyState
        icon="lock"
        title="Chưa có quyền vào Studio"
        explain="Studio dành cho tài khoản có vai trò Đăng bài trở lên. Liên hệ quản trị viên nếu bạn cần quyền này."
        action={{ label: 'Về trang chủ', href: '/' }}
      />
    );
  }

  const item = (n: NavItem) => {
    const on = n.key === section;
    const base = `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm whitespace-nowrap transition-colors ${
      collapsed ? 'md:justify-center md:px-0' : ''
    }`;
    const label = (
      <span className={collapsed ? 'md:sr-only' : ''}>
        {n.label}
        {n.soon && <span className="ml-1.5 text-xs text-fg-muted">· {n.soon}</span>}
      </span>
    );
    if (n.soon) {
      return (
        <span
          key={n.key}
          aria-disabled="true"
          title={`${n.label} - ${n.soon}`}
          className={`${base} text-fg-muted cursor-not-allowed`}
        >
          <Icon name={n.icon} size={16} />
          {label}
        </span>
      );
    }
    return (
      <a
        key={n.key}
        href={n.href}
        title={collapsed ? n.label : undefined}
        aria-current={on ? 'page' : undefined}
        className={`${base} ${
          on ? 'bg-subtle text-fg font-medium' : 'text-fg-secondary hover:bg-hovered hover:text-fg'
        }`}
      >
        <span className={on ? 'text-primary' : ''}>
          <Icon name={n.icon} size={16} />
        </span>
        {label}
      </a>
    );
  };

  return (
    <Layout active="/studio" bare>
      <Seo title={`${title} - Studio`} path={path} noindex />
      <div className="max-w-7xl mx-auto px-4 py-6 md:flex md:gap-6">
        {/* Màn hẹp: thanh bên thành dải tab cuộn ngang TRONG chính nó (trang không cuộn ngang). */}
        <aside
          className={`md:shrink-0 md:transition-[width] md:duration-fast ${
            collapsed ? 'md:w-14' : 'md:w-52'
          }`}
        >
          <nav
            aria-label="Studio"
            className="flex gap-1 overflow-x-auto pb-3 mb-4 border-b border-line md:sticky md:top-20 md:flex-col md:overflow-visible md:border-b-0 md:pb-0 md:mb-0"
          >
            <p
              className={`hidden md:block px-2.5 pb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted ${
                collapsed ? 'md:sr-only' : ''
              }`}
            >
              Studio
            </p>
            {nav.map(item)}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-pressed={collapsed}
              aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
              title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
              className={`hidden md:flex mt-2 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-fg-muted hover:bg-hovered hover:text-fg ${
                collapsed ? 'md:justify-center md:px-0' : ''
              }`}
            >
              <span className={collapsed ? 'rotate-180' : ''}>
                <Icon name="chevron-left" size={16} />
              </span>
              <span className={collapsed ? 'sr-only' : ''}>Thu gọn</span>
            </button>
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Thanh tiêu đề DÍNH: hành động chính luôn trong tầm tay khi cuộn bài dài (ED-04). */}
          <div
            ref={barRef}
            className="sticky top-16 z-30 -mx-4 px-4 py-3 mb-5 border-b border-line flex flex-wrap items-center justify-between gap-3 backdrop-blur-md"
            style={{ backgroundColor: 'color-mix(in srgb, var(--bg-base) 88%, transparent)' }}
          >
            <div className="min-w-0">
              <nav aria-label="Vị trí" className="text-xs text-fg-muted">
                <a href="/studio" className="hover:text-fg">
                  Studio
                </a>
                {parent && (
                  <>
                    <span aria-hidden="true"> / </span>
                    <a href={parent.href} className="hover:text-fg">
                      {parent.label}
                    </a>
                  </>
                )}
              </nav>
              <h1 className="text-xl font-semibold text-fg truncate">{title}</h1>
              {meta && <div className="mt-0.5 text-xs text-fg-muted">{meta}</div>}
            </div>
            {actions && session && !denied && (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            )}
          </div>
          {body}
        </div>
      </div>
    </Layout>
  );
}
