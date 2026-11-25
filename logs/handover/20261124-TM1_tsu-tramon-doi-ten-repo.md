# PHIẾU YÊU CẦU - Tsu Tramon: ghi tên cũ vào danh sách BẤT KHẢ XÂM PHẠM + cập nhật tsudev.com

- **Mã phiếu**: 20261124-TM1
- **Từ**: phiên tsudev-trafficmonitor (tsudev-trafficmonitor-48), 24/11/2026, theo uỷ quyền UQ1 của chủ dự án
- **Đến**: phiên điều phối `tsudev` (repo tsudev) - kèm việc cho `tsudev-standards`
- **Trạng thái**: MỞ

## 1. Đã làm (24/11/2026)

- Phát hành **Tsu Tramon 26.11.2401** (thẻ `v26.11.2401`, tệp `tsutramon_26.11.2401_windows-{x64,x86,arm64ec}.zip`
  - bản sao tên cũ một lần). Website mới `https://tramon.tsudev.com`; `trafficmonitor.tsudev.com` chuyển hướng 301.
- **Đổi tên repo `tsudev-org/tsudev-trafficmonitor` → `tsudev-org/tsutramon`** (ADR-0001 trong repo tsutramon). Đã kiểm 4
  đường chuyển hướng (manifest `releases/latest/download/version_signed.xml` theo tên cũ, link tải tiền tố
  `tsudev-tsudev/tsudev-trafficmonitor`, raw `version_utf8.info`, API releases): ĐẠT.

## 2. Việc cần làm

1. ⛔ **Khẩn - `~/.claude/CLAUDE.md`**: thêm mục "`tsudev-org/tsudev-trafficmonitor` đã đổi tên thành `tsudev-org/tsutramon`
   (sản phẩm Tsu Tramon). KHÔNG BAO GIỜ tạo repo, fork hay đổi tên repo nào thành `tsudev-trafficmonitor` trong `tsudev-org`
   (cũng như dưới `tsudev-tsudev`): updater của mọi bản 26.11.09xx-2401 đã cài (gọi
   `tsudev-org/tsudev-trafficmonitor/releases/latest/download/version_signed.xml` và link tải `tsudev-tsudev/tsudev-trafficmonitor/...`),
   gói Scoop `tsudev-trafficmonitor`, manifest winget `tsudev.TrafficMonitor`, raw `version_utf8.info` chỉ còn chạy nhờ chuyển
   hướng (ADR-0001 trong repo tsutramon)." - và sửa câu ở `CLAUDE.md:241` của repo tsudev cho khớp.
2. tsudev.com: danh mục sản phẩm/link đổi sang tên "Tsu Tramon", `https://tramon.tsudev.com`, repo `tsudev-org/tsutramon`
   (link cũ vẫn chạy nhờ chuyển hướng - không gấp). `install-scripts.yml` vẫn dùng gói Scoop `tsudev-trafficmonitor` (giữ).
3. `tsudev-standards`: `tokens/products/trafficmonitor.json` (`name` "Tsu Tramon", `repo` `tsudev-org/tsutramon`),
   chú thích `products.css`, bảng DESIGN_SYSTEM mục sản phẩm. Giữ `id` `trafficmonitor` (thuộc tính `data-product` đang dùng).

## 3. Kết quả xử lý

- (chưa)
- 24/11/2026 - tsudev-b5dd: mục 1 XONG - chủ dự án đồng ý, `~/.claude/CLAUDE.md` thêm mục `tsudev-trafficmonitor` → `tsutramon`; `CLAUDE.md` repo tsudev (gotcha tên repo cũ) sửa khớp. Mục 2 (danh bạ `ecosystem.ts`: tên Tsu Tramon, `tramon.tsudev.com`, repo `tsutramon`) chuyển phiên tsudev kế tiếp; mục 3 thuộc repo tsudev-standards.
- 25/11/2026 - tsudev-3e: mục 2 XONG - `ecosystem.ts` tên "Tsu Tramon", `https://tramon.tsudev.com` (đo 200), Release `tsudev-org/tsutramon`; `oldWebsites` giữ homepage cũ vì gói Scoop `tsudev-trafficmonitor` vẫn khai `trafficmonitor.tsudev.com` (ghép catalog theo homepage); `noi-dung-he-sinh-thai.js` đổi tên + link. Catalog gói làm mới (`npm run pkg:catalog`). Mục 3 còn ở repo tsudev-standards.
- 25/11/2026 - tsudev-trafficmonitor-62: **bổ sung mục 4** (không gấp) - repo tsutramon chuẩn hoá tên tệp (#102): ảnh thương hiệu đổi thành `/brand/logo-tsutramon.*`, `/brand/mark-tsutramon.*`. `packages/brand/build-eco-icons.js:59` đang tải `https://trafficmonitor.tsudev.com/brand/mark-tsudev-trafficmonitor.png`: tên cũ vẫn chạy (website tramon có `_redirects` 301 sang tên mới) nhưng nên đổi thành `https://tramon.tsudev.com/brand/mark-tsutramon.png` SAU khi website tramon deploy bản kế tiếp (cùng lúc phát hành app; trước đó URL mới chưa có). Mục 3 (tsudev-standards) thêm: `seed.source` → `assets/brand/source/logo-tsutramon.png` (phiếu `tsudev-standards/logs/handover/20261125-TM1b_tsu-tramon-duong-dan-logo.md`).
