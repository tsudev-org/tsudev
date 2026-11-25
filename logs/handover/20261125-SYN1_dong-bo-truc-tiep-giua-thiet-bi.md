# PHIẾU ĐIỀU PHỐI SYN1 - Dữ liệu chỉ ở thiết bị: bỏ đồng bộ đám mây + Pro Q3, đồng bộ trực tiếp Tsu Link

- **Mã phiếu**: 20261125-SYN1 - **Từ**: điều phối `projects-05`, 25/11/2026 - **Trạng thái**: MỞ
- **Quyết định chủ dự án (25/11/2026)**: không đồng bộ/di chuyển/gửi dữ liệu người dùng lên internet hay tài khoản của
  nền tảng thứ ba; đồng bộ giữa hai thiết bị bằng cùng Wi-Fi/Bluetooth/mã QR khi hai app đang mở; **bỏ hẳn Pro Q3**;
  đăng nhập bên thứ ba chỉ để định danh, ghi nhận đóng góp/ủng hộ/sản phẩm đã dùng, chống lạm dụng.
- **Chuẩn**: tsudev-standards **v7.0.0** `docs/LOCAL_SYNC.md`, `PRODUCT_POLICY.md` v2.0.0 mục 7 (đọc HẾT).
- **Liên quan**: `20261125-INT1`, `20261125-PRO3` (Pro còn Q1, Q2), `20261124-DK2` (hồ sơ BCT phải khớp trang mới).

## 0. Mọi agent MUST đọc

1. 0 byte dữ liệu người dùng ra internet ở mọi gói (đo bằng proxy). Không API Drive/iCloud/OneDrive/Dropbox/GitHub; không
   STUN/TURN công cộng.
2. Đồng bộ = thư viện `tsulink` (Rust, từ lõi Lotus v2) + màn chung trong `tsudev_ui`/`@tsudev/ui`; không tự viết mật mã.
3. Ghép đôi bắt buộc (QR 120 giây / so 6 chữ số / BLE), mTLS 1.3 ghim vân tay, không chế độ `http`, chỉ nghe khi mở màn.
4. Sao lưu = xuất `.tsubak` (mã hoá tuỳ chọn, dùng lại bộ mật mã + vector của TsuDEV Sync cũ).
5. Pro chỉ còn Q1 huy hiệu + Q2 giao diện; điều khoản 7.5 và nhắc 7.6 đổi nguyên văn; bỏ thông báo 7.3.

## 1. Việc theo repo

| Đợt | Repo                                                                                           | Việc SYN1                                                                                                                                                                                                                                                                                                                                                                                  |
| :-: | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|  1  | **tsudev** (tsudev.com)                                                                        | `/pro`, `/terms`, `/chinh-sach-thanh-toan` bỏ "đồng bộ/sao lưu đám mây", điều khoản nguyên văn 7.5 mới, `PAYMENT_DOC_DATES`; `/privacy` theo bảng 7.7 (Luật BVDLCN 91/2025/QH15) + nút xoá tài khoản; OAuth Google/GitHub/Apple chỉ `openid email profile` (`read:user user:email`); trang `/apps` bỏ mọi chữ "đồng bộ đám mây". **Đổi trang bán ⇒ báo điều phối để in lại PDF hồ sơ BCT** |
|  1  | **lotus-share**                                                                                | Tách lõi khám phá + mTLS + ghim (`packages/core`) thành crate dùng được bên ngoài; giữ tương thích Lotus v2 (Tsu Link thêm trường `tsulink`, không đổi hành vi Lotus Share)                                                                                                                                                                                                                |
|  1  | **tsulink** (repo MỚI `tsudev-org/tsulink`, OPEN)                                              | Crate Rust: khám phá, ghép đôi QR/SAS/BLE, mTLS 1.3 P-256, khung CRDT (Automerge + HLC), truyền tệp khối BLAKE3, `.tsubak`; bindings Flutter (`flutter_rust_bridge`), C ABI (.NET), Tauri; gói TS `@tsudev/link` (WebRTC host-only, thử nghiệm Safari iOS); test mục 10 `LOCAL_SYNC.md`. Tạo repo trong `tsudev-org` (không dùng tên cấm ở `~/.claude/CLAUDE.md`) - 👤 duyệt tạo repo      |
|  1  | **tsudev-ui-flutter**                                                                          | Màn "Đồng bộ thiết bị" (QR, quét QR, so mã số, danh sách thiết bị, tiến độ) dùng `tsulink`; bỏ `ProBenefit.cloudSync`, `ProNotice*`; đổi nguyên văn 7.5/7.6 (`ProPurchaseSheet`, `ProRenewal*`)                                                                                                                                                                                            |
|  1  | **tsusync**                                                                                    | Không deploy. README: "Đã ngừng từ 25/11/2026 - xem LOCAL_SYNC.md"; giữ vector mật mã (chuyển sang `tsulink`); rồi **lưu trữ (archive)** repo - 👤 duyệt archive                                                                                                                                                                                                                           |
|  2  | **qulythuchi** (PILOT - nhiều dữ liệu nhất)                                                    | Gỡ `lib/sync/*`, `attachments/file_sync.dart`, máy chủ đồng bộ riêng (nếu đã chạy: xoá dữ liệu thử nghiệm), `pro_block` cho đồng bộ; thêm Tsu Link (ADR quy tắc xung đột bảng thu chi) + `.tsubak`                                                                                                                                                                                         |
|  2  | **sound-db**                                                                                   | Gỡ `lib/sync/sync_service.dart` + Pro sync; Tsu Link cho bản ghi đo (nếu cần) + `.tsubak`                                                                                                                                                                                                                                                                                                  |
|  2  | tsuscan, app-la-ban, tsufiles, tsuswico, tsucwico, tsucontact, tsutramon, tsudisk, TsuGameLabs | Rà: không có đường gửi dữ liệu người dùng ra ngoài (kể cả báo cáo/telemetry); có dữ liệu cần mang sang máy khác ⇒ Tsu Link hoặc ít nhất `.tsubak`; README/website bỏ chữ "đồng bộ đám mây"                                                                                                                                                                                                 |
|  -  | Không áp dụng                                                                                  | Repo UBND/xanuicam, b4djl1h-cmdb, mieubathuong, homebrew-tap, scoop-bucket, linux-packages                                                                                                                                                                                                                                                                                                 |

