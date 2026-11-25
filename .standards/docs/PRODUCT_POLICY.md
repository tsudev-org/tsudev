# CHÍNH SÁCH SẢN PHẨM TOÀN HỆ TSUDEV (v1.3.0)

> Áp dụng cho MỌI phần mềm / tool / app / trò chơi / website sản phẩm của hệ sinh thái TsuDEV, ở mọi giai đoạn xây
> dựng và phát triển. Quyết định của chủ dự án ngày **19/11/2026**. Tài liệu này nói **sản phẩm phải như thế nào**;
> **v1.3.0 (25/11/2026, phiếu `20261125-PRO3`)**: mọi sản phẩm miễn phí, mã nguồn mở; **Pro là gói KHÔNG bắt buộc để
> ủng hộ tác giả** - quyền lợi, lời mời mua, màn thanh toán và nghĩa vụ pháp lý ở **mục 3.7**.
> cách đưa sản phẩm tới người dùng không bị chặn ở [`DISTRIBUTION_TRUST.md`](DISTRIBUTION_TRUST.md); cách agent hỗ
> trợ điền hồ sơ nộp duyệt ở [`STORE_SUBMISSION.md`](STORE_SUBMISSION.md).

## Mục lục

1. Mặc định khi cài lần đầu: ngôn ngữ và giao diện theo hệ thống
2. Nền tảng: thứ tự ưu tiên và kế hoạch iOS
3. Không quảng cáo - chỉ gói Pro và Ủng hộ (3.7: Pro là gói tự nguyện ủng hộ tác giả)
4. Huy hiệu Pro / Ủng hộ
5. Website của từng sản phẩm: hình ảnh và video
6. Kiến trúc và bảo mật - mức tối thiểu cho mọi sản phẩm
7. Lưu cục bộ mặc định - đồng bộ/sao lưu đám mây là Pro
8. Checklist nghiệm thu

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
   - **Gói Pro** theo **kỳ 1 năm**, **không tự gia hạn** - người dùng chủ động gia hạn, gia hạn sớm được cộng dồn thời
     hạn (quyết định chủ dự án 20/11/2026, mục 7.2). Tính năng cốt lõi `MUST` dùng được miễn phí; Pro chỉ mở tính năng
     nâng cao. Không có "mua một lần" trừ khi chủ dự án quyết riêng.
   - **Nút Ủng hộ (Donate)**: tự nguyện, không bắt buộc, không làm phiền (không popup nhắc, không đếm ngược).
   - Gói, giá, mã sản phẩm cửa hàng và phần nào là Pro (đồng bộ/sao lưu đám mây luôn là Pro): mục 7. Ngoại lệ duy
     nhất được nhắc bằng hộp thoại là thông báo "nhiều thiết bị chưa có Pro" ở mục 7.3 và nhắc gia hạn / hết kỳ Pro ở
     mục 7.6.
3. **Thanh toán đúng kênh của từng nền tảng** (vi phạm là lý do bị gỡ app hay gặp nhất):

   | Nơi người dùng mua | Pro (kỳ 1 năm, không tự gia hạn) | Ủng hộ |
   | --- | --- | --- |
   | App tải từ **Google Play** | **Google Play Billing** (thuê bao `tsudev_pro`, gói cơ sở **trả trước** `nam` P1Y - không tự gia hạn, gia hạn bằng nạp thêm) | **Google Play Billing** (sản phẩm tiêu hao "Ủng hộ") - đã chốt 19/11/2026, mục 4.3 |
   | App từ **App Store** (2027) | **In-App Purchase** Non-Renewing Subscription | IAP (tip) hoặc ẩn hẳn - theo phiếu `20261112-02` |
   | Website, app desktop tải trực tiếp, winget/Scoop/APT/Homebrew, APK ngoài Play | Thanh toán trên **tsudev.com** (VietQR có xác nhận tự động/thủ công), không nhúng cổng thanh toán vào app | Trang `tsudev.com/ung-ho` (VietQR) |
   | Microsoft Store | App desktop được dùng thanh toán ngoài: mở trang tsudev.com | Như website |

4. **Tài khoản là nguồn sự thật về quyền lợi.** Quyền Pro / huy hiệu gắn với **tài khoản TsuDEV** (đăng nhập OIDC qua
   `tsudev.com`), KHÔNG gắn với thiết bị:
   - Máy chủ quyền lợi (entitlement) ở hạ tầng tsudev.com lưu `pro_until`, `pro_source` (`play` | `appstore` | `web`),
     `donor_since`, `badge_display`.
   - Giao dịch Play/App Store `MUST` được **xác minh phía máy chủ** (Google Play Developer API + thông báo thời gian
     thực RTDN; App Store Server API + Server Notifications v2) trước khi cấp quyền; app không tự tin biên nhận cục bộ.
   - App nhận quyền qua token đã ký (JWS quyền lợi, định dạng ở mục 7.4), lưu đệm có hạn để chạy offline (tối đa 7
     ngày), hết hạn thì về miễn phí - KHÔNG xoá dữ liệu người dùng.
   - Không có tài khoản vẫn dùng được bản miễn phí; Pro/huy hiệu cần đăng nhập.
