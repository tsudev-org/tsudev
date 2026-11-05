/**
 * Kho object (R2 ở production, MinIO ở dev) - phần content-service CẦN cho bản
 * phát hành: cấp URL tải LÊN, cấp URL tải VỀ, và tự đọc lại tệp để tính sha256.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * VÌ SAO ĐƯỜNG TẢI VỀ PHẢI LÀ URL PRESIGN, KHÔNG PHẢI URL "CÔNG KHAI"
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Ở production `S3_PUBLIC_ENDPOINT` là endpoint S3 API của R2
 * (`<account>.r2.cloudflarestorage.com`). Endpoint đó KHÔNG phục vụ đọc ẩn danh:
 * bucket `tsudev` không công khai (CLAUDE.md cấm đặt endpoint thành tên miền
 * công khai của bucket). Bản đầu của route tải ghép `endpoint/bucket/key` trần,
 * nên ở dev (MinIO mở đọc) mọi thứ chạy, test xanh, còn ở production mọi nút tải
 * tệp R2 sẽ trả lỗi chữ ký của R2. Ký URL GET thời hạn ngắn chạy ở CẢ HAI nơi.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * VÌ SAO MÁY CHỦ TỰ TÍNH sha256 THAY VÌ TIN TRÌNH DUYỆT
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Chữ ký Ed25519 khẳng định "đây là đúng tệp tsudev phát hành". Nếu sha256 do
 * trình duyệt khai, thì thứ được ký là một CON SỐ ai đó gõ vào, không phải tệp
 * nằm trong bucket - lệch nhau (tải lên đứt giữa chừng, chọn nhầm tệp) là người
 * tải nhận một chữ ký hợp lệ cho một checksum không khớp. Đọc lại đúng object
 * mà nút tải sẽ trỏ tới thì thứ được ký chính là thứ được phát.
 *
 * `store` là một đối tượng có thể thay ở test: CI không có R2, và một test gọi
 * mạng thật là một test đỏ theo thời tiết.
 */
import { createHash } from 'crypto'
import type { Readable } from 'stream'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ENDPOINT = process.env.S3_ENDPOINT || process.env.S3_URL || 'http://minio:9000'
const PUBLIC_ENDPOINT = process.env.S3_PUBLIC_ENDPOINT || null
const BUCKET = process.env.S3_BUCKET || 'tsudev'

/** Thời hạn URL tải lên: đủ cho một APK vài trăm MB qua mạng chậm. */
export const UPLOAD_URL_TTL_SECONDS = 30 * 60
/** Thời hạn URL tải về: chỉ cần sống qua một lượt chuyển hướng. */
export const DOWNLOAD_URL_TTL_SECONDS = 5 * 60

let clients: { s3: S3Client; signer: S3Client } | null = null

function getClients(): { s3: S3Client; signer: S3Client } {
  if (clients) return clients
  const accessKeyId = process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER || ''
  const secretAccessKey = process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || ''
  const make = (endpoint: string) =>
    new S3Client({
      endpoint,
      // Cùng giá trị với storage-service: R2 nhận cả 'us-east-1' lẫn 'auto', còn
      // MinIO ở dev kiểm vùng trong chữ ký và chỉ nhận vùng nó cấu hình.
      region: 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    })
  const s3 = make(ENDPOINT)
  // URL ký phải mang host mà TRÌNH DUYỆT với tới được: ở dev là
  // cdn.tsudev.localhost, khác `minio:9000` trong mạng docker.
  const signer = PUBLIC_ENDPOINT ? make(PUBLIC_ENDPOINT) : s3
  clients = { s3, signer }
  return clients
}

/** Tên tệp an toàn cho khoá object và cho header Content-Disposition. */
export function safeFileName(raw: string): string {
  const base = String(raw || '')
    .split(/[\\/]/)
    .pop()!
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    // `đ`/`Đ` là chữ cái riêng, không phải `d` + dấu: NFKD không tách nó ra.
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|-+$/g, '')
  return base.slice(0, 120) || 'tep'
}

async function presignPut(key: string, contentType: string): Promise<string> {
  const { signer } = getClients()
  return getSignedUrl(
    signer,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS }
  )
}

async function presignGet(key: string, fileName?: string | null): Promise<string> {
  const { signer } = getClients()
  return getSignedUrl(
    signer,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      // Tên tệp lúc lưu về máy là tên người ta sẽ gõ vào `sha256sum`. Không đặt
      // thì trình duyệt lấy đoạn cuối của khoá - vẫn chạy, nhưng lệch với tên
      // hiển thị trong modal tải về.
      ...(fileName
        ? { ResponseContentDisposition: `attachment; filename="${safeFileName(fileName)}"` }
        : {}),
    }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS }
  )
}

/**
 * Đọc TRỌN object theo luồng và tính sha256. Không nạp cả tệp vào bộ nhớ:
 * instance Render free có 512 MB, một bản cài đặt có thể lớn hơn thế.
 */
async function hashObject(key: string): Promise<{ sha256: string; size: number }> {
  const { s3 } = getClients()
  const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  if (!out.Body) throw new Error(`object rỗng hoặc không đọc được: ${key}`)
  const hash = createHash('sha256')
  let size = 0
  for await (const chunk of out.Body as Readable) {
    const buf = chunk as Buffer
    size += buf.length
    hash.update(buf)
  }
  return { sha256: hash.digest('hex'), size }
}

/** Thay được ở test - xem chú thích đầu tệp. */
export const store = { presignPut, presignGet, hashObject }
