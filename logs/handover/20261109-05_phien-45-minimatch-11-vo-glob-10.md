# PHIẾU BÀN GIAO - Phiên 45: minimatch 11 làm vỡ glob 10 IM LẶNG - override phải kèm glob

- **Mã phiếu**: 20261109-05
- **Từ**: phiên 45 (09/11/2026) - **Đến**: phiên 46 + chủ dự án
- **Trạng thái**: MỞ
- **Thay phiếu**: [`20261109-04`](20261109-04_phien-44-quy-uoc-v3.2.0-va-dong-bo.md) (HOÀN THÀNH; việc còn lại chuyển
  sang đây) và §2 phiếu [`20261109-02`](20261109-02_phien-43-xoa-nhanh-va-sua-moc-minimatch.md) (HOÀN THÀNH; §2 đó
  **SAI** ở chỗ chỉ override minimatch - đọc §2 phiếu này thay thế).

## ⚡ Khởi động phiên 46

1. Đọc `AGENTS.md`, `logs/STATE.md`, phiếu này. `git fetch --prune && git status` trên `main` phải sạch.
2. Từ **08:08 11/11** (giờ +07): làm §3 - override minimatch **KÈM glob**. Đừng theo §2 phiếu 02 một mình.

## 1. Làm trong phiên

Phiên mở lúc 18:50 09/11 - CHƯA bản minimatch sửa lỗi nào đủ 14 ngày (11.0.1 đủ lúc 05:26 11/11, 11.0.2 lúc
08:08 11/11), và minimatch không vá ngược cho 9.x/10.x. Nên không override; dùng phiên để kiểm trước và bắt được §2.

Đo lại thư viện chặn (09/11, kể cả dist-tag `next`/`canary`): `eslint-plugin-react` 7.37.5 (peer eslint `^9.7`),
`eslint-plugin-jsx-a11y` 6.10.2 (`^9`), `typescript-eslint` 8.72.1 + canary 8.72.2-alpha (ts `<6.1.0`), `ts-jest`
29.4.15 (ts `<7`). Không đổi.

## 2. 🪤 minimatch 11 là MAJOR phá API - glob 10 trả `[]` không báo lỗi

Changelog 11.0: bỏ `makeRe()`, `Minimatch#regexp`, lớp `AST`, `maxExtglobRecursion`; phần tử của `Minimatch.set`
nay là chuỗi, đối tượng `Matcher` hoặc `GLOBSTAR` - **không còn `RegExp`**. `glob` 10.5.0 duyệt `mm.set` và chỉ biết
chuỗi / `RegExp` / `GLOBSTAR`.

Đo trong thư mục tạm (cây `t/x.js t/y.ts t/a/z.js t/a/b/w.js`), minimatch 11.0.2:

| glob   | `t/**/*.js` | `t/*.js` | `**/*.ts` | `t/a/**` | `ignore` |
| ------ | ----------- | -------- | --------- | -------- | -------- |
| 10.5.0 | `[]` ❌     | `[]` ❌  | `[]` ❌   | đúng     | -        |
| 13.0.6 | đúng        | đúng     | đúng      | đúng     | đúng     |
| 13.0.7 | đúng        | đúng     | đúng      | đúng     | đúng     |

Ai dùng glob 10 trong repo này (09/11):

- `@opennextjs/aws` → `@node-minify/core` 9.0.2 (`globSync`) - **bản dựng frontend production**.
- `babel-plugin-istanbul` 8.0.0 → `test-exclude` 7.0.2 (`glob.sync` + `ignore`) - **độ phủ jest**.

Hai bản minimatch 9.0.9 đang dính GHSA-g3hv-75wg-m249 CHÍNH là của glob 10 ⇒ override minimatch mà né glob 10 thì
cảnh báo vẫn mở. Phải kéo glob 10 lên 13.

Những người dùng khác an toàn: `@eslint/config-array` (`new Minimatch().match`), `nodemon` và
`@typescript-eslint/typescript-estree` (hàm `minimatch()`), glob 13.0.7 (đã đo).

## 3. 🎯 Override đúng (từ 08:08 11/11)

```json
"overrides": {
  "minimatch@>=7 <11.0.1": "11.0.2",
  "glob@>=10 <13": "13.0.6"
}
```

- Dòng glob **thay** `"glob@>=10.2.0 <10.5.0": "^10.5.0"` hiện có. Giữ các override khác.
- glob 13.0.6 (19/02/2026) đủ tuổi; **13.0.7 (06/11) chưa** - đủ lúc 10:54 20/11. Ghim CHÍNH XÁC, không `^`.
- Muốn bản minimatch mới hơn: 11.0.3 đủ lúc 03:00 12/11, 11.0.4 lúc 11:50 16/11, 11.0.5 lúc 06:30 20/11.
- `npm ls` sẽ báo `invalid` (glob 13.0.6 khai `minimatch ^10.2.2`) - đã biết, không phải lỗi.
- Lock bằng `npx -y npm@11.21.0 install`. Sau đó `npm ls minimatch --all` chỉ còn 11.0.2 và 3.1.5 (ngoài dải lỗi);
  `npm ls glob --all` không còn 10.x.

Nghiệm thu - **so với bản trước override**, vì lỗi này không đỏ cái gì:

1. Đủ cổng: `format:check`, `lint`, `typecheck`, `topology:check`, `tokens:check`, test từng workspace.
2. Build frontend (OpenNext) TRƯỚC và SAU, so cây `.open-next/` (số tệp + kích thước) - `@node-minify` nhận `[]`
   là tệp không được thu nhỏ hoặc mất, không lỗi.
3. Jest `--coverage` ở một service TRƯỚC và SAU: số tệp trong bảng độ phủ phải bằng nhau.
4. Storybook: đếm đủ 36 story.
5. PR → CI xanh → merge → đóng Dependabot #40, dismiss Scorecard #76 (nếu Scorecard chưa tự đóng) → nghiệm thu Render
   (`/health`, JWKS 200). Không cần deploy frontend trừ khi bước 2 thấy khác biệt.

## 4. Còn lại

| việc                                              | trạng thái                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Override minimatch + glob                         | từ 08:08 11/11 - §3                                                                                     |
| `tsudev-files` vào org                            | phiên của repo đó, chờ chủ dự án xác nhận ở phiên đó (phiếu `tsudev-files/logs/handover/20261109-03_*`) |
| Gỡ `fixupPluginRules` (ESLint 10)                 | đo 09/11 tối: vẫn chặn (§1)                                                                             |
| Đổi hẳn sang TS 7                                 | đo 09/11 tối: vẫn chặn (§1)                                                                             |
| URL cũ trong mã cwico/swico (updater, winget)     | không gấp (chuyển hướng sống); việc của từng repo                                                       |
| `repoUrl` cũ trên Neon                            | không gấp; sửa qua trang admin                                                                          |
| `tsudev-cwico` local có `ui/package-lock.json` dở | chỉ `fetch`, chưa pull `main` - chủ việc đó tự xử lý                                                    |
| QU-STD-4, QU-STD-AUTH, C1                         | chờ quyết định của chủ dự án (STATE hàng đợi)                                                           |

Việc chủ dự án: T18, T20, T21 (phiếu 20261106-02); (tuỳ chọn) T24 bắt 2FA cho org.

Hiện trạng máy: không khoá, không tiến trình nền, không worktree, không lịch CronCreate.
