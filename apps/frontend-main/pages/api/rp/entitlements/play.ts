import type { NextApiRequest, NextApiResponse } from 'next';

import { proxyEntitlement } from '../../../../lib/entitlementProxy';

/**
 * Biên nhận Google Play do máy chủ RP chuyển tiếp (B2, ADR-0002 mục 5, phiếu QT5). Đường
 * tĩnh này thắng `[sub].ts` của Next, nên `GET /api/rp/entitlements/play` trả 405 chứ không
 * bị hiểu là một `sub`.
 */
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return proxyEntitlement(req, res, '/ent/play', 'POST');
}
