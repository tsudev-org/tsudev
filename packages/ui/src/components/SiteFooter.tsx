import React from 'react';
import { Logo } from './Logo';
import { MAIN_URL } from '../lib/siteUrls';

// Riêng đăng nhập giữ đường dẫn tương đối: phiên next-auth thuộc về chính app
// đang mở, đẩy sang origin khác sẽ đăng nhập nhầm chỗ.
// tsudev là MỘT site nên href tương đối.
type FooterLink = [label: string, href: string];

const eco = (label: string, path: string): FooterLink => [label, path];

type Col = { title: string; links: FooterLink[] };

const COLS: Col[] = [
  {
    title: 'Sản phẩm',
    links: [eco('Ứng dụng & công cụ', '/projects'), eco('Hướng dẫn cài đặt', '/docs')],
  },
  {
    title: 'Nội dung',
    links: [eco('Blog', '/blog'), eco('Tìm kiếm', '/search')],
  },
  {
    title: 'Tài khoản',
    links: [
      // Trang /login của site, không phải trang mặc định của next-auth.
      ['Đăng nhập', '/login'] as FooterLink,
    ],
  },
  {
    title: 'Pháp lý',
    links: [
      eco('Quyền riêng tư', '/privacy'),
      eco('Điều khoản', '/terms'),
      eco('Nội quy', '/rules'),
    ],
  },
];

// Footer mang nền --bg-surface: ranh giới với nội dung là CHÊNH NỀN cộng một
// đường mảnh, nên nó rõ ở cả ba chế độ mà không cần đường kẻ đậm.
export const SiteFooter = () => {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 md:grid-cols-[1.6fr_repeat(4,1fr)]">
        <div>
          <Logo />
          {/*
            Câu này là BẢN MÔ TẢ CHUẨN của hệ sinh thái, chép nguyên văn từ
            `.standards/docs/ECOSYSTEM_IDENTITY.md` mục 1. Tài liệu đó `MUST NOT`
            cho mỗi repo tự nghĩ một câu giới thiệu riêng - một câu lệch ở một
            repo là một mảnh nhận diện lệch. Đổi câu này thì phải đổi ở repo quy
            ước trung tâm trước, đừng sửa tại chỗ.
          */}
          <p className="mt-2.5 text-sm text-fg-muted max-w-xs leading-relaxed">
            <strong className="font-semibold">tsudev</strong> là hệ sinh thái sản phẩm và công cụ
            phần mềm tại{' '}
            <a href={MAIN_URL} className="text-fg-secondary hover:text-link transition-colors">
              tsudev.com
            </a>
            . Mọi sản phẩm trong hệ sinh thái dùng chung một tài khoản, một bộ quy ước kỹ thuật, và
            một bộ nhận diện.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-semibold text-fg">{c.title}</h4>
            <ul className="mt-2.5 space-y-1.5">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-sm text-fg-secondary hover:text-link transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {/* Dòng cuối nói điều RIÊNG của tsudev - mọi tệp phát hành đều kiểm được -
          kèm đường tới khoá công khai để tự kiểm. Bản trước in "Built with
          Next.js · Node · PostgreSQL": một danh sách công nghệ không giúp người
          tải app về quyết định điều gì. */}
      <div className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-fg-muted">
          <span>© {new Date().getFullYear()} tsudev · Nguyễn Trang Tình Sử</span>
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Mọi bản phát hành kèm SHA-256 và chữ ký Ed25519</span>
            <span aria-hidden="true">·</span>
            <a
              href="/api/releases/jwks"
              className="font-medium text-fg-secondary hover:text-link transition-colors"
            >
              Khoá công khai (JWKS)
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
