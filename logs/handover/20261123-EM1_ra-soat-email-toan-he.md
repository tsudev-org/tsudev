# PHIẾU YÊU CẦU EM1 - Rà soát địa chỉ email toàn hệ TsuDEV (`*@tsudev.com`)

- **Mã phiếu**: 20261123-EM1
- **Thời điểm**: 23/11/2026
- **Người gửi**: agent-tsuswico (phiên tsuswico-6e) theo yêu cầu của chủ dự án
- **Người nhận**: agent điều phối TsuDEV (repo `~/projects/tsudev`)
- **Liên quan**: phiếu AV1 `~/projects/logs/handover/20261122-AV1_bao-nham-antivirus-toan-he.md` (thư báo nhầm gửi từ `security@tsudev.com`)
- **Trạng thái**: ĐÓNG 25/11/2026 - chuyển tiếp phiếu `20261125-EM2` (`~/projects/logs/handover`)

## 1. Mục tiêu

Mọi địa chỉ `*@tsudev.com` mà hệ sinh thái công bố (README, SECURITY, PRIVACY, website, ứng dụng, cửa hàng, DMARC,
manifest gói) phải **nhận được thư** (có luật Email Routing hoặc catch-all trỏ tới hộp thư có người đọc), và địa chỉ
nào dùng để **gửi** phải gửi được mà KHÔNG trượt DMARC. Địa chỉ không cần thì gỡ khỏi tài liệu/mã.

## 2. Hiện trạng đo được 23/11/2026 (DNS công khai, DoH)

| Bản ghi           | Giá trị                                                          | Nhận xét                                                                          |
| ----------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| MX `tsudev.com`   | `route1/2/3.mx.cloudflare.net`                                   | Nhận thư qua **Cloudflare Email Routing** (chỉ chuyển tiếp, không có hộp thư gửi) |
| SPF `tsudev.com`  | `v=spf1 include:_spf.mx.cloudflare.net ~all`                     | Gốc KHÔNG cho Gmail/Resend gửi trực tiếp bằng envelope `@tsudev.com`              |
| DMARC             | `v=DMARC1; p=reject; rua=mailto:contact@tsudev.com`              | **reject** ⇒ thư `From: *@tsudev.com` không có DKIM khớp tên miền sẽ BỊ TỪ CHỐI   |
| DKIM              | `cf2024-1._domainkey` (Cloudflare), `resend._domainkey` (Resend) | Không có `google._domainkey`                                                      |
| `send.tsudev.com` | MX + SPF Amazon SES (Resend)                                     | Envelope của Resend - căn chỉnh DMARC nhờ DKIM `resend`                           |

⇒ **Gmail "Send mail as" `security@tsudev.com` qua máy chủ Gmail sẽ trượt DMARC** (DKIM `gmail.com`, SPF không gồm Google).
Cách đúng (SAU khi sửa mục 2b): "Send mail as" dùng SMTP `smtp.resend.com` cổng 465 (user `resend`, mật khẩu = API key Resend chỉ quyền gửi,
tên miền tsudev.com) - DKIM `resend` khớp tên miền. Hoặc gửi bằng API Resend.

Agent-tsuswico KHÔNG đọc được luật Email Routing: token `~/.config/tsudev/cloudflare.env` báo `Authentication error`
cho `zones/<id>/email/routing*` (thiếu quyền Email Routing). Cần 👤 hoặc token có quyền `Email Routing Rules: Read`.

## 2b. ⛔ KHẨN: Resend - tên miền tsudev.com KHÔNG gửi được (phát hiện 23/11/2026)

- Khoá `RESEND_API_KEY` trong env của Render service `tsudev-backend` (`srv-da0buctbedkc73ae1kmg`, auth-service dùng để
  gửi thư xác minh/đặt lại mật khẩu từ `no-reply@tsudev.com`) thuộc team Resend có tên miền `tsudev.com` trạng thái
  **failed** (tạo 16/08/2026, vùng ap-northeast-1; DKIM `resend._domainkey`, MX/SPF `send` đều failed).
