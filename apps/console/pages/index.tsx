import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { Card } from '@tsudev/ui';

import { ConsoleLayout } from '../components/ConsoleLayout';
import { readSessionToken, viewerFrom, type Viewer } from '../lib/server';

/**
 * Tổng quan trạm điều hành (CP2). Trang này KHÔNG gọi backend: chỉ cho biết ai đang xem và dẫn tới các khu đã dời
 * sang. Bảng An ninh (bộ đếm biên, SecurityAuditLog) đến ở CP5; các khu `/admin/*` còn lại dời ở CP3.
 */
const AREAS = [
  {
    href: '/accounts',
    title: 'Tài khoản & phân quyền',
    desc: 'Tạo tài khoản, đổi vai trò, thu hồi phiên, tạm khoá, bí danh thư. Chỉ chủ sở hữu, cần 2FA.',
    ready: true,
  },
  {
    href: null,
    title: 'Nội dung, dự án, bản phát hành, thanh toán',
    desc: 'Vẫn ở tsudev.com/admin - dời sang đây ở phase CP3 (sau đó /admin trả 308).',
    ready: false,
  },
  {
    href: null,
    title: 'An ninh & cảnh báo',
    desc: 'Nhật ký an ninh, bộ đếm lượt không qua biên, cảnh báo gom thư - phase CP5.',
    ready: false,
  },
];

export default function ConsoleHome({ viewer }: { viewer: Viewer }) {
  return (
    <ConsoleLayout title="Tổng quan" viewer={viewer}>
      <h1 className="mb-2 text-2xl font-semibold">Trạm điều hành</h1>
      <p className="mb-8 text-fg-secondary">
        Mọi thao tác ghi lên dữ liệu dùng chung của hệ TsuDEV đi qua đây, sau Cloudflare Access và
        tài khoản có 2FA.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {AREAS.map((a) => (
          <Card key={a.title} className="p-5">
            <h2 className="mb-1 font-semibold">
              {a.href ? (
                <Link href={a.href} className="hover:underline">
                  {a.title}
                </Link>
              ) : (
                a.title
              )}
            </h2>
            <p className="text-sm text-fg-secondary">{a.desc}</p>
            {!a.ready && <p className="mt-3 text-xs text-fg-muted">Chưa dời</p>}
          </Card>
        ))}
      </div>
    </ConsoleLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => ({
  props: { viewer: viewerFrom(await readSessionToken(req)) },
});
