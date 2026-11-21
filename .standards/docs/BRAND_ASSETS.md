# TÀI SẢN THƯƠNG HIỆU (v4.0.0)

> Logo, dấu hiệu thu gọn, wordmark, favicon và icon ứng dụng của hệ sinh thái
> tsudev: bản gốc nằm ở đâu, sinh ra bằng gì, dùng dấu hiệu nào ở cỡ nào.
>
> Màu giao diện nằm ở [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md), không phải ở đây.
> Tài liệu này nói về **hình ảnh nhận diện** và **màu của chính dấu hiệu**.

## 1. Bản gốc chính thức và nơi sinh tài sản

Hệ sinh thái đã có sẵn một dây chuyền hoàn chỉnh, đặt tại repo website:

| Thứ | Đường dẫn (repo `tsudev-org/tsudev`) |
| --- | --- |
| **Bản gốc** | `packages/brand/source/logo-tsudev.png` - `1254x1254`, cú + chữ "tsudev" trên nền đen (từ 13/11/2026) |
| **Dây chuyền sinh** | `packages/brand/build-assets.js` (xoá nền đen, mọi cỡ `fit: contain` - không biến dạng) |
| Tài liệu dây chuyền | `packages/brand/README.md` |

SHA-256 của bản gốc:

```
2ad933bde3f5bc81325fd21896b036df883787b12723020e544b2b8d582577ba
```

Chạy lại dây chuyền:

```bash
node packages/brand/build-assets.js   # sharp có sẵn trong node_modules (qua Next)
```

**Repo quy ước này KHÔNG giữ bản sao của bản gốc.** Hai bản gốc song song là hai
bản gốc sẽ trôi khỏi nhau. Repo nào cần thì lấy từ đường dẫn trên và đối chiếu
chuỗi băm.

`MUST NOT` sửa file trong `apps/*/public/` - chúng là **sản phẩm sinh ra**, lần
chạy lại dây chuyền sẽ ghi đè. Sửa thì sửa ở `packages/brand/source/`.

## 2. Bộ dấu hiệu và dùng ở cỡ nào

| Dấu hiệu | File sinh ra | Là gì | Dùng khi |
| --- | --- | --- | --- |
| **Logo** | `brand/logo-tsudev.png` (`1024x1024`), `brand/logo-tsudev-256.png` | NGUYÊN logo: cú + chữ "tsudev", nền trong suốt | Mọi nơi - giao diện, ảnh chia sẻ, tài liệu, bản in |
| **Bản cho giao diện** | `brand/logo-tsudev-{48,96,144,192}.{avif,webp}` | Như trên, đa cỡ | Header/footer qua `<picture>` (AVIF → WebP → PNG) |
| **Favicon / icon** | `favicon.ico` (7 lớp), `favicon-*.png`, `android-chrome-*`, `apple-touch-icon.png` | NGUYÊN logo (có chữ) | Tab trình duyệt, PWA, màn hình chính |

Từ 13/11/2026 chủ dự án chốt dùng **logo hoàn chỉnh có chữ ở MỌI cỡ**, kể cả favicon - thay bộ cũ (logo đầy đủ +
dấu hiệu "chỉ hình cú" + wordmark + bản `-dark`, đã gỡ). Logo tự có nền tối riêng trong hình nên không cần bản `-dark`.
Ở cỡ rất nhỏ (16-32px) chữ "tsudev" khó đọc - đó là đánh đổi chủ dự án đã chọn; repo nào cần icon không chữ cho khay
hệ thống hoặc icon đơn sắc `MAY` cắt dấu hiệu riêng từ chính logo, ghi rõ trong tài liệu brand của repo.

Bản cài đặt tham chiếu: `packages/ui/src/components/Logo.tsx` ở repo `tsudev` - khung vuông `object-contain`, không vẽ
thêm chữ HTML cạnh logo (chữ đã nằm trong logo).

Sản phẩm có **logo riêng** (khác logo tsudev): mục 15.

## 3. Quy tắc đặt tên

```
tsudev-<loại>[-<biến-thể>][-<cỡ>].<đuôi>
```

- `<loại>`: `logo` (đầy đủ) | `mark` (thu gọn, không chữ) | `wordmark` | `favicon`.
- `<biến-thể>`: `dark` cho nền tối, `square` cho bản vuông, `mono` cho một màu.
- `<cỡ>`: số pixel cạnh ngắn, chỉ dùng cho bản sinh ra (`tsudev-mark-256.png`).
- Chữ thường, phân tách bằng gạch ngang ngắn `-`, không dấu, không khoảng trắng,
  không số phiên bản trong tên file.

