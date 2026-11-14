# Kế hoạch thực thi - Bảo mật tài khoản toàn hệ, CMS "Viết bài", cài mọi app bằng lệnh

- **Phiên lập**: 52 (13/11/2026), **chốt phương án**: 14/11/2026 - chủ dự án giao agent tự chọn phương án chuyên
  nghiệp và hiện đại nhất. Mọi mục 🎯 cũ đã CHỐT ở bảng "Quyết định" dưới đây; phiên sau làm theo, KHÔNG hỏi lại.
- **Kế hoạch tổng của toàn hệ sinh thái** (các repo khác + phiếu tồn): `~/projects/logs/handover/20261114-01_ke-hoach-tong-he-sinh-thai.md`.
- **Nguồn tham chiếu (chỉ đọc)**: `~/projects/ubnd/20261027-SPEC-SEC-2026-V2-nen-tang-bao-mat-chong-xam-nhap-ubnd.md`
  (8 tầng), `~/projects/ubnd/backend/src/modules/cms/` + `frontend-quantri/src/pages/cms/` (CMS quantri),
  `docs/security-plan.md` (G1-G12), `.standards/docs/RICH_TEXT_EDITOR.md`, `.standards/docs/DATA_TABLE.md`.

## Quyết định (CHỐT 14/11/2026)

| #   | Câu hỏi                        | Chốt                                                                                                                                                          | Vì sao (và đã bác gì)                                                                                                                                                              |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Tài khoản chung `*.tsudev.com` | **tsudev.com làm nhà cung cấp OpenID Connect**, thư viện `oidc-provider` (panva, có chứng nhận OpenID) chạy trong auth-service. Chỉ Authorization Code + PKCE | Chuẩn mở, mỗi site con giữ phiên riêng, thu hồi tập trung. BÁC cookie `Domain=.tsudev.com` (một site con bị XSS = lộ phiên mọi site) và tự viết OIDC (sai một chi tiết là lỗ hổng) |
| D2  | Kênh "phản ánh kiến nghị"      | **CÓ** - "Góp ý & báo lỗi ứng dụng", BẮT đăng nhập + Turnstile + giới hạn tần suất; trả lời công khai; nội dung người gửi được duyệt trước khi hiện           | Biến /apps thành kênh hỗ trợ thật; ẩn danh = rác + rủi ro nội dung                                                                                                                 |
| D3  | Trình soạn thảo CMS            | **Tiptap 3** (⭐ của RICH_TEXT_EDITOR.md) + extension Markdown chính thức; **`contentMd` vẫn là nguồn sự thật duy nhất**                                      | Không phải chuyển dữ liệu cũ; render/ISR/tìm kiếm giữ nguyên. BÁC lưu song song JSON + Markdown (hai nguồn sự thật lệch nhau im lặng). Ghi ADR                                     |
| D4  | Cài nhiều app một lệnh         | **CÓ** - `install.ps1`/`install.sh` nhận nhiều tên gói, mỗi gói đi qua trình quản lý gói chính thức (winget/Scoop/Homebrew/APT/DNF), không tải nhị phân trần  | Một nguồn sự thật (catalog); chữ ký do trình quản lý gói kiểm. Tệp ở vùng bảo vệ ⇒ PR + chủ sở hữu duyệt                                                                           |
| D5  | Ký mã Windows                  | **SignPath Foundation** (miễn phí cho mã nguồn mở), ký trong GitHub Actions                                                                                   | Hết SmartScreen; khoá không rời HSM. Chủ dự án tự nộp đơn (agent chuẩn bị hồ sơ + workflow)                                                                                        |
| D6  | La bàn (Android, độc quyền)    | **Giữ nguyên**: APK có chữ ký + trang sản phẩm; khai ngoại lệ có lý do trong cổng C4                                                                          | Không có kênh lệnh hợp lý cho APK độc quyền                                                                                                                                        |
| D7  | Kiểm mật khẩu lộ               | HIBP k-anonymity (chỉ gửi 5 ký tự đầu SHA-1), **fail-open có log** khi HIBP không trả lời                                                                     | Mất mạng tới HIBP không được chặn đăng ký; log cho biết tỉ lệ bỏ qua                                                                                                               |
| D8  | Bộ đếm tần suất (G9)           | **Bảng Postgres** `RateLimitBucket`, upsert nguyên tử theo cửa sổ cố định                                                                                     | 0đ, không thêm dịch vụ; sống qua khởi động lại và nhiều bản chạy. BÁC Redis/Upstash (thêm phụ thuộc + hạn mức)                                                                     |
| D9  | Chống bot                      | **Cloudflare Turnstile** ở đăng ký, quên mật khẩu, góp ý, và đăng nhập sau 3 lần sai                                                                          | Miễn phí, không theo dõi người dùng như reCAPTCHA                                                                                                                                  |

