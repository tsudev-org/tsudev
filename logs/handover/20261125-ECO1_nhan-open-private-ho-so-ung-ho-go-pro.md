# PHIẾU ECO1 - Nhãn Open/Private, Author/Contributors, nền thẻ, hồ sơ tác giả, "Ủng hộ tính năng mới", gỡ gói Pro

- **Mã phiếu**: 20261125-ECO1 - **Từ**: phiên `tsudev-7d`, 25/11/2026 - **Trạng thái**: MỞ
- **Yêu cầu chủ dự án (25/11/2026)**: nguyên văn trong nhật ký phiên tsudev-7d; tóm tắt ở mục 1. MỖI PHIÊN MỘT PHASE
  (mục 3), xong phase ⇒ tắt monitor, nhả khoá, ghi mục 6 + `logs/STATE.md`, gợi ý prompt, đóng phiên.
- **Nguyên tắc chung**: 0 đồng (dịch vụ trả phí phải hỏi 👤); ngân sách JS 170 KB/trang; giao diện theo CLAUDE.md (đen
  tuyền + xanh logo, CHỈ Sáng · Tối · Hệ thống, token sửa ở `tokens/extensions.tsudev-web.json`, mọi cặp màu mới vào
  `packages/ui/test/contrast.test.ts`); hoạt ảnh tôn trọng `prefers-reduced-motion` và KHÔNG gây CLS; không ghi "do AI".
- **Quan hệ với UX1**: UX1-c (tải ảnh) vẫn ⛔ chờ bucket R2 `tsudev-media`. Thứ tự đề xuất: ECO1-a → b → c → d → e → f →
  g, chen UX1-c ngay khi 👤 tạo bucket; UX1-e/f/g sau ECO1-c (cùng chạm header/trang công khai - tránh làm hai lần).

## 1. Yêu cầu (tóm tắt)

1. **Nhãn góc**: bỏ nhãn chữ "Mã nguồn mở/Độc quyền" trên thẻ app (trang chủ + `/apps`); thay bằng dải chéo góc TRÊN
   PHẢI: "Open" nền đen tuyền (tam giác cách điệu), "Private" nền đỏ.
2. **Author/Contributors** dưới tên app trên thẻ: "Author: TsuDEV + 3 Contributors" / "Author: TsuDEV" - chữ nhỏ, mờ
   hơn tên app + nhãn. Trang "Bản quyền" của từng website app hiện đủ tác giả/đồng tác giả/contributors + các phiên
   bản (phiếu cho tsutramon, tsufiles, lotus-share - mục 5).
3. **Nền thẻ**: thẻ app có logo của chính app làm hình chìm (mờ/bóng), không làm chìm nội dung; thẻ nhóm "Hệ thống /
   Tệp & dữ liệu / Mạng & chia sẻ / Tiện ích / Trò chơi trên web / Cài bằng một lệnh" bỏ icon phía trên, thay bằng
   hình/biểu tượng chìm chuyên nghiệp cùng kiểu.
4. **Hồ sơ lập trình viên**: khối "Tải về rồi mà Windows cảnh báo?" ở trang chủ ⇒ thẻ hồ sơ Nguyễn Trang Tình Sử
   (nội dung từ [`docs/ho-so-tac-gia.md`](../../docs/ho-so-tac-gia.md) do 👤 điền). Hướng dẫn SmartScreen chuyển sang
   `/docs` (👤 chốt 25/11), thẻ app/trang tải trỏ tới đó.
5. **Chuyển động**: thẻ/nội dung xuất hiện từ dưới lên khi cuộn (vừa phải); nền site đổi từ loang gradient sang hoạ
   tiết sắc nét, màu công nghệ tươi sáng, hiện dần khi cuộn.
6. **"Ủng hộ tính năng mới"**: nút "Ủng hộ" mở modal/trang tên đó - lời giải thích thân thiện: mọi dự án TsuDEV xây từ
   nhu cầu thực tế hằng ngày của Dev Nguyễn Trang Tình Sử, phi lợi nhuận, 0 đồng; ủng hộ giúp sắp xếp thời gian phát
   triển tiếp `<tên dự án>`. Kênh (👤 chốt 25/11): **VietQR số tiền tự do + GitHub Sponsors + Ko-fi + PayPal.me**;
   agent tự chọn cách trình bày tối ưu + an toàn.
