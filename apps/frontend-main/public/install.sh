#!/bin/sh
# Cài ứng dụng tsudev bằng một lệnh (Linux, macOS).
#
#   curl -fsSL https://tsudev.com/install.sh | sh -s -- <tên-gói> [tên-gói ...]
#   curl -fsSL https://tsudev.com/install.sh | sh -s -- --list
#
# Kiểm trước khi chạy: https://tsudev.com/install.sh.sha256 (SHA-256 của chính tệp này).
#
# Script CHỈ làm ba việc (tsudev-standards PACKAGING.md mục 6):
#   1. kiểm MỌI tên gói và tra chúng trong catalog.json của kho (gói phải ĐÃ có, đã được cài
#      thử) - một tên sai là dừng TRƯỚC khi đụng vào máy, không cài dở một nửa;
#   2. thêm nguồn tsudev vào trình quản lý gói có sẵn (apt / dnf / brew) - lệnh thêm nguồn
#      GHI CỨNG ở đây, KHÔNG chạy lệnh nào tải về; khoá ký được kiểm SHA-256 ghim cứng;
#   3. gọi trình quản lý gói cài gói - apt/dnf/brew tự kiểm chữ ký và mã băm của gói.
# Không có trình quản lý gói phù hợp thì dừng và chỉ đường tải tay, không tự tải tệp chạy.
#
# Mã nguồn: https://github.com/tsudev-org/tsudev/blob/main/apps/frontend-main/public/install.sh
set -eu

PKG_BASE="https://pkg.tsudev.com"
CATALOG_PKG="$PKG_BASE/catalog.json"
CATALOG_BREW="https://raw.githubusercontent.com/tsudev-org/homebrew-tap/main/catalog.json"
# Khoá ký kho APT/RPM. Đổi khoá ⇒ đổi cả hai băm này qua PR (khớp keys/ của tsudev-org/linux-packages).
FINGERPRINT="3883 10F4 7FA8 224D 76C0  A9C7 9745 B6AF 3EA3 3C74"
PIN_GPG_SHA256="feacfdd558aa202e589f367649d461b15ec55603c0b79b90e1bbfe96faefdceb"
PIN_ASC_SHA256="ad6040e27c1b5e81079dbf91296b4cb98cc8c0d0075523afab2c803e075600bf"

say() { printf '%s\n' "tsudev: $*"; }
die() {
  printf '%s\n' "tsudev: LỖI - $*" >&2
  exit 1
}
has() { command -v "$1" >/dev/null 2>&1; }

usage() {
  cat <<'EOF'
Cài ứng dụng tsudev bằng trình quản lý gói của máy.

  curl -fsSL https://tsudev.com/install.sh | sh -s -- <tên-gói> [tên-gói ...]
  curl -fsSL https://tsudev.com/install.sh | sh -s -- --list     # liệt kê gói có thể cài

Danh bạ đầy đủ và lệnh cho Windows: https://tsudev.com/apps#cai-bang-lenh
EOF
}

# Chạy với quyền quản trị CHỈ khi gọi trình quản lý gói.
SUDO=""
need_root() {
  if [ "$(id -u)" -ne 0 ]; then
    has sudo || die "cần quyền quản trị để cài gói hệ thống, nhưng máy không có sudo"
    SUDO="sudo"
  fi
}

fetch() { curl -fsSL --proto '=https' --tlsv1.2 --retry 2 "$1"; }

sha256_of() {
  if has sha256sum; then
    sha256sum "$1" | cut -d' ' -f1
  elif has shasum; then
    shasum -a 256 "$1" | cut -d' ' -f1
  else
    die "không có sha256sum/shasum để kiểm khoá ký"
  fi
}

# Tên gói trong catalog: chỉ so khớp NGUYÊN chuỗi "name": "<gói>" - tên đã qua regex nên
# không có ký tự đặc biệt nào lọt vào grep.
in_catalog() { fetch "$2" | grep -Eq "\"name\"[[:space:]]*:[[:space:]]*\"$1\""; }

list_catalog() {
  fetch "$1" | grep -Eo '"name"[[:space:]]*:[[:space:]]*"[a-z0-9-]+"' | sed -E 's/.*"([a-z0-9-]+)"$/  \1/' | sort -u
}

TMP=""
cleanup() { [ -n "$TMP" ] && rm -rf "$TMP"; }
trap cleanup EXIT INT TERM

