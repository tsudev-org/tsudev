# Phiếu 20261121-11 - BP sound-db, K2 backfill AKB, `.standards` v4.4.0

- Phiên: tsudev-40 (điều phối, mở trong `~/projects/tsudev`), ~10:00-10:45 UTC 21/11/2026 (17:00-17:45 giờ VN).
- Phiếu trước: [`20261121-10`](20261121-10_std43-providers-lien-ket-tai-khoan.md). Không khoá, không tác vụ nền.
- AKB: `SES-20261121-1659-5a12`, bài học `LES-20261121-1719-cd92`.

## 1. Đã làm (theo câu lệnh khởi động của phiếu 10, mục 3)

0. **Thư nhắc Pro, lượt 01:23 UTC 21/11**: Worker `tsudev-newsroom-cron` ĐÃ CHẠY - GraphQL Analytics
   `workersInvocationsAdaptive`: status `success`, 0 lỗi, **14 subrequest** (lượt 01:23 và 13:23 UTC 20/11, trước khi có
   thư nhắc: 10) ⇒ lời gọi `POST /ent/reminders/run` đã đi. **Kết quả gửi/hỏng CHƯA kiểm được**: token Cloudflare trên
   máy bị `Forbidden` ở API Observability, không có log Render trên máy. Cách đo ghi ở `LES-20261121-1719-cd92`.
1. **Thử liên kết GitHub/Google đầu-cuối**: KHÔNG làm - cần đăng nhập tài khoản thật (👤, mục 2).
2. **Phiên bản `.standards` trên `main`**: qulythuchi v4.3.0; app-la-ban, sound-db v4.2.0. Bộ quy ước đã ra **v4.4.0**
   (19:55 UTC 20/11, MINOR: PACKAGING 1.2.0 + ECOSYSTEM_IDENTITY 3.2.0, "tsudev đã đạt"). Theo hướng dẫn nâng cấp mỗi
   repo sync trong PR kế tiếp của nó - không có phiên app-la-ban/qulythuchi/sound-db đang mở nên không nhắn.
   tsudev sync v4.4.0 ngay trong PR bàn giao này.
3. **TR1-b**:
   - **sound-db: BP 16974 passing 100%** (63 Met / 3 N/A / 1 Unmet `version_semver` - CalVer). sound-db#32 gộp
     (`ed4f0c8`, CI 10/10): `CONTRIBUTING.md` tiếng Anh, tóm tắt tiếng Anh README/SECURITY, huy hiệu,
     `docs/best-practices.json|md`, fuzz `packages/dsp-core/tests/fuzz.rs` (NaN trong snapshot là hợp đồng "chưa có dữ
     liệu" - fuzz chỉ kiểm không panic + `leq` không NaN khi đã có mẫu). TLS đo lại: TLS 1.3 mặc định, edge còn nhận
     AES128-SHA ở TLS 1.2 - ghi đúng như vậy ở `crypto_pfs`. Trang chủ repo GitHub sửa `sounddb.tsudev.com` ⇒
     `sound.tsudev.com` (ADR-0007).
   - **app-la-ban: KHÔNG làm được trung thực** - LICENSE là độc quyền ("All rights reserved"), tiêu chí bắt buộc
     `floss_license` Unmet (giống trafficmonitor). Repo còn ở `tsudev-tsudev/app-la-ban`, chưa vào org.
   - tsuscan: vẫn chờ bản phát hành đầu.
4. **K2 - backfill AKB 5 repo** không có phiên AKB nào: tsufiles, tsucontact, tsuswico, tsucwico, tsudisk. 16 DEC tóm
   tắt máy từ `docs/adr/` (tag `backfill`, `confidence: medium`, `source` = tệp ADR @ commit; ADR "Đề xuất" ⇒ `proposed`),
   `02_FEATURES.md` (trích mục tính năng của README) + `03_RUNBOOK.md` (con trỏ tới mục README, không chép lệnh).
   `akb lint --all` 0 lỗi (57 cảnh báo L11 có sẵn). Đã sync từng dự án.

## 2. Việc 👤 / chưa kiểm được

- Thư nhắc Pro: xem log Render dòng `[auth] thư nhắc Pro:` quanh 01:23 UTC 21/11 (hoặc `npm run cron:tail` lúc 13:23
  UTC). Muốn agent tự đọc được: thêm quyền "Workers Observability Read" cho token trong `~/.config/tsudev/cloudflare.env`.
- Liên kết GitHub/Google đầu-cuối trên production (phiếu 10 mục 2) - vẫn chưa thử.
- STD43 mục 3 (Apple) - chờ quyết định App Store.

## 3. Câu lệnh khởi động phiên điều phối kế tiếp

```
Bạn là agent điều phối TsuDEV (mở trong ~/projects/tsudev). Theo CLAUDE.md, đọc logs/STATE.md, phiếu
logs/handover/20261121-11_*.md rồi dòng cuối mục 6 của ~/projects/logs/handover/20261120-01_*.md. akb start.
1) Nếu chủ dự án đã gửi log Render / cấp quyền Observability: xác nhận thư nhắc Pro (sent/failed); hỏng thì sửa, mở PR.
2) K2 đợt 2 (≤ 5 repo không có phiên): lotus-share, tsuscan, tsudev-trafficmonitor, linux-packages, tsudev-ui-flutter
   - cùng khuôn đợt 1 (`~/projects/logs/tools/akb-backfill/`: DEC từ docs/adr + 02/03 con trỏ README).
3) TR1-b còn lại: tsuscan sau bản phát hành đầu; lotus-share khi hết cảnh báo chặn (phiếu lotus-share 20261115-01).
Tự chọn phương án; bước cần tôi thì ghi lệnh rồi làm bước kế. Cuối phiên ghi bàn giao vào logs/handover/ + mục 6.
```
