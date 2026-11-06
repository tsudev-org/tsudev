# Hệ thống giao diện - cách tsudev-web hiện thực bộ quy ước

**Quy tắc là [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)** (v1.0.0, dùng chung cho mọi
repo trong hệ sinh thái, thuộc nhóm bất khả xâm phạm). File này chỉ trả lời một
câu hỏi khác: _repo này hiện thực bộ quy ước đó bằng những file nào_. Đừng chép
lại nội dung của nhau.

Component dùng chung nằm ở `packages/ui` (`@tsudev/ui`). Viết component riêng
trong `apps/*` chỉ được phép khi nó thật sự chỉ dùng ở một app.

## Đường đi của một giá trị màu

```
.standards/tokens/design-tokens.json    ← NGUỒN CHÂN LÝ DUY NHẤT (chỉ-đọc)
tokens/extensions.tsudev-web.json       ← phần riêng của web (sửa ở đây)
   │  npm run tokens:sync   (ghép hai file, phần riêng đứng sau)
   ▼
packages/ui/src/tokens.css         ← BẢN SINH RA, đừng sửa tay
   │  @import
   ▼
apps/frontend-main/styles/globals.css   ← khối @theme (Tailwind 4): mọi
   │                                       khoá trỏ về một biến CSS
   │
   ▼
class trong .tsx  (bg-surface, text-fg-muted, border-line-control…)
```

Ba cổng canh chuỗi này, và `npm run tokens:check` nằm trong CI:

| Cổng                                          | Bắt được gì                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run tokens:check`                        | `tokens.css` bị sửa tay, hoặc hai artifact trong `.standards/tokens/` trôi lệch nhau |
| `packages/ui/test/contrast.test.ts`           | một mã màu làm tụt tương phản dưới WCAG AA, ở **bất kỳ** chế độ nào                  |
| `apps/frontend-main/test/themeTokens.test.ts` | ba bản sao màu nền ngoài `tokens.css` trôi lệch nhau                                 |

Bảng dùng chung của **hệ sinh thái** (C#/Python/Qt cũng đọc nó) sống ở
`.standards/tokens/`, đến từ repo quy ước trung tâm và cả cây đó nằm trong
`.prettierignore` - định dạng lại một byte là lệch `MANIFEST.sha256`. Repo này
**không giữ bản sao nào** của bảng đó từ 26/08/2026 (QU-STD-1).

Vì sao đáng gỡ: bản sao cũ (`tokens/design-tokens.json` + `tokens/tokens.css`) ở
lại v1.0.0 trong khi bộ quy ước đi tới v2.0.0, và **không cổng nào bắt được** - mỗi
cổng chỉ đối chiếu bản sao với chính nó. Giá phải trả đã đo được: bản chuẩn đổi tên
`line-height.long-text` thành `long`, app viết `var(--lh-long)`, biến đó **không tồn
tại** trong artifact sinh từ bản sao, nên mọi khối `.prose-tsu` (nội dung Markdown
của blog và tài liệu) rơi về `--lh-body` 1.55 thay vì 1.6. Không có gì đỏ lên.

## Ba chế độ, và chuyện `prefers-color-scheme`

`data-theme` trên `<html>`: `light` (mặc định) · `warm` · `dark`.

Đây là chỗ hai tài liệu quy ước **mâu thuẫn nhau**, nên ghi rõ cách hoà giải đã chọn:

- `DESIGN_SYSTEM.md` §1 muốn chế độ mặc định bám theo hệ điều hành.
- `CLAUDE.md` cấm điều đó: một site đổi diện mạo theo cài đặt máy nghĩa là hai
  người mở **cùng** một đường link thấy hai thứ khác nhau mà không ai chọn gì cả,
  và người viết bài không biết bài mình trông ra sao.

Cách hoà giải: **mặc định vẫn là Sáng**, nhưng "Theo hệ thống" có mặt như một
**lựa chọn người dùng tự bật** - lựa chọn thứ tư trong `ThemeToggle`. Hệ quả về mã:

- Bảng màu trong `tokens.css` **không** có media query nào treo vào cài đặt hệ
  điều hành. `themeTokens.test.ts` canh điều này.
- Việc hỏi cài đặt máy chỉ xảy ra trong JavaScript, ở đúng hai chỗ:
  `pages/_document.tsx` (script đồng bộ, nội tuyến, trong `<head>` - chạy **trước
  khi trang được vẽ**, nếu không sẽ có một khung hình sáng trắng ở mọi lần tải) và
  `ThemeToggle.tsx` (theo dõi máy đổi cài đặt giữa chừng).
- Giá trị lưu trong `localStorage['tsudev-theme']` là **lựa chọn** (`light`/`warm`/
  `dark`/`system`), không phải bảng màu. Chỉ script boot mới giải nó thành `data-theme`.

Màu nền của ba chế độ bị chép ra hai file `.tsx` vì cả hai chạy trước khi CSS
được tính - `<meta name="theme-color">` không đọc được biến CSS. Đó là bản sao
**bắt buộc**, và có test canh cho chúng bằng nhau.

## Token riêng của repo này

Bộ chuẩn v1.0.0 không có sẵn ba nhóm dưới đây; chúng nằm ở
`extensions.tsudev-web` trong file JSON, tách bạch khỏi khối `color` bất khả xâm phạm.

| Nhóm                                | Vì sao cần                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--icon-*` (6 màu)                  | Mã màu theo **nhóm hành động** - mắt nhận ra nhóm trước khi đọc nhãn. Sáu, không hơn: quá bảy màu thì chúng thôi là mã và thành nhiễu.                                  |
| `--<trạng thái>-ink` / `-tint`      | §5 đòi badge "nền trạng thái nhạt 12% + chữ màu trạng thái đậm", nhưng ở chế độ Sáng cặp đó chỉ đạt ~4.1-4.3:1. `-ink` là sắc đậm hơn cho chữ, `-tint` là nền tính sẵn. |
| `--accent`, `--glow`, `--grid-line` | Sắc NHẤN cam của tông chàm (huy hiệu "Mới", điểm nhấn hero, đầu cam của chữ chuyển sắc) và hai hoạ tiết nền.                                                            |

