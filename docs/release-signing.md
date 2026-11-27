# Phát hành app: tải lên R2, niêm phong, ký Ed25519 - vận hành

tsudev.com phát hành file cài đặt của các app tự phát triển. Mỗi bản phát hành
(`ProjectRelease`) có tệp trong R2, một SHA-256 do **máy chủ** tính và một chữ ký
Ed25519 mà người tải tự kiểm được offline. Kế hoạch gốc: `refactor-tsudev-2026-q4.md`
§4, §6.6, §7.3.

## Luồng của trang quản trị (`console.tsudev.com/projects` → "Bản phát hành")

```
chọn tệp ─► POST /api/admin/projects/:slug/releases/upload-url   (URL presign PUT, 30 phút)
        ─► PUT thẳng từ trình duyệt vào R2                        (không qua Worker/Render)
        ─► POST /api/admin/projects/:slug/releases                (tạo NHÁP, storageKey do máy chủ cấp)
        ─► POST /api/admin/releases/:id/seal                      (máy chủ đọc lại object → sha256 + dung lượng THẬT → ký)
        ─► PATCH /api/admin/releases/:id {published:true}         (chỉ khi đã niêm phong)
```

Mọi route ghi tự gọi `requireAdmin()` (đọc vai trò từ DB, fail closed).

Bất biến, mỗi cái có test ở `services/content-service/test/projectRelease.test.ts`:

- **Chữ ký chỉ do máy chủ tạo.** Client gửi `signature`/`signingKid` ⇒ 400.
- **SHA-256 của tệp R2 chỉ đến từ đường niêm phong.** Client khai ⇒ 400. Lý do:
  ký một con số ai đó gõ vào thì chữ ký hợp lệ cho một checksum có thể không khớp
  tệp thật.
- **Tệp chưa niêm phong không công bố được.**
- **Đổi `storageKey` xoá checksum + chữ ký cũ**, buộc niêm phong lại.
- Bản WEB/SOURCE (đường dẫn ngoài) được khai SHA-256 tay; máy chủ ký lời khai đó.
- Payload ký gồm dự án, phiên bản, nền tảng, kênh, kiến trúc, tên tệp, dung lượng,
  sha256 - chữ ký không bê được sang bản khác cùng tệp.

Niêm phong thất bại (tệp chưa lên xong, R2 chập chờn) ⇒ 502 và không ghi gì; bấm
**Niêm phong** ở danh sách để thử lại - gọi lại nhiều lần là an toàn.

## Siết tải lên (G3, 05/11/2026)

Mã: `services/content-service/src/objectStore.ts` (`RELEASE_FILE_TYPES`,
`MAX_RELEASE_BYTES`, `hashObject`) và route `upload-url`/`seal` ở `src/index.ts`.
Lỗi trả `{ error, code }` - `code` ổn định để giao diện rẽ nhánh.

**Lúc xin URL tải lên** (`POST .../releases/upload-url`, body `platform`,
`fileName`, `fileSize`):

- Đuôi tệp phải nằm trong danh sách TRẮNG của nền tảng (so không phân biệt hoa
  thường; đuôi dài xét trước để `.tar.gz` không thành `.gz`). Sai ⇒ 400
  `DUOI_TEP_KHONG_CHO_PHEP`. WEB không có tệp - chỉ đường dẫn ngoài.

  | Nền tảng | Đuôi cho phép                       |
  | -------- | ----------------------------------- |
  | WINDOWS  | `.exe` `.msi` `.msix` `.zip`        |
  | ANDROID  | `.apk` `.aab`                       |
  | MACOS    | `.dmg` `.pkg` `.zip`                |
  | LINUX    | `.AppImage` `.deb` `.rpm` `.tar.gz` |
  | SOURCE   | `.zip` `.tar.gz`                    |

- `fileSize` (số nguyên dương) BẮT BUỘC và được **ký vào URL** (`Content-Length`);
  PUT có kích thước khác bị kho trả 403. Trần 2 GiB mỗi nền tảng ⇒ 413
  `VUOT_TRAN_KICH_THUOC`.
