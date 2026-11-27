# PHIẾU ĐIỀU PHỐI INT1 - Toàn vẹn ứng dụng: bắt buộc cập nhật, chứng thực app, làm rối mã PRIVATE

- **Mã phiếu**: 20261125-INT1 - **Từ**: điều phối `projects-05`, 25/11/2026 - **Trạng thái**: MỞ
- **Quyết định chủ dự án (25/11/2026)**: có bản mới ⇒ bản cũ bị **khoá ngay** bằng modal toàn màn (chỉ **Cập nhật** +
  **Xuất dữ liệu**); app/thiết bị bị can thiệp không cập nhật được qua app, không kết nối tài nguyên/dữ liệu của hệ thống;
  dự án **PRIVATE** làm rối mã mạnh, không hỏng tính năng, không bị antivirus báo nhầm; không gửi dữ liệu người dùng ra ngoài.
- **Chuẩn**: tsudev-standards **v7.0.0** `docs/APP_INTEGRITY.md` (đọc HẾT; phiếu này chỉ chia việc), `PRODUCT_POLICY` 7.4/7.7.
- **Liên quan**: `20261125-SYN1` (đồng bộ cục bộ), `20261125-AP3` (iOS PWA), `20261125-PRO3`.

## 0. Mọi agent MUST đọc

1. Bảo vệ thật ở **máy chủ** (I1): không tin giá trị app gửi lên; app chỉ hiển thị.
2. Cổng phiên bản: bản kê `https://tsudev.com/.well-known/tsudev/versions.json` + `.sig` (Ed25519); `latest` của kênh
   chỉ nâng SAU KHI bản đó tải được trên kênh đó; app có bản mới hơn ⇒ modal khoá nguyên văn mục 2.2; API trả `426`.
3. Android: Key Attestation cho mọi kênh, Play Integrity thêm cho bản Play; iOS App Attest sau H1; desktop/web không
   giả vờ đã chứng thực.
4. OPEN: không làm rối, chỉ gia cố. PRIVATE: làm rối theo bảng 5.2 + cổng 5.4. Cấm packer/protector ở mọi dự án.
5. Không SDK bên thứ ba gửi dữ liệu (freeRASP, Firebase, Sentry cloud...). Chỉ sửa repo mình; repo có phiên khác ⇒
   phiếu + SendMessage; commit/PR KHÔNG ghi đồng tác giả AI; AKB bắt buộc.

## 1. Việc theo repo (thứ tự phụ thuộc)

