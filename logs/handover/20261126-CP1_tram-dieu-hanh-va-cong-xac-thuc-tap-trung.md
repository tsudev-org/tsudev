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
| **CP1** khoá origin ✅ (ghi)       | `X-Tsu-Edge` (HMAC `<ts>.<METHOD>.<path>`, ≤ 300 s) ký ở mọi đường Worker → backend (`lib/api.ts`, proxy `pages/api/**`, `lib/entitlementProxy.ts`, OIDC proxy); middleware ở `backend-bundle` + từng service, `EDGE_MODE=tat\|ghi\|chan` (mặc định `ghi` khi có khoá), bộ đếm `thieu\|sai\|het_han` theo tiền tố + loại UA, đọc qua `/api/admin/edge-stats` (ADMIN); `/health` miễn                                                                                          | đặt `EDGE_SIGNING_KEY` trên Render (agent sinh vào `~/.config/tsudev/keys/edge.env`, `wrangler secret put` cho Worker) | test ký/kiểm, lệch giờ, phát lại khác path; đo production: gọi thẳng `*.onrender.com` ⇒ bộ đếm `thieu` tăng                 |
| **CP2** khung `console.` ✅ mã     | `apps/console` (Next 16, Workers, `console.tsudev.com` custom domain), `noindex`, CSP nonce + Trusted Types, `no-store`; middleware kiểm JWT Access (`CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD_CONSOLE`, `CF_ACCESS_MODE`); `@tsudev/identity-token` thêm `aud` + bí mật riêng `INTERNAL_IDENTITY_SECRET_CONSOLE`, `@tsudev/auth` `requireConsole()`; chuyển `/admin/accounts` (useradmin) sang `console.`; runbook `docs/console-access.md` (theo `ubnd` CLOUDFLARE_ACCESS.md) | tạo nhóm Zero Trust + ứng dụng Access `console.tsudev.com` (email chủ dự án), chép AUD tag; đặt biến Render + Worker   | test JWT Access giả/thiếu/sai `aud` (JWKS giả); route useradmin từ chối `aud=main`; đo: ẩn danh vào `console.` ⇒ màn Access |
| **CP3** dời toàn bộ điều hành ✅   | chuyển `/admin/{content,projects,release-security,review,security,thanh-toan}`, `/author/*` (bài viết, tài liệu), bản kê phiên bản sang `console.`; `tsudev.com/admin/*`, `/author/*` ⇒ 308; gỡ proxy ghi điều hành khỏi `frontend-main`; test quét bundle `.open-next` công khai không có `/api/admin`, `/api/internal`, `useradmin`                                                                                                                                         | thêm email AUTHOR vào policy Access (nếu có người viết khác)                                                           | E2E smoke `console.` (Service Token Access); quét bundle; đo 308                                                            |
| **CP4** cổng `id.` ⏳ CP4a mã      | `apps/id` (`id.tsudev.com`): đăng nhập, đăng ký, 2FA, passkey, khôi phục, đồng ý OIDC (`interactions.url` → `id.`), bảo mật tài khoản; cookie `__Host-`; CSP nonce + Trusted Types, không tài nguyên ngoài; `tsudev.com/login` ⇒ 308; NextAuth của các Worker đăng nhập qua OIDC của chính hệ (`id.`) thay provider credentials cục bộ                                                                                                                                        | -                                                                                                                      | passkey cũ đăng nhập được ở `id.`; issuer không đổi (`/.well-known/openid-configuration`); Observatory A+ cho `id.`         |
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
- 26/11/2026 - tsudev-CP1: **CP1 xong ở chế độ `ghi`** (PR #414). `edgeGuard()` (`packages/auth/src/edge.ts`) gắn đầu
  tiên ở content/storage/auth; ký ở mọi đường Worker → backend (`internalHeaders(method, url)` / `edgeHeaders` ở
  `lib/services.ts`: BFF, `lib/api.ts`, OIDC, quyền lợi, JWKS, bản kê) và Worker cron (`fetchCoKy`, WebCrypto);
  `GET /api/admin/edge-stats` (ADMIN); `EDGE_SIGNING_KEY_PREV` cho xoay khoá. Test: vectơ chung 3 bên, lệch giờ,
  phát lại khác path/method, ghi/chan/tat, quét nguồn proxy. `wrangler secret put EDGE_SIGNING_KEY` cho Worker
  `tsudev` + `tsudev-newsroom-cron`, deploy cả hai. Render deploy `aeab126` **update_failed** - container treo không
  log dòng nào 15 phút (mã khởi động bình thường ở máy: health 200, bộ đếm `[edge] thieu|GET /api/posts|cong-cu`);
  PR tài liệu kế tiếp kích deploy lại. Kiểm `app_header_missing` 7 ngày: còn 2 dòng (26/11, `clientId` null) ⇒ CHƯA
  bật `X_TSU_APP_REQUIRED`. Kế tiếp: **CP2** (khung `console.`). Tiêu chí `EDGE_MODE=chan` (CP7): 7 ngày log `[edge]`
  không còn nguồn hợp lệ.
- 26/11/2026 - tsudev-CP2: **mã CP2 xong**. `apps/console` (Worker `tsudev-console`: proxy kiểm JWT Access, CSP nonce +
  Trusted Types, `no-store`, `noindex`, tắt `workers.dev`; `/accounts`, `/api/account/*` ký vùng `console`),
  `@tsudev/identity-token` thêm vùng + `verifyAccessJwt`, `requireConsole()` gác `useradmin/*` (trừ `/security`) khi
  backend có `INTERNAL_IDENTITY_SECRET_CONSOLE`; chữ ký biên hợp lệ thay `INTERNAL_API_TOKEN`; khoá `EDGE_SIGNING_KEY_CONSOLE`.
  Chuyển dần: `/admin/accounts` cũ chạy song song (thân trang ở `components/admin/AccountsAdmin.tsx`).
  Còn 👤: `console-secrets.sh --xoay-nextauth` (đăng xuất mọi phiên một lần) + 4 biến Render (`docs/console-access.md` mục 2).
  Kế tiếp: **CP3** (sau khi 👤 xong và đo `console.` đạt).
- 26/11/2026 - tsudev-CP2 (triển khai): gộp #417 (`6323f28`), Render `live`, deploy `tsudev` (`deploy-2026.11.26.5`) +
  `tsudev-console`, đặt secret + xoay `NEXTAUTH_SECRET`; đo ẩn danh `console.` ⇒ 302 Access, `tsudev.com` không hồi quy.
  Lượt deploy console đầu treo ở bước đẩy, chạy lại `CI=true < /dev/null` đạt (nguyên nhân chưa xác định).
  Còn 👤: 4 biến Render + đăng nhập mở `console./accounts`; rồi đo `edge-stats.hasConsoleKey`, log `[access]`.
- 26/11/2026 - tsudev-CP2 (chốt): 👤 đã đặt 4 biến Render, deploy `live`. Backend nhận chữ ký biên khoá console (đo GET).
  Còn một phép đo cần 👤: OWNER mở `console./accounts`, rồi đọc log Render `[access]`/`[console]`. Đạt mới làm **CP3**.
- 27/11/2026 - tsudev-bc: ACC1 (bảo mật tài khoản, điều kiện trước CP3) xong - PR #422, `deploy-2026.11.27.1`. Kế tiếp: **CP3**.
- 27/11/2026 - tsudev-CP3: **CP3 xong** - PR #424 (`2ef7635`), Render `live`, `tsudev-console` (version `6e42b4ed`,
  deploy từ nhánh trước khi gộp) + `tsudev` `deploy-2026.11.27.2` (version `0cc3269e`), `npm run r2:cors` (R2 CORS chỉ
  còn `https://console.tsudev.com`, tài khoản `9541f44e...`). Đã dời sang `apps/console`: admin (content, projects,
  release-security, review, security, thanh-toan, accounts; bỏ tiền tố `/admin`), Studio/author, proxy
  `api/content` + `api/storage` + `useradmin|payadmin|alias` (ký vùng `console`); CSP nonce + Trusted Types `default`
  dùng DOMPurify 3.5.0. `frontend-main`: gỡ proxy `api/content`, `api/storage`, `useradmin|payadmin|alias`;
  `/admin*`, `/studio*`, `/author*` ⇒ 308 sang `console.`. Backend: `requireConsole()` gác `/api/admin`, `/api/author`
  (content), presign/upload (storage), `useradmin/*`, `payadmin/*`, `alias/*` (auth), trước nó là `consoleRateLimit`
  (300/phút theo tài khoản); bản kê đổi đường backend sang `/api/pipeline/versions/:product/:channel` (đường cũ
  `/api/internal/versions` giữ MỘT nhịp - gỡ ở phase sau). Cổng mới: `scripts/check-public-bundle.js` (CI, sau bước
  build) + test vùng ở ba service. Số đo production 10:15 27/11: `console.` ẩn danh ⇒ 302 Access; `/admin`,
  `/admin/projects`, `/studio`, `/studio/posts/new`, `/author` ⇒ 308 đúng đích; `/`, `/blog`, `/docs`, `/projects`,
  `/apps`, `versions.json` 200 đủ nội dung; `/api/content/admin/projects`, `/api/storage/presign` công khai 404;
  providers = credentials, passkey, qr, github, google; log Render 100 dòng gần nhất không có `[access]`,
  `console_required`, lỗi. Còn 👤: dismiss 12 cảnh báo CodeQL "Missing rate limiting" của #424 (false positive -
  CodeQL không mô hình hoá `createRateLimit`); thêm email tác giả khác vào policy Access nếu có; mở thử `console.`
  một lượt (duyệt, soạn bài, tải tệp lên R2). Kế tiếp: **CP4** (`id.tsudev.com`).
