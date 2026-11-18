# PHIẾU BÀN GIAO - `/oidc/*` trên tsudev.com trả 429 "Just a moment..." (đăng nhập OIDC hỏng)

- **Mã phiếu**: 20261118-QT2
- **Từ**: agent-qulythuchi (repo `tsudev-org/qulythuchi`) - **Đến**: phiên repo `tsudev` / chủ dự án (OWNER)
- **Thời điểm**: 18/11/2026 ~11:30 (giờ VN)
- **Trạng thái**: ĐÓNG (18/11/2026 04:34 UTC) - lỗi tự hết sau vài phút, `/oidc/*` trả 200 lại; nghiệm thu đăng nhập qulythuchi đạt. Giữ phiếu làm bằng chứng: nên xem luật rate-limit/challenge nào trên `/oidc/*` có thể bắn vào lưu lượng máy chủ-máy chủ (Worker client OIDC).
- **Nhánh git**: chưa có

## 1. Triệu chứng (đo 18/11/2026 04:28-04:35 UTC)

| Yêu cầu                                                                         | Kết quả                                                                                |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET https://tsudev.com/oidc/.well-known/openid-configuration`                  | **429**, thân là trang thử thách Cloudflare "Just a moment...", header `x-opennext: 1` |
| `GET https://tsudev.com/oidc/jwks`, `/oidc/auth`, `/oidc/token`                 | **429** như trên (5/5 lần)                                                             |
| `GET https://tsudev.com/`                                                       | 200                                                                                    |
| `GET https://tsudev-backend.onrender.com/health`                                | 200                                                                                    |
| `GET https://tsudev-backend.onrender.com/oidc/.well-known/openid-configuration` | **200**, JSON discovery đúng                                                           |

Người dùng thấy: `https://qulythuchi.tsudev.com/auth/app/start?...` ⇒
`{"code":"idp_unavailable","message":"Máy chủ tài khoản tsudev trả lỗi 429."}`.

## 2. Phán đoán nguyên nhân (chưa kiểm chứng trong dashboard)

`x-opennext: 1` + thân HTML thử thách ⇒ trang thử thách KHÔNG do vùng tsudev.com chặn trực tiếp mà do Worker
`frontend-main` chuyển tiếp (`next.config.js` luật `/oidc/:path...` → `/api/oidc/:path` → `CONTENT_SERVICE_URL`
= `https://tsudev-backend.onrender.com`), và **phía Render (cũng sau Cloudflare) đang thử thách lưu lượng đi ra từ
Cloudflare Workers**, rồi Worker trả nguyên 429 + HTML đó về. Gọi thẳng Render từ máy thường thì 200.

Phiên 59 (17/11) còn đo `/oidc/auth?client_id=sounddb` ⇒ 303, nên đây là thay đổi mới (phía Render/Cloudflare,
có thể chập chờn theo IP egress của Worker).

Lưu ý thêm: discovery công bố `token_endpoint`/`jwks_uri` ở `tsudev-backend.onrender.com` (đã nêu ở phiếu SD1) ⇒
máy chủ qulythuchi/sound-db (cũng là Worker) gọi thẳng Render ở bước đổi mã cũng có thể dính thử thách này.

## 3. Việc cần làm

- [ ] Xác nhận nguyên nhân: log Worker `frontend-main` cho `/api/oidc/*` (status từ upstream), hoặc gọi Render từ
      một Worker thử.
- [ ] Hướng xử lý gợi ý (phiên tsudev chọn): đặt backend sau tên miền riêng trong vùng tsudev.com (vd custom domain
      Render `api.tsudev.com` hoặc proxy không qua challenge), để discovery công bố endpoint dưới tsudev.com; hoặc
      tìm và bỏ thứ đang bật thử thách cho lưu lượng Worker → Render.
- [ ] Không cần đổi gì ở qulythuchi: máy chủ đọc endpoint từ discovery, không ghi cứng.

## 4. Tiêu chí hoàn thành

`curl -s -o /dev/null -w '%{http_code}' https://tsudev.com/oidc/.well-known/openid-configuration` ⇒ **200** ổn định,
và `https://qulythuchi.tsudev.com/auth/web/start` dẫn tới trang đăng nhập tsudev.com (không còn `idp_unavailable`).
Sau đó báo agent-qulythuchi để chạy lại `dart run tool/sync_smoke.dart login` (nghiệm thu P6).
