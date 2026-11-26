# ADR-0005: Trạm điều hành `console.tsudev.com` và cổng xác thực `id.tsudev.com`

- **Ngày**: 26/11/2026 (phiên tsudev-INT1b, phiếu [`20261126-CP1`](../../logs/handover/20261126-CP1_tram-dieu-hanh-va-cong-xac-thuc-tap-trung.md))
- **Trạng thái**: **ĐÃ CHẤP NHẬN** (chủ dự án yêu cầu 26/11/2026; phương án kỹ thuật do agent chọn theo uỷ quyền)
- **Hợp đồng**: tsudev-standards **v7.2.0** `docs/CONTROL_PLANE.md` (repo này là cài đặt tham chiếu).

## Bối cảnh

Hôm nay một Worker (`apps/frontend-main`) phục vụ CÙNG LÚC trang công khai, đăng nhập và 8 trang quản trị
(`/admin/{accounts,content,projects,release-security,review,security,thanh-toan}`), và bundle công khai chứa proxy tới
đường ghi điều hành. Hệ quả: (1) ai biết `/admin` đều chạm được trang đăng nhập quản trị và thử mật khẩu; (2) một lỗi
ở trang công khai (XSS, phụ thuộc bị chiếm) chạy cùng origin với phiên quản trị; (3) không có lớp khoá nào ở biên
trước tài khoản; (4) website sản phẩm sắp có trang quản trị riêng nếu không có nơi điều hành chung.

Hệ `ubnd` đã chạy thật mô hình tách vùng: SSO ở `id.`, Cloudflare Access trước `quantri.` + `kiemCloudflareAccess.ts`
(lớp JWT thứ hai, chế độ `ghi` → `chan`), khoá origin Render bằng `X-Bien-Ky` (HMAC có `ts`), cảnh báo an ninh gom thư,
nhật ký kiểm toán chuỗi băm. Chọn lọc những phần hợp với tsudev (Next trên Workers, backend gộp trên Render free).

## Quyết định

1. **Ba Worker, ba bản dựng** trong monorepo: `apps/frontend-main` (`tsudev.com`, công khai, chỉ đọc), `apps/console`
   (`console.tsudev.com`), `apps/id` (`id.tsudev.com`). Dùng chung `@tsudev/ui`, `@tsudev/auth`, `@tsudev/identity-token`.
   Mã điều hành không có trong bundle công khai (test quét bundle).
2. **Issuer OIDC giữ `https://tsudev.com/oidc`** (app đã cài ghim). `id.` chỉ phục vụ giao diện tương tác OIDC
   (`interactions.url` của provider trỏ sang `id.`, form gửi về `/oidc/interaction/<uid>/*` - cùng site nên cookie
   `_interaction` SameSite=Lax vẫn đi kèm) và trang bảo mật tài khoản. Passkey giữ `rpID = tsudev.com`.
3. **`console.` sau Cloudflare Access** (Zero Trust Free, policy theo danh sách email, phủ cả `/api`) + Worker và
   backend kiểm `Cf-Access-Jwt-Assertion` (RS256, `aud`, `iss`, JWKS đệm 1 giờ; `CF_ACCESS_MODE=ghi|chan`, `chan` mà
   không tải được JWKS ⇒ 503). Chuyển từ `ubnd` `kiemCloudflareAccess.ts`, viết lại bằng `node:crypto` (không thêm
   `jsonwebtoken`).
4. **Khẳng định danh tính tách theo vùng**: `@tsudev/identity-token` thêm `aud` (`main` | `console` | `id`) và bí mật
   riêng mỗi vùng (`INTERNAL_IDENTITY_SECRET_CONSOLE`...). Route `/api/admin/*`, `/api/identity/useradmin/*` chỉ nhận
   `aud=console`. Worker công khai bị chiếm không ký được khẳng định cho vùng điều hành.
5. **Khoá origin `X-Tsu-Edge`** thay `INTERNAL_API_TOKEN` tĩnh: HMAC-SHA256 trên `<ts>.<METHOD>.<path>`, `ts` ≤ 300 s,
   khoá riêng mỗi Worker, `EDGE_MODE=tat|ghi|chan`, bộ đếm theo lý do (`thieu|sai|het_han`) đọc ở `console.`.
6. **Nhật ký**: `TrustAuditLog` (đã có chuỗi băm + trigger) là nhật ký điều hành L7; `SecurityAuditLog` (INT1-b) là
   nhật ký an ninh 12 tháng. Kiểm toàn vẹn chuỗi theo lịch qua Worker `canh-site-cron`; gãy ⇒ thư cảnh báo cao.
7. **Website sản phẩm** đăng ký vào bảng `EcosystemSite` và nhận lệnh điều hành ký Ed25519 (khoá của `console.`,
   JWKS công khai) với danh mục lệnh cố định - không có trang quản trị riêng.
8. **Ngôn ngữ**: TypeScript cho Workers/Next/Express như hiện trạng (`LANGUAGE_SELECTION.md`); mật mã dùng
   `node:crypto`/WebCrypto, Ed25519 nặng dùng `@tsudev/trust-crypto` (Rust→WASM) sẵn có. Không thêm runtime mới.

## Phương án đã bác

- **Một Worker, chặn `/admin` bằng Access theo đường dẫn**: Access phủ theo path dễ hở (một route quên khai); bundle
  công khai vẫn chứa mã điều hành; không tách được origin của phiên quản trị.
- **Đổi issuer sang `https://id.tsudev.com`**: gãy mọi app/RP đã cài - cùng loại lỗi với chiếm lại tên repo cũ.
- **`admin.tsudev.com`**: tên đoán được, bị quét nhiều hơn; `console.` trung tính, cùng một Access policy.
- **Tự dựng VPN/bastion**: tốn tiền, thêm máy phải vá; Access Free đủ cho ≤ 50 người.

## Hệ quả

- 👤 chủ dự án: tạo nhóm Zero Trust + ứng dụng Access cho `console.` (runbook `docs/console-access.md` ở phase CP2), đặt
  biến Render/Workers mới. Agent không ghi được cấu hình Zero Trust.
- Mọi đường đổi đều đi `ghi` trước `chan`, tiêu chí chuyển là số đo. `/admin/*` trên `tsudev.com` chuyển hướng 308
  sang `console.` cho tới khi log không còn lượt.
- Free tier: thêm 2 Worker trong cùng hạn mức 100k request/ngày của tài khoản; trang điều hành ít lượt.
