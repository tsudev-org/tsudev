# CLAUDE.md - tsudev

Website cá nhân để **phát hành file cài đặt của các app tự phát triển** (SHA-256
do máy chủ tính + chữ ký Ed25519), kèm dự án & bản quyền, blog, tài liệu, xác
thực. Monorepo npm workspaces. Toà soạn Agent AI (gỡ 29/10/2026) và Con dấu tín
nhiệm (gỡ 04/11/2026, dữ liệu DROP 05/11/2026) KHÔNG còn tồn tại - đừng dựng lại.
Repo: Public (từ 21/08/2026), `github.com/tsudev-org/tsudev`.

> File này là NGỮ CẢNH TĨNH được nạp + cache ở đầu MỌI phiên. Đọc kỹ một lần,
> tuân thủ suốt phiên. **Đừng sửa file này giữa phiên** - sửa là bust cache toàn
> bộ phía sau. Cần sửa thì dồn về cuối phiên.

⚠️ **Bắt đầu phiên: đọc [`AGENTS.md`](AGENTS.md), rồi
[`logs/STATE.md`](logs/STATE.md) và phiếu MỞ mới nhất trong `logs/handover/`.**
Hàng đợi việc nằm ở đó, không còn ở `HANDOFF.md`. Khoá file mình sẽ sửa vào
`logs/LOCKS.md` trước khi bắt tay.

[`HANDOFF.md`](HANDOFF.md) nay chỉ còn hai việc: nhật ký từng phiên (§0) và kho
kỹ thuật đã trả giá để học (§0.7). Trạng thái production mới nhất nằm ở phiếu
bàn giao mới nhất trong `logs/handover/`, không ở HANDOFF.md.

`HANDOFF.md` §0.7 ghi **mười sáu kỹ thuật đã trả giá để học**. Bốn cái đắt nhất,
vì mỗi cái đều từng để một sự cố sống nhiều ngày mà không ai biết:

- **Mã 200 không chứng minh trang có nội dung** - `lib/api.ts` nuốt lỗi thành
  `[]`, nên backend 500 vẫn cho ra trang 200 rỗng.
- **Lỗi chỉ tồn tại trên HTTPS thì không bộ test nào ở đây bắt được** - dev và
  E2E chạy `http://localhost`; canh những thứ đó bằng test quét NGUỒN.
- **Một tiến trình treo không để lại log** - hỏi trạng thái từng bước, và lắp
  trần thời gian vì nó SINH RA bằng chứng chứ không chỉ chặn thiệt hại.
- **Công cụ ĐO có thể sai theo kiểu trông y hệt lỗi thật** - số đo bất thường dồn
  vào MỘT thành phần và biến mất ở một chế độ thì nghi công cụ trước, nghi mã sau.

Xong hết §1 thì xoá phần §1 của `HANDOFF.md`; giữ §0 và §0.7 - đó là nhật ký và
kho bài học, không phải việc còn dở.

## Bản đồ

**Nguồn sự thật về cổng/tên miền là `config/topology.json`**, không phải bảng
này. Đổi cổng ⇒ sửa ở đó rồi `npm run topology:gen`. `npm run topology:check`
(trong CI và `.husky/pre-push`) chặn hardcode mọc lại.

Ở dev chỉ có **một cổng công khai**: `scripts/dev-proxy.js` nghe 8080 và phân
biệt bằng subdomain, đúng hình trạng production.

| Thành phần                | Địa chỉ dev                        | Cổng nội bộ | Ghi chú                          |
| ------------------------- | ---------------------------------- | ----------- | -------------------------------- |
| `apps/frontend-main`      | `tsudev.localhost:8080`            | 3000        | Next 16 · app DUY NHẤT: dự án + tải app, blog, docs, author, admin |
| MinIO / R2                | `cdn.tsudev.localhost:8080`        | 9000        | đích của URL presign             |
| `services/content-service`| *(chỉ SSR/BFF)*                    | 4001        | blog, docs, dự án, bản phát hành (ký + niêm phong) |
| `services/storage-service`| *(chỉ SSR/BFF)*                    | 4002        | presign S3/R2, upload            |
| `services/auth-service`   | *(chỉ SSR/BFF)*                    | 4004        | mật khẩu, 2FA, passkey - RANH GIỚI BẢO MẬT |
| PostgreSQL                | -                                  | 5433        | cluster user-space, **không** phải 5432 |