- Gửi thử (thư báo nhầm AV1, From `security@tsudev.com`) ⇒ `403 The tsudev.com domain is not verified`.
- Bấm kiểm lại ⇒ `403 This domain has been claimed by another team and can no longer be verified`.
- DNS có HAI bản ghi TXT ở `resend._domainkey.tsudev.com` (`p=MIGf...CkhaB...` và `p=MIGf...DEMvj...`); `DEMvj` là của team
  đang dùng trên Render ⇒ `CkhaB` nhiều khả năng của team KIA (đã xác minh tên miền).
- **Hệ quả gần như chắc chắn: thư giao dịch production của tsudev.com (đăng ký, xác minh, quên mật khẩu) đang bị Resend
  từ chối.** Kiểm log Render tìm `[auth]` / 403 để xác nhận.

**Tiến độ 23/11/2026:** chủ dự án tìm ra team B (tsudev.com Verified), tạo khoá Sending access lưu ở
`~/.config/tsudev/resend.env` (chmod 600). Gửi thử OK; thư AV1 DeepInstinct đã gửi bằng khoá này. (1) ✅ 23/11 chủ dự án thay `RESEND_API_KEY` trên Render (agent đối chiếu: khớp khoá team B), deploy `dep-dc22s7tg1s2s73epf6d0`
live, tsudev.com 200. (2) ✅ chủ dự án thử "Quên mật khẩu" - thư tới. (3a) ✅ team A: agent xoá tên miền `0655632d-…` + khoá
`Produc-Render-tsudev` (chủ dự án đồng ý); team A còn khoá `wedding-sumy` - `.env` trong máy wedding-sumy VẪN dùng khoá này
(`EMAIL_FROM` @resend.dev, OTP 2FA admin) ⇒ chỉ xoá sau khi Vercel production + `.env` chuyển sang khoá team b4djl1h và
đăng nhập admin thử được. Team giữ tsudev.com: tài khoản GitHub b4djl1h (Verified). **CÒN (cũ):** (2) thử "Quên
mật khẩu" trên tsudev.com, xem header `dkim=pass d=tsudev.com`, `dmarc=pass`; (3) team A: xoá tên miền failed `0655632d-…`, thu
hồi khoá `Produc-Render-tsudev` (khoá `wedding-sumy` của team A: hỏi chủ dự án còn dùng không); (4) Cloudflare: xoá TXT
`resend._domainkey` chứa `DEMvjUJni9`, giữ bản `CkhaBKDxZa09`.

**✅ HOÀN TẤT 23/11/2026 (mục 2b):**

- Resend: tsudev.com chỉ còn ở team của tài khoản GitHub b4djl1h (Verified). Team A trống (đã xoá tên miền failed, khoá
  `Produc-Render-tsudev`, khoá `wedding-sumy`) - 👤 có thể xoá cả team/tài khoản.
- Render `tsudev-backend`: khoá team b4djl1h, deploy live, "Quên mật khẩu" tới nơi.
- wedding-sumy: Vercel Production + `.env` cục bộ dùng khoá riêng team b4djl1h, `EMAIL_FROM="Sumy Wedding <no-reply@tsudev.com>"`
  (thay @resend.dev); OTP admin tới nơi. Hai khoá wedding-sumy từng dán vào chat đã bỏ.
- Cloudflare: xoá TXT `resend._domainkey` `…DEMvjUJni9…`; còn đúng `…CkhaBKDxZa09…`; gửi thử sau xoá OK.
- Tệp khoá cục bộ (chmod 600): `~/.config/tsudev/resend.env` (backend), `resend-wedding.env`, `cloudflare-dns.env` (Edit zone DNS
  tsudev.com). Mục 1, 3-6 của phiếu (rà từng địa chỉ, Email Routing) VẪN MỞ.

