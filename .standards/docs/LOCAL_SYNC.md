# ĐỒNG BỘ TRỰC TIẾP GIỮA THIẾT BỊ - TSU LINK (Wi-Fi nội bộ, Bluetooth, mã QR) (v1.0.1)

> **Bắt buộc cho mọi sản phẩm TsuDEV có dữ liệu người dùng** (chủ dự án 25/11/2026, bộ quy ước v7.0.0). Dữ liệu,
> tệp, cài đặt của người dùng **không bao giờ** rời thiết bị để lên internet, máy chủ TsuDEV hay tài khoản của nền
> tảng thứ ba (Google, Apple, GitHub, Microsoft...). Muốn có dữ liệu ở hai thiết bị ⇒ hai app đang mở trên hai thiết bị
> nói chuyện **trực tiếp** qua cùng mạng Wi-Fi/Ethernet, ghép đôi bằng mã QR hoặc so mã số, Bluetooth chỉ để ghép đôi.
> Ký hiệu `MUST`/`SHOULD`/`MAY` theo RFC 2119. Liên quan: [`APP_INTEGRITY.md`](APP_INTEGRITY.md),
> [`PRODUCT_POLICY.md`](PRODUCT_POLICY.md) mục 7, [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md).

| Mục | Giá trị |
| :-- | :-- |
| **Phiên bản** | 1.0.1 - bộ quy ước v7.0.1 (25/11/2026): sửa công thức mã 6 chữ số (20 bit cho tới 7 chữ số), thứ tự nonce |
| **Nền tảng kỹ thuật** | Giao thức **Lotus v2** của Lotus Share (`tsudev-org/lotus-share` `docs/GIAO-THUC-LOTUS-V2.md`): khám phá multicast, TLS hai chiều, ghim vân tay chứng thư, đã kiểm thật nhiều nền tảng. Tsu Link dùng lại và **siết thêm** (mục 2) |
| **Thay thế** | Đồng bộ/sao lưu đám mây (TsuDEV Sync, quyền lợi Pro Q3 cũ) - bỏ từ v7.0.0 |
| **Chi phí** | 0 đồng: không máy chủ, không băng thông internet |

## 1. Luật cứng

| # | Luật |
| :-: | :-- |
| L1 | **Không đi qua internet.** Không máy chủ trung gian, không relay, không STUN/TURN công cộng (kể cả của Google), không API lưu trữ đám mây (Drive, iCloud, OneDrive, Dropbox, GitHub Gist...). Chỉ địa chỉ mạng nội bộ (RFC 1918, link-local, IPv6 ULA/link-local); địa chỉ công cộng ⇒ từ chối kết nối. |
| L2 | **Ghép đôi bắt buộc.** Chỉ thiết bị đã ghép đôi (mục 3) mới đồng bộ được; thiết bị lạ khám phá được nhưng bị bỏ qua. Không có chế độ "tự nhận từ mọi thiết bị". |
| L3 | **Mã hoá + xác thực hai chiều.** TLS 1.3 hai chiều (mTLS), cả hai bên ghim vân tay chứng thư đã ghép đôi. **Không có chế độ `http`** (khác Lotus Share mục 5.2). |
| L4 | **Chỉ nghe khi người dùng mở màn đồng bộ.** Cổng TCP mở khi màn "Đồng bộ thiết bị" đang mở; tự đóng sau 10 phút không hoạt động hoặc khi rời màn. Không dịch vụ nền nghe thường trực. |
| L5 | **Cùng phiên bản.** Hai app `MUST` đều qua cổng phiên bản (`APP_INTEGRITY.md` mục 2); khác lược đồ dữ liệu ⇒ từ chối, nhắc cập nhật. |
| L6 | **Miễn phí cho mọi người.** Không tốn máy chủ ⇒ không phải quyền lợi Pro (`PRODUCT_POLICY` 7.1 N7). |
| L7 | **Thư viện chung, không tự viết lại.** Mọi repo dùng thư viện `tsulink` (mục 8); không tự cài đặt mật mã/giao thức. |

## 2. Danh tính thiết bị và vận chuyển

- Mỗi bản cài sinh **một cặp khoá ECDSA P-256** (hoặc Ed25519 nơi thư viện TLS hỗ trợ) và chứng thư X.509 tự ký, giữ
  trong kho khoá của nền tảng (AndroidKeyStore, Keychain, DPAPI/CNG, Secret Service); không xuất được nếu nền tảng cho
  phép. Không dùng RSA 2048 cho Tsu Link (Lotus Share giữ RSA của mình để tương thích ngược).
- **Vân tay** = SHA-256 chứng thư DER, hex chữ HOA 64 ký tự (giống Lotus v2 mục 5.1).
- Vận chuyển: TLS 1.3 (rustls), ALPN `tsulink/1`, mTLS bắt buộc, cả hai bên so vân tay đối phương với danh sách đã ghép
  đôi; khác ⇒ đóng kết nối, ghi nhật ký cục bộ.
