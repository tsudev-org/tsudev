# Phiếu bàn giao 20261119-64 - phiên tsudev-64

- **Trạng thái**: MỞ (chờ chủ dự án chốt đề xuất /author)

## 1. Đã xong

- #327 trang chủ: khối ziczac "Có thể thứ bạn cần tìm đang ở đây" (`components/HomeShowcase.tsx`, CSS `.tsu-sc*` cuối
  `styles/globals.css`): 4 thẻ lớn, sắc theo token vai trò, trượt vào khi cuộn; thẻ Trò chơi có băng chuyền logo tự
  chuyển 3,8 s + nút tiến/lùi + chấm (dừng khi rê/focus, tắt dưới reduced-motion). Bỏ nhãn "Hệ sinh thái"/"Có gì ở
  đây"; "Mới nhất" là nhãn ở góc trên phải "Bài viết nổi bật"; /apps bỏ eyebrow "Hệ sinh thái TsuDEV"; nút thẻ app
  "Website" / "GitHub".
- #326 QT4 `idp_hint` (nhận lại từ phiên qulythuchi): test đỏ vì đường gợi ý nằm dưới `/api/identity/oidc` (bị gác
  `auth`) ⇒ dời thành `POST /api/identity/oidc-hint`. Phiếu QT4 ĐÓNG.
- Deploy `deploy-2026.11.19.5`, Worker `76760e4c`. Đo: `/` `/apps` `/blog` `/docs` 200; chữ cũ 0 lần; providers chỉ
  credentials/passkey/github/google; idp_hint google ⇒ tự sang Google, apple ⇒ trang đăng nhập chung.

## 2. Việc kế tiếp

1. Đề xuất trang Viết bài: `docs/de-xuat-trang-viet-bai.md` - chờ chủ dự án trả lời 3 câu ❓ (định dạng lưu, phạm vi
   A/A+B, ảnh tải thẳng R2). Giai đoạn A không cần migration.
2. Hàng đợi cũ ở `logs/STATE.md` (TC1 bước 2-5; T1/T5/T6 của phiếu toàn hệ - projects-47 sẽ nhắn trước khi chạm repo).

## 3. Bẫy gặp trong phiên

- `pkill -f "...ts-node..."` khớp chính lệnh bash chứa chuỗi đó ⇒ tự giết shell (exit 144). Dừng dev server bằng PID
  lấy từ `ss -ltnp`.
- Dev proxy ở máy này nghe **8090** (`DEV_PROXY_PORT` trong `.env`), không phải 8080.
