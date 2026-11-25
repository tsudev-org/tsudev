# QUY ƯỚC PHIÊN BẢN (v3.1.0)

Hệ sinh thái tsudev dùng **ba** khuôn phiên bản cho ba thứ khác nhau. Nhầm lẫn
giữa chúng là nguồn gốc của phần lớn tranh cãi khi phát hành.

| Đối tượng | Khuôn | Ví dụ | Nơi quy định |
| --- | --- | --- | --- |
| Bộ quy ước `tsudev-standards`, thư viện/package npm | SemVer `MAJOR.MINOR.PATCH` | `3.7.0` | Mục 1 |
| Sản phẩm phát hành thành tệp cài (app, tool, game, bản fork) | `YY.M.DDNN` | `26.11.1704` | Mục 2 |
| Website | Không có phiên bản sản phẩm; thẻ deploy `deploy-YYYY.MM.DD.N` | `deploy-2026.11.17.9` | Mục 2.6 |

Từ v3.0.0 (bộ quy ước v3.7.0, 17/11/2026) mục 2 chuẩn hoá cả thẻ git, tiêu đề
Release, tên tệp đa nền tảng, mã nội bộ tăng dần, bản fork và thẻ deploy website -
trước đó tám kiểu thẻ cùng tồn tại (phiếu toàn hệ `20261117-V1`).

---

## 1. Phiên bản của bộ quy ước

Dùng **Semantic Versioning 2.0.0**, ghi ở file `VERSION` tại gốc repo trung tâm.

| Tăng số | Khi nào | Repo con phải làm gì |
| --- | --- | --- |
| **MAJOR** (`2.0.0` -> `3.0.0`) | Thay đổi phá vỡ: bỏ hoặc đổi tên token, siết một quy tắc từ `SHOULD` lên `MUST`, đổi cấu trúc thư mục bắt buộc | Đọc "Hướng dẫn nâng cấp" trong CHANGELOG, sửa code, rồi mới đồng bộ |
| **MINOR** (`2.0.0` -> `2.1.0`) | Bổ sung thuần: thêm token mới, thêm tài liệu mới, thêm quy tắc mức `SHOULD` | Đồng bộ được ngay, không cần sửa code |
| **PATCH** (`2.0.0` -> `2.0.1`) | Sửa lỗi diễn đạt, sửa liên kết hỏng, làm rõ câu chữ mà không đổi nghĩa | Đồng bộ được ngay |

**Quy tắc cứng:** thay đổi giá trị một token màu đang có là **MAJOR**, kể cả khi
chỉ để sửa lỗi. Lý do: mọi ảnh chụp giao diện, mọi test tương phản, mọi bản in
của mọi repo con đều đổi theo. Đó là định nghĩa của phá vỡ.

### 1.1. Quy trình phát hành bộ quy ước

1. Sửa nội dung trên nhánh riêng.
2. Cập nhật `VERSION`.
3. Ghi vào `CHANGELOG.md`. Nếu là MAJOR, `MUST` có mục **Hướng dẫn nâng cấp** với
   các bước cụ thể, không phải mô tả chung chung.
4. Chạy `node scripts/build-tokens.mjs` nếu có đụng token.
5. Chạy `./scripts/make-manifest.sh`.
6. Chạy `./scripts/check-standards.sh` - phải đạt.
7. Mở PR, được duyệt, merge vào `main`.
8. Tạo nhãn: `git tag -a v3.7.0 -m "..."` rồi `git push --tags`.
9. Tạo GitHub Release, dán phần CHANGELOG tương ứng.

### 1.2. Nhãn git

`MUST` đặt nhãn dạng `vMAJOR.MINOR.PATCH` (có chữ `v`), nhãn có chú thích
(`-a`), trỏ vào commit trên `main`. Repo con ghim bằng chính nhãn này.

---

## 2. Phiên bản của sản phẩm phát hành thành tệp cài