Hai repo đang chạy dùng lược đồ tên riêng có trước quy ước này: `tsudev` dùng
`logo-full` / `logo-mark` / `logo-wordmark`, `tsucwico` (trước là `tsudev-cwico`) dùng
`tsudev-logo.png` cho chính **dấu hiệu thu gọn**. `MUST NOT` đổi tên chúng chỉ để
hợp quy ước - tên file trong `public/` là URL công khai, đổi là hỏng liên kết và
hỏng cache. Quy tắc trên áp cho **file mới**.

## 4. Biến thể theo nền

Logo từ 13/11/2026 là **một bản cho mọi nền**: chữ "tsudev" có viền tối vẽ sẵn trong hình nên đọc được trên cả
Sáng lẫn Tối (mục 2). Không có bản `-dark`; các tệp `logo-full-dark.png` / `logo-wordmark-dark.png` của v2.8.0 đã gỡ
cùng bộ logo cũ. Nơi buộc phải có nền đặc (apple-touch, maskable, `og-image`) dùng `#0A0A0A` - hằng thương hiệu.

Xoá nền đen của bản gốc `MUST` theo dây chuyền ở `packages/brand/README.md` (repo `tsudev`): đóng hình thái học mặt
nạ để không thủng các mảng đen nằm trong lòng logo - trên nền Tối lỗ thủng vô hình, trên nền Sáng thành lỗ trắng.

## 5. Màu của dấu hiệu

> **Từ v5.0.0:** mục này tả logo hiện hành (13/11/2026). Bảng cam `#FE7B2E` / `#C2410C` của các bản trước thuộc logo
> cũ (cú navy, chữ "dev" cam) - **đã gỡ**. Việc TS-8 ("dev" xanh ở website, cam ở Tsu Cwico) đóng theo logo mới:
> chữ "dev" của TsuDEV là **xanh**; dải `--color-dev-*` cam ở repo con là di sản, `MUST` gỡ ở PR kế tiếp của repo đó.

Đo trực tiếp từ `packages/brand/source/logo-tsudev.png` (21/11/2026, trung bình điểm ảnh vùng chữ):

| Vai trò trong ảnh | Mã màu |
| --- | --- |
| Chữ `tsu` | trắng ngả xanh ~`#EFF2F5` |
| Chữ `dev` | dải xanh lơ ~`#30C8F0` (đỉnh) → xanh dương ~`#1E90FF` (chân), trung bình `#21B7F6` |
| Con cú, mạch, quầng | xanh lơ / xanh dương cùng dải với chữ `dev` |

- Logo là ảnh hoàn chỉnh có chữ: `MUST NOT` dựng lại wordmark bằng chữ HTML bên cạnh hay đè lên logo (mục 2).
- Nơi bắt buộc phải viết chữ "TsuDEV" bằng text có màu thương hiệu (ví dụ dòng chữ trong email thuần văn bản HTML):
  `Tsu` dùng `text-primary`, `DEV` dùng `text-link` **của lớp nền TsuDEV** (`DESIGN_SYSTEM.md` mục 1.1) - không dùng
  `text-link` của sản phẩm, vì đó là tên thương hiệu mẹ chứ không phải tên sản phẩm.
- **Màu dấu hiệu KHÔNG phải token giao diện.** Màu nhấn của từng sản phẩm lấy từ lớp bản sắc
  (`DESIGN_SYSTEM.md` mục 1.2), có cổng kiểm WCAG và chống trùng; repo `MUST NOT` tự khai dải màu thương hiệu riêng
  để tô giao diện.

## 6. Kích thước tối thiểu và vùng an toàn

| Dùng ở đâu | Tối thiểu |
| --- | --- |
| Logo đầy đủ (có tagline) | cạnh ngắn **160px**; dưới đó dùng dấu hiệu thu gọn |
| Logo đầy đủ khi in | **30mm** |
| Dấu hiệu thu gọn, trên màn hình | cạnh ngắn **16px** |
| Favicon | `.ico` nhiều lớp 16/32/48, `MUST NOT` co một ảnh PNG duy nhất |

**Vùng an toàn**: chừa quanh dấu hiệu khoảng trống tối thiểu bằng **1/4 cạnh
ngắn** của chính nó. Không đặt chữ, viền, hay ảnh khác vào vùng này.

