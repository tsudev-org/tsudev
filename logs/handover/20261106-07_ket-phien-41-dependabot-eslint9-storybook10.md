# PHIẾU BÀN GIAO - Kết phiên 41: Dependabot #180-#188, ESLint 9, Storybook 10, deploy frontend

- **Mã phiếu**: 20261106-07
- **Từ**: phiên 41 (06/11/2026) - **Đến**: phiên 42 + chủ dự án
- **Trạng thái**: ĐÓNG (phiên 42, 07/11/2026) - thay bằng [`20261107-01`](20261107-01_ket-phien-42-react-hooks7-eslint10-ts7-tailwind4.md)
- **Thay phiếu**: [`20261106-06`](20261106-06_ket-phien-40-dependabot-va-test-tinh-chat.md) - §3.2, §3.3, §3.6 và bước 1 của §3.7 xong; việc còn lại chép sang §3 dưới đây.

## ⚡ Khởi động phiên 42

1. Đọc `AGENTS.md`, `logs/STATE.md`, phiếu này. `git fetch --prune && git status` trên `main` phải sạch.
2. **Từ 10/11/2026**: làm §3.1 (minimatch) - việc DUY NHẤT còn giữ hai cảnh báo cuối của tab Security.
3. Khoá file vào `logs/LOCKS.md` trước khi sửa; mỗi chuỗi việc một nhánh + PR. Merge: `gh pr merge <số> --merge` ĐỨNG MỘT MÌNH.
4. Kết phiên: nhả khoá, dừng tiến trình nền, viết phiếu mới, đổi phiếu này sang ĐÓNG.

## 0. Trạng thái (đo, không suy)

| PR   | nội dung                                                               | kết cục                                                            |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| #180 | husky 8 → 9 + `prepare: husky` (bỏ `husky install` deprecated)         | MERGED                                                             |
| #182 | dotenv 16 → 18 + `quiet: true` ở mọi chỗ gọi                           | MERGED - Render deploy success                                     |
| #181 | tailwindcss 3 → 4                                                      | ĐÓNG - đỏ build: plugin PostCSS tách gói, cấu hình chuyển sang CSS |
| #184 | `dependabot.yml`: chặn major tailwindcss                               | MERGED                                                             |
| #185 | `@types/node` ^20 → ^22 (`packages/auth`, `packages/ratelimit`) - §3.2 | MERGED                                                             |
| #186 | ESLint 8 → 9 + flat config `eslint.config.mjs`; react-hooks 4 → 5.2    | MERGED `28e6ea7`                                                   |
| #187 | `@eslint/js` 9 → 10                                                    | ĐÓNG - peer `eslint ^10`                                           |
| #188 | globals 16 → 17                                                        | MERGED                                                             |
| #189 | Storybook 8 → 10 + vite 6 → 8 - §3.6                                   | MERGED `cf948d7`                                                   |
| #190 | `dependabot.yml`: chặn major `@eslint/js`                              | MERGED `2871a9b`                                                   |

**Deploy frontend (§3.3 phiếu 06)**: Worker version `283ee102-ff59-4804-9843-c169287c4b62` qua `scripts/deploy-frontend.js` (tài khoản `9541f44e...`, khớp). Mang `lib/api.ts`/`lib/md.ts` của #163 + mọi thứ tới `28e6ea7`.

### 0.1. Số đo cuối phiên

- `/api/auth/providers` = `credentials,passkey,github,google` - không provider dev.
- Ngay sau deploy `/blog` 13,8 kB (bản dựng rỗng lúc build - đúng gotcha ISR); sau ~1 phút: `/` 45 kB, `/blog` 120 kB, `/docs` 72 kB, `/projects` 19 kB, đều 200.
- Backend `/health` 200, JWKS `/.well-known/tsudev-release-jwks.json` 200. Render deploy `28e6ea7` success 16:32Z.
- Không còn PR nào mở. #189/#190 chỉ đổi Storybook (không chạy ở production) và `dependabot.yml` ⇒ không cần deploy lại.

