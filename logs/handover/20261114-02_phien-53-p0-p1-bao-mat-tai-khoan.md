# PHIẾU BÀN GIAO - Phiên 53: P0 dọn nền, P1 bảo mật tài khoản, mở đầu P3/P5

- **Mã phiếu**: 20261114-02
- **Phiên**: phiên 53, 14/11/2026
- **Trạng thái**: ĐÓNG phần code (P0-P5 của tsudev) - còn lại chỉ việc 👤/⛔ ở mục 0

## 0. Kết thúc phiên 53 (14/11/2026, tối)

Chủ dự án đưa 3 migration lên Neon (30/30). Sau đó:

| Việc                                                                                                                        | PR                   | Production                       |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------- |
| P1 + P2 + P4 (gồm #257, #264)                                                                                               | #265 merge `11fc581` | Render deploy; Worker `e7da5649` |
| React #418 ở trang ISR (thời gian tương đối tính lúc dựng), h1 /settings khi chưa đăng nhập, glob 14.0.3, TOCTOU CodeQL #99 | #266 merge `c6ab65c` | Worker `32054f3c`                |

Nghiệm thu: COOP `same-origin` + CORP `same-site` có trên tsudev.com; `/oidc/.well-known/openid-configuration`
qua Worker trả 503 `thiếu OIDC_SIGNING_JWK` (đúng thiết kế); `/blog` còn đúng 1 bài như trước (điền ngược trạng
thái không làm mất bài); quét giao diện 7 trang × 4 tổ hợp = 28/28 OK; bundle Worker 6970→6971 KiB sau glob 14
(minify vẫn chạy). GitHub: 0 cảnh báo code scanning/Dependabot/secret scanning mở (6 rate-limit báo nhầm + Scorecard
#76 deepmerge chưa có bản vá: dismiss kèm lý do).

🪤 **Override npm**: giá trị đích PHẢI nằm trong dải khoá (`"glob@>=9 <=14.0.3": "14.0.3"`). Dải `<14` → 14.0.3 thì
npm 11 vẫn sinh lock, nhưng `npm ci` của npm 10 (CI) báo "Missing glob@13/10 from lock file". Thử trước bằng
`npm ci --dry-run --ignore-scripts` (npm 10 cục bộ). KHÔNG sinh lock bằng npm 10: nó bỏ override và xoá 50 `libc`.

🪤 Đo deploy backend: `/api/*` của backend đòi `x-internal-token` với truy cập trực tiếp ⇒ luôn 401; đo bằng `/oidc`
(cũ 404, mới 503) hoặc `/health`.

**Việc 👤/⛔ còn lại**: `OIDC_SIGNING_JWK` (Render), Turnstile (widget + 2 khoá), `age` + khoá sao lưu, chọn tắt
Bot Fight Mode/JS Detections cho zone, duyệt ⛔ #252 #261, đánh dấu 2 sự cố GitGuardian là mật khẩu test, T18/T20,
kiểm gõ tiếng Việt 2 bộ gõ. C6 chờ `linux-packages` dựng lại kho (catalog vẫn 2.4.0-vn.1 lúc 14/11 tối).

## 1. Đã làm

| Việc                                                                                                                | PR                   | Production                                 |
| ------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------ |
| P0.2 E2E chập chờn ở test #1: `e2e/global-setup.js` làm ấm trang + route `pages/api/*`                              | #256 merge           | không đổi production (chỉ CI)              |
| P0.3 đối soát 21 phiếu tồn ⇒ ĐÓNG kèm lý do; T18/T20/T21 chuyển kế hoạch tổng mục 4.7                               | PR nhật ký này       | -                                          |
| P1.1-P1.6, P1.8 (Mức an toàn, 2FA từ AUTHOR, step-up, HIBP lưu kết quả, Không phải tôi, bộ đếm Postgres, COOP/CORP) | #257                 | CHỜ migration Neon - KHÔNG merge trước     |
| P1.7 Turnstile (không khoá ⇒ không đổi hành vi)                                                                     | #258 merge           | Worker `83c2dcce`, đo ở mục 1.1            |
| P1.9 sao lưu DB mã hoá `age` + hướng dẫn G11                                                                        | #259 merge           | chỉ script; diễn tập là 👤 (chưa có `age`) |
| C4 cổng kênh cài bằng lệnh                                                                                          | #260 merge           | chỉ test                                   |
| C2 install.sh/ps1 nhiều gói ⛔                                                                                      | #261                 | CHỜ `nguyentrangtinhsu` duyệt              |
| Gốc `verifyCode.test.ts` chập chờn: trần ngày đếm dòng nhật ký ghi bắn-rồi-quên                                     | #262 merge           | Render tự deploy                           |
| P2.1-P2.4 CMS: máy trạng thái, Tiptap 3 (ADR-0001), lịch sử, duyệt bài, chuyên mục, E2E                             | #264 (gồm #257)      | CHỜ migration Neon                         |
| P4 OIDC: oidc-provider 9, PKCE, adapter Postgres, trigger thu hồi, trang đồng ý                                     | #265 (gồm #264)      | CHỜ migration Neon + `OIDC_SIGNING_JWK` 👤 |
| P5 đề xuất mẫu menu tài khoản / chân trang / khối Cài bằng lệnh                                                     | tsudev-standards #52 | chờ duyệt nội dung                         |

### 1.1 Nghiệm thu

- #256: 3 lượt CI liên tiếp xanh không rerun (run 43551006296, 43551277152, 43552023766), 22/22 E2E.
- #258 production (Worker `83c2dcce`): `/api/turnstile-site-key` = `{"siteKey":null}`; CSP có `frame-src
https://challenges.cloudflare.com`; providers = credentials, passkey, github, google; quét /login /signup
  /forgot-password OK 12/12 tổ hợp; quên mật khẩu với email giả ⇒ `{"ok":true}` (khoá chưa đặt ⇒ bỏ qua kiểm).
- Quét production 14/11: tsudev.com OK 390/1280 × Tối/Sáng. Header đo được: HSTS preload, nosniff, DENY, Referrer,
  Permissions-Policy (COOP/CORP chờ #257).
- Test local: auth-service 236 (P1) / 222 (Turnstile), content-service 310, frontend 195+8, packages/ui C4 8.

## 2. Kỹ thuật đáng nhớ

- 🪤 **Làm ấm bằng `fetch` trần KHÔNG đủ** cho Turnstile/Next 16 dev: HTML trả trong ~150ms vì Turbopack chỉ dựng
  phần server; bundle trình duyệt chỉ biên dịch khi trình duyệt xin chunk. Làm ấm bằng Chromium thật.
- 🪤 Tệp test TS thiếu `export {}` ⇒ hằng toàn cục đụng tên với tệp test khác (TS6200) - CI đỏ dù chạy riêng xanh.
- 🪤 `prisma migrate dev` hỏng ở local: `template1` lệch collation 2.39/2.43. Sinh SQL bằng
  `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`.
- 🪤 Đổi nhánh giữa nhánh có/không có migration mới ⇒ `npm run db:generate` + `npx tsc -b tsconfig.services.json`,
  nếu không test báo lỗi kiểu/hồi quy ma (dist cũ của `@tsudev/ratelimit`).
- Cloudflare tự chèn script `challenge-platform` ở MỌI site trong zone; site có CSP nonce thì Cloudflare gắn nonce,
  site tĩnh `script-src 'self'` thì lỗi console - xem kế hoạch tổng 4.9.
- 🪤 **Mẫu chập chờn mới - `fonts:check` trong job Lint & format**: "thiếu JetBrains Mono nét 400 subset latin
  trong CSS của Google" ở #263 (chỉ đổi markdown), cùng lệnh ở máy dev ra `24 tệp khớp nguồn`. Đó là phản hồi
  nhất thời của fonts.googleapis.com. Gặp ⇒ chạy `npm run fonts:check` ở máy; khớp thì `gh run rerun <id> --failed`.
- `logSecurity` nay trả Promise không reject - `await` nó ở nơi dùng sự kiện làm bộ đếm.

## 3. Việc còn lại (theo thứ tự)

1. 👤 Chủ dự án đưa BA migration lên Neon (lệnh ở kế hoạch tổng 4.8 - `db:migrate` áp cả ba theo thứ tự):
   `20261114120000_bao_mat_tai_khoan_p1`, `20261114130000_cms_trang_thai_bai_viet`, `20261114140000_oidc_dang_nhap_chung`.
   Cả ba chỉ THÊM (P2 điền ngược `status`; P4 có trigger). Sau đó agent: merge #265 (đã chứa #264 và #257 - đóng hai
   PR kia kèm ghi chú "đã vào qua #265"), đợi Render deploy, deploy Worker, nghiệm thu: thẻ "Mức an toàn" (ảnh
   390/1280), COOP/CORP bằng curl, AUTHOR không TOTP ghi bài ⇒ 403 `MFA_REQUIRED`, `/blog` vẫn đủ bài (điền ngược
   đúng), `/oidc/.well-known/openid-configuration` 503 tới khi có `OIDC_SIGNING_JWK` rồi 200, quét giao diện
   `/author/posts/new`, `/admin/review`.
2. ⚠️ Sau P2: AUTHOR KHÔNG còn đăng thẳng - bài vào hàng chờ `/admin/review`. Production hiện chỉ OWNER `tsudev` viết
   bài (MODERATOR+ nên vẫn đăng thẳng).
3. ⛔ #252, #261 chờ `nguyentrangtinhsu`. Đề xuất tsudev-standards#52 chờ duyệt.
4. Kiểm gõ tiếng Việt 2 bộ gõ trong trình soạn (ADR-0001) - cần máy có bộ gõ thật.
5. Lượt xem bài (`PostViewDaily`) chưa ghi - cần cách gộp để không giữ Neon thức.
6. C6 chờ tag `v2.4.1-vn.*` của tsufiles (14/11: chưa có). C1/C3/C5 là việc của repo app + 👤.

### Bản trước của mục 3 (giữ để đối chiếu)

1. 👤 Chủ dự án đưa migration P1 lên Neon (lệnh ở kế hoạch tổng 4.8) ⇒ agent: `gh pr update-branch 257`, merge, đợi
   Render deploy, deploy Worker (`XDG_CONFIG_HOME=$HOME/.config/wrangler-tsudev npm --workspace apps/frontend-main run deploy`),
   nghiệm thu: `curl -sI https://tsudev.com | grep -i cross-origin`, `/settings/security` có thẻ "Mức an toàn" (ảnh 390/1280),
   AUTHOR không TOTP ghi bài ⇒ 403 `MFA_REQUIRED`.
2. Merge #258, #259, #260, #262 khi CI xanh (không cần migration); deploy Worker sau #258; đo `/api/turnstile-site-key`
   = `{"siteKey":null}` và CSP có `frame-src https://challenges.cloudflare.com`.
3. P2 CMS (P2.1 schema ⇒ P2.5), xếp sau P1 (migration nối tiếp `20261114120000_bao_mat_tai_khoan_p1`).
4. P4 OIDC sau P1. C6 chờ tag `v2.4.1-vn.*` của tsufiles (đo 14/11: chưa có).
