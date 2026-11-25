# QUY TRÌNH APPLE (iOS, iPadOS, macOS) - CI/CD, KÝ, TESTFLIGHT (v1.1.0)

> **Bắt buộc cho mọi project TsuDEV có bản iOS/iPadOS/macOS.** Phát triển, ký và phân phối cho hệ sinh thái Apple từ
> Ubuntu/WSL2 (không cần Mac) qua GitHub Actions macOS → TestFlight / App Store Connect; macOS qua Developer ID +
> công chứng. Ký hiệu `MUST`/`SHOULD`/`MAY` theo RFC 2119. Phiếu triển khai toàn hệ: `20261125-AP2` (kế tiếp `20261119-AP1`).

| Mục | Giá trị |
| :-- | :-- |
| **Phiên bản** | 1.1.0 - bộ quy ước v6.3.0 (25/11/2026): thêm mục 3.1 giai đoạn chuyển tiếp tới khi có Apple Developer Program (dự kiến 02/2027) |
| **Hợp nhất từ** | (1) "Quy trình chuẩn hoá Cloud CI/CD Apple cho AI Agent" v2.0; (2) `TSUDEV_Apple_CICD_SOP_v3.md` v3.0; (3) "Đặc tả triển khai đa nền tảng Apple miễn phí & mã nguồn mở" v3.0 - đối chiếu với bộ quy ước **tsudev-standards v6.1.0** và mã thật trong `~/projects/*` |
| **Thay thế** | Ba tài liệu trên (không đưa vào repo). Khác nhau ⇒ theo tài liệu này (lý do ở mục 2) |
| **Tệp đi kèm** | `scripts/apple/setup_apple_signing.sh`, `scripts/apple/apple-apps.tsv`, `templates/apple/apple-testflight.yml` (tệp gọi), `templates/apple/apple-ios-testflight.reusable.yml` (bản sao để đọc; bản chạy ở `tsudev-org/.github`) |
| **Đối tượng** | Lập trình viên và agent (Claude Code...) chạy trên Ubuntu/WSL2 của máy Windows; **không cần Mac** |
| **Đích** | Mã ở `~/projects/<repo>` → GitHub → GitHub Actions macOS → ký "Apple Distribution" → **TestFlight / App Store Connect**; macOS → Developer ID + công chứng (notarize) |
| **Đã kiểm chứng** | Mục 17: script chạy thật với máy chủ App Store Connect giả lập (JWT ES256, cấp chứng chỉ, `.p12`), YAML + `bash -n` mọi khối lệnh, logic phiên bản. **Chưa chạy trên tài khoản Apple thật** ⇒ Pilot (mục 10, Phase 3) là cổng bắt buộc |

> **Cách đọc cho agent:** đọc HẾT tài liệu trước lệnh đầu tiên. Mục 1 là luật cứng; mục 6 là việc của người (👤); mục 7-8 là script/workflow (tệp trong `scripts/apple/`, `templates/apple/` - dùng nguyên tệp, không tự viết lại); mục 10 là trình tự có cổng; mục 11 là xử lý lỗi. Gặp **STOP** ⇒ dừng, hỏi chủ dự án.

---

## 0. MỤC LỤC

1. Luật cứng · 2. Hợp nhất và các xung đột đã gỡ · 3. Giới hạn trung thực, ma trận thiết bị (3.1 giai đoạn chuyển tiếp) · 4. Hiện trạng hệ ·
5. Kiến trúc đích · 6. Việc 👤 · 7. Kho khoá, bí mật, script `setup_apple_signing.sh` · 8. Workflow ·
9. Chuẩn hoá cấu hình app · 10. Trình tự thực thi · 11. Xử lý lỗi · 12. Bảo mật · 13. Chi phí · 14. Bảo trì ·
15. Hoàn thành và báo cáo · 16. Thay đổi cần duyệt ở bộ quy ước · 17. Kiểm chứng đã chạy ·
Phụ lục A (website/PWA trên Safari) · B (Codemagic, Xcode Cloud) · C (lệnh nhanh) · D (nguồn)

---

## 1. LUẬT CỨNG (thứ tự ưu tiên: Bảo mật > Luật cứng > Trình tự mục 10 > yêu cầu tức thời)

| # | Luật |
| :-: | :-- |
| R1 | **Không bao giờ** in, ghi log, commit, dán vào chat, ghi vào phiếu/AKB nội dung `.p8`, `.p12`, `.key`, mật khẩu, JWT hay base64 của chúng. Chỉ hỏi chủ dự án **đường dẫn tệp**. Thông tin định danh cá nhân (CCCD, MST, địa chỉ) cũng vậy. |
| R2 | Kho khoá `~/.config/tsudev/keys/apple/` (chmod 700) nằm **ngoài** mọi repo git; script tự chặn nếu nằm trong `~/projects`. |
| R3 | Không `git push --force`; không xoá nhánh/nhãn/secret; không **thu hồi (revoke)** chứng chỉ hay khoá API nếu chủ dự án chưa nói rõ. |
| R4 | **Ghim** mọi thứ: Xcode theo phiên bản ổn định (`Xcode_26.6`, không "mới nhất", chặn beta/RC); Flutter theo nhãn + commit; GitHub Action theo **SHA đầy đủ** (`SECURITY_BASELINE`). Cấm `macos-latest`, `@v4`, `subosito/flutter-action` kênh `stable`. |
| R5 | Bundle ID = `applicationId` Android = `com.tsudev.<ma>` (phần mở rộng: `com.tsudev.<ma>.<Ten>`), **không bao giờ đổi** sau lần nộp đầu (`STORE_SUBMISSION` 1.1). Không đoán: lấy từ `project.pbxproj`, chủ dự án xác nhận. |
| R6 | iOS chỉ phân phối qua **App Store / TestFlight**. `MUST NOT` đăng `.ipa` lên Release, AltStore/SideStore source, dịch vụ "ký IPA", chứng chỉ doanh nghiệp, ad-hoc cho người khác (`DISTRIBUTION_TRUST` 1.4, `PRODUCT_POLICY` 2.1). |
| R7 | Hàng loạt luôn theo `--dry-run` → **Pilot 1 repo** → đợt ≤ 3 repo. |
| R8 | Repo đang có phiên Claude khác (`ListAgents`) ⇒ **không sửa hộ**: viết phiếu vào `logs/handover/` của repo đó + `SendMessage`. Không đụng repo UBND/xanuicam, b4djl1h-cmdb, mieubathuong. Không tạo/đổi tên repo thành tên cũ bị cấm trong `~/.claude/CLAUDE.md`. |
| R9 | Không dùng `pull_request_target`; job có bí mật chỉ chạy ở environment `apple` (nhánh `main` + nhãn `v*`). |
| R10 | Chỉ báo "thành công" khi có **bằng chứng**: `gh run view` = `success` **và** `setup_apple_signing.sh builds <bundle>` thấy build mới. |
| R11 | Commit/PR **không** ghi đồng tác giả AI hay "Generated with" (sản phẩm đứng tên chủ dự án). Commit theo Conventional Commits tiếng Việt như repo đang dùng. |
| R12 | Tôn trọng bảo vệ nhánh: bị từ chối ⇒ nhánh + PR, chờ CI xanh, không vượt. |
| R13 | **0 đồng**: ngoại lệ DUY NHẤT đã có trong bộ quy ước là Apple Developer Program 99 USD/năm (`DISTRIBUTION_TRUST` bảng phí, 👤 trả). Không bật gói trả phí nào khác (Codemagic trả phí, phút macOS cho repo riêng tư, GitHub Team...). |
| R14 | Nội dung công khai (README, mô tả cửa hàng, ghi chú phát hành) dùng "miễn phí, mã nguồn mở, không quảng cáo"; **cấm** "phi lợi nhuận / non-profit / từ thiện" (`PRODUCT_POLICY` 3.7.4). |
| R15 | AKB bắt buộc: `akb start` đầu phiên, `akb new issue|lesson` khi gặp lỗi > 10 phút, `akb close` + `akb sync` cuối phiên. |