### Tông thương hiệu chàm (05/11/2026)

Chủ dự án chọn tông **chàm `#4F46E5` + nhấn cam, nền trắng ngà `#FAFAF9`** thay
cho bảng xanh dương của bảng chuẩn. Giá trị bảng chuẩn KHÔNG bị sửa: khối `brand`
trong `tokens/extensions.tsudev-web.json` ghi đè lúc sinh (`colorFor()` trong
`scripts/sync-tokens.js`), và script ném lỗi khi khối đó gõ sai tên khoá hoặc trùng
khoá với khối mở rộng. Chế độ Ấm giữ nền sepia, chỉ đổi sắc chủ đạo.

Đổi màu nền (`--bg-base`) thì phải đổi theo **bốn bản chép** ngoài `tokens.css`
(`_document.tsx`, `ThemeToggle.tsx`, `site.webmanifest`, `build-assets.js`) VÀ băm
CSP `THEME_SCRIPT_HASH` trong `proxy.ts` - script chống nháy màu chứa mã màu nền,
lệch băm thì trên HTTPS script bị chặn và trang nháy màu, ở dev không thấy gì.
`themeTokens.test.ts` và `csp.test.ts` canh cả hai.

Lớp trang trí của trang chủ dùng ba class trong `styles/globals.css`:
`tsu-hero-bg`, `tsu-cta-bg`, `tsu-text-gradient` - đều trộn từ token, không mã hex.
Wordmark SVG: `packages/brand/source/wordmark-{light,dark}.svg`.

⚠️ **Hai token của bảng chuẩn v1.0.0 KHÔNG đạt chính quy tắc bắt buộc của §1**, đo
được bằng `contrast.test.ts` - số đo giữ ở `$accessibility_gap` trong
`tokens/extensions.tsudev-web.json`:

- `text-muted` chỉ đạt 3.69-4.58:1 (ngưỡng AA là 4.5:1), và đây là token bị dùng
  nhiều nhất trong app.
- `border-strong` chỉ đạt 1.65-2.49:1 (WCAG 1.4.11 đòi 3:1 cho ranh giới thành
  phần giao diện).