⚠️ **Production KHÔNG chạy ba tiến trình như bảng trên.** Ba service backend
gộp thành MỘT tiến trình `services/backend-bundle` (cổng 4000, `npm run
dev:merged`). Render free chỉ cho 750 giờ instance/tháng cho cả tài khoản; nhiều
tiến trình chạy liên tục thì không giữ ấm được cái nào. Dev vẫn bốn cổng cho dễ lặp.

`packages/`: `@tsudev/db` (Prisma) · `@tsudev/auth` (kiểm danh tính + phân quyền
dùng chung) · `@tsudev/identity-token` (hợp đồng khẳng định danh tính BFF→service,
dùng chung giữa Workers và Node) · `@tsudev/trust-crypto` (Ed25519 bằng Rust→WASM,
nay ký BẢN PHÁT HÀNH - tên package giữ từ thời Con dấu) · `@tsudev/ui` (design system) ·
`@tsudev/types` · `brand/` (ảnh nguồn) · `observability/`
(thư mục thuần, không phải workspace). `@tsudev/utils` **đã bị gỡ 20/08/2026** -
nó chứa đúng một hàm và không nơi nào dùng; đừng dựng lại chỉ để có chỗ đặt.

## Chạy local

```bash
npm install && cp .env.example .env
npm run dev:full     # lần đầu: dựng DB + generate + migrate + seed + chạy
npm run dev:local    # các lần sau
```

Mở ở **http://tsudev.localhost:8080**.
`*.localhost` tự trỏ loopback - không phải sửa `/etc/hosts`. Proxy hỏng thì
`DEV_PROXY=0 npm run dev:local` quay về gõ thẳng cổng từng app.

Đăng nhập dev: `tsudev`=ADMIN · `alice`=MEMBER · `bob`=AUTHOR, mật khẩu
`tsudev-dev-2026!` (do `npm run db:seed:dev` đặt - hash Argon2id THẬT, đi qua
đúng đường của production). **Không còn** "bất kỳ username + devpass".

⚠️ Vào bằng `localhost:3000` hay `127.0.0.1:3000` thì **đăng nhập không chạy**:
cookie phiên mang `Domain=.tsudev.localhost` nên không gắn được vào host khác.

Test theo workspace, **không** có lệnh test ở gốc:
`npm --workspace services/<tên> test`. `packages/ui` cũng có test - đó là cổng
tương phản của hệ token màu, chạy trên cả ba chế độ. Cổng chung:
`npm run format:check` · `npm run lint` · `npm run typecheck` ·
`npm run topology:check` · `npm run tokens:check`.

Chi tiết → `docs/development.md`.

## Tài liệu - đọc CHỌN LỌC theo task

Mục lục: `docs/README.md`. Theo vùng: kiến trúc → `docs/architecture.md` ·
chạy local → `docs/development.md` · địa chỉ chính tắc → `docs/url-convention.md` ·
auth/RBAC → `docs/auth.md` · test/CI → `docs/testing.md` · giao diện →
`docs/design-system.md` · production → `docs/deployment.md` · phát hành app
(R2, niêm phong, ký) → `docs/release-signing.md` · hạn mức 0đ → `docs/free-tier.md`. Quy ước dùng chung nằm ở `.standards/` (bản chỉ-đọc, phiên
bản ở `.standards-version`) - `docs/` **không giữ bản sao nào** của chúng từ
24/08/2026.

Hai điểm repo này từng lệch bộ quy ước chung nay **HẾT LỆCH**: cả hai đề xuất đẩy
ngược đã được nhận vào `.standards/` v2.8.0 (25/08/2026) - `text-muted` đổi giá
trị + thêm vai trò `border-control`, và `PROJECT_STRUCTURE.md` có thêm "Hình trạng
B - monorepo". `docs/token-upstream-proposal.md` cùng
`docs/structure-upstream-proposal.md` nay là **hồ sơ đã đóng**, giữ lại làm số đo
tham chiếu và làm ví dụ mẫu cho lần đẩy ngược sau, không phải việc còn dở.

`documents-tsudev.md` là **đặc tả yêu cầu**, không phải mô tả hiện trạng. Mã
nguồn là hiện trạng; TSD là đích đến.

## Quy ước code