## Giai đoạn và thứ tự

Mỗi dòng ≈ một PR. ⛔ = chạm vùng bảo vệ, cần chủ sở hữu duyệt trên GitHub. 👤 = chỉ chủ dự án làm được.

### P0 - Dọn nền (phiên 53, mở đầu)

1. #252 (footer "Bảo mật tài khoản"): chủ sở hữu duyệt ⇒ `gh run rerun` cổng Bảo vệ bản quyền ⇒
   `gh pr update-branch 252` ⇒ merge ⇒ deploy ⇒ ảnh footer khi đã đăng nhập.
2. qa-test: sửa E2E chập chờn ở test đầu tiên - `globalSetup` gọi trước (warm-up) các trang admin/author trên
   `next dev` rồi mới chạy test. Nghiệm thu: 3 lượt CI liên tiếp xanh không rerun.
3. Đối soát phiếu tồn của repo này (danh sách ở kế hoạch tổng mục 2): mỗi phiếu ⇒ kiểm mã/production ⇒ đổi dòng
   Trạng thái thành `ĐÓNG - <lý do/PR>` hoặc chuyển việc thật còn lại vào kế hoạch này. Phiếu Toà soạn/Con dấu ⇒
   `ĐÓNG - tính năng đã gỡ (29/10, 04/11/2026)`.

### P1 - Bảo mật tài khoản (1-2 phiên)

