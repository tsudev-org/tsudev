import React from 'react';

import { AccountsAdmin } from '../components/admin/AccountsAdmin';
import { Layout } from '../components/Layout';
import Seo from '../components/Seo';
import { signIn, useSession } from '../lib/session';

export { getServerSideProps } from '../lib/ssr';

// Quản lý tài khoản & phân quyền. Lời gọi `/api/account/*` đi qua proxy của console (khẳng định vùng `console` + JWT
// Access).
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      <Seo title="Quản lý tài khoản" />
      {children}
    </Layout>
  );
}

export default function ConsoleAccounts() {
  const { status } = useSession();
  return <AccountsAdmin status={status} Frame={Frame} onSignIn={signIn} />;
}