- **TypeScript ở khắp nơi.** Services là `.ts` biên dịch ra `dist/` CommonJS
  (KHÔNG phải ESM - giữ nguyên ngữ nghĩa `require()` và bảng tiền tố của
  backend-bundle). tsconfig khai `module`/`moduleResolution: node16` - vẫn ra
  CommonJS vì không package nào có `"type": "module"`; ĐỪNG quay về `"node"`
  (node10): TypeScript 7 đã gỡ nó và cổng `npm run typecheck:ts7` (CI) sẽ đỏ.
  `typescript` vẫn là 5.9 cho build/test/lint - TS 7 không có API JS mà Next,
  ts-jest, typescript-eslint cần; ĐỪNG cài TS 7 vào package.json (alias chiếm
  `.bin/tsc`). App là `.ts`/`.tsx`. `npm run typecheck` chạy cả hai. Đổi `.ts` mới nhớ thêm vào `references` của `tsconfig.json` gốc, thiếu là
  workspace đó **không được kiểm kiểu và không có gì báo lỗi**.
- **Service**: **không dấu chấm phẩy** (`.prettierrc.json` ghi đè `semi:false`
  cho `services/**/*.js`, `services/**/*.ts`, `packages/db/**`). App/package
  khác: **có** chấm phẩy, nháy đơn.
- **Backend dựng bằng `tsconfig.services.json`**, không phải `tsconfig.json`
  gốc: image Docker không COPY `apps/`, nên không có `@types/react` để dựng
  `packages/ui`.
- **DB**: chỉ qua `@tsudev/db`. Một database, một schema, bốn service dùng chung.
- **Trình duyệt KHÔNG gọi thẳng cổng service.** Mọi lời gọi qua route proxy
  `apps/*/pages/api/<domain>/[...path].js` (kể cả storage: `/api/storage/*`).
  Thêm endpoint ⇒ phải mở rộng proxy, nếu không CORS chặn.
- **Địa chỉ service lấy từ `apps/*/lib/services.js`**, đừng khai lại
  `process.env.X_SERVICE_URL || 'http://…'` trong file mới - `topology:check`
  sẽ bắt.
- **Điều hướng trong site dùng href tương đối** - tsudev chỉ còn MỘT origin.
  `MAIN_URL` của `@tsudev/ui` chỉ cho URL tuyệt đối thật sự cần (canonical, OG,
  mã nhúng huy hiệu).
- **Token giao diện: sửa `tokens/extensions.tsudev-web.json`, KHÔNG sửa
  `packages/ui/src/tokens.css`.** File CSS đó là ARTIFACT sinh ra bởi
  `npm run tokens:sync` từ HAI nguồn: bảng dùng chung
  `.standards/tokens/design-tokens.json` (chỉ-đọc, **bất khả xâm phạm**) ghép với
  khối riêng của web. Sửa tay artifact thì thay đổi sống ở local rồi biến mất ở
  lần sinh kế tiếp, im lặng; `npm run tokens:check` canh trong CI.
  ⚠️ **Repo này KHÔNG còn bản sao cục bộ của bảng dùng chung** (`tokens/design-tokens.json`
  và `tokens/tokens.css` đã xoá 26/08/2026, QU-STD-1). **Đừng dựng lại.** Bản sao
  đó ở lại v1.0.0 trong khi bộ quy ước đi tới v2.0.0 và **không cổng nào bắt
  được**, vì mỗi cổng chỉ đối chiếu bản sao với chính nó. Giá đã trả: bản chuẩn
  đổi tên `line-height.long-text` thành `long`, app viết `var(--lh-long)`, biến đó
  không tồn tại trong artifact ⇒ thân bài Markdown của blog và tài liệu chạy sai
  chiều cao dòng suốt nhiều tháng mà không gì đỏ lên. Cần token dùng chung khác đi
  thì mở đề xuất ở repo `tsudev-standards` theo `.standards/docs/SYNC.md`.
