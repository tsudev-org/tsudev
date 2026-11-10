# PHIẾU BÀN GIAO - Giao diện đen + xanh, danh bạ app hệ sinh thái

- **Mã phiếu**: 20261110-01
- **Phiên**: 46 - nhánh `feat/giao-dien-den-xanh-he-sinh-thai` (CHƯA commit/push - chờ chủ dự án duyệt)
- **Trạng thái**: MỞ

## 1. Đã làm

- **Tông thương hiệu mới** (chủ dự án chọn 10/11/2026, thay tông chàm 05/11): chế độ **Tối là mặc định**, nền
  gần-đen `#05070B` (không `#000` - DESIGN_SYSTEM §1), primary xanh dương `#3D9BFF`, accent xanh lá `#2EE6A6`.
  Sáng/Ấm đổi theo cùng sắc. Thêm token `glow-alt`. 293 cặp tương phản AA đạt ở cả 3 chế độ.
- Mặc định Tối ở: `scripts/sync-tokens.js` (`:root` trần = Tối), `_document.tsx`, `ThemeToggle.tsx`, manifest,
  `build-assets.js`; test `themeTokens`/`contrast` cập nhật theo. **Băm CSP `THEME_SCRIPT_HASH` trong `proxy.ts`
  đã đổi** (script chống nháy đổi).
- Hiệu ứng: aurora chuyển động xanh dương/xanh lá (hero, CTA), nền quầng cố định mọi trang (`.tsu-backdrop` trong
  Layout, z-index -1), chữ chuyển sắc có ánh trượt, thẻ viền chuyển sắc khi hover (`Card hover` dùng chung), header
  kính mờ. Tắt chuyển động dưới `prefers-reduced-motion`.
- **Trang `/apps`** (học winstall.app): tìm bỏ dấu, lọc nền tảng/nhóm, chọn nhiều app ⇒ một lệnh winget, mỗi thẻ có
  nút "Trang sản phẩm ↗" / "Tải bản mới nhất ↗" mở tab mới. Dữ liệu: `packages/ui/src/lib/ecosystem.ts` (7 app,
  mọi link đo 10/11/2026). Trang chủ: hero có ô tìm app → `/apps?q=`, khối "Sản phẩm của tsudev". Footer: cột
  "Hệ sinh thái" mở tab mới. Header: mục "Ứng dụng". Sitemap thêm `/apps`.

## 2. Đã kiểm

typecheck, lint, format:check (trừ phiếu 20261109-06 của phiên khác), tokens:check, topology:check, test
frontend 172/172, ui 293/293. Chụp màn hình Playwright (dev server + backend giả rỗng) 1440px và 390px, chế độ
Tối và Sáng: không tràn ngang. CHƯA chạy E2E và chưa build OpenNext.

## 3. Việc còn lại

1. Chủ dự án duyệt giao diện ⇒ commit, PR, CI; deploy qua `scripts/deploy-frontend.js`, nghiệm thu
   `curl -sI https://tsudev.com/` (CSP mang băm mới) + mở trang thấy chế độ Tối.
2. `tsudev-contact` chưa có website (contact.tsudev.com không phân giải) - thẻ chỉ có nút tải GitHub.
   `tsudev-files`/`tsudev-lotus` chưa có bản phát hành GitHub - thẻ chỉ có nút website.
3. Ảnh icon PWA (apple-touch-icon...) vẫn nền sáng `#eef4fb` - cố ý, không dựng lại.

## 4. Phiếu đã gửi: nút đổi giao diện Sáng/Tối ở header website từng dự án (chủ dự án yêu cầu 10/11/2026)

Tệp phiếu CHƯA commit ở repo đích (repo đó tự commit khi nhận). Mỗi phiếu ghi riêng ràng buộc CSP của site:

| Repo                    | Phiếu                                                                             | CSP hiện tại                             | Đã báo phiên                                                      |
| ----------------------- | --------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `tsudev-trafficmonitor` | `logs/handover/20261110-02_*`                                                     | `default-src 'none'`, KHÔNG `script-src` | chưa có phiên mở                                                  |
| `tsudev-cwico`          | đổi số thành `20261110-03` (02 đã có)                                             | `script-src 'self'`                      | `tsudev-cwico-2c` đã nhận, nhánh `feat/website-nut-doi-giao-dien` |
| `tsudev-swico`          | `logs/handover/20261110-02_*`                                                     | `script-src 'unsafe-inline'`             | chưa có phiên mở                                                  |
| `tsudev-files`          | `logs/handover/20261110-02_*` (website ở nhánh `feat/website`)                    | `default-src 'none'`                     | `tsudev-files-50` (đã nhắn)                                       |
| `tsudev-lotus`          | `logs/handover/20261110-02_*`                                                     | `default-src 'none'`                     | chưa có phiên mở                                                  |
| `app-la-ban`            | `docs/phieu/20261110-02_*` + `./agents.sh inbox agent-laban` (`HGLB-1110-125225`) | `'self' 'strict-dynamic'`                | chưa có phiên mở                                                  |

`tsudev-contact` chưa có website - không có phiếu.