- `contentType` do máy chủ suy từ đuôi, cũng ký vào URL. Client gửi
  `contentType` ⇒ 400 `CONTENT_TYPE_DO_MAY_CHU` - cùng khuôn với
  `signature`/`sha256`: trường do máy chủ quyết thì từ chối thẳng, không lặng lẽ
  bỏ qua.
- Khoá object do máy chủ đặt, giữ đuôi chính tắc kể cả khi tên dài bị cắt.

**Lúc niêm phong**:

- `hashObject` giữ 16 byte đầu + 512 byte cuối trong CHÍNH lượt đọc đang băm
  (không đọc lần hai) và so với chữ ký nhị phân của loại tệp (`MZ`, OLE, `PK\x03\x04`,
  khối `koly` của DMG, `xar!`, ELF, `!<arch>`, RPM, gzip). Lệch ⇒ 422
  `SAI_LOAI_TEP`, không ghi, không ký.
- Kiểm lại đuôi `storageKey` và trần trên dung lượng THẬT đọc được.
- `storageKey` phải nằm dưới `releases/<slug>/` của đúng dự án, không đoạn rỗng,
  `.`, `..` ⇒ tạo/PATCH 400 `STORAGE_KEY_SAI_DU_AN`, niêm phong 422 (kiểm trước
  khi đọc kho).

**Đổi `platform` của bản đã có tệp R2**: đuôi không thuộc danh sách trắng của
nền tảng mới ⇒ 422, không ghi gì; hợp lệ ⇒ xoá sha256/dung lượng/chữ ký, buộc
niêm phong lại (chữ ký phủ cả nền tảng). Trước khi vá, một "bản WINDOWS" trỏ vào
tệp `.apk` công bố được với chữ ký hợp lệ.

## Trung tâm an ninh (`console.tsudev.com/release-security`, 06/11/2026)

Trạng thái an ninh của mỗi bản do máy chủ tính (`src/releaseSecurity.ts`). Điều
kiện CÔNG KHAI duy nhất (`CONG_KHAI`): chưa xoá, đã công bố, **chưa thu hồi**,
`securityState = OK` - áp cho danh sách công khai lẫn link tải.

- **Kiểm toàn vẹn**: băm lại tệp trong kho, so sha256 + dung lượng đã ký. Lệch hoặc
  tệp biến mất ⇒ `LECH_TOAN_VEN`, gỡ công bố, nhật ký. Kho chập chờn ⇒ không đổi
  trạng thái. Tệp khớp lại ⇒ gỡ cờ nhưng KHÔNG tự công bố lại. Chạy tay (nút
  "Kiểm lại") hoặc theo lịch (Worker cron `23 1,13`, gọi
  `POST /api/internal/releases/integrity` với header `x-release-integrity-token`).
- **Niêm phong lại** một tệp đã có sha256 mà kho ra băm khác ⇒ 409
  `LECH_TOAN_VEN`, không ký. Bản đang lệch/thu hồi ⇒ 409 `KHONG_NIEM_PHONG_LAI`.
- **Quét mã độc**: lúc niêm phong tra BĂM trên VirusTotal (`VIRUSTOTAL_API_KEY`).
  `malicious >= 1` ⇒ `NGHI_MA_DOC`, gỡ công bố. Thiếu khoá ⇒ `CHUA_QUET`. Cron tra
  lại tối đa 4 băm/lượt cho kết quả "chưa có dữ liệu"/lỗi quá 24 giờ.
- **Thu hồi / khôi phục** (ADMIN) và **ký lại bằng khoá hiện hành** (OWNER) đòi
  step-up: mã TOTP đổi lấy token 5 phút ở `POST /api/identity/step-up`, gửi kèm
  trong thân (`stepUp`). Thu hồi/khôi phục bắt buộc lý do 10-500 ký tự. Bản thu
  hồi hay có sự cố không công bố được và không đổi `storageKey` được (409).
