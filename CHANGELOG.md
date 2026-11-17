# CHANGELOG

Mỗi bản phát hành **một dòng**, dạng `{version} - {DD/MM/YYYY} - {nội dung}`
(`.standards/docs/DESIGN_SYSTEM.md` §6). Mới nhất trên cùng.

tsudev là **website**, không phải app cài đặt, nên nó không mang chuỗi version
theo khuôn `{YY}.{M}.{DD}{NN}` - khuôn đó chỉ áp cho tool/phần mềm desktop phát
hành thành file cài. Ở đây mỗi dòng là một đợt thay đổi đáng kể, đánh dấu bằng ngày.

## Bản triển khai (thẻ git)

Từ 16/11/2026 mỗi lần phát hành production của `main` được gắn thẻ CalVer bằng `scripts/release-tag.js`
(deploy frontend tự gọi). Khuôn `deploy-YYYY.MM.DD.N` từ 17/11/2026 (phiếu 20261117-V1: tiền tố `v` dành cho
phiên bản app của hệ tsudev); các thẻ `vYYYY.MM.DD.N` cũ giữ nguyên. Nội dung thẻ là danh sách PR có trong bản đó:
<https://github.com/tsudev-org/tsudev/tags>. Mỗi thẻ một dòng dưới đây. _English: every production deployment is
tagged; the tag message lists the merged pull requests, and each line below summarises one tagged deployment._

- deploy-2026.11.17.9 - 17/11/2026 - OIDC: trang đăng nhập/đồng ý `/oidc/interaction/<uid>` hết 404 - mọi client OIDC (Sound Db) vào được (#310); xoá 5 logo gốc trò chơi (#290).
- deploy-2026.11.17.8 - 17/11/2026 - Kênh cài Sound Db, TsuFiles 2.4.1-vn.1 trong danh mục kho gói (#307).
- deploy-2026.11.17.7 - 17/11/2026 - Lượt xem bài trên /author (tổng + 30 ngày + từng bài); thẻ deploy đổi khuôn (#306).
- v2026.11.17.6 - 17/11/2026 - Hộp thoại có nút Huỷ riêng không hiện thêm nút Đóng (#300).
- v2026.11.17.5 - 17/11/2026 - Logo riêng TsuDisk trên /apps (#294).
- v2026.11.17.4 - 17/11/2026 - Sound Db trên danh bạ /apps (#298).
- v2026.11.17.3 - 17/11/2026 - OIDC: discovery công bố endpoint ở tsudev.com thay vì tên miền Render (#297).
- v2026.11.17.2 - 17/11/2026 - TsuDisk có lệnh cài Scoop (#295).
- v2026.11.17.1 - 17/11/2026 - Bảo mật tài khoản hết hiện 2FA mâu thuẫn, nhãn tiếng Việt cho mọi sự kiện; bảng tài
  khoản không cắt chữ; tiêu đề tab không lặp tên site; TsuFiles 2.4.1 + Scoop tsucwico trên /apps (#293).
- v2026.11.16.7 - 16/11/2026 - Danh bạ /apps thêm TsuDisk - quản lý phân vùng ổ cứng Windows (#291).
- v2026.11.16.6 - 16/11/2026 - Logo 5 trò chơi lấy từ website game (#288); nâng phụ thuộc Dependabot: Next 16.4.6,
  Tiptap 3.33, oidc-provider 9.14, ảnh Docker node 22 (#281-#283).
- v2026.11.16.5 - 16/11/2026 - Tiêu đề trang chủ: "Phần mềm nhỏ để dùng hàng ngày".
- v2026.11.16.4 - 16/11/2026 - Giao diện đen tuyền + xanh logo (thay tím); font mono Chivo Mono - số 0 không chấm,
  không gạch (#284).
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
