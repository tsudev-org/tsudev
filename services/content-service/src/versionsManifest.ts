/**
 * INT1-a - bản kê phiên bản có chữ ký (tsudev-standards APP_INTEGRITY 2.1).
 *
 *   GET https://tsudev.com/.well-known/tsudev/versions.json       bản kê (byte chính xác đã ký)
 *   GET https://tsudev.com/.well-known/tsudev/versions.json.sig   chữ ký TÁCH của đúng các byte đó
 *   GET https://tsudev.com/.well-known/tsudev/versions-jwks.json  khoá công khai (app ghim lúc dựng)
 *
 * Định dạng `.sig`: JWS compact TÁCH NỘI DUNG (RFC 7515 phụ lục F) -
 * `<b64url(header)>..<b64url(chữ ký)>`, header `{"alg":"EdDSA","kid":"tsu-versions-2026"}`.
 * App kiểm: ghép `b64url(header) + "." + b64url(byte của versions.json)` rồi Ed25519-verify
 * bằng khoá công khai của `kid`. Chữ ký phủ ĐÚNG các byte tải về, nên app KHÔNG được
 * parse rồi serialize lại trước khi kiểm.
 *
 * Khoá RIÊNG, không dùng chung `RELEASE_SIGNING_KEY` (phiếu INT1 mục 6): lộ một khoá không
 * được cho phép giả cả bản cài lẫn lệnh khoá app.
 *
 *   VERSIONS_SIGNING_KEY           PEM PKCS#8 Ed25519 đã base64 hoá
 *   VERSIONS_SIGNING_KEY_ID        kid (mặc định `tsu-versions-2026`)
 *   VERSIONS_SIGNING_KEYS_RETIRED  kid:<base64 PEM>,... - chỉ công bố trong JWKS khi xoay khoá
 *
 * Production THIẾU khoá ⇒ ba đường trên trả 503, service VẪN khởi động. Khác bản phát
 * hành (thiếu khoá thì từ chối khởi động) có chủ đích: thiếu bản kê thì app giữ bản đệm và
 * không chặn ai; còn backend không khởi động thì cả site trống.
 *
 * Ổn định byte: bản kê chỉ dựng lại khi dữ liệu đổi (nâng `latest`) hoặc đã quá
 * `REBUILD_AFTER_MS`. Ed25519 tất định ⇒ cùng nội dung cùng chữ ký, nên hai request `.json`
 * và `.sig` liên tiếp gần như luôn khớp nhau. `expires_at` = `issued_at` + 7 ngày (trần của
 * chuẩn), dựng lại sau 1 ngày ⇒ bản đang phát luôn còn ≥ 6 ngày.
 */
import { Buffer } from 'buffer'
import { prisma } from '@tsudev/db'
import {
  publicKeyFromPrivatePem,
  publicKeyFromPublicPem,
  signWithPrivatePem,
  verifyWithPublicKey,
} from '@tsudev/trust-crypto'

export const DEFAULT_KID = 'tsu-versions-2026'
export const MANIFEST_TTL_S = 7 * 24 * 60 * 60
export const REBUILD_AFTER_MS = 24 * 60 * 60 * 1000

/** Mã sản phẩm: khớp phần đầu `X-Tsu-App` (`qulythuchi`, `tsucwico`...). */
export const PRODUCT_RE = /^[a-z0-9][a-z0-9-]{1,39}$/
/** Kênh: `github`, `play`, `msstore`, `web`, `winget`... */
export const CHANNEL_RE = /^[a-z][a-z0-9-]{1,23}$/
/** `latest` là bản CHÍNH THỨC `YY.M.DDNN` (VERSIONING 2.1) - không `v`, không `-beta.N`. */
export const VERSION_RE = /^\d{1,4}\.\d{1,4}\.\d{1,6}$/

/**
 * Kênh cửa hàng: URL không chứa phiên bản, nên máy chủ chỉ đo được "trang tải còn sống"
 * (200). Pipeline của kênh này PHẢI tự xác nhận bản đã qua duyệt (API cửa hàng) trước khi
 * gọi nâng. Mọi kênh khác: phiên bản PHẢI xuất hiện trong URL (thẻ/tên tệp) ở một chặng.
 */
export const STORE_CHANNELS = new Set(['play', 'msstore', 'appstore', 'web'])

/** Host được phép đo (chặn SSRF: máy chủ chỉ GET tới nơi phát hành thật). */
const ALLOWED_HOSTS = [
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'raw.githubusercontent.com',
  'codeload.github.com',
  'play.google.com',
  'apps.microsoft.com',
  'apps.apple.com',
  'tsudev.com',
]
export function hostAllowed(host: string): boolean {
  const h = host.toLowerCase()
  return ALLOWED_HOSTS.some((a) => h === a) || h.endsWith('.tsudev.com')
}

