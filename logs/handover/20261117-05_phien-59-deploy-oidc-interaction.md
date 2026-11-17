# PHIẾU BÀN GIAO - Phiên 59: deploy bản sửa 404 trang OIDC interaction

- **Mã phiếu**: 20261117-05
- **Phiên**: phiên 59, 17/11/2026 tối - nối phiếu 20261117-04 (phiên 58 bị tắt đột ngột sau khi merge #310)
- **Trạng thái**: MỞ (mục 2)
- **Khoá**: không giữ khoá nào. Không tác vụ nền.

## 1. Đã xong

| Việc                                                                | Nơi                                                                                             | Số đo                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Phát hiện #310 đã merge nhưng CHƯA deploy (phiên 58 tắt giữa chừng) | `git merge-base --is-ancestor 92b1d4b deploy-2026.11.17.8` ⇒ không                              | production `/oidc/interaction/abc` ⇒ 404 text/plain            |
| Deploy frontend                                                     | `deploy-2026.11.17.9`, Worker `cef19fd9`                                                        | test `oidcRewrites` 4/4 trước khi dựng                         |
| Nghiệm thu luồng OIDC Sound Db                                      | `GET /oidc/auth?client_id=sounddb&redirect_uri=https://sounddb.tsudev.com/auth/callback&...`    | 303 → `/oidc/interaction/<uid>` ⇒ 307 `/login?callbackUrl=...` |
| Nghiệm thu chung                                                    | `/` `/apps` `/blog` `/docs` 200; `/api/auth/providers` chỉ credentials, passkey, github, google |                                                                |

## 2. Còn lại

1. 🔐 👤 ĐỔI mật khẩu Neon (đã lộ ở phiên 58) → sửa Render `DATABASE_URL` → xoá `~/.config/tsudev/neon.env`.
2. ✅ tsudev-standards **v3.7.0** (#56, thẻ + Release 17/11): `VERSIONING.md` v3 + `DISTRIBUTION_TRUST.md` (cài không bị
   chặn trên Windows/macOS/Linux/Android/iOS) + cổng 5b. Còn: `./scripts/sync-standards.sh` lên v3.7.0 (P0 của phiếu
   `~/projects/logs/handover/20261117-P2_ke-hoach-phan-phoi-tin-cay-da-nen-tang.md`), rồi mục 3 hàng 13 của phiếu đó.
3. ✅ Mục 2.1 + 2.3 phiếu 20261117-02 (gói duyệt, chủ dự án bấm duyệt 17/11 tối): `xuat-ban` 43613604585 đã xong từ
   trước; merge linux-packages #29 #27, scoop-bucket #12, homebrew-tap #6, trafficmonitor #69 (squash `2f02d0c` - sửa
   CodeQL #6: kiểm mã winget trước khi gọi mạng; cảnh báo đóng "won't fix"). `xuat-ban` 44110855163 ⇒ APT/RPM có Sound
   Db `26.11.1705-1`; `tools/doi-chieu-kenh.mjs` từ `main` ⇒ 0 lệch. Mục 2.4-2.8 - không đổi.
4. Đăng nhập thật end-to-end ở Sound Db (cần tài khoản thật + trình duyệt) - phiên sound-db đo phía client.

## 3. Bẫy mới

- 🪤 "Merged" không có nghĩa "đã lên production": deploy frontend là bước TAY sau merge. Đầu phiên kiểm
  `git merge-base --is-ancestor <commit> <thẻ deploy mới nhất>`.
- 🪤 Repo có ruleset `required_signatures` (trafficmonitor): commit tạo trong bản clone tạm KHÔNG được ký (cấu hình ký
  SSH nằm ở `.git/config` của bản cục bộ) ⇒ PR BLOCKED dù check xanh + đã duyệt. Sửa ở bản cục bộ, hoặc nhờ chủ dự án
  ký lại (bộ phân loại chặn agent dùng khoá ký + force-push).
- 🪤 Workflow mới merge có `workflow_dispatch` vẫn có thể trả 422 khi chạy tay (GitHub giữ bản ghi từ lần chạy trên PR):
  chạy thẳng script, hoặc đợi lịch.
