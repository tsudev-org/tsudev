# PHIẾU BÀN GIAO - Giao diện đen tuyền + tím kiểu Supabase, chỉ Sáng / Tối / Hệ thống, dọn nội dung lạc đề

- **Mã phiếu**: 20261110-05 (cùng số với phiếu yêu cầu đã đặt ở các repo hệ sinh thái)
- **Phiên**: 47 (tsudev-9b) - nhánh `feat/giao-dien-tim-den-supabase` (CHƯA push, chờ chủ dự án xác nhận)
- **Thời điểm**: 10/11/2026
- **Trạng thái**: MỞ

## 1. Yêu cầu của chủ dự án (10/11/2026)

Giao diện tsudev.com mâu thuẫn, khó nhìn (icon trùng màu nền nút; thẻ app không có biểu tượng; dải nền đứt
đoạn); nội dung `/projects`, `/docs`... không thuộc hệ sinh thái. Đổi sang **đen tuyền + tím tươi**, bố cục /
nút / hiệu ứng tham khảo supabase.com, chân trang `© tsudev` + nút đổi giao diện, **toàn hệ sinh thái chỉ còn
Sáng / Tối / Hệ thống**, và gửi phiếu cho mọi repo hệ sinh thái.

## 2. Đã làm (mã, trên nhánh)

- **Bảng màu** (`tokens/extensions.tsudev-web.json` → `npm run tokens:sync`): Tối mặc định nền `#0A0A0A`, xám
  trung tính, primary `#A970FF` (chữ trên nút là mực đen `#0A0A0A` - xem `$note` của khối `brand`); Sáng nền
  `#FAFAFA`, primary `#7C3AED`. Accent tím hồng, icon-* đổi theo. **Bỏ chế độ Ấm**: `sync-tokens.js` chỉ sinh
  `dark` + `light`; khối `warm` của bảng chuẩn còn nhưng không dùng.
- **Bộ chọn giao diện** `ThemeToggle.tsx`: 3 nút Sáng / Tối / Hệ thống (`role="radiogroup"`, phím ← →), đặt ở
  **chân trang** cạnh `© tsudev`; header KHÔNG còn nút giao diện. `warm` cũ trong localStorage ⇒ `light` (cả
  `_document.tsx` và `ThemeToggle.tsx`). **Băm CSP mới** `THEME_SCRIPT_HASH` trong `proxy.ts`:
  `sha256-6OxaX4ZX/Z1i7xeteXEN/5zkcRN2gWISAWLtOI9kELk=`. Manifest + `build-assets.js` = `#0a0a0a`.
- **Nền liền mạch**: PageHeader, AuthShell, footer bỏ nền riêng + viền dưới; `.tsu-backdrop` = một quầng tím
  tĩnh cố định; aurora chuyển động / ánh trượt / quầng nút / nhấc thẻ đều bỏ (tên lớp `tsu-*` giữ nguyên).
- **Header/nút/thẻ kiểu Supabase**: header kính mờ cùng nền + hairline, cặp nút "Đăng nhập" (phụ) + "Tải ứng
  dụng" (chính) cao 32px; `Button` bo `rounded-md`, `font-medium`, primary có viền; `Card` bo `rounded-lg`,
  hover đậm viền. `rounded-xl/2xl` → `rounded-lg`, `font-extrabold` → `font-semibold` ở các trang.
- **Lỗi icon trùng màu nền**: `Icon` có lớp `tsu-icon`; `globals.css` cho icon trong `.bg-primary/.bg-danger/
.bg-accent/... /.tsu-monogram` ăn màu chữ (`color: inherit`, quy tắc ngoài lớp nên thắng `text-icon-*`). Ví
  dụ đã gặp: icon nền tảng màu xanh trên chip lọc đang chọn (nền primary) ở `/apps`.
- **Biểu tượng app**: `EcoApp.icon` (đường SVG 24x24) cho 7 app, vẽ trên ô `.tsu-monogram` (nền tím nhạt, glyph
  `--text-link`). Không lấy favicon từ site con: CSP `img-src 'self'` và favicon các site con là CÙNG một ảnh.
- **contact.tsudev.com** thêm vào `ecosystem.ts` (đo 200 + `<title>` 10/11/2026) - việc 2 phiếu `20261110-04`.
- **Trang chủ**: hero canh giữa, bỏ khung "PowerShell" giả, hiện đủ 7 app; khối Dự án/Bài viết **ẩn khi trống**
  (vẫn hiện khi tải LỖI). Thẻ "Tải về an toàn" trỏ `/projects`.
- **Test**: `contrast.test.ts` (2 chế độ, 220 khẳng định), `themeTokens.test.ts`, `csp.test.ts` (bỏ WARM_BASE),
  E2E `react-hooks-7.spec.js` (radiogroup ở footer), `release-security.spec.js` (THEMES 2 chế độ). Storybook
  bỏ Ấm, mặc định Tối. `docs/design-system.md` cập nhật.

## 3. Đã kiểm

typecheck, lint, format:check (sạch sau khi định dạng 2 phiếu của phiên khác), tokens:check, topology:check,
test frontend 172/172, ui 220/220. Dev server + backend giả rỗng: `/`, `/apps`, `/projects`, `/docs`, `/blog`,
`/login` 200, mỗi trang có `© tsudev` + đúng 1 radiogroup, không còn `tsu-hero-bg`, trang chủ 12 ô biểu tượng
(7 app + 4 tính năng + 1 CTA).

