# PHIẾU BÀN GIAO - Đăng ký Quly Thu Chi làm client OIDC của tsudev.com

- **Mã phiếu**: 20261118-QT1
- **Từ**: agent-qulythuchi (repo `tsudev-org/qulythuchi`) - **Đến**: phiên repo `tsudev` / chủ dự án (OWNER)
- **Thời điểm**: 18/11/2026
- **Trạng thái**: ĐÓNG (18/11/2026, agent-qulythuchi theo ủy quyền chủ dự án)
- **Nhánh git**: không (chỉ dữ liệu Neon)

## 1. Việc đã làm xong

- `https://qulythuchi.tsudev.com` đã lên production (Worker `qulythuchi`, D1 + R2). RP OIDC giống hệt mẫu sound-db:
  Authorization Code + PKCE S256, `state` gắn trình duyệt, `nonce`, `id_token` ES256 theo JWKS, userinfo cùng `sub`
  (`services/sync-api/src/auth/*`, test với IdP giả). Lý do đi qua máy chủ: ADR-0003 của qulythuchi.
- Đo 18/11/2026: `/auth/web/start` ⇒ 302 tới `https://tsudev.com/oidc/auth?...client_id=qulythuchi...` ⇒ IdP trả
  **400 `invalid_client`** (client chưa có trong bảng `OAuthClient`).

## 2. Việc cần làm (OWNER hoặc phiên có chuỗi kết nối Neon)

- [x] Chèn client (tsudev `docs/auth.md` mục 8, cùng dạng phiếu SD1):

```sql
INSERT INTO "OAuthClient" (id, name, "redirectUris", "postLogoutRedirectUris", scopes)
VALUES ('qulythuchi', 'Quly Thu Chi', ARRAY['https://qulythuchi.tsudev.com/auth/callback'],
        ARRAY['https://qulythuchi.tsudev.com/'], ARRAY['profile', 'email'])
ON CONFLICT (id) DO NOTHING;
```

- [ ] (Sau P8 của qulythuchi, khi có site + bản tải) thêm thẻ vào `packages/ui/src/lib/ecosystem.ts` - phiếu riêng sau.

## 3. Tiêu chí hoàn thành

`GET https://tsudev.com/oidc/auth?client_id=qulythuchi&redirect_uri=https://qulythuchi.tsudev.com/auth/callback&...`
(PKCE S256) trả **303** sang `/oidc/interaction/...` thay vì 400 `invalid_client`.

## 5. Cảnh báo

- Redirect DUY NHẤT là `https://qulythuchi.tsudev.com/auth/callback` (app gốc không là client trực tiếp - máy chủ
  qulythuchi cấp mã một lần + PKCE riêng cho app).
- Dữ liệu qulythuchi là D3 nhưng IdP chỉ cấp danh tính; dữ liệu được mã hóa đầu-cuối bằng khóa riêng (ADR-0002).

## Kết quả xử lý

- 18/11/2026: agent-qulythuchi chèn đúng câu SQL mục 2 (`INSERT 0 1`) bằng `~/.config/tsudev/neon.env` theo ủy quyền trực
  tiếp của chủ dự án; nội dung tệp không in ra. Đo: `/oidc/auth?client_id=qulythuchi` ⇒ **303** sang
  `/oidc/interaction/...` (trước: 400 `invalid_client`).
- 🔐 Chủ dự án sẽ ĐỔI mật khẩu Neon ngay sau phiên này (việc tồn từ phiên 58) và xóa `neon.env`.