5. Hiển thị giá: theo giá cửa hàng trả về (Play/App Store tự quy đổi tiền tệ); trên web hiển thị VNĐ đã gồm thuế.
   Điều khoản (giá, thời hạn 1 năm, không tự gia hạn, điều gì xảy ra khi hết hạn) `MUST` hiện TRƯỚC nút mua - yêu cầu
   của cả Google và Apple; nội dung nguyên văn ở mục 7.5.
6. Hoàn tiền, huỷ: theo chính sách của kênh mua; ghi rõ ở trang Điều khoản của tsudev.com.

### 3.7. Pro là gói tự nguyện ủng hộ tác giả (v1.3.0 - chủ dự án 25/11/2026, phiếu `20261125-PRO3`)

**Định hướng:** mọi phần mềm/tool/app/trò chơi TsuDEV **miễn phí, mã nguồn mở, không quảng cáo**, để cộng đồng dùng và
đóng góp trên GitHub. Không ai phải mua gì để dùng đủ tính năng cốt lõi. **TsuDEV Pro** (490.000 ₫ / 1 năm, mục 7.2) là
cách người dùng **tự chọn** ủng hộ tác giả và dự án; đổi lại tài khoản nhận vài quyền lợi **thêm**, không lấy đi gì của
bản miễn phí.

#### 3.7.1. Quyền lợi Pro - danh sách đóng

| Mã | Quyền lợi | Nơi kiểm | Ghi chú |
| --- | --- | --- | --- |
| **Q1** | **Huy hiệu Pro** cạnh tên tài khoản ở mọi app/website (mục 4) | Máy chủ quyền lợi tsudev.com (JWS `badge`) | Ẩn/hiện được |
| **Q2** | **Giao diện Pro**: bộ chủ đề màu bổ sung, biểu tượng app thay thế (nơi nền tảng hỗ trợ), khung ảnh đại diện | Trong app, theo JWS quyền lợi | 5 chủ đề trong `tokens/pro-themes.json` (`DESIGN_SYSTEM.md` mục 1.3) qua `tsudev_ui` / `@tsudev/ui`; repo không tự chế |
| **Q3** | **Đồng bộ + sao lưu đám mây** mã hoá đầu cuối (mục 7) | Máy chủ đồng bộ (`402 pro_required`) | Lý do có phí thật: chỉ Pro tốn dung lượng máy chủ (N7) |

- Thêm quyền lợi riêng của một sản phẩm ⇒ ADR của repo + chủ dự án duyệt, và nó `MUST` là **tiện nghi thêm**, không
  phải tính năng cốt lõi đang/sắp có ở bản miễn phí.
- `MUST` miễn phí mãi, KHÔNG bao giờ là Pro: chế độ Sáng/Tối/Hệ thống, cỡ chữ, tương phản cao, giảm chuyển động, mọi hỗ
  trợ tiếp cận (`ACCESSIBILITY.md`), ngôn ngữ, xuất/nhập/sao lưu **ra tệp**, bảo mật (khoá app, mã hoá cục bộ), cập
  nhật bảo mật.
- Giao diện Pro chỉ **thêm** lựa chọn. `MUST NOT` làm giao diện miễn phí kém đi (không làm mờ, không chèn khung khoá,
  không watermark, không gắn chữ "nâng cấp" lên mọi nút). Chủ đề Pro vẫn đạt tương phản WCAG như bảng chính.
- Huy hiệu Pro `MUST NOT` dùng dấu tích/khiên hay chữ "Đã xác minh" - Pro không phải xác minh danh tính.

#### 3.7.2. Mời mua - không thao túng

- Lối vào Pro chỉ ở: **Tài khoản / Cài đặt**, màn **Giới thiệu**, trang `tsudev.com/pro`, và hai hộp thoại đã duyệt
  (mục 7.3, 7.6). `MUST NOT` chèn lời mời Pro giữa luồng làm việc chính, màn khởi động, thông báo đẩy, email tiếp thị.
- `MUST NOT`: đếm ngược, "giảm giá chỉ hôm nay", giá gạch giả, nút "Không, tôi không muốn ủng hộ" kiểu bêu riếu
  (confirmshaming), chọn sẵn Pro, ẩn nút đóng.
- Giá hiển thị đủ và một lần: **490.000 ₫ / 1 năm, đã gồm thuế** (web) hoặc giá cửa hàng trả về (Play/App Store).

#### 3.7.3. Màn mua - nội dung bắt buộc (mọi kênh)

Theo thứ tự, TRƯỚC nút thanh toán:

1. **Câu định vị** (nguyên văn):
   - vi: "Mọi ứng dụng TsuDEV miễn phí và mã nguồn mở. TsuDEV Pro không bắt buộc: bạn chọn Pro để ủng hộ tác giả duy
     trì và phát triển dự án, đổi lại tài khoản nhận thêm các quyền lợi dưới đây."
   - en: "Every TsuDEV app is free and open source. TsuDEV Pro is optional: choose Pro to support the author in
     maintaining and developing the project, and your account gets the extra benefits below."
2. Danh sách quyền lợi **đang hoạt động thật** (Q1-Q3; quyền lợi chưa làm xong `MUST NOT` hiện).
3. Điều khoản kỳ hạn nguyên văn mục 7.5 + liên kết **Chính sách thanh toán, hoàn tiền và khiếu nại**
   (`tsudev.com/chinh-sach-thanh-toan`) và Điều khoản.