⚠️ **CHƯA kiểm bằng mắt**: Chromium của Playwright trong phiên này bị `ERR_CONNECTION_REFUSED` tới mọi địa chỉ
loopback (curl thì tới được - cô lập mạng của sandbox), nên KHÔNG có ảnh chụp. Phiên sau / chủ dự án: chạy
`npm run dev:local`, mở cả hai chế độ ở 1440px và 390px trước khi merge. Chưa chạy E2E, chưa build OpenNext.

## 4. Dọn nội dung lạc đề - CHƯA áp lên production

Đo 10/11/2026 từ bên ngoài: `/projects` = 3 thư viện nội bộ (`tsudev-platform`, `tsudev-ui`, `topology-check`);
`/docs` ≈ 50 bài Toà soạn sinh, trùng lặp, sai chính tả ("Huấn dẫn", "Kiều trúc"); `/blog` = tin công nghệ/đời
sống Toà soạn dịch lại. Script `scripts/don-noi-dung-lac-de.js`:

- Chọn theo QUY TẮC: Post/Doc có `authoredByAgentId` hoặc `sourceDraftId` (dấu vết Toà soạn) hoặc là bài mẫu
  seed; Project = slug mẫu seed (gồm `tsudev-trust-seal` của Con dấu đã gỡ). Mục không khớp chỉ được LIỆT KÊ.
- **Xoá MỀM** (`deletedAt`), đảo được; mặc định CHỈ IN, `--apply` mới ghi. Đã chạy thử chế độ in trên DB dev.
- Áp production (việc của chủ dự án - agent không có DATABASE_URL của Neon, và đây là thao tác dữ liệu thật):
  `DATABASE_URL='<neon>' node scripts/don-noi-dung-lac-de.js` → đọc danh sách → thêm `--apply`. Trang ISR tự
  dựng lại trong ≤300s. Sau đó `node scripts/dem-noi-dung-prod.js` sẽ báo TRỐNG (mã thoát 1) - đó là kết quả
  đúng của việc dọn, không phải sự cố; cân nhắc hạ ngưỡng của cổng đếm hoặc đăng tài liệu thật (hướng dẫn kiểm
  chữ ký bản phát hành từ `docs/release-signing.md`, hướng dẫn cài từng app).
- Seed dev (`packages/db/prisma/seed.js`) vẫn tạo các mục mẫu cũ - chỉ ảnh hưởng dev; sửa thì qua agent
  data-schema.

## 5. Phiếu đã gửi các repo hệ sinh thái (`20261110-05_yeu-cau-giao-dien-den-tim-kieu-supabase.md`)

Nội dung chung: bảng mã màu hai chế độ, hợp đồng bộ chọn giao diện (khoá `tsudev-theme`, `warm` ⇒ `light`,
script trước-khi-vẽ đặt sau meta theme-color, CSP băm), danh sách kiểm bố cục kiểu Supabase, nghiệm thu. Phiếu
này THAY phần "nút ở header" của phiếu `20261110-02/03` phiên 46. Tệp CHƯA commit ở repo đích.

| Repo                                   | Vị trí phiếu     | Đã báo                                                              |
| -------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| `tsudev-trafficmonitor`                | `logs/handover/` | chưa có phiên mở                                                    |
| `tsudev-cwico`                         | `logs/handover/` | chưa có phiên mở (PR #58 chờ deploy - gộp trước deploy)             |
| `tsudev-swico`                         | `logs/handover/` | chưa có phiên mở                                                    |
| `tsudev-files`                         | `logs/handover/` | PR tsudev-org/tsudev-files#29 (CI chạy) - mã xong, chờ gộp + deploy |
| `tsudev-lotus`                         | `logs/handover/` | chưa có phiên mở                                                    |
| `tsudev-contact`                       | `logs/handover/` | chưa có phiên mở                                                    |
| `app-la-ban`                           | `docs/phieu/`    | inbox `agent-laban` mã `HGLB-1110-205345`                           |
| `tsudev-standards` (bộ quy ước v3.4.0) | `logs/handover/` | chưa có phiên mở - đề xuất gỡ chế độ Ấm khỏi bảng chuẩn             |

## 6. Việc cho phiên sau (theo thứ tự)

1. Kiểm bằng mắt (§3), xin xác nhận rồi push nhánh + mở PR; CI 13 check; người dùng tự merge.
2. Deploy frontend qua `scripts/deploy-frontend.js`; nghiệm thu: CSP mang băm `sha256-6OxaX4ZX...`,
   `/api/auth/providers` chỉ provider thật, `data-theme="dark"`, console 0 lỗi CSP, chọn Sáng → tải lại vẫn Sáng.
3. Chủ dự án áp §4 lên production (hoặc giao lại kèm DATABASE_URL trong shell).
4. Khi `tsudev-standards` phát hành bản gỡ Ấm: đồng bộ `.standards/` và kiểm `themeTokens.test.ts` (đang chỉ
   đòi `light` + `dark` có mặt).
5. Việc cũ còn nguyên từ phiếu `20261110-03`: hạn minimatch (từ 08:08 11/11), chốt kiểu URL phiếu `20261109-06`.
