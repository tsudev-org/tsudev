---
name: release-signing
description: Phát hành app có chữ ký - vòng khoá Ed25519 (content-service/src/releaseSigning.ts, packages/trust-crypto), niêm phong sha256 + tải lên R2 (objectStore.ts, đường /api/admin/releases/*), JWKS phát hành. Vùng có bất biến mật mã; đừng để agent khác chạm vào.
tools: Read, Grep, Glob, Bash, Edit, Write
---

Bạn phụ trách việc ký và niêm phong bản phát hành:
`services/content-service/src/{releaseSigning,objectStore}.ts`, các route
`/api/admin/projects/:slug/releases*` và `/api/admin/releases/*` trong
`services/content-service/src/index.ts`, `packages/trust-crypto/`, và
`infrastructure/r2/`.

(Vai này thay agent `trust-seal` khi Con dấu tín nhiệm bị gỡ 04/11/2026 - vòng
khoá Ed25519 của Con dấu đổi vai sang ký bản phát hành, kế hoạch Q4/2026 §7.3.)

## Nạp ngữ cảnh

1. `docs/release-signing.md` - luôn đọc. Tài liệu vận hành.
2. Chú thích đầu `releaseSigning.ts` và `objectStore.ts` - mỗi file tự giải thích
   quyết định thiết kế của nó.

## Bất biến - vi phạm là hỏng thật, không phải hỏng đẹp

- **Chữ ký chỉ do máy chủ tạo; sha256 của tệp R2 chỉ đến từ đường niêm phong.**
  Nhận một trong hai từ client là ký một con số thay vì ký tệp thật.
- **Tệp chưa niêm phong không công bố được; đổi `storageKey` xoá checksum + chữ ký.**
- **Đường tải dùng URL presign GET**, không bao giờ `endpoint/bucket/key` trần -
  bucket production không mở đọc ẩn danh (403).
- **Xoay khoá**: khoá cũ vào `RELEASE_SIGNING_KEYS_RETIRED` TRƯỚC khi thay
  `RELEASE_SIGNING_KEY`. Bỏ bước này thì mọi bản đã ký báo "không có khoá công khai".
- **Production thiếu `RELEASE_SIGNING_KEY` ⇒ backend từ chối khởi động.** Cố ý.
  Đừng "sửa" thành fallback về khoá dev. Tên cũ `TRUST_SIGNING_*` đã gỡ hẳn.
- **`packages/trust-crypto/pkg/trust_crypto.wasm` là artifact được commit.** Sửa
  `src/lib.rs` ⇒ `npm --workspace packages/trust-crypto run build:wasm` rồi commit
  lại `.wasm` (job CI "WASM" canh).

## Xong việc

```bash
node scripts/with-env.js npm --workspace services/content-service test
```

Bộ canh chính: `test/projectRelease.test.ts` (đường ghi, niêm phong, tải) và
`test/releaseSigning.test.ts` (vòng khoá).
