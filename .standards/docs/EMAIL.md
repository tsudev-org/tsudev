# THƯ ĐIỆN TỬ `*@tsudev.com` - nhận, gửi, DNS, danh mục địa chỉ (v1.1.0)

> **Bất khả xâm phạm cho mọi project/tool/phần mềm TsuDEV.** Mọi địa chỉ `*@tsudev.com` xuất hiện trong mã, tài liệu,
> website, ứng dụng, hồ sơ cửa hàng, manifest gói `MUST` có trong danh mục mục 3 và `MUST` nhận được thư. Mọi thư gửi
> đi với `From: *@tsudev.com` `MUST` qua DMARC (`p=reject`). Ký hiệu `MUST`/`SHOULD`/`MAY` theo RFC 2119.
>
> Nguồn gốc: phiếu điều phối `tsudev` `logs/handover/20261123-EM1_ra-soat-email-toan-he.md` (đo đạc 23-25/11/2026).

## 1. Tóm tắt cho agent (đọc trước khi đụng tới email)

1. **Cần một địa chỉ `@tsudev.com`?** Chọn trong bảng mục 3. Không có ⇒ làm đúng quy trình mục 4 (tạo luật, gửi thử,
   cập nhật bảng) **TRƯỚC** khi viết địa chỉ đó vào bất cứ đâu.
2. **Gửi thư từ mã nguồn?** Chỉ qua **Resend**, tên miền `tsudev.com` (mục 6). `MUST NOT` dùng SMTP Gmail/Outlook/máy
   chủ tự dựng với `From: *@tsudev.com` - DMARC `p=reject` sẽ làm thư bị TỪ CHỐI im lặng.
3. **`MUST NOT` sửa** SPF gốc, `_dmarc`, `_mta-sts`, `_smtp._tls`, MX, `resend._domainkey`, `cf2024-1._domainkey` của
   `tsudev.com` từ một dự án con, kể cả khi tài liệu cũ của dự án bảo thế. Cần thay ⇒ viết phiếu cho phiên điều phối.
4. **Địa chỉ ví dụ/dữ liệu test** dùng tên miền dành riêng `example.com` / `example.test` (RFC 2606), `MUST NOT` dùng
   `@tsudev.com` (agent khác sẽ tưởng là địa chỉ thật).
5. **`MUST NOT`** ghi địa chỉ hộp thư cá nhân đích (nơi nhận chuyển tiếp) vào repo, AKB, log, issue, PR.

## 2. Kiến trúc

```
Người gửi bên ngoài ──MX──▶ Cloudflare Email Routing (route1/2/3.mx.cloudflare.net)
                              ├─ luật literal (mục 3) ──forward──▶ hộp thư chủ dự án (đã xác minh)
                              ├─ dmarc@ ──drop (giữ chỗ; báo cáo DMARC ⇒ Cloudflare DMARC Management)
                              └─ catch-all ──▶ Worker `qulythuchi` ──▶ chỉ nhận *@in.qulythuchi.tsudev.com,
                                                                     còn lại 550 "Unknown recipient"

Mã nguồn / người gửi tay ──▶ Resend (API hoặc SMTP smtp.resend.com:465)
                              envelope: *@send.tsudev.com (SPF amazonses) · DKIM d=tsudev.com (selector `resend`)
```

- **Nhận**: Cloudflare Email Routing - miễn phí, chỉ chuyển tiếp, không có hộp thư. Địa chỉ không có luật bị catch-all
  từ chối (người gửi nhận bounce) - đây là hành vi mong muốn (chống spam), KHÔNG đổi catch-all sang chuyển tiếp chung.
- **Gửi**: Resend (gói miễn phí 3.000 thư/tháng, xem `FREE_TIER_STACK.md`). Tên miền `tsudev.com` chỉ được xác minh ở
  **một** team Resend (team của tài khoản GitHub `b4djl1h`); khoá API "Sending access" giới hạn tên miền, mỗi dịch vụ
  một khoá riêng.
- Catch-all thuộc dự án `qulythuchi` (địa chỉ thư nhập liệu E2EE). Dự án khác cần nhận thư bằng Worker ⇒ dùng **tên
  miền con riêng** + luật riêng, `MUST NOT` chiếm catch-all.

## 3. Danh mục địa chỉ chính thức (đã gửi thử `delivered` 25/11/2026)

