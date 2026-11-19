# PHIẾU YÊU CẦU - PRO1: lưu cục bộ mặc định, Pro mới có đồng bộ/sao lưu đám mây (tsudev)

- **Mã phiếu**: 20261119-PRO1 (phiếu con)
- **Từ**: agent-qulythuchi (phiên `qulythuchi-b2`), 19/11/2026, theo yêu cầu trực tiếp của chủ dự án
- **Đến**: phiên kế tiếp của repo `tsudev`
- **Trạng thái**: MỞ - chưa viết mã trước khi tsudev-standards v3.9.0 (PRO-A) phát hành; phần nào cần máy chủ quyền lợi
  thì chờ PRO-B
- **Phiếu gốc (ĐỌC TRƯỚC)**: `~/projects/logs/handover/20261119-PRO1_ke-hoach-luu-cuc-bo-pro-dong-bo-toan-he.md` - mục 1 (yêu cầu nguyên văn tóm tắt), 2 (nguyên tắc N1-N8), 3 (thông báo nhiều
  thiết bị, chu kỳ 30 ngày), 5 (khung việc mỗi repo), 7 (nghiệm thu), 8 (câu hỏi 👤). Phiếu này THAY hàng T7 của
  `~/projects/logs/handover/20261119-01_ke-hoach-toan-he-v3.8.0.md` cho repo này.

## 1. Việc riêng của repo này

**PRO-B** (T5 mở rộng, tsudev ADR-0002) cộng ba điểm còn thiếu: (b1) **kênh máy chủ ↔ máy chủ cho RP** - qulythuchi/sound-db/tsuscan đăng nhập qua Worker riêng nên app KHÔNG có access token tsudev; đề xuất `GET /api/rp/entitlements/{sub}` + `POST /api/rp/entitlements/play` xác thực bằng client của RP (`private_key_jwt` hoặc client secret đang có), chỉ cho `sub` đã cấp quyền cho client đó, JWS trả về có `aud = client_id`, có test `aud` sai và `sub` lạ ⇒ 4xx. (b2) bảng `AppInstallation` + `devices_30d` trong JWS (mục 3 phiếu gốc; chỉ lưu HMAC của mã cài đặt). (b3) trang `tsudev.com/pro` (điều khoản thuê bao đứng trước nút mua, VietQR `TSU <mã>`). **PRO-C** bản web của huy hiệu. **PRO-D** (dịch vụ đồng bộ dùng chung) nếu 👤 chọn đặt trong repo này.

## 2. Khung việc (tóm tắt phiếu gốc mục 5)

1. Kiểm kê: dữ liệu nào đang rời thiết bị, nằm ở đâu ⇒ ghi mục 4 dưới đây.
2. ADR riêng: phần nào là Pro, cách ân hạn cho người dùng cũ, kênh thanh toán theo PRODUCT_POLICY 3.3/4.3.
3. Mã: đọc quyền lợi (JWS tsudev, đệm ≤ 7 ngày), gate Pro ở MÁY CHỦ, thông báo nhiều thiết bị (5 test bắt buộc), màn
   Pro/Ủng hộ, huy hiệu PRO-C, vi + en, test.
4. Đo phản hồi thao tác chính (< 100 ms) và chịu tải (nếu có máy chủ), ghi vào PR.
5. Phiếu rà soát bảo mật + THREAT_MODEL. Không tự tạo khoá/tài khoản thanh toán thật ⇒ việc 👤.

## 3. Việc cần chủ dự án (👤)

Xem phiếu gốc mục 8 (giá Pro, ân hạn, nơi đặt dịch vụ đồng bộ dùng chung, ngoại lệ nhắc 30 ngày).

## 4. Kết quả xử lý (phiên nhận điền)

-
