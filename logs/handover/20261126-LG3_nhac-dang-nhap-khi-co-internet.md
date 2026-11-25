# PHIẾU ĐIỀU PHỐI LG3 - Nhắc đăng nhập bằng modal nổi khi có internet (toàn hệ)

- **Mã phiếu**: 20261126-LG3 - **Từ**: điều phối `projects-82`, 26/11/2026 - **Trạng thái**: MỞ
- **Quyết định chủ dự án (26/11/2026)**: mọi sản phẩm TsuDEV nhắc người dùng đăng nhập (TsuDEV hoặc Google/GitHub/Apple)
  khi thiết bị có internet mà chưa đăng nhập - để khôi phục tài khoản/quyền lợi, báo cáo sự cố gắn tài khoản và để máy
  chủ đánh giá tài khoản có vi phạm điều khoản/quy chế hay không.
- **Chuẩn**: tsudev-standards **v7.1.0** `AUTH_AND_ACCOUNT.md` v3.5.0 **mục 14.4** (đọc HẾT), `PRODUCT_POLICY.md` v2.1.0
  mục 7.7. Liên quan: `20261125-SYN1` (dữ liệu chỉ ở thiết bị), `20261125-INT1` (modal khoá ưu tiên), `20261124-QR1`.

## 0. Mọi agent MUST đọc

1. Nhắc, KHÔNG ép: modal luôn đóng được; hạng C không bao giờ chặn chức năng lõi; có lối đăng nhập cố định trong Cài đặt.
2. Biết "có internet" chỉ bằng tín hiệu hệ điều hành (R2) - không gửi gói thăm dò; trước khi người dùng bấm lối vào,
   0 gói mạng (mục 14.1). Chế độ ngoại tuyến hoàn toàn ⇒ không nhắc.
3. Nhịp: 1 lần/phiên → 24 giờ → 3 ngày → 7 ngày; "Không nhắc trong 30 ngày"; lưu cục bộ, không gửi đi.
4. Đăng nhập qua trình duyệt hệ thống + PKCE; modal không có ô mật khẩu; trạng thái tài khoản (`suspended`...) do IdP trả.
5. Dùng thành phần chung - không tự vẽ: Flutter `tsudev_ui` `TsuSignInReminder`, web `@tsudev/ui` `<tsu-signin-reminder>`.

## 1. Việc theo repo (theo đợt)

| Đợt | Repo                                                                                  | Việc LG3                                                                                                                                                                                   |
| :-: | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|  1  | **tsudev-ui-flutter**                                                                 | `SignInReminderPolicy` (R1-R6, nhịp 14.4.2, đồng hồ tiêm được để test) + `TsuSignInReminder` (nguyên văn vi/en 14.4.3, nút lối vào mục 3 + Quét QR, trợ năng) + test 14.4.7; MINOR         |
|  1  | **tsudev** (tsudev.com)                                                               | `@tsudev/ui` `<tsu-signin-reminder>`; `/privacy#dang-nhap` (vì sao nên đăng nhập, bảng 7.7); IdP trả `status` + mã lý do trong userinfo/JWS quyền lợi để app hiện `suspended`/`restricted` |
|  2  | qulythuchi, tsuscan, sound-db, app-la-ban, tsudev-lotus (Flutter)                     | Gắn `TsuSignInReminder` sau tác vụ lõi đầu tiên; điểm dừng tự nhiên theo màn của app                                                                                                       |
|  2  | tsufiles, tsuswico, tsucwico, tsucontact, tsutramon, tsudisk (desktop .NET/C++/Tauri) | Dựng theo nguyên văn + token, test 14.4.7; Windows `GetInternetConnectionProfile`; đăng nhập trình duyệt + `127.0.0.1`                                                                     |
|  2  | TsuGameLabs (trò chơi web)                                                            | `<tsu-signin-reminder>` chỉ ở màn chính/sau ván, không giữa ván                                                                                                                            |
|  2  | Sản phẩm có CLI                                                                       | Dòng gợi ý 14.4.6                                                                                                                                                                          |
|  -  | Không áp dụng                                                                         | Thư viện (tsulink, tsusync đã lưu trữ), repo UBND/xanuicam, b4djl1h-cmdb, mieubathuong, homebrew-tap, scoop-bucket, linux-packages                                                         |

## 2. Bảng theo dõi

| Repo              | Thành phần/gắn modal | Test 14.4.7 | PR / ghi chú   |
| ----------------- | -------------------- | ----------- | -------------- |
| tsudev-standards  | ✅ v7.1.0            | -           | PR (xem mục 4) |
| tsudev-ui-flutter | ⬜                   | ⬜          |                |
| tsudev            | ⬜                   | ⬜          |                |
| các app đợt 2     | ⬜                   | ⬜          |                |

## 3. Điều kiện đóng

Mọi hàng mục 2 xong; đo bằng proxy: chưa bấm lối vào ⇒ 0 gói ra; tắt mạng/Chế độ ngoại tuyến ⇒ không hiện; thử thật
một app Flutter (Android) + một app desktop Windows.

## 4. Kết quả xử lý

- 26/11/2026 - projects-82: soạn chuẩn v7.1.0 (`AUTH_AND_ACCOUNT` 14.4, `PRODUCT_POLICY` 7.7, `AGENTS.md` mục 7.2).
- 26/11/2026 - tsudev: NHẬN phiếu. Đã có: `/privacy#dang-nhap` (mục "Đăng nhập tài khoản và dữ liệu trong ứng dụng", bảng
  7.7 - làm ở SYN1 #403, neo đổi thành `dang-nhap` trong PR INT1-e). Còn lại là phase **LG3-a** (một phiên): đồng bộ
  `.standards` v7.1.0, `<tsu-signin-reminder>` (Custom Element trong `@tsudev/ui`, nhịp 14.4.2 lưu `localStorage`,
  nguyên văn 14.4.3, test 14.4.7), IdP trả `status` + mã lý do ở `userinfo` và JWS quyền lợi. Xếp TRƯỚC INT1-a vì không
  vướng việc 👤.
