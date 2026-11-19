import type { NextApiRequest, NextApiResponse } from 'next';

import { proxyEntitlement } from '../../../lib/entitlementProxy';

/** JWS quyền lợi cho app có access token tsudev (PRODUCT_POLICY 7.4). */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return proxyEntitlement(req, res, '/ent/me');
}
