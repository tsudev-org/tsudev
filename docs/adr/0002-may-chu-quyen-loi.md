# ADR-0002: Máy chủ quyền lợi dùng chung (Pro / Ủng hộ / huy hiệu) đặt trong auth-service

- **Ngày**: 19/11/2026 (phiên điều phối projects-d2, phase **T5** của phiếu `~/projects/logs/handover/20261119-01`)
- **Trạng thái**: **ĐÃ CHẤP NHẬN** (20/11/2026, phiên điều phối projects-33, phase PRO-B của phiếu
  `~/projects/logs/handover/20261119-PRO1_*`) - có bổ sung (b1)-(b3) ở mục "Bổ sung PRO1" cuối tài liệu, khớp
  tsudev-standards **v3.9.0** `docs/PRODUCT_POLICY.md` mục 7 (hợp đồng chung 7.4). Triển khai theo 3 bước: **B1 ĐÃ
  LÀM** (sổ cái + JWS + kênh RP + mã cài đặt), B2 (Play), B3 (trang `/pro`, VietQR, quản trị, huy hiệu)

## Bối cảnh

PRODUCT_POLICY mục 3.4: **tài khoản TsuDEV là nguồn sự thật về quyền lợi**, không phải thiết bị. Mọi app (Flutter,
Qt, .NET, Tauri) và website `*.tsudev.com` cần biết cùng một điều: tài khoản này có Pro tới bao giờ, đã ủng hộ chưa,
muốn hiện huy hiệu nào. Hiện có:

- `services/auth-service` đã là nhà cung cấp OIDC (`oidc.ts`, ES256, PKCE bắt buộc, `sub` = `User.id`) - app đăng
  nhập qua đây.
- `packages/db` (Prisma, PostgreSQL ở Neon) giữ `User`.
- app-la-ban có sẵn bộ xác minh Play (Worker riêng, D1 `quyen_loi`, Play Developer API + RTDN + Voided Purchases -
  QUYET_DINH Q55 của repo đó) - chỉ cho một app, một tài khoản dịch vụ.
- `tsudev.com/ung-ho` hiển thị VietQR tĩnh, không gắn tài khoản.

Ràng buộc: 0 đồng; không tin biên nhận từ client; app chạy offline tối đa 7 ngày bằng quyền lợi đã ký; Pro hết hạn
⇒ về miễn phí, không xoá dữ liệu.

## Quyết định

1. **Đặt trong auth-service + DB chung** (không dựng service mới): quyền lợi đọc cùng lúc với tài khoản, cùng một
   khoá ký ES256 đã công bố ở JWKS, không thêm hạ tầng.
2. **Mô hình dữ liệu** (migration mới, không đụng cột cũ của `User`):

   ```prisma
   model Entitlement {
     userId        String   @id
     user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     proUntil      DateTime?            // NULL = chưa từng Pro; < now() = hết hạn
     proSource     EntitlementSource?   // play | appstore | web
     donorSince    DateTime?            // vĩnh viễn sau lần ủng hộ ĐÃ XÁC NHẬN đầu tiên
     badgeDisplay  BadgeDisplay @default(AUTO) // AUTO | PRO | DONOR | BOTH | HIDDEN
     updatedAt     DateTime @updatedAt
   }
   model EntitlementEvent {          // sổ cái chỉ-ghi-thêm: mọi thay đổi quyền lợi có nguồn
     id         String   @id @default(cuid())
     userId     String
     kind       String   // play.purchase | play.rtdn | play.voided | web.vietqr | admin.adjust | ...
     externalId String?  // purchaseToken (băm SHA-256) / mã đối soát VietQR - @@unique([kind, externalId])
     proUntil   DateTime?
     actorId    String?  // admin xác nhận (web.vietqr / admin.adjust)
     createdAt  DateTime @default(now())
   }
   model PaymentIntent {             // mã nội dung chuyển khoản "TSU <mã>" cho VietQR
     code       String   @id         // 8 ký tự base32 không nhầm lẫn, sinh ngẫu nhiên CSPRNG
     userId     String
     kind       String               // pro_month | pro_year | donate
     amountVnd  Int
     status     String               // pending | confirmed | expired | rejected
     expiresAt  DateTime             // 72 giờ
     confirmedBy String?
     createdAt  DateTime @default(now())
   }
   ```

   `Entitlement` là **bản tổng hợp** tính lại từ `EntitlementEvent` (một hàm thuần `foldEvents`), để thu hồi/hoàn tiền
   chỉ cần ghi thêm sự kiện. `purchaseToken` chỉ lưu dạng băm (không lưu bí mật của Google).

3. **Phát quyền lợi cho app** - hai đường, cùng một dữ liệu:
   - Scope OIDC mới `tsudev.entitlements` ⇒ claim `tsu_ent` trong ID token: `{ pro_until, donor, badge, iat }`.
   - `GET /me/entitlements` (Bearer access token, scope trên) trả **JWS ES256 có `exp` = now + 7 ngày** ký bằng khoá
     OIDC. App lưu đệm JWS này, kiểm chữ ký bằng JWKS đã ghim/đã tải, hết `exp` ⇒ coi như miễn phí. Không có khoá bí
     mật nào trong app.
