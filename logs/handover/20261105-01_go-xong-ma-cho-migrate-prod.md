# PHIẾU BÀN GIAO - Gỡ xong phần MÃ của Toà soạn + Con dấu; chờ migrate prod

- **Mã phiếu**: 20261105-01
- **Từ**: phiên 32 - **Đến**: chủ dự án / phiên 33
- **Thời điểm**: 05/11/2026
- **Trạng thái**: MỞ - §1, §3, §4 (1, 2), §4b ĐÃ XONG 05/11; còn việc §5 (2-4) của agent
- **Thay phiếu**: [`20261029-01`](20261029-01_bo-con-dau-va-24-24.md) - các việc §4.0, §8.3, C1, C2, B1, B2, B3 của phiếu đó đã XONG

## 1. ✅ ĐÃ XONG 05/11/2026: tsudev.com treo - thiếu migration trên Neon

Xác nhận: chủ dự án chạy `db:migrate` từ `main`, áp đúng một migration
`20261028140000_project_release` ⇒ backend sống lại, `prod:dem-noi-dung` ĐẠT.
Sau đó Manual Deploy bản `main` trên Render: `/health` liệt kê
`content, storage, identity`; JWKS phát hành 200 (kid `tsu-2026-08-efdb94`, đúng
khoá cũ); `/api/trust/*`, `/api/newsroom/*` 404. Ngay sau khi Render chuyển bản,
`prod:dem-noi-dung` TRƯỢT một lượt (503/500) rồi tự ĐẠT ở lượt đo kế tiếp - đó là
khoảnh khắc chuyển bản, đừng chẩn đoán từ một lượt đo duy nhất.
Chủ dự án báo đã cập nhật `DATABASE_URL` trên Render (sau khi chuỗi cũ lộ trong log phiên).

Nội dung gốc của mục (giữ để tra):

Đo 04-05/11/2026: `https://tsudev-backend.onrender.com/health` treo quá 150 giây,
mọi trang có dữ liệu treo; tài nguyên tĩnh (`/favicon.ico`) vẫn 200; Worker
`/dem` trả rỗng.

Nguyên nhân SUY RA (chưa xác nhận trong log Render): PR #93 đã merge ngày
30/10 trong khi migration `20261028140000_project_release` CHƯA áp lên Neon -
đúng thứ phiếu `20261029-01` §3 cảnh báo. Đầu tháng 11 Neon mở lại compute,
nên lần khởi động kế tiếp `migrationGate` đọc được `_prisma_migrations`, thấy
lệch và `exit(1)`. Agent không có `DATABASE_URL` prod nên không tự chữa được.

```
# từ nhánh main (KHÔNG chứa migration DROP của #101):
DATABASE_URL=<prod> npm run db:migrate
DATABASE_URL=<prod> npx prisma migrate status --schema packages/db/prisma/schema.prisma   # "up to date"
# rồi Render → tsudev-backend → Manual Deploy (hoặc chờ nó tự thức)
npm run prod:dem-noi-dung        # phải XANH
```

Nếu sau bước này `/health` vẫn treo: mở log Render, đừng đoán tiếp.

## 2. Đã LIVE trên `main` trong phiên 32 (CI xanh 7/7 mỗi PR)

| PR   | việc                                                                 |
| ---- | -------------------------------------------------------------------- |
| #97  | CI `main` xanh lại: em-dash + 3 file test thiếu `export {}` (TS2451) |
| #98  | §8.3 - `/api/author/docs` + thẻ "Tài liệu" ở `/author` (7 test)      |
| #99  | §8 C1+C2 - gỡ Toà soạn Agent AI (~6.600 dòng), KHÔNG migration       |
| #102 | §7 B1+B2+B3 - gỡ Con dấu (~7.900 dòng), KHÔNG migration              |

Điểm cần nhớ của #102:

- **Vòng khoá Ed25519 không chết, nó đổi vai** (§7.3): `services/content-service/src/releaseSigning.ts`
  ký bản phát hành, JWKS ở `/.well-known/tsudev-release-jwks.json` (bảng tiền tố
  bundle: `/.well-known` nay thuộc content).