## 1. Làm trong phiên

**Ba PR Dependabot #180-#182 - đọc từng cái trước khi merge.**

- husky 9: hook không source `husky.sh` nên không phải sửa; đo trên repo nháp - `husky install` vẫn chạy nhưng in DEPRECATED, `husky` đặt `core.hooksPath=.husky/_`. Runner mới chạy hook bằng `sh -e`; `pre-push` vẫn đúng dưới `-e`.
- dotenv 18: đo bằng 18.0.9 - `config()` in `◇ injected env (N) from <tệp>` ra stderr **kể cả khi tệp không tồn tại** (`injected env (0)`). Production không có `.env` ⇒ sáu dòng rác mỗi lần backend-bundle khởi động. Thêm `quiet: true` ở 7 tệp. Thay đổi phá vỡ khác (bỏ preload `dotenv/config`, bỏ `.env.vault`) không chạm repo.
- tailwind 4: log CI `It looks like you're trying to use tailwindcss directly as a PostCSS plugin`. Là di trú (dựng lại ánh xạ token ↔ class, nghiệm thu bằng mắt ở ba chế độ) - §3.4.

**ESLint 9 flat config (#186).** Nghiệm thu bằng hai phép đo: (1) eslint 8 và 9 cùng **0 lỗi trên cùng 243 tệp** - bản phẳng lint thêm 3 tệp (`eslint.config.mjs`, `packages/ui/.storybook/*`) vì nó KHÔNG tự bỏ qua thư mục dấu chấm như bản 8 (nên phải khai `.open-next/`, `.wrangler/` trong `ignores`); (2) tệp mồi xác nhận năm bộ luật còn bắn - cấu hình phẳng sai thường cho 0 lỗi vì luật không được nạp, trông y hệt "sạch".

**Storybook 10 (#189).** `main.js` → `main.mjs` (Storybook 10 chỉ nạp ESM), gỡ `addon-essentials`. Đếm bằng Chromium trên bản `storybook build`: **36/36 lượt** (12 story × Sáng/Ấm/Tối), 0 lỗi console, 0 phản hồi ≥400 - bản 8 trước đó 24/24 (Sáng, Tối). Script đếm không commit (dùng `node_modules/playwright` + server tĩnh); mô tả cách làm ở `docs/design-system.md` §Storybook.

## 2. 🔴 Việc của chủ dự án

| #   | việc                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| -   | **Dọn nhánh remote cũ** - agent bị chặn xoá ref (bộ phân loại "Git Destructive"). Đã đo: mọi commit trên 9 nhánh dưới đây đều có trong `main` (cùng patch-id, hoặc đã squash/thay ở #81, #151), và còn khôi phục được qua `refs/pull/N/head`. Lệnh: `for b in ci/quet-bao-mat feat/siet-tai-len-ban-phat-hanh docs/ket-phien-20 feat/author-owner-accounts fix/phase-a-ssrf-ratelimit feat/qu-std-table-2 feat/docs-search docs/ban-giao-phien-37b chore/node-22-bookworm dependabot/npm_and_yarn/eslint-10.14.0 dependabot/npm_and_yarn/types/node-26.6.6 dependabot/npm_and_yarn/typescript-7.0.2 dependabot/npm_and_yarn/tailwindcss-4.3.4; do git push origin --delete "$b"; done` |
| -   | T18-T21 còn từ phiếu 02 (xoá 2 repo, tạo Org, thu hồi PAT lộ)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -   | (tuỳ chọn) đăng ký huy hiệu OpenSSF Best Practices tại bestpractices.dev - Scorecard #79                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## 3. Việc kế tiếp của agent

| #   | việc                                                                                                                                                                                                                                                                                                                                                                             | agent                                        | khi nào                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------- |
| 1   | Override `"minimatch@>=7 <11.0.1": "^11.0.1"` trong `package.json` gốc, lock bằng `npx -y npm@11.21.0` (KHÔNG npm 10.9 cục bộ - xoá `libc` của argon2). Kiểm `glob@10` còn chạy: `npm --workspace apps/frontend-main run build`, và Storybook (ĐẾM story). Merge ⇒ Dependabot #40 tự đóng; Scorecard #76 còn mở thì dismiss, lý do "phần còn lại là deepmerge, không có bản vá". | `infra-deploy` → `design-system` (đếm story) | **từ 10/11/2026**            |
| 2   | react-hooks 5.2 → 7 (luật React Compiler). Đã đo trên nhánh ESLint 9: **26 vi phạm ở 20 tệp** - 21 `set-state-in-effect`, 3 `refs`, 2 `purity`; nặng nhất `pages/admin/accounts.tsx` (4). Sửa là đổi hành vi từng trang (nạp dữ liệu trong effect) ⇒ một nhánh, nghiệm thu E2E. Gỡ `ignore` của `eslint-plugin-react-hooks` cùng lúc.                                            | `frontend-web` + `design-system` (3 tệp ui)  | khi có kế hoạch              |
| 3   | ESLint 10 + `@eslint/js` 10: **bị chặn bởi peer** - `eslint-plugin-react@7.37.5` nhận tới `^9.7`, `eslint-plugin-jsx-a11y@6.10.2` tới `^9`. Kiểm lại `npm view <gói> peerDependencies` trước khi bắt tay.                                                                                                                                                                        | `infra-deploy`                               | khi hai plugin nhận 10       |
| 4   | Tailwind 3 → 4: `@tailwindcss/postcss`, cấu hình CSS-first (`@theme`), dựng lại ánh xạ token ↔ class (`docs/design-system.md`), nghiệm thu bằng mắt ở ba chế độ + `contrast.test.ts`. Gỡ `ignore` của tailwindcss cùng lúc.                                                                                                                                                      | `design-system` → `frontend-web`             | khi có kế hoạch              |
| 5   | TypeScript 7: **bị chặn bởi peer** - `@typescript-eslint/*@8.72.1` nhận `typescript <6.1.0`.                                                                                                                                                                                                                                                                                     | `infra-deploy`                               | khi typescript-eslint nhận 7 |
| 6   | Chuyển repo vào Org.                                                                                                                                                                                                                                                                                                                                                             | `infra-deploy`                               | sau T19 của chủ dự án        |

## 4. Bẫy gặp

- **`gh pr checkout` không có cờ `-q`** - lệnh lỗi giữa chuỗi `&&` thì mọi bước sau bị bỏ, kể cả heredoc. May là không có gì bị ghi lên `main`; tách bước checkout ra và `set -e`.
- **`gh pr update-branch` ngay sau `git push` lên nhánh PR** có thể báo `head sha didn't match` - GitHub chưa thấy commit mới. Chạy lại sau vài giây.
- **Merge một PR ⇒ Dependabot mở PR mới NGAY** cho gói vừa vào cây: #186 thêm `@eslint/js` + `globals` ⇒ #187, #188 mở trong vài phút. Thêm gói mới thì nghĩ trước dòng `ignore` cho major của nó.
- **ESLint 9 bỏ formatter `unix`/`compact` khỏi lõi** - dùng mặc định hoặc `-f json`.
- **Bản phẳng không tự bỏ qua thư mục dấu chấm.** Thêm thư mục đầu ra dựng mới bắt đầu bằng `.` thì khai vào `ignores` của `eslint.config.mjs`.
- `npx -y npm@11.21.0 install` in `npm warn install-scripts ... approve` - npm 11 chặn script cài đặt chưa duyệt. `node_modules` có sẵn nên không ảnh hưởng; máy mới thì xem `npm install-scripts ls`.

Hiện trạng máy lúc đóng phiên 41: không worktree, không tiến trình nền; Postgres user-space :5433 vẫn chạy. `node_modules` cục bộ theo lock của `main` + nhánh Storybook 10.