- Khám phá: dùng chung multicast Lotus v2 (`224.0.0.168:53420`, `ff12::1075:5ea0`, mở socket với `SO_REUSEADDR`/
  `SO_REUSEPORT` như Lotus v2 mục 6), thêm trường `tsulink: {"app": "<ma-san-pham>", "v": 1}`; mỗi app một cổng TCP riêng
  (khai trong trường `port`), không chiếm 53420. Mạng chặn multicast ⇒ dùng địa chỉ trong mã QR (mục 3).

## 3. Ghép đôi (một lần cho mỗi cặp thiết bị, mỗi app)

| Cách | Khi nào | Nội dung |
| :-- | :-- | :-- |
| **Mã QR** (mặc định) | Một bên có camera (điện thoại ↔ máy tính) | Thiết bị A hiện QR `tsulink:1?app=<ma>&fp=<vân tay A>&a=<IP:cổng>[,<IP:cổng>]&t=<mã ghép đôi 128 bit base64url>&exp=<unix>`. B quét, mở mTLS tới A (ghim `fp`), gửi `t`. A kiểm `t` (một lần, hạn **120 giây**), lưu vân tay B; B lưu vân tay A |
| **So mã số** | Hai máy không có camera (PC ↔ PC) | Hai bên kết nối mTLS tạm, mỗi bên gửi nonce 16 byte ngẫu nhiên; cùng hiện **6 chữ số** = (4 byte đầu, big-endian, của SHA-256(`tsulink-sas|` ‖ vân tay nhỏ hơn ‖ vân tay lớn hơn ‖ nonce của bên vân tay nhỏ ‖ nonce của bên vân tay lớn)) mod 1 000 000, đủ 6 chữ số (như so số của Bluetooth; "nhỏ/lớn" theo thứ tự byte của chuỗi hex chữ HOA). Vector: `tsulink` `conformance/sas-vector-1.txt`. Người dùng xác nhận trùng trên CẢ HAI máy. Lệch ⇒ huỷ |
| **Bluetooth LE** (`MAY`) | Không cùng Wi-Fi ngay lúc đó / tiện hơn quét QR | Trao đúng nội dung QR qua một đặc tính GATT, rồi vẫn so 6 chữ số. **Không** chuyển dữ liệu người dùng qua BLE (băng thông thấp, nền tảng desktop hỗ trợ không đều) |

- Giới hạn: tối đa 5 lần ghép đôi sai/10 phút ⇒ khoá 10 phút. Danh sách thiết bị đã ghép đôi xem/xoá được trong Cài đặt;
  thiết bị không đồng bộ 180 ngày ⇒ tự gỡ.
- Màn ghép đôi nói rõ: dữ liệu đi thẳng giữa hai thiết bị trong cùng mạng, không qua internet.

## 4. Giao thức đồng bộ dữ liệu

- **Mô hình dữ liệu**: CRDT để hai máy sửa ngoại tuyến rồi gộp không mất dữ liệu: **Automerge** (Rust crate
  `automerge`, MIT) cho tài liệu/cây; bảng bản ghi dùng LWW theo **đồng hồ logic lai (HLC)** + bia mộ cho bản ghi xoá.
  Mỗi repo ghi ADR chọn mô hình và quy tắc xung đột của mình.
- **Trao đổi**: giao thức đồng bộ của Automerge (bloom filter + thay đổi còn thiếu) hoặc trao "HLC cao nhất đã thấy" cho
  bảng; gửi phần thay đổi (delta), lặp lại không tạo bản sao (idempotent).
- **Tệp**: chia khối 1 MiB, mỗi khối kiểm BLAKE3, nối lại khi đứt giữa chừng; tệp hoàn tất mới thay thế bản cũ (ghi ra
  tệp tạm rồi đổi tên nguyên tử).
- **Phiên bản lược đồ**: bắt tay trao `schema_version`; khác ⇒ dừng, nhắc cập nhật (L5).
- Mọi thao tác chạy ở luồng nền/isolate; giao diện hiện tiến độ, huỷ được; đứt mạng không làm hỏng dữ liệu cục bộ.

## 5. Nền tảng

| Nền tảng | Trạng thái |
| :-- | :-- |
| Android, Windows, Linux, macOS | Đầy đủ (Lotus v2 đã chạy trên các nền tảng này). Android 13+: quyền `NEARBY_WIFI_DEVICES` khi cần; Windows: tường lửa hỏi lần đầu - giải thích trước khi bật |
| iOS/iPadOS app gốc (sau H1 02/2027) | `NSLocalNetworkUsageDescription`, `NSBonjourServices`, quyền multicast của Apple (H7 `APPLE_CICD.md`) như lotus-share |
| iPhone/iPad bản web/PWA (trước 02/2027) | Trình duyệt không mở cổng nghe, không multicast. Hướng thử: WebRTC DataChannel chỉ dùng ứng viên `host` (`iceServers: []`, không STUN/TURN), trao offer/answer qua mã QR hai chiều trong cùng Wi-Fi. **Thử nghiệm** - phải chạy thật trên Safari iOS (ứng viên mDNS `.local`) trước khi hứa với người dùng; chưa đạt ⇒ chỉ có "Xuất/nhập tệp" (mục 9) |
| Web (máy tính) | Như PWA; app desktop cùng sản phẩm `SHOULD` là đầu kia |

