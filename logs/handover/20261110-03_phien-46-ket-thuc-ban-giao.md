# PHIẾU BÀN GIAO - Kết thúc phiên 46, việc cho phiên 47

- **Mã phiếu**: 20261110-03
- **Từ**: phiên 46 (tsudev-c8) - **Đến**: phiên 47 của repo `tsudev`
- **Thời điểm**: 10/11/2026
- **Trạng thái**: ĐÓNG - phiếu 20261109-06 xong (tên miền con 1 cấp đang dùng); minimatch xong #220 (đối soát phiên 53, 14/11/2026)
- **Đọc kèm**: [`20261110-01`](20261110-01_phien-46-giao-dien-den-xanh-he-sinh-thai.md) (việc đã làm ở phiên 46,
  chi tiết mã + nghiệm thu). Số `20261110-02` cố ý KHÔNG dùng trong repo này: đó là số của phiếu "nút đổi giao
  diện Sáng/Tối" đặt ở các repo hệ sinh thái khác.

## 0. Trạng thái lúc đóng phiên (đã kiểm)

- Không monitor, không tiến trình nền (không `next dev`, backend giả, dev-proxy, Playwright nào còn chạy).
- `logs/LOCKS.md` TRỐNG - phiên 46 không giữ khoá nào.
- `main` local = `origin/main` tại `a385669` (PR #212). Production frontend: Workers version `9e94665b`.
- Tệp CHƯA commit trong repo này (phiên 47 commit qua PR - `main` có branch protection, không đẩy thẳng):
  - `logs/handover/20261110-03_*` (phiếu này), sửa `logs/STATE.md`, `logs/LOCKS.md`, §4 phiếu `20261110-01`.
  - `logs/handover/20261109-06_yeu-cau-trang-san-pham-tsudev-com.md` - phiếu của phiên tsudev-files, untracked từ
    trước; xem §2 việc 2.

## 1. Đã xong ở phiên 46

1. Giao diện đen + xanh (Tối mặc định), danh bạ `/apps` kiểu winstall, nút ra website sản phẩm mở tab mới -
   PR #211 + #212, deploy + nghiệm thu production (chi tiết: phiếu `20261110-01`).
2. Phiếu "nút đổi giao diện Sáng/Tối ở header" gửi 6 repo hệ sinh thái. Tiến độ tới cuối phiên:

| Repo                    | Tình trạng                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `tsudev-files`          | ✅ ĐÓNG. PR #25 gộp, deploy Worker `5c375f4d`, nghiệm thu Chromium trên production (PR #26).    |
| `tsudev-cwico`          | Mã xong: PR tsudev-org/tsudev-cwico#58 gộp, CI xanh. CHỜ chủ dự án deploy website cwico.        |
| `tsudev-trafficmonitor` | Phiếu `logs/handover/20261110-02_*` chờ phiên mở repo (CSP `default-src 'none'`, không script). |
| `tsudev-swico`          | Phiếu `logs/handover/20261110-02_*` chờ phiên mở repo (`script-src 'unsafe-inline'`).           |
| `tsudev-lotus`          | Phiếu `logs/handover/20261110-02_*` chờ phiên mở repo (`default-src 'none'`).                   |
| `app-la-ban`            | `docs/phieu/20261110-02_*` + inbox `agent-laban` mã `HGLB-1110-125225`, chờ phiên.              |

Bài học từ cwico đã chép vào 4 phiếu còn chờ: script chọn giao diện phải đặt SAU `<meta name="theme-color">` và
TRƯỚC stylesheet - đặt trước meta thì không đổi được màu thanh địa chỉ.

## 2. Việc cho phiên 47 (theo thứ tự)

1. **Commit nhật ký phiên 46** (các tệp ở §0) qua một PR `docs(logs): ...`; xin chủ dự án xác nhận trước khi
   push. Người dùng tự merge (bộ phân loại an toàn có thể chặn agent `gh pr merge`).
2. *_Phiếu 20261109-06 (trang sản phẩm *.tsudev.com)*_ - phần lớn đã tự hết: trafficmonitor, cwico, swico, files,
   lotus, compass đều đã có tên miền con (đo 10/11/2026). Phiên 46 đề xuất GIỮ kiểu tên miền con 1 cấp (đang
   dùng thật, Universal SSL phủ được) thay vì `tsudev.com/san-pham/<ten>`. Hỏi chủ dự án chốt; đồng ý thì ghi
   quyết định vào phiếu, đánh dấu ĐÓNG, commit. Còn mở: `tsudev-contact` và `tsudev-standards` chưa có website
   (thẻ contact trong `packages/ui/src/lib/ecosystem.ts` chỉ có nút tải GitHub).
3. **Sau khi chủ dự án deploy cwico**: phiên tsudev-cwico tự nghiệm thu CSP; phiên này chỉ cần không làm gì,
   trừ khi được báo lỗi.
4. Khi website nào trong hệ sinh thái đổi (thêm site, có bản phát hành GitHub, có gói winget): ĐO LẠI rồi cập
   nhật `packages/ui/src/lib/ecosystem.ts` (quy tắc đo nằm ở đầu tệp). `tsudev-files`/`tsudev-lotus` hiện chưa có
   bản phát hành GitHub.
5. **Hạn minimatch** (từ phiếu `20261109-05`): từ 08:08 11/11/2026 được phép override minimatch `11.0.2` KÈM
   `"glob@>=10 <13": "13.0.6"`, ghim chính xác, so build/coverage trước-sau.

## 3. Ghi chú kỹ thuật

- **CSP và script Cloudflare tự chèn**: files.tsudev.com chặn Web Analytics beacon + `/cdn-cgi/challenge-platform`
  (việc của chủ dự án: tắt trong thiết lập zone, KHÔNG nới CSP). tsudev.com ĐÃ KIỂM 10/11/2026 không bị: CSP có
  `https://static.cloudflareinsights.com` và dùng nonce - Cloudflare tự gắn nonce đó vào script challenge.
  Đừng bỏ nonce khỏi CSP của tsudev.com, nếu không script challenge sẽ bị chặn.
- Cổng 8080 trên máy dev có thể bị dự án `ubnd` chiếm - Playwright local phiên 46 chạy dev-proxy ở 8090.
- Đổi script chống nháy ở `_document.tsx` ⇒ đổi `THEME_SCRIPT_HASH` trong `proxy.ts` (hiện
  `sha256-7xkQ2QGX7hdhzF0sLyzn1PkfyfdA8MrLkhp9sxS0xn8=`).
