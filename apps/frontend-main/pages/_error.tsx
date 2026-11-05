import React from 'react';
import type { NextPageContext } from 'next';
import { Layout, EmptyState } from '@tsudev/ui';
import Seo from '../components/Seo';
import { resolveErrorStatus } from '../lib/isr';

/**
 * Trang lỗi chung (500/503). 404 có trang tĩnh riêng ở `pages/404.tsx`.
 *
 * Lý do tồn tại: trang ISR có slug CHƯA TỪNG vào cache mà backend đang chết thì
 * `keepStaleOnFailure` NÉM (trả props lỗi sẽ cache luôn trang lỗi - xem
 * `lib/isr.ts`). Trước tệp này, người đọc nhận trang 500 trần của Next. Nay:
 *
 *  - lỗi mang mã UPSTREAM_UNAVAILABLE ⇒ **503 + Retry-After**: nói đúng sự thật
 *    "tạm thời", để trình thu thập và CDN biết thử lại thay vì gỡ URL khỏi chỉ mục;
 *  - lỗi khác ⇒ giữ **500** - một bug thật không được ngụy trang thành "bảo trì".
 *
 * Không cache: Next gắn `Cache-Control: private, no-cache, no-store` cho mọi phản
 * hồi lỗi. `test/errorPage.test.ts` canh bằng quét nguồn, vì ở dev Next vẽ lớp phủ
 * lỗi thay cho tệp này - lỗi ở đây không hiện ra ở dev.
 */
type ErrorPageProps = { statusCode: number };

export default function ErrorPage({ statusCode }: ErrorPageProps) {
  const unavailable = statusCode === 503;
  const title = unavailable ? 'Nội dung tạm thời chưa tải được' : 'Đã có lỗi xảy ra';
  return (
    <Layout>
      <Seo title={title} noindex />
      <EmptyState
        kind="failed"
        icon={unavailable ? 'clock' : 'warning'}
        title={title}
        explain={
          unavailable ? (
            <>
              Máy chủ nội dung đang không trả lời nên trang này chưa dựng được. Nội dung không mất -
              thử tải lại sau khoảng một phút.
            </>
          ) : (
            <>Trang gặp lỗi ngoài dự kiến (mã {statusCode}). Thử tải lại, hoặc quay về trang chủ.</>
          )
        }
        action={{ label: 'Về trang chủ', href: '/' }}
        className="my-10"
      />
    </Layout>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorPageProps => ({
  statusCode: resolveErrorStatus(res, err),
});