4. **Ô xác nhận** (web/desktop/APK ngoài cửa hàng - nút thanh toán bị vô hiệu tới khi đánh dấu; Play/App Store - đánh
   dấu trước khi mở luồng mua của cửa hàng), không chọn sẵn:
   - vi: "Tôi hiểu TsuDEV Pro là gói dịch vụ trả phí không bắt buộc, có thời hạn 1 năm và không tự gia hạn."
   - en: "I understand TsuDEV Pro is an optional paid plan that lasts 1 year and does not renew automatically."

#### 3.7.4. Gọi đúng tên - không khai sai về pháp lý

- Người mua Pro **nhận quyền lợi**, nên về pháp luật đó là **mua dịch vụ số**, không phải quyên góp. Văn bản pháp lý,
  hoá đơn, biên nhận, tờ khai cửa hàng gọi Pro là **"gói dịch vụ"**. Lời "ủng hộ tác giả" chỉ là lý do/tinh thần, đặt
  cạnh, không thay tên gọi.
- **Ủng hộ** (20.000-200.000 ₫) mới là đóng góp tự nguyện: chỉ có huy hiệu Ủng hộ, không mở khoá gì (mục 4.3).
- `MUST NOT` dùng trong nội dung công khai (website, app, cửa hàng, README) khi TsuDEV chưa có pháp nhân tương ứng:
  "tổ chức phi lợi nhuận", "non-profit organization", "quỹ từ thiện", "quyên góp được khấu trừ thuế", "tax-deductible".
  Được dùng: "miễn phí", "mã nguồn mở", "không quảng cáo", "không vì quảng cáo hay bán dữ liệu".

#### 3.7.5. Nghĩa vụ pháp lý (Việt Nam)

- **Chỉ `tsudev.com` nhận thanh toán web** cho Pro/Ủng hộ của cả hệ (mục 3.3). Website sản phẩm khác `MUST NOT` tự
  nhận tiền (QR, chuyển khoản, cổng thanh toán) - chỉ liên kết tới `tsudev.com/pro?app=<client_id>` /
  `tsudev.com/ung-ho?app=<client_id>`.
- `tsudev.com` `MUST` thông báo website TMĐT với Bộ Công Thương (online.gov.vn; phiếu `20261124-DK2`) và giữ trang
  `/chinh-sach-thanh-toan`, `/terms`, `/privacy`, thông tin chủ sở hữu ở chân trang khớp với hồ sơ đã nộp. Đổi giá,
  quyền lợi, kênh thanh toán ⇒ cập nhật trang + khai sửa đổi hồ sơ BCT.
- **Logo "Đã thông báo Bộ Công Thương"** chỉ hiện trên **đúng tên miền đã được duyệt**, bằng mã nhúng/liên kết do cổng
  cấp (trang xác minh trên online.gov.vn). Website khác của hệ `MUST NOT` hiện logo này (kể cả "cho đồng bộ"). Nhãn tin
  cậy cho mọi website: Tín nhiệm mạng (NCA) và bằng chứng kiểm chứng được ở trang `/security` (phiếu SEC2).
- Website/dự án **tự bán** hàng hoá/dịch vụ trong tương lai (vd. dịch vụ thiệp cưới, sản phẩm OCOP) `MUST` có hồ sơ BCT
  riêng **trước khi mở bán**; cho nhiều người bán cùng đăng bán (sàn) là loại **đăng ký** khác, có thể đòi hộ kinh
  doanh/doanh nghiệp ⇒ dừng, chủ dự án quyết.
- Doanh thu Pro/Ủng hộ do chủ dự án kê khai thuế; agent không tự khai, không tự hứa hẹn về thuế với người dùng.

#### 3.7.6. Mã nguồn mở và quyền lợi

- Mã kiểm Pro trong app là mã mở, `MUST NOT` làm rối/che giấu. Q1 và Q3 do máy chủ tsudev.com kiểm nên bản fork không
  tự cấp được; Q2 chạy trên máy nên bản fork có thể tự bật - chấp nhận, đúng tinh thần mã nguồn mở.
- Bản fork không được dùng tên "TsuDEV Pro" và không được dùng máy chủ quyền lợi/đồng bộ của tsudev.com cho người dùng
  của họ (Điều khoản sử dụng).

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
  (mã màu Sáng/Tối ở `assets/badges/README.md`), trái tim **đập nhẹ** khi rê chuột/chạm.
- **Chuyển động:** tôn trọng `prefers-reduced-motion` / "Giảm chuyển động" của hệ điều hành ⇒ tắt shimmer và nhịp đập;
  không nhấp nháy quá 3 lần/giây (WCAG 2.3.1).
- **Truy cập:** huy hiệu có nhãn đọc màn hình (`aria-label="Tài khoản Pro"`, `"Đã ủng hộ TsuDEV"`); không dùng màu
  làm tín hiệu duy nhất (có chữ/biểu tượng).
- Tài sản: SVG gốc trong `assets/badges/` của bộ quy ước (từ v3.9.0, kèm bảng màu + số đo tương phản) - repo con
  KHÔNG tự vẽ bản riêng.

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

## 7. Lưu cục bộ mặc định - đồng bộ/sao lưu đám mây là Pro

Quyết định của chủ dự án ngày **19/11/2026** (phiếu `20261119-PRO1`). Mọi sản phẩm hiện còn đang phát triển, chưa có
người dùng thật ⇒ không cần ân hạn chuyển tiếp: đường đồng bộ miễn phí đang có `MUST` tắt ở bản phát hành kế tiếp và
máy chủ được xoá dữ liệu thử nghiệm.