---

## 2. HỢP NHẤT BA TÀI LIỆU - QUYẾT ĐỊNH VÀ XUNG ĐỘT ĐÃ GỠ

| # | Tài liệu cũ nói | Vấn đề | Quyết định trong 4.0.0 |
| :-: | :-- | :-- | :-- |
| X1 | (3) "Tier 1": `.ipa` không ký + kho AltStore/SideStore `apps.json` cho cộng đồng | Trái `DISTRIBUTION_TRUST` 1.4 + `PRODUCT_POLICY` 2.1 (cấm phân phối IPA ngoài App Store); bản ký Apple ID miễn phí hết hạn 7 ngày, tối đa 3 app, không có quyền đặc biệt (multicast) | **Bỏ.** `.ipa` không ký chỉ là artifact CI 14 ngày để chủ dự án tự ký cho máy mình (đã có ở `apple.yml`) |
| X2 | (3) Bundle ID `com.tsudev.<category>.<slug>` | Khác ID đang dùng (`com.tsudev.qulythuchi`...) và quy tắc "trùng applicationId, không đổi" | **Bỏ.** Giữ `com.tsudev.<ma>` (R5) |
| X3 | (1)(2) Secret `APP_STORE_CONNECT_*`, `CERTIFICATE_*`, `APPLE_TEAM_ID` secret | Hệ đã có tên khác, đang dùng ở `lotus-share` (`tools/day-khoa-apple.sh`, `release-lotus.yml`) | **Giữ tên của hệ**: secret `APPLE_DIST_P12_BASE64`, `APPLE_DEVID_P12_BASE64`, `APPLE_P12_PASSWORD`, `APPLE_ASC_KEY_P8_BASE64`; biến `APPLE_TEAM_ID` (repo), `APPLE_ASC_KEY_ID`, `APPLE_ASC_ISSUER_ID` (environment) |
| X4 | (1)(3) `macos-latest` + `ls Xcode*.app \| sort -V \| tail -1` | Có thể chọn Xcode 27 **beta** ⇒ App Store Connect từ chối | `runs-on: macos-26` + `Xcode_26.6` ghim, chặn beta/RC, kiểm Xcode ≥ 26 |
| X5 | (1) Action theo nhãn `@v4`, `subosito/flutter-action` `stable` | Trái `SECURITY_BASELINE` (ghim SHA); Flutter trôi phiên bản giữa máy và CI | Ghim SHA; Flutter `git clone` nhãn + kiểm commit như `apple.yml` hiện có |
| X6 | (1) `ExportOptions.plist` chứa `$(APPLE_TEAM_ID)`; `uploadBitcode`; `manageAppVersionAndBuildNumber=true` | xcodebuild không thay biến trong plist; bitcode bỏ từ Xcode 14; hai cơ chế tranh số build | Sinh plist lúc chạy bằng PlistBuddy; bỏ bitcode; `manageAppVersionAndBuildNumber=false` |
| X7 | (1) Tải lên bằng `xcrun altool --upload-app`; nhắc `notarytool` cho iOS | `altool` lỗi thời; `notarytool` chỉ để công chứng macOS | `xcodebuild -exportArchive` với `destination=upload` |
| X8 | (1) `security list-keychain -s` ghi đè; thiếu `set-key-partition-list` | Mất keychain hệ thống; `codesign` treo | Giữ danh sách cũ, chỉ thêm keychain tạm; có `set-key-partition-list`; dọn `if: always()` |
| X9 | (2) `.p12` từ OpenSSL 3 mặc định | macOS `security import` báo *MAC verification failed* | Ép `-keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES -macalg sha1` (đã kiểm, mục 17) |
| X10 | (2) Số build `run_number`; VERSIONING ghi `CFBundleVersion = YY.M.DDNN` | Bản đẩy liên tục cùng ngày trùng số; train đã duyệt bị đóng | Mục 8.4: nhãn ⇒ `YY.M.DDNN`; đẩy `main` ⇒ train `YY.M.DD99` + build `run_number + offset`, chỉ nội bộ |
| X11 | (1) Mọi push `main` ⇒ TestFlight | Hợp lý cho repo công khai (phút miễn phí) nhưng tốn lượt duyệt/hàng đợi | Nhãn `v*` luôn lên; push `main` chỉ khi biến `APPLE_TESTFLIGHT_ON_PUSH=true` (chủ dự án bật từng repo) |
| X12 | (1)(3) Đặt `ITSAppUsesNonExemptEncryption=false` cho mọi app | Khai sai tuân thủ xuất khẩu với app dùng libsodium/rustls/ring | Mục 9.3: quyết định theo từng app, ghi ở `docs/store/IDENTITY.md` |
| X13 | (1)(3) Ép `TARGETED_DEVICE_FAMILY="1,2"`, deployment target 16.0 | Mọi app hiện đã `1,2`; target 15.0-15.5 đang chạy | Giữ nguyên; workflow chặn target ngoài [15.0, 16.0] |
| X14 | (3) `MACOSX_DEPLOYMENT_TARGET 13`, universal | macOS đi luồng Developer ID riêng (mục 8.5), Flutter mặc định đã universal | Không sửa trong tài liệu này |
| X15 | (1)(2) Secret cấp Organization mặc định | GitHub Free: secret cấp org **không** tới repo riêng tư; org secret không giới hạn được theo nhánh; `app-la-ban` ở tài khoản cá nhân `tsudev-tsudev` | **Environment secret** `apple` từng repo, chỉ nhánh `main` + nhãn `v*` - hẹp nhất, script tự tạo |
| X16 | (1) Xcode Cloud trong luồng mặc định | Thêm hệ CI thứ hai giữ bí mật; thiết lập ban đầu phụ thuộc Xcode | Phụ lục B (không mặc định) |
| X17 | (1)(2) Codemagic dự phòng | Vượt hạn mức miễn phí là trả phí (R13) | Phụ lục B (không mặc định) |
| X18 | (3) "$99 từ GitHub Sponsors / tài trợ" | Bộ quy ước ghi 👤 trả, dự kiến đầu 2027 | Theo bộ quy ước |
| X19 | (3) PWA: `maximum-scale=1, user-scalable=no` | Vi phạm `ACCESSIBILITY` (WCAG 1.4.4 phóng to) | Phụ lục A: cấm chặn phóng to |
| X20 | (1)(3) "phi lợi nhuận" | Cấm trong nội dung công khai (R14) | "miễn phí, mã nguồn mở" |
| X21 | (2) Script tạo chứng chỉ Developer ID? Không nói | Khoá API **không** tạo được Developer ID (chỉ Account Holder) | `csr-devid` + 👤 tải lên + `import-devid` |
| X22 | (2) Script cần `jq`, `python3-jwt` | Máy này không có `jq`; thêm phụ thuộc không cần | Chỉ `python3` + `python3-cryptography` (có sẵn), JSON bằng Python |
| X23 | (1)(3) "Không lỗi dù nhỏ nhất trên mọi thiết bị Apple" | Không cấu hình nào bảo đảm được (App Review, iOS mới, phần cứng) | Mục 3: cam kết đúng mức + cổng kiểm thật |

---

## 3. GIỚI HẠN TRUNG THỰC VÀ MA TRẬN THIẾT BỊ

