# ADR-0003: Định dạng nội dung - giữ Markdown (GFM), thay bộ vẽ công khai bằng `marked` dùng chung với trình soạn

- **Ngày**: 19/11/2026 (phase **P1** của phiếu `logs/handover/20261119-65`)
- **Trạng thái**: CHẤP NHẬN (chủ dự án giao quyết định định dạng lưu cho tài liệu thiết kế - phiếu 20261119-65 mục
  đầu, ý 4). Kế thừa và mở rộng [ADR-0001](0001-tiptap-markdown.md); không đảo nó.
- **Phạm vi**: `Post.contentMd`, `Doc.contentMd`, `PostRevision.contentMd`, nội dung dự án; bộ vẽ
  `apps/frontend-main/lib/md.ts`; trình soạn `components/MarkdownEditor.tsx`.

## Bối cảnh

TDD v1.0 (mục 8.4) đề xuất chuyển sang trình soạn khối TipTap lưu **JSON**. Rà quét P1
(`docs/thiet-ke/ra-quet-20261119.md`, F-P1-01) đo được một lỗi mà cả ADR-0001 lẫn TDD v1.0 đều không thấy:

**Trình soạn và trang công khai đang dùng HAI bộ hiểu Markdown khác nhau.**

- Trình soạn (Tiptap 3 + `@tiptap/markdown` 3.33.1) đọc/ghi Markdown bằng **`marked` 17.0.6** - CommonMark + GFM đầy đủ.
- Trang công khai (`/blog/[slug]`, `/docs/[slug]`, `/projects/[slug]`), xem trước ở `/author`, `/admin/review` vẽ
  bằng `lib/md.ts` - 177 dòng regex tự viết, chỉ hiểu: H1-H3, `**đậm**`, `` `mã` ``, khối mã, ảnh/video, liên kết,
  danh sách `- `.

Đo trực tiếp `renderMarkdown()` (19/11/2026) với những gì thanh công cụ của chính trình soạn sinh ra:

| Cú pháp (trình soạn có nút)       | Trang công khai vẽ ra                                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `*nghiêng*`, `~~gạch~~`           | để nguyên dấu `*`, `~~`                                                                                           |
| `#### Mục` (trình soạn cho H2-H4) | `<p>#### Mục</p>`                                                                                                 |
| `1. một` / `2. hai`               | một đoạn văn có `<br/>` (đã thấy trên production: `/docs/canh-bao-smartscreen-android-khi-cai`)                   |
| `---`                             | `<p>---</p>`                                                                                                      |
| `> trích dẫn`                     | `<p>&gt; trích dẫn</p>` - **trích dẫn chưa từng vẽ được**: `esc()` đổi `>` thành `&gt;` TRƯỚC khi regex `^>` chạy |
| danh sách lồng `  - b`            | rơi ra ngoài `<ul>` thành chữ trơn                                                                                |
| `![alt](/x.png "chú thích")`      | `src="/x.png &quot;chú thích&quot;"` - ảnh hỏng                                                                   |
| bảng GFM                          | đoạn văn với dấu `                                                                                                | `   |

Không cổng nào bắt được vì `test/md.test.ts` + `md.property.test.ts` chỉ canh **ranh giới XSS** (đúng việc của
chúng), không canh **độ đủ cú pháp** so với trình soạn. Giai đoạn A (P4) định thêm bảng, chú thích ảnh, callout
`> [!NOTE]`, danh sách việc - tất cả sẽ lưu đúng rồi hiện sai, im lặng, nếu giữ bộ vẽ hiện tại.

## Các phương án

| Phương án                                                                   | Được                                                                                                                                                                                                        | Mất                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A. Giữ Markdown, thay bộ vẽ bằng `marked` 17 + lớp an toàn riêng** (CHỌN) | Một bộ phân tích cho cả soạn lẫn vẽ ⇒ "thấy gì lưu nấy, lưu gì hiện nấy"; dữ liệu cũ không đổi; lịch sử phiên bản, so khác biệt theo dòng (`lib/lineDiff.ts`), chỉ mục `searchBodyNorm`, ISR giữ nguyên; 0đ | Phải tự viết lớp an toàn (marked không tự lọc HTML) và giữ nguyên bất biến XSS hiện có                                                                                                                                                                                               |
| B. Chuyển sang JSON ProseMirror (TDD v1.0)                                  | Màu chữ, căn lề, khối tuỳ biến không giới hạn                                                                                                                                                               | Chuyển đổi dữ liệu cũ (migration nội dung lên Neon); viết lại bộ vẽ ISR, chỉ mục tìm kiếm, so khác biệt phiên bản (JSON so theo dòng vô nghĩa); `feed.xml`/mô tả SEO phải trích chữ từ JSON; nội dung không còn đọc được bằng mắt trong DB/PR. ADR-0001 đã bác vì đúng các lý do này |
| C. Lưu song song JSON + Markdown                                            | -                                                                                                                                                                                                           | Hai nguồn sự thật lệch nhau im lặng (ADR-0001 đã bác)                                                                                                                                                                                                                                |
| D. Vá tiếp `lib/md.ts` bằng regex                                           | Không thêm phụ thuộc                                                                                                                                                                                        | Đuổi theo CommonMark bằng regex là cuộc đua thua (đã thua ở trích dẫn - lỗi tồn tại từ đầu mà không ai thấy); mỗi cú pháp mới của P4 lại một lần lệch                                                                                                                                |
| E. `markdown-it` / `remark` + `rehype-sanitize`                             | Lọc HTML có sẵn (rehype)                                                                                                                                                                                    | Bộ phân tích THỨ HAI khác trình soạn - giữ nguyên gốc của lỗi; remark/rehype nặng hơn nhiều trên Worker                                                                                                                                                                              |