## 7. Sinh bộ icon

Một bản gốc, một script, mọi bản sinh ra từ đó. `MUST NOT` cắt tay từng cỡ.

- Nguồn để sinh icon `MUST` là **dấu hiệu thu gọn**, không phải logo đầy đủ.
- Nguồn `MUST` có cạnh ngắn **lớn hơn hoặc bằng cỡ icon lớn nhất sẽ sinh ra**.
  Phóng to ảnh nhỏ rồi lưu lại không tạo thêm chi tiết nào, chỉ tạo cảm giác mờ.
- `.ico` `MUST` là file nhiều lớp `16/24/32/48/64/128/256`, không phải một ảnh
  256 đổi đuôi.
- Nội suy `MUST` dùng LANCZOS hoặc tương đương, giữ kênh alpha.

Hai bản cài đặt tham chiếu, dùng cho hai loại sản phẩm:

| Dây chuyền | Repo | Sinh ra |
| --- | --- | --- |
| `packages/brand/build-assets.js` | `tsudev` | Tài sản web: logo, favicon, avatar, ảnh chia sẻ |
| `tools/gen_icons.py` | `tsucwico` | Icon desktop: bộ Tauri, tile Microsoft Store, bộ web |

## 8. Điều cấm

`MUST NOT`:

- Kéo méo, xoay, lật, cắt cụt, hay đổi tỉ lệ giữa các phần của dấu hiệu.
- Đổi màu dấu hiệu, thêm đổ bóng, viền, hay hiệu ứng chuyển màu.
- Đặt logo lên nền đặc khác `#0A0A0A` ở chỗ cần nền đặc (mục 4), hoặc dựng thêm chữ HTML cạnh logo (mục 2).
- Sửa file trong `apps/*/public/` thay vì sửa bản gốc rồi chạy lại dây chuyền.
- Đặt dấu hiệu lên ảnh nền rối hoặc nền tương phản thấp.
- Dùng dấu hiệu tsudev cho sản phẩm không thuộc hệ sinh thái tsudev.

## 9. Khả năng truy cập

- Dấu hiệu đi kèm chữ dựng bằng text: ảnh `MUST` khai `alt=""` và
  `aria-hidden="true"` - chữ bên cạnh đã mang nghĩa, đọc hai lần là nhiễu.
- Dấu hiệu đứng một mình mà có chức năng: `MUST` có nhãn mô tả **hành động**,
  không phải mô tả hình.
- Dấu hiệu thuần trang trí: `alt=""`.

## 10. Nợ đã biết

| Việc | Ở đâu | Ghi chú |
| --- | --- | --- |
| (không còn) | | Món nợ nguồn sinh icon dưới chuẩn đã trả ở `v2.7.0`; món nợ bản logo cho nền tối đã trả ở `v2.8.0` |

## 11. Biến thể không dùng cho sản phẩm

```
assets/brand/variants/tsudev-badge-cyan.png
```

Huy hiệu cú xanh cyan trên vòng mạch, `1024x1024`, có chữ "tsudev" nướng sẵn
trong ảnh. Tạo ngày 23/08/2026, **chưa từng được dùng ở repo nào**.

`MUST NOT` dùng file này trong bất kỳ sản phẩm nào. Nó giữ ở đây để không mất
(trước đó chỉ tồn tại trên một máy cá nhân) và để đối chiếu khi bàn về nhận diện.
Nó **không** phải bản độ phân giải cao của dấu hiệu chính thức: khác hẳn cả hình
lẫn màu, và không có bản chỉ-hình để làm icon.

Muốn chuyển hệ sinh thái sang biến thể này thì đó là một cuộc **đổi nhận diện**,
`MUST` làm đồng loạt ở website, app, favicon, avatar và ảnh chia sẻ, không phải
đổi lẻ một repo. Chi phí thật nằm ở chỗ mọi bản in, mọi ảnh chụp màn hình trong
tài liệu, và mọi icon đã phát hành đều phải làm lại.

## 12. Bộ tài sản BẮT BUỘC cho mọi project

> Thêm ở `v3.0.0`. Trước bản này, tài liệu mô tả **có những tài sản nào**; nó
> không nói **project nào phải có cái gì**. Khoảng trống đó là lý do một sản phẩm
> phát hành ra mà tab trình duyệt trống trơn.

**Quy tắc cứng:** không sản phẩm nào của hệ sinh thái được phát hành khi còn
thiếu một dòng nào trong bảng dưới đây. Đây là điều kiện phát hành, không phải
việc để dành làm sau.

