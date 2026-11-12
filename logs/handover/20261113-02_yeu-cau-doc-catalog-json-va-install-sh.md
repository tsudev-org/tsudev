# PHIẾU YÊU CẦU - Đọc `pkg.tsudev.com/catalog.json` lúc build + script `install.sh` / `install.ps1`

- **Mã phiếu**: 20261113-02
- **Từ**: phiên `linux-packages-1e` (repo `tsudev-org/linux-packages`) - **Đến**: phiên repo `tsudev`
- **Thời điểm**: 13/11/2026
- **Ủy quyền**: chủ dự án giao phiên `linux-packages-1e` chọn phương án chuẩn hóa "mọi phần mềm/tool cài được bằng
  lệnh terminal" cho toàn hệ `*.tsudev.com` (13/11/2026). Phiếu này là phần thuộc repo `tsudev`.
- **Trạng thái**: MỞ - mục 2.1 XONG (13/11/2026); 2.2-2.3 chờ chủ dự án quyết (xem mục 4)

## 1. Đã có phía kho

`https://pkg.tsudev.com/catalog.json` (schema 1, `Cache-Control: no-cache`) - linux-packages PR #10, xuất bản lượt
43276036908, cài thật từ kho trên Ubuntu 22.04/24.04, Debian 12/13, Fedora + ARM64 đều xanh. Nội dung: **chỉ gói đang
có trong kho**:

```jsonc
{ "schema": 1, "base": "https://pkg.tsudev.com", "updated": "…",
  "key": { "fingerprint": "388310F4…3C74", "gpg": "…/tsudev-archive-keyring.gpg", "asc": "…" },
  "setup": { "apt": ["curl … | sudo tee /usr/share/keyrings/tsudev.gpg >/dev/null", "echo \"deb […]\" | sudo tee …", "sudo apt update"],
             "dnf": ["sudo curl -fsSLo /etc/yum.repos.d/tsudev.repo …/rpm/tsudev.repo"] },
  "packages": [ { "name": "tsudev-luyen-go-phim", "version": "26.11.1201-1", "versions": […], "arch": ["x64"],
                  "deb": {"arch": ["amd64"], "files": […]}, "rpm": {"arch": ["x86_64"], "files": […]},
                  "homepage": "https://luyen-go-phim.tsudev.com", "displayName": "Luyện Gõ Phím", "command": "…",
                  "formerNames": [], "install": {"apt": "sudo apt install …", "dnf": "sudo dnf install …"},
                  "installFull": {"apt": "…", "dnf": "…"}, "description": {"vi": "…", "en": "…"}, … } ] }
```

Hợp đồng: thêm trường giữ `schema: 1`; đổi/bỏ trường thì tăng `schema` và báo trước qua phiếu.

## 2. Việc cần làm (đề xuất thứ tự)

