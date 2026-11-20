# PHÂN PHỐI VÀ CÀI ĐẶT BẰNG LỆNH (v1.1.0)

> Mọi app/tool tsudev có bản cài cho máy tính `SHOULD` cài được bằng **một lệnh terminal** qua trình quản lý gói
> chính thống của từng hệ điều hành, với gói do chính tsudev đóng gói, ký và kiểm. Tài liệu này quy định kênh,
> tên gói, chữ ký, quy trình CI và cách trình bày lệnh cài trên website. Chi phí: **0 đồng**
> ([`FREE_TIER_STACK.md`](FREE_TIER_STACK.md)). Cửa hàng ứng dụng (Microsoft Store, Google Play, App Store), ký mã,
> notarize và chống báo nhầm antivirus: [`DISTRIBUTION_TRUST.md`](DISTRIBUTION_TRUST.md).

## 1. Kênh phân phối được duyệt

| Nền tảng | Kênh | Lệnh người dùng | Mức |
| --- | --- | --- | --- |
| Windows | **winget** (kho `microsoft/winget-pkgs`) | `winget install --id tsudev.<Ten> -e` | `SHOULD` cho mọi app Windows |
| Windows | **Scoop** bucket `tsudev-org/scoop-bucket` | `scoop bucket add tsudev https://github.com/tsudev-org/scoop-bucket` rồi `scoop install tsudev/<ten>` | `SHOULD` cho bản portable / CLI |
| Debian, Ubuntu, Mint | **Kho APT** ký GPG tại `https://pkg.tsudev.com/apt` | `sudo apt install tsudev-<ten>` (sau bước thêm kho, mục 5) | `SHOULD` cho app Linux |
| Fedora, RHEL, openSUSE | **Kho RPM** ký GPG tại `https://pkg.tsudev.com/rpm` | `sudo dnf install tsudev-<ten>` | `MAY` |
| macOS (và Linux) | **Homebrew** tap `tsudev-org/homebrew-tap` | `brew install tsudev-org/tap/<ten>` | `SHOULD` cho app macOS |
| Android | **GitHub Releases** + kho F-Droid riêng `https://pkg.tsudev.com/fdroid` | Obtainium / thêm kho vào F-Droid | `MAY` (Play Store vẫn là kênh chính nếu có) |
| Mọi nơi | **Lệnh cài một dòng** (mục 6) | `irm https://tsudev.com/install.ps1 \| iex` · `curl -fsSL https://tsudev.com/install.sh \| sh` | `MAY` |

Không dùng kênh ngoài bảng (Chocolatey, Snap Store, Flathub, AUR, npm cho app desktop...) khi chưa có đề xuất
trong `proposals/`. Lý do: mỗi kênh thêm một nơi phải giữ khóa, phải cập nhật, phải trả lời báo lỗi; kênh bỏ quên
sẽ thành bản cũ có lỗ hổng mà người dùng vẫn tải.

## 2. Tên gói và mã định danh

| Kênh | Khuôn | Ví dụ |
| --- | --- | --- |
| winget `PackageIdentifier` | `tsudev.<TenSanPham>` | `tsudev.TrafficMonitor`, `tsudev.Files` |
| Scoop, Homebrew, APT, RPM | `tsudev-<ten>` chữ thường, gạch nối ASCII | `tsudev-trafficmonitor`, `tsudev-files` |
| Scoop, Homebrew, APT, RPM - sản phẩm có **thương hiệu riêng** (mục 2.1) | tên thương hiệu chữ thường, gạch nối ASCII | `tsuswico`, `tsucontact`, `lotus-share` |
| Android `applicationId` | `com.tsudev.<ten>` | `com.tsudev.lotus` |

- Mã đã công bố **MUST NOT** đổi, kể cả khi sai khuôn (`tsudev.SWICO`, `tsudev.cwico` giữ nguyên): đổi mã làm
  máy đã cài mất đường cập nhật. Đây là cùng lý do với quy tắc tên repo cũ ở `GIT_WORKFLOW.md`.
- Tên gói Linux có tiền tố `tsudev-` để không đụng gói của dự án gốc (vd. `trafficmonitor`, `localsend`).
- Phiên bản gói = phiên bản bản phát hành theo [`VERSIONING.md`](VERSIONING.md) mục 2 (`YY.M.DDNN`).

### 2.1. Tên gói theo thương hiệu riêng (từ v1.1.0)