## 2. Việc 👤 chủ dự án

1. ~~Duyệt + gộp PR tsudev-standards #85 (v7.0.0)~~ ✅ 25/11/2026.
2. ~~Duyệt tạo repo `tsudev-org/tsulink` và archive `tsudev-org/tsusync`~~ ✅ 25/11/2026 (điều phối làm)
3. Sau khi tsudev đổi trang: xem lại `/pro`, `/terms`, `/chinh-sach-thanh-toan`, `/privacy` trước khi nộp BCT.

## 3. Bảng theo dõi

| Repo               | Gỡ đám mây                         | Tsu Link / `.tsubak` | Trang/README | PR / ghi chú      |
| ------------------ | ---------------------------------- | -------------------- | ------------ | ----------------- |
| tsudev-standards   | ✅ v7.0.0 (PR #85, Release v7.0.0) | ✅ LOCAL_SYNC v1.0.0 | -            |                   |
| tsudev             | ⬜                                 | -                    | ⬜           | trước khi nộp BCT |
| tsulink (mới)      | -                                  | ⬜                   | -            | chờ 👤 tạo repo   |
| lotus-share        | -                                  | ⬜ tách lõi          | -            |                   |
| tsudev-ui-flutter  | ⬜                                 | ⬜ màn chung         | -            |                   |
| tsusync            | ⬜ archive                         | -                    | ⬜           |                   |
| qulythuchi (pilot) | ⬜                                 | ⬜                   | ⬜           |                   |
| sound-db           | ⬜                                 | ⬜                   | ⬜           |                   |
| các repo còn lại   | ⬜ rà                              | ⬜                   | ⬜           |                   |

## 4. Điều kiện đóng

Mọi hàng mục 3 xong; đo bằng proxy: 0 byte dữ liệu người dùng ra internet ở mọi app; pilot qulythuchi đồng bộ được giữa
điện thoại Android và PC Windows qua Wi-Fi bằng QR (👤 thử thật); không còn chữ "đồng bộ/sao lưu đám mây" ở nội dung
công khai (grep toàn hệ).

## 5. Kết quả xử lý

- 25/11/2026 - projects-05: mở phiếu; tsudev-standards v7.0.0 PR #85. Chủ dự án gộp #85; bản sao phát vào `logs/handover/` của các repo (chưa commit - phiên repo tự commit).
- 26/11/2026 - tsudev: đợt 1 phần tsudev.com xong ở #403 (`deploy-2026.11.26.1`, Worker `8cd67527`): `.standards` v7.0.0;
  `/pro` chỉ Q1 + Q2; điều khoản 7.5 + nhắc gia hạn 7.6 (web và thư) nguyên văn v2.0.0, thư nhắc bỏ hai mốc "trước khi
  xoá bản sao đám mây"; `/privacy` mục "Đăng nhập tài khoản và dữ liệu trong ứng dụng" (neo `#dang-nhap`) theo bảng 7.7,
  nhật ký tối đa 12 tháng, lối xoá tài khoản tự phục vụ `/settings/security#xoa-tai-khoan`; OAuth ghim phạm vi
  `read:user user:email` / `openid email profile`; `/terms` giấy phép mở chỉ cho dự án OPEN. Test canh
  `apps/frontend-main/test/syn1NoCloud.test.ts`. Giữ (MAY, 7.4): kênh `POST /api/rp/entitlements/status` và ủy quyền
  `statusDelegateFor` của client `tsusync` - gỡ khi tsusync đã lưu trữ và không còn ai gọi.
  ⇒ **Điều phối: trang bán `/pro` đổi ⇒ in lại PDF hồ sơ BCT.** `PAYMENT_DOC_DATES` không đổi (trang chính sách thanh
  toán không nhắc đồng bộ); `TERMS_DOC_DATES`/`PRIVACY_DOC_DATES` cập nhật 26/11/2026.