- Pipeline bảo đảm chuỗi **dựng → ký → tải lên App Store Connect → TestFlight xử lý**. **Không** bảo đảm qua App Review; không tự điền metadata, ảnh, xếp hạng tuổi, giá; "Gửi duyệt" là bước 👤.
- **App Record** không tạo được qua API ⇒ 👤 tạo tay (H3). Quyền đặc biệt (vd **multicast** của lotus-share) phải được Apple **duyệt trước** lần archive đầu.
- Từ **28/04/2026** Apple chỉ nhận bản dựng bằng **Xcode 26+ / SDK iOS 26+**. Mốc tiếp theo (SDK 27) phải đọc trang "Upcoming requirements" của Apple trước khi đổi Xcode (mục 14).

| Thiết bị | Cách cài | Điều kiện |
| :-- | :-- | :-- |
| **iPhone 8** (tối đa iOS 16.7.x) | TestFlight | Deployment target **≤ 16.0** (workflow chặn), Apple ID là tester nội bộ |
| iPhone/iPad đời mới (iOS/iPadOS 26+) | TestFlight / App Store | Dựng bằng Xcode 26.x |
| iPad | Cùng gói (`TARGETED_DEVICE_FAMILY = 1,2`) | Ảnh iPad 13" khi nộp (đã chụp ở `apple.yml`) |
| Mac Apple Silicon | App iPhone/iPad "Designed for iPad" qua Mac App Store, hoặc bản macOS riêng (Developer ID, mục 8.5) | Bật/tắt ở App Store Connect → Pricing and Availability |
| Mac Intel | Chỉ bản macOS riêng (Developer ID, universal) | App iOS không chạy trên Mac Intel |
| Apple Vision Pro | App iPad tương thích | Bật ở App Store Connect |
| Apple Watch, Apple TV | Ngoài phạm vi | Cần target riêng |

### 3.1. GIAI ĐOẠN CHUYỂN TIẾP - trước khi có Apple Developer Program (H1, dự kiến 02/2027)

Quyết định chủ dự án 25/11/2026: H1 đăng ký **tháng 02/2027**. Tới lúc đó mọi project ưu tiên phương án **0 đồng** nhưng
người dùng iPhone/iPad, Mac vẫn tải, cài và dùng được bình thường. Không có cách hợp lệ nào để phát app iOS gốc cho người
khác mà không có tài khoản trả phí (Apple ID miễn phí chỉ ký 7 ngày, chỉ cho máy của chính người dựng, cần Mac) và R6 vẫn
cấm IPA/AltStore/dịch vụ ký ⇒ kênh chính cho iPhone/iPad là **bản web cài được (PWA)** trên Safari.

| Nền tảng | Kênh trong giai đoạn chuyển tiếp | Chi phí |
| :-- | :-- | :-: |
| iPhone, iPad (iOS/iPadOS 16.4+; iPhone 8 = 16.7) | PWA tự host: Safari → Chia sẻ → **Thêm vào Màn hình chính**; chạy toàn màn hình, có biểu tượng, dùng ngoại tuyến (service worker) | 0 đồng (Cloudflare Workers/Pages gói miễn phí) |
| Mac | PWA (Safari 17+ "Thêm vào Dock") **hoặc** DMG ký ad-hoc trên Release (mục 8.5 nhánh "thiếu Team ID"), hướng dẫn "Cài đặt hệ thống → Quyền riêng tư & Bảo mật → Vẫn mở" | 0 đồng |
| Android, Windows, Linux | Không đổi (`DISTRIBUTION_TRUST`) | - |

`MUST` trong giai đoạn này:

1. Mỗi app có `ios/` có **bản web** dùng được trên Safari iOS, tên miền `*.tsudev.com` của sản phẩm (đường dẫn `/app/`
   như qulythuchi, tsuscan), theo Phụ lục A: `manifest.webmanifest`/`manifest.json` có `display: "standalone"`,
   `apple-touch-icon` 180×180 nền đặc, `theme-color` sáng/tối, safe-area, service worker cho tài nguyên tĩnh, CSP giữ nguyên.
2. Trang tải của sản phẩm và README có mục **"iPhone / iPad"**: nút mở bản web + 3 bước "Thêm vào Màn hình chính" (vi/en),
   ghi rõ "bản trên App Store sẽ có sau". `MUST NOT` hứa ngày cụ thể, `MUST NOT` đăng `.ipa`.
3. Chỉ khai tính năng **chạy thật trên Safari**; tính năng không có trên web (xem bảng dưới) ghi rõ "chưa có trên
   iPhone/iPad bản web". Kiểm trên Safari iOS thật hoặc BrowserStack/LambdaTest gói miễn phí trước khi ghi ✅.
4. Dữ liệu: gọi `navigator.storage.persist()`; app E2EE có xuất/nhập tệp và (Pro) đồng bộ - không coi IndexedDB là nơi
   lưu duy nhất (Safari có thể xoá dữ liệu trang ít dùng).
5. TsuDEV Pro trên bản web: mua tại `tsudev.com/pro?app=<ma>` (`PRODUCT_POLICY` 3.7, 0.6 phiếu PRO3) - bản web không
   thuộc App Store nên không dùng StoreKit; khi có app iOS gốc thì dùng StoreKit `com.tsudev.pro.nam` như mục 9.
6. Phần repo của AP2 (PrivacyInfo, khai mã hoá, `apple.yml` không ký, tệp gọi `apple-testflight.yml` với
   `team-id-pin: ''`) **vẫn làm** - không tốn tiền (repo công khai, runner macOS miễn phí) và để tới 02/2027 chỉ còn H1-H9.

Giới hạn kỹ thuật đã biết của web trên iOS (kiểm lại trên máy thật trước khi khai):

| Khả năng | Trên Safari / PWA iOS |
| :-- | :-- |
| Camera, micro (`getUserMedia`) | Có, cần HTTPS + người dùng cho phép; trong PWA đã thêm vào Màn hình chính cũng chạy |
| La bàn (`DeviceOrientationEvent`) | Có, phải gọi `DeviceOrientationEvent.requestPermission()` trong thao tác chạm; hướng Bắc lấy `webkitCompassHeading` |
| Thông báo đẩy | Chỉ iOS/iPadOS 16.4+ và chỉ khi đã "Thêm vào Màn hình chính" |
| Wasm, WebCrypto, libsodium.js, SQLite wasm | Có |
| Tìm máy cùng mạng LAN (multicast/mDNS), mở cổng TCP/UDP nghe | **Không** - app chuyển tệp LAN (lotus-share) chỉ có chiều nhận qua "chia sẻ qua liên kết" mở bằng Safari |
| Tiện ích màn hình chính (widget), Share Extension, chạy nền | **Không** |
| Đo âm thanh chính xác | Micro có AGC/lọc ồn của hệ thống; xin `echoCancellation/noiseSuppression/autoGainControl: false` và ghi rõ sai số trên web |

Kết thúc giai đoạn: khi H1 xong ⇒ làm mục 10 (Pilot sound-db). Bản web **giữ lại** (người dùng iPhone cũ, Mac Intel),
trang tải thêm nút App Store.

---

## 4. HIỆN TRẠNG HỆ (quét 25/11/2026)