- **Giao diện có BA chế độ: Sáng (mặc định) · Ấm · Tối**, chọn bằng `data-theme`
  trên `<html>`. `:root` trần mang bảng Sáng, nên khách vãng lai luôn thấy Sáng.
  Bảng màu KHÔNG treo vào `prefers-color-scheme` - hai người mở cùng một đường
  link phải thấy cùng một trang. Ai muốn bám theo máy thì chọn "Theo hệ thống"
  trong nút đổi giao diện; lựa chọn đó được giải thành `data-theme` cụ thể bởi
  script đồng bộ trong `pages/_document.tsx`, TRƯỚC khi trang được vẽ. Việc hỏi
  cài đặt hệ điều hành chỉ được phép nằm trong JavaScript, có test canh.
  Thứ bậc bề mặt bằng độ sáng nền (`--bg-base` < `--bg-surface` < `--bg-subtle`);
  card có thêm viền hairline vì ở chế độ Sáng và Ấm hai tầng đó chênh nhau quá ít
  để mắt dựng ra cạnh. Đừng cắm cứng mã hex: `--on-primary`/`--on-status` đảo
  theo chế độ, mã hex thì không. Mọi cặp màu ở CẢ BA chế độ bị
  `packages/ui/test/contrast.test.ts` canh ở ngưỡng WCAG AA - đổi mã màu làm tụt
  tương phản là CI đỏ.
- **Ngày giờ hiển thị đi qua `apps/frontend-main/lib/format.ts`**
  (`DD/MM/YYYY`, `HH:mm DD/MM/YYYY`). Đừng gọi thẳng
  `toLocaleDateString('vi-VN')` - nó bỏ số 0 đầu nên 05/08/2026 in ra `5/8/2026`.
- Bản đồ tên token ↔ class Tailwind, và hai chỗ bảng màu chuẩn không đạt WCAG:
  `docs/design-system.md`.
- **`apps/*/.env.local` được sinh tự động** - sửa tay vô ích, lần chạy dev sau
  ghi đè. Sửa `.env` gốc.
- **Storybook 10 + Vite 8 trong `packages/ui`** (React 19 như app). **Storybook
  vẫn không nằm trong CI**, nên cấu hình hỏng không làm gì đỏ lên - cách kiểm: `npm --workspace packages/ui run storybook` rồi ĐẾM story vẽ
  ra được, đừng đọc "lệnh chạy xong" thành "chạy được" (`docs/design-system.md`
  §Storybook ghi bốn tầng hỏng im lặng đã gặp).
- **Gạch ngang: CHỈ dùng `-` (hyphen, U+002D)** ở mọi nơi - code, comment, chuỗi
  hiển thị, tài liệu, log, commit. **KHÔNG dùng em-dash `—` (U+2014)**: nó phá
  tính thống nhất của giao diện, khó gõ, và không nhất quán giữa các file. En-dash
  `-` (U+2013) chỉ chấp nhận cho khoảng số (`3-5`, `:4001-:4005`) nhưng nên ưu
  tiên `-`. Ngoại lệ DUY NHẤT: file migration đã áp dụng là BẤT BIẾN - không sửa
  kể cả em-dash trong comment (lệch checksum). Quy ước gốc: `AGENTS.md` §6.
- **Commit**: Conventional Commits.

## Gotcha cứng - đọc trước khi sửa vùng liên quan

- **Migration là BẤT BIẾN.** Sửa file migration đã áp dụng (kể cả comment) làm
  lệch checksum ⇒ `prisma migrate deploy` dừng ⇒ CI đỏ + production không boot.
  Tạo migration mới.
- **Đổi `schema.prisma` ⇒ bắt buộc `npm run db:generate`.** Quên là job "Build
  frontends" của CI đỏ dù không ai đụng frontend - nguyên nhân hay bị chẩn nhầm.
- **`requireRole()` (từ `@tsudev/auth`) đọc `User.role` trong DB và FAIL CLOSED.**
  Không còn biến môi trường nào tắt được nó. `role` là union `Role` nên gõ sai là
  lỗi biên dịch, không phải một cổng lặng lẽ cho qua.
- **Bản phát hành: chữ ký và sha256 của tệp R2 chỉ do MÁY CHỦ tạo.** Client gửi
  `signature`/`signingKid` ⇒ 400; khai sha256 cho tệp R2 ⇒ 400; tệp chưa niêm
  phong (`POST /api/admin/releases/:id/seal`) không công bố được. Đường tải là
  URL presign GET - bucket R2 KHÔNG mở đọc ẩn danh, `endpoint/bucket/key` trần
  trả 403 (bản đầu làm đúng điều đó, và test khi ấy khẳng định chính URL trần).
  `RELEASE_SIGNING_KEY` thiếu ở production ⇒ backend từ chối khởi động (cố ý).
  Xoay khoá: chuyển khoá cũ vào `RELEASE_SIGNING_KEYS_RETIRED` TRƯỚC. Tên cũ
  `TRUST_SIGNING_*` không còn được đọc. Chi tiết: `docs/release-signing.md`.
