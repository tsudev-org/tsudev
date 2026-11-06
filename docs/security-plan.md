# Kế hoạch an toàn thông tin tsudev (từ 05/11/2026)

> Kế hoạch tổng thể để bảo vệ **tệp phát hành, dữ liệu và tài khoản** của tsudev,
> kèm thiết kế **Trung tâm an ninh phát hành** - trang quản trị theo dõi, kiểm
> tra và xử lý mọi tệp phần mềm trên hệ thống. Soạn sau khi rà mã nguồn tsudev và
> các tài liệu bảo mật của các dự án khác trên cùng máy (mục 9).

## 0. Nguyên tắc - đọc trước

1. **Không có "an toàn tuyệt đối".** Mục tiêu đúng là: mọi tài sản có lớp bảo vệ
   phù hợp với giá trị của nó, mọi lớp đều **đo được**, và khi một lớp thủng thì
   có lớp khác chặn và có dấu vết để biết. Mỗi hạng mục dưới đây có tiêu chí
   nghiệm thu bằng con số hoặc phép thử, không bằng tính từ.
2. **Phòng thủ nhiều lớp, quyết định ở máy chủ.** Kiểm tra ở trình duyệt chỉ là
   trải nghiệm; mọi cổng thật nằm ở service (`requireAdmin`, `requireRole`, đọc vai
   trò từ DB, fail closed).
3. **Hạ tầng 0 đồng là ràng buộc thật** (`docs/free-tier.md`). Giải pháp tốn phí
   (WAF trả phí, SIEM thương mại, SMS) chỉ được đề xuất kèm lý do và phương án 0đ.
4. **Tài sản quan trọng nhất là niềm tin vào tệp tải về.** Một kẻ tấn công thay
   được tệp `.exe` trên tsudev là gây hại cho MỌI người tải - nặng hơn mọi sự cố
   khác của site. Thứ tự ưu tiên của kế hoạch đi theo điều này.

## 1. Tài sản cần bảo vệ

| Tài sản                                                                 | Nằm ở đâu                                                 | Mất/lộ thì sao                                                        |
| ----------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| Khoá ký bản phát hành Ed25519 (`RELEASE_SIGNING_KEY`)                   | Render env                                                | Kẻ tấn công ký được tệp giả mà người dùng kiểm chữ ký vẫn thấy hợp lệ |
| Tệp phát hành                                                           | R2 bucket `tsudev` (riêng tư, tải qua presign GET 5 phút) | Phân phối mã độc dưới tên tsudev                                      |
| Tài khoản OWNER/ADMIN                                                   | DB `User` + phiên next-auth                               | Toàn quyền nội dung, dự án, tệp phát hành, tài khoản                  |
| `TOTP_ENCRYPTION_KEY`, `INTERNAL_IDENTITY_SECRET`, `INTERNAL_API_TOKEN` | Render + Cloudflare secrets                               | Giả danh tính giữa BFF và service; giải mã bí mật 2FA                 |
| Database Neon                                                           | Neon (Postgres 18)                                        | Lộ email, băm mật khẩu, nhật ký bảo mật                               |
| Tài khoản hạ tầng (GitHub, Cloudflare, Render, Neon)                    | Bên ngoài repo                                            | Chiếm toàn bộ chuỗi phát hành                                         |
| Mã nguồn + CI                                                           | GitHub (repo Public từ 21/08/2026)                        | Chèn mã độc vào bản dựng                                              |

## 2. Hiện trạng đo được (05/11/2026)

### 2.1 Đã có và đang chạy

