# @tsudev/auth

Xác thực và phân quyền dùng chung cho ba service.

Trước gói này, `authMiddleware.js` tồn tại **ba bản gần trùng nhau** trong
content/storage/trust - `CLAUDE.md` phải ghi hẳn một dòng cảnh báo "đổi hành vi
xác thực phải sửa cả ba". Một bản duy nhất thì không có bản nào lệch đi trong im
lặng.

## Phân quyền: DB là nguồn sự thật duy nhất

Repo từng có **hai** cơ chế song song:

- `requireRole()` đọc vai trò từ **cột `User.role` trong DB**, fail closed.
- `requireAdmin()`/`requireReviewer()` đọc vai trò từ **cột `User.role` trong
  DB**, dùng ở 32 route.

Cơ chế thứ nhất chưa bao giờ hoạt động ở production: không realm nào khai một
vai trò nào (`"roles": {}` ở cả hai bản export), nên claim luôn rỗng. Nó chỉ
xanh trong test vì test tự tiêm header `x-dev-roles`. Tệ hơn, nó được gác sau cờ
`REQUIRE_ROLE_ENFORCEMENT` mặc định tắt - nghĩa là 4 route đó **trông như được
bảo vệ mà không hề được bảo vệ**, và bật cờ lên thì chúng 403 vĩnh viễn.

Gói này bỏ hẳn nhánh đọc-claim. `requireRole()` nay đọc `User.role` từ DB, **fail
closed**, không có cờ nào tắt được nó.

## Ép 2FA cho quản trị (G6)

`requireSecondFactor(user, res)` cho qua CHỈ khi tài khoản có TOTP **đã xác
nhận** (`TotpCredential.confirmedAt` khác NULL; kiểm bằng `hasConfirmedTotp`).
**Passkey KHÔNG được tính**: đăng nhập mật khẩu ở auth-service chỉ đòi bước hai
khi có TOTP đã xác nhận, nên tài khoản chỉ có passkey vẫn vào được bằng mật khẩu
đơn thuần - tính passkey ở đây thì một mật khẩu bị lộ đủ để vào khu quản trị.
Fail closed cho tới khi phiên ghi được phương thức xác thực (amr), cùng step-up
B3. Cổng dựa vào bất biến "TOTP đã xác nhận ⇒ đăng nhập mật khẩu thiếu mã ⇒ 401
`totp_required`", có test ở `services/auth-service/test/ownerMfaGate.test.ts`.
Thiếu ⇒ 403 `{ error, code: 'MFA_REQUIRED' }`; lỗi DB ⇒ 503 (fail closed).
Gọi SAU bước kiểm vai trò - `requireAdmin` (content-service) và `requireOwner`
(auth-service) dùng nó. **Đừng** gắn nó vào các route `/api/identity/totp/*`
hay `/api/identity/passkey/register-*`: đó là đường duy nhất để quản trị viên
chưa có 2FA tự bật nó.