**Sửa (👤 cần đăng nhập Resend) - đã làm, giữ để tham khảo:** đăng nhập team ĐANG sở hữu tsudev.com (team có DKIM `CkhaB`), tạo API key quyền
"Sending access" giới hạn tên miền tsudev.com, thay `RESEND_API_KEY` trên Render rồi deploy lại; xoá bản ghi DKIM thừa
của team không dùng (chỉ sau khi chắc team nào giữ lại); xoá tên miền failed ở team cũ. Kiểm bằng một thư thật tới hộp
thư ngoài: header `dkim=pass header.d=tsudev.com`, `dmarc=pass`. Không tìm ra team kia ⇒ hỗ trợ Resend (chứng minh sở hữu
bằng DNS) hoặc đổi selector. Ghi kết quả + AKB `dieu-phoi` (issue).

## 3. Địa chỉ đang được nhắc tới trong `~/projects` (đếm số lần, 23/11/2026)

| Địa chỉ                                                                                            | Lần   | Ghi chú                                                      |
| -------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------ |
| `security@tsudev.com`                                                                              | 49    | SECURITY.md nhiều repo; người gửi thư báo nhầm AV1           |
| `contact@tsudev.com`                                                                               | 43    | nhận báo cáo DMARC `rua`                                     |
| `privacy@tsudev.com`                                                                               | 25    | PRIVACY, hồ sơ cửa hàng                                      |
| `tsufiles-donut@tsudev.com`                                                                        | 14    | tsufiles                                                     |
| `soc@tsudev.com` / `SOC@tsudev.com`                                                                | 8 + 2 | thống nhất chữ thường                                        |
| `ban@tsudev.com`                                                                                   | 5     | kiểm mục đích                                                |
| `ptsam@tsudev.com`                                                                                 | 2     | b4djl1h-cmdb                                                 |
| `no-reply@tsudev.com` / `noreply@tsudev.com`                                                       | 2 + 2 | **hai cách viết** - chọn một (auth-service dùng `no-reply@`) |
| `notifications@tsudev.com`                                                                         | 1     | gửi thư? cần DKIM khớp                                       |
| `abuse@tsudev.com`, `conduct@tsudev.com`, `pkg@tsudev.com`, `tacgia@tsudev.com`, `khac@tsudev.com` | 1-2   | kiểm có thật cần không                                       |
| `dev.a@`, `nguyen@`, `ten.ho+tag@`                                                                 | 1-2   | có vẻ là ví dụ trong tài liệu/test - xác nhận, đừng tạo luật |

Lệnh đếm lại: `grep -rhoE "[A-Za-z0-9._%+-]+@tsudev\.com" ~/projects --include=*.{md,json,astro,ts,tsx,mjs,yml,yaml,cs,py,dart,txt,iss,toml,html} | sort | uniq -c | sort -rn`
(bỏ `test-*`, `alice@`, `x@` - dữ liệu test). Còn phải rà: hồ sơ Google Play/Partner Center/App Store, `winget`/Scoop manifest
(`PublisherSupportUrl`, email), metadata npm/pub, trang tsudev.com production.

## 4. Việc cần làm

1. 👤/agent có quyền: xuất danh sách luật Cloudflare Email Routing (+ catch-all) của zone `tsudev.com`; đối chiếu bảng
   mục 3 ⇒ mỗi địa chỉ công khai có luật trỏ tới hộp thư đã xác minh. Thiếu ⇒ tạo luật (KHÔNG ghi địa chỉ đích cá nhân
   vào repo/AKB).
2. Gửi thư thử tới từng địa chỉ công khai, xác nhận tới nơi (ghi ngày + kết quả, không ghi địa chỉ đích).
3. Chuẩn hoá: một cách viết `no-reply@`; `soc@` chữ thường; gỡ địa chỉ không dùng.
4. Địa chỉ dùng để GỬI (`no-reply@`, `notifications@`, `security@` cho AV1): đi qua Resend (DKIM `resend`) - kiểm bằng
   một thư tới hộp thư ngoài, xem header `dmarc=pass`.