### 7.1. Nguyên tắc kiến trúc

| # | Nguyên tắc | Cụ thể |
| --- | --- | --- |
| N1 | **Cục bộ trước** | Dữ liệu chính ở thiết bị: SQLite/SQLCipher (app), IndexedDB/OPFS (web), tệp cục bộ (desktop). Mọi thao tác ghi cục bộ rồi cập nhật giao diện ngay; mạng chỉ chạy nền. Không màn nào phải chờ mạng, trừ đăng nhập và mua. Mục tiêu: phản hồi thao tác < 100 ms, cuộn/hoạt ảnh 60 khung/giây; việc nặng (mật mã, nhập tệp, báo cáo) chạy ở isolate/worker/luồng nền |
| N2 | **Miễn phí = không gửi dữ liệu lên mạng** | Đăng nhập là tùy chọn, chỉ để nhận quyền lợi/huy hiệu và đếm thiết bị (mục 7.3). Vẫn **miễn phí**: sao lưu/khôi phục **ra tệp** do người dùng tự giữ, xuất dữ liệu ở định dạng mở (CSV/JSON) - quyền mang dữ liệu đi, không khoá dữ liệu của người dùng |
| N3 | **Pro = đồng bộ + sao lưu đám mây** | Đồng bộ giữa các thiết bị cùng tài khoản và sao lưu lên máy chủ. Dữ liệu D2 trở lên (`SECURITY_BASELINE.md` mục 2) `MUST` mã hoá đầu cuối, máy chủ chỉ giữ bản mã; hạn mức tính theo tài khoản (mục 7.5) |
| N4 | **Máy chủ kiểm quyền, không tin app** | Mọi lượt đẩy/tải lên được kiểm Pro **ở máy chủ đồng bộ**, dựa trên JWS quyền lợi do tsudev.com ký (mục 7.4) - không dựa vào cờ trong app. Gate trong app chỉ để ẩn/hiện nút |
| N5 | **Chịu tải, không sập** | Đồng bộ phần thay đổi (delta) theo con trỏ `rev`, gộp lô, ghi lặp lại không tạo bản sao (idempotent). Thử lại lùi theo luỹ thừa có jitter, tôn trọng `Retry-After`. Không poll dày: đồng bộ khi mở app/sửa/quay lại app, nền không quá mỗi 10 phút. Giới hạn tần suất theo tài khoản + IP, giới hạn thân yêu cầu, hạn mức dung lượng. Máy chủ trả 429/5xx ⇒ app vẫn chạy cục bộ bình thường, chỉ hiện "Chưa đồng bộ" |
| N6 | **Bảo mật** | Theo `SECURITY_BASELINE.md` + mục 6: OIDC PKCE; **mã cài đặt** ngẫu nhiên 128 bit (`AUTH_AND_ACCOUNT.md` mục 14.3), `MUST NOT` dùng IMEI/MAC/vân tay thiết bị. Mật mã chỉ dùng thư viện chuẩn (libsodium, RustCrypto, .NET BCL). Log không chứa dữ liệu người dùng. Không SDK theo dõi. Trao khoá lai hậu lượng tử ở nơi đã có (X-Wing) |
| N7 | **0 đồng** | Người dùng miễn phí không tốn dung lượng máy chủ; chi phí lưu trữ chỉ tăng theo số người dùng Pro. Mọi dịch vụ chạy trên hạn mức miễn phí (`FREE_TIER_STACK.md` mục 3.1); tính năng nào cần vượt hạn mức ⇒ dừng lại, hỏi chủ dự án |
| N8 | Không quảng cáo | Giữ nguyên mục 3.1 |

### 7.2. Gói, giá và khi Pro hết hạn

- **Một gói "TsuDEV Pro" chung cho mọi sản phẩm** (quyền lợi gắn với tài khoản, mục 3.4), **kỳ 1 năm: 490.000 ₫**
  (quyết định chủ dự án 20/11/2026 - bỏ gói tháng 49.000 ₫ của v1.1). Ủng hộ 4 mức: **20.000 / 50.000 / 100.000 /
  200.000 ₫**. Giá web đã gồm thuế; Play/App Store tự quy đổi tiền tệ theo mức tương đương. Không dùng thử miễn phí khi
  chủ dự án chưa duyệt. Không có gói mua một lần (gói `pro_tron_doi` cũ của app-la-ban bị bỏ).
- **Thời hạn**: mỗi lần mua/gia hạn cộng **1 năm** (12 tháng theo lịch, giờ UTC) vào `pro_until`:
  `pro_until_mới = max(pro_until, bây giờ) + 1 năm` - gia hạn sớm không mất ngày nào. **Không tự gia hạn ở mọi kênh**
  (Play: gói trả trước; App Store: Non-Renewing Subscription; web: VietQR). Máy chủ quyền lợi tsudev.com là nơi duy
  nhất tính `pro_until` (mục 3.4).