| Repo | App | Bundle ID (+ phần mở rộng) | Công khai | iOS target | Quyền / ghi chú | Workflow Apple hiện có | Việc theo chuẩn này |
| :-- | :-- | :-- | :-: | :-: | :-- | :-- | :-- |
| `tsudev-org/lotus-share` | `app` | `com.tsudev.lotusshare` (+`.ShareExtension`) | ✅ | 15.0 | multicast (Apple duyệt), App Groups; `ITSAppUsesNonExemptEncryption=false` | `apple.yml` + job `ios` trong `release-lotus.yml` | Xin multicast; xác minh lại khai mã hoá (AP1 bài học 8: rustls/WebRTC ⇒ có thể là **Có**); chuyển job `ios` sang workflow dùng chung (mục 8.6) |
| `tsudev-org/qulythuchi` | `apps/app` | `com.tsudev.qulythuchi` (+`.QuickWidget`) | ✅ | 15.5 | libsodium ⇒ khai mã hoá **Có** (CI đã chặn `false`) nhưng Info.plist **chưa có khoá** | `apple.yml` | Thêm `ITSAppUsesNonExemptEncryption=true` + hồ sơ tuân thủ; IAP `com.tsudev.pro.nam` |
| `tsudev-org/sound-db` | `apps/app` | `com.tsudev.sounddb` | ✅ | 15.0 | **Thiếu `PrivacyInfo.xcprivacy`**; khai `false` nhưng dùng `ring` | không | PrivacyInfo + `apple.yml` + xác minh khai mã hoá |
| `tsudev-org/tsuscan` | `apps/app` | `com.tsudev.tsuscan` | ✅ | 15.0 | **Thiếu `PrivacyInfo.xcprivacy`**; E2EE nhưng khai `false` | `app-platforms.yml` | PrivacyInfo + xác minh khai mã hoá |
| `tsudev-tsudev/app-la-ban` | `app` | `com.tsudev.laban` | ✅ | 15.0 | **Thiếu PrivacyInfo và khoá mã hoá**; repo còn ở tài khoản cá nhân | `ci.yml` | PrivacyInfo + khoá mã hoá + `apple.yml`; secret theo repo (environment) |
| `tsudev-ui-flutter` | thư viện | - | ✅ | - | - | - | Không cần TestFlight |
| tsufiles, tsuswico, tsucwico, tsucontact, tsutramon, tsudisk, tsugamelabs/* | desktop/web | - | - | - | Không có `ios/` | - | Không làm iOS; macOS (nếu có) dùng mục 8.5 |

> Bảng là ảnh chụp: agent chạy lại phần quét ở Phase 0 và cập nhật `apple-apps.tsv` (mục 7.4). Bundle ID phải được chủ dự án xác nhận (R5).

---

## 5. KIẾN TRÚC ĐÍCH

```text
 Ubuntu/WSL2 (~/projects)                    GitHub (tsudev-org, repo công khai = phút macOS miễn phí)
 ┌──────────────────────────┐   git push    ┌──────────────────────────────────────────────────────────────┐
 │ mã app (Flutter + Rust)  │ ─────────────▶│ L1 apple.yml  (PR/push/tuần): dựng KHÔNG ký, Simulator iPhone │
 │ setup_apple_signing.sh   │               │    + iPad 13", kiểm tĩnh, .ipa không ký (artifact 14 ngày)    │
 │  ├ OpenSSL: khoá + CSR   │  gh api/secret│ L2 apple-testflight.yml (nhãn v* | push main nếu bật):        │
 │  ├ ASC API: cấp chứng chỉ│ ─────────────▶│    environment `apple` → workflow dùng chung                  │
 │  └ đặt secret/variable   │               │    tsudev-org/.github/apple-ios-testflight.yml@SHA            │
 │ kho khoá ngoài repo (700)│               │    → ký Apple Distribution → upload → TestFlight              │
 └──────────────────────────┘               │ L3 release (nhãn v*): macOS Developer ID + notarize → Release  │
          ▲  builds <bundle>                └───────────────────────────────┬──────────────────────────────┘
          └──────────── App Store Connect API ◀────────────────────────────┘  TestFlight ─▶ iPhone 8, iPad, Mac
```

- **L1** đã có (mẫu `lotus-share#80`, phiếu AP1): giữ, sao sang repo còn thiếu.
- **L2** mới: một workflow dùng chung (mục 8.2) + mỗi repo một tệp gọi ~30 dòng (mục 8.3). Trống Team ID ghim ⇒ không chạy (an toàn khi chưa có tài khoản).
- **L3** đã có ở lotus-share (`scripts/apple/ky-cong-chung-macos.sh`): giữ (mục 8.5).

---

## 6. VIỆC CỦA CHỦ DỰ ÁN (👤) - agent kiểm từng mục, thiếu thì hướng dẫn và **STOP**

| Mã | Việc | Chi tiết |
| :-: | :-- | :-- |
| **H1** | Đăng ký **Apple Developer Program** (99 USD/năm, cá nhân) | developer.apple.com/programs/enroll, Apple ID bật xác thực hai yếu tố (iPhone 8 nhận mã). Nếu Apple đòi xác minh danh tính qua ứng dụng Apple Developer mà iPhone 8 (iOS 16) không cài được bản hiện hành ⇒ dùng thiết bị khác hoặc làm trên web theo hướng dẫn của Apple. Chỉ khai thông tin thật. |
| **H2** | Tạo **khoá API App Store Connect - Team Key, vai trò Admin** | Users and Access → Integrations → App Store Connect API → Team Keys → Generate. Admin cần để cấp chứng chỉ và hồ sơ cấp phép tự động. **Không** dùng Individual Key. Tải `AuthKey_<KEYID>.p8` (**chỉ tải được 1 lần**), ghi Key ID + Issuer ID. Chỉ báo agent **đường dẫn tệp**. |
| **H3** | Tạo **App Record** cho từng app | App Store Connect → Apps → + → New App: iOS (+ macOS nếu bán qua Mac App Store), tên theo `docs/store/IDENTITY.md`, Bundle ID (đã đăng ký bằng `register-bundles`), SKU = mã app. |
| **H4** | Tester trên **iPhone 8** | Cài TestFlight; App Store Connect → TestFlight → Internal Testing → nhóm "TsuDEV nội bộ", thêm Apple ID, bật tự phân phối build. |
| **H5** | `gh` đăng nhập đúng tài khoản có quyền admin repo | `gh auth status`; scope `repo`, `workflow`. Theo memory "gh dùng chung tài khoản": kiểm trước khi đổi. |
| **H6** | Quyết định **khai mã hoá** từng app | Bảng 9.3. Ghi vào `docs/store/IDENTITY.md`. |
| **H7** | Xin **quyền đặc biệt** | lotus-share: multicast (developer.apple.com/contact/request/networking-multicast). Liệt kê quyền khác nếu có. |
| **H8** | **Developer ID** cho macOS (nếu phát hành DMG) | Chạy `csr-devid`, tải CSR lên developer.apple.com → Certificates → Developer ID Application (G2 Sub-CA), tải `.cer`, chạy `import-devid`. |
| **H9** | Thoả thuận **Paid Apps** + thuế + ngân hàng ở App Store Connect | Cần trước khi bán IAP `com.tsudev.pro.nam` / `ung_ho_*`; không cần cho TestFlight. |

**Kết quả agent phải có trước Phase 2:** đường dẫn `.p8`, Key ID, Issuer ID, danh sách app đã có App Record, câu trả lời H6/H7 từng app.

---

## 7. KHO KHOÁ, BÍ MẬT VÀ SCRIPT `setup_apple_signing.sh`

### 7.1. Cài đặt (Ubuntu/WSL2)

```bash
sudo apt update && sudo apt install -y openssl curl python3 python3-cryptography git age
# gh: https://cli.github.com/packages (máy này đã có ~/.local/bin/gh)
```

Chạy script từ **bản sao trung tâm** của bộ quy ước (registry nằm cạnh script; repo con có bản chỉ-đọc ở
`.standards/scripts/apple/` nhưng KHÔNG sửa registry ở đó):

```bash
STD=~/projects/tsudev-standards/tsudev-standards
git -C "$STD" pull --ff-only
bash -n "$STD/scripts/apple/setup_apple_signing.sh" && "$STD/scripts/apple/setup_apple_signing.sh" doctor
```

### 7.2. Tên bí mật và nơi đặt (KHÔNG thêm tên khác)

| Tên | Loại | Nơi | Nguồn |
| :-- | :-- | :-- | :-- |
| `APPLE_DIST_P12_BASE64` | secret | environment `apple` | `cert-dist` (Apple Distribution, iOS) |
| `APPLE_DEVID_P12_BASE64` | secret | environment `apple` | `import-devid` (Developer ID, macOS) - chỉ khi có |
| `APPLE_P12_PASSWORD` | secret | environment `apple` | sinh ngẫu nhiên 32 ký tự, chung cho hai `.p12` |
| `APPLE_ASC_KEY_P8_BASE64` | secret | environment `apple` | `.p8` của H2 |
| `APPLE_ASC_KEY_ID`, `APPLE_ASC_ISSUER_ID` | variable | environment `apple` | H2 |
| `APPLE_TEAM_ID` | variable | **repo** (để `if:` cấp job đọc được) | trích từ chứng chỉ (OU) |
| `APPLE_TESTFLIGHT_ON_PUSH` | variable (tuỳ chọn) | repo | `true` ⇒ push `main` cũng lên TestFlight |
| `APPLE_BUILD_OFFSET` | variable (tuỳ chọn) | repo | cộng vào `run_number` khi đổi tên workflow (mục 11) |

Environment `apple` chỉ cho **nhánh `main` + nhãn `v*`** ⇒ nhánh khác, PR, fork không đọc được bí mật. Team ID còn được **ghim trong tệp workflow** (`team-id-pin`); khác nhau ⇒ job dừng (chống tráo bí mật).

Kho khoá trên máy: `~/.config/tsudev/keys/apple/` gồm `asc.env`, `AuthKey_<ID>.p8`, `distribution.{key,csr,cer,pem,p12}`, `developer-id.{key,csr,cer,pem,p12}`, `p12_password`, `team_id`. Sao lưu: `backup --to /mnt/e/tsudev-sao-luu/apple` (mã hoá `age`, passphrase 👤 giữ). Lotus-share cũ dùng `~/.config/lotus-share/keys/apple/` - khi có tài khoản dùng kho chung này, không tạo hai bộ.

### 7.3. Script `scripts/apple/setup_apple_signing.sh`

Tên tệp cố ý KHÔNG chứa chữ `secret`: mẫu `.gitignore` của hệ chặn `*secret*` (chống commit nhầm bí mật) - đừng đổi
tên ngược lại hay thêm ngoại lệ.

Lệnh: `doctor`, `init`, `cert-dist`, `csr-devid`, `import-devid`, `register-bundles`, `push`, `verify`, `builds`,
`status`, `backup` (`--help` in đủ). Chỉ cần `openssl` 3, `curl`, `python3` + `python3-cryptography`, `gh`, `base64`
(`age` cho `backup`). JWT ES256 ký bằng Python, JSON đọc bằng Python (không `jq`). Không in giá trị bí mật; kho khoá
trong `~/projects` hay trong repo git ⇒ từ chối. Sửa script ⇒ PR bộ quy ước + chạy lại phép thử mục 17.

### 7.4. Registry `scripts/apple/apple-apps.tsv`

Cột `repo`, `app_dir`, `bundle_id`, `extensions` (phẩy; `-` = không có), cách nhau bằng tab. Một dòng cho mỗi app có
iOS. Thêm/sửa dòng ⇒ PR bộ quy ước, chủ dự án xác nhận Bundle ID (R5).

### 7.5. Cách dùng (đúng thứ tự)

```bash
S=~/projects/tsudev-standards/tsudev-standards/scripts/apple/setup_apple_signing.sh
KEY_ID=ABCDE12345                                                  # 👤 đọc ở App Store Connect (H2) - thay giá trị
ISSUER_ID=00000000-0000-0000-0000-000000000000                     # 👤 (H2) - thay giá trị
$S doctor                                                          # công cụ, đồng hồ, gh
$S init --key-id "$KEY_ID" --issuer-id "$ISSUER_ID" --p8 ~/Downloads/AuthKey_"$KEY_ID".p8
$S cert-dist                                                       # Apple Distribution -> .p12 (1 lần / năm)
$S backup --to /mnt/e/tsudev-sao-luu/apple && rm ~/Downloads/AuthKey_*.p8
$S register-bundles --repos tsudev-org/sound-db                    # rồi 👤 tạo App Record (H3)
$S push --dry-run --repos tsudev-org/sound-db
$S push --repos tsudev-org/sound-db
$S verify --repos tsudev-org/sound-db                              # SECRETS=OK VARS=OK APP_RECORD=OK
$S builds com.tsudev.sounddb                                       # sau khi CI chạy
$S status                                                          # hạn chứng chỉ
```

---

## 8. WORKFLOW

### 8.1. L1 `apple.yml` (giữ - đã chạy ở lotus-share, qulythuchi)

Sao sang repo còn thiếu theo phiếu AP1 mục 1: dựng iOS **không ký**, Simulator iPhone + iPad 13" ngôn ngữ `vi`, kiểm "còn chạy" **và** không có dấu hiệu lỗi khởi động, ảnh chụp làm bằng chứng, kiểm tĩnh Info.plist/entitlements/PrivacyInfo. Đổi khi sao: `runs-on: macos-26`, chọn `Xcode_26.6` ghim (thay đoạn `ls | sort -V`).

### 8.2. L2 - workflow dùng chung `tsudev-org/.github/.github/workflows/apple-ios-testflight.yml`

Bản chạy nằm ở `tsudev-org/.github` (PR `tsudev-org/.github#6`, `#7`; commit `179e7710c115adce84430655b0dfa916cb04a846`); bản sao để đọc: `templates/apple/apple-ios-testflight.reusable.yml`.
Các bước: kiểm Team ID ghim = `vars.APPLE_TEAM_ID` → chọn `Xcode_<xcode-version>` (chặn beta/RC, ≥ 26) → Flutter
ghim nhãn + commit → `rustup target add aarch64-apple-ios` nếu có Rust → kiểm tĩnh (Info.plist, PrivacyInfo, khai
mã hoá có mặt, deployment target trong [15.0, 16.0], bundle id) → tính phiên bản (8.4) → keychain tạm + `.p8` →
`flutter build ios --config-only` + `xcodebuild archive` (ký tự động qua khoá API) → kiểm archive (bundle, phiên bản,
TeamIdentifier, PrivacyInfo trong gói, arm64, phần mở rộng) → ExportOptions sinh lúc chạy → `-exportArchive`
`destination=upload` → log khi lỗi → dọn keychain + khoá `if: always()`.

Đổi workflow dùng chung (Xcode mới, bước mới) ⇒ PR ở `tsudev-org/.github` + cập nhật bản sao ở đây + từng repo đổi SHA
(Dependabot `github-actions` tự mở PR).

### 8.3. L2 - tệp gọi trong từng repo `.github/workflows/apple-testflight.yml`

Chép `templates/apple/apple-testflight.yml`, sửa khối `with:` theo `apple-apps.tsv` và `paths:` theo thư mục app.
`uses:` ghim SHA của commit đã gộp ở `tsudev-org/.github` (ghi ở phiếu AP2). `team-id-pin: ''` cho tới khi có
Apple Developer Program - tệp gọi vẫn được gộp trước, job tự bỏ qua.

### 8.4. Phiên bản và số build (khớp `VERSIONING.md`)

| Sự kiện | `CFBundleShortVersionString` | `CFBundleVersion` | TestFlight |
| :-- | :-- | :-- | :-- |
| Nhãn `vYY.M.DDNN` (phát hành) | `YY.M.DDNN` từ `pubspec.yaml` (phải = nhãn) | `YY.M.DDNN` | Nội bộ + có thể gửi ngoài / App Store |
| Push `main` / chạy tay (liên tục) | `YY.M.DD99` (ngày giờ Việt Nam) | `run_number + APPLE_BUILD_OFFSET` | `testFlightInternalTestingOnly = true` |

- `NN = 99` **dành riêng** cho bản liên tục; workflow chặn nhãn có `NN = 99`. Mỗi ngày một "train" riêng nên không đụng train đã duyệt (train đã lên App Store bị Apple đóng).
- Apple đòi phiên bản mới > bản **đã duyệt** (lỗi ITMS-90062): `YY.M.DD99` luôn lớn hơn mọi `YY.M.DDNN` cùng ngày hoặc trước đó (đã kiểm mục 17).

### 8.5. L3 - macOS (giữ cách của lotus-share)

`scripts/apple/nhap-khoa.sh` (keychain tạm) → `khoa-api.sh` (.p8) → `ky-cong-chung-macos.sh` (ký từ trong ra ngoài, Hardened Runtime, `--entitlements Release.entitlements`, **không** `--deep` khi ký Developer ID, DMG, `notarytool --wait`, `stapler`, `spctl`) → `xoa-khoa.sh`. Bước chỉ chạy khi `vars.APPLE_TEAM_ID != ''`; thiếu ⇒ ad-hoc như cũ. Job dùng bí mật phải thêm `environment: apple`.

### 8.6. Chuyển đổi lotus-share (phiên repo đó làm - R8)

1. Thêm `environment: apple` cho job macOS trong `release-lotus.yml` (bí mật chuyển từ repo sang environment).
2. Thay job `ios` trong `release-lotus.yml` bằng tệp gọi `apple-testflight.yml` (app-dir `app`, extension `com.tsudev.lotusshare.ShareExtension`, `flutter-version` 3.47.9) - tránh tải lên hai lần.
3. `tools/day-khoa-apple.sh` ⇒ dùng `setup_apple_signing.sh push --repos tsudev-org/lotus-share` (cùng tên bí mật, thêm environment).

---

## 9. CHUẨN HOÁ CẤU HÌNH APP (trước Pilot; một commit `chore(ios): chuẩn hoá cấu hình TestFlight`)

### 9.1. Tệp agent được sửa

`ios/Runner/Info.plist`, `ios/Runner/*.lproj/InfoPlist.strings`, `ios/Runner/PrivacyInfo.xcprivacy` (+ 4 dòng `project.pbxproj` gắn vào Resources như lotus-share), `ios/Podfile` (`platform :ios`), build setting `IPHONEOS_DEPLOYMENT_TARGET`, entitlements, `.gitignore`, `.gitattributes`, workflow ở mục 8, `docs/store/IDENTITY.md`, `docs/store/app-store.md`. Sửa mã Dart/Swift/Rust ⇒ nhánh `ci/fix-*` + PR.

### 9.2. Deployment target

| Hiện tại | Hành động |
| :-- | :-- |
| < 15.0 | Nâng lên 15.0 (đồng bộ `project.pbxproj`, `Podfile`, mọi target kể cả phần mở rộng) |
| 15.0 - 16.0 | Giữ |
| > 16.0 | **STOP** - iPhone 8 không cài được; hỏi 👤 |

### 9.3. Khai mã hoá xuất khẩu `ITSAppUsesNonExemptEncryption` (H6)

| App dùng | Giá trị | Ghi chú |
| :-- | :-- | :-- |
| Chỉ HTTPS/TLS và mã hoá của hệ điều hành Apple | `false` | |
| Thư viện mã hoá riêng (libsodium, ring, rustls, BoringSSL, WebRTC DTLS...) để bảo vệ dữ liệu/E2EE | `true` | 👤 trả lời bảng hỏi tuân thủ ở App Store Connect một lần; không tự khai thay |
| Không chắc | **STOP** | Hỏi 👤, ghi kết quả vào `docs/store/IDENTITY.md` |

Khoá **phải có mặt** (workflow chặn nếu thiếu) để TestFlight không kẹt "Missing Compliance".

### 9.4. Danh sách kiểm (App Review hay từ chối)

- `PrivacyInfo.xcprivacy` có trong `.app`, khai đủ "required reason API" theo mã thật (UserDefaults `CA92.1` gần như mọi app Flutter).
- Chuỗi xin quyền (`NS*UsageDescription`) cho MỌI API nhạy cảm, tiếng Anh ở `Info.plist` + tiếng Việt ở `vi.lproj/InfoPlist.strings`.
- Biểu tượng 1024×1024 **không** kênh alpha; tên hiển thị = `IDENTITY.md`.
- Không `aps-environment` nếu không dùng push; quyền đặc biệt đã được duyệt (H7).
- **Thanh toán Pro trong bản iOS:** chỉ qua **StoreKit** - Non-Renewing Subscription `com.tsudev.pro.nam`, ủng hộ `ung_ho_*` (`STORE_SUBMISSION` 4.1); màn mua theo `PRODUCT_POLICY` 3.7.3 (`ProPurchaseSheet` trong `tsudev_ui` v0.6.0). Bản App Store `MUST NOT` dẫn ra thanh toán web.
- Đăng nhập: tài khoản tsudev.com (OIDC) là tài khoản của chính hệ; nếu app thêm đăng nhập bằng dịch vụ bên thứ ba (Google...) ⇒ xem Hướng dẫn 4.8 (Sign in with Apple hoặc lựa chọn tương đương).
- **Xoá tài khoản ngay trong app** (Hướng dẫn 5.1.1(v)) - hệ đã có "xoá có xác minh".
- Thông tin cho người duyệt: tài khoản thử, mô tả quyền đặc biệt, `docs/store/app-store.md`.
- Ảnh: iPhone 6,9" và iPad 13" (2064×2752 hoặc 2048×2732) - lấy từ `apple.yml`.

### 9.5. WSL2 / Git

`git config --global core.autocrlf input`; `.gitattributes`: `* text=auto eol=lf`; `.gitignore` có `*.p8`, `*.p12`, `*.mobileprovision`, `*.certSigningRequest`, `*.key`, `AuthKey_*`. Kiểm: `git ls-files | grep -Ei '\.(p8|p12|mobileprovision|key|certSigningRequest)$|AuthKey_' && echo LỘ || echo sạch`.

---

## 10. TRÌNH TỰ THỰC THI (có cổng)

**Phase 0 - Môi trường.** `akb start`; `ListAgents`; `setup_apple_signing.sh doctor`; quét lại hiện trạng (mục 4) → cập nhật `apple-apps.tsv`. Đồng hồ lệch ⇒ `sudo hwclock -s`. *Cổng: doctor không lỗi.*

**Phase 1 - Việc 👤 (H1-H9).** In bảng mục 6, nhận đủ kết quả. *STOP tới khi đủ.*

**Phase 2 - Bí mật.** `init` → `cert-dist` → `backup` → `status`. *Cổng: status có Team ID + ngày hết hạn.*

**Phase 3 - Pilot (1 repo).** Đề xuất **sound-db** (không phần mở rộng, không quyền đặc biệt). Lotus-share để sau khi multicast được duyệt (AP1 mục 4.3 gợi ý lotus trước - đổi vì chờ duyệt multicast lâu; 👤 có thể chọn khác).

```bash
S=~/projects/tsudev-standards/tsudev-standards/scripts/apple/setup_apple_signing.sh; R=tsudev-org/sound-db
# (a) mục 9 cho repo (PrivacyInfo, khai mã hoá) - PR riêng, CI apple.yml xanh
$S register-bundles --repos $R            # 👤 tạo App Record nếu chưa có
$S push --repos $R && $S verify --repos $R
# (b) workflow dùng chung đã có ở tsudev-org/.github (mục 8.2) - lấy SHA ghi ở phiếu AP2
# (c) PR ở repo: apple-testflight.yml (mục 8.3) với team-id-pin = Team ID, SHA ở (b)
# (d) chạy tay và theo dõi
gh workflow run apple-testflight.yml -R $R --ref main
RUN=$(gh run list -R $R --workflow apple-testflight.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN" -R $R --exit-status --interval 30 || gh run view "$RUN" -R $R --log-failed | tail -n 200
$S builds com.tsudev.sounddb             # chờ 5-30 phút tới VALID
```

*Cổng Pilot (đủ cả 3):* (1) run `success`; (2) `builds` có bản `VALID`; (3) **👤 cài từ TestFlight trên iPhone 8 và mở được app**.

**Phase 4 - Theo đợt (≤ 3 repo).** Mỗi repo: mục 9 → `register-bundles` → 👤 App Record → `push` → `verify` → tệp gọi → chạy tay → `builds`. Hai repo liên tiếp lỗi nhóm C (mục 11) ⇒ dừng cả đợt.

**Phase 5 - Báo cáo** (mục 15) vào `logs/handover/` của phiếu điều phối + AKB.

**Phase 6 - Bảo trì** (mục 14).

---

## 11. XỬ LÝ LỖI

Lấy log: `gh run view <id> --log-failed | tail -n 200` hoặc artifact `xcodebuild-logs-*`. Phân loại **trước khi sửa**:

| Nhóm | Dấu hiệu | Hành động |
| :-: | :-- | :-- |
| A Mã | `error:` Dart/Swift/Rust, `PhaseScriptExecution failed` | Nhánh `ci/fix-*`, tối đa 5 vòng |
| B Cấu hình | thiếu PrivacyInfo/khai mã hoá, target ngoài khoảng, scheme, pod | Sửa theo mục 9, tối đa 3 vòng |
| C Danh tính Apple | `No profiles for`, `No Accounts with App Store Connect Access`, Team khác ghim, thiếu App Record, quyền chưa duyệt | **STOP**, báo 👤 kèm bảng dưới |
| D Hạ tầng | mất runner, mạng | `gh run rerun <id> --failed` **1** lần |
| E Nội dung | `ITMS-90683` (thiếu chuỗi quyền), `ITMS-90717` (icon alpha), privacy manifest | Sửa nếu là plist; cần thiết kế ⇒ hỏi 👤 |

| Triệu chứng | Nguyên nhân | Xử lý |
| :-- | :-- | :-- |
| `MAC verification failed` khi import `.p12` | `.p12` không tạo bằng script | `cert-dist --force` → `push` |
| HTTP 401 khi `init` | Individual Key, sai ID, đồng hồ WSL2 lệch | H2; `sudo hwclock -s`; `doctor` |
| Cấp chứng chỉ lỗi | Khoá không phải Admin; đủ số chứng chỉ | Khoá Admin; 👤 thu hồi cái không dùng (R3) |
| `vars.APPLE_TEAM_ID khác Team ID ghim` | Đổi tài khoản hoặc bị tráo | **STOP** |
| `No profiles for 'com.tsudev.x'` | Chưa đăng ký bundle, quyền đặc biệt chưa duyệt | `register-bundles`; H7 |
| Upload: không tìm thấy app | Chưa có App Record | H3 |
| `bundle version must be higher` / ITMS-90062 | Trùng số build / phiên bản ≤ bản đã duyệt | `gh variable set APPLE_BUILD_OFFSET --body <lớn hơn> -R <repo>`; nhãn mới `NN` lớn hơn |
| `ITMS-90725` / SDK không được nhận | Xcode < 26 | `xcode-version` ổn định mới hơn (mục 14) |
| `codesign` treo | thiếu `set-key-partition-list` | Dùng đúng mục 8.2 |
| Thiếu `Generated.xcconfig` | `flutter build ios --config-only` lỗi | Xem log `flutter pub get`, phiên bản Flutter ghim |
| Rust: lỗi biên dịch `aarch64-apple-ios` (vd `nix`/`libc`) | Phụ thuộc không hỗ trợ iOS | AP1 bài học 12 (bản vá `nix` ở lotus-share) |
| TestFlight "Missing Compliance" | Thiếu khoá mã hoá hoặc chưa trả lời bảng hỏi | Mục 9.3 |
| `Không có /Applications/Xcode_26.6.app` | Ảnh runner đổi | Đọc README `macos-26` của runner-images, cập nhật input `xcode-version` |

---

## 12. BẢO MẬT

| Rủi ro | Biện pháp |
| :-- | :-- |
| Lộ khoá API Admin (quyền rộng nhất) | Environment `apple` chỉ `main` + `v*`; không in; dọn `if: always()`; nghi lộ ⇒ 👤 thu hồi khoá ở App Store Connect → `init` khoá mới → `push` lại mọi repo |
| PR/fork đọc bí mật | Không `pull_request_target`; job có bí mật chỉ ở environment; `permissions: contents: read`; `persist-credentials: false` |
| Bí mật bị tráo trên GitHub | Team ID ghim trong tệp workflow (qua PR) + kiểm `TeamIdentifier` của chữ ký |
| Chuỗi cung ứng | Action ghim SHA; Flutter ghim nhãn + commit; không `actions/cache` trong job ký (chống đầu độc bộ nhớ đệm) |
| Lộ tệp trên máy | Kho khoá 700/600 ngoài repo; `.gitignore`; sao lưu mã hoá `age` |
| Log lộ thông tin | `xcodebuild` ghi ra tệp, chỉ in đuôi; artifact log 7 ngày; không bật `set -x` ở bước có bí mật |
| `.ipa` ra ngoài | Không upload `.ipa` đã ký làm artifact; không lên Release (R6) |

---

## 13. CHI PHÍ VÀ HẠN MỨC (0 đồng, trừ Apple 99 USD/năm đã duyệt)

- 5 repo Apple đều **công khai** ⇒ runner macOS chuẩn của GitHub **miễn phí**. Repo riêng tư: phút macOS tính hệ số 10 ⇒ **không** bật Apple CI nếu 👤 chưa đồng ý (`FREE_TIER_STACK`).
- Mặc định chỉ nhãn `v*` lên TestFlight; `APPLE_TESTFLIGHT_ON_PUSH=true` bật từng repo khi cần bản liên tục; `concurrency` xếp hàng, không huỷ giữa lúc tải lên.
- Codemagic/Xcode Cloud không dùng mặc định (Phụ lục B).

---

## 14. BẢO TRÌ VÀ LỊCH

| Khi | Việc |
| :-- | :-- |
| Hằng tháng | `status` (cảnh báo chứng chỉ < 30 ngày) |
| Chứng chỉ Distribution sắp hết hạn (~1 năm) | `cert-dist --force` → `push` mọi repo → 1 bản thử → 👤 quyết thu hồi cái cũ |
| Developer ID (~5 năm) | `csr-devid` mới (xoá khoá cũ có kiểm soát) → H8 → `import-devid` → `push` |
| Apple đổi yêu cầu SDK / runner đổi Xcode | Đọc trang "Upcoming requirements" của Apple + README `macos-26`/`macos-27` của runner-images; đổi `xcode-version`/`runner` ở workflow dùng chung (một PR cho cả hệ); chạy lại Pilot |
| Đổi/mất khoá `.p8` | `init` → `push` mọi repo |
| Thêm app mới có iOS | Dòng mới trong `apple-apps.tsv` → Phase 4 |

---

## 15. HOÀN THÀNH (DoD từng repo) VÀ BÁO CÁO

- [ ] Dòng `apple-apps.tsv` được 👤 xác nhận (Bundle ID, phần mở rộng)
- [ ] Mục 9 đạt: PrivacyInfo, khoá mã hoá đúng H6, target trong [15.0, 16.0], không tệp nhạy cảm trong git
- [ ] `apple.yml` xanh (Simulator iPhone + iPad, ảnh chụp)
- [ ] `verify` = OK (secrets, vars, App Record)
- [ ] `apple-testflight.yml` gọi workflow dùng chung theo SHA, Team ID ghim
- [ ] Run `success` + `builds` thấy bản `VALID`
- [ ] (Pilot) 👤 cài và mở được trên iPhone 8 qua TestFlight
- [ ] Phiếu/STATE của repo + AKB cập nhật

Mẫu báo cáo: `| Repo | Bundle | Secrets | App Record | apple.yml | TestFlight run | Build ASC | iPhone 8 | Ghi chú |`.

---

## 16. ĐÃ ÁP DỤNG Ở BỘ QUY ƯỚC v6.2.0 / v6.3.0

1. Tài liệu này + `scripts/apple/` + `templates/apple/`; trỏ từ `DISTRIBUTION_TRUST` 1.2/1.4, `STORE_SUBMISSION` 4.3,
   `AGENTS.md`, `00-INDEX.md`.
2. `VERSIONING.md`: `NN = 99` dành cho bản TestFlight liên tục; số build bản liên tục = `run_number + offset`.
3. Vai trò khoá API = **Admin** (Team Key) - thay câu "App Manager" ở hướng dẫn cũ (phiếu AP1 mục 2.3).
4. `tsudev-org/.github`: `apple-ios-testflight.yml`.
5. v6.3.0: mục 3.1 giai đoạn chuyển tiếp (PWA cho iPhone/iPad, DMG ad-hoc cho Mac) tới khi có H1; phiếu `20261125-AP3`.

---

## 17. KIỂM CHỨNG ĐÃ CHẠY (25/11/2026, Ubuntu WSL2, OpenSSL 3.5.5, Python 3)

| Phép kiểm | Kết quả |
| :-- | :-- |
| `bash -n` script (`scripts/apple/setup_apple_signing.sh`) | đạt |
| `init` với máy chủ App Store Connect giả lập kiểm chữ ký JWT ES256 (kid, iss, aud, hạn ≤ 20 phút) | đạt |
| `cert-dist`: CSR → cấp chứng chỉ → `.p12` (3DES + SHA1, MAC sha1) → trích Team ID; chạy lại ⇒ bỏ qua | đạt; mọi tệp 600, thư mục 700 |
| `csr-devid` + `import-devid`; `.cer` không khớp khoá ⇒ chặn; Team khác ⇒ chặn | đạt |
| `status` cảnh báo chứng chỉ < 30 ngày | đạt |
| `register-bundles` (app + phần mở rộng), `push --dry-run`, `builds` (đọc phiên bản + trạng thái) | đạt |
| Ca lỗi: issuer sai ⇒ 401 có mã lỗi; Key ID sai dạng; kho khoá trong `~/projects` ⇒ từ chối | đạt |
| YAML hai workflow (PyYAML), `bash -n` 12 khối `run`, mọi `uses` ghim SHA 40 ký tự, khớp `inputs` giữa tệp gọi và workflow dùng chung | đạt |
| Logic phiên bản: `YY.M.DD99` qua tháng/năm; so sánh với bản đã duyệt; chặn nhãn `NN=99`; so deployment target | đạt |
| **Chưa kiểm**: `shellcheck`/`actionlint` (chưa cài trên máy), `push`/`verify` thật (sửa repo thật), chạy trên runner macOS + tài khoản Apple thật | ⇒ Pilot Phase 3 |

---

## PHỤ LỤC A - WEBSITE / PWA TRÊN SAFARI (iPhone, iPad, Mac)

Cho website TsuDEV (`*.tsudev.com`) và bản web của app. Trước H1 đây là **kênh chính cho iPhone/iPad** (mục 3.1); sau H1 chạy song song app gốc. Không lách App Store:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#..." media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#..." media="(prefers-color-scheme: dark)">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png"><!-- 180×180, nền đặc -->
```

- `manifest.webmanifest`: `name`, `short_name`, `start_url`, `display: "standalone"`, icon 192/512 + `maskable`. **Không** `maximum-scale`/`user-scalable=no` (ACCESSIBILITY).
- Bố cục dùng `env(safe-area-inset-*)`; giữ CSP hiện có (icon/manifest tự host).
- Thông báo đẩy web trên iOS chỉ có từ iOS 16.4 và chỉ khi đã "Thêm vào Màn hình chính".
- Safari có thể xoá dữ liệu lưu cục bộ của trang ít dùng ⇒ app web E2EE phải có sao lưu ra tệp/đồng bộ, không coi IndexedDB là nơi lưu duy nhất.
- Logo Bộ Công Thương chỉ trên tên miền được duyệt (`PRODUCT_POLICY` 3.7.5).

## PHỤ LỤC B - CODEMAGIC, XCODE CLOUD (không mặc định)

- **Codemagic:** cấu hình qua web + tích hợp App Store Connect bằng cùng khoá API; hạn mức miễn phí phải kiểm lúc dùng, vượt là trả phí (R13). Chỉ dùng khi 👤 đồng ý; tên bí mật vẫn theo mục 7.2.
- **Xcode Cloud:** gắn với Apple, có giờ dựng kèm gói thành viên (kiểm con số hiện hành); thêm một nơi giữ quyền ký ngoài GitHub, thiết lập ban đầu phụ thuộc Xcode. Chỉ cân nhắc khi GitHub Actions không đáp ứng.

## PHỤ LỤC C - LỆNH NHANH

```bash
S=~/projects/tsudev-standards/tsudev-standards/scripts/apple/setup_apple_signing.sh
R=tsudev-org/sound-db; MA=sounddb; RUN=1234567890                    # thay theo repo / lần chạy
$S doctor; $S status
$S push --dry-run; $S verify
$S builds "com.tsudev.$MA"
gh run list -R "$R" --workflow apple-testflight.yml --limit 5
gh run view "$RUN" -R "$R" --log-failed | tail -n 200
gh run rerun "$RUN" -R "$R" --failed
gh variable set APPLE_TESTFLIGHT_ON_PUSH --body true -R "$R"
```

## PHỤ LỤC D - NGUỒN (kiểm 25/11/2026)

- Apple - SDK minimum requirements (Xcode 26 / SDK 26 từ 28/04/2026): https://developer.apple.com/news/upcoming-requirements/?id=04282026a
- runner-images `macos-26` (Xcode 26.6 mặc định, Xcode 27 bản xem trước): https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md
- GitHub - secret cấp org không tới repo riêng tư trên gói Free: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- Trong hệ: phiếu `logs/handover/20261119-AP1_*`, `20261125-AP2_*`, `lotus-share/docs/vi/APPLE-IOS-MACOS.md`, `tsudev-standards` `DISTRIBUTION_TRUST.md`, `STORE_SUBMISSION.md`, `VERSIONING.md`, `SECURITY_BASELINE.md`, `PRODUCT_POLICY.md` 2.1, 3.7.