7. **Gỡ gói Pro** toàn hệ (👤 chốt 25/11: **mở khoá cho mọi người**, đóng bán mới, không hoàn tiền tự động, người đã
   trả giữ dấu ghi nhận). `/admin/thanh-toan` nâng thành trang **quản lý người ủng hộ + cấp nhãn**: "Mạnh thường quân"
   (mức thấp nhất), "Đại gia" (mức kế), "Triệu phú" (> 1 triệu), "Tiểu thần tiên" (đóng góp vượt trội, 👤 gắn tay) -
   mỗi nhãn có màu/hoạ tiết/hiệu ứng động riêng.
8. **App mở trình duyệt**: trong app (Cài đặt → xem phiên bản / trang chủ tsudev.com) KHÔNG mở trình duyệt ngay; hiện
   modal nổi giải thích + nút "Mở trang tải"/"Mở tsudev.com" + "Huỷ". Áp dụng MỌI app trong hệ (mục 5).
9. **Minh bạch ủng hộ (bổ sung 25/11/2026)**: (a) trang CÔNG KHAI thống kê người ủng hộ - tổng tiền, số lượt, theo
   dự án, theo tháng, danh sách người ủng hộ (tên hiển thị/ẩn danh, số tiền, ngày, dự án, nhãn); (b) trang QUẢN LÝ ở
   tsudev.com (OWNER) để can thiệp khi người ủng hộ muốn sửa/đổi/ẩn thông tin; BẬT/TẮT trang danh sách công khai theo
   TỪNG dự án; lọc, tổng hợp, xuất tệp (CSV), xác minh/đối chiếu, đính kèm ảnh bill/biên lai người ủng hộ gửi để sửa
   hoặc gán lại dự án. MỌI dự án dùng CHUNG nguồn dữ liệu + trang quản lý ở tsudev.com; website từng dự án chỉ hiển
   thị (đọc API công khai của tsudev.com hoặc liên kết sang `tsudev.com/ung-ho/<slug>`).
10. **Hiệu năng**: mọi thao tác phản hồi tức thì (không đơ/lag) - nguyên tắc xuyên suốt, đo bằng ngân sách JS + LCP/CLS
    (UX1-g) + INP.

## 2. Sự thật đã đo (25/11/2026) - đừng đo lại

- "Mã thanh toán" ở `/settings/badge` **CÓ trang quản lý**: `/admin/thanh-toan` (chỉ OWNER + TOTP, cổng thật ở
  `services/auth-service/src/paymentRoutes.ts` `requireOwner`): tab Chờ đối soát / Hết hạn / Đã xác nhận / Đã từ chối.
  Thiếu sót thật: không có liên kết nào dẫn tới nó (menu quản trị) và người dùng không biết mã của mình đang ở bước nào.
- Pro nằm ở: `packages/db` (`Entitlement.proUntil`, `EntitlementEvent`, `ProReminderSent`, `PaymentIntent`),
  auth-service (`entitlements.ts`, `entitlementRoutes.ts`, `paymentRoutes.ts`, `proReminders.ts`, `playBilling.ts`,
  `oidc.ts` - quyền lợi ký JWS mà app đọc, ADR-0002), frontend (`pages/pro.tsx`, `pages/ung-ho.tsx`,
  `pages/settings/badge.tsx`, `pages/chinh-sach-thanh-toan.tsx`, `pages/admin/thanh-toan.tsx`, `TsuBadge.tsx`).
- Thẻ app: `apps/frontend-main/components/EcoAppCard.tsx` + dữ liệu `packages/ui/src/lib/ecosystem.ts` (có URL repo
  `tsudev-org/*`); trang chủ `pages/index.tsx`. Nút "Ủng hộ" ở `SiteHeader.tsx`/`SiteFooter.tsx` (chân trang ⇒ cổng
  "Bảo vệ bản quyền", 👤 `nguyentrangtinhsu` duyệt).

## 3. Phase - MỖI PHIÊN MỘT PHASE

