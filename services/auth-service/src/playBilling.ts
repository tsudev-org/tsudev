import { createHash, createSign } from 'crypto'

/**
 * B2 - xác minh biên nhận Google Play cho máy chủ quyền lợi (ADR-0002 mục 5, phiếu QT5).
 *
 * Gọi Play Developer API bằng tài khoản dịch vụ (`PLAY_SERVICE_ACCOUNT_JSON`, JSON thô hoặc
 * base64) - KHÔNG tin bất cứ gì app/RP khai về trạng thái giao dịch. Chưa cấu hình ⇒ mọi
 * biên nhận trả 503 `play_unavailable` (RP thử lại sau, app không hoàn tất giao dịch nên
 * Play tự hoàn tiền nếu quá 3 ngày - không ai mất tiền).
 *
 * Bất biến (test/entitlementPlay.test.ts canh):
 *   - Biên nhận chỉ gắn được vào ĐÚNG tài khoản đã mua: `obfuscatedExternalAccountId` phải
 *     bằng base64url(SHA-256("tsudev-pro|" + sub)); thiếu cũng là sai.
 *   - Chỉ gói trả trước (`prepaidPlan`) của `tsudev_pro` với base plan đã biết được cộng
 *     dồn thời hạn - thuê bao tự gia hạn cần RTDN, chưa làm, nên bị từ chối.
 *   - Biên nhận Google báo không tồn tại / huỷ ⇒ 422; đang chờ thanh toán ⇒ 409; lỗi phía
 *     Google hoặc cấu hình ⇒ 503 (thử lại được).
 */

export const PRO_PRODUCT = 'tsudev_pro'
/** base plan của gói trả trước → số tháng cộng thêm. */
export const PRO_BASE_PLANS: Readonly<Record<string, number>> = { nam: 12 }
export const DONATION_RE = /^ung_ho_[0-9]{1,4}k$/

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications'
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher'
const TIMEOUT_MS = 10_000

export class PlayError extends Error {
  constructor(
    readonly status: 400 | 409 | 422 | 503,
    readonly code: string
  ) {
    super(code)
  }
}

export const obfuscatedAccountId = (sub: string): string =>
  createHash('sha256').update(`tsudev-pro|${sub}`).digest('base64url')

/**
 * `PLAY_PACKAGES` = `client_id=package[,package];client_id=package` - gói Android nào được
 * client RP nào chuyển biên nhận lên. Không khai ⇒ không client nào dùng được kênh.
 */
export function packageAllowed(clientId: string, packageName: string): boolean {
  for (const entry of (process.env.PLAY_PACKAGES || '').split(';')) {
    const [cid, pkgs] = entry.split('=')
    if (cid?.trim() !== clientId || !pkgs) continue
    if (pkgs.split(',').some((p) => p.trim() === packageName)) return true
  }
  return false
}

type ServiceAccount = { email: string; key: string }

export function serviceAccount(): ServiceAccount | null {
  const raw = (process.env.PLAY_SERVICE_ACCOUNT_JSON || '').trim()
  if (!raw) return null
  try {
    const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    const j = JSON.parse(text) as Record<string, unknown>
    if (typeof j.client_email === 'string' && typeof j.private_key === 'string') {
      return { email: j.client_email, key: j.private_key }
    }
  } catch {
    // rơi xuống dòng log bên dưới
  }
  console.error('[play] PLAY_SERVICE_ACCOUNT_JSON không đọc được (cần client_email + private_key)')
  return null
}

type Fetch = typeof fetch
let fetchImpl: Fetch = (input, init) => fetch(input, init)
let tokenCache: { token: string; exp: number } | null = null

/** Chỉ cho test (gọi qua `require` nên knip không thấy). @testonly */
export const _setPlayFetch = (f: Fetch | null): void => {
  fetchImpl = f ?? ((input, init) => fetch(input, init))
  tokenCache = null
}

const b64 = (v: unknown): string => Buffer.from(JSON.stringify(v)).toString('base64url')

