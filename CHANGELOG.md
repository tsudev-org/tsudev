# CHANGELOG

Mỗi bản phát hành **một dòng**, dạng `{version} - {DD/MM/YYYY} - {nội dung}`
(`.standards/docs/DESIGN_SYSTEM.md` §6). Mới nhất trên cùng.

tsudev là **website**, không phải app cài đặt, nên nó không mang chuỗi version
theo khuôn `{YY}.{M}.{DD}{NN}` - khuôn đó chỉ áp cho tool/phần mềm desktop phát
hành thành file cài. Ở đây mỗi dòng là một đợt thay đổi đáng kể, đánh dấu bằng ngày.

## Bản triển khai (thẻ git)

Từ 16/11/2026 mỗi lần phát hành production của `main` được gắn thẻ CalVer `vYYYY.MM.DD.N` bằng
`scripts/release-tag.js` (deploy frontend tự gọi). Nội dung thẻ là danh sách PR có trong bản đó:
<https://github.com/tsudev-org/tsudev/tags>. Mỗi thẻ một dòng dưới đây. _English: every production deployment is
tagged; the tag message lists the merged pull requests, and each line below summarises one tagged deployment._

- v2026.11.16.3 - 16/11/2026 - Đổi tên trên danh bạ /apps: Tsu Swico, Tsu Cwico, Tsu Contact (repo + gói Scoop mới).
  E2E giả lập gõ tiếng Việt (Unikey/EVKey, ibus-bamboo) trong trình soạn.
- v2026.11.16.2 - 16/11/2026 - Lượt xem bài: beacon ghi D1 (không chạm Neon), cron gộp mỗi ngày một lô vào
  PostViewDaily.
- v2026.11.16.1 - 16/11/2026 - Thẻ phiên bản đầu tiên. Gắn thẻ CalVer mỗi lần deploy, CONTRIBUTING.md riêng,
  mẫu issue song ngữ, tóm tắt tiếng Anh trong README, lint `--max-warnings 0`, hồ sơ OpenSSF Best Practices
  (dự án 16731, passing 100%). Gồm cả P1 bảo mật tài khoản, P2 CMS, P4 OIDC, Turnstile (#252-#271).

## Chưa phát hành

- 20/08/2026 - Tái cấu trúc toàn bộ giao diện theo bộ quy ước v1.0.0: ba chế độ
  Sáng/Ấm/Tối, `tokens/design-tokens.json` thành nguồn chân lý duy nhất,
  `packages/ui/src/tokens.css` thành bản sinh ra, đổi tên toàn bộ token trên ~50
  file, thang chữ ghi đè hoàn toàn bằng token, ngày hiển thị chuẩn `DD/MM/YYYY`.
  Nghiệm thu: 12 trang × 3 chế độ không có lỗi tương phản, e2e 20/20.
