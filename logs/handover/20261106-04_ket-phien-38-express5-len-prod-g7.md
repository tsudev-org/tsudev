# PHIẾU BÀN GIAO - Kết phiên 38: Express 5 lên production, G7 xong, nhánh an ninh CHỜ T23

- **Mã phiếu**: 20261106-04
- **Từ**: phiên 38 (06/11/2026) - **Đến**: phiên 39 + chủ dự án
- **Trạng thái**: MỞ
- **Thay phiếu**: [`20261106-03`](20261106-03_ket-phien-37-giai-doan-2-attt.md) - T22 xong (push + PR), việc agent §3.4 (G7) xong.

## ⚡ Khởi động phiên 39

1. `git fetch && git status`. Nếu #158 chưa merge thì phiếu này CHỈ có trên `docs/siet-tai-len-va-totp`.
2. Hỏi chủ dự án đã làm T23 chưa. CHƯA ⇒ đừng merge #159.
3. Khoá file vào `logs/LOCKS.md` trước khi sửa.

## 0. Trạng thái (đo, không suy)

| PR   | nhánh                              | trạng thái                                                                 |
| ---- | ---------------------------------- | -------------------------------------------------------------------------- |
| #157 | `chore/express-5`                  | **MERGED** 05:50Z, Render deploy `f6b5639` success 05:52Z. #154 đã đóng    |
| #158 | `docs/siet-tai-len-va-totp`        | CI 19/19 xanh, đã cập nhật theo main. **Chưa merge** (xem §2)              |
| #159 | `feat/trung-tam-an-ninh-phat-hanh` | rebase lên main sau Express 5 + thêm commit G7. Nhãn `CHO-T23`. Chưa merge |

Production sau Express 5 (curl, 06/11): `tsudev-backend.onrender.com/health` 200 (`bundled: content, storage, identity`), JWKS phát hành 200, POST đăng nhập không body 401; `tsudev.com/`, `/blog`, `/projects` 200 có nội dung (45 kB / 120 kB / 19 kB); `/api/auth/providers` chỉ có `credentials` + `passkey`.

Frontend KHÔNG cần deploy ở phiên này: #157 chỉ đổi backend, #158 chỉ tài liệu. Deploy frontend + `npm run cron:deploy` đi cùng #159.

## 1. Làm trong phiên

- **G7 đóng** (commit trên #159): `POST /api/identity/useradmin/role` và `/delete` gọi `requireStepUp` SAU kiểm đầu vào, TRƯỚC khi ghi. `/admin/accounts` bắt `STEP_UP_REQUIRED` (401) ⇒ hộp nhập TOTP, giữ token 5 phút trong bộ nhớ trang, tự chạy lại đúng thao tác. `revoke` (thu hồi phiên) CỐ Ý không đòi step-up - đó là nút cứu hoả khi phiên bị chiếm.
- Test: auth 211 (5 ca step-up mới: thiếu token, token người khác, token trước khi tăng sessionVersion, lỗi đầu vào vẫn trả trước), frontend 168 (`mfa.test.ts` đối chiếu hằng `STEP_UP_REQUIRED` với `@tsudev/auth`). Sau rebase: content 303, storage 18, bundle 19, `tsc -b --force` sạch, lint sạch.

## 2. 🔴 Việc của chủ dự án

| #   | việc                                                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T26 | **Merge #158** (`gh pr merge 158 --merge`). Agent bị bộ phân loại auto mode của Claude Code chặn merge vào `main` sau #157 (xếp loại "Production Deploy"). Muốn agent tự merge: thêm quy tắc cho phép `Bash(gh pr merge:*)` trong `.claude/settings.local.json` |
| T23 | TRƯỚC khi merge #159: `pg_dump` Neon (`/usr/lib/postgresql/18/bin/pg_dump`) rồi `db:migrate` lên Neon. Máy dev KHÔNG có URL Neon trong `.env` (chỉ DB local) nên agent không làm thay được                                                                      |
| T24 | `RELEASE_INTEGRITY_TOKEN` (`openssl rand -hex 32`) cùng giá trị ở Render + Worker, rồi `npm run cron:deploy`                                                                                                                                                    |
| T25 | `VIRUSTOTAL_API_KEY` ở Render                                                                                                                                                                                                                                   |
| T27 | Sau merge #159: `npm --workspace apps/frontend-main run deploy` (hoặc cho agent làm), nghiệm thu `curl -s https://tsudev.com/api/auth/providers`                                                                                                                |
| -   | T18-T21, T19 còn từ phiếu 02                                                                                                                                                                                                                                    |

## 3. Việc kế tiếp của agent

1. Sau T23: merge #159 (cập nhật nhánh theo main nếu cần), theo dõi Render deploy, deploy frontend, `cron:deploy`.
2. Nghiệm thu (phiếu 03 §3.2): sửa 1 byte tệp trong MinIO local ⇒ `POST /api/internal/releases/integrity` ⇒ `LECH_TOAN_VEN`, link tải 404; `npm run cron:tail` có dòng `[cron] kiểm toàn vẹn:`. Ở prod: đổi vai trò một tài khoản test ở `/admin/accounts` phải hỏi TOTP.
3. Override minimatch sau 10/11 (phiếu 02 §3.3). Chuyển repo vào Org sau T19 (phiếu 02 §3.1).
4. GitHub báo 2 lỗ hổng Dependabot trên `main` (1 moderate, 1 low) - xem và xử lý ở phiên sau.

## 4. Bẫy gặp

- **Bộ phân loại auto mode chặn `gh pr merge` không ổn định**: #157 qua, #158 (chỉ tài liệu) bị chặn với lý do "Production Deploy". Không lách; ghi thành T26.
- Rebase #159 lên main sau Express 5 KHÔNG xung đột, nhưng bắt buộc `npm ci` lại (lock đổi) rồi `tsc -b --force`.
- `verifyCode.test.ts`/auth đỏ MỘT ca ở lượt đầu, lượt sau 211/211 - lần thứ hai gặp chập chờn này (phiếu 03 §4). Nên điều tra ở phiên sau.
- Phiếu 03 ghi "content 307" cho nhánh an ninh; đo lại ra 303 với cùng 200 định nghĩa test trước và sau rebase - con số 307 nhiều khả năng là đếm nhầm, không phải mất ca.

Hiện trạng máy lúc đóng phiên 38: không tiến trình nền, không worktree; Postgres user-space :5433 vẫn chạy.
