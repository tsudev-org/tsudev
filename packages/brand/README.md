# @tsudev/brand - tài nguyên thương hiệu

Nơi lưu **nguồn duy nhất** của logo, avatar mặc định và favicon. Mọi file phục vụ
web trong `apps/*/public/` đều được **sinh tự động** từ thư mục này - đừng sửa
trực tiếp trong `public/`, vì lần chạy lại script sẽ ghi đè.

## Cấu trúc

```
packages/brand/
  source/
    logo-tsudev.png           1254x1254, cú + chữ "tsudev" trên nền đen - logo DUY NHẤT (13/11/2026)
    avatar.png                1490x1490, tham chiếu thiết kế cho avatar mặc định
    eco/{cwico,swico,contact}.png  logo app chủ dự án giao 13/11/2026, CHƯA lên website app
  build-assets.js             logo, favicon, manifest, ảnh OG, avatar
  build-eco-icons.js          logo THẬT của từng app hệ sinh thái → public/eco/*.webp
```

Logo cũ (`logo.jpeg` nền trắng, bộ favicon RealFaviconGenerator, wordmark SVG) đã gỡ
13/11/2026 khi chủ dự án đổi sang `logo-tsudev.png`; còn trong lịch sử git.

## Cập nhật tài nguyên

```bash
node packages/brand/build-assets.js       # sharp có sẵn trong node_modules (qua Next)
node packages/brand/build-eco-icons.js    # tải lại logo app từ website của app
node scripts/check-brand-assets.js        # cổng kiểm (CI cũng chạy)
```

### Đầu ra (`apps/frontend-main/public/`)

- `brand/logo-tsudev.png` (1024) và `brand/logo-tsudev-256.png` - logo đầy đủ, nền trong suốt.
- `brand/logo-tsudev-{48,96,144,192}.{avif,webp}` - cho `Logo.tsx` (header 48px, footer 72px).
- `favicon.ico` (7 lớp 16-256), `favicon-{16,32,96}.png`, `android-chrome-{192,512}.png` -
  NGUYÊN logo, nền trong suốt.
- `apple-touch-icon.png`, `android-chrome-maskable-*.png` - logo trên nền đặc `#0A0A0A`
  (iOS/Android tô nền vào chỗ trong suốt; maskable chừa 20% vùng an toàn).
- `site.webmanifest`, `og-image.png` (1200x630, nền tối là hằng thương hiệu).
- `avatars/*.webp` - 6 tông × 2 mức chi tiết.
- `eco/<id>.webp` - logo app (128px), từ `build-eco-icons.js`.

## Vài quyết định kỹ thuật

**Xoá nền đen mà không thủng mặt cú.** Logo vẽ trên nền đen và lòng logo cũng có nhiều mảng
gần đen. Flood fill trần từ mép ảnh lọt qua khe tối hẹp giữa tai cú và vòng tròn, ăn thủng mặt
cú - trên nền tối không ai thấy, trên nền Sáng thành lỗ trắng. Script đóng hình thái học mặt nạ
nội dung (`seal=14`, dò thực nghiệm: 6 còn lọt) làm rào chắn cho flood fill, rồi làm mềm alpha
theo độ sáng và khử nhân với nền đen để quầng xanh giữ đúng sắc trên nền sáng.

**Không kéo giãn.** Mọi cỡ đều `fit: 'contain'` trên khung vuông; ảnh nguồn không bị cắt.

**Avatar vẽ bằng vector.** `source/avatar.png` có dòng chữ "tsudev\_" đè lên vùng
xích đạo của quả cầu lưới, nên phần lưới nằm dưới chữ đã mất hẳn dữ liệu - mọi
cách vá (lấp từ bản xoay 90°, nội suy theo hàng) đều để lại vệt rõ. Vì vậy quả
cầu được dựng lại bằng SVG ngay trong script: sạch tuyệt đối ở mọi kích thước,
file dưới 11 kB, và đổi màu chính xác theo từng biến thể thay vì xoay hue gần
đúng. Ảnh gốc vẫn giữ trong `source/` để tham chiếu thiết kế.

`packages/ui/src/components/Avatar.jsx` gán biến thể theo hàm băm FNV-1a của tên
đăng nhập: ổn định theo từng tài khoản nhưng phân bố đều.

**Hai mức chi tiết.** Ở 32-40px - cỡ chiếm gần hết số lần dùng - bản đầy đủ
3 kinh + 5 vĩ bị rối nét. Bộ `avatars/sm/` rút còn 2 kinh + 3 vĩ, ít nút hơn và
tăng bề dày nét tương đối (`strokeScale`) để vẫn rõ khi thu nhỏ; file nhẹ hơn
khoảng 60%. `Avatar.jsx` tự chọn bộ theo prop `size`, ngưỡng 48px (`SMALL_MAX`).
Sau khi gỡ Diễn đàn/Chợ, **không trang nào còn dùng avatar trên 48px** - nghĩa
là bộ đầy đủ hiện chỉ phục vụ Storybook. Đừng xoá: thêm một trang hồ sơ cỡ lớn
là cần lại ngay, và bộ này sinh từ ảnh gốc chứ không chép tay.

**favicon.ico** là container ICO thật 7 lớp (16/24/32/48/64/128/256), không phải PNG đổi
đuôi - `scripts/check-brand-assets.js` canh.
