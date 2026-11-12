# PHIẾU BÀN GIAO - Phiên 49: logo tsudev mới, logo riêng từng app, hết chớp đăng nhập, gỡ /projects trống

- **Mã phiếu**: 20261113-03
- **Phiên**: tsudev-06 (phiên 49), 13/11/2026
- **Trạng thái**: HOÀN THÀNH - việc còn lại ở mục 4, đề xuất cần chủ dự án quyết ở mục 5

## 1. Đã làm

| Việc                                                                                                                                                   | PR           | Production        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ----------------- |
| Logo / favicon / OG / manifest lấy NGUYÊN `packages/brand/source/logo-tsudev.png` (cú + chữ "tsudev"), xoá nền đen không thủng mặt cú, không biến dạng | #228         | Worker `3154a393` |
| Hết chớp "Đăng nhập" với người đã đăng nhập (gợi ý phiên `tsu-auth` đọc trước lần vẽ đầu; `THEME_SCRIPT_HASH` mới)                                     | #228         | `3154a393`        |
| Gỡ mọi lối vào `/projects` trống (menu, chân trang, 3 nút trang chủ, khối ở `/apps`); `/projects` 307 → `/apps` khi không có dự án                     | #228         | `3154a393`        |
| `/apps`: logo thật từng app + mục "Cài bằng lệnh" (winget, Scoop, Homebrew, APT/DNF); đổi tên TrafficMonitor-VN → tsudev-trafficmonitor                | #228         | `3154a393`        |
| Phiếu 20261113-01 (`pkg` cho Luyện Gõ Phím) - ĐÓNG; phiếu 20261112-03 - ĐÓNG                                                                           | #228         | `3154a393`        |
| Logo riêng cwico / tsudev SWICO / tsudev-contact (chủ dự án giao 13/11) trên `/apps`; phiếu 20261113-01 gửi ba repo đó                                 | PR phiên này | deploy sau merge  |

## 2. Kỹ thuật đáng nhớ

- **Chớp đăng nhập**: trang công khai là ISR nên HTML luôn ở trạng thái chưa đăng nhập, và `useSession()` chỉ biết phiên
  sau một lượt `/api/auth/session`; `<a href>` khiến MỖI cú bấm là tải lại trang. Sửa: `packages/ui/src/lib/authHint.ts`
  (ghi) + script trong `_document.tsx` (đọc, đặt `data-auth` trước lần vẽ đầu) + `SiteHeader` vẽ cả hai biến thể khi
  `loading` + CSS ở `globals.css` ẩn biến thể sai. Đo bằng Playwright, chặn `/api/auth/session` 1,5 giây: khung hình đầu
  hiện "Đăng xuất" + "Viết bài". Test quét nguồn: `apps/frontend-main/test/authHint.test.ts`. Gợi ý chỉ để VẼ - không cổng
  quyền nào đọc nó. Lần tải ĐẦU TIÊN ngay sau đăng nhập vẫn có thể chớp một lần (chưa có gợi ý).
- **Xoá nền đen của logo**: flood fill trần từ mép lọt qua khe tối giữa tai cú và vòng tròn, thủng mặt cú trên nền Sáng.
  Rào đóng hình thái học bán kính 14 (6 còn lọt). Chi tiết: `packages/brand/README.md`.
- **`/projects` trên production ngay sau deploy** vẫn 200 một lượt (bản dựng lúc build không có token prod ⇒ `failed`, không
  vào nhánh chuyển hướng); lượt ISR kế tiếp ra 307. Đo lại sau 1 phút trước khi kết luận - như mọi trang ISR.
- 🪤 `pkill -f "next dev"` trong cùng lệnh bash GIẾT LUÔN chính shell đó (dòng lệnh chứa chuỗi khớp) - exit 144.
- 🪤 Dev proxy rơi sang cổng **8090** khi 8080 bận (phiên khác) - đọc dòng `[dev-proxy] cổng` trong log.

## 3. Phiếu đã gửi

- `~/projects/tsudev-cwico/logs/handover/20261113-01_yeu-cau-logo-rieng-cwico.md`
- `~/projects/tsudev-swico/logs/handover/20261113-01_yeu-cau-logo-rieng-swico.md`
- `~/projects/tsudev-contact/logs/handover/20261113-01_yeu-cau-logo-rieng-contact.md`
  (nguồn duy nhất trong repo app, dây chuyền sinh + `--check`, AVIF/WebP/ICO nhiều lớp, xoá nền trắng cho cwico, giữ ô nền
  đặc cho SWICO/contact, icon app theo nền tảng; xong thì báo URL để `/apps` đổi nguồn sang website app.)
