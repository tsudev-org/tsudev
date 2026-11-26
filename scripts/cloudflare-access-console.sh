#!/usr/bin/env bash
#
# cloudflare-access-console.sh - dựng Cloudflare Access (Zero Trust Free) cho console.tsudev.com
# (CONTROL_PLANE.md lớp L1, ADR-0005, phiếu 20261126-CP1 phase CP2). Chạy lại nhiều lần vẫn an toàn:
# thứ đã có thì giữ, danh sách email của policy thì đồng bộ theo tệp.
#
# Cần (KHÔNG commit, quyền 600):
#   ~/.config/tsudev/cloudflare-access.env   CLOUDFLARE_ACCESS_TOKEN=<token API>
#       quyền token (Account): "Access: Organizations, Identity Providers, and Groups: Edit",
#                              "Access: Apps and Policies: Edit"
#   ~/.config/tsudev/cloudflare.env          CLOUDFLARE_ACCOUNT_ID=<id tài khoản tsudev>
#   ~/.config/tsudev/console-access-emails.txt   mỗi dòng một email được vào console. (KHÔNG dùng đuôi tên miền)
#
# Ghi ra: ~/.config/tsudev/keys/console-access.env (600)
#   CF_ACCESS_TEAM_DOMAIN=<team>.cloudflareaccess.com
#   CF_ACCESS_AUD_CONSOLE=<AUD tag>
#
# Cách dùng:
#   ./scripts/cloudflare-access-console.sh            # xem trước (chỉ đọc)
#   ./scripts/cloudflare-access-console.sh --ap-dung  # tạo/cập nhật
#   ./scripts/cloudflare-access-console.sh --ap-dung --team tsudev
set -euo pipefail

APPLY=0
TEAM=tsudev
DOMAIN=console.tsudev.com
while [ $# -gt 0 ]; do
  case "$1" in
    --ap-dung) APPLY=1 ;;
    --team) TEAM="$2"; shift ;;
    --domain) DOMAIN="$2"; shift ;;
    *) echo "Tham số lạ: $1" >&2; exit 2 ;;
  esac
  shift
done

CFG=~/.config/tsudev
val() { grep -E "^$2=" "$1" 2>/dev/null | head -1 | cut -d= -f2- | tr -d ' \r\n"'; }
TOKEN=$(val "$CFG/cloudflare-access.env" CLOUDFLARE_ACCESS_TOKEN)
ACCOUNT=$(val "$CFG/cloudflare.env" CLOUDFLARE_ACCOUNT_ID)
EMAILS_FILE="$CFG/console-access-emails.txt"
[ -n "$TOKEN" ] || { echo "Thiếu CLOUDFLARE_ACCESS_TOKEN trong $CFG/cloudflare-access.env" >&2; exit 1; }
[ -n "$ACCOUNT" ] || { echo "Thiếu CLOUDFLARE_ACCOUNT_ID trong $CFG/cloudflare.env" >&2; exit 1; }
[ -s "$EMAILS_FILE" ] || { echo "Thiếu $EMAILS_FILE (mỗi dòng một email)" >&2; exit 1; }
chmod 600 "$CFG/cloudflare-access.env" "$EMAILS_FILE"

API="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/access"
# cf <METHOD> <đường> [thân JSON] - in JSON trả về; token đi qua header từ tệp tạm, không lên dòng lệnh của tiến trình khác.
HDR=$(mktemp); trap 'rm -f "$HDR"' EXIT; chmod 600 "$HDR"
printf 'Authorization: Bearer %s\n' "$TOKEN" > "$HDR"
cf() { curl -sS -X "$1" -H @"$HDR" -H 'Content-Type: application/json' "$API$2" ${3:+--data "$3"}; }
ok() { python3 -c 'import json,sys;d=json.load(sys.stdin);sys.exit(0 if d.get("success") else 1)'; }
err() { python3 -c 'import json,sys;d=json.load(sys.stdin);print("; ".join(str(e.get("code"))+" "+e.get("message","") for e in d.get("errors",[])))'; }
jq_() { python3 -c "import json,sys;d=json.load(sys.stdin);$1"; }

echo "== Tổ chức Zero Trust"
ORG=$(cf GET /organizations)
if echo "$ORG" | ok && [ "$(echo "$ORG" | jq_ 'print(bool(d.get("result")))')" = True ]; then
  TEAM_DOMAIN=$(echo "$ORG" | jq_ 'print(d["result"]["auth_domain"])')
  echo "  có sẵn: $TEAM_DOMAIN"
