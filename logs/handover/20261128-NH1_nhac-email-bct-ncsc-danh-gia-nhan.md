# PHIẾU NH1 - Nhắc kiểm email BCT + NCA (từ 28/11/2026) và đánh giá nhãn tín nhiệm cho các website hệ TsuDEV

- **Mã phiếu**: 20261128-NH1 - **Từ**: phiên `tsudev-b5dd`, 25/11/2026 - **Trạng thái**: MỞ
- **Kích hoạt**: phiên tsudev ĐẦU TIÊN mở vào hoặc sau **28/11/2026** làm mục 1 NGAY đầu phiên (trước phase UX1), rồi
  mục 2. Mở sớm hơn 28/11 thì bỏ qua phiếu này.
- **Liên quan**: phiếu gốc `~/projects/logs/handover/20261124-DK2_dang-ky-bct-tin-nhiem-mang-chong-lua-dao.md` (bảng mục 4),
  [`20261124-QR1`](20261124-QR1_dang-nhap-qr-ui1-dk2.md), AKB `LES-20261124-2353-23b4` (cách nộp BCT/NCSC).

## 1. 👤 Nhắc chủ dự án kiểm email (việc đầu phiên)

Gửi chủ dự án đúng lời nhắc sau, rồi chờ trả lời trước khi làm tiếp DK2:

> Đã tới mốc 28/11/2026. Anh/chị kiểm giúp hai hộp thư:
>
> 1. **Email đăng ký tài khoản Cá nhân trên Cổng dịch vụ công Bộ Công Thương** (dichvucong.moit.gov.vn, đăng ký
>    24/11/2026, email tài khoản `contact@tsudev.com`): tài khoản đã được duyệt chưa? Có yêu cầu bổ sung gì không?
> 2. **`contact@tsudev.com`**: Trung tâm An ninh mạng Quốc gia (NCA, tinnhiemmang.vn) có liên hệ để xác thực đăng ký
>    "Tín nhiệm Website" cho tsudev.com (gửi 24/11/2026, gói Cơ bản) không? Họ đòi gì (giấy tờ, báo cáo đánh giá ATTT,
>    phí)?
>    Có thư thì chuyển tiếp/tóm tắt cho tôi (đừng dán mật khẩu hay mã OTP vào chat).

Xử lý theo câu trả lời:

| Tình huống                | Việc của agent                                                                                                                                                                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tài khoản BCT ĐÃ duyệt    | Mở Edge `tsudev-bp` (cách mở: AKB LES-20261124-2353-23b4), chủ dự án đăng nhập online.gov.vn → "Thông báo nền tảng TMĐT trực tiếp có đặt hàng trực tuyến" cho tsudev.com. Chỉ khai sự thật (giá Pro 490.000 ₫/năm, VietQR + Google Play, chính sách ở `/chinh-sach-thanh-toan`, `/terms`, `/privacy`). Ghi mã hồ sơ vào DK2 mục 4. |
| BCT đòi bổ sung / từ chối | Ghi lý do nguyên văn vào DK2 mục 4; sửa website nếu thiếu nội dung (PR riêng) trong 48 giờ; đòi pháp nhân/hộ kinh doanh ⇒ DỪNG, 👤 quyết.                                                                                                                                                                                          |
| Chưa có thư BCT           | Nhắc lại ở phiên sau; quá 10 ngày làm việc (≈ 08/12/2026) ⇒ đề nghị chủ dự án gọi hỗ trợ 024 222 05 395 / `hotro@moit.gov.vn`.                                                                                                                                                                                                     |
| NCA đã liên hệ            | Trả lời theo yêu cầu của họ; báo cáo đánh giá ATTT có phí hoặc phải thuê đơn vị được NCA uỷ quyền ⇒ 👤 quyết trước khi cam kết.                                                                                                                                                                                                    |
| NCA chưa liên hệ          | Nhắc lại sau 7 ngày; vẫn im ⇒ đề nghị gửi thư hỏi qua kênh liên hệ trên tinnhiemmang.vn.                                                                                                                                                                                                                                           |
| Được cấp nhãn (BCT/NCA)   | PR gắn mã nhúng/logo vào chân trang (`packages/ui/src/components/SiteFooter.tsx` - cổng Bảo vệ bản quyền ⇒ chủ dự án duyệt), ảnh tự host nếu cổng cho phép (giữ CSP), alt tiếng Việt; deploy; đo lại.                                                                                                                              |

