# QUY ƯỚC GIAO DIỆN TOÀN PROJECT (DESIGN SYSTEM) - v4.1.0

> Áp dụng cho MỌI website, tool, phần mềm desktop (Electron/C#/Python/C++), app trong hệ sinh thái.
> Nguồn giá trị duy nhất: `tokens/design-tokens.json` (lớp nền chung) và `tokens/products/<id>.json` (lớp bản sắc).
> `tokens/tokens.css` và `tokens/products.css` là bản **sinh tự động** từ JSON - KHÔNG sửa tay, sinh lại bằng
> `node scripts/build-tokens.mjs`.
> Cấm hard-code màu/cỡ chữ/radius trong source code - chỉ dùng token.
> Quy tắc khả năng truy cập đầy đủ: [`ACCESSIBILITY.md`](ACCESSIBILITY.md).
> Logo, wordmark, favicon, icon ứng dụng: [`BRAND_ASSETS.md`](BRAND_ASSETS.md).

## 1. Hệ màu & chế độ nền

> **Từ v5.0.0 (tsudev-standards, quyết định 21/11/2026 - chủ dự án giao agent chọn phương án): hai lớp.**
> **Lớp nền chung** (mục 1.1) giống nhau ở mọi sản phẩm: nền đen tuyền / trắng, chữ, viền, màu trạng thái, ngưỡng
> tương phản. **Lớp bản sắc** (mục 1.2) KHÁC nhau ở từng sản phẩm: màu nhấn lấy từ logo, kiểu bố cục, bo góc, hoạ
> tiết, font tiêu đề. Mục tiêu: người dùng nhìn là nhận ra đang ở sản phẩm nào, mà chất lượng (độ đọc, tiếp cận,
> hành vi) vẫn đồng đều. Chế độ **Ấm** đã gỡ hẳn khỏi token; chỉ còn **Sáng / Tối / Hệ thống**, mặc định **Hệ thống**
> (`PRODUCT_POLICY.md` mục 1). Giá trị đã lưu `warm` `MUST` được đọc thành `light`.

### 1.1. Lớp nền chung (`tokens/design-tokens.json`)

Nền đen tuyền + chữ trung tính, đã chạy thật ở tsudev.com từ v3.8.0 (`ECOSYSTEM_IDENTITY.md` mục 4.2), nay là giá trị
chuẩn của token. Vai trò nhấn trong file này là bộ **mặc định của TsuDEV** - sản phẩm khai `data-product` thì lớp
bản sắc ghi đè đúng các vai trò nhấn, KHÔNG đụng vai trò nền/chữ/trạng thái.

| Vai trò | Sáng | Tối |
|---|---|---|
| Nền `bg-base` / `bg-surface` / `bg-subtle` / `bg-hover` | `#FAFAFA` / `#FFFFFF` / `#F4F4F5` / `#EBEBED` | `#0A0A0A` / `#0F1114` / `#15181D` / `#1C2027` |
| Viền `border` / `border-strong` | `#E4E4E7` / `#D4D4D8` | `#22272F` / `#2C323C` |
| Viền vùng tương tác `border-control` | `#71717A` | `#6E6E6E` |
| Chữ `text-primary` / `text-secondary` / `text-muted` | `#0A0A0A` / `#3F3F46` / `#52525B` | `#EDEDED` / `#B4B4B4` / `#8F8F8F` |
| Trạng thái success / warning / danger / info | `#15803D` `#B45309` `#DC2626` `#0369A1` | `#4ADE80` `#FBBF24` `#F87171` `#38BDF8` |
| Chữ trên nền trạng thái `on-status` | `#FFFFFF` | `#0A0A0A` |
| **Vai trò nhấn** (lớp 1.2 ghi đè): `text-link`, `primary`, `primary-hover`, `primary-active`, `on-primary`, `focus-ring`, `accent`, `glow`, `icon-info`, `icon-nav` | xanh TsuDEV `#0868C4`... | xanh TsuDEV `#38BDF8`... |

**Hai vai trò viền, đừng gộp làm một.** `border-strong` là ranh giới **trang trí**
(đường chia khối, nét mảnh của card): không mang thông tin thao tác, WCAG không đòi
3:1, và kéo nó đậm lên làm giao diện nặng nề. `border-control` là ranh giới **vùng
tương tác** (viền nút phụ, viền ô nhập): chính nó nói cho người dùng biết bấm hay gõ
được ở đâu, nên 3:1 là bắt buộc. Dùng nhầm vai trò là lỗi, không phải chuyện thẩm mỹ.

**Quy tắc bắt buộc:**
- Ngưỡng tương phản, đo trên đúng các cặp mà giao diện thật sinh ra, ở cả Sáng và Tối, cho lớp nền VÀ cho từng sản phẩm:

  | Token | Nền đối chiếu | Ngưỡng | Căn cứ |
  | --- | --- | --- | --- |
  | `text-primary` | `bg-base`, `bg-surface`, `bg-subtle` | ≥ 10:1 | Mục tiêu nội bộ, trên mức AAA |
  | `text-primary` | `bg-hover` | ≥ 7:1 | WCAG AAA. Nền hover là trạng thái tạm thời của một hàng |
  | `text-secondary`, `text-muted`, `text-link`, `accent` | cả 4 nền | ≥ 4.5:1 | WCAG 2.1 AA cho chữ thường |
  | `border-control`, `focus-ring`, `icon-info`, `icon-nav` | `bg-base`, `bg-surface`, `bg-subtle` | ≥ 3:1 | WCAG 1.4.11 cho ranh giới thành phần, biểu tượng |
  | `on-primary` | `primary`, `primary-hover`, `primary-active` | ≥ 4.5:1 | WCAG 2.1 AA |
  | `on-status` | nền trạng thái | ≥ 4.5:1 | WCAG 2.1 AA |

- **Biểu tượng trên nền trạng thái (từ v4.1.0).** Ngưỡng 3:1 của `icon-nav`/`icon-info` `MUST` đo trên **nền thật
  phía sau biểu tượng ở MỌI trạng thái**: thường, đang chọn (viên/pill chỉ báo của thanh điều hướng, tab, chip),
  hover, nhấn, vô hiệu, cả Sáng và Tối. Lỗi điển hình (đo 24/11/2026 ở Sound Db, Quly Thu Chi): thanh điều hướng
  dưới vẽ biểu tượng đang chọn màu **trắng** trên viên chỉ báo màu nhạt ⇒ gần như mất hình. Quy tắc:
  biểu tượng đang chọn dùng `on-primary` trên viên `primary`, HOẶC `primary` trên viên `bg-subtle`/`primary` 12-16%
  độ phủ - không trộn. Flutter `NavigationBar`: đặt **cả** `indicatorColor` và `iconTheme` theo `WidgetState.selected`,
  `MUST NOT` để mặc định Material 3 suy từ `seedColor` khi đã ghi đè một nửa. Mỗi repo có giao diện `MUST` có test
  ảnh vàng (golden) hoặc test đo tương phản cho thanh điều hướng ở 2 chế độ.
- **Cổng canh:** `node scripts/check-contrast.mjs` (lớp nền) và `node scripts/check-products.mjs` (lớp bản sắc) chạy
  trong CI của repo trung tâm và chặn merge khi có cặp trượt. Quy tắc không có cổng canh chỉ là câu chữ - bảng token
  v1.0.0 từng vi phạm chính mục này ở `text-muted` suốt ba chế độ mà không ai phát hiện.
- `text-muted` chỉ dùng cho thông tin phụ không thiết yếu, nhưng vẫn là **chữ thường**
  nên ngưỡng là 4.5:1, không phải 3:1.
- Ba lựa chọn Sáng / Tối / Hệ thống, mặc định **Hệ thống** (từ v3.8.0); "Hệ thống" đi theo hệ điều hành (`prefers-color-scheme`, Qt `QStyleHints.colorScheme()`, Android `AppCompatDelegate`...) và đổi ngay khi hệ điều hành đổi. Người dùng chọn thì **lưu lại lựa chọn** (localStorage/config file).
- Không dùng trắng tuyệt đối `#FFFFFF` làm `bg-base` và không dùng đen tuyệt đối `#000000` ở bất kỳ chế độ nào (giảm chói/mỏi mắt).
- Màu trạng thái không đứng một mình: luôn kèm icon hoặc chữ (hỗ trợ người mù màu). Màu trạng thái **không** đổi theo sản phẩm - "lỗi" phải đỏ ở mọi nơi.

### 1.2. Lớp bản sắc sản phẩm (`tokens/products/<id>.json`)

Mỗi sản phẩm có giao diện (website, app desktop, app di động) `MUST` có đúng một tệp `tokens/products/<id>.json` ở
repo này, theo lược đồ `tokens/products/product.schema.json`. Tệp khai năm thứ làm nên bản sắc:

| Trường | Nội dung | Ràng buộc |
| --- | --- | --- |
| `seed` + `hue` + `chroma` | Màu đo từ logo (ghi ảnh nguồn, ngày đo, lý do chọn sắc độ) | Màu chính cách mọi sản phẩm khác **≥ 20° sắc độ OKLCH** và **ΔE OKLab ≥ 0.045**, ở CẢ Sáng và Tối; cách `danger` ≥ 15° |
| `layout` | Kiểu bố cục chữ ký (mục 1.2.2) | Hai sản phẩm màu gần (ΔE < 0.08) `MUST` khác cả `layout` lẫn `shape` |
| `shape` | Bộ bo góc (mục 1.2.3) | như trên |
| `motif` | Hoạ tiết chữ ký ở hero (mục 1.2.4) | **Không** hai sản phẩm trùng hoạ tiết |
| `fontDisplay` | Font tiêu đề h1-h3 và số liệu lớn | Chỉ trong danh sách của lược đồ (đều có bộ ký tự tiếng Việt, giấy phép OFL); thân bài luôn là `--font-family` |

**Màu không chọn tay.** `node scripts/gen-product-palette.mjs <id>` sinh 10 vai trò nhấn cho hai chế độ từ `hue` và
`chroma`: dò độ sáng OKLCH theo từng bước tới khi mọi cặp ở mục 1.1 đạt (Tối: nút sáng chữ mực đen ≥ 8:1; Sáng: nút
đậm chữ trắng ≥ 5:1). Sửa tay `colors` sẽ đỏ cổng kiểm ("lệch bản sinh"). Ngoại lệ duy nhất: `"locked": true` cho bảng
chủ dự án đã chốt tay (TsuDEV - `ECOSYSTEM_IDENTITY.md` mục 4.2; TsuFiles - mục 4.2.1); cổng kiểm vẫn đo đủ.

**Danh bạ bản sắc hiện hành** (nguồn: `tokens/products/`; mẫu màu là nút chính ở chế độ Tối / Sáng):

| `data-product` | Sản phẩm | Hue | Nút chính Tối / Sáng | Bố cục | Bo góc | Hoạ tiết | Font tiêu đề |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `contact` | Tsu Contact | 350 | `#F182BA` / `#AD447C` | cong-cu | tron | the-xep | Nunito |
| `compass` | La bàn | 47 | `#FF843F` / `#B14C03` | do-luong | tron | vong-dong-tam | Montserrat |
| `swico` | Tsu Swico | 68 | `#E49324` / `#975D01` | cong-cu | sac | mach-in | Space Grotesk |
| `trafficmonitor` | TsuDEV TrafficMonitor | 105 | `#B3A90F` / `#736C01` | trinh-dien | mem | duong-bieu-do | JetBrains Mono |
| `sounddb` | Sound Db | 130 | `#7DB530` / `#4C7601` | do-luong | chuan | song-am | Space Grotesk |
| `qulythuchi` | Quly Thu Chi | 160 | `#39BA81` / `#05794F` | bang-dieu-khien | mem | cot-tang-truong | Be Vietnam Pro |
| `disk` | TsuDisk | 183 | `#24B9A8` / `#08786C` | cong-cu | chuan | khoi-phan-vung | Montserrat |
| `cwico` | Tsu Cwico | 212 | `#0EB5CE` / `#087485` | trinh-dien | sac | luoi-quet | Be Vietnam Pro |
| `tsudev` | TsuDEV (tsudev.com) | 233 | `#38BDF8` / `#0868C4` | cong | chuan | quang-sang | Inter |
| `files` | TsuFiles | 293 | `#A970FF` / `#7C3AED` | cong-cu | mem | quy-dao | Lexend |
| `lotus` | Lotus Share | 320 | `#E47DFB` / `#A23DB8` | trinh-dien | tron | canh-sen | Quicksand |

Chọn sắc độ khi logo không tự quyết được (ghi trong `seed.note` của từng tệp): Tsu Contact (bạc hà trùng TsuDisk),
TrafficMonitor (dùng chung logo cú TsuDEV), Tsu Swico (logo đơn sắc), La bàn (vòng xanh hoàng gia cách xanh TsuDEV 10°
ở chế độ Sáng - lấy cam của kim la bàn), Lotus Share (trước 21/11/2026 dùng chung `#A970FF` với TsuFiles - lấy tím ngả
hồng của cánh sen).

#### 1.2.1. Cách dùng ở repo sản phẩm

- Web: nạp `.standards/tokens/tokens.css` rồi `.standards/tokens/products.css`, đặt
  `<html data-product="<id>" data-theme="light|dark">`. Không chép mã màu vào CSS riêng.
- Desktop/di động: đọc `.standards/tokens/products/<id>.json` lúc build (mục 7) và gộp đè lên `color.light`/`color.dark`.
- Thêm sản phẩm mới hoặc đổi màu: PR vào repo này (tệp JSON + chạy `gen-product-palette.mjs` + `build-tokens.mjs`),
  cổng kiểm xanh rồi mới sync xuống. `MUST NOT` ghi đè vai trò nhấn tại chỗ ở repo con.
- Khối liên kết về hệ sinh thái (chân trang có logo TsuDEV, thẻ trên tsudev.com/apps) giữ nhận diện TsuDEV, không
  đổi theo sản phẩm.

#### 1.2.2. Kiểu bố cục chữ ký (`layout`)

Áp cho trang chủ website sản phẩm và màn hình đầu của app. Header, khu vực tài khoản, chân trang, bộ chọn giao diện
vẫn theo `ECOSYSTEM_IDENTITY.md` mục 4 - bố cục chữ ký chỉ quyết phần THÂN.

| Giá trị | Bố cục | Hợp với |
| --- | --- | --- |
| `cong` | Hero ngắn + lưới thẻ danh mục nhiều cột | Cổng tập hợp nhiều sản phẩm (tsudev.com) |
| `trinh-dien` | Hero hai cột (chữ trái, ảnh chụp app lớn tràn phải) + khối tính năng dạng bento | App cần cho xem giao diện trước khi tải |
| `cong-cu` | Vùng thao tác chính (kéo thả, chọn tệp, nút chạy) ngay màn đầu, căn giữa; giới thiệu nằm dưới | Công cụ làm một việc |
| `bang-dieu-khien` | Thanh bên trái cố định + vùng làm việc + thẻ số liệu trên cùng | App dữ liệu dùng hằng ngày |
| `do-luong` | Một mặt đồng hồ/biểu đồ lớn ở trung tâm, số liệu phụ xếp quanh | App đo đạc thời gian thực |
| `tai-lieu` | Cột đọc hẹp (≤ 72 ký tự) + mục lục dính bên phải | Sản phẩm chủ yếu là nội dung |

#### 1.2.3. Bộ bo góc (`shape`)

`tokens/products.css` ghi đè `--radius-sm/md/lg/control` theo bộ đã chọn. `radius-none` (khung layout) không đổi.

| Giá trị | sm / md / lg | Nút (`radius-control`) | Cảm giác |
| --- | --- | --- | --- |
| `sac` | 2 / 3 / 4px | 3px | kỹ thuật, chính xác |
| `chuan` | 4 / 6 / 8px | 6px | trung tính (giá trị nền) |
| `mem` | 6 / 10 / 14px | 10px | thân thiện, hằng ngày |
| `tron` | 8 / 14 / 20px | 999px (viên thuốc) | nhẹ, đời thường |

#### 1.2.4. Hoạ tiết chữ ký (`motif`)

Một hoạ tiết **tĩnh** (không chuyển động) ở nền hero và ảnh `og-image`, vẽ bằng `accent`/`glow` của chính sản phẩm,
độ phủ ≤ 15% để không giảm tương phản chữ đè lên. Mỗi giá trị chỉ thuộc một sản phẩm.

`quang-sang` quầng sáng đỉnh trang · `luoi-quet` vạch quét ngang · `mach-in` đường mạch in · `the-xep` thẻ xếp chồng
lệch · `quy-dao` vòng quỹ đạo · `canh-sen` cánh sen nối điểm · `duong-bieu-do` đường biểu đồ lưu lượng ·
`cot-tang-truong` cột tăng dần · `khoi-phan-vung` thanh chia phân vùng · `song-am` sóng âm · `vong-dong-tam` vòng
đồng tâm · `cham-luoi` lưới chấm · `song-cheo` sọc chéo (hai giá trị cuối còn trống cho sản phẩm mới).

## 2. Bo góc & viền (Radius)

| Token | Giá trị | Áp dụng |
|---|---|---|
| `radius-none` | `0px` | Khung layout, sidebar, header, footer, đường chia cột - **viền thẳng tắp** |
| `radius-sm` | `4px` | Badge, tag, checkbox, ô nhỏ trong table |
| `radius-md` | `6px` | **Input, dropdown, modal nhỏ** - bo tinh tế, không quá tròn |
| `radius-lg` | `8px` | **Modal lớn, table container, card** - mềm góc, không góc cạnh sắc |
| `radius-control` | `6px` | **Button** (từ v5.0.0 tách khỏi `radius-md` để bộ `tron` làm nút viên thuốc) |

Giá trị trên là bộ `chuan`. Sản phẩm chọn bộ khác ở mục 1.2.3; mã `MUST` dùng biến `--radius-*`, không ghi số px.

Viền luôn **phẳng 1px solid** màu `border` (viền được focus/hover dùng `border-strong` hoặc `primary`). Không dùng viền double/dashed cho component chuẩn.

## 3. Bố cục, mật độ & khoảng trắng (Layout & Density)

- Lưới spacing bội số **4px** (`--sp-1..12`). Layout vuông vắn, căn theo cột; không đặt phần tử lệch lưới.
- Mật độ 2 mức: **Comfortable** (mặc định, hàng table cao 44px, padding cell 12px 16px) và **Compact** (tool desktop nhiều dữ liệu, hàng 36px, padding 8px 12px).
- Chiều rộng khối văn bản dài tối đa **72ch** để mắt đảo dòng không mỏi.
- Modal: padding `24px`, cách nhau giữa field trong form `16px`, giữa section `32px`. Modal nhỏ rộng 400-480px, modal lớn 640-800px, luôn căn giữa màn hình trên lớp `overlay`.
- Đổ bóng tối giản: `shadow-sm` (button/input) → `shadow-md` (dropdown/toast) → `shadow-lg` (modal). Không dùng bóng màu.

## 4. Typography (chuẩn tiếng Việt, chống mỏi mắt)

- Font thống nhất: **Inter** (hỗ trợ đầy đủ dấu tiếng Việt), fallback: `'SF Pro Text', 'Segoe UI', 'Roboto', system-ui, sans-serif`. Font code: `JetBrains Mono` → `Cascadia Code` → `Consolas`.
- Body text: Desktop Tools **14-15px**, Web **15-16px**. Không bao giờ nhỏ hơn 12px (kể cả caption).
- Line-height: heading `1.3`, body `1.55`, văn bản dài `1.6`.
- Thang cỡ chữ: 12 / 13 / 14 / 15 / 16 / 18(H4) / 20(H3) / 24(H2) / 30(H1).
- Weight: 400 body, 500 label/menu, 600 heading & button, 700 chỉ dùng nhấn mạnh số liệu. Không dùng weight 300 (mảnh, khó đọc tiếng Việt có dấu).
- Không dùng ALL CAPS cho tiếng Việt có dấu ở đoạn dài; chỉ cho nhãn ngắn ≤ 2 từ với letter-spacing `0.04em`.

**Định dạng ngày giờ (bắt buộc toàn hệ thống):**
- Ngày: `DD/MM/YYYY` hiển thị dạng **số**, ví dụ `01/02/2027`. **Tuyệt đối không** in ra giao diện chuỗi chữ kiểu `dd/mm/yyyy`.
- Ngày giờ: `HH:mm DD/MM/YYYY`, ví dụ `14:30 19/08/2026`. Placeholder input ngày dùng ví dụ số thật: `VD: 01/02/2027`.

## 5. Chuẩn hóa Component (Web + Desktop dùng chung)

**4 trạng thái bắt buộc cho MỌI vùng tương tác:**

| Trạng thái | Quy ước |
|---|---|
| Default | Màu token gốc, viền 1px `border` |
| Hover | Nền chuyển `primary-hover` (nút chính) hoặc `bg-hover` (nút phụ/hàng table); con trỏ `pointer`; chuyển màu `120ms` |
| Focus | Vòng focus `2px solid focus-ring`, offset `2px` - luôn nhìn thấy được bằng bàn phím |
| Disabled | Opacity `0.5`, con trỏ `not-allowed`, không nhận hover/focus, không đổ bóng |

**Controls:**
- **Button**: cao 36px (compact 32px), padding `8px 16px`, radius-md, chữ 600. Ba biến thể: Primary (nền `primary`, chữ `on-primary`), Secondary (nền `bg-surface`, viền `border-strong`, chữ `text-primary`), Ghost (không viền, hover `bg-hover`). Nút Danger dùng nền `danger`.
- **Input/Dropdown**: cao 36px, nền `bg-surface`, viền `border`, radius-md; focus viền `primary` + focus-ring; lỗi viền `danger` + dòng báo lỗi 13px màu `danger` bên dưới. Dropdown menu: nền `bg-surface`, shadow-md, radius-md, item cao 32px kèm **icon 16px nét mảnh (stroke 1.5px, bộ Lucide/Fluent)** đặt trước chữ, cách chữ 8px.
- **Checkbox** 16px radius-sm; **Toggle** 36×20px, bật = nền `primary`, tắt = nền `border-strong`.

**Feedback:**
- **Toast**: góc phải-trên, nền `bg-surface`, viền trái 3px màu trạng thái, shadow-md, tự đóng 4s (lỗi: 6s hoặc đóng tay).
- **Modal**: overlay token `overlay`, hộp `bg-surface` radius-lg shadow-lg; header 20px/600, nút hành động căn phải chân modal (Primary ngoài cùng bên phải), đóng bằng ESC + nút ×.
- **Progress bar**: cao 6px, nền `bg-subtle`, phần chạy `primary`, radius-sm.
- **Badge status**: chữ 12px/500, padding `2px 8px`, radius-sm, nền màu trạng thái nhạt 12% + chữ màu trạng thái đậm.

**Data Display:**
- **Table**: container radius-lg viền `border`; header nền `bg-subtle` chữ 600, phân cách hàng bằng viền dưới 1px `border`, hover hàng `bg-hover`, số căn phải, ngày hiển thị `DD/MM/YYYY`.
- **Tree View**: thụt cấp 20px, mũi tên xoay 16px, node đang chọn nền `bg-subtle` + viền trái 2px `primary`.
- **List View**: item cao 40px (compact 32px), phân cách viền 1px `border`, chọn = nền `bg-subtle`.
- **Vùng bản ghi**: mọi Table/List View có thể vượt 10 dòng `MUST` có chân vùng bản ghi
  cao 48px chia ba - **bộ chọn số bản ghi ở góc dưới bên trái** (mốc `10/20/50/100/200`,
  mặc định `10`), dòng tóm tắt ở giữa, phân trang bên phải. Quy ước đầy đủ và bắt buộc:
  [`DATA_TABLE.md`](DATA_TABLE.md). Áp cho cả bảng nằm trong Modal.

## 6. Quy ước tên phiên bản phát hành (app/tool/phần mềm - KHÔNG áp dụng website)

> Quy ước đầy đủ cho cả ba khuôn phiên bản của hệ sinh thái (bộ quy ước, app, website)
> nằm ở [`VERSIONING.md`](VERSIONING.md). Mục này giữ lại phần dùng thường xuyên nhất.

Chuỗi phiên bản: `YY.M.DDNN` - `YY` 2 số cuối năm; `M` tháng **không** số 0 đầu; `DD` ngày 2 chữ số; `NN` số thứ tự phát hành **trong ngày**, bắt đầu `01`.

Tên tệp: `{tên-gói}_{phiên bản}_{os}-{arch}[-{loại}].{ext}`, thẻ git `v{phiên bản}` (VERSIONING.md mục 2.2).

Ví dụ ngày 17/11/2026, Tsu Cwico Windows 64-bit:
1. Bản 1: `tsucwico_26.11.1701_windows-x64-setup.exe`, thẻ `v26.11.1701`
2. Bản 2 cùng ngày: `tsucwico_26.11.1702_windows-x64-setup.exe`, thẻ `v26.11.1702`

Chuỗi version trong code/manifest = `26.11.1701` (đồng bộ với tên file). Mỗi lần phát hành ghi 1 dòng vào `CHANGELOG.md` theo dạng `26.11.1701 - 17/11/2026 - nội dung thay đổi`.

## 7. Cách truy xuất token theo nền tảng

| Nền tảng | Cách dùng |
|---|---|
| Web (React/Vue/HTML) | Import `tokens/tokens.css` rồi `tokens/products.css`, dùng `var(--primary)`… Đặt `data-theme` + `data-product` trên `<html>` và `data-platform="web"` trên `<body>`. Tiêu đề dùng `var(--font-display)`, nút dùng `var(--radius-control)` |
| Electron | Như Web, `data-platform="desktop"` |
| C# (WPF/WinForms) | Parse `design-tokens.json`, gộp đè `products/<id>.json` → nạp vào ResourceDictionary/Theme class |
| Python (PyQt/Tkinter) | Parse hai JSON (nền + sản phẩm) → sinh QSS/style dict |
| C++ (Qt) | Parse hai JSON (nền + sản phẩm) → biến QSS |

Quy trình đổi giao diện:

1. **Chỉ sửa `tokens/design-tokens.json`** (lớp nền) hoặc `tokens/products/<id>.json` (lớp bản sắc: sửa `hue`/`chroma`
   rồi chạy `node scripts/gen-product-palette.mjs <id>`, không sửa tay `colors`).
2. Chạy `node scripts/build-tokens.mjs` để sinh lại `tokens/tokens.css` và `tokens/products.css`.
3. Chạy `node scripts/check-contrast.mjs` và `node scripts/check-products.mjs` - phải đạt toàn bộ.
4. Chạy `./scripts/make-manifest.sh` rồi `./scripts/check-standards.sh`.
5. Tăng phiên bản theo [`VERSIONING.md`](VERSIONING.md) mục 1 - **đổi giá trị một token
   màu ở lớp nền luôn là thay đổi phá vỡ (MAJOR)**, kể cả khi chỉ để sửa lỗi. Thêm sản phẩm mới là MINOR; đổi
   màu của MỘT sản phẩm là MINOR kèm phiếu sang đúng repo đó.
6. Repo con chạy `./scripts/sync-standards.sh` và tự cập nhật ở lần build kế tiếp.

`MUST NOT` sửa tay `tokens.css` / `products.css`. Mọi thay đổi ở đó sẽ bị lần sinh sau ghi đè, và cổng
kiểm sẽ báo lệch.
