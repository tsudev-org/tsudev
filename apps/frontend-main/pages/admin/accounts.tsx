import React from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Layout } from '@tsudev/ui';

import Seo from '../../components/Seo';
import { AccountsAdmin } from '../../components/admin/AccountsAdmin';

// Đường CŨ của trang quản lý tài khoản, phục vụ SONG SONG với console.tsudev.com/accounts trong lúc chuyển dần
// (CONTROL_PLANE.md mục 7). Khi backend có khoá riêng của vùng điều hành thì đường ghi ở đây trả 403
// `console_required`; CP3 gỡ trang này (308 sang console).
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      <Seo title="Quản lý tài khoản" path="/admin/accounts" noindex />
      {children}
    </Layout>
  );
}

export default function AdminAccountsPage() {
  const { status } = useSession();
  return <AccountsAdmin status={status} Frame={Frame} onSignIn={() => signIn()} />;
}
