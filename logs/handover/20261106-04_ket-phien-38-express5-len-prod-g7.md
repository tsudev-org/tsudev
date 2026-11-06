# PHIẾU BÀN GIAO - Kết phiên 38: Express 5 + Trung tâm an ninh phát hành + G7 đã LÊN PRODUCTION

- **Mã phiếu**: 20261106-04
- **Từ**: phiên 38 (06/11/2026) - **Đến**: phiên 39 + chủ dự án
- **Trạng thái**: MỞ
- **Thay phiếu**: [`20261106-03`](20261106-03_ket-phien-37-giai-doan-2-attt.md) - T22, T23 xong; việc agent §3.1 + §3.4 (G7) xong.

## ⚡ Khởi động phiên 39

1. `git fetch && git status` trên `main`.
2. Hỏi chủ dự án T24/T25 xong chưa. Xong ⇒ làm nghiệm thu §3.1.
3. Khoá file vào `logs/LOCKS.md` trước khi sửa.

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

| #   | việc                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T24 | `openssl rand -hex 32` ⇒ `npm --prefix infrastructure/canh-site-cron run secret-integrity` (hỏi `RELEASE_INTEGRITY_TOKEN` rồi `INTERNAL_API_TOKEN` = giá trị ở Render) + đặt `RELEASE_INTEGRITY_TOKEN` cùng giá trị ở Render |
| T25 | `VIRUSTOTAL_API_KEY` ở Render (thiếu ⇒ bản mới niêm phong mang `CHUA_QUET`)                                                                                                                                                  |
| T28 | **Đổi mật khẩu `neondb_owner`** nếu chưa làm: URL kèm mật khẩu đã lộ trong ảnh chụp gửi vào phiên 38 và trong `~/.bash_history`. Đổi xong cập nhật `DATABASE_URL` ở Render                                                   |
| T29 | Xoá database `keycloak` trên Neon (92 bảng Keycloak cũ, có thông tin đăng nhập cũ; không gì dùng). `pg_dump` trước nếu muốn giữ; xoá tệp `backup/neon-20261106-truoc-an-ninh.dump` (là dump Keycloak, tên dễ nhầm)           |
| -   | T18-T21, T19 còn từ phiếu 02                                                                                                                                                                                                 |

## 3. Việc kế tiếp của agent

1. Sau T24: `npm run cron:tail` chờ nhịp `23 1,13` UTC có dòng `[cron] kiểm toàn vẹn:`; nghiệm thu local (phiếu 03 §3.2): sửa 1 byte tệp MinIO ⇒ `LECH_TOAN_VEN`, link tải 404. Ở prod: đổi vai trò một tài khoản test ở `/admin/accounts` phải hỏi TOTP.
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

Hiện trạng máy lúc đóng phiên 38: không tiến trình nền, không worktree; Postgres user-space :5433 vẫn chạy.