4. **Nguồn cấp quyền**
   - **Google Play** (Pro + sản phẩm tiêu hao "Ủng hộ"): `POST /me/entitlements/play` nhận `{packageName, productId,
purchaseToken}` ⇒ server gọi Play Developer API (`purchases.subscriptionsv2.get` / `purchases.products.get`) bằng
     tài khoản dịch vụ, kiểm `obfuscatedExternalAccountId` = hàm băm `User.id` (app đặt khi mở luồng mua) để chống
     dùng lại biên nhận cho tài khoản khác, rồi `acknowledge`. **RTDN**: Pub/Sub push tới `/webhooks/play-rtdn`, kiểm
     JWT OIDC của Google (aud + email tài khoản dịch vụ) - gia hạn/huỷ/hoàn tiền ⇒ sự kiện mới. Danh sách gói hợp lệ
     là cấu hình (allowlist `packageName`). Tái dùng logic đã chạy thật của app-la-ban (Q55) - chép có ghi nguồn,
     không gọi chéo Worker của repo đó.
   - **Web / desktop / APK ngoài Play** (VietQR, 0 đồng): người dùng chọn gói ⇒ tạo `PaymentIntent` ⇒ QR có nội dung
     `TSU <code>`; chủ dự án xác nhận trong `/admin/thanh-toan` (2FA bắt buộc, ghi `actorId`) ⇒ sự kiện `web.vietqr`.
     Webhook ngân hàng chỉ thêm khi có giải pháp 0 đồng cố định (mục 3.3 PRODUCT_POLICY).
   - **App Store** (2027): App Store Server API + Notifications v2, cùng mô hình sự kiện.
5. **Huy hiệu**: `badgeDisplay = AUTO` ⇒ theo bảng 4.1 (Pro còn hạn + đã ủng hộ ⇒ cả hai). Trang **Tài khoản → Huy
   hiệu** chỉ cho chọn giá trị hợp lệ với trạng thái hiện có; API công khai hồ sơ chỉ trả huy hiệu sau khi áp
   `badgeDisplay` (người dùng đã ẩn thì người khác không thấy).
6. **Bảo mật**: mọi endpoint ghi có rate limit sẵn (`rateLimitStore`), idempotent theo `@@unique([kind, externalId])`;
   sổ cái không có đường xoá ngoài cascade xoá tài khoản; log không chứa `purchaseToken` thô; cảnh báo khi một
   `externalId` bị dùng cho tài khoản khác.

## Đã bác

| Phương án                                      | Vì sao bác                                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Service/Worker quyền lợi riêng (D1)            | Thêm một nơi giữ danh tính người dùng, phải đồng bộ `User` qua mạng; auth-service đã có DB + khoá ký |
| Mỗi app tự xác minh Play (như app-la-ban)      | Huy hiệu/Pro không theo tài khoản giữa các app; nhân bản bí mật tài khoản dịch vụ                    |
| Tin biên nhận từ client / chỉ lưu cờ trong app | Trái PRODUCT_POLICY 3.4, bị vá dễ                                                                    |
| RevenueCat / cổng thanh toán trả phí           | Trái nguyên tắc 0 đồng                                                                               |
| Claim quyền lợi chỉ trong ID token             | ID token chỉ mới khi đăng nhập/làm mới; cần endpoint để app làm mới sau khi mua                      |

## Hệ quả

- Phase T6 (component huy hiệu) đọc `badge` từ `tsu_ent`/`/me/entitlements`; T7 (Pro trong từng app) chỉ cần OIDC +
  Play Billing phía app + hai endpoint trên.
- app-la-ban di chuyển dần từ D1 `quyen_loi` sang máy chủ chung khi có đăng nhập TsuDEV (giữ `/v1/status` cho bản đã
  cài tới khi hết hạn gói cũ).
- Chi phí 0 đồng: Play Developer API + Pub/Sub push dùng hạn mức miễn phí (đo trước khi bật RTDN - ghi vào
  `docs/free-tier.md`).
- Test bắt buộc trước khi gộp: biên nhận giả / sai chữ ký / `obfuscatedExternalAccountId` khác tài khoản ⇒ 4xx và
  không ghi sự kiện; RTDN JWT sai `aud` ⇒ 401; JWS quyền lợi hết `exp` ⇒ app coi là miễn phí; `foldEvents` có test
  bảng (mua, gia hạn, huỷ, hoàn tiền, ủng hộ hai lần).

## Bổ sung PRO1 (20/11/2026) - thay chỗ nào mâu thuẫn ở trên

