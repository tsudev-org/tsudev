# PHIẾU BÀN GIAO - Đăng ký Tsu Cwico (app desktop) làm client OIDC loopback của tsudev.com

- **Mã phiếu**: 20261120-CW1
- **Từ**: agent-tsucwico (phiên tsucwico-e7, repo `tsudev-org/tsucwico`) - **Đến**: phiên repo `tsudev` / chủ dự án (OWNER)
- **Thời điểm**: 20/11/2026
- **Trạng thái**: MỞ
- **Liên quan**: PRO1 (phiếu gốc `20261119-PRO1_*`), ADR-0002 của tsucwico mục 3 + mục 3 phase P2, tsudev#336 (đã gộp)

## 1. Bối cảnh

PRO1 P1 của Tsu Cwico xong (tsucwico#94). P2 = đăng nhập tùy chọn trong app desktop Rust/Tauri: Authorization Code +
PKCE S256, `redirect_uri` loopback `http://127.0.0.1:<cổng ngẫu nhiên>/callback` (RFC 8252 mục 7.3), `client_id`
`tsucwico`, scope `openid tsudev.entitlements` (+ `offline_access` để giữ phiên), rồi gọi `GET /api/me/entitlements`.
App gọi THẲNG IdP (không có máy chủ RP riêng như qulythuchi/sound-db) ⇒ không có `rpPublicJwk`.

Đo 20/11/2026 00:45 UTC:

- `GET https://tsudev.com/oidc/auth?client_id=tsucwico&redirect_uri=http://127.0.0.1:53682/callback&...` (PKCE S256) ⇒ **400**.
- `GET https://tsudev.com/pro` ⇒ **404** (B3 - thấy nhánh `feat/pro-b3-thanh-toan-vietqr` đang làm, không cần làm gì thêm cho phiếu này).

## 2. Việc cần làm

- [ ] **(a) Mã - client native cho phép cổng loopback bất kỳ.** `clientMetadata()` ở `services/auth-service/src/oidc.ts`
      hiện luôn trả client dạng web (không có `application_type`) và redirect URI khớp tuyệt đối. Cần (đề xuất, phiên tsudev
      chọn cách cụ thể): cột/cờ để client là `application_type: 'native'`, và kiểm redirect cho native theo RFC 8252 mục 7.3:
      chỉ `http://127.0.0.1` hoặc `http://[::1]`, đúng path `/callback`, **bỏ qua cổng**; không bao giờ `localhost`, không
      nới quy tắc cho client web. Cần agent tsudev **xác minh** `oidc-provider` 9 có sẵn nhánh này cho native+loopback hay
      phải ghi đè `Client.prototype.redirectUriAllowed` - agent tsucwico chưa đọc được mã thư viện (không có `node_modules`
      trong bản sao này). Thêm test trong `test/oidc.node.test.mjs`: native + cổng khác ⇒ chấp nhận; native + `localhost`
      hoặc path khác ⇒ từ chối; client web với `127.0.0.1` cổng khác ⇒ từ chối.
- [ ] **(b) Dữ liệu (OWNER hoặc phiên có Neon)**, sau (a):

```sql
INSERT INTO "OAuthClient" (id, name, "redirectUris", "postLogoutRedirectUris", scopes)
VALUES ('tsucwico', 'Tsu Cwico', ARRAY['http://127.0.0.1/callback'], ARRAY[]::text[],
        ARRAY['tsudev.entitlements'])
ON CONFLICT (id) DO NOTHING;
```

(Dạng giá trị redirect - có/không cổng, có thêm `http://[::1]/callback` - theo cách (a) chọn; sửa câu SQL cho khớp.)

## 3. Tiêu chí hoàn thành

1. `/oidc/auth?client_id=tsucwico&redirect_uri=http://127.0.0.1:<hai cổng khác nhau>/callback&code_challenge_method=S256&scope=openid%20tsudev.entitlements`
   ⇒ **303** sang `/oidc/interaction/...` với cả hai cổng.
2. Cùng URL nhưng `redirect_uri=http://localhost:53682/callback` hoặc `.../cb` ⇒ vẫn 400.
3. Access token cấp cho `tsucwico` đọc được `GET /api/me/entitlements` (header `X-Tsu-Installation`), JWS `aud` = `tsucwico`.

## 4. Cảnh báo

- Client công khai, không secret - đúng bất biến `docs/auth.md` mục 8; bảo vệ dựa vào PKCE S256 + `state` + `nonce`.
- Không có post-logout redirect (app xoá token cục bộ khi đăng xuất).
- App vẫn hạng C: không đăng nhập ⇒ chạy như hiện nay; không cần thẻ danh bạ mới cho phiếu này.

## 5. Kết quả xử lý (phiên nhận điền)

- 20/11/2026 - tsudev-f6: **(a) xong ở nhánh `feat/oidc-client-native-loopback`** (commit 7ec7645, chờ chủ dự án
  duyệt push/PR). oidc-provider 9.14 ĐÃ có sẵn nhánh native + loopback (`#redirectAllowed` bỏ cổng khi
  `applicationType === 'native'`), không cần ghi đè. `clientMetadata()` trả `application_type: 'native'` khi MỌI
  redirect là `http://127.0.0.1/...` hoặc `http://[::1]/...` KHÔNG ghi cổng (`isLoopbackNative`); không cột mới, không
  migration. Test `oidc.node.test.mjs` 13/13 (4 mới: 2 cổng IPv4 + 1 IPv6 ⇒ vào interaction; localhost / `/cb` /
  `/callback/x` / https / userinfo / 127.0.0.2 ⇒ 400; client web loopback cổng khác ⇒ 400).
  **(b)** sau khi (a) lên production, câu SQL ở mục 2 dùng được, nên thêm `http://[::1]/callback` vào `redirectUris`.
