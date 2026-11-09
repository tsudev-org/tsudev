# PHIẾU BÀN GIAO - Kết phiên 42: react-hooks 7, ESLint 10, sẵn sàng TS 7, Tailwind 4

- **Mã phiếu**: 20261107-01
- **Từ**: phiên 42 (07/11/2026) - **Đến**: phiên 43 + chủ dự án
- **Trạng thái**: ĐÓNG (09/11/2026, thay bằng [`20261109-01`](20261109-01_ket-phien-43-dependabot-197-199.md) - §3 chuyển nguyên sang đó)
- **Thay phiếu**: [`20261106-07`](20261106-07_ket-phien-41-dependabot-eslint9-storybook10.md) - §3.2, §3.3, §3.4 xong; §3.5 xong phần làm được (xem §1).

## ⚡ Khởi động phiên 43

1. Đọc `AGENTS.md`, `logs/STATE.md`, phiếu này. `git fetch --prune && git status` trên `main` phải sạch.
2. **Từ 10/11/2026**: §3.1 (minimatch) - việc DUY NHẤT còn giữ hai cảnh báo cuối của tab Security.
3. Khoá file vào `logs/LOCKS.md`; mỗi chuỗi việc một nhánh + PR. Merge: `gh pr merge <số> --merge` ĐỨNG MỘT MÌNH.
4. Kết phiên: nhả khoá, dừng tiến trình nền, viết phiếu mới, đổi phiếu này sang ĐÓNG.

## 0. Trạng thái (đo, không suy)

| PR   | nội dung                                                                | kết cục          |
| ---- | ----------------------------------------------------------------------- | ---------------- |
| #192 | react-hooks 5.2 → 7.1, sửa 26 vi phạm, `lib/useLoader.ts`, E2E mới      | MERGED           |
| #193 | ESLint 9 → 10 + `@eslint/js` 10 (`fixupPluginRules` cho react/jsx-a11y) | MERGED           |
| #194 | tsconfig sẵn sàng TS 7 (`node16`, `types` rõ) + cổng `typecheck:ts7`    | MERGED           |
| #195 | Tailwind 3 → 4                                                          | MERGED `5f1a077` |

Backend Render `3d48981` success; `/health` 200, JWKS 200. Frontend Worker `4656fc12-d32f-4a71-8d1a-bccb732b8119`: providers chỉ provider thật; `/` 39 kB, `/blog` 121 kB, `/docs` 73 kB, `/projects` 19 kB (sau lượt dựng lại ISR); trên tsudev.com h1 41,4px + nút bo 8px - khớp số đo v3.

## 1. Làm trong phiên

