# PHIẾU ACC1 - Rà soát tài khoản production và đường tạo / liên kết tài khoản

- **Ngày mở**: 26/11/2026 · **Trạng thái**: ĐÃ XỬ LÝ (mã) - còn mục 2a 👤 · **Ưu tiên**: TRƯỚC CP3 (bảo mật xác thực)
- **Nguồn**: chủ dự án hỏi sau khi mở `console.tsudev.com/accounts` (26/11); chủ dự án ủy quyền tự chọn phương án.
- **Mô hình**: vùng xác thực ⇒ lập phương án ở Plan Mode (Opus) trước khi sửa mã.

## 0. Số đo 26/11 (Neon, chỉ đọc)

10 tài khoản. Điểm đáng chú ý:

| Tài khoản               | Ghi chú                                                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `alanmcdonald.32315`    | Tạo 23/11 22:59 bằng Google, IP dải Google (`108.177.0.0/17`, RDAP), mở bật TOTP 23:03 không xác nhận, không làm gì khác. Nhiều khả năng là máy kiểm thử của Google (Play pre-launch / duyệt OAuth). |
| `dev.nguyentrangtinhsu` | Tạo 22/08 bằng GitHub; email khác `tsudev` (`devnguyentrangtinhsu@`) chỉ ở dấu chấm ⇒ CÙNG hộp Gmail. Không mật khẩu, không đăng nhập lại.                                                           |
| `bientapvien` (AUTHOR)  | OWNER tạo tay 21/08 qua useradmin; có mật khẩu, không 2FA, 0 bài, không lần đăng nhập nào ghi nhận. Không có trong mã nguồn hay lịch sử git.                                                         |
| `tsudev`                | `oauth_linked` google + github 26/11 03:32 (VN) qua đường liên kết KHI ĐÃ ĐĂNG NHẬP (không kèm `login`) - không phải tự liên kết theo email.                                                         |

## 1. Việc (một phase)

- [x] **Seed production-safe**: `packages/db/prisma/seed.js` chưa có chốt như `seed-dev-users.js` (NODE_ENV + host DB cục bộ). Chạy nhầm vào Neon ⇒ tạo `alice`/`bob`, đặt lại `tsudev`. Thêm chốt + test; cân nhắc bỏ email thật của OWNER khỏi tệp (repo Public).
- [x] **Tự liên kết OAuth theo email** (`/api/identity/oauth/upsert` nhánh 3): cấm với tài khoản vai trò ≥ AUTHOR (hoặc có TOTP/passkey) - chỉ cho liên kết qua đường đã đăng nhập (+ step-up). Test: email OWNER + `emailVerified:true` từ provider mới ⇒ 409, không tạo `OAuthAccount`.
- [x] **Đường liên kết khi đã đăng nhập** (`index.ts` ~1616-1650): kiểm có đòi step-up TOTP ≤ 5 phút như L6 chưa; thiếu thì thêm cho tài khoản có 2FA.
- [x] **Email trùng theo chuẩn hoá Gmail** (bỏ dấu chấm, bỏ `+nhãn` cho `gmail.com`/`googlemail.com`): khi tạo tài khoản mới (đăng ký, OAuth) mà dạng chuẩn hoá trùng tài khoản có sẵn ⇒ coi như trùng email (đăng ký: im lặng + thư như hiện tại; OAuth: 409 `email_taken`). Không đổi cột `email` đã lưu; không migration nếu so được bằng truy vấn (hoặc thêm cột chuẩn hoá có index - migration mới, `db:migrate` lên Neon TRƯỚC khi gộp).
- [x] Rà mọi `prisma.user.create` (đăng ký, OAuth, useradmin/create, seed) theo bảng ở mục 2; test quét nguồn: không `user.create` mới ngoài danh sách.
- [x] Tài liệu `docs/auth.md` cập nhật; CHANGELOG nếu deploy.

## 2. Bất biến đã kiểm (giữ nguyên)

| Đường tạo                     | Rào chắn                                                              |
| ----------------------------- | --------------------------------------------------------------------- |
| `POST /api/identity/register` | Turnstile, MEMBER cố định, email trùng im lặng                        |
| `useradmin/create`            | `requireOwner`, `ASSIGNABLE_ROLES` không có OWNER, (CP2) vùng console |
| `oauth/upsert`                | token nội bộ / chữ ký biên, MEMBER cố định, `emailVerifiedAt` NULL    |
| `db:seed:dev`                 | từ chối production + DB không cục bộ                                  |

## 2a. 👤 chủ dự án

- Xoá tại `console.tsudev.com/accounts` (có nhật ký `TrustAuditLog` + step-up - agent KHÔNG xoá thẳng bằng SQL vì bỏ qua hai lớp đó):
  `bientapvien`; `dev.nguyentrangtinhsu` (nếu GitHub đó là của bạn - đăng nhập lại bằng nó sẽ tạo lại cho tới khi mục 1 bước 4 xong); `alanmcdonald.32315` (khi không còn đợt duyệt Google nào đang chờ).
- Xác nhận `nguyentrangtinhs@gmail.com` và `nguyentrangtinhsu@gmail.com` là hộp thư của mình.

## 3. Kết quả xử lý

- 27/11/2026 - tsudev-bc: **ACC1 xong** (PR #422 `a5a98b0`, Render `live`, frontend `deploy-2026.11.27.1`).
  - `oauth/upsert` nhánh 3: AUTHOR+ hoặc có TOTP/passkey ⇒ 409 `oauth_link_required`, sự kiện `oauth_autolink_blocked`
    (await) + thư cảnh báo; MEMBER trần giữ tự liên kết.
  - `oauth/link` đòi `stepUpIfTotp`; route mới `oauth/link-check` (SENSITIVE, qua proxy `/api/account`); token step-up
    đi trong cookie `tsu-link-intent` (v2, ký HMAC cả token). Quá 5 phút ở nhà cung cấp ⇒ `link_error=step_up_required`.
  - `emailCanon.ts`: trùng theo hộp Gmail ở register / OAuth tạo mới (409 `email_taken`) / useradmin/create / email/change.
    Không migration (so bằng `$queryRaw` tham số hoá).
  - `seed.js` gọi `packages/db/prisma/localOnly.js` trước khi nạp Prisma; email OWNER trong seed thành `tsudev@tsudev.localhost`.
  - Test `services/auth-service/test/acc1AccountSafety.test.ts` (18) canh ba chỗ `prisma.user.create`.
  - Đo production: `/api/auth/providers` chỉ credentials/passkey/qr/github/google; `POST /api/account/oauth/link-check`
    và `/api/account-link` ẩn danh ⇒ 401; trang chủ có cả `swico.svg` (`tsu-eco-dark`) lẫn `swico-light.svg` (`tsu-eco-light`).
  - 👤 CodeQL #143 (`js/missing-rate-limiting` ở `app.use('/api/identity/oauth/link-check', auth)`): cảnh báo NHẦM - route
    nằm trong mảng `SENSITIVE` (10/phút, kho Postgres); cùng loại #119-#121 đã dismiss. Bộ phân loại chặn agent dismiss.
  - Ngoài phạm vi, chưa làm: `packages/observability/notify.js` còn email OWNER làm giá trị mặc định `ALERT_EMAIL_TO`.
