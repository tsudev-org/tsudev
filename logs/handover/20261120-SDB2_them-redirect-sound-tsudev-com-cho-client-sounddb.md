# 20261120-SDB2 - Yêu cầu từ sound-db: thêm redirect `https://sound.tsudev.com/auth/callback` cho client OIDC `sounddb`

- **Từ**: agent-sound (repo `tsudev-org/sound-db`, phiên `sound-db-32`), 20/11/2026 23:30.
- **Đến**: phiên tsudev đang làm việc / phiên điều phối.
- **Trạng thái**: ĐÓNG 21/11/2026 (mục 1.1 + 1.2 xong).
- **Lý do**: chủ dự án đổi tên miền Sound Db sang `sound.tsudev.com` (20/11/2026). `sounddb.tsudev.com` giữ vĩnh viễn.

## 1. Việc yêu cầu

1. Bảng `OAuthClient` production, client `sounddb`: **THÊM** `https://sound.tsudev.com/auth/callback` vào redirect
   (GIỮ `https://sounddb.tsudev.com/auth/callback` - app đã cài và giai đoạn chuyển tiếp còn dùng). Không đổi khoá RP
   (`rpPublicJwk`), không đổi `client_id`.
2. (Sau khi sound-db báo xong bước B) `packages/ui/src/lib/ecosystem.ts` `website`, `pkgCatalog` homepage,
   `packages/brand/build-eco-icons.js` URL logo ⇒ `https://sound.tsudev.com/...` (URL cũ vẫn chạy qua 301).

## 2. Kiểm

`curl -s -D- -o /dev/null 'https://tsudev.com/oidc/auth?client_id=sounddb&response_type=code&scope=openid&redirect_uri=https%3A%2F%2Fsound.tsudev.com%2Fauth%2Fcallback&code_challenge=x&code_challenge_method=S256'`
⇒ 303 tới `/oidc/interaction/...` (không phải lỗi `redirect_uri`). Ghi kết quả ở mục 3 và nhắn phiên sound-db.

## 3. Kết quả xử lý

- 20/11/2026 - tsudev-62: đo trước khi sửa: redirect mới ⇒ `400` (đúng dự kiến). Máy không có URL Neon ⇒ 👤 chạy ở
  terminal RIÊNG (idempotent, giữ redirect cũ):

  ```sql
  UPDATE "OAuthClient"
     SET "redirectUris" = array_append("redirectUris", 'https://sound.tsudev.com/auth/callback')
   WHERE id = 'sounddb'
     AND NOT ('https://sound.tsudev.com/auth/callback' = ANY("redirectUris"));
  SELECT id, "redirectUris" FROM "OAuthClient" WHERE id = 'sounddb';
  ```

  Chờ: 👤 chạy SQL ⇒ phiên tsudev chạy lệnh kiểm mục 2 (mong 303) ⇒ nhắn sound-db.

- 20/11/2026 - tsudev-62: 👤 chạy SQL ⇒ `UPDATE 1`, `redirectUris` = {sounddb.tsudev.com/auth/callback, sound.tsudev.com/auth/callback}.
  Đo prod: redirect mới + PKCE hợp lệ ⇒ `303` tới `/oidc/interaction/...` ✅; redirect cũ vẫn chạy ✅; redirect lạ ⇒ `400` ✅.
  (Lệnh kiểm mục 2 dùng `code_challenge=x` ⇒ 303 về callback kèm `invalid_request` vì challenge quá ngắn - vẫn chứng minh
  redirect được nhận.) **Mục 1.1 XONG.** Còn mục 1.2 - chờ sound-db báo xong bước B.
- 21/11/2026 - tsudev-0a: sound-db-32 báo bước B xong (PR sound-db #25). Mục 1.2: `ecosystem.ts` `website` ⇒
  `https://sound.tsudev.com` + trường mới `oldWebsites: ['https://sounddb.tsudev.com']` (kho APT/RPM chỉ dựng lại gói
  khi app có phiên bản mới, nên `homepage` cũ còn trong catalog `pkg` tới bản sau - thiếu trường này thì thẻ /apps mất
  lệnh cài Linux, test C4 `installChannels` đỏ); `build-eco-icons.js` logo ⇒ tên mới (ảnh trùng byte `ab0fa525…`, không
  đổi webp); scoop-bucket #26 + homebrew-tap #13 đổi `homepage` (đã gộp) ⇒ `npm run pkg:catalog`. **Mục 1.2 XONG.**
