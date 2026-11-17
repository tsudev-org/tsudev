# PHIẾU BÀN GIAO - Phiên 57 (cuối): Best Practices toàn hệ, OIDC, Sound Db, chính sách pull_request_target

- **Mã phiếu**: 20261117-02
- **Phiên**: phiên 57 (tsudev-27), 16-17/11/2026 - nối phiếu 20261117-01 (đọc kèm mục 1-3 của phiếu đó)
- **Trạng thái**: MỞ (mục 2)
- **Khoá**: không giữ khoá nào (`logs/LOCKS.md` trống). Không còn server dev / tác vụ nền.

## 1. Đã xong (sau phiếu 20261117-01)

| Việc                                                                                                                                                                                                                   | Nơi                                                            | Số đo                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| Actions event policy **15243** cho `pull_request_target` (cổng Bảo vệ bản quyền ở tsudev, scoop-bucket, linux-packages, homebrew-tap) - hạn GitHub 02/12/2026                                                          | org tsudev-org                                                 | cổng homebrew-tap#6 khởi động lại được                  |
| OIDC: discovery công bố endpoint ở tsudev.com (proxy gửi `x-forwarded-host` cố định)                                                                                                                                   | #297, v2026.11.17.3                                            | `authorization_endpoint` = https://tsudev.com/oidc/auth |
| Sound Db trên /apps (ngoại lệ C4 tạm `sounddb`)                                                                                                                                                                        | #298, v.4                                                      | trang chủ "9 ứng dụng"                                  |
| Logo TsuDisk                                                                                                                                                                                                           | #294, v.5                                                      | `/eco/disk.webp` 200                                    |
| Hộp thoại có Huỷ riêng không hiện thêm "Đóng"; "Thêm passkey" không gãy dòng                                                                                                                                           | #300, v.6 Worker `60537a75`                                    | kiểm 390px + Sáng 16 trang OWNER: 0 tràn ngang          |
| **OpenSSF Best Practices passing 100%**: Tsu Contact **16836**, Tsu Swico **16837**, Tsu Cwico **16838** (cùng tsudev 16731, tsufiles 16719)                                                                           | tsucontact #30 #31; tsuswico #27 #28 #32; tsucwico #75 #76 #77 | huy hiệu ở README từng repo                             |
| Kèm theo hồ sơ: CONTRIBUTING/SECURITY/mẫu issue còn thiếu; ghim SHA 36 action + quyền token tối thiểu (swico, cwico); Dependabot (swico); bật CodeQL default setup (swico, cwico) và sửa 3 cảnh báo high CodeQL tìm ra | như trên                                                       | CodeQL mở = 0 ở swico, cwico                            |
| SECURITY.md của tsucwico SAI so với mã (ghi "không truy cập mạng" dù có updater bắt buộc + chữ ký minisign; hỗ trợ "1.0.x") - đã sửa                                                                                   | tsucwico#75                                                    | -                                                       |
| Hồ sơ Tsu Cwico ban đầu ghi nhầm giấy phép Apache-2.0 - đã sửa thành **MIT** (đúng LICENSE) trên hồ sơ + `docs/best-practices.json`                                                                                    | tsucwico#77                                                    | API 16838 trả "MIT License"                             |
| lotus-share: ghi rõ vì sao CHƯA thể khai passing (9 cảnh báo Dependabot ở công cụ dựng AppImage ARM64, cảnh báo CodeQL Rust)                                                                                           | lotus-share#48 (phiếu 20261115-01)                             | -                                                       |

## 2. Còn lại (thứ tự đề xuất)

1. 👤 **Duyệt lượt `xuat-ban` 43613604585** của linux-packages (environment `packages`) ⇒ APT/RPM có TsuFiles 2.4.1.
   Bộ phân loại chặn agent duyệt.
2. 👤 **Neon** (máy agent không có chuỗi kết nối; chủ dự án có thể đặt `~/.config/tsudev/neon.env` `DATABASE_URL=...`
   chmod 600 để agent chạy rồi thu hồi):
   - chèn `OAuthClient` `sounddb` (SQL ở phiếu `20261117-SD1` mục 2);
   - `DATABASE_URL='<neon>' node scripts/don-noi-dung-lac-de.js --apply --noi-dung` (bài blog còn "đen + tím").
3. ⛔ Duyệt bằng tài khoản **`nguyentrangtinhsu`** (KHÔNG phải `tsudev-tsudev` - tác giả không tự duyệt được): tsudev
   #290; trafficmonitor #69 (ruleset "extra approval for unattributed changes"); Scorecard linux-packages #27,
   scoop-bucket #12, homebrew-tap #6; linux-packages #29.
4. 🧭 **lotus-share passing**: làm theo phiếu `lotus-share/logs/handover/20261115-01` mục Kết quả (nâng urllib3/lief +
   chạy thử release ARM64, hoặc đóng cảnh báo có lý do; rà CodeQL `rust/disabled-certificate-check`...).
5. 🧭 Best Practices còn lại: linux-packages (không bắt buộc). **trafficmonitor KHÔNG làm được trung thực**: giấy phép
   Anti-996 (thừa hưởng từ dự án gốc) không phải FLOSS theo OSI/FSF ⇒ `floss_license` không Met. tsudisk, sound-db do
   phiên riêng của repo đó làm (mẫu: `tsucontact/docs/best-practices.json`).
6. 🧭 `dynamic_analysis` (gợi ý) đang Unmet ở swico, cwico: thêm kiểm thử thuộc tính/fuzz (FsCheck, proptest) rồi khai lại.
7. 🧭 Đo lượt gộp lượt xem (phiếu 20261116-01 mục 2) → /author. tsudev-standards#55 (đề xuất bảng màu xanh logo) chờ duyệt.
8. 👤 Thu quyền `admin:org` khỏi `gh` (`gh auth refresh -h github.com -r admin:org`); thu hồi token Cloudflare cũ và xoá
   `~/.config/tsudev/cloudflare.env`.

## 3. Bẫy mới

- 🪤 Công cụ hồ sơ Best Practices: `~/projects/logs/tools/bestpractices/README.md` - chạy qua `cmd.exe` phía Windows;
  `fill` báo "Chưa đăng nhập được" có khi chỉ là lỗi thoáng qua - chạy lại một lần trước khi đòi `--headed`.
  `fill --submit` lại vẫn ghi đè câu trả lời cũ (đã dùng để sửa giấy phép 16838).
- 🪤 Đừng suy giấy phép theo repo bên cạnh: tsucwico là **MIT**, tsucontact/tsuswico/lotus-share là Apache-2.0,
  trafficmonitor là Anti-996. Đọc `LICENSE` trước khi khai.
- 🪤 Bật CodeQL default setup lần đầu sẽ tìm ra lỗi thật (3 high ở 2 repo) - khai `static_analysis_fixed` chỉ sau khi
  `code-scanning/alerts?state=open&tool_name=CodeQL` = 0 trên `main`. CodeQL không nhận "lặp replace tới khi ổn định" là
  đã vá - viết lại bằng duyệt chuỗi.
- 🪤 Không chạy `npm run dev:local` song song với deploy (dùng chung `.next` ⇒ lỗi `redirect` lúc prerender `/projects`).
