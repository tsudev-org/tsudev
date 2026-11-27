import React from 'react';
import { useSession } from 'next-auth/react';
import { Logo } from './Logo';
import { ECOSYSTEM_APPS } from '../lib/ecosystem';
import { ThemeToggle } from './ThemeToggle';
import { ID_URL } from '../lib/siteUrls';

// Riêng đăng nhập giữ đường dẫn tương đối: phiên next-auth thuộc về chính app
// đang mở, đẩy sang origin khác sẽ đăng nhập nhầm chỗ.
// tsudev là MỘT site nên href tương đối.
type FooterLink = [label: string, href: string, external?: boolean];

const eco = (label: string, path: string): FooterLink => [label, path];

type Col = { title: string; links: FooterLink[] };

// Thông tin chủ sở hữu (hồ sơ Bộ Công Thương, phiếu DK2). Nguồn: OPERATOR trong
// apps/frontend-main/lib/legal.ts; test/footerOperator.test.ts canh hai nơi khớp.
const OPERATOR_PARTS = [
  'Chủ sở hữu: Nguyễn Trang Tình Sử',
  'MST 8536310833',
  'An Giang, Việt Nam',
  'contact@tsudev.com',
  '0329577500',
];

const COLS: Col[] = [
  {
    title: 'Sản phẩm',
    links: [
      eco('Danh sách ứng dụng', '/apps'),
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
      eco('Thanh toán, hoàn tiền', '/chinh-sach-thanh-toan'),
      // Trang bằng chứng an toàn tự kiểm chứng được (phiếu SEC2-e, 25/11/2026).
      eco('An toàn', '/security'),
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
  // Cổng `id.` (CP4) - nơi DUY NHẤT có đăng nhập/đăng ký và trang tài khoản (chuẩn "một cổng đăng nhập").
  ['Đăng nhập', `${ID_URL}/login`],
  ['Tạo tài khoản', `${ID_URL}/signup`],
];
const MEMBER_LINKS: FooterLink[] = [
  ['Bảo mật tài khoản', `${ID_URL}/settings/security`],
  ['Hồ sơ tài khoản', `${ID_URL}/settings/profile`],
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
            Câu mô tả hệ sinh thái do chủ dự án chốt 25/11/2026 - nay là BẢN MÔ TẢ CHUẨN, chép
            nguyên văn từ `.standards/docs/ECOSYSTEM_IDENTITY.md` mục 1 (v6.0.0). Đổi câu này thì đổi
            ở repo quy ước trung tâm trước, đừng sửa tại chỗ.
          */}
          <p className="mt-3 text-sm text-fg-muted max-w-xs leading-relaxed">
            <strong className="font-semibold text-fg-secondary">TsuDEV</strong> là hệ sinh thái ứng
            dụng, tiện ích và công cụ số đa nền tảng.
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
          <span className="text-sm text-fg-muted">© TsuDEV</span>
          <ThemeToggle />
        </div>
        {/* Thông tin chủ sở hữu ở MỌI trang - hồ sơ thông báo website TMĐT với Bộ Công
            Thương đòi có ở chân trang (phiếu DK2). Nguồn: OPERATOR trong
            apps/frontend-main/lib/legal.ts; test/footerOperator.test.ts canh hai nơi khớp. */}
        {/* Ngăn cách bằng thanh đứng `|` có khoảng đệm rộng (chủ dự án yêu cầu 25/11/2026) để mắt
            tách từng mục. Khổ hẹp tự xuống dòng theo MỤC, không cắt giữa một mục. */}
        <p className="mt-4 flex flex-wrap items-center gap-y-1 text-xs leading-relaxed text-fg-muted">
          {OPERATOR_PARTS.map((part, i) => (
            <React.Fragment key={part}>
              {i > 0 && (
                <span className="mx-3 text-line-strong select-none" aria-hidden="true">
                  |
                </span>
              )}
              <span className="whitespace-nowrap">{part}</span>
            </React.Fragment>
          ))}
        </p>
      </div>
    </footer>
  );
};
