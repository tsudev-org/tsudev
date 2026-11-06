/**
 * Vòng khoá Ed25519 ký BẢN PHÁT HÀNH (ProjectRelease.signature).
 *
 * Nguồn gốc: đây là `services/trust-service/src/signing.ts` của Con dấu tín nhiệm,
 * chuyển sang đây khi Con dấu bị gỡ (kế hoạch Q4/2026 §7.3, §7.6). Năng lực giữ
 * nguyên, chỉ đổi người dùng: ký file cài đặt thay vì chứng chỉ website. Dự án cá
 * nhân không mua được chứng chỉ ký mã, nên một checksum ký được bằng khoá công bố
 * công khai là thứ tốt nhất ta cho được người tải.
 *
 * Khoá công khai công bố ở /.well-known/tsudev-release-jwks.json để bất kỳ ai tự
 * xác minh offline.
 *
 * TÊN BIẾN đã đổi xong HAI ĐỢT (§7.6): đợt 1 đọc RELEASE_SIGNING_* rồi lùi về
 * TRUST_SIGNING_* của Con dấu; đợt 2 (05/11/2026, sau khi Render đã có tên mới và
 * đã xoá tên cũ) gỡ nhánh lùi. Nay CHỈ còn tên mới. Đặt `TRUST_SIGNING_*` không
 * còn tác dụng gì - có test canh, để tên cũ không lặng lẽ sống lại.
 *
 *   RELEASE_SIGNING_KEY           PEM PKCS#8 đã base64 hoá (khoá đang ký)
 *   RELEASE_SIGNING_KEY_ID        kid công bố trong JWKS
 *   RELEASE_SIGNING_KEYS_RETIRED  kid:<base64 PEM>,kid2:<...> - chỉ để xác minh
 *
 *   node services/content-service/scripts/genkey.js
 *
 * Lộ khoá riêng = giả được chữ ký của mọi bản phát hành, nên production BẮT BUỘC
 * có khoá; service từ chối khởi động nếu thiếu.
 */

/** Một chỗ duy nhất biết tên biến môi trường của vòng khoá. */
export function signingEnv(suffix: 'KEY' | 'KEY_ID' | 'KEYS_RETIRED'): string | undefined {
  const v = process.env[`RELEASE_SIGNING_${suffix}`]
  return v === '' ? undefined : v
}

import { Buffer } from 'buffer'
import {
  publicKeyFromPrivatePem,
  publicKeyFromPublicPem,
  signWithPrivatePem,
  verifyWithPublicKey,
} from '@tsudev/trust-crypto'

export type VerifyResult =
  { valid: true; payload: unknown; keyId: string } | { valid: false; reason: string }

/**
 * Khoá đang ký. Giữ nguyên văn PEM chứ không giữ đối tượng khoá đã phân giải:
 * việc phân giải nằm bên trong WASM, nơi hạt giống được xoá ngay sau khi dùng.
 * Đây cũng là lý do KHÔNG truyền 32 byte hạt giống qua ranh giới - làm thế sẽ
 * vật chất hoá khoá thô thành một Buffer trong heap JS, tệ hơn hiện trạng.
 */
type LoadedKey = { pem: string; kid: string; dev: boolean }

// Khoá dev cố định, sinh từ seed công khai bên dưới. Cố định (thay vì sinh ngẫu
// nhiên mỗi lần chạy) để chứng chỉ cấp trước khi restart vẫn xác minh được.
// Không bao giờ dùng ngoài môi trường phát triển.
// Giữ nguyên chuỗi (đúng 32 byte): đổi nó là đổi khoá dev.
const DEV_SEED = Buffer.from('tsudev-trust-dev-key-do-not-use!', 'utf8')
const DEV_KID = 'dev-insecure'

function devPrivatePem(): string {
  // Ed25519 PKCS#8 = tiền tố DER cố định + 32 byte seed.
  const prefix = Buffer.from('302e020100300506032b657004220420', 'hex')
  const der = Buffer.concat([prefix, DEV_SEED])
  return `-----BEGIN PRIVATE KEY-----\n${der.toString('base64')}\n-----END PRIVATE KEY-----\n`
}

