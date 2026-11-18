# CHÍNH SÁCH SẢN PHẨM TOÀN HỆ TSUDEV (v1.0.1)

> Áp dụng cho MỌI phần mềm / tool / app / trò chơi / website sản phẩm của hệ sinh thái TsuDEV, ở mọi giai đoạn xây
> dựng và phát triển. Quyết định của chủ dự án ngày **19/11/2026**. Tài liệu này nói **sản phẩm phải như thế nào**;
> cách đưa sản phẩm tới người dùng không bị chặn ở [`DISTRIBUTION_TRUST.md`](DISTRIBUTION_TRUST.md); cách agent hỗ
> trợ điền hồ sơ nộp duyệt ở [`STORE_SUBMISSION.md`](STORE_SUBMISSION.md).

## Mục lục

1. Mặc định khi cài lần đầu: ngôn ngữ và giao diện theo hệ thống
2. Nền tảng: thứ tự ưu tiên và kế hoạch iOS
3. Không quảng cáo - chỉ gói Pro và Ủng hộ
4. Huy hiệu Pro / Ủng hộ
5. Website của từng sản phẩm: hình ảnh và video
6. Kiến trúc và bảo mật - mức tối thiểu cho mọi sản phẩm
7. Checklist nghiệm thu

---

## 1. Mặc định khi cài lần đầu: ngôn ngữ và giao diện theo hệ thống

1. **Ngôn ngữ:** lần chạy đầu (chưa có lựa chọn đã lưu) sản phẩm `MUST` dùng **ngôn ngữ của hệ điều hành / trình
   duyệt** (`Accept-Language`, `navigator.languages`, `Locale.getDefault()`, `GetUserDefaultUILanguage`,
   `QLocale::system()`, `Platform.localeName`...).
   - Hệ thống dùng ngôn ngữ sản phẩm CHƯA hỗ trợ ⇒ dùng **tiếng Anh** nếu có, không thì **tiếng Việt**.
   - Mọi sản phẩm `MUST` có tối thiểu **tiếng Việt + tiếng Anh**; chuỗi giao diện nằm trong tệp dịch (ARB, `.resx`,
     `.ts` của Qt, JSON i18n...), `MUST NOT` viết cứng trong mã.
   - Người dùng đổi ngôn ngữ trong Cài đặt ⇒ lưu lại và thắng ngôn ngữ hệ thống từ đó. Có lựa chọn "Theo hệ thống"
     để quay về hành vi mặc định.
   - Website: chỉ tự chọn theo `Accept-Language` ở lần vào đầu; KHÔNG chuyển hướng ép buộc theo IP.
2. **Giao diện (màu):** lần chạy đầu `MUST` là **Hệ thống** - đi theo chế độ sáng/tối của hệ điều hành và đổi ngay
   khi hệ điều hành đổi. Thay mặc định "Tối" của v3.4.0 (`DESIGN_SYSTEM.md` mục 1, `ECOSYSTEM_IDENTITY.md` mục 4.1).
   Người dùng chọn Sáng/Tối ⇒ lưu lại.
3. Định dạng ngày giờ, số, tiền tệ theo ngôn ngữ đang hiển thị (tiếng Việt vẫn theo `DESIGN_SYSTEM.md` mục 4).
4. Test bắt buộc: một test khởi động với ngôn ngữ hệ thống `vi`, `en` và một ngôn ngữ chưa hỗ trợ (ví dụ `ja`) ⇒
   giao diện đúng thứ tự ở khoản 1; một test chế độ hệ thống sáng/tối ⇒ đúng bảng màu.

## 2. Nền tảng: thứ tự ưu tiên và kế hoạch iOS

Mục tiêu: **cài được trên mọi hệ điều hành máy tính (Windows, Linux, macOS) và mọi điện thoại (Android, iOS) mà
không bị cảnh báo, cách ly hay tự xoá tệp.** Cách đạt từng nền tảng: `DISTRIBUTION_TRUST.md`.

| Nền tảng | Trạng thái 19/11/2026 | Việc trong giai đoạn hiện tại |
| --- | --- | --- |
| Android | Có tài khoản **Google Play Console** | Phát hành Play (AAB). Tài khoản cá nhân mới phải chạy **thử nghiệm kín** trước khi lên bản chính thức - xem `STORE_SUBMISSION.md` mục 4.1 |
| Windows | Microsoft Store tài khoản cá nhân 0 đồng | MSIX lên Store + winget/Scoop |
| Linux | Có kho APT/RPM ký GPG | Gói `.deb`/`.rpm`, Flathub cho app có giao diện |
| macOS, iOS | **Chưa có máy Mac, chưa có Apple Developer Program** - dự kiến **đầu 2027** | Phát triển và kiểm thử đầy đủ ngay bây giờ (mục 2.1); nộp App Store/notarize khi có Mac + tài khoản |

