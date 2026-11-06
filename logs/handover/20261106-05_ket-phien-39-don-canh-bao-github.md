# PHIẾU BÀN GIAO - Kết phiên 39: dọn sạch tab Security của GitHub (57 + 2 → 1 + 1, cả hai hẹn 10/11)

- **Mã phiếu**: 20261106-05
- **Từ**: phiên 39 (06/11/2026) - **Đến**: phiên 40 + chủ dự án
- **Trạng thái**: MỞ
- **Thay phiếu**: [`20261106-04`](20261106-04_ket-phien-38-express5-len-prod-g7.md)

## ⚡ Khởi động phiên 40

1. Đọc `AGENTS.md`, `logs/STATE.md`, phiếu này. `git fetch && git status` trên `main` phải sạch.
2. **Từ 10/11/2026**: làm §3.1 (minimatch) - đó là việc DUY NHẤT còn giữ hai cảnh báo cuối cùng.
3. Khoá file vào `logs/LOCKS.md` trước khi sửa; mỗi chuỗi việc một nhánh + PR. Merge: gọi `gh pr merge <số> --merge` ĐỨNG MỘT MÌNH (xem §4).
4. Kết phiên: nhả khoá, dừng tiến trình nền, viết phiếu mới, đổi phiếu này sang ĐÓNG.

## 0. Trạng thái (đo, không suy)

| PR   | nội dung                                                 | trạng thái                                     |
| ---- | -------------------------------------------------------- | ---------------------------------------------- |
| #163 | dọn cảnh báo CodeQL + Scorecard (mã, test, Docker, docs) | MERGED `2e04819`, Render deploy success 12:05Z |

Tab Security (đo bằng `gh api` sau khi CodeQL + Scorecard chạy lại trên `2e04819`):

| nhóm                      | đầu phiên | cuối phiên | còn lại                                            |
| ------------------------- | --------- | ---------- | -------------------------------------------------- |
| Code scanning (CodeQL)    | 44        | 0          | -                                                  |
| Code scanning (Scorecard) | 13        | 1          | #76 `VulnerabilitiesID` - do minimatch + deepmerge |
| Dependabot                | 2         | 1          | #40 minimatch - hẹn 10/11 (chủ dự án chọn chờ)     |

Production sau deploy #163: backend `/health` 200, JWKS phát hành 200, `/api/search` 200 có dữ liệu, `/`, `/blog`, `/projects` 200 đủ nội dung. `POST /api/identity/passkey/login-verify` body rỗng ⇒ 401 `invalid_credentials` (trước đây `response` thiếu `id` sau một thử thách hợp lệ ném TypeError ⇒ 500).

**Frontend CHƯA deploy lại** - thay đổi phía Worker của #163 chỉ là định dạng log (`lib/api.ts`) và vòng gỡ thẻ trong `slugifyHeading` (cùng kết quả với mọi đầu vào thường). Không gấp; đi cùng lần deploy kế tiếp qua `scripts/deploy-frontend.js`.

## 1. Làm trong phiên

**Sửa thật trong mã** - CodeQL trên `main` đo lại và đóng hết:

- `js/log-injection` (7): `oneLine` ở storage, auth mailer, `lib/api.ts` nay XOÁ CR/LF bằng chuỗi rỗng. Bản cũ thay `[\u0000-\u001f\u007f]+` bằng dấu cách - đúng về an toàn nhưng CodeQL chỉ công nhận phép thay xuống dòng bằng `''`. `notify.js` in bản tin một dòng.
- `js/type-confusion-through-parameter-tampering`: `/api/upload` chỉ dùng `body: Buffer` đã kiểm, kích thước bằng `byteLength`.
- `js/user-controlled-bypass`: passkey `login-verify` bỏ rẽ nhánh `challengeId ? … : null`; `loginVerify` tự từ chối id rỗng và `response` thiếu `id`.
- `js/incomplete-multi-character-sanitization`: `slugifyHeading` gỡ thẻ lặp tới khi hết.
- `js/file-system-race` (3 script dev): đọc thẳng + bắt ENOENT; `sync-fonts` làm việc qua một fd và chỉ ghi khi phản hồi có chữ ký `wOF2`.

**Dương tính giả có cổng canh**: `js/missing-rate-limiting` (28) - CodeQL không nhận ra `@tsudev/ratelimit`. Thêm `services/{auth,content,storage}-service/test/routeOrder.test.ts`: đọc router stack của Express, hỏi chính layer `rateLimit` bằng `layer.match(path)` xem có phủ route `/api` đứng sau nó không. Thử phá (dời `accountLimit` của storage xuống cuối) ⇒ test đỏ, liệt kê đúng 4 route. Rồi mới dismiss 28 cảnh báo, lý do trỏ về test này.