/** Chấp nhận PEM thô hoặc PEM đã base64 hoá - .env nào cũng chở được một dòng. */
function decodePem(raw: string | undefined | null): string | null {
  const s = String(raw || '').trim()
  if (!s) return null
  return /BEGIN/.test(s) ? s : Buffer.from(s, 'base64').toString('utf8')
}

/**
 * Kiểm PEM khoá riêng là Ed25519 hợp lệ bằng cách RÚT THỬ khoá công khai.
 *
 * Không có bước "kiểm kiểu khoá" riêng nữa: với Ed25519, rút được khoá công
 * khai chính là bằng chứng PKCS#8 đúng dạng. Sai dạng thì WASM ném lỗi.
 */
function assertEd25519Private(pem: string, label: string): Uint8Array {
  try {
    return publicKeyFromPrivatePem(pem)
  } catch (e) {
    throw new Error(`${label} phải là khoá Ed25519 - ${e instanceof Error ? e.message : e}`, {
      cause: e,
    })
  }
}

function loadPrivateKey(): LoadedKey {
  const pem = decodePem(signingEnv('KEY'))
  if (pem) {
    assertEd25519Private(pem, 'RELEASE_SIGNING_KEY')
    return { pem, kid: signingEnv('KEY_ID') || 'default', dev: false }
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Thiếu RELEASE_SIGNING_KEY - không thể ký bản phát hành ở production.')
  }
  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[release-signing] chưa đặt RELEASE_SIGNING_KEY, đang dùng khoá dev công khai.\n' +
        '        Chữ ký bằng khoá này KHÔNG có giá trị. Sinh khoá thật:\n' +
        '        node services/content-service/scripts/genkey.js'
    )
  }
  return { pem: devPrivatePem(), kid: DEV_KID, dev: true }
}

/**
 * Các khoá chỉ dùng để xác minh. Một mục hỏng không được phép làm chết service:
 * hậu quả của việc bỏ qua nó chỉ là vài chứng chỉ cũ báo "không có khoá", còn
 * hậu quả của việc ném lỗi là toàn bộ hệ thống cấp dấu ngừng chạy.
 */
function loadRetiredKeys(): Map<string, Uint8Array> {
  const ring = new Map<string, Uint8Array>()
  const raw = String(signingEnv('KEYS_RETIRED') || '').trim()
  for (const entry of raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    const sep = entry.indexOf(':')
    if (sep < 1) {
      console.warn(
        `[release-signing] RELEASE_SIGNING_KEYS_RETIRED: bỏ qua mục sai định dạng (cần "kid:<base64 PEM>")`
      )
      continue
    }
    const kid = entry.slice(0, sep).trim()
    try {
      const pem = decodePem(entry.slice(sep + 1))
      if (!pem) throw new Error('phần PEM rỗng')
      // Nhận cả khoá riêng lẫn khoá công khai; khoá đã nghỉ chỉ cần phần công khai.
      let pub: Uint8Array
      try {
        pub = publicKeyFromPublicPem(pem)
      } catch (e) {
        pub = publicKeyFromPrivatePem(pem)
      }
      ring.set(kid, pub)
    } catch (e) {
      console.warn(
        `[release-signing] RELEASE_SIGNING_KEYS_RETIRED: bỏ qua khoá ${kid} - ${
          e instanceof Error ? e.message : String(e)
        }`
      )
    }
  }
  return ring
}

const { pem: privatePem, kid, dev: usingDevKey } = loadPrivateKey()
const publicKey = publicKeyFromPrivatePem(privatePem)

// Vòng khoá xác minh: khoá đang ký + các khoá đã nghỉ.
const verifyRing = loadRetiredKeys()
verifyRing.set(kid, publicKey)

