<img src="apps/frontend-main/public/brand/logo-mark.png" alt="Dấu hiệu tsudev" width="96" />

# tsudev

[![CI](https://github.com/tsudev-tsudev/tsudev/actions/workflows/ci.yml/badge.svg)](https://github.com/tsudev-tsudev/tsudev/actions/workflows/ci.yml)

Website cá nhân của tsudev để **phát hành file cài đặt của các app tự phát
triển**: mỗi bản có SHA-256 do máy chủ tính và chữ ký Ed25519 người tải tự kiểm
được. Kèm **dự án & bản quyền** (giấy phép, trạng thái đăng ký quyền tác giả),
blog, kho tài liệu và **xác thực**.

Một sản phẩm của [tsudev](https://tsudev.com).

**Hạng sản phẩm: A - Web có tài khoản** (`.standards/docs/AUTH_AND_ACCOUNT.md`
mục 1). Hạng A `MUST NOT` tự dựng kho người dùng riêng: danh tính của hệ sinh
thái là một, ở `tsudev.com`.

Monorepo npm workspaces. Đặc tả gốc: [`documents-tsudev.md`](documents-tsudev.md).

## Bắt đầu

```bash
npm install
cp .env.example .env
npm run dev:full     # dựng Postgres user-space (:5433) + migrate + seed + chạy stack
```

Các lần sau chỉ cần `npm run dev:local` (DB đã có sẵn).

- Mở http://tsudev.localhost:8080 (một cổng vào duy nhất qua
  `scripts/dev-proxy.js`; `*.localhost` tự trỏ loopback, không phải sửa
  `/etc/hosts`). Proxy hỏng: `DEV_PROXY=0 npm run dev:local`.
- Đăng nhập dev: `tsudev` (ADMIN) · `alice` (MEMBER) · `bob` (VIP), mật khẩu
  `tsudev-dev-2026!`. Do `npm run db:seed:dev` đặt - hash Argon2id thật, đi qua
  ĐÚNG đường mà người dùng thật đi. Không còn "bất kỳ username nào + devpass".
  `tsudev` = ADMIN (xem `/admin`), `alice` = MEMBER, `bob` = VIP.

Không cần Docker cho việc thường ngày. `docker-compose.yml` chỉ dùng khi cần
MinIO thật.

**Chi tiết, gỡ lỗi khởi động, đổi cổng → [docs/development.md](docs/development.md).**

## Cấu trúc

| Thư mục                    | Nội dung                                            | Cổng |
| -------------------------- | --------------------------------------------------- | ---- |
| `apps/frontend-main`       | Next.js 16 - app duy nhất: dự án, blog, docs, admin | 3000 |
| `services/content-service` | blog, docs, dự án & bản quyền                       | 4001 |
| `services/storage-service` | presign S3/R2, upload                               | 4002 |
| `services/auth-service`    | mật khẩu, 2FA, passkey                              | 4004 |
| `packages/db`              | schema Prisma, migration, seed                      | -    |
| `packages/ui`              | design system + Storybook                           | 6006 |
| `packages/brand`           | ảnh nguồn logo/favicon/avatar                       | -    |
| `infrastructure/`          | hạ tầng, Worker canh site, cấu hình R2              | -    |

Mỗi thư mục có `README.md` riêng.

## Lệnh thường dùng

```bash
npm run dev:local        # chạy toàn bộ stack
npm run dev:services     # chỉ 3 service
npm run dev:frontends    # chỉ app Next
npm run db:migrate       # prisma migrate deploy
npm run db:generate      # BẮT BUỘC sau khi đổi schema.prisma
npm run db:seed
npm run db:reset         # xoá sạch + migrate + seed (chỉ local)
npm run lint             # eslint toàn repo
npm run format           # prettier --write
npm --workspace services/<tên> test
npm --workspace packages/ui run storybook
```

Không có lệnh `test` ở gốc - test chạy theo từng service.

## Tài liệu

| Chủ đề                             | File                                               |
| ---------------------------------- | -------------------------------------------------- |
| Bản đồ hệ thống, luồng request     | [docs/architecture.md](docs/architecture.md)       |
| Chạy local, biến môi trường        | [docs/development.md](docs/development.md)         |
| SSO, JWT, RBAC                     | [docs/auth.md](docs/auth.md)                       |
| Unit test, E2E, chẩn đoán CI       | [docs/testing.md](docs/testing.md)                 |
| Token màu, component, a11y         | [docs/design-system.md](docs/design-system.md)     |
| Render, Cloudflare Workers, secret | [docs/deployment.md](docs/deployment.md)           |
| Phát hành app, ký Ed25519, R2      | [docs/release-signing.md](docs/release-signing.md) |
| Phân vai agent, kỷ luật token      | [AGENTS.md](AGENTS.md)                             |

## Trạng thái

| Phase | Nội dung                                                                          | Trạng thái                          |
| ----- | --------------------------------------------------------------------------------- | ----------------------------------- |
| 0     | Postgres + Prisma + migration/seed, `@tsudev/db`, `@tsudev/types`                 | ✅                                  |
| 1     | Backend dùng dữ liệu thật (users/blog/docs/files) + RBAC                          | ✅                                  |
| 2     | Design system + trang chủ SSR                                                     | ✅                                  |
| 3     | Hạ tầng & giám sát: alerting Telegram/email, CI, Docker                           | ✅ cần credential để kích hoạt thật |
| 4     | Con dấu tín nhiệm (đã GỠ 04/11/2026 - khoá ký đổi vai sang ký bản phát hành)      | ✅ → gỡ                             |
| 5     | Một cổng vào + nguồn sự thật cổng/tên miền (`topology:check`)                     | ✅                                  |
| 6     | Chuyển thành website dự án cá nhân: gỡ diễn đàn/chợ/tin nhắn                      | ✅                                  |
| 7     | Dự án & bản quyền + hồ sơ uy tín tổ chức                                          | ✅                                  |
| 8     | Production: Cloudflare Workers (main) + Render (backend gộp)                      | ✅                                  |
| 9     | Q4/2026: gỡ Toà soạn + Con dấu, cache ở biên (ISR + R2), phát hành app ký Ed25519 | ✅ 05/11/2026                       |

## Đóng góp

`main` **không** có branch protection - repo Public từ 21/08/2026 nên GitHub
Free đã cho phép, nhưng chưa ai bật. Lớp chắn duy nhất là hook client `.husky/pre-push`, tự cài khi
`npm install`. Làm việc trên nhánh feature rồi mở PR; thật sự cần vượt thì
`ALLOW_MAIN_FORCE=1 git push`.

Trước khi commit:

```bash
npm run format:check && npm run lint
npm --workspace services/<tên đã sửa> test
```

Commit theo [Conventional Commits](https://www.conventionalcommits.org/).
