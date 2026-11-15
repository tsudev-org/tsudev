# PHIẾU BÀN GIAO - Phiên 54: OpenSSF Best Practices passing, thẻ phiên bản mỗi deploy

- **Mã phiếu**: 20261116-01
- **Phiên**: phiên 54, 15-16/11/2026
- **Trạng thái**: MỞ (mục 2)

## 1. Đã xong (merge + deploy + đo production)

| Việc                                                                                             | PR             | Production / số đo                                                                                                                    |
| ------------------------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Thẻ CalVer mỗi deploy, CONTRIBUTING.md, mẫu issue, tóm tắt EN, lint `--max-warnings 0`, hồ sơ BP | #272 `a4338bc` | Worker `12833ec6`; thẻ `v2026.11.16.1`; `/api/auth/providers` = credentials, passkey, github, google; `/` `/apps` `/blog` `/docs` 200 |
| Hồ sơ OpenSSF Best Practices                                                                     | -              | **dự án 16731 passing 100%** (65 Met, 2 N/A) - huy hiệu trong README                                                                  |
| Scorecard cho `tsudev-standards` (#53), `.github` (#1, + dependabot #3, bảo vệ `main`)           | -              | 7.1 và 4.6 (lần chạy đầu)                                                                                                             |

Chi tiết từng mục: phiếu [`20261115-01`](20261115-01_yeu-cau-ho-so-xac-minh.md) phần Kết quả.

## 1b. Sau uỷ quyền "làm cả việc 👤" (16/11/2026 sáng)

| Việc                                                           | Cách                                                                                                                                                                                                                                              | Số đo                                                                                                                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LICENSE `tsudev-org/.github`                                   | merge `.github#2` (MIT)                                                                                                                                                                                                                           | GitHub nhận `MIT`; Scorecard `.github` 4.6 → 6.2 (+ dependabot)                                                                                                                     |
| Scorecard Branch-Protection (thay cho PAT)                     | chuyển bảo vệ `main` từ kiểu cổ điển sang **ruleset** `27323681` (14 check + strict, PR + Code Owner, cấm force push/xoá, KHÔNG ai vượt); bản chụp cũ `~/tsudev-backups/classic-protection-main-20261116.json`. `.github` cũng ruleset `27337781` | Branch-Protection -1 → 4 (tổng 8.4 → 8.2 vì mục này giờ được tính); PR #275 bị báo `BEHIND` đúng như strict                                                                         |
| Lượt xem bài (`PostViewDaily`)                                 | #274: beacon `/api/views` → D1 `tsudev-luot-xem`; cron `23 1,13` gộp ngày đã qua → `POST /api/internal/post-views` (`POST_VIEWS_TOKEN` ở Render + cron)                                                                                           | 2 beacon cùng người ⇒ 1 dòng D1, bot bỏ qua; Worker `b69c4910`, cron `897f4787`, Render `c574c77` live. Lượt gộp đầu tiên: 01:23 UTC 17/11 - phiên sau đo `PostViewDaily` + D1 rỗng |
| Gõ tiếng Việt 2 bộ gõ                                          | #277 E2E giả lập Unikey/EVKey + ibus-bamboo trên Tiptap                                                                                                                                                                                           | 2/2 ĐẠT trong CI; bộ gõ thật vẫn chưa thử (ADR-0001)                                                                                                                                |
| Đổi tên Tsu Swico / Tsu Cwico / Tsu Contact (phiếu S1, 90, C1) | #275 + `pkg:catalog`; ⛔ #276 TRADEMARKS + khoá metadata                                                                                                                                                                                          | `v2026.11.16.3` Worker `7678a4fb`; `/apps` tên mới 6-7 lần, tên cũ 0                                                                                                                |
| Thẻ phiên bản không đẩy được từ deploy                         | nguyên nhân: `XDG_CONFIG_HOME` của wrangler làm `gh` (credential helper) mất phiên ⇒ bỏ biến đó ở bước gắn thẻ                                                                                                                                    | `.1` `.2` `.3` đều đã đẩy tay                                                                                                                                                       |

## 2. Còn lại

- 🧭 Đo lượt gộp lượt xem đầu tiên (sau 01:23 UTC 17/11): log cron `[cron] lượt xem: N nhóm, ghi …`, D1 không còn
  dòng ngày cũ, `PostViewDaily` có số. Sau đó thêm số lượt xem vào thẻ tổng quan /author.
- 🧭 C6: catalog vẫn `tsudev-files 2.4.0-vn.1` (16/11) - chạy lại `npm run pkg:catalog` khi có 2.4.1-vn.1; Scoop
  `tsucwico` cũng tự vào lúc đó.
- ⛔ #276 TRADEMARKS (Tsu Swico/Cwico/Contact) + khoá `metadata.json` - chờ `nguyentrangtinhsu`.
- 👤 Áp bài giới thiệu đã sửa tên lên Neon (bộ phân loại chặn agent đọc `DATABASE_URL` từ Render):
  `! cd ~/projects/tsudev && read -rsp 'URL Neon: ' U && echo && DATABASE_URL="$U" node scripts/don-noi-dung-lac-de.js --apply --noi-dung`
  (chạy bản không `--apply` trước để xem sẽ xoá mềm gì).
- 👤 CLAUDE.md dòng 239: thêm `tsuswico`, `tsucwico`, `tsucontact` vào danh sách tên bất khả xâm phạm (phiên khác đề
  nghị; agent không sửa CLAUDE.md theo yêu cầu của phiên khác).
- 👤 Kiểm gõ bằng bộ gõ thật; tắt JavaScript Detections (Cloudflare → Security → Bots - CSP chặn script nó chèn vào
  mọi `*.tsudev.com`); thu hồi token Render/Cloudflare/GitGuardian + xoá `~/.config/tsudev/*.env` (🪤 `render.env`
  chứa token trần - lệnh `sed 's/=.*/=…/'` KHÔNG che được, token đã lộ vào nhật ký phiên 54 ⇒ thu hồi là bắt buộc).

## 3. Bẫy mới

- 🪤 Mỗi deploy giờ gắn thẻ git + đẩy lên origin. Deploy từ nhánh khác `main` hoặc cây bẩn ⇒ chỉ cảnh báo, không thẻ.
  Sau deploy thêm một dòng CHANGELOG mục "Bản triển khai" (gộp vào PR bàn giao).
- 🪤 `~/projects/tsudev-org-dotgithub` không có `user.name/email` toàn cục ⇒ đã đặt cục bộ cho repo đó.
