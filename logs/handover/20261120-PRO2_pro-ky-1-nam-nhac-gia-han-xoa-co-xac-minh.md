# 20261120-PRO2 - tsudev: TsuDEV Pro kỳ 1 năm, nhắc gia hạn 7 ngày, xoá có xác minh

- **Người lập**: phiên điều phối `projects-a6`, 20/11/2026 - phiếu mẹ `~/projects/logs/handover/20261120-PRO2_pro-ky-1-nam-xoa-co-xac-minh-toan-he.md`
- **Hợp đồng**: `tsudev-org/tsudev-standards` **v4.0.0** - `docs/PRODUCT_POLICY.md` v1.2.0 mục 3.3, 7.2, 7.4, 7.5,
  **7.6**, 8. Lệch giữa phiếu và PRODUCT_POLICY ⇒ PRODUCT_POLICY thắng.
- **Thay phần tương ứng** của phiếu `20261119-PRO1` trong repo này (giá tháng/năm, mã `thang`, "tự gia hạn").
- **Người làm**: phiên tsudev (hoặc điều phối nếu repo rảnh) - kiểm `logs/LOCKS.md` + ListAgents trước khi sửa

## 1. Bối cảnh (chủ dự án 20/11/2026)

- Pro áp dụng **1 năm**, **không tự gia hạn**; hết kỳ mà không gia hạn ⇒ về **trạng thái miễn phí ("khách mời")**:
  dùng đủ tính năng cục bộ, KHÔNG đồng bộ/sao lưu lên đám mây; dữ liệu trên thiết bị giữ nguyên; bản sao đám mây kéo/xuất
  được 90 ngày rồi bị xoá **có xác minh**.
- 7 ngày cuối trước khi hết hạn: **nhắc gia hạn mỗi lần mở app**; hết kỳ: báo **một lần**.
- Lỗi cần chặn: người **gia hạn trên web mà không mở app suốt 90 ngày** bị máy chủ xoá nhầm bản sao đám mây (máy chủ chỉ
  biết `pro_until` cũ; kênh RP `GET /api/rp/entitlements/{sub}` trả 404 khi grant OIDC quá 30 ngày).

## 2. Việc phải làm

### 2.1. Máy chủ quyền lợi: kỳ 1 năm (PRODUCT_POLICY 7.2)

- Mọi nguồn cấp Pro (`web.vietqr`, `play`, `appstore`) tính `pro_until = max(pro_until, thời điểm xác nhận) + 1 năm`
  (12 tháng theo lịch, UTC); idempotent theo mã giao dịch (xác nhận 2 lần ⇒ 1 lần cộng). Bỏ chu kỳ tháng khỏi mô hình,
  `PaymentIntent`, trang `/admin/thanh-toan`.
- B2 (Play): sản phẩm `tsudev_pro` chỉ gói **trả trước** `nam`; mỗi lần nạp thêm (top-up) ⇒ cộng 1 năm theo công thức;
  RTDN/voided ⇒ trừ đúng kỳ đã hoàn. App Store (2027): Non-Renewing `com.tsudev.pro.nam`.
- B3 (`tsudev.com/pro`): chỉ còn **490.000 ₫ / 1 năm**; điều khoản nguyên văn PRODUCT_POLICY 7.5 mới (đứng trước nút);
  trang Tài khoản hiện "Pro tới DD/MM/YYYY" + nút Gia hạn; 7 ngày cuối hiện băng nhắc gia hạn trên web.

### 2.2. Kênh trạng thái `POST /api/rp/entitlements/status` (PRODUCT_POLICY 7.4) - **ưu tiên cao nhất**

- Xác thực: client assertion `private_key_jwt` như kênh RP (`aud` = `https://tsudev.com/api/rp/entitlements/status`,
  `exp` ≤ 300 giây, `jti` một lần).
- Thân `{"client_id": "<id>", "subs": [...]}` (≤ 100; quá ⇒ 400). RP chỉ được hỏi `client_id` của chính mình (khác ⇒
  403). Đăng ký client **`tsusync`** (khoá công khai từ chủ dự án khi deploy TsuDEV Sync) với quyền hỏi thay danh sách
  `client_id` dùng TsuDEV Sync (cấu hình, ADR mới).
- Trả `{"results": {"<sub>": {"status": "ok", "pro_until": <giây>} | {"status": "deleted"} | {"status": "unknown_subject"}}}`,
  `Cache-Control: no-store`, cho mọi `sub` **đã từng** cấp quyền cho `client_id` đó - KHÔNG lọc theo grant 30 ngày (lưu
  bảng "subject đã từng cấp quyền cho client" khi đồng ý). `deleted` = tài khoản đã xoá; giữ dấu `sub` đã xoá ≥ 1 năm.
  Chỉ trả `pro_until`.
- Giới hạn tần suất theo client; ghi nhật ký kiểm toán (client, số `sub`, không ghi danh sách `sub`).
- Test: client lạ/assertion sai `aud`/`jti` dùng lại ⇒ 401; hỏi `client_id` khác ⇒ 403; `sub` grant đã quá 30 ngày vẫn
  trả `ok`; tài khoản đã xoá ⇒ `deleted`; > 100 `sub` ⇒ 400.

