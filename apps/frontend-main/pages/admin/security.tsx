import React, { useCallback, useState } from 'react';
import Seo from '../../components/Seo';
import { useSession, signIn } from 'next-auth/react';
import { Layout, Card, Button, SectionHeading, RecordFooter } from '@tsudev/ui';
import type { PageMeta } from '@tsudev/types';

import { useUrlPaging, useUrlPagingSync } from '../../lib/useUrlPaging';

import { SecurityEventList, type SecurityEvent } from '../../components/SecurityEventList';
import { MfaRequiredNotice } from '../../components/MfaRequiredNotice';
import { isMfaRequired } from '../../lib/mfa';
import { useLoader } from '../../lib/useLoader';

// Console nhật ký bảo mật xuyên tài khoản - CHỈ OWNER (tsudev).
//
// Cổng thật ở auth-service (requireOwner, đọc User.role từ DB, fail closed);
// trang này bám PHẢN HỒI backend (401/403) chứ không tin `session.role` (có thể
// cũ - xem gotcha token.role ở CLAUDE.md).

async function call(action: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/account/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data } as const;
}

export default function AdminSecurity() {
  const { status } = useSession();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [denied, setDenied] = useState(false);
  /// 403 MFA_REQUIRED: là OWNER nhưng chưa bật 2FA - KHÁC "không có quyền".
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  // URL thắng lựa chọn đã nhớ, lựa chọn đã nhớ thắng mặc định 10 (mục 5).
  const paging = useUrlPaging('admin-security');
  const { page, setPage, pageSize, setPageSize, meta } = paging;
  useUrlPagingSync([paging]);
  // Tách khỏi `loading`: lần đầu được thay cả trang bằng "Đang tải…", còn mỗi
  // lần lật trang thì bảng phải đứng yên và bộ chọn chỉ mờ đi (mục 4).
  const [booted, setBooted] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!paging.ready || mfaRequired) return;
      setLoading(true);
      const r = await call('useradmin/security', { page, page_size: pageSize });
      if (signal?.aborted) return;
      setLoading(false);
      setBooted(true);
      if (isMfaRequired(r.status, r.data)) {
        setMfaRequired(true);
        return;
      }
      if (r.status === 401 || r.status === 403) {
        setDenied(true);
        return;
      }
      const body = r.data as { data?: SecurityEvent[]; meta?: PageMeta };
      if (Array.isArray(body?.data)) setEvents(body.data);
      if (body?.meta) paging.setMeta(body.meta);
    },
    // `paging` cố ý không nằm trong deps: nó là object mới mỗi lần dựng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, paging.ready, mfaRequired]
  );

  useLoader(load, status === 'authenticated');

  if (status === 'loading' || (status === 'authenticated' && !booted && loading))
    return (
      <Layout>
        <Seo title="Nhật ký bảo mật" path="/admin/security" noindex />
        <Card className="p-8 text-center text-fg-muted">Đang tải…</Card>
      </Layout>
    );

  if (status === 'unauthenticated')
    return (
      <Layout>
        <Seo title="Nhật ký bảo mật" path="/admin/security" noindex />
        <Card className="mx-auto max-w-md p-8 text-center">
          <p className="mb-4 text-fg-secondary">Bạn cần đăng nhập để tiếp tục.</p>
          <Button onClick={() => signIn()} size="lg">
            Đăng nhập
          </Button>
        </Card>
      </Layout>
    );

  if (mfaRequired)
    return (
      <Layout>
        <Seo title="Nhật ký bảo mật" path="/admin/security" noindex />
        <MfaRequiredNotice />
      </Layout>
    );

  if (denied)
    return (
      <Layout>
        <Seo title="Nhật ký bảo mật" path="/admin/security" noindex />
        <Card className="mx-auto max-w-md p-8 text-center">
          <h1 className="mb-2 text-lg font-semibold text-fg">Không có quyền</h1>
          <p className="text-fg-secondary">Trang này chỉ dành cho tài khoản chủ sở hữu (tsudev).</p>
        </Card>
      </Layout>
    );

  return (
    <Layout>
      <Seo title="Nhật ký bảo mật" path="/admin/security" noindex />
      <SectionHeading eyebrow="Chủ sở hữu" title="Nhật ký bảo mật" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted">
          Sự kiện bảo mật của mọi tài khoản: đăng nhập, đổi mật khẩu/email, 2FA, passkey, đổi vai
          trò, thu hồi phiên.
        </p>
        <Button variant="secondary" size="sm" onClick={() => load()}>
          Làm mới
        </Button>
      </div>

      <Card className="mt-6 p-6">
        <SecurityEventList events={events} variant="admin" />
        <RecordFooter
          meta={meta}
          pageSize={pageSize}
          loading={loading}
          label="sự kiện"
          onPageSize={(size, nextPage) => {
            setPageSize(size);
            setPage(nextPage);
          }}
          onPage={setPage}
        />
      </Card>
    </Layout>
  );
}
