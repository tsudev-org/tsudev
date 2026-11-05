# Kiến trúc tsudev

Monorepo npm workspaces (`apps/*`, `services/*`, `packages/*`). Không có công cụ
build monorepo (Turbo/Nx): mọi thứ chạy qua `npm --workspace <path> run <script>`.

**Một app, ba service, một tiến trình ở production.** tsudev là website cá nhân
để **phát hành file cài đặt của các app tự phát triển** (SHA-256 + chữ ký
Ed25519), kèm dự án/bản quyền, blog và tài liệu. Đã gỡ: diễn đàn, chợ, tin nhắn
([refactor-personal-site.md](refactor-personal-site.md)); Toà soạn Agent AI
(29/10/2026) và Con dấu tín nhiệm (04/11/2026) -
[refactor-tsudev-2026-q4.md](refactor-tsudev-2026-q4.md) §7, §8.

## Bản đồ

```
apps/
  frontend-main/     Next.js 16 (Pages Router) + React 19 · app DUY NHẤT
                     trang chủ, dự án + tải app, blog, docs, author, admin
                     production: Cloudflare Workers qua @opennextjs/cloudflare
services/            Express + CommonJS, mỗi service một tiến trình ở dev
  content-service/   :4001  blog, docs, dự án, bản phát hành (ký + niêm phong)
  storage-service/   :4002  presign S3/R2, upload phía server, liệt kê file
  auth-service/      :4004  mật khẩu, 2FA, passkey - RANH GIỚI BẢO MẬT
  backend-bundle/    :4000  production: gộp ba service vào MỘT tiến trình (Render)
infrastructure/
  canh-site-cron/    Worker có lịch: giữ ấm Render, đo nội dung, canh hạn mức Neon
  r2/                cấu hình CORS của bucket
packages/
  @tsudev/db         Prisma schema + migration + seed (nguồn dữ liệu duy nhất)
  @tsudev/auth       kiểm danh tính + phân quyền dùng chung
  @tsudev/identity-token  hợp đồng khẳng định danh tính BFF→service
  @tsudev/trust-crypto    Ed25519 bằng Rust→WASM (ký bản phát hành)
  @tsudev/search · @tsudev/ratelimit · @tsudev/types
  @tsudev/ui         design system + tokens.css + Storybook
  brand/             ảnh gốc logo/avatar/favicon + script sinh asset
  observability/     initSentry.js · notify.js (Telegram/email)
```

## Luồng request

Ở dev, mọi thứ trình duyệt chạm tới đi qua **một cổng vào duy nhất**
(`scripts/dev-proxy.js`, cổng 8080) và phân biệt bằng subdomain. Bảng cổng:
`config/topology.json`.

```
trình duyệt
   │  chỉ gọi cùng origin
   ▼
Worker (Next): trang ISR (getStaticProps + R2 incremental cache)
          •    API route (pages/api/<domain>/[...path].ts)
   │  chuyển tiếp kèm header nội bộ + khẳng định danh tính
   ▼
backend-bundle (Render) → bảng tiền tố → content / storage / identity
   │  jose kiểm khẳng định danh tính do BFF ký (@tsudev/identity-token)
   ▼
Prisma → PostgreSQL (Neon)   ·   S3/R2 (storage + bản phát hành)
```

**Trình duyệt không bao giờ gọi thẳng cổng service.** Hai đường vào service:

- **Đọc công khai** (blog, docs, dự án) là trang **ISR**: dựng ở Worker, cache
  trong R2, dựng lại mỗi 5 phút. Backend chết thì trang vẫn trả bản cache gần
  nhất (`lib/isr.ts`, đã nghiệm thu bằng cách tắt backend - kế hoạch Q4 §6.5).
- **Ghi và đọc riêng tư** đi qua route proxy; trình duyệt không tự khai được vai
  trò của mình, danh tính lấy từ phiên next-auth rồi tiêm vào header.