### 2.3. DPoP cho `GET /api/me/entitlements` (`SHOULD`, lộ trình tsusync ADR-0002)

- Có header `DPoP` hợp lệ (RFC 9449: `htm`, `htu`, `iat` ±60 giây, `jti`, ES256 + `jwk` P-256) ⇒ thêm
  `"cnf": {"jkt": "<RFC 7638 thumbprint>"}` vào JWS. Không có ⇒ JWS như cũ.
- **Bổ sung 20/11/2026 (phiên điều phối, PRO2-UI xong - `tsudev_ui` v0.2.0)** - client Flutter gửi đúng như sau, máy
  chủ cần nhận đúng dạng này:
  - `Authorization: Bearer <access token>` (access token KHÔNG gắn khoá) + `DPoP: <proof>`; proof có `typ` =
    `dpop+jwt`, `alg` = `ES256`, `jwk` = {`kty`,`crv`,`x`,`y`}; payload `jti` (16 byte base64url), `htm` = `GET`,
    `htu` = `https://tsudev.com/api/me/entitlements` (không query/fragment), `iat`, **`ath`** = base64url(SHA-256(access
    token)). Máy chủ nên kiểm `ath` khớp token đi kèm.
  - Nếu máy chủ trả `400`/`401` `{"error":"use_dpop_nonce"}` + header `DPoP-Nonce`, client thử lại MỘT lần với `nonce`
    (RFC 9449 mục 8) - tuỳ chọn, không bắt buộc dùng nonce.
  - Client gửi JWS lên máy chủ đồng bộ: `cnf.jkt` có ⇒ `Authorization: DPoP <jws>` + proof có `ath` = SHA-256(jws);
    không có ⇒ `Bearer <jws>`. `401 {"error":"invalid_token","reason":"stale"}` ⇒ client lấy JWS mới, thử lại 1 lần.
  - Vector đối chiếu (khoá test RFC 6979 A.2.5, công khai): `jkt` = `DOvxvJiAdIqVWIkFt5hDtCunXLF0BV4-JGv4f-ALSm0`
    (xem `tsudev-ui-flutter/test/dpop_test.dart`).

### 2.4. Thư nhắc (`SHOULD`, 0 đồng: Resend/Brevo theo FREE_TIER_STACK)

- Người đã xác minh email: 7 ngày trước hết kỳ, ngày hết kỳ, 30 và 7 ngày trước khi bản sao đám mây bị xoá
  (`pro_until` + 60 ngày, + 83 ngày). Mỗi mốc gửi tối đa 1 thư; có link huỷ nhận thư nhắc.

## 3. Điều kiện xong

- [ ] Các mục ở phần 2 xong, test xanh, CI xanh; sync bộ quy ước **v4.0.0** trong cùng PR (thay v3.9.1 của PRO1).
- [ ] Checklist PRODUCT_POLICY mục 8 (các dòng Pro) đạt; số liệu/ảnh chụp nhắc gia hạn vi/en Sáng/Tối trong PR.
- [ ] Việc cần chủ dự án (Play Console, App Store Connect, deploy production, merge bị bộ phân loại chặn): ghi rõ lệnh
      `!` cho chủ dự án, không lách.

## 4. Không làm

- Không thêm tự gia hạn, gói tháng, dùng thử miễn phí, popup nhắc Ủng hộ (chỉ nhắc Pro đúng điều kiện 7.6).
- Không xoá dữ liệu trên thiết bị trong bất kỳ trường hợp nào.

## 5. Kết quả xử lý (mỗi phiên ghi một dòng)

- 20/11/2026 tsudev-9d: PR #341 - kênh trạng thái (2.2, test 43/43), DPoP cnf.jkt (2.3), /pro chỉ 1 năm + nguyên văn 7.5, sync v4.0.0, ADR-0004. Migration 20261120140000 chờ chủ dự án chạy lên Neon trước merge. Còn: thư nhắc 2.4, băng nhắc 7 ngày + "Pro tới" trên web, B2 Play.
- 20/11/2026 tsudev-17: băng nhắc gia hạn 7 ngày cuối (nguyên văn 7.6, test đối chiếu `.standards`) trên Tài khoản → Huy hiệu và Pro + Hồ sơ; dòng trạng thái đổi thành "Pro tới DD/MM/YYYY" + Gia hạn. CHƯA làm thư nhắc 2.4 (cần migration bảng mốc đã gửi + cron + link huỷ nhận ⇒ migration lên Neon trước merge). Nhận phiếu QT5 (qulythuchi, kênh Play RP) - để cho B2.
- 20/11/2026 tsudev-6f: frontend #341 + #342 ĐÃ DEPLOY (Worker fd8f44c5): /pro 200 "1 năm…không tự gia hạn", POST /api/rp/entitlements/status không token ⇒ 401, chunk settings/badge có băng nhắc. Thư nhắc 2.4 = PR #343 (4 mốc, mỗi mốc 1 thư, huỷ nhận HMAC + One-Click RFC 8058, cron 01:23 UTC, không bí mật mới). CHỜ 👤 migration `20261120170000_thu_nhac_gia_han_pro` lên Neon ⇒ merge #343 ⇒ deploy frontend + `npm run cron:deploy`. QT5/B2 chưa làm.