Mọi địa chỉ dưới đây có luật `tsudev: <địa chỉ> - <mục đích>` trong Email Routing.

| Địa chỉ                     | Hành động  | Mục đích / nơi công bố                                                            |
| --------------------------- | ---------- | --------------------------------------------------------------------------------- |
| `security@tsudev.com`       | chuyển tiếp | Báo cáo lỗ hổng: `SECURITY.md`, `/.well-known/security.txt`, liên hệ antivirus    |
| `contact@tsudev.com`        | chuyển tiếp | Liên hệ chung: website, hồ sơ cửa hàng, README                                    |
| `privacy@tsudev.com`        | chuyển tiếp | Quyền riêng tư, yêu cầu xoá dữ liệu (Nghị định 13/2023, GDPR): `PRIVACY.md`, cửa hàng |
| `abuse@tsudev.com`          | chuyển tiếp | RFC 2142 - báo cáo lạm dụng                                                        |
| `postmaster@tsudev.com`     | chuyển tiếp | RFC 5321 - bắt buộc với mọi tên miền nhận thư                                      |
| `hostmaster@tsudev.com`     | chuyển tiếp | RFC 2142 - DNS                                                                    |
| `webmaster@tsudev.com`      | chuyển tiếp | RFC 2142 - website                                                                |
| `soc@tsudev.com`            | chuyển tiếp | Trung tâm vận hành an ninh (luôn viết chữ thường)                                 |
| `conduct@tsudev.com`        | chuyển tiếp | `CODE_OF_CONDUCT.md`                                                              |
| `pkg@tsudev.com`            | chuyển tiếp | Kênh gói Scoop/winget/APT/RPM/Homebrew                                            |
| `tsufiles-donut@tsudev.com` | chuyển tiếp | TsuFiles                                                                          |
| `ban@tsudev.com`            | chuyển tiếp | b4djl1h-cmdb                                                                      |
| `ptsam@tsudev.com`          | chuyển tiếp | b4djl1h-cmdb - địa chỉ GỬI qua Resend (thư trả lời quay về đây)                   |
| `notifications@tsudev.com`  | chuyển tiếp | Địa chỉ GỬI thư thông báo qua Resend                                              |
| `no-reply@tsudev.com`       | chuyển tiếp | Địa chỉ GỬI thư giao dịch (xác minh, quên mật khẩu, OTP) - **cách viết chuẩn**    |
| `noreply@tsudev.com`        | chuyển tiếp | Biệt danh cũ của `no-reply@` - giữ cho mã cũ; mã mới `MUST` dùng `no-reply@`      |
| `tls-rpt@tsudev.com`        | chuyển tiếp | Báo cáo TLS-RPT (RFC 8460) cho MTA-STS, khoảng 1-3 thư/ngày                       |
| `dmarc@tsudev.com`          | **bỏ (drop)** | Giữ chỗ - KHÔNG nằm trong `rua`; báo cáo DMARC do Cloudflare DMARC Management nhận (mục 5.2) |

Quy ước đặt tên địa chỉ mới: chữ thường, chỉ `a-z0-9-`, theo **vai trò** (`support@`, `billing@`) hoặc **sản phẩm**
(`<san-pham>@`), `MUST NOT` theo tên người. Một sản phẩm `SHOULD` dùng chung `contact@`/`security@`/`privacy@` thay vì
tạo địa chỉ riêng, trừ khi có lý do (lọc thư theo sản phẩm).

## 4. Quy trình thêm/bỏ một địa chỉ

1. Kiểm bảng mục 3 - đã có địa chỉ cùng vai trò thì dùng lại.
2. Tạo luật Email Routing (dashboard, hoặc API mục 8): tên `tsudev: <địa chỉ> - <mục đích>`, đích là hộp thư đã xác minh
   có sẵn trong luật `contact@` (đọc từ API, không gõ tay, không in ra).
3. Gửi một thư thử qua Resend tới địa chỉ mới, kiểm nhật ký (mục 8.2) thấy `delivered`.
4. PR vào `tsudev-standards`: thêm dòng vào bảng mục 3 + CHANGELOG. Sau đó mới dùng địa chỉ trong dự án.
5. Bỏ địa chỉ: gỡ khỏi mọi tài liệu/mã trước (`grep -rhoE "[A-Za-z0-9._%+-]+@tsudev\.com"`), giữ luật thêm **ít nhất
   90 ngày** (thư cũ, bản app đã cài vẫn trỏ tới), rồi mới xoá luật và dòng trong bảng.

