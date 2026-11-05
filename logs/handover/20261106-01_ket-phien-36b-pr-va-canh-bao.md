# PHIẾU BÀN GIAO - Phiên 36 (tiếp): dọn PR + cảnh báo bảo mật, 9 PR chờ merge

- **Mã phiếu**: 20261106-01
- **Từ**: phiên 36 (tiếp, sang 06/11) - **Đến**: phiên 37 + chủ dự án
- **Trạng thái**: MỞ
- **Thay phiếu**: [`20261105-06`](20261105-06_ket-phien-36-icon-a4.md) - ĐÃ ĐÓNG

## 0. Trạng thái (đo, không suy)

- `main` = `c1d5954` (#137, #138, #139 đã merge). Branch protection: **12 check bắt buộc + `strict: true`** (bật phiên này - T15 xong). Nhánh WIP `ci/cong-pr-chuyen-nghiep` đã xoá (T16 xong).
- 🔴 **Frontend production VẪN bản cũ** (đo 05/11 cuối ngày): `/api/auth/providers` còn `github`+`google`; `/brand/logo-mark-64.avif` 404. Nghiệm thu production KHÔNG làm được tới khi T9.
- Auto mode chặn agent: `gh pr merge`, `git commit --amend`, ghi lên hệ thống ngoài (đóng cảnh báo secret scanning). Đừng lách.

## 1. PR chờ merge - THEO ĐÚNG THỨ TỰ

`strict: true` ⇒ sau mỗi lần merge, PR kế phải "Update branch" rồi chờ CI xanh lại.

| #   | PR                 | việc                                                                                              | ghi chú                                                                                                                                                                        |
| --- | ------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **#143**           | Node 20→22 trên bookworm + job CI `Image backend - dựng + khởi động như Render`                   | Node 20 EOL 30/04/2026; `node:*-bullseye-slim` ngừng dựng lại từ 25/08/2026. Job mới đã khởi động image thật: `/health` 200. Render tự deploy sau merge - đo `/health` backend |
| 2   | **#149**           | Chặn duyệt ngược đường dẫn ở proxy BFF + slug (`..` vượt danh sách tiền tố)                       | CodeQL request-forgery #38-#41 (critical). Lỗ thật: `new URL('…/api/posts/../admin/releases')` ⇒ `/api/admin/releases`                                                         |
| 3   | **#148**           | Xoá 2 Dockerfile hỏng + 2 `package-lock.json` lạc của content/storage; compose dùng image backend | 18 cảnh báo Dependabot runtime (2 critical) tự đóng - cây thật đã vá, `npm audit --omit=dev` = 0                                                                               |
| 4   | **#144**           | Dependabot bỏ qua major `jose`                                                                    | #135 đã đóng kèm lý do (ESM-only; next-auth@4 giữ jose 4)                                                                                                                      |
| 5   | **#140**, **#141** | upload-sarif 4.39.1; nhóm dev minor/patch 8 gói                                                   | xanh                                                                                                                                                                           |
| 6   | **#147**           | Prettier 3 - agent đã sửa `sync-tokens.js` (API async) + định dạng lại 24 tệp                     | 853 test xanh trên máy                                                                                                                                                         |
| 7   | **#146**           | Gỡ `eslint-plugin-prettier` + `eslint-config-prettier` không dùng (thay #142 đã đóng)             | sẽ XUNG ĐỘT lock sau #147: dựng lại lock = lock của main trừ 4 mục (cách làm trong commit message) - đừng dùng lock do npm máy dev sinh (xoá `libc` của argon2)                |
| 8   | **#145**           | concurrently 8→10                                                                                 | v10 đòi Node 22 ⇒ SAU #143                                                                                                                                                     |
| 9   | **#134**           | @simplewebauthn/server 13→14                                                                      | đòi Node 22 ⇒ SAU #143; comment `@dependabot rebase` để CI chạy trên Node 22                                                                                                   |

Sau #143: thêm `Image backend - dựng + khởi động như Render` vào branch protection.

## 2. 🔴 Việc TAY của chủ dự án

| #              | việc                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| T14b           | Merge 9 PR theo §1 - hoặc thêm `"Bash(gh pr merge *)"` vào `.claude/settings.local.json` để agent làm                       |
| T9             | **Deploy frontend** (từ phiếu 05): `npm --workspace apps/frontend-main run deploy` - sau #149 để mang luôn bản vá           |
| T17            | Secret scanning #1 (Telegram token ở `docs/alerting.md:59`) là PLACEHOLDER (`AAH` + 32 chữ `x`) ⇒ Close as "False positive" |
| T10-T13, T4-T8 | còn từ phiếu 05                                                                                                             |

## 3. Việc kế tiếp của agent

1. Nghiệm thu sau T9 (providers; icon/logo AVIF; upload R2 cùng chủ dự án).
2. **CodeQL còn ~55 cảnh báo** sau #149 - triage từng nhóm, sửa cái thật, dismiss có lý do cái báo nhầm: `js/missing-rate-limiting` 24 (high), `js/log-injection` 6, `js/polynomial-redos` 3, `js/incomplete-multi-character-sanitization` 3, `js/file-system-race` 3, `js/client-side-unvalidated-url-redirection` 3, `js/insecure-randomness` 2, `js/type-confusion-through-parameter-tampering` 1 (critical - `storage-service/src/index.ts:383`), `js/insufficient-password-hash` 1, `js/user-controlled-bypass` 1, khác 1-1. Gợi ý: `missing-rate-limiting` thường nhầm khi giới hạn đặt ở tầng khác - kiểm trước khi thêm.
3. Dependabot dev còn lại (sau #141, #147, #148): Storybook 8.6.19 (critical/high trong `packages/ui`), vite, handlebars - phần lớn kéo theo Storybook.
4. Nợ: Debian bookworm cho `apps/frontend-main/Dockerfile` (dev-only) đã đổi; Auth.js 5 (mở khoá jose); `android-chrome-512x512.png` 512 kB; Scorecard 18 mục (phần lớn là thiết lập repo: SECURITY.md, CII badge, fuzzing).

## 4. Bẫy gặp

- `docker run --rm -d`: tiến trình chết là container biến mất CÙNG log - job CI đầu tiên mất sạch chẩn đoán.
- `| head` sau một tiến trình chạy lâu: log nằm trong bộ đệm, trông như treo.
- `node:22-bullseye-slim` vẫn "active" trên Docker Hub nhưng `last_updated` dừng 25/08/2026 - xem ngày, đừng xem trạng thái.
- npm 10.9.9 cục bộ viết lại ~3.000 dòng lock và xoá `libc` của bản native argon2 ⇒ so TẬP GÓI, đừng tin số dòng diff; sửa lock bằng JSON (lock cũ trừ mục cần bỏ).
- Jest ở `apps/frontend-main` đụng tên package với bản sao trong `.next/standalone`, `.open-next` trên máy đã build ⇒ #149 thêm `modulePathIgnorePatterns`.
- `npm ci` xoá client Prisma đã sinh ⇒ typecheck báo `@prisma/client has no exported member` - chạy `db:generate`, không phải lỗi mã.
- GitGuardian chỉ quét dòng MỚI: `POSTGRES_PASSWORD: tsudev` cũ không bị báo, dòng y hệt trong job mới thì bị. Job mới dùng `POSTGRES_HOST_AUTH_METHOD: trust`.
