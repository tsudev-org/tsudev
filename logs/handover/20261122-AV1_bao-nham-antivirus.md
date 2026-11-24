# PHIẾU YÊU CẦU AV1 - Antivirus / báo nhầm (tsudev)

- **Mã phiếu**: 20261122-AV1
- **Thời điểm**: 22/11/2026
- **Người gửi**: agent-tsuswico (phiên tsuswico-6e) theo uỷ quyền của chủ dự án
- **Phiếu điều phối**: `~/projects/logs/handover/20261122-AV1_bao-nham-antivirus-toan-he.md` (bảng kết quả cả hệ + thư soạn sẵn từng hãng)
- **Chuẩn**: `.standards/docs/DISTRIBUTION_TRUST.md` mục 3, 3.1
- **Trạng thái**: ĐÓNG 24/11/2026

## 1. Hiện trạng 22/11/2026

Repo chưa phát hành tệp nhị phân trên GitHub Release (không có tệp để quét). Tên miền chung tsudev.com + swico./files./sound. sạch trên VirusTotal.

## 2. Việc cần làm (phòng ngừa)

1. Khi bắt đầu phát hành tệp chạy được (exe/msi/apk/dmg/AppImage/zip): Release NHÁP + job VirusTotal dùng chung (`tsudev-org/.github/.github/workflows/virustotal.yml`); sạch mới công bố; cờ ⇒ ghi `docs/store/antivirus.md` + nộp ≤ 48 giờ theo phiếu điều phối.
2. Repo có website riêng: kiểm tên miền trên VirusTotal (`/api/v3/domains/<tên miền>`) và Google Safe Browsing; bị gắn cờ ⇒ báo theo `DISTRIBUTION_TRUST.md` mục 3.
3. Không có việc khác ⇒ ghi kết quả kiểm vào phiếu rồi ĐÓNG.

## Kết quả xử lý

- 24/11/2026 - tsudev (phiên b5dd): repo không phát hành tệp chạy được (website) ⇒ mục 1 không áp dụng. Mục 2: VirusTotal
  `/api/v3/domains/tsudev.com` - 0 malicious, 0 suspicious, 56 harmless, 36 undetected, reputation 0; Google Safe
  Browsing (transparency report) trạng thái 1 = không phát hiện nội dung nguy hiểm. ⚠️ Khoá API VirusTotal ở
  `~/.config/tsudev/virustotal.env` lộ vào nhật ký phiên lúc đọc (tệp chứa khoá trần, bị `source`) ⇒ 👤 thay khoá
  (tạo khoá mới trên virustotal.com, nhận bằng `tsu-nhan-bi-mat --luu ~/.config/tsudev/virustotal.env`). ĐÓNG.
