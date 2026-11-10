# PHIẾU YÊU CẦU - Trang sản phẩm *.tsudev.com cho các repo chưa có website

- **Mã phiếu**: 20261109-06
- **Từ**: phiên tsudev-files-c2 (repo `tsudev-files`) - **Đến**: phiên sau của repo `tsudev` + chủ dự án
- **Thời điểm**: 21:30 09/11/2026
- **Trạng thái**: ĐÓNG (11/11/2026 - chủ dự án chốt giữ tên miền con 1 cấp)
- **Ủy quyền**: chủ dự án đồng ý xây trang sản phẩm *.tsudev.com cho mọi repo hệ tsudev, chi phí 0 đồng (chat
  09/11/2026, phiên tsudev-files).

## Hiện trạng đo 09/11/2026 (`curl -sL -o /dev/null -w '%{http_code}'`)

| Repo                               | Website                                                           | `homepage` GitHub          |
| ---------------------------------- | ----------------------------------------------------------------- | -------------------------- |
| `tsudev-org/tsudev-trafficmonitor` | `trafficmonitor.tsudev.com` 200 (Cloudflare)                      | đúng                       |
| `tsudev-tsudev/app-la-ban`         | `compass.tsudev.com` 200                                          | đã đổi sang trang này      |
| `tsudev-org/tsudev-files`          | chưa (`files.tsudev.com` không phân giải, `tsudev.com/files` 404) | `https://tsudev.com` (tạm) |
| `tsudev-org/tsudev-contact`        | chưa                                                              | `https://tsudev.com` (tạm) |
| `tsudev-org/tsudev-swico`          | chưa                                                              | `https://tsudev.com` (tạm) |
| `tsudev-org/tsudev-cwico`          | chưa                                                              | `https://tsudev.com` (tạm) |
| `tsudev-org/tsudev-standards`      | chưa                                                              | `https://tsudev.com` (tạm) |

Đã làm hộ trên GitHub (09/11): mọi repo trên có mô tả kết thúc ` | tsudev.com`, nhãn `tsudev`, `homepage` như bảng.

## Việc cần làm

1. Chủ dự án/phiên tsudev chọn MỘT kiểu URL và ghi quyết định: tên miền con 1 cấp như đang dùng
   (`files.tsudev.com`, ...; Universal SSL của Cloudflare chỉ phủ 1 cấp) hay trang con `tsudev.com/san-pham/<ten>`.
2. Dựng trang (0 đồng: Cloudflare Pages theo `.standards/docs/FREE_TIER_STACK.md` mục 2.2), đủ checklist
   `ECOSYSTEM_IDENTITY.md` mục 9: `<head>` + Open Graph (`og:site_name` = `tsudev`), canonical không `www`, chân trang
   có dấu hiệu, liên kết tsudev.com, Điều khoản, Chính sách riêng tư. Nội dung tsudev-files: tải bản phát hành từ
   `https://github.com/tsudev-org/tsudev-files/releases/latest`, ghi công `KnifeLemon/Filee` (MIT).
3. Xong trang nào thì đổi `homepage`: `gh repo edit tsudev-org/<repo> --homepage https://<trang>`.
4. README của `tsudev-standards` chưa có dòng `Một sản phẩm của [tsudev](https://tsudev.com).` (mục 2.1) - làm qua
   quy trình phát hành bộ quy ước. Các repo khác đã có phiếu riêng: `tsudev-contact`, `tsudev-swico`, `tsudev-cwico`
   (`logs/handover/20261109-01_yeu-cau-readme-nhan-dien-tsudev.md`), `app-la-ban` (`./agents.sh inbox agent-laban`).

## Kết quả xử lý

- `tsudev-org/tsudev-contact`: https://contact.tsudev.com lên 10/11/2026 (phiếu `20261110-04`, tên miền con 1 cấp).
  tsudev.com đã trỏ thẻ tsudev-contact ở `/apps` + cột "Hệ sinh thái" của footer tới đó (phiên 47, đo 200 +
  `<title>` 10/11/2026).
- Đo 10/11/2026: trafficmonitor, cwico, swico, files, lotus, compass, contact đều có tên miền con 1 cấp. Còn
  `tsudev-standards` chưa có website. Kiểu URL: chờ chủ dự án chốt giữ tên miền con (đề xuất của phiên 46).
- **11/11/2026 - QUYẾT ĐỊNH của chủ dự án** (hỏi qua phiên projects-0c): GIỮ kiểu **tên miền con 1 cấp**
  `<ten>.tsudev.com` cho trang sản phẩm (đang chạy thật, Universal SSL phủ được), KHÔNG chuyển sang
  `tsudev.com/san-pham/<ten>`. `tsudev-standards` là bộ quy ước, không cần website riêng.
- Mục 4: README `tsudev-standards` thêm dòng nhận diện trong bản v3.4.0 (PR tsudev-org/tsudev-standards#49).
