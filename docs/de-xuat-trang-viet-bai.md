# Đề xuất - Trang Viết bài (`/author`) kiểu toà soạn báo điện tử

> Trạng thái: **CHỜ CHỦ DỰ ÁN CHỐT** (mở 19/11/2026, phiên tsudev-64). Các mục đánh dấu ❓ là câu hỏi cần trả lời.

## 1. Hiện trạng (đo trong mã 19/11/2026)

- Trình soạn: Tiptap 3 (`components/MarkdownEditor.tsx`), lưu **Markdown** (`Post.contentMd`). Thanh công cụ một hàng:
  đậm, nghiêng, gạch, mã, H2-H4, danh sách, trích dẫn, khối mã, đường kẻ, liên kết, ảnh (dán URL), hoàn tác.
- Trang bài (`pages/author/posts/[slug].tsx`): cột trái = ô Tiêu đề + trình soạn; cột phải = 3 hộp Xuất bản /
  Phân loại / Ảnh bìa và SEO. Đã có quy trình Nháp → Chờ duyệt → Công khai → Lưu trữ, hẹn giờ, lịch sử phiên bản,
  xem trước thẻ chia sẻ.
- Thiếu so với CMS báo lớn: tải ảnh lên trực tiếp (chỉ dán URL), bảng, chú thích ảnh, menu `/`, menu nổi khi bôi
  chọn, mục lục, xem trước bài thật (desktop/di động), tự lưu, cảnh báo rời trang, chấm điểm SEO, sapo riêng, chọn
  thẻ có gợi ý, chế độ tập trung, phím tắt.

## 2. Bố cục đề xuất

```
┌ Thanh hành động dính (sticky) ──────────────────────────────────────────────┐
│ ← Bài viết  ·  [Nháp]  ·  Đã lưu 10:42  ·  ⌘K   [Xem trước] [Lưu] [Gửi duyệt ▾] │
├──────────┬──────────────────────────────────────────────┬───────────────────┤
│ Mục lục  │  Chuyên mục ▾                                 │ Thanh tra (tab)   │
│ (H2/H3   │  TIÊU ĐỀ LỚN (ô tự giãn, đếm ký tự)           │ ▸ Xuất bản        │
│ bấm để   │  Sapo / tóm tắt in đậm                        │ ▸ Phân loại+thẻ   │
│ nhảy)    │  [Ảnh bìa kéo-thả + chú thích + nguồn ảnh]    │ ▸ SEO + điểm      │
│          │  Thân bài - thanh công cụ dính + menu "/"    │ ▸ Thẻ chia sẻ     │
│          │  + menu nổi khi bôi chọn                      │ ▸ Nguồn tham khảo │
│          │                                               │ ▸ Lịch sử         │
├──────────┴──────────────────────────────────────────────┴───────────────────┤
│ 1.240 từ · 6 phút đọc · 3 ảnh thiếu alt                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

Cột trái/phải gập được; chế độ tập trung (F11-style) ẩn hết chỉ còn khung chữ. Di động: thanh thao tác dưới đáy,
thanh tra mở thành ngăn kéo.

## 3. Lộ trình

### Giai đoạn A - chỉ frontend, KHÔNG đổi schema (làm được ngay, tự deploy)

1. Bố cục 3 vùng ở trên + thanh hành động dính, trạng thái lưu, phím tắt (Ctrl+S lưu, Ctrl+Shift+P xem trước,
   Ctrl+K bảng lệnh).
2. Trình soạn: menu `/` chèn khối, menu nổi khi bôi chọn (đậm/nghiêng/liên kết/tiêu đề), bảng (GFM), danh sách việc,
   tô sáng `==`, ảnh có **chú thích** (Markdown `![alt](url "chú thích")`), nhúng YouTube/Video (dòng URL riêng, trang
   blog vẽ thành khung nhúng), hộp ghi chú (`> [!NOTE]` - cú pháp GitHub, vẫn là Markdown hợp lệ), khối mã có tô màu
   cú pháp, kiểu chữ tự động (`--` → `-`, ngoặc kép cong), kéo thả sắp lại khối.
3. **Tải ảnh lên trực tiếp** (kéo-thả / dán / chọn tệp) vào R2 qua `/api/storage/*` sẵn có (presign PUT), tự nén
   WebP ở trình duyệt, bắt buộc nhập alt.
4. Tự lưu bản nháp: localStorage mỗi lần gõ (khôi phục sau khi tắt nhầm tab) + lưu máy chủ mỗi 30 giây khi bài đang
   là Nháp; cảnh báo khi rời trang chưa lưu; phát hiện người khác đã sửa (so `updatedAt`).
5. Xem trước đúng giao diện bài thật (dùng chung bộ vẽ Markdown của `/blog/[slug]`), chuyển desktop/di động.
6. Bảng điểm SEO & chất lượng: độ dài tiêu đề (≤ 70), mô tả (≤ 160), có ảnh bìa, ảnh thiếu alt, H2 đầu tiên, liên kết
   gãy (http), đoạn quá dài, số từ, thời gian đọc.
7. Ô thẻ dạng chip có gợi ý từ thẻ đã dùng; slug tự suy và khoá sau khi đăng.

### Giai đoạn B - có migration (cần chạy `db:migrate` lên Neon TRƯỚC khi merge)

Thêm cột vào `Post`: `subtitle` (tít phụ), `coverCaption`, `coverCredit`, `seoTitle`, `canonicalUrl`, `ogImageUrl`,
`noindex`, `featured` (bài nổi bật trang chủ), `seriesId` (loạt bài), đồng tác giả. Ghi chú duyệt bài theo đoạn
(người duyệt bôi chọn rồi góp ý).

### Giai đoạn C - tuỳ chọn

Cộng tác thời gian thực (Yjs) cần máy chủ WebSocket chạy thường trực - Render free ngủ sau 15 phút, Workers Durable
Objects tốn phí ⇒ **không khuyến nghị** khi chỉ có vài người viết.

## 4. Câu hỏi cần chốt

- ❓ **Định dạng lưu**: giữ Markdown (khuyến nghị - trang blog, lịch sử phiên bản, so khác biệt và tìm kiếm đều đang
  dựa vào nó) hay đổi sang JSON của Tiptap (thêm được màu chữ, căn lề, cỡ chữ - nhưng phải viết lại bộ vẽ blog và
  chuyển đổi dữ liệu cũ)?
- ❓ **Phạm vi phiên này**: chỉ A (khuyến nghị), hay A + B (B cần chủ dự án chạy migration Neon)?
- ❓ **Ảnh trong bài**: tải thẳng lên R2 (khuyến nghị, đã có hạ tầng) hay chỉ dán URL như hiện nay?