### 12.1. Bảng bắt buộc theo loại sản phẩm

| Tài sản | Web | Desktop | Nguồn |
| --- | --- | --- | --- |
| `favicon.ico` nhiều lớp `16/24/32/48/64/128/256` | `MUST` | - | mục 6 |
| `favicon-96x96.png` | `MUST` | - | mục 6 |
| `apple-touch-icon.png` `180x180`, nền đặc | `MUST` | - | mục 6 |
| Icon PWA `192x192`, `512x512`, kèm bản `maskable` | `MUST` khi có `manifest` | - | mục 6 |
| `og-image.png` `1200x630` | `MUST` | - | mục 1 |
| Dấu hiệu thu gọn trong giao diện | `MUST` | `MUST` | mục 2 |
| Đọc được trên cả nền Sáng và Tối (một bản, hoặc bản `-dark` nếu logo riêng cần) | `MUST` | `MUST` | mục 4 |
| Icon ứng dụng theo nền tảng (`.ico`, `.icns`, PNG bộ Linux) | - | `MUST` | mục 7 |
| Icon khay hệ thống `16/32` | - | `MUST` khi có khay | mục 6 |
| Ảnh mở đầu bản cài | - | `MUST` khi có bộ cài | mục 2 |
| Ảnh đại diện tổ chức/repo trên GitHub | `MUST` | `MUST` | dấu hiệu thu gọn |

- Toàn bộ `MUST` sinh từ **bản gốc chính thức** ở mục 1, qua đúng một trong hai
  dây chuyền ở mục 7. `MUST NOT` cắt tay, `MUST NOT` sao chép tài sản đã sinh từ
  repo khác rồi phóng to.
- Siêu dữ liệu khai báo các tài sản này (`<link rel="icon">`, `manifest`,
  Open Graph) `MUST` theo [`ECOSYSTEM_IDENTITY.md`](ECOSYSTEM_IDENTITY.md) mục 2.
- Thiếu tài sản nào thì `MUST` mở việc trong `logs/STATE.md` của repo đó **trước**
  khi phát hành, không phải sau.

### 12.2. Cổng kiểm

Repo con `MUST` để cổng kiểm CI chặn khi thiếu tài sản bắt buộc. Bản kiểm tối
thiểu, thêm vào `.github/workflows/standards.yml`:

```yaml
- name: Kiem tra tai san nhan dien
  run: |
    set -e
    for f in favicon.ico favicon-96x96.png apple-touch-icon.png og-image.png; do
      find . -path ./node_modules -prune -o -name "$f" -print | grep -q . \
        || { echo "Thieu tai san bat buoc: $f (BRAND_ASSETS.md muc 12)"; exit 1; }
    done
```

Sản phẩm desktop thay danh sách trên bằng danh sách icon của nền tảng mình.

### 12.3. Thương hiệu mẹ là MỘT, bản sắc sản phẩm là RIÊNG (từ v5.0.0)

