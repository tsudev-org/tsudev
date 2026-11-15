import React, { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { hasAtLeastRole } from '@tsudev/types';
import { saveAuthHint } from '../lib/authHint';
// tsudev là MỘT site nên href tương đối. Trước đây có hai origin (trang chính và
// diễn đàn) nên mọi link điều hướng buộc phải là URL tuyệt đối.
type NavItem = {
  key: string;
  path: string;
  label: string;
  needsAuthor?: boolean;
};

const NAV: NavItem[] = [
  { key: 'home', path: '/', label: 'Trang chủ' },
  // Danh bạ app của hệ sinh thái (website riêng, winget) - kiểu winstall.app.
  { key: 'apps', path: '/apps', label: 'Ứng dụng' },
  // "Dự án" (/projects) gỡ khỏi menu 13/11/2026: danh sách đó trống trên production
  // và mọi app thật nằm ở /apps. /projects tự chuyển về /apps khi trống.
  { key: 'blog', path: '/blog', label: 'Blog' },
  { key: 'docs', path: '/docs', label: 'Tài liệu' },
  // Chỉ hiện với tài khoản đăng bài (AUTHOR trở lên). Trang /author tự đá người
  // chưa đủ quyền, nên giấu link để không hứa hão - KHÔNG phải
  // bảo mật (cổng thật là requireAuthor của content-service, đọc DB fail closed).
  { key: 'author', path: '/author', label: 'Viết bài', needsAuthor: true },
];

// Trang truyền `active` theo đường dẫn ('/blog') hoặc theo khoá ('home').
const isActive = (n: NavItem, active: string) => active === n.key || active === n.path;

type SiteHeaderProps = { active?: string };

export const SiteHeader = ({ active = '/' }: SiteHeaderProps) => {
  const { data: session, status } = useSession();
  // ⚠️ Vai trò lấy từ PHIÊN (token.role chỉ ghi ở lần đăng nhập đầu). Chỉ để dọn
  // giao diện, không phải cổng quyền.
  const canAuthor = hasAtLeastRole(
    (session?.user as { role?: string } | undefined)?.role,
    'AUTHOR'
  );
  const userName = session?.user?.name || session?.user?.email || '';
  // `loading` = HTML dựng sẵn + khoảng chờ /api/auth/session. Lúc đó vẽ CẢ HAI biến
  // thể; CSS (globals.css, theo `data-auth` do script ở _document.tsx đặt trước lần
  // vẽ đầu) ẩn biến thể sai. Trước 13/11/2026 nhánh này vẽ nút "Đăng nhập" cho người
  // ĐÃ đăng nhập ở mọi lần tải trang - xem lib/authHint.ts.
  const pending = status === 'loading';
  const [open, setOpen] = useState(false);

  // Ghi gợi ý cho lần tải trang SAU, chỉ khi phiên đã rõ (không xoá lúc loading).
  useEffect(() => {
    if (status === 'authenticated') saveAuthHint({ n: userName, ...(canAuthor ? { a: 1 } : {}) });
    else if (status === 'unauthenticated') saveAuthHint(null);
  }, [status, userName, canAuthor]);

  const logout = () => {
    saveAuthHint(null);
    signOut();
  };

  // Mục "Viết bài": rõ phiên thì lọc thật; đang loading thì giữ lại và để CSS
  // (`tsu-auth-author`) quyết định theo gợi ý.
  const nav = NAV.filter((n) => !n.needsAuthor || canAuthor || pending);
  const navClass = (n: NavItem) => (n.needsAuthor && pending ? ' tsu-auth-author' : '');

  return (
    // Kiểu supabase.com: header CÙNG NỀN với trang (kính mờ trên --bg-base), chỉ một
    // đường hairline ở mép dưới - không dải màu, không vạch chuyển sắc, để trang
    // liền một mạch từ đỉnh tới chân. Nút đổi giao diện nằm ở CHÂN TRANG (SiteFooter).
    <header
      className="sticky top-0 z-40 border-b border-line backdrop-blur-md"
      style={{ backgroundColor: 'color-mix(in srgb, var(--bg-base) 82%, transparent)' }}
    >
      <a href="#main-content" className="skip-link">
        Bỏ qua tới nội dung
      </a>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <a href="/" className="shrink-0" aria-label="tsudev trang chủ">
            <Logo />
          </a>
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Chính">
            {nav.map((n) => (
              <a
                key={n.key}
                href={n.path}
                aria-current={isActive(n, active) ? 'page' : undefined}
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors duration-fast ${
                  isActive(n, active) ? 'text-fg' : 'text-fg-secondary hover:text-fg'
                }${navClass(n)}`}
              >
                {n.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/*
            Ô tìm kiếm của toàn site. Là một <form method="get"> THẬT trỏ vào
            /search, không phải một ô có onSubmit gọi router.

            Vì sao: /search đã đọc `q`, `type`, `tag`, `category`, `sort`, `page`
            từ URL trong getServerSideProps của nó, nên gửi biểu mẫu là đủ để rơi
            đúng vào bộ tìm kiếm đã tối ưu - không cần lặp lại một mẩu logic tìm
            kiếm thứ hai ở đây. Lặp lại chính là thứ đợt này đi xoá: trước
            26/08/2026 ô này KHÔNG có state, KHÔNG có form, KHÔNG có onSubmit -
            gõ vào rồi bấm Enter thì không có gì xảy ra. Nó là một ô trang trí
            nằm ở chỗ dễ thấy nhất của site.

            Thêm nữa `packages/ui` không phụ thuộc next/router, và một biểu mẫu
            GET còn chạy được khi JavaScript chưa kịp tải - cùng lý do với nút
            "Đăng nhập" ngay bên dưới.
          */}
          <form
            action="/search"
            method="get"
            role="search"
            className="hidden xl:flex items-center gap-2 h-8 px-3 rounded-md border border-line bg-surface text-fg-muted transition-colors hover:border-line-strong focus-within:border-primary"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M20 20l-3.2-3.2"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              name="q"
              aria-label="Tìm kiếm bài viết và tài liệu"
              placeholder="Tìm kiếm…"
              className="bg-transparent outline-hidden text-sm text-fg w-40 placeholder:text-fg-muted"
            />
            {/* Enter trong ô đã gửi biểu mẫu; nút này để bàn phím và trình đọc
                màn hình có một đích submit gọi được tên. */}
            <button type="submit" className="sr-only">
              Tìm
            </button>
          </form>
          {(session || pending) && (
            <UserMenu
              pending={pending}
              name={userName}
              email={session?.user?.email || ''}
              image={session?.user?.image || undefined}
              onLogout={logout}
            />
          )}
          {(!session || pending) && (
            // Link chứ không phải nút gọi signIn(): /login là trang thật của site,
            // mở được bằng chuột giữa và chạy cả khi JavaScript chưa tải.
            <div className={`flex items-center gap-2${pending ? ' tsu-auth-out' : ''}`}>
              <a
                href="/login"
                className="inline-flex items-center h-8 px-3 rounded-md border border-line-strong bg-surface text-sm font-medium text-fg transition-colors hover:border-line-control hover:bg-hovered"
              >
                Đăng nhập
              </a>
              <a
                href="/apps"
                className="hidden sm:inline-flex items-center h-8 px-3 rounded-md border border-primary-hover bg-primary text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
              >
                Tải ứng dụng
              </a>
            </div>
          )}
          <button
            className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-secondary hover:bg-subtle hover:text-fg transition-colors"
            aria-label="Menu"
            onClick={() => setOpen(!open)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-line px-4 py-2" aria-label="Di động">
          {nav.map((n) => (
            <a
              key={n.key}
              href={n.path}
              className={`block px-2 py-2.5 rounded-md text-sm text-fg-secondary hover:bg-subtle${navClass(n)}`}
            >
              {n.label}
            </a>
          ))}
          {/*
            Ô tìm kiếm ở thanh trên chỉ hiện từ breakpoint `xl` vì thanh đó đã
            chật. Không có mục này thì máy điện thoại KHÔNG có lối nào tới
            /search - và đợt 26/08/2026 vừa gỡ thanh thẻ khỏi /blog, tức là gỡ
            luôn đường duyệt theo thẻ mà người dùng hẹp màn hình đang dùng.
          */}
          <a
            href="/search"
            className="block px-2 py-2.5 rounded-md text-sm text-fg-secondary hover:bg-subtle"
          >
            Tìm kiếm
          </a>
          {/*
            Trên màn hình hẹp, tên người dùng ở thanh trên bị ẩn (lg:inline), nên
            hai mục này là lối vào DUY NHẤT tới trang tài khoản. Thiếu chúng thì
            người dùng điện thoại không có đường nào tới đó.
          */}
          {(session || pending) && (
            <div className={`mt-1 border-t border-line pt-1${pending ? ' tsu-auth-in' : ''}`}>
              <a
                href="/settings/profile"
                className="block px-2 py-2.5 rounded-md text-sm text-fg-secondary hover:bg-subtle"
              >
                Hồ sơ tài khoản
              </a>
              <a
                href="/settings/security"
                className="block px-2 py-2.5 rounded-md text-sm text-fg-secondary hover:bg-subtle"
              >
                Bảo mật tài khoản
              </a>
            </div>
          )}
        </nav>
      )}
    </header>
  );
};

type UserMenuProps = {
  pending: boolean;
  name: string;
  email: string;
  image?: string;
  onLogout: () => void;
};

/**
 * Avatar + tên tài khoản là MỘT nút mở menu (chủ dự án yêu cầu 13/11/2026): "Hồ sơ
 * tài khoản" và "Đăng xuất". Trước đó nút "Đăng xuất" nằm trần cạnh tên, bấm nhầm
 * một lần là mất phiên.
 *
 * Mẫu disclosure (nút + aria-expanded + danh sách liên kết), KHÔNG phải role="menu":
 * role menu đòi điều hướng bằng phím mũi tên và bắt trình đọc màn hình đổi chế độ,
 * trong khi đây chỉ là hai đích - Tab đi qua là đủ. Đóng khi: Esc (trả focus về nút),
 * bấm ra ngoài, focus rời khỏi khối.
 *
 * Lúc `pending` (phiên chưa về) avatar là vòng tròn trơn và tên lấy từ gợi ý qua CSS
 * (`.tsu-user-name`) - không biết tên thật thì không chọn được biến thể avatar, và
 * vẽ sai một biến thể rồi đổi là đúng kiểu nháy mà authHint đi xoá.
 */
const UserMenu = ({ pending, name, email, image, onLogout }: UserMenuProps) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item =
    'flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-sm text-fg-secondary text-left transition-colors hover:bg-hovered hover:text-fg';

  return (
    <div
      ref={box}
      className={`relative${pending ? ' tsu-auth-in' : ''}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={btn}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="tsu-user-menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 h-8 pl-1 pr-2 rounded-full border border-line bg-surface text-sm text-fg-secondary transition-colors hover:border-line-strong hover:text-fg"
      >
        {pending ? (
          <span className="inline-block h-6 w-6 rounded-full bg-subtle ring-1 ring-line-strong" />
        ) : (
          <Avatar name={name} src={image} size={24} />
        )}
        <span className="hidden lg:inline max-w-36 truncate">
          {pending ? <span className="tsu-user-name" /> : name}
        </span>
        <span className="sr-only lg:hidden">Tài khoản {pending ? '' : name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          id="tsu-user-menu"
          className="absolute right-0 mt-2 w-60 rounded-lg border border-line-strong bg-surface p-1.5 shadow-lg z-50"
        >
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1 border-b border-line">
            <Avatar name={name} src={image} size={32} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg truncate">{name}</p>
              {email && email !== name && <p className="text-xs text-fg-muted truncate">{email}</p>}
            </div>
          </div>
          <a href="/settings/profile" className={item}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            Hồ sơ tài khoản
          </a>
          <button type="button" onClick={onLogout} className={item}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
};

export default SiteHeader;
