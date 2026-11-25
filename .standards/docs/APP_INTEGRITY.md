# TOÀN VẸN ỨNG DỤNG - CHỐNG CAN THIỆP, BẮT BUỘC CẬP NHẬT, LÀM RỐI MÃ (v1.0.0)

> **Bắt buộc cho mọi website, phần mềm, tool, app, trò chơi của hệ TsuDEV** (chủ dự án 25/11/2026, bộ quy ước
> v7.0.0). Mục tiêu: một bản app bị sửa, bị dịch ngược hay quá cũ **không lấy được gì** từ hệ thống - không tài khoản,
> không quyền lợi, không tài nguyên, không dữ liệu của người khác. Ký hiệu `MUST`/`SHOULD`/`MAY` theo RFC 2119.
> Liên quan: [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md), [`DISTRIBUTION_TRUST.md`](DISTRIBUTION_TRUST.md),
> [`AUTH_AND_ACCOUNT.md`](AUTH_AND_ACCOUNT.md), [`LOCAL_SYNC.md`](LOCAL_SYNC.md), [`PRODUCT_POLICY.md`](PRODUCT_POLICY.md) mục 7.

| Mục | Giá trị |
| :-- | :-- |
| **Phiên bản** | 1.0.0 - bộ quy ước v7.0.0 (25/11/2026) |
| **Căn cứ pháp lý** | Luật An ninh mạng số 116/2025/QH15 (hiệu lực 01/7/2026); Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 (hiệu lực 01/01/2026). Trích điều khoản cụ thể ⇒ đọc bản gốc trên Công báo/CSDL quốc gia, không trích từ trí nhớ |
| **Quyết định chủ dự án (25/11/2026)** | Q-I1 mọi bản phát hành mới **khoá ngay** bản cũ; Q-I2 modal khoá chỉ còn **Cập nhật** + **Xuất dữ liệu**; Q-I3 dự án **PRIVATE** làm rối mã mạnh, không hỏng tính năng, không bị antivirus báo nhầm; Q-I4 không gửi dữ liệu người dùng lên internet hay tài khoản bên thứ ba |

## 0. Nói thật về giới hạn (đọc trước)

- **Không có chống can thiệp "tuyệt đối"** trên thiết bị nằm trong tay kẻ tấn công: mã chạy trên máy người dùng luôn
  đọc, sửa, hook được nếu đủ công sức. Bảo vệ thật nằm ở **máy chủ**: máy chủ không tin bất cứ gì app tự khai, và chỉ
  phục vụ bản đã chứng thực, đúng phiên bản (mục 1-3). Làm rối mã (mục 5) chỉ làm việc dịch ngược đắt hơn.
- Ví dụ hay gặp: app tài xế bị sửa để can thiệp điều phối là lỗi **thiết kế tin client** (máy chủ nhận vị trí, trạng
  thái, kết quả tính toán do app gửi mà không kiểm) hoặc **không kiểm chứng thực app** ở máy chủ. Chuẩn này chặn cả hai.
- Dự án **OPEN** công khai mã trên GitHub: không giấu được thuật toán, và không cần giấu - an toàn dựa vào khoá và máy
  chủ (nguyên lý Kerckhoffs). Giấy phép mã nguồn mở cho phép người dùng sửa và tự dựng bản của họ; ta không cấm việc đó,
  ta **từ chối kết nối** bản đó với máy chủ TsuDEV.
- Bản tải từ nguồn chính thức (website, GitHub Releases, cửa hàng) luôn công khai: ai cũng tải được bản **gốc chưa
  sửa** - đó là điều mong muốn. Điều chuẩn này bảo đảm: **bản đã bị sửa** không nhận được cập nhật qua kênh trong app,
  không kết nối được tài khoản/tài nguyên của hệ thống.

## 1. Luật cứng