| Lớp                     | Cơ chế                                                                                                              | Bằng chứng                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Toàn vẹn tệp            | SHA-256 do MÁY CHỦ tính khi niêm phong; client khai sha256/chữ ký ⇒ 400                                             | `docs/release-signing.md`, test `projectRelease` |
| Xác thực nguồn gốc      | Chữ ký Ed25519 (Rust→WASM), JWKS công khai, vòng xoay khoá có `RETIRED`                                             | JWKS kid `tsu-2026-08-efdb94`                    |
| Lưu trữ tệp             | Bucket R2 riêng tư; tải qua presign GET 5 phút; CORS chỉ 2 origin                                                   | preflight 204/403 (phiên 34)                     |
| Mật khẩu                | Argon2id, chỉ auth-service đọc `passwordHash`                                                                       | `docs/auth.md` §4                                |
| Đa yếu tố               | TOTP (bí mật mã hoá bằng `TOTP_ENCRYPTION_KEY`) + passkey                                                           | auth-service                                     |
| Phân quyền              | MỘT nguồn: `User.role` trong DB, fail closed; OWNER chỉ cấp bằng seed                                               | `requireRole`, test useradmin                    |
| Phiên                   | `sessionVersion` thu hồi được mọi phiên                                                                             | `packages/auth`                                  |
| Ranh giới service       | `INTERNAL_API_TOKEN` + khẳng định danh tính ký HMAC                                                                 | `@tsudev/identity-token`                         |
| Header                  | CSP băm + nonce (không `unsafe-inline` cho script), HSTS preload, `X-Frame-Options: DENY`, `frame-ancestors 'none'` | `proxy.ts`, `csp.test.ts`                        |
| Giới hạn tần suất       | Cửa sổ trượt theo IP ở cả ba service                                                                                | `@tsudev/ratelimit`                              |
| Xoá                     | Chỉ xoá mềm; xoá cứng bị trigger Postgres chặn                                                                      | migration, test `softDelete`                     |
| Nhật ký                 | `SecurityEvent` (đăng nhập, 2FA, đổi mật khẩu...), `TrustAuditLog` (quản trị)                                       | `/admin/security`                                |
| Lộ cấu hình dev ra prod | `deploy-frontend.js` dời `.env.local` khi dựng                                                                      | nghiệm thu `/api/auth/providers`                 |

### 2.2 Đã VÁ trong phiên 34 (05/11/2026)

| Vấn đề                                                                                                                    | Mức                      | Sửa                                                          |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------ |
| Next.js 16.3.3: RCE trong `next/og`, **đầu độc cache ISR** (7 trang công khai là ISR)                                     | Critical                 | Next 16.4.5 + OpenNext 1.20.16                               |
| `proxy-addr`: giả IP qua IPv4-mapped IPv6                                                                                 | Critical                 | `express` 4.22.3                                             |
| `body-parser`, `sharp`, `source-map-js`: DoS / lỗ hổng librsvg                                                            | High                     | `npm audit fix`                                              |
| `@simplewebauthn/server`: kiểm attestation chưa đủ                                                                        | Low                      | 13.3.3                                                       |
| BFF lấy IP từ phần tử ĐẦU của `X-Forwarded-For` - người gửi tự đặt được trên Cloudflare ⇒ vượt giới hạn đăng nhập theo IP | High                     | `lib/clientIp.ts` đọc `CF-Connecting-IP`, có test quét nguồn |
| Nội dung rác của Toà soạn AI không gỡ được qua giao diện                                                                  | Thấp (toàn vẹn nội dung) | `/admin/content`, ẩn hàng loạt có nhật ký                    |

Kết quả: `npm audit --omit=dev` = **0 lỗ hổng** (trước: 7, gồm 2 critical, 3 high).

### 2.3 Khoảng trống còn lại

