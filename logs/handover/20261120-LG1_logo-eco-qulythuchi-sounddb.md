# 20261120-LG1 - tsudev: logo thật cho Quly Thu Chi + Sound Db trên tsudev.com/apps

- **Người lập**: phiên `tsuswico-57`, 20/11/2026, theo yêu cầu trực tiếp của chủ dự án (đồng bộ logo/favicon các
  sản phẩm trên tsudev.com).
- **Người làm**: phiên tsudev. **Trạng thái**: ĐÓNG mã (20/11/2026) - chờ deploy frontend.
- **Phiếu con**: `qulythuchi/logs/handover/20261120-LG1_*`, `sound-db/logs/handover/20261120-LG1_*`,
  `tsucwico/logs/handover/20261120-LG1_*` (cwico chỉ đổi app, logo website giữ nguyên - không việc gì ở đây).

## 1. Hiện trạng (đo 20/11/2026)

- `packages/ui/src/lib/ecosystem.ts`: `sounddb` và `qulythuchi` chưa có `logo` (ô màu `tint` + glyph `icon`), ghi chú
  "Chưa có logo riêng".
- Chủ dự án vừa giao logo riêng cho hai sản phẩm (tệp ở gốc repo tương ứng, SHA trong phiếu con):
  - Quly Thu Chi: nền trắng ⇒ `no-white`.
  - Sound Db: nền navy đặc ⇒ `tile`; **có dấu ✦ của công cụ tạo ảnh ở góc phải dưới - KHÔNG đưa lên tsudev.com khi
    chưa bỏ** (xem phiếu con sound-db mục 2).
- Tsu Swico (`swico`): không đổi - eco icon đã lấy `https://swico.tsudev.com/brand/logo-swico.png`.

## 2. Việc phải làm

1. Ưu tiên nguồn URL website app (mục 15.6): khi hai repo deploy xong, thêm vào `SOURCES` của
   `packages/brand/build-eco-icons.js`:
   - `qulythuchi: { src: 'https://qulythuchi.tsudev.com/brand/logo-qulythuchi.png' }`
   - `sounddb: { src: 'https://sounddb.tsudev.com/brand/logo-sound-db.png' }`
     (bản trên website đã xử lý nền ⇒ `as-is`).
     Muốn lên sớm hơn: dùng nguồn tạm `source/eco/<id>.png` (chép tệp chủ dự án giao; Sound Db phải bỏ dấu ✦ trước),
     rồi đổi sang URL và xoá tệp khi website app có logo - như cwico/swico/contact ngày 13/11.
2. `node packages/brand/build-eco-icons.js qulythuchi sounddb` ⇒ `apps/frontend-main/public/eco/{qulythuchi,sounddb}.webp`.
3. `ecosystem.ts`: thêm `logo: '/eco/<id>.webp'` cho hai mục, sửa ghi chú "Chưa có logo riêng"; chạy
   `packages/ui/test/ecosystem.test.ts`.
4. Kiểm trang `/apps` (và chỗ khác dùng `EcoApp.logo`) sáng/tối, axe; deploy.

## 3. Kết quả

- 20/11/2026, phiên điều phối tsudev-2cce: cả hai website đã phục vụ logo (200, PNG 512x512) ⇒ dùng thẳng URL, không
  qua `source/eco/`. Đo thực tế: logo Quly Thu Chi trên website vẫn là ô nền TRẮNG đục (chỉ 4 góc trong suốt) ⇒
  `mode: 'no-white'` thay vì `as-is`; logo Sound Db là ô navy bo góc sẵn, ĐÃ bỏ dấu ✦ ⇒ `as-is`.
- `eco/qulythuchi.webp` sha256 nguồn `9d0d428e26bbed3f…`; `eco/sounddb.webp` sha256 nguồn `ab0fa525f83ef52e…`.
- `ecosystem.ts`: thêm `logo` cho hai mục, sửa ghi chú; `packages/ui` test 280/280 xanh. Xem ở nền #0A0A0A và
  trắng: đọc được cả hai chế độ (ví navy của Quly Thu Chi hơi chìm trên nền Tối, mũi tên xanh giữ hình).
- Còn: deploy frontend (`scripts/deploy-frontend.js`, cần chủ dự án duyệt) rồi nhìn `/apps` sáng/tối.
