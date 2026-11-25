# PHIẾU YÊU CẦU QR1 + UI1 + DK2 - tsudev

- **Mã phiếu**: 20261124-QR1 (bản sao cho repo) - **Từ**: điều phối `projects-71`, 24/11/2026 - **Trạng thái**: MỞ
- **Phiếu gốc** (đọc phần liên quan): `~/projects/logs/handover/20261124-QR1_dang-nhap-qr-giao-dien-thong-nhat-toan-he.md`,
  `20261124-UI1_bieu-tuong-kho-thay-toan-he.md`, `20261124-DK2_dang-ky-bct-tin-nhiem-mang-chong-lua-dao.md`.
- **Chuẩn**: tsudev-standards **v5.1.0** - `CROSS_DEVICE_LOGIN.md`, `AUTH_AND_ACCOUNT.md` 3.0/13.2/13.4,
  `DESIGN_SYSTEM.md` 1 (biểu tượng trên viên chỉ báo), `LANGUAGE_SELECTION.md` 5.1, `PROJECT_STRUCTURE.md` 3.1,
  `BRAND_ASSETS.md` 12.3.
- **Hạng / loại**: A - IdP tsudev.com

## Việc của repo này

1. **QR1-IdP** (bảng `xd_sessions` + migration 👤, API `/api/xd/*`, `/tai-khoan/thiet-bi/qr`, khung QR ở `/dang-nhap`, discovery, email, `amr: qr`) + **QR1-PASSKEY** + trang IdP theo bố cục 13.2, ô đồng ý 13.4, `terms_version`; SSO tổ chức chỉ khi có tổ chức. DK2: trang `/dieu-khoan`, `/quyen-rieng-tu`, chính sách hoàn tiền/khiếu nại, thông tin chủ sở hữu đủ cho hồ sơ BCT; sau duyệt gắn nhãn BCT + Tín nhiệm mạng ở footer
2. **STD-SYNC** trong PR kế tiếp (không PR riêng): sync v5.1.0, bật cổng Clean Codebase (mã chết/phụ thuộc thừa) và
   ngân sách tốc độ; liên kết về tsudev.com kèm dấu hiệu TsuDEV + favicon đủ bộ.
3. Rà **UI1** cả Sáng/Tối: biểu tượng trên nền thật ở mọi trạng thái ≥ 3:1, thêm test chặn tái phát (nếu có giao diện).

Repo có phiên riêng ⇒ phiên đó làm; ghi kết quả một dòng dưới đây + dòng tương ứng ở phiếu gốc; `akb` theo chuẩn.

## Kết quả xử lý

- 24/11/2026 - projects-71: mở phiếu.
- 24/11/2026 - projects-71: QR1-IdP xong (PR feat/qr1-dang-nhap-qr): auth-service `crossDevice.ts` + `/api/identity/xd/*`
  (16 test), BFF `/api/xd/*` (bí mật thiết bị mới trong cookie HttpOnly), NextAuth provider `qr`, trang `/x/[id]` hai
  vai, khung QR ở `/login`, mục "Đăng nhập trên điện thoại bằng mã QR" ở `/settings/security#qr`, bố cục 13.2 + ô
  đồng ý 13.4 ở `/login`; E2E `qr-login.spec.js` 3/3 (Đ1, Đ2, ô đồng ý). Passkey có từ trước. CÒN: lưu
  `terms_version` ở IdP (cần migration - 👤), SSO tổ chức (chưa có tổ chức nào ⇒ không hiện nút, đúng chuẩn).
- 24/11/2026 - tsudev (phiên b5dd, tiếp tsudev-c9d4 bị cắt): STD-SYNC xong ở nhánh `chore/std-sync-v5-3-0` - `.standards`
  v5.3.0; cổng Clean Codebase `npm run knip` (job Lint & format; xoá 5 tệp chết + 32 `export default` trùng + 4 hàm chết,
  gỡ `@types/cors`); cổng ngân sách `npm run budget:js` (job Build frontends, ≤ 170 KB gzip/trang) - bắt được
  `/author/posts/[slug]` 297.6 KB ⇒ nạp lười Tiptap, nay nặng nhất `/settings/security` 164.1 KB (biên mỏng). LCP/CLS
  chưa có cổng (cần Lighthouse CI - phase sau). CÒN: DK2 (trang pháp lý BCT), UI1 (rà biểu tượng ≥ 3:1 + test),
  `terms_version` (migration 👤).
- 24/11/2026 - tsudev (phiên b5dd, tiếp): DK2 phần website - `/chinh-sach-thanh-toan` (giá, VietQR/Google Play, hoàn
  tiền 7 ngày, khiếu nại 2+7 ngày làm việc), chuyển hướng `/dieu-khoan` `/quyen-rieng-tu` `/noi-quy`, chân trang ghi chủ
  sở hữu/MST/địa chỉ/liên hệ + test canh (`709071b`). ✅ Chủ dự án DUYỆT điều kiện hoàn tiền (7 ngày, hoàn
  theo ngày còn lại) 24/11/2026. UI1: 5 cặp biểu tượng/nền thật
  thêm vào `contrast.test.ts`, cả 3 chế độ đạt - website không có lỗi (`75651a4`). Ba commit trên nhánh
  `chore/std-sync-v5-3-0`, CHƯA push. CÒN: push + PR (👤 duyệt), cổng LCP/CLS (Lighthouse CI - phase riêng), nộp
  online.gov.vn / tinnhiemmang.vn (👤 đăng nhập), `terms_version` (migration 👤).
- 24/11/2026 - tsudev-b5dd: #377 gộp (`9226ac2`), deploy **`deploy-2026.11.24.1`** Worker `516aaf52`; production đo: `/chinh-sach-thanh-toan`
  200 đủ nội dung, chân trang có chủ sở hữu, `/dieu-khoan` `/quyen-rieng-tu` `/noi-quy` 308, `security.txt` 200, providers
  chỉ 5 provider thật. DK2 nộp: Tín nhiệm mạng (tsudev.com, gói Cơ bản) GỬI thành công - NCA liên hệ `contact@tsudev.com`;
  BCT: tài khoản Cá nhân trên dichvucong.moit.gov.vn ĐĂNG KÝ thành công, CHỜ Bộ kiểm duyệt ⇒ sau đó mới làm "Thông báo
  nền tảng TMĐT trực tiếp có đặt hàng trực tuyến" (Sở Công Thương An Giang xử lý). Căn cứ: Luật TMĐT 122/2025/QH15, NĐ
  248/2026/NĐ-CP (hiệu lực 01/7/2026).
