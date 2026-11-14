# PHIẾU BÀN GIAO - Kết phiên 36: production cập nhật, ATTT repo + máy, việc tài khoản GitHub

- **Mã phiếu**: 20261106-02
- **Từ**: phiên 36 (05-06/11/2026) - **Đến**: phiên 37 + chủ dự án
- **Trạng thái**: ĐÓNG - chuyển org xong 09/11; Express 5 xong; minimatch xong #220; T18/T20/T21 chuyển kế hoạch tổng mục 4 (đối soát phiên 53, 14/11/2026)
- **Thay phiếu**: [`20261105-06`](20261105-06_ket-phien-36-icon-a4.md) - ĐÃ ĐÓNG. (Phiếu nháp `20261106-01` ở PR #150 không merge - nội dung đã gộp vào đây.)

## 0. Trạng thái (đo, không suy)

- `main` có toàn bộ việc phiên 36. Không PR nào của agent còn mở. Không worktree, không tiến trình nền, không monitor. `logs/LOCKS.md` trống.
- **Frontend production ĐÃ deploy** (Version `41090c32`, 06/11): `/`, `/blog`, `/docs`, `/projects` 200; `/brand/logo-mark-64.avif` 200 (2.348 B); backend `/health` ok. Deploy CHẠY ĐƯỢC từ agent khi chủ dự án cho phép trong chat.
- ⚠️ **Sửa tiêu chí nghiệm thu cũ**: `/api/auth/providers` có `github` + `google` là ĐÚNG - Worker có secret `GITHUB_CLIENT_*`, `GOOGLE_CLIENT_*` thật. Tiêu chí "chỉ credentials + passkey" ở phiếu 05 sai.
- Branch protection `main`: **13 check bắt buộc + `strict: true`** (thêm `Image backend - dựng + khởi động như Render`).
- `npm audit --omit=dev` = 0. Dev: critical 0, high 0 (trước: 1 / 16).
- Secret scanning #1 (placeholder Telegram) đã đóng false positive.

## 1. Đã xong trong phiên 36

| PR                                       | việc                                                                                                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #137                                     | Icon nền tảng chính thức (hover màu hãng), logo cú AVIF/WebP 2-9 kB                                                                                                                      |
| #138                                     | A4: pr-gates (dependency-review, actionlint, zizmor, trivy-config), Scorecard                                                                                                            |
| #151                                     | Node 22 bookworm + job CI dựng/khởi động image backend thật                                                                                                                              |
| #149                                     | Chặn duyệt ngược `..` ở proxy BFF + slug (CodeQL critical)                                                                                                                               |
| #153                                     | Giới hạn tần suất theo tài khoản (auth 120/phút + 10/phút route dò được), token nội bộ so thời gian hằng, open redirect `/\evil`, KHÔNG log URL presign, ReDoS ×3, mailer, log injection |
| #148                                     | Xoá Dockerfile hỏng + lock lạc của content/storage (18 cảnh báo runtime)                                                                                                                 |
| #155                                     | Vá phụ thuộc dev: vite 6, ts-eslint 8.72.0, lint-staged 17, nodemon 3, Storybook 8.6.19, overrides uuid/glob                                                                             |
| #144, #146, #147, #145, #134, #141, #140 | jose ignore, gỡ plugin prettier chết, Prettier 3, concurrently 10, simplewebauthn 14, nhóm dev, upload-sarif                                                                             |

Ngoài repo: `swico` → **`tsudev-swico`** (link winget cũ vẫn 206 qua chuyển hướng); `tsudev-contact` → Private; bật secret scanning + push protection + Dependabot cho tsudev-cwico/tsudev-swico, Dependabot cho app-la-ban/tsudev-contact/sumy-wedding; bảo vệ nhánh tối thiểu (cấm force-push/xoá) cho tsudev-cwico, tsudev-swico.

Máy dev: xoá `tsudev/backup/production-env-2026-08-19.txt`, `tsudev/.env.bak-*`, `~/.secrets/tsudev/prod.env`; 22 tệp bí mật trong `~/projects` về quyền 600; `~` = 700; xoá cache npm/pip (~20 GB); gitleaks toàn lịch sử mọi repo tsudev trên máy = 0.

## 2. 🔴 Việc TAY của chủ dự án

| #              | việc                                                                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T18            | **Xoá 2 repo** (đã duyệt trong chat 06/11): `tsudev-tsudev/winget-pkgs` (fork thừa) và `mieubathuong/mieubathuong` (bản cũ; bản giữ là `lichsuhomnay/mieubathuong`; chỉ mất `src/app/icon.svg`). Cần `! gh auth refresh -h github.com -s delete_repo` rồi `gh repo delete <repo> --yes`                      |
| T19            | **Tạo Organization** trên web (tên `tsudev` ĐÃ CÓ NGƯỜI DÙNG; `tsudev-org`, `tsudevhq` còn trống) - xem §3.1                                                                                                                                                                                                 |
| T20            | 🔴 **Thu hồi GitHub PAT** lộ trong `xanuicam/ubnd` → `docs/PHASE_4_GITHUB_SECURITY_IMPLEMENTATION.md` (ở HEAD từ 26/06/2026; repo private, chưa bật secret scanning). Thu hồi ở GitHub Settings → Developer settings của tài khoản sở hữu, rồi xoá khỏi tệp. Ngoài hệ tsudev nên agent không tự sửa          |
| T21            | Dismiss CodeQL báo nhầm (agent bị chặn ghi): #6 (SHA-1 chỉ cho HIBP k-anonymity), #43 (slug chỉ còn [a-z0-9-]), #52 (log dev nhiều dòng có chủ đích), #56-#59 (script dev chạy tay), và `js/missing-rate-limiting` còn lại SAU khi #153 quét lại (giới hạn tự viết `@tsudev/ratelimit` CodeQL không nhận ra) |
| T10-T13, T4-T8 | còn từ phiếu 05 (T9 xong, T13 phần xoá prod.env xong)                                                                                                                                                                                                                                                        |

## 3. Việc kế tiếp của agent

1. **Chuyển repo vào Organization** (sau T19): `gh api -X POST repos/tsudev-tsudev/<repo>/transfer -f new_owner=<org>` cho tsudev, tsudev-cwico, tsudev-swico, tsudev-contact, tsudev-standards. Sau chuyển: cấp quyền GitHub App của Render cho org (không thì Render NGỪNG tự deploy), kiểm branch protection/secret còn, sửa `git remote` 5 thư mục ở `~/projects`, sửa URL trong `.standards-version`/`scripts/check-standards.sh` nếu trỏ `tsudev-tsudev/tsudev-standards`, kiểm link winget vẫn 200.
2. **#154 Express 4 → 5** - KHÔNG merge mù: path-to-regexp 8 đổi cú pháp route, async error, `req.query`; ngay vùng bảng tiền tố backend-bundle. Một phiên riêng, đọc migration guide, test bundle + job `backend-image`.
3. Sau **10/11/2026**: thêm override `minimatch@>=7 <11.0.1` → `^11.0.1` (bản vá ra 27/10, chưa đủ 2 tuần) - thao tác lock bằng `npx -y npm@11.21.0`, KHÔNG npm 10.9 cục bộ (xoá `libc` của argon2).
4. Giai đoạn 2 ATTT B1-B7 (phiếu 04 §3).
5. `docs/release-signing.md` mục "Siết tải lên"; `docs/auth.md` ép TOTP + giới hạn tần suất mới (biến `RATE_LIMIT_IDENTITY_MAX`, `RATE_LIMIT_SENSITIVE_MAX`, `RATE_LIMIT_ACCOUNT_MAX`).

## 4. Bẫy gặp (bổ sung)

- `npm install --package-lock-only` để áp `overrides`: xoá mục lồng nhau thì npm 11 có thể KHÔNG tạo lại ⇒ gói ghim cứng rơi về bản gốc (glob 7 CJS ⇒ OpenNext `globSync` gãy, CI "Build frontends" bắt được). Khôi phục cây con từ lock cũ, thay đúng mục.
- `overrides` theo cây con ép MỌI hậu duệ; ghim theo dải (`"glob@>=10.2.0 <10.5.0"`) ở gốc.
- `gh pr checks --watch` kết thúc trước khi check đến muộn được tạo - đếm đủ số check bắt buộc.
- Auto mode: merge PR mới tạo bị chặn tới khi chủ dự án cho phép rõ trong chat; dismiss CodeQL bị chặn.
- Worktree dùng `node_modules` liên kết từ repo chính ⇒ `@tsudev/*` trỏ về mã repo chính, không phải mã đang sửa: `npm ci` riêng.
- `AGENTS_KICKOFF/BOARD/LOG.md` là bộ log của project KHÁC (app-la-ban, ubnd); tsudev dùng AGENTS.md + logs/.