- Sản phẩm có thương hiệu riêng **được chủ dự án duyệt** (dòng Tsu: `tsuswico`, `tsucwico`, `tsucontact`, `tsufiles`;
  thương hiệu độc lập: `lotus-share`) `MAY` dùng tên thương hiệu làm tên gói thay khuôn `tsudev-<ten>`.
- Tên gói theo thương hiệu `MUST`: chữ thường, chỉ `a-z`, `0-9`, gạch nối ASCII; `MUST NOT` trùng tên gói của bản phân
  phối (Debian/Ubuntu/Fedora), của Homebrew core/cask chính thức, hay của dự án gốc khi là bản fork. Kiểm trước khi
  công bố: `apt-cache policy <ten>`, `dnf info <ten>`, `brew info --cask <ten>`, `scoop search <ten>` trên máy sạch.
- Tên `MUST` được ghi đích danh ở repo kho gói (`tsudev-org/linux-packages` `products.json` khóa `tenRieng`) và trong
  `packaging/package.json` của sản phẩm. Không ghi đích danh thì CI kho gói dùng khuôn `tsudev-<ten>`.
- Tên gói **mới** chọn thương hiệu ngay từ đầu thì không có gì để chuyển. Sản phẩm **đã công bố** gói theo khuôn cũ mà
  muốn đổi sang tên thương hiệu thì `MUST` theo mục 2.2.

### 2.2. Đổi tên gói đã công bố (từ v1.1.0)

Nguyên tắc: **máy đã cài bằng tên cũ `MUST` tiếp tục nhận bản mới mà người dùng không phải làm gì**, giống quy tắc tên
repo cũ ở `GIT_WORKFLOW.md`. Đổi tên gói không bao giờ là "xoá tên cũ, tạo tên mới".

| Kênh | Cách làm bắt buộc | Không đủ / cấm |
| --- | --- | --- |
| APT | Mỗi bản phát hành kèm gói **chuyển tiếp rỗng** tên cũ, cùng phiên bản: `Depends: <ten-moi> (>= V)`, `Section: oldlibs`. Bản rỗng thay bản cũ nên tệp cũ tự được gỡ; `Replaces:`/`Breaks:` chỉ cần khi hai gói dùng chung đường dẫn tệp | Chỉ thêm `Provides:` ở gói mới - `apt upgrade` không tự chuyển máy đã cài |
| RPM | Gói mới khai `Provides: <ten-cu> = V` + `Obsoletes: <ten-cu> < V` (nfpm: `provides` + `replaces`), theo Fedora Packaging Guidelines "Renaming/Replacing" | Thiếu `Provides:` - gói khác `Requires: <ten-cu>` sẽ gãy |
| Homebrew (tap riêng) | **Giữ** cask tên cũ, `deprecate! date: ..., because: "is renamed to <moi>", replacement_cask: "<moi>"`, vẫn trỏ bản mới | `cask_renames.json` - với tap bên thứ ba **không** chuyển máy đã cài (đã thử 12/11/2026, CI đỏ) |
| Scoop | **Giữ** manifest tên cũ, vẫn trỏ bản mới (cùng `autoupdate`), `notes` ghi lệnh chuyển: `scoop uninstall <cu>; scoop install tsudev/<moi>` | Xoá manifest cũ - `scoop update` báo "không tìm thấy" và máy cài dừng ở bản cũ |
| winget | Mã đã được **duyệt vào `winget-pkgs`** `MUST NOT` đổi (winget không có cơ chế đổi tên chuyển máy đã cài; `tsudev.SWICO`, `tsudev.cwico` giữ nguyên). Mã **chưa từng được duyệt** `MAY` thay bằng mã mới (`tsudev.Lotus` thành `tsudev.LotusShare`) | Mở PR đổi `PackageIdentifier` của gói đã duyệt |
| Android | `applicationId` **không bao giờ đổi** (Play và mọi trình cập nhật coi là app khác); chỉ đổi tên hiển thị | - |

- Danh sách tên cũ `MUST` ghi trong `packaging/package.json` khóa `linux.formerNames` (và tương đương cho Scoop/Homebrew
  của sản phẩm) để CI sinh gói chuyển tiếp, không gõ tay.