- **Nhật ký**: mọi thao tác (niêm phong, công bố, lệch, thu hồi, ký lại) vào
  `TrustAuditLog` - chỉ-thêm, chuỗi băm `prevHash`; `GET .../audit-chain` chỉ chỗ đứt.

## Đường tải về

`/api/releases/<slug>/<id>` (Worker) → content-service tăng `downloadCount` →
302 tới **URL presign GET 5 phút** (kèm `Content-Disposition` đúng tên tệp).

🔴 Không phải `S3_PUBLIC_ENDPOINT/bucket/key` trần: bucket `tsudev` không mở đọc
ẩn danh, URL trần trả 403. Bản đầu của route làm đúng điều đó và test khi ấy lại
khẳng định chính URL trần - sửa 05/11/2026.

## CORS của bucket (bắt buộc cho bước PUT từ trình duyệt)

```
npm run r2:cors && npm run r2:cors:list
```

Cấu hình ở `infrastructure/r2/cors.tsudev.json` (origin hẹp: `tsudev.com`,
`www.tsudev.com`). `ensureBucket()` của storage-service KHÔNG đặt được CORS trên
R2 (khoá S3 không có quyền quản trị bucket) và chỉ để lại một dòng cảnh báo.

Đã áp lên bucket `tsudev` production ngày 05/11/2026 (phiên 34). Kiểm không cần
đăng nhập - preflight trực tiếp vào endpoint S3 của R2:

```
curl -s -o /dev/null -w '%{http_code}\n' -X OPTIONS \
  "https://<account-id>.r2.cloudflarestorage.com/tsudev/probe" \
  -H "Origin: https://tsudev.com" -H "Access-Control-Request-Method: PUT"
```

`204` là đúng; origin lạ phải nhận `403`.

## Khoá ký và xoay khoá

Vòng khoá: `services/content-service/src/releaseSigning.ts`, Ed25519 qua
`@tsudev/trust-crypto` (Rust→WASM). Khoá công khai:
`https://tsudev.com/.well-known/tsudev-release-jwks.json`.

| biến                           | nội dung                                           |
| ------------------------------ | -------------------------------------------------- |
| `RELEASE_SIGNING_KEY`          | PEM PKCS#8 đã base64 hoá - khoá đang ký            |
| `RELEASE_SIGNING_KEY_ID`       | `kid` công bố trong JWKS                           |
| `RELEASE_SIGNING_KEYS_RETIRED` | `kid:<base64 PEM công khai>,...` - chỉ để xác minh |

Production thiếu `RELEASE_SIGNING_KEY` ⇒ backend **từ chối khởi động** (cố ý). Tên
cũ `TRUST_SIGNING_*` của Con dấu không còn được đọc từ 05/11/2026.

```bash
node services/content-service/scripts/genkey.js
```

Xoay khoá:

1. Sinh khoá mới bằng lệnh trên.
2. Thêm dòng `kid:<base64 PEM công khai>` **của khoá cũ** vào `RELEASE_SIGNING_KEYS_RETIRED`.
3. Đặt khoá mới vào `RELEASE_SIGNING_KEY` / `RELEASE_SIGNING_KEY_ID`.
4. Deploy, kiểm JWKS có **cả hai** `kid`.

Bỏ bước 2 thì mọi bản đã ký lập tức "không có khoá công khai". Sao lưu khoá cùng
chỗ với `TOTP_ENCRYPTION_KEY`.

## Người tải tự kiểm

```bash
sha256sum app-1.0.0.apk                     # Windows: certutil -hashfile app-1.0.0.apk SHA256
```

Chữ ký là JWS compact (`alg: EdDSA`, header có `kid`) - mục "Xem chữ ký" trong
modal tải về. Kiểm bằng bất kỳ thư viện JOSE nào với khoá cùng `kid` trong JWKS,
rồi so `payload.sha256` với kết quả `sha256sum`.

## Bản kê phiên bản có chữ ký (INT1-a, 26/11/2026)

