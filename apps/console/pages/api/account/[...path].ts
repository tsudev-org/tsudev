// Proxy CÓ PHIÊN của trạm điều hành tới auth-service (CP2). Bề mặt QUẢN LÝ TÀI KHOẢN đã dời khỏi tsudev.com:
// `useradmin/*` (trừ `useradmin/security` - còn ở /admin/security tới CP3) và bí danh thư nội bộ chỉ đi qua đây.
//
// Khác proxy của tsudev.com ở ba điểm, mỗi điểm là một lớp của CONTROL_PLANE.md mục 3:
//  - khẳng định danh tính ký ở VÙNG `console` (L5) - backend từ chối khẳng định vùng main cho useradmin;
//  - chuyển tiếp JWT Cloudflare Access xuống backend để kiểm lại ở đó (L2);
//  - danh sách trắng CHỈ gồm thao tác điều hành + step-up, không có route tự phục vụ của người dùng.
//
// Bề mặt useradmin khớp BỐN chỗ trong một commit (CLAUDE.md): route auth-service + ASSIGNABLE_ROLES, ALLOWED ở đây,
// `services/auth-service/test/useradmin.test.ts` + `consoleZone.test.ts`, và `pages/accounts.tsx`.
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  IDENTITY,
  accessForwardHeaders,
  catchAllSegments,
  consoleIdentityHeaders,
  internalHeaders,
  readSessionToken,
} from '../../../lib/server';

export const CONSOLE_ACCOUNT_ALLOWED = new Set([
  'useradmin/list',
  'useradmin/create',
  'useradmin/update',
  'useradmin/role',
  'useradmin/revoke',
  'useradmin/suspend',
  'useradmin/delete',
  'alias/list',
  'alias/create',
  'alias/delete',
  'alias/sync',
  // Xác thực lại (L6): đổi mã TOTP lấy token 5 phút cho thao tác nguy hiểm (tạm khoá, xoá).
  'step-up',
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  }
  const parts = catchAllSegments(req.query.path);
  const action = parts.join('/');
  if (parts.length > 2 || !CONSOLE_ACCOUNT_ALLOWED.has(action)) {
    return res.status(404).json({ error: 'Không tìm thấy' });
  }

  const token = await readSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Bạn cần đăng nhập' });

  const url = `${IDENTITY}/api/identity/${action}`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...internalHeaders('POST', url),
        ...accessForwardHeaders(req.headers),
        ...(await consoleIdentityHeaders(token)),
      },
      body: JSON.stringify(req.body || {}),
    });
    const data = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(data);
  } catch (e) {
    console.error('[console] proxy account lỗi:', e instanceof Error ? e.message : e);
    return res.status(502).json({ error: 'Không kết nối được dịch vụ xác thực' });
  }
}