**react-hooks 7 (#192).** 26 vi phạm sửa theo bản chất, không tắt luật: 15 chỗ nạp dữ liệu → `useLoader` (AbortSignal, huỷ lượt cũ - vá lỗi đua phản hồi cũ ghi đè mới); đồng bộ state theo prop/URL → chỉnh trong render; `mounted`/localStorage → `useSyncExternalStore` (ThemeToggle theo kịp tab khác); ref gán trong effect; `Date.now()` ra ngoài component. E2E mới `react-hooks-7.spec.js` (đã thêm vào project `app` của Playwright - spec ngoài `testMatch` thì KHÔNG chạy, kể cả khi gọi đích danh).

**ESLint 10 (#193).** `eslint-plugin-react@7.37.5` không chỉ khai peer hẹp mà SẬP thật trên 10 (`context.getFilename is not a function`). `fixupPluginRules` của `@eslint/compat` + `overrides` nới peer. Luật mới bắt 2 chỗ thật (`preserve-caught-error`, `no-useless-assignment`).

**TypeScript 7 (#194) - KHÔNG thay được 5.9.** `typescript@7` không còn API JS cổ điển (`createProgram`, `transpileModule` undefined); Next.js, ts-jest, typescript-eslint (peer `<6.1`) sống bằng nó. Làm phần làm được: 10 tsconfig `node10` → `node16` (106 tệp `dist/` giống từng byte), `types` khai rõ, cổng `npm run typecheck:ts7` trong CI (TS 7.0.2 qua `npx`, 11,6s).

**Tailwind 4 (#195).** `@tailwindcss/upgrade` + sửa ba lỗi của công cụ (thứ tự lớp CSS ⇒ bo góc 0px; `leading-*` thắng `md:text-*`; đổi oan `tone: 'outline'`). Nghiệm thu: 36 ảnh (12 trang × 3 chế độ) giống v3 từng điểm ảnh. Spec chụp ảnh KHÔNG commit (phụ thuộc dữ liệu local); cách làm ghi ở §4.

## 2. 🔴 Việc của chủ dự án

| #   | việc                                                                          |
| --- | ----------------------------------------------------------------------------- |
| -   | **Xoá 13 nhánh remote cũ** - hướng dẫn từng bước ở §5. Agent bị chặn xoá ref. |
| -   | T18-T21 còn từ phiếu 02 (xoá 2 repo, tạo Org, thu hồi PAT lộ)                 |
| -   | (tuỳ chọn) huy hiệu OpenSSF Best Practices - Scorecard #79                    |

## 3. Việc kế tiếp của agent

| #   | việc                                                                                                                                                                                                                                                                         | agent                            | khi nào               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------- |
| 1   | Override `"minimatch@>=7 <11.0.1": "^11.0.1"`, lock bằng `npx -y npm@11.21.0`. Kiểm `npm --workspace apps/frontend-main run build` + Storybook (đếm story). Merge ⇒ Dependabot #40 tự đóng; Scorecard #76 còn mở thì dismiss ("phần còn lại là deepmerge, không có bản vá"). | `infra-deploy` → `design-system` | **từ 10/11/2026**     |
| 2   | Gỡ `fixupPluginRules` + `overrides` peer eslint khi `eslint-plugin-react` / `jsx-a11y` ra bản nhận ESLint 10 (`npm view <gói> peerDependencies`).                                                                                                                            | `infra-deploy`                   | khi plugin nhận 10    |
| 3   | Đổi hẳn sang TS 7 khi Next.js, ts-jest và typescript-eslint nhận nó: đổi `typescript`, gỡ `scripts/typecheck-ts7.js` + bước CI. KHÔNG cài TS 7 dạng alias (§4).                                                                                                              | `infra-deploy`                   | khi ba công cụ nhận 7 |
| 4   | Chuyển repo vào Org.                                                                                                                                                                                                                                                         | `infra-deploy`                   | sau T19               |

## 4. Bẫy gặp

- **Cài `typescript-7@npm:typescript@7` làm `node_modules/.bin/tsc` trỏ sang TS 7** - hai gói cùng khai bin `tsc`; ở repo nháp thì không, ở repo thật thì có. `build:services` sẽ lặng lẽ phát sinh mã bằng TS 7. Cổng `typecheck:ts7` khẳng định `tsc` = 5.x và đã bắt được đúng việc này. Gỡ alias còn xoá luôn link `.bin/tsc` - `npm rebuild typescript` dựng lại.
- **`@tailwindcss/upgrade` (và mọi công cụ tự cài gói) chạy npm cục bộ 10.9** ⇒ `libc` của argon2 về 0/14. `git checkout package-lock.json` rồi lock lại bằng `npx -y npm@11.21.0 install`.
- **Thứ tự `@layer` do lần xuất hiện đầu quyết định** - `@import x layer(base)` đứng trước `@import 'tailwindcss'` làm `base` thành lớp yếu nhất. Dòng `@layer theme, base, components, utilities;` ở đầu `globals.css` là chốt.
- **So ảnh: kiểm baseline ổn định TRƯỚC** bằng lượt chạy lại trên chính mã cũ. Lượt đầu 6/36 lệch dù mã không đổi: mỗi lần chạy test lại đăng nhập ⇒ giờ đăng nhập, nhật ký, số trang mọc thêm; ô tìm kiếm tự focus sau khi đã bỏ focus. Chuẩn hoá chữ số trong DOM + che thanh phân trang ⇒ 36/36 ổn định. Cách chụp: `page.setViewportSize(1280×900)`, đặt `localStorage['tsudev-theme']`, tắt animation/transition, chờ `document.fonts.ready` + 800ms, `toHaveScreenshot({ fullPage, maxDiffPixels: 0 })`.
- **Cổng 8080 ở máy này bị dự án khác giữ** - `.env` đặt `DEV_PROXY_PORT=8090`; Playwright không nạp `.env` nên truyền `DEV_PROXY_PORT=8090` khi chạy. Lần biên dịch đầu của Next trên WSL vượt trần 60s của webServer ⇒ tự chạy `dev:local` ở nền rồi `E2E_NO_WEBSERVER=1`.
- **6 test `page.request` của smoke đỏ CỤC BỘ** (`ENOTFOUND tsudev.localhost`): Node trên WSL không tự phân giải `*.localhost`, trình duyệt thì có. CI không bị.
- **Hook pre-push chạy `topology:check` trên CẢ tệp chưa theo dõi** - tệp nháp có cổng cứng trong repo chặn push. Để tệp nháp ngoài repo.
- **Postgres user-space :5433 không tự lên sau khi máy khởi động lại** - `npm run db:up`.
- **`git checkout <tệp>` để hoàn tác một thử nghiệm trả tệp về bản ĐÃ COMMIT**, xoá luôn thay đổi chưa commit trước đó trên tệp đó.

## 5. Hướng dẫn xoá 13 nhánh remote cũ (chủ dự án)

Đã đo 06/11: mọi commit trên 9 nhánh người tạo đều có trong `main` (cùng patch-id, hoặc đã squash/thay ở #81, #151) và vẫn khôi phục được qua `refs/pull/<số>/head`. 4 nhánh còn lại là của PR Dependabot đã đóng.

1. Cập nhật ref và xem nhánh còn trên remote: `git fetch --prune && git branch -r`
2. (Tuỳ chọn) đọc lại phần lệch của nhánh trước khi xoá: `git log --oneline origin/main..origin/<nhánh>`
3. Xoá - chạy trong thư mục repo:

```bash
for b in ci/quet-bao-mat feat/siet-tai-len-ban-phat-hanh docs/ket-phien-20 \
  feat/author-owner-accounts fix/phase-a-ssrf-ratelimit feat/qu-std-table-2 \
  feat/docs-search docs/ban-giao-phien-37b chore/node-22-bookworm \
  dependabot/npm_and_yarn/eslint-10.14.0 dependabot/npm_and_yarn/types/node-26.6.6 \
  dependabot/npm_and_yarn/typescript-7.0.2 dependabot/npm_and_yarn/tailwindcss-4.3.4; do
  git push origin --delete "$b"
done
```

Nhánh nào đã không còn thì lệnh báo `remote ref does not exist` - bỏ qua được. Hook pre-push chỉ chặn đẩy lên `main`, không chặn xoá nhánh khác. 4. Kiểm: `git fetch --prune && git branch -r` chỉ còn `origin/main` (và nhánh của PR đang mở, nếu có). 5. Lỡ xoá nhầm thì khôi phục từ PR: `git fetch origin pull/<số>/head:<nhánh> && git push origin <nhánh>`.

Cách khác không cần terminal: GitHub → Code → Branches → biểu tượng thùng rác cạnh từng nhánh (GitHub cho khôi phục ngay trên trang đó trong một thời gian ngắn).

Hiện trạng máy lúc đóng phiên 42: không worktree, không tiến trình nền; Postgres user-space :5433 vẫn chạy. Spec chụp ảnh nằm ngoài repo (scratchpad phiên, không giữ).
