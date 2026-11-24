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
