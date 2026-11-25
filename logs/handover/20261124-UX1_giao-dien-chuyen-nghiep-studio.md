# PHIẾU UX1 - Chuẩn hoá giao diện tsudev.com chuyên nghiệp, ưu tiên Studio "Viết bài"

- **Mã phiếu**: 20261124-UX1 - **Từ**: phiên `tsudev-b5dd`, 24/11/2026 - **Trạng thái**: MỞ
- **Yêu cầu chủ dự án (24/11/2026)**: cập nhật/chuẩn hoá giao diện tsudev.com chuyên nghiệp hơn; trang "Viết bài" đủ
  công nghệ/công cụ/chức năng và giao diện chuyên nghiệp như kế hoạch các phiên trước đã nêu.
- **Kế hoạch gốc (ĐÃ CHỐT, đừng thiết kế lại)**: phiếu [`20261119-65`](20261119-65_ke-hoach-tai-cau-truc-toan-dien.md)
  mục 2 (P4-P9) · `docs/de-xuat-trang-viet-bai.md` (chốt 19/11) · `docs/thiet-ke/tsu-tdd-v2.md` chương 4 (Studio: bốn
  vùng 4.1, sơ đồ URL 4.2, yêu cầu ED-_/MD-_ 4.3), 22.1 (đính chính), **23 (PR 4.1-4.7, nghiệm thu, DoD 23.1)** ·
  ADR-0001 (Tiptap), ADR-0003 (định dạng nội dung).
- **Chuẩn**: `.standards` v5.3.0 - `DESIGN_SYSTEM.md` (v4.1.0: biểu tượng trên nền thật), `LANGUAGE_SELECTION.md` 5.1
  (ngân sách tốc độ), `PROJECT_STRUCTURE.md` 3.1 (Clean Codebase).

## 1. Đã xong (đừng làm lại)

| PR  | Nội dung                                                                           | Bằng chứng |
| --- | ---------------------------------------------------------------------------------- | ---------- |
| 4.1 | Mặc định Nháp, `/debug/boom` chỉ dev                                               | #333       |
| 4.2 | Bộ vẽ `marked` dùng chung + lọc HTML + test khứ hồi/XSS                            | #334       |
| 4.4 | Backend tự lưu, gộp revision 10 phút, 409 theo `updatedAt`, `GET /api/author/tags` | #335       |
| -   | Trình soạn Tiptap nạp lười (`next/dynamic`) để giữ ngân sách JS                    | #377       |

## 2. Chia phase - MỖI PHIÊN MỘT PHASE, theo thứ tự

| Phase     | Việc (PR)                                                                                                                                                                                                                                                                                                           | Đầu vào chính                                                                                                                                  | Xong khi                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **UX1-a** | PR 4.5: `WorkspaceLayout` (sidebar thu gọn được + vùng soạn + bảng thuộc tính phải + thanh hành động dính), `/author*` → `/studio*` (308, giữ link cũ), danh sách bài/tài liệu tách trang có lọc + tìm + chip trạng thái                                                                                            | TDD 4.1, 4.2; `pages/author.tsx`, `pages/author/posts/[slug].tsx`; `SiteHeader.tsx` (F-08: "Viết bài" ra khỏi menu công khai → menu tài khoản) | PR + deploy; ảnh chụp 2 chế độ; `budget:js` xanh                                                                                    |
| **UX1-b** | PR 4.6: trình soạn - menu `/`, menu nổi khi bôi chọn, bảng, callout, chú thích ảnh, khối mã, phím tắt (bảng `?`), xem trước desktop/di động, bảng "Kiểm tra" (tiêu đề, mô tả SEO, alt, độ dài, liên kết hỏng), đếm chữ/thời gian đọc, cảnh báo rời trang khi chưa lưu, chỉ báo tự lưu ("Đã lưu 10:42") dùng API 4.4 | TDD ED-05..ED-18, MD-*; `components/MarkdownEditor.tsx`; `test/mdRoundTrip.test.ts`                                                            | Khứ hồi Markdown xanh cho MỌI nút mới; chunk trình soạn nạp lười, trang ≤ 170 KB                                                    |
| **UX1-c** | PR 4.3: tải ảnh - nén WebP phía trình duyệt, alt bắt buộc, khoá do máy chủ sinh, `ownerId`, giới hạn loại/kích thước                                                                                                                                                                                                | TDD SEC-05, API-07; `services/storage-service`                                                                                                 | ⛔ cần 👤 tạo bucket R2 `tsudev-media` + miền `media.tsudev.com` TRƯỚC khi merge; ảnh hiện trên `/blog/[slug]` ẩn danh ở production |
| **UX1-d** | PR 4.7: E2E viết → tự lưu → gửi duyệt (có `totpCode()`), ảnh chụp 2 chế độ, axe 0 critical/serious trên `/studio*`                                                                                                                                                                                                  | `e2e/`, khai `testMatch` (Playwright không tự nhặt spec)                                                                                       | CI xanh                                                                                                                             |
| **UX1-e** | P5 app shell: header (mega-menu Hệ sinh thái, Ctrl+K dùng `/api/search`), menu tài khoản (Studio, Quản trị, Hồ sơ, Bảo mật); `SettingsLayout` sidebar cho `/settings/*` với thanh lưu dính; footer gọn                                                                                                              | phiếu 65 hàng P5                                                                                                                               | `/settings/profile` đẹp, a11y 0 lỗi nghiêm trọng                                                                                    |
| **UX1-f** | P6 trang công khai: `/apps/[slug]`, docs 3 cột + mục lục, blog theo chuyên mục/thẻ, `/changelog`, trang lỗi                                                                                                                                                                                                         | phiếu 65 hàng P6; `test/isrPages.test.ts`                                                                                                      | ISR test xanh, JSON-LD hợp lệ                                                                                                       |
| **UX1-g** | Cổng LCP ≤ 2,5 s / CLS ≤ 0,1 (Lighthouse CI, 4G chậm) - phần còn lại của ngân sách 5.1                                                                                                                                                                                                                              | `scripts/ngan-sach-js.js` (JS đã có cổng)                                                                                                      | CI chặn khi vượt                                                                                                                    |

