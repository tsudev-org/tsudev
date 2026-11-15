# Cài ứng dụng tsudev bằng một lệnh (Windows 10/11, PowerShell 5.1+).
#
#   & ([scriptblock]::Create((irm https://tsudev.com/install.ps1))) <tên-gói> [tên-gói ...]
#   & ([scriptblock]::Create((irm https://tsudev.com/install.ps1))) -List
#
# Nhiều gói: MỌI tên được kiểm trước (đúng dạng + có ở winget hoặc Scoop) rồi mới cài cái đầu
# tiên - một tên sai không để lại máy cài dở một nửa.
#
# Kiểm trước khi chạy: https://tsudev.com/install.ps1.sha256 (SHA-256 của chính tệp này).
#
# Script CHỈ chuyển sang trình quản lý gói (tsudev-standards PACKAGING.md mục 6):
#   1. winget (có sẵn trong Windows) nếu gói có mã winget - `winget` tự kiểm SHA-256 của bản cài;
#   2. nếu không: Scoop, CHỈ khi máy đã có Scoop và gói có trong catalog.json của bucket tsudev
#      (script KHÔNG tự cài Scoop - như vậy là chạy mã tải về khác);
#   3. còn lại: chỉ đường tải tay từ trang phát hành GitHub của tsudev-org (kiểm SHA-256).
#
# Mã nguồn: https://github.com/tsudev-org/tsudev/blob/main/apps/frontend-main/public/install.ps1
param(
  [Parameter(Position = 0, ValueFromRemainingArguments = $true)][string[]]$Package,
  [switch]$List
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Mã winget ĐÃ có trong microsoft/winget-pkgs (đối chiếu packaging/package.json của từng repo; chỉ thêm
# khi gói đã được Microsoft duyệt - mã "dự kiến" không được đưa vào đây).
$Winget = [ordered]@{
  'tsudev-cwico' = 'tsudev.cwico'
  'tsudev-swico' = 'tsudev.SWICO'
}
$ScoopCatalog = 'https://raw.githubusercontent.com/tsudev-org/scoop-bucket/main/catalog.json'
$ScoopBucket = 'https://github.com/tsudev-org/scoop-bucket'

function Say([string]$m) { Write-Host "tsudev: $m" }
# KHÔNG dùng `exit`: script chạy bằng `irm | iex` / `& ([scriptblock]...)` NGAY TRONG cửa sổ
# PowerShell của người dùng, và `exit` ở đó đóng luôn cửa sổ. Lỗi thì `throw` (dừng script, giữ
# cửa sổ), xong thì `return`.
function Fail([string]$m) { throw "tsudev: LỖI - $m" }

function Get-ScoopNames {
  try {
    $cat = Invoke-RestMethod -Uri $ScoopCatalog -UseBasicParsing
    if ($cat.schema -ne 1) { Fail "catalog Scoop schema $($cat.schema) - script chỉ hiểu schema 1" }
    return @($cat.packages | Where-Object { -not $_.replacedBy } | ForEach-Object { $_.name })
  } catch {
    Fail "không tải được catalog Scoop ($ScoopCatalog): $($_.Exception.Message)"
  }
}

function Invoke-TsudevInstall {
if ($List) {
  $names = @($Winget.Keys) + (Get-ScoopNames) | Sort-Object -Unique
  $names | ForEach-Object { Write-Host "  $_" }
  return
}
$Package = @($Package | Where-Object { $_ })
if ($Package.Count -eq 0) {
  Write-Host 'Cài ứng dụng tsudev:  & ([scriptblock]::Create((irm https://tsudev.com/install.ps1))) <tên-gói> [tên-gói ...]'
  Write-Host 'Liệt kê gói:          & ([scriptblock]::Create((irm https://tsudev.com/install.ps1))) -List'
  return
}
# Trần 20 gói: đủ cho cả danh bạ, chặn một dòng lệnh dán nhầm thành hàng trăm tham số.
if ($Package.Count -gt 20) { Fail 'tối đa 20 gói mỗi lần' }
foreach ($p in $Package) {
  if ($p -cnotmatch '^[a-z][a-z0-9-]+$') { Fail "tên gói không hợp lệ: $p" }
}

$hasWinget = [bool](Get-Command winget -ErrorAction SilentlyContinue)
$scoopNames = $null
# Lên kế hoạch cho MỌI gói trước khi cài bất cứ thứ gì.
$plan = foreach ($p in $Package) {
  if ($Winget.Contains($p) -and $hasWinget) {
    [pscustomobject]@{ Name = $p; Via = 'winget' }
    continue
  }
  if ($Winget.Contains($p)) { Say "máy không có winget (App Installer) - thử Scoop cho $p" }
  if ($null -eq $scoopNames) { $scoopNames = Get-ScoopNames }
  if ($scoopNames -contains $p) {
    if (-not (Get-Command scoop -ErrorAction SilentlyContinue)) {
      Fail "gói '$p' cài được bằng Scoop nhưng máy chưa có Scoop. Cài Scoop theo https://scoop.sh rồi chạy lại, hoặc tải bản cài tại https://tsudev.com/apps"
    }
    [pscustomobject]@{ Name = $p; Via = 'scoop' }
    continue
  }
  Fail "gói '$p' chưa có ở winget hay Scoop - xem -List, hoặc tải bản cài tại https://tsudev.com/apps"
}

foreach ($item in $plan) {
  if ($item.Via -eq 'winget') {
    # 1. winget
    $id = $Winget[$item.Name]
    Say "cài bằng winget: $id"
    winget install --id $id -e --source winget --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { Fail "winget trả mã $LASTEXITCODE" }
  } else {
    # 2. Scoop. Bản mới trả đối tượng có .Name, bản cũ trả chuỗi - StrictMode cấm đọc .Name trên chuỗi.
    $buckets = @(scoop bucket list | ForEach-Object {
        if ($_.PSObject.Properties['Name']) { $_.Name } else { "$_".Trim() }
      })
    if ($buckets -notcontains 'tsudev') {
      Say "thêm bucket tsudev ($ScoopBucket)"
      scoop bucket add tsudev $ScoopBucket
    }
    scoop install "tsudev/$($item.Name)"
    if ($LASTEXITCODE -ne 0) { Fail "scoop trả mã $LASTEXITCODE" }
  }
  Say "đã cài $($item.Name)"
}
}

Invoke-TsudevInstall
