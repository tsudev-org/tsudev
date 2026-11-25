# PHIẾU YÊU CẦU PRO3 - Pro là gói TỰ NGUYỆN ủng hộ tác giả; sản phẩm miễn phí, mã nguồn mở

- **Mã phiếu**: 20261125-PRO3 (bản sao cho repo) - **Từ**: điều phối `projects-d6`, 25/11/2026, theo quyết định chủ dự án - **Trạng thái**: MỞ
- **Phiếu gốc (ĐỌC mục 0 TRƯỚC)**: `~/projects/logs/handover/20261125-PRO3_pro-goi-tu-nguyen-ung-ho-tac-gia-toan-he.md`
- **Chuẩn**: tsudev-standards v6.1.0, `docs/PRODUCT_POLICY.md` mục **3.7** (nguyên văn câu định vị + ô xác nhận vi/en ở 3.7.3).

## Việc của repo này

(a) `/pro`: câu định vị + ô xác nhận (nút mua vô hiệu tới khi đánh dấu), chỉ liệt kê quyền lợi đang chạy; (b) `/chinh-sach-thanh-toan`, `/terms`: gọi Pro là "gói dịch vụ không bắt buộc", thêm Q2 khi chạy thật, điều khoản fork không dùng tên "TsuDEV Pro"/máy chủ tsudev.com, cập nhật `PAYMENT_DOC_DATES` - đổi trang chính sách ⇒ báo điều phối để khai sửa đổi hồ sơ BCT (DK2); (c) Q2 web: chủ đề Pro trong `@tsudev/ui` + Cài đặt → Giao diện; (d) rà toàn site: không "phi lợi nhuận/non-profit", lối vào Pro đúng chỗ; (e) logo BCT ở `packages/ui/src/components/SiteFooter.tsx` CHỈ sau khi DK2 được duyệt (mã nhúng của cổng, ảnh tự host, alt tiếng Việt); (f) mô tả `/apps`, README: "miễn phí, mã nguồn mở".

## Ràng buộc (tóm tắt phiếu gốc mục 0)

- Quyền lợi Pro chỉ Q1 huy hiệu · Q2 giao diện Pro · Q3 đồng bộ/sao lưu đám mây; tính năng cốt lõi, Sáng/Tối, tiếp cận,
  xuất tệp, bảo mật MIỄN PHÍ mãi; giao diện Pro chỉ thêm lựa chọn.
- Lối vào Pro chỉ ở Tài khoản/Cài đặt, Giới thiệu, tsudev.com/pro, hộp thoại 7.3/7.6; không đếm ngược, giảm giá giả,
  confirmshaming, chọn sẵn.
- Màn mua: câu định vị → quyền lợi đang chạy thật → điều khoản 7.5 + /chinh-sach-thanh-toan → ô xác nhận không chọn sẵn.
- Pháp lý: Pro là "gói dịch vụ"; cấm "phi lợi nhuận / non-profit / từ thiện" công khai; chỉ tsudev.com nhận tiền; không
  logo Bộ Công Thương trên tên miền chưa được duyệt.
- Làm trong PR kế tiếp của repo; commit/PR không ghi đồng tác giả AI; xong ghi một dòng dưới đây + cập nhật hàng của repo
  ở mục 3 phiếu gốc; `akb` theo chuẩn.

## Kết quả xử lý

- 25/11/2026 - projects-d6: mở phiếu.
- 25/11/2026 - tsudev-PRO3: (a) `/pro` câu định vị + ô xác nhận nguyên văn 3.7.3 (không chọn sẵn, khoá cả "Mua" lẫn
  "Đăng nhập để mua"), quyền lợi chỉ Q1 + Q3 đang chạy; (b) `/terms` mục "Gói TsuDEV Pro" (gói dịch vụ trả phí không
  bắt buộc + điều khoản fork), `/chinh-sach-thanh-toan` gọi đúng tên, `PAYMENT_DOC_DATES.updated` = 25/11/2026,
  `TERMS_DOC_DATES` tách riêng; (d) không chữ cấm (test quét nguồn), lối vào Pro đúng chỗ (Cài đặt, /ung-ho, chính sách);
  (f) README + mô tả `/apps`; `.standards` → v6.1.0; test `proTerms.test.ts`. Còn: (c) chủ đề Pro Q2 (phiên sau),
  (e) logo BCT chờ DK2. Mâu thuẫn ECO1-e đã xử lý (huỷ). PR: xem dòng kế tiếp khi mở.
- 25/11/2026 - tsudev-PRO3: gộp #398, `deploy-2026.11.25.9` (Worker `da201bae`). Đo production: `/pro` có câu định vị +
  ô xác nhận; `/terms`, `/chinh-sach-thanh-toan` có "gói dịch vụ trả phí không bắt buộc", ngày cập nhật 25/11/2026.
  Đã nhắn projects-4c, projects-05. Còn (c) Q2, (e) logo BCT.
