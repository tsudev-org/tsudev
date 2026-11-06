# PHIẾU BÀN GIAO - Kết phiên 37: Express 5, Giai đoạn 2 ATTT (B1-B7) dựng xong, CHƯA push

- **Mã phiếu**: 20261106-03
- **Từ**: phiên 37 (06/11/2026) - **Đến**: phiên 38 + chủ dự án
- **Trạng thái**: MỞ
- **Thay phiếu**: [`20261106-02`](20261106-02_ket-phien-36-bao-mat-va-tai-khoan.md) - việc agent §3.2, §3.4, §3.5 xong; §3.1 (chuyển repo vào Org) còn chờ T19; §3.3 chờ 10/11.

## ⚡ Khởi động phiên 38 - làm ĐÚNG thứ tự này

1. ⚠️ **Phiếu này và `logs/STATE.md` mới CHỈ có trên nhánh cục bộ `docs/siet-tai-len-va-totp`** (working tree được để sẵn ở nhánh đó). `main` vẫn trỏ phiếu 02 - đừng `git checkout main` rồi tưởng không có việc gì.
2. `git status` phải sạch; `git branch` phải thấy 3 nhánh ở §0. Thiếu nhánh nào thì DỪNG, báo chủ dự án.
3. Hỏi chủ dự án T22 (cho push). Có phép thì push cả 3, mở 3 PR, gắn nhãn PR an ninh "CHỜ T23 - đừng merge trước khi migrate Neon". Đóng #154 sau khi PR Express 5 merge.
4. Khoá file vào `logs/LOCKS.md` trước khi sửa. Kết phiên: nhả khoá, dừng tiến trình nền, viết phiếu mới.

Hiện trạng máy lúc đóng phiên 37 (đã đo): không cổng 3000/4001/4002/4004/8090 nào nghe, không nodemon/next/dev-proxy, không monitor, không worktree. Postgres user-space :5433 VẪN CHẠY (phiên 37 bật bằng `npm run db:up`) - để nguyên, phiên sau cần nó.

## 0. Trạng thái (đo, không suy)

- **Ba nhánh CỤC BỘ, CHƯA push, CHƯA PR** (agent chờ chủ dự án cho phép push):

  | nhánh                              | commit | nội dung                                                        |
  | ---------------------------------- | ------ | --------------------------------------------------------------- |
  | `docs/siet-tai-len-va-totp`        | 2      | §3.5: docs siết tải lên, ép TOTP, giới hạn tần suất + phiếu này |
  | `chore/express-5`                  | 1      | thay #154 - Express 5 (đóng #154 sau khi merge)                 |
  | `feat/trung-tam-an-ninh-phat-hanh` | 5      | B1-B7 Trung tâm an ninh phát hành, có MIGRATION                 |

- Ba nhánh độc lập, đều từ `main` 89409c6. `node_modules` cục bộ đang theo lock của `main` (đã `npm ci` lại sau nhánh Express).
- Không tiến trình nền, không worktree. DB dev local đã áp migration `20261106120000_an_ninh_phat_hanh`.

## 1. Đo được

- Express 5: `tsc -b --force` sạch; test auth 201, content 264, storage 18, bundle 19; bundle chạy thật (route công khai + JWKS 200, POST không body 400, chiếm cổng ⇒ tiến trình chết).
- Giai đoạn 2: test auth 206, content 307 (releaseSecurity 22 ca), storage 18, bundle 19, frontend 164 (cronIntegrity 6 ca); E2E `release-security.spec.js` 4/4 trên stack dev. Trigger: DELETE/UPDATE/TRUNCATE nhật ký bị chặn; xoá dòng giữa ⇒ chuỗi báo đứt đúng dòng sau; cascade xoá User + dòng quá 90 ngày vẫn qua.

## 2. 🔴 Việc của chủ dự án

| #            | việc                                                                                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T22          | Cho phép push 3 nhánh + mở PR                                                                                                                                                                                    |
| T23          | **TRƯỚC khi merge `feat/trung-tam-an-ninh-phat-hanh`**: `pg_dump` Neon (`/usr/lib/postgresql/18/bin/pg_dump`) rồi `db:migrate` lên Neon (migrationGate). Migration không DROP nhưng UPDATE điền ngược `prevHash` |
| T24          | Sinh `RELEASE_INTEGRITY_TOKEN` (`openssl rand -hex 32`), đặt CÙNG giá trị ở Render và Worker (`npm run cron:secret-integrity` - hỏi cả `INTERNAL_API_TOKEN`), rồi `npm run cron:deploy`                          |
| T25          | Tạo khoá VirusTotal (free), đặt `VIRUSTOTAL_API_KEY` ở Render                                                                                                                                                    |
| T18-T21, T19 | còn từ phiếu 02                                                                                                                                                                                                  |

## 3. Việc kế tiếp của agent

1. Sau T22: theo dõi CI 3 PR (job "Image backend" cho Express 5; "Build frontends" cho nhánh có schema).
2. Sau merge + T24: nghiệm thu thật - sửa 1 byte một tệp trong MinIO local ⇒ `POST /api/internal/releases/integrity` ⇒ `LECH_TOAN_VEN`, link tải 404; `npm run cron:tail` có dòng `[cron] kiểm toàn vẹn:`.
3. Chuyển repo vào Org (sau T19) - phiếu 02 §3.1. Override minimatch sau 10/11 - phiếu 02 §3.3.
4. G7 còn hở: đổi vai trò ở `/admin/accounts` chưa đòi step-up (`requireStepUp` đã có trong `@tsudev/auth`, auth-service dùng được ngay).

## 4. Bẫy gặp (bổ sung)

- **`tsc -b` incremental KHÔNG thấy @types đổi trong node_modules**: sau nâng Express nó báo sạch, `tsc -b --force` ra 15 lỗi. Nâng phụ thuộc kiểu ⇒ luôn `--force`.
- Express 5: test liệt kê route qua `app._router` trả mảng rỗng (cổng MFA/tiền tố đỏ đúng chỗ); nay là `app.router`. `app.listen` đưa lỗi vào callback thay vì phát `error`.
- **Test chạy lượt kiểm toàn bảng trên DB dev dùng chung đã gỡ công bố 2 bản `topology-check`** (đã khôi phục tay, 2 dòng `RELEASE_INTEGRITY_MISMATCH` của `system` còn lại trong nhật ký local - chỉ-thêm). Test nay ném lỗi tạm cho khoá ngoài dự án test. Viết test cho thao tác toàn bảng ⇒ khoanh phạm vi.
- `prisma migrate dev` hỏng ở máy này (lệch collation template1) ⇒ tạo migration bằng `prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ... --script` rồi `db:migrate`.
- E2E local: Node của Playwright KHÔNG phân giải `tsudev.localhost` trên WSL này (Chromium thì có) ⇒ test dùng `page.request` báo `ENOTFOUND`. Spec mới gọi `fetch` trong trang. Proxy dev ở cổng **8090** (topology), chạy: `npm run dev:local` rồi `E2E_NO_WEBSERVER=1 E2E_MAIN_URL=http://tsudev.localhost:8090 node scripts/with-env.js npx playwright test --config=e2e/playwright.config.js --project=app`.
- `verifyCode.test.ts` đỏ MỘT lần trong cả phiên, không tái hiện (8 lượt xanh liền) - để ý nếu gặp lại.
