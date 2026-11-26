# Trạm điều hành `console.tsudev.com` - vận hành

Chuẩn: `.standards/docs/CONTROL_PLANE.md`; quyết định: [ADR-0005](adr/0005-tram-dieu-hanh-va-cong-xac-thuc-tap-trung.md).
Mã: `apps/console` (Worker `tsudev-console`).

## 1. Các lớp khoá đang có (sau CP2)

| Lớp                  | Ở đâu                                                                                                                      | Chế độ                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| L1 Cloudflare Access | ứng dụng self-hosted phủ cả `console.tsudev.com`, Allow theo email, OTP, phiên 24 giờ; `workers_dev` và `preview_urls` tắt | chặn                         |
| L2 JWT Access        | `apps/console/proxy.ts` + backend `requireConsole()` (`packages/auth/src/console.ts`); `CF_ACCESS_MODE=tat\|ghi\|chan`     | `ghi`                        |
| L3 tài khoản         | phiên đăng nhập ở `tsudev.com` (cookie `Domain=.tsudev.com`), OWNER bắt buộc TOTP; cổng `id.` là CP4                       | chặn                         |
| L4 vai trò từ DB     | `requireOwner` ở auth-service                                                                                              | chặn                         |
| L5 vùng ký           | `INTERNAL_IDENTITY_SECRET_CONSOLE` + `aud=tsudev-services:console`                                                         | chặn **khi backend có biến** |
| L6 step-up           | TOTP ≤ 5 phút cho đổi vai trò, tạm khoá, xoá                                                                               | chặn (lý do bắt buộc: CP5)   |
| Khoá origin          | console ký `X-Tsu-Edge` bằng khoá riêng; chữ ký hợp lệ thay `INTERNAL_API_TOKEN`                                           | `ghi`                        |

Giao diện: CSP nonce + `strict-dynamic`, Trusted Types, `no-store`, `noindex`, không tài nguyên bên thứ ba.

## 2. Dựng lần đầu

1. `./scripts/cloudflare-access-console.sh --ap-dung` (đã chạy 26/11/2026; đổi email ở
   `~/.config/tsudev/console-access-emails.txt` rồi chạy lại).
2. `XDG_CONFIG_HOME=$HOME/.config/wrangler-tsudev npm --workspace apps/console run deploy`. Bước đẩy treo không in gì
   (gặp ở lần dựng đầu 26/11/2026) ⇒ dừng và chạy lại với `CI=true` đặt trước lệnh, thêm `< /dev/null` ở cuối.
3. `./scripts/console-secrets.sh --xoay-nextauth` - Worker console cần CÙNG `NEXTAUTH_SECRET` với Worker `tsudev`;
   giá trị production cũ không đọc lại được nên phải xoay ở cả hai (mọi người đăng nhập lại một lần). Những lần sau
   chạy không cờ.
4. 👤 Render → `tsudev-backend` → Environment: `INTERNAL_IDENTITY_SECRET_CONSOLE`, `EDGE_SIGNING_KEY_CONSOLE`
   (từ `~/.config/tsudev/keys/console.env`), `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD_CONSOLE`
   (từ `keys/console-access.env`).

Từ lúc bước 4 có hiệu lực, mọi route điều hành của backend (content `/api/admin` + `/api/author`, useradmin,
payadmin, alias, presign/upload) trả 403 `console_required` với khẳng định vùng main. Từ CP3 (27/11/2026)
`tsudev.com` không còn trang hay proxy điều hành nào: `/admin*`, `/studio*`, `/author*` chuyển 308 sang console.
Làm bước 4 **sau** khi bước 1-3 đã đo đạt.

⚠️ Tác giả (AUTHOR) khác chủ dự án vào Studio qua console ⇒ email của họ phải nằm trong policy Access, nếu không
308 đưa họ tới màn chặn của Access.

## 3. Đo

- Ẩn danh: `curl -sI https://console.tsudev.com/` ⇒ 302 sang `*.cloudflareaccess.com`; cả `/api/healthz` cũng vậy.
- Đăng nhập qua Access rồi mở `/accounts` ⇒ danh sách tài khoản.
- Log Worker/Render: dòng `[access] JWT Access không đạt` phải trống trước khi đặt `CF_ACCESS_MODE=chan` (CP7).
- `GET /api/admin/edge-stats` có `hasConsoleKey: true`.
- Không cần phiên ADMIN: GET `<backend>/api/posts` ký `X-Tsu-Edge` bằng khoá console ⇒ 200; không ký hoặc ký sai ⇒ 401
  (đúng khi cổng `INTERNAL_API_TOKEN` bật). Đo này chỉ chứng minh `EDGE_SIGNING_KEY_CONSOLE`; ba biến còn lại chứng
  minh bằng việc mở `/accounts` và log không có `[access]` / `[console] chưa có`.

## 4. Sự cố và cửa khẩn cấp

| Hỏng gì                                  | Cách vào / lùi                                                                                                                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access chặn nhầm (mất email OTP)         | chủ dự án sửa policy ở dashboard Zero Trust, hoặc sửa tệp email rồi chạy lại script                                                                                                                                        |
| L2 `chan` chặn nhầm                      | đặt `CF_ACCESS_MODE=ghi` ở Worker console và Render                                                                                                                                                                        |
| Console không ghi được (lệch khoá)       | **gỡ** `INTERNAL_IDENTITY_SECRET_CONSOLE` trên Render ⇒ backend nhận lại khẳng định vùng main, nhưng từ CP3 không còn trang điều hành ở `tsudev.com` - lùi đúng nghĩa là `wrangler rollback` cả hai Worker + revert PR CP3 |
| Cần cấp/thu quyền khi mọi giao diện hỏng | sửa `User.role` trực tiếp trên Neon từ máy chủ dự án (sao lưu trước)                                                                                                                                                       |

Không có tài khoản hay mật khẩu "cửa sau" trong mã. Xoay `INTERNAL_IDENTITY_SECRET_CONSOLE`: xoá dòng trong
`console.env`, chạy script, cập nhật Render.
