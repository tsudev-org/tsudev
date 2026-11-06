# PHIẾU BÀN GIAO - Kết phiên 40: dọn 7 PR Dependabot, sửa test tính chất XSS đỏ ngẫu nhiên

- **Mã phiếu**: 20261106-06
- **Từ**: phiên 40 (06/11/2026) - **Đến**: phiên 41 + chủ dự án
- **Trạng thái**: MỞ
- **Thay phiếu**: [`20261106-05`](20261106-05_ket-phien-39-don-canh-bao-github.md) - việc của phiếu 05 §3 chưa tới hạn (10/11), chép sang §3 dưới đây.

## ⚡ Khởi động phiên 41

1. Đọc `AGENTS.md`, `logs/STATE.md`, phiếu này. `git fetch && git status` trên `main` phải sạch.
2. **Từ 10/11/2026**: làm §3.1 (minimatch) - việc DUY NHẤT còn giữ hai cảnh báo cuối của tab Security.
3. Khoá file vào `logs/LOCKS.md` trước khi sửa; mỗi chuỗi việc một nhánh + PR. Merge: `gh pr merge <số> --merge` ĐỨNG MỘT MÌNH.
4. Kết phiên: nhả khoá, dừng tiến trình nền, viết phiếu mới, đổi phiếu này sang ĐÓNG.

## 0. Trạng thái (đo, không suy)

Phiên 39 bị tắt GIỮA bước đóng phiên: phiếu 05 + STATE đã viết nhưng chưa commit, khoá chưa nhả. Phiên 40 commit hộ (nhánh `docs/ket-phien-39`, cùng nhánh với phiếu này).

| PR   | nội dung                                                      | kết cục                                    |
| ---- | ------------------------------------------------------------- | ------------------------------------------ |
| #165 | `codeql-action/upload-sarif` 4.39.1 → 4.39.2                  | MERGED                                     |
| #166 | `@typescript-eslint/*` 8.72.0 → 8.72.1                        | MERGED                                     |
| #167 | supertest 6 → 7 (services)                                    | MERGED - CI đủ số test cũ                  |
| #172 | sửa `md.property.test.ts` bắt nhầm (§1)                       | MERGED                                     |
| #168 | jest 29 → 30 (services + ui)                                  | MERGED - 309·20·213·19·172 + ui 220        |
| #171 | `dependabot.yml`: chặn major `node` (docker), storybook, vite | MERGED `8ad1eb8`                           |
| #164 | ảnh Docker Node 22 → **25**                                   | ĐÓNG - bản lẻ không LTS, prod chạy 22      |
| #169 | `storybook` 8 → 10 (riêng gói lõi)                            | ĐÓNG - phá peer của `@storybook/*` 8.6     |
| #170 | vite 6 → 8                                                    | ĐÓNG - `builder-vite@8.6` chỉ nhận vite ≤6 |

### 0.1. Số đo cuối phiên

- Không còn PR nào mở. Tab Security: Scorecard #76 + Dependabot #40 (cả hai là minimatch, hẹn 10/11) - không đổi so với phiếu 05.
- Backend chưa cần deploy: không PR nào hôm nay đổi mã chạy ở production (jest/supertest/eslint là devDependencies). Frontend vẫn mang ghi chú phiếu 05 §3.2.

## 1. Làm trong phiên

**Dependabot - xanh CI không đủ để merge.** Bốn PR major được đọc từng cái:

- jest 30 / supertest 7: so `Tests:` của CI với số phiếu 05 ghi - khớp từng bộ, không có bộ nào biến mất.
- storybook 10 / vite 8: `npm view @storybook/react-vite@8.6.18 peerDependencies` ⇒ `storybook ^8.6.18`, `vite ^4||^5||^6`; `addon-essentials` không có bản sau 8. CI xanh CHỈ vì Storybook không nằm trong CI. Lên 10 là di trú có kế hoạch (cấu hình `.storybook/main.js` thành ESM, bỏ addon-essentials, nghiệm thu bằng ĐẾM story).
- Node 25: mục `docker` do phiên 39 thêm vào nhận cả major của tag. Lên LTS kế tiếp phải đổi `engines`, `node-version` của CI và ảnh nền cùng lúc.

**`md.property.test.ts` đỏ ngẫu nhiên (từ #163).** CI của #168 đỏ ở test này, không liên quan jest 30: seed `1323788955` sinh `[x](# <img src=x onerror=alert(1)>` ⇒ `<a href="# &lt;img src=x onerror=alert(1">`. Đầu ra VÔ HẠI (`"` và `<` đã thoát), nhưng regex `\son\w+=` quét cả giá trị thuộc tính. Sửa (#172): làm rỗng giá trị có nháy rồi mới tìm tên thuộc tính; ranh giới thêm nháy và `/` - vì regex cũ còn BỎ LỌT `<a href="#"onclick=x>` (trình duyệt đọc thành hai thuộc tính). Ghim hai phản ví dụ bằng `examples`.

## 2. 🔴 Việc của chủ dự án

| #   | việc                                                                                     |
| --- | ---------------------------------------------------------------------------------------- |
| -   | T18-T21 còn từ phiếu 02 (xoá 2 repo, tạo Org, thu hồi PAT lộ)                            |
| -   | (tuỳ chọn) đăng ký huy hiệu OpenSSF Best Practices tại bestpractices.dev - Scorecard #79 |

## 3. Việc kế tiếp của agent

1. **Từ 10/11/2026**: override `"minimatch@>=7 <11.0.1": "^11.0.1"` trong `package.json` gốc, thao tác lock bằng `npx -y npm@11.21.0` (KHÔNG npm 10.9 cục bộ - xoá `libc` của argon2). Kiểm `glob@10` (storybook, @node-minify) còn chạy: `npm --workspace packages/ui run storybook` rồi ĐẾM story, và `npm --workspace apps/frontend-main run build`. Merge xong ⇒ Dependabot #40 tự đóng; dismiss Scorecard #76 kèm lý do "phần còn lại là deepmerge, không có bản vá" nếu nó vẫn mở.
2. Deploy frontend lần tới (chủ dự án chọn để sau, 06/11) mang `lib/api.ts`/`lib/md.ts` của #163 lên Worker - qua `scripts/deploy-frontend.js`, nghiệm thu `/api/auth/providers`.
3. Chuyển repo vào Org sau T19.
4. (Khi có kế hoạch) Storybook 10 + vite 8: gỡ ba dòng `ignore` trong `dependabot.yml` cùng lúc.

## 4. Bẫy gặp

- **`main` strict: mỗi PR phải cập nhật theo `main` rồi chạy lại CI** (~5 phút/lượt), nên N PR = N lượt nối tiếp. `gh pr update-branch <số>` ghép được cả `package-lock.json` của các PR Dependabot nối nhau mà không xung đột; CI (`npm ci`) là nơi bắt lock hỏng nếu có.
- **Test theo tính chất có thể đỏ ở PR không liên quan** - seed đổi mỗi lượt. Gặp thì đọc `Counterexample` + `seed` trong log, tái hiện bằng `renderMarkdown(<phản ví dụ>)`, và quyết định lỗi nằm ở mã hay ở bất biến của test TRƯỚC khi chạy lại CI cho "xanh".
- Ghi khoá cho một nhánh sửa nhỏ: ghi vào `LOCKS.md` trên nhánh hồ sơ, không trên nhánh sửa - hai nhánh cùng sửa LOCKS thì PR sau xung đột.

Hiện trạng máy lúc đóng phiên 40: không worktree, không tiến trình nền; Postgres user-space :5433 vẫn chạy.