- Tính năng Pro riêng của từng sản phẩm (ngoài đồng bộ/sao lưu đám mây) ghi ở ADR của repo, chủ dự án duyệt.
- **Hết kỳ mà không gia hạn** ⇒ tài khoản trở về **trạng thái miễn phí ("khách mời")**: dùng đầy đủ tính năng cục bộ,
  KHÔNG đồng bộ/sao lưu lên đám mây, huy hiệu Pro tắt (huy hiệu Ủng hộ giữ nguyên). Máy chủ chặn đẩy mới ngay
  (`402 pro_required`); vẫn cho **kéo + xuất bản mã thêm 90 ngày**; app báo trước ở mốc **30 ngày** và **7 ngày** trước
  khi xoá; hết 90 ngày ⇒ xoá dữ liệu trên máy chủ theo quy trình xoá **có xác minh** (mục 7.4 "Kênh trạng thái"): máy
  chủ `MUST` hỏi lại tsudev.com ngay trước khi xoá, chưa xác nhận được thì hoãn. Dữ liệu trên thiết bị **không bao giờ**
  bị xoá.
- Nhắc gia hạn trong app: mục 7.6. tsudev.com `SHOULD` gửi thư nhắc cho người đã xác minh email (7 ngày trước khi hết
  kỳ, ngày hết kỳ, 30 và 7 ngày trước khi xoá dữ liệu đám mây) - người không mở app vẫn được báo.

### 7.3. Thông báo "nhiều thiết bị chưa có Pro"

- **Điều kiện**: tài khoản không có Pro còn hạn VÀ cùng một sản phẩm có ≥ 2 **mã cài đặt** khác nhau, mỗi mã có hoạt
  động (đăng nhập/làm mới quyền lợi) trong 30 ngày gần nhất. Nguồn đếm là `devices_30d` trong JWS quyền lợi (mục 7.4) -
  app không có máy chủ riêng cũng dùng được.
- **Hiển thị**: trên MỌI thiết bị thoả điều kiện. Hộp thoại đóng được, không chặn dùng app, không đếm ngược. Chỉ hiện
  khi mở app hoặc ở màn chính, không hiện giữa lúc đang nhập liệu. Nội dung dùng nguyên văn (`{n}` = `devices_30d`):

  | | vi | en |
  | --- | --- | --- |
  | Tiêu đề | Dữ liệu chỉ lưu trên thiết bị này | Your data stays on this device |
  | Thân | Tài khoản của bạn đang dùng trên {n} thiết bị. Ở bản miễn phí, dữ liệu chỉ lưu trên từng thiết bị, không gửi lên internet hay đám mây, nên các thiết bị không tự đồng bộ với nhau. Để đồng bộ và sao lưu dữ liệu giữa các thiết bị, hãy nâng cấp lên TsuDEV Pro. | Your account is signed in on {n} devices. On the free plan, data is stored only on each device and is never sent to the internet or the cloud, so your devices do not sync with each other. To sync and back up your data across devices, upgrade to TsuDEV Pro. |
  | Nút chính | Xem gói Pro | See Pro plans |
  | Nút phụ | Để sau | Not now |
  | Liên kết | Sao lưu ra tệp (miễn phí) | Back up to a file (free) |

- **Chu kỳ**: hiện lần đầu khi điều kiện vừa đúng; hiện lại khi đã qua ≥ 30 ngày kể từ lần hiện gần nhất **trên thiết
  bị đó** - mốc lưu cục bộ dưới khoá `tsu.pro_notice.last_shown` (giờ UTC, ISO 8601). Pro còn hạn hoặc chỉ còn 1 thiết
  bị ⇒ thôi hiện.
- **Kênh**: bản Play/App Store ⇒ nút chính mở luồng IAP. Bản ngoài cửa hàng ⇒ mở `tsudev.com/pro`. Bản Play `MUST NOT`
  dẫn ra thanh toán web (mục 4.3).
- **Ngoại lệ có chủ đích của mục 3.2**: mục 3.2 cấm popup nhắc **Ủng hộ**; thông báo này nhắc **Pro**, được chủ dự án
  duyệt 19/11/2026, chỉ trong đúng điều kiện trên. Phiên nộp duyệt (`STORE_SUBMISSION.md`) không coi đây là vi phạm và
  không mở rộng ngoại lệ sang chỗ khác.
- **Test bắt buộc** (5 ca): 1 thiết bị ⇒ không hiện; 2 thiết bị ⇒ hiện; vừa hiện ở ngày 0 ⇒ ngày 29 không hiện, ngày 30
  hiện lại; có Pro ⇒ không hiện; ngoại tuyến (JWS đệm hết hạn) ⇒ không hiện, không lỗi.

### 7.4. Hợp đồng chung (mọi repo `MUST` dùng đúng các định danh này, không tự đặt khác)

**Mã sản phẩm cửa hàng:**

| Nơi | Pro | Ủng hộ |
| --- | --- | --- |
| Google Play (từng app tạo cùng mã) | Thuê bao `tsudev_pro`, MỘT gói cơ sở **trả trước** `nam` (P1Y, không tự gia hạn, cho phép nạp thêm) | Tiêu hao `ung_ho_20k`, `ung_ho_50k`, `ung_ho_100k`, `ung_ho_200k` |
| App Store (2027) | Non-Renewing Subscription `com.tsudev.pro.nam` | Tiêu hao `com.tsudev.ung_ho.20k` … `com.tsudev.ung_ho.200k` |
| Web/desktop/APK ngoài Play/Microsoft Store | `https://tsudev.com/pro?app=<client_id>` (VietQR 1 năm, mã nội dung `TSU <mã 8 ký tự>`) | `https://tsudev.com/ung-ho?app=<client_id>` |

