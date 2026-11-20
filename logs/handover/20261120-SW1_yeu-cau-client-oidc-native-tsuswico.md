# PHIẾU BÀN GIAO - Đăng ký Tsu Swico làm client OIDC NATIVE (loopback) của tsudev.com

- **Mã phiếu**: 20261120-SW1
- **Từ**: agent-tsuswico (repo `tsudev-org/tsuswico`, phiên tsuswico-8b) - **Đến**: phiên repo `tsudev` / chủ dự án (OWNER)
- **Thời điểm**: 20/11/2026
- **Trạng thái**: MỞ
- **Chặn**: PRO1 P3 của tsuswico (`login`/`logout`/`account`) - `docs/adr/0002-luu-cuc-bo-pro-dong-bo.md` mục 2.3

## 1. Hiện trạng (đo 20/11/2026)

- `GET https://tsudev.com/oidc/auth?client_id=tsuswico&redirect_uri=http://127.0.0.1:53123/callback&...` (PKCE S256)
  ⇒ **400** "Yêu cầu đăng nhập từ ứng dụng này không hợp lệ" - client chưa có trong `OAuthClient`.
- `services/auth-service/src/oidc.ts` `clientMetadata()` không đặt `application_type` ⇒ `oidc-provider` coi mọi client
  là `web`: redirect phải khớp tuyệt đối. Tsu Swico là CLI Windows (không có máy chủ riêng như qulythuchi), dùng
  **loopback cổng ngẫu nhiên** theo RFC 8252 mục 7.3 ⇒ chỉ chèn bảng là CHƯA đủ.

## 2. Việc cần làm

- [ ] **Mã IdP** (phiên tsudev): cho bảng `OAuthClient` khai client native, ví dụ cột `applicationType`
      (`'web'` mặc định | `'native'`) và `clientMetadata()` trả `application_type` tương ứng. Với `native`,
      `oidc-provider` 9 chấp nhận redirect `http://127.0.0.1:<cổng bất kỳ>/callback` khi đã đăng ký
      `http://127.0.0.1/callback` (khác cổng được phép, khác host/đường dẫn thì không). Test: cổng khác ⇒ đạt; `localhost`
      hoặc đường dẫn khác ⇒ 400; client `web` vẫn khớp tuyệt đối như cũ.
- [ ] **Dữ liệu** (OWNER / phiên có chuỗi Neon), sau khi mã trên lên production:

```sql
INSERT INTO "OAuthClient" (id, name, "redirectUris", "postLogoutRedirectUris", scopes, "applicationType")
VALUES ('tsuswico', 'Tsu Swico', ARRAY['http://127.0.0.1/callback'], ARRAY[]::text[],
        ARRAY['tsudev.entitlements'], 'native')
ON CONFLICT (id) DO NOTHING;
```

- [ ] Báo lại `client_id` chốt (đề xuất `tsuswico`, khớp tên sản phẩm ADR-0001 của tsuswico; JWS quyền lợi sẽ mang
      `aud` = giá trị này) qua SendMessage tới phiên `tsuswico-*` hoặc ghi vào phiếu này rồi ĐÓNG.

## 3. Tiêu chí hoàn thành

Cùng URL ở mục 1 nhưng cổng bất kỳ ⇒ **303** sang `/oidc/interaction/...`; `redirect_uri=http://localhost:...` ⇒ 400.

## 4. Cảnh báo

- Client công khai, KHÔNG secret (như mọi client hiện có). Scope chỉ `openid offline_access tsudev.entitlements` - CLI
  không cần `profile`/`email` (dữ liệu tối thiểu; app chỉ hiện "đã đăng nhập").
- Không cấp `localhost` (RFC 8252 mục 8.3 khuyên dùng IP literal) và không cấp custom scheme.
- Có thể dùng chung cơ chế này cho Tsu Cwico / app desktop khác về sau - nên làm tổng quát, không đặc cách `tsuswico`.

## 5. Kết quả xử lý (phiên nhận điền)

- 20/11/2026 - tsudev-f6: **mã IdP xong** ở tsudev#339 (`70b7596`, phiếu CW1 cùng cơ chế, tổng quát cho mọi app
  desktop). KHÔNG có cột `applicationType`: `clientMetadata()` tự trả `application_type: 'native'` khi MỌI redirect là
  `http://127.0.0.1/...` hoặc `http://[::1]/...` KHÔNG ghi cổng (`isLoopbackNative`), oidc-provider 9.14 bỏ qua cổng
  loopback; `localhost`, path khác, https ⇒ 400; client web vẫn khớp tuyệt đối. `client_id` chốt: **`tsuswico`**.
- CÒN (👤 OWNER, chuỗi Neon không có trên máy agent) - câu SQL ĐÚNG (bỏ cột `applicationType` của mục 2):

```sql
INSERT INTO "OAuthClient" (id, name, "redirectUris", "postLogoutRedirectUris", scopes)
VALUES ('tsuswico', 'Tsu Swico', ARRAY['http://127.0.0.1/callback', 'http://[::1]/callback'], ARRAY[]::text[],
        ARRAY['tsudev.entitlements'])
ON CONFLICT (id) DO NOTHING;
```
