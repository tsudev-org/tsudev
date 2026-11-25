# PHIẾU YÊU CẦU - Đăng ký client OIDC native `tsutramon`

- **Mã phiếu**: 20261125-DK3
- **Từ**: phiên `tsudev-trafficmonitor` (SES-20261125-0022-ee38), 25/11/2026 - **Đến**: phiên kế tiếp của `tsudev` (hoặc chủ dự án 👤)
- **Trạng thái**: ĐÓNG (25/11/2026)
- **Căn cứ**: tsutramon `docs/adr/0002-*.md` mục 2.4-2.5 (P9: đăng nhập OIDC PKCE + JWS quyền lợi + đăng nhập QR);
  PRODUCT_POLICY 7.4 (`aud` của JWS quyền lợi = `client_id`); mẫu đã chạy: phiếu `20261122-DK1` (client `tsudisk`).

## Việc cần làm

Chủ dự án chạy trên CSDL production (giống `tsudisk`, `tsuswico`, `tsucwico`):

```sql
INSERT INTO "OAuthClient" (id, name, "redirectUris", "postLogoutRedirectUris", scopes)
VALUES ('tsutramon', 'Tsu Tramon', ARRAY['http://127.0.0.1/callback', 'http://[::1]/callback'], ARRAY[]::text[],
        ARRAY['tsudev.entitlements'])
ON CONFLICT (id) DO NOTHING;
```

- `client_id` = `tsutramon` (tên sản phẩm mới, ADR-0001 của tsutramon; KHÔNG dùng tên cũ `tsudev-trafficmonitor`).
- Ứng dụng desktop Windows (C++/MFC), native loopback cổng bất kỳ (RFC 8252 7.3, tsudev#339); "Quét để đăng nhập"
  (CROSS_DEVICE_LOGIN) dùng chung `client_id` + `redirect_uri` này. Không cần sửa mã tsudev.
- Danh bạ `ecosystem.ts` (phiếu TM1 mục 2): tên Tsu Tramon, biểu tượng cho màn Cho phép lấy theo `client_id` đã đăng ký.

## Kiểm sau khi chèn

`curl -s -D- -o /dev/null 'https://tsudev.com/oidc/auth?client_id=tsutramon&response_type=code&scope=openid&redirect_uri=http%3A%2F%2F127.0.0.1%3A53123%2Fcallback&code_challenge=x&code_challenge_method=S256'`
⇒ 303 (như `tsudisk`), không phải 400. Đo 25/11/2026: `tsutramon` ⇒ 400 (chưa có), `tsudisk` ⇒ 303.

## Kết quả xử lý

- 25/11/2026 - tsudev-trafficmonitor: mở phiếu.
- 25/11/2026 - tsudev-3e: phiếu vào repo (#382). Máy không có URL Neon ⇒ 👤 chạy `bash ~/dk3-tsutramon.sh` trong terminal WSL riêng (INSERT + SELECT + curl kiểm 303).
- 25/11/2026 - tsudev-c4: ĐO lại lệnh trên ⇒ **303** (chủ dự án đã chạy `~/dk3-tsutramon.sh`). Đã nhắn phiên tsudev-trafficmonitor-61. ĐÓNG.