- CI kho gói `MUST` kiểm **đường nâng cấp thật từ bản cũ**: cài gói tên cũ ở phiên bản cũ đã công bố rồi chạy
  `apt upgrade` / `dnf upgrade` / `brew upgrade` / `scoop update`, kết quả phải ra gói tên mới và không còn tệp mồ côi
  của gói cũ. Ít nhất: Ubuntu LTS mới nhất, Debian ổn định, Fedora mới nhất, macOS, Windows.
- Gói tên cũ `MUST` được giữ và tiếp tục nhận bản mới **tối thiểu 12 tháng** sau khi đổi tên; gỡ hẳn sau đó cần đề xuất
  được duyệt và một bản phát hành cuối ghi rõ lệnh chuyển. Tên cũ `MUST NOT` bị dùng lại cho gói khác, kể cả sau khi gỡ.
- Trang Tải về và `/apps` (mục 8) chỉ in tên **mới**; tên cũ chỉ xuất hiện trong ghi chú chuyển đổi.

## 3. Một nguồn khai báo: `packaging/package.json` trong repo sản phẩm

Mỗi repo sản phẩm có phân phối `SHOULD` có tệp `packaging/package.json`, là **nguồn duy nhất** để sinh manifest
winget, Scoop, công thức Homebrew, cấu hình `nfpm` (deb/rpm) và khối "Cài bằng lệnh" của website:

```json
{
  "schema": 1,
  "name": "tsudev-files",
  "winget": "tsudev.Files",
  "homepage": "https://files.tsudev.com",
  "license": "MIT",
  "description": { "vi": "Quản lý tệp nhanh, an toàn", "en": "Fast, secure file manager" },
  "assets": {
    "windows-x64":  { "file": "tsudev-files-{version}-win-x64.zip",  "kind": "portable", "bin": "tsudev-files.exe" },
    "linux-x64":    { "file": "tsudev-files-{version}-linux-x64.tar.gz", "kind": "tar", "bin": "tsudev-files" },
    "linux-arm64":  { "file": "tsudev-files-{version}-linux-arm64.tar.gz", "kind": "tar", "bin": "tsudev-files" },
    "macos-arm64":  { "file": "tsudev-files-{version}-osx-arm64.tar.gz", "kind": "tar", "bin": "tsudev-files" }
  },
  "channels": ["winget", "scoop", "apt", "rpm", "brew"]
}
```

Không viết tay manifest từng kênh rồi để lệch nhau. Tệp sinh ra ghi dòng đầu "sinh tự động từ packaging/package.json".

## 4. Chữ ký và kiểm chứng (bắt buộc với mọi kênh)

1. Mỗi bản phát hành `MUST` có `SHA256SUMS` liệt kê mọi tệp tải về, và `MUST` có **chứng thực nguồn gốc build**
   bằng `actions/attest-build-provenance` (Sigstore, miễn phí cho repo public). Người dùng kiểm bằng
   `gh attestation verify <tệp> -R tsudev-org/<repo>`.
2. Manifest winget / Scoop / Homebrew `MUST` ghim SHA-256 của tệp tải về; CI sinh từ `SHA256SUMS`, không chép tay.
3. Kho APT/RPM `MUST` ký bằng khóa GPG riêng cho kho (không dùng chung khóa ký APK, khóa cập nhật app hay khóa cá
   nhân). Khóa chính giữ ngoại tuyến bởi chủ project; CI chỉ giữ **khóa con ký** (subkey, hạn 2 năm) trong secret
   của GitHub Environment `packages` có bật yêu cầu duyệt. Khóa công khai công bố tại
   `https://pkg.tsudev.com/tsudev-archive-keyring.gpg` và vân tay ghi trên trang `/apps` của tsudev.com.
4. Windows chưa có chứng thư Authenticode thì SmartScreen vẫn cảnh báo; trang tải `MUST` nói rõ điều này và chỉ
   cách kiểm `SHA256SUMS`. Ký Authenticode miễn phí qua SignPath Foundation chỉ áp dụng cho repo có giấy phép OSI.

## 5. Kho APT/RPM tại `pkg.tsudev.com`

- Lưu trên **Cloudflare R2** (gói miễn phí 10 GB, không tính phí băng thông ra) gắn tên miền `pkg.tsudev.com`;
  không cần máy chủ.
- Gói `.deb` / `.rpm` dựng bằng **nfpm** từ chính bản build Linux đã phát hành (không build lại), siêu dữ liệu kho
  sinh bằng `apt-ftparchive` (APT, ký `InRelease` + `Release.gpg`) và `createrepo_c` (RPM, ký `repomd.xml.asc`).