Luồng mua Play: `obfuscatedAccountId` = base64url(SHA-256(`tsudev-pro|` + `sub`)), 43 ký tự (giới hạn 64). Biên nhận
**chỉ** được xác minh ở máy chủ quyền lợi tsudev.com - không ở app, không ở máy chủ sản phẩm.

**JWS quyền lợi** (ES256, header `typ` = `tsu-ent+jwt`, ký bằng khoá OIDC của tsudev.com; kiểm bằng JWKS
`https://tsudev.com/oidc/jwks` - lấy từ discovery `https://tsudev.com/oidc/.well-known/openid-configuration`, chọn khoá
theo `kid`):

```json
{ "iss": "https://tsudev.com/oidc", "sub": "<id tài khoản>", "aud": "<client_id>", "iat": 0, "exp": 0,
  "pro_until": 0, "pro_source": "play|appstore|web|null", "donor": false,
  "badge": "pro|donor|both|none", "devices_30d": 1, "cnf": { "jkt": "<tuỳ chọn>" } }
```

Mã `thang` (P1M) và `com.tsudev.pro.thang` của v1.1 bị bỏ: `MUST NOT` tạo trên cửa hàng; repo đã tạo thì lưu trữ
(archive) gói đó.

- `exp` ≤ `iat` + 7 ngày. App đệm JWS, quá `exp` ⇒ coi là miễn phí. Máy chủ sản phẩm đệm ≤ 24 giờ. Bên kiểm `MUST`
  kiểm `iss`, `aud` = `client_id` của mình, `exp`, và chỉ nhận `alg` = `ES256`.
- `badge` là kết quả SAU khi áp `badge_display` (người khác chỉ thấy đúng giá trị này). `pro_until` = 0 nghĩa là chưa
  từng có Pro; Pro còn hạn khi `pro_until` > giờ hiện tại.
- Lấy JWS (thân trả về `{"jws": "<compact>"}`, `Cache-Control: no-store`): app có access token tsudev ⇒
  `GET https://tsudev.com/api/me/entitlements` (scope `tsudev.entitlements`, thiếu ⇒ `403 insufficient_scope`). App
  đăng nhập qua máy chủ sản phẩm (RP) ⇒ máy chủ đó gọi `GET https://tsudev.com/api/rp/entitlements/{sub}` với
  `Authorization: Bearer <client assertion>` - JWT ES256 kiểu `private_key_jwt` (RFC 7523): `iss` = `sub` = `client_id`,
  `aud` = `https://tsudev.com/api/rp/entitlements`, `exp` ≤ 300 giây, `jti` dùng một lần; khoá công khai của RP đăng
  ký với tsudev.com (tsudev ADR-0002). Chỉ trả cho `sub` đã cấp quyền cho client đó (`sub` khác ⇒ `404
  unknown_subject`). Gửi biên nhận Play qua `POST https://tsudev.com/api/rp/entitlements/play` (cùng xác thực).
- Mã cài đặt gửi trong header `X-Tsu-Installation` (`AUTH_AND_ACCOUNT.md` mục 14.3).
- **Gắn khoá thiết bị (DPoP, RFC 9449)** - `SHOULD`, lộ trình ở tsusync ADR-0002: app tạo khoá P-256 riêng mỗi cài
  đặt (kho khoá an toàn của nền tảng), gửi header `DPoP` khi gọi `GET /api/me/entitlements`; tsudev.com khi đó thêm
  `cnf.jkt` (thumbprint RFC 7638) vào JWS. Máy chủ nhận JWS có `cnf.jkt` `MUST` đòi `Authorization: DPoP <jws>` + bằng
  chứng `DPoP` hợp lệ (`htm`, `htu`, `iat` ±60 giây, `jti` một lần, `ath`).
- **JWS do app gửi thẳng lên máy chủ đồng bộ** (TsuDEV Sync, máy chủ sản phẩm nhận JWS làm thẻ): bên nhận `MUST` chỉ
  nhận JWS có `iat` ≤ 24 giờ; cũ hơn ⇒ `401 {"error":"invalid_token","reason":"stale"}`, app lấy JWS mới rồi thử lại
  một lần.
- **Kênh trạng thái** (chống xoá nhầm người gia hạn trên web mà không mở app):
  `POST https://tsudev.com/api/rp/entitlements/status`, `Authorization: Bearer <client assertion>` (như kênh RP, `aud` =
  đúng URL này), thân `{"client_id": "<client_id>", "subs": ["<sub>", ...]}` (≤ 100). RP chỉ được hỏi cho `client_id` của
  chính mình; client `tsusync` được hỏi thay mọi `client_id` đã đăng ký dùng TsuDEV Sync. Trả về (`Cache-Control:
  no-store`) `{"results": {"<sub>": {"status": "ok", "pro_until": <giây>} | {"status": "deleted"} | {"status":
  "unknown_subject"}}}` cho mọi `sub` **đã từng** cấp quyền cho `client_id` đó - KHÔNG phụ thuộc grant OIDC 30 ngày
  (khác `GET /api/rp/entitlements/{sub}`). `deleted` = tài khoản đã xoá (tsudev.com giữ dấu `sub` đã xoá ≥ 1 năm).
  Chỉ trả `pro_until`, không trả email/huy hiệu/thiết bị.
