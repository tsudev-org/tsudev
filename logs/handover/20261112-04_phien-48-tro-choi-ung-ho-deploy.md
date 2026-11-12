# PHIẾU BÀN GIAO - Phiên 48: Trò chơi, Ủng hộ, Lotus Share, bẫy tài khoản wrangler

- **Mã phiếu**: 20261112-04
- **Phiên**: tsudev-d5 (phiên 48), 12/11/2026
- **Trạng thái**: HOÀN THÀNH - việc còn lại ở mục 4

## 1. Đã làm

| Việc                                                                                                      | PR           | Production                                                                 |
| --------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| Mục Trò chơi `/apps#tro-choi` (6 game `ECO_GAMES`), liên kết chân trang - phiếu 20261112-02 ĐÓNG          | #223         | Worker `9b4818b7`                                                          |
| Trang Ủng hộ `/ung-ho` (VietQR kiểm lúc build, SHA-256 ghim, CODEOWNERS, FUNDING.yml) - phiếu 20261112-01 | #223         | `9b4818b7`; SHA-256 ảnh QR trên production khớp, `Cache-Control` immutable |
| Lotus Share: `/apps` đổi tên + gói `lotus-share` (APT/RPM, Scoop, Homebrew đã đo), thêm link Releases     | PR phiên này | deploy sau merge                                                           |
| Cổng tài khoản Cloudflare trong `scripts/deploy-frontend.js` + `docs/deployment.md`                       | PR phiên này | -                                                                          |

Phiếu 20261111-01: đã ghi "Đã đọc". Phiếu 20261112-03 (game): mục 4 xong, mục 1-3 chuyển sang `linux-packages`.
Phiếu chung 20261112-04 (bắt buộc cập nhật): ghi KHÔNG ÁP DỤNG (tsudev.com không có app cài đặt).

## 2. 🪤 Bẫy mới: `~/.config/.wrangler` dùng chung đã bị đăng nhập sang tài khoản khác

- Ngày 12/11/2026, wrangler trên máy đăng nhập OAuth bằng `dieuhanhcongviecxanuicam` (tài khoản `098cc741…`).
  `wrangler-account.json` vẫn ghim `9541f44e…`, nên deploy không đẩy nhầm tài khoản, nhưng bước đẩy cache R2 của
  OpenNext thử lại VÔ HẠN với lỗi `Failed to send request to R2 worker ... timeout`. Lỗi thật là 403 Authentication
  error, và chỉ lộ ra khi gọi `wrangler r2 object put` trực tiếp.
- Lần chạy đầu bị nghi là do sandbox chặn loopback. Chạy ngoài sandbox vẫn lỗi y hệt, nên giả thuyết đó sai.
- Cách đúng (các repo khác của hệ đã dùng): `XDG_CONFIG_HOME=$HOME/.config/wrangler-tsudev` (tài khoản `9541f44e…`).
  `deploy-frontend.js` nay kiểm `wrangler whoami --json` trước khi dựng. KHÔNG `wrangler login` trên cấu hình chung.
- Lệnh deploy cần chạy NGOÀI sandbox của Claude Code: worker cache R2 cục bộ và `wrangler` cần mạng.

## 3. Nghiệm thu production (Worker `9b4818b7`)

- `/ung-ho`, `/apps`, `/`, `/sitemap.xml` trả 200. `/apps` có `id="tro-choi"` + 6 "Chơi ngay". `/ung-ho` có số tài
  khoản + ảnh QR. sitemap có `/ung-ho`.
- `/api/auth/providers` = credentials, passkey, github, google (không có provider dev).

Sau #224 (Worker `cdd53375`): `/apps` có "Lotus Share" + `install lotus-share` + link `tsudev-org/lotus-share`;
`/`, `/apps`, `/ung-ho`, `/blog`, `/docs` trả 200; providers không đổi. Dòng "Dựa trên LocalSend" GIỮ, vì đó là ghi
công theo giấy phép, không phải câu "tương thích LocalSend" mà phiên lotus-share dặn bỏ (Lotus Share 2.0 có giao thức riêng).

## 4. Việc còn lại

1. ✅ (12/11/2026) Chủ dự án bật `require_code_owner_reviews` + `dismiss_stale_reviews` trên **branch protection**
   `main` (repo KHÔNG dùng ruleset - các phiếu cũ ghi "ruleset" là sai). Số lượt duyệt chung giữ 0: chỉ PR sửa tệp
   trong CODEOWNERS cần duyệt. 🪤 Code owner = `tsudev-tsudev` = tài khoản agent mở PR, GitHub cấm tự duyệt và
   `enforce_admins` bật ⇒ PR của agent sửa dữ liệu ủng hộ KHÔNG merge được (cố ý). Đổi kênh ủng hộ: PR từ tài khoản
   khác, hoặc chủ dự án tạm `require_code_owner_reviews=false`.
2. ✅ (12/11/2026) Chủ dự án áp `--apply --noi-dung` lên Neon (kết nối trực tiếp, không pooler; bỏ `channel_binding`
   cho Prisma 5): đăng 4 tài liệu + 1 bài, xoá mềm 0. Nghiệm thu: `/search?q=nuicam3d` ra bài giới thiệu,
   `/docs/gioi-thieu-he-sinh-thai-tsudev` có đủ 6 game + Lotus Share, hết `tsudev-lotus`.
3. ✅ Phương án tệp cài game: **CHỐT A** (chủ dự án ủy quyền phiên này chọn) - mỗi game một repo CÔNG KHAI
   `TsuGameLabs/tsudev-<id>-releases`. Phiên game đã dựng sẵn (`tsudev-luyen-go-phim` 087fbb7); repo công khai
   CHƯA tạo - đã nhắn `tsudev-game-kit-b0`. Chuỗi việc tiếp: Release đầu tiên → `linux-packages` thêm vào
   `products.json` + CI cài thử → phiếu mới về repo này → `ECO_GAMES` thêm `pkg` (phiếu 20261112-03 mục 3).
4. Việc cũ không đổi: QU-STD-4, QU-STD-AUTH, C1; T18/T20/T21/T24 (phiếu 20261109-05 mục 4).