| # | Luật |
| :-: | :-- |
| I1 | **Máy chủ tự quyết.** Mọi giá trị có ý nghĩa (quyền Pro, huy hiệu, hạn mức, thứ hạng, điểm, giá, thời gian, kết quả trò chơi có xếp hạng, lượt ủng hộ) do máy chủ tính hoặc kiểm lại. `MUST NOT` tin cờ/giá trị app gửi lên. Đầu vào kiểm theo lược đồ (kiểu, độ dài, miền giá trị), từ chối mặc định. |
| I2 | **Nguyên tắc vàng - phiên bản mới nhất.** Có bản mới trên kênh của người dùng ⇒ bản cũ bị **khoá ngay** bằng modal toàn màn (mục 2), và máy chủ từ chối mọi lượt gọi của bản cũ (`426`). Không hạn chờ, không nút bỏ qua. |
| I3 | **Chứng thực app.** Nền tảng có cơ chế chứng thực phần cứng (Android, iOS) ⇒ `MUST` chứng thực trước khi cấp khoá thiết bị/quyền lợi (mục 3). Không đạt ⇒ không tài khoản, không quyền lợi, không tài nguyên máy chủ, hiện modal "Phiên bản không chính thức". |
| I4 | **Chỉ cập nhật bằng gói đã ký.** Updater kiểm chữ ký Ed25519/Authenticode/notarization + SHA-256 + phiên bản tăng dần (chống hạ cấp) trước khi cài (`DISTRIBUTION_TRUST` mục 2.5). Kênh cập nhật trong app chỉ trả gói cho bản cài **đã chứng thực** (nền tảng có chứng thực) - bản bị sửa chỉ nhận liên kết tải bản chính thức. |
| I5 | **Không gửi dữ liệu người dùng ra ngoài.** Kiểm phiên bản và chứng thực chỉ gửi: mã sản phẩm, phiên bản, kênh, bằng chứng chứng thực, khoá công khai thiết bị. `MUST NOT` gửi nội dung người dùng, danh bạ, tệp, vị trí. Không SDK chống gian lận/RASP/phân tích của bên thứ ba gửi dữ liệu về máy chủ của họ (vd freeRASP gửi telemetry về Talsec ⇒ cấm). |
| I6 | **Dữ liệu là của người dùng.** Modal khoá (mục 2) và modal "không chính thức" luôn có **Xuất dữ liệu** ra tệp (`LOCAL_SYNC.md` mục 9) - không bao giờ giam dữ liệu để ép cập nhật. |
| I7 | **Không né antivirus, không mã độc giả dạng bảo vệ.** Cấm packer/protector, tự giải mã rồi chạy mã, mã tự sửa, chống gỡ lỗi kiểu giết tiến trình/làm treo máy, ẩn tiến trình, tiêm vào tiến trình khác (mục 5.3). |

## 2. Cổng phiên bản (nguyên tắc vàng)

### 2.1. Bản kê phiên bản có chữ ký

- Một tệp duy nhất cho cả hệ: `https://tsudev.com/.well-known/tsudev/versions.json` + chữ ký tách
  `versions.json.sig` (Ed25519, khoá riêng `kid` = `tsu-versions-<năm>`, khoá công khai ghim trong app lúc dựng; xoay
  khoá theo `SECURITY_BASELINE`). App `MUST` kiểm chữ ký trước khi đọc.

```json
{
  "v": 1,
  "issued_at": 1764057600,
  "expires_at": 1764662400,
  "products": {
    "<ma-san-pham>": {
      "channels": {
        "github": { "latest": "26.11.2501", "url": "https://github.com/tsudev-org/<repo>/releases/latest" },
        "play":   { "latest": "26.11.2501", "url": "https://play.google.com/store/apps/details?id=com.tsudev.<ma>" },
        "msstore": { "latest": "26.11.2501", "url": "ms-windows-store://pdp/?productid=<id>" },
        "web":    { "latest": "26.11.2501" }
      }
    }
  }
}
```

- `expires_at` ≤ `issued_at` + 7 ngày; bản kê hết hạn hoặc có `issued_at` CŨ hơn bản đã đệm ⇒ bỏ (chống phát lại bản
  kê cũ). So phiên bản theo [`VERSIONING.md`](VERSIONING.md) mục 2.
