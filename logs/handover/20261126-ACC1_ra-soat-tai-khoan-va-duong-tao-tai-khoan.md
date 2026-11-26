# PHIẾU ACC1 - Rà soát tài khoản production và đường tạo / liên kết tài khoản

- **Ngày mở**: 26/11/2026 · **Trạng thái**: MỞ · **Ưu tiên**: TRƯỚC CP3 (bảo mật xác thực)
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

- [ ] **Seed production-safe**: `packages/db/prisma/seed.js` chưa có chốt như `seed-dev-users.js` (NODE_ENV + host DB cục bộ). Chạy nhầm vào Neon ⇒ tạo `alice`/`bob`, đặt lại `tsudev`. Thêm chốt + test; cân nhắc bỏ email thật của OWNER khỏi tệp (repo Public).
- [ ] **Tự liên kết OAuth theo email** (`/api/identity/oauth/upsert` nhánh 3): cấm với tài khoản vai trò ≥ AUTHOR (hoặc có TOTP/passkey) - chỉ cho liên kết qua đường đã đăng nhập (+ step-up). Test: email OWNER + `emailVerified:true` từ provider mới ⇒ 409, không tạo `OAuthAccount`.
- [ ] **Đường liên kết khi đã đăng nhập** (`index.ts` ~1616-1650): kiểm có đòi step-up TOTP ≤ 5 phút như L6 chưa; thiếu thì thêm cho tài khoản có 2FA.
- [ ] **Email trùng theo chuẩn hoá Gmail** (bỏ dấu chấm, bỏ `+nhãn` cho `gmail.com`/`googlemail.com`): khi tạo tài khoản mới (đăng ký, OAuth) mà dạng chuẩn hoá trùng tài khoản có sẵn ⇒ coi như trùng email (đăng ký: im lặng + thư như hiện tại; OAuth: 409 `email_taken`). Không đổi cột `email` đã lưu; không migration nếu so được bằng truy vấn (hoặc thêm cột chuẩn hoá có index - migration mới, `db:migrate` lên Neon TRƯỚC khi gộp).
- [ ] Rà mọi `prisma.user.create` (đăng ký, OAuth, useradmin/create, seed) theo bảng ở mục 2; test quét nguồn: không `user.create` mới ngoài danh sách.
- [ ] Tài liệu `docs/auth.md` cập nhật; CHANGELOG nếu deploy.

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

(chưa)