- **Đổi tên biến HAI ĐỢT** (§7.6): mã đọc `RELEASE_SIGNING_*` trước, lùi về
  `TRUST_SIGNING_*`. Production đang có tên cũ nên vẫn khởi động được.
- **`TrustAuditLog` GIỮ** - auth-service dùng làm nhật ký useradmin.
- **VIP** gỡ khỏi `ASSIGNABLE_ROLES` (vẫn trong enum). Seed dev: `bob` nay là AUTHOR.
- Trang chủ đổi định vị: phát hành app + tải về an toàn (SHA-256 + Ed25519).

## 3. Hai PR CHỜ

✅ 05/11/2026: CẢ HAI ĐÃ XONG. #101 merge sau khi chủ dự án `pg_dump` (bản 18 -
Neon chạy Postgres 18, `pg_dump` 16 từ chối) ra `~/tsudev-backups/truoc-drop-20261105.dump`
(3,3 MB, 34 bảng dữ liệu) rồi `db:migrate` từ nhánh #101. Render tự deploy;
`prod:dem-noi-dung` ĐẠT, 4 trang dự án 200, JWKS 200. Giữ bản dump tới khi chắc
không cần khôi phục gì từ 17 bảng đã DROP.

Dự án `tsudev-trust-seal` trên production vẫn tồn tại (dữ liệu prod, không phải
seed) và mô tả tính năng đã gỡ - chủ dự án sửa/ẩn qua `/admin/projects`.

| PR   | trạng thái                             | điều kiện merge                                                                   |
| ---- | -------------------------------------- | --------------------------------------------------------------------------------- |
| #101 | DRAFT - migration DROP C3+B4           | `pg_dump` prod → `db:migrate` TỪ NHÁNH #101 → `migrate status` up to date → merge |
| #103 | ĐÃ MERGE 05/11 - cache ở biên (ISR+R2) | CHƯA LIVE - xem §4b (deploy sai tài khoản Cloudflare)                             |

🔴 #101 là migration DROP đầu tiên: 17 bảng, 12 enum, `Project.trustProgramSlug`.
Merge trước khi migrate ⇒ `migrationGate` exit(1) ⇒ site sập (đúng sự cố đang diễn ra).

## 4. Việc tay trên dashboard Render (agent không có quyền)

✅ 05/11: mục 1 và 2 đã làm (chủ dự án báo đã xoá cả `TRUST_SIGNING_*` - tức đợt 2
phía Render cũng xong; JWKS vẫn ra đúng kid cũ nên `RELEASE_SIGNING_*` đã có giá trị).
Còn: gỡ nhánh lùi `TRUST_SIGNING_*` trong `signingEnv()` và đặt `TELEGRAM_*`.

1. Chép `TRUST_SIGNING_KEY` → `RELEASE_SIGNING_KEY`, `TRUST_SIGNING_KEY_ID` → `RELEASE_SIGNING_KEY_ID`.
2. Xoá: `NEWSROOM_*` · `CF_ACCOUNT_ID` · `CF_AI_TOKEN` · `GEMINI_API_KEY` ·
   `TRUST_RECHECK_*` · `TRUST_ISSUER`. Gỡ khỏi blueprint KHÔNG xoá chúng.
3. Đợt 2 của đổi tên (sau khi 1 đã chạy ổn): xoá `TRUST_SIGNING_*`, rồi gỡ nhánh
   lùi `signingEnv()` trong `releaseSigning.ts`.
4. Đặt `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` (nửa Render của báo động - còn treo từ phiên 31).

## 4b. ✅ ĐÃ XỬ LÝ 05/11: Deploy frontend - wrangler SAI tài khoản Cloudflare

Deploy lại thành công 05/11/2026 (Version `201e41a4`) ở tài khoản `dev.nguyentrangtinhsu`
(`9541f44e...`), bucket `tsudev-next-cache` tạo đúng tài khoản. Nghiệm thu: provider
chỉ có Mật khẩu/Passkey/GitHub/Google; JWKS phát hành 200 qua tsudev.com; `/trust`,
`/admin/newsroom` 404; `/blog?tag=` 307 sang `/search`; `x-nextjs-cache: HIT/STALE`.