| Proxy                                                          | Đích            |
| -------------------------------------------------------------- | --------------- |
| `/api/content/[...path]` - nhánh `admin`, `author`             | content-service |
| `/api/storage/[...path]`                                       | storage-service |
| `/api/identity/*`, `/api/account/*`                            | auth-service    |
| `/api/releases/<slug>/<id>` (tải về, công khai)                | content-service |
| `/api/releases/jwks` ← `/.well-known/tsudev-release-jwks.json` | content-service |

Proxy dùng **danh sách trắng tiền tố**: nhánh chưa khai thì 404. Bỏ sót một nhánh
là nó không chạy - an toàn hơn lỡ mở cả `/api`.

Tệp phát hành KHÔNG đi qua Worker hay Render: trình duyệt PUT thẳng vào R2 bằng
URL presign, tải về qua URL presign GET - xem [release-signing.md](release-signing.md).

## Bề mặt API

Đầy đủ trong mã (`services/*/src/index.ts`). Nhóm chính:

- **content-service** - `/api/posts`, `/api/docs`, `/api/projects`,
  `/api/releases`, `/api/projects/:slug/releases*`, `/api/author/*` (AUTHOR),
  `/api/admin/*` (ADMIN), `/.well-known/tsudev-release-jwks.json`
- **storage-service** - `/api/presign`, `/api/upload`, `/api/files`
- **auth-service** - `/api/identity/*`

Mọi service có `GET /health` (Render dùng làm health check; nó KHÔNG chạm DB).

## Dữ liệu

Một database PostgreSQL, một schema Prisma dùng chung
(`packages/db/prisma/schema.prisma`). Các service **không** có DB riêng - đây là
microservice về mặt tiến trình, không phải về mặt dữ liệu.

16 model (sau migration DROP 04/11/2026, 17 bảng của Toà soạn + Con dấu đã xoá):
nội dung `Post` `Doc` `Project` `ProjectRelease` `FileObject`; danh tính `User`
`OAuthAccount` `WebAuthnCredential` `WebAuthnChallenge` `TotpCredential`
`BackupCode` `AuthToken` `LoginAttempt` `EmailAlias` `SecurityEvent`; và
`TrustAuditLog` - **giữ lại** dù mang tên Con dấu: auth-service dùng nó làm nhật
ký thao tác quản trị tài khoản.

- Vai trò: enum `Role` = `GUEST` < `MEMBER` < `VIP` < `AUTHOR` < `MODERATOR` <
  `ADMIN` < `OWNER`. `VIP` còn trong enum (Postgres không `DROP VALUE`) nhưng
  không cấp được nữa.
- Xoá mềm: trigger Postgres chặn DELETE cứng (`deletedAt`).
- Migration đã áp dụng là **bất biến**. Thứ tự phát hành: `db:migrate` lên Neon
  TRƯỚC, merge SAU - backend có `migrationGate` thoát 1 khi DB thiếu migration.
- Đổi `schema.prisma` xong phải chạy `npm run db:generate`.

## Điểm lệch cần biết

- `services/api-gateway` xuất hiện trong TSD nhưng **không tồn tại** trong repo;
  vai trò gateway hiện do các route proxy của Next đảm nhiệm.
- **Cây thư mục theo Hình trạng B (monorepo) của
  `.standards/docs/PROJECT_STRUCTURE.md` §2 - HẾT LỆCH từ 25/08/2026.** Repo này
  là npm workspaces (`apps/` · `services/` · `packages/`, mỗi workspace có `src/`
  riêng và ranh giới build/test riêng), và quy ước v2.8.0 nay mô tả đúng hình
  trạng đó. Trước v2.8.0 quy ước chỉ có một cây `src/` chung - hình trạng của ứng
  dụng ĐƠN - nên đây từng là điểm lệch có chủ đích; đề xuất sửa từ repo này đã
  được trung tâm nhận. Hồ sơ:
  [`structure-upstream-proposal.md`](structure-upstream-proposal.md).
