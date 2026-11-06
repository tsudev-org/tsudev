# Chính sách bảo mật - Security policy

## Báo lỗ hổng

**Đừng mở Issue công khai cho lỗ hổng bảo mật.** Hãy báo riêng qua tính năng
_Private vulnerability reporting_ của GitHub:

<https://github.com/tsudev-tsudev/tsudev/security/advisories/new>

Nên gửi kèm:

- thành phần bị ảnh hưởng (trang, endpoint, service hoặc package);
- các bước tái hiện, hoặc bằng chứng khái niệm ở mức tối thiểu;
- tác động bạn đánh giá được.

Chủ dự án sẽ phản hồi trong vòng **7 ngày**. Sau khi bản vá lên production, lỗ
hổng được công bố qua GitHub Security Advisory, và người báo được ghi công nếu
muốn.

## Phạm vi

Trong phạm vi:

- `tsudev.com` và mã nguồn trong repo này;
- **bản phát hành app tải từ `tsudev.com`**: chữ ký Ed25519 và SHA-256 của tệp
  do máy chủ tạo. Mọi cách làm một tệp không do chủ dự án phát hành mà vẫn qua
  được bước kiểm chữ ký đều được coi là nghiêm trọng nhất.

Ngoài phạm vi: tấn công từ chối dịch vụ bằng lưu lượng lớn, social engineering,
và lỗ hổng của dịch vụ bên thứ ba (Cloudflare, Render, Neon) - hãy báo trực tiếp
cho nhà cung cấp đó.

Chỉ thử trên tài khoản của chính bạn. Đừng truy cập, sửa hoặc xoá dữ liệu của
người khác.

## Phiên bản được hỗ trợ

Chỉ bản đang chạy trên `tsudev.com` (nhánh `main`) được nhận bản vá bảo mật.

---

**English.** Please do not open public issues for security vulnerabilities.
Report them privately via GitHub's private vulnerability reporting (link
above). Expect a reply within 7 days. Only the version currently deployed from
`main` is supported.
