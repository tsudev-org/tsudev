# PHÂN PHỐI TIN CẬY - CÀI ĐẶT KHÔNG BỊ CHẶN (v1.4.0)

> Mọi sản phẩm tsudev phát hành thành tệp cài `MUST` đến tay người dùng qua kênh mà hệ điều hành, trình duyệt và
> phần mềm diệt virus đã tin, với chữ ký và nguồn gốc kiểm chứng được. Tài liệu này quy định kênh theo từng nền tảng
> (Windows, macOS, Linux, Android, iOS), cách chống báo nhầm, hồ sơ phải đăng ký và thứ tự làm. Kênh cài bằng lệnh
> (winget, Scoop, APT/RPM, Homebrew) chi tiết ở [`PACKAGING.md`](PACKAGING.md); bảo mật mã ở
> [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md); phiên bản và tên tệp ở [`VERSIONING.md`](VERSIONING.md) mục 2.

## 0. Nói thật về giới hạn

- **Không ai bảo đảm được 0% báo nhầm.** Antivirus dùng heuristic và uy tín; một tệp mới, chưa ai tải, vẫn có thể bị
  một engine nào đó gắn cờ. Mục tiêu đo được của tài liệu này: (1) mọi tệp đi qua kênh nền tảng tin, (2) mọi tệp có
  chữ ký + nguồn gốc kiểm chứng, (3) báo nhầm được phát hiện TRƯỚC khi công bố và gỡ theo quy trình mục 3.
- **Chữ ký không mua được uy tín ngay.** Chứng chỉ OV (kể cả Certum, SignPath) vẫn có thể bị SmartScreen cảnh báo cho
  tới khi tệp có đủ lượt tải. Chỉ kênh **cửa hàng** (Microsoft Store, Google Play, App Store, Mac App Store) và kênh
  **trình quản lý gói** cho trải nghiệm "không cảnh báo" ngay từ bản đầu.
- **Huy hiệu OpenSSF Best Practices (bestpractices.dev) là tự đánh giá quy trình**: không ký tệp, không tạo uy tín với
  SmartScreen/Safe Browsing/antivirus. Vẫn `MUST` làm (uy tín + bằng chứng khi nộp hồ sơ báo nhầm), nhưng KHÔNG thay
  thế ký mã và kênh cửa hàng.
- **Không né antivirus**: cấm obfuscation/packer/đổi chữ ký để qua mặt. Tệp bị gắn cờ ⇒ báo nhầm kèm bằng chứng minh
  bạch (mục 3.1); nếu thật sự có hành vi đáng ngờ ⇒ sửa mã, không "xin bỏ cờ".
- Trạng thái chính sách nền tảng dưới đây đo ngày **17/11/2026**. Chính sách nền tảng đổi nhanh: phiên nộp hồ sơ
  `MUST` đọc lại trang chính thức của nền tảng trước khi làm và cập nhật ngày đo ở đây nếu khác.

## 1. Ma trận kênh theo nền tảng

| Nền tảng | Kênh chính (ưu tiên 1) | Kênh phụ | Điều kiện "không cảnh báo" | Chi phí | Trạng thái 17/11/2026 |
| --- | --- | --- | --- | --- | --- |
| Windows | **Microsoft Store - gói MSIX** | winget, Scoop, tệp tải trực tiếp | Store ký lại MSIX bằng chứng chỉ Microsoft. Tệp tải trực tiếp cần Authenticode (mục 1.1) | Tài khoản cá nhân **0 đồng** (từ 09/2025) | Chưa có tài khoản Store (👤) |
| macOS | **Developer ID + notarization** (tệp `.dmg`/`.pkg`), Mac App Store | Homebrew | Gatekeeper chỉ mở không hỏi khi tệp được ký Developer ID, notarize và staple | Apple Developer Program 99 USD/năm (một tài khoản dùng chung cho iOS) | Hoãn tới **đầu 2027** - xem mục 1.2 |
| Linux | **APT/RPM ký GPG** tại `pkg.tsudev.com` | Flathub (app có giao diện), Homebrew, AppImage | Kho ký GPG, gói cài qua trình quản lý gói | 0 đồng | Có (PACKAGING.md mục 5) |
| Android | **Google Play** (AAB) | APK trên GitHub Release, F-Droid | Play Protect + xác minh nhà phát triển (mục 1.3) | Đã có tài khoản Play | Có tài khoản (👤 đã đăng ký) |
| iOS/iPadOS | **App Store** | TestFlight (cùng tài khoản) | Chỉ App Store / TestFlight; KHÔNG phân phối IPA ngoài | Chung tài khoản Apple Developer với macOS | Hoãn tới **đầu 2027** - xem mục 1.4 |

