// Máy giám sát GET đường này. Không chạm backend, không trả gì về cấu hình - chỉ cho biết Worker cổng sống.
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  return res.status(200).json({ ok: true });
}