🔴 **Nguyên nhân THẬT không phải lần đăng nhập**: `wrangler logout && login` KHÔNG
xoá `node_modules/.cache/wrangler/wrangler-account.json` (có ở gốc VÀ ở
`apps/frontend-main/`). Tệp đó ghim Account ID cũ, nên sau khi đăng nhập đúng,
wrangler vẫn gọi API vào tài khoản cũ (`Authentication error [code: 10000]`).
Xoá cả hai tệp là hết. `wrangler whoami` KHÔNG lộ ra chuyện này - nó in tài khoản
của token, không phải tài khoản mà lệnh kế tiếp sẽ dùng.

⚠️ Ngay sau deploy, các trang ISR phục vụ bản dựng lúc BUILD (máy build không có
token nội bộ production ⇒ dữ liệu rỗng, `revalidate` 30 giây). Trong khoảng 30
giây đầu đó `prod:dem-noi-dung` TRƯỢT `/blog` `/docs`; lượt dựng lại tiếp theo có
đủ 50 bài/50 tài liệu. Đo lại sau 1 phút trước khi kết luận.

Rác ở tài khoản SAI vẫn còn, chủ dự án tự xoá (mục gốc bên dưới).

Nội dung gốc của mục:

#103 đã merge (05/11/2026), nhưng `npm --workspace apps/frontend-main run deploy`
dừng ở bước gắn route: `Could not find zone for tsudev.com`. Wrangler trên máy
này đang ở tài khoản `dieuhanhcongviecxanuicam@gmail.com` (Account
`098cc7413caf44c89e5c837e182c0bbc`), KHÔNG phải tài khoản sở hữu zone
`tsudev.com` (cùng tài khoản với Worker cron `*.dev-nguyentrangtinhsu.workers.dev`).
Bản Worker đang phục vụ tsudev.com vì thế VẪN là bản 29/10 (`004a682e`).

Rác do lần deploy hỏng để lại ở tài khoản SAI - cần chủ dự án xoá (agent bị chặn
xoá, đúng mực):

- Worker `tsudev` (một bản triển khai duy nhất, 19:33 UTC 04/11/2026):
  `npx wrangler delete --name tsudev`
- Bucket R2 `tsudev-next-cache` (5 mục cache): xoá các object rồi
  `npx wrangler r2 bucket delete tsudev-next-cache`

Để deploy đúng:

```
npx wrangler logout && npx wrangler login      # chọn tài khoản sở hữu tsudev.com
npx wrangler whoami                            # đối chiếu Account ID
npx wrangler r2 bucket create tsudev-next-cache
npm --workspace apps/frontend-main run deploy
curl -s https://tsudev.com/api/auth/providers  # chỉ provider thật
```

👉 Bài học: trước MỌI lệnh `wrangler deploy` hay tạo tài nguyên, chạy
`wrangler whoami` và đối chiếu với tài khoản sở hữu zone.

## 5. Việc kế tiếp của agent

1. Sau khi §1 và §4b xong: **deploy frontend** `npm --workspace apps/frontend-main run deploy`
   rồi nghiệm thu §6.5 - mở trang khi backend đang ngủ/chặn, nội dung phải còn.
2. Sau khi #101 merge: `docs/` + `CLAUDE.md` gỡ các gotcha về trust-service,
   mã mời, newsroom (đã lỗi thời). CLAUDE.md cố ý CHƯA sửa trong phiên 32.
3. `infrastructure/newsroom-cron` đổi tên (việc dọn, §8.5) - nhớ: gỡ khỏi repo
   không xoá Worker đang chạy trên Cloudflare.
4. §6.6: tải tệp phát hành lên R2 từ trang quản trị + tự tính sha256 + ký bằng
   `releaseSigning.sign()`.

## 6. Bẫy gặp trong phiên 32

- **Merge PR với `--delete-branch` ĐÓNG mọi PR xếp chồng lên nhánh đó** (#100 bị
  đóng khi merge #99). Đổi base của PR con sang `main` TRƯỚC khi merge PR cha.
- Máy này chưa có danh tính git toàn cục; đã đặt cấp repo `Dev Tsu <dev.nguyentrangtinhsu@gmail.com>`.
- `gh` phải ở tài khoản `tsudev-tsudev` (`dieuhanhcongviecxanuicam` chỉ đọc).
