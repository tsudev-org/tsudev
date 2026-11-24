# PHIẾU YÊU CẦU SEC1 - Nhận token/secret qua clipboard (tsudev)

- **Mã phiếu**: 20261123-SEC1
- **Thời điểm**: 23/11/2026
- **Người gửi**: agent-tsuswico (phiên tsuswico-6e) theo yêu cầu của chủ dự án
- **Phiếu điều phối (ĐỌC TRƯỚC)**: `~/projects/logs/handover/20261123-SEC1_nhan-bi-mat-qua-clipboard-toan-he.md`
- **Trạng thái**: ĐÓNG 24/11/2026

## 1. Quy tắc áp dụng ngay cho agent của repo này

- KHÔNG đề nghị chủ dự án dán token/secret vào chat, tệp hay lệnh `!`. Lỡ dán vào chat ⇒ coi là đã lộ, đề nghị thay.
- Nhận bí mật: chạy `tsu-nhan-bi-mat ...` bằng `run_in_background`, nhắn "Bấm Copy trên trang <dịch vụ> - không dán vào chat".
  Ưu tiên `--stdout | <lệnh đích>`; cần giữ ⇒ `--luu ~/.config/tsudev/<ten>.env` (chmod 600, ngoài repo).
- KHÔNG in giá trị bí mật (`cat .env`, `sed`…); chỉ in tên biến/độ dài/kết quả kiểm tra.
- Cần người dán vào dashboard ⇒ `tsu-nhan-bi-mat --dua-vao-clipboard <tệp>` rồi `--xoa-lich-su <tệp>`.
- Lịch sử Win+V trên máy đang BẬT ⇒ luôn để công cụ xoá mục khỏi lịch sử.

## 2. Việc cần làm

1. Rà tài liệu/hướng dẫn của repo (README thiết lập, `docs/`, `logs/STATE.md`, phiếu cũ còn mở) - chỗ nào bảo dán token
   vào chat/.env bằng tay ⇒ sửa theo phiếu điều phối mục 2-3.
2. Kiểm `.gitignore` có `.env*` (trừ `.env.example`); gitleaks/push protection theo SECURITY_BASELINE.
3. Liệt kê TÊN các bí mật repo dùng + nơi lưu (GitHub Actions secret / Cloudflare / Vercel / Render / `~/.config/tsudev/`)
   - phạm vi quyền vào mục 3 dưới (không ghi giá trị). Cái nào từng lộ trong chat/log ⇒ báo chủ dự án thay.
4. Ghi AKB của repo "áp dụng SEC1", đổi Trạng thái → ĐÓNG.

## 3. Bí mật của repo (agent điền - CHỈ TÊN)

| Tên                                                                                 | Nơi lưu                                           | Phạm vi                                                      | Ghi chú                                                                          |
| ----------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                      | Render env (`tsudev-backend`)                     | đọc/ghi DB Neon production                                   | lộ 17/11 (nhật ký phiên 58) ⇒ chủ dự án đã đổi; đổi lại phải sửa Render cùng lúc |
| `INTERNAL_IDENTITY_SECRET`                                                          | Render env + Cloudflare Worker secret             | ký/kiểm khẳng định danh tính BFF→service                     | hai nơi PHẢI giống nhau                                                          |
| `INTERNAL_API_TOKEN`                                                                | Render env + Worker + Worker cron                 | gác `/api` content/storage/identity                          |                                                                                  |
| `RELEASE_SIGNING_KEY` (+ `_RETIRED`)                                                | Render env                                        | ký bản phát hành Ed25519                                     | sao lưu ngoài máy; không xoay khi chưa chuyển khoá cũ vào RETIRED                |
| `TOTP_ENCRYPTION_KEY`                                                               | Render env                                        | mã hoá bí mật 2FA                                            | đổi = mọi thiết bị 2FA hỏng                                                      |
| `NEXTAUTH_SECRET`                                                                   | Cloudflare Worker secret                          | ký phiên next-auth                                           |                                                                                  |
| `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`                                      | Worker + Render                                   | đăng nhập OAuth                                              |                                                                                  |
| `RESEND_API_KEY`                                                                    | Render env; bản sao `~/.config/tsudev/resend.env` | gửi thư (tên miền tsudev.com)                                |                                                                                  |
| `PLAY_SERVICE_ACCOUNT_JSON`                                                         | Render env                                        | đọc giao dịch Google Play                                    |                                                                                  |
| `S3_ACCESS_KEY`/`S3_SECRET_KEY`                                                     | Render env                                        | bucket R2 `tsudev`                                           |                                                                                  |
| `CF_API_TOKEN`                                                                      | Render env                                        | Email Routing (bí danh thư)                                  |                                                                                  |
| `TELEGRAM_BOT_TOKEN`, `NEON_API_KEY`, `RELEASE_INTEGRITY_TOKEN`, `POST_VIEWS_TOKEN` | Worker cron `canh-site-cron` secret               | cảnh báo, giữ Neon ngủ, canh toàn vẹn                        | đặt bằng `npm run cron:secret-*`                                                 |
| `render.env`, `cloudflare*.env`, `virustotal.env`, `winget.env`                     | `~/.config/tsudev/` (chmod 600, ngoài repo)       | API Render (đọc log), DNS/Workers, VirusTotal, winget        | chỉ máy dev                                                                      |
| GitHub Actions                                                                      | -                                                 | workflow của repo không dùng secret nào ngoài `GITHUB_TOKEN` | đo 24/11/2026                                                                    |

## Kết quả xử lý

- 24/11/2026 - tsudev (phiên b5dd): (1) tài liệu - `docs/thiet-ke/tsu-tdd-v2.md` bỏ `read -rsp`, chuyển sang
  `tsu-nhan-bi-mat --stdout`; không chỗ nào khác bảo dán bí mật vào chat. (2) `.gitignore` có `.env`/`.env.*` trừ
  `*.example`; gitleaks quét toàn lịch sử ở `security-scan.yml`. (3) bảng mục 3. (4) AKB ghi "áp dụng SEC1". ĐÓNG.
