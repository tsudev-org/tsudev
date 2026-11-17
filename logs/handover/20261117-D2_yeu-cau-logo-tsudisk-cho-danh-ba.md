# PHIẾU YÊU CẦU - Dùng logo riêng của TsuDisk trong danh bạ tsudev.com/apps

- **Mã phiếu**: 20261117-D2
- **Từ**: agent-tsudisk (repo `tsudev-org/tsudisk`) - **Đến**: phiên repo `tsudev`
- **Thời điểm**: 17/11/2026
- **Trạng thái**: ĐÓNG (phiên 57 tsudev, 17/11/2026 - chờ chủ sở hữu duyệt PR vì vùng logo)
- **Căn cứ**: `BRAND_ASSETS.md` mục 15 quy tắc 6; chủ dự án cung cấp logo `logo-tsudisk.png` ngày 17/11/2026

## 1. Logo đã lên production (đo 17/11/2026, mọi URL 200)

| Dùng cho                                                          | URL                                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Ảnh vuông 512 PNG (nguồn cho `packages/brand/build-eco-icons.js`) | https://disk.tsudev.com/brand/logo-tsudisk.png                          |
| AVIF/WebP 48/96/144/192                                           | https://disk.tsudev.com/brand/logo-tsudisk-{48,96,144,192}.{avif,webp}  |
| Logo đầy đủ có chữ                                                | https://disk.tsudev.com/brand/logo-tsudisk-day-du-{360,717}.{avif,webp} |

Biểu tượng: thanh ổ đĩa + mũi tên mở rộng sang khung nét đứt, xanh ngọc `#2dd4bf` / tím, ô nền `#0c0f16` bo góc 22%.
Ảnh gốc và cách sinh: `docs/BRAND.md` của repo tsudisk.

## 2. Việc cần làm ở repo tsudev

- [x] Thay ô màu hổ phách + glyph ổ đĩa tạm của thẻ TsuDisk bằng logo trên (qua `build-eco-icons.js`).
- [x] Ghi kết quả vào phiếu này, đổi Trạng thái thành ĐÓNG.

## 3. Ghi thêm

- Gói Scoop `tsudisk` (tsudev-org/scoop-bucket#15) đã qua CI cài thử thật, nhưng chưa merge được vì cổng "Bảo vệ bản
  quyền" vẫn startup_failure (chờ chủ dự án xem Settings > Actions của org). Khi merge, tsudisk sẽ gửi phiếu riêng để
  gỡ ngoại lệ tạm của cổng C4 cho id `disk`.

## Kết quả xử lý

Phiên tsudev (17/11/2026): `build-eco-icons.js` thêm nguồn `disk` = `https://disk.tsudev.com/brand/logo-tsudisk.png`
(giữ nguyên ô nền bo góc của ảnh), sinh `apps/frontend-main/public/eco/disk.webp` (128px, 2,2 kB, sha256
`71e68612cc58e9e4…`); thẻ TsuDisk khai `logo: '/eco/disk.webp'` (ô màu cũ giữ làm dự phòng). Vùng logo ⛔ ⇒ PR chờ
`nguyentrangtinhsu` duyệt; deploy ngay khi merge. Đã chạy lại cổng "Bảo vệ bản quyền" cho scoop-bucket#15 sau khi khung
chặn thử `pull_request_target` của GitHub hết (18:00 UTC 16/11).
