# PHIẾU BÀN GIAO - Phiên 57 (kết): kiểm thử đăng nhập, kênh gói TsuFiles 2.4.1, brownout pull_request_target

- **Mã phiếu**: 20261117-01
- **Phiên**: phiên 57 (tsudev-27), 16-17/11/2026 - nối phiếu 20261116-03
- **Trạng thái**: MỞ (mục 2)

## 1. Đã xong

| Việc                                                                                                                                                                                                                                                                                                                                                                                                                              | PR / nơi   | Số đo                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| Kiểm thử bằng trình duyệt 3 tài khoản seed (khách, MEMBER, OWNER + TOTP) trên dev local + rà quét production                                                                                                                                                                                                                                                                                                                      | -          | 26 + 23 trang                                                                                                 |
| /settings/security: khối TOTP vẽ CẢ nút Bật lẫn form Tắt dù "Đạt" ⇒ theo `posture.totp`; 7 sự kiện bảo mật in mã thô (`step_up_failed`...) ⇒ có nhãn + test quét nguồn `logSecurity`; nút "Thêm passkey" không gãy dòng                                                                                                                                                                                                           | #293       | frontend 243/243                                                                                              |
| /admin/accounts: ô vai trò bị cắt ("Đăng b"), "Thu hồi phiên" gãy 3 dòng, IP `::ffff:x` ⇒ IPv4; `aria-label` cho ô chọn                                                                                                                                                                                                                                                                                                           | #293       | -                                                                                                             |
| Tiêu đề tab không lặp tên site ("Nội quy tsudev - tsudev") - `lib/seoTitle.ts` + test                                                                                                                                                                                                                                                                                                                                             | #293       | prod `/terms` `/rules` đúng                                                                                   |
| C6: `pkg:catalog` - tsudev-files 2.4.1-vn.1 (Scoop, Homebrew), Scoop `tsucwico`                                                                                                                                                                                                                                                                                                                                                   | #293       | prod `/apps` có `scoop install tsudev/tsucwico`                                                               |
| Deploy `v2026.11.17.1`, Worker `db19215f`                                                                                                                                                                                                                                                                                                                                                                                         | -          | `/` `/apps` `/blog` `/docs` `/ung-ho` `/terms` `/rules` 200; providers = credentials, passkey, github, google |
| Logo riêng TsuDisk (phiếu D2)                                                                                                                                                                                                                                                                                                                                                                                                     | #294 ⛔    | chờ duyệt                                                                                                     |
| TsuDisk có Scoop - gỡ ngoại lệ C4 (phiếu D3)                                                                                                                                                                                                                                                                                                                                                                                      | #295       | ui 254/254                                                                                                    |
| Hệ sinh thái: Tsu Contact winget (winget-pkgs#477388 → `tsudev.TsuContact` 26.11.1601); tsuswico#26 (tách tệp, cột số căn phải) + deploy swico; Scoop/Homebrew TsuFiles 2.4.1 (scoop-bucket#13, homebrew-tap#7); linux-packages#28 (`doi-chieu-kenh.mjs`, sửa dựng thử kho bản cũ); scoop-bucket#14 (mô tả tsucwico); lotus-share#47 + deploy; cwico website deploy + STATE (#74); rà quét giao diện lotus/cwico/swico/contact OK | nhiều repo | xem phiếu 20261116-03 + kết quả các phiếu D1-D3                                                               |

## 2. Còn lại

- ⛔👤 **Trước 02/12/2026**: GitHub chặn `pull_request_target` mặc định trên repo công khai. Cổng BẮT BUỘC "Bảo vệ bản
  quyền" (tsudev, scoop-bucket, linux-packages, homebrew-tap) dùng đúng sự kiện đó ⇒ không làm thì mọi PR kẹt vĩnh viễn.
  Chủ dự án tạo Actions event policy ở org (Settings → Actions → Policies, hoặc `POST /orgs/tsudev-org/actions/policies`
  cần quyền admin:org): enforcement `active`, repo 4 cái trên, `workflow_path` `.github/workflows/bao-ve-ban-quyen.yml`,
  rule `restrict_action_events` cho phép `pull_request_target`. tsufiles còn `label-pr.yml` cùng loại (phiên tsufiles
  quyết). Brownout 16/11 16:00-18:00 UTC đã làm cổng `startup_failure` ở mọi PR - đó là bằng chứng.
- 👤 Duyệt lượt `xuat-ban` 43613604585 của linux-packages (environment `packages`) ⇒ APT/RPM có TsuFiles 2.4.1.
  Agent bị bộ phân loại chặn khi duyệt.
- 👤 Áp nội dung giới thiệu đã sửa lên Neon: `DATABASE_URL='<neon>' node scripts/don-noi-dung-lac-de.js --apply --noi-dung`
  (bài blog còn ghi "đen + tím" ở production).
- ⛔ Chờ `nguyentrangtinhsu` duyệt: tsudev #290 #294; trafficmonitor#69 (ruleset bật "extra approval for unattributed
  changes" - PR có commit đồng tác giả Claude cần người khác duyệt); Scorecard linux-packages#27, scoop-bucket#12,
  homebrew-tap#6; linux-packages#29 (workflow đối chiếu hằng ngày).
- 🧭 Đo lượt gộp lượt xem (sau 01:23 UTC 17/11) → /author (phiếu 20261116-01 mục 2).

## 3. Bẫy mới

- 🪤 Deploy khi `npm run dev:local` còn chạy ⇒ `opennextjs-cloudflare build` lỗi "`redirect` can not be returned from
  getStaticProps during prerendering (/projects)" - hai bên dùng chung `.next`. Dừng dev trước khi deploy.
- 🪤 Proxy dev ở máy này là cổng **8090** (`DEV_PROXY_PORT` trong `.env`), không phải 8080.
- 🪤 GitHub brownout `pull_request_target`: run `startup_failure`, không job, `gh run view` chỉ nói "workflow file
  issue"; lý do thật CHỈ hiện ở mục Annotations khi mở trang run bằng trình duyệt đã đăng nhập.
- 🪤 Test của app không dịch JSX: hàm muốn test thì đặt ở `lib/*.ts`, không trong `components/*.tsx`.
