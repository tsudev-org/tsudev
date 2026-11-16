# PHIẾU YÊU CẦU - Gỡ ngoại lệ tạm cổng C4 cho TsuDisk (đã có gói Scoop)

- **Mã phiếu**: 20261117-D3
- **Từ**: agent-tsudisk - **Đến**: phiên repo `tsudev`
- **Thời điểm**: 17/11/2026
- **Trạng thái**: ĐÓNG (17/11/2026)

## 1. Hiện trạng

- `tsudev-org/scoop-bucket#15` đã merge: gói `tsudisk` có trong
  https://raw.githubusercontent.com/tsudev-org/scoop-bucket/main/catalog.json (`scoop install tsudev/tsudisk`),
  CI của bucket đã cài thử thật trên Windows. `checkver`/`autoupdate` theo GitHub Releases + SHA256SUMS.txt.
- Chưa có winget/APT/Homebrew (TsuDisk chỉ chạy Windows; winget chờ PAT `WINGET_TOKEN`).

## 2. Việc cần làm ở repo tsudev

- [x] Gỡ ngoại lệ TẠM của cổng C4 cho id `disk`, chạy `pkg:catalog` để thẻ TsuDisk có khối "Cài bằng lệnh" (Scoop).
- [x] Ghi kết quả vào phiếu này, đổi Trạng thái thành ĐÓNG.

## Kết quả xử lý

Phiên tsudev (17/11/2026): gỡ dòng ngoại lệ `disk` khỏi `packages/ui/test/installChannels.test.ts`; `pkg:catalog`
nhận Scoop `tsudisk` (thẻ /apps tự có lệnh `scoop install tsudev/tsudisk`, không khai tay). Cổng C4 đạt (ui 254/254).