### 2.1. iOS: phát triển ngay, nộp đầu 2027

Điều cấp bách nhất là **sản phẩm hoàn chỉnh**. Mọi app có bản di động `MUST` được phát triển cho iOS song song với
Android, không đợi có Mac:

- Mã đa nền tảng (Flutter/Rust/Kotlin Multiplatform/React Native) có thư mục `ios/` dựng được; bundle id
  `com.tsudev.<ten>` cố định; `PrivacyInfo.xcprivacy` khai đủ; không dùng API riêng của Apple.
- **Dựng iOS trên CI macOS** (GitHub Actions `macos-*`, chỉ cho repo CÔNG KHAI vì repo riêng tư bị tính phút nhân 10 -
  trái `FREE_TIER_STACK.md`): `flutter build ios --no-codesign` / `xcodebuild ... CODE_SIGNING_ALLOWED=NO`, chạy test
  trên simulator. Repo riêng tư: dựng iOS chỉ khi chủ dự án đồng ý (đo phút còn lại trước).
- **Thử trên iPhone thật qua cáp** (máy tính này chạy Windows + WSL, chưa có Mac). Chưa có tài khoản trả phí thì Apple
  chỉ cho ký bằng **Apple ID miễn phí** (chứng chỉ phát triển cá nhân): app hết hạn sau **7 ngày**, tối đa **3 app**
  cài cùng lúc, cần bật **Developer Mode** trên iPhone. Quy trình (agent kiểm lại công cụ còn hỗ trợ trước khi làm):
  1. CI macOS dựng tệp `.ipa` KHÔNG ký (artifact của workflow, không đăng lên Release).
  2. 👤 Cắm iPhone vào máy Windows bằng cáp, tin cậy máy tính; dùng công cụ ký-cài bằng Apple ID cá nhân chạy trên
     Windows (ví dụ Sideloadly hoặc AltServer) để ký lại `.ipa` bằng Apple ID của 👤 và cài lên máy. Mật khẩu Apple
     ID chỉ 👤 nhập - agent `MUST NOT` nhận hay lưu.
  3. Từ WSL, nếu cần đọc log thiết bị: chuyển USB vào WSL bằng `usbipd-win` rồi dùng `libimobiledevice`
     (`idevicesyslog`). Không bắt buộc.
  4. Ghi kết quả thử (máy, iOS, ngày, lỗi) vào `logs/` của repo.
- `MUST NOT`: chứng chỉ doanh nghiệp, dịch vụ "ký IPA" bên thứ ba, phân phối `.ipa` cho người khác cài. Bản ký bằng
  Apple ID miễn phí chỉ để 👤 thử trên máy của chính mình.
- Đến khi có Mac + tài khoản (đầu 2027): ký/nộp TestFlight → App Store theo `STORE_SUBMISSION.md` mục 4.3; macOS
  notarize theo `DISTRIBUTION_TRUST.md` mục 1.2.

## 3. Không quảng cáo - chỉ gói Pro và Ủng hộ

1. Sản phẩm TsuDEV `MUST NOT` gắn quảng cáo dưới mọi hình thức: SDK quảng cáo (AdMob, Meta Audience Network, Unity Ads,
   AppLovin...), quảng cáo xen kẽ / thưởng / biểu ngữ, liên kết tiếp thị liên kết, theo dõi quảng cáo (IDFA/AAID,
   `com.google.android.gms.permission.AD_ID`). Repo đang có SDK quảng cáo `MUST` gỡ ở bản phát hành kế tiếp.
   - Lý do: không quảng cáo thì không cần quyền theo dõi, tờ khai An toàn dữ liệu và nhãn quyền riêng tư gọn hơn, ít lý
     do bị cửa hàng/antivirus từ chối hơn, và sản phẩm không phát sinh chi phí vận hành quảng cáo.
   - Tờ khai cửa hàng: Play Console "Ứng dụng có chứa quảng cáo không?" = **Không**; App Store nhãn quyền riêng tư không
     có mục "Quảng cáo của bên thứ ba".