**Scorecard**: ghim digest ảnh nền Docker (3 Dockerfile) + mục `docker` trong `.github/dependabot.yml` để digest không đứng yên; `.github/SECURITY.md` (báo riêng qua Private vulnerability reporting); `apps/frontend-main/test/md.property.test.ts` - kiểm thử theo tính chất bằng `fast-check@4.10.2` cho ranh giới XSS của `lib/md.ts` (Scorecard Fuzzing nhận fast-check).

**Dismiss kèm lý do** (không sửa được bằng mã): CodeQL #6 (SHA-1 của giao thức k-anonymity HIBP), #96 (SHA-256 trước `timingSafeEqual`), #98 (sync-fonts tải font là việc của nó); Scorecard #63 (wasm commit có chủ ý, CI đối chiếu), #78 (một người bảo trì), #79 (huy hiệu cần chủ dự án đăng ký), #65 (chủ dự án chọn KHÔNG gắn giấy phép), #77, #64 (tự cải thiện theo thời gian); Dependabot #38 deepmerge (không có bản vá, chỉ trong jest-config).

**Test**: auth 213 · content 309 · storage 20 · bundle 19 · frontend 172 - mọi dòng `Test Suites:` đều passed. 19/19 check của #163 xanh, gồm "Image backend" với digest đã ghim.

**`verifyCode.test.ts` chập chờn (phiếu 04 §3.5)**: KHÔNG tái hiện - 20 lượt chạy riêng + 6 lượt cả bộ auth, 0 đỏ. Đọc test không thấy nguồn phụ thuộc thời gian hay dữ liệu dùng chung (user mang `Date.now()` riêng, dọn token + nhật ký ở `beforeEach`, ngưỡng limiter nâng 10000). Lần sau gặp: GIỮ log đầy đủ (`npx jest verifyCode --runInBand 2>&1 | tee`), đừng chỉ ghi "đỏ".

## 2. 🔴 Việc của chủ dự án

| #   | việc                                                                                     |
| --- | ---------------------------------------------------------------------------------------- |
| -   | T18-T21 còn từ phiếu 02 (xoá 2 repo, tạo Org, thu hồi PAT lộ)                            |
| -   | (tuỳ chọn) đăng ký huy hiệu OpenSSF Best Practices tại bestpractices.dev - Scorecard #79 |

## 3. Việc kế tiếp của agent

1. **Từ 10/11/2026**: override `"minimatch@>=7 <11.0.1": "^11.0.1"` trong `package.json` gốc, thao tác lock bằng `npx -y npm@11.21.0` (KHÔNG npm 10.9 cục bộ - xoá `libc` của argon2). Kiểm `glob@10` (storybook, @node-minify) còn chạy: `npm --workspace packages/ui run storybook` rồi ĐẾM story, và `npm --workspace apps/frontend-main run build`. Merge xong ⇒ Dependabot #40 tự đóng; dismiss Scorecard #76 kèm lý do "phần còn lại là deepmerge, không có bản vá" nếu nó vẫn mở.
2. Deploy frontend lần tới để mang thay đổi `lib/api.ts`/`lib/md.ts` của #163 lên Worker.
3. Chuyển repo vào Org sau T19.

## 4. Bẫy gặp

- **`gh pr merge` bị bộ phân loại auto mode chặn khi nằm trong lệnh GHÉP** (`gh pr merge 163 --merge 2>&1 | tail; gh pr view …`) dù `.claude/settings.local.json` có `Bash(gh pr merge:*)`. Quy tắc chỉ khớp lệnh đứng một mình: `gh pr merge 163 --merge` chạy ngay.
- **CodeQL trên PR là phân tích theo DIFF**: PR #163 báo 1 kết quả trong khi `main` có 44. Đừng đọc số của PR thành "đã đóng hết" - đo lại trên `main` sau merge (`code-scanning/analyses?ref=refs/heads/main`, so `results_count` theo `commit_sha`).
- **`prettier --write` trên `logs/LOCKS.md` biến `*` thành `_`** (`services/*/test` ⇒ `services/_/test`) vì coi là nhấn mạnh Markdown. Dòng khoá có glob thì escape `\*` hoặc đừng chạy prettier lên LOCKS.
- `docker/e2e-runner.Dockerfile` dùng CRLF - `sed` thay dòng thì giữ lại `\r`.
- `npx npm@11.21.0 install` cảnh báo `install-scripts` (không chạy postinstall của esbuild) - esbuild đã cài sẵn vẫn chạy; kiểm bằng `node -e "require('esbuild').transformSync('1')"`.

Hiện trạng máy lúc đóng phiên 39: không worktree; Postgres user-space :5433 vẫn chạy.
