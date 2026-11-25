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

| Repo                                                              | Cổng phiên bản                                   | Chứng thực / `426`-`403` | Gia cố / làm rối | PR / ghi chú |
| ----------------------------------------------------------------- | ------------------------------------------------ | ------------------------ | ---------------- | ------------ |
| tsudev-standards                                                  | ✅ APP_INTEGRITY v1.0.0 (PR #85, Release v7.0.0) | -                        | -                |              |
| tsudev                                                            | ⬜                                               | ⬜                       | ⬜               | đợt 1        |
| tsudev-ui-flutter                                                 | ⬜                                               | ⬜                       | -                | đợt 1        |
| qulythuchi / tsuscan / sound-db / lotus-share / app-la-ban        | ⬜                                               | ⬜                       | ⬜               | đợt 2        |
| tsufiles / tsuswico / tsudisk / tsutramon / tsucwico / tsucontact | ⬜                                               | ⬜ (máy chủ quyết)       | ⬜               | đợt 2        |
| TsuGameLabs (game-kit + 6 game)                                   | ⬜                                               | ⬜                       | ⬜ làm rối mạnh  | đợt 2        |

## 4. Điều kiện đóng

Mọi hàng mục 3 đạt DoD `APP_INTEGRITY.md` mục 8; thử thật: (1) nâng `latest` một app ⇒ bản cũ hiện modal khoá; (2) APK
ký lại bằng khoá khác ⇒ `403 untrusted_client` + modal không chính thức; (3) bản PRIVATE đã làm rối qua cổng 5.4.

## 5. Kết quả xử lý

- 25/11/2026 - projects-05: mở phiếu; tsudev-standards v7.0.0 PR #85. Chủ dự án gộp #85; bản sao phát vào `logs/handover/` của các repo (chưa commit - phiên repo tự commit).
