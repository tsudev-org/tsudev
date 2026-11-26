# PHIẾU CP1 - Trạm điều hành `console.tsudev.com` + cổng xác thực tập trung `id.tsudev.com`

- **Mã phiếu**: 20261126-CP1 - **Từ**: phiên tsudev-INT1b, 26/11/2026 - **Trạng thái**: MỞ
- **Yêu cầu chủ dự án (26/11/2026)**: trang quản lý/kiểm soát/giám sát/thao tác tập trung cho mọi thông tin, dữ liệu,
  tài nguyên của các website hệ TsuDEV, trên tên miền con riêng có công nghệ bảo mật mạnh (Cloudflare Access...); cổng
  đăng nhập/xác thực tập trung có tên miền con riêng với bộ luật bảo mật khắt khe; học kiến trúc `~/projects/ubnd`;
  chuyển trang bài viết/quản lý tài nguyên/nội dung/dữ liệu sang tên miền con; tuyệt đối không lộ lọt, không lỗi cấu hình.
- **Chuẩn**: tsudev-standards **v7.2.0** `docs/CONTROL_PLANE.md` (PR #89). **Quyết định**: [`docs/adr/0005`](../../docs/adr/0005-tram-dieu-hanh-va-cong-xac-thuc-tap-trung.md).
- **Quyền**: chủ dự án uỷ quyền agent tự chọn phương án kỹ thuật, commit/push/PR/gộp khi CI xanh, migrate Neon (sao lưu
  trước), deploy frontend, đo production. Dừng chỉ ở việc 👤 (dashboard Cloudflare Zero Trust, biến Render) và cổng Bảo
  vệ bản quyền.

## 0. Mọi phiên MUST đọc

1. `CONTROL_PLANE.md` (hết) + ADR-0005. Tham chiếu `ubnd` CHỈ ĐỌC (có phiên `ubnd-*` đang làm): `backend/src/middleware/kiemCloudflareAccess.ts`,
   `docs/DEPLOYMENT/CLOUDFLARE_ACCESS.md`, `docs/SECURITY/KHOA_ORIGIN_RENDER.md`, `docs/SECURITY/CANH_BAO_AN_NINH.md`,
   `docs/SECURITY/THOI_HAN_LUU_TRU.md`.
2. Bất biến: issuer `https://tsudev.com/oidc`, `rpID` passkey `tsudev.com`, `/api/me/entitlements`, `/api/rp/*`, bản kê
   phiên bản, JWKS, link tải - KHÔNG đổi URL. Mỗi cơ chế chặn mới đi `ghi` → số đo sạch → `chan`.
3. Mỗi phase một PR; thêm Worker ⇒ cập nhật `config/topology.json` + `npm run topology:gen`; thêm tiền tố route ⇒ sửa
   bảng `services/backend-bundle/src/index.ts`. Ghi AKB (decision/issue/lesson) mỗi phase.

## 1. Phase (MỖI PHIÊN MỘT PHASE)

| Phase                              | Việc                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 👤                                                                                                                     | Kiểm chứng                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **CP1** khoá origin                | `X-Tsu-Edge` (HMAC `<ts>.<METHOD>.<path>`, ≤ 300 s) ký ở mọi đường Worker → backend (`lib/api.ts`, proxy `pages/api/**`, `lib/entitlementProxy.ts`, OIDC proxy); middleware ở `backend-bundle` + từng service, `EDGE_MODE=tat\|ghi\|chan` (mặc định `ghi` khi có khoá), bộ đếm `thieu\|sai\|het_han` theo tiền tố + loại UA, đọc qua `/api/admin/edge-stats` (ADMIN); `/health` miễn                                                                                          | đặt `EDGE_SIGNING_KEY` trên Render (agent sinh vào `~/.config/tsudev/keys/edge.env`, `wrangler secret put` cho Worker) | test ký/kiểm, lệch giờ, phát lại khác path; đo production: gọi thẳng `*.onrender.com` ⇒ bộ đếm `thieu` tăng                 |
| **CP2** khung `console.`           | `apps/console` (Next 16, Workers, `console.tsudev.com` custom domain), `noindex`, CSP nonce + Trusted Types, `no-store`; middleware kiểm JWT Access (`CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD_CONSOLE`, `CF_ACCESS_MODE`); `@tsudev/identity-token` thêm `aud` + bí mật riêng `INTERNAL_IDENTITY_SECRET_CONSOLE`, `@tsudev/auth` `requireConsole()`; chuyển `/admin/accounts` (useradmin) sang `console.`; runbook `docs/console-access.md` (theo `ubnd` CLOUDFLARE_ACCESS.md) | tạo nhóm Zero Trust + ứng dụng Access `console.tsudev.com` (email chủ dự án), chép AUD tag; đặt biến Render + Worker   | test JWT Access giả/thiếu/sai `aud` (JWKS giả); route useradmin từ chối `aud=main`; đo: ẩn danh vào `console.` ⇒ màn Access |
| **CP3** dời toàn bộ điều hành      | chuyển `/admin/{content,projects,release-security,review,security,thanh-toan}`, `/author/*` (bài viết, tài liệu), bản kê phiên bản sang `console.`; `tsudev.com/admin/*`, `/author/*` ⇒ 308; gỡ proxy ghi điều hành khỏi `frontend-main`; test quét bundle `.open-next` công khai không có `/api/admin`, `/api/internal`, `useradmin`                                                                                                                                         | thêm email AUTHOR vào policy Access (nếu có người viết khác)                                                           | E2E smoke `console.` (Service Token Access); quét bundle; đo 308                                                            |
| **CP4** cổng `id.`                 | `apps/id` (`id.tsudev.com`): đăng nhập, đăng ký, 2FA, passkey, khôi phục, đồng ý OIDC (`interactions.url` → `id.`), bảo mật tài khoản; cookie `__Host-`; CSP nonce + Trusted Types, không tài nguyên ngoài; `tsudev.com/login` ⇒ 308; NextAuth của các Worker đăng nhập qua OIDC của chính hệ (`id.`) thay provider credentials cục bộ                                                                                                                                        | -                                                                                                                      | passkey cũ đăng nhập được ở `id.`; issuer không đổi (`/.well-known/openid-configuration`); Observatory A+ cho `id.`         |
| **CP5** giám sát + cảnh báo        | bảng An ninh ở `console.` (SecurityAuditLog, bộ đếm biên, 426/403, đăng nhập lạ); thư cảnh báo gom theo loại (≤ 1/5 phút) + nút diễn tập; kiểm toàn vẹn chuỗi `TrustAuditLog` theo lịch (`canh-site-cron`); step-up + lý do bắt buộc cho thao tác nguy hiểm (L6)                                                                                                                                                                                                              | hộp thư nhận cảnh báo                                                                                                  | diễn tập < 2 phút; sửa tay một dòng chuỗi ⇒ cảnh báo                                                                        |
| **CP6** điều hành website sản phẩm | bảng `EcosystemSite` + trang sổ website; quét sức khoẻ/TLS/tiêu đề bảo mật/`site.json` theo lịch; kênh lệnh ký Ed25519 (`kid` `tsu-console-2026`, JWKS công khai, danh mục lệnh cố định, chống phát lại); thư viện kiểm lệnh cho website sản phẩm (TS cho Workers/Pages) + phiếu gửi từng repo website                                                                                                                                                                        | migrate Neon                                                                                                           | test lệnh ký đúng/sai/hết hạn/phát lại; một website thật nhận lệnh xoá đệm                                                  |
| **CP7** siết + nghiệm thu          | chuyển `chan`: `CF_ACCESS_MODE`, `EDGE_MODE`, `X_TSU_APP_REQUIRED` (khi `SecurityAuditLog` hết `app_header_missing` 7 ngày); runbook cửa khẩn cấp; đo Observatory/SSL Labs cho ba vùng; checklist `CONTROL_PLANE.md` mục 9; đẩy ngược bài học vào bộ quy ước                                                                                                                                                                                                                  | đặt biến `chan` trên Render nếu agent bị chặn                                                                          | checklist mục 9 đủ ✅                                                                                                       |

## 2. Việc 👤 chủ dự án (agent nhắc, không chờ)

1. CP1: đặt `EDGE_SIGNING_KEY` trên Render (giá trị ở `~/.config/tsudev/keys/edge.env`).
2. CP2: dash.cloudflare.com → Zero Trust (Free) → team name → Access → Self-hosted `console.tsudev.com` (path trống),
   Allow theo email; chép AUD tag cho agent. Bật One-time PIN hoặc GitHub làm phương thức đăng nhập.
3. CP7: xác nhận ngày chuyển `chan` nếu agent bị bộ phân loại chặn ghi biến Render.

## 3. Kết quả xử lý

- 26/11/2026 - tsudev-INT1b: lập phiếu + ADR-0005; tsudev-standards v7.2.0 `CONTROL_PLANE.md` (PR #89). Kế tiếp: CP1.
- 26/11/2026 - tsudev-CP0b: khoá `EDGE_SIGNING_KEY` đã sinh ở `~/.config/tsudev/keys/edge.env` (600) - 👤 đặt lên Render
  (đặt sớm vô hại: mã CP1 chưa đọc biến này). Script `scripts/cloudflare-access-console.sh` (xem trước / `--ap-dung`)
  dựng tổ chức Zero Trust, One-time PIN, ứng dụng Access `console.tsudev.com` (phủ cả tên miền) + policy theo
  `~/.config/tsudev/console-access-emails.txt`, ghi `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD_CONSOLE` vào
  `~/.config/tsudev/keys/console-access.env`. Chủ dự án uỷ quyền agent tự chạy; còn chờ token API có quyền Access
  (`~/.config/tsudev/cloudflare-access.env`) - token `cloudflare.env` đã hết hạn, token DNS không có quyền Access.
- 26/11/2026 - tsudev-CP0b: 👤 đã đặt `EDGE_SIGNING_KEY` trên Render. Agent chạy `scripts/cloudflare-access-console.sh
--ap-dung`: tổ chức Zero Trust có sẵn `purple-cake-8f2a.cloudflareaccess.com` (JWKS `/cdn-cgi/access/certs` 200),
  One-time PIN, ứng dụng Access `console.tsudev.com` (phủ cả tên miền, phiên 24 giờ, cookie HttpOnly/Lax/binding) +
  policy Allow 1 email; `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD_CONSOLE` ở `~/.config/tsudev/keys/console-access.env`.
  Chạy lại không đổi gì (idempotent). `console.` chưa có DNS - CP2 deploy Worker với `custom_domain` rồi đo ẩn danh ⇒ màn Access.