| #    | Việc                                                                                                                                                                                                                                                         | Vùng                                 | Nghiệm thu                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------- |
| P1.1 | **Thẻ "Mức an toàn"** đầu `/settings/security`: `POST /api/identity/security/posture` trả từng mục (email xác minh, TOTP, passkey, mã dự phòng còn lại, mật khẩu không lộ theo lần kiểm gần nhất); mỗi mục thiếu là một nút làm ngay. Mở `ALLOWED` của proxy | backend-api, frontend-web            | test route + test proxy; ảnh 390/1280                         |
| P1.2 | **Ép 2FA từ AUTHOR** (nay chỉ ADMIN): mở rộng nhánh `MFA_REQUIRED` cho đường ghi của content-service + trang `/author`. Seed: `bob` có TOTP (cập nhật E2E `upload.spec.js`)                                                                                  | backend-api, data-schema (seed), qa  | AUTHOR không TOTP ⇒ 403 `MFA_REQUIRED` + trang hướng dẫn      |
| P1.3 | **Step-up** (`requireStepUp`) cho: đổi email, đổi mật khẩu, tắt TOTP, xoá passkey, tạo lại mã dự phòng                                                                                                                                                       | backend-api, frontend-web            | thiếu step-up ⇒ 401 `STEP_UP_REQUIRED` (test từng route)      |
| P1.4 | **Mật khẩu lộ (D7)** khi đăng ký / đặt lại / đổi mật khẩu; lưu `passwordCheckedAt` + `passwordBreached` cho P1.1                                                                                                                                             | backend-api, data-schema (migration) | mock HIBP: lộ ⇒ 400 nói rõ lý do; HIBP lỗi ⇒ cho qua + log    |
| P1.5 | **Cảnh báo đăng nhập thiết bị mới** qua `mailer.ts`: khoá thiết bị = họ trình duyệt + hệ điều hành + quốc gia (`CF-IPCountry`), lưu dạng băm; email có nút "Không phải tôi" ⇒ thu hồi mọi phiên (`sessionVersion++`)                                         | backend-api                          | thiết bị cũ không gửi; thiết bị mới gửi đúng một lần          |
| P1.6 | **Bộ đếm tần suất Postgres (D8)**: bảng `RateLimitBucket(key, windowStart, count)` + dọn bản ghi hết hạn trong cron đã có                                                                                                                                    | data-schema, backend-api             | 20 yêu cầu đồng thời ⇒ đúng ngưỡng; khởi động lại không reset |
| P1.7 | **Turnstile (D9)**: widget ở signup / forgot-password / login sau 3 lần sai; kiểm token ở auth-service (`TURNSTILE_SECRET_KEY`); thiếu khoá ở production ⇒ từ chối khởi động (như `RELEASE_SIGNING_KEY`)                                                     | frontend-web, backend-api, infra     | CSP thêm `challenges.cloudflare.com`; test quét nguồn CSP     |
| P1.8 | **Header HTTP**: đo `curl -sI https://tsudev.com` rồi bổ sung phần còn thiếu trong `COOP same-origin`, `CORP same-site`, `Permissions-Policy` tối thiểu, HSTS `preload`; test quét nguồn canh                                                                | frontend-web                         | test + curl                                                   |
| P1.9 | **G12**: script sao lưu DB mã hoá bằng `age` (khoá công khai trong repo, khoá riêng chủ dự án giữ). **G11**: hướng dẫn sao lưu khoá ký ngoại tuyến                                                                                                           | infra                                | giải mã thử thành công một bản dump                           |

👤 Chủ dự án: tạo widget Turnstile (hoặc cấp token API có quyền Turnstile) + đặt `TURNSTILE_SECRET_KEY` ở Render; bật
WAF Managed Rules (gói free) + 1 rate-limit rule cho `/api/auth/*` ở dashboard Cloudflare; đặt `VIRUSTOTAL_API_KEY`,
`RELEASE_INTEGRITY_TOKEN` (G4, G5 - còn treo từ 06/11).

### P2 - CMS "Viết bài" theo khuôn quantri (2-3 phiên)

Thứ tự bắt buộc: migration lên Neon TRƯỚC (kèm `pg_dump` 18), merge SAU. Giữ cột `published` thêm một bản phát hành
để đọc ngược, rồi mới gỡ.