| Đợt | Repo                                                                                             | Việc INT1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :-: | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1  | **tsudev** (tsudev.com)                                                                          | (a) Phát hành bản kê `versions.json` + chữ ký (khoá `tsu-versions-2026` mới, lưu như `RELEASE_SIGNING_KEY`), API nội bộ để pipeline các repo nâng `latest` sau khi đo URL tải; (b) mô-đun chứng thực (Android Key Attestation, Play Integrity) + đăng ký `jkt`; `/api/me/entitlements` chỉ cấp cho `jkt` hợp lệ (DPoP MUST); (c) header `X-Tsu-App` + `426`/`403 untrusted_client` cho mọi API mà app gọi; (d) nhật ký kiểm toán + hạn lưu `PRODUCT_POLICY` 7.7; (e) `@tsudev/ui`: modal khoá/không chính thức cho web/PWA |
|  1  | **tsudev-ui-flutter**                                                                            | `TsuVersionGate` (kiểm bản kê có chữ ký, đệm, lịch kiểm, modal khoá nguyên văn vi/en, nút Xuất dữ liệu gọi callback của app), `TsuUnofficialNotice`, Key Attestation + DPoP trên Android (khoá AndroidKeyStore có challenge), Play Integrity tuỳ kênh; bỏ `ProNotice*` (7.3) và `ProBenefit.cloudSync`; đổi nguyên văn 7.5/7.6; bản MINOR, báo repo Flutter                                                                                                                                                                |
|  2  | **qulythuchi, tsuscan, sound-db, lotus-share, app-la-ban** (Flutter)                             | Dùng `TsuVersionGate` + chứng thực của `tsudev_ui`; R8 + gia cố (OPEN); API riêng (nếu có) trả `426`/`403`                                                                                                                                                                                                                                                                                                                                                                                                                 |
|  2  | **tsufiles, tsuswico, tsudisk** (.NET), **tsutramon** (C++), **tsucwico** (Rust), **tsucontact** | Cổng phiên bản trong updater đã ký sẵn có (đọc bản kê chung thay/cạnh manifest riêng, giữ đường cũ cho bản đã cài - không phá chuyển hướng tên repo cũ); modal khoá native vi/en; gia cố bản phát hành (OPEN)                                                                                                                                                                                                                                                                                                              |
|  2  | **TsuGameLabs** (`tsugamelabs/tsudev-*`, PRIVATE, JS/TS + Tauri)                                 | game-kit làm phần chung trước: cổng phiên bản (web: service worker + modal), **làm rối mạnh** `javascript-obfuscator` cấu hình 5.2 + Rust release strip/`obfstr` cho Tauri; cổng 5.4 (test/E2E trên bản đã làm rối, Defender `MpCmdRun` + ClamAV cục bộ, VirusTotal chỉ hash); tệp ký hiệu/source map ở `~/.config/tsudev/keys/<repo>/symbols/`                                                                                                                                                                            |
|  -  | Không áp dụng                                                                                    | Repo UBND/xanuicam, b4djl1h-cmdb, mieubathuong, homebrew-tap, scoop-bucket, linux-packages (kênh phát hành - chỉ đọc bản kê)                                                                                                                                                                                                                                                                                                                                                                                               |

## 2. Việc 👤 chủ dự án

1. ~~Duyệt + gộp PR tsudev-standards #85 (v7.0.0)~~ ✅ 25/11/2026 - gồm **câu chữ mới** của điều khoản 7.5, nhắc gia hạn 7.6, modal khoá
   và modal "không chính thức" (APP_INTEGRITY 2.2/2.3).
2. Khi tsudev.com đã có bản kê: chọn ngày bật "khoá ngay" toàn hệ (bật trước khi mọi app có cổng phiên bản thì không có
   tác dụng; bật sau khi đủ thì bản cũ chưa có cổng vẫn không bị khoá - chỉ bị máy chủ trả `426`).

## 3. Bảng theo dõi