| #   | Khoảng trống                                                                                                                                          | Rủi ro thật                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| G1  | CI **không có** quét bảo mật nào: không gitleaks, không SCA tự động, không SAST                                                                       | Lỗ hổng phụ thuộc sống nhiều tuần mà không ai biết - đúng chuyện vừa xảy ra với Next.js |
| G2  | `main` **không có** branch protection (repo Public đã cho phép bật)                                                                                   | Một push nhầm/độc vượt mọi review; lớp chắn duy nhất là hook local                      |
| G3  | Tải tệp phát hành: URL presign PUT **không giới hạn kích thước**, `contentType` do client khai, không kiểm đuôi tệp hay chữ ký nhị phân (magic bytes) | Đẩy tệp sai loại/khổng lồ; tệp `.apk` thực chất là thứ khác                             |
| G4  | Không quét mã độc cho tệp phát hành                                                                                                                   | Máy dev bị nhiễm ⇒ tsudev phát tán mã độc có chữ ký hợp lệ                              |
| G5  | Không kiểm lại toàn vẹn ĐỊNH KỲ: sha256 chỉ tính một lần lúc niêm phong                                                                               | Tệp bị thay trong R2 (lộ khoá S3) không ai phát hiện                                    |
| G6  | ADMIN/OWNER **không bị ép** bật 2FA                                                                                                                   | Lộ mật khẩu = mất toàn quyền                                                            |
| G7  | Không xác thực lại (step-up) cho thao tác nguy hiểm: công bố/thu hồi tệp, đổi vai trò                                                                 | Phiên bị chiếm (XSS, máy bỏ quên) = thao tác ngay                                       |
| G8  | `TrustAuditLog` sửa/xoá được ở cấp DB                                                                                                                 | Kẻ chiếm DB xoá dấu vết                                                                 |
| G9  | Bộ đếm giới hạn tần suất nằm trong RAM của một tiến trình                                                                                             | Khởi động lại là reset; nhiều bản chạy là ngưỡng nhân lên                               |
| G10 | 38 lỗ hổng ở phụ thuộc CHỈ dùng khi phát triển (Storybook, công cụ dựng)                                                                              | Không chạy trên prod, nhưng chạy trên máy dev và CI - chuỗi cung ứng                    |
| G11 | Khoá ký chỉ có một bản trong Render env; chưa có bản sao lưu ngoại tuyến được kiểm                                                                    | Mất Render = mất khoá = mọi chữ ký cũ không còn ai xoay được có kế hoạch                |
| G12 | Bản dump DB (`~/tsudev-backups/`) nằm trên máy dev, không mã hoá                                                                                      | Lộ máy dev = lộ dữ liệu người dùng                                                      |

### 2.4 Trạng thái đóng (cập nhật 06/11/2026)

| #      | Trạng thái                                                                                    | Ở đâu                                                                                     |
| ------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| G1     | ĐÓNG phần lớn: gitleaks, npm audit prod, Dependabot, CodeQL, pr-gates                         | `.github/workflows/`; SAST Semgrep còn ở giai đoạn 3                                      |
| G2     | ĐÓNG: 13 check bắt buộc + `strict`                                                            | branch protection `main`                                                                  |
| G3     | ĐÓNG                                                                                          | `docs/release-signing.md` §Siết tải lên                                                   |
| G4     | ĐÓNG ở mã; **chờ chủ dự án đặt `VIRUSTOTAL_API_KEY`** ở Render                                | thiếu khoá ⇒ `CHUA_QUET`, trang báo rõ "chưa quét mã độc"                                 |
| G5     | ĐÓNG ở mã; **chờ đặt `RELEASE_INTEGRITY_TOKEN`** ở Render + Worker                            | cron `23 1,13` ⇒ `POST /api/internal/releases/integrity`; thiếu token ⇒ cron log "BỎ QUA" |
| G6     | ĐÓNG (chỉ TOTP; passkey chưa tính)                                                            | `docs/auth.md` §Khu quản trị bắt buộc TOTP                                                |
| G7     | ĐÓNG: thu hồi/khôi phục/ký lại bản phát hành; đổi vai trò + xoá tài khoản ở `/admin/accounts` | `requireStepUp` (`@tsudev/auth`), `POST /api/identity/step-up`                            |
| G8     | ĐÓNG                                                                                          | migration `20261106120000_an_ninh_phat_hanh`: trigger chỉ-thêm + `prevHash`               |
| G9-G12 | Mở - giai đoạn 3                                                                              | §4                                                                                        |

## 3. Trung tâm an ninh phát hành - `/admin/release-security`

> **Đã dựng 06/11/2026** (B1-B7). Phần dưới là thiết kế; chỗ hiện trạng khác thiết
> kế được ghi ở §3.5.

