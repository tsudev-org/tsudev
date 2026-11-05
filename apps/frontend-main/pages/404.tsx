import React from 'react';
import { Layout, EmptyState } from '@tsudev/ui';
import Seo from '../components/Seo';

/**
 * 404 tĩnh. Phải có tệp này khi đã có `pages/_error.tsx` riêng: thiếu nó thì Next
 * vẽ 404 qua `_error` (có getInitialProps) - mỗi lượt gõ sai URL thành một lượt
 * dựng động trên Worker thay vì một tệp tĩnh.
 */
export default function NotFoundPage() {
  return (
    <Layout>
      <Seo title="Không tìm thấy trang" noindex />
      <EmptyState
        icon="search"
        title="Không tìm thấy trang"
        explain={
          <>
            Đường dẫn này không tồn tại hoặc nội dung đã được gỡ. Thử tìm kiếm, hoặc về trang chủ.
          </>
        }
        action={{ label: 'Về trang chủ', href: '/' }}
        className="my-10"
      />
    </Layout>
  );
}
