/**
 * Phiên ở trạm điều hành: đọc MỘT lần ở máy chủ (getServerSideProps, lib/ssr.ts) rồi phát qua context. Cùng hình
 * dạng với `next-auth/react` ở phần trang điều hành dùng (`data.user.name/role`, `status`) - console không chạy
 * NextAuth (đăng nhập ở tsudev.com). Vai trò ở đây CHỈ để vẽ giao diện; cổng quyền thật đọc DB ở backend.
 */
import React, { createContext, useContext, useMemo } from 'react';

import type { Viewer } from './server';

const ViewerContext = createContext<Viewer>(null);

/** Cùng tập giá trị với next-auth; ở đây không bao giờ `loading` vì phiên đã có từ máy chủ. */
type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export function ViewerProvider({
  viewer,
  children,
}: {
  viewer: Viewer;
  children: React.ReactNode;
}) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export const useViewer = (): Viewer => useContext(ViewerContext);

export function useSession(): {
  data: { user: { name: string; role: string | undefined } } | null;
  status: SessionStatus;
} {
  const viewer = useViewer();
  const name = viewer?.username;
  const role = viewer?.role;
  return useMemo(() => {
    const data = name ? { user: { name, role } } : null;
    const status: SessionStatus = data ? 'authenticated' : 'unauthenticated';
    return { data, status };
  }, [name, role]);
}

/** Đăng nhập chỉ ở cổng công khai (next.config.js chuyển `/login` sang tsudev.com). */
export function signIn() {
  window.location.assign('/login');
}