2. **Nguồn thu duy nhất** là:
   - **Gói Pro** theo **tháng** hoặc **năm** (thuê bao, tự gia hạn, huỷ bất cứ lúc nào). Tính năng cốt lõi `MUST` dùng
     được miễn phí; Pro chỉ mở tính năng nâng cao. Không có "mua một lần" trừ khi chủ dự án quyết riêng.
   - **Nút Ủng hộ (Donate)**: tự nguyện, không bắt buộc, không làm phiền (không popup nhắc, không đếm ngược).
3. **Thanh toán đúng kênh của từng nền tảng** (vi phạm là lý do bị gỡ app hay gặp nhất):

   | Nơi người dùng mua | Pro (thuê bao) | Ủng hộ |
   | --- | --- | --- |
   | App tải từ **Google Play** | **Google Play Billing** (subscription, gói tháng + gói năm cùng một sản phẩm) | **Google Play Billing** (sản phẩm tiêu hao "Ủng hộ") - đã chốt 19/11/2026, mục 4.3 |
   | App từ **App Store** (2027) | **In-App Purchase** auto-renewable | IAP (tip) hoặc ẩn hẳn - theo phiếu `20261112-02` |
   | Website, app desktop tải trực tiếp, winget/Scoop/APT/Homebrew, APK ngoài Play | Thanh toán trên **tsudev.com** (VietQR có xác nhận tự động/thủ công), không nhúng cổng thanh toán vào app | Trang `tsudev.com/ung-ho` (VietQR) |
   | Microsoft Store | App desktop được dùng thanh toán ngoài: mở trang tsudev.com | Như website |

4. **Tài khoản là nguồn sự thật về quyền lợi.** Quyền Pro / huy hiệu gắn với **tài khoản TsuDEV** (đăng nhập OIDC qua
   `tsudev.com`), KHÔNG gắn với thiết bị:
   - Máy chủ quyền lợi (entitlement) ở hạ tầng tsudev.com lưu `pro_until`, `pro_source` (`play` | `appstore` | `web`),
     `donor_since`, `badge_display`.
   - Giao dịch Play/App Store `MUST` được **xác minh phía máy chủ** (Google Play Developer API + thông báo thời gian
     thực RTDN; App Store Server API + Server Notifications v2) trước khi cấp quyền; app không tự tin biên nhận cục bộ.
   - App nhận quyền qua token đã ký (claim trong ID token / endpoint `/me/entitlements`), lưu đệm có hạn để chạy offline
     (tối đa 7 ngày), hết hạn thì về miễn phí - KHÔNG xoá dữ liệu người dùng.
   - Không có tài khoản vẫn dùng được bản miễn phí; Pro/huy hiệu cần đăng nhập.
5. Hiển thị giá: theo giá cửa hàng trả về (Play/App Store tự quy đổi tiền tệ); trên web hiển thị VNĐ đã gồm thuế.
   Điều khoản thuê bao (giá, chu kỳ, tự gia hạn, cách huỷ) `MUST` hiện TRƯỚC nút mua - yêu cầu của cả Google và Apple.
6. Hoàn tiền, huỷ: theo chính sách của kênh mua; ghi rõ ở trang Điều khoản của tsudev.com.

## 4. Huy hiệu Pro / Ủng hộ

### 4.1. Ai có huy hiệu gì

| Trạng thái tài khoản | Huy hiệu mặc định | Người dùng chọn được |
| --- | --- | --- |
| Chỉ Pro (còn hạn) | **Pro** | Hiện / ẩn |
| Chỉ đã Ủng hộ | **Ủng hộ** | Hiện / ẩn |
| Pro + Ủng hộ | **Cả hai** (Pro trước, Ủng hộ sau) | `Pro` · `Ủng hộ` · `Cả hai` · `Ẩn` |
| Không | - | - |

- Lựa chọn lưu ở máy chủ quyền lợi (`badge_display`), đồng bộ mọi app và website. Cài đặt nằm ở **Tài khoản → Huy
  hiệu**, có xem trước trực tiếp.
- Huy hiệu hiện **ngay sau tên tài khoản** ở mọi chỗ tên xuất hiện: đầu trang/menu tài khoản, trang hồ sơ, bình luận,
  danh sách thành viên. KHÔNG hiện cho người khác những gì người dùng đã chọn ẩn.
- Pro hết hạn ⇒ huy hiệu Pro tắt; huy hiệu Ủng hộ là **vĩnh viễn** sau lần ủng hộ đã xác nhận đầu tiên.