# Gọi trong $(...) (subshell) - thư mục tạm TMP phải được tạo ở shell cha TRƯỚC đó.
verified_key() { # $1 = tệp khoá (gpg|asc), $2 = băm mong đợi → in đường dẫn tệp đã kiểm
  fetch "$PKG_BASE/tsudev-archive-keyring.$1" >"$TMP/key.$1"
  got="$(sha256_of "$TMP/key.$1")"
  [ "$got" = "$2" ] || die "khoá ký tải về có SHA-256 $got, KHÁC giá trị ghim $2 - dừng, không thêm kho"
  printf '%s' "$TMP/key.$1"
}

install_apt() {
  need_root
  TMP="$(mktemp -d)"
  key="$(verified_key gpg "$PIN_GPG_SHA256")" || exit 1
  say "khoá ký đã kiểm (vân tay $FINGERPRINT) - thêm kho APT"
  $SUDO install -d -m 0755 /usr/share/keyrings
  $SUDO install -m 0644 "$key" /usr/share/keyrings/tsudev.gpg
  echo "deb [signed-by=/usr/share/keyrings/tsudev.gpg] $PKG_BASE/apt stable main" |
    $SUDO tee /etc/apt/sources.list.d/tsudev.list >/dev/null
  $SUDO apt-get update
  $SUDO apt-get install -y "$@"
}

install_dnf() {
  need_root
  TMP="$(mktemp -d)"
  key="$(verified_key asc "$PIN_ASC_SHA256")" || exit 1
  say "khoá ký đã kiểm (vân tay $FINGERPRINT) - thêm kho RPM"
  $SUDO rpm --import "$key"
  $SUDO tee /etc/yum.repos.d/tsudev.repo >/dev/null <<EOF
[tsudev]
name=tsudev
baseurl=$PKG_BASE/rpm
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=$PKG_BASE/tsudev-archive-keyring.asc
metadata_expire=6h
EOF
  $SUDO dnf install -y "$@"
}

main() {
  [ $# -ge 1 ] || {
    usage
    exit 2
  }
  case "$1" in
  -h | --help)
    usage
    exit 0
    ;;
  --list)
    os="$(uname -s)"
    if [ "$os" = "Darwin" ]; then list_catalog "$CATALOG_BREW"; else list_catalog "$CATALOG_PKG"; fi
    exit 0
    ;;
  esac
  # Trần 20 gói: đủ cho cả danh bạ, chặn một dòng lệnh dán nhầm thành hàng trăm tham số.
  [ $# -le 20 ] || die "tối đa 20 gói mỗi lần"
  for pkg in "$@"; do
    printf '%s' "$pkg" | grep -Eq '^[a-z][a-z0-9-]+$' || die "tên gói không hợp lệ: $pkg"
  done
  has curl || die "cần curl"

  case "$(uname -s)" in
  Linux)
    # Kiểm HẾT trước khi thêm kho: một tên sai không được để lại máy nửa vời.
    for pkg in "$@"; do
      in_catalog "$pkg" "$CATALOG_PKG" ||
        die "gói '$pkg' chưa có trong kho APT/RPM - xem: curl -fsSL https://tsudev.com/install.sh | sh -s -- --list"
    done
    if has apt-get; then
      install_apt "$@"
    elif has dnf; then
      install_dnf "$@"
    else
      die "máy không có apt hoặc dnf - tải bản cài từ trang phát hành GitHub của tsudev-org và kiểm SHA-256 (https://tsudev.com/apps)"
    fi
    ;;
  Darwin)
    has brew || die "cần Homebrew (https://brew.sh) - hoặc tải bản cài từ https://tsudev.com/apps"
    for pkg in "$@"; do
      in_catalog "$pkg" "$CATALOG_BREW" ||
        die "cask '$pkg' chưa có trong tap tsudev-org/tap - xem: curl -fsSL https://tsudev.com/install.sh | sh -s -- --list"
    done
    for pkg in "$@"; do brew install --cask "tsudev-org/tap/$pkg"; done
    ;;
  *)
    die "hệ điều hành $(uname -s) chưa hỗ trợ - Windows: & ([scriptblock]::Create((irm https://tsudev.com/install.ps1))) <tên-gói>"
    ;;
  esac
  say "đã cài: $*"
}

main "$@"
