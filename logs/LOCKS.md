# LOCKS.md - File đang bị khóa (kiểm tra TRƯỚC khi sửa bất kỳ file nào)

# Định dạng: <đường dẫn> | <agent/nhiệm vụ> | <HH:mm DD/MM/YYYY>

# Sửa xong file → XÓA dòng khóa của mình.

(TRỐNG - đã nhả toàn bộ khoá của đợt tái cấu trúc 28/10/2026.)

🔴 **VIỆC CHẶN TOÀN DỰ ÁN (05/11/2026): tsudev.com treo - migration chưa áp lên Neon.**
Cần `DATABASE_URL` prod. Xem `logs/handover/20261105-01_go-xong-ma-cho-migrate-prod.md` §1.

🟠 **PR #101 mang MIGRATION DROP** (`20261104120000_go_toa_soan_va_con_dau`).
Thứ tự BẤT BIẾN: `pg_dump` → `prisma migrate deploy` lên Neon → merge. Đảo thứ tự = site sập.