## 6. Bảo mật dữ liệu tại chỗ

- Dữ liệu D2+ (`SECURITY_BASELINE` mục 2) mã hoá khi lưu: SQLCipher/khoá trong kho khoá nền tảng; web dùng khoá
  WebCrypto không xuất được.
- Nhật ký đồng bộ chỉ ghi: thời điểm, vân tay rút gọn, số bản ghi; không ghi nội dung.
- Ứng dụng có khoá app (PIN/sinh trắc) ⇒ màn đồng bộ đòi mở khoá trước.

## 7. Đăng nhập tài khoản không mang dữ liệu

Tài khoản tsudev.com (và đăng nhập qua Google/GitHub/Apple) chỉ để: định danh người dùng, ghi nhận đóng góp/ủng hộ và
quyền lợi Pro, ghi nhận app đã dùng, chống lạm dụng/truy cập trái phép (`PRODUCT_POLICY` 7.7). **Không** dùng tài khoản
để chuyển hay lưu dữ liệu người dùng. Không xin quyền Drive/iCloud/Photos/Contacts của nhà cung cấp.

## 8. Thư viện `tsulink`

- Repo mới `tsudev-org/tsulink` (công khai, OPEN): crate Rust tách từ lõi Lotus v2 (`lotus-share/packages/core`):
  khám phá, mTLS + ghim, ghép đôi QR/so mã số, khung đồng bộ CRDT, truyền tệp; vector kiểm thử chéo.
- Ràng buộc: Flutter qua `flutter_rust_bridge` (như lotus-share); .NET qua C ABI; Tauri dùng trực tiếp; web/PWA một gói
  TypeScript `@tsudev/link` (WebRTC, mục 5).
- Giao diện chung: màn "Đồng bộ thiết bị" (QR, quét QR, so mã số, danh sách thiết bị đã ghép đôi, tiến độ) trong
  `tsudev_ui` / `@tsudev/ui` - repo không tự vẽ khác.
- Lotus Share vẫn là app chuyển tệp; Tsu Link dùng chung khám phá để hai app chạy cạnh nhau (Lotus v2 mục 6).

## 9. Sao lưu và mang dữ liệu đi (miễn phí, thay sao lưu đám mây)

- **Xuất dữ liệu**: định dạng mở (CSV/JSON + tệp gốc) trong một tệp `.tsubak` (zip) do người dùng chọn nơi lưu.
- Mã hoá tuỳ chọn (mặc định BẬT cho dữ liệu D2+): libsodium `crypto_secretstream_xchacha20poly1305`, khoá suy bằng
  Argon2id ≥ 64 MiB / 3 lượt từ mật khẩu chuẩn hoá NFKC - giữ nguyên bộ mật mã và vector đối chiếu chéo 4 ngôn ngữ của
  TsuDEV Sync cũ (`PRODUCT_POLICY` v1.4 mục 7.4) để không viết lại.
- Nút **Xuất dữ liệu** luôn có ở Cài đặt và ở modal khoá/không chính thức (`APP_INTEGRITY.md` I6).

## 10. Kiểm thử bắt buộc

- Ghép đôi: QR đúng ⇒ thành công; QR hết hạn/dùng lại ⇒ từ chối; vân tay giả (MITM với chứng thư khác) ⇒ đóng kết nối;
  so mã số lệch ⇒ huỷ; quá 5 lần sai ⇒ khoá.
- Địa chỉ công cộng ⇒ từ chối (L1); máy chưa ghép đôi ⇒ bị bỏ qua (L2); không có đường `http` (L3); cổng đóng khi rời màn (L4).
- CRDT: hai máy sửa cùng bản ghi ngoại tuyến ⇒ gộp đúng quy tắc ADR; xoá + sửa đồng thời; đứt giữa chừng ⇒ nối lại, không
  nhân đôi; lược đồ khác ⇒ dừng.
- `.tsubak`: xuất rồi nhập lại trên máy khác bằng đúng mật khẩu ⇒ khớp từng byte; sai mật khẩu ⇒ lỗi rõ, không hỏng dữ liệu.

## 11. Triển khai

Phiếu toàn hệ `20261125-SYN1`: (1) gỡ đồng bộ đám mây khỏi mọi repo + lưu trữ (archive) `tsudev-org/tsusync`;
(2) `tsulink` từ lõi Lotus v2; (3) màn chung trong `tsudev_ui`/`@tsudev/ui`; (4) từng app theo đợt ≤ 3 repo, pilot là
app có dữ liệu nhiều nhất (qulythuchi).
