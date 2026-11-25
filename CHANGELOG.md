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

- deploy-2026.11.25.8 - 25/11/2026 - Thẻ ứng dụng (trang chủ, Danh sách ứng dụng) có dải chéo góc "Open" / "Private" thay nhãn chữ, dòng "Author: TsuDEV + N Contributors" dưới tên app (số liệu cập nhật từ GitHub); trang chủ không còn cuộn ngang trên điện thoại 390 px (#395).
- deploy-2026.11.25.4 - 25/11/2026 - Trang An toàn `/security`: cách báo lỗ hổng và bằng chứng tự kiểm chứng được (SSL Labs A+, Mozilla Observatory A+, OpenSSF), liên kết ở chân trang; tsudev.com đã nộp danh sách HSTS preload (#385).
- deploy-2026.11.25.3 - 25/11/2026 - Nền chế độ Sáng dịu mắt (bộ quy ước v6.0.0), hoạ tiết nhẹ ở đầu và chân trang, logo màn đầu hiện ngay (#384).
- deploy-2026.11.25.2 - 25/11/2026 - Hết nháy khi tải trang (font tải sớm, font dự phòng đúng số đo, bỏ hiệu ứng ẩn ở màn đầu); trang chủ gọn hơn, thẻ danh mục chuyển sang Danh sách ứng dụng; hoạ tiết theo thể loại; chân trang mới; danh bạ Tsu Tramon (#382, #383).
- deploy-2026.11.25.1 - 25/11/2026 - security.txt liên hệ `security@tsudev.com`; thư của TsuDEV có Trả lời tới `contact@tsudev.com` (#381).
- deploy-2026.11.24.1 - 24/11/2026 - Trang Chính sách thanh toán, hoàn tiền và khiếu nại (`/chinh-sach-thanh-toan`), chân trang ghi thông tin chủ sở hữu, đường dẫn tiếng Việt `/dieu-khoan` `/quyen-rieng-tu` `/noi-quy`, `/.well-known/security.txt`; trình soạn bài nạp lười cho trang nhẹ hơn; cổng mã chết (knip) và ngân sách JS 170 KB trong CI; bộ quy ước v5.3.0 (#377).
- deploy-2026.11.21.5 - 21/11/2026 - Trang chủ bố cục mới: phần đầu ngắn gọn, lưới danh mục (nhóm ứng dụng, trò chơi, cài bằng lệnh) ngay màn đầu, quầng sáng đặc trưng TsuDEV; thẻ ứng dụng có dải màu riêng của từng sản phẩm; ảnh xem trước khi chia sẻ link vẽ lại (#358).
- deploy-2026.11.21.4 - 21/11/2026 - Bản sắc TsuDEV theo bộ quy ước v5.0.0: tiêu đề dùng font Inter (tự host), màu giữ nguyên; font tải về gọn hơn (#356).
- deploy-2026.11.21.3 - 21/11/2026 - Đăng nhập chung (OIDC) chịu được lúc máy chủ phụ bị chặn tạm: discovery và JWKS được đệm, lỗi tạm trả 503 kèm Retry-After thay vì trang HTML (#353).
- deploy-2026.11.21.2 - 21/11/2026 - `GET /api/v1/auth/providers` cho RP dựng nút đăng nhập; trang Bảo mật có mục Tài khoản liên kết (liên kết/gỡ Google, GitHub); bộ quy ước v4.3.0 (#351).
- deploy-2026.11.21.1 - 21/11/2026 - Sound Db trên /apps sang `sound.tsudev.com` (logo, website, kho gói Scoop/Homebrew), trường `oldWebsites` giữ lệnh cài Linux khi gói còn homepage cũ (#348); thanh toán VietQR: test dòng QR byte-chính-xác (#346) và vòng thử lại trùng mã P2002 (#347).
- deploy-2026.11.19.7 - 19/11/2026 - Bộ vẽ Markdown dùng chung `marked` 17 với trình soạn: trang công khai vẽ đúng nghiêng, gạch, H4, danh sách số/lồng, trích dẫn, bảng, chú thích ảnh, hộp ghi chú, nhúng YouTube/Vimeo (`frame-src` mở đúng hai nguồn); HTML vẽ trong `getStaticProps` nên `marked` không vào gói trình duyệt (#334).
- deploy-2026.11.19.6 - 19/11/2026 - Form tạo bài `/author` và dự án `/admin/projects` mặc định Nháp/chưa công bố; `/debug/boom` không còn cửa mở lại ở production (#333).
- deploy-2026.11.19.2 - 19/11/2026 - Trang chủ: câu phụ "Làm được, dùng được, chơi được" một dòng; nút thẻ ứng dụng "Tới Website" (bỏ icon) và "Tới GitHub" (nền đen, dấu GitHub trắng) (#318).
- deploy-2026.11.19.1 - 19/11/2026 - Thương hiệu TsuDEV: hero "Phần mềm TsuDEV / Làm được, dùng được, chơi được", Danh sách ứng dụng, Xem tất cả, Website dự án, icon GitHub, bỏ "Dựa trên" + trường `basedOn`, trang chủ ẩn lệnh cài, icon nền tảng tím → xanh logo (#315).
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

- 20/11/2026 - PRO2: kênh trạng thái `POST /api/rp/entitlements/status` (private_key_jwt, ≤ 100 `sub`, trả `ok`/`deleted`/`unknown_subject` cho mọi `sub` đã từng cấp quyền - không phụ thuộc grant 30 ngày; client `tsusync` hỏi thay; dấu tài khoản đã xoá giữ ≥ 1 năm) chống máy chủ đồng bộ xoá nhầm bản sao đám mây; DPoP (RFC 9449) cho `GET /api/me/entitlements` ⇒ `cnf.jkt` trong JWS; `/pro` chỉ còn gói 1 năm 490.000 ₫, điều khoản nguyên văn PRODUCT_POLICY 7.5; bộ quy ước v4.0.0 (ADR-0004, migration `20261120140000`).

- 20/08/2026 - Tái cấu trúc toàn bộ giao diện theo bộ quy ước v1.0.0: ba chế độ
  Sáng/Ấm/Tối, `tokens/design-tokens.json` thành nguồn chân lý duy nhất,
  `packages/ui/src/tokens.css` thành bản sinh ra, đổi tên toàn bộ token trên ~50
  file, thang chữ ghi đè hoàn toàn bằng token, ngày hiển thị chuẩn `DD/MM/YYYY`.
  Nghiệm thu: 12 trang × 3 chế độ không có lỗi tương phản, e2e 20/20.
