#!/usr/bin/env bash
# Sao lưu DB production MÃ HOÁ (G12, P1.9) - không bao giờ để dump dạng rõ chạm đĩa.
#
#   bash scripts/sao-luu-db.sh                 # dump Neon -> ~/tsudev-backups/<ngày>.dump.age
#   bash scripts/sao-luu-db.sh --kiem <tệp> <khoá-riêng>   # diễn tập: giải mã + pg_restore --list
#
# - pg_dump 18 (Neon chạy Postgres 18; pg_dump 16 từ chối).
# - Mã hoá bằng `age` tới MỌI khoá công khai trong infrastructure/sao-luu/age-recipients.txt.
#   Khoá RIÊNG không bao giờ nằm trong repo hay trên máy chạy script - chủ dự án giữ ngoại tuyến.
# - DATABASE_URL đọc bằng `read -rsp` (không vào lịch sử shell, không qua `export X=...`:
#   URL có `&` mà không nháy là shell chạy nền nửa đầu - bẫy đã gặp ở phiếu 20261105).
# - Dump đi thẳng qua ống vào age: KHÔNG có tệp .dump dạng rõ ở bất kỳ bước nào.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RECIPIENTS="$ROOT/infrastructure/sao-luu/age-recipients.txt"
PG_DUMP="${PG_DUMP:-/usr/lib/postgresql/18/bin/pg_dump}"
PG_RESTORE="${PG_RESTORE:-/usr/lib/postgresql/18/bin/pg_restore}"
OUT_DIR="${TSUDEV_BACKUP_DIR:-$HOME/tsudev-backups}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Thiếu $1 - $2" >&2; exit 2; }; }
need age "cài: sudo apt install age (hoặc https://github.com/FiloSottile/age)"

if [[ "${1:-}" == "--kiem" ]]; then
  file="${2:?đường dẫn .dump.age}"; key="${3:?tệp khoá riêng age}"
  [[ -x "$PG_RESTORE" ]] || { echo "Thiếu $PG_RESTORE" >&2; exit 2; }
  n=$(age -d -i "$key" "$file" | "$PG_RESTORE" --list | grep -c ' TABLE ' || true)
  echo "Giải mã được: $n bảng trong mục lục."
  [[ "$n" -gt 0 ]] || { echo "KHÔNG có bảng nào - bản sao lưu hỏng hoặc sai khoá" >&2; exit 1; }
  exit 0
fi

[[ -x "$PG_DUMP" ]] || { echo "Thiếu $PG_DUMP (cần pg_dump 18)" >&2; exit 2; }
grep -qE '^age1[0-9a-z]+' "$RECIPIENTS" 2>/dev/null || {
  echo "Chưa có khoá công khai nào trong $RECIPIENTS - chủ dự án chạy 'age-keygen -o <nơi ngoại tuyến>' rồi dán dòng 'Public key: age1...' vào tệp đó." >&2
  exit 2
}

read -rsp 'DATABASE_URL production (không hiện khi gõ): ' DB_URL; echo
[[ "$DB_URL" == postgres* ]] || { echo "URL không giống Postgres" >&2; exit 2; }

mkdir -p "$OUT_DIR"; chmod 700 "$OUT_DIR"
out="$OUT_DIR/tsudev-$(date +%Y%m%d-%H%M%S).dump.age"
"$PG_DUMP" --format=custom --no-owner --dbname="$DB_URL" | age -R "$RECIPIENTS" -o "$out"
chmod 600 "$out"
echo "Đã ghi $out ($(du -h "$out" | cut -f1))."

# Lịch xoá (G12): giữ 8 bản mới nhất, và cảnh báo nếu còn dump dạng rõ từ trước.
ls -1t "$OUT_DIR"/*.dump.age 2>/dev/null | tail -n +9 | xargs -r rm -f
plain=$(ls -1 "$OUT_DIR"/*.dump 2>/dev/null || true)
[[ -z "$plain" ]] || echo "⚠️ Còn dump DẠNG RÕ (G12): $plain - mã hoá hoặc xoá chúng." >&2
