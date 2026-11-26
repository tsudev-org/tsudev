# PHIẾU ĐIỀU PHỐI LG3 - Nhắc đăng nhập bằng modal nổi khi có internet (toàn hệ)

- **Mã phiếu**: 20261126-LG3 - **Từ**: điều phối `projects-82`, 26/11/2026 - **Trạng thái**: ĐÓNG 26/11/2026 - THAY bởi `20261126-LG4` (bỏ nhắc đăng nhập tự động, chuẩn v8.0.0)
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

| Repo              | Thành phần/gắn modal                      | Test 14.4.7                      | PR / ghi chú   |
| ----------------- | ----------------------------------------- | -------------------------------- | -------------- |
| tsudev-standards  | ✅ v7.1.0                                 | -                                | PR (xem mục 4) |
| tsudev-ui-flutter | ⬜                                        | ⬜                               |                |
| tsudev            | ✅ `<tsu-signin-reminder>` + IdP `status` | ✅ (trừ ca cần trình duyệt thật) | PR LG3-a       |
| các app đợt 2     | ⬜                                        | ⬜                               |                |

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
- 26/11/2026 - tsudev: **LG3-a XONG** (PR `feat/lg3-a-signin-reminder`).
  - `.standards` v7.0.0 → **v7.1.0** (`sync-standards.sh --ref v7.1.0`, khớp MANIFEST; tokens/products check xanh).
  - `@tsudev/ui`: `lib/signinReminder.ts` (R1-R6, nhịp 24 giờ → 3 ngày → 7 ngày, hoãn 30 ngày, đăng xuất ⇒ 24 giờ,
    kho `localStorage` `tsu.signinReminder` + `sessionStorage`, nguyên văn vi/en 14.4.3) + `elements/signinReminder.ts`
    (`defineSignInReminder()` → Custom Element Shadow DOM, ăn token qua biến CSS, bẫy tiêu điểm, X/Esc/chạm nền = Để
    sau, tự nhường modal `aria-modal` khác như `AppGateModal`, sự kiện `tsu-signin` {provider}). Test 14.4.7:
    `packages/ui/test/signinReminder.test.ts` (34 ca: R1-R6, nhịp đồng hồ giả, nguyên văn so với `.standards`, không ô
    nhập, quét nguồn 0 API mạng, an toàn SSR).
  - IdP: `services/auth-service/src/accountStatus.ts` - `status` + `status_reason` ở userinfo/ID token (scope `openid`)
    và JWS quyền lợi (`/ent/me`, `/ent/rp/:sub`; `sub` mất ⇒ `deleted`). Suy từ cột sẵn có, KHÔNG migration.
  - Còn lại cho hàng tsudev (không thuộc LG3-a): (1) `suspended` chưa có cột - cần migration (👤 Neon) + trang quản trị
    đặt/gỡ + nhật ký kiểm toán 9.2; (2) chưa gắn `<tsu-signin-reminder>` vào trang nào của tsudev.com (web đăng nhập
    thẳng ở `/login`; gắn khi có PWA/site sản phẩm cần); (3) ca 14.4.7 cần trình duyệt thật (focus, Esc) - đo bằng
    Playwright khi gắn vào trang.
- 26/11/2026 - tsudev: **`suspended` XONG** (cùng PR INT1-a, migration `20261126120000_ban_ke_phien_ban_tam_khoa`).
  - Cột `User.suspendedAt` + `suspendedReason`; `accountStatus.ts` suy ra `suspended`/`account_suspended` (đứng sau
    `pending_deletion`, trước mọi trạng thái khác) ⇒ có mặt ở userinfo/ID token và JWS quyền lợi.
  - OWNER đặt/gỡ ở `/admin/accounts` (`POST /api/identity/useradmin/suspend`, step-up, lý do bắt buộc ≤ 500 ký tự), khớp
    đủ bốn chỗ: route + test `useradmin` + proxy `ALLOWED` + trang. Nhật ký `TrustAuditLog` `user.suspend`/`user.unsuspend`
    ghi "trạng thái cũ -> mới | lý do | ip" (thời điểm = `createdAt`; bảng bất biến, không dọn ⇒ ≥ 12 tháng) + sự kiện
    bảo mật + thư báo cho chủ tài khoản. KHÔNG thu hồi phiên.
  - Chặn: cổng chung trong `createAuthMiddleware` (`@tsudev/auth`) - người bị tạm khoá gọi đường ghi ⇒ 403
    `account_suspended`; mặc định chỉ GET/HEAD/OPTIONS đi qua; auth-service liệt kê thêm các POST chỉ-đọc + đăng xuất mọi
    thiết bị + OIDC (`SUSPENDED_MAY_POST`). Cố ý chặn vô hiệu hoá/xoá tài khoản khi đang bị tạm khoá. tsudev.com chưa
    có endpoint Xuất dữ liệu riêng - mọi đường đọc (GET) vẫn chạy.
  - Còn lại của hàng tsudev: gắn `<tsu-signin-reminder>` khi có trang cần (+ ca 14.4.7 trình duyệt thật).