- Bổ sung vào đề xuất quy ước `~/projects/tsudev-standards/tsudev-standards/logs/handover/20261112-01_de-xuat-logo-rieng-tung-san-pham.md`:
  favicon tsudev.com nay CÓ CHỮ (chủ dự án chọn - lệch BRAND_ASSETS mục 2), tên tệp brand cũ đã gỡ, ảnh hưởng tới
  `tsudev-game-kit/tools/sinh-thuong-hieu.mjs`.

## 4. Việc còn lại

1. **Chủ dự án áp nội dung lên Neon** (tài liệu đổi tên tsudev-trafficmonitor, "Cài bằng lệnh" đủ 4 kênh, kiểm tệp khớp
   thực tế): `DATABASE_URL=<Neon trực tiếp, không pooler, bỏ channel_binding> node scripts/don-noi-dung-lac-de.js --apply --noi-dung`.
   Trước đó chạy không `--apply` để xem trước. Nghiệm thu: `curl -s https://tsudev.com/docs/gioi-thieu-he-sinh-thai-tsudev | grep -c TrafficMonitor-VN` = 0.
   (Phiên agent không giữ chuỗi kết nối Neon - cố ý.)
2. Ba repo app làm phiếu logo; khi website app phục vụ logo mới → đổi `SOURCES` trong `packages/brand/build-eco-icons.js` sang URL.
3. Việc cũ không đổi: QU-STD-4, QU-STD-AUTH, C1; T18/T20/T21/T24 (phiếu 20261109-05 mục 4); winget `tsudev.TrafficMonitor` chờ PR winget-pkgs #477193.

## 5. Đề xuất: mọi phần mềm hệ sinh thái cài được bằng MỘT lệnh (chờ chủ dự án quyết)

Hiện trạng đo 13/11/2026 (`packaging/package.json` của từng repo):

- tsudev-trafficmonitor: Scoop; winget chờ duyệt.
- cwico: winget.
- tsudev SWICO: winget, Scoop.
- tsudev-files: Scoop, Homebrew; dự kiến winget, APT/RPM.
- Lotus Share: Scoop, Homebrew, APT/RPM; dự kiến winget.
- tsudev-contact: CHƯA kênh nào; dự kiến winget.
- La bàn: Android, không có kênh dòng lệnh.
- Luyện Gõ Phím: APT/RPM.

**Nguyên nhân gốc của lỗi tên cũ**: mỗi repo đã có manifest chuẩn `packaging/package.json`, nhưng tsudev.com chép tay dữ
liệu đó vào `ecosystem.ts` ⇒ đổi tên/kênh ở repo app không tự lan sang. Đề xuất, theo thứ tự giá trị:

1. **Danh mục sinh tự động** (APT/RPM: ĐÃ LÀM 13/11 - `pkg.tsudev.com/catalog.json` → `npm run pkg:catalog` → `pkgCatalog.generated.ts`, phiếu 20261113-02; còn winget/Scoop/Homebrew và tên/logo từ `packaging/package.json`) - CI của tsudev.com (hoặc `linux-packages`) gom `packaging/package.json` của mọi repo thành
   `catalog.json` lúc build; `/apps` và mọi website `*.tsudev.com` đọc cùng danh mục đó. Hết chép tay, hết lệch tên.
2. **Phủ kênh còn thiếu** bằng tự động hoá trong workflow phát hành của từng repo: winget (`komac` / `wingetcreate` mở PR
   vào winget-pkgs khi có tag), Scoop (excavator đã chạy), Homebrew (tap tự cập nhật), APT/RPM (`linux-packages`).
   Ưu tiên: winget cho tsudev-files, Lotus Share, tsudev-contact; Scoop cho cwico, tsudev-contact; APT/RPM cho tsudev-files.
3. **Lệnh khởi động một dòng** `irm https://tsudev.com/install.ps1 | iex` / `curl -fsSL https://tsudev.com/install.sh | sh`:
   thêm nguồn tsudev (bucket/tap/kho APT) rồi `tsudev install <app>`. Tiện nhất cho người dùng, nhưng là script chạy với
   quyền người dùng - cần ký (Authenticode cho .ps1, chữ ký GPG/SHA-256 công bố cho .sh) và review kỹ. Làm SAU 1-2.
4. **Ký mã Windows** để hết cảnh báo SmartScreen: SignPath Foundation (miễn phí cho mã nguồn mở) hoặc Azure Trusted Signing
   (trả phí theo tháng). Đây là điều kiện để winget/Scoop trông "chính thức" trên máy người dùng.