### 1.1. Windows

1. App có giao diện `SHOULD` có gói **MSIX** nộp lên Microsoft Store: Store ký lại gói, người dùng không thấy
   SmartScreen. Nộp bộ cài EXE/MSI lên Store thì Microsoft **không** ký lại - bộ cài đó vẫn cần chữ ký của tsudev.
2. Tệp tải trực tiếp (bộ cài, bản portable, tệp cho winget/Scoop) `MUST` ký **Authenticode** khi đã có chứng chỉ, ký
   TRƯỚC khi tính `SHA256SUMS.txt`, có dấu thời gian (RFC 3161). Phương án theo thứ tự:
   - **SignPath Foundation** (0 đồng, chỉ mã nguồn mở thuần, không thành phần đóng; người phát hành hiển thị là
     "SignPath Foundation"; mọi thành viên bật MFA; trang chính sách ký mã công khai). Cần uy tín dự án - ngưỡng tự đặt
     ở `~/projects/logs/handover/20261113-02_ke-hoach-uy-tin-he-sinh-thai.md` mục 5.
   - **Certum Open Source Code Signing** (cá nhân, khoảng 49-69 EUR/năm, khoá trên thẻ hoặc đám mây SimplySign) - khi
     chủ dự án duyệt chi (P3.1 của kế hoạch uy tín).
   - Azure Artifact Signing: KHÔNG dùng được - cá nhân chỉ ở Mỹ/Canada.
3. Chưa có chứng chỉ: phát hành qua Store (MSIX) và winget/Scoop là chính; trang tải về ghi trung thực rằng tệp tải
   trực tiếp có thể hiện SmartScreen, kèm SHA-256 và link VirusTotal (mục 3). KHÔNG hướng dẫn người dùng tắt
   SmartScreen hay Defender.
4. Thông tin phiên bản trong tệp `MUST` đủ: `CompanyName` = `TsuDEV`, `ProductName`, `FileDescription`,
   `FileVersion`/`ProductVersion` = `YY.M.DDNN.0`, `LegalCopyright`; manifest `asInvoker` trừ khi thật sự cần quyền
   quản trị (ghi lý do trong ADR).

### 1.2. macOS (trước khi có tài khoản Apple)

Từ Homebrew 5, cờ `--no-quarantine` bị bỏ và cask không ký/không notarize bị gỡ khỏi kho cask chính thức (mốc 09/2026).
Tap riêng `tsudev-org/homebrew-tap` vẫn cài được, nhưng Gatekeeper sẽ chặn app chưa notarize khi mở lần đầu. Vì vậy
cho tới khi có Apple Developer Program:

- Công cụ dòng lệnh `SHOULD` phát hành qua **Homebrew formula** (dựng từ mã nguồn hoặc bottle) thay vì cask - formula
  không bị gắn cờ quarantine.
- App có giao diện: tối thiểu ký ad-hoc (`codesign -s -`, bắt buộc để chạy trên Apple Silicon), giữ cask ở tap riêng,
  trang tải về ghi rõ "bản macOS chưa notarize - Apple sẽ hỏi khi mở lần đầu" và hướng dẫn chính thức của Apple
  (System Settings > Privacy & Security > Open Anyway). KHÔNG hướng dẫn `xattr -cr` hay tắt Gatekeeper.
- Chuẩn bị sẵn để ngày có tài khoản chỉ cần nạp bí mật: workflow có bước `codesign --options runtime --timestamp` +
  `xcrun notarytool submit --wait` + `xcrun stapler staple`, bật **Hardened Runtime**, entitlements tối thiểu; bước đó
  tự bỏ qua khi thiếu bí mật `APPLE_*`.
- Ngày có tài khoản (v1.3.0): ký Developer ID + công chứng theo [`APPLE_CICD.md`](APPLE_CICD.md) mục 8.5 (bí mật ở
  environment `apple`, chứng chỉ Developer ID tạo bằng `scripts/apple/setup_apple_signing.sh csr-devid`/`import-devid`).

