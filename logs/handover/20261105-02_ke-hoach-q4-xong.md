# PHIẾU BÀN GIAO - Kế hoạch Q4/2026 xong phần agent làm được; production đủ tính năng

- **Mã phiếu**: 20261105-02
- **Từ**: phiên 33 - **Đến**: chủ dự án / phiên 34
- **Thời điểm**: 05/11/2026
- **Trạng thái**: ĐÃ ĐÓNG (phiên 34) - mục còn mở chuyển sang [`20261105-03`](20261105-03_ket-phien-34.md)
- **Thay phiếu**: [`20261105-01`](20261105-01_go-xong-ma-cho-migrate-prod.md) - ĐÃ ĐÓNG (mọi mục xong)

## 1. Đã LIVE trên production trong phiên 33 (đo, không suy)

| việc                                     | PR / bước                              | số đo                                                                                        |
| ---------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| site hết treo                            | chủ dự án `db:migrate`                 | `/health` 200; `prod:dem-noi-dung` ĐẠT (111 URL · 50 bài · 50 tài liệu · 620 kết quả)        |
| backend chỉ còn content/storage/identity | Render deploy `main`                   | `bundled: [content, storage, identity]`; `/api/trust/*`, `/api/newsroom/*` 404               |
| migration DROP (17 bảng, 12 enum)        | `pg_dump` 18 → migrate → #101          | dump 3,3 MB / 34 bảng ở `~/tsudev-backups/truoc-drop-20261105.dump` (máy dev)                |
| frontend ISR + R2                        | deploy `3a7c37e4`                      | `x-nextjs-cache: HIT/STALE`; providers chỉ Mật khẩu/Passkey/GitHub/Google                    |
| §6.5 nghiệm thu cache khi backend chết   | đo ở local (OpenNext + `wrangler dev`) | `/`, `/blog`, `/docs` 200 đủ link qua HIT → STALE → HIT khi backend TẮT; slug chưa cache 500 |
| §6.6 tải lên R2 + niêm phong + ký        | #109                                   | đầu-cuối MinIO: sha256 khớp `sha256sum`; URL trần 403 ⇒ đường tải đổi sang presign GET       |
| tên biến đợt 2 + đổi thư mục cron        | #110                                   | JWKS vẫn kid `tsu-2026-08-efdb94` sau khi gỡ nhánh lùi `TRUST_SIGNING_*`                     |
| §6.7 cổng hạn mức Neon                   | #111, cron `98eb302b`                  | Worker `/dem` 200 `dat: true`; 5 test `hanMucNeon`                                           |
| dọn tài liệu + khôi phục `cronContract`  | PR docs của phiên này                  | 9/9 test cron xanh; `docs/release-signing.md` thay `trust-seal.md`; agent `release-signing`  |

Phát hiện thật trong phiên (cả ba đều hỏng IM LẶNG):

1. **Đường tải tệp R2 trả 403 ở production** - nó chuyển hướng tới
   `endpoint/bucket/key` trần trong khi bucket không mở đọc ẩn danh; test lại
   khẳng định chính URL trần đó. Sửa trong #109 (presign GET 5 phút).
2. **Bucket R2 `tsudev` production KHÔNG có CORS** (`wrangler r2 bucket cors list`)
   - `ensureBucket()` gọi `PutBucketCors` thất bại và chỉ `console.warn`.
3. **`cronContract.test.ts` bị xoá cùng newsroom-service ở #99** dù chú thích dặn
   chuyển đi. Khôi phục vào `apps/frontend-main/test/`.

Và nguyên nhân THẬT của lần deploy sai tài khoản Cloudflare: tệp cache
`node_modules/.cache/wrangler/wrangler-account.json` (logout không xoá) - ghi vào
`CLAUDE.md`.

## 2. 🔴 Việc TAY của chủ dự án (agent bị chặn hoặc không có quyền)

1. **`npm run r2:cors`** - không có nó, nút "Tải lên và tạo" ở `/admin/projects`
   báo lỗi CORS. Agent bị chặn chạy lệnh ghi cấu hình bucket production.
   Nghiệm thu: `npm run r2:cors:list` in 2 origin; tải thử một tệp nhỏ ở trang
   quản trị → thấy "đã niêm phong và ký".
2. **Đổi mật khẩu Neon lần nữa** - mật khẩu hiện tại xuất hiện trong ảnh chụp màn
   hình của phiên. Rồi cập nhật `DATABASE_URL` trên Render.
