import type { NextApiRequest, NextApiResponse } from 'next';

import { IDENTITY, internalHeaders } from '../../lib/services';
import { identityHeaders } from '../../lib/identity';
import { readSessionToken } from '../../lib/sessionCookie';
import { oidcCookies } from '../../lib/oidcCookie';

/**
 * P4: "Cho phép" / "Từ chối" trên trang đồng ý. Trình duyệt gọi
 * `/oidc/interaction/<uid>/confirm` (next.config rewrite về đây) để cookie
 * `_interaction` của provider đi kèm. Người dùng phải ĐANG đăng nhập tsudev.com.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  }
  const token = await readSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Bạn cần đăng nhập' });
  try {
    const up = await fetch(`${IDENTITY}/api/identity/oidc/interaction/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...internalHeaders(),
        ...(await identityHeaders(token)),
        'x-oidc-cookie': oidcCookies(req.headers.cookie),
      },
      body: JSON.stringify({ allow: req.body?.allow === true }),
    });
    const data = await up.json().catch(() => ({}));
    return res.status(up.status).json(data);
  } catch {
    return res.status(502).json({ error: 'Không kết nối được dịch vụ đăng nhập' });
  }
}
