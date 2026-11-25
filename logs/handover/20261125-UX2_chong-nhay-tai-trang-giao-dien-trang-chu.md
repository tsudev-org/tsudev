# PHIẾU - UX2: chống "nhúng" khi tải trang, gọn trang chủ, nền Sáng dịu, font tiêu đề, rà giao diện toàn hệ

- **Mã phiếu**: 20261125-UX2
- **Từ**: chủ dự án (yêu cầu 25/11/2026) - **Người làm**: phiên `tsudev-3e`
- **Trạng thái**: MỞ (UX2-a/b/c/d xong - còn nghiệm thu production sau deploy UX2-b)

## 1. Chẩn đoán "giao diện nhúng khi Ctrl+F5" (đo 25/11/2026)

Cách đo: Chromium headless, tắt cache, mạng 4 Mbps + 150 ms, quay khung hình (CDP `Page.startScreencast`)
`https://tsudev.com/`. Ba nguyên nhân, cả ba đã sửa ở UX2-a:

1. **Hero mở đầu bằng `animate-fade-up` (`both`)** - khung 1,75 s: header + lưới thẻ đã vẽ, cả khối hero
   VÔ HÌNH; 1,9 s hiện mờ rồi mới rõ. Khối màn đầu không bao giờ được bắt đầu ở opacity 0.
2. **Font không preload + font dự phòng lệch số đo** - chữ vẽ bằng font hệ thống rồi đổi sang Be Vietnam
   Pro ở ~2,7 s: mọi dòng đổi bề rộng (khối dự phòng cũ `size-adjust: 100%`, đo thật là 105,4% ở nét 400 và
   102,4% ở nét 600/700). Thêm Inter (font tiêu đề) là 3 tệp / 143 KB tới muộn nữa.
3. **`useScrollReveal` bật `data-reveal="on"` TRƯỚC khi đo vị trí** - `getBoundingClientRect()` ép tính
   style khi khối đã bị ẩn ⇒ khối đang hiển thị nhảy về opacity 0 rồi hiện dần sau hydrate.

## 2. UX2-a (PR này)

- Bỏ `animate-fade-up` ở hero (và keyframe không còn ai dùng), bỏ nhãn "10 ứng dụng · Windows · …" (kèm
  CSS `tsu-live-dot`).
- `_document.tsx`: preload 4 tệp (Be Vietnam Pro 400/600 × latin/vietnamese, ~67 KB, `crossOrigin`).
- `scripts/sync-fonts.js`: gỡ Inter; khối dự phòng tách theo độ đậm với số đo thật (Arimo = số đo Arial).
- Font tiêu đề = Be Vietnam Pro đậm (ghi đè `--font-display` ở `globals.css`): so 5 font có subset tiếng
  Việt (Inter, Plus Jakarta Sans, Be Vietnam Pro, Lexend, Montserrat) - Plus Jakarta Sans chạm dấu ở "Phần",
  Inter dấu là phần thêm sau; Be Vietnam Pro do nhóm thiết kế Việt dựng tổ hợp hai dấu đúng vị trí.
- `useScrollReveal`: đo + gắn `is-in` trước, bật trạng thái ẩn sau (test canh thứ tự).
- Chân trang: câu mô tả mới "TsuDEV là hệ sinh thái ứng dụng, tiện ích và công cụ số đa nền tảng."; dòng
  chủ sở hữu ngăn bằng `|` có đệm rộng, xuống dòng theo mục.
- Lưới 6 thẻ danh mục dời từ trang chủ sang đầu `/apps` (`CategoryTiles`); 4 thẻ nhóm là nút lọc
  (aria-pressed) ⇒ gỡ hàng chip nhóm trùng trong thanh lọc. Mỗi thẻ một chuyển động icon khi rê/focus
  (quay, nhấc, toả sóng, nảy, nhích, gõ nhịp), tắt dưới reduced-motion.
