# PHIẾU YÊU CẦU - Trang Ủng hộ trung tâm tsudev.com/ung-ho

- **Mã phiếu**: 20261112-01
- **Từ**: phiên tsudev-files-01 (12/11/2026), theo yêu cầu trực tiếp của chủ dự án
- **Đến**: phiên làm việc trên `tsudev`
- **Trạng thái**: ĐÃ XỬ LÝ (12/11/2026, phiên 48) - còn việc của chủ dự án ở mục 4

## 1. Đọc trước

Phiếu gốc `~/projects/logs/handover/20261112-01_yeu-cau-dong-bo-ung-ho-he-sinh-thai.md`: thông tin Ủng hộ chuẩn (VIB `056485506`, NGUYEN TRANG TINH SU, chuỗi VietQR, ảnh
`vietqr-vib.svg` + SHA-256) và kiến trúc bắt buộc (một nguồn dữ liệu, app chỉ trỏ về trang, không dịch vụ QR bên thứ
ba, ghim SHA-256 + kiểm VietQR lúc build, CODEOWNERS, chính sách kho di động, không lưu bí mật).
Bản tham chiếu: repo `tsudev-files` (`website/src/data/ung-ho.json`, `website/src/lib/ung-ho.ts`,
`website/public/ung-ho/vietqr-vib.svg`, `tools/ung-ho/tao-vietqr.py`).

## 2. Việc riêng của repo này (khảo sát nhanh 12/11/2026 - cần rà lại)

- Hiện chưa có trang ủng hộ. Tạo `tsudev.com/ung-ho` (apps/frontend-main) làm trang **trung tâm** của hệ sinh thái:
  kênh ở phiếu gốc mục 2, QR là tệp tĩnh cùng origin, dữ liệu một tệp, kiểm VietQR + SHA-256 lúc build (chép
  `kiemVietQr` từ `tsudev-files/website/src/lib/ung-ho.ts`).
- Thêm liên kết "Ủng hộ" ở chân trang chung (`packages/ui`), `sitemap`, và `.github/FUNDING.yml` của các repo trỏ về
  đây khi sản phẩm không có trang riêng.
- Trang có phần chạy phía máy chủ: đặt `Cache-Control` hợp lý cho ảnh QR (immutable + đổi tên tệp khi đổi QR) và
  giữ CSP `img-src 'self'`.

## 3. Việc chung

Theo phiếu gốc mục 4: gỡ kênh cũ, `FUNDING.yml`, trang/nút Ủng hộ, cổng kiểm + test, ghi `logs/STATE.md`.

## 4. Kết quả xử lý (phiên nhận điền, và ghi một dòng vào phiếu gốc mục 6)

- Trang `tsudev.com/ung-ho` (`apps/frontend-main/pages/ung-ho.tsx`), TĨNH: chữ + QR, nút chép số tài khoản / chủ tài
  khoản, câu "nơi duy nhất công bố kênh ủng hộ" và "tự nguyện, 100% tới nhà phát triển, không mở khoá gì".
- Một nguồn dữ liệu: `apps/frontend-main/data/ung-ho.json`. Ảnh QR chép NGUYÊN TỆP từ tsudev-files, đặt tên
  `public/ung-ho/vietqr-vib-7209698f.svg` (8 ký tự đầu SHA-256) + `_headers` cho `/ung-ho/*` là immutable 1 năm;
  `lib/ungHo.ts` bắt tên tệp phải mang tiền tố băm. CSP không đổi (ảnh cùng origin).
- Kiểm lúc build: `lib/ungHo.ts` (`kiemVietQr` chép từ tsudev-files, bỏ Buffer để chạy cả ở Workers) chạy ở cấp
  module của trang ⇒ VietQR sai thì `next build` dừng. SHA-256 ghim: `test/ungHo.test.ts` (CI) và
  `scripts/deploy-frontend.js` chạy test đó TRƯỚC khi dựng. Test thử tráo số tài khoản (kể cả tính lại CRC) ⇒ đỏ.
- Chân trang (`packages/ui` SiteFooter, cột Sản phẩm) có "Ủng hộ"; `sitemap.xml` có `/ung-ho`.
- `.github/FUNDING.yml` của repo này: `custom: ["https://tsudev.com/ung-ho"]`. `.github/CODEOWNERS` cho dữ liệu,
  ảnh QR, lib, test, FUNDING.yml.
- **Việc của chủ dự án**: bật "Require review from Code Owners" ở ruleset `main` (ít nhất cho các đường dẫn trên).
  `FUNDING.yml` của các repo khác chưa có trang riêng có thể trỏ về đây - việc của từng repo.

## 5. Bổ sung 12/11/2026 - phương án theo nền tảng (đã chốt)

Áp dụng phiếu `~/projects/logs/handover/20261112-02_quyet-dinh-ung-ho-theo-nen-tang.md` (thay mục 3.5 của phiếu gốc):
web hiện đầy đủ; desktop/Android chỉ nút mở trang web kèm câu "tự nguyện, 100% tới nhà phát triển, không mở khóa gì";
iOS App Store ẩn hoàn toàn. Ghi một dòng kết quả vào mục 5 của phiếu đó.
