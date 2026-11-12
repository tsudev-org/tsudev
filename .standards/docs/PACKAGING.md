# PHÂN PHỐI VÀ CÀI ĐẶT BẰNG LỆNH (v1.0.0)

> Mọi app/tool tsudev có bản cài cho máy tính `SHOULD` cài được bằng **một lệnh terminal** qua trình quản lý gói
> chính thống của từng hệ điều hành, với gói do chính tsudev đóng gói, ký và kiểm. Tài liệu này quy định kênh,
> tên gói, chữ ký, quy trình CI và cách trình bày lệnh cài trên website. Chi phí: **0 đồng**
> ([`FREE_TIER_STACK.md`](FREE_TIER_STACK.md)).

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
| Android `applicationId` | `com.tsudev.<ten>` | `com.tsudev.lotus` |

- Mã đã công bố **MUST NOT** đổi, kể cả khi sai khuôn (`tsudev.SWICO`, `tsudev.cwico` giữ nguyên): đổi mã làm
  máy đã cài mất đường cập nhật. Đây là cùng lý do với quy tắc tên repo cũ ở `GIT_WORKFLOW.md`.
- Tên gói Linux có tiền tố `tsudev-` để không đụng gói của dự án gốc (vd. `trafficmonitor`, `localsend`).
- Phiên bản gói = phiên bản bản phát hành theo [`VERSIONING.md`](VERSIONING.md) mục 2 (`{YY}.{M}.{DD}{NN}`).

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
- [ ] `SHA256SUMS` và chứng thực build có trên Release.
- [ ] Manifest kênh ghim SHA-256, sinh tự động.
- [ ] Job `verify-install` xanh trên cả ba hệ điều hành liên quan.
- [ ] Lệnh trên website chép ra chạy được nguyên văn trên máy sạch.
- [ ] Gỡ cài đặt sạch (`winget uninstall`, `apt remove`, `brew uninstall`) không để lại dịch vụ chạy nền.
