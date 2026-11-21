# PHIẾU YÊU CẦU - Bản sắc riêng của TsuDEV (tsudev-standards v5.0.0)

- **Mã phiếu**: 20261121-STD50
- **Từ**: phiên tsudev-standards, 21/11/2026 - **Đến**: phiên kế tiếp của `tsudev`
- **Trạng thái**: MỞ một phần (PR 1 xong 21/11/2026 - phiên tsudev-40; còn PR 2 bố cục + MAY thẻ /apps)
- **Nguồn**: https://github.com/tsudev-org/tsudev-standards/releases/tag/v5.0.0 - `docs/DESIGN_SYSTEM.md` mục 1.2,
  CHANGELOG 5.0.0 "Hướng dẫn nâng cấp"
- **Bối cảnh**: chủ dự án muốn mỗi sản phẩm có đặc trưng nổi bật riêng (màu, giao diện, bố cục). Trước v5.0.0, 9/11
  sản phẩm dùng cùng một màu xanh. Từ v5.0.0: nền/chữ/trạng thái/tiếp cận là chung; màu nhấn, bố cục, bo góc, hoạ
  tiết, font tiêu đề là riêng, khai ở `.standards/tokens/products/tsudev.json` - KHÔNG tự khai lại tại repo này.

## Bản sắc đã chốt cho `tsudev`

| Trường               | Giá trị                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `data-product`       | `tsudev`                                                               |
| Màu chính Tối / Sáng | `#38BDF8` / `#0868C4` (hue OKLCH 233; lý do: chữ "dev" và con cú xanh) |
| Bố cục `layout`      | `cong` - hero ngắn + lưới thẻ danh mục nhiều cột                       |
| Bo góc `shape`       | `chuan` - 4/6/8px, nút 6px                                             |
| Hoạ tiết `motif`     | `quang-sang` (tĩnh, ở hero + `og-image`, phủ ≤ 15%)                    |
| Font tiêu đề         | Inter (tự host woff2 bộ `vietnamese`, tối đa 2 độ đậm)                 |

Muốn đổi bất kỳ giá trị nào: PR vào tsudev-standards (sửa `hue`/`layout`... + chạy `gen-product-palette.mjs`), cổng
kiểm chống trùng phải xanh. KHÔNG ghi đè tại repo này.

## Việc cần làm - chia hai PR, mỗi PR một phiên

**PR 1 - màu + hình** (`feat(ui): bản sắc tsudev theo tsudev-standards v5.0.0`):

1. Sync `.standards/` lên v5.0.0 (bước `curl` sync-standards.sh trước, theo `docs/SYNC.md`).
2. Web: nạp `.standards/tokens/tokens.css` rồi `.standards/tokens/products.css`; `<html data-product="tsudev">` (cạnh
   `data-theme`). Desktop/di động: gộp đè `products/tsudev.json` lên `color.light`/`color.dark` lúc build.
3. Xoá bảng màu tự khai (`palette.css`, `extensions.*.json`, dải `--color-*` riêng) và mã màu cứng còn sót.
4. Giá trị đã lưu `warm` đọc thành `light` (khối `warm` đã gỡ khỏi token).
5. Nút dùng `var(--radius-control)`; h1-h3 và số liệu lớn dùng `var(--font-display)`.
6. Ảnh chụp trước/sau, Sáng + Tối, đính vào PR. Cổng kiểm + test xanh.

**PR 2 - bố cục** (`feat(ui): bố cục cong + hoạ tiết quang-sang`):

1. Dựng phần THÂN trang chủ website / màn hình đầu app theo `cong`; header, khu tài khoản, chân trang, bộ chọn
   giao diện giữ theo `ECOSYSTEM_IDENTITY.md` mục 4.
2. Hoạ tiết `quang-sang` tĩnh ở hero, vẽ bằng `accent`/`glow`; sinh lại `og-image.png` cùng hoạ tiết.
3. Ảnh chụp trước/sau, Sáng + Tối.

## Việc riêng của repo này

- Màu tsudev.com KHÔNG đổi (bảng xanh 4.2 = `tsudev.json`, `locked`). Xoá `tokens/extensions.tsudev-web.json` / phần ghi đè màu nếu chỉ còn lặp lại token chuẩn.
- `MAY`: thẻ sản phẩm ở `/apps` lấy `primary` của từng sản phẩm từ `.standards/tokens/products/*.json` (lúc build) làm viền/điểm nhấn - giúp người dùng nhận ra sản phẩm trước khi bấm. Khối logo TsuDEV giữ nguyên.

## Kết quả xử lý

- 21/11/2026 - tsudev-40, nhánh `feat/std50-ban-sac-tsudev` (PR 1):
  1. `.standards` v4.4.0 ⇒ v5.0.0 (script sync lấy bằng `curl` từ thẻ v5.0.0 trước).
  2. `globals.css` nạp `.standards/tokens/products.css` sau `tokens.css`; `<Html data-product="tsudev">`.
  3. Gỡ khối `brand` và `accent`/`glow`/`icon-info`/`icon-nav` khỏi `tokens/extensions.tsudev-web.json`: trùng 100%
     bảng chuẩn v5 + `tsudev.json` (đo bằng script trước khi gỡ). `sync-tokens.js` nay ném lỗi khi khối mở rộng trùng
     khoá bảng chuẩn/`tsudev.json`, và khi `tsudev.json` (`locked`) lệch bảng chuẩn.
  4. `warm` ⇒ `light`: đã có từ trước (`_document.tsx`, `ThemeToggle.tsx`).
  5. Nút dùng chung `rounded-control` (`--radius-control` 6px = `rounded-md` cũ); h1-h3
     `var(--font-display, var(--font-family))`. Inter tự host 600/700 (OFL 1.1, `fonts:sync`); script gộp tệp trùng
     của font biến thiên (Inter, và Chivo Mono vốn lưu 12 tệp giống nhau từng byte) ⇒ 30 → 18 tệp, 697 → 383 KB.
     Test mới: `--font-display` của `data-product="tsudev"` phải có `@font-face`.
  6. Ảnh trước (tsudev.com) / sau (bản dựng cục bộ), Tối + Sáng, `/` và `/apps`: `--primary` và nền trùng khớp
     (`#38bdf8`/`#0a0a0a`, `#0868c4`/`#fafafa`); khác biệt duy nhất là font tiêu đề Be Vietnam Pro ⇒ Inter.
     Cổng: format, lint, typecheck, tokens, topology, fonts xanh; `packages/ui` 280 test (tương phản), frontend 344.