| #    | Việc                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P2.1 | **Schema**: enum `PostStatus {DRAFT PENDING SCHEDULED PUBLISHED ARCHIVED}` + `Post.status` (backfill từ `published`/`publishedAt`), `PostRevision` (chỉ-thêm: postId, contentMd, title, editorId, createdAt), `Category` (slug, tên, thứ tự), `Post.categoryId`, `Post.pinnedAt`, `Post.reviewNote`, `PostViewDaily(postId, day, count)`                                                                                                                                                                     |
| P2.2 | **API content-service** dưới `/api/author/*` và `/api/admin/*`, tự gọi `requireAuthor`/`requireModerator`: danh sách có lọc + phân trang; máy trạng thái DRAFT→PENDING→(PUBLISHED \| SCHEDULED \| DRAFT kèm lý do)→ARCHIVED; AUTHOR chỉ gửi duyệt, MODERATOR+ đăng/duyệt/ghim; mỗi lần lưu ghi `PostRevision`; mỗi chuyển trạng thái ghi nhật ký. Đường đọc công khai: `status=PUBLISHED AND publishedAt<=now()`. Tiền tố mới phải vào bảng của `backend-bundle`                                             |
| P2.3 | **Trang**: `/author` tổng quan (đếm theo trạng thái, lượt xem 7/30 ngày) · `/author/posts` bảng chuẩn DATA_TABLE (tìm tiếng Việt bỏ dấu, lọc trạng thái/chuyên mục/thẻ, URL giữ bộ lọc) · `/author/posts/new` + `/author/posts/[id]` hai cột: trái Tiptap (D3) + xem trước, phải hộp Xuất bản / Chuyên mục / Thẻ / Ảnh bìa / SEO + xem trước thẻ chia sẻ / Nguồn; tự lưu nháp mỗi 10 giây; cảnh báo khi rời trang · `/author/posts/[id]/history` so sánh + khôi phục · `/admin/content` thành hàng chờ duyệt |
| P2.4 | `/admin/categories`, gộp thẻ trùng; ADR chọn Tiptap (`docs/adr/`); kiểm gõ tiếng Việt thủ công với 2 bộ gõ (ghi kết quả vào ADR)                                                                                                                                                                                                                                                                                                                                                                             |
| P2.5 | **Góp ý & báo lỗi (D2)**: model `Feedback(appId, kind BUG\|IDEA, title, body, status RECEIVED\|IN_PROGRESS\|DONE\|REJECTED, reply, userId, approvedAt)`; trang `/apps/[id]/gop-y` (đối chiếu `docs/url-convention.md`), `/admin/feedback`; Turnstile + P1.6                                                                                                                                                                                                                                                  |

Nghiệm thu P2: unit cho máy trạng thái (mọi cạnh cấm ⇒ 409); E2E: AUTHOR viết → gửi duyệt → MODERATOR duyệt → bài hiện
trên `/blog` sau revalidate; ISR vẫn 200 khi tắt backend; công cụ quét giao diện ra OK trên các trang mới.

### P3 - Cài mọi app bằng lệnh (toàn hệ)