### 1.3. Android

1. **Google Play là kênh chính.** Phát hành **AAB**, bật **Play App Signing**, khoá upload giữ ngoài repo (bí mật CI).
   `targetSdkVersion` theo mức Play yêu cầu tại thời điểm nộp (đo lại mỗi lần - Play nâng mức hằng năm).
2. **Xác minh nhà phát triển Android:** từ 30/09/2026 thiết bị được chứng nhận ở Brazil, Indonesia, Singapore, Thái Lan
   chỉ cài app của nhà phát triển đã đăng ký; mở rộng toàn cầu dự kiến 2027. Mọi package name của tsudev - kể cả app chỉ
   phát hành APK ngoài Play - `MUST` được đăng ký trong Play Console / Android Developer Console cùng chứng chỉ ký của
   nó, để APK trên GitHub Release không bị chặn khi chính sách tới Việt Nam.
3. APK ngoài Play: ký bằng khoá **riêng** đã đăng ký ở bước 2, `versionCode` theo `VERSIONING.md` mục 2.2. Ghi rõ
   trên trang tải về: bản Play và bản APK dùng khoá khác nhau nên KHÔNG cập nhật chéo được.
4. Hồ sơ Play `MUST` đủ: chính sách quyền riêng tư (URL `https://tsudev.com/...`), mục **An toàn dữ liệu**, xếp hạng
   nội dung (IARC), đối tượng mục tiêu, quyền truy cập app cho người duyệt, tuyên bố quyền nhạy cảm (nếu xin).
5. Tài khoản Play cá nhân mới phải qua **thử nghiệm kín** trước bản chính thức; hồ sơ điền theo
   [`STORE_SUBMISSION.md`](STORE_SUBMISSION.md) mục 4.1. Không SDK quảng cáo, không quyền `AD_ID`
   ([`PRODUCT_POLICY.md`](PRODUCT_POLICY.md) mục 3).
6. Không xin quyền thừa; quyền nhạy cảm (SMS, nhật ký cuộc gọi, vị trí nền, `REQUEST_INSTALL_PACKAGES`,
   `MANAGE_EXTERNAL_STORAGE`) chỉ khi là chức năng cốt lõi và có tờ khai.

### 1.4. iOS (trước khi có tài khoản Apple)

Từ v1.1.0: mọi app di động `MUST` (không còn là `SHOULD`) được phát triển cho iOS ngay và thử trên iPhone thật qua cáp
theo [`PRODUCT_POLICY.md`](PRODUCT_POLICY.md) mục 2.1, để đầu 2027 chỉ còn bước nộp:

- Mã đa nền tảng dựng được cho iOS trên CI macOS (không ký), `PrivacyInfo.xcprivacy` (privacy manifest) khai đủ API
  có lý do bắt buộc, bundle id `com.tsudev.<ten>` cố định, không dùng API riêng/bị cấm.
- Soạn sẵn: nhãn quyền riêng tư App Store, tuyên bố mã hoá (export compliance), xếp hạng tuổi, ảnh màn hình.
- Trong lúc chờ: chức năng nào làm được trên web `MAY` cung cấp dưới dạng PWA tại tsudev.com. KHÔNG dùng chứng chỉ
  doanh nghiệp, ad-hoc hay dịch vụ "ký IPA" bên thứ ba - vi phạm điều khoản Apple và bị thu hồi hàng loạt.
- `MUST NOT` phát `.ipa` qua GitHub Release, nguồn AltStore/SideStore hay bất kỳ kênh ngoài App Store/TestFlight
  (v1.3.0). `.ipa` không ký của CI chỉ là artifact ngắn hạn để chủ dự án tự ký cho máy của mình.
- Ngày có tài khoản: dựng, ký, tải lên TestFlight theo [`APPLE_CICD.md`](APPLE_CICD.md) (workflow dùng chung
  `tsudev-org/.github`, script `scripts/apple/setup_apple_signing.sh`, phiếu toàn hệ `20261125-AP2`).

### 1.5. Tải từ trình duyệt

