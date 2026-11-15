import type { NextApiRequest, NextApiResponse } from 'next';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { clientIp } from '../../lib/clientIp';
import { docSlug, laBot, maKhach, ngayVN } from '../../lib/luotXem';

/**
 * POST /api/views - beacon lượt xem bài (lib/luotXem.ts). Luôn 204: kết quả không
 * đổi gì với người xem, và trả lỗi chi tiết chỉ giúp người dò.
 *
 * KHÔNG chạm backend/Neon. Không có binding `VIEWS_DB` (dev, `next dev`) ⇒ bỏ qua.
 */
type D1 = {
  prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<unknown> } };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  res.setHeader('Cache-Control', 'no-store');
  const ua = String(req.headers['user-agent'] || '').slice(0, 300);
  const site = req.headers['sec-fetch-site'];
  const slug = docSlug(req.body);
  const khoa = process.env.NEXTAUTH_SECRET || '';
  if (!slug || laBot(ua) || (site && site !== 'same-origin') || !khoa) return res.status(204).end();

  let db: D1 | undefined;
  try {
    db = (getCloudflareContext().env as { VIEWS_DB?: D1 }).VIEWS_DB;
  } catch {
    // ngoài Workers (next dev / test) - không có binding
  }
  if (!db) return res.status(204).end();

  try {
    const khach = await maKhach(khoa, clientIp(req.headers, req.socket?.remoteAddress), ua);
    await db
      .prepare('INSERT OR IGNORE INTO luot_xem (ngay, slug, khach) VALUES (?1, ?2, ?3)')
      .bind(ngayVN(), slug, khach)
      .run();
  } catch (e) {
    // D1 hết hạn mức ghi / lỗi tạm: mất một lượt đếm, không làm hỏng trang.
    console.error('[views] ghi D1 lỗi:', e instanceof Error ? e.message : String(e));
  }
  return res.status(204).end();
}
