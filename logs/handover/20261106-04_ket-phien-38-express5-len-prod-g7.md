# PHIẾU BÀN GIAO - Kết phiên 38: Express 5 + Trung tâm an ninh phát hành + G7 đã LÊN PRODUCTION

- **Mã phiếu**: 20261106-04
- **Từ**: phiên 38 (06/11/2026) - **Đến**: phiên 39 + chủ dự án
- **Trạng thái**: MỞ
- **Thay phiếu**: [`20261106-03`](20261106-03_ket-phien-37-giai-doan-2-attt.md) - T22, T23 xong; việc agent §3.1 + §3.4 (G7) xong.

## ⚡ Khởi động phiên 39

1. Đọc `AGENTS.md`, `logs/STATE.md`, phiếu này. `git fetch && git status` trên `main` phải sạch (`ac23a85` hoặc mới hơn).
2. Mọi việc của chủ dự án trong phiên 38 đã XONG (T22-T25, T28, T29). Không có PR nào đang mở của phiên 38.
3. Việc đầu tiên: nghiệm thu lượt cron kiểm toàn vẹn (§3.1) - nhịp `23 1,13` UTC đã chạy ít nhất một lần kể từ 20:23 06/11 giờ VN. Không có `[cron] kiểm toàn vẹn:` hoặc có 401/503 ⇒ nghi `INTERNAL_API_TOKEN`/`RELEASE_INTEGRITY_TOKEN` lệch giữa Render và cron Worker (§4).
4. Sau đó làm theo thứ tự §3.2 → §3.5. Khoá file vào `logs/LOCKS.md` trước khi sửa; mỗi chuỗi việc một nhánh + PR (agent ĐƯỢC tự merge: `.claude/settings.local.json` có `Bash(gh pr merge:*)`, chủ dự án đồng ý 06/11). Deploy production vẫn xin xác nhận trừ khi chủ dự án giao rõ.
5. Kết phiên: nhả khoá, dừng tiến trình nền/monitor, viết phiếu `2026MMDD-NN` mới, đổi phiếu này sang ĐÓNG.

## 0. Trạng thái (đo, không suy)

| PR   | nội dung                                       | trạng thái                              |
| ---- | ---------------------------------------------- | --------------------------------------- |
| #157 | Express 4 -> 5 (thay #154, #154 đã đóng)       | MERGED, Render `f6b5639` success        |
| #158 | docs G3/G6 + phiếu 03                          | MERGED                                  |
| #159 | Trung tâm an ninh phát hành B1-B7 + G7 step-up | MERGED `3cd4567`, Render success 06:39Z |

- **Neon**: migration `20261106120000_an_ninh_phat_hanh` ĐÃ áp lên database `neondb` (T23, chủ dự án chạy). Sao lưu trước đó: `backup/neon-tsudev-20261106-truoc-an-ninh.dump` (máy dev, gitignore).
- **Frontend** deploy Workers version `76def872-e5e4-46f7-a35f-c49f2bde9481` qua `scripts/deploy-frontend.js` (tài khoản `9541f44e...`, đã kiểm khớp).
- **Cron** `tsudev-newsroom-cron` deploy version `da2cc231` (lịch `*/5 0-17,23` + `23 1,13`). Worker CHƯA có secret `RELEASE_INTEGRITY_TOKEN`/`INTERNAL_API_TOKEN` ⇒ lượt kiểm toàn vẹn tự bỏ qua kèm log (đúng thiết kế) tới khi T24 xong.

Nghiệm thu production (curl, 06/11 sau deploy): backend `/health` 200; JWKS phát hành 200; `POST /api/internal/releases/integrity` không token 401; tìm kiếm có dữ liệu thật; `/`, `/blog`, `/projects`, `/docs` 200 đủ nội dung SAU 1 phút (ngay sau deploy `/blog` chỉ 14 kB - bản dựng rỗng lúc build, đúng gotcha ISR); `/admin/release-security` + `/admin/accounts` 200; `/api/account/step-up` và `/api/account/useradmin/role` chưa đăng nhập 401. `/api/auth/providers` = `credentials`, `passkey`, `github`, `google` - hai cái sau chỉ bật khi Worker có đủ `*_CLIENT_ID` + `*_CLIENT_SECRET` (`[...nextauth].ts:182-193`), không có provider dev.

## 1. Làm trong phiên

- **G7 đóng**: `useradmin/role` và `useradmin/delete` gọi `requireStepUp` SAU kiểm đầu vào, TRƯỚC khi ghi. `/admin/accounts` bắt `STEP_UP_REQUIRED` (401) ⇒ hộp nhập TOTP, giữ token 5 phút trong bộ nhớ trang, tự chạy lại đúng thao tác. `revoke` CỐ Ý không đòi step-up - nút cứu hoả khi phiên bị chiếm.
- Sửa 2 lỗi CI của #159 mà local không bắt: `releaseSecurity.test.ts` thiếu `export {}` (TS2451 trùng tên với `adminModeration.test.ts`); khoá test trong `stepUp.test.ts` chưa vào allowlist `.gitleaks.toml`.
- Test cuối: auth 211, content 307, storage 18, bundle 19, frontend 168.