Chuẩn: `.standards/docs/APP_INTEGRITY.md` mục 2.1. Mã: `services/content-service/src/versionsManifest.ts`,
proxy `apps/frontend-main/pages/api/versions/[...path].ts`, bảng `AppVersionChannel`.

| Đường                                                          | Việc                                                                  |
| -------------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET https://tsudev.com/.well-known/tsudev/versions.json`      | bản kê (byte đã ký, cache 300 s)                                      |
| `GET https://tsudev.com/.well-known/tsudev/versions.json.sig`  | chữ ký tách của đúng các byte trên                                    |
| `GET https://tsudev.com/.well-known/tsudev/versions-jwks.json` | khoá công khai `tsu-versions-2026` (app ghim lúc dựng)                |
| `POST https://tsudev.com/api/versions/raise/<sản phẩm>/<kênh>` | pipeline nâng `latest` - header `x-versions-token`                    |
| `GET/POST /api/admin/versions[/<sản phẩm>/<kênh>]` (backend)   | ADMIN (vai trò từ DB + 2FA) xem/nâng                                  |
| `POST /api/pipeline/versions/<sản phẩm>/<kênh>` (backend)      | đích của proxy pipeline; chỉ `x-versions-token`, thiếu cấu hình ⇒ 503 |

**Định dạng `.sig`**: JWS compact tách nội dung (RFC 7515 phụ lục F) `<b64url(header)>..<b64url(chữ ký)>`, header
`{"alg":"EdDSA","kid":"tsu-versions-2026"}`. App kiểm Ed25519 trên `b64url(header) + "." + b64url(byte versions.json)`

- trên byte TẢI VỀ, không parse rồi serialize lại. `expires_at` = `issued_at` + 7 ngày; bản kê dựng lại khi có lượt
  nâng hoặc sau 1 ngày, nên bản đang phát còn ≥ 6 ngày và `issued_at` chỉ tăng.

**Nâng `latest`** (body `{"latest":"26.11.2601","url":"https://github.com/tsudev-org/<repo>/releases/latest"}`):

1. `latest` phải là bản chính thức `YY.M.DDNN`; không hạ phiên bản (409 `version_not_newer`).
2. Chốt chặn theo kênh: máy chủ GET thật `url` (chỉ https, chỉ host phát hành: GitHub, Play, Microsoft Store, App
   Store, `tsudev.com` - khớp chính xác, dựng lại URL từ host hằng số; chuyển hướng theo tay, tối đa 5 chặng). Chặng cuối phải 200; kênh không phải cửa hàng
   (`github`, `winget`, `scoop`...) thì phiên bản phải có trong URL ở một chặng (thẻ `v26.11.2601` hay tên tệp).
   Không đạt ⇒ 409 `download_unverified`, KHÔNG nâng. Kênh cửa hàng (`play`, `msstore`, `appstore`, `web`) chỉ đo
   được "trang còn sống" - pipeline của kênh đó PHẢI tự xác nhận bản đã qua duyệt (API cửa hàng) trước khi gọi.
3. Mỗi lượt nâng ghi `TrustAuditLog` (`versions.raise`, từ đâu lên đâu, url, IP) - bất biến.

Ví dụ bước cuối của workflow phát hành (secret `TSU_VERSIONS_TOKEN` = `VERSIONS_RAISE_TOKEN`):

```bash
curl -fsS -X POST "https://tsudev.com/api/versions/raise/<ma-san-pham>/github" \
  -H "x-versions-token: $TSU_VERSIONS_TOKEN" -H 'content-type: application/json' \
  -d "{\"latest\":\"$VERSION\",\"url\":\"https://github.com/tsudev-org/<repo>/releases/tag/v$VERSION\"}"
```