- Lệnh thêm kho in trên website, dạng `signed-by` (không dùng `apt-key` đã bỏ):

```bash
curl -fsSL https://pkg.tsudev.com/tsudev-archive-keyring.gpg | sudo tee /usr/share/keyrings/tsudev.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/tsudev.gpg] https://pkg.tsudev.com/apt stable main" | sudo tee /etc/apt/sources.list.d/tsudev.list
sudo apt update && sudo apt install tsudev-<ten>
```

- Kho giữ **3 phiên bản gần nhất** mỗi gói; bản cũ hơn vẫn tải được từ GitHub Releases.

## 6. Lệnh cài một dòng

`curl | sh` tiện nhưng là điểm tấn công tập trung. Script `install.sh` / `install.ps1` tại tsudev.com `MUST`:

- chỉ làm ba việc: phát hiện hệ điều hành + kiến trúc, **ưu tiên chuyển sang trình quản lý gói** (winget, apt,
  dnf, brew) nếu có, nếu không thì tải tệp từ GitHub Releases của `tsudev-org` và kiểm SHA-256 trước khi giải nén;
- không chạy mã tải về khác ngoài gói đã kiểm; không cần quyền quản trị trừ khi gọi trình quản lý gói;
- được phục vụ với CSP và `Cache-Control: no-cache`, có bản `.sha256` công bố cạnh script, và nằm trong repo
  `tsudev-org/tsudev` để mọi thay đổi qua PR.

## 7. Quy trình CI khi phát hành

Workflow phát hành của repo sản phẩm, chạy khi đẩy nhãn `v*`:

1. Build → `SHA256SUMS` → `actions/attest-build-provenance` → tạo GitHub Release.
2. Job `packaging` (cần Environment `packages`):
   - winget: `komac update tsudev.<Ten> --version <v> --urls <...> --submit` (token PAT tối thiểu quyền
     `public_repo` cho fork `winget-pkgs` của tài khoản đóng gói, lưu trong Environment);
   - Scoop / Homebrew: sinh tệp từ `packaging/package.json`, mở PR vào `tsudev-org/scoop-bucket` /
     `tsudev-org/homebrew-tap` (bucket/tap có CI kiểm SHA-256 và tự merge khi xanh);
   - APT/RPM: nfpm → ký → đẩy lên R2 bằng `wrangler r2 object put`.
3. Job `verify-install` chạy **cài thật** trên runner `windows-latest`, `ubuntu-latest`, `macos-latest` bằng đúng
   lệnh in trên website; lệnh nào hỏng thì Release bị đánh dấu đỏ và mở Issue tự động.

Repo private (không có Actions miễn phí đủ dùng) chạy cùng các bước bằng script cục bộ trong `packaging/tools/`.

## 8. Trình bày trên website

- Trang Tải về của mọi `*.tsudev.com` có phân phối `MUST` có khối **"Cài bằng lệnh"**: tab theo hệ điều hành
  (Windows: winget / Scoop · Linux: apt / dnf · macOS: brew), mỗi tab một khối mã có nút chép, chọn sẵn tab theo
  `navigator.userAgentData` / `userAgent`. Khối sinh từ `packaging/package.json` lúc build, không gõ tay.
- Trang `/apps` của tsudev.com liệt kê lệnh cài của mọi sản phẩm, vân tay khóa GPG và cách kiểm chứng.
- Kênh chưa có gói thật thì **không** hiện tab (không hiện lệnh sẽ báo "không tìm thấy gói").

## 9. Checklist trước khi công bố một kênh

- [ ] `packaging/package.json` hợp lệ, tên gói đúng mục 2.
- [ ] Gói đổi tên: tên cũ còn nhận bản mới theo bảng mục 2.2, CI kiểm đường nâng cấp từ bản cũ xanh.
- [ ] `SHA256SUMS` và chứng thực build có trên Release.
- [ ] Manifest kênh ghim SHA-256, sinh tự động.
- [ ] Job `verify-install` xanh trên cả ba hệ điều hành liên quan.
- [ ] Lệnh trên website chép ra chạy được nguyên văn trên máy sạch.
- [ ] Gỡ cài đặt sạch (`winget uninstall`, `apt remove`, `brew uninstall`) không để lại dịch vụ chạy nền.
