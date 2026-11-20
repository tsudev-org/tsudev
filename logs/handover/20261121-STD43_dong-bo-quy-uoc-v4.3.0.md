# PHIẾU YÊU CẦU - Đồng bộ tsudev-standards v4.3.0

- **Mã phiếu**: 20261121-STD43
- **Từ**: phiên tsudev-standards, 21/11/2026 - **Đến**: phiên kế tiếp của `tsudev`
- **Trạng thái**: MỞ một phần (mục 1, 2, 4 xong 21/11/2026 - phiên tsudev-10; mục 3 Apple chờ quyết định App Store)
- **Nguồn**: https://github.com/tsudev-org/tsudev-standards/releases/tag/v4.3.0 (PR #66)

## Việc cần làm

1. Sync `.standards/` lên v4.3.0 trong PR kế tiếp (KHÔNG mở PR sync riêng).
2. IdP: thêm `GET /api/v1/auth/providers` trả danh sách nhà cung cấp đang bật, để RP dựng nút từ đó (`AUTH_AND_ACCOUNT.md` mục 15).
3. Apple (mục 3.2): CHỈ làm khi chủ dự án quyết phát hành App Store (cần Apple Developer Program 99 USD/năm). Khi làm: provider Apple trong NextAuth, `idp_hint=apple`, callback `form_post` (state lưu máy chủ hoặc cookie `SameSite=None`), xoay `client_secret` ES256, `auth/revoke` khi xoá tài khoản, điểm nhận thông báo máy chủ tới máy chủ, đăng ký tên miền gửi thư cho email ẩn. Nối phiếu 20261119-QT4.
4. `/tai-khoan/bao-mat`: liên kết Google/Apple/GitHub (Apple chỉ khi IdP bật).

## Kết quả xử lý

- 21/11/2026 - tsudev-10, nhánh `feat/std43-auth-providers-v4-3-0`:
  1. `.standards` v4.2.0 ⇒ v4.3.0 (cùng PR tính năng, không PR sync riêng).
  2. `GET /api/v1/auth/providers` ⇒ `{ providers: [{ id, name, idp_hint }] }` từ mảng provider NextAuth
     (`lib/idpProviders.ts`, `pages/api/v1/auth/providers.ts`); CORS `*`, cache 300s.
  3. `/settings/security` mục "Tài khoản liên kết" (Google/GitHub): liên kết khác email qua cookie ý định ký
     (`lib/linkIntent.ts`, `POST|DELETE /api/account-link`), gỡ liên kết (step-up, chặn gỡ lối vào cuối cùng).
     auth-service `oauth/list|link|unlink`. Tài liệu: `docs/auth.md` mục 5.
  4. Apple: CHƯA làm - đúng phiếu, chờ chủ dự án quyết phát hành App Store (99 USD/năm).