## 5. DNS thư điện tử của `tsudev.com` (giá trị chuẩn - chỉ phiên điều phối được sửa)

| Bản ghi                          | Giá trị                                                                  | Vai trò                               |
| -------------------------------- | ------------------------------------------------------------------------ | ------------------------------------- |
| MX `tsudev.com`                  | `route1/2/3.mx.cloudflare.net` (do Email Routing quản lý)                | Nhận thư                              |
| TXT `tsudev.com` (SPF)           | `v=spf1 include:_spf.mx.cloudflare.net ~all`                             | **Một** bản SPF duy nhất ở gốc        |
| TXT `cf2024-1._domainkey`        | khoá DKIM Cloudflare                                                     | Ký thư chuyển tiếp                    |
| TXT `resend._domainkey`          | khoá DKIM Resend (`p=MIGf…CkhaB…`) - đúng **một** bản                    | Căn chỉnh DMARC cho thư gửi đi        |
| MX + TXT `send.tsudev.com`       | `feedback-smtp.ap-northeast-1.amazonses.com`, `v=spf1 include:amazonses.com ~all` | Envelope/bounce của Resend   |
| TXT `_dmarc`                     | `v=DMARC1; p=reject; sp=reject; adkim=r; aspf=r; rua=mailto:<mã>@dmarc-reports.cloudflare.net` | Chính sách DMARC (mục 5.2); `rua` chỉ có địa chỉ Cloudflare |
| TXT `_mta-sts`                   | `v=STSv1; id=<YYYYMMDDTnn>`                                              | Báo có chính sách MTA-STS             |
| `https://mta-sts.tsudev.com/.well-known/mta-sts.txt` | Worker `tsudev-mta-sts` (`templates/email/mta-sts-worker`) | Chính sách MTA-STS (RFC 8461)   |
| TXT `_smtp._tls`                 | `v=TLSRPTv1; rua=mailto:tls-rpt@tsudev.com`                              | Báo cáo TLS (RFC 8460)                |
| DNSSEC                           | bật, DS ở nhà đăng ký (Spaceship)                                        | Chống giả mạo DNS                     |

### 5.1. Quy tắc

- `MUST NOT` thêm bản SPF thứ hai ở gốc (hai bản ⇒ `permerror` ⇒ mọi thư trượt SPF). Dịch vụ gửi mới ⇒ dùng envelope
  tên miền con riêng như `send.` của Resend, hoặc thêm `include:` vào bản duy nhất (qua phiên điều phối).
- `MUST NOT` hạ `p=reject` xuống `quarantine`/`none`. Tài liệu dự án nào còn hướng dẫn khác (ví dụ `p=quarantine;
  rua=mailto:ban@…`) là lỗi thời - sửa tài liệu, không sửa DNS.
- Dịch vụ gửi mới `MUST` ký DKIM `d=tsudev.com` (hoặc tên miền con của nó) trước khi gửi thư thật.
- Đổi chính sách MTA-STS (testing ⇒ enforce, đổi MX) ⇒ sửa Worker **và** tăng `id` trong `_mta-sts` cùng lúc.

### 5.2. Báo cáo tự động (DMARC, TLS-RPT) - bài học 24/11/2026

**`MUST NOT` trỏ `rua` DMARC vào một địa chỉ chuyển tiếp về Gmail dùng chung.** Ngày 24/11/2026 `rua=mailto:contact@`
làm Gmail trả `421 4.7.28 ... unusual rate of unsolicited mail ... temporarily rate limited` cho luồng chuyển tiếp
`contact@ ⇒ Gmail`; Cloudflare thử lại cùng một báo cáo 23 lần, và **thư thật tới `contact@` bị hoãn/rớt xen kẽ**.

- DMARC: **Cloudflare DMARC Management** đã bật 25/11/2026 (miễn phí; Dashboard ⇒ `tsudev.com` ⇒ Email ⇒ DMARC
  Management - xem biểu đồ nguồn gửi, nguồn lạ trượt DMARC ở đây). Tính năng này tự thêm `…@dmarc-reports.cloudflare.net`
  vào `rua`; khi bật lại/đổi bản ghi `MUST` kiểm `rua` chỉ còn địa chỉ đó (gỡ mọi địa chỉ `@tsudev.com`).
