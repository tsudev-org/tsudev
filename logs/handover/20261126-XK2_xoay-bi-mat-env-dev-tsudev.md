# PHIẾU XOAY KHOÁ - bí mật `.env` phát triển của tsudev

> Theo `SECURITY_BASELINE.md` mục 12.3 (tsudev-standards v8.3.0). Còn `MỞ` thì hook `SessionStart` nhắc mọi phiên của repo
> này; agent `MUST` nhắc chủ dự án ở đầu phiên, trước khi làm task. **KHÔNG ghi giá trị bí mật vào phiếu.**

- **Mã phiếu**: 20261126-XK2
- **Trạng thái**: MỞ
- **Người phát hiện**: phiên cấu hình máy (projects-dc), rà soát Zero Secret Exposure - **Thời điểm**: 19:16 26/11/2026
- **Mức độ**: Trung bình

## 1. Bí mật

| Tên biến / loại            | Dịch vụ + phạm vi                  | Nơi lưu                                                            | Nơi đang dùng |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------ | ------------- |
| `NEXTAUTH_SECRET`          | ký phiên đăng nhập (dev)           | `.env`, `apps/console/.env.local`, `apps/frontend-main/.env.local` | dev cục bộ    |
| `TOTP_ENCRYPTION_KEY`      | mã hoá bí mật TOTP (dev)           | như trên                                                           | dev cục bộ    |
| `INTERNAL_IDENTITY_SECRET` | xác thực nội bộ giữa dịch vụ (dev) | như trên                                                           | dev cục bộ    |
| `RELEASE_SIGNING_KEY`      | khoá ký bản phát hành (dev)        | như trên                                                           | dev cục bộ    |
| `DATABASE_URL`             | Postgres **localhost** (dev)       | như trên                                                           | dev cục bộ    |

## 2. Lộ ở đâu, khi nào

- Giá trị **đang dùng** xuất hiện trong lịch sử phiên agent tsudev: `NEXTAUTH_SECRET` 10 phiên, `TOTP_ENCRYPTION_KEY` 4,
  `INTERNAL_IDENTITY_SECRET` 3, `RELEASE_SIGNING_KEY` 1, `DATABASE_URL` 1 (trước 26/11/2026).
- Đã đối chiếu: các giá trị KHÔNG trùng kho `~/.config/tsudev/`, `DATABASE_URL` trỏ localhost -> nhiều khả năng chỉ là
  giá trị dev. Rủi ro thật chỉ có nếu production (Cloudflare `wrangler secret`, Render) **dùng lại** cùng giá trị.

## 3. Việc của chủ dự án / agent (khi chủ dự án ủy quyền)

- [ ] Chủ dự án xác nhận production KHÔNG dùng lại 5 giá trị dev trên (nhất là `RELEASE_SIGNING_KEY`, `TOTP_ENCRYPTION_KEY`).
      Nếu có dùng lại -> nâng Mức độ "Nghiêm trọng", xoay production trước.
- [ ] Sinh lại giá trị dev (agent tự làm được khi ủy quyền: `openssl rand -base64 32` ghi thẳng vào tệp, không in;
      `TOTP_ENCRYPTION_KEY` đổi thì dữ liệu TOTP dev cũ không giải được -> reset DB dev)
- [ ] Ghi mục 4, đổi Trạng thái -> ĐÓNG

## 4. Kết quả

-

## Quy trình agent của repo này (chủ dự án ủy quyền 26/11/2026)

1. **Đầu mỗi phiên** (hook SessionStart hiện dòng `PHIEU XOAY KHOA DANG MO`): nhắc chủ dự án đúng một câu nêu mã phiếu +
   việc cần làm, TRƯỚC khi làm task. Chủ dự án trả lời "để sau" thì không nhắc lại trong phiên đó.
2. **Tự xoay khi chủ dự án đồng ý** và việc xoay không gián đoạn dịch vụ/không hạ bảo mật (SECURITY_BASELINE 12.3):
   - Bí mật do dịch vụ ngoài cấp (cần chủ dự án tạo trên dashboard): nhận qua CLIPBOARD, KHÔNG qua chat:
     chạy `tsu-nhan-bi-mat ...` bằng `run_in_background`, nhắn "Bấm Copy khoá mới trên trang <dịch vụ> - KHÔNG dán vào
     chat"; công cụ tự kiểm định dạng, lưu `chmod 600`, xoá clipboard + lịch sử Win+V.
   - Đẩy lên kho bí mật nền tảng không in giá trị: `tsu-nhan-bi-mat ... --stdout | wrangler secret put <TÊN>` hoặc
     `( set -a; . <tệp>; set +a; printf %s "$TÊN" | gh secret set <TÊN> -R <org/repo> )`.
   - Bí mật tự sinh (dev, khoá phiên): `openssl rand -base64 32` ghi thẳng vào tệp/`wrangler secret put`, không in.
   - Kiểm chứng dịch vụ chạy -> nhắc chủ dự án thu hồi khoá cũ trên dashboard -> ghi mục 4, đổi Trạng thái -> ĐÓNG.
3. KHÔNG đọc/in giá trị (`cat`, `grep`, `echo`); chỉ `noleak-inspect.py` (tên khoá). Hook chặn thì không lách.

### Lệnh cụ thể (XK2)

- Hỏi chủ dự án 1 câu: "production (Cloudflare/Render) có dùng lại giá trị dev của NEXTAUTH_SECRET/TOTP_ENCRYPTION_KEY/
  INTERNAL_IDENTITY_SECRET/RELEASE_SIGNING_KEY không?" - KHÔNG -> agent tự sinh lại 4 giá trị dev trong `.env`,
  `apps/console/.env.local`, `apps/frontend-main/.env.local` (giữ cùng giá trị giữa 3 tệp; `TOTP_ENCRYPTION_KEY` đổi ->
  reset dữ liệu TOTP của DB dev); `DATABASE_URL` localhost: đổi mật khẩu Postgres dev nếu chủ dự án muốn. CÓ -> nâng
  Mức độ "Nghiêm trọng", xoay production trước (`openssl rand ... | wrangler secret put`), báo trước việc đăng xuất
  toàn bộ phiên người dùng khi đổi `NEXTAUTH_SECRET`.
