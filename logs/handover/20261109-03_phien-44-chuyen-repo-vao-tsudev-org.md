# PHIẾU BÀN GIAO - Phiên 44: chuyển 5 repo vào `tsudev-org`

- **Mã phiếu**: 20261109-03
- **Từ**: phiên 44 (09/11/2026) - **Đến**: chủ dự án + phiên 45
- **Trạng thái**: MỞ
- **Liên quan**: [`20261109-02`](20261109-02_phien-43-xoa-nhanh-va-sua-moc-minimatch.md) vẫn MỞ cho §2 (minimatch, sớm nhất 08:08 11/11).

## ⚡ Khởi động phiên 45

1. Đọc `AGENTS.md`, `logs/STATE.md`, phiếu này và §2 phiếu 20261109-02.
2. Kiểm §2 dưới đây (việc tay của chủ dự án) đã xong chưa - chưa thì Render KHÔNG tự deploy.

## 1. Đã làm (09/11/2026)

- Chủ dự án tạo Org `tsudev-org` (T19). Merge #202 (chú thích ESLint 10), #203 (STATE).
- Chuyển `tsudev-standards`, `tsudev-contact`, `tsudev-swico`, `tsudev-cwico`, `tsudev` từ `tsudev-tsudev` sang `tsudev-org`
  bằng `gh api -X POST repos/tsudev-tsudev/<repo>/transfer -f new_owner=tsudev-org` (token `gh` sẵn có đủ quyền).
- Đối chiếu trước/sau: branch protection giữ nguyên (tsudev: 13 check + strict + review; standards: 4 check), secret
  Actions giữ (`TAURI_SIGNING_*` của cwico), environment Render giữ, số release giữ (17/2/1/1).
- **Chuyển repo làm TẮT hai thứ, đã bật lại**: secret scanning + push protection (tsudev, cwico, swico, standards) và
  CodeQL default setup (tsudev, standards - cwico/swico vốn chưa bật). Dấu hiệu: PR sau chuyển chỉ có 13 check thay 19.
- URL cũ đều sống qua chuyển hướng (đo sau chuyển): updater cwico `releases/latest/download/latest.json`, updater swico
  `api.github.com/repos/tsudev-tsudev/swico/releases/latest`, hai `InstallerUrl` winget, raw/codeload của standards.
- `git remote` 5 thư mục ở `~/projects` trỏ `tsudev-org`. #204: đổi URL trong tsudev (SECURITY, README, seed, TSD,
  CLAUDE.md), đồng bộ lại `.standards` v3.1.1 từ `tsudev-org/tsudev-standards` (nội dung không đổi).
- Production sau chuyển: `/health` 200, JWKS 200, `tsudev.com` 200, providers chỉ `credentials`. Backend vẫn chạy `cf77ebe`.

## 2. 🔴 Việc TAY của chủ dự án (chỉ làm được trên web)

| #   | việc                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T22 | **Cài GitHub App của Render cho `tsudev-org`** (Render dashboard → Account settings → GitHub, hoặc github.com/apps/render) rồi kiểm service `tsudev-backend` vẫn nối repo `tsudev-org/tsudev` (Settings → Build & Deploy → Repository). Đo 09/11: merge #204 (`4cf9c09`) KHÔNG sinh deploy nào. Xong thì bấm Manual Deploy → latest commit để nghiệm thu |
| T23 | Cài GitGuardian cho `tsudev-org` (check "GitGuardian Security Checks" biến mất sau chuyển; không phải check bắt buộc)                                                                                                                                                                                                                                    |
| T24 | (tuỳ chọn) Org Settings → Authentication security: bắt 2FA cho thành viên                                                                                                                                                                                                                                                                                |

### Kết quả (09/11, cùng phiên)

- **T22 XONG**: chủ dự án cài app `render` cho `tsudev-org` (all repos), đổi Source của `tsudev-backend` sang
  `tsudev-org/tsudev` (Render gọi mục này là **Source**, không phải "Repository") rồi Deploy. Bẫy: sau khi cài app,
  Render chuyển tới trang **"Create a new Blueprint Instance"** - KHÔNG bấm Connect ở đó (dựng bộ service thứ hai).
  Deploy bấm tay KHÔNG sinh bản ghi deployment trên GitHub - nghiệm thu bằng lần merge kế tiếp (PR ghi kết quả này).
- **T23 XONG**: app `gitguardian` cài cho org (all repos), nối vào workspace cũ `tsudev-tsudev`; 5 nguồn `tsudev-org/*`
  ở trạng thái Monitored.

## 3. Việc của agent còn lại

| việc                                                                                   | ghi chú                                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Nghiệm thu Render sau T22                                                              | deployment mới cho HEAD `main`, `/health` + JWKS 200                                  |
| Đổi `REPO=` mặc định trong `scripts/sync-standards.sh` + docs của `tsudev-standards`   | cần ra bản standards mới rồi sync xuống repo con; hiện chạy được nhờ chuyển hướng     |
| Đổi URL `tsudev-tsudev/*` trong cwico/swico/contact (README, updater, winget template) | việc của từng repo; KHÔNG gấp - bản đã cài dùng URL cũ nên chuyển hướng phải sống mãi |
| Dữ liệu dự án trên Neon còn `repoUrl` cũ (seed chỉ áp cho DB mới)                      | sửa qua trang admin nếu muốn; chuyển hướng vẫn chạy                                   |

⚠️ **ĐỪNG BAO GIỜ tạo repo tên `tsudev`, `tsudev-cwico`, `tsudev-swico`, `swico`, `tsudev-contact`, `tsudev-standards`
dưới tài khoản `tsudev-tsudev`** - GitHub bỏ chuyển hướng ngay khi tên cũ bị chiếm lại, và updater trong các bản app đã
cài sẽ gãy im lặng.

Ngoài phạm vi kế hoạch §3.1 (chưa chuyển, chủ dự án quyết): `tsudev-tsudev/tsudev-files` (private),
`tsudev-tsudev/tsudev-trafficmonitor`.

Hiện trạng máy: không khoá, không worktree; một lịch CronCreate (08:17 11/11, minimatch) chỉ sống trong phiên 44.