| Phase       | Việc                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Xong khi                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **ECO1-a**  | Nhãn chéo góc Open (đen tuyền) / Private (đỏ - token mới, cặp chữ đạt AA cả 2 chế độ) trên `EcoAppCard`; dòng "Author: TsuDEV + N Contributors". Số liệu: `scripts/eco-contributors.js` gọi GitHub REST `/repos/{o}/{r}/contributors` (không token cũng được; CI dùng `GITHUB_TOKEN`), lọc bot + chủ dự án, ghi `packages/ui/src/lib/contributors.json`; Action hằng tuần mở PR khi đổi (ghim SHA action). Trang KHÔNG gọi GitHub lúc chạy.                                                                                                                                                                                                                                                                                                                                                                                                                | Trang chủ + `/apps` đúng ở 2 chế độ, 390 px, axe 0 serious; `budget:js` xanh; ảnh chụp                                                   |
| **ECO1-b**  | Logo app làm hình chìm trên thẻ (CSS `background-image` + lớp phủ token, không `<img>` thêm vào LCP); thẻ nhóm bỏ icon đầu, thay hình chìm; hiệu ứng xuất hiện khi cuộn (IntersectionObserver + class CSS, KHÔNG thư viện, `prefers-reduced-motion` ⇒ tắt); nền hoạ tiết thay gradient. ⚠️ Hoạ tiết `quang-sang` + bố cục `cong` đến từ `.standards` v5 (bất khả xâm phạm) ⇒ nếu đổi hoạ tiết NỀN toàn site, mở đề xuất ở repo tsudev-standards trước (`.standards/docs/SYNC.md`).                                                                                                                                                                                                                                                                                                                                                                         | CLS = 0 khi cuộn (đo Lighthouse), tương phản đạt AA trên nền hoạ tiết, ảnh chụp 2 chế độ                                                 |
| **ECO1-c**  | Thẻ hồ sơ tác giả trên trang chủ từ `docs/ho-so-tac-gia.md` (⛔ chờ 👤 điền); trang `/docs/windows-smartscreen` nhận nội dung hướng dẫn cũ; liên kết cũ không gãy. Ảnh chân dung (nếu có) tự host, WebP, có `width/height`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 👤 duyệt nội dung hồ sơ trên bản dev trước khi deploy                                                                                    |
| **ECO1-d**  | Modal + trang `/ung-ho` "Ủng hộ tính năng mới": lời giải thích (mục 1.6), nhận `?app=<slug>` để ghi tên dự án; VietQR **số tiền tự do** (ô nhập + mức gợi ý, giới hạn trên/dưới, nội dung CK do máy chủ sinh) + liên kết GitHub Sponsors / Ko-fi / PayPal.me (⛔ 👤 tạo tài khoản, đưa URL). Không thu thẻ/không lưu dữ liệu thanh toán ở tsudev.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Modal a11y (focus trap, Esc), hoạt động không JS (trang `/ung-ho`), CSP không nới                                                        |
| **ECO1-e**  | Gỡ Pro ở tsudev: đóng bán mới (`/pro` → 308 `/ung-ho`), quyền lợi OIDC trả "mở cho mọi người" (giữ hình dạng claim để app cũ không vỡ), tắt thư nhắc gia hạn + cron, `/settings/badge` bỏ "Mã thanh toán" (thay bằng lịch sử ủng hộ), cập nhật `/chinh-sach-thanh-toan` + `/terms`. Migration CHỈ THÊM (không DROP; dữ liệu cũ giữ để đối soát). Play Billing: ⛔ 👤 ngừng sản phẩm đăng ký trong Play Console.                                                                                                                                                                                                                                                                                                                                                                                                                                            | App cũ đã cài vẫn mở đủ tính năng (đo bằng client OIDC thật), migrate Neon TRƯỚC merge                                                   |
| **ECO1-f**  | `/admin/thanh-toan` ⇒ `/admin/ung-ho`: danh sách người ủng hộ, tổng theo người, cấp/thu nhãn 4 bậc (ngưỡng ⛔ 👤 chốt; "Tiểu thần tiên" chỉ gắn tay), nhật ký ai cấp; nhãn hiển thị cạnh tên (hồ sơ, bình luận) với màu/hoạ tiết/hiệu ứng riêng (CSS, reduced-motion). Schema qua agent data-schema.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Chỉ OWNER + TOTP; test quyền fail-closed; tương phản mọi nhãn ở 2 chế độ                                                                 |
| **ECO1-f2** | Minh bạch ủng hộ (mục 1.9): `/ung-ho/thong-ke` (+ `/ung-ho/<slug>` theo dự án) - ISR, chỉ dữ liệu ĐÃ XÁC NHẬN và người ủng hộ cho phép hiện (mặc định: tên ẩn danh "Người ủng hộ #N", số tiền + ngày vẫn công khai để tổng khớp); API công khai `GET /api/ung-ho/public?app=` (cache, không lộ email/mã CK). Trang quản lý `/admin/ung-ho`: bộ lọc (dự án, kênh, trạng thái, khoảng ngày, nhãn), sửa tên hiển thị/ẩn/hiện, gán lại dự án, ghi chú đối soát, ảnh bill/biên lai (R2 bucket RIÊNG TƯ - ⛔ cùng việc 👤 tạo bucket như UX1-c; chỉ OWNER xem qua presign GET ngắn hạn, EXIF xoá phía trình duyệt), công tắc công khai theo dự án, xuất CSV (chống CSV injection: tiền tố `'` cho ô bắt đầu `= + - @`), nhật ký mọi thao tác (ai, lúc nào, trước/sau). Yêu cầu sửa/ẩn từ người ủng hộ: biểu mẫu trên trang công khai ⇒ hàng chờ ở trang quản lý. | Test quyền fail-closed; trang công khai không lộ dữ liệu cá nhân (test quét JSON); tổng công khai = tổng đã xác nhận được phép công khai |
| **ECO1-g**  | Toàn hệ: (1) đề xuất tsudev-standards quy tắc "modal xác nhận trước khi mở trình duyệt" + nút Ủng hộ chuẩn + bỏ cổng Pro; (2) phiếu cho từng repo app (ListAgents → SendMessage) gỡ cổng Pro trong app, thêm modal, trỏ "Ủng hộ" về `/ung-ho?app=<slug>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Mỗi repo nhận phiếu, ghi trong bảng mục 6                                                                                                |

## 4. Câu hỏi còn mở cho 👤 (hỏi ở đầu phase liên quan)

- ECO1-c: điền `docs/ho-so-tac-gia.md`; có ảnh chân dung không?
- ECO1-d: URL GitHub Sponsors / Ko-fi / PayPal.me sau khi đăng ký.
- ECO1-f2: mặc định công khai tên hay ẩn danh (đề xuất: ẩn danh, người ủng hộ tự bật hiện tên); có công khai SỐ TIỀN
  từng người không (đề xuất: có, để tổng khớp - hoặc chỉ hiện khoảng tiền).
- ECO1-f: ngưỡng tiền cho "Mạnh thường quân" / "Đại gia" (đề xuất: < 200.000 ₫ / 200.000-1.000.000 ₫, "Triệu phú" >
  1.000.000 ₫ cộng dồn); nhãn công khai mặc định hay người ủng hộ tự chọn hiện/ẩn (đề xuất: tự chọn - quyền riêng tư).

## 5. Phiếu sang repo khác (đã/ sẽ gửi)

| Repo                                           | Việc                                                                                                                                                                                                            | Trạng thái                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| tsutramon (`~/projects/tsudev-trafficmonitor`) | Trang "Bản quyền": tác giả, đồng tác giả (tác giả gốc TrafficMonitor), contributors repo gốc + fork, các phiên bản                                                                                              | gửi 25/11 (tsudev-7d)                    |
| tsufiles (`~/projects/tsufiles`)               | Như trên (`files.tsudev.com/ban-quyen`), contributors repo gốc + tsufiles                                                                                                                                       | gửi 25/11 (tsudev-7d)                    |
| lotus-share (`~/projects/lotus-share`)         | Như trên                                                                                                                                                                                                        | gửi 25/11 (tsudev-7d)                    |
| Mọi repo app                                   | Modal trước khi mở trình duyệt, gỡ cổng Pro, nút Ủng hộ, trang "Ủng hộ" trên website dự án hiển thị danh sách người ủng hộ TỪ tsudev.com (không giữ dữ liệu riêng; công tắc công khai do tsudev.com điều khiển) | ECO1-g (sau ECO1-f2 - cần API công khai) |

## 6. Kết quả xử lý (mỗi phase một dòng)

- 25/11/2026 - tsudev-7d: mở phiếu; 👤 chốt 4 điểm (mở khoá Pro cho mọi người + trang quản lý nhãn ủng hộ; 4 kênh
  donate; SmartScreen sang `/docs`; contributors qua GitHub API). Bổ sung cùng ngày: mục 1.9 + phase ECO1-f2
  (thống kê công khai + quản lý tập trung người ủng hộ). Phase kế tiếp: **ECO1-a**.
