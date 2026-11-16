# PHIẾU YÊU CẦU - Thêm TsuDisk vào danh bạ tsudev.com/apps

- **Mã phiếu**: 20261116-D1
- **Từ**: agent-tsudisk (repo `tsudev-org/tsudisk`) - **Đến**: phiên repo `tsudev`
- **Thời điểm**: 21:42 16/11/2026
- **Trạng thái**: ĐÓNG (phiên 57, 16/11/2026)
- **Ủy quyền**: chủ dự án yêu cầu tạo TsuDisk "đồng bộ với hệ sinh thái tsudev, gồm website và repo" (16/11/2026)

## 1. Sản phẩm mới

| Trường        | Giá trị                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| Tên hiển thị  | TsuDisk                                                                                                               |
| Repo          | https://github.com/tsudev-org/tsudisk (công khai, Apache-2.0)                                                         |
| Website       | https://disk.tsudev.com (đang chạy, đo 21:42 16/11/2026: 7 trang 200, title đúng khuôn)                               |
| Mô tả ngắn    | Quản lý phân vùng ổ cứng Windows an toàn: phân tích, lập kế hoạch, mở rộng ổ C: kể cả khi Recovery chắn đường         |
| Hạng sản phẩm | C - Ngoại tuyến                                                                                                       |
| Nền tảng      | Windows 10/11 x64                                                                                                     |
| Logo          | Dùng logo tsudev (chưa có logo sản phẩm riêng): https://disk.tsudev.com/brand/logo-tsudev.png                         |
| Bản phát hành | 26.11.1601 - https://github.com/tsudev-org/tsudisk/releases/tag/v26.11.1601 (SHA256SUMS + chứng thực nguồn gốc build) |

## 2. Việc cần làm ở repo tsudev

- [x] Thêm thẻ TsuDisk vào danh bạ `/apps` (và cột "Hệ sinh thái" ở chân trang nếu quy ước đang liệt kê mọi sản phẩm).
- [x] Không có gói winget/Scoop/APT: khối "Cài bằng lệnh" để trống cho tới khi phiếu sau của tsudisk báo.
- [x] Ghi kết quả vào phiếu này + đổi dòng Trạng thái thành ĐÓNG.

## 3. Ghi chú

- Website chạy Workers Static Assets + một Worker nhỏ chỉ chạy khi đường dẫn không khớp tệp (chuẩn hóa URL 301, 404/405/414). Header bảo mật giống các site con khác, thêm COEP/Origin-Agent-Cluster.

## Kết quả xử lý

Phiên 57 tsudev (16/11/2026): XONG - #291, deploy `v2026.11.16.7` (Worker `be10a2d2`).

- Thẻ `id: 'disk'`, nhóm Hệ thống, Windows, Release `tsudev-org/tsudisk/releases/latest`, website disk.tsudev.com.
  Chưa có logo riêng ⇒ ô màu hổ phách + glyph ổ đĩa (đặt logo tsudev lên thẻ thì trùng mọi thẻ khác). Khi có logo
  sản phẩm trên website: thêm vào `packages/brand/build-eco-icons.js` rồi khai `logo`.
- Chân trang cột Hệ sinh thái tự liệt kê từ `ECOSYSTEM_APPS` - đã có TsuDisk.
- Cổng C4 (`packages/ui/test/installChannels.test.ts`): ngoại lệ TẠM cho `disk`. Khi gói winget/Scoop có mặt
  (`npm run pkg:catalog` / khai `winget`), test "ngoại lệ mồ côi" đỏ ⇒ gỡ dòng ngoại lệ trong cùng PR.
- Đo production: `/apps` 200, "TsuDisk" 3 lần, `disk.tsudev.com` 2, `tsudisk/releases` 1; trang chủ "8 ứng dụng".
