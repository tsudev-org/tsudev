# Kiểm thử

## Test đơn vị (service)

Mỗi service tự chạy test của mình - **không** có lệnh test ở gốc repo.

```bash
node scripts/with-env.js npm --workspace services/content-service test
node scripts/with-env.js npm --workspace services/storage-service test
node scripts/with-env.js npm --workspace services/auth-service test
node scripts/with-env.js npm --workspace services/backend-bundle test
node scripts/with-env.js npm --workspace apps/frontend-main test
```

`with-env.js` nạp `.env` gốc (cần `DATABASE_URL` của Postgres local cổng 5433 -
phần lớn test service là test TÍCH HỢP chạm DB thật). Tệp test TypeScript phải có
`export {}`, nếu không các biến top-level của nhiều tệp đụng tên nhau (TS2451).

Vài bộ canh đáng biết:

| File                                          | Giữ hợp đồng gì                                                       |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `content-service/test/projectRelease.test.ts` | đường ghi bản phát hành, niêm phong sha256, chữ ký, đường tải presign |
| `content-service/test/releaseSigning.test.ts` | vòng khoá Ed25519, xoay khoá, tên biến `RELEASE_SIGNING_*`            |
| `content-service/test/authorDocs.test.ts`     | đường ghi tài liệu của AUTHOR                                         |
| `content-service/test/softDelete.test.ts`     | trigger chặn DELETE cứng                                              |
| `auth-service/test/useradmin.test.ts`         | trần cấp vai trò (`ASSIGNABLE_ROLES`)                                 |
| `backend-bundle/test/routing.test.ts`         | bảng tiền tố của tiến trình gộp - thiếu tiền tố là 404 ở production   |
| `apps/frontend-main/test/isrPages.test.ts`    | 7 trang đọc là ISR, lỗi lúc chạy GIỮ bản cache                        |

Dọn dữ liệu test: DELETE cứng bị trigger chặn - dùng
`SET LOCAL tsudev.allow_hard_delete = 'on'` trong cùng transaction.

Mỗi service export `app` và `startServer` riêng để test `supertest` được mà
không phải mở cổng.

## Test đầu-cuối (Playwright)

```bash
npm --prefix e2e install
npx playwright install --with-deps chromium   # lần đầu
npm --prefix e2e test
```

URL lấy từ `config/topology.json` - không đặt tay. Playwright **tự dựng** hai
frontend và `dev-proxy` (mục `webServer`), nên không cần chạy `npm run dev:local`
trước; đang chạy sẵn thì nó dùng lại.

Hai project, tách theo thứ chúng cần:

| Lệnh                  | Project   | Cần gì               | Ở CI |
| --------------------- | --------- | -------------------- | ---- |
| `npm run e2e:session` | `session` | hai frontend + proxy | ✅   |
| `npm run e2e`         | cả hai    | + MinIO              | ❌   |

`session` là lưới an toàn của việc tái cấu trúc cổng/tên miền: đăng nhập ở main,
bấm link điều hướng, phải sang đúng trang và **còn phiên**. Bản không cần trình
duyệt: `node scripts/check-session-sharing.js`.

Kịch bản duy nhất hiện có: `e2e/tests/sso-upload.spec.js` - đăng nhập, presign,
upload.

## Presign + upload: hai đường và cách chọn

PUT thẳng từ trình duyệt lên MinIO bằng URL presign **hay hỏng** khi host của
trình duyệt và host trong container khác nhau: chữ ký được ký cho một hostname,
trình duyệt lại phân giải sang hostname khác.

| Đường                | Cách đi                                              | Dùng khi            |
| -------------------- | ---------------------------------------------------- | ------------------- |
| Trực tiếp (thật)     | client xin `/api/presign` → PUT thẳng lên S3/R2      | production          |
| Dự phòng phía server | client xin `/api/presign` → POST `/api/upload?key=…` | CI, máy dev, Docker |

`E2E_FORCE_FALLBACK=1` ép dùng đường dự phòng. Compose đặt sẵn `=1` cho
`e2e-runner`. Đây là mặc định của CI vì nó chạy ổn ở mọi môi trường.

Muốn nghiệm thu đường trực tiếp thì chạy runner **bên trong** mạng compose với
`E2E_FORCE_FALLBACK=0`, khi đó tên host giữa các container mới khớp:

```bash
docker compose up -d minio postgres redis content-service \
                     storage-service frontend-main
docker compose build e2e-runner
docker compose run --rm -e E2E_FORCE_FALLBACK=0 e2e-runner
```

Mã liên quan: `e2e/tests/upload.spec.js` (project `full-stack`), và
`services/storage-service/src/index.js` (`/api/presign`, `/api/upload`).

## Cổng CI

`.github/workflows/ci.yml` chạy ba job trên mọi PR và trên push vào
`main` / `feat/**`:

1. **Lint & format** - `npm run format:check` + `npm run lint`.
2. **Migrate & test services** - dựng Postgres 16, `db:generate`, `db:migrate`
   (`prisma migrate deploy`), rồi test cả ba service.
3. **Build frontends** - `db:generate` rồi build cả hai app Next.

Ba lỗi CI hay gặp và nguyên nhân thật:

- **Job build đỏ mà không đụng gì tới frontend** → đổi `schema.prisma` mà quên
  `npm run db:generate`, client Prisma sinh ra không khớp.
- **Job test đỏ ngay bước migrate** → đã sửa một file migration cũ. Migration đã
  áp dụng là bất biến; tạo migration mới thay vì sửa file cũ.
- **`format:check` đỏ mà máy mình sạch** → file nằm trong `.prettierignore` ở
  máy nhưng CI vẫn kiểm phần khác, hoặc quên chạy `npm run format`.

E2E chia làm hai project, và chỉ MỘT trong hai chạy trong CI:

| Project      | Tệp              | Cần gì               | Trong CI           |
| ------------ | ---------------- | -------------------- | ------------------ |
| `app`        | `smoke.spec.js`  | Postgres + 3 service | ✅ (job `e2e-app`) |
| `full-stack` | `upload.spec.js` | thêm MinIO           | ❌ chạy tay        |

Thêm tệp spec mới thì phải khai vào `testMatch` của một project - Playwright
**không** tự nhặt. Quên là spec đó im lặng không bao giờ chạy, và triệu chứng
duy nhất là số test không tăng.

Chạy `full-stack` bằng tay trước khi đụng vào luồng upload.