Trang mà chủ dự án yêu cầu: **theo dõi, giám sát, kiểm tra, cập nhật, thu hồi**
mọi tệp phần mềm trên hệ thống. Thiết kế học từ "Admin SOC Dashboard" của app La
bàn (mục 9) nhưng cắt theo đúng quy mô một người vận hành.

### 3.1 Bảng kê tài sản (Inventory)

Mỗi dòng là một `ProjectRelease`: dự án · phiên bản · kênh · nền tảng · tên tệp ·
kích thước · sha256 (rút gọn, sao chép được) · `signingKid` · ngày niêm phong ·
ngày công bố · lượt tải · **trạng thái an ninh**. Lọc theo dự án, nền tảng, trạng
thái; phân trang theo `DATA_TABLE.md`.

Trạng thái an ninh (tính ở máy chủ, không ở trình duyệt):

| Trạng thái        | Điều kiện                                                                            |
| ----------------- | ------------------------------------------------------------------------------------ |
| `OK`              | đã niêm phong, chữ ký kiểm được bằng JWKS hiện hành, lần kiểm toàn vẹn gần nhất khớp |
| `CHUA_NIEM_PHONG` | có `storageKey` nhưng chưa có sha256 - không công bố được (đã có cổng)               |
| `KHOA_DA_NGHI`    | ký bằng khoá đã chuyển sang `RETIRED` - vẫn hợp lệ nhưng nên ký lại                  |
| `LECH_TOAN_VEN`   | băm lại tệp trong R2 KHÔNG khớp sha256 đã ký ⇒ **báo động đỏ, tự gỡ công bố**        |
| `NGHI_MA_DOC`     | quét mã độc có phát hiện (mục 3.3) ⇒ tự gỡ công bố                                   |
| `DA_THU_HOI`      | chủ dự án thu hồi, kèm lý do                                                         |

### 3.2 Hành động

| Hành động                                                                           | Bảo vệ                                                                             |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Kiểm lại toàn vẹn ngay (băm lại tệp trong R2, so sha256 đã ký)                      | ADMIN                                                                              |
| Thu hồi bản phát hành (ẩn khỏi trang công khai, chặn link tải, giữ tệp để điều tra) | ADMIN + **xác thực lại bằng TOTP/passkey** + lý do bắt buộc                        |
| Khôi phục bản đã thu hồi                                                            | như trên                                                                           |
| Thay tệp (tải tệp mới cho cùng phiên bản)                                           | KHÔNG cho phép - phiên bản đã ký là bất biến; muốn sửa thì phát hành phiên bản mới |
| Ký lại bằng khoá hiện hành (sau xoay khoá)                                          | OWNER + xác thực lại                                                               |
| Xem lịch sử (niêm phong, công bố, kiểm toàn vẹn, thu hồi - ai, lúc nào)             | ADMIN, đọc từ nhật ký chỉ-thêm                                                     |

### 3.3 Cơ chế phía máy chủ

1. **Giới hạn khi tải lên (đóng G3).** `upload-url` nhận `fileSize` và ký nó vào
   URL presign (`ContentLength` trong `PutObjectCommand`) - R2 từ chối mọi PUT có
   kích thước khác. Trần theo nền tảng (ví dụ 2 GB). Đuôi tệp theo danh sách TRẮNG
   từng nền tảng: Windows `.exe .msi .msix .zip`, Android `.apk .aab`, macOS
   `.dmg .pkg .zip`, Linux `.AppImage .deb .rpm .tar.gz`, Source `.zip .tar.gz`.
   `contentType` do máy chủ suy từ đuôi, không nhận từ client.
2. **Kiểm chữ ký nhị phân lúc niêm phong (G3).** Trong lượt đọc tệp để băm (đã
   có), giữ 16 byte đầu và đối chiếu: `MZ` (PE/exe), `PK\x03\x04` (apk/zip/msix),
   `\x7fELF` (AppImage), `xar!` (pkg), v.v. Lệch ⇒ từ chối niêm phong. Không tốn
   thêm lượt đọc nào.
