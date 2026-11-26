# PHIẾU ĐIỀU PHỐI LG4 - Bỏ nhắc đăng nhập tự động, không thông báo làm phiền (toàn hệ)

- **Mã phiếu**: 20261126-LG4 - **Từ**: điều phối `projects-82`, 26/11/2026 - **Trạng thái**: MỞ
- **Thay thế**: `20261126-LG3` (nhắc đăng nhập bằng modal nổi) - LG3 ĐÓNG, không làm tiếp đợt 2.
- **Quyết định chủ dự án (26/11/2026)**: mục tiêu và định hướng của mọi sản phẩm TsuDEV là **không quảng cáo, không
  thông báo làm phiền**. Bỏ hẳn cơ chế tự động hiện modal/thông báo nhắc đăng nhập tài khoản - kể cả tài khoản của nhà
  cung cấp thứ ba (Google, GitHub, Apple...) - để người dùng dùng sản phẩm êm nhất có thể.
- **Chuẩn**: tsudev-standards **v8.0.0** - `AUTH_AND_ACCOUNT.md` v4.0.0 **mục 14.4** (viết lại), `PRODUCT_POLICY.md`
  v3.0.0 **mục 3.8** (mới) + 7.7, `AGENTS.md` mục 7.2.

## 0. Mọi agent MUST đọc

1. `MUST NOT` tự hiện bất kỳ bề mặt nào mời/nhắc đăng nhập hay liên kết tài khoản: modal, bottom sheet, màn chen ngang,
   toast/snackbar, biểu ngữ, thông báo hệ điều hành, email, huy hiệu số, chấm đỏ, dòng gợi ý CLI, Google One Tap /
   Credential Manager tự hiện / `prompt=none` dò ngầm (N1-N6, 14.4.1).
2. Đăng nhập chỉ mở khi người dùng **bấm**: Cài đặt › Tài khoản (thụ động, cùng kiểu với mục khác) hoặc chức năng tự bản
   chất cần tài khoản (Pro, Ủng hộ cấp huy hiệu, hồ sơ, báo cáo gắn tài khoản, Quét để đăng nhập).
3. Cùng nguyên tắc (mục 3.8): không tự hiện lời mời Pro, Ủng hộ, đánh giá app (In-App Review), hộp thoại "tính năng mới",
   mời theo dõi/khảo sát; không xin quyền thông báo lúc mở đầu.
4. Giữ (ngoại lệ an toàn/pháp lý): modal khoá cập nhật + bản không chính thức (`APP_INTEGRITY.md`), `suspended` trong mục
   Tài khoản, nhắc gia hạn/hết kỳ Pro mục 7.6 (chỉ người đã mua Pro).
5. Giữ nguyên bảo mật luồng đăng nhập (14.4.3): trình duyệt hệ thống + PKCE + `state`/`nonce`, không WebView, không gửi
   gói nào trước khi người dùng bấm lối vào.
6. Xoá khoá cục bộ của LG3 (`tsu.signin_reminder.next_at`, `tsu.signin_reminder.dismiss_count`) lúc khởi động.

## 1. Việc theo repo