else
  TEAM_DOMAIN="$TEAM.cloudflareaccess.com"
  echo "  chưa có ($(echo "$ORG" | err)) - sẽ tạo $TEAM_DOMAIN"
  if [ $APPLY = 1 ]; then
    R=$(cf POST /organizations "{\"name\":\"TsuDEV\",\"auth_domain\":\"$TEAM_DOMAIN\",\"session_duration\":\"24h\"}")
    echo "$R" | ok || { echo "  LỖI tạo tổ chức: $(echo "$R" | err)"; echo "  ⇒ chọn gói Free + team name trên dash.cloudflare.com → Zero Trust, rồi chạy lại." >&2; exit 1; }
  fi
fi

echo "== Phương thức đăng nhập: mã một lần qua thư (One-time PIN)"
IDPS=$(cf GET /identity_providers)
OTP=$(echo "$IDPS" | jq_ 'print(next((i["id"] for i in d.get("result") or [] if i.get("type")=="onetimepin"),""))')
if [ -z "$OTP" ] && [ $APPLY = 1 ]; then
  R=$(cf POST /identity_providers '{"name":"Mã một lần qua thư","type":"onetimepin","config":{}}')
  echo "$R" | ok || { echo "  LỖI: $(echo "$R" | err)" >&2; exit 1; }
  OTP=$(echo "$R" | jq_ 'print(d["result"]["id"])')
fi
echo "  ${OTP:-(sẽ tạo)}"

echo "== Ứng dụng Access $DOMAIN (self-hosted, phủ CẢ tên miền kể cả /api)"
APPS=$(cf GET "/apps?per_page=100")
APP_ID=$(echo "$APPS" | jq_ "print(next((a['id'] for a in d.get('result') or [] if a.get('domain')=='$DOMAIN'),''))")
BODY=$(python3 - "$DOMAIN" "$OTP" <<'EOF'
import json, sys
dom, otp = sys.argv[1], sys.argv[2]
print(json.dumps({
  "name": "TsuDEV console", "domain": dom, "type": "self_hosted", "session_duration": "24h",
  "allowed_idps": [otp] if otp else [], "auto_redirect_to_identity": bool(otp),
  "app_launcher_visible": False, "http_only_cookie_attribute": True,
  "same_site_cookie_attribute": "lax", "enable_binding_cookie": True,
  "skip_interstitial": True,
}))
EOF
)
if [ $APPLY = 1 ]; then
  if [ -n "$APP_ID" ]; then R=$(cf PUT "/apps/$APP_ID" "$BODY"); else R=$(cf POST /apps "$BODY"); fi
  echo "$R" | ok || { echo "  LỖI ứng dụng: $(echo "$R" | err)" >&2; exit 1; }
  APP_ID=$(echo "$R" | jq_ 'print(d["result"]["id"])')
  AUD=$(echo "$R" | jq_ 'print(d["result"]["aud"])')
  echo "  id ${APP_ID:0:8}…, có AUD"
else
  echo "  ${APP_ID:-(sẽ tạo)}"
fi

echo "== Policy Allow theo danh sách email ($(grep -c . "$EMAILS_FILE") email)"
POL=$(python3 - "$EMAILS_FILE" <<'EOF'
import json, re, sys
emails = [l.strip().lower() for l in open(sys.argv[1]) if l.strip() and not l.startswith('#')]
bad = [e for e in emails if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[a-z]{2,}", e)]
if bad or not emails:
    sys.exit("email hỏng hoặc danh sách rỗng")
print(json.dumps({"name": "Người điều hành (danh sách email)", "decision": "allow", "precedence": 1,
                  "include": [{"email": {"email": e}} for e in emails], "session_duration": "24h"}))
EOF
)
if [ $APPLY = 1 ]; then
  PS=$(cf GET "/apps/$APP_ID/policies")
  PID=$(echo "$PS" | jq_ 'print(next((p["id"] for p in d.get("result") or [] if p.get("decision")=="allow"),""))')
  if [ -n "$PID" ]; then R=$(cf PUT "/apps/$APP_ID/policies/$PID" "$POL"); else R=$(cf POST "/apps/$APP_ID/policies" "$POL"); fi
  echo "$R" | ok || { echo "  LỖI policy: $(echo "$R" | err)" >&2; exit 1; }
  echo "  đã đồng bộ"
  OUT="$CFG/keys/console-access.env"
  ( umask 177; printf 'CF_ACCESS_TEAM_DOMAIN=%s\nCF_ACCESS_AUD_CONSOLE=%s\n' "$TEAM_DOMAIN" "$AUD" > "$OUT" )
  echo "== Ghi $OUT (600). Kiểm: mở https://$DOMAIN ở cửa sổ ẩn danh ⇒ màn đăng nhập của Cloudflare Access."
else
  echo "(xem trước - thêm --ap-dung để ghi)"
fi
