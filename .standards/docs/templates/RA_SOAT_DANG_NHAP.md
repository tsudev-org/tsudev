# PHIẾU RÀ SOÁT MỘT CỔNG ĐĂNG NHẬP - <repo>

> Mẫu theo `AUTH_AND_ACCOUNT.md` mục 2.1. Đặt tên `logs/handover/YYYYMMDD-LOGIN1_ra-soat-mot-cong-dang-nhap.md`.
> KHÔNG dán giá trị bí mật, token hay dữ liệu tài khoản vào phiếu.

- **Trạng thái**: MỞ | ĐÓNG - **Bộ quy ước**: v<x.y.z> - **Phiên**: <phiên>, HH:mm DD/MM/YYYY
- **Bề mặt**: website | desktop | di động | tiện ích | CLI | API - **Có tài khoản TsuDEV**: có | không

## 1. Kết quả quét

`.standards/scripts/check-central-login.sh`: <số nghi vấn>

## 2. Rà tay (đánh dấu khi đã kiểm bằng cách chạy sản phẩm)

- [ ] Website: không trang/hộp thoại đăng nhập, đăng ký, quên mật khẩu; không ô mật khẩu/OTP tài khoản
- [ ] Không nút, SDK, OAuth client riêng của Google/Apple/GitHub; không WebView hứng đăng nhập
- [ ] App/CLI: chỉ nút/lệnh mở trình duyệt (PKCE + `state`, hoặc device code) và nút mở trang tài khoản
- [ ] `client_id` + `redirect_uri` đăng ký tại tsudev.com; URL lấy từ discovery
- [ ] Token ở kho bí mật hệ điều hành; có đăng xuất và nút xoá tài khoản
- [ ] Máy chủ sản phẩm không nhận, không lưu mật khẩu tài khoản
- [ ] `/privacy` và hồ sơ cửa hàng khớp dữ liệu thật sự gửi đi

## 3. Vi phạm và cách sửa

| Vi phạm (tệp:dòng) | Cách sửa | Di trú dữ liệu | PR | Trạng thái |
| --- | --- | --- | --- | --- |
| | | | | |

## 4. Ngoại lệ đã khai trong `.central-login-allow`

| Luật + đường dẫn | Lý do |
| --- | --- |
| | |

Đóng phiếu khi mục 3 hết dòng mở, `check-central-login.sh --strict` đạt và đã đưa vào CI.