- Thẻ /apps: gỡ dải màu 3px trên đầu thẻ; màu sản phẩm chỉ còn ở viền khi rê.
- Khối "Có thể thứ bạn cần tìm đang ở đây": bỏ nền quầng loang, thay nền phẳng pha 4% + hoạ tiết theo thể
  loại bằng CSS (lưới chấm / giấy kẻ dòng có lề / sọc báo + ngoặc kép / bàn cờ điểm ảnh), mờ về phía chữ.

Kiểm: format, lint, typecheck, knip, topology, tokens, fonts, budget:js, test frontend 362 + ui 296.

## 3. Việc còn lại

- **UX2-b - nền chế độ Sáng dịu mắt + hoạ tiết header/footer**: nền Sáng hiện `#FAFAFA` + bề mặt trắng là
  của BẢNG CHUNG (`.standards/tokens/design-tokens.json`, chỉ-đọc; `extensions` không được trùng khoá). Đường
  đúng: đề xuất ở repo `tsudev-standards` (bản phát hành mới) một bảng Sáng "giấy" (nền xám-xanh rất nhạt,
  bề mặt sáng hơn nền một bậc, viền rõ hơn), qua contrast.test.ts ở cả hai chế độ, rồi sync về đây. Hoạ tiết
  trừu tượng cho header/footer (tĩnh, ≤ 15% như `quang-sang`, không dải nền khác màu) làm cùng đợt.
- **UX2-c - đẩy ngược bộ quy ước** (một PR ở tsudev-standards): (1) câu mô tả mới ở
  `ECOSYSTEM_IDENTITY.md` mục 1; (2) `fontDisplay` của tsudev = Be Vietnam Pro (gỡ ghi đè ở globals.css khi
  nhận); (3) bố cục `cong` cho phép lưới danh mục nằm ở trang danh bạ thay vì trang chủ; (4) bảng Sáng UX2-b.
  `scripts/noi-dung-he-sinh-thai.js` còn câu mô tả cũ - đổi cùng (1).
- **UX2-d - phiếu rà giao diện toàn hệ**: phiếu `<ngày>-UI2` vào `logs/handover/` của từng repo có website
  trong `~/projects` (mục 4).

## 4. Phiếu đã phát cho các dự án

Phiếu toàn hệ `~/projects/logs/handover/20261125-UI2_ra-soat-giao-dien-web-toan-he.md` + 32 phiếu con
`logs/handover/20261125-UI2_ra-soat-giao-dien-web.md` (A cho mọi repo có web, B cho repo hệ TsuDEV).

## Kết quả xử lý

- 25/11/2026 - tsudev-3e: UX2-a xong (PR ghi ở STATE).
- 25/11/2026 - tsudev-3e: #382 gộp (chủ dự án duyệt lại sau `update-branch`), **`deploy-2026.11.25.2`** Worker `dc9e7d6f`.
  Quay khung hình production: 7 khung thay đổi (trước 55), chữ đúng font cuối ngay khung vẽ đầu (1,72 s), CLS 0,0001.
  Còn logo màn đầu hiện muộn ⇒ do `loading="lazy"` - UX2-b thêm `eager` cho thẻ màn đầu.
- 25/11/2026 - tsudev-3e: **UX2-c XONG** - tsudev-standards **v6.0.0** (standards#78, phát hành `v6.0.0`): bảng Sáng
  "giấy" xám-xanh (chủ dự án giao agent chọn - phương án A), accent Sáng `#0D6E89`, 10 bảng sản phẩm sinh lại, mô tả hệ
  sinh thái mới, `fontDisplay` tsudev = Be Vietnam Pro, Tsu Tramon (TM1 mục 3), quy tắc màn đầu + nạp font.
- 25/11/2026 - tsudev-3e: **UX2-b** (PR kế) - sync v6.0.0, gỡ ghi đè `--font-display`, `theme-color` Sáng `#eef1f5` + hash CSP,
  `icon-create` Sáng `#137638` (giữ AA trên nền mới), hoạ tiết tĩnh header/footer, logo màn đầu `eager`. Ghi chú: chú thích
  câu mô tả trong `SiteFooter.tsx` (tệp bảo vệ) còn nói "bản chuẩn vẫn câu cũ" - sửa ở lần chạm tệp đó kế tiếp.