### 4.2. Thiết kế (dùng chung - một component cho web, một cho Flutter/desktop)

- **Kích thước:** cao bằng **0,75 × chiều cao dòng** của tên đi kèm, tối thiểu 16 px, tối đa 20 px; bo tròn hoàn toàn
  (pill); khoảng cách tới tên 4-6 px; không đẩy tên xuống dòng (ẩn bớt chữ của tên trước, giữ nguyên huy hiệu).
- **Pro:** nền chuyển sắc **xanh lơ → xanh dương của logo** (`#30C8F0` → `#1E90FF`), chữ `PRO` đậm chữ hoa, mực tương
  phản ≥ 4.5:1 ở cả Sáng và Tối; hiệu ứng **ánh sáng lướt qua** (shimmer) chậm, một lần mỗi 6-8 giây.
- **Ủng hộ:** biểu tượng trái tim + chữ `Ủng hộ` (bản tiếng Anh `Supporter`), nền xanh ngọc nhạt / viền xanh ngọc
  (`icon-trust` của bảng token), trái tim **đập nhẹ** khi rê chuột/chạm.
- **Chuyển động:** tôn trọng `prefers-reduced-motion` / "Giảm chuyển động" của hệ điều hành ⇒ tắt shimmer và nhịp đập;
  không nhấp nháy quá 3 lần/giây (WCAG 2.3.1).
- **Truy cập:** huy hiệu có nhãn đọc màn hình (`aria-label="Tài khoản Pro"`, `"Đã ủng hộ TsuDEV"`); không dùng màu
  làm tín hiệu duy nhất (có chữ/biểu tượng).
- Tài sản: SVG trong `assets/badges/` của bộ quy ước (khi có), token màu từ bảng chuẩn - repo con KHÔNG tự vẽ bản riêng.

### 4.3. Ràng buộc cửa hàng (đọc kỹ - đổi so với phiếu 20261112-02)

Phiếu `20261112-02` dựa trên điều kiện ủng hộ **không mở khoá gì** để được đặt liên kết ủng hộ ngoài Play. Huy hiệu
Ủng hộ là một quyền lợi số (dù chỉ hiển thị), nên:

- **Website, desktop tải trực tiếp, APK ngoài Play, Microsoft Store:** ủng hộ qua `tsudev.com/ung-ho` (VietQR có mã nội
  dung chuyển khoản gắn với tài khoản, ví dụ `TSU <mã-ngắn>`); chủ dự án xác nhận trong trang quản trị (0 đồng) hoặc
  webhook ngân hàng khi có giải pháp 0 đồng cố định ⇒ cấp huy hiệu.
- **App từ Google Play - ĐÃ CHỐT (chủ dự án 19/11/2026): Google Play Billing.** Nút Ủng hộ trong bản Play `MUST` dùng
  sản phẩm tiêu hao "Ủng hộ" (vài mức) của Play Billing; biên nhận xác minh phía máy chủ rồi mới cấp huy hiệu. Bản Play
  `MUST NOT` có liên kết/QR ủng hộ ra web (thay quy tắc "nút mở trang web" của phiếu `20261112-02` cho riêng bản Play).
  Lý do chọn: phương án "giữ liên kết web, không nhắc huy hiệu" vẫn để tài khoản nhận huy hiệu từ khoản tiền ngoài Play
  rồi hiện trong app Play - Google có thể coi là lách billing; Play Billing không có rủi ro đó, đổi lại Google thu phí
  dịch vụ trên khoản ủng hộ.
- **App Store (2027):** chỉ IAP; không có liên kết ủng hộ ra ngoài.
- Huy hiệu có được từ bất kỳ kênh nào vẫn **hiển thị** ở mọi app (đó là dữ liệu tài khoản, không phải mua trong app).
- Phiên phát hành bản di động `MUST` đọc lại chính sách thanh toán của Google/Apple và ghi ngày đối chiếu (như phiếu
  `20261112-02` mục 4). Đây không phải tư vấn pháp lý.

## 5. Website của từng sản phẩm: hình ảnh và video

Mọi website sản phẩm (`<ten>.tsudev.com`) `MUST` giới thiệu bằng hình, không chỉ bằng chữ:

| Khối | Tối thiểu | Ghi chú |
| --- | --- | --- |
| Hero | Ảnh chụp màn hình thật hoặc video/GIF ngắn của app đang chạy, cạnh tên + câu mô tả | Ảnh Sáng/Tối theo giao diện đang chọn (`<picture>` + `data-theme`) |
| Tính năng | Mỗi tính năng chính 1 ảnh/clip (3-6 tính năng) | Bố cục so le chữ - ảnh để cuộn không nhàm |
| Video giới thiệu | 1 video 30-90 giây | Tự lưu trữ (R2/GitHub Release) dạng MP4 H.264 + WebM, có `poster`, phụ đề `.vtt` tiếng Việt; nhúng YouTube chỉ khi dùng `youtube-nocookie.com` và CSP cho phép |
| Nền tảng | Ảnh trên từng nền tảng hỗ trợ (desktop, điện thoại) | Khung thiết bị đơn giản, không dùng ảnh nhãn hiệu thiết bị khi không được phép |
| Tải về | Biểu tượng nền tảng + nút tải / nút cửa hàng chính thức (huy hiệu Google Play, Microsoft Store đúng hướng dẫn thương hiệu của họ) | |

Kỹ thuật bắt buộc:

- Ảnh AVIF/WebP + PNG dự phòng, có `width`/`height` (không nhảy bố cục), `loading="lazy"` trừ ảnh hero, `alt` mô tả
  đúng nội dung. Video `preload="none"` hoặc `metadata`, `muted playsinline` nếu tự phát, KHÔNG tự phát có tiếng.
- Chuyển động khi cuộn (hiện dần) nhẹ, tắt khi `prefers-reduced-motion`.
- Ảnh chụp màn hình KHÔNG chứa dữ liệu thật của người dùng, khoá, token, email cá nhân.
- Cùng bộ ảnh dùng lại cho hồ sơ cửa hàng (Play: ảnh điện thoại ≥ 2 tấm, ảnh nổi bật 1024×500; Microsoft Store; App
  Store 2027) - lưu nguồn ở `docs/store/` hoặc `assets/store/` của repo.
- Trang tsudev.com/apps lấy ảnh đại diện sản phẩm từ website sản phẩm (đường dẫn cố định, ví dụ `/og.png`).

## 6. Kiến trúc và bảo mật - mức tối thiểu cho mọi sản phẩm

Không thay thế [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) và `DISTRIBUTION_TRUST.md` mục 4; nhắc lại các điểm mọi
sản phẩm `MUST` có từ phiên bản đầu, không để "làm sau":

- Kiến trúc tách lớp: giao diện ↔ lõi nghiệp vụ (thuần, có test) ↔ hạ tầng (mạng, lưu trữ, nền tảng). Lõi không phụ
  thuộc nền tảng để dùng lại cho Android/iOS/desktop/web.
- Dữ liệu nhạy cảm mã hoá khi lưu (Keystore/Keychain/DPAPI; E2EE khi có đồng bộ); chỉ TLS; ghim khoá ký cập nhật.
- Đăng nhập dùng OIDC của tsudev.com (PKCE, không client secret trong app); quyền lợi theo mục 3.4.
- Chuỗi cung ứng: phụ thuộc ghim phiên bản + lockfile, Dependabot, cổng audit trong CI, gitleaks, CodeQL, SBOM,
  Sigstore, chứng thực nguồn gốc dựng.
- Không thu thập dữ liệu khi chưa đồng ý; không SDK theo dõi bên thứ ba; báo lỗi (crash) chỉ khi người dùng bật.

## 7. Checklist nghiệm thu

- [ ] Lần chạy đầu: ngôn ngữ = ngôn ngữ hệ thống (dự phòng EN rồi VI), giao diện = Hệ thống; có test (mục 1.4).
- [ ] Có tiếng Việt + tiếng Anh, không chuỗi viết cứng.
- [ ] Không SDK quảng cáo, không quyền `AD_ID`; tờ khai cửa hàng "không quảng cáo".
- [ ] Pro tháng/năm qua đúng kênh (mục 3.3); quyền lợi xác minh phía máy chủ; hết hạn không mất dữ liệu.
- [ ] Huy hiệu Pro/Ủng hộ đúng bảng 4.1, có lựa chọn hiển thị, tôn trọng giảm chuyển động.
- [ ] Bản Play: ủng hộ cấp huy hiệu đi qua Play Billing (mục 4.3).
- [ ] Có thư mục `ios/` dựng được trên CI macOS (app di động); kết quả thử trên iPhone thật ghi ở `logs/`.
- [ ] Website sản phẩm có hero có hình, ảnh từng tính năng, video giới thiệu, ảnh theo nền tảng (mục 5).