- **Bucket R2 production cần CORS cho PUT từ trình duyệt** -
  `npm run r2:cors` (`infrastructure/r2/`). `ensureBucket()` của storage-service
  KHÔNG đặt được nó trên R2 (khoá S3 thiếu quyền) và chỉ để lại một dòng warn.
- **`packages/trust-crypto/pkg/trust_crypto.wasm` là artifact ĐƯỢC COMMIT.**
  Render dựng image Docker từ git và image không có Rust, nên không thể dựng lúc
  phát hành. Sửa `src/lib.rs` ⇒ chạy
  `npm --workspace packages/trust-crypto run build:wasm` rồi **commit lại
  `.wasm`**; quên là job "WASM" của CI đỏ vì artifact không khớp nguồn.
  Cần Rust ở máy dev (`rustup`, target `wasm32-unknown-unknown`) - chỉ để sửa
  mảnh đó, mọi thứ còn lại không cần.
- **`REQUIRE_ROLE_ENFORCEMENT` ĐÃ BỊ GỠ. Đừng đặt lại.** Nó từng gác một nhánh
  đọc vai trò từ claim của nhà cung cấp danh tính ngoài thời trước - nhánh chưa
  bao giờ chạy ở production vì bên đó không phát claim vai trò nào. Cờ mặc định tắt nên 4 route trông như được bảo vệ mà
  mở toang; bật lên thì chúng 403 vĩnh viễn (một trong bốn là `GET /api/posts`,
  đường đọc blog công khai). `.env.production.example` từng khuyến nghị đúng giá
  trị nguy hiểm đó.
  Phân quyền nay chỉ có MỘT nguồn: cột `User.role` trong DB, qua `@tsudev/auth`.
  Claim `role` trong khẳng định danh tính CHỈ ĐỂ THAM KHẢO và không nâng được
  quyền - có test canh. Đừng dựng lại hệ thứ hai chạy song song.
- **`INTERNAL_API_TOKEN` gác `/api` của content/storage/identity** khi được đặt
  (không đặt = no-op). JWKS phát hành (`/.well-known/...`) nằm ngoài `/api`.
- **`INTERNAL_IDENTITY_SECRET` phải GIỐNG NHAU ở Cloudflare Workers và Render.**
  BFF ký khẳng định danh tính bằng nó, service kiểm bằng nó. Lệch nhau ⇒ mọi
  đường ghi đã xác thực trả 401, và triệu chứng là "đăng nhập rồi mà vẫn 401" -
  đúng lỗi mà cơ chế này ra đời để chấm dứt. Thiếu hẳn ⇒ service trả 503 kèm log
  nói rõ lý do, cố ý ồn ào.
- **`TOTP_ENCRYPTION_KEY` đổi = MỌI thiết bị 2FA đang dùng hỏng.** Bí mật TOTP
  không băm được (kiểm mã cần chính giá trị đó) nên nó được mã hoá bằng khoá
  này. Sao lưu cùng chỗ với `RELEASE_SIGNING_KEY`.
- **auth-service là service DUY NHẤT đọc `User.passwordHash`.** Nó tách riêng vì
  `frontend-main` chạy trên Cloudflare Workers - không có kết nối Postgres, không
  nạp được native module, nên Argon2id KHÔNG THỂ chạy ở tầng biên. Đừng "tối ưu"
  bằng cách đưa việc kiểm mật khẩu lên đó.

- **Docker build context phải là gốc repo** - service phụ thuộc package nội bộ
  không có trên npm registry.
- **`S3_ENDPOINT` và `S3_PUBLIC_ENDPOINT` khác nhau Ở DEV, TRÙNG NHAU ở
  production.** `S3_PUBLIC_ENDPOINT` chỉ phục vụ một việc: làm endpoint **ký URL
  presign**. Ở dev phải tách vì `S3_ENDPOINT` trỏ `minio:9000` trong mạng docker,
  trình duyệt không với tới. Ở production dùng R2 thì endpoint S3 API của R2 vốn
  đã công khai, nên cả hai cùng một giá trị. **Đừng đặt thành `cdn.tsudev.com`** -
  tên miền tuỳ chỉnh R2 không cài đặt giao thức chữ ký S3 (URL presign bị từ
  chối) và còn làm bucket thành công khai.
