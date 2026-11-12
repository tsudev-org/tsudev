# PHIẾU YÊU CẦU - Kênh phân phối bản cài máy tính cho trò chơi (pkg.tsudev.com)

- **Mã phiếu**: 20261112-03
- **Từ**: phiên `tsudev-game-kit-b0` (repo `TsuGameLabs/tsudev-game-kit`) - **Đến**: phiên sau của repo `tsudev`
- **Thời điểm**: 12/11/2026
- **Trạng thái**: MỞ - mục 4 XONG; mục 1-3 chuyển sang `linux-packages`, chờ chủ dự án chốt phương án
- **Nhánh git**: (không - phiếu chỉ đề xuất, không sửa repo `tsudev`)

## 0. Bối cảnh

- Chủ dự án đã duyệt hướng **web trước, sẵn sàng đóng gói** cho mảng game:
  `~/projects/tsugamelabs/tsudev-game-kit/docs/adr/0001-web-truoc-san-sang-dong-goi.md`. Game vẫn chạy ở
  `https://<id>.tsudev.com`, và CÙNG bản `web/` được đóng gói thành app máy tính bằng **Tauri 2**.
- Thí điểm: `luyen-go-phim` (`~/projects/tsugamelabs/tsudev-luyen-go-phim/src-tauri/`). Đã build được
  `tsudev-luyen-go-phim_<ver>_amd64.deb` và `tsudev-luyen-go-phim-<ver>-1.x86_64.rpm` (khoảng 3,2 MiB). Tên gói, mã
  winget `tsudev.LuyenGoPhim` và phiên bản `{YY}.{M}.{DD}{NN}` theo `PACKAGING.md` / `VERSIONING.md`. Manifest:
  `packaging/package.json` (`channels` đang rỗng).
- **Vướng mắc:** repo game là private ở org `TsuGameLabs`, nên GitHub Releases KHÔNG tải công khai được. Winget,
  Scoop và Homebrew cần một URL tải công khai, ghim SHA-256.

## 1. Việc đề nghị repo `tsudev` làm

1. **Xác nhận nơi chứa tệp cài** cho repo private: đề xuất dùng chung R2 sau `pkg.tsudev.com`, đường dẫn
   `https://pkg.tsudev.com/files/<ten-goi>/<version>/<tệp>`, kèm `SHA256SUMS` cùng thư mục. Trả lời: tên bucket, tiền
   tố đường dẫn, ai được ghi (token R2 riêng có quyền ghi đúng tiền tố, hay phiên game gửi tệp để phiên `tsudev`
   tải lên).
2. **Kho APT/RPM:** cho phép thêm gói `tsudev-luyen-go-phim` (sau thí điểm là các game khác, tên `tsudev-<id>`) vào
   kho ký GPG hiện có, theo `PACKAGING.md` mục 5. Phiên game chỉ giao tệp `.deb` / `.rpm` và `SHA256SUMS`. Việc ký và
   dựng siêu dữ liệu kho vẫn do repo `tsudev` giữ (khoá con ký không rời khỏi Environment `packages`).
3. **Trang `/apps`, mục `#tro-choi`:** khi game có bản cài, thẻ game thêm khối "Cài bằng lệnh" sinh từ
   `packaging/package.json` của repo game (chỉ hiện kênh đã có gói thật, theo `PACKAGING.md` mục 8).
4. **Kiểm tra giúp:** lúc 12/11/2026, `curl https://tsudev.com/apps` CHƯA thấy `#tro-choi` hay liên kết
   `*.tsudev.com` của game, dù phiếu `20261112-02` đã ĐÓNG. Có thể production chưa deploy, hoặc trang render phía
   client nên `curl` không thấy. Nếu chưa deploy, đề nghị deploy.

## 2. Tiêu chí hoàn thành

- [ ] Có URL công khai cho tệp cài game (hoặc quyết định khác của chủ dự án), ghi ở mục 7 phiếu này.
- [ ] Có quy trình ghi tệp: ai, bằng token / lệnh nào. Không đưa token vào phiếu.
- [ ] `apt install tsudev-luyen-go-phim` chạy được trên máy sạch, hoặc ghi lý do hoãn.
- [ ] `/apps#tro-choi` hiện trên production.

## 3. File liên quan / đang khóa

| Đường dẫn | Lý do                                      | Còn khóa? |
| --------- | ------------------------------------------ | --------- |
| (không)   | Phiếu không đụng tệp nào của repo `tsudev` | -         |

## 5. Cảnh báo

- Tên gói đã công bố thì KHÔNG đổi (`PACKAGING.md` mục 2). `tsudev-luyen-go-phim` / `tsudev.LuyenGoPhim` chưa công bố,
  nên nếu muốn đổi thì đổi trước bước 2.
- Windows chưa có Authenticode nên SmartScreen sẽ cảnh báo (`PACKAGING.md` mục 4). Trang tải phải nói rõ.
- Phiên game KHÔNG tự ghi vào R2, kho APT hay repo `tsudev`. Mọi thay đổi ở đó đều qua phiếu này.

## 7. Kết quả xử lý (agent nhận điền sau khi thực hiện)

- 12/11/2026 - phiên tsudev-d5 (phiên 48):
  - **Mục 4 XONG**: lúc phiên game đo, PR #223 chưa được deploy. Deploy Worker `9b4818b7` (12/11/2026);
    `curl https://tsudev.com/apps` nay có `id="tro-choi"`, 6 nút "Chơi ngay" và link `*.tsudev.com` (trang tĩnh, HTML
    dựng sẵn - không phải render phía client).
  - **Mục 1-2 không thuộc repo này**: kho `pkg.tsudev.com` (bucket, khoá ký, `products.json`) là repo
    `tsudev-org/linux-packages`. Đã chuyển thành phiếu `~/projects/linux-packages/logs/handover/20261112-01_yeu-cau-goi-tro-choi-tsugamelabs.md`,
    gồm hai phương án cho repo private. Đề xuất: một repo CÔNG KHAI chỉ chứa Releases, nên pipeline của kho giữ nguyên.
    **Chủ dự án chọn phương án.**
  - **Mục 3**: làm khi gói có thật. `ECO_GAMES` (`packages/ui/src/lib/ecosystem.ts`) thêm trường `pkg`; thẻ game
    hiện khối lệnh như thẻ app (PACKAGING.md mục 8: chỉ kênh đã có gói thật).
  - 12/11/2026 (sau): chủ dự án ủy quyền phiên tsudev-d5 chọn - **CHỐT PHƯƠNG ÁN A** (repo công khai
    `TsuGameLabs/tsudev-<id>-releases` cho từng game). Chi tiết + việc còn lại ở mục 4 phiếu `linux-packages` 20261112-01.
