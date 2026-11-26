// Proxy của trạm điều hành tới content-service (CP3): đường GHI của Studio, duyệt bài, dự án, bản phát hành và an
// ninh phát hành. Trước CP3 nó nằm ở tsudev.com; nay chỉ có ở đây:
//  - khẳng định danh tính ký ở VÙNG `console` (L5) - `requireAuthor/Moderator/Admin` từ chối khẳng định vùng main;
//  - chuyển tiếp JWT Cloudflare Access để backend kiểm lại (L2);
//  - danh sách trắng nhánh đầu: chỉ `admin` và `author`;
//  - lượt ghi phải cùng origin.
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  CONTENT,
  accessForwardHeaders,
  catchAllSegments,
  consoleIdentityHeaders,
  internalHeaders,
  isSameOrigin,
  queryStringOf,
  readSessionToken,
  upstreamPath,
} from '../../../lib/server';

// Danh sách trắng, không phải danh sách đen: thêm nhánh mới phải khai ở đây.
export const CONSOLE_CONTENT_PREFIXES = new Set(['admin', 'author']);
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  if (!METHODS.has(method)) {
    res.setHeader('Allow', [...METHODS].join(', '));
    return res.status(405).json({ error: 'Phương thức không hỗ trợ' });
  }
  if (method !== 'GET' && !isSameOrigin(req.headers)) {
    return res.status(403).json({ error: 'Sai nguồn gốc yêu cầu' });
  }
  const parts = catchAllSegments(req.query.path);
  if (!parts[0] || !CONSOLE_CONTENT_PREFIXES.has(parts[0])) {
    return res.status(404).json({ error: 'Không tìm thấy' });
  }
  const path = upstreamPath(parts);
  if (path === null) return res.status(400).json({ error: 'Đường dẫn không hợp lệ' });

  const token = await readSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Bạn cần đăng nhập' });

  const url = `${CONTENT}/api/${path}${queryStringOf(req.url)}`;
  try {
    const upstream = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...internalHeaders(method, url),
        ...accessForwardHeaders(req.headers),
        ...(await consoleIdentityHeaders(token)),
      },
      body: method === 'GET' ? undefined : JSON.stringify(req.body || {}),
    });
    const data = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(data);
  } catch (e) {
    console.error('[console] proxy content lỗi:', e instanceof Error ? e.message : e);
    return res.status(502).json({ error: 'Không kết nối được content-service' });
  }
}
