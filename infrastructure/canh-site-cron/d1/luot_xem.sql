-- D1 `tsudev-luot-xem`: lượt xem bài chờ gộp vào Neon (PostViewDaily).
-- Ghi: apps/frontend-main/pages/api/views.ts. Gộp + xoá: canh-site-cron/src/luotXem.ts.
-- Một dòng cho mỗi (ngày giờ VN, bài, khách). `khach` = HMAC-SHA-256(IP + UA) cắt 16 byte - không lưu IP.
-- Áp: npx wrangler d1 execute tsudev-luot-xem --remote --file infrastructure/canh-site-cron/d1/luot_xem.sql
CREATE TABLE IF NOT EXISTS luot_xem (
  ngay TEXT NOT NULL,
  slug TEXT NOT NULL,
  khach TEXT NOT NULL,
  PRIMARY KEY (ngay, slug, khach)
) WITHOUT ROWID;