- 27/11/2026 - tsudev-CP4: **CP4a xong phần mã, CHỜ 👤 trước khi gộp** - PR #426 (nhánh `feat/cp4-id`, commit cuối
  `f2c63fa`). CP4 chia hai nhịp: **CP4a** (cổng chạy thật, giữ cookie phiên chung `.tsudev.com` làm cầu - không đăng
  xuất ai) và **CP4b** (cookie `__Host-` ở `id.`, main + console thành RP OIDC, Google/GitHub callback sang `id.`,
  Observatory A+). Đã làm: `.standards` -> v9.0.0; `apps/id` (Worker `tsudev-id`, `id.tsudev.com`, version
  `24c1f1ff`) giữ provider credentials/passkey/qr (`NEXTAUTH_ZONE=id`), các trang login, signup, quên/đặt lại mật khẩu,
  xác minh email, đổi email, thu hồi phiên, settings/security + profile, trang đồng ý OIDC (form POST về
  `tsudev.com/oidc/interaction/<uid>/confirm` - giữ cookie `_interaction`), trang QR `/x/<id>`; CSP nonce +
  Trusted Types, Turnstile là ngoại lệ ngoài duy nhất, mọi trang SSR (`_app.getInitialProps` - trang tĩnh không mang
  nonce, bản deploy đầu kẹt "Đang tải…", E2E bắt được). Backend: `interactions.url` tuyệt đối `ID_URL`, passkey
  `expectedOrigin` = [main, id] (rpID giữ `tsudev.com`), vùng khẳng định danh tính `id` (aud `tsudev-services:id`,
  khoá `INTERNAL_IDENTITY_SECRET_ID`, quyền ngang main, không vào `requireConsole`). Main (CHƯA deploy): 308 các trang
  tài khoản + `/oidc/interaction/:uid` + `/x/:id` sang `id.`; mã QR vẫn in `tsudev.com/x/` (T9); NextAuth main chỉ
  Google/GitHub; cầu `tsudev.com/oauth-start` cho nút Google/GitHub ở cổng tới CP4b. Kèm: gỡ `/api/internal/versions`;
  bộ đệm bền cặp `versions.json` trong R2 `NEXT_INC_CACHE_R2_BUCKET`; cron `canh-site-cron` báo động khi bản kê khác 200. Rà "một cổng đăng nhập": `.central-login-allow` + phiếu `20261127-LOGIN1` (MỞ). Số đo production `id.` (sau
  `24c1f1ff`): `/login` 200 + CSP nonce/strict-dynamic, HSTS preload, COOP/CORP, `no-store`; providers = credentials,
  passkey, qr; trình duyệt headless không còn lỗi CSP, `/settings/profile` vẽ xong. **Thứ tự còn lại (đừng đảo)**:
  (1) 👤 đặt biến Render `INTERNAL_IDENTITY_SECRET_ID` cho `tsudev-backend` (giá trị ở
  `~/.config/tsudev/keys/id.env`, 600) - thiếu thì trang tài khoản ở `id.` 401, đăng nhập vẫn chạy; (2) 👤
  `nguyentrangtinhsu` Approve #426 + Re-run "Bảo vệ bản quyền"; 👤 dismiss 12 cảnh báo CodeQL "Missing rate limiting"
  của #426 (false positive cùng loại #424 - route đều dưới `createRateLimit`; bộ phân loại chặn agent dismiss);
  (3) gộp #426 -> Render tự deploy (không migration); (4) deploy `tsudev` (main) + cron `tsudev-newsroom-cron`; đo
  issuer `/.well-known/openid-configuration` không đổi, `tsudev.com/login` 308, `tsudev.com/api/auth/providers` chỉ
  google/github, `versions.json` 200; (5) 👤 thử passkey cũ đăng nhập ở `id.`. Rồi mới CP4b.