3. **`npm run cron:secret-telegram`** (báo động đo nội dung) và
   **`npm run cron:secret-neon`** (cổng hạn mức; `NEON_API_KEY` + `NEON_PROJECT_ID`).
   Thiếu thì Worker chỉ log. Đặt `TELEGRAM_*` cả trên Render (nửa backend).
4. **Xoá rác ở tài khoản Cloudflare `dieuhanhcongviecxanuicam`**: Worker `tsudev`
   (`npx wrangler delete --name tsudev`) và bucket `tsudev-next-cache`.
5. **Dự án `tsudev-trust-seal` trên production** mô tả tính năng đã gỡ - sửa hoặc
   ẩn ở `/admin/projects` (agent bị cấm tạo/sửa dự án).
6. **Quyết định §2 kế hoạch Q4**: logo SVG master + tông màu thương hiệu riêng.

## 3. Việc kế tiếp của agent (khi có lý do)

- Trang slug CHƯA từng vào cache trả 500 khi backend chết. Đổi sang 503 + trang
  lỗi thân thiện là cải thiện nhỏ, không chặn gì.
- Khi xoay khoá ký lần đầu: theo `docs/release-signing.md` (khoá cũ vào
  `RELEASE_SIGNING_KEYS_RETIRED` TRƯỚC).
- Giữ bản dump `~/tsudev-backups/` tới khi chắc không cần khôi phục gì từ 17 bảng
  đã DROP; nó nằm trên máy dev, không trong repo.

## 3b. Phân việc phiên 34 - theo agent (`.claude/agents/`)

Mỗi việc chỉ bắt đầu khi điều kiện ở cột 3 đã đúng. Khoá file vào `logs/LOCKS.md`
trước khi sửa.

| agent             | việc                                                                                                               | điều kiện bắt đầu                          | nghiệm thu                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------ |
| `release-signing` | Nghiệm thu đầu-cuối trên PRODUCTION: tải một tệp nhỏ ở `/admin/projects` → niêm phong → công bố → tải về qua modal | chủ dự án đã chạy `npm run r2:cors` (§2.1) | `sha256sum` tệp tải về khớp modal; JWS kiểm được bằng JWKS; `downloadCount` +1 |
| `infra-deploy`    | Kiểm báo động thật: `curl .../dem` + `npm run cron:tail` thấy `báo động → Telegram 200` hoặc dòng Neon CU-giờ      | chủ dự án đã đặt secret cron (§2.3)        | log Worker có dòng `[cron] Neon x/100 CU-giờ`; không còn dòng "CHƯA cấu hình"  |
| `frontend-web`    | Trang slug CHƯA từng vào cache trả 500 khi backend chết → trả 503 + trang lỗi thân thiện, KHÔNG cache trang lỗi    | bất kỳ lúc nào                             | test mới cạnh `isrPages.test.ts`; đo lại bằng `wrangler dev` + tắt backend     |
| `docs-curator`    | Sau khi §2 xong: bỏ các dòng "CHƯA cấu hình" ở `docs/free-tier.md`, `docs/alerting.md`; đóng phiếu này             | §2.1-§2.5 xong                             | `grep -n "CHƯA" docs/free-tier.md docs/alerting.md` không còn mục đã làm       |
| `design-system`   | §2 kế hoạch Q4: logo SVG master + tông màu thương hiệu                                                             | CHỜ quyết định của chủ dự án (§2.6)        | `tokens:check` + `contrast.test.ts` ba chế độ xanh                             |

KHÔNG có việc cho `backend-api`, `data-schema`, `qa-test` ở phiên 34 trừ khi phát
sinh. Không còn PR mở; `main` = commit merge của PR phân việc này.

## 4. Bẫy gặp trong phiên 33

- `!` trong prompt Claude Code KHÔNG nhận nhập phím: `read -s` thoát ngay và cả
  chuỗi `&&` sau nó bị bỏ qua - lệnh cần mật khẩu phải chạy ở terminal riêng.
- `pkill -f '<chuỗi>'` khớp luôn chính shell đang chạy lệnh đó (exit 144).
- Ngay sau deploy frontend, ~30 giây đầu `/blog` `/docs` rỗng (bản dựng lúc build);
  `prod:dem-noi-dung` TRƯỢT một lượt rồi ĐẠT. Đo lại sau 1 phút trước khi kết luận.