- **Xác thực nằm ở MỘT chỗ: `packages/auth`.** Ba bản `authMiddleware.js` gần
  trùng nhau đã bị gộp; ba bản tra-cứu-người-dùng (`resolveUser`, `actingUser`,
  `currentUser`) cũng vậy - và hai bản cục bộ chính là hai nơi phép so sánh
  `sessionVersion` bị bỏ sót, nên thu hồi phiên không có tác dụng ở đó. Đừng
  dựng lại bản cục bộ trong service.
- **Thang vai trò: `GUEST<MEMBER<VIP<AUTHOR<MODERATOR<ADMIN<OWNER`** (rank ở
  `packages/types`). AUTHOR = tài khoản đăng bài (đặc quyền tối thiểu). `VIP`
  là vé vào Con dấu đã gỡ: còn trong enum (Postgres không `DROP VALUE`) nhưng
  KHÔNG cấp được nữa. **OWNER là trần,
  chỉ tài khoản `tsudev` giữ, và CẤP DUY NHẤT bằng seed/DB - không endpoint nào
  cấp được.** Đổi thang này nhớ chạy `db:generate` (enum Prisma) và thêm migration.
- **MỘT đường nâng vai trò bằng dữ liệu: trang quản lý tài khoản**
  (`/api/identity/useradmin/*`, gác `requireOwner`) - chỉ OWNER, cấp tối đa
  ADMIN. `ASSIGNABLE_ROLES` = MEMBER · AUTHOR · MODERATOR · ADMIN: CỐ Ý bỏ
  OWNER/GUEST (để dữ liệu nói được bậc cao nhất là ai ghi bảng role cũng tự cấp
  OWNER) và VIP. Bề mặt này khớp BỐN chỗ trong một commit: route auth-service +
  `ASSIGNABLE_ROLES`, `ALLOWED` của proxy `pages/api/account/[...path].ts`,
  `test/useradmin.test.ts`, và `pages/admin/accounts.tsx`. (Mã mời → VIP đã gỡ
  cùng Con dấu.) `TrustAuditLog` GIỮ dù mang tên Con dấu: nó là nhật ký useradmin.
- **`token.role` của next-auth CHỈ được ghi ở lần đăng nhập ĐẦU TIÊN.** Mọi thứ
  đổi `User.role` giữa chừng (OWNER đổi ở `/admin/accounts`, sửa tay trong DB) sẽ đúng ở tầng service
  mà SAI ở phiên trình duyệt cho tới lần đăng nhập sau - giao diện lọc theo
  `session.role` vì thế hiện vai trò cũ, và triệu chứng là "làm xong mà không
  thấy gì đổi". Đường sửa đã có: `POST /api/identity/session-state` + nhánh
  `trigger === 'update'` ở callback `jwt`, đọc lại vai trò TỪ DB. Client gọi
  `update()` của `useSession`. **Đừng lấy vai trò từ tham số truyền vào
  `update()`** - đó là dữ liệu người dùng.
- **`main` CÓ branch protection** (từ 05/11/2026): 13 check bắt buộc + `strict`
  - mỗi PR phải cập nhật theo `main` rồi chạy lại CI trước khi merge
  (`gh pr update-branch <số>`). `.husky/pre-push` chặn sớm hơn ở máy (và chạy
  `topology:check` trên CẢ tệp chưa theo dõi - tệp nháp có cổng cứng chặn push).
- **`backend-bundle` điều phối theo BẢNG TIỀN TỐ đường dẫn**, không mount chồng
  ba app. Mount thẳng thì request của app này đi vào app kia trước và dính cổng
  chặn `INTERNAL_API_TOKEN` của nó ⇒ route công khai (thời Con dấu: huy hiệu,
  JWKS) trả 401, **không có gì báo lỗi**. `/.well-known` nay thuộc content. Thêm route có tiền tố chưa
  nằm trong bảng ⇒ route đó **404 ở production** dù chạy service riêng vẫn sống.
  Sửa route thì sửa bảng trong `services/backend-bundle/src/index.ts`.