- **Chốt chặn theo kênh (`MUST`):** `latest` của một kênh chỉ được nâng **sau khi** bản đó tải được thật trên kênh
  đó (đã qua duyệt cửa hàng, đã lên Release, winget/Scoop/APT đã có). Pipeline phát hành đo URL tải rồi mới ký bản kê.
  Nâng sớm ⇒ người dùng bị khoá mà không có bản để cập nhật - lỗi nghiêm trọng nhất của chuẩn này.
- Máy chủ sản phẩm/tsudev.com đọc cùng bản kê. Mọi lượt gọi API của app gửi header
  `X-Tsu-App: <ma-san-pham>/<phiên bản>/<kênh>`; phiên bản < `latest` của kênh ⇒ `426`
  `{"error":"update_required","latest":"<phiên bản>","url":"<url>"}`. Header thiếu/sai ⇒ `400`.

### 2.2. Hành vi của app

- Kiểm khi mở app, khi quay lại sau ≥ 30 phút ở nền, và mỗi 6 giờ khi đang chạy; thời hạn 5 giây; lỗi mạng ⇒ dùng bản
  kê đã đệm (còn hạn chữ ký), không chặn.
- Bản kê (đệm hoặc mới) cho biết có bản mới hơn trên kênh của mình, hoặc máy chủ trả `426` ⇒ hiện **modal khoá**:
  - Toàn màn, không đóng được (vô hiệu nút Quay lại/Esc/bấm nền), bẫy focus, đọc được bằng trình đọc màn hình, đúng
    Sáng/Tối/cỡ chữ/tương phản cao (`ACCESSIBILITY.md`).
  - Hai nút, không thêm: **Cập nhật ngay** (Play: In-App Updates `IMMEDIATE`; App Store/Microsoft Store: mở trang
    sản phẩm; GitHub/APT/winget/Scoop: updater đã ký hoặc mở `url`; web/PWA: tải lại sau khi service worker nhận bản mới)
    và **Xuất dữ liệu** (`LOCAL_SYNC.md` mục 9).
  - Nội dung nguyên văn (`{mới}`, `{cũ}` là chuỗi phiên bản):

    | | vi | en |
    | --- | --- | --- |
    | Tiêu đề | Cần cập nhật ứng dụng | Update required |
    | Thân | Đã có phiên bản {mới}. Để bảo vệ an toàn cho bạn và hệ thống, phiên bản {cũ} không còn được sử dụng. Vui lòng cập nhật lên phiên bản mới nhất. | Version {mới} is available. To keep you and the system safe, version {cũ} can no longer be used. Please update to the latest version. |
    | Nút chính | Cập nhật ngay | Update now |
    | Nút phụ | Xuất dữ liệu | Export data |

- **Chế độ ngoại tuyến hoàn toàn** (`AUTH_AND_ACCOUNT.md` 14.1) vẫn giữ: không gọi mạng thì không biết có bản mới;
  app chạy cục bộ nhưng **không có** tính năng cần máy chủ. Tắt chế độ ngoại tuyến hoặc dùng bất kỳ tính năng trực tuyến
  nào ⇒ kiểm phiên bản TRƯỚC.
- Web/PWA: luôn phục vụ bản mới nhất; service worker phát hiện bản mới ⇒ cùng modal (nút chính = tải lại).
- Trò chơi/app không có máy chủ riêng vẫn `MUST` kiểm bản kê (chỉ một GET tới tsudev.com, không gửi dữ liệu người dùng).

### 2.3. Modal "Phiên bản không chính thức"

Hiện khi chứng thực thất bại (mục 3) hoặc máy chủ trả `403 {"error":"untrusted_client"}`. Hai nút: **Tải bản chính
thức** (mở trang tải trên tsudev.com) và **Xuất dữ liệu**.