3. **Quét mã độc (G4) - phương án 0đ.** Lúc niêm phong, tra sha256 trên VirusTotal
   API v3 (gói miễn phí: 4 lượt/phút, 500 lượt/ngày - dư cho nhịp phát hành của
   một người). Chỉ tra BĂM, không tải tệp lên (không lộ bản dựng chưa công bố).
   Có phát hiện ⇒ trạng thái `NGHI_MA_DOC`, chặn công bố. Băm chưa từng thấy ⇒
   ghi "chưa có dữ liệu", không chặn, và cron tra lại sau 24 giờ. Khoá API là
   secret của Render, thiếu thì log rõ "chưa quét" - không giả vờ đã quét.
4. **Kiểm toàn vẹn định kỳ (G5).** Thêm nhịp vào Worker cron sẵn có
   (`infrastructure/canh-site-cron`, nhịp `23 1,13 * * *`): gọi một route nội bộ
   băm lại từng tệp đã công bố và so với sha256 đã ký. Lệch ⇒ gỡ công bố +
   báo động Telegram. Chi phí: R2 đọc thuộc hạng mục miễn phí (10 triệu lượt
   loại B/tháng).
5. **Nhật ký chỉ-thêm (G8).** Migration mới: trigger Postgres chặn `UPDATE` và
   `DELETE` trên `TrustAuditLog` và `SecurityEvent` (cùng khuôn với trigger chặn
   xoá cứng đã có). Mỗi dòng mang `prevHash` = SHA-256 của dòng trước, nên xoá
   một dòng ở giữa làm đứt chuỗi và trang kiểm tra chỉ ra được chỗ đứt.
6. **Xác thực lại (G7).** Route nhạy cảm đòi header mang mã TOTP hoặc khẳng định
   passkey mới (dưới 5 phút); auth-service kiểm và trả một "step-up token" sống
   ngắn ký HMAC, content-service kiểm token đó. Không có 2FA ⇒ không thực hiện
   được hành động nhạy cảm (gắn với G6).

### 3.4 Thứ tự xây (theo vùng agent, `AGENTS.md`)

`data-schema` (cột `securityState`, `lastIntegrityAt`, `revokedAt`,
`revokeReason`, `scanResult`; trigger chỉ-thêm) → `release-signing` (giới hạn
tải lên, magic bytes, kiểm toàn vẹn, quét băm) → `backend-api` (route liệt kê,
thu hồi, step-up) → `infra-deploy` (nhịp cron, secret VirusTotal) →
`frontend-web` (trang) → `qa-test` (test mỗi trạng thái, test tệp sai loại bị từ
chối, test lệch toàn vẹn tự gỡ công bố).

### 3.5 Hiện trạng khác thiết kế (06/11/2026)

- **Trạng thái thêm hai giá trị**: `CHU_KY_LOI` (chữ ký không kiểm được bằng JWKS
  hoặc phủ một sha256 khác) và `DUONG_DAN_NGOAI` (WEB/SOURCE không khai sha256).
  DB chỉ lưu SỰ CỐ (`securityState`: OK | LECH_TOAN_VEN | NGHI_MA_DOC); phần còn
  lại tính lúc đọc.
- **VirusTotal chặn khi `malicious >= 1`**, không chặn theo `suspicious`: tệp tự
  ký không chứng chỉ (đúng loại tsudev phát hành) hay bị gắn cờ heuristic.
- **Niêm phong lại không còn "an toàn mọi lúc"**: tệp đã có sha256 mà kho ra băm
  khác ⇒ 409 `LECH_TOAN_VEN`, không ký. Trước đó nút Niêm phong ký luôn tệp bị thay.
- **Step-up chỉ nhận TOTP** (không mã dự phòng, chưa passkey). Token HMAC, khoá dẫn
  xuất từ `INTERNAL_IDENTITY_SECRET`, buộc `sub` + `sessionVersion`, sống 5 phút.
- **`SecurityEvent` giữ hai đường xoá hợp lệ**: tự dọn quá 90 ngày và cascade khi
  xoá User. Vì thế chuỗi băm của nó theo TỪNG user; `TrustAuditLog` chuỗi toàn bảng.