- **Xoá dữ liệu đám mây vì hết Pro**: máy chủ đồng bộ (sản phẩm hoặc TsuDEV Sync) `MUST` gọi kênh trạng thái ngay trước
  khi xoá; `pro_until` + 90 ngày còn ở tương lai (đã gia hạn) ⇒ cập nhật hạn, GIỮ dữ liệu; `deleted` hoặc đã quá 90
  ngày ⇒ xoá; lỗi mạng/HTTP, `unknown_subject` ⇒ **hoãn**, hỏi lại sau ≥ 24 giờ. `MUST NOT` xoá chỉ dựa trên
  `pro_until` đệm cục bộ.

**Máy chủ sản phẩm / TsuDEV Sync:**

- Không có Pro ⇒ HTTP **402** `{"error":"pro_required"}`. App gặp mã này ⇒ hiện màn Pro, không thử lại.
- Sản phẩm không có máy chủ riêng (desktop, trò chơi, tsufiles, lotus-share...) đồng bộ qua dịch vụ dùng chung
  **TsuDEV Sync** (repo `tsudev-org/tsusync`: Workers + D1 + R2, mỗi sản phẩm một không gian tên). Thư viện máy khách:
  Dart `tsusync` (git dependency ghim commit), Rust crate `tsusync`, .NET `TsuSync`, TypeScript `@tsudev/sync`.
- Mã hoá: libsodium `crypto_secretstream_xchacha20poly1305`, khoá suy bằng Argon2id ≥ 64 MiB / 3 lượt từ mật khẩu đồng
  bộ đã chuẩn hoá NFKC; máy chủ không giữ khoá; có vector đối chiếu chéo 4 ngôn ngữ.

### 7.5. Hạn mức và giao diện

- Hạn mức Pro mặc định mỗi tài khoản mỗi sản phẩm: **100 MiB** dữ liệu + **1 GiB** tệp. Sản phẩm cần khác ⇒ ghi ADR
  (ví dụ qulythuchi 200 MiB + 1 GiB, ADR-0016).
- Huy hiệu: Flutter `TsuBadge` trong gói `tsudev_ui` (`tsudev-org/tsudev-ui-flutter`), web `<TsuBadge>` trong
  `@tsudev/ui`; desktop .NET/Rust/C++ vẽ lại từ SVG ở `assets/badges/` của bộ quy ước (không tự thiết kế).
- Màn **Pro / Ủng hộ**: điều khoản đứng TRƯỚC nút mua, nguyên văn (vi): "TsuDEV Pro {giá} cho 1 năm, KHÔNG tự gia hạn.
  Gia hạn sớm được cộng thêm 1 năm vào thời hạn còn lại. Hết hạn mà chưa gia hạn, ứng dụng trở về bản miễn phí và ngừng
  đồng bộ lên đám mây; dữ liệu trên thiết bị vẫn giữ nguyên, bản sao trên đám mây còn tải về được 90 ngày rồi bị xoá."
  - (en): "TsuDEV Pro {price} for 1 year, does NOT renew automatically. Renewing early adds 1 year to your remaining
  time. If it expires without renewal, the app returns to the free version and stops syncing to the cloud; data on your
  device stays intact, and your cloud copy can be downloaded for 90 days before it is deleted."

### 7.6. Nhắc gia hạn và khi hết kỳ Pro

Quyết định chủ dự án 20/11/2026. Nguồn thời hạn là `pro_until` trong JWS quyền lợi còn hạn (mục 7.4); app không có
JWS còn hạn ⇒ không hiện gì ở mục này (coi như miễn phí, mục 3.4).

- **Nhắc gia hạn** - điều kiện: 0 < `pro_until` - bây giờ ≤ **7 ngày**. Hiện **mỗi lần mở app** (khởi động mới, hoặc
  quay lại app sau ≥ 30 phút ở nền), tối đa một lần cho mỗi lần mở; đóng được, không chặn dùng app, không hiện giữa lúc
  đang nhập liệu. `{n}` = số ngày còn lại làm tròn lên (≥ 1), `{ngày}`/`{date}` = ngày hết hạn theo giờ máy, dạng
  DD/MM/YYYY (vi) / theo ngôn ngữ (en). Nội dung nguyên văn:

  | | vi | en |
  | --- | --- | --- |
  | Tiêu đề | Gia hạn TsuDEV Pro | Renew TsuDEV Pro |
  | Thân | Gói TsuDEV Pro của bạn hết hạn sau {n} ngày (ngày {ngày}). Gia hạn để tiếp tục đồng bộ và sao lưu đám mây. Nếu không gia hạn, ứng dụng sẽ trở về bản miễn phí: dữ liệu trên thiết bị vẫn giữ nguyên nhưng không còn đồng bộ lên đám mây. | Your TsuDEV Pro expires in {n} days (on {date}). Renew to keep cloud sync and backup. If you don't renew, the app returns to the free version: data on this device stays intact but no longer syncs to the cloud. |
  | Nút chính | Gia hạn | Renew |
  | Nút phụ | Để sau | Later |