- **`/api` của content-service dùng XÁC THỰC TUỲ CHỌN, không phải chặn cứng.**
  Blog/tài liệu/dự án là nội dung công khai và BFF gọi SSR không mang Bearer
  token. Chặn cứng từng làm production **trống trơn** - `lib/api.js` nuốt 401
  thành `[]` nên triệu chứng là trang trống, không phải trang lỗi, và local
  không lộ ra vì `.env` bật `AUTH_DEV_BYPASS`. Đường ghi an toàn vì nằm dưới
  `/api/admin` và tự gọi `requireAdmin()` (đọc vai trò từ DB, fail closed).
  Thêm route ghi mới thì phải theo khuôn đó, đừng dựa vào middleware.
- **`.env.local` THẮNG `.env.production` trong Next - đã từng thành lỗ hổng.**
  `apps/*/.env.local` là bản sao nguyên văn `.env` gốc, và lệnh deploy chạy trên
  máy dev. Ngày 16/08/2026 bản production đã mang theo một cờ bỏ qua xác thực:
  **ai cũng đăng nhập được vào tài khoản ADMIN bằng `devpass`**, site vẫn chạy
  bình thường, không có gì báo lỗi. Provider đó nay đã bị gỡ, nhưng LỖ HỔNG
  KHÔNG PHẢI LÀ NÓ: lỗ hổng là việc giá trị dev đi được vào bản dựng production,
  và biến dev tiếp theo sẽ mang tên khác. Vì thế deploy đi qua
  `scripts/deploy-frontend.js` - nó **dời `.env.local` ra khỏi đường lúc dựng**.
  Đừng gọi thẳng `opennextjs-cloudflare deploy`. Nghiệm thu mỗi lần:
  `curl -s https://tsudev.com/api/auth/providers` phải CHỈ liệt kê provider đã
  cấu hình thật.
- **(cũ, vẫn đúng)** `NEXT_PUBLIC_*` được nội
  suy lúc build; `apps/*/.env.local` sinh tự động mỗi lần chạy dev và trỏ về
  `tsudev.localhost`; lệnh deploy chạy trên máy dev. Vì vậy `deploy`/`preview`/
  `upload` truyền biến thẳng vào shell qua `scripts/topology/prod-url.js` -
  biến shell thì Next không ghi đè. Bỏ đoạn đó là canonical, ảnh OG và
  `sitemap.xml` của production mang URL dev, **không có gì báo lỗi**.
- **7 trang đọc công khai là ISR, KHÔNG phải SSR** (`/`, `/blog`, `/docs`,
  `/projects` + 3 trang slug): `getStaticProps` + `revalidate` 300s, cache trong
  R2 (`NEXT_INC_CACHE_R2_BUCKET`). Lỗi upstream lúc chạy ⇒ `keepStaleOnFailure()`
  NÉM để Next giữ bản cache tốt (trả `failed:true` thì Next cache luôn trang lỗi).
  `test/isrPages.test.ts` canh; đừng đưa trang per-user (`/search`, `/admin/*`)
  vào danh sách. Đã đo khi tắt backend: trang đã cache vẫn 200 đủ nội dung; slug
  CHƯA từng vào cache thì 503 + `Retry-After` qua `pages/_error.tsx` (mã lỗi
  `UPSTREAM_UNAVAILABLE`; đừng thêm `pages/500.tsx` - nó nuốt mã 503). Mỗi
  deploy đẩy lên R2 bản dựng lúc build (rỗng - máy build không có token prod):
  nó dựng lại sau 1s và `useRecoverBuildPlaceholder` tự nạp lại dữ liệu ở trình
  duyệt; vẫn đo lại sau 1 phút trước khi kết luận. `failed: true` trong props
  CHỈ có thể đến từ bản build - lúc chạy, lỗi luôn được NÉM.
- **IP người gọi ở BFF: chỉ qua `lib/clientIp.ts` (`CF-Connecting-IP`).** Phần tử
  đầu của `X-Forwarded-For` do NGƯỜI GỬI đặt được trên Cloudflare - đọc nó là
  cho kẻ tấn công vượt giới hạn đăng nhập theo IP (vá 05/11/2026, test quét nguồn).
- **Kế hoạch an toàn thông tin: `docs/security-plan.md`** - 12 khoảng trống đo
  được + Trung tâm an ninh phát hành. Phụ thuộc production phải giữ 0 High/Critical
  (`npm audit --omit=dev`); ĐỪNG `npm audit fix --omit=dev` - nó gỡ devDependencies
  (kể cả OpenNext) khỏi node_modules.
