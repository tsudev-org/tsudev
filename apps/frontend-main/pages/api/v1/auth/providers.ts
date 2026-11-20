import type { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../../auth/[...nextauth]';
import { listIdpProviders } from '../../../../lib/idpProviders';

/**
 * GET /api/v1/auth/providers - nhà cung cấp IdP đang bật (AUTH_AND_ACCOUNT mục 15).
 * Công khai, không chứa bí mật (chỉ id/tên) ⇒ mở CORS cho mọi origin để RP web gọi được,
 * cache ngắn vì bật/tắt provider chỉ đổi khi deploy.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res
      .status(405)
      .json({ code: 'method_not_allowed', message: 'Chỉ hỗ trợ phương thức GET.' });
  }
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json({ providers: listIdpProviders(authOptions.providers) });
}
