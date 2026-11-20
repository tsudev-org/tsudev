import type { NextApiRequest, NextApiResponse } from 'next';

import { proxyEntitlement } from '../../../../lib/entitlementProxy';

/**
 * Kênh trạng thái quyền lợi (PRO2) - PRODUCT_POLICY 7.4, ADR-0004. Máy chủ đồng bộ hỏi
 * NGAY TRƯỚC khi xoá bản sao đám mây vì hết Pro. Đường tĩnh này thắng `[sub].ts` của
 * Next, nên `GET /api/rp/entitlements/status` trả 405 chứ không bị hiểu là một `sub`.
 */
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return proxyEntitlement(req, res, '/ent/status', 'POST');
}
