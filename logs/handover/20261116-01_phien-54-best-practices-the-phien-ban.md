# PHIẾU BÀN GIAO - Phiên 54: OpenSSF Best Practices passing, thẻ phiên bản mỗi deploy

- **Mã phiếu**: 20261116-01
- **Phiên**: phiên 54, 15-16/11/2026
- **Trạng thái**: MỞ (Việc 2, 3 và các việc 👤/⛔ ở mục 2)

## 1. Đã xong (merge + deploy + đo production)

| Việc                                                                                             | PR             | Production / số đo                                                                                                                    |
| ------------------------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Thẻ CalVer mỗi deploy, CONTRIBUTING.md, mẫu issue, tóm tắt EN, lint `--max-warnings 0`, hồ sơ BP | #272 `a4338bc` | Worker `12833ec6`; thẻ `v2026.11.16.1`; `/api/auth/providers` = credentials, passkey, github, google; `/` `/apps` `/blog` `/docs` 200 |
| Hồ sơ OpenSSF Best Practices                                                                     | -              | **dự án 16731 passing 100%** (65 Met, 2 N/A) - huy hiệu trong README                                                                  |
| Scorecard cho `tsudev-standards` (#53), `.github` (#1, + dependabot #3, bảo vệ `main`)           | -              | 7.1 và 4.6 (lần chạy đầu)                                                                                                             |

Chi tiết từng mục: phiếu [`20261115-01`](20261115-01_yeu-cau-ho-so-xac-minh.md) phần Kết quả.

## 2. Còn lại

- 🧭 **Việc 2 (C6)**: đo 16/11 `pkg.tsudev.com/catalog.json` vẫn `tsudev-files 2.4.0-vn.1` ⇒ chưa chạy `npm run pkg:catalog`.
  Chờ repo `linux-packages`/`tsufiles` đẩy 2.4.1-vn.1.
- 🧭 **Việc 3 - lượt xem bài (`PostViewDaily`)**: phương án CHỌN: Workers Analytics Engine (binding trong
  `apps/frontend-main/wrangler.jsonc`, ghi một điểm mỗi lượt xem `/blog/<slug>` ở `proxy.ts` - không chạm Neon), cron
  của `infrastructure/canh-site-cron` ở nhịp `23 13 * * *` (đã chạm DB sẵn) đọc tổng theo ngày qua SQL API rồi đẩy
  MỘT lô lên backend (upsert `PostViewDaily`). Bỏ Durable Objects: phải thay entry OpenNext. 👤 cần token Cloudflare
  quyền `Account Analytics Read` làm secret của `canh-site-cron` - không có token thì không đo được cả phần ghi, nên
  CHƯA đưa mã vào đường nóng của production.
- 👤 Kiểm gõ tiếng Việt 2 bộ gõ (ADR-0001) - cần người thật.
- ⛔ `tsudev-org/.github#2` LICENSE MIT (hoặc CC-BY-4.0) - chờ `nguyentrangtinhsu`.
- 👤 Scorecard Branch-Protection của tsudev = -1 (token mặc định không đọc được bảo vệ nhánh cổ điển): cần PAT
  fine-grained làm secret `SCORECARD_TOKEN` + sửa `scorecard.yml` (⛔ vùng workflows).
- 👤 (từ phiếu 20261114-02) thu hồi token Render/Cloudflare/GitGuardian + xoá `~/.config/tsudev/*.env`; tắt JS
  Detections; thử đăng ký trên trình duyệt thật; in khoá `age` ra giấy.

## 3. Bẫy mới

- 🪤 Mỗi deploy giờ gắn thẻ git + đẩy lên origin. Deploy từ nhánh khác `main` hoặc cây bẩn ⇒ chỉ cảnh báo, không thẻ.
  Sau deploy thêm một dòng CHANGELOG mục "Bản triển khai" (gộp vào PR bàn giao).
- 🪤 `~/projects/tsudev-org-dotgithub` không có `user.name/email` toàn cục ⇒ đã đặt cục bộ cho repo đó.
