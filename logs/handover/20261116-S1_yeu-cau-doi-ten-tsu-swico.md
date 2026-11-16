# PHIẾU YÊU CẦU - Sản phẩm SWICO đổi tên thành Tsu Swico, repo `tsudev-org/tsuswico`

- **Mã phiếu**: 20261116-S1
- **Từ**: phiên `tsudev-swico-34` (repo `tsuswico`), 16/11/2026, theo yêu cầu trực tiếp của chủ dự án
- **Trạng thái**: ĐÓNG (phiên 57, 16/11/2026: #275 + #276 đã merge, tên cũ đã ghi vào ~/.claude/CLAUDE.md và CLAUDE.md)
- **Quyết định**: `tsudev-org/tsuswico` `docs/adr/0001-ten-san-pham-tsu-swico.md` (PR tsuswico #20)

## Đã xảy ra

- Repo `tsudev-org/tsudev-swico` đổi tên thành **`tsudev-org/tsuswico`** (cùng id 1338164150). Tên cũ BẤT KHẢ XÂM PHẠM
  (đã ghi `~/.claude/CLAUDE.md`).
- Tên hiển thị: **Tsu Swico** (trước: `tsudev SWICO`). Tệp phát hành dạng mới `tsuswico_<v>_x64-setup.exe`.
- Giữ: lệnh `swico.exe`, mã winget `tsudev.SWICO`, tên miền `swico.tsudev.com`.
- Scoop: gói mới `tsuswico`; `tsudev-swico` thành gói chuyển tiếp (`replacedBy: tsuswico`) - scoop-bucket#9 đã merge.

## Việc của repo nhận

1. Chạy `npm run pkg:catalog` để bản chụp nhận gói Scoop `tsuswico` (bỏ `tsudev-swico`).
2. Thẻ app / danh mục sản phẩm / CMS trên tsudev.com: tên "Tsu Swico", liên kết repo `https://github.com/tsudev-org/tsuswico`.
3. ⛔ `TRADEMARKS.md` dòng 6 (`tsudev SWICO` → thêm `Tsu Swico`): vùng bảo vệ, mở PR chờ chủ dự án duyệt.
4. `CLAUDE.md` dòng 239: thêm `tsuswico` vào danh sách tên.

## Kết quả xử lý (phiên nhận điền)

Phiên 54 (16/11/2026): mục 1-2 XONG - #275 (`pkg:catalog`: Scoop `tsuswico`, gói chuyển tiếp không hiện; tên
"Tsu Swico", Release `tsudev-org/tsuswico`), deploy `v2026.11.16.3` (Worker `7678a4fb`), đo `/apps`: "Tsu Swico" 7 lần,
"tsudev SWICO" 0. Mục 3 ⛔ PR #276 (TRADEMARKS + khoá `metadata.json`) chờ chủ sở hữu. Mục 4 (CLAUDE.md): KHÔNG sửa
theo yêu cầu phiên khác - báo chủ dự án. Bài giới thiệu trên Neon (`scripts/noi-dung-he-sinh-thai.js` đã sửa): 👤 áp.
