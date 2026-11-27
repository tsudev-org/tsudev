# PHIẾU XOAY KHOÁ - VirusTotal API key (`VT_API_KEY`) - phiếu con

> Theo `SECURITY_BASELINE.md` mục 12.3 (tsudev-standards v8.3.0). Còn `MỞ` thì hook `SessionStart` nhắc mọi phiên của repo
> này; agent `MUST` nhắc chủ dự án ở đầu phiên, trước khi làm task. **KHÔNG ghi giá trị bí mật vào phiếu.**

- **Mã phiếu**: 20261126-XK1
- **Trạng thái**: ĐÓNG - chấp nhận rủi ro (26/11/2026, tài khoản VirusTotal miễn phí không tạo lại khoá được)
- **Người phát hiện**: phiên cấu hình máy (projects-dc), rà soát Zero Secret Exposure - **Thời điểm**: 19:16 26/11/2026
- **Mức độ**: Cao

## 1. Tóm tắt

Khoá VirusTotal **đang dùng** (secret cấp org `VT_API_KEY`, tệp `~/.config/tsudev/virustotal.env`) đã xuất hiện nguyên văn
trong lịch sử phiên agent của repo này (và 10 nơi khác) trước 26/11/2026. Cần chủ dự án tạo lại khoá trên VirusTotal và
cập nhật secret org.

**Phiếu gốc (đủ chi tiết + lệnh):** `~/projects/tsudev-standards/tsudev-standards/logs/handover/20261126-XK1_xoay-virustotal-api-key.md`

## 2. Việc của agent repo này

- [ ] Đầu phiên: nhắc chủ dự án xoay `VT_API_KEY` theo phiếu gốc (một câu, không lặp lại khi chủ dự án đã trả lời trong phiên)
- [ ] KHÔNG đọc/in `~/.config/tsudev/virustotal.env`; dùng bằng `set -a; . <tệp>; set +a`
- [ ] Phiếu gốc ĐÓNG -> đổi Trạng thái phiếu này -> ĐÓNG, commit cùng việc kế tiếp

## Quyết định chủ dự án 26/11/2026 - CHẤP NHẬN RỦI RO (đóng phiếu)

- Khoá VirusTotal **không tạo lại được**: tài khoản VirusTotal đang là gói miễn phí. Không xoay.
- Rủi ro còn lại thấp: khoá chỉ có quyền tra cứu/tải tệp lên quét của tài khoản miễn phí, không gắn thanh toán; tệp quét
  vốn là bản phát hành công khai. Hậu quả xấu nhất: người khác dùng hết hạn mức ngày -> job `virustotal` tạm lỗi.
- Giảm thiểu đã làm: tệp `~/.config/tsudev/virustotal.env` đổi `VT_API_KEY=...` (600); hook `noleak-guard` chặn đọc/in.
- Mở lại phiếu MỚI (không sửa phiếu này) khi: đổi/nâng cấp tài khoản VirusTotal (-> xoay ngay), hoặc thấy dấu hiệu lạm
  dụng (job `virustotal` báo vượt hạn mức bất thường).
- Agent KHÔNG cần nhắc chủ dự án về phiếu này nữa.
