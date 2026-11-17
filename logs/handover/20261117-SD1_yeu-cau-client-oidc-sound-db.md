# PHIẾU BÀN GIAO - Đăng ký Sound Db làm client OIDC của tsudev.com + thêm vào danh bạ /apps

- **Mã phiếu**: 20261117-SD1 (bản gốc: `~/projects/sound-db/logs/handover/20261117-01_yeu-cau-dang-ky-client-oidc-tsudev.md`)
- **Từ**: agent-sound (repo `sound-db`) - **Đến**: phiên repo `tsudev` / chủ dự án (OWNER)
- **Thời điểm**: 07:30 17/11/2026
- **Trạng thái**: MỞ - còn 👤 OWNER chèn `OAuthClient` `sounddb` (sửa tên miền OIDC + danh bạ đã xong)
- **Nhánh git**: không (chỉ dữ liệu + một mục danh bạ)

## 1. Việc đã làm xong

- Sound Db (sounddb.tsudev.com) là RP OIDC hoàn chỉnh: Authorization Code + PKCE S256, `state` gắn trình duyệt,
  `nonce`, kiểm `id_token` ES256 theo JWKS/`kid`, đọc userinfo cùng `sub` (`services/sync-api/src/auth/oidc.ts`,
  17 test với IdP giả). Lý do đi qua máy chủ thay vì app làm client trực tiếp: `docs/adr/0003-*`.

## 2. Việc cần làm (chỉ OWNER)

- [ ] Chèn client (tsudev `docs/auth.md` mục 8):

```sql
INSERT INTO "OAuthClient" (id, name, "redirectUris", "postLogoutRedirectUris", scopes)
VALUES ('sounddb', 'Sound Db', ARRAY['https://sounddb.tsudev.com/auth/callback'],
        ARRAY['https://sounddb.tsudev.com/'], ARRAY['profile', 'email']);
```

(Nếu bảng không có cột `postLogoutRedirectUris`/`scopes` như trên: giữ đúng `id` = `sounddb` và redirect DUY NHẤT
`https://sounddb.tsudev.com/auth/callback`.)

- [ ] Thêm Sound Db vào `packages/ui/src/lib/ecosystem.ts` (website `https://sounddb.tsudev.com`, logo hiện là logo
      tsudev chung - `https://sounddb.tsudev.com/brand/logo-sound-db.png`), sau khi site lên production.

## 3. Tiêu chí hoàn thành

`curl -sI https://sounddb.tsudev.com/auth/web/start` trả 302 tới `https://tsudev-backend.onrender.com/oidc/auth?...
client_id=sounddb...`, và đăng nhập thử trả về `/bang-dieu-khien/` có tên người dùng.

## 5. Cảnh báo

- Discovery của tsudev công bố endpoint ở `tsudev-backend.onrender.com` trong khi issuer là `https://tsudev.com/oidc`
  (đo 17/11/2026). Sound Db đọc endpoint từ discovery nên vẫn chạy, nhưng trang đăng nhập/đồng ý sẽ hiện tên miền
  onrender.com trên thanh địa chỉ - phiên tsudev nên xem có chủ ý không (người dùng khó tin một tên miền lạ).

## Kết quả xử lý (phiên tsudev, 17/11/2026)

- **Cảnh báo mục 5 là LỖI THẬT, đã sửa**: proxy `/oidc/*` của tsudev.com chỉ gửi `x-forwarded-proto`, nên
  `oidc-provider` (proxy = true) dựng endpoint theo host Render. Không chỉ là tên miền lạ: trang đồng ý
  `/oidc/interaction/<uid>` (đường tương đối) sẽ mở trên Render - nơi không có trang Next đó ⇒ luồng đăng nhập của
  site con gãy. Nay proxy gửi `x-forwarded-host` CỐ ĐỊNH theo `MAIN_URL` (không lấy từ request); test
  `test/oidcRewrites.test.ts` canh. Sau deploy, discovery phải công bố `https://tsudev.com/oidc/auth` ⇒ tiêu chí mục 3
  của phiếu đổi thành 302 tới `https://tsudev.com/oidc/auth?...client_id=sounddb...`.
- 👤 Chèn `OAuthClient` `sounddb`: máy agent không có chuỗi kết nối Neon - OWNER chạy câu SQL ở mục 2 (đã đối chiếu
  `docs/auth.md` mục 8).
- ✅ Danh bạ: site lên 17/11 (đo `/` 200, `/api/v1/health` 200) ⇒ thẻ `sounddb` (Tiện ích; Android, macOS/iOS, Windows,
  Linux; Apache-2.0). Logo trên site đang là logo tsudev chung ⇒ thẻ dùng ô màu + glyph cho khỏi trùng; có logo riêng
  thì gửi phiếu. Chưa có bản phát hành/gói ⇒ ngoại lệ C4 TẠM cho `sounddb` (gỡ khi có gói).
