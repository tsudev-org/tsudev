# PHIẾU BÀN GIAO - Phiên 50: /apps lệnh cài gộp theo hệ điều hành, logo 6 trò chơi, chân trang di động

- **Mã phiếu**: 20261113-05
- **Phiên**: tsudev-80 (phiên 50), 13/11/2026
- **Trạng thái**: ĐÓNG - #245 duyệt, merge, deploy ở phiên 51 (phiếu 20261113-06)

## 1. Đã làm

| Việc                                                                                                                                                                                                                  | PR   | Production        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------- |
| Khay "Đã chọn N": tab Windows (PowerShell) / macOS / Ubuntu-Debian / Fedora, mỗi tab MỘT lệnh gộp đúng shell (`installPlan`) - winget không chung dòng với apt/brew; nguồn thêm một lần; tab chọn sẵn theo User-Agent | #244 | Worker `090c840f` |
| Ô chọn TRÒN (checkbox thật, sr-only), bấm vùng trống của thẻ để chọn, hàng nền tảng ở ĐÁY thẻ, mũi tên mở tab mới cách điệu (`arrow-up-right`) - thẻ app VÀ trò chơi, trang chủ dùng chung                            | #244 | `090c840f`        |
| Thanh lọc /apps dính sát header (trước `top-20` hở 16px); chip cuộn ngang trên di động; khay nền đặc                                                                                                                  | #244 | `090c840f`        |
| Khối lệnh trên thẻ hiện bước cài cuối ("… scoop install tsudev/x"), bỏ nhãn lặp ("winget winget install")                                                                                                             | #244 | `090c840f`        |
| Logo riêng 6 trò chơi (ô biểu tượng `mark-tile`) + chân trang `© tsudev` và bộ chọn giao diện cùng MỘT hàng ở di động                                                                                                 | #245 | **chờ duyệt**     |
| Phiếu 20261113-04 cho 6 repo game + tsudev-game-kit; nhắn phiên tsudev-nuicam3d-e0                                                                                                                                    | -    | -                 |

Nghiệm thu production (13/11 ~15:45): Playwright chọn 3 sản phẩm → lệnh Windows/macOS/Debian đúng; `/docs` 4 tài liệu,
`/blog` có bài; `/api/auth/providers` chỉ credentials + passkey.

## 2. Kỹ thuật đáng nhớ

- 6 logo gốc ở `packages/brand/source/eco/game-<id>.png` (trùng byte bản chủ dự án chép vào gốc repo - bản ở gốc đã xoá).
  KHÔNG xoá nền ở `/apps`: chim đen mất trên Tối, nét trắng mất trên Sáng ⇒ ô nền đặc + viền hairline (`EcoIcon tile`).
  Ô vuông cắt thẳng từ ảnh gốc lấn vào dòng chữ - phải cắt sát biểu tượng rồi đặt lên nền đặc (`markTile`).
- 🪤 sharp: trong MỘT pipeline `extract` chạy TRƯỚC `extend` - cần hai lượt.
- 🪤 Dev local: shell có `DEV_PROXY_PORT=8090` ⇒ `next dev -p <khác>` bị proxy.ts chuyển hướng sang
  `tsudev.localhost:8090`; chạy `node scripts/dev-proxy.js` + next ở cổng 3000. Trang ISR (`/`) cần backend.
- Ảnh fullPage của trang chủ có khoảng trống lớn: do `.reveal` (scroll-reveal) chưa kích hoạt - KHÔNG phải lỗi.
- Tách PR theo cổng bản quyền: phần không chạm đường dẫn bảo vệ merge + deploy ngay, phần chạm thì PR riêng.

## 3. Việc còn lại

1. **Chủ dự án duyệt #245** bằng `nguyentrangtinhsu` (logo nguồn + `SiteFooter.tsx`), rồi agent: merge, deploy,
   nghiệm thu ảnh 390px chân trang + `/eco/game-*.webp` 200.
2. Sáu repo game + game-kit làm phiếu 20261113-04; khi website game phục vụ logo ⇒ đổi `SOURCES` sang URL.
3. `tsudev-org/tsudev-files` đã đổi tên `tsufiles` (13/11): link `releases`/mã nguồn trong `ecosystem.ts` đang chạy
   nhờ chuyển hướng - đổi sang tên mới ở lần sửa kế tiếp; KHÔNG tạo lại tên cũ.
4. Việc cũ (phiếu 20261113-03 mục 9): scoop-bucket#6/#7, homebrew-tap#4, `bat-bao-ve-scoop-homebrew.sh`.

## 4. Đề xuất "mọi phần mềm cài được bằng lệnh" - thảo luận với chủ dự án

Hiện có: lệnh gộp theo hệ điều hành trên /apps (phiên này), `install.sh`/`install.ps1` một gói, catalog APT/Scoop/Homebrew
sinh tự động. Còn thiếu, theo thứ tự giá trị:

1. winget cho tsudev-files, Lotus Share, tsudev-contact (komac/wingetcreate trong workflow phát hành) - phiếu toàn hệ 20261113-01.
2. `install.sh`/`install.ps1` nhận NHIỀU gói một lượt (vùng bảo vệ - cần duyệt) ⇒ khay /apps thêm tab "Một lệnh tsudev".
3. Ký mã Windows (SignPath Foundation - chủ dự án đăng ký) để winget/Scoop hết cảnh báo SmartScreen.
4. Mọi website `*.tsudev.com` hiện khối "Cài bằng lệnh" đọc cùng catalog (`pkg.tsudev.com/catalog.json`), không chép tay.
