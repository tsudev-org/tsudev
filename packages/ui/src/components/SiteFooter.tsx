import React from 'react';
import { useSession } from 'next-auth/react';
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
      eco('Hướng dẫn cài đặt', '/docs'),
      // Trang Ủng hộ TRUNG TÂM của hệ sinh thái (phiếu 20261112-01).
      eco('Ủng hộ', '/ung-ho'),
    ],
  },
  {
    // Website RIÊNG của từng sản phẩm - mở tab mới (ECOSYSTEM_IDENTITY: mọi trang
    // trong hệ sinh thái liên kết qua lại với nhau). App chưa có website thì không
    // hiện ở cột này; nó vẫn có trong /apps với nút tải từ GitHub.
    title: 'Hệ sinh thái',
    // Sáu game *.tsudev.com gom thành MỘT liên kết về mục Trò chơi của /apps -
    // liệt kê từng game thì cột này quá dài (phiếu 20261112-02).
    links: [
      ...ECOSYSTEM_APPS.filter((a) => a.website).map((a): FooterLink => [
        a.name,
        a.website as string,
        true,
      ]),
      eco('Trò chơi', '/apps#tro-choi'),
    ],
  },
  {
    title: 'Nội dung',
    links: [eco('Blog', '/blog'), eco('Tìm kiếm', '/search')],
  },
  // Cột "Tài khoản" KHÔNG nằm trong bảng tĩnh này: nó đổi theo phiên (AccountCol).
  {
    title: 'Pháp lý',
    links: [
      eco('Quyền riêng tư', '/privacy'),
      eco('Điều khoản', '/terms'),
      eco('Nội quy', '/rules'),
    ],
  },
];

const FooterLinks = ({ links, className = '' }: { links: FooterLink[]; className?: string }) => (
  <ul className={`mt-3 space-y-2 ${className}`}>
    {links.map(([label, href, external]) => (
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
);

const FooterCol = ({ col }: { col: Col }) => (
  <div>
    <h4 className="text-sm font-medium text-fg">{col.title}</h4>
    <FooterLinks links={col.links} />
  </div>
);

// Khách: lối vào tài khoản. Đã đăng nhập: "Đăng nhập" là lời mời vô nghĩa (chủ dự án
// báo 13/11/2026) - thay bằng hai trang của chính tài khoản, đứng đầu là Bảo mật.
const GUEST_LINKS: FooterLink[] = [
  // Trang /login của site, không phải trang mặc định của next-auth.
  ['Đăng nhập', '/login'],
  ['Tạo tài khoản', '/signup'],
];
const MEMBER_LINKS: FooterLink[] = [
  ['Bảo mật tài khoản', '/settings/security'],
  ['Hồ sơ tài khoản', '/settings/profile'],
];

/**
 * Cột "Tài khoản" theo phiên. Cùng khuôn chống nháy với SiteHeader: lúc phiên còn
 * `loading`, vẽ CẢ HAI danh sách và để CSS (`tsu-auth-in` / `tsu-auth-out`, theo
 * `data-auth` mà script ở _document.tsx đặt trước lần vẽ đầu) ẩn danh sách sai.
 * Chỉ để vẽ giao diện - hai trang /settings/* tự đòi phiên ở máy chủ.
 */
const AccountCol = () => {
  const { status } = useSession();
  const pending = status === 'loading';
  return (
    <div>
      <h4 className="text-sm font-medium text-fg">Tài khoản</h4>
      {(status === 'authenticated' || pending) && (
        <FooterLinks links={MEMBER_LINKS} className={pending ? 'tsu-auth-in' : ''} />
      )}
      {(status === 'unauthenticated' || pending) && (
        <FooterLinks links={GUEST_LINKS} className={pending ? 'tsu-auth-out' : ''} />
      )}
    </div>
  );
};

// Chân trang kiểu supabase.com: CÙNG NỀN với trang (không dải nền riêng - dải
// nền khác màu ở cuối trang chính là "khung đứt đoạn" chủ dự án yêu cầu gỡ
// 10/11/2026), ngăn bằng một đường hairline. Hàng cuối: "© tsudev" bên trái, bộ
// chọn giao diện Sáng / Tối / Hệ thống bên phải - bố cục chung cho MỌI website
// trong hệ sinh thái (phiếu 20261110-05).
export const SiteFooter = () => {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="max-w-6xl mx-auto px-4 pt-12 pb-10 grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-[1.6fr_repeat(5,1fr)]">
        {/* Di động: lưới 2 cột cho các cột liên kết (trước 13/11/2026 là MỘT cột, chân
            trang dài hơn cả nội dung trang đăng nhập); khối giới thiệu chiếm trọn hàng. */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <Logo size={72} />
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
        {COLS.slice(0, 3).map((c) => (
          <FooterCol key={c.title} col={c} />
        ))}
        <AccountCol />
        {COLS.slice(3).map((c) => (
          <FooterCol key={c.title} col={c} />
        ))}
      </div>
      <div className="max-w-6xl mx-auto px-4 pb-10">
        {/* MỘT hàng ở mọi khổ màn hình: "© tsudev" trái, bộ chọn giao diện phải - như
            trafficmonitor.tsudev.com. Trước 13/11/2026 khổ di động xếp cột ngược nên bộ chọn
            nằm TRÊN dòng bản quyền và giãn hết bề ngang. */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <span className="text-sm text-fg-muted">© tsudev</span>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
