# PHIẾU YÊU CẦU SEC2 - Trang `/security` với bằng chứng tin cậy TỰ KIỂM CHỨNG ĐƯỢC

- **Mã phiếu**: 20261125-SEC2 (bản sao cho repo) - **Từ**: phiên `tsudev-8d`, 25/11/2026, theo yêu cầu chủ dự án - **Trạng thái**: ĐÓNG (25/11/2026, chờ hstspreload chuyển `pending` → `preloaded` - Chromium tự đưa vào bản kế)
- **Phiếu gốc (ĐỌC mục 0-2 TRƯỚC)**: `~/projects/logs/handover/20261125-SEC2_trang-security-bang-chung-tin-cay-toan-he.md`
- **Website của repo**: tsudev.com

## Việc của repo này

Hub tsudev.com/security (bảng toàn hệ, mỗi sản phẩm một hàng) + E5/E6 + NỘP HSTS preload tsudev.com (SEC2-e: liệt kê MỌI bản ghi DNS con trên Cloudflare đều HTTPS trước; sync.tsudev.com không phân giải 25/11). security.txt đã có - đổi Contact sang security@tsudev.com (phiếu EM2).

## Ràng buộc (tóm tắt phiếu gốc mục 0)

- TUYỆT ĐỐI không nhãn trang trí: mỗi mục có liên kết tới trang kết quả của bên thứ ba + ngày đo; không có ⇒ không hiện.
- Chỉ khai sự thật; điểm thấp hiện đúng số; không áp dụng ⇒ ghi lý do.
- Số liệu lấy từ tệp trong repo lúc build (không gọi API ngoài khi người xem mở trang).
- Biểu mẫu (Best Practices, SignPath, SSL Labs, Observatory, HSTS preload): mở Edge hồ sơ `tsudev-bp` theo phiếu gốc mục 0.4;
  đăng nhập/OTP/giấy tờ ⇒ 👤 tự nhập. Mỗi lúc một phiên dùng hồ sơ; đóng Edge khi xong.
- Làm trong PR kế tiếp của repo nếu nhỏ; xong ghi một dòng dưới đây + cập nhật hàng của repo ở bảng mục 3 phiếu gốc; `akb` theo chuẩn.

## Kết quả xử lý

- 25/11/2026 - tsudev-8d: mở phiếu.
- 25/11/2026 - tsudev-3e: **SEC2-e XONG**. Đo bằng API (không cần Edge): SSL Labs v3 `publish=off` A+ 4/4 điểm cuối,
  Observatory v2 A+ 130 12/12, Scorecard 7.9, BP 16731 passing, PVR `enabled:true`. Liệt kê 60 bản ghi DNS Cloudflare:
  35 tên miền con web đều HTTPS chứng chỉ hợp lệ, còn lại TXT/MX/CAA; `sync.tsudev.com` không có bản ghi. hstspreload
  `preloadable` 0 lỗi 0 cảnh báo ⇒ **ĐÃ NỘP** `tsudev.com`, trạng thái `pending`. Trang hub `/security` (dữ liệu
  `apps/frontend-main/data/trust.json`, test `trustData.test.ts`), `Policy:` trong security.txt, liên kết chân trang
  "An toàn", sitemap.