## 2. 🔴 Việc của chủ dự án

| #       | việc                                                                                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~T24~~ | XONG 06/11: `RELEASE_INTEGRITY_TOKEN` (giá trị riêng) ở Render + cron Worker; `INTERNAL_API_TOKEN` đã XOAY sang giá trị mới ở Render + Worker `tsudev` + cron Worker (xem §4) |
| ~~T25~~ | XONG 06/11: `VIRUSTOTAL_API_KEY` ở Render (gói free: 4 lượt/phút, điều khoản cấm dùng thương mại - chủ dự án tự cân nhắc)                                                     |
| ~~T28~~ | XONG 06/11: reset mật khẩu `neondb_owner`, `DATABASE_URL` ở Render cập nhật, backend khởi động lại khoẻ                                                                       |
| ~~T29~~ | XONG 06/11 (theo chủ dự án): xoá database `keycloak`. Tệp `backup/neon-20261106-truoc-an-ninh.dump` là dump Keycloak - xoá hoặc đổi tên                                       |
| -       | T18-T21, T19 còn từ phiếu 02                                                                                                                                                  |

## 3. Việc kế tiếp của agent

1. Nhịp `23 1,13` UTC (20:23 / 08:23 giờ VN): `npm run cron:tail` phải có dòng `[cron] kiểm toàn vẹn:` không kèm lỗi 401/503. Nghiệm thu local (phiếu 03 §3.2): sửa 1 byte tệp MinIO ⇒ `LECH_TOAN_VEN`, link tải 404. Ở prod: đổi vai trò một tài khoản test ở `/admin/accounts` phải hỏi TOTP.
2. CodeQL mở 4 cảnh báo mới `js/missing-rate-limiting` (#92-#95: `step-up`, revoke/restore/resign) - cùng loại 24 cảnh báo cũ trên `main`, dương tính giả (`app.use('/api', accountLimit)` + tầng SENSITIVE). Nên dismiss hàng loạt kèm lý do, hoặc đổi sang `express-rate-limit` mà CodeQL nhận ra.
3. GitHub báo 2 lỗ hổng Dependabot trên `main` (1 moderate, 1 low).
4. Override minimatch sau 10/11 (phiếu 02 §3.3). Chuyển repo vào Org sau T19.
5. `verifyCode.test.ts`/auth chập chờn - gặp lần 2 ở phiên 38.

## 4. Bẫy gặp

- **Đọc kết quả jest bằng `Tests:` là KHÔNG ĐỦ.** Suite hỏng biên dịch (TS2451) không được đếm vào `Tests:` - phiên 38 đo "content 303 passed, 303 total" và kết luận xanh trong khi `adminModeration.test.ts` không chạy. Luôn grep cả `Test Suites:` / `FAIL`. Con số 307 của phiếu 03 là ĐÚNG.
- **Neon có HAI database**: `neondb` (tsudev, đúng) và `keycloak` (sót từ thời Keycloak). URL mặc định trong Neon Console có thể trỏ `keycloak`; Prisma trả P3005 "schema is not empty" - may mà nó chặn. Nguồn sự thật cho URL production là `DATABASE_URL` ở Render; migrate thì bỏ `-pooler`.
- **Dán URL có `&` vào `export X=...` không nháy** ⇒ shell chạy nền phần trước `&`, biến không được đặt, `db:migrate` rơi về `.env` local. Dùng `read -rsp` và chuỗi `&&` để migrate không chạy khi `pg_dump` hỏng.
- Bộ phân loại auto mode chặn `gh pr merge` không ổn định cho tới khi có quy tắc `Bash(gh pr merge:*)` trong `.claude/settings.local.json` (đã thêm, chủ dự án đồng ý).
- Ngay sau deploy frontend, trang ISR trả bản rỗng ~14 kB; 1 phút sau đủ nội dung. Đừng kết luận sớm.

- **SỰ CỐ 17:54-18:00 06/11 (giờ VN): `INTERNAL_API_TOKEN` lệch giữa Render và Worker `tsudev` ⇒ BFF 401 toàn bộ** (tìm kiếm, đăng nhập, quản trị, dựng lại ISR; trang đã cache vẫn hiện). Nguyên nhân: hướng dẫn T24 ghi "INTERNAL_API_TOKEN = giá trị ở Render" bị làm theo chiều ngược - đổi Render sang giá trị openssl mới. Secret Worker không đọc lại được nên không khôi phục giá trị cũ; sửa bằng cách XOAY: đặt giá trị mới ở Worker `tsudev` (`wrangler secret put` có hiệu lực ngay, không cần deploy) và cấp `RELEASE_INTEGRITY_TOKEN` một giá trị riêng. `INTERNAL_API_TOKEN` sống ở BA nơi: Render, Worker `tsudev`, cron Worker - đổi một nơi phải đổi cả ba. Viết hướng dẫn secret thì ghi rõ "chép TỪ đâu SANG đâu" và "KHÔNG sửa ở X".

Hiện trạng máy lúc đóng phiên 38: không tiến trình nền, không worktree; Postgres user-space :5433 vẫn chạy.