5. Cân nhắc DMARC `rua` riêng (ví dụ `dmarc@`) để `contact@` không ngập báo cáo XML.
6. Ghi kết quả vào tài liệu của repo tsudev (nơi quy định danh mục email của hệ) + AKB `dieu-phoi`.

## 5. Ghi chú bảo mật

- Token GitHub `winget-tsudev` đã được chủ dự án thay 23/11/2026; tệp `~/.config/tsudev/winget.env` (tsudisk dùng) vẫn
  giữ token CŨ đã thu hồi ⇒ 👤 ghi token mới vào tệp (agent không đọc/ghi giá trị).
- Token Cloudflare hiện tại không có quyền Email Routing - nếu cấp thêm, chỉ cấp quyền **Read**.

## 6. Kết quả đo Email Routing 24/11/2026 (phiên điều phối, token OAuth wrangler có `email_routing:write`)

- Email Routing bật, `ready`. Luật literal: `security@`, `abuse@`, `privacy@`, `contact@` ⇒ forward tới MỘT hộp Gmail đã
  xác minh (15/08/2026). Catch-all (và luật `all`) ⇒ Worker `qulythuchi` ⇒ mọi địa chỉ khác không thuộc
  `in.qulythuchi.tsudev.com` bị `setReject('Unknown recipient')` (bounce).
- **Vì sao `contact@` "không nhận được":** `contact@` là `rua` của DMARC. Nhật ký Email Routing 24/11: 23 lần forward thất bại
  của CÙNG một báo cáo DMARC Google (`Report-ID 6169106812898267704`, từ `noreply-dmarc-support@google.com`), Gmail trả
  `421 4.7.28 ... unusual rate of unsolicited mail ... temporarily rate limited`. Luồng forward `contact@ ⇒ Gmail` bị Gmail
  giới hạn tốc độ ⇒ thư thật tới `contact@` có thể bị hoãn/rớt xen kẽ (thư "Test mail" 16:34 vẫn tới). `security@`: mọi
  thư từ 02/11 đều `delivered` (Talsec, AhnLab, Huorong...).
- **Địa chỉ công khai KHÔNG có luật (bị bounce):** `soc@` (12 lần nhắc), `tsufiles-donut@` (15), `ban@`, `ptsam@`, `khac@`,
  `tacgia@`, `pkg@`, `conduct@`, `notifications@`, `no-reply@`/`noreply@` (thư trả lời bị bounce).
- Đề xuất (chờ 👤 duyệt): (a) chuyển DMARC `rua` khỏi `contact@` - bật Cloudflare DMARC Management (0 đồng) hoặc `dmarc@`
  riêng không forward về Gmail; (b) tạo luật literal cho các địa chỉ công khai còn dùng; (c) gỡ địa chỉ không dùng khỏi tài liệu.

## 7. ✅ Kết quả 25/11/2026 - mục 1-6 của phiếu

Chủ dự án duyệt 24/11/2026. Đã làm và kiểm chứng: 18 luật Email Routing (gửi thử 17 `delivered` + `dmarc@` `dropped`),
DMARC `rua` rời `contact@` (sang `dmarc@` drop, chờ 👤 bật Cloudflare DMARC Management), `sp=reject`, MTA-STS testing +
TLS-RPT. Danh mục chính thức + quy trình: `tsudev-standards` `docs/EMAIL.md` v1.0.0 (PR #77). Việc còn lại (👤 + từng
repo, gồm `security.txt` của repo này) chuyển sang phiếu điều phối `~/projects/logs/handover/20261125-EM2_chuan-email-toan-he.md`.
**Trạng thái phiếu EM1: ĐÓNG (chuyển tiếp EM2).**
