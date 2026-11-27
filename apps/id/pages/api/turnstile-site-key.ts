import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Site key Turnstile (P1.7) đọc LÚC CHẠY từ biến Worker `TURNSTILE_SITE_KEY`, không
 * phải `NEXT_PUBLIC_*` nội suy lúc build: lệnh deploy chạy trên máy dev và dời
 * `.env.local` ra khỏi đường (scripts/deploy-frontend.js), nên một biến build-time
 * mới là thêm một chỗ phải nhớ truyền tay - quên là widget biến mất IM LẶNG.
 *
 * Site key là CÔNG KHAI (nó nằm trong HTML của mọi trang có widget). Chưa đặt ⇒
 * `null` ⇒ trang không vẽ widget; auth-service khi đó cũng bỏ qua kiểm (thiếu
 * TURNSTILE_SECRET_KEY). Hai khoá phải được đặt CÙNG LÚC - xem docs/auth.md.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Chỉ hỗ trợ GET' });
  }
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.json({ siteKey: (process.env.TURNSTILE_SITE_KEY || '').trim() || null });
}
