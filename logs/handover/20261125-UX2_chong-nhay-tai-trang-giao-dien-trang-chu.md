# PHIẾU - UX2: chống "nhúng" khi tải trang, gọn trang chủ, nền Sáng dịu, font tiêu đề, rà giao diện toàn hệ

- **Mã phiếu**: 20261125-UX2
- **Từ**: chủ dự án (yêu cầu 25/11/2026) - **Người làm**: phiên `tsudev-3e`
- **Trạng thái**: MỞ (UX2-a xong, UX2-b/c/d còn lại)

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

(ghi khi phát)

## Kết quả xử lý

- 25/11/2026 - tsudev-3e: UX2-a xong (PR ghi ở STATE).