- Tệp tải `MUST` đến từ HTTPS trên tên miền của hệ (GitHub Releases của `tsudev-org`, `pkg.tsudev.com`, URL presign
  của tsudev.com). Không dùng dịch vụ rút gọn link, không nén lồng có mật khẩu, không đổi đuôi tệp để lách.
- `tsudev.com` và các tên miền tải `SHOULD` có trong **Google Search Console** (theo dõi Safe Browsing) và Bing Webmaster
  Tools. Bị gắn cờ ⇒ yêu cầu xem xét ngay (mục 3).

## 2. Chuỗi cung ứng - chứng minh tệp là của tsudev (MUST)

1. `SHA256SUMS.txt` + `SHA256SUMS.txt.sigstore.json` (ký keyless Sigstore) trên mọi Release.
2. **Chứng thực nguồn gốc dựng** (GitHub artifact attestations / SLSA provenance) cho mọi tệp: người dùng kiểm bằng
   `gh attestation verify <tệp> --repo tsudev-org/<repo>`.
3. **SBOM** (CycloneDX hoặc SPDX) đính kèm Release.
4. Dựng trên runner GitHub sạch từ thẻ bất biến; action ghim SHA; khoá ký nằm ở dịch vụ ký/HSM hoặc bí mật môi trường có
   người duyệt - KHÔNG trong repo, KHÔNG trên máy dev.
5. Trình cập nhật trong app `MUST` kiểm chữ ký (hoặc SHA-256 từ nguồn đã ký) trước khi chạy tệp tải về, chỉ tải qua
   HTTPS, không hạ cấp phiên bản.
6. OpenSSF Scorecard >= 7 và OpenSSF Best Practices "passing" cho repo mã nguồn mở.

## 3. Chống và gỡ báo nhầm antivirus (MUST)

**Phòng từ khi dựng:**

- KHÔNG nén/đóng gói bảo vệ tệp thực thi (UPX, packer, protector). Làm rối mã CHỈ cho dự án PRIVATE, CHỈ bằng công
  cụ và cấu hình ở [`APP_INTEGRITY.md`](APP_INTEGRITY.md) mục 5 (đã chọn để an toàn với antivirus) và qua cổng 5.4. Python: tránh PyInstaller một tệp (`--onefile`) - giải nén
  vào thư mục tạm là mẫu hành vi của mã độc; dùng `--onedir` trong bộ cài hoặc Nuitka; nếu buộc dùng PyInstaller thì
  dựng bootloader từ nguồn.
- KHÔNG tải và chạy mã từ URL lúc chạy (ngoài updater theo mục 2.5), không tự thêm khởi động cùng Windows khi người
  dùng chưa bật, không đụng cấu hình Defender/tường lửa ngoài phạm vi chức năng đã công bố.
- Ưu tiên bộ cài chuẩn (MSIX, MSI WiX, Inno Setup có chữ ký) hơn bộ cài tự viết.

**Kiểm trước khi công bố:**

- Workflow phát hành `SHOULD` gửi mọi tệp lên **VirusTotal** (API miễn phí, bí mật `VT_API_KEY`), chờ kết quả, ghi link
  báo cáo vào Release notes. Có engine gắn cờ ⇒ Release giữ ở **nháp**, mở phiếu báo nhầm.

**Gỡ báo nhầm (người làm: agent soạn, 👤 nộp nếu cần tài khoản):**

| Bên | Nơi nộp |
| --- | --- |
| Microsoft Defender / SmartScreen | Microsoft Security Intelligence - Submit a file (chọn "Software developer") |
| Google Chrome / Safe Browsing | Safe Browsing - báo trang bị gắn cờ nhầm; Search Console > Security issues |
| Kaspersky, ESET, Bitdefender, Avast/AVG, Norton/Symantec, Trend Micro | Cổng báo nhầm (false positive) của từng hãng |
| McAfee, Sophos, Malwarebytes, Dr.Web, Emsisoft, Fortinet, Quick Heal, Microsoft (engine VT) | Cổng báo nhầm của từng hãng - chỉ nộp cho hãng ĐANG gắn cờ |
| Kết quả | Ghi vào `logs/store/antivirus.md` của repo: tệp, SHA-256, engine, ngày nộp, mã hồ sơ, ngày gỡ |

### 3.1. Gói hồ sơ báo nhầm chuẩn và hạn xử lý

