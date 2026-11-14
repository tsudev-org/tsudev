# KẾ HOẠCH TỔNG - Hoàn thiện 100% các project hệ sinh thái tsudev

- **Mã phiếu**: 20261114-01
- **Lập**: phiên 52 của repo `tsudev`, 14/11/2026, theo uỷ quyền của chủ dự án ("tự chọn phương án chuyên nghiệp,
  hiện đại nhất, cập nhật vào kế hoạch để phiên sau làm đến khi hoàn thành 100%")
- **Trạng thái**: MỞ - mỗi phiên của mỗi repo đọc mục 1 + đúng dòng của repo mình ở mục 3, làm, rồi đánh dấu tiến độ
  ở BẢN SAO phiếu trong repo mình (không sửa bản trung tâm này trừ phiên tsudev)
- **Chi tiết kỹ thuật + quyết định đã chốt (D1-D9)**: `tsudev/docs/de-xuat-bao-mat-cms-cai-bang-lenh.md`

## 1. Quy tắc chung cho mọi phiên (đọc trước)

1. Quyết định D1-D9 đã CHỐT - không hỏi lại chủ dự án. Chỉ dừng hỏi khi việc thuộc cột 👤 (chỉ chủ dự án làm được)
   hoặc ⛔ (cổng Bảo vệ bản quyền cần `nguyentrangtinhsu` duyệt trên GitHub). Gặp ⛔/👤: mở PR / ghi việc vào mục 4,
   rồi làm tiếp việc khác - không đứng chờ.
2. "Hoàn thành" = merge + deploy + nghiệm thu PRODUCTION có số đo (công cụ quét giao diện ra OK, curl, ảnh).
   Mã 200 không chứng minh trang có nội dung.
3. ⛔ Không tạo/đổi tên repo thành tên cũ dưới `tsudev-tsudev` (gồm `tsudev-files`, `swico`). Repo mới ở `tsudev-org`.
4. Repo đang có phiên khác: viết phiếu vào `logs/handover/` của repo đó + `SendMessage`, không sửa hộ.
5. Mỗi phiếu xử lý xong: đổi dòng `**Trạng thái**` thành `ĐÓNG - <PR/lý do>` - dòng trạng thái để "MỞ" sau khi xong
   chính là lý do mục 2 tồn tại.

## 2. Đối soát phiếu tồn (P0 của mọi repo)

Quét 14/11/2026: các phiếu dưới đây vẫn ghi MỞ/ĐANG. Nhiều phiếu đã xong hoặc lỗi thời nhưng chưa ai đổi dòng trạng
thái. Mỗi repo: kiểm từng phiếu với mã + production ⇒ ĐÓNG kèm lý do, hoặc chuyển phần việc thật còn lại vào mục 3.

| Repo                      | Phiếu ghi MỞ                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tsudev                    | 20260820-04/05/06, 20260821-03/04, 20260822-03/04, 20260824-02, 20260826-01/03/04/05/06, 20260827-01/03, 20261029-01, 20261106-02, 20261109-05, 20261110-01/03/05, 20261111-01, 20261113-07/08 (Toà soạn/Con dấu ⇒ ĐÓNG: đã gỡ) |
| tsudev-cwico              | 20261110-01/02, 20261111-01, 20261112-01, 20261113-02/03/07                                                                                                                                                                     |
| tsudev-swico              | 20260820-03/04, 20261110-01, 20261111-01, 20261112-01, 20261113-03/07                                                                                                                                                           |
| tsudev-contact            | 20261110-02, 20261111-01, 20261112-01, 20261113-03/07                                                                                                                                                                           |
| tsudev-trafficmonitor     | 20261111-01, 20261112-03, 20261113-03/07                                                                                                                                                                                        |
| tsufiles (`tsudev-files`) | 20261111-04/05, 20261112-02/03/05, 20261113-01/03/05/07                                                                                                                                                                         |
| lotus-share               | 20261111-03, 20261112-04, 20261113-01/02/03/07                                                                                                                                                                                  |
| linux-packages            | 20261113-02/03/07                                                                                                                                                                                                               |
| tsudev-standards          | 20261112-02, 20261113-01                                                                                                                                                                                                        |
| 6 repo game + game-kit    | 20261113-04 (logo), 20261113-07 (giao diện); game-kit thêm 20261113-01                                                                                                                                                          |

## 3. Việc theo repo (thứ tự trong mỗi ô = thứ tự làm)

| Repo                   | Việc                                                                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **tsudev**             | P0 (#252, E2E chập chờn, đối soát) → P1 bảo mật tài khoản (P1.1-P1.9) → P2 CMS + Góp ý → P3 C2 ⛔, C4, C6 → P4 OIDC → P5 thu phiếu giao diện + đề xuất chuẩn lên tsudev-standards. Chi tiết: `docs/de-xuat-bao-mat-cms-cai-bang-lenh.md` |
| tsudev-cwico           | 20261113-07 giao diện → thêm Scoop (bucket `tsudev-org/scoop-bucket`) → 20261114-02 khối "Cài bằng lệnh" → bước SignPath khi D5 duyệt                                                                                                    |
| tsudev-swico           | 20261113-07 → 20261114-02 → SignPath                                                                                                                                                                                                     |
| tsudev-contact         | 20261113-07 → winget qua `komac` (20261113-01) → 20261114-02 → SignPath                                                                                                                                                                  |
| tsudev-trafficmonitor  | 20261113-07 → theo dõi winget-pkgs #477193 tới khi merge → 20261114-02 → SignPath                                                                                                                                                        |
| tsufiles               | 20261113-07 → winget (komac) → tag `v2.4.1-vn.*` + gói `tsufiles` trong catalog (báo tsudev chạy `pkg:catalog`) → 20261114-02 → SignPath                                                                                                 |
| lotus-share            | 20261113-07 → winget (komac) → 20261114-02 → SignPath                                                                                                                                                                                    |
| linux-packages         | 20261113-07 (trang kho nếu có) → giữ `catalog.json` là nguồn sự thật cho C5; thêm trường `homepage` cho mọi gói                                                                                                                          |
| tsudev-standards       | Nhận đề xuất mẫu header (avatar + menu) / footer ("Tài khoản" theo phiên) vào `ECOSYSTEM_IDENTITY.md`; nhận quy ước "khối Cài bằng lệnh sinh lúc build" vào `PACKAGING.md`                                                               |
| 6 repo game + game-kit | 20261113-04 logo → 20261113-07 giao diện → khi có bản phát hành: kho `TsuGameLabs/*-releases` + `linux-packages` (phương án A) rồi báo tsudev điền `ECO_GAMES.pkg`                                                                       |

## 4. Việc chỉ chủ dự án làm được (👤) - agent không chờ, chỉ nhắc ở phiếu bàn giao

1. Duyệt PR chạm vùng bảo vệ: tsudev #252 (footer), C2 (`install.*`), các PR logo/chân trang ở repo khác.
2. Cloudflare: tạo widget Turnstile + `TURNSTILE_SECRET_KEY` ở Render; bật WAF Managed Rules (free) + 1 rate-limit rule `/api/auth/*`.
3. Render: `VIRUSTOTAL_API_KEY`, `RELEASE_INTEGRITY_TOKEN` (cả Worker).
4. Nộp đơn SignPath Foundation cho `tsudev-org` (D5).
5. PAT `WINGET_TOKEN` (`public_repo`) đặt làm secret ở các repo app cần winget.
6. Giữ khoá riêng `age` cho bản sao lưu DB (P1.9) và bản sao khoá ký ngoại tuyến (G11).
7. (chuyển từ phiếu tsudev 20261106-02, chưa có xác nhận đã làm) T18 xoá fork `tsudev-tsudev/winget-pkgs` và
   `mieubathuong/mieubathuong`; T20 thu hồi PAT GitHub lộ trong `xanuicam/ubnd`; T21 dismiss các cảnh báo CodeQL
   báo nhầm (#6, #43, #52, #56-#59).
8. (phiên 53 tsudev, 14/11/2026) **DATABASE_URL Neon cho agent**: máy dev không có URL production, `neonctl` hay
   Render CLI - migration P1 (#257, chỉ THÊM) không lên Neon được, nên #257 chưa merge (Render tự deploy `main`,
   `migrationGate` sẽ làm cả site trống). Chủ dự án chạy trong phiên tsudev:
   `! cd ~/projects/tsudev && read -rsp 'URL Neon: ' U && echo && /usr/lib/postgresql/18/bin/pg_dump --format=custom --no-owner --dbname="$U" -f ~/tsudev-backups/truoc-p1-$(date +%Y%m%d).dump && DATABASE_URL="$U" npm run db:migrate`
   (hoặc cho agent một cách đọc URL lâu dài, ví dụ tệp `~/.config/tsudev/neon-url` quyền 600).
9. (phiên 53) **Cloudflare zone `tsudev.com` - tắt Bot Fight Mode / JavaScript Detections, hoặc chấp nhận**: quét
   production 14/11 cho thấy 6 site con (trafficmonitor, cwico, swico, files, lotus, contact) cùng lỗi console
   "inline script vi phạm CSP `script-src 'self'`". Script đó do Cloudflare TỰ CHÈN ở tầng biên
   (`/cdn-cgi/challenge-platform`), không phải mã của repo nào - tsudev.com không dính vì CSP có nonce mà Cloudflare
   gắn vào script của nó. Site tĩnh không phát nonce được ⇒ chỉ có hai đường: tắt tính năng ở dashboard (Security →
   Bots) hoặc chấp nhận lỗi console (script bị chặn, chỉ mất tín hiệu chống bot). Phiếu 20261113-07 của 6 repo KHÔNG
   cần sửa mã cho lỗi này.
10. (phiên 53) `age` chưa cài trên máy dev (agent bị chặn cài binary): `sudo apt install age`, tạo cặp khoá, thêm khoá
    công khai vào `infrastructure/sao-luu/age-recipients.txt` (#259), diễn tập `bash scripts/sao-luu-db.sh --kiem`.
11. (phiên 53) Turnstile (#258): tạo widget cho `tsudev.com`, đặt `TURNSTILE_SECRET_KEY` ở Render + `TURNSTILE_SITE_KEY`
    ở Worker; chạy ổn rồi đặt `TURNSTILE_REQUIRED=1` (`docs/auth.md` §7).
12. (phiên 53) Duyệt ⛔: #252 (chân trang), #261 (C2 install nhiều gói). GitGuardian báo 2 chuỗi fixture test ở #257
    (mật khẩu test, đã allowlist trong gitleaks) - đánh dấu "test credential" trên dashboard GitGuardian.
