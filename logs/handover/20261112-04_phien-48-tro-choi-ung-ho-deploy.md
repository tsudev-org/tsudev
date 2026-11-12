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

1. 🔴 Chủ dự án: bật "Require review from Code Owners" ở ruleset `main` (CODEOWNERS đã có cho dữ liệu ủng hộ).
2. 🔴 Chủ dự án: áp `scripts/noi-dung-he-sinh-thai.js` lên Neon (`DATABASE_URL='<neon>' node scripts/don-noi-dung-lac-de.js --apply --noi-dung`).
   Tài liệu giới thiệu sẽ có mục Trò chơi + tên Lotus Share. Máy không còn chuỗi Neon (`~/.tsudev/neon-prod.url` đã mất).
3. 🔴 Chủ dự án: chọn phương án A/B cho tệp cài game ở phiếu `~/projects/linux-packages/logs/handover/20261112-01_*`.
   Khi gói có thật: `ECO_GAMES` thêm `pkg` (phiếu 20261112-03 mục 3).
4. Việc cũ không đổi: QU-STD-4, QU-STD-AUTH, C1; T18/T20/T21/T24 (phiếu 20261109-05 mục 4).
