# Phiếu 20261121-09 - Điều phối: đồng bộ quy ước v4.2.0 toàn hệ, BP tsusync

- Phiên: tsudev-09 (điều phối, mở trong `~/projects/tsudev`), 17:20-18:00 UTC 20/11/2026 (00:20-01:00 giờ VN 21/11).
- Phiếu mẹ: `~/projects/logs/handover/20261120-01_*` (đã ghi dòng mục 6) và `20261120-02_*` (hàng TR1-b).
- Không khoá, không tác vụ nền còn chạy.

## 1. Đã làm

0. **Thư nhắc Pro**: lượt đầu 01:23 UTC 21/11 CHƯA tới giờ (phiên kết thúc ~18:00 UTC 20/11) ⇒ không kiểm được.
   Phiên sau: `npm run cron:tail` hoặc log Render dòng `[auth] thư nhắc Pro`.
1. **`.standards` v4.2.0** (`scripts/sync-standards.sh --ref v4.2.0` trong worktree sạch từ `origin/main`, cổng
   `check-standards.sh` xanh trước khi đẩy), đã gộp: ban-do-3d (TsuGameLabs/tsudev-nuicam3d#114), lotus-share#113
   (kèm phiếu GP1), sound-db#28, tsucontact#38, tsucwico#101, tsudev-trafficmonitor#77, tsudev-ui-flutter#5,
   tsudisk#47, tsuscan#11 (kèm phiếu GP1), tsuswico#65, tsusync#8. **tsufiles#123** mở - xem mục 3.
   - app-la-ban: phiên app-la-ban-79 tự làm (commit 7595dfd + 5502604 trên `phase/pro2-tsudev-pro`, sẽ squash vào main).
   - qulythuchi: phiên qulythuchi-86 nhận, sẽ mở PR riêng.
   - tsudev: đã 4.2.0 từ #349.
   - Không có `.standards`: b4djl1h-cmdb, homebrew-tap, linux-packages, mieubathuong, quansu-xanuicam, scoop-bucket,
     tsudev-org-dotgithub, ubnd*, wedding-sumy - bỏ qua (không thuộc diện đồng bộ).
2. **Phiếu GP1**: sound-db đã commit từ trước (#26); lotus-share, tsuscan commit trong PR đồng bộ (không có phiên
   mở); app-la-ban do phiên của nó. Bản chưa theo dõi trùng main ở thư mục làm việc lotus-share/tsuscan đã xoá;
   `tsudev-lotus` (bản sao thứ hai của lotus-share) còn một bản KHÁC main - để phiên lotus-share đối chiếu.
3. **TR1-b BP tsusync 16955 passing 100%** (tsusync#9 `ca222a0`, #10 huy hiệu):
   - Máy khách TS + Dart từ chối `baseUrl` không `https://` (http chỉ localhost) - trước đó JWS quyền lợi đi được qua
     http rõ. Test cả hai ngôn ngữ.
   - Rust: muối KDF từ `randombytes_buf` (CodeQL #11 critical, báo nhầm `[0u8; N]` + `copy_randombytes`); #8-#10 (mật
     khẩu vector công khai) dismiss "used in tests". AKB `tsusync#LES-20261121-0037-b452`.
   - Fuzz đột biến TS (`clients/ts/test/fuzz.test.ts`) - không tìm ra lỗi; CONTRIBUTING tiếng Anh; tóm tắt tiếng Anh.
4. Ghi hộ qulythuchi-dd7b một dòng vào phiếu QT5 mục 4 (app Play đã tạo; chưa tạo được sản phẩm do 👤 hồ sơ thanh
   toán + AAB có BILLING).

## 2. Việc 👤

- Không có việc 👤 mới phát sinh từ phiên này. Việc 👤 cũ vẫn ở các phiếu: hồ sơ thanh toán Play (QT5/GP1), TR1 mục 3.5.

## 3. Còn dở

- tsufiles#123 (đồng bộ v4.2.0): CI bản dựng đa nền tảng còn chạy lúc đóng phiên. Xanh ⇒ `gh pr merge 123 -R
tsudev-org/tsufiles --squash --delete-branch` (repo không bật auto-merge).
- BP còn: sound-db, tsuscan, app-la-ban (có/hay có phiên riêng); trafficmonitor không làm được trung thực (Anti-996).

## 4. Câu lệnh khởi động phiên điều phối kế tiếp

```
Bạn là agent điều phối TsuDEV (mở trong ~/projects/tsudev). Theo CLAUDE.md, đọc phiếu
logs/handover/20261121-09_*.md rồi dòng cuối mục 6 của ~/projects/logs/handover/20261120-01_*.md.
0) Thư nhắc Pro (lượt 01:23 UTC 21/11): `npm run cron:tail` hoặc log Render "[auth] thư nhắc Pro"; lỗi thì sửa, mở PR.
1) Gộp tsufiles#123 nếu xanh; kiểm app-la-ban và qulythuchi đã lên v4.2.0 trên main chưa (ListAgents, nhắn nếu chưa).
2) TR1-b: BP tsuscan (không có phiên riêng thì tự làm theo mẫu tsusync#9: docs/best-practices.json, CONTRIBUTING,
   fuzz, CodeQL mở = 0), rồi K2 (backfill AKB ≤ 5 repo không có phiên).
Tự chọn phương án; bước cần tôi thì ghi lệnh rồi làm bước kế. Cuối phiên ghi bàn giao vào logs/handover/ + mục 6.
```