## 2. Đánh giá: có nên thêm nhãn DMCA / Chống Lừa Đảo / Cloudflare Project Galileo / nhãn khác?

Nhận định sơ bộ của phiên b5dd (chưa xác minh hết - phiên sau MUST kiểm trang chính thức trước khi đề xuất, ghi nguồn):

| Nhãn                                                | Nhận định sơ bộ                                                                                                                                                                                                                                       | Việc phiên sau                                                                                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Đã thông báo Bộ Công Thương**                     | Có giá trị pháp lý ở VN, bắt buộc với website có thanh toán. ĐANG LÀM.                                                                                                                                                                                | Mục 1.                                                                                                                                                             |
| **Tín nhiệm mạng (NCA)**                            | Nhãn nhà nước về ATTT, người dùng VN nhận ra. ĐÃ GỬI cho tsudev.com.                                                                                                                                                                                  | Mục 1; tên miền con (swico., files., sound., disk., qulythuchi., …) cần `/.well-known/security.txt` riêng trước khi đăng ký - đưa vào phiếu của từng repo website. |
| **Chống Lừa Đảo (chongluadao.vn)**                  | Doanh nghiệp xã hội phi lợi nhuận, làm danh sách chặn (tích hợp OpenDNS, NextDNS, phần mềm diệt virus) - tra 24-25/11 KHÔNG thấy chương trình huy hiệu/chứng nhận website.                                                                            | Kiểm lại trang chính thức; không có chương trình ⇒ chỉ kiểm tên miền hệ TsuDEV KHÔNG nằm trong danh sách chặn, ghi "không có chương trình", đóng hàng CLD ở DK2.   |
| **DMCA.com Protected**                              | Dịch vụ THƯƠNG MẠI (huy hiệu + gỡ nội dung có phí), không phải nhãn pháp lý; luật DMCA của Mỹ không cần huy hiệu để áp dụng. Lệch nguyên tắc 0 đồng (`docs/free-tier.md`) và không tăng tin cậy với người dùng VN.                                    | Khuyến nghị KHÔNG dùng. Thay bằng: trang báo vi phạm bản quyền/gỡ nội dung (đã có `abuse@` ở `/terms`; P8 có kế hoạch takedown có SLA).                            |
| **Cloudflare Project Galileo**                      | Chương trình bảo vệ MIỄN PHÍ cho tổ chức lợi ích công cộng dễ bị tấn công (báo chí độc lập, nhân quyền, xã hội dân sự). Website phát hành phần mềm cá nhân gần như chắc chắn KHÔNG đủ điều kiện; cũng không phải nhãn hiển thị.                       | Kiểm điều kiện trên trang Cloudflare; không đủ ⇒ ghi lý do, bỏ.                                                                                                    |
| **Nhãn chuyên nghiệp hơn, 0 đồng, kiểm chứng được** | Đã có/nên có: OpenSSF Best Practices (tsudev 16731 passing), OpenSSF Scorecard, chữ ký Ed25519 + SHA-256 bản phát hành (đã có), `security.txt` (đã có), HSTS preload, Mozilla Observatory/SSL Labs A+ (P9), SignPath (ký mã Windows cho app desktop). | Đề xuất một bảng "Tin cậy & bảo mật" trên `/security` (P6 trong phiếu UX1) gom nhãn THẬT có liên kết kiểm chứng; không dùng nhãn trang trí không kiểm chứng được.  |

Quy tắc khi gắn bất kỳ nhãn nào: chỉ nhãn có trang xác minh công khai; không tải script bên thứ ba (giữ CSP, ngân sách JS
170 KB); áp dụng cho các repo website khác qua phiếu yêu cầu (ListAgents → SendMessage), không tự sửa repo khác.

## 3. Kết quả xử lý

- 25/11/2026 - tsudev-b5dd: mở phiếu theo yêu cầu chủ dự án.
