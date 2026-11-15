# Sao lưu mã hoá - DB (G12) và khoá ký (G11)

Hai khoảng trống của `docs/security-plan.md`, chung một công cụ: [`age`](https://github.com/FiloSottile/age).
Khoá công khai nằm trong repo (`age-recipients.txt`); khoá RIÊNG chỉ chủ dự án giữ, ngoại tuyến, ít nhất 2 nơi.

## Một lần (chủ dự án)

```bash
sudo apt install age postgresql-client-18      # pg_dump 18: Neon chạy Postgres 18
age-keygen -o /media/<usb>/tsudev-backup.key     # KHÔNG để trên ổ máy dev
# chép dòng "Public key: age1..." vào infrastructure/sao-luu/age-recipients.txt, mở PR
```

Bản thứ hai của khoá riêng: in ra giấy (`cat tsudev-backup.key`) hoặc ổ thứ hai, cất chỗ khác.

## G12 - sao lưu DB

```bash
npm run db:backup          # hỏi DATABASE_URL (read -rsp), ghi ~/tsudev-backups/tsudev-<giờ>.dump.age
```

Dump đi thẳng qua ống vào `age` - không có tệp dạng rõ ở bước nào. Giữ 8 bản mới nhất. Script cảnh báo nếu thư
mục còn `.dump` dạng rõ từ trước (ví dụ `truoc-drop-20261105.dump`): mã hoá nó
(`age -R infrastructure/sao-luu/age-recipients.txt -o x.dump.age x.dump && shred -u x.dump`).

Chạy TRƯỚC mỗi migration có DROP (CLAUDE.md "Thứ tự phát hành migration").

**Diễn tập khôi phục** (nghiệm thu P1.9): `bash scripts/sao-luu-db.sh --kiem <tệp.dump.age> <khoá riêng>` - giải mã
và đếm bảng bằng `pg_restore --list`; 0 bảng ⇒ mã thoát 1.

## G11 - khoá ký bản phát hành

`RELEASE_SIGNING_KEY` (Render) là bản DUY NHẤT. Mất nó thì mọi chữ ký cũ không còn ai xoay khoá có kế hoạch được.

```bash
# trên máy đã đăng nhập dashboard Render: chép giá trị biến vào tệp tạm trên RAM
printf '%s' '<giá trị RELEASE_SIGNING_KEY>' | age -R infrastructure/sao-luu/age-recipients.txt \
  -o /media/<usb>/release-signing-key-$(date +%Y%m%d).age
```

Làm lại mỗi lần xoay khoá (`docs/release-signing.md`), và sao lưu `TOTP_ENCRYPTION_KEY` cùng cách - đổi khoá đó là
mọi thiết bị 2FA hỏng. Diễn tập: giải mã vào môi trường thử, ký một tệp, kiểm bằng JWKS production
(`/.well-known/tsudev-release-jwks.json`) - `kid` phải khớp.
