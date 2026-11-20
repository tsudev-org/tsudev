import type { NextApiRequest, NextApiResponse } from 'next';

import { proxyEntitlement } from '../../../lib/entitlementProxy';

/**
 * Huỷ nhận thư nhắc gia hạn Pro (PRO2 2.4) → auth-service `/ent/reminders/unsubscribe`.
 *
 * Hai người gọi: trang `/pro/huy-nhac` (thân JSON `{u, t}`) và One-Click của hộp thư theo
 * RFC 8058 (header `List-Unsubscribe-Post`: thân form `List-Unsubscribe=One-Click`, `u`/`t`
 * nằm trong URL). Proxy chuẩn hoá cả hai thành thân JSON. Chỉ POST - GET là trình quét link.
 */
export const config = { api: { bodyParser: { sizeLimit: '4kb' } } };

const pick = (q: unknown, b: unknown): string | undefined =>
  typeof q === 'string' ? q : typeof b === 'string' ? b : undefined;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
    string,
    unknown
  >;
  req.body = { u: pick(req.query.u, body.u), t: pick(req.query.t, body.t) };
  return proxyEntitlement(req, res, '/ent/reminders/unsubscribe', 'POST');
}
