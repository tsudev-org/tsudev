# PHIẾU BÀN GIAO - Gỡ xong phần MÃ của Toà soạn + Con dấu; chờ migrate prod

- **Mã phiếu**: 20261105-01
- **Từ**: phiên 32 - **Đến**: chủ dự án / phiên 33
- **Thời điểm**: 05/11/2026
- **Trạng thái**: MỞ - **một việc chặn cần chủ dự án** (§1), hai PR chờ (§3)
- **Thay phiếu**: [`20261029-01`](20261029-01_bo-con-dau-va-24-24.md) - các việc §4.0, §8.3, C1, C2, B1, B2, B3 của phiếu đó đã XONG

## 1. 🔴 VIỆC CHẶN: tsudev.com đang treo - cần `DATABASE_URL` prod

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

| PR   | trạng thái                     | điều kiện merge                                                                   |
| ---- | ------------------------------ | --------------------------------------------------------------------------------- |
| #101 | DRAFT - migration DROP C3+B4   | `pg_dump` prod → `db:migrate` TỪ NHÁNH #101 → `migrate status` up to date → merge |
| #103 | §6.2-6.4 cache ở biên (ISR+R2) | CI xanh. Bucket `tsudev-next-cache` ĐÃ TẠO. Build OpenNext local xanh, 7 trang ●  |

🔴 #101 là migration DROP đầu tiên: 17 bảng, 12 enum, `Project.trustProgramSlug`.
Merge trước khi migrate ⇒ `migrationGate` exit(1) ⇒ site sập (đúng sự cố đang diễn ra).

## 4. Việc tay trên dashboard Render (agent không có quyền)

1. Chép `TRUST_SIGNING_KEY` → `RELEASE_SIGNING_KEY`, `TRUST_SIGNING_KEY_ID` → `RELEASE_SIGNING_KEY_ID`.
2. Xoá: `NEWSROOM_*` · `CF_ACCOUNT_ID` · `CF_AI_TOKEN` · `GEMINI_API_KEY` ·
   `TRUST_RECHECK_*` · `TRUST_ISSUER`. Gỡ khỏi blueprint KHÔNG xoá chúng.
3. Đợt 2 của đổi tên (sau khi 1 đã chạy ổn): xoá `TRUST_SIGNING_*`, rồi gỡ nhánh
   lùi `signingEnv()` trong `releaseSigning.ts`.
4. Đặt `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` (nửa Render của báo động - còn treo từ phiên 31).

## 5. Việc kế tiếp của agent

1. Sau khi §1 xong và #103 merge: **deploy frontend** `npm --workspace apps/frontend-main run deploy`
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