1. **JWS quyền lợi** đúng hợp đồng PRODUCT_POLICY 7.4: header `{alg: ES256, typ: "tsu-ent+jwt", kid}` (`kid` = `kid`
   của khoá OIDC trong JWKS), payload `iss, sub, aud, iat, exp (= iat + 7 ngày), pro_until, pro_source, donor, badge,
devices_30d`. `iss` = issuer OIDC **`https://tsudev.com/oidc`**, khoá kiểm ở **`https://tsudev.com/oidc/jwks`**
   (lấy từ discovery `https://tsudev.com/oidc/.well-known/openid-configuration`). Thân trả về `{"jws": "<compact>"}`,
   `Cache-Control: no-store`. **Bỏ** claim `tsu_ent` trong ID token (mục 3 cũ): một nguồn duy nhất là endpoint, ID
   token không phình và không cũ.
2. **Đường công khai** (auth-service gắn ở `/ent`, NGOÀI cổng `INTERNAL_API_TOKEN` như `/oidc`; Next proxy ở
   `apps/frontend-main/lib/entitlementProxy.ts`):
   - `GET /api/me/entitlements` → `/ent/me`: Bearer access token OIDC có scope `tsudev.entitlements` (scope mới của
     provider; client chỉ xin được khi `OAuthClient.scopes` có nó). Thiếu scope ⇒ `403 insufficient_scope`. `aud` =
     client của token.
   - (b1) `GET /api/rp/entitlements/{sub}` → `/ent/rp/{sub}`: máy chủ RP gửi `Authorization: Bearer <client
assertion>` - JWT ES256 kiểu `private_key_jwt` (RFC 7523): `iss` = `sub` = `client_id`, `aud` =
     `https://tsudev.com/api/rp/entitlements` (khớp tuyệt đối), `exp` ≤ 300 giây, `jti` dùng một lần. Khoá công khai
     ở cột mới `OAuthClient.rpPublicJwk` (JWK EC P-256 KHÔNG có `d`; NULL = client không có kênh RP). Chỉ trả cho `sub`
     có Grant OIDC còn hạn với đúng client đó; `sub` lạ và `sub` chưa cấp quyền trả CÙNG `404 unknown_subject`.
     Đăng ký khoá cho một RP: RP sinh cặp khoá, gửi JWK công khai; OWNER chạy
     `UPDATE "OAuthClient" SET "rpPublicJwk" = '<jwk>'::jsonb WHERE id = '<client_id>'` (+ thêm `tsudev.entitlements`
     vào `scopes` nếu app cũng gọi `/api/me/entitlements`).
   - `POST /api/rp/entitlements/play` (biên nhận Play do RP chuyển tiếp) - bước **B2**, cùng xác thực b1.
3. (b2) **Mã cài đặt**: header `X-Tsu-Installation` (22 ký tự base64url) + tuỳ chọn `X-Tsu-Platform`; bảng
   `AppInstallation {userId, clientId, installationIdHash, platform, firstSeenAt, lastSeenAt}`, chỉ lưu
   HMAC-SHA-256 (khoá suy từ `INTERNAL_IDENTITY_SECRET`, nhãn `tsudev-installation-v1`); `devices_30d` = số mã của
   cùng (tài khoản, client) thấy trong 30 ngày; bản ghi quá 90 ngày bị xoá khi tài khoản đó gọi lại. Header sai định
   dạng ⇒ bỏ qua.
4. **Gộp sổ cái theo nguồn**: mỗi nguồn (`play`/`appstore`/`web`, sự kiện quản trị không nguồn = nhóm `admin`) giữ mốc
   của sự kiện mới nhất của nguồn đó; Pro tổng = mốc lớn nhất ⇒ hoàn tiền ở Play không xoá Pro mua trên web.
   `admin.revoke` đặt mọi nguồn về mốc của nó. `EntitlementEvent` có thêm `proSource`, `donation`. Ghi sự kiện chỉ qua
   `recordEvent` (một giao dịch: chèn sự kiện + tính lại `Entitlement`; trùng `(kind, externalId)` ⇒ bỏ qua).
5. **Bước còn lại**:
   - **B2 - Google Play**: `POST /api/me/entitlements/play` + `/api/rp/entitlements/play`, Play Developer API
     (`subscriptionsv2.get`, `products.get`, `acknowledge`), `obfuscatedAccountId` = base64url(SHA-256(`tsudev-pro|` +
     `sub`)), RTDN qua Pub/Sub push (kiểm JWT OIDC của Google). Cần 👤: tài khoản dịch vụ Play (JSON) + topic Pub/Sub.
   - **B3 - web**: trang `tsudev.com/pro` + `tsudev.com/ung-ho?app=` (giá 49.000 ₫/tháng, 490.000 ₫/năm; ủng hộ
     20/50/100/200 nghìn; điều khoản thuê bao trước nút mua), `PaymentIntent` + VietQR `TSU <mã 8 ký tự>`, trang quản
     trị xác nhận (2FA, ghi `actorId`), **Tài khoản → Huy hiệu** (`badgeDisplay`), dùng component PRO-C.
6. **Vận hành**: migration `20261120090000_quyen_loi_pro_ung_ho` chỉ THÊM bảng/enum/cột NULL - chạy
   `npm run db:migrate` với `DATABASE_URL` production TRƯỚC khi gộp (cổng `migrationGate` chặn khởi động khi lệch).
