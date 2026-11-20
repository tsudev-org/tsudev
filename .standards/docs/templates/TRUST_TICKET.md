# PHIẾU TIN CẬY PHÁT HÀNH - <Tên sản phẩm> (TSU-<slug>)

> Mẫu từ tsudev-standards `docs/templates/TRUST_TICKET.md` (v4.1.0). Đặt tại `logs/trust/TRUST.md` của repo. Chuẩn:
> `docs/DISTRIBUTION_TRUST.md` (kênh, ký, báo nhầm, pháp lý), `docs/STORE_SUBMISSION.md` (điền biểu mẫu),
> `docs/PACKAGING.md` (cài bằng lệnh). Mỗi ô trạng thái: `chưa` / `đang` / `xong (ngày, bằng chứng)` / `không áp dụng (lý do)`.
> Giá trị điền biểu mẫu KHÔNG ghi ở đây - ghi ở `docs/store/IDENTITY.md` + `docs/store/<kenh>.md`.

## A. Thông tin chung

| Mục | Giá trị |
| --- | --- |
| Tên hiển thị (vi / en) | |
| Loại | Website / Desktop / CLI / Mobile / Thư viện / Trò chơi |
| Repo | `tsudev-org/<repo>` |
| Tên miền | `<x>.tsudev.com` |
| Giấy phép | AGPL-3.0 (hoặc giấy phép gốc nếu là fork: ghi nguồn + giấy phép gốc) |
| Nền tảng | Windows / macOS / Linux / Android / iOS / Web |
| Đóng gói | MSIX / MSI / NSIS / AAB / APK / DEB / RPM / Homebrew / Scoop / winget / web |
| Hạng sản phẩm (AUTH_AND_ACCOUNT mục 1) | A / B / C |
| Dữ liệu người dùng | Lưu cục bộ (mặc định) / đồng bộ Pro qua TsuDEV Sync / máy chủ riêng |

## B. Chuẩn hoá repo (DISTRIBUTION_TRUST mục 2, 4)

| Việc | Trạng thái |
| --- | --- |
| LICENSE, README (huy hiệu OpenSSF + cách kiểm chữ ký/SHA-256), SECURITY.md, CONTRIBUTING, CODE_OF_CONDUCT (kế thừa `tsudev-org/.github`), CHANGELOG | |
| Chính sách quyền riêng tư công khai (URL tsudev.com) khớp hành vi app | |
| CODEOWNERS, Dependabot, CodeQL, secret scanning + push protection, báo lỗ hổng riêng, ruleset `main` | |
| Action ghim SHA, quyền `GITHUB_TOKEN` tối thiểu, gitleaks binary ghim sha256 | |
| Scorecard workflow (mục tiêu ≥ 7) | |
| `docs/threat-model.md` (STRIDE), `docs/incident-response.md` | |

## C. Ký và phát hành (DISTRIBUTION_TRUST mục 1-3, 7)

| Việc | Trạng thái |
| --- | --- |
| `SHA256SUMS.txt` + `.sigstore.json`, attestation (`gh attestation verify`), SBOM trên Release | |
| VirusTotal trong CI (`tsudev-org/.github` `virustotal.yml`), 0 engine gắn cờ | |
| Windows: Authenticode (SignPath Foundation / Certum OSS khi 👤 duyệt) hoặc chỉ phát qua Microsoft Store (MSIX do Store ký) | |
| macOS: Developer ID + notarize + staple (đầu 2027) | |
| Android: Play App Signing + đăng ký package name/chứng chỉ cho APK ngoài Play | |
| Updater trong app kiểm chữ ký/SHA-256 trước khi chạy, không hạ cấp | |
| Không packer/obfuscator/PyInstaller `--onefile`; bộ cài không tải thêm mã không ký | |
| Kênh: GitHub Releases · winget · Scoop · Homebrew · APT/RPM `pkg.tsudev.com` · Microsoft Store · Google Play · Flathub | |

## D. Hồ sơ nền tảng (STORE_SUBMISSION - agent điền, 👤 đăng nhập + bấm gửi)

| Nền tảng | Tệp hồ sơ | Ngày nộp | Mã hồ sơ / link | Trạng thái | Lý do từ chối (nguyên văn) |
| --- | --- | --- | --- | --- | --- |
| OpenSSF Best Practices (bestpractices.dev) | `docs/store/openssf.md` | | | | |
| Google Search Console (thuộc tính Domain tsudev.com - một lần cho cả hệ) | điều phối | | | | |
| Bing Webmaster Tools | điều phối | | | | |
| Microsoft Security Intelligence (WDSI) - Software developer | `docs/store/antivirus.md` | | | | |
| Microsoft Partner Center (Store) | `docs/store/microsoft-store.md` | | | | |
| Google Play Console | `docs/store/google-play.md` | | | | |
| winget-pkgs / Scoop / Homebrew (CI) | `PACKAGING.md` | | | | |
| SignPath Foundation | `docs/store/signpath.md` | | | | |
| Hãng antivirus đang gắn cờ: ____ | `docs/store/antivirus.md` | | | | |

## E. Bảo mật ứng dụng (DISTRIBUTION_TRUST mục 4)

| Việc | Trạng thái |
| --- | --- |
| Quyền tối thiểu (MSIX capability, quyền Android, entitlements macOS) | |
| Bí mật trên máy trong DPAPI/Keychain/Keystore | |
| Web: HSTS, CSP, header bảo mật; Electron/Tauri hardening | |
| Không telemetry khi chưa đồng ý; tờ khai dữ liệu cửa hàng khớp mã | |

## F. Pháp lý (DISTRIBUTION_TRUST mục 8) - 👤 xác nhận

| Văn bản (số hiệu + ngày tra trên vbpl.vn) | Kết luận áp dụng | Người xác nhận / ngày |
| --- | --- | --- |
| | | |

## G. Nghiệm thu

| Kiểm thử | Kết quả | Ngày |
| --- | --- | --- |
| Windows 11: tải bằng Edge + Chrome, cài, chạy (Defender + SmartScreen) | | |
| ≥ 3 antivirus phổ biến (qua VirusTotal + cài thật nếu có) | | |
| macOS Gatekeeper (khi có) / Android Play Protect | | |
| `gh attestation verify`, `cosign verify-blob`, `signtool verify /pa` | | |