- **Giới hạn trung thực của G8**: trigger chặn ứng dụng, không chặn chủ CSDL (DROP
  TRIGGER). Xoá dòng CUỐI chuỗi không lộ - cần neo băm ra ngoài (giai đoạn 3).
- **Route cron gác bằng `RELEASE_INTEGRITY_TOKEN` riêng**, không bằng
  `INTERNAL_API_TOKEN` (BFF cũng giữ token đó). Proxy BFF không mở `/api/internal`.

## 4. Lộ trình theo giai đoạn

### Giai đoạn 1 - Chặn cửa (P0, 1-2 phiên)

| Việc                                                                             | Đóng | Nghiệm thu                                                                             |
| -------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------- |
| Bật branch protection cho `main`: bắt buộc CI xanh, cấm force-push               | G2   | `gh api repos/.../branches/main/protection` trả cấu hình; push thẳng bị từ chối        |
| CI: `gitleaks` (toàn lịch sử lần đầu, sau đó theo diff)                          | G1   | job đỏ khi cố ý commit một khoá giả                                                    |
| CI: `npm audit --omit=dev --audit-level=high` + Dependabot (npm, GitHub Actions) | G1   | job đỏ khi có High/Critical trong phụ thuộc production                                 |
| Ép 2FA cho ADMIN/OWNER ở `requireAdmin`/`requireOwner`                           | G6   | ADMIN chưa bật TOTP/passkey nhận 403 kèm hướng dẫn; test                               |
| Giới hạn tải lên + magic bytes + đuôi tệp                                        | G3   | tệp `.apk` đổi đuôi từ `.txt` bị từ chối niêm phong; PUT lệch kích thước bị R2 từ chối |

### Giai đoạn 2 - Trung tâm an ninh phát hành (P0/P1, 2-3 phiên)

Toàn bộ mục 3. Nghiệm thu: sửa tay một byte của tệp trong MinIO local ⇒ lần kiểm
kế tiếp chuyển `LECH_TOAN_VEN`, trang công khai không còn link tải, Telegram nhận
báo động; xoá một dòng nhật ký ở DB ⇒ trigger từ chối.

### Giai đoạn 3 - Bền vững (P1/P2)

| Việc                                                                                                                            | Đóng | Nghiệm thu                                                           |
| ------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| Bộ đếm giới hạn tần suất chuyển sang lưu bền (bảng Postgres hoặc Cloudflare Rate Limiting rule ở biên - gói miễn phí có 1 rule) | G9   | khởi động lại backend, bộ đếm còn nguyên                             |
| Rà và nâng phụ thuộc dev từng nhóm (Storybook, công cụ dựng), không `--force`                                                   | G10  | `npm audit` (kể cả dev) không còn High/Critical                      |
| Sao lưu khoá ký ngoại tuyến (mã hoá bằng `age`, 2 nơi), diễn tập khôi phục                                                      | G11  | khôi phục khoá vào môi trường thử, chữ ký mới kiểm được bằng JWKS cũ |
| Mã hoá bản dump DB (`age`/`gpg`) + lịch xoá                                                                                     | G12  | không còn tệp `.dump` dạng rõ trên máy dev                           |
| SAST (Semgrep bộ luật miễn phí) trong CI                                                                                        | G1   | job chạy trên mỗi PR, không có phát hiện High chưa xử lý             |
| Kiểm thử xâm nhập theo OWASP ASVS L2 cho các đường admin                                                                        | -    | báo cáo, mọi phát hiện High có PR sửa                                |

### Tiêu chí nghiệm thu tổng (đo được)

1. Phụ thuộc production: **0 High/Critical** liên tục (CI canh).
2. Mọi tệp đang công bố: trạng thái `OK`, lần kiểm toàn vẹn gần nhất **< 24 giờ**.
3. Thời gian từ khi tệp bị sửa trong R2 đến khi bị gỡ công bố: **≤ 12 giờ** (nhịp cron).
4. 100% tài khoản ADMIN/OWNER có 2FA.
5. Không xoá/sửa được dòng nhật ký nào ở cấp DB.
6. securityheaders.com và Mozilla Observatory: **A+** cho `tsudev.com`.