- Mỗi hồ sơ gồm: tên sản phẩm + phiên bản, **SHA-256**, link GitHub Release + commit + `gh attestation verify`, link
  báo cáo VirusTotal, tên người ký trong chứng chỉ (khi có), link SBOM, mô tả mục đích + hành vi mạng thật (ví dụ
  "chạy hoàn toàn cục bộ, chỉ gọi tsudev.com khi người dùng bật đồng bộ Pro"), link chính sách quyền riêng tư +
  `SECURITY.md`. Agent soạn sẵn trong `docs/store/antivirus.md` (mẫu `docs/templates/TRUST_TICKET.md` mục D).
- **Hạn nội bộ:** phát hiện cờ mới ⇒ nộp hồ sơ trong **≤ 48 giờ**; Release giữ ở nháp tới khi gỡ hoặc 👤 chấp nhận.

## 4. Kiến trúc bảo mật của sản phẩm phát hành

Bổ sung cho [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md), áp cho mọi app/tool cài trên máy người dùng:

- **Quyền tối thiểu:** chạy quyền người dùng thường; MSIX `runFullTrust` chỉ khi cần; Android chỉ quyền cốt lõi; macOS
  Hardened Runtime + entitlements tối thiểu; sandbox (App Sandbox / AppContainer) khi chức năng cho phép.
- **Bí mật trên máy:** Windows DPAPI / Credential Manager, macOS/iOS Keychain, Android Keystore. Không lưu mật khẩu,
  token ở dạng rõ.
- **Mạng:** chỉ TLS 1.2+; không tắt kiểm chứng chỉ; webview có CSP chặt, không nạp nội dung từ xa vào ngữ cảnh có quyền.
- **Dữ liệu:** không thu thập/telemetry khi người dùng chưa đồng ý; chính sách quyền riêng tư của từng app công khai ở
  tsudev.com và khớp với tờ khai cửa hàng.
- **Cập nhật:** mục 2.5; có kênh báo lỗ hổng (`SECURITY.md`) và cam kết thời gian phản hồi.

### 4.1. Mô hình mối đe doạ và ứng phó sự cố (MUST cho sản phẩm có người dùng)

- `docs/threat-model.md`: STRIDE ngắn (tài sản, ranh giới tin cậy, mối đe doạ, biện pháp, rủi ro còn lại) - cập nhật
  khi thêm kênh mạng, quyền, định dạng tệp hay đồng bộ Pro.
- `docs/incident-response.md`: ai làm gì khi lộ khoá ký / lộ bí mật / tệp phát hành bị gắn cờ / lỗ hổng bị khai thác;
  thu hồi chứng chỉ, quay khoá, rút Release, thông báo người dùng và cơ quan có thẩm quyền theo mục 8.

### 4.2. Theo loại sản phẩm

| Loại | Bắt buộc |
| --- | --- |
| Desktop Electron/Tauri | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP chặt, không `remote`; Tauri: allowlist/capabilities tối thiểu. Ưu tiên Tauri/native (ít báo nhầm, ít bề mặt tấn công) |
| Website / Worker | HTTPS + HSTS (preload khi ổn định), CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, giới hạn tốc độ, WAF Cloudflare (gói Free) - chi tiết `SECURITY_BASELINE.md` |
| Tên miền | DNSSEC, bản ghi CAA (chỉ CA đang dùng), SPF/DKIM/DMARC `p=reject` cho tên miền không gửi thư - tất cả trên Cloudflare Free |
| CLI / thư viện | phát hành qua registry chính thức với **trusted publishing / provenance** (npm `--provenance`, PyPI OIDC, crates.io trusted publishing) |

## 5. Hồ sơ phải đăng ký

Mọi hồ sơ dưới đây có biểu mẫu trên web: agent đề xuất và chạy phiên điền biểu mẫu theo
[`STORE_SUBMISSION.md`](STORE_SUBMISSION.md) (👤 chỉ đăng nhập và bấm gửi).

