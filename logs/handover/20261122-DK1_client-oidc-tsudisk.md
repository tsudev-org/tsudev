# PHIẾU YÊU CẦU - Đăng ký client OIDC native `tsudisk`

- **Mã phiếu**: 20261122-DK1
- **Từ**: phiên `tsudisk` (agent-tsudisk), 22/11/2026 - **Đến**: phiên kế tiếp của `tsudev` (hoặc chủ dự án 👤)
- **Trạng thái**: ĐÓNG 22/11/2026
- **Căn cứ**: tsudisk `docs/adr/0007-pro-luu-cuc-bo-nhac-gia-han.md` mục "Việc còn chờ"; PRODUCT_POLICY 7.4 (`aud` của
  JWS quyền lợi = `client_id`); mẫu đã chạy: client `tsuswico` (tsudev#339 + INSERT của chủ dự án 20/11/2026).

## Việc cần làm

Chủ dự án chạy trên CSDL production (giống `tsuswico`, `tsucwico`):

```sql
INSERT INTO "OAuthClient" (id, name, "redirectUris", "postLogoutRedirectUris", scopes)
VALUES ('tsudisk', 'TsuDisk', ARRAY['http://127.0.0.1/callback', 'http://[::1]/callback'], ARRAY[]::text[],
        ARRAY['tsudev.entitlements'])
ON CONFLICT (id) DO NOTHING;
```

- `client_id` = `tsudisk` (đã ghi cứng ở `src/TsuDisk.Core/Pro/ProContract.cs`; JWS quyền lợi mang `aud` = `tsudisk`).
- Native loopback, cổng bất kỳ (RFC 8252 7.3, tsudev#339) - không cần sửa mã tsudev.

## Kiểm sau khi chèn

`curl -s -D- -o /dev/null 'https://tsudev.com/oidc/auth?client_id=tsudisk&response_type=code&scope=openid&redirect_uri=http%3A%2F%2F127.0.0.1%3A53123%2Fcallback&code_challenge=x&code_challenge_method=S256'`
⇒ 303 sang `/oidc/interaction/...` (không phải 400 `invalid_client`/`invalid_redirect_uri`).

## Kết quả xử lý

- 22/11/2026 (phiên tsudisk-59, chủ dự án ủy quyền trực tiếp): INSERT chạy trên CSDL production (`INSERT 0 1`; kết nối lấy từ `DATABASE_URL` của Render service `tsudev-backend` qua API, tệp tạm đã `shred`). Kiểm: `/oidc/auth?client_id=tsudisk...` ⇒ 303 `/oidc/interaction/<uid>` (giống `tsuswico`; client lạ ⇒ 400). Ghi chú: lần gọi đầu 503 do backend Render free đang ngủ, không liên quan.
