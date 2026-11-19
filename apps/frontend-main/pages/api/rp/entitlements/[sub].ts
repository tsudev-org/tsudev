import type { NextApiRequest, NextApiResponse } from 'next';

import { proxyEntitlement } from '../../../../lib/entitlementProxy';

const SUB_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** JWS quyền lợi cho máy chủ RP (private_key_jwt) - PRODUCT_POLICY 7.4, ADR-0002. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const sub = typeof req.query.sub === 'string' ? req.query.sub : '';
  if (!SUB_RE.test(sub)) return res.status(404).json({ error: 'unknown_subject' });
  return proxyEntitlement(req, res, `/ent/rp/${sub}`);
}
