import React, { createContext, useContext } from 'react';
import type { GetServerSideProps } from 'next';

import { AccountsAdmin } from '../../frontend-main/components/admin/AccountsAdmin';
import { ConsoleLayout } from '../components/ConsoleLayout';
import { readSessionToken, viewerFrom, type Viewer } from '../lib/server';

// Quản lý tài khoản & phân quyền ở trạm điều hành. Thân trang dùng chung với đường cũ trên tsudev.com tới CP3; lời
// gọi `/api/account/*` ở ĐÂY đi qua proxy của console (khẳng định vùng `console` + JWT Access).
const ViewerContext = createContext<Viewer>(null);

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <ConsoleLayout title="Quản lý tài khoản" viewer={useContext(ViewerContext)}>
      {children}
    </ConsoleLayout>
  );
}

export default function ConsoleAccounts({ viewer }: { viewer: Viewer }) {
  return (
    <ViewerContext.Provider value={viewer}>
      <AccountsAdmin
        status={viewer ? 'authenticated' : 'unauthenticated'}
        Frame={Frame}
        onSignIn={() => window.location.assign('/login')}
      />
    </ViewerContext.Provider>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => ({
  props: { viewer: viewerFrom(await readSessionToken(req)) },
});