| Hồ sơ | Phạm vi | Ai làm | Chi phí | Ghi chú |
| --- | --- | --- | --- | --- |
| Microsoft Partner Center (Store, tài khoản cá nhân) | mọi app Windows | 👤 đăng ký, agent soạn mô tả/ảnh | 0 đồng | Xếp hạng tuổi IARC + URL chính sách quyền riêng tư |
| winget-pkgs (PR theo từng bản) | app Windows | agent (komac/wingetcreate trong CI) | 0 đồng | Cần `WINGET_TOKEN` (👤 tạo) |
| SignPath Foundation hoặc Certum OSS | tệp Windows tải trực tiếp | 👤 | 0 đồng / khoảng 49-69 EUR/năm | Trang chính sách ký mã công khai tại tsudev.com |
| Google Play Console + xác minh nhà phát triển | mọi app Android, mọi package name | 👤 (đã có tài khoản) | đã trả | An toàn dữ liệu, IARC, đối tượng, quyền truy cập app |
| Apple Developer Program | macOS (notarize) + iOS (App Store) | 👤 | 99 USD/năm | **Đầu 2027** - một tài khoản cho cả hai nền tảng |
| Flathub (xác minh tên miền tsudev.com) | app Linux có giao diện | agent soạn manifest, 👤 xác minh tên miền | 0 đồng | Tuỳ chọn, sau APT/RPM |
| Google Search Console + Bing Webmaster Tools | tsudev.com, pkg.tsudev.com | 👤 xác minh DNS | 0 đồng | Theo dõi Safe Browsing |
| VirusTotal (tài khoản + API key) | mọi tệp phát hành | 👤 tạo khoá, agent lắp CI | 0 đồng | Bí mật tổ chức `VT_API_KEY` |
| OpenSSF Best Practices (bestpractices.dev) | MỌI repo Public | agent điền bảng tiêu chí (👤 đăng nhập GitHub) | 0 đồng | Đạt "passing" ⇒ gắn huy hiệu README; tiến tới silver |
| OpenSSF Scorecard | MỌI repo Public | agent (workflow `scorecard.yml` ghim SHA, mẫu ở `tsudev-org/.github`) | 0 đồng | Mục tiêu ≥ 7 |
| Microsoft Security Intelligence (WDSI) | tệp Windows mỗi bản lớn + khi bị gắn cờ | agent soạn + điền, 👤 đăng nhập tài khoản Microsoft | 0 đồng | Chọn "Software developer", kèm gói hồ sơ mục 3.1 |

Xác minh Google Search Console / Bing **bằng bản ghi DNS TXT** trên Cloudflare (thuộc tính kiểu *Domain* phủ mọi tên
miền con `*.tsudev.com` một lần) - agent tạo bản ghi qua API Cloudflare khi 👤 cấp token tạm có quyền `DNS:Edit`.

## 6. Thứ tự làm cho mỗi sản phẩm

1. **A - Miễn phí, ngay:** chuỗi cung ứng mục 2, phòng báo nhầm mục 3, thông tin phiên bản trong tệp, VirusTotal trong CI,
   tên tệp/thẻ theo `VERSIONING.md` mục 2.2, kênh trình quản lý gói theo `PACKAGING.md`.
2. **B - Cửa hàng miễn phí/đã có:** Microsoft Store (MSIX) cho app Windows; Google Play (AAB) + đăng ký package name cho
   app Android.
3. **C - Ký mã Windows:** SignPath Foundation khi đạt ngưỡng uy tín, hoặc Certum khi chủ dự án duyệt chi.
4. **D - Hệ Apple (đầu 2027):** Apple Developer Program ⇒ notarize macOS, nộp App Store/TestFlight cho iOS, Mac App Store
   nếu phù hợp.

## 7. Checklist mỗi bản phát hành

- [ ] Thẻ, tiêu đề Release, tên tệp, phiên bản trong app trùng nhau (`VERSIONING.md` mục 2.2, 2.5).
- [ ] Tệp Windows đã ký Authenticode (khi đã có chứng chỉ) TRƯỚC khi tính SHA-256; tệp macOS đã notarize + staple (khi
      đã có tài khoản Apple).
- [ ] `SHA256SUMS.txt` + `.sigstore.json`, chứng thực nguồn gốc, SBOM có trên Release.
- [ ] VirusTotal 0 engine gắn cờ (hoặc phiếu báo nhầm đã nộp và Release còn ở nháp).
- [ ] Mọi kênh đã công bố (Store, Play, winget, Scoop, Homebrew, APT/RPM) nhận bản mới; `doi-chieu-kenh` 0 lệch.
- [ ] Trang tải về nói đúng trạng thái ký của từng nền tảng - không hứa "không cảnh báo" ở nền tảng chưa đạt.
- [ ] Không có tệp dùng packer/protector; làm rối mã (chỉ PRIVATE) đúng `APP_INTEGRITY.md` mục 5; bộ cài không tải
  thêm mã không ký.

