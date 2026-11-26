// Máy giám sát (Service Token của Access, CONTROL_PLANE.md L1) chỉ GET đường này. Không chạm backend, không trả gì
// về cấu hình - chỉ cho biết Worker sống và đã qua proxy.ts.
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  return res.status(200).json({ ok: true });
}
