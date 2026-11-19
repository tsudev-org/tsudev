# ADR-0002: Máy chủ quyền lợi dùng chung (Pro / Ủng hộ / huy hiệu) đặt trong auth-service

- **Ngày**: 19/11/2026 (phiên điều phối projects-d2, phase **T5** của phiếu `~/projects/logs/handover/20261119-01`)
- **Trạng thái**: ĐỀ XUẤT - chờ phiên tsudev triển khai; chủ dự án đã chốt các ràng buộc ở tsudev-standards v3.8.0
  `docs/PRODUCT_POLICY.md` mục 3-4 (không quảng cáo; Pro tháng/năm + Ủng hộ; Play Billing cho bản Play; huy hiệu)

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