- Logo TsuDEV là một, `MUST NOT` vẽ biến thể "cho hợp với sản phẩm này". Nơi nó xuất hiện (chân trang, khối "nhà
  làm", thẻ trên tsudev.com/apps) giữ đúng logo và màu chữ ở mục 5, ở MỌI sản phẩm.
- Sản phẩm `MAY` có logo riêng khi chủ dự án duyệt (mục 15) và `MUST` có bản sắc riêng (màu nhấn, bố cục, bo góc,
  hoạ tiết, font tiêu đề) theo `DESIGN_SYSTEM.md` mục 1.2 - khai ở repo này, có cổng kiểm chống trùng. Bảng màu
  riêng tự khai tại repo con, ngoài lớp bản sắc, vẫn là lỗi.
- Sản phẩm dùng chung logo TsuDEV mà cần phân biệt trong khay hệ thống thì `MAY` thêm một **huy hiệu phụ nhỏ ở góc**
  tô bằng `primary` của sản phẩm, `MUST NOT` thay logo.

---

## 13. Kho lưu và kho dùng

Hai kho, đừng lẫn:

| Kho | Đường dẫn | Dùng được trong sản phẩm? |
| --- | --- | --- |
| **Kho dùng** | Tài sản sinh ra bởi dây chuyền ở mục 1 và mục 7 | Có, và chỉ những thứ này |
| **Kho lưu** | `assets/brand/variants/` ở repo quy ước | **Không**, xem mục 11 |

Ai đó đưa cho bạn một file ảnh logo rời và bảo "dùng cái này": việc đầu tiên
`MUST` là đối chiếu chuỗi băm với bản gốc ở mục 1. Không khớp thì nó là **biến
thể**, thuộc kho lưu, và `MUST NOT` đi vào sản phẩm cho tới khi có quyết định đổi
nhận diện được ghi vào `logs/STATE.md` mục "Quyết định quan trọng".

Đã xảy ra thật: file `logo-tsudev.png` đặt ở thư mục làm việc, tên nghe như bản
chính thức, thực chất là **bản sao đúng từng byte** của
`assets/brand/variants/tsudev-badge-cyan.png` - biến thể `MUST NOT` dùng. Tên file
không phải bằng chứng. Chuỗi băm mới là bằng chứng.

---

## 14. Checklist trước khi thêm hoặc đổi tài sản thương hiệu

1. Sửa ở `packages/brand/source/`, không sửa file trong `public/`.
2. Chạy lại dây chuyền, không cắt tay.
3. Chọn đúng dấu hiệu theo cỡ hiển thị (mục 2 và 6).
4. Nguồn sinh icon có cạnh ngắn lớn hơn hoặc bằng cỡ icon lớn nhất.
5. Không dựng lại chữ của logo bằng text; màu nhấn lấy từ lớp bản sắc (mục 5).
6. Không hard-code màu dấu hiệu vào chỗ lẽ ra phải dùng token.
7. Ảnh có `alt` đúng vai trò theo mục 9.
8. File ảnh lớn không cần lúc chạy `MUST` vào `.gitignore`.
9. Bộ tài sản bắt buộc ở mục 12 đã đủ, và cổng kiểm CI của repo đã canh nó.
10. File ảnh nhận được từ bên ngoài đã đối chiếu chuỗi băm theo mục 13.

## 15. Logo sản phẩm riêng (từ v3.6.0)

Một sản phẩm `MAY` có logo riêng thay logo tsudev khi **chủ dự án duyệt** (đề xuất
`logs/handover/20261112-01_de-xuat-logo-rieng-tung-san-pham.md`). Khi đó repo `MUST`:

1. Giữ **một ảnh gốc duy nhất** ở `assets/brand/source/` (ghi SHA-256 trong tài liệu brand của repo). Mọi bản khác
   SINH từ đó - `MUST NOT` cắt tay từng cỡ. Đổi logo = thay một tệp + chạy một lệnh.
2. Có cấu hình sinh `assets/brand/brand.json` và **một script sinh mọi bản** có chế độ `--check`, chạy trong CI để bắt
   tệp đã commit lệch ảnh gốc. Mẫu đã chạy thật:
   - `website/scripts/brand-assets.mjs` (Node + sharp; tsucwico, tsuswico, tsucontact) - chế độ `tile` cho
     logo vẽ sẵn trên ô nền đặc (giữ nền, bo góc) và `no-white` cho logo nền trắng (flood fill từ mép, khử nhân với trắng);
   - `tools/brand/build_brand.py` + `assets/brand/brand.json` (tsudev-trafficmonitor) - logo nền đen.
3. Đủ bộ tài sản bắt buộc ở mục 12 (favicon.ico 7 lớp, apple-touch nền đặc, PWA + maskable riêng, og-image) và icon
   ứng dụng desktop (`assets/brand/app/`), web phục vụ `<picture>` AVIF → WebP → PNG.
4. **Xoá nền** thì chỉ xoá vùng nền NỐI LIỀN mép ảnh (giữ mảng cùng màu nằm trong logo); logo có nét trắng trên ô nền
   tối thì GIỮ nền làm ô - xoá đi là nét biến mất trên nền Sáng.
5. Giữ liên kết về hệ sinh thái (chân trang dẫn về tsudev.com với logo tsudev - `ECOSYSTEM_IDENTITY.md`). Khối "nhà
   làm" trong giao diện app (logo tsudev + chữ tsudev) giữ logo tsudev, không thay bằng logo sản phẩm.
6. Báo phiên repo `tsudev` URL logo trên website sản phẩm để danh bạ tsudev.com/apps lấy từ đó
   (`packages/brand/build-eco-icons.js`).

Ảnh gốc `SHOULD` có cạnh ngắn từ 1024px hoặc là SVG; ảnh nhỏ hơn thì bản 512/1024 là phóng to - ghi nợ trong repo.