| Repo                                                                   | Việc LG4                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Phiên                       |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **tsudev-standards**                                                   | ✅ v8.0.0 (PR + Release)                                                                                                                                                                                                                                                                                                                                                                                                                                 | projects-82                 |
| **tsudev-ui-flutter**                                                  | `TsuSignInReminder`/`SignInReminderPolicy` ⇒ `@Deprecated` (gỡ ở MAJOR sau); thêm `TsuAccountTile` (mục Tài khoản thụ động: "Chưa đăng nhập" + nút Đăng nhập + "Vì sao nên đăng nhập?") và `TsuSignInSheet` (màn chọn lối vào, chỉ mở từ cú bấm, có Quét QR); `removeLegacyLocalKeys` xoá thêm `tsu.signin_reminder.*`; test ca 17 mới; golden bằng `~/tools/flutter-3.47.8`; MINOR + Release. Làm TRƯỚC màn "Đồng bộ thiết bị" hoặc gộp chung bản MINOR | chưa có phiên               |
| **tsudev** (tsudev.com)                                                | `<tsu-signin-reminder>` ⇒ ngừng dùng (không gắn trang nào - đã đúng), thêm `<tsu-account-entry>`; `/privacy#dang-nhap` sửa câu "sẽ nhắc" thành "đăng nhập khi bạn chọn"; IdP giữ `status`/`status_reason`; rà trang không có One Tap / chấm đỏ                                                                                                                                                                                                           | tsudev-b0 - đã nhắn         |
| qulythuchi, tsuscan, sound-db, app-la-ban, lotus-share (Flutter)       | Đợt nâng `tsudev_ui` (LG3 đợt 2 cũ) đổi thành: KHÔNG gắn `TsuSignInReminder`; gắn `TsuAccountTile` vào Cài đặt khi `tsudev_ui` có; gọi `removeLegacyLocalKeys`; rà mục 3.8 (đánh giá app, Pro, Ủng hộ tự hiện)                                                                                                                                                                                                                                           | chưa có phiên               |
| tsufiles, tsuswico, tsucwico, tsucontact, tsutramon, tsudisk (desktop) | Không dựng hộp thoại nhắc; mục Tài khoản trong Cài đặt; rà mục 3.8 (cửa sổ "ủng hộ"/"đánh giá"/"có gì mới" tự bật, thông báo khay hệ thống)                                                                                                                                                                                                                                                                                                              | tsufiles-cf (phiên kế tiếp) |
| TsuGameLabs (trò chơi web)                                             | Không lời mời đăng nhập ở màn chính/sau ván; rà mục 3.8                                                                                                                                                                                                                                                                                                                                                                                                  | chưa có phiên               |
| Sản phẩm có CLI                                                        | Bỏ dòng gợi ý đăng nhập (14.4.6 cũ); `login` chỉ trong `--help`                                                                                                                                                                                                                                                                                                                                                                                          | -                           |
| - Không áp dụng                                                        | Thư viện (tsulink), tsusync (archive), homebrew-tap, scoop-bucket, linux-packages, repo ngoài hệ                                                                                                                                                                                                                                                                                                                                                         | -                           |

## 2. Bảng theo dõi

| Repo              | Trạng thái | PR / ghi chú |
| ----------------- | ---------- | ------------ |
| tsudev-standards  | ✅ v8.0.0  | xem mục 4    |
| tsudev-ui-flutter | ⬜         |              |
| tsudev            | ⬜         |              |
| các app           | ⬜         |              |

## 3. Điều kiện đóng

Mọi hàng mục 2 xong; kiểm thử ca 17 (AUTH 14.4.5) và mục 3.8 điểm 5 ở từng app: chưa đăng nhập + chưa Pro, ≥ 5 phiên,
đồng hồ giả lập qua 30 ngày ⇒ 0 bề mặt tự mời; không gói mạng nào trước khi bấm lối vào (proxy).

## 4. Kết quả xử lý

- 26/11/2026 - projects-82: soạn chuẩn v8.0.0 (AUTH 14.4 v4.0.0, PRODUCT_POLICY 3.8 v3.0.0, AGENTS 7.2); LG3 đóng.

## 5. Prompt cho phiên repo

```text
Đọc AGENTS.md của repo, rồi phiếu logs/handover/20261126-LG4_bo-nhac-dang-nhap-tu-dong-khong-lam-phien-toan-he.md
(mục 0 và đúng dòng của repo ở mục 1), tsudev-standards v8.0.0 AUTH_AND_ACCOUNT.md mục 14.4 + PRODUCT_POLICY.md mục
3.8. akb start "LG4 <repo>". Đồng bộ .standards lên v8.0.0; gỡ/không gắn mọi lời nhắc đăng nhập tự hiện và mọi lời
mời Pro/Ủng hộ/đánh giá tự hiện; lối vào Tài khoản thụ động trong Cài đặt; xoá khoá tsu.signin_reminder.*; test ca 17.
Một PR, CI xanh. Cuối phiên: điền mục 2/4 phiếu, cập nhật STATE, akb close + sync, báo điều phối qua SendMessage.
```
