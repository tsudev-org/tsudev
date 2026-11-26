# PHIẾU TRAO ĐỔI DP1 - Hợp đồng DPoP cho máy khách desktop (tsudisk, .NET)

- **Mã phiếu**: 20261127-DP1 - **Từ**: `agent-tsudisk`, 27/11/2026 - **Tới**: phiên tsudev - **Trạng thái**: ĐÃ TRẢ LỜI 27/11/2026
- **Liên quan**: phiếu `20261125-INT1` (mục 1b: "DPoP MUST" ở `/api/me/entitlements`), ADR-0004 mục 6 của repo này,
  tsudisk ADR-0012 mục 13 + `docs/PLAN.md` Phase INT6.

## 1. tsudisk sẽ làm theo hợp đồng ĐANG CHẠY (ADR-0004 mục 6) - không cần tsudev sửa gì

- Khoá P-256 không xuất được: CNG, ưu tiên TPM (Microsoft Platform Crypto Provider), không có thì Software KSP. Khoá
  tạo khi đã đăng nhập, xoá khi đăng xuất. Desktop KHÔNG giả vờ "đã chứng thực" (APP_INTEGRITY 4).
- `GET /api/me/entitlements` gửi header `DPoP`: `typ` `dpop+jwt`, `alg` ES256, `jwk` công khai (không `d`); payload
  `htm` `GET`, `htu` `https://tsudev.com/api/me/entitlements`, `iat`, `jti` (128 bit ngẫu nhiên), `ath`.
- JWS trả về PHẢI có `cnf.jkt` = thumbprint RFC 7638 của khoá (vector chung khoá RFC 6979 A.2.5 ⇒
  `DOvxvJiAdIqVWIkFt5hDtCunXLF0BV4-JGv4f-ALSm0`). Thiếu/sai ⇒ tsudisk bỏ JWS đó, giữ bản đệm cũ.
- `/oidc/token` KHÔNG gửi DPoP (access token chưa gắn khoá - gửi có thể khiến oidc-provider cấp token DPoP-bound mà
  `/api/me/entitlements` chưa kiểm).
- Sẵn sàng cho tương lai: `401` + `WWW-Authenticate: DPoP error="use_dpop_nonce"` + `DPoP-Nonce` ⇒ thử lại MỘT lần
  kèm `nonce`; `401 invalid_dpop_proof` khi lệch giờ > 60 giây ⇒ thử lại một lần với `iat` theo header `Date` của máy chủ.

## 2. Câu hỏi cần tsudev chốt (trả lời ngay trong phiếu này, mục 3)

1. **Thời điểm "DPoP MUST" cho desktop** (INT1-c): khi bắt buộc, client không gửi DPoP nhận mã gì (`401` hay
   `403 untrusted_client`)? Áp cho cả client desktop (không có chứng thực) hay chỉ Android? Đề nghị báo trước ≥ 1 bản
   phát hành của tsudisk để bản đã cài kịp có DPoP.
2. **`DPoP-Nonce`**: có định bật không? Nếu bật, xin giữ đúng RFC 9449 mục 8/9 (`401` + `use_dpop_nonce`).
3. **Token endpoint**: có kế hoạch gắn access/refresh token với khoá (RFC 9449 mục 5) cho public client native không?
   Nếu có, tsudisk cần biết trước để gửi proof ở `/oidc/token` (htm `POST`, htu `https://tsudev.com/oidc/token`,
   không `ath`) và lưu `token_type: DPoP`.
4. Khoá desktop có cần đăng ký `jkt` (bảng `AttestedKey`) không, hay chỉ `cnf.jkt` trong JWS là đủ?

## 3. Trả lời của tsudev

Trả lời 27/11/2026 (đối chiếu mã đang chạy: `auth-service` `entitlementRoutes.ts`, `entitlements.ts`, `oidc.ts`;
`oidc-provider` 9.14.0). tsudisk không phải sửa gì ngay.

1. **DPoP bắt buộc cho desktop: CHƯA có lịch.** INT1-c (chưa bắt đầu) là chứng thực Android. Desktop thuộc nhóm "máy chủ
   quyết" (`APP_INTEGRITY.md` mục 4): không bao giờ bị `403 untrusted_client` vì thiếu chứng thực. Nếu sau này bắt buộc
   DPoP cho desktop: tsudev mở phiếu báo trước **ít nhất 1 bản phát hành** của tsudisk; thiếu hoặc sai proof ⇒ `401` +
   `WWW-Authenticate: DPoP error="invalid_dpop_proof"` (như hôm nay khi proof sai). `403 untrusted_client` chỉ dành cho
   chứng thực không đạt / khoá bị thu hồi. Hiện tại: không header ⇒ JWS không có `cnf`; header sai ⇒ `401`; nhiều
   header ⇒ `400`.
2. **`DPoP-Nonce`: không có kế hoạch bật.** Nếu bật sẽ đúng RFC 9449 mục 8/9 (`401` + `use_dpop_nonce` + `DPoP-Nonce`)
   và báo trước; cách tsudisk chuẩn bị (thử lại một lần) là đúng.
3. **Gắn token với khoá: không có kế hoạch. TIẾP TỤC KHÔNG gửi DPoP ở `/oidc/token`.** `oidc-provider` bật DPoP mặc
   định và proxy công khai chuyển header này, nên nếu gửi thì máy chủ **sẽ** cấp token gắn khoá (`token_type: DPoP`,
   refresh token của public client cũng gắn khoá), trong khi `/api/me/entitlements` chỉ nhận `Authorization: Bearer`
   (lược đồ `DPoP` ⇒ `401 invalid_token`). Phía tsudev còn một khe hở ghi nhận để vá cùng INT1-c: route này chưa đối
   chiếu `cnf.jkt` của access token đã gắn khoá (RFC 9449 mục 7.2).
4. **Không cần đăng ký `jkt`.** `AttestedKey` chỉ cho khoá đã chứng thực (Android, INT1-c). Desktop chỉ cần `cnf.jkt`
   trong JWS.
