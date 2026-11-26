import Link from 'next/link';
import { Card, Container } from '@tsudev/ui';

import { ConsoleLayout } from '../components/ConsoleLayout';
import Seo from '../components/Seo';
import { areasFor } from '../lib/areas';
import { useViewer } from '../lib/session';

export { getServerSideProps } from '../lib/ssr';

/** Tổng quan trạm điều hành: ai đang xem và các khu họ dùng được. Bảng An ninh đến ở CP5. */
export default function ConsoleHome() {
  const viewer = useViewer();
  const areas = areasFor(viewer?.role);
  return (
    <ConsoleLayout>
      <Seo title="Tổng quan" />
      <Container className="py-8">
        <h1 className="mb-2 text-2xl font-semibold">Trạm điều hành</h1>
        <p className="mb-8 text-fg-secondary">
          Mọi thao tác ghi lên dữ liệu dùng chung của hệ TsuDEV đi qua đây, sau Cloudflare Access và
          tài khoản có 2FA.
        </p>
        {!viewer && (
          <p className="text-fg-secondary">
            <a href="/login" className="text-link hover:underline">
              Đăng nhập ở tsudev.com
            </a>{' '}
            rồi quay lại đây.
          </p>
        )}
        {viewer && areas.length === 0 && (
          <p className="text-fg-secondary">Tài khoản của bạn chưa có quyền vận hành khu nào.</p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {areas.map((a) => (
            <Card key={a.href} className="p-5">
              <h2 className="mb-1 font-semibold">
                <Link href={a.href} className="hover:underline">
                  {a.label}
                </Link>
              </h2>
              <p className="text-sm text-fg-secondary">{a.desc}</p>
            </Card>
          ))}
        </div>
      </Container>
    </ConsoleLayout>
  );
}
