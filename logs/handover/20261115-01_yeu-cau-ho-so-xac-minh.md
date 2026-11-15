# PHIẾU YÊU CẦU - Hồ sơ trên các nền tảng xác minh (Best Practices, Scorecard, phát hành, kênh gói) cho `tsudev`

- **Mã phiếu**: 20261115-01 (phiếu con)
- **Từ**: phiên agent-files (repo `tsufiles`), chủ dự án yêu cầu 15/11/2026 - **Đến**: phiên kế tiếp của repo `tsudev`
- **Trạng thái**: MỞ
- **Phiếu mẹ (ĐỌC TRƯỚC, mục 0 nguyên tắc + mục 3 quy trình)**: `~/projects/logs/handover/20261115-01_yeu-cau-ho-so-xac-minh-toan-he.md`
- **Công cụ + mẫu đã đạt passing 100%**: `~/projects/logs/tools/bestpractices/` (`README.md`, `bp.cjs`, `mau-tsufiles.json`);
  mẫu hồ sơ dạng đọc: `~/projects/tsufiles/docs/best-practices.md`.

## 1. Hiện trạng đo 15/11/2026

Website tsudev.com + backend (Apache-2.0). Scorecard 8.3, chưa có Release (sản phẩm là website).

## 2. Việc của repo này (theo thứ tự)

- [ ] 2.1. Best Practices cho repo `tsudev`: các tiêu chí phát hành (`version_*`, `release_notes`) phải trả lời đúng mô hình triển khai liên tục - nếu không gắn thẻ phiên bản thì bắt đầu gắn thẻ (ví dụ theo ngày deploy) TRƯỚC khi ghi Met, hoặc ghi Unmet trung thực.
- [ ] 2.2. Tiêu chí crypto/password (`crypto_password_storage`, `sites_password_security`): repo có đăng nhập tài khoản - đối chiếu thuật toán băm mật khẩu thật trong mã (P1 bảo mật tài khoản), ghi URL tới tệp.
- [ ] 2.3. Scorecard 8.3: giữ >= 7; xem hạng mục còn Warn và sửa phần agent sửa được.
- [ ] 2.4. **Mục 5 - nhận thêm** `tsudev-standards` (MIT, 5 Release) và `tsudev-org/.github` (KHÔNG có giấy phép - thêm `LICENSE` (CC-BY-4.0 hoặc MIT cho tệp cộng đồng) để GitHub nhận diện): thêm `scorecard.yml` cho cả hai; không cần Best Practices.
- [ ] 2.5. Hồ sơ Best Practices (nếu áp dụng): soạn `docs/best-practices.json` + `.md` (mỗi `Met` có URL bằng chứng trên
      `main`), gộp PR, rồi `bp.cjs new` -> `fill` chạy thử -> xem ảnh -> `fill --submit` -> `inspect` ra passing 100% -> huy hiệu README.
- [ ] 2.6. Ghi kết quả có số đo dưới đây + đánh dấu dòng `tsudev` ở mục 4 phiếu mẹ + một dòng mục 7 kế hoạch `20261113-02`.

**Nhắc lại**: không ghi `Met` cho điều repo chưa làm. Chưa đạt thì sửa repo trước, hoặc ghi `Unmet`/`N/A` trung thực.
Tự chứng nhận sai bị phát hiện sẽ làm hỏng hồ sơ SignPath của cả hệ.

## Kết quả xử lý (phiên nhận điền)

-
