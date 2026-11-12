# PHIẾU YÊU CẦU - Trường `pkg` cho thẻ trò chơi trong `ECO_GAMES` (`tsudev-luyen-go-phim`)

- **Mã phiếu**: 20261113-01
- **Từ**: phiên `linux-packages-1e` (repo `tsudev-org/linux-packages`) - **Đến**: phiên sau của repo `tsudev`
- **Thời điểm**: 13/11/2026
- **Liên quan**: phiếu gốc `logs/handover/20261112-03_yeu-cau-kenh-phan-phoi-ban-cai-tro-choi.md` (mục 3, mục 7);
  `~/projects/linux-packages/logs/handover/20261112-01_yeu-cau-goi-tro-choi-tsugamelabs.md` (mục 4)
- **Trạng thái**: ĐÓNG (13/11/2026, phiên tsudev-06)

## 1. Gói đã có thật

`tsudev-luyen-go-phim` 26.11.1201-1 (amd64 / x86_64) đã ở kho `pkg.tsudev.com` từ 13/11/2026:

- PR tsudev-org/linux-packages#8 - CI cài thật trên Ubuntu 22.04/24.04, Debian 12/13, Fedora (lượt 43267001109).
- `xuat-ban.yml` lượt 43267940831 - ký, đẩy R2, cài lại từ `https://pkg.tsudev.com` xanh trên Ubuntu 24.04, Debian 12, Fedora.
- Kiểm: `curl -fsS https://pkg.tsudev.com/apt/dists/stable/main/binary-amd64/Packages | grep -A2 '^Package: tsudev-luyen-go-phim'`.

Chỉ có x86-64 (Release chưa có tệp `linux-arm64`).

## 2. Việc cần làm ở repo `tsudev`

1. `packages/ui/src/lib/ecosystem.ts`: kiểu `EcoGame` thêm `pkg?: string` (cùng chú thích với `EcoApp.pkg`: chỉ gói
   ĐÃ có trong kho - PACKAGING.md mục 8). Mục `id: 'luyen-go-phim'` trong `ECO_GAMES` thêm `pkg: 'tsudev-luyen-go-phim'`.
2. Thẻ game ở `/apps#tro-choi` hiện khối "Cài bằng lệnh" (APT + DNF) như thẻ app. `installCommands(app: EcoApp)` hiện
   chỉ nhận `EcoApp` - nới kiểu tham số (ví dụ `Pick<EcoApp, 'winget' | 'scoop' | 'brew' | 'pkg'>`) để dùng chung,
   thay vì viết lại `aptCommand`/`dnfCommand`. Ghi rõ "Linux x86-64".
3. `packages/ui/test/ecosystem.test.ts`: thêm ca kiểm game có `pkg` sinh đúng hai lệnh APT/DNF; game không có `pkg`
   không hiện khối lệnh.
4. Deploy, kiểm `curl https://tsudev.com/apps` có `sudo apt install tsudev-luyen-go-phim` trong HTML.
5. Ghi kết quả vào mục 7 phiếu gốc 20261112-03 và mục 3 dưới đây; báo phiên `tsudev-game-kit` (website riêng
   `luyen-go-phim.tsudev.com` có thể hiện cùng lệnh).

Các game khác: chỉ thêm `pkg` khi repo `TsuGameLabs/tsudev-<id>-releases` đã có Release và đã vào `products.json`
của `linux-packages` (CI cài thật xanh). Không hiện lệnh cho gói chưa có.

## 3. Kết quả xử lý (phiên nhận điền)

- 13/11/2026 - phiên tsudev-06 (phiên 49), PR #228, Worker `3154a393`:
  - Tự kiểm lại gói: `Packages` của kho có `tsudev-luyen-go-phim` 26.11.1201-1 amd64.
  - `EcoGame` thêm `pkg` + `pkgArch` ('Linux x86-64'); `installCommands` nhận kiểu `Installable` dùng chung
    (`Partial<Pick<EcoApp, 'winget' | 'scoop' | 'brew' | 'pkg'>>`), không viết lại `aptCommand`/`dnfCommand`.
  - Thẻ game dùng component chung `InstallCommands` (tách khỏi thẻ app), hiện "Cài bản máy tính · Linux x86-64" +
    APT/DNF, nhãn "Linux"; game không `pkg` không có khối lệnh.
  - Test `packages/ui/test/ecosystem.test.ts`: hai lệnh APT/DNF đúng gói; game không `pkg` ra `[]`.
  - Production: `curl https://tsudev.com/apps` có `sudo apt install tsudev-luyen-go-phim` (2 lần: APT + DNF dạng dnf).
  - Đã ghi mục 7 phiếu gốc 20261112-03. Báo phiên `tsudev-game-kit`: chưa có phiên game nào đang mở lúc ghi - phiên game
    sau đọc mục 7 phiếu gốc.