- **Khi hết kỳ** - điều kiện: `pro_until` ≤ bây giờ và JWS trước đó của thiết bị từng có Pro. Hiện **một lần** cho mỗi
  giá trị `pro_until` (khoá cục bộ `tsu.pro_expired.notified_until` = `pro_until` đã báo, giây Unix):

  | | vi | en |
  | --- | --- | --- |
  | Tiêu đề | TsuDEV Pro đã hết hạn | TsuDEV Pro has expired |
  | Thân | Ứng dụng đã trở về bản miễn phí và ngừng đồng bộ lên đám mây. Dữ liệu trên thiết bị vẫn giữ nguyên. Bản sao trên đám mây còn tải về được tới ngày {ngày_xoá}. | The app is back on the free version and has stopped syncing to the cloud. Data on this device stays intact. Your cloud copy can be downloaded until {delete_date}. |
  | Nút chính | Gia hạn | Renew |
  | Nút phụ | Đóng | Close |

  `{ngày_xoá}` = `pro_until` + 90 ngày. Sản phẩm không có đồng bộ đám mây bỏ câu cuối.
- **Kênh nút "Gia hạn"**: như mục 7.3 (Play/App Store ⇒ luồng IAP gói `nam`; ngoài cửa hàng ⇒ `tsudev.com/pro?app=<client_id>`;
  bản Play `MUST NOT` dẫn ra thanh toán web).
- Đây là ngoại lệ có chủ đích của mục 3.2 (nhắc **Pro**, chủ dự án duyệt 20/11/2026), chỉ trong đúng điều kiện trên.
- **Test bắt buộc** (6 ca): còn 8 ngày ⇒ không nhắc; còn 7 ngày ⇒ nhắc; mở app 2 lần trong 7 ngày cuối ⇒ nhắc 2 lần, quay
  lại sau < 30 phút ⇒ không nhắc lại; hết hạn ⇒ báo hết kỳ đúng một lần, mở lại ⇒ không báo nữa; gia hạn (JWS mới có
  `pro_until` xa hơn) ⇒ thôi nhắc, lần hết kỳ sau báo lại; ngoại tuyến với JWS hết hạn ⇒ không nhắc, không lỗi.
- Thành phần dùng chung: Flutter `ProRenewalNotice` trong `tsudev_ui`, web trong `@tsudev/ui`; desktop .NET/Rust/C++
  dùng đúng nội dung và điều kiện trên.

## 8. Checklist nghiệm thu

- [ ] Lần chạy đầu: ngôn ngữ = ngôn ngữ hệ thống (dự phòng EN rồi VI), giao diện = Hệ thống; có test (mục 1.4).
- [ ] Có tiếng Việt + tiếng Anh, không chuỗi viết cứng.
- [ ] Không SDK quảng cáo, không quyền `AD_ID`; tờ khai cửa hàng "không quảng cáo".
- [ ] Pro kỳ 1 năm, không tự gia hạn, qua đúng kênh (mục 3.3, 7.4); không còn mã `thang`; quyền lợi xác minh phía
  máy chủ; hết hạn ⇒ về bản miễn phí, không mất dữ liệu.
- [ ] Huy hiệu Pro/Ủng hộ đúng bảng 4.1, có lựa chọn hiển thị, tôn trọng giảm chuyển động.
- [ ] Bản Play: ủng hộ cấp huy hiệu đi qua Play Billing (mục 4.3).
- [ ] Pro đúng mục 3.7: chỉ quyền lợi Q1-Q3 đang chạy thật; tiếp cận/Sáng-Tối/xuất tệp vẫn miễn phí; lối vào Pro chỉ ở
  chỗ cho phép, không thao túng; màn mua có câu định vị + điều khoản + ô xác nhận (vi/en); website sản phẩm không tự
  nhận tiền; không hiện logo BCT trên tên miền chưa được duyệt; không chữ "phi lợi nhuận/non-profit".
- [ ] Có thư mục `ios/` dựng được trên CI macOS (app di động); kết quả thử trên iPhone thật ghi ở `logs/`.
- [ ] Website sản phẩm có hero có hình, ảnh từng tính năng, video giới thiệu, ảnh theo nền tảng (mục 5).
- [ ] Bản miễn phí ngắt mạng vẫn đủ tính năng cốt lõi; chưa có Pro ⇒ 0 byte dữ liệu người dùng rời máy (đo bằng proxy).
- [ ] Máy chủ đồng bộ từ chối đẩy/tải lên của tài khoản không Pro (`402 pro_required`), có test; JWS sai `aud`/hết
  hạn/sai chữ ký bị từ chối.
- [ ] Thông báo nhiều thiết bị đúng nội dung + chu kỳ 30 ngày, đủ 5 test (mục 7.3).
- [ ] Pro hết hạn ⇒ không mất dữ liệu trên thiết bị; kéo/xuất được trong 90 ngày (mục 7.2); máy chủ chỉ xoá sau khi
  kênh trạng thái xác nhận, có test "gia hạn trên web mà không mở app ⇒ không xoá" (mục 7.4).
- [ ] Nhắc gia hạn 7 ngày cuối mỗi lần mở app + báo hết kỳ một lần, đúng nội dung, đủ 6 test (mục 7.6).
- [ ] Máy chủ nhận JWS từ app chỉ nhận `iat` ≤ 24 giờ (mục 7.4).
- [ ] Định danh cửa hàng, JWS, header, mã lỗi đúng hợp đồng mục 7.4; điều khoản thuê bao đứng trước nút mua (mục 7.5).
- [ ] Số đo phản hồi thao tác chính < 100 ms ghi trong PR; thử tải đồng bộ nếu có máy chủ (N1, N5).
- [ ] Phiếu rà soát bảo mật + THREAT_MODEL cập nhật (giả mạo quyền lợi, dùng lại biên nhận, vượt hạn mức, liệt kê thiết bị).
