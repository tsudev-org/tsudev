# PHIẾU BÀN GIAO 20261121-13 - Điều phối: K2 đợt 3, đo lại SignPath lotus-share, thư nhắc Pro vẫn chờ log

- **Phiên**: tsudev-ad (điều phối) - 21/11/2026 ~20:40-21:00 UTC
- **Trạng thái**: ĐÓNG - không khoá, không tác vụ nền, không thay đổi mã/deploy
- **Phiếu trước**: [`20261121-12`](20261121-12_std50-pr2-bo-cuc-cong-k2-dot-2.md)

## 1. Đã làm

- **(0) Thư nhắc Pro**: chủ dự án chưa dán log Render; máy không có khoá Render, token Cloudflare không đọc được
  Observability, URL Neon không có trên máy ⇒ vẫn chưa xác nhận sent/failed. Không có gì để sửa.
- **(1) TR1-b**:
  - tsuscan: `gh release list` + tags = rỗng ⇒ chưa có bản phát hành đầu, BP tiếp tục hoãn (version/release_notes
    không khai Met trung thực được).
  - lotus-share (phiếu 20261115-01): BP 16860 đã passing từ 18/11; đo lại bảng 6 ngưỡng SignPath: 0 sao/0 fork,
    PR gộp chỉ của tài khoản dự án, 7 Release (thêm v26.11.1801, v26.11.1901), **1194** lượt tải (trước 894),
    Scorecard **6.9** (20/11, trước 6.8), Dependabot 0, code scanning 5 (toàn cảnh báo Scorecard, 0 CodeQL). 0/6
    đạt trọn ⇒ chưa nộp. Phiên `lotus-share-0c` đang mở ⇒ KHÔNG sửa hộ; đã gửi số đo qua SendMessage để phiên đó
    chép vào phiếu.
- **(2) K2 đợt 3** (repo chưa có DEC/02/03, không phiên mở - lúc chạy chỉ `ubnd-2a`, `lotus-share-0c` mở):
  - DEC từ ADR: qulythuchi 19, tsusync 3, app-la-ban 2 (24 DEC, tag backfill, confidence medium).
  - 02_FEATURES + 03_RUNBOOK con trỏ: qulythuchi, tsusync, app-la-ban, scoop-bucket, homebrew-tap.
  - `akb lint --all` 0 lỗi; `akb reindex`; `akb sync --project` cho 5 repo.
  - Công cụ `~/projects/logs/tools/akb-backfill/features_runbook.py`: thêm chế độ mục `''` = lấy bảng/gạch đầu dòng
    ở phần mở đầu README (repo không có mục tính năng riêng), từ khoá runbook thêm "triển khai"; CFG ghi đợt 3.

## 2. Bẫy gặp trong phiên

- Tên phiên trong ListAgents đổi giữa hai lượt (lotus-share-65 đóng, lotus-share-0c mở 28 giây trước) ⇒ SendMessage
  trả "No agent named" - liệt kê lại ngay trước khi gửi.

## 3. Việc 👤 / còn mở

- Thư nhắc Pro: dán log Render dòng `[auth] thư nhắc Pro:` (Render Dashboard → backend → Logs, lọc chuỗi đó quanh
  01:23 UTC 21/11), hoặc cấp token Cloudflare quyền Workers Observability.
- K2 còn lại (chưa có DEC/02/03): sound-db (DEC 3/7 ADR, 02/03 trống), tsudev (DEC 2/4 ADR, 02/03 trống),
  tsudev-standards (02/03 trống), cùng nhóm repo không ADR (ubnd*, game tsudev-*, luu-tru, reclip...).
- TR1-b: tsuscan khi có Release đầu; lotus-share SignPath đo lại hằng tuần (sớm nhất đạt ngưỡng 4: 05/2027).
- STD43 mục 3 (Apple) - chờ quyết định App Store.

## 4. Câu lệnh khởi động phiên điều phối kế tiếp

```
Bạn là agent điều phối TsuDEV (mở trong ~/projects/tsudev). Theo CLAUDE.md: đọc AGENTS.md, logs/STATE.md,
phiếu logs/handover/20261121-13_*.md (mục 3-4) và dòng cuối mục 6 của ~/projects/logs/handover/20261120-01_*.md;
akb start. Khoá file vào logs/LOCKS.md trước khi sửa.
0) [Dán log Render "[auth] thư nhắc Pro:" ở đây nếu có] - xác nhận sent/failed; hỏng thì sửa + PR + deploy.
1) TR1-b: tsuscan đã có Release đầu chưa (có ⇒ hồ sơ Best Practices).
2) K2 đợt 4: sound-db (DEC thiếu 4 ADR), tsudev, tsudev-standards + ≤ 2 repo khác không có phiên mở (ListAgents),
   bằng ~/projects/logs/tools/akb-backfill/ (dec_tu_adr.py KHÔNG bỏ qua ADR đã có DEC - sound-db/tsudev
   chạy lại sẽ sinh DEC trùng: thêm bước lọc theo tên ADR trước).
Tự chọn phương án, không hỏi lại; việc cần tôi thì ghi lệnh rồi làm bước kế. Gộp + deploy được phép.
Cuối phiên: phiếu bàn giao mới trong logs/handover/ + STATE + mục 6, akb close + sync.
```
