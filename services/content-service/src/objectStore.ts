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

/**
 * URL presign PUT ký CẢ `Content-Length` lẫn `Content-Type`.
 *
 * `ContentLength` đi vào `X-Amz-SignedHeaders` (`content-length`): PUT mang thân
 * có kích thước khác bị kho từ chối vì chữ ký không khớp. Đây là trần kích thước
 * DUY NHẤT thật sự chặn được ở tầng kho - tệp đi thẳng từ trình duyệt vào bucket,
 * không qua máy chủ nào của tsudev để đếm byte.
 *
 * `content-type` thì presigner KHÔNG ký theo mặc định (đo 05/11/2026: chỉ
 * `content-length;host`), nên phải ép bằng `signableHeaders` - không thì loại
 * MIME do máy chủ suy chỉ là lời gợi ý, trình duyệt gửi gì kho lưu nấy.
 */
async function presignPut(
  key: string,
  contentType: string,
  contentLength: number
): Promise<string> {
  const { signer } = getClients()
  return getSignedUrl(
    signer,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS, signableHeaders: new Set(['content-type']) }
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

/** Số byte đầu tệp giữ lại để đối chiếu chữ ký nhị phân (§3.3 kế hoạch ATTT). */
export const HEAD_BYTES = 16
/** Số byte cuối tệp giữ lại: ảnh đĩa `.dmg` (UDIF) đặt dấu `koly` ở 512 byte CUỐI. */
export const TAIL_BYTES = 512

export interface HashedObject {
  sha256: string
  size: number
  /** Tối đa `HEAD_BYTES` byte đầu. */
  head: Buffer
  /** Tối đa `TAIL_BYTES` byte cuối. */
  tail: Buffer
}

/**
 * Đọc TRỌN object theo luồng, tính sha256, và trong CHÍNH lượt đọc đó giữ lại
 * vài byte đầu + cuối để đối chiếu chữ ký nhị phân. Không nạp cả tệp vào bộ
 * nhớ: instance Render free có 512 MB, một bản cài đặt có thể lớn hơn thế. Và
 * không đọc lần thứ hai: mỗi lượt đọc R2 là một lượt tính phí loại B, và hai
 * lượt đọc là hai thời điểm - tệp bị ghi đè giữa chừng thì thứ được kiểm loại
 * không phải thứ được băm.
 */
async function hashObject(key: string): Promise<HashedObject> {
  const { s3 } = getClients()
  const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  if (!out.Body) throw new Error(`object rỗng hoặc không đọc được: ${key}`)
  const hash = createHash('sha256')
  let size = 0
  let head = Buffer.alloc(0)
  let tail = Buffer.alloc(0)
  for await (const chunk of out.Body as Readable) {
    const buf = chunk as Buffer
    size += buf.length
    hash.update(buf)
    if (head.length < HEAD_BYTES)
      head = Buffer.concat([head, buf.subarray(0, HEAD_BYTES - head.length)])
    // Chép tối đa TAIL_BYTES mỗi khúc, không chép cả khúc: tệp vài GB thì chép
    // nguyên khúc là nhân đôi lưu lượng bộ nhớ chỉ để giữ 512 byte.
    tail =
      buf.length >= TAIL_BYTES
        ? Buffer.from(buf.subarray(buf.length - TAIL_BYTES))
        : Buffer.concat([tail, buf]).subarray(-TAIL_BYTES)
  }
  return { sha256: hash.digest('hex'), size, head, tail }
}

// ──────────────────────────────────────────────────────────────────────────────
// LOẠI TỆP ĐƯỢC PHÉP PHÁT HÀNH (§3.3 kế hoạch ATTT, đóng G3)
// ──────────────────────────────────────────────────────────────────────────────
//
// Ba lớp, mỗi lớp chặn một thứ khác nhau:
//   1. `upload-url`: đuôi tệp theo danh sách TRẮNG của nền tảng + trần kích
//      thước; `Content-Type` do máy chủ suy từ đuôi và được KÝ vào URL.
//   2. Kho (R2/MinIO): `Content-Length` đã ký ⇒ PUT lệch kích thước bị từ chối.
//   3. Niêm phong: byte đầu/cuối của chính tệp trong kho phải khớp loại mà đuôi
//      tuyên bố. Đuôi chỉ là cái tên - `ghi-chu.txt` đổi thành `.apk` vẫn qua
//      được lớp 1 và 2, và chữ ký Ed25519 sẽ chứng thực một "APK" không phải APK.

/** Trần kích thước mỗi tệp, theo nền tảng. R2 nhận một PUT đơn tới ~5 GiB. */
export const MAX_RELEASE_BYTES: Record<string, number> = {
  ANDROID: 2 * 1024 ** 3,
  WINDOWS: 2 * 1024 ** 3,
  MACOS: 2 * 1024 ** 3,
  LINUX: 2 * 1024 ** 3,
  SOURCE: 2 * 1024 ** 3,
}

export interface LoaiTep {
  /** Đuôi chính tắc, kể cả dấu chấm (`.AppImage`, `.tar.gz`). */
  duoi: string
  contentType: string
  /** Mô tả chữ ký nhị phân mong đợi - đi vào thông báo lỗi. */
  dauHieu: string
  khop: (head: Buffer, tail: Buffer) => boolean
}

const batDau =
  (...sig: number[]) =>
  (head: Buffer) =>
    head.length >= sig.length && sig.every((b, i) => head[i] === b)

const ZIP = batDau(0x50, 0x4b, 0x03, 0x04) // PK\x03\x04
const loai = (
  duoi: string,
  contentType: string,
  dauHieu: string,
  khop: (head: Buffer, tail: Buffer) => boolean
): LoaiTep => ({ duoi, contentType, dauHieu, khop })

const LOAI = {
  exe: loai('.exe', 'application/vnd.microsoft.portable-executable', 'MZ', batDau(0x4d, 0x5a)),
  // MSI là tệp OLE Compound File.
  msi: loai(
    '.msi',
    'application/x-msi',
    'D0 CF 11 E0 A1 B1 1A E1 (OLE)',
    batDau(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)
  ),
  msix: loai('.msix', 'application/msix', 'PK\\x03\\x04 (zip)', ZIP),
  zip: loai('.zip', 'application/zip', 'PK\\x03\\x04 (zip)', ZIP),
  apk: loai('.apk', 'application/vnd.android.package-archive', 'PK\\x03\\x04 (zip)', ZIP),
  aab: loai('.aab', 'application/octet-stream', 'PK\\x03\\x04 (zip)', ZIP),
  // UDIF không có magic ở đầu (thường là dữ liệu nén); dấu nhận dạng là khối
  // `koly` ở đúng 512 byte cuối.
  dmg: loai(
    '.dmg',
    'application/x-apple-diskimage',
    'khối "koly" ở 512 byte cuối (UDIF)',
    (_h, tail) => tail.length === TAIL_BYTES && tail.subarray(0, 4).toString('latin1') === 'koly'
  ),
  pkg: loai('.pkg', 'application/x-xar', 'xar!', batDau(0x78, 0x61, 0x72, 0x21)),
  appimage: loai(
    '.AppImage',
    'application/vnd.appimage',
    '\\x7fELF',
    batDau(0x7f, 0x45, 0x4c, 0x46)
  ),
  deb: loai(
    '.deb',
    'application/vnd.debian.binary-package',
    '!<arch>\\n',
    batDau(0x21, 0x3c, 0x61, 0x72, 0x63, 0x68, 0x3e, 0x0a)
  ),
  rpm: loai('.rpm', 'application/x-rpm', 'ED AB EE DB', batDau(0xed, 0xab, 0xee, 0xdb)),
  targz: loai('.tar.gz', 'application/gzip', '1F 8B (gzip)', batDau(0x1f, 0x8b)),
}

/** Danh sách TRẮNG đuôi tệp theo nền tảng. WEB không có tệp - chỉ đường dẫn ngoài. */
export const RELEASE_FILE_TYPES: Record<string, readonly LoaiTep[]> = {
  WINDOWS: [LOAI.exe, LOAI.msi, LOAI.msix, LOAI.zip],
  ANDROID: [LOAI.apk, LOAI.aab],
  MACOS: [LOAI.dmg, LOAI.pkg, LOAI.zip],
  LINUX: [LOAI.appimage, LOAI.deb, LOAI.rpm, LOAI.targz],
  SOURCE: [LOAI.zip, LOAI.targz],
}

/**
 * Loại tệp của `fileName` nếu đuôi nằm trong danh sách trắng của `platform`,
 * không thì null. So đuôi KHÔNG phân biệt hoa thường (`APP.APK`, `x.appimage`).
 * Đuôi dài xét trước, để `.tar.gz` không bị đọc thành `.gz`.
 */
export function loaiTepPhatHanh(platform: string, fileName: string): LoaiTep | null {
  const ds = RELEASE_FILE_TYPES[platform]
  if (!ds) return null
  const ten = String(fileName || '').toLowerCase()
  return (
    [...ds]
      .sort((a, b) => b.duoi.length - a.duoi.length)
      .find((l) => ten.length > l.duoi.length && ten.endsWith(l.duoi.toLowerCase())) ?? null
  )
}

/**
 * Tên tệp trong khoá object, GIỮ NGUYÊN đuôi chính tắc. `safeFileName()` cắt ở
 * 120 ký tự - cắt cả tên thì tên dài mất đuôi, và niêm phong sau đó từ chối một
 * tệp hợp lệ vì không nhận ra loại.
 */
export function tenTepTrongKho(fileName: string, l: LoaiTep): string {
  const goc = String(fileName || '')
    .split(/[\\/]/)
    .pop()!
  const than = goc.slice(0, goc.length - l.duoi.length)
  return safeFileName(than).slice(0, 120 - l.duoi.length) + l.duoi
}

/** Thay được ở test - xem chú thích đầu tệp. */
export const store = { presignPut, presignGet, hashObject }
