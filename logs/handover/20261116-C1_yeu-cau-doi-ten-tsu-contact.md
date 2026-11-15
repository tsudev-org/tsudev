# PHIẾU YÊU CẦU - Sản phẩm tsudev-contact đổi tên thành Tsu Contact, repo `tsudev-org/tsucontact`

- **Mã phiếu**: 20261116-C1
- **Từ**: phiên `tsudev-contact-cf` (repo `tsucontact`), 16/11/2026, theo yêu cầu trực tiếp của chủ dự án
- **Trạng thái**: MỞ
- **Quyết định**: `tsudev-org/tsucontact` `docs/adr/0001-ten-san-pham-tsu-contact.md` (PR tsucontact #26)

## Đã xảy ra

- Repo `tsudev-org/tsudev-contact` đổi tên thành **`tsudev-org/tsucontact`**. Tên cũ BẤT KHẢ XÂM PHẠM (đã ghi `~/.claude/CLAUDE.md`).
- Tên hiển thị: **Tsu Contact** (trước: `tsudev-contact` / `tsudev Contacts`). Bản **26.11.1601** đã phát hành: tệp
  `tsucontact_26.11.1601_x64-setup.exe`, `SHA256SUMS.txt` ký Sigstore.
- Mã winget dự kiến đổi thành `tsudev.TsuContact` (chưa phát hành lên winget-pkgs). Tên miền giữ `contact.tsudev.com`.
- Scoop: gói mới `tsucontact`; `tsudev-contact` thành gói chuyển tiếp (`replacedBy: tsucontact`) - scoop-bucket#10 đã merge.
- Website `contact.tsudev.com` chạy trên Worker mới `tsucontact` (đã deploy, quét giao diện production đạt).

## Việc của repo nhận

1. `npm run pkg:catalog` để bản chụp nhận gói Scoop `tsucontact` (bỏ `tsudev-contact`).
2. `packages/ui/src/lib/ecosystem.ts` dòng ~227: tên "Tsu Contact", `releases` `https://github.com/tsudev-org/tsucontact/releases/latest`;
   `scripts/noi-dung-he-sinh-thai.js`, `scripts/he-sinh-thai/metadata.json`: tên + URL repo mới.
3. ⛔ `TRADEMARKS.md` dòng 6 (thêm `Tsu Contact`): vùng bảo vệ, mở PR chờ chủ dự án duyệt.
4. `CLAUDE.md` dòng 239: thêm `tsucontact` vào danh sách tên.

## Phát hiện kèm (👤 chủ dự án)

- Mọi site `*.tsudev.com` (contact, files, trafficmonitor, tsudev.com) bị Cloudflare chèn script nội tuyến
  `/cdn-cgi/challenge-platform/scripts/jsd/main.js` (JavaScript Detections của Bot Management, cấp zone) - CSP
  `script-src 'self'` chặn nó nên console mọi trang báo lỗi và công cụ `quet-giao-dien.cjs` không ra OK. Tắt ở
  Cloudflare: Security > Bots > JavaScript Detections (hoặc Configure Super Bot Fight Mode).

## Kết quả xử lý (phiên nhận điền)

Phiên 54 (16/11/2026): mục 1-2 XONG - #275 (`pkg:catalog`: Scoop `tsucontact`; tên "Tsu Contact", Release
`tsudev-org/tsucontact`; winget chưa khai vì chưa phát hành), deploy `v2026.11.16.3`, đo `/apps`: "Tsu Contact" 6 lần.
Mục 3 ⛔ PR #276. Mục 4 (CLAUDE.md): báo chủ dự án. JavaScript Detections: 👤 (đã có trong danh sách việc của chủ dự án).
