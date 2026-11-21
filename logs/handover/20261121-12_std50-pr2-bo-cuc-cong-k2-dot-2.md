# Phiếu 20261121-12 - STD50 PR 2 (bố cục `cong` + `quang-sang`), K2 backfill AKB đợt 2

- Phiên: tsudev-ae (điều phối, mở trong `~/projects/tsudev`), ~11:20-12:10 UTC 21/11/2026 (18:20-19:10 giờ VN).
- Phiếu trước: [`20261121-11`](20261121-11_bp-sound-db-k2-akb-standards-v4-4-0.md). Không khoá, không tác vụ nền
  (dev stack cục bộ đã tắt; cụm Postgres 5433 user-space vẫn chạy - vô hại, `npm run db:down` nếu muốn tắt).
- AKB: `SES-20261121-1821-1a2e`.

## 1. Đã làm

1. **STD50 PR 2 + MAY** - #358 gộp, deploy **`deploy-2026.11.21.5`** Worker `8616d7ed`. Chi tiết + nghiệm thu: phiếu
   [`20261121-STD50`](20261121-STD50_ban-sac-san-pham-v5.0.0.md) mục "Kết quả xử lý" (phiếu ĐÓNG). Ảnh trước/sau:
   `~/projects/logs/anh-chup/tsudev/20261121-STD50/`.
2. **K2 đợt 2** (`~/projects/logs/tools/akb-backfill/`): 12 DEC từ ADR (lotus-share 1, tsuscan 10, tsudev-ui-flutter
   1; trafficmonitor + linux-packages không có `docs/adr/`), `02_FEATURES.md` + `03_RUNBOOK.md` con trỏ README cho cả
   5 repo; tsuscan README không có danh sách tính năng ⇒ con trỏ tay tới mục README + 10 DEC. `dec_tu_adr.py` nay đọc
   ADR từ `origin/main` (tsuscan đang ở `feat/p6-camera` với 41 tệp sửa) và nhận `AKB_AGENT`. Đã sync 5 dự án
   (lotus-share do phiên lotus-share-65 sync sau khi sửa lỗi lint L03 ở bài học của chính phiên đó).

## 2. Bẫy gặp trong phiên

- Deploy xong mà KHÔNG gắn thẻ: `next build` sửa `apps/frontend-main/next-env.d.ts` (đường `.next/dev/types` ⇒
  `.next/types`) ⇒ `release-tag.js` thấy cây bẩn. Sửa: `git checkout apps/frontend-main/next-env.d.ts` rồi
  `npm run release:tag`.
- `npm run dev:local` lần này không mở proxy 8080; chụp ảnh không cần đăng nhập thì gõ thẳng `127.0.0.1:3000`.

## 3. Việc 👤 / còn mở

- Thư nhắc Pro (log Render `[auth] thư nhắc Pro:`) và liên kết GitHub/Google đầu-cuối - như phiếu 11 mục 2.
- STD43 mục 3 (Apple) - chờ quyết định App Store.

## 4. Câu lệnh khởi động phiên điều phối kế tiếp

```
Bạn là agent điều phối TsuDEV (mở trong ~/projects/tsudev). Theo CLAUDE.md, đọc logs/STATE.md, phiếu
logs/handover/20261121-12_*.md rồi dòng cuối mục 6 của ~/projects/logs/handover/20261120-01_*.md. akb start.
1) Nếu chủ dự án đã gửi log Render / cấp quyền Observability: xác nhận thư nhắc Pro (sent/failed); hỏng thì sửa, mở PR.
2) TR1-b còn lại: tsuscan sau bản phát hành đầu; lotus-share khi hết cảnh báo chặn (phiếu lotus-share 20261115-01).
3) K2 đợt 3 (repo chưa có DEC/02/03 và không có phiên đang mở) - cùng khuôn ~/projects/logs/tools/akb-backfill/.
Tự chọn phương án; bước cần tôi thì ghi lệnh rồi làm bước kế. Cuối phiên ghi bàn giao vào logs/handover/ + mục 6.
```
