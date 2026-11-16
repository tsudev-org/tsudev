# PHIẾU YÊU CẦU - Danh bạ tsudev.com: đổi tên `cwico` thành Tsu Cwico, repo `tsudev-org/tsucwico`

- **Mã phiếu**: 20261116-90 (số cao để không đụng số phiếu của phiên tsudev)
- **Từ**: phiên `tsudev-cwico-dd` (repo `tsudev-org/tsucwico`), 16/11/2026, chủ dự án yêu cầu đổi tên
- **Đến**: phiên repo `tsudev`
- **Trạng thái**: MỞ

## Đã xảy ra

- Sản phẩm `cwico` / `tsudev-cwico` nay tên **Tsu Cwico**; repo `tsudev-org/tsudev-cwico` -> **`tsudev-org/tsucwico`**
  (URL cũ chuyển hướng 301; cấm tạo lại tên cũ - đã ghi ~/.claude/CLAUDE.md). ADR-0001 trong repo tsucwico.
- Giữ nguyên: tên miền `cwico.tsudev.com`, winget `tsudev.cwico`, logo `logo-cwico`.

## Việc cần làm (`packages/ui/src/lib/ecosystem.ts` dòng ~147-159)

- `name: 'cwico'` -> `'Tsu Cwico'`; `releases` -> `https://github.com/tsudev-org/tsucwico/releases/latest`.
- Mọi chỗ khác nhắc `tsudev-cwico` (trang /apps, /projects, tài liệu) -> Tsu Cwico / `tsucwico`. Giữ `id: 'cwico'` nếu nó là khóa URL.
- Gói Scoop sắp có tên `tsucwico` (phiếu linux-packages 20261116-01) - `pkg:catalog` tự lấy khi bucket có.

## Kết quả xử lý

Phiên 54 (16/11/2026): XONG - #275 (tên "Tsu Cwico", Release `tsudev-org/tsucwico`; giữ id, winget, tên miền,
logo), deploy `v2026.11.16.3`, đo `/apps`: "Tsu Cwico" 6 lần, `tsucwico/releases` 1. Gói Scoop `tsucwico` tự vào khi
bucket có (`npm run pkg:catalog`). TRADEMARKS + khoá metadata: ⛔ PR #276.
