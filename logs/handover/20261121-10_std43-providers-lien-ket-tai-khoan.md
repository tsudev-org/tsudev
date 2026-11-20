# Phiếu 20261121-10 - STD43: /api/v1/auth/providers, liên kết tài khoản, quy ước v4.3.0

- Phiên: tsudev-10 (điều phối, mở trong `~/projects/tsudev`), 19:45-20:30 UTC 20/11/2026 (02:45-03:30 giờ VN 21/11).
- Phiếu trước: [`20261121-09`](20261121-09_dieu-phoi-standards-v4-2-0-bp-tsusync.md). Không khoá, không tác vụ nền.

## 1. Đã làm

0. **Thư nhắc Pro**: lượt 01:23 UTC 21/11 VẪN chưa tới giờ (phiên chạy ~20:00 UTC 20/11) ⇒ không kiểm được.
1. **tsufiles#123** (quy ước v4.2.0) đã gộp (CI xanh hết).
2. **Phiếu STD43 mục 1, 2, 4** - tsudev #351 gộp (`a063ed4`), deploy **`deploy-2026.11.21.2`** Worker `595255b1`,
   Render dựng `a063ed4`:
   - `.standards` v4.3.0.
   - `GET /api/v1/auth/providers` ⇒ `{ providers: [{ id, name, idp_hint }] }` (CORS `*`, cache 300s), nguồn là mảng
     provider NextAuth. Đo production: 200, GitHub + Google.
   - `/settings/security` mục **Tài khoản liên kết**: liên kết Google/GitHub kể cả khác email (cookie ý định ký HMAC
     `tsu-link-intent`, 10 phút, phải trùng phiên), gỡ liên kết (step-up, chặn gỡ lối vào cuối cùng). auth-service
     `oauth/list`, `oauth/link` (chỉ BFF), `oauth/unlink`. Đo: không phiên ⇒ 401. Chi tiết `docs/auth.md` mục 5.
   - 3 cảnh báo CodeQL `js/missing-rate-limiting` (#119-121) dismiss dương tính giả - `routeOrder.test.ts` canh.
   - qulythuchi-5d (PR qulythuchi#47) đã đọc endpoint này; đã báo họ endpoint sống.
3. **BP tsuscan: HOÃN có lý do** - repo chưa có bản phát hành/thẻ nào (CHANGELOG chỉ "Chưa phát hành") ⇒
   `version_unique`, `version_tags`, `release_notes` không khai Met trung thực được. Làm sau bản phát hành đầu.
   Ghi chú thêm: cảnh báo code-scanning mở của tsuscan (7) đều là Scorecard; CHƯA có `CONTRIBUTING.md`; mật mã là
   RustCrypto (`chacha20poly1305`, `argon2`) - khác mẫu tsusync (libsodium). Thư mục làm việc `~/projects/tsuscan`
   đang ở nhánh `feat/p6-camera` có thay đổi chưa commit (PR tsuscan#9) - không đụng.

4. **Sự cố 429 ở `/oidc/*`** (20:46-20:48 UTC 20/11, qulythuchi-5d báo): Worker → `tsudev-backend.onrender.com`
   bị lớp Cloudflare trước Render trả 429 "Just a moment..." (gọi thẳng Render cùng lúc 200; Render deploy xong
   20:30 ⇒ không trùng deploy). Tự hết sau ~2 phút. Vá giảm thiểu #353 (`f0f42a2`, `deploy-2026.11.21.3` Worker
   `c63a04fc`): proxy đệm discovery + JWKS (mới 5 phút, bản cũ tới 24 giờ khi upstream 429/5xx), không có bản cũ ⇒
   503 JSON + `Retry-After`. `/oidc/auth`, `/oidc/token` vẫn phụ thuộc Render - RP cần thử lại có backoff.
   AKB `dieu-phoi#ISS-20261120-1459-46b8` ⇒ mitigated. Đã báo qulythuchi-5d đo lại.
   - Bẫy nhỏ: bản dựng sửa `apps/frontend-main/next-env.d.ts` ⇒ `deploy-frontend.js` bỏ gắn thẻ; `git checkout` tệp
     đó rồi `node scripts/release-tag.js --from-deploy`.

## 2. Chưa kiểm được / việc 👤

- Liên kết đầu-cuối thật trên production (bấm "Liên kết GitHub" bằng tài khoản thật) CHƯA thử - cần đăng nhập tài
  khoản thật. 👤 hoặc phiên sau thử: đăng nhập tsudev.com → Bảo mật → Liên kết GitHub/Google → phải quay về
  `/settings/security` với thông báo "Đã liên kết", phiên KHÔNG đổi sang tài khoản khác.
- STD43 mục 3 (Apple): chờ chủ dự án quyết phát hành App Store (Apple Developer Program 99 USD/năm).

## 3. Câu lệnh khởi động phiên điều phối kế tiếp

```
Bạn là agent điều phối TsuDEV (mở trong ~/projects/tsudev). Theo CLAUDE.md, đọc logs/STATE.md, phiếu
logs/handover/20261121-10_*.md rồi dòng cuối mục 6 của ~/projects/logs/handover/20261120-01_*.md. akb start.
0) Thư nhắc Pro (lượt 01:23 UTC 21/11 - nay đã qua): `npm run cron:tail` hoặc log Render "[auth] thư nhắc Pro";
   lỗi thì sửa, mở PR.
1) Thử đầu-cuối liên kết GitHub/Google ở /settings/security trên production (mục 2 phiếu 10) nếu có tài khoản thử.
2) Kiểm app-la-ban + qulythuchi đã lên .standards v4.2.0/v4.3.0 trên main (ListAgents, nhắn nếu chưa).
3) TR1-b: BP repo có bản phát hành mà chưa có hồ sơ (sound-db, app-la-ban - nếu không có phiên riêng); tsuscan chờ
   bản phát hành đầu. Rồi K2 (backfill AKB ≤ 5 repo không có phiên).
Tự chọn phương án; bước cần tôi thì ghi lệnh rồi làm bước kế. Cuối phiên ghi bàn giao vào logs/handover/ + mục 6.
```
