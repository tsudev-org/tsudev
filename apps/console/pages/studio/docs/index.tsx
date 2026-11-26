import React, { useState } from 'react';
import { useSession } from '../../../lib/session';
import AuthorDocs from '../../../components/AuthorDocs';
import { WorkspaceLayout } from '../../../components/WorkspaceLayout';
import { useUrlPaging, useUrlPagingSync } from '../../../../frontend-main/lib/useUrlPaging';

export { getServerSideProps } from '../../../lib/ssr';

/**
 * `/studio/docs` - Tài liệu của site (ED-03, IA-04). Trước UX1-a là thẻ "Tài liệu"
 * của `/author` và dùng cặp `doc_page`/`doc_page_size`; nay mỗi URL MỘT danh sách
 * nên quay về `page`/`page_size` chuẩn. Liên kết cũ `/author?tab=docs` chuyển
 * hướng 308 về đây (next.config.js).
 */
export default function StudioDocs() {
  const { data: session } = useSession();
  const [denied, setDenied] = useState(false);
  const paging = useUrlPaging('studio-docs');
  useUrlPagingSync([paging]);
  return (
    <WorkspaceLayout section="docs" title="Tài liệu" path="/studio/docs" denied={denied}>
      {session && <AuthorDocs paging={paging} onDenied={() => setDenied(true)} />}
    </WorkspaceLayout>
  );
}
