# PHIẾU BÀN GIAO - Phiên 58: lượt xem trên /author, thẻ deploy mới, C6 catalog, Sound Db có kênh cài

- **Mã phiếu**: 20261117-04
- **Phiên**: phiên 58, 17/11/2026 - nối phiếu 20261117-02 (mục 2 của phiếu đó vẫn là hàng đợi gốc)
- **Trạng thái**: MỞ (mục 2)
- **Khoá**: không giữ khoá nào. Không còn tác vụ nền. DB dev (5433) đang chạy - vô hại.

## 1. Đã xong

| Việc                                                                                                                  | Nơi                                       | Số đo                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Đo lượt gộp lượt xem (phiếu 20261116-01 mục 2)                                                                        | D1 `tsudev-luot-xem`                      | 12:23 UTC 17/11: D1 không còn dòng ngày cũ (cron 01:23 UTC đã gộp + xoá); beacon thử `POST /api/views` ⇒ 204 + có dòng hôm nay |
| Lượt xem lên /author: thẻ "Lượt xem 30 ngày qua / Tổng lượt xem" + số ở từng bài; `GET /api/author/posts` trả `views` | #306                                      | test content-service author+postViews 44/44                                                                                    |
| Thẻ deploy `deploy-YYYY.MM.DD.N` (phiếu V1 bước 8)                                                                    | #306                                      | thẻ `deploy-2026.11.17.7`, Worker `ea6ceb72`, Render `7addfc6` success                                                         |
| C6: catalog kho gói chụp lại - TsuFiles **2.4.1-vn.1** ở APT/RPM; Sound Db `26.11.1704` ở APT, Scoop, Homebrew        | `pkgCatalog.generated.ts`                 | `npm run pkg:catalog`                                                                                                          |
| Gỡ ngoại lệ C4 tạm `sounddb` (đã có kênh cài) + link Releases                                                         | `ecosystem.ts`, `installChannels.test.ts` | packages/ui 255/255                                                                                                            |
| CodeQL #108 `js/missing-rate-limiting` (`/api/author/posts`) đóng "false positive" theo đúng tiền lệ #102-#106        | code scanning                             | route nằm sau `directLimit` + `accountLimit`                                                                                   |

## 2. Còn lại

1. ✅ **Neon** (chủ dự án đặt `neon.env` 17/11 tối): chèn `OAuthClient` `sounddb` (SD1 ĐÓNG, oidc/auth 303) + áp
   `--apply --noi-dung` (0 xoá mềm; đăng lại 4 tài liệu + 1 bài - bài blog hết chữ "tím", đo sau khi ISR dựng lại).
   🔐 Mật khẩu Neon đã HIỆN vào nhật ký phiên 58 (tệp là URL trần, lệnh `sed 's/=.*/…/'` chỉ che sau dấu `=` cuối) ⇒
   ĐỔI mật khẩu Neon rồi sửa `DATABASE_URL` ở Render (bộ nhớ `doi-mat-khau-neon-cap-nhat-render`); xoá `neon.env`.
2. ✅ #290 đã duyệt + merge (17/11). ⛔ Còn các PR ở repo khác, phiếu 20261117-02 mục 2.3.
3. Các mục 2.4-2.8 của phiếu 20261117-02 (thuộc repo khác / 👤) - không đổi.
4. 🧭 Phiếu V1: chờ tsudev-standards v3.7.0 (bước 1) rồi `sync-standards.sh`.

## 3. Bẫy mới

- 🪤 Che bí mật bằng `sed 's/=.*/=…/'` KHÔNG che được URL trần (`postgresql://user:MẬT-KHẨU@host/db?sslmode=…`):
  nó chỉ thay phần sau dấu `=` cuối. Kiểm tệp bí mật bằng `wc -c` / `cut -c1-12`, không in nội dung.

- 🪤 `grep` trong shell của Claude Code là HÀM bọc `ugrep --ignore-files`: nó BỎ QUA tệp bị gitignore (`.next/`,
  `.open-next/`) và trả rỗng KHÔNG báo lỗi. Đã suýt kết luận "bản dựng production thiếu mã mới". Kiểm bản dựng bằng
  `command grep` hoặc Python.
- 🪤 `node scripts/pkg-catalog-sync.js --help` không có `--help`: nó CHẠY đồng bộ và ghi tệp. Chạy thử dùng `--check`.
