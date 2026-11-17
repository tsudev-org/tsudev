# PHIẾU - An ninh GitHub toàn hệ (4 org + 3 tài khoản), người duyệt duy nhất nguyentrangtinhsu

- **Mã phiếu**: 20261117-03 - **Phiên**: 57 (tsudev-27), 17/11/2026 - **Trạng thái**: MỞ (mục 3)
- **Quyết định chủ dự án (17/11)**: an toàn bảo mật ưu tiên tuyệt đối; `nguyentrangtinhsu` là tài khoản phê duyệt;
  hạn chế tối đa việc duyệt tay ⇒ phương án chốt: duyệt tay CHỈ cho vùng nhạy cảm (cổng Bảo vệ bản quyền), mọi repo có
  lớp bảo vệ cơ bản, agent tự merge thay đổi mã thường khi CI xanh.
- ⚠️ `gh` trên máy này đăng nhập CẢ `tsudev-tsudev` VÀ `b4djl1h` ⇒ cả hai là tài khoản agent, KHÔNG được làm người
  duyệt / CODEOWNERS / `nguoi_duyet`. Chỉ `nguyentrangtinhsu`.

## 1. Kiểm toán 17/11/2026

- Org: chỉ tsudev-org bắt buộc 2FA; mọi thành viên 4 org đã có 2FA (không ai bị loại nếu bật).
- tsucwico, tsuswico, tsudev-standards không có ruleset; sound-db, scoop-bucket, homebrew-tap, qulythuchi không đòi PR.
- 10 repo private (TsuGameLabs x7, xanuicam/ubnd, mieubathuong, repo cá nhân) ở gói Free: GitHub KHÔNG cho ruleset /
  secret scanning / CodeQL với repo private gói Free.

## 2. Đã làm (17/11/2026)

- Dependabot security updates BẬT: scoop-bucket, linux-packages, homebrew-tap, tsufiles, .github, luyen-go-phim-releases.
- Báo lỗ hổng riêng tư BẬT: sound-db, luyen-go-phim-releases.
- Cả 4 org: repo MỚI tự bật dependency graph, Dependabot alerts + security updates, secret scanning + push protection.
- CodeQL default setup BẬT: scoop-bucket, linux-packages, homebrew-tap, .github (repo có workflow CodeQL riêng - tsudev,
  sound-db, trafficmonitor, lotus-share, tsudisk, tsufiles, tsudev-standards - KHÔNG bật để tránh xung đột).
- Ruleset "Bao ve main - bat buoc PR" (cấm xoá, cấm force-push, bắt buộc PR; deploy key được bỏ qua cho bot
  excavator/cap-nhat): tsucwico 27450972, tsuswico 27450979, tsudev-standards 27450984, sound-db 27450988, scoop-bucket
  27450994, homebrew-tap 27450997, qulythuchi 27451002.

## 3. Còn lại

1. 👤 Bắt buộc 2FA ở TsuGameLabs, xanuicam, mieubathuong (API không cho - chỉ giao diện): Org → Settings →
   Authentication security → "Require two-factor authentication" → Save. Không thành viên nào bị loại.
2. 👤 Org Settings → Member privileges: tắt "Repository creation - Public" cho member (chỉ owner tạo repo public).
3. 🧭 Phủ cổng Bảo vệ bản quyền (`bao-ve-ban-quyen.yml` + `scripts/bao-ve-ban-quyen.mjs` + `config/ban-quyen.json` +
   `.github/CODEOWNERS` → `@nguyentrangtinhsu`) cho repo chưa có: tsucwico, tsuswico, tsucontact, tsudev-standards,
   sound-db, qulythuchi, tsudisk, tsufiles, tsudev-trafficmonitor, lotus-share (kiểm từng repo). Mỗi repo thêm vào
   `conditions.repository_name.include` của Actions policy **15243** (cần `admin:org`) và thêm "Bảo vệ bản quyền" vào
   check bắt buộc của ruleset. Mẫu: repo tsudev (`config/ban-quyen.json`, `docs/ban-quyen.md`).
4. 🧭 Environment `packages` (linux-packages): thêm `nguyentrangtinhsu` làm người duyệt (hiện chỉ tsudev-tsudev - tài
   khoản agent). Cân nhắc BỎ tsudev-tsudev khỏi người duyệt để agent không tự ký phát hành.
5. 🧭 Repo private gói Free (mục 1): bảo vệ ở mức máy - pre-push hook (gitleaks), không push thẳng main theo quy ước;
   cân nhắc chuyển public (nếu không có bí mật) hoặc nâng gói để có ruleset.
6. 👤 Thu `admin:org` khỏi `gh` sau khi xong mục 3-4; xoá `~/.config/tsudev/cloudflare.env` sau khi thu hồi token.
