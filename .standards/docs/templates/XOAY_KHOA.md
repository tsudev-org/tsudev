# PHIẾU XOAY KHOÁ - <tên bí mật>

> Mẫu theo `SECURITY_BASELINE.md` mục 12.3. Đặt tên tệp `logs/handover/YYYYMMDD-XK<n>_xoay-<tên>.md` ở repo sở hữu bí
> mật. Còn `MỞ` thì hook `SessionStart` nhắc mọi phiên; agent nhắc chủ dự án trước khi làm task.
> **KHÔNG ghi giá trị bí mật, kể cả một phần, vào phiếu này.**

- **Mã phiếu**: YYYYMMDD-XK<n>
- **Trạng thái**: MỞ | ĐANG XOAY | ĐÓNG
- **Người phát hiện**: <phiên/agent> - **Thời điểm**: HH:mm DD/MM/YYYY
- **Mức độ**: Nghiêm trọng | Cao | Trung bình | Thấp

## 1. Bí mật

| Tên biến / loại | Dịch vụ + phạm vi quyền | Nơi lưu hiện tại | Nơi đang dùng (phải cập nhật khi xoay) |
| --- | --- | --- | --- |
| | | | |

## 2. Lộ ở đâu, khi nào

- <nơi lộ: lịch sử phiên agent / chat / log / commit / ổ Windows...> - <thời điểm> - <cách phát hiện>

## 3. Việc của chủ dự án

- [ ] Tạo bí mật mới (phạm vi không rộng hơn bí mật cũ, đặt hạn nếu được)
- [ ] Cập nhật mọi nơi dùng ở mục 1 (nhập qua stdin/clipboard bằng `tsu-nhan-bi-mat`, không dán vào chat)
- [ ] Kiểm chứng dịch vụ chạy bằng bí mật mới
- [ ] Thu hồi / xoá bí mật cũ trên dịch vụ
- [ ] Ghi ngày xoay vào mục 4, đổi Trạng thái -> ĐÓNG

## 4. Kết quả

- <ngày> - <đã xoay / đã xác nhận bí mật cũ bị thu hồi> - <ai>