- Xem DMARC Management **mỗi tháng** (phiên điều phối): nguồn gửi mới hợp lệ (dịch vụ mới) ⇒ cấu hình DKIM cho nó; nguồn
  lạ ⇒ đang có kẻ giả mạo, `p=reject` đã chặn, ghi AKB.
- TLS-RPT: lượng nhỏ (vài thư/ngày) nên chuyển tiếp được; bộ lọc Gmail mục 6.1 gắn nhãn và bỏ qua hộp thư đến.
- MTA-STS đang `mode: testing` (từ 25/11/2026). Báo cáo TLS-RPT sạch ≥ 14 ngày ⇒ chuyển `enforce`, `max_age: 1209600`.

## 6. Gửi thư

| Loại thư                                   | `From`                                   | `Reply-To`              |
| ------------------------------------------ | ---------------------------------------- | ----------------------- |
| Giao dịch (xác minh, OTP, quên mật khẩu)   | `<Tên sản phẩm> <no-reply@tsudev.com>`   | `contact@tsudev.com`    |
| Thông báo (nhắc gia hạn Pro, cảnh báo)     | `<Tên sản phẩm> <notifications@tsudev.com>` | `contact@tsudev.com` |
| An ninh, báo nhầm antivirus (gửi tay)      | `TsuDEV Security <security@tsudev.com>`  | (chính nó)              |

- Mã nguồn: API Resend (`POST https://api.resend.com/emails`) với khoá ở biến môi trường `RESEND_API_KEY`, `MUST NOT`
  commit khoá; khoá cục bộ của chủ dự án ở `~/.config/tsudev/resend*.env` (chmod 600). Tên hiển thị dùng `TsuDEV`
  hoặc tên sản phẩm theo `ECOSYSTEM_IDENTITY.md`.
- Thư giao dịch `SHOULD` có cả bản `text` lẫn `html`; thư hàng loạt (bản tin) `MUST` có `List-Unsubscribe` +
  `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (yêu cầu của Gmail/Yahoo từ 2024) và tôn trọng huỷ đăng ký.
- `MUST NOT` gửi `From: *@resend.dev` hay tên miền tạm cho sản phẩm thật.
- **Trả lời từ Gmail bằng địa chỉ `@tsudev.com`** (👤 chủ dự án): Gmail ⇒ Cài đặt ⇒ Tài khoản ⇒ "Gửi thư bằng địa chỉ"
  ⇒ SMTP `smtp.resend.com`, cổng `465` (SSL), tên người dùng `resend`, mật khẩu = khoá Resend "Sending access" riêng cho
  việc này. `MUST NOT` chọn "gửi qua máy chủ Gmail" (DKIM `gmail.com` ⇒ trượt DMARC ⇒ bị từ chối).

### 6.1. Hộp thư nhận chuyển tiếp (Gmail của chủ dự án)

- Nhập [`templates/email/gmail-filters.xml`](../templates/email/gmail-filters.xml): Gmail ⇒ Cài đặt ⇒ Xem tất cả chế
  độ cài đặt ⇒ Bộ lọc và địa chỉ bị chặn ⇒ **Nhập bộ lọc** ⇒ chọn tệp ⇒ Mở tệp ⇒ tích tất cả ⇒ **Tạo bộ lọc** (tích
  "Cũng áp dụng bộ lọc cho các cuộc hội thoại phù hợp"). Kết quả: không thư `*@tsudev.com` nào vào Spam; nhãn
  `TsuDEV/An ninh`, `/Quyền riêng tư`, `/Liên hệ`, `/Hệ thống`, `/Thư trả lời`, `/Báo cáo TLS` (bỏ qua hộp thư đến).
- Thêm địa chỉ mới vào mục 3 ⇒ thêm vào nhóm phù hợp trong tệp XML cùng PR, rồi chủ dự án nhập lại.
- Thư `security@`/`privacy@` `SHOULD` được phản hồi trong 3 ngày làm việc (`SECURITY.md`, Nghị định 13/2023).

## 7. Website, ứng dụng, cửa hàng

- Website `MUST` có `/.well-known/security.txt` (RFC 9116) với `Contact: mailto:security@tsudev.com` (không phải
  `contact@` - đầu mối an ninh tách khỏi liên hệ chung), `Expires` ≤ 1 năm,
  `Preferred-Languages: vi, en`, `Canonical`.
- Hiển thị địa chỉ trên web: `mailto:` thường là đủ (Email Routing + catch-all từ chối đã chặn rác); `MUST NOT` tự chế
  mã hoá địa chỉ bằng JavaScript làm hỏng trình đọc màn hình.
- Hồ sơ cửa hàng (Google Play, Partner Center, App Store), manifest winget (`PublisherSupportUrl`), Scoop, npm/pub:
  email hỗ trợ = `contact@tsudev.com`, chính sách quyền riêng tư = `privacy@tsudev.com`.

## 8. Kiểm tra và xử lý sự cố

### 8.1. Quyền truy cập

- Token API thường của chủ dự án (`~/.config/tsudev/cloudflare*.env`) **không** có quyền Email Routing (`10000
  Authentication error`). Token OAuth của wrangler (`~/.config/.wrangler/config/default.toml`, sau `wrangler login`)
  **có** `email_routing:write` - hết hạn mỗi giờ, làm mới bằng `npx wrangler whoami`. DNS dùng token `cloudflare-dns.env`.
- Đọc luật: `GET /zones/<zone>/email/routing/rules`, catch-all: `.../rules/catch_all`, địa chỉ đích:
  `GET /accounts/<account>/email/routing/addresses`. In ra phải **che** địa chỉ đích.

### 8.2. Nhật ký thư (đã chuyển / bị từ chối / lỗi)

GraphQL `https://api.cloudflare.com/client/v4/graphql`:

