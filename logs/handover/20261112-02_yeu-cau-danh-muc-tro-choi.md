# PHIẾU YÊU CẦU - Mục "Trò chơi" (6 game *.tsudev.com) trên tsudev.com

- **Mã phiếu**: 20261112-02
- **Từ**: phiên agent-game (repo `TsuGameLabs/tsudev-game-kit`) - **Đến**: phiên sau của repo `tsudev`
- **Thời điểm**: 12/11/2026
- **Trạng thái**: ĐÓNG (12/11/2026, phiên 48 của `tsudev`)
- **Nguồn sự thật**: `~/projects/tsugamelabs/tsudev-game-kit/danh-muc.json` (mảng game thuộc hệ sinh thái tsudev, repo
  private ở org GitHub `TsuGameLabs` - quyết định của chủ dự án 12/11/2026, xem `logs/STATE.md` của repo đó).

## Hiện trạng đo 12/11/2026 (`curl`: trang chủ 200 + `<title>`, `og-image.png` 200)

| id                    | Tên (`<title>` đo được) | Thể loại                | Website                                | Hạng |
| --------------------- | ----------------------- | ----------------------- | -------------------------------------- | ---- |
| `xin-chao-nui-cam`    | Xin Chào Núi Cấm        | Trò chơi khám phá       | https://xin-chao-nui-cam.tsudev.com    | C    |
| `chu-chim-vo-canh`    | Chú Chim Vỗ Cánh        | Trò chơi hành động      | https://chu-chim-vo-canh.tsudev.com    | C    |
| `lat-manh-ghep`       | Lật Mảnh Ghép           | Trò chơi giải đố        | https://lat-manh-ghep.tsudev.com       | C    |
| `noi-hinh-giong-nhau` | Nối Hình Giống Nhau     | Trò chơi trí tuệ        | https://noi-hinh-giong-nhau.tsudev.com | C    |
| `luyen-go-phim`       | Luyện Gõ Phím           | Công cụ luyện tập       | https://luyen-go-phim.tsudev.com       | C    |
| `nuicam3d`            | Núi Cấm 3D              | Trò chơi thế giới mở 3D | https://nuicam3d.tsudev.com            | A    |

- Ảnh chia sẻ: `https://<id>.tsudev.com/og-image.png` (1200x630, cả 6 đều 200).
- Mô tả một dòng (`mo_ta`) lấy nguyên văn từ `danh-muc.json` - đọc file đó khi làm, đừng chép tay từ phiếu.
- Mọi game chạy trên trình duyệt (Cloudflare Pages), không có bản cài, không có GitHub Releases; repo **private**
  (`openSource: false`, KHÔNG đưa link repo).
- `nuicam3d` (đổi id từ `ban-do-3d` 12/11/2026; tên miền cũ trả 301) có studio World Editor sau Cloudflare Access - **KHÔNG** đưa link studio vào danh mục.

## Việc cần làm (đề xuất)

1. Thêm mục "Trò chơi" ở trang `/apps` - cách đã làm cho `contact.tsudev.com` (`packages/ui/src/lib/ecosystem.ts`):
   - `EcoCategory` thêm `'game'` (nhãn "Trò chơi"); `EcoPlatform` thêm `'web'` (nhãn "Trình duyệt") - hoặc một mảng
     `ECO_GAMES` riêng nếu không muốn trộn với app cài đặt. Phiên `tsudev` tự chọn.
   - Mỗi game: `website` như bảng, `openSource: false`, không `releases` / `winget` / `scoop` / `brew` / `pkg`.
2. Cột "Hệ sinh thái" của chân trang: một liên kết "Trò chơi" trỏ về mục mới ở `/apps` (6 link riêng thì quá dài).
3. `scripts/noi-dung-he-sinh-thai.js` (nếu sinh nội dung từ danh mục): thêm 6 dòng tương ứng.
4. CHỈ LIÊN KẾT, không nhúng `<iframe>`: game đặt `X-Frame-Options: SAMEORIGIN` và CSP `frame-ancestors 'self'`.
5. Đo lại trước khi merge (theo chú thích đầu `ecosystem.ts`): 200 + `<title>` đúng tên.

## Ghi chú

- Có game mới / đổi tên miền: phiên `tsudev-game-kit` cập nhật `danh-muc.json` và báo qua phiếu mới ở đây.
- Liên hệ ngược: `~/projects/tsugamelabs/tsudev-game-kit/logs/handover/`.

## Kết quả xử lý

- 12/11/2026 - phiên 48: chọn mảng RIÊNG `ECO_GAMES` (kiểu `EcoGame`) trong `packages/ui/src/lib/ecosystem.ts` thay vì
  trộn vào `ECOSYSTEM_APPS` - game không có lệnh cài, không lọc theo hệ điều hành, và khay winget của `/apps` chỉ áp
  cho app cài đặt. `tagline` chép nguyên văn `mo_ta` của `danh-muc.json`; icon SVG nét 1.6 vẽ inline (CSP).
- `/apps` có mục `#tro-choi` (thẻ `EcoGameCard`: thể loại, nhãn "Trình duyệt", nút "Chơi ngay" mở tab mới, không iframe);
  ô tìm kiếm áp lên cả game. Chân trang cột "Hệ sinh thái" thêm MỘT liên kết "Trò chơi" → `/apps#tro-choi`.
- `scripts/noi-dung-he-sinh-thai.js`: tài liệu giới thiệu thêm mục Trò chơi (6 dòng). Áp lên Neon cần chủ dự án
  (máy không còn chuỗi kết nối production) - `DATABASE_URL='<neon>' node scripts/don-noi-dung-lac-de.js --apply --noi-dung`.
- Test `packages/ui/test/ecosystem.test.ts`: 6 game, `https://<id>.tsudev.com`, không link GitHub/TsuGameLabs/studio.
- Đo lại 12/11/2026 trước merge: cả 6 trang chủ 200 + `<title>` đúng tên, `og-image.png` 200.
