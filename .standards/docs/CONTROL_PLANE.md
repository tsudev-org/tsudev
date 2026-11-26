# TRẠM ĐIỀU HÀNH VÀ CỔNG XÁC THỰC TẬP TRUNG (v1.0.0)

> **Bắt buộc cho mọi website, dịch vụ, API của hệ TsuDEV** (chủ dự án 26/11/2026, bộ quy ước v7.2.0). Mục tiêu: mọi
> thao tác quản trị trên thông tin, dữ liệu, tài nguyên của hệ sinh thái đi qua **một** trạm điều hành nằm sau nhiều
> lớp khoá độc lập, và mọi lượt đăng nhập đi qua **một** cổng xác thực có luật khắt khe riêng - để website công khai
> không còn gì đáng chiếm, và một lớp hỏng không mở được cửa. Ký hiệu `MUST`/`SHOULD`/`MAY` theo RFC 2119.
> Liên quan: [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md), [`AUTH_AND_ACCOUNT.md`](AUTH_AND_ACCOUNT.md),
> [`ECOSYSTEM_IDENTITY.md`](ECOSYSTEM_IDENTITY.md), [`APP_INTEGRITY.md`](APP_INTEGRITY.md),
> [`FREE_TIER_STACK.md`](FREE_TIER_STACK.md), [`KNOWLEDGE_BASE.md`](KNOWLEDGE_BASE.md).

| Mục | Giá trị |
| :-- | :-- |
| **Phiên bản** | 1.0.0 - bộ quy ước v7.2.0 (26/11/2026) |
| **Cài đặt tham chiếu** | `tsudev-org/tsudev` ADR-0005, phiếu `20261126-CP1` (mỗi phiên một phase) |
| **Học từ** | hệ thống `ubnd` (xanuicam.vn): SSO ở `id.`, Cloudflare Access trước `quantri.` + lớp kiểm JWT thứ hai ở backend, khoá origin bằng chữ ký biên, cảnh báo an ninh thời gian thực, nhật ký kiểm toán chuỗi băm |
| **Chi phí** | 0 đồng: Cloudflare Workers + Zero Trust Free (≤ 50 người dùng), Render, Neon theo `FREE_TIER_STACK.md` |

## Mục lục

1. Ba vùng và bản đồ tên miền
2. Cổng xác thực tập trung `id.tsudev.com`
3. Trạm điều hành `console.tsudev.com` - bảy lớp khoá
4. Website công khai: chỉ đọc
5. Hợp đồng cho website/dịch vụ sản phẩm
6. Khoá origin, bí mật, nhật ký, cảnh báo
7. Chuyển dần - không làm gãy app đã cài
8. Ghi nhận tri thức và đẩy ngược bộ quy ước
9. Checklist nghiệm thu

## 1. Ba vùng và bản đồ tên miền

| Vùng | Tên miền | Ai vào | Được làm gì |
| --- | --- | --- | --- |
| **Công khai** | `tsudev.com`, `www.` (chuyển hướng), website sản phẩm | mọi người | ĐỌC nội dung đã công bố, tải bản phát hành, gọi API công khai đã liệt kê (bản kê phiên bản, JWKS, `/api/me/*`, `/api/rp/*` có xác thực riêng) |
| **Xác thực** | `id.tsudev.com` | mọi người có tài khoản | đăng nhập, đăng ký, 2FA, passkey, khôi phục, đồng ý OIDC, bảo mật tài khoản của CHÍNH MÌNH |
| **Điều hành** | `console.tsudev.com` | chỉ người trong danh sách Access + vai trò từ DB | mọi thao tác ghi lên dữ liệu/tài nguyên dùng chung: dự án, bản phát hành, bản kê phiên bản, tài khoản, thanh toán, bài viết/tài liệu, cấu hình website sản phẩm, nhật ký an ninh |

- `MUST NOT` đặt trang hay route quản trị ở vùng công khai. `/admin/*` cũ trên `tsudev.com` chỉ còn chuyển hướng 308 sang
  `console.` cho tới khi tắt hẳn.
- Mỗi vùng là **một Worker riêng, một bản dựng riêng**: mã quản trị không có trong bundle công khai (cổng kiểm quét
  bundle, mục 9). Lộ mã nguồn bundle công khai không lộ được bề mặt quản trị.
