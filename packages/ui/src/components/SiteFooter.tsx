import React from 'react';
import { Logo } from './Logo';
import { MAIN_URL } from '../lib/siteUrls';
import { ECOSYSTEM_APPS } from '../lib/ecosystem';
import { ThemeToggle } from './ThemeToggle';

// Riêng đăng nhập giữ đường dẫn tương đối: phiên next-auth thuộc về chính app
// đang mở, đẩy sang origin khác sẽ đăng nhập nhầm chỗ.
// tsudev là MỘT site nên href tương đối.
type FooterLink = [label: string, href: string, external?: boolean];

const eco = (label: string, path: string): FooterLink => [label, path];

type Col = { title: string; links: FooterLink[] };

const COLS: Col[] = [
  {
    title: 'Sản phẩm',
    links: [
      eco('Danh bạ ứng dụng', '/apps'),
      eco('Dự án & bản phát hành', '/projects'),
      eco('Hướng dẫn cài đặt', '/docs'),
    ],
  },
  {
    // Website RIÊNG của từng sản phẩm - mở tab mới (ECOSYSTEM_IDENTITY: mọi trang
    // trong hệ sinh thái liên kết qua lại với nhau). App chưa có website thì không
    // hiện ở cột này; nó vẫn có trong /apps với nút tải từ GitHub.
    title: 'Hệ sinh thái',
    links: ECOSYSTEM_APPS.filter((a) => a.website).map((a): FooterLink => [
      a.name,
      a.website as string,
      true,
    ]),
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

// Chân trang kiểu supabase.com: CÙNG NỀN với trang (không dải nền riêng - dải
// nền khác màu ở cuối trang chính là "khung đứt đoạn" chủ dự án yêu cầu gỡ
// 10/11/2026), ngăn bằng một đường hairline. Hàng cuối: "© tsudev" bên trái, bộ
// chọn giao diện Sáng / Tối / Hệ thống bên phải - bố cục chung cho MỌI website
// trong hệ sinh thái (phiếu 20261110-05).
export const SiteFooter = () => {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="max-w-6xl mx-auto px-4 pt-12 pb-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(5,1fr)]">
        <div>
          <Logo />
          {/*
            Câu này là BẢN MÔ TẢ CHUẨN của hệ sinh thái, chép nguyên văn từ
            `.standards/docs/ECOSYSTEM_IDENTITY.md` mục 1. Tài liệu đó `MUST NOT`
            cho mỗi repo tự nghĩ một câu giới thiệu riêng. Đổi câu này thì phải đổi
            ở repo quy ước trung tâm trước, đừng sửa tại chỗ.
          */}
          <p className="mt-3 text-sm text-fg-muted max-w-xs leading-relaxed">
            <strong className="font-semibold text-fg-secondary">tsudev</strong> là hệ sinh thái sản
            phẩm và công cụ phần mềm tại{' '}
            <a href={MAIN_URL} className="text-fg-secondary hover:text-fg transition-colors">
              tsudev.com
            </a>
            . Mọi sản phẩm trong hệ sinh thái dùng chung một tài khoản, một bộ quy ước kỹ thuật, và
            một bộ nhận diện.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-medium text-fg">{c.title}</h4>
            <ul className="mt-3 space-y-2">
              {c.links.map(([label, href, external]) => (
                <li key={label}>
                  <a
                    href={href}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="text-sm text-fg-muted hover:text-fg transition-colors"
                  >
                    {label}
                    {external && (
                      <>
                        <span aria-hidden="true"> ↗</span>
                        <span className="sr-only"> (mở tab mới)</span>
                      </>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <div className="flex flex-col-reverse gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-fg-muted">© tsudev</span>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