| | vi | en |
| --- | --- | --- |
| Tiêu đề | Phiên bản không chính thức | Unofficial version |
| Thân | Ứng dụng này đã bị sửa đổi hoặc không được tải từ nguồn chính thức nên không thể kết nối với hệ thống TsuDEV. Hãy tải bản chính thức tại tsudev.com. | This app has been modified or was not downloaded from an official source, so it cannot connect to TsuDEV. Please download the official version from tsudev.com. |
| Nút chính | Tải bản chính thức | Download official version |
| Nút phụ | Xuất dữ liệu | Export data |

## 3. Chứng thực app và thiết bị

| Nền tảng | Cơ chế (`MUST` trừ khi ghi khác) | Máy chủ kiểm |
| :-- | :-- | :-- |
| **Android - mọi kênh** (APK GitHub, APT, Play) | **Android Key Attestation**: tạo khoá DPoP P-256 trong AndroidKeyStore (StrongBox nếu có) với `setAttestationChallenge(<nonce máy chủ>)`, gửi chuỗi chứng thư | Chuỗi về gốc chứng thực Google (danh sách gốc ghim theo tài liệu Android, cập nhật khi Google xoay gốc); danh sách thu hồi chứng thực của Google; `attestationChallenge` = nonce (một lần, 60 giây); `attestationApplicationId`: đúng `packageName` + SHA-256 chứng thư ký app của **kênh đó**; `attestationSecurityLevel` ≥ TEE; `verifiedBootState` = Verified, bootloader khoá |
| Android - kênh Play (thêm) | **Play Integrity API** (yêu cầu chuẩn, hạn mức miễn phí) | `appRecognitionVerdict` = `PLAY_RECOGNIZED`, `deviceRecognitionVerdict` có `MEETS_DEVICE_INTEGRITY`, nonce/`requestHash` khớp |
| iOS/iPadOS (sau H1, 02/2027) | **App Attest** (`DCAppAttestService`), khoá gắn với khoá DPoP | Theo tài liệu Apple: chuỗi về gốc App Attest, `appId` = Team ID + Bundle ID, bộ đếm tăng |
| Web/PWA | Không có chứng thực app | Khoá DPoP WebCrypto không xuất được; máy chủ tự quyết (I1), hạn mức chặt hơn |
| Windows/macOS/Linux desktop | Không có chứng thực app phổ dụng | Chỉ nhận bản đã ký (I4); khoá DPoP trong TPM/Keychain/Secret Service khi có; máy chủ tự quyết (I1), hạn mức chặt hơn; `MUST NOT` giả vờ "đã chứng thực" |

- **Gắn kết quả vào khoá**: chứng thực đạt ⇒ máy chủ ghi thumbprint khoá DPoP (`jkt`) với trạng thái `attested` + hạn
  30 ngày; JWS quyền lợi/phiên chỉ cấp cho `jkt` đó (`PRODUCT_POLICY` 7.4). Hết hạn, đổi phiên bản, đổi kênh ⇒ chứng
  thực lại. Không đạt ⇒ `403 untrusted_client`, thu hồi `jkt`, ghi nhật ký kiểm toán (không ghi dữ liệu cá nhân thừa).
- **Tín hiệu phía app** (root/jailbreak, Frida/Xposed, trình gỡ lỗi, giả lập): `MAY` thu bằng mã của chính repo, gửi
  kèm yêu cầu chứng thực như tín hiệu; `MUST NOT` là căn cứ duy nhất (vượt được) và `MUST NOT` làm treo/thoát app.
- Mã chứng thực phía máy chủ dùng chung: một mô-đun ở tsudev.com (Workers) - repo sản phẩm không tự viết lại.

## 4. Máy chủ - phòng thủ chiều sâu

- Giới hạn tần suất theo `jkt` + tài khoản + IP (`CF-Connecting-IP`); phát hiện bất thường (tần suất, mẫu thời gian,
  giá trị phi lý) ⇒ khoá `jkt` tạm thời, báo chủ dự án.
- Nhật ký kiểm toán cho mọi hành động có giá trị (cấp/thu hồi quyền lợi, chứng thực thất bại, `426`, `403`), lưu theo
  hạn ở `PRODUCT_POLICY` 7.7, không chứa nội dung người dùng.