- Tên miền mới chỉ dưới `tsudev.com`; `MUST NOT` mở thêm vùng điều hành thứ hai (`admin.`, `quantri.`...) ở website
  sản phẩm - website sản phẩm được điều hành TỪ `console.` theo mục 5.

## 2. Cổng xác thực tập trung `id.tsudev.com`

1. **Issuer OIDC KHÔNG đổi**: `https://tsudev.com/oidc` bất biến như tên repo cũ (app đã cài ghim issuer, `iss` trong
   token, JWKS). `id.` chỉ là nơi đặt **giao diện tương tác** (đăng nhập, đồng ý) và trang bảo mật tài khoản. Đổi issuer
   chỉ được làm bằng một phiếu riêng có giai đoạn chấp nhận hai issuer và danh sách app đã cập nhật.
2. **Passkey**: `rpId` giữ `tsudev.com` - passkey đã đăng ký dùng được ở `id.` (tên miền con của rpId). `MUST NOT` đổi
   rpId thành `id.tsudev.com` (mọi passkey cũ thành vô dụng).
3. **Cookie**: cookie phiên của cổng `MUST` có tiền tố `__Host-` (không `Domain`, `Secure`, `Path=/`), `HttpOnly`,
   `SameSite=Lax`. Cookie dùng chung nhiều vùng (nếu buộc phải có) chỉ mang mã phiên mờ, không mang vai trò.
4. **Luật riêng của cổng**: CSP nonce, không script/phông/ảnh bên thứ ba, `frame-ancestors 'none'`, Trusted Types
   (`require-trusted-types-for 'script'`), COOP `same-origin`, `X-Robots-Tag: noindex` cho mọi trang trừ trang đăng nhập.
   Giới hạn tần suất theo tài khoản + IP (`CF-Connecting-IP`), lưu bền; Turnstile khi có dấu hiệu dò; thông báo đăng
   nhập lạ (thiết bị/quốc gia mới) theo `AUTH_AND_ACCOUNT.md`.
5. **Mật khẩu chỉ ở máy chủ có Argon2id** (dịch vụ danh tính); Worker của `id.` chỉ là BFF, không đọc băm mật khẩu.
6. Mọi sản phẩm đăng nhập bằng OIDC + PKCE qua trình duyệt hệ thống; `MUST NOT` tự dựng ô mật khẩu tài khoản TsuDEV
   trong app hay website sản phẩm.

## 3. Trạm điều hành `console.tsudev.com` - bảy lớp khoá

Mỗi lớp độc lập; vượt được một lớp không cho gì cả.

| # | Lớp | Yêu cầu |
| --- | --- | --- |
| L1 | **Cloudflare Access** (Zero Trust) | Ứng dụng self-hosted phủ CẢ tên miền (path trống - gồm `/api`). Policy Allow theo **danh sách email cụ thể** (`MUST NOT` "Emails ending in" tên miền thư công cộng); đăng nhập Access bằng One-time PIN hoặc GitHub; phiên Access ≤ 24 giờ. Máy giám sát dùng Service Token riêng, chỉ GET `/healthz` |
| L2 | **Kiểm JWT Access ở Worker và backend** | Mọi request mang `Cf-Access-Jwt-Assertion` hợp lệ: RS256, `aud` = AUD tag của ứng dụng, `iss` = miền nhóm, khoá từ `/cdn-cgi/access/certs` đệm ≤ 1 giờ. Chế độ `ghi` (chỉ đếm) → xem log sạch → `chan` (403). Không tải được JWKS ở chế độ `chan` ⇒ ĐÓNG (503) |
| L3 | **Đăng nhập tài khoản qua `id.`** | Vai trò điều hành (`AUTHOR` trở lên) `MUST` có passkey hoặc TOTP; phiên điều hành ≤ 8 giờ, nhàn rỗi 30 phút |
| L4 | **Phân quyền từ DB, fail closed** | Vai trò đọc từ cơ sở dữ liệu ở MỖI request ghi (không tin claim, không tin cookie); quyền tối thiểu theo vai trò; OWNER chỉ cấp bằng seed/DB |
| L5 | **Khẳng định danh tính riêng của vùng** | BFF của `console.` ký khẳng định danh tính với `aud=console` bằng bí mật RIÊNG; route điều hành ở backend chỉ nhận `aud=console`. Worker công khai bị chiếm KHÔNG gọi được route điều hành |
| L6 | **Bước xác nhận lại cho thao tác nguy hiểm** | Xoá, đổi vai trò, thu hồi khoá, nâng `latest`, công bố bản phát hành, đổi cấu hình bảo mật ⇒ step-up (passkey/TOTP ≤ 5 phút trước) + lý do bắt buộc ghi vào nhật ký |
| L7 | **Nhật ký kiểm toán bất biến** | Mọi thao tác ghi: ai, lúc nào, từ đâu (IP rút gọn), trước/sau (không chứa bí mật/nội dung cá nhân thừa); chuỗi băm `prevHash`, trigger chặn UPDATE/DELETE; route kiểm toàn vẹn chuỗi chạy theo lịch, gãy ⇒ cảnh báo cao |