async function accessToken(sa: ServiceAccount, now: number): Promise<string> {
  if (tokenCache && tokenCache.exp > now + 60_000) return tokenCache.token
  const iat = Math.floor(now / 1000)
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600,
  })}`
  let assertion: string
  try {
    assertion = `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(sa.key).toString('base64url')}`
  } catch {
    console.error('[play] khoá riêng của tài khoản dịch vụ không ký được')
    throw new PlayError(503, 'play_unavailable')
  }
  const r = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => null)
  const j = r?.ok ? ((await r.json().catch(() => null)) as Record<string, unknown> | null) : null
  if (!j || typeof j.access_token !== 'string') {
    console.error(`[play] không lấy được access token Google (HTTP ${r?.status ?? 'mạng'})`)
    throw new PlayError(503, 'play_unavailable')
  }
  const ttl = typeof j.expires_in === 'number' ? j.expires_in : 3600
  tokenCache = { token: j.access_token, exp: now + ttl * 1000 }
  return j.access_token
}

async function play(
  sa: ServiceAccount,
  method: 'GET' | 'POST',
  path: string,
  now: number
): Promise<Record<string, unknown>> {
  const token = await accessToken(sa, now)
  const r = await fetchImpl(`${API}/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
    },
    ...(method === 'POST' ? { body: '{}' } : {}),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => null)
  if (!r) throw new PlayError(503, 'play_unavailable')
  // 400/404/410: Google không nhận token này cho gói/sản phẩm đó - biên nhận sai, thử lại vô ích.
  if (r.status === 400 || r.status === 404 || r.status === 410) {
    throw new PlayError(422, 'purchase_invalid')
  }
  if (!r.ok) {
    // 401/403 = tài khoản dịch vụ thiếu quyền trên Play Console - lỗi cấu hình, phải ồn ào.
    console.error(
      `[play] Play Developer API trả HTTP ${r.status} cho ${method} ${path.split('/')[0]}`
    )
    if (r.status === 401) tokenCache = null
    throw new PlayError(503, 'play_unavailable')
  }
  const text = await r.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new PlayError(503, 'play_unavailable')
  }
}

export type PlayPurchase = {
  packageName: string
  productId: string
  purchaseToken: string
  sub: string
}

export type PlayVerdict = {
  kind: 'pro' | 'donation'
  /** Khoá idempotent của sổ cái: SHA-256(token | orderId) - mỗi lần thanh toán ghi đúng một lần. */
  externalId: string
  months: number
  test: boolean
  /** Thuê bao chưa acknowledge ⇒ hàm gọi acknowledge (SAU khi đã ghi sổ cái). Tiêu hao: app tự consume. */
  acknowledge: (() => Promise<void>) | null
}

const ext = (token: string, orderId: unknown): string =>
  createHash('sha256')
    .update(`${token}|${typeof orderId === 'string' ? orderId : ''}`)
    .digest('base64url')

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

/** Xác minh một biên nhận với Google. Ném `PlayError` cho mọi trường hợp không ghi nhận được. */
export async function verifyPlayPurchase(p: PlayPurchase, now: Date): Promise<PlayVerdict> {
  const isPro = p.productId === PRO_PRODUCT
  if (!isPro && !DONATION_RE.test(p.productId)) throw new PlayError(400, 'unknown_product')
  const sa = serviceAccount()
  if (!sa) throw new PlayError(503, 'play_unavailable')
  const pkg = encodeURIComponent(p.packageName)
  const tok = encodeURIComponent(p.purchaseToken)
  const expectedAccount = obfuscatedAccountId(p.sub)
  const t = now.getTime()

  if (isPro) {
    const s = await play(sa, 'GET', `${pkg}/purchases/subscriptionsv2/tokens/${tok}`, t)
    const state = s.subscriptionState
    if (state === 'SUBSCRIPTION_STATE_PENDING') throw new PlayError(409, 'purchase_pending')
    if (state !== 'SUBSCRIPTION_STATE_ACTIVE') throw new PlayError(422, 'purchase_invalid')
    if (obj(s.externalAccountIdentifiers).obfuscatedExternalAccountId !== expectedAccount) {
      throw new PlayError(422, 'account_mismatch')
    }
    const items = Array.isArray(s.lineItems) ? s.lineItems.map(obj) : []
    const item = items.find((i) => i.productId === PRO_PRODUCT)
    const months = PRO_BASE_PLANS[String(obj(item?.offerDetails).basePlanId)]
    if (!item || items.length !== 1 || !item.prepaidPlan || !months) {
      throw new PlayError(422, 'purchase_invalid')
    }
    const needsAck = s.acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
    return {
      kind: 'pro',
      externalId: ext(p.purchaseToken, item.latestSuccessfulOrderId ?? s.latestOrderId),
      months,
      test: s.testPurchase !== undefined,
      acknowledge: needsAck
        ? async () => {
            await play(
              sa,
              'POST',
              `${pkg}/purchases/subscriptions/${encodeURIComponent(PRO_PRODUCT)}/tokens/${tok}:acknowledge`,
              Date.now()
            )
          }
        : null,
    }
  }

  const r = await play(
    sa,
    'GET',
    `${pkg}/purchases/products/${encodeURIComponent(p.productId)}/tokens/${tok}`,
    t
  )
  if (r.purchaseState === 2) throw new PlayError(409, 'purchase_pending')
  if (r.purchaseState !== 0) throw new PlayError(422, 'purchase_invalid')
  if (r.obfuscatedExternalAccountId !== expectedAccount) {
    throw new PlayError(422, 'account_mismatch')
  }
  return {
    kind: 'donation',
    externalId: ext(p.purchaseToken, r.orderId),
    months: 0,
    test: r.purchaseType === 0,
    acknowledge: null,
  }
}

/** Cộng `months` tháng theo lịch UTC. */
export function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime())
  out.setUTCMonth(out.getUTCMonth() + months)
  return out
}