/** So hai phiên bản `a.b.c` toàn số. Âm/0/dương như `compareVersions` của @tsudev/ui. */
export function compareCore(a: string, b: string): number {
  const x = a.split('.').map(Number)
  const y = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Phiên bản đứng riêng trong URL (không phải đoạn giữa `126.11.25011`). */
export function urlHasVersion(url: string, version: string): boolean {
  return new RegExp(`(^|[^0-9.])v?${escapeRe(version)}($|[^0-9])`).test(decodeURIComponent(url))
}

// ---------------------------------------------------------------------------
// Khoá
// ---------------------------------------------------------------------------

const DEV_SEED = Buffer.from('tsudev-versions-dev-key-no-use!!', 'utf8') // đúng 32 byte
const DEV_KID = 'dev-insecure-versions'

function devPrivatePem(): string {
  const der = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), DEV_SEED])
  return `-----BEGIN PRIVATE KEY-----\n${der.toString('base64')}\n-----END PRIVATE KEY-----\n`
}

function decodePem(raw: string | undefined): string | null {
  const s = String(raw || '').trim()
  if (!s) return null
  return /BEGIN/.test(s) ? s : Buffer.from(s, 'base64').toString('utf8')
}

type Key = { pem: string; kid: string; pub: Uint8Array; dev: boolean }

function loadKey(): Key | null {
  const pem = decodePem(process.env.VERSIONS_SIGNING_KEY)
  if (pem) {
    const pub = publicKeyFromPrivatePem(pem) // sai dạng ⇒ ném: cấu hình hỏng phải ồn ào
    return { pem, kid: process.env.VERSIONS_SIGNING_KEY_ID || DEFAULT_KID, pub, dev: false }
  }
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[versions] thiếu VERSIONS_SIGNING_KEY - /.well-known/tsudev/versions.json trả 503 cho tới khi đặt khoá'
    )
    return null
  }
  const dev = devPrivatePem()
  return { pem: dev, kid: DEV_KID, pub: publicKeyFromPrivatePem(dev), dev: true }
}

function loadRetired(): Array<[string, Uint8Array]> {
  const out: Array<[string, Uint8Array]> = []
  for (const entry of String(process.env.VERSIONS_SIGNING_KEYS_RETIRED || '')
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    const sep = entry.indexOf(':')
    if (sep < 1) continue
    try {
      const pem = decodePem(entry.slice(sep + 1))
      if (!pem) continue
      let pub: Uint8Array
      try {
        pub = publicKeyFromPublicPem(pem)
      } catch {
        pub = publicKeyFromPrivatePem(pem)
      }
      out.push([entry.slice(0, sep).trim(), pub])
    } catch (e) {
      console.warn(`[versions] bỏ qua khoá nghỉ - ${e instanceof Error ? e.message : e}`)
    }
  }
  return out
}

const key = loadKey()
const retired = loadRetired()

export const keyId = (): string | null => key?.kid ?? null

const b64url = (b: Uint8Array | string) => Buffer.from(b as Uint8Array).toString('base64url')

/** Chữ ký tách (JWS detached) cho đúng các byte `body`. */
export function signDetached(body: string): string {
  if (!key) throw new Error('Thiếu VERSIONS_SIGNING_KEY')
  const h = b64url(JSON.stringify({ alg: 'EdDSA', kid: key.kid }))
  const sig = signWithPrivatePem(key.pem, Buffer.from(`${h}.${b64url(body)}`))
  return `${h}..${b64url(sig)}`
}

/** Kiểm như app sẽ kiểm (dùng cho test và tự kiểm). */
export function verifyDetached(body: string, sig: string): boolean {
  const [h, mid, s] = sig.split('.')
  if (!h || mid !== '' || !s) return false
  try {
    const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8')) as {
      alg?: string
      kid?: string
    }
    if (header.alg !== 'EdDSA') return false
    const pub =
      key && header.kid === key.kid ? key.pub : retired.find(([k]) => k === header.kid)?.[1]
    if (!pub) return false
    return verifyWithPublicKey(
      pub,
      Buffer.from(`${h}.${b64url(body)}`),
      Buffer.from(s, 'base64url')
    )
  } catch {
    return false
  }
}

export function jwks(): { keys: Array<Record<string, unknown>> } {
  const toJwk = (pub: Uint8Array, kid: string) => ({
    kty: 'OKP',
    crv: 'Ed25519',
    x: Buffer.from(pub).toString('base64url'),
    use: 'sig',
    alg: 'EdDSA',
    kid,
  })
  const keys = key ? [toJwk(key.pub, key.kid)] : []
  for (const [k, pub] of retired) if (k !== key?.kid) keys.push(toJwk(pub, k))
  return { keys }
}