### 2.1. Chuỗi phiên bản

`YY.M.DDNN`:

- `YY` = 2 số cuối của năm.
- `M` = tháng, **không** có số 0 ở đầu.
- `DD` = ngày, 2 chữ số.
- `NN` = số thứ tự phát hành **trong ngày**, 2 chữ số, bắt đầu từ `01`.

Ví dụ bản đầu tiên ngày 17/11/2026: `26.11.1701`. Chuỗi này là SemVer hợp lệ
(`MAJOR.MINOR.PATCH` toàn số) nên mọi trình so sánh SemVer xếp đúng thứ tự thời gian.

**Vì sao không dùng SemVer ngữ nghĩa cho app:** người dùng cuối không quan tâm số
nào là phá vỡ. Họ cần biết bản mình đang chạy có mới không, và mới bao lâu rồi.
Khuôn theo ngày trả lời được câu đó ngay từ tên tệp.

### 2.2. Bảng khuôn (MUST cho mọi bản phát hành kể từ v3.7.0)

| Đối tượng | Khuôn | Ví dụ |
| --- | --- | --- |
| Thẻ git phát hành | `v` THƯỜNG + đúng phiên bản; không tiền tố tên, không hậu tố | `v26.11.1704` |
| Bản thử | thêm `-beta.N` / `-rc.N`; Release đánh dấu Pre-release | `v26.11.1801-beta.1` |
| Tiêu đề GitHub Release | `{Tên sản phẩm} {phiên bản}` | `Tsu Contact 26.11.1601` |
| Tệp phát hành | `{tên-gói}_{phiên bản}_{os}-{arch}[-{loại}].{ext}`; `os` ∈ `windows`, `macos`, `linux`, `android`, `ios`; `arch` ∈ `x64`, `x86`, `arm64`, `universal` | `tsucwico_26.11.1801_windows-x64-setup.exe` |
| Tệp kiểm | `SHA256SUMS.txt` (+ `SHA256SUMS.txt.sigstore.json`) - đúng tên này | |
| Phiên bản trong mã/manifest | = phiên bản sản phẩm (không `v`) | `26.11.1704` |
| Android `versionCode` | số nguyên `YYMDDNN` | `26111704` |
| iOS `CFBundleVersion` | `YY.M.DDNN` (`CFBundleShortVersionString` cũng vậy) | `26.11.1704` |
| iOS bản TestFlight liên tục (đẩy `main`, v3.1.0) | `CFBundleShortVersionString` = `YY.M.DD99` (`NN = 99` dành riêng, nhãn phát hành `MUST NOT` dùng), `CFBundleVersion` = `run_number + APPLE_BUILD_OFFSET`; chỉ thử nội bộ - [`APPLE_CICD.md`](APPLE_CICD.md) mục 8.4 | `26.11.2599` (build `57`) |
| Windows FileVersion / MSIX `Version` (4 phần) | `YY.M.DDNN.0` | `26.11.1704.0` |
| Gói Linux (deb/rpm) | `{phiên bản}-{revision}` do kho đặt | `26.11.1704-1` |

`{loại}` khi một nền tảng có nhiều tệp: `setup` (bộ cài), `portable`, `msi`,
`msix`, `appimage`; Android `.apk`/`.aab`, macOS `.dmg`/`.pkg`.

Regex nghiệm thu thẻ: `^v[0-9]{2}\.[1-9][0-9]?\.[0-3][0-9][0-9]{2}(-(beta|rc)\.[0-9]+)?$`
(`check-standards.sh` mục 5b cảnh báo khi thẻ mới nhất của repo có
`packaging/package.json` lệch khuôn).

### 2.3. Bản fork của dự án khác

Phiên bản sản phẩm theo đúng mục 2.2. Phiên bản gốc ghi ở Release notes và màn hình
Giới thiệu ("Dựa trên LocalSend 1.18.2"), **KHÔNG** nhét vào chuỗi phiên bản
(`2.4.1-vn.1`, `2.0.0-lotus.7` là khuôn cũ).

