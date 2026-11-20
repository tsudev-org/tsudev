# 20261120-SDB1 - Yêu cầu từ sound-db: đăng ký khoá RP `sounddb` + logo Sound Db cho danh bạ

- **Từ**: phiên `sound-db-28` (repo `tsudev-org/sound-db`), 20/11/2026. **Đến**: phiên tsudev / chủ dự án (OWNER).
- **Trạng thái**: ĐÓNG (20/11/2026) - mục 2 chờ deploy frontend.

## 1. Khoá RP cho client `sounddb` (PRO2 - tsudev ADR-0002 mục b1)

Máy chủ Sound Db (RP, Workers) gọi `GET /api/rp/entitlements/{sub}` và `POST /api/rp/entitlements/status` bằng client
assertion ES256 (`iss` = `sub` = `sounddb`, `kid` dưới đây). Cần OWNER chạy trên **Neon production**:

```sql
UPDATE "OAuthClient"
SET "rpPublicJwk" = '{"kty":"EC","x":"dN_4PvVpj7HuRz_I83SDifV4LZNPqo0zljTFMtMgGSQ","y":"ztA-zD8bBoez6T2qOz0NnmFv9-VxOhLRUnX_1dFvQJA","crv":"P-256","kid":"sounddb-rp-svyC6wj_SJbp","alg":"ES256","use":"sig"}'::jsonb
WHERE id = 'sounddb';
```

JWK công khai, không có `d`. Khoá riêng chỉ ở secret Worker `RP_PRIVATE_JWK` + máy dev (600). App Sound Db KHÔNG gọi
`/api/me/entitlements` trực tiếp ⇒ không cần thêm scope `tsudev.entitlements`.

Đo sau khi chạy (sound-db làm): đăng nhập web Sound Db → Tài khoản hiện trạng thái Pro; `wrangler tail` không còn
`entitlements_unavailable rp_401`.

## 2. Logo riêng Sound Db (phiếu LG1 mục 3 bước 6, BRAND_ASSETS 15.6)

Đã deploy: `https://sounddb.tsudev.com/brand/logo-sound-db.png` (512x512, SHA-256 `ab0fa525…f439f8c`). Thay ảnh thẻ Sound
Db ở tsudev.com/apps (phiếu tsudev `20261120-LG1`).

## 3. Kết quả xử lý

- Mục 1 (20/11/2026): phiên `sound-db-67` báo đã xác minh - client assertion ES256 kid `sounddb-rp-svyC6wj_SJbp` gọi
  `POST https://tsudev.com/api/rp/entitlements/status` với sub giả ⇒ HTTP 200 `{"results":{"<sub>":{"status":"unknown_subject"}}}`.
  Chưa đo đầu-cuối bằng tài khoản thật (production Sound Db chưa có người dùng).
- Mục 2 (20/11/2026, phiên tsudev-2cce): eco icon `sounddb` lấy thẳng URL website (`as-is`, đã bỏ dấu ✦) - xem phiếu
  `20261120-LG1` mục 3. Hiện lên tsudev.com/apps ở lần deploy frontend kế tiếp.
