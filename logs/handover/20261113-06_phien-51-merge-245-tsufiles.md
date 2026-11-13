# PHIẾU BÀN GIAO - Phiên 51: merge + deploy #245, tên hiển thị TsuFiles, nghiệm thu bot scoop/homebrew

- **Mã phiếu**: 20261113-06
- **Phiên**: phiên 51, 13/11/2026
- **Trạng thái**: HOÀN THÀNH phần agent làm được - PR #247 CHỜ CHỦ SỞ HỮU DUYỆT (mục 3)

## 1. Đã làm

| Việc                                                                                                                                                        | PR   | Production        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------- |
| #245 (logo 6 trò chơi + chân trang di động một hàng): chủ sở hữu đã duyệt 10:30 → Re-run cổng `Bảo vệ bản quyền` → xanh → merge                             | #245 | Worker `d27dba3f` |
| Tên hiển thị **TsuFiles** thay `tsudev-files` trên `/apps`, trang chủ, chân trang "Hệ sinh thái", tài liệu giới thiệu (ADR-0003 repo tsufiles). Tên gói giữ | #248 | Worker `14f17871` |
| `metadata.json` đổi khoá repo `tsudev-files` → `tsufiles` (`--check` báo 2 chỗ lệch; sau sửa: khớp). Đường dẫn bảo vệ ⇒ chờ duyệt                           | #247 | -                 |
| Nghiệm thu việc cũ phiếu 20261113-03 mục 9: scoop-bucket#6/#7, homebrew-tap#4 đã merge; deploy key có; chạy tay `excavator` + `cap-nhat` → cả hai success   | -    | -                 |

Nghiệm thu production (13/11): `/eco/game-*.webp` 6/6 = 200 và tải được trong trang; ảnh 390px chân trang một hàng (cao
59px); `/`, `/apps`, `/docs`, `/blog` = 200; `/apps` có "TsuFiles", lệnh cài vẫn `tsudev-files`.

## 2. Kỹ thuật đáng nhớ

- Cổng `Bảo vệ bản quyền` chạy trên `pull_request_target` - KHÔNG chạy lại khi có review. Chủ sở hữu duyệt xong ⇒
  `gh run rerun <id lượt cuối>` (hoặc gắn nhãn), rồi mới CLEAN.
- `/api/auth/providers` liệt kê `credentials, passkey, github, google`: GitHub/Google là **Worker secret** chủ dự án đặt
  từ 22/08/2026 (STATE.md phiên 15) - hợp lệ, không phải giá trị dev rò vào bản dựng. Phiếu 20261113-05 ghi "chỉ
  credentials + passkey" là thiếu.
- TsuFiles: tên HIỂN THỊ đổi, tên GÓI Scoop/Homebrew/APT và tiền tố tệp phát hành GIỮ `tsudev-files` (trình cập nhật
  bản 2.4.0-vn.1 cần). Phiếu toàn hệ `~/projects/logs/handover/20261113-04`. Đừng đổi `scoop`/`brew` theo tên hiển thị.
- Mục 3 phiếu 20261113-05 ("link releases của files trong `ecosystem.ts`") không tồn tại - mục files không có `releases`.
- Deploy dựng từ working tree: đang deploy thì sửa tệp ở git worktree riêng.
- Ruleset scoop-bucket/homebrew-tap: `Bao ve ban quyen` (required_status_checks, bypass DeployKey) chặn push thẳng `main`
  của mọi tài khoản trừ deploy key bot; `Bao ve main` chặn force-push/xoá. Đã đọc cấu hình, không thử push.

## 3. Việc còn lại

1. **Chủ dự án duyệt #247** bằng `nguyentrangtinhsu`; rồi agent: Re-run cổng, merge (không cần deploy - chỉ script).
   Worktree `../tsudev-wt-metadata` (nhánh `chore/metadata-tsufiles`) - xoá sau khi merge.
2. Tài liệu giới thiệu trên Neon vẫn ghi `tsudev-files` cho tới khi chủ dự án chạy lại
   `scripts/don-noi-dung-lac-de.js --apply --noi-dung` với `DATABASE_URL` production.
3. Khi tag `v2.4.1-vn.*` của tsufiles ra và catalog có gói `tsufiles`: `ecosystem.ts`/catalog sinh lại
   (`npm run pkg:catalog`) để lệnh cài trỏ gói mới.
4. Sáu repo game + game-kit làm phiếu 20261113-04 (logo); khi website game phục vụ logo ⇒ đổi `SOURCES` sang URL.
5. Đề xuất "mọi phần mềm cài được bằng lệnh" (phiếu 20261113-05 mục 4) - chờ chủ dự án quyết.