// ---------------------------------------------------------------------------
// Bản kê
// ---------------------------------------------------------------------------

export type ChannelRow = { product: string; channel: string; latest: string; url: string | null }

/** Dựng chuỗi JSON TẤT ĐỊNH (sắp theo sản phẩm, kênh) - cùng dữ liệu cùng byte. */
export function buildBody(rows: ChannelRow[], issuedAtS: number): string {
  const products: Record<string, { channels: Record<string, { latest: string; url?: string }> }> =
    {}
  const sorted = [...rows].sort(
    (a, b) => a.product.localeCompare(b.product) || a.channel.localeCompare(b.channel)
  )
  for (const r of sorted) {
    const p = (products[r.product] ??= { channels: {} })
    p.channels[r.channel] = r.url ? { latest: r.latest, url: r.url } : { latest: r.latest }
  }
  return JSON.stringify({
    v: 1,
    issued_at: issuedAtS,
    expires_at: issuedAtS + MANIFEST_TTL_S,
    products,
  })
}

type Built = { body: string; sig: string; builtAt: number }
let cache: Built | null = null

/** Gọi sau mỗi lần nâng `latest` để lượt đọc kế tiếp dựng lại. */
export function invalidate(): void {
  cache = null
}

/** Bản kê + chữ ký hiện hành; null khi không có khoá. NÉM khi lỗi DB. */
export async function current(now = Date.now()): Promise<Built | null> {
  if (!key) return null
  if (cache && now - cache.builtAt < REBUILD_AFTER_MS) return cache
  const rows = await prisma.appVersionChannel.findMany({
    select: { product: true, channel: true, latest: true, url: true },
  })
  const body = buildBody(rows, Math.floor(now / 1000))
  const sig = signDetached(body)
  // Tự kiểm như app sẽ kiểm: hỏng ở đây (khoá lệch, WASM lỗi) thì ném 500 ồn ào thay vì
  // phát một chữ ký mà mọi app sẽ âm thầm bỏ qua.
  if (!verifyDetached(body, sig)) throw new Error('Chữ ký bản kê không tự kiểm được')
  cache = { body, sig, builtAt: now }
  return cache
}

// ---------------------------------------------------------------------------
// Chốt chặn theo kênh: đo URL tải trước khi nâng
// ---------------------------------------------------------------------------

export type VerifyOutcome = { ok: true; finalUrl: string } | { ok: false; reason: string }

const MAX_HOPS = 5
const TIMEOUT_MS = 10_000

/**
 * GET thật `url` (theo chuyển hướng THỦ CÔNG, từng chặng phải nằm trong danh sách host):
 * chặng cuối phải 200; kênh không phải cửa hàng thì phiên bản phải có mặt trong URL ở một
 * chặng (vd. `releases/latest` → `releases/tag/v26.11.2501`, hay tên tệp
 * `tsucwico_26.11.2501_windows-x64-setup.exe`). Thử HEAD trước để khỏi tải cả tệp cài.
 */
export async function verifyDownload(
  url: string,
  latest: string,
  channel: string,
  fetchImpl: typeof fetch = fetch
): Promise<VerifyOutcome> {
  let cur = url
  let sawVersion = urlHasVersion(cur, latest)
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    let u: URL
    try {
      u = new URL(cur)
    } catch {
      return { ok: false, reason: `URL không hợp lệ: ${cur}` }
    }
    if (u.protocol !== 'https:') return { ok: false, reason: `Chỉ nhận https: ${cur}` }
    if (!hostAllowed(u.hostname))
      return { ok: false, reason: `Host không được phép: ${u.hostname}` }

    let res: Response
    try {
      res = await fetchImpl(cur, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (res.status === 405 || res.status === 501) {
        res = await fetchImpl(cur, {
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        await res.body?.cancel().catch(() => undefined)
      }
    } catch (e) {
      return {
        ok: false,
        reason: `Không gọi được ${u.hostname}: ${e instanceof Error ? e.message : e}`,
      }
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) return { ok: false, reason: `Chuyển hướng ${res.status} không có Location` }
      cur = new URL(loc, cur).toString()
      sawVersion ||= urlHasVersion(cur, latest)
      continue
    }
    if (res.status !== 200) return { ok: false, reason: `${cur} trả ${res.status}` }
    if (!STORE_CHANNELS.has(channel) && !sawVersion) {
      return { ok: false, reason: `Không thấy phiên bản ${latest} trong URL tải (${cur})` }
    }
    return { ok: true, finalUrl: cur }
  }
  return { ok: false, reason: `Quá ${MAX_HOPS} lần chuyển hướng` }
}