```graphql
query($z:String!,$s:Time!,$e:Time!){viewer{zones(filter:{zoneTag:$z}){
  emailRoutingAdaptive(limit:100,filter:{datetime_geq:$s,datetime_leq:$e},orderBy:[datetime_DESC]){
    datetime from to status action spf dkim dmarc errorDetail subject }}}}
```

### 8.3. Bảng lỗi đã gặp

| Triệu chứng                                         | Nguyên nhân                                                 | Khắc phục                                           |
| --------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| `deliveryFailed` `421 4.7.28 ... rate limited`      | Báo cáo tự động (DMARC) chuyển tiếp về Gmail                | Mục 5.2 - đưa `rua` ra khỏi địa chỉ chuyển tiếp     |
| Người gửi nhận bounce `Unknown recipient`           | Địa chỉ không có luật ⇒ catch-all Worker `qulythuchi` từ chối | Mục 4 - tạo luật                                   |
| Resend `403 The tsudev.com domain is not verified`  | Khoá API thuộc team Resend không giữ tên miền               | Dùng khoá của team đang Verified (mục 2)            |
| Gmail "Send mail as" gửi đi bị từ chối              | Gửi qua máy chủ Gmail, trượt DMARC `p=reject`               | Mục 6 - SMTP Resend                                 |
| Tự gửi từ Gmail tới `contact@` không thấy trong Hộp thư đến | Gmail gộp thư chuyển tiếp quay về chính tài khoản gửi (chỉ thấy ở "Đã gửi") | Thử bằng tài khoản khác hoặc qua Resend |

## 9. Checklist cho dự án mới / tính năng gửi thư

- [ ] Mọi địa chỉ `@tsudev.com` trong repo có trong bảng mục 3 (`grep -rhoE "[A-Za-z0-9._%+-]+@tsudev\.com"`).
- [ ] Dữ liệu test/ví dụ dùng `example.com` / `example.test`.
- [ ] Gửi thư qua Resend, `From` theo mục 6, khoá trong biến môi trường, có `.env.example`.
- [ ] Gửi thử tới hộp thư ngoài: header `dkim=pass header.d=tsudev.com`, `dmarc=pass`.
- [ ] Không sửa DNS thư của `tsudev.com` (mục 5) - cần thì viết phiếu điều phối.
- [ ] `SECURITY.md`/`PRIVACY.md`/hồ sơ cửa hàng dùng `security@`/`privacy@`/`contact@`.

## 10. Lịch sử

- **v1.1.0 - 25/11/2026**: Cloudflare DMARC Management đã bật, `rua` chỉ còn địa chỉ Cloudflare; mục 6.1 bộ lọc Gmail
  (`templates/email/gmail-filters.xml`); rà DMARC Management hằng tháng.
- **v1.0.0 - 25/11/2026**: bản đầu. Danh mục 18 địa chỉ (gửi thử đủ), DMARC `rua` rời `contact@`, MTA-STS (testing) +
  TLS-RPT, quy trình thêm địa chỉ, bảng lỗi đã gặp.