## 8. Tuân thủ pháp luật Việt Nam (checklist kỹ thuật - 👤 xác nhận văn bản)

Agent KHÔNG tuyên bố "tuân thủ pháp luật" thay chủ dự án. Phiên làm hồ sơ `MUST` tra **văn bản và hiệu lực hiện hành**
trên `vbpl.vn` / Công báo, ghi số hiệu + ngày tra vào hồ sơ. Nhóm văn bản cần rà (đo 20/11/2026, cần xác nhận lại):

| Nhóm | Ảnh hưởng kỹ thuật |
| --- | --- |
| Luật An ninh mạng (bản sửa đổi/hợp nhất mới nhất) + nghị định hướng dẫn | Lưu nhật ký hệ thống; phối hợp/cung cấp thông tin khi có yêu cầu hợp pháp; dịch vụ có người dùng VN thuộc diện phải lưu trữ dữ liệu trong nước hay không (dịch vụ tsudev phần lớn lưu CỤC BỘ trên máy người dùng - `PRODUCT_POLICY.md` mục 7 - nên giảm phạm vi) |
| Luật Bảo vệ dữ liệu cá nhân + nghị định hướng dẫn | Tối thiểu hoá dữ liệu; đồng ý rõ ràng; quyền xoá/truy cập (tsudev.com: xoá tài khoản, xuất dữ liệu); thông báo vi phạm; đánh giá tác động khi xử lý dữ liệu nhạy cảm |
| Luật An toàn thông tin mạng + quy định cấp độ hệ thống thông tin | Phân loại hệ thống; biện pháp kỹ thuật theo cấp độ (repo UBND: áp dụng riêng, không thuộc tài liệu này) |
| Luật Giao dịch điện tử, quy định thanh toán | Pro/Ủng hộ: biên nhận, điều khoản trước nút mua (`PRODUCT_POLICY.md` 7.5), không lưu dữ liệu thẻ |
| Điều khoản nền tảng (Google Play, Microsoft Store, Apple, GitHub, winget...) | `STORE_SUBMISSION.md` mục 3 |
| Giấy phép nguồn mở (AGPL-3.0 của hệ; MIT/GPL của bản fork) | Giữ thông báo bản quyền gốc, ghi rõ nguồn fork, công bố mã theo giấy phép |

Việc kỹ thuật hỗ trợ tuân thủ (`MUST`): mã hoá dữ liệu lưu/truyền, nhật ký truy cập không chứa dữ liệu nhạy cảm, chính
sách quyền riêng tư công khai khớp hành vi app, kênh báo lỗ hổng có hạn phản hồi (`SECURITY.md`), quy trình mục 4.1.

## 9. Phiếu tin cậy cho từng sản phẩm

Mỗi repo phát hành sản phẩm `MUST` có `logs/trust/TRUST.md` lập từ [`templates/TRUST_TICKET.md`](templates/TRUST_TICKET.md)
(mã `TSU-<slug>`): thông tin chung, chuẩn hoá repo, ký và phát hành, từng hồ sơ nền tảng (ngày nộp - mã hồ sơ - trạng
thái), bảo mật, pháp lý, nghiệm thu. Phiên điều phối giữ bảng tổng hợp một dòng/sản phẩm trong phiếu điều phối.

**Nghiệm thu một sản phẩm (Definition of Done):** đủ mục B của phiếu + CI dùng workflow chung; mọi tệp phát hành ký (khi
đã có chứng chỉ) + checksum + attestation + SBOM; ≥ 1 kênh chính thống và trang tải công bố SHA-256; đã có OpenSSF
Best Practices, Scorecard, Search Console (tên miền), VirusTotal trong CI; tải/cài thử trên Windows 11 (Defender +
SmartScreen) và trình duyệt Edge/Chrome không bị chặn - hoặc có hồ sơ báo nhầm đang xử lý; 👤 đã xác nhận mục 8.