1. **Bỏ gõ tay `pkg` / `pkgArch`** (PR #228 vừa thêm cho game): `packages/ui` đọc `catalog.json` **lúc build**
   (fetch phía build/SSR, không fetch ở trình duyệt - R2 chưa cấu hình CORS), ghép theo `homepage` hoặc bảng
   ánh xạ `id -> name`. Gói có trong catalog -> hiện APT/DNF + kiến trúc (`arch`); không có -> không hiện
   (PACKAGING.md mục 8). Build không tải được catalog thì **dùng bản chụp đã commit** (ví dụ
   `packages/ui/src/data/pkg-catalog.json`, cập nhật bằng script/CI định kỳ) để build không phụ thuộc mạng; test kiểm
   bản chụp có `schema: 1`.
2. **Khối "Cài bằng lệnh" dùng chung cho mọi `*.tsudev.com`**: component trong `packages/ui` (tab Windows/Linux/macOS,
   nút chép, chọn tab theo `userAgentData`), nhận dữ liệu từ catalog (Linux) + winget/Scoop/Homebrew (các kênh đó
   cũng nên có danh mục máy đọc tương tự - xem mục 3).
3. **`install.sh` / `install.ps1` tại tsudev.com** đúng PACKAGING.md mục 6 (nằm trong repo này, qua PR, có `.sha256`,
   `Cache-Control: no-cache`):
   - `curl -fsSL https://tsudev.com/install.sh | sh -s -- <tên-gói>`: đọc `catalog.json`, phát hiện `apt`/`dnf` +
     kiến trúc; tải khóa, **so vân tay với `key.fingerprint` cứng trong script** (không tin vân tay tải về), rồi chạy
     đúng `setup` + `install`. Không có apt/dnf hoặc gói không có kiến trúc máy -> hướng dẫn tải từ GitHub Releases
     (kiểm SHA-256) hoặc dừng với thông báo rõ. Kiểm tên gói theo `^[a-z][a-z0-9-]+$` và phải có trong catalog.
   - `irm https://tsudev.com/install.ps1 | iex` (Windows): `winget install --id <id> -e`, không có winget thì Scoop.
   - CI repo này cài thử `install.sh` trong container Ubuntu 22.04/24.04, Debian 12/13, Fedora (có thể chép mẫu
     `tools/kiem-cai.sh` của linux-packages).
4. Deploy, kiểm `curl https://tsudev.com/apps` có lệnh của mọi gói trong catalog; ghi mục 4 phiếu này.

## 3. Ghi chú cho toàn hệ

- winget / Scoop / Homebrew: nên có danh mục máy đọc cùng dạng (`scoop-bucket`, `homebrew-tap` sinh JSON khi CI
  merge) để component ở mục 2.2 không gõ tay mã winget/scoop/brew. Phiếu riêng cho các repo đó nếu phiên này đồng ý.
- Kho kiểm bản mới **mỗi giờ** (trước 6 giờ); mỗi lần xuất bản vẫn cần duyệt Environment `packages`.

- **Bổ sung 13/11/2026** (phiên linux-packages-1e nhắn, phiên tsudev-06 chép vào đây): Scoop và Homebrew nay cũng có
  `catalog.json` schema 1 - `https://raw.githubusercontent.com/tsudev-org/scoop-bucket/main/catalog.json` (PR
  scoop-bucket#3, 5 gói, arch 32bit/64bit/arm64/any) và `https://raw.githubusercontent.com/tsudev-org/homebrew-tap/main/catalog.json`
  (PR homebrew-tap#2, 3 cask, có minMacos). Trường chung của cả ba: schema, name, version, arch, install, installFull,
  replacedBy. Mỗi repo có CI từ chối catalog cũ; catalog chỉ sinh lại sau bước cài thử thật. winget không có catalog
  riêng (manifest ở microsoft/winget-pkgs) - đề xuất giữ mã winget trong ecosystem.ts và kiểm tồn tại qua GitHub API
  `repos/microsoft/winget-pkgs/contents/manifests/t/tsudev/<Ten>`. Gói có `replacedBy`: website hiện gói mới, không tên cũ.

## 4. Kết quả xử lý (phiên nhận điền)

- 13/11/2026 - phiên tsudev-06 (phiên 49):
  - **2.1 XONG**: `scripts/pkg-catalog-sync.js` (`npm run pkg:catalog`, `-- --check`) tải catalog, KIỂM `schema === 1`,
    vân tay khớp giá trị CỨNG trong script, tên gói `^[a-z][a-z0-9-]+$`, `homepage` https://*.tsudev.com - sai là dừng
    không ghi; ghi bản chụp `packages/ui/src/lib/pkgCatalog.generated.ts` (đã commit, bản dựng không cần mạng).
    Mở rộng cùng ngày cho CẢ BA kho (APT/RPM + Scoop + Homebrew), bỏ gói `replacedBy`, không ghi `updated` (bản chụp
    chỉ đổi khi GÓI đổi). `ecosystem.ts` bỏ `pkg`/`pkgArch`/`scoop`/`brew` gõ tay (chỉ còn `winget`) - suy từ bản chụp theo `website` = `homepage` (Lotus Share: "Linux x86-64 ·
    ARM64"; Luyện Gõ Phím: "Linux x86-64"). Test: schema 1, vân tay khớp `PKG_REPO`, mọi gói có website trùng sản phẩm
    đều được ghép. `--check` KHÔNG đưa vào CI bắt buộc (sẽ làm đỏ PR không liên quan mỗi khi kho xuất bản gói mới);
    cập nhật bản chụp khi kho thêm gói, theo phiếu.
  - **2.2 HOÃN, có lý do**: `packages/ui` không được các website `*.tsudev.com` khác dùng (mỗi repo app có website
    riêng, stack riêng), nên component "dùng chung" ở đây không tới được các site đó. Đúng chỗ là bộ quy ước
    (`tsudev-standards`: hợp đồng dữ liệu + mẫu khối HTML/CSS thuần) - phiếu tsudev-standards 20261113-01 của phiên
    linux-packages là nơi chốt.
  - **2.3 CHỜ CHỦ DỰ ÁN**: `install.sh` / `install.ps1` chạy qua `curl | sh` / `irm | iex` trên máy người dùng - chủ dự
    án đã nói muốn THẢO LUẬN phần cài-bằng-lệnh toàn hệ sinh thái trước (chat 13/11/2026). Phương án đề xuất ở mục 5
    phiếu `20261113-03_phien-49-logo-icon-auth-cai-bang-lenh.md`.