P7 (CÓ migration: trạng thái duyệt mở rộng, thùng rác, cột giai đoạn B) đi SAU UX1, theo phiếu 65.

## 3. Bẫy đã biết

- **Ngân sách JS 170 KB gzip/trang** (`npm run budget:js`, CI chặn). Nặng nhất hiện `/settings/security` 164.3 KB, `/author`
  162.8 KB - biên rất mỏng. Tiện ích Tiptap mới, thư viện bảng/biểu đồ ⇒ đặt trong chunk nạp lười, không import tĩnh ở trang.
- **`knip` chặn export/tệp/phụ thuộc thừa.** Component mới chỉ export có tên (không `export default` trùng). Thêm gói
  Tiptap ⇒ khai đúng workspace `apps/frontend-main`.
- Giao diện: đen tuyền + xanh logo, CHỈ Sáng · Tối · Hệ thống, chữ trên nút xanh ở Tối là MỰC ĐEN, một nền liền mạch,
  token sửa ở `tokens/extensions.tsudev-web.json` (CLAUDE.md). Biểu tượng đang chọn: `on-primary` trên viên `primary`
  HOẶC `primary` trên `bg-subtle` - không trộn; thêm cặp vào `packages/ui/test/contrast.test.ts` cho mọi viên mới.
- PR chạm logo/chân trang/giấy phép/workflow ⇒ cổng "Bảo vệ bản quyền" cần `nguyentrangtinhsu` duyệt - dừng và báo.
- Tự lưu 30 s PHẢI dùng endpoint `autosave` (gộp revision) - lưu thường mỗi lần tạo `PostRevision` (ED-08).
- `lib/useLoader.ts` cho dữ liệu; ngày giờ qua `lib/format.ts`; trình duyệt chỉ gọi qua `pages/api/*`.

## 4. Kết quả xử lý (mỗi phase một dòng)

- 24/11/2026 - tsudev-b5dd: mở phiếu. Phase kế tiếp: **UX1-a**.
- 25/11/2026 - tsudev-c4: **UX1-a XONG** (PR 4.5). `components/WorkspaceLayout.tsx` (thanh bên thu gọn nhớ ở
  localStorage `tsu-studio-nav` qua `useSyncExternalStore`, màn hẹp thành dải tab; thanh tiêu đề DÍNH chứa hành động);
  `/studio` (tổng quan: 4 thẻ số + lượt xem 30 ngày + "Tiếp tục viết"), `/studio/posts` (chip trạng thái có số đếm,
  tìm `q` gõ trễ 300 ms, sắp xếp, xoá qua Modal - không `window.confirm`), `/studio/docs`, trình soạn + lịch sử chuyển
  sang `/studio/posts/*` (Lưu/Gửi duyệt ở thanh dính). Form 13 ô của `/author` GỠ (ED-02). `/author*` → `/studio*`
  **308** (`?tab=docs` → `/studio/docs`); "Viết bài" rời menu công khai → menu tài khoản "Studio - viết bài" (F-08).
  `useUrlPagingSync(tables, extra)` ghi bộ lọc cùng lượt replace. Đo: axe 0 critical/serious 4 trang × 2 chế độ,
  390 px không cuộn ngang, `budget:js` `/studio/docs` 160.9 KB. **Không dùng cờ `STUDIO_V2`** (CI-06): chuyển hướng
  `next.config.js` là tĩnh lúc dựng, cờ Worker không gác được nó; đường lui = `wrangler rollback`. Mục "Ảnh" vẽ
  "Sắp có" (UX1-c). Còn cho UX1-b: khoảng trống trên thanh công cụ trình soạn, `act('archive')` còn `window.confirm`,
  "Nguồn tham khảo" (form cũ có, trình soạn chưa có - backend vẫn giữ dữ liệu). Phase kế tiếp: **UX1-b**.