**Khoá**: `VERSIONS_SIGNING_KEY` (PEM PKCS#8 base64) + `VERSIONS_SIGNING_KEY_ID` + `VERSIONS_SIGNING_KEYS_RETIRED`, KHÔNG
dùng chung `RELEASE_SIGNING_KEY` (lộ một khoá không được cho phép giả cả bản cài lẫn lệnh khoá app). Thiếu ở production
⇒ ba đường bản kê trả 503 nhưng backend VẪN khởi động (khác khoá bản phát hành: thiếu bản kê thì app giữ bản đệm,
không ai bị chặn). Bản gốc: `~/.config/tsudev/keys/tsu-versions-2026.env` (quyền 600) - sao lưu cùng chỗ với
`RELEASE_SIGNING_KEY`. Xoay khoá: phát bản app ghim CẢ khoá mới, chuyển khoá cũ vào `..._RETIRED`, rồi mới thay.

## Cổng `X-Tsu-App` và nhật ký an ninh (INT1-b, 26/11/2026)

Chuẩn: `.standards/docs/APP_INTEGRITY.md` mục 2.1 + 4, `PRODUCT_POLICY.md` 7.7. Mã:
`services/auth-service/src/appVersionGate.ts`, `securityAudit.ts`, bảng `SecurityAuditLog`.

Mọi API mà app gọi - `/api/me/entitlements`, `/api/rp/entitlements/*`, `/api/xd/*` (tức `/ent/*` của auth-service, trừ
`/ent/reminders` của cron) và OIDC userinfo `/oidc/me` - đi qua cổng header `X-Tsu-App: <ma-san-pham>/<phiên bản>/<kênh>`:

| Lượt gọi                                                                 | Kết quả                                                  |
| ------------------------------------------------------------------------ | -------------------------------------------------------- |
| Sai định dạng (kể cả gửi hai lần)                                        | `400 {"error":"app_header_invalid"}`                     |
| Thiếu header, `X_TSU_APP_REQUIRED=1`                                     | `400 {"error":"app_header_required"}`                    |
| Thiếu header, cờ chưa bật                                                | cho qua + nhật ký `app_header_missing`                   |
| Phiên bản < `latest` của đúng (sản phẩm, kênh) trong `AppVersionChannel` | `426 {"error":"update_required","latest":"…","url":"…"}` |
| Kênh khác, sản phẩm chưa có dòng, bằng/mới hơn `latest`                  | cho qua                                                  |

- Bản thử của chính `latest` (`26.11.2601-beta.1`) là CŨ hơn `26.11.2601`. Cổng đệm bảng 60 giây trong tiến trình -
  nâng `latest` có hiệu lực ở cổng chậm nhất 1 phút. Đọc bảng lỗi ⇒ cho qua (không khoá người dùng vì DB chập chờn).
- BFF trình duyệt đi `/api/identity/*`, không qua cổng. Proxy Next (`lib/entitlementProxy.ts`, `pages/api/oidc/[...path].ts`)
  PHẢI chuyển header `x-tsu-app`; `services/auth-service/test/appVersionGate.test.ts` quét nguồn canh cả thứ tự mount.
- **Vì sao thiếu header chưa bị 400 ngay**: bản app đã cài hôm nay (tsudisk, tsuswico, máy chủ RP của qulythuchi...) chưa
  gửi header; 400 cho chúng là khoá người dùng khi chưa có bản để cập nhật. Chủ dự án bật `X_TSU_APP_REQUIRED=1` trên
  Render ở INT1-f, sau khi truy vấn dưới đây không còn dòng mới:
  `SELECT "clientId", count(*) FROM "SecurityAuditLog" WHERE type='app_header_missing' AND "createdAt" > now()-interval '7 days' GROUP BY 1;`

**`SecurityAuditLog`**: `type` (`update_required`, `app_header_invalid`, `app_header_missing`; INT1-c thêm
`untrusted_client`), `clientId` (từ access token nếu có), `jktHash` (SHA-256 của thumbprint khoá DPoP - không lưu
thumbprint gốc), `ipPrefix` (`/24` IPv4, `/48` IPv6 - không lưu IP thô), `product`/`version`/`channel`, `path`. Cùng
(loại, mạng, app, đường dẫn) chỉ ghi một dòng mỗi 60 giây. Dòng quá 12 tháng bị xoá (mỗi giờ một lần, khi có lượt ghi).