// Ở dev, chứng chỉ cũ trong DB thường được ký bằng khoá dev. Giữ nó trong vòng
// xác minh để trang xác thực không báo hỏng oan sau khi lập trình viên đặt khoá
// thật. Production không bao giờ nạp khoá này.
if (!verifyRing.has(DEV_KID) && process.env.NODE_ENV !== 'production') {
  verifyRing.set(DEV_KID, publicKeyFromPrivatePem(devPrivatePem()))
}

const b64url = (buf: Buffer | Uint8Array | string): string =>
  Buffer.from(buf as Uint8Array).toString('base64url')

/** Ký payload thành JWS compact (EdDSA). */
function sign(payload: unknown): string {
  const header = { alg: 'EdDSA', typ: 'JWT', kid }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const sig = signWithPrivatePem(privatePem, Buffer.from(signingInput))
  return `${signingInput}.${b64url(sig)}`
}

/**
 * Xác minh JWS. Trả { valid, payload, reason } - không ném lỗi, để trang xác
 * thực hiển thị được lý do hỏng thay vì trả 500.
 */
function verify(jws: string | null | undefined, keyForKid?: Uint8Array): VerifyResult {
  try {
    // Kiểm CÓ MẶT (`=== undefined`), không kiểm truthy.
    //
    // Khác biệt này quan trọng: một JWS tấn công kiểu đổi thuật toán thường có
    // phần chữ ký RỖNG ("header.payload."). Loại nó ở đây vì "sai định dạng" sẽ
    // che mất lý do thật, và lý do thật - thuật toán không được chấp nhận - mới
    // là thứ trang xác minh cần nói ra. Kiểm alg phải được chạy TRƯỚC.
    const parts = String(jws || '').split('.')
    const headerB64 = parts[0]
    const payloadB64 = parts[1]
    const sigB64 = parts[2]
    if (
      parts.length !== 3 ||
      headerB64 === undefined ||
      payloadB64 === undefined ||
      sigB64 === undefined
    ) {
      return { valid: false, reason: 'Chữ ký sai định dạng' }
    }
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as {
      alg?: string
      kid?: string
    }
    if (header.alg !== 'EdDSA')
      return { valid: false, reason: `Thuật toán không được chấp nhận: ${header.alg}` }
    const pub = keyForKid || (header.kid ? verifyRing.get(header.kid) : undefined)
    if (!pub) return { valid: false, reason: `Không có khoá công khai cho kid=${header.kid}` }
    const ok = verifyWithPublicKey(
      pub,
      Buffer.from(`${headerB64}.${payloadB64}`),
      Buffer.from(sigB64, 'base64url')
    )
    if (!ok) return { valid: false, reason: 'Chữ ký không khớp' }
    return {
      valid: true,
      payload: JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')),
      keyId: header.kid ?? '',
    }
  } catch (e) {
    return {
      valid: false,
      reason: e instanceof Error && e.message ? e.message : 'Không đọc được chữ ký',
    }
  }
}

/**
 * JWKS công khai - chỉ chứa khoá công khai, an toàn để phát tán. Khoá đang ký
 * đứng đầu để client nào chỉ lấy phần tử thứ nhất vẫn dùng đúng.
 */
function jwks(): { keys: Array<Record<string, unknown>> } {
  // Dựng JWK tay từ 32 byte thô. Ed25519 chỉ có đúng một hình dạng JWK, và làm
  // vậy thì không phụ thuộc vào bất kỳ API xuất khoá nào của runtime - cùng mã
  // này chạy được ở edge.
  const toJwk = (pub: Uint8Array, keyId: string) => ({
    kty: 'OKP',
    crv: 'Ed25519',
    x: Buffer.from(pub).toString('base64url'),
    use: 'sig',
    alg: 'EdDSA',
    kid: keyId,
  })
  const keys = [toJwk(publicKey, kid)]
  for (const [k, pub] of verifyRing) if (k !== kid) keys.push(toJwk(pub, k))
  return { keys }
}

const verifyKeyIds = (): string[] => [...verifyRing.keys()]

export { sign, verify, jwks, kid, usingDevKey, verifyKeyIds }
