# PHIẾU YÊU CẦU - Bản sắc riêng của TsuDEV (tsudev-standards v5.0.0)

- **Mã phiếu**: 20261121-STD50
- **Từ**: phiên tsudev-standards, 21/11/2026 - **Đến**: phiên kế tiếp của `tsudev`
- **Trạng thái**: ĐÓNG (PR 1 #356 - phiên tsudev-40; PR 2 + MAY #358 - phiên tsudev-ae, 21/11/2026)
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

- 21/11/2026 - tsudev-ae, nhánh `feat/std50-bo-cuc-cong` (PR 2 + MAY), #358 gộp (`50bb898`), deploy
  **`deploy-2026.11.21.5`** Worker `8616d7ed`:
  1. Bố cục `cong`: hero ngắn (`data-layout="cong"`; bỏ hàng dấu kiểm, câu mô tả rút ngắn, padding
     pt-28/pb-20 ⇒ pt-16/pb-10) + lưới thẻ danh mục 6 cột (2 cột di động, 3 cột sm) ngay màn đầu -
     `components/HomeCategories.tsx`: bốn nhóm app (`/apps?nhom=<nhóm>`, chip nhóm chọn sẵn), trò chơi,
     cài bằng một lệnh; số đếm + logo suy từ `ECOSYSTEM_APPS`/`ECO_GAMES`. Khu sản phẩm, ziczac (chủ dự án
     yêu cầu 19/11), bài viết, CTA, header, chân trang, bộ chọn giao diện GIỮ nguyên.
  2. `quang-sang`: `.tsu-quang-sang` (globals.css) - quầng `--glow` + lõi `--accent` 12% + vòng cung mảnh
     `--accent` 12%, tĩnh. `og-image.png` sinh lại: `node packages/brand/build-assets.js --chi-og`, màu đọc
     thẳng từ `tsudev.json` (glow chặn trần 15%).
  3. MAY: dải 3px màu `primary` từng sản phẩm ở mép trên thẻ app (/apps + khối sản phẩm trang chủ), Sáng/Tối
     theo `data-theme`. `npm run products:gen` ⇒ `packages/ui/src/lib/productAccents.generated.ts`;
     `tokens:check` chạy `--check` (sync `.standards` đổi màu mà quên sinh lại ⇒ CI đỏ).
  4. Test `apps/frontend-main/test/banSacCong.test.ts` (6 ca quét nguồn); `docs/design-system.md` mục
     "Bản sắc sản phẩm".
  5. Ảnh trước/sau/production, Tối + Sáng, 1280 + 390 px, `/` và `/apps` (24 ảnh):
     **`~/projects/logs/anh-chup/tsudev/20261121-STD50/`** (`truoc_*` = tsudev.com trước deploy, `sau_*` = dev
     cục bộ, `production_*` = sau deploy). Công cụ chụp: `~/projects/logs/tools/browser/chup-tsudev.cjs`.
  6. Cổng: format, lint, typecheck, topology, tokens(+products), kiểm tài sản nhận diện; frontend 350 test,
     `packages/ui` 280; CI 19/19. Nghiệm thu production: `/` `/apps` `/blog` `/docs` `/projects` 200;
     providers = credentials/passkey/github/google; HTML có `data-layout="cong"` + `data-motif="quang-sang"`;
     /apps 10 thẻ `data-product-accent`; og-image production trùng sha256 bản commit; `/apps?nhom=files`
     bật chip "Tệp & dữ liệu".
