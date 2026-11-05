# PHIẾU BÀN GIAO - Kết phiên 35: giai đoạn 1 ATTT đã merge, A4 + giai đoạn 2 còn lại

- **Mã phiếu**: 20261105-05
- **Từ**: phiên 35 - **Đến**: phiên 36 (các agent ở `.claude/agents/`) + chủ dự án
- **Thời điểm**: 05/11/2026, cuối phiên 35
- **Trạng thái**: ĐÃ ĐÓNG (phiên 36 - mục còn mở chuyển sang [`20261105-06`](20261105-06_ket-phien-36-icon-a4.md))
- **Thay phiếu**: [`20261105-04`](20261105-04_giao-viec-phien-35-attt.md) - ĐÃ ĐÓNG (giai đoạn 1 xong; mục còn mở chuyển sang đây)
- **Tài liệu gốc**: [`docs/security-plan.md`](../../docs/security-plan.md) §2.3, §3, §4. Bảng giai đoạn 2 (B1-B7) vẫn ở phiếu 04 §3 - đọc ở đó.

## 0. Trạng thái khi bàn giao (đo, không suy)

- `main` = `f04d53b` (merge #132). Working tree sạch. Không worktree, không tiến trình nền, `logs/LOCKS.md` trống.
- Backend Render deploy `41d33c1` (#128) **success**, `/health` 200. #130/#132 merge sau đó - Render tự deploy tiếp, CHƯA đo lại.
- 🔴 **Frontend CHƯA deploy** từ #128/#129. Bộ phân loại an toàn của Claude Code chặn agent deploy production - chủ dự án phải tự chạy `npm --workspace apps/frontend-main run deploy` (tài khoản Cloudflare ghim `9541f44e...`, đã kiểm khớp). Cho tới khi deploy: **tải tệp lên ở `/admin/projects` hỏng** (frontend cũ gửi `contentType` ⇒ backend mới trả 400 `CONTENT_TYPE_DO_MAY_CHU`).
- `main` có branch protection (bật phiên 35): 8 check bắt buộc (`Lint & format`, `WASM con dấu - artifact phải khớp mã nguồn`, `Migrate & test services`, `E2E - smoke các trang được giữ`, `Build frontends`, `Kiểm quy ước`, `gitleaks`, `npm-audit`), bắt buộc PR (0 approval), enforce_admins, cấm force-push/xoá. **Không push thẳng `main` được nữa** - mọi thay đổi (kể cả log/phiếu) đi qua PR.
- Bật qua API (không có file trong repo): secret scanning + push protection, Dependabot alerts + security updates, private vulnerability reporting, CodeQL default setup (suite extended), xoá nhánh sau merge. Hai mục cần gói trả phí (non-provider patterns, validity checks) không bật được.
- Quyền của agent: auto mode CHẶN `gh pr merge` lúc đầu (sau khi chủ dự án cho phép trong chat thì chạy được), CHẶN tự sửa `.claude/settings.local.json`, CHẶN deploy production. Đừng tìm cách lách - báo chủ dự án.

## 1. Đã xong trong phiên 35

| PR         | việc                                                                                                                                                                                                                                                                                                                                  | ghi chú                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| #127       | A1: `security-scan.yml` (gitleaks 8.30.1 ghim sha256, toàn lịch sử, `--ignore-gitleaks-allow`; `npm audit --omit=dev --audit-level=high`), `dependabot.yml`, `.gitleaks.toml` (allowlist hẹp luật+đường dẫn+giá trị)                                                                                                                  | lịch sử 287 commit: 0 secret thật                                                                    |
| #129       | A3: upload-url nhận `fileSize` ký vào `ContentLength`, trần 2 GiB, danh sách trắng đuôi theo nền tảng, `contentType` do máy chủ suy; seal kiểm magic bytes trong cùng lượt băm; PATCH đổi `platform` buộc niêm phong lại; `storageKey` phải dưới `releases/<slug>/`; ReleaseManager theo hợp đồng mới; **gitleaks `--log-opts=HEAD`** | lỗi cũ: checkout `fetch-depth: 0` kéo mọi nhánh ⇒ PR đỏ vì commit của PR khác (và `main` 4359f01 đỏ) |
| #128       | A2: `requireAdmin`/`requireOwner` ⇒ 403 `MFA_REQUIRED` khi chưa có **TOTP đã xác nhận** (passkey KHÔNG tính - xem §3); `MfaRequiredNotice`; seed dev TOTP cho `tsudev` (OWNER) + chặn seed khi DB không phải localhost; E2E đăng nhập 2 bước (`e2e/tests/helpers/login.js`); `TOTP_ENCRYPTION_KEY` cố định cho CI                     | bí mật TOTP dev công khai: `TSUDEVDEVONLYTOTPTSUDEVDEVONLY22` (`oathtool --totp -b ...`)             |
| #130, #132 | Dependabot: nhóm github-actions, nhóm prod minor/patch                                                                                                                                                                                                                                                                                | CI xanh                                                                                              |

## 2. 🔴 Việc TAY của chủ dự án

| #                  | việc                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T9                 | **Deploy frontend ngay**: `npm --workspace apps/frontend-main run deploy`; rồi `curl -s https://tsudev.com/api/auth/providers` chỉ có `credentials` + `passkey`          |
| T10                | Đăng nhập `tsudev` trên production bằng **TOTP** (passkey không qua cổng quản trị), tải thử 1 tệp thật ở `/admin/projects` (A3 mới đo trên MinIO, CHƯA trên R2 - xem §3) |
| T11                | Kiểm ứng dụng OAuth "VT GitHub SSO" (cấp quyền `user:email` lúc 18:32 05/11) - không phải mình cấp thì thu hồi ở GitHub Settings → Applications                          |
| T12                | GitGuardian đỏ trên #128 vì fixture test - đánh dấu false positive trên dashboard (check không bắt buộc)                                                                 |
| T13                | Xoá `~/.secrets/tsudev/prod.env` khi không cần; tạo `DATABASE_URL` Neon (sau T5 đổi mật khẩu) vào đó TRƯỚC khi agent làm B1                                              |
| T5, T6, T7, T8, T4 | còn từ phiếu 04 §1 (đổi mật khẩu Neon, VirusTotal, sửa dữ liệu cũ, Telegram + rác Cloudflare, ẩn nội dung rác)                                                           |
| -                  | Muốn agent tự merge: thêm `"Bash(gh pr merge *)"` vào `.claude/settings.local.json`                                                                                      |

## 3. Việc kế tiếp của agent (theo thứ tự)

1. **Nghiệm thu sau T9**: `npm run prod:dem-noi-dung`; providers; đăng nhập + upload thật (cùng chủ dự án). Nếu PUT lên R2 bị từ chối: presign mang `x-amz-checksum-crc32` của thân rỗng (SDK v3 tự thêm) ⇒ đặt `requestChecksumCalculation: 'WHEN_REQUIRED'` trong `getClients()` (vùng `release-signing`).
2. **A4 - cổng PR chuyên nghiệp** (`infra-deploy`): nhánh `ci/cong-pr-chuyen-nghiep` đã push, commit WIP `5554e28` (sửa dở `ci.yml`, `standards.yml`, `.trivyignore.yaml`, CHƯA kiểm). Rebase lên `main`, rà diff WIP trước khi tin. Phạm vi: dependency-review-action (fail high), actionlint + zizmor (sửa phát hiện thật trong workflow hiện có), Trivy config (Dockerfile/render.yaml), `scorecard.yml` (SARIF), `.github/pull_request_template.md` (checklist từ CLAUDE.md), Dependabot labels + nhóm semver-major, mục ngắn trong `docs/testing.md`. KHÔNG thêm CodeQL workflow (xung đột default setup). Sau khi các job mới xanh một lần: thêm vào branch protection + bật `strict: true` (nhánh phải cập nhật với main - chặn lỗi "hai PR xanh riêng, gộp lại vỡ").
3. **Dependabot major** - KHÔNG merge mù, mỗi cái một phiên/PR riêng, đọc changelog: #133 `@prisma/client` 5→7 (CI đỏ, migration lớn), #134 `@simplewebauthn/server` 13→14 (đụng passkey), #135 `jose` 4→6 (CI đỏ; v6 khả năng ESM-only mà services là commonjs). #131 nhóm dev 28 gói (CI đỏ) - xem log, có thể tách. Cân nhắc `ignore` semver-major cho prisma tới khi lên kế hoạch.
4. **Giai đoạn 2** theo phiếu 04 §3 (B1 → B7). B1 cần `DATABASE_URL` Neon (T13) để `db:migrate` TRƯỚC merge. B3 step-up: dịp làm luôn việc **ghi phương thức xác thực của phiên (amr)** rồi cho phiên đăng nhập bằng passkey qua cổng quản trị - hiện cổng chỉ nhận TOTP vì đăng nhập mật khẩu không đòi yếu tố hai khi tài khoản chỉ có passkey (`hasConfirmedTotp` trong `packages/auth`).
5. Còn hở (ngoài phạm vi A2): `/api/author/*` không ép 2FA cho ADMIN/OWNER. URL presign PUT sống 30 phút nên PUT đè được sau khi niêm phong - G5/B2 (kiểm toàn vẹn định kỳ) sẽ bắt.
6. `docs/release-signing.md` chưa có mục "Siết tải lên" (bảng mã lỗi: `CONTENT_TYPE_DO_MAY_CHU`, `FILE_SIZE_KHONG_HOP_LE`, `DUOI_TEP_KHONG_CHO_PHEP`, `VUOT_TRAN_KICH_THUOC`, `SAI_LOAI_TEP`, `STORAGE_KEY_SAI_DU_AN`, `NEN_TANG_KHONG_CO_TEP`); `docs/auth.md` chưa nhắc ép TOTP - giao `docs-curator` (gộp với B7).

## 4. Bẫy gặp trong phiên 35

- **gitleaks + `fetch-depth: 0`**: checkout kéo MỌI nhánh; không có `--log-opts=HEAD` thì PR này đỏ vì commit của PR kia. Chạy gitleaks local cũng vậy (thấy nhánh của worktree khác).
- **Fixture test có chuỗi dài trông như khoá** (`process.env.X_KEY = '...'`, `const PASSWORD = '...'`) ⇒ `generic-api-key`. Dùng lại giá trị đã allowlist trong `.gitleaks.toml`, hoặc thêm allowlist HẸP (luật + đường dẫn + giá trị).
- **E2E đăng nhập**: trang `/login` gọi `signIn(redirect:false)` - khi máy chủ đòi TOTP không có điều hướng nào; chờ `waitForNavigation` là treo 60s. Dùng `e2e/tests/helpers/login.js`.
- Máy dev này: Node không phân giải `tsudev.localhost` (`getaddrinfo ENOTFOUND`) ⇒ Playwright webServer hết giờ. Phiên 35 chạy kèm `NODE_OPTIONS=--require <file ngoài repo trỏ *.localhost về 127.0.0.1>`. CI không bị.
- Test quét `topology:check` bắt cả `http://tsudev.localhost:8080` trong file test - dùng host không cổng (`https://tsudev.test`).
- PR mở TRƯỚC khi workflow bắt buộc mới vào `main` không có check đó ⇒ kẹt "expected"; cập nhật nhánh từ `main` (Dependabot: comment `@dependabot rebase`).
- Hai PR cùng sửa `ReleaseManager.tsx` (`goiJson`) - xung đột ngữ nghĩa nhẹ, gộp tay; CI riêng từng PR không bắt được ⇒ lý do bật `strict: true` ở A4.
