# PHIẾU RÀ SOÁT MỘT CỔNG ĐĂNG NHẬP - tsudev

> Mẫu theo `AUTH_AND_ACCOUNT.md` mục 2.1. KHÔNG dán giá trị bí mật, token hay dữ liệu tài khoản vào phiếu.

- **Trạng thái**: MỞ - **Bộ quy ước**: v9.0.0 - **Phiên**: tsudev-CP4, 27/11/2026
- **Bề mặt**: website (tsudev.com, console.tsudev.com, id.tsudev.com) - **Có tài khoản TsuDEV**: có - repo này CÀI ĐẶT CỔNG

## 1. Kết quả quét

`check-central-login.sh` (bản ở repo tsudev-standards: `.standards/` v9.0.0 của repo này CHƯA có script đó trong
MANIFEST): lần đầu **18 nghi vấn**, toàn bộ thuộc ba nhóm:

- 15 ở `apps/id/pages/*` - trang của chính cổng (đăng nhập, đăng ký, đặt lại mật khẩu, bảo mật/hồ sơ tài khoản).
- 3 ở `apps/frontend-main/pages/api/auth/[...nextauth].ts` - module NextAuth dùng chung mà cổng re-export; provider mật
  khẩu/passkey/QR chỉ bật khi `NEXTAUTH_ZONE=id` (test `apps/frontend-main/test/idGatewaySplit.test.ts`).
- 1 ở `apps/console/components/admin/AccountsAdmin.tsx` - OWNER tạo tài khoản kèm mật khẩu ban đầu.

Sau khi khai `.central-login-allow`: **không thấy nghi vấn**.

## 2. Rà tay (đánh dấu khi đã kiểm bằng cách chạy sản phẩm)

- [ ] Website: không trang/hộp thoại đăng nhập, đăng ký, quên mật khẩu ngoài cổng - **mã**: CP4a dời hết sang `apps/id`,
      tsudev.com chuyển 308 (`next.config.js` `ID_PAGES`), `check:public-bundle` chặn trang đó trong bản dựng của main.
      Chờ đo production sau deploy.
- [ ] Không OAuth client riêng ngoài cổng - **còn**: callback Google/GitHub vẫn ở `tsudev.com/api/auth/*` (cầu
      `/oauth-start`, không ô nhập) tới khi 👤 đổi callback ở hai nhà cung cấp sang `id.` (CP4b).
- [x] App/CLI: không áp dụng ở repo này (sản phẩm cài đặt rà ở repo của chúng).
- [x] `client_id` + `redirect_uri` đăng ký tại tsudev.com; issuer `https://tsudev.com/oidc` không đổi.
- [ ] Đăng xuất + xoá tài khoản ở cổng - có trang `settings/security#xoa-tai-khoan`; chờ đo trên `id.`.
- [x] Máy chủ sản phẩm không nhận mật khẩu: chỉ auth-service đọc `passwordHash`.
- [ ] `/privacy#dang-nhap` sửa câu "sẽ nhắc" (phiếu LG4, chưa làm).

## 3. Vi phạm và cách sửa

| Vi phạm (tệp:dòng)                                   | Cách sửa                                                               | Di trú dữ liệu | PR       | Trạng thái |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | -------------- | -------- | ---------- |
| `<tsu-signin-reminder>` (packages/ui) trái 14.4.1 v9 | Gỡ phần tử (chưa gắn trang nào)                                        | không          | CP4a     | xong       |
| Ô mật khẩu ban đầu ở `console` AccountsAdmin         | Đổi sang thư mời đặt mật khẩu ở cổng                                   | không          | sau CP4b | mở         |
| `.central-login-allow` chưa chạy trong CI            | Đồng bộ script khi bộ quy ước đưa vào MANIFEST, thêm `--strict` vào CI | không          | -        | mở         |

## 4. Ngoại lệ đã khai trong `.central-login-allow`

| Luật + đường dẫn                                            | Lý do                                                                   |
| ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| L1, L5 `apps/id/pages/*`, L1 `apps/id/pages/settings/*`     | Trang của chính cổng id.tsudev.com                                      |
| L1, L2 `apps/frontend-main/pages/api/auth/[...nextauth].ts` | NextAuth dùng chung; mật khẩu chỉ ở vùng id; OAuth phía máy chủ của IdP |
| L1 `apps/console/components/admin/AccountsAdmin.tsx`        | OWNER tạo tài khoản, sau Cloudflare Access; theo dõi mục 3              |

Đóng phiếu khi mục 3 hết dòng mở, `check-central-login.sh --strict` đạt và đã đưa vào CI.