| #   | Việc                                                                                                                                                                                                                                                                                  | Ở đâu                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| C1  | winget cho TsuFiles, Lotus Share, tsudev-contact (+ theo dõi PR winget-pkgs #477193 của trafficmonitor): bước `komac` trong workflow phát hành. 👤 secret `WINGET_TOKEN` (PAT `public_repo`) ở từng repo                                                                              | từng repo app (phiếu 20261113-01)   |
| C2  | ⛔ `install.ps1` / `install.sh` nhiều gói (D4) + sha256 mới; khay /apps thêm tab "Một lệnh tsudev"                                                                                                                                                                                    | tsudev `apps/frontend-main/public/` |
| C3  | 👤 nộp đơn SignPath Foundation cho tsudev-org; agent chuẩn bị bước `signpath` trong workflow phát hành từng app Windows sau khi được duyệt                                                                                                                                            | chủ dự án, rồi từng repo            |
|     | ↳ phiên 53: script nhận nhiều gói (kiểm hết rồi mới cài). BỎ tab "Một lệnh tsudev" riêng ở /apps: khay đã có lệnh GỘP theo hệ điều hành qua trình quản lý gói chính thức (#244); tab thứ hai là hai nguồn lệnh cho cùng một việc. Chỉ đổi dòng hướng dẫn sang `<tên-gói> [tên-gói …]` |                                     |
| C4  | **Cổng CI** `test/installChannels.test.ts`: mọi app trong `ECOSYSTEM_APPS` có ≥1 kênh lệnh cho hệ điều hành chính; ngoại lệ khai tường minh kèm lý do (La bàn - D6; trò chơi web)                                                                                                     | tsudev                              |
| C5  | Mỗi website `*.tsudev.com` hiện khối "Cài bằng lệnh" sinh LÚC BUILD từ `pkg.tsudev.com/catalog.json` (không gọi lúc chạy, không chép tay)                                                                                                                                             | từng repo app (phiếu 20261114-02)   |
| C6  | Khi tag `v2.4.1-vn.*` của tsufiles ra: `npm run pkg:catalog` ⇒ lệnh trỏ gói mới                                                                                                                                                                                                       | tsudev                              |

### P4 - Đăng nhập chung OIDC (D1) - sau P1

auth-service gắn `oidc-provider` dưới `/oidc/*` (thêm tiền tố vào bảng `backend-bundle`): discovery, authorize, token,
userinfo, JWKS - **khoá ký ES256 RIÊNG**, không dùng chung khoá ký bản phát hành. Client đăng ký trong DB
(`OAuthClient`: redirect URI khớp tuyệt đối, chỉ `code` + PKCE S256, không implicit, không client secret cho SPA);
màn hình đồng ý ở `/oauth/consent`; refresh token xoay vòng + phát hiện dùng lại; thu hồi khi `sessionVersion` đổi. Site
con đầu tiên tích hợp khi có nhu cầu cá nhân hoá. Nghiệm thu: bộ test conformance "Basic RP" của OpenID chạy local đạt.

### P5 - Giao diện toàn hệ

Thu kết quả phiếu 20261113-07 từ 14 repo; mỗi site chạy `~/projects/logs/tools/quet-giao-dien.cjs` ra `OK` trên
production. Sau #252: mẫu footer "Tài khoản" là chuẩn; mở đề xuất đưa mẫu header/footer vào `tsudev-standards`
(`ECOSYSTEM_IDENTITY.md`) theo `.standards/docs/SYNC.md`.

## Đối chiếu 8 tầng SPEC-SEC-2026-V2 (ubnd) ⇒ việc ở trên

| Tầng ubnd             | Hiện có ở tsudev.com                                                  | Việc                                          |
| --------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| 3.1 Edge              | Cloudflare (DDoS mặc định)                                            | P1.7 + 👤 WAF                                 |
| 3.2 HTTP headers      | CSP có hash, HSTS, cookie `__Secure-` httpOnly                        | P1.8                                          |
| 3.3 Client            | Không giữ token ở localStorage                                        | Đạt                                           |
| 3.4 Gateway, tần suất | Giới hạn theo IP `CF-Connecting-IP`, bộ đếm trong RAM                 | P1.6                                          |
| 3.5 Danh tính         | Argon2id, TOTP, passkey, step-up, `sessionVersion`, RBAC đọc DB       | P1.1-P1.5, P4                                 |
| 3.6 Nội dung          | Markdown lọc, đường ghi gác quyền                                     | P2 (duyệt, lịch sử)                           |
| 3.7 Chuỗi cung ứng    | gitleaks, CodeQL, audit, zizmor, trivy, Dependabot, 13 check bắt buộc | G10 + Semgrep (giai đoạn 3 của security-plan) |
| 3.8 Dữ liệu           | TOTP mã hoá, nhật ký chỉ-thêm `prevHash`                              | P1.9                                          |

## Ma trận kênh cài (đo 13/11/2026)

| App                   | winget      | Scoop | Homebrew | APT/DNF | Đích sau P3                                                            |
| --------------------- | ----------- | ----- | -------- | ------- | ---------------------------------------------------------------------- |
| tsudev-trafficmonitor | chờ #477193 | ✅    | -        | -       | + winget                                                               |
| cwico                 | ✅          | -     | -        | -       | + Scoop                                                                |
| tsudev SWICO          | ✅          | ✅    | -        | -       | đủ                                                                     |
| TsuFiles              | -           | ✅    | ✅       | ✅      | + winget                                                               |
| Lotus Share           | -           | ✅    | ✅       | ✅      | + winget                                                               |
| tsudev-contact        | -           | ✅    | -        | -       | + winget                                                               |
| La bàn                | -           | -     | -        | -       | ngoại lệ D6                                                            |
| 6 trò chơi            | -           | -     | -        | -       | chơi trên web; tệp cài theo phương án A khi repo game có bản phát hành |