### 2.4. Chuyển khuôn an toàn (MUST)

1. **Thẻ đã phát hành KHÔNG đổi tên, KHÔNG xoá** - updater, winget, Scoop, kho gói
   trỏ vào chúng. Khuôn mới chỉ áp cho bản phát hành KẾ TIẾP.
2. **Trước khi đổi khuôn ở app có trình cập nhật:** đọc mã so sánh phiên bản của
   updater ĐÃ CÀI ngoài máy người dùng và chứng minh bằng test rằng bản mới được coi là
   MỚI HƠN bản cũ (vd `26.11.2001` > `2.4.1` theo SemVer; regex nhãn của updater nhận
   `v26.11.2001`). Không chứng minh được ⇒ phát hành bản cầu nối hoặc giữ khuôn cũ,
   ghi lý do trong ADR.
3. **Mã nội bộ chỉ tăng:** Android `versionCode` mới PHẢI lớn hơn mã đã lên Google
   Play / đã cài; Windows FileVersion và MSIX `Version` cũng vậy.
4. **Đồng bộ CÙNG lúc** mọi nơi đọc nhãn/tên tệp: `packaging/package.json`
   (`release.tagRegex`, `assets.*.file`), manifest Scoop (`checkver`, `autoupdate`),
   cask Homebrew (`livecheck`, `url`), `linux-packages/products.json`, winget, Microsoft
   Store, Google Play, khối "Cài bằng lệnh", trang tải về. Thiếu một nơi ⇒ kênh đó
   đứng ở bản cũ im lặng.

### 2.5. Màn hình Giới thiệu và `--version`

Phiên bản hiện cho người dùng (màn hình Giới thiệu, `--version`, tsudev.com/apps,
tiêu đề Release, tên tệp) `MUST` trùng nhau từng ký tự.

### 2.6. Website

Website không có phiên bản sản phẩm. Mỗi lần phát hành production `SHOULD` gắn thẻ
deploy `deploy-YYYY.MM.DD.N` (N đếm trong ngày, bắt đầu 1) - tiền tố `deploy-` để
không lẫn với thẻ `v` của app. CHANGELOG ghi mỗi thẻ một dòng.

---

## 3. CHANGELOG

Mọi repo `MUST` có `CHANGELOG.md`, mới nhất trên cùng.

**App/tool** ghi mỗi bản một dòng:

```
26.8.2401 - 24/08/2026 - Sửa lỗi mất dấu tiếng Việt khi gõ nhanh trong ô tìm kiếm
```

**Website và thư viện** ghi theo đợt thay đổi:

```markdown
## 24/08/2026

- Thêm bộ lọc theo tác giả cho trang danh sách bài viết.
- Sửa lỗi trang tìm kiếm không giữ trạng thái khi bấm quay lại.
```

**Bộ quy ước** ghi theo phiên bản SemVer, xem `CHANGELOG.md` của repo này làm mẫu.

Quy tắc chung: viết cho **người đọc bản phát hành**, không phải cho người viết
code. "Sửa lỗi mất dấu tiếng Việt khi gõ nhanh" là dòng tốt; "refactor
useSearchInput hook" thì không.

---

## 4. Phiên bản của API

API công khai `MUST` gắn phiên bản vào đường dẫn: `/api/v1/...`.

- Thêm trường vào phản hồi, thêm tham số tùy chọn: **không** tăng phiên bản.
- Bỏ trường, đổi kiểu dữ liệu, đổi ngữ nghĩa, đổi mã lỗi: **phải** tăng phiên bản.
- Phiên bản cũ `MUST` còn sống tối thiểu **6 tháng** sau khi phiên bản mới ra,
  và `MUST` trả header `Deprecation` cùng `Sunset` trong thời gian đó.