Repo này từng vá bằng cách ghi đè `text-muted` và thêm vai trò mới
**`border-control`** cho ranh giới vùng tương tác (viền nút phụ, viền ô nhập).
**Đề xuất đẩy ngược đã được nhận** vào bộ quy ước v2.8.0, nên bảng chuẩn nay mang
sẵn cả hai giá trị và khối ghi đè đã bị gỡ - giao diện không đổi một pixel nào.
`border-strong` giữ giá trị chuẩn và chỉ dùng cho ranh giới trang trí.

## Icon nền tảng và logo cú (05/11/2026)

**Bốn dấu hiệu nền tảng** (`windows`, `android`, `apple`, `linux` trong
`packages/ui/src/components/icons.ts`) là **logo chính thức của hãng**, không
còn vẽ tay. Chúng nhúng thẳng thành path trong bảng icon - không thêm
dependency, không thêm request mạng, sắc ở mọi DPI.

- Mặc định một màu (`role: 'info'`), ăn theo ba chế độ như mọi icon khác.
- Rê chuột vào ô chứa (`platformChipClass(name)`), ô ra **màu hãng**
  (`--platform-*`) và dấu hiệu đổi sang mực `--on-platform-*`. Màu hãng làm NỀN
  chứ không làm màu dấu hiệu: xanh Android và vàng Tux tô thẳng lên nền sáng chỉ
  đạt ~1.6-1.9:1. Bốn cặp bị `contrast.test.ts` canh ở 4.5:1.
- `fill: true` vẽ hình đặc trong viewBox nới `-2 -2 28 28`, để khối đặc rơi đúng
  vùng an toàn như icon nét.
- Path có cờ cung viết gọn (`a.4.4 0 00...`) phải tách cờ ra (`0 0 0`) trước khi
  nhúng - `npm run icons:check` không đọc dạng gọn. Kiểm bằng so pixel, đừng sửa tay.