Thêm cho vùng điều hành: `X-Robots-Tag: noindex, nofollow`, `robots.txt` chặn hết, CSP nonce + Trusted Types, không
tài nguyên bên thứ ba, `Cache-Control: no-store` cho mọi trang có dữ liệu, giới hạn tần suất theo tài khoản, WAF chặn
quốc gia ngoài danh sách cho phép (`SHOULD`, theo nơi chủ dự án làm việc).

**Cửa khẩn cấp (break-glass)**: runbook trong repo cài đặt mô tả cách vào khi Access hoặc `id.` hỏng (chỉ chủ dự án,
từ máy đã đăng ký, mọi lượt dùng ghi nhật ký + cảnh báo cao). `MUST NOT` có tài khoản/mật khẩu "cửa sau" cố định trong mã.

## 4. Website công khai: chỉ đọc

- Worker công khai `MUST NOT` có route proxy tới đường ghi điều hành (`/api/admin/*`, `/api/internal/*`, quản lý tài
  khoản người khác). Đường ghi còn lại ở vùng công khai chỉ là việc của CHÍNH người dùng (bình luận, hồ sơ, quyền lợi
  của mình) hoặc giao thức máy-với-máy có xác thực riêng.
- Trang công khai đọc dữ liệu ĐÃ CÔNG BỐ (cờ `published`); bản nháp, tệp chưa niêm phong, dữ liệu nội bộ chỉ đọc được
  từ `console.`.
- Tệp riêng tư phát bằng URL ký có hạn, không bao giờ bằng đường dẫn trần; bucket không mở đọc ẩn danh.

## 5. Hợp đồng cho website/dịch vụ sản phẩm

Website sản phẩm (trang giới thiệu, tài liệu, máy chủ API riêng) `MUST`:

1. **Không có trang quản trị riêng.** Nội dung, cấu hình, cờ tính năng, thông báo bảo trì, công tắc tắt khẩn cấp do
   `console.` ghi vào nguồn trung tâm; website đọc bản đã công bố (API công khai hoặc tệp tĩnh đã ký).
2. **Đăng ký vào sổ website** của `console.` (tên miền, repo, nơi chạy, URL kiểm sức khoẻ, người phụ trách) và công bố
   `https://<tên miền>/.well-known/tsudev/site.json`: `{ "product", "version", "commit", "built_at" }` - không bí mật.
3. **Nhận lệnh điều hành chỉ qua kênh ký**: request từ `console.` mang chữ ký Ed25519 hoặc HMAC-SHA256 trên
   `<ts>.<METHOD>.<path>.<sha256(body)>`, `ts` lệch ≤ 300 giây, mã lệnh dùng một lần; khoá công khai/bí mật theo từng
   website, xoay được. Lệnh có danh mục cố định (xoá đệm, bật/tắt bảo trì, đổi cờ) - `MUST NOT` có lệnh "chạy mã tuỳ ý".
4. **Báo cáo, không tự quyết**: sự kiện an ninh của website (đăng nhập lạ, 426/403 tăng vọt, lỗi 5xx) gửi về nhật ký
   trung tâm theo định dạng `SecurityAuditLog` (IP rút gọn /24 hoặc /48, không nội dung người dùng).
5. Đạt cùng chuẩn tiêu đề bảo mật như vùng công khai (`SECURITY_BASELINE.md`): HSTS preload, CSP, Observatory A+.

## 6. Khoá origin, bí mật, nhật ký, cảnh báo