## Quyết định

1. **Định dạng lưu: Markdown, phương ngữ = GFM như `marked` 17 hiểu.** `contentMd` vẫn là nguồn sự thật DUY NHẤT
   (ADR-0001 giữ nguyên). Không lưu JSON.
2. **Mở rộng cú pháp - chỉ những thứ VẪN là Markdown hợp lệ khi đọc bằng công cụ khác** (GitHub, trình xem thường):
   - bảng, gạch ngang, danh sách việc `- [ ]`, tự nhận liên kết: GFM sẵn trong `marked`;
   - chú thích ảnh: tiêu đề ảnh chuẩn `![alt](url "chú thích")` ⇒ `<figure><img><figcaption>`;
   - hộp ghi chú: cú pháp GitHub `> [!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]` ⇒ `<aside>`;
   - nhúng video: dòng chỉ chứa URL YouTube/Vimeo đứng riêng ⇒ khung nhúng (`youtube-nocookie.com`; mở `frame-src`
     của CSP đúng hai miền đó - việc của P4 + `test/csp.test.ts`);
   - KHÔNG dùng "directive" kiểu `:::note` hay `{.class}`: không phải Markdown chuẩn, công cụ khác hiện thành rác.
   - KHÔNG màu chữ / căn lề / gạch chân / cỡ chữ (giữ ngoại lệ ADR-0001 với RICH_TEXT_EDITOR.md).
3. **Bộ vẽ công khai = `marked` 17 cùng phiên bản trình soạn đang kéo về**, khai thẳng trong
   `apps/frontend-main/package.json` và ghim CHÍNH XÁC (`"marked": "17.0.6"`, khớp bản `@tiptap/markdown` đang dùng),
   cấu hình `gfm: true`. `lib/md.ts` giữ nguyên CHỮ KÝ (`renderMarkdown`, `extractHeadings`, `slugifyHeading`) để
   sáu nơi gọi không đổi một dòng.
4. **Lớp an toàn (bắt buộc, vì marked không lọc HTML)** - viết bằng renderer/walkTokens của marked, không hậu xử lý
   chuỗi:
   - token `html` (khối + nội dòng) ⇒ vẽ thành văn bản đã thoát; **không có đường nào đưa HTML thô ra trang**;
   - `href`/`src` đi qua `safeHref` hiện có (danh sách trắng `https?:`, `mailto:`, đường dẫn tương đối, `#`);
   - mọi văn bản và thuộc tính qua `esc()` hiện có (gồm nháy đơn/kép);
   - `id` tiêu đề lấy từ `slugifyHeading` qua MỘT lần duyệt token chung cho `extractHeadings` và `renderMarkdown`
     (giữ bất biến "mục lục trỏ đúng neo");
   - `test/md.test.ts` và `md.property.test.ts` phải xanh KHÔNG SỬA KỲ VỌNG an toàn nào. Kỳ vọng nào đổi vì bộ vẽ
     mới vẽ ĐÚNG hơn (vd. trích dẫn) thì ghi lý do trong PR.
5. **Cổng mới chống tái phát**: test "khứ hồi" - với mỗi nút trên thanh công cụ của trình soạn, chuỗi Markdown mà
   `@tiptap/markdown` sinh ra phải vẽ thành đúng thẻ HTML tương ứng (`<em>`, `<s>`/`<del>`, `<h4>`, `<ol>`, `<hr>`,
   `<blockquote>`, `<table>`, `<figure>`...). Thêm nút mới vào trình soạn mà không thêm ca vào test này ⇒ lỗi lặp lại.
6. **Thứ tự**: việc này là bước ĐẦU TIÊN của P4 (trước menu `/`, bảng, callout), trong cùng PR hoặc PR ngay trước.
   Không cần migration: dữ liệu cũ là Markdown hợp lệ, chỉ hiện ĐÚNG hơn.

## Hệ quả

- Bài cũ hiện đúng hơn ngay sau deploy (danh sách số trên `/docs/canh-bao-smartscreen-android-khi-cai`). Trang ISR tự
  dựng lại sau `revalidate` 300 s; không cần xoá cache R2.
- Gói JS: `marked` ~40 KB min (chưa nén), đã nằm trong gói `/author` (qua Tiptap) - nay thêm vào gói trang đọc. Trang
  đọc ISR vẽ HTML ở máy chủ; nếu đo thấy tăng đáng kể ở trình duyệt, P9 tách phần vẽ chỉ chạy trong
  `getStaticProps` (props mang HTML đã vẽ).
- Tìm kiếm (`searchBodyNorm`), so khác biệt phiên bản, `feed.xml`: không đổi.
- Muốn thêm cú pháp mới về sau: chỉ nhận nếu (a) `marked` hiểu hoặc là phần mở rộng không làm hỏng hiển thị ở
  công cụ Markdown khác, (b) có ca trong test khứ hồi, (c) qua lớp an toàn ở mục 4.
- Đảo quyết định này (sang JSON) cần ADR mới chứng minh nhu cầu định dạng mà Markdown + mục 2 không đáp ứng được, kèm
  kế hoạch chuyển dữ liệu và chỉ mục tìm kiếm.
