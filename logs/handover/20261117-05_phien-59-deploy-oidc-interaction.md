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
2. 🧭 Phiếu V1: chờ tsudev-standards v3.7.0 (đo 17/11: bản mới nhất v3.6.0, repo đang ở v3.6.0) rồi `sync-standards.sh`.
3. Mục 2.1, 2.3-2.8 phiếu 20261117-02 (👤 / ⛔ `nguyentrangtinhsu` / repo khác) - không đổi.
4. Đăng nhập thật end-to-end ở Sound Db (cần tài khoản thật + trình duyệt) - phiên sound-db đo phía client.

## 3. Bẫy mới

- 🪤 "Merged" không có nghĩa "đã lên production": deploy frontend là bước TAY sau merge. Đầu phiên kiểm
  `git merge-base --is-ancestor <commit> <thẻ deploy mới nhất>`.