- Nonce chứng thực, `jti` DPoP: một lần, lưu ≤ 5 phút. Đồng hồ máy chủ là chuẩn, không tin `iat` của client quá ±60 giây.
- Bí mật chỉ ở máy chủ: app `MUST NOT` mang khoá API, khoá ký, chuỗi kết nối - kể cả khi đã làm rối mã.

## 5. Làm rối mã và gia cố bản phát hành

### 5.1. Theo nhãn dự án (`PRODUCT_POLICY` 3.7.7)

| Nhãn | Quy định |
| :-- | :-- |
| **OPEN** | **Không** làm rối mã (mã đã công khai; làm rối chỉ tăng báo nhầm antivirus). `MUST` gia cố bản phát hành (mục 5.2 cột "Gia cố") |
| **PRIVATE** | `MUST` gia cố + **làm rối mã mạnh** bằng đúng công cụ ở mục 5.2, cấu hình an toàn với antivirus; `MUST` qua cổng kiểm mục 5.4 trước mọi bản phát hành |

### 5.2. Theo công nghệ

| Công nghệ | Gia cố (mọi dự án) | Làm rối mạnh (PRIVATE) | Cấm |
| :-- | :-- | :-- | :-- |
| JS/TS (web, PWA, mặt trước Tauri/Electron - các trò chơi TsuGameLabs) | Dựng sản phẩm (Vite/esbuild minify), không công khai source map, CSP chặt | `javascript-obfuscator` (BSD-2, ghim phiên bản) chạy SAU khi dựng, cấu hình: `identifierNamesGenerator: 'hexadecimal'`, `stringArray: true`, `stringArrayEncoding: ['rc4']`, `stringArrayThreshold: 0.75`, `stringArrayRotate/Shuffle: true`, `splitStrings: true` (`splitStringsChunkLength: 8`), `controlFlowFlattening: true` (`Threshold: 0.5`, loại trừ vòng lặp khung hình nặng), `deadCodeInjection: true` (`Threshold: 0.2`), `numbersToExpressions: true`, `transformObjectKeys: true`, `simplify: true`. Source map sinh ra giữ RIÊNG ngoài repo | `selfDefending`, `debugProtection`, `debugProtectionInterval`, `domainLock` (làm hỏng app/treo trình duyệt), mọi thứ cần `eval`/`new Function` (vỡ CSP) |
| Rust (lõi, mặt sau Tauri) | `[profile.release]`: `strip = "symbols"`, `lto = "fat"`, `codegen-units = 1`, `panic = "abort"`, `debug = false`; `--remap-path-prefix` bỏ đường dẫn máy dựng | Chuỗi nhạy cảm qua `obfstr` (mã hoá lúc biên dịch); tên ký hiệu đã strip | Packer, mã tự giải nén |
| Dart/Flutter | Dựng release AOT; Android R8 `minifyEnabled` + `shrinkResources`, quy tắc ProGuard có test | `flutter build ... --obfuscate --split-debug-info=<ngoài repo>`; R8 full mode (`android.enableR8.fullMode=true`) | Gửi tệp ký hiệu lên dịch vụ crash bên thứ ba |
| .NET (C#) | Trimming, `DebugType=none` cho bản phát hành | **Native AOT** (`PublishAot=true`, `StripSymbols=true`) - không còn IL để dịch ngược; không AOT được ⇒ **Obfuscar** (MIT) đổi tên | ConfuserEx, .NET Reactor, Eazfuscator chế độ ảo hoá (antivirus gắn cờ dày) |
| C/C++ | `-O2 -flto -fvisibility=hidden`, strip; MSVC `/GL /LTCG`, không phát hành PDB | Chuỗi nhạy cảm mã hoá lúc biên dịch | Như trên |
| Python | Không dùng cho bản phát hành PRIVATE (`LANGUAGE_SELECTION`); OPEN theo `DISTRIBUTION_TRUST` mục 3 | - (chuyển sang Rust/.NET) | PyArmor, PyInstaller `--onefile` |

### 5.3. Cấm ở mọi dự án (an toàn với antivirus)

UPX, MPRESS, Themida, VMProtect, Enigma và mọi packer/protector; tải-giải mã-chạy mã lúc chạy; mã tự sửa; chống gỡ lỗi
kiểu thoát/treo/ăn CPU; ẩn tiến trình/cửa sổ; tiêm vào tiến trình khác; tắt/né Windows Defender; tự thêm khởi động cùng
hệ thống khi người dùng chưa chọn (`DISTRIBUTION_TRUST` mục 3).

### 5.4. Cổng kiểm bản PRIVATE đã làm rối (MUST, mỗi bản phát hành)

1. **Không hỏng tính năng**: chạy TOÀN BỘ test + E2E/smoke trên **chính tệp phát hành đã làm rối** (không phải bản dev),
   trên mọi nền tảng phát hành; so hiệu năng khung hình/khởi động với bản chưa làm rối (chậm hơn > 10% ⇒ hạ ngưỡng
   `controlFlowFlattening`/loại trừ hàm nóng).
2. **Không báo nhầm**: quét cục bộ bằng Microsoft Defender (`MpCmdRun.exe -Scan -ScanType 3 -File <tệp>` qua
   `/mnt/c`) và ClamAV; VirusTotal **chỉ tra theo SHA-256, KHÔNG tải tệp lên** (tải lên = chia sẻ tệp với mọi hãng
   bảo mật ⇒ lộ bản PRIVATE). Bị gắn cờ ⇒ dừng phát hành, gỡ kỹ thuật gây cờ; gửi báo nhầm cho Microsoft chỉ khi chủ dự
   án đồng ý.
3. **Bí mật dựng**: tệp ký hiệu/source map/bản đồ đổi tên lưu ở `~/.config/tsudev/keys/<repo>/symbols/<phiên bản>/`
   (chmod 700, ngoài git, sao lưu `age`), không đưa lên dịch vụ nào.
4. Ghi kết quả 3 bước vào ghi chú phát hành nội bộ (`logs/`) của repo.

## 6. Kiểm thử bắt buộc

- Cổng phiên bản: bản kê chữ ký sai ⇒ bỏ; hết hạn ⇒ bỏ; `issued_at` cũ hơn bản đệm ⇒ bỏ; có bản mới ⇒ modal khoá, không
  đóng được, hai nút đúng nguyên văn vi/en; `426` từ máy chủ ⇒ modal khoá; ngoại tuyến + bản đệm cũ ⇒ không chặn; chốt
  chặn theo kênh (bản kê có `latest` mới ở `play` không ảnh hưởng bản `github`).
- Máy chủ: thiếu/sai `X-Tsu-App` ⇒ 400; phiên bản cũ ⇒ 426; chứng thực sai gói/chữ ký/nonce/boot state ⇒ 403 + thu hồi
  `jkt`; giá trị client gửi vượt miền ⇒ 422, không ghi.
- Bản PRIVATE: mục 5.4 chạy trong CI hoặc script phát hành cục bộ (repo private, 0 đồng).

## 7. Triển khai

Phiếu toàn hệ `20261125-INT1`. Thứ tự: (1) tsudev.com: bản kê có chữ ký + mô-đun chứng thực + `426`/`403`; (2) thư viện
dùng chung: `tsudev_ui` (modal + kiểm bản kê + Key Attestation), `@tsudev/ui` (modal web/PWA), .NET/Rust dùng chung;
(3) từng repo. App iOS dùng App Attest khi có H1.

## 8. Nghiệm thu (DoD từng repo)

- [ ] Kiểm bản kê có chữ ký + modal khoá đúng mục 2, có test.
- [ ] API của repo (nếu có) trả `426`/`403` theo mục 2-3; không tin giá trị client (I1).
- [ ] Android: Key Attestation trước khi cấp khoá thiết bị; kênh Play thêm Play Integrity.
- [ ] Không SDK bên thứ ba gửi dữ liệu (I5).
- [ ] OPEN: gia cố mục 5.2. PRIVATE: làm rối mục 5.2 + cổng 5.4 đạt.
