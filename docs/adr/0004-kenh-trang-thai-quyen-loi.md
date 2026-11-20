# ADR-0004: Kênh trạng thái quyền lợi, client `tsusync` hỏi thay, DPoP cho JWS

- **Ngày**: 20/11/2026 (phiên tsudev-9d, phiếu `logs/handover/20261120-PRO2_*`)
- **Trạng thái**: **ĐÃ CHẤP NHẬN**
- **Hợp đồng**: tsudev-standards **v4.0.0** `docs/PRODUCT_POLICY.md` mục 7.2, 7.4 ("Kênh trạng thái", "Gắn khoá
  thiết bị", "Xoá dữ liệu đám mây vì hết Pro"). Bổ sung cho [ADR-0002](0002-may-chu-quyen-loi.md).

## Bối cảnh

Pro kỳ 1 năm, không tự gia hạn. Hết kỳ 90 ngày, máy chủ đồng bộ xoá bản sao đám mây. Lỗi phải chặn: người **gia hạn
trên web mà không mở app suốt 90 ngày**. Máy chủ đồng bộ chỉ biết `pro_until` cũ; kênh RP `GET
/api/rp/entitlements/{sub}` trả 404 khi grant OIDC (30 ngày) đã hết - nên nó không trả lời được đúng câu cần hỏi.

## Quyết định

1. **`POST /api/rp/entitlements/status`** (Next proxy → auth-service `/ent/status`). Xác thực `private_key_jwt`
   giống kênh RP nhưng `aud` = ĐÚNG URL kênh này (assertion của kênh này không dùng được cho kênh JWS và ngược lại).
   Thân `{"client_id", "subs": [≤ 100]}`; trả `ok` + `pro_until` | `deleted` | `unknown_subject`, `no-store`.
2. **"Đã từng cấp quyền" là bảng riêng `RpSubject(clientId, sub)`**, do TRIGGER CSDL ghi mỗi khi có dòng
   `OidcPayload` kiểu `Grant` (kèm nạp ngược từ grant hiện có). Không gắn khoá ngoại tới `User` để dòng sống qua lúc
   xoá tài khoản. `sub` không có dòng cho client đó ⇒ `unknown_subject` dù tài khoản tồn tại hay đã xoá - RP không
   liệt kê được người dùng của RP khác.
3. **Dấu tài khoản đã xoá `DeletedSubject(sub, deletedAt)`** do TRIGGER `AFTER DELETE ON "User"` ghi - mọi đường xoá
   (tự xoá sau hạn chờ, OWNER xoá, SQL tay) đều để lại dấu mà không cần mã ứng dụng nhớ gọi. Giữ 400 ngày (≥ 1 năm
   theo 7.4), dọn kèm `RpSubject` của cùng `sub` (tối đa 1 lần/giờ, chạy sau mỗi lời gọi kênh trạng thái - Render
   free không có cron thường trực).
4. **Hỏi thay**: cột `OAuthClient.statusDelegateFor String[]` - danh sách `client_id` mà client đó được hỏi thay.
   Chỉ `tsusync` có giá trị; không có endpoint ghi (SQL/seed của chủ dự án). Client bị tắt (`disabledAt`) ⇒ 401.
5. **Giới hạn và kiểm toán**: 30 lời gọi/phút mỗi client đã xác thực (`RATE_LIMIT_ENTITLEMENT_STATUS_MAX`), cộng giới
   hạn theo IP chung của `/ent`. Mỗi lời gọi ghi một dòng `TrustAuditLog` (`entitlement.status`, client gọi, client
   được hỏi, `subs=<số>`) - KHÔNG ghi danh sách `sub`.
6. **DPoP** cho `GET /api/me/entitlements`: header `DPoP` có mặt thì PHẢI hợp lệ (`typ` `dpop+jwt`, ES256, `jwk`
   P-256 công khai, `htm`, `htu` = URL công khai theo `SITE_URL` (bỏ query/fragment), `iat` ±60 giây, `jti` một lần,
   `ath` = SHA-256 access token) - sai ⇒ `401 invalid_dpop_proof`, không âm thầm cấp JWS thiếu `cnf`. Hợp lệ ⇒
   `cnf.jkt` (RFC 7638) trong JWS. Không có header ⇒ JWS như cũ. Chưa dùng `DPoP-Nonce` (tuỳ chọn ở RFC 9449).
7. **Kỳ 1 năm**: `/pro` chỉ bán `pro_year` (490.000 ₫), `pro_until = max(pro_until, now) + 12 tháng` (UTC). `pro_month`
   không tạo mới được; ý định tạo trước PRO2 vẫn xác nhận được (người đã chuyển 49.000 ₫ nhận đúng 1 tháng).

## Đăng ký client `tsusync` (chủ dự án, khi deploy TsuDEV Sync)

```sql
INSERT INTO "OAuthClient" (id, name, "redirectUris", scopes, "rpPublicJwk", "statusDelegateFor")
VALUES ('tsusync', 'TsuDEV Sync', ARRAY[]::text[], ARRAY[]::text[],
        '{"kty":"EC","crv":"P-256","x":"<x>","y":"<y>"}'::jsonb,
        ARRAY['<client_id app 1>', '<client_id app 2>']);
-- Thêm app dùng TsuDEV Sync:
UPDATE "OAuthClient" SET "statusDelegateFor" = array_append("statusDelegateFor", '<client_id>') WHERE id = 'tsusync';
```

## Hệ quả

- Máy chủ đồng bộ gặp `unknown_subject` hoặc lỗi ⇒ **hoãn** xoá (7.4) - kênh này sai theo hướng an toàn.
- `jti` (assertion + DPoP) chống phát lại trong MỘT tiến trình (`backend-bundle` là một tiến trình) - nhiều tiến trình
  thì cần kho chung, như `@tsudev/ratelimit`.
- Test: `services/auth-service/test/entitlementStatus.test.ts` (mục 2.2 phiếu PRO2 + DPoP, vector RFC 7638 chung với
  `tsudev_ui` `dpop_test.dart`), `apps/frontend-main/test/proTerms.test.ts` (nguyên văn 7.5).