Nguồn và giấy phép (bản `mono` 24×24 của [thesvg.org](https://thesvg.org),
`github.com/glincker/thesvg`):

| Dấu hiệu    | Giấy phép       | Ghi chú                                                                                                                                                                                               |
| ----------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apple       | CC0-1.0         |                                                                                                                                                                                                       |
| Linux (Tux) | CC0-1.0         |                                                                                                                                                                                                       |
| Android     | **CC-BY-3.0**   | Android robot is reproduced or modified from work created and shared by Google and used according to terms described in the Creative Commons 3.0 Attribution License. **Đừng xoá dòng ghi công này.** |
| Windows     | dùng danh nghĩa | Bốn ô vuông của Windows 11, path viết lại vì danh mục không có bản mono                                                                                                                               |

Mọi dấu hiệu vẫn là nhãn hiệu của chủ sở hữu; dùng chúng để báo "có bản cho nền
tảng này" là cách dùng danh nghĩa, không phải nhận diện của tsudev.

**Logo cú** (`Logo.tsx`) tải qua `<picture>`: AVIF → WebP → PNG. Bản nhỏ
`logo-mark-{64,96,128}.{avif,webp}` do `packages/brand/build-assets.js` sinh,
2-9 kB thay vì `logo-mark.png` 131 kB cho một con cú 32-40px. Chưa có bản SVG:
bản gốc là JPEG raster, vector hoá tự động phải được đo (dung lượng + độ sạch
nét) trước khi thay, và đổi bản gốc là việc của `.standards/BRAND_ASSETS.md`.

## Bản đồ tên: token CSS ↔ class Tailwind

Tailwind không giữ giá trị nào - mọi khoá trỏ về một biến CSS.

| Biến CSS                                        | Class                                                        |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `--bg-base` / `-surface` / `-subtle` / `-hover` | `bg-base` / `bg-surface` / `bg-subtle` / `bg-hovered`        |
| `--text-primary` / `-secondary` / `-muted`      | `text-fg` / `text-fg-secondary` / `text-fg-muted`            |
| `--text-link`                                   | `text-link`                                                  |
| `--border` / `-strong` / `-control`             | `border-line` / `border-line-strong` / `border-line-control` |
| `--primary` / `-hover` / `-active`              | `bg-primary` / `bg-primary-hover` / `bg-primary-active`      |
| `--on-primary`, `--on-status`                   | `text-on-primary`, `text-on-status`                          |
| `--<trạng thái>-ink` / `-tint`                  | `text-danger-ink`, `bg-success-tint`…                        |
| `--control-h`, `--row-h`                        | `h-control`, `h-row`                                         |
| `--sp-1..12`                                    | `p-sp1` … `gap-sp6`                                          |

Chữ nằm trong nhóm `fg` chứ không phẳng ra thành `text-primary`, vì bộ chuẩn có
**cả** `--text-primary` (chữ thân bài) lẫn `--primary` (xanh thương hiệu) - phẳng
ra thì `text-primary` mang hai nghĩa.

## Mật độ

`data-density="compact"` trên `<html>` đổi `--control-h` 36→32px, `--row-h`
44→36px, `--list-item-h` 40→32px. Comfortable là mặc định cho web; Compact dành
cho màn hình nhiều dữ liệu.

## Ngày giờ

`apps/frontend-main/lib/format.ts` - `formatDateVN` (`DD/MM/YYYY`) và
`formatDateTimeVN` (`HH:mm DD/MM/YYYY`). **Đừng gọi thẳng
`toLocaleDateString('vi-VN')`**: nó bỏ số 0 đầu nên 05/08/2026 in ra `5/8/2026`,
và cột ngày trong bảng thôi thẳng hàng. Múi giờ ghim `Asia/Ho_Chi_Minh` vì trang
dựng SSR trên Workers (UTC) rồi hydrate ở máy người đọc - để nó trôi thì bài đăng
lúc đêm hiện lệch một ngày giữa hai lần vẽ.

## Storybook

`npm --workspace packages/ui run storybook` - lệnh tự in địa chỉ ra terminal
(cổng của Storybook cố ý KHÔNG khai trong `config/topology.json`: nó là công cụ
dev, không phải một thành phần của hệ). Thanh công cụ có nút **Giao diện** đổi giữa ba chế độ. Storybook **không** nằm trong CI - nó
là công cụ rà bằng mắt, cổng thật là `contrast.test.ts`.

Chạy được từ 20/08/2026. Trước đó nó hỏng ở **bốn** tầng chồng lên nhau, và mỗi
tầng đều hỏng theo kiểu IM LẶNG - đây là lý do phần cấu hình có nhiều chú thích
hơn mã:

| Hỏng ở đâu                                                             | Trông như thế nào                                          |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| thiếu gói CLI `storybook`, `framework` khai theo kiểu bản 6            | `storybook: not found`                                     |
| glob `@(js,jsx,ts,tsx)` - extglob phân nhánh bằng `\|`, không phải `,` | một dòng WARN, giao diện rỗng như "chưa ai viết story"     |
| `@tsudev/types` là CommonJS, Vite phục vụ thẳng qua `/@fs`             | server lên, `index.json` đủ 12 story, MỌI khung story rỗng |
| `next-auth/react` đọc `process` + đòi `SessionProvider`                | vẫn rỗng, lỗi chỉ nằm trong console                        |

Cả bốn đều KHÔNG làm `storybook build` thất bại. Nên phép nghiệm thu ở đây phải
là **đếm story vẽ ra được**, không phải "lệnh chạy xong": mở
`iframe.html?id=<story>&globals=theme:<chế độ>` cho từng story ở cả ba chế độ và
kiểm `#storybook-root` có nội dung. Lần nghiệm thu 20/08/2026: **36/36 lượt**
(12 story × 3 chế độ) vẽ ra nội dung, đúng `data-theme`, 0 lỗi console, 0 ảnh 404.

Bản hiện tại: **Storybook 10 + Vite 8** (từ 06/11/2026). Cấu hình là
`.storybook/main.mjs` - Storybook 10 chỉ nạp cấu hình ESM - và không còn
`addon-essentials` (controls, actions, viewport, backgrounds nằm sẵn trong lõi).
Nghiệm thu lần nâng: `storybook build` rồi mở từng khung bằng Chromium -
**36/36 lượt** ở cả bản 8 lẫn 10, 0 lỗi console, 0 phản hồi ≥400.

⚠️ Component nào của `@tsudev/ui` kéo theo `next-auth` (`SiteHeader`,
`SiteFooter`, `useTrustNav`) thì chỉ dựng được nhờ hai mảnh vá trong
`.storybook/`: shim `window.process` ở `preview-head.html` và decorator
`SessionProvider` ở `preview.js`. Thêm component mới phụ thuộc thứ Next-only thì
phải nghĩ tới chỗ này.