- **`wrangler logout && login` KHÔNG đổi tài khoản lệnh kế tiếp dùng** nếu còn
  `node_modules/.cache/wrangler/wrangler-account.json` (ở gốc VÀ ở
  `apps/frontend-main/`) - tệp đó ghim Account ID. Xoá cả hai. `wrangler whoami`
  không lộ chuyện này. Ngày 04/11/2026 một lần deploy rơi vào tài khoản sai đúng
  theo đường đó (Worker + bucket rác ở tài khoản `dieuhanhcongviecxanuicam`).
- **Thứ tự phát hành migration: `db:migrate` lên Neon TRƯỚC, merge SAU.** Backend
  có `migrationGate` thoát 1 khi DB thiếu migration ⇒ cả site trống (sự cố 05/11:
  #93 merge mà chưa migrate). Migration có DROP thì `pg_dump` trước nữa - Neon
  chạy Postgres 18, `pg_dump` 16 từ chối: `/usr/lib/postgresql/18/bin/pg_dump`.
- **Xoá một service/thư mục ⇒ liệt kê test nằm TRONG nó mà canh thứ NGOÀI nó.**
  `cronContract.test.ts` (canh lịch cron giữ Neon ngủ) sống trong newsroom-service
  và bị xoá theo ở #99 dù chú thích dặn chuyển đi; CI xanh vì cổng bị xoá thì không
  đỏ. Khôi phục 05/11/2026 ở `apps/frontend-main/test/`.
- **Hook dữ liệu ở frontend: `lib/useLoader.ts`**, không `useEffect(() => { load() })`
  - eslint-plugin-react-hooks 7 cấm mẫu đó (`set-state-in-effect`). Hàm nạp nhận
  `AbortSignal`, kiểm `signal?.aborted` sau mỗi `await`. Đồng bộ state theo prop
  thì chỉnh trong render (so với lần trước), không trong effect.
- **Tailwind 4: dòng `@layer theme, base, components, utilities;` ở đầu
  `styles/globals.css` là chốt** - bỏ hoặc đặt sau `@import tokens.css` thì mọi
  `rounded-*`/`shadow-*` mất giá trị (biến `@theme` cùng tên token tự tham chiếu),
  không lỗi nào báo. Cấu hình token ↔ class nay ở khối `@theme`, không còn
  `tailwind.config.js`.
- `.prettierignore` cố ý bỏ qua `documents-tsudev.md` và `CLAUDE.md` - prettier
  đánh số lại danh sách và escape ký tự trong hai file này. Đừng gỡ ra.

## Nhiều agent song song

8 agent chuyên trách định nghĩa ở `.claude/agents/`, sở hữu các vùng đường dẫn
tách rời. Bảng phân vai, thứ tự thay đổi xuyên vùng và giao thức: **`AGENTS.md`**.
Cần đổi file thuộc vùng agent khác ⇒ mô tả và báo lại, đừng tự sửa.

## Kỷ luật token (BẮT BUỘC)

1. **Định vị trước, đọc sau.** `grep -n` tìm dòng → `sed -n 'X,Yp'` đọc đúng
   đoạn. `content-service/src/index.js` hơn 1000 dòng.
2. **Đọc theo bảng định tuyến** ở mục Tài liệu, không nạp cả `docs/`. Mỗi file
   thừa được trả tiền ở **mọi** lượt còn lại của phiên.
3. **Không bao giờ đọc**: `node_modules/`, `.git/`, `.next/`, `dist/`, `build/`,
   `coverage/`, `package-lock.json`, file nhị phân.
4. **Gộp lượt**: nhiều lệnh độc lập ⇒ một lượt nhiều tool call.
5. Đừng đọc lại file vừa sửa để kiểm tra; đừng tóm tắt lại ở mỗi lượt; chạy cổng
   kiểm tra một lần ở cuối cụm thay đổi.
6. Dùng **Standard cho mọi tác vụ** - không tự bật/gợi ý `/fast`.
7. Phiên dài thì đóng terminal, mở phiên mới. Ngữ cảnh cũ là chi phí chết.

**Xin xác nhận trước khi `git push` hoặc deploy.** Chỉ commit/push khi được yêu cầu.
