# PHIẾU ECO2 - Nhãn OPEN / PRIVATE theo trạng thái repo GitHub + chữ trắng + chuyển sắc, kính bóng

- **Mã phiếu**: 20261125-ECO2 - **Từ**: điều phối `projects-05`, 25/11/2026 - **Trạng thái**: ĐÓNG 26/11/2026 - **Cho**: phiên tsudev
- **Yêu cầu chủ dự án (25/11/2026, nguyên ý)**:
  1. Repo GitHub **công khai** ⇒ tsudev.com gắn nhãn **OPEN**; repo **riêng tư** ⇒ nhãn **PRIVATE**. Mọi dự án private
     KHÔNG đính kèm mã nguồn, chỉ hiển thị để giới thiệu, KHÔNG có nút điều hướng tới repo GitHub.
  2. Chữ "OPEN" hiện màu đen trên nền xanh lá - khó đọc ⇒ đổi chữ thành **màu trắng**.
  3. Thêm hiệu ứng **chuyển sắc (gradient) đẹp mắt + kính bóng (glossy glass) chuyên nghiệp** cho nhãn OPEN/PRIVATE.
- **Chuẩn**: tsudev-standards **v6.5.0** `PRODUCT_POLICY.md` mục **3.7.7** (PR tsudev-standards #83), `ACCESSIBILITY.md`.
- **Liên quan**: ECO1-a (dải chéo góc hiện tại), PRO3 (câu định vị 3.7.3), `20261125-UX2`.

## 0. Hiện trạng (đo 25/11/2026 trên `origin/main` 3c3b222)

- Nhãn là dải chéo góc `.tsu-ribbon` (`apps/frontend-main/styles/globals.css` ~dòng 510-558), màu từ token
  `--ribbon-open-bg/ink`, `--ribbon-private-bg/ink` (đã có `contrast.test.ts`); chữ trong
  `apps/frontend-main/components/EcoAppCard.tsx` theo cờ `openSource` **khai tay** ở `packages/ui/src/lib/ecosystem.ts`.
- **Lệch sự thật**: `compass` (La bàn) khai `openSource: false` ⇒ hiện **Private**, nhưng repo
  `tsudev-tsudev/app-la-ban` là **PUBLIC** (`gh repo view ... --json visibility`) ⇒ phải là **OPEN** (+ `repo`).
- 6 trò chơi TsuGameLabs: repo PRIVATE ⇒ PRIVATE là đúng (test "repo private: không lộ link GitHub" đã có).
  `tsudev-luyen-go-phim-releases` công khai là KÊNH CÀI (`PACKAGING.md`) - lệnh cài giữ, không gắn nút "GitHub/mã nguồn".

## 1. Việc

### A. Nhãn theo GitHub, không khai tay

1. Mở rộng `scripts/eco-contributors.js` (hoặc script chụp riêng) ghi thêm `visibility` của từng repo vào bản chụp JSON
   (`gh api repos/<owner>/<repo> --jq .visibility`; chạy trong CI như `contributors.json`, KHÔNG gọi GitHub lúc người dùng
   tải trang; repo private đọc bằng token chỉ-đọc sẵn có của CI - nếu không có token đọc được repo private thì repo không
   đọc được ⇒ coi là PRIVATE, không đoán OPEN).
2. `openSource` suy từ bản chụp (`visibility === 'public'`), bỏ khai tay; test chặn: OPEN mà repo private; PRIVATE mà còn
   `repo`/liên kết `github.com/<owner>/<repo>` nguồn/nút GitHub/chữ "mã nguồn mở".
3. Thẻ PRIVATE: chỉ giới thiệu (tên, mô tả, logo, nền tảng, Website, lệnh cài từ kênh công khai). Không nút GitHub, không
   "Releases" trỏ repo nguồn, không đếm contributors từ repo private. Nhãn đọc màn hình: "mã nguồn riêng tư".
4. `compass`: thành OPEN, `repo: 'tsudev-tsudev/app-la-ban'` (KHÔNG chuyển/đổi tên repo - quy tắc tên repo ở
   `~/.claude/CLAUDE.md`).
5. Rà các trang khác có nói "mã nguồn mở" về một dự án (trang chủ, `/apps/<id>` nếu có, JSON-LD, sitemap/OG) - chỉ cho OPEN.

### B. Chữ trắng + chuyển sắc + kính bóng

1. **Chữ OPEN = trắng** (`--ribbon-open-ink: #FFFFFF` cả Sáng/Tối). Nền xanh phải ĐẬM đủ để chữ trắng ≥ **4.5:1 tại MỌI
   điểm** của chuyển sắc _sau khi_ phủ lớp bóng (gợi ý: chuyển sắc xanh lá đậm khoảng `#15803D → #166534`, đo lại; xanh
   sáng kiểu `#22C55E` chỉ ~2.3:1 với chữ trắng - KHÔNG dùng). PRIVATE: chữ trắng trên chuyển sắc đỏ đậm (khoảng
   `#B91C1C → #991B1B`), cùng ngưỡng.
2. **Chuyển sắc**: `linear-gradient` dọc theo dải (2-3 điểm cùng họ màu, lệch sắc nhẹ cho chiều sâu); đặt thành token
   `--ribbon-open-from/-to`, `--ribbon-private-from/-to` (không hard-code trong component).
3. **Kính bóng**: lớp `::after` phủ ánh sáng mặt trên (vd `linear-gradient(180deg, rgb(255 255 255 / .28), transparent 55%)`),
   viền sáng mảnh `inset 0 1px 0 rgb(255 255 255 / .35)`, bóng đổ nhẹ ngoài `0 1px 2px rgb(0 0 0 / .25)`, `text-shadow`
   mảnh cho chữ; tuỳ chọn một vệt sáng lướt qua **một lần khi rê/focus thẻ** (≤ 700 ms). Giữ kích thước/hình học dải
   hiện tại (đủ chữ "PRIVATE"), `pointer-events: none`.
4. Trợ năng: tắt vệt sáng khi `prefers-reduced-motion: reduce`; bỏ lớp kính/bóng (nền đặc, chữ trắng) khi
   `prefers-reduced-transparency: reduce` và `prefers-contrast: more`; `forced-colors: active` ⇒ viền `CanvasText`.
5. Giữ CSP (không ảnh/phông ngoài), không thêm JS. Ngân sách JS không đổi.

### C. Kiểm chứng

- `contrast.test.ts`: đo chữ trắng với **điểm sáng nhất** của nền = từng điểm chuyển sắc trộn (alpha-blend) với lớp bóng
  mạnh nhất, cả Sáng/Tối, ngưỡng 4.5:1.
- Test ecosystem: nhãn khớp bản chụp `visibility`; thẻ PRIVATE render không có `github.com` (trừ kênh cài `*-releases`
  nếu giữ lệnh cài) và không có chữ "mã nguồn mở".
- E2E smoke `/apps` + ảnh chụp Sáng/Tối, khổ hẹp/rộng; deploy; đo production (OPEN chữ trắng, La bàn = OPEN, game = PRIVATE).

### D. Câu định vị mới (chủ dự án DUYỆT 25/11/2026 - tsudev-standards v6.6.0 `PRODUCT_POLICY` 3.7.3)

Đổi `/pro` và mọi nơi hiện câu định vị sang NGUYÊN VĂN (sync `.standards` v6.6.0):

- vi: "Ứng dụng TsuDEV miễn phí; dự án gắn nhãn OPEN công khai mã nguồn trên GitHub. TsuDEV Pro không bắt buộc: bạn chọn
  Pro để ủng hộ tác giả duy trì và phát triển dự án, đổi lại tài khoản nhận thêm các quyền lợi dưới đây."
- en: "TsuDEV apps are free; projects labelled OPEN publish their source code on GitHub. TsuDEV Pro is optional: choose
  Pro to support the author in maintaining and developing the project, and your account gets the extra benefits below."

Trang bán đổi ⇒ báo điều phối thẻ deploy (in lại PDF hồ sơ BCT). Flutter đã xong: `tsudev_ui` v0.7.1.

## 2. Việc 👤 (điều phối hỏi, phiên tsudev KHÔNG tự quyết) - ✅ ĐÃ QUYẾT 25/11/2026, xem mục 1.D

- Câu định vị PRO3 3.7.3 nguyên văn "Mọi ứng dụng TsuDEV miễn phí và mã nguồn mở" trên `/pro` + `ProPurchaseSheet`
  trong khi có dự án PRIVATE (6 trò chơi). Chuẩn 3.7.7 mới: câu "mã nguồn mở" chỉ nói về dự án OPEN ⇒ cần chủ dự án duyệt
  câu mới; điều phối sẽ đổi ở bộ quy ước + tsudev_ui rồi báo. **Chưa sửa `/pro` khi chưa có câu được duyệt.**

## 3. Điều kiện đóng

Mục 1 A-C xong, production đúng, PR gộp + thẻ deploy ghi vào mục 4; báo điều phối (ListAgents → SendMessage).

## 4. Kết quả xử lý

- 25/11/2026 - projects-05: mở phiếu.
- 26/11/2026 - tsudev (phiên ECO2/SYN1): A-C xong ở #402 (`aaa9b42` + sửa E2E chờ chữ hoa `OPEN`/`PRIVATE`), D ở #401.
  Deploy chung với SYN1: **`deploy-2026.11.26.1`** (Worker `8cd67527`). Đo production `/apps`: 10 OPEN (La bàn = OPEN),
  6 trò chơi PRIVATE kèm nhãn đọc màn hình "mã nguồn riêng tư", không thẻ PRIVATE nào có `github.com`. ĐÓNG.
