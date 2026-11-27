import type { NextApiRequest, NextApiResponse } from 'next';

import { IDENTITY, internalHeaders } from '../../lib/services';
import { identityHeaders } from '../../lib/identity';
import { readSessionToken } from '../../lib/sessionCookie';
import { oidcCookies } from '../../lib/oidcCookie';
import { ID_URL, MAIN_URL } from '@tsudev/ui';

/**
 * P4: "Cho phép" / "Từ chối" trên trang đồng ý. Trình duyệt gọi
 * `/oidc/interaction/<uid>/confirm` (next.config rewrite về đây) để cookie
 * `_interaction` của provider đi kèm. Người dùng phải ĐANG đăng nhập.
 *
 * CP4: trang đồng ý ở cổng `id.` gửi FORM (application/x-www-form-urlencoded, `allow=1|0`) - điều hướng cả trang,
 * cùng site nên cookie `_interaction` (host tsudev.com, SameSite=Lax) và cookie phiên đi kèm; không cần CORS. Thành
 * công ⇒ 303 tới `redirectTo` của provider; hỏng ⇒ 303 về trang đồng ý ở cổng kèm `?loi=`. Bản JSON (fetch) giữ
 * nguyên cho luồng cũ. Origin khác tsudev.com/`id.` ⇒ 403 (lớp thứ hai sau SameSite).
 */
const CONSENT_ORIGINS = new Set([MAIN_URL, ID_URL]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  }
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (origin && !CONSENT_ORIGINS.has(origin)) return res.status(403).json({ error: 'origin' });
  const isForm = String(req.headers['content-type'] || '').startsWith(
    'application/x-www-form-urlencoded'
  );
  const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
  const backToGate = (code: string) => {
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(
      303,
      `${ID_URL}/oidc/interaction/${encodeURIComponent(uid)}?loi=${encodeURIComponent(code)}`
    );
  };
  const allow = isForm ? req.body?.allow === '1' : req.body?.allow === true;
  const token = await readSessionToken(req);
  if (!token) {
    if (isForm) return backToGate('dang-nhap');
    return res.status(401).json({ error: 'Bạn cần đăng nhập' });
  }
  try {
    const up = await fetch(`${IDENTITY}/api/identity/oidc/interaction/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...internalHeaders('POST', `${IDENTITY}/api/identity/oidc/interaction/finish`),
        ...(await identityHeaders(token)),
        'x-oidc-cookie': oidcCookies(req.headers.cookie),
      },
      body: JSON.stringify({ allow }),
    });
    const data = (await up.json().catch(() => ({}))) as { redirectTo?: unknown };
    if (isForm) {
      // `redirectTo` do provider sinh: luôn là đường resume của chính issuer (tsudev.com/oidc/...).
      const to = typeof data.redirectTo === 'string' ? data.redirectTo : '';
      if (!up.ok || !to) return backToGate('het-han');
      res.setHeader('Cache-Control', 'no-store');
      return res.redirect(303, to);
    }
    return res.status(up.status).json(data);
  } catch {
    if (isForm) return backToGate('ket-noi');
    return res.status(502).json({ error: 'Không kết nối được dịch vụ đăng nhập' });
  }
}