| Repo                                                       | Cổng phiên bản                                       | Chứng thực / `426`-`403`                     | Gia cố / làm rối                                                          | PR / ghi chú            |
| ---------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------- | ----------------------- |
| tsudev-standards                                           | ✅ APP_INTEGRITY v1.0.0 (PR #85, Release v7.0.0)     | -                                            | -                                                                         |                         |
| tsudev                                                     | ✅ bản kê (INT1-a)                                   | 🟡 426/400 (INT1-b); 403 chờ INT1-c          | ⬜                                                                        | đợt 1                   |
| tsudev-ui-flutter                                          | ⬜                                                   | ⬜                                           | -                                                                         | đợt 1                   |
| qulythuchi / tsuscan / sound-db / lotus-share / app-la-ban | ⬜                                                   | ⬜                                           | ⬜                                                                        | đợt 2                   |
| tsufiles / tsuswico / tsutramon / tsucwico / tsucontact    | ⬜                                                   | ⬜ (máy chủ quyết)                           | ⬜                                                                        | đợt 2                   |
| tsudisk                                                    | ✅ CLI + GUI (ADR-0012, #86-#88); thử thật 27/11 ĐẠT | ✅ nhận 426 ⇒ khoá (#88); DPoP cnf.jkt (#93) | ✅ OPEN 5.2: DebugType=none (#95); không trim/AOT (lệch chuẩn AGENTS B.4) | 26.11.2701 / 26.11.2702 |
| TsuGameLabs (game-kit + 6 game)                            | ⬜                                                   | ⬜                                           | ⬜ làm rối mạnh                                                           | đợt 2                   |

## 4. Điều kiện đóng

Mọi hàng mục 3 đạt DoD `APP_INTEGRITY.md` mục 8; thử thật: (1) nâng `latest` một app ⇒ bản cũ hiện modal khoá; (2) APK
ký lại bằng khoá khác ⇒ `403 untrusted_client` + modal không chính thức; (3) bản PRIVATE đã làm rối qua cổng 5.4.

## 6. Kế hoạch phase phần tsudev.com (phiên tsudev lập 26/11/2026 - MỖI PHIÊN MỘT PHASE, PR riêng)

Lựa chọn kỹ thuật (đã quyết, ghi để phiên sau khỏi cân lại): mô-đun đặt ở **auth-service** (Node, trong backend-bundle)
chứ không ở Worker - cần Postgres cho `jkt`/nonce/nhật ký và `node:crypto` `X509Certificate` cho chuỗi chứng thư; Worker
chỉ proxy (thêm tiền tố vào bảng `services/backend-bundle/src/index.ts` + rewrite/proxy ở `frontend-main`). Ký bản kê
bằng Ed25519 của `@tsudev/trust-crypto` (đã dùng ký bản phát hành) với khoá RIÊNG `kid` `tsu-versions-2026` (không dùng
chung `RELEASE_SIGNING_KEY`: lộ một khoá không được cho phép giả cả bản cài lẫn lệnh khoá app). Đã bác: lưu bản kê là
tệp tĩnh trong repo (nâng `latest` phải qua PR + deploy ⇒ chốt chặn theo kênh không tự động được); lưu ở R2 (mất nhật
ký ai nâng lúc nào).

| Phase               | Việc                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Phụ thuộc 👤                                                                                                                                           | Kiểm chứng                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **INT1-e** ✅ 26/11 | `@tsudev/ui` `AppGateModal` (khoá/không chính thức, nguyên văn vi/en, 2 nút, không đóng được, bẫy focus) + `appGate.ts` (`compareVersions`, `xTsuApp`, `gateFromResponse`)                                                                                                                                                                                                                                                                                                      | -                                                                                                                                                      | `packages/ui/test/appGate.test.ts` đối chiếu `APP_INTEGRITY.md`                |
| **INT1-a** ✅ 26/11 | Bảng `AppVersionChannel` (sản phẩm, kênh, `latest`, `url`, `verifiedAt`, `raisedBy`) + migration; `GET /.well-known/tsudev/versions.json` + `.sig` (content-service, `expires_at` = +7 ngày, ký lại theo yêu cầu, cache 300 s); `POST /api/admin/versions/:product/:channel` (ADMIN hoặc `INTERNAL_API_TOKEN` cho pipeline) - GET thật `url` tải được (200, đúng phiên bản trong tên tệp/thẻ) rồi mới nâng; JWKS công khai khoá bản kê; tài liệu `docs/release-signing.md`      | 👤 chạy `db:migrate` lên Neon TRƯỚC khi gộp; 👤 đặt `VERSIONS_SIGNING_KEY` trên Render (agent sinh khoá vào `~/.config/tsudev/keys/`, không in ra log) | test chữ ký, hết hạn, chốt chặn (URL 404 ⇒ 409 không nâng), phát lại bản kê cũ |
| **INT1-b** ✅ 26/11 | Cổng `X-Tsu-App` cho API app gọi (`/api/me/entitlements`, `/api/rp/*`, OIDC `userinfo`): thiếu/sai ⇒ 400, cũ hơn `latest` của kênh ⇒ 426 `update_required`; bảng `SecurityAuditLog` (loại, `client_id`, `jkt` băm, IP rút gọn /24 hoặc /48) + dọn > 12 tháng; trình duyệt (BFF) không bị cổng này chặn                                                                                                                                                                          | 👤 migrate Neon                                                                                                                                        | test 400/426/kênh khác không ảnh hưởng; quét nguồn: mọi route app nằm sau cổng |
| **INT1-c**          | Chứng thực Android Key Attestation: `POST /api/attest/nonce` (một lần, 60 s), `POST /api/attest/android` (chuỗi về gốc Google ghim, danh sách thu hồi `android.googleapis.com/attestation/status` đệm 24 giờ, `attestationApplicationId` = package + SHA-256 chứng thư ký của KÊNH, TEE trở lên, Verified boot) ⇒ bảng `AttestedKey` (`jkt`, hạn 30 ngày); DPoP bắt buộc ở `/api/me/entitlements` + `cnf.jkt` trong JWS; không đạt ⇒ 403 `untrusted_client` + thu hồi + nhật ký | 👤 migrate Neon; cần SHA-256 chứng thư ký từng app (đọc từ repo app/Play Console)                                                                      | vector chứng thư thật (APK debug + giả lập) + chuỗi giả ⇒ 403                  |
| **INT1-d**          | Play Integrity (kênh Play): giải mã token bằng API chuẩn, `PLAY_RECOGNIZED` + `MEETS_DEVICE_INTEGRITY` + `requestHash`                                                                                                                                                                                                                                                                                                                                                          | 👤 dự án Google Cloud + tài khoản dịch vụ (JSON vào Render env)                                                                                        | test với token mẫu                                                             |
| **INT1-f**          | Bật toàn hệ: 👤 chọn ngày "khoá ngay" (mục 2.2 của phiếu) sau khi các app đợt 2 có cổng                                                                                                                                                                                                                                                                                                                                                                                         | 👤                                                                                                                                                     | nâng `latest` một app ⇒ bản cũ hiện modal                                      |

## 5. Kết quả xử lý

- 25/11/2026 - projects-05: mở phiếu; tsudev-standards v7.0.0 PR #85. Chủ dự án gộp #85; bản sao phát vào `logs/handover/` của các repo (chưa commit - phiên repo tự commit).
- 26/11/2026 - tsudev: **INT1-e** xong (PR kèm phiếu này): `AppGateModal` + `appGate.ts` trong `@tsudev/ui`. Lập kế hoạch
  phase mục 6. Kế tiếp: INT1-a (cần 👤 migrate Neon + đặt `VERSIONS_SIGNING_KEY`).
- 26/11/2026 - tsudev: **INT1-a** xong (PR `feat/int1-a-versions-suspended`, gộp cùng `suspended` của LG3 để migrate
  Neon MỘT lần - migration `20261126120000_ban_ke_phien_ban_tam_khoa`).
  - Bảng `AppVersionChannel` (khoá chính `product`+`channel`). `versionsManifest.ts` (content-service): bản kê tất định,
    `expires_at` = +7 ngày, dựng lại khi nâng hoặc sau 1 ngày; chữ ký TÁCH dạng JWS detached
    `<b64url(header)>..<b64url(sig)>`, kid `tsu-versions-2026`; JWKS `/.well-known/tsudev/versions-jwks.json`.
  - `POST /api/admin/versions/:product/:channel` (ADMIN, DB + 2FA) và `POST /api/internal/versions/...` (pipeline, token RIÊNG
    `VERSIONS_RAISE_TOKEN` (header `x-versions-token`) thay vì `INTERNAL_API_TOKEN` (lộ secret của một repo không được
    mở cả `/api`)). Chốt chặn: GET thật `url` (https, host phát hành, chuyển hướng theo tay) - 404/thiếu phiên bản ⇒ 409
    không nâng; không hạ phiên bản; nhật ký TrustAuditLog `versions.raise`. Pipeline gọi qua
    `https://tsudev.com/api/versions/raise/<sp>/<kênh>`.
  - Thiếu `VERSIONS_SIGNING_KEY` ở production ⇒ bản kê 503, backend VẪN khởi động (quyết định: thiếu bản kê thì app giữ
    bản đệm; còn chặn khởi động là cả site trống).
  - Tài liệu: `docs/release-signing.md` §Bản kê phiên bản (có lệnh curl mẫu cho workflow các repo).
  - Kế tiếp: **INT1-b** (cổng `X-Tsu-App` + `426` + `SecurityAuditLog`, cần 👤 migrate Neon). Các repo đợt 2 thêm bước
    nâng `latest` vào workflow phát hành khi có cổng phiên bản (secret `TSU_VERSIONS_TOKEN`).
- 26/11/2026 - tsudev: #409 (INT1-a) gộp + deploy; đo production: `versions.json` 200 `products: {}`, `.sig` kiểm Ed25519
  bằng `versions-jwks.json` ĐÚNG, kid `tsu-versions-2026`. **INT1-b** xong (PR `feat/int1-b-x-tsu-app`, migration
  `20261126150000_nhat_ky_an_ninh_app` đã áp Neon TRƯỚC gộp, dump `~/tsudev-backups/truoc-int1b-20261126-0949.dump`).
  - Cổng `services/auth-service/src/appVersionGate.ts` gắn ở `/ent` (sau `/ent/reminders`, trước mọi router app) và
    `/oidc/me`: sai định dạng ⇒ 400 `app_header_invalid`; cũ hơn `latest` của đúng kênh ⇒ 426 `update_required`
    (`latest`, `url`); kênh khác/sản phẩm chưa có dòng ⇒ cho qua; `/api/identity/*` (BFF) không qua cổng. Proxy Next
    chuyển `x-tsu-app`. Quét nguồn canh thứ tự mount + proxy.
  - **Quyết định**: thiếu header ⇒ 400 CHỈ khi `X_TSU_APP_REQUIRED=1` (Render, chưa đặt). Lý do: tsudisk/tsuswico đã
    cài và máy chủ RP của qulythuchi chưa gửi header - 400 ngay là khoá người dùng không có bản để cập nhật. Chưa bật
    thì ghi `app_header_missing` vào nhật ký để 👤 thấy app nào còn thiếu; bật ở INT1-f (truy vấn ở
    `docs/release-signing.md` §Cổng X-Tsu-App).
  - Bảng `SecurityAuditLog` (`securityAudit.ts`): IP /24 hoặc /48, `jktHash` SHA-256, `clientId` từ access token; chống
    trùng 60 s; dọn > 12 tháng mỗi giờ. Test `test/appVersionGate.test.ts` (14).
  - Kế tiếp: **INT1-c** (Key Attestation + `403 untrusted_client`, cần SHA-256 chứng thư ký từng app). Repo app đợt 2
    gửi `X-Tsu-App` ở mọi lượt gọi `/api/me/entitlements`, `/api/rp/*`, `/api/xd/*`, userinfo.
- 27/11/2026 - agent-tsudisk (Phase INT7, chép vào đây bởi phiên tsudev CP3): phát hành 26.11.2701 (bản đầu có cổng;
  VT 0/74, SHA256SUMS + attestation đã kiểm) rồi 26.11.2702 (N+1, `nang-latest` nâng kênh github). Thử thật trên
  Windows, 26.11.2701 đã đăng nhập: lệnh bị chặn thoát mã 6 (cả `--json`), `phien-ban` và `xuat-du-lieu` vẫn chạy; GUI
  hiện modal "Update required" toàn màn, đúng hai nút, WM_CLOSE không đóng. Điều kiện đóng (1) ĐẠT cho tsudisk. Lưu ý
  phía máy chủ (phiếu DP1): `/api/me/entitlements` chưa kiểm `cnf.jkt` của access token gắn DPoP - làm cùng INT1-c.