## 5. Việc của chủ dự án (agent không làm được)

1. Bật **2FA** (ưu tiên passkey/khoá phần cứng) cho tài khoản GitHub, Cloudflare,
   Render, Neon, và tài khoản `tsudev` trên site.
2. Đổi mật khẩu Neon (đã lộ trong ảnh chụp phiên 33) rồi cập nhật `DATABASE_URL`.
3. Tạo khoá API VirusTotal (miễn phí) và đặt `VIRUSTOTAL_API_KEY` ở Render
   (giai đoạn 2 đã dựng xong mã, 06/11/2026). Sinh `RELEASE_INTEGRITY_TOKEN`
   (`openssl rand -hex 32`), đặt CÙNG giá trị ở Render và Worker
   (`npm run cron:secret-integrity`).
4. Đồng ý bật branch protection (đổi cách làm việc: không còn push thẳng `main`).

## 6. Những gì KHÔNG làm, và vì sao

| Đề xuất thường gặp                                    | Lý do không làm ở tsudev                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| WAF/Bot Management trả phí, fingerprint TLS (JA3/JA4) | Trái hạ tầng 0đ; trang công khai là ISR tĩnh ở biên, bề mặt động nhỏ                     |
| IdP riêng (Keycloak/Zitadel)                          | Một người vận hành; auth-service hiện có Argon2id + TOTP + passkey + thu hồi phiên       |
| SMS OTP                                               | Bị `.standards/docs/AUTH_AND_ACCOUNT.md` cấm làm lớp thứ hai; tốn phí; SIM swap          |
| "Four-eyes" (hai người duyệt)                         | Chỉ có một quản trị viên; thay bằng xác thực lại + nhật ký chỉ-thêm                      |
| Chặn tuyệt đối scraper                                | Nội dung công khai thì người thật phải đọc được; đã có giới hạn tần suất và cache ở biên |

## 7. Liên kết

- `docs/release-signing.md` - vòng khoá, niêm phong, CORS R2
- `docs/auth.md` - xác thực, phân quyền, §6 xác thực số điện thoại
- `docs/free-tier.md` - hạn mức 0đ
- `.standards/docs/SECURITY_BASELINE.md` - chuẩn bảo mật chung của hệ sinh thái

## 8. Nhật ký thay đổi của kế hoạch

- 05/11/2026 - soạn lần đầu (phiên 34); giai đoạn 0 (vá phụ thuộc, IP thật,
  kiểm duyệt nội dung) đã làm cùng ngày.
- 06/11/2026 - giai đoạn 2 dựng xong (phiên 37): §2.4 trạng thái đóng, §3.5 hiện
  trạng khác thiết kế.

## 9. Nguồn tham khảo đã rà trên máy dev (chỉ đọc)

| Tài liệu                                              | Học được gì cho tsudev                                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `ubnd/20261027-SPEC-SEC-2026-V2-...`                  | Zero Trust, phòng thủ nhiều lớp, tiêu chí nghiệm thu đo được; upload: magic bytes, đổi tên ngẫu nhiên, lưu ngoài web-root, link có chữ ký |
| `app-la-ban/20261028-tai-lieu-ky-thuat-...`           | Mô hình trang giám sát an ninh: bảng kê, trung tâm cảnh báo, hành động có TTL và lý do, nhật ký chuỗi băm                                 |
| `b4djl1h-cmdb/20260907-security-architecture-plan.md` | Envelope encryption, crypto-shredding, truy cập JIT cho lập trình viên - ghi nhận, chưa cần ở quy mô hiện tại                             |
| `ban-do-3d/20261014-KE-HOACH-BAO-MAT-...`             | Kế hoạch bảo mật theo vùng chức năng của một công cụ biên tập có tải tệp lên                                                              |
| `.standards/docs/SECURITY_BASELINE.md`                | Phân loại dữ liệu D0-D3, 2FA bắt buộc cho quản trị                                                                                        |
