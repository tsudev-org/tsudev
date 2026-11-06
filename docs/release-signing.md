# Phát hành app: tải lên R2, niêm phong, ký Ed25519 - vận hành

tsudev.com phát hành file cài đặt của các app tự phát triển. Mỗi bản phát hành
(`ProjectRelease`) có tệp trong R2, một SHA-256 do **máy chủ** tính và một chữ ký
Ed25519 mà người tải tự kiểm được offline. Kế hoạch gốc: `refactor-tsudev-2026-q4.md`
§4, §6.6, §7.3.

## Luồng của trang quản trị (`/admin/projects` → "Bản phát hành")

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
