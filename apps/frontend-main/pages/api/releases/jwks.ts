// Khoá công khai ký bản phát hành, phục vụ tại /.well-known/tsudev-release-jwks.json
// (xem rewrite trong next.config.js). Công khai có chủ đích: người tải tự xác minh
// chữ ký offline mà không cần tin API của tsudev. Nguồn: content-service.
import type { NextApiRequest, NextApiResponse } from 'next';

import { CONTENT } from '../../../lib/services';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const upstream = await fetch(`${CONTENT}/.well-known/tsudev-release-jwks.json`);
    const data = await upstream.json();
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ error: 'Không lấy được khoá công khai' });
  }
}