- **Khoá origin**: backend chỉ nhận request do Worker của hệ ký - `X-Tsu-Edge: <ts>.<HMAC-SHA256(khoá, "<ts>.<METHOD>.<path>")>`,
  `ts` ≤ 300 giây, khoá riêng mỗi vùng; công tắc `tat|ghi|chan`, bộ đếm lượt thiếu/sai để bật `chan` có bằng chứng.
  Token tĩnh dùng chung (`INTERNAL_API_TOKEN`) chỉ là bước chuyển tiếp.
- **Bí mật**: chỉ ở Workers secrets / biến môi trường máy chủ; bản gốc ở `~/.config/tsudev/` (600) và bản sao lưu đã mã
  hoá; mỗi bí mật có ngày xoay và runbook xoay. `MUST NOT` ghi bí mật vào repo, log, tài liệu, AKB.
- **Nhật ký**: nhật ký điều hành (L7) giữ vô thời hạn, bất biến; nhật ký an ninh (`SecurityAuditLog`) ≤ 12 tháng
  (`PRODUCT_POLICY` 7.7); log ứng dụng không chứa token, mật khẩu, nội dung người dùng.
- **Cảnh báo** (thư tới chủ dự án, gom mỗi loại ≤ 1 thư / 5 phút): đăng nhập điều hành từ thiết bị mới, chuỗi kiểm toán
  gãy, lượt gọi backend không qua biên khi `chan`, nhồi thông tin đăng nhập, 5xx tăng vọt, `untrusted_client` tăng vọt,
  bí mật sắp tới hạn xoay. Có nút gửi thư diễn tập; tiêu chí: phát hiện < 1 phút, thư < 2 phút.

## 7. Chuyển dần - không làm gãy app đã cài

- Mỗi bước có chế độ `ghi` trước `chan`, và tiêu chí chuyển là **số đo**, không phải ngày.
- `MUST NOT` đổi URL công khai mà app/updater/RP đã ghim (issuer OIDC, `/api/me/entitlements`, `/api/rp/*`, bản kê
  phiên bản, JWKS, link tải). Cần đổi ⇒ giữ đường cũ (chuyển hướng hoặc phục vụ song song) tới khi số đo cho thấy không
  còn lượt gọi.
- Mỗi phase một PR, một phiên; migration lên Neon trước khi gộp; đo production sau deploy.

## 8. Ghi nhận tri thức và đẩy ngược bộ quy ước

- Mỗi phase `MUST` ghi vào AKB (`KNOWLEDGE_BASE.md`): quyết định (`akb new decision`), bẫy/lỗi (`issue`), mẹo (`lesson`).
- Thứ gì hiệu quả ở một repo mà repo khác cũng cần ⇒ đề xuất vào bộ quy ước theo `SYNC.md` trong cùng tuần; cài đặt
  tham chiếu ghi tên repo + ADR để agent dự án khác làm theo, không tự nghĩ lại.

## 9. Checklist nghiệm thu

- [ ] Không route quản trị nào ở Worker công khai; test quét bundle công khai không có chuỗi `/api/admin`, `/api/internal`.
- [ ] `console.` ẩn danh ⇒ màn Cloudflare Access; JWT Access giả/thiếu ⇒ 403 ở chế độ `chan` (test với JWKS giả).
- [ ] Route điều hành từ chối khẳng định danh tính `aud` khác `console` (test).
- [ ] Thao tác nguy hiểm không step-up ⇒ 401/403; có step-up ⇒ ghi nhật ký kèm lý do.
- [ ] Chuỗi băm nhật ký kiểm toán: sửa/xoá một dòng ⇒ trigger chặn; kiểm toàn vẹn chạy theo lịch.
- [ ] `id.`: issuer vẫn `https://tsudev.com/oidc`; passkey cũ đăng nhập được; cookie `__Host-`; CSP + Trusted Types; Observatory A+.
- [ ] Backend gọi thẳng (không qua Worker) ⇒ bị đếm (`ghi`) / 403 (`chan`).
- [ ] Website sản phẩm: có `site.json`, không có trang quản trị, nhận lệnh ký đúng và từ chối lệnh ký sai/hết hạn/phát lại.
- [ ] Thư diễn tập tới được hộp thư chủ dự án < 2 phút.
