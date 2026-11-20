import express from 'express'
import type { Request, Response } from 'express'
import { prisma } from '@tsudev/db'
import { createRateLimit } from '@tsudev/ratelimit'
import { entitlementSigningKey, findAccessToken, oidcIssuer } from './oidc'
import { callerIp } from './throttle'
import {
  buildClaims,
  countDevices30d,
  dpopBinding,
  loadState,
  mayQueryStatusFor,
  parseInstallationId,
  parsePlatform,
  purgeDeletedSubjects,
  recordEvent,
  signJws,
  STATUS_MAX_SUBS,
  subjectGrantedTo,
  subjectStatuses,
  touchInstallation,
  verifyClientAssertion,
} from './entitlements'
import { addMonths, packageAllowed, PlayError, verifyPlayPurchase } from './playBilling'

/**
 * PRO-B - đường công khai của máy chủ quyền lợi (ADR-0002, PRODUCT_POLICY 7.4).
 *
 * Gắn ở `/ent` (NGOÀI `/api`, như `/oidc`): người gọi là app/máy chủ RP, không phải BFF,
 * nên không qua cổng INTERNAL_API_TOKEN - mỗi route tự xác thực. Next proxy công khai:
 *   https://tsudev.com/api/me/entitlements        → /ent/me
 *   https://tsudev.com/api/rp/entitlements/{sub}  → /ent/rp/{sub}
 *   POST https://tsudev.com/api/rp/entitlements/status → /ent/status (PRO2, ADR-0004)
 *   POST https://tsudev.com/api/rp/entitlements/play   → /ent/play   (B2, phiếu QT5)
 *
 * Trả `{ "jws": "<compact>" }`, `Cache-Control: no-store`. Lỗi theo mã ngắn, không lộ
 * vì sao một `sub` không trả được (không có tài khoản / không có grant ⇒ cùng một 404).
 */
export const entitlementRouter = express.Router()

/** `aud` mà client assertion của RP phải ghi - cố định theo cấu hình, không theo request. */
export const rpAssertionAudience = (): string =>
  `${(process.env.SITE_URL || 'https://tsudev.com').replace(/\/$/, '')}/api/rp/entitlements`

/** `aud` của client assertion cho kênh trạng thái - ĐÚNG URL kênh (7.4). */
export const statusAssertionAudience = (): string => `${rpAssertionAudience()}/status`

/** `aud` của client assertion cho kênh biên nhận Play (B2) - ĐÚNG URL kênh. */
export const playAssertionAudience = (): string => `${rpAssertionAudience()}/play`

/** `htu` mà bằng chứng DPoP của `GET /api/me/entitlements` phải ghi (URL công khai, không theo request). */
export const meEntitlementsHtu = (): string =>
  `${(process.env.SITE_URL || 'https://tsudev.com').replace(/\/$/, '')}/api/me/entitlements`

const ENTITLEMENT_SCOPE = 'tsudev.entitlements'

entitlementRouter.use(
  createRateLimit({
    name: 'quyen-loi',
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_ENTITLEMENT_MAX) || 60,
    keyOf: (req: Request) =>
      `ip:${callerIp(req.headers as Record<string, unknown>, req.ip || '0.0.0.0')}`,
  })
)

entitlementRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

const bearer = (req: Request): string => {
  const h = req.headers.authorization
  return typeof h === 'string' && /^Bearer [^\s]+$/.test(h) ? h.slice(7) : ''
}

async function issue(
  res: Response,
  sub: string,
  clientId: string,
  req: Request,
  now: Date,
  jkt: string | null = null
): Promise<void> {
  const signer = entitlementSigningKey()
  if (!signer) {
    res.status(503).json({ error: 'entitlements_unavailable' })
    return
  }
  await touchInstallation(
    sub,
    clientId,
    parseInstallationId(req.headers['x-tsu-installation']),
    parsePlatform(req.headers['x-tsu-platform']),
    now
  )
  const [{ state, display }, devices30d] = await Promise.all([
    loadState(sub),
    countDevices30d(sub, clientId, now),
  ])
  const claims = buildClaims({
    iss: oidcIssuer(),
    sub,
    aud: clientId,
    now,
    state,
    display,
    devices30d,
    jkt,
  })
  res.json({ jws: signJws(claims, signer) })
}

/** App có access token tsudev (scope `tsudev.entitlements`). `aud` = client của token. */
entitlementRouter.get('/me', (req, res, next) => {
  ;(async () => {
    const token = bearer(req)
    if (!token) return void res.status(401).json({ error: 'invalid_token' })
    const t = await findAccessToken(token)
    if (!t) return void res.status(401).json({ error: 'invalid_token' })
    if (!t.scopes.includes(ENTITLEMENT_SCOPE)) {
      return void res.status(403).json({ error: 'insufficient_scope', scope: ENTITLEMENT_SCOPE })
    }
    const now = new Date()
    // DPoP (RFC 9449, PRO2): access token không gắn khoá; chỉ JWS mang `cnf.jkt`.
    const bind = dpopBinding(req.headers.dpop, {
      htm: 'GET',
      htu: meEntitlementsHtu(),
      accessToken: token,
      now,
    })
    if (!bind.ok) {
      if (bind.status === 401) res.setHeader('WWW-Authenticate', 'DPoP error="invalid_dpop_proof"')
      return void res.status(bind.status).json({ error: 'invalid_dpop_proof' })
    }
    await issue(res, t.accountId, t.clientId, req, now, bind.jkt)
  })().catch(next)
})

/** Máy chủ RP (private_key_jwt). Chỉ cho `sub` đã cấp quyền cho đúng client đó. */
entitlementRouter.get('/rp/:sub', (req, res, next) => {
  ;(async () => {
    const now = new Date()
    const clientId = await verifyClientAssertion(bearer(req), rpAssertionAudience(), now)
    if (!clientId) return void res.status(401).json({ error: 'invalid_client' })
    const sub = String(req.params.sub || '')
    if (!(await subjectGrantedTo(sub, clientId, now))) {
      return void res.status(404).json({ error: 'unknown_subject' })
    }
    await issue(res, sub, clientId, req, now)
  })().catch(next)
})

// ---------------------------------------------------------------------------
// PRO2 - kênh trạng thái (PRODUCT_POLICY 7.4 "Kênh trạng thái", ADR-0004)
// ---------------------------------------------------------------------------
const CLIENT_WINDOW_MS = 60_000
const statusHits = new Map<string, { start: number; n: number }>()
const playHits = new Map<string, { start: number; n: number }>()

/** Giới hạn theo CLIENT (đã xác thực) - IP của máy chủ RP không phải danh tính. */
function clientAllowed(
  hits: Map<string, { start: number; n: number }>,
  max: number,
  clientId: string,
  now: number
): boolean {
  const b = hits.get(clientId)
  if (!b || now - b.start >= CLIENT_WINDOW_MS) {
    hits.set(clientId, { start: now, n: 1 })
    return true
  }
  b.n += 1
  return b.n <= max
}

const statusAllowed = (clientId: string, now: number): boolean =>
  clientAllowed(
    statusHits,
    Number(process.env.RATE_LIMIT_ENTITLEMENT_STATUS_MAX) || 30,
    clientId,
    now
  )

/** Chỉ cho test. */
export const _resetStatusLimit = (): void => {
  statusHits.clear()
  playHits.clear()
}

const CLIENT_ID_RE = /^[A-Za-z0-9._-]{1,64}$/

/**
 * Máy chủ đồng bộ hỏi NGAY TRƯỚC khi xoá bản sao đám mây vì hết Pro. Trả cho mọi `sub`
 * đã TỪNG cấp quyền cho `client_id` - không phụ thuộc grant 30 ngày như `/rp/:sub`.
 * Nhật ký kiểm toán ghi client + số `sub`, KHÔNG ghi danh sách `sub`.
 */
entitlementRouter.post('/status', (req, res, next) => {
  ;(async () => {
    const now = new Date()
    const caller = await verifyClientAssertion(bearer(req), statusAssertionAudience(), now)
    if (!caller) return void res.status(401).json({ error: 'invalid_client' })
    if (!statusAllowed(caller, now.getTime())) {
      res.setHeader('Retry-After', '60')
      return void res.status(429).json({ error: 'rate_limited' })
    }
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >
    const clientId = body.client_id
    const subs = body.subs
    if (
      typeof clientId !== 'string' ||
      !CLIENT_ID_RE.test(clientId) ||
      !Array.isArray(subs) ||
      subs.length === 0 ||
      subs.length > STATUS_MAX_SUBS ||
      !subs.every((s) => typeof s === 'string' && s.length <= 128)
    ) {
      return void res.status(400).json({ error: 'invalid_request', max_subs: STATUS_MAX_SUBS })
    }
    if (!(await mayQueryStatusFor(caller, clientId))) {
      return void res.status(403).json({ error: 'forbidden_client_id' })
    }
    const results = await subjectStatuses(clientId, subs as string[])
    await prisma.trustAuditLog
      .create({
        data: {
          actorId: caller,
          actorName: `rp:${caller}`,
          action: 'entitlement.status',
          targetType: 'OAuthClient',
          targetId: clientId,
          note: `subs=${subs.length}`,
        },
      })
      .catch((e) =>
        console.error('[ent] nhật ký kênh trạng thái hỏng:', e instanceof Error ? e.message : e)
      )
    purgeDeletedSubjects(now).catch((e) =>
      console.error('[ent] dọn DeletedSubject hỏng:', e instanceof Error ? e.message : e)
    )
    res.json({ results })
  })().catch(next)
})

// ---------------------------------------------------------------------------
// B2 - biên nhận Google Play do máy chủ RP chuyển tiếp (ADR-0002 mục 5, phiếu QT5)
// ---------------------------------------------------------------------------
const PACKAGE_RE = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/
const PRODUCT_RE = /^[a-z0-9][a-z0-9._]{0,139}$/
const PURCHASE_TOKEN_RE = /^[A-Za-z0-9._:-]{10,2048}$/

/**
 * 200 ⇒ đã xác minh với Google + ghi sổ cái (+ acknowledge thuê bao): app hoàn tất giao
 * dịch. 400/409/422 ⇒ biên nhận không ghi nhận được, app KHÔNG hoàn tất. Mã khác ⇒ RP thử
 * lại sau; gửi lại cùng biên nhận là an toàn (sổ cái idempotent theo lần thanh toán).
 * Gói trả trước cộng dồn: mốc mới = max(pro_until hiện tại, bây giờ) + thời hạn gói.
 */
entitlementRouter.post('/play', (req, res, next) => {
  ;(async () => {
    const now = new Date()
    const caller = await verifyClientAssertion(bearer(req), playAssertionAudience(), now)
    if (!caller) return void res.status(401).json({ error: 'invalid_client' })
    const playMax = Number(process.env.RATE_LIMIT_ENTITLEMENT_PLAY_MAX) || 30
    if (!clientAllowed(playHits, playMax, caller, now.getTime())) {
      res.setHeader('Retry-After', '60')
      return void res.status(429).json({ error: 'rate_limited' })
    }
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >
    const { client_id: clientId, sub, packageName, productId, purchaseToken } = body
    if (
      typeof clientId !== 'string' ||
      typeof sub !== 'string' ||
      typeof packageName !== 'string' ||
      !PACKAGE_RE.test(packageName) ||
      packageName.length > 150 ||
      typeof productId !== 'string' ||
      !PRODUCT_RE.test(productId) ||
      typeof purchaseToken !== 'string' ||
      !PURCHASE_TOKEN_RE.test(purchaseToken)
    ) {
      return void res.status(400).json({ error: 'invalid_request' })
    }
    if (clientId !== caller) return void res.status(403).json({ error: 'forbidden_client_id' })
    if (!packageAllowed(caller, packageName)) {
      return void res.status(403).json({ error: 'forbidden_package' })
    }
    if (!(await subjectGrantedTo(sub, caller, now))) {
      return void res.status(404).json({ error: 'unknown_subject' })
    }
    let verdict
    try {
      verdict = await verifyPlayPurchase({ packageName, productId, purchaseToken, sub }, now)
    } catch (e) {
      if (e instanceof PlayError) {
        if (e.status === 503) res.setHeader('Retry-After', '300')
        return void res.status(e.status).json({ error: e.code })
      }
      throw e
    }
    let recorded: boolean
    if (verdict.kind === 'pro') {
      const { state } = await loadState(sub)
      const base = state.proUntil && state.proUntil.getTime() > now.getTime() ? state.proUntil : now
      recorded = await recordEvent({
        userId: sub,
        kind: 'play.purchase',
        externalId: verdict.externalId,
        proUntil: addMonths(base, verdict.months),
        proSource: 'play',
      })
    } else {
      recorded = await recordEvent({
        userId: sub,
        kind: 'play.purchase',
        externalId: verdict.externalId,
        donation: true,
      })
    }
    // Ghi sổ cái TRƯỚC, acknowledge SAU: acknowledge hỏng ⇒ 503, RP gửi lại, sổ cái bỏ qua
    // bản trùng và acknowledge được thử lại. Ngược lại thì có thể đã acknowledge mà chưa ghi.
    if (verdict.acknowledge) {
      try {
        await verdict.acknowledge()
      } catch (e) {
        if (e instanceof PlayError) {
          res.setHeader('Retry-After', '300')
          return void res.status(503).json({ error: 'play_unavailable' })
        }
        throw e
      }
    }
    await prisma.trustAuditLog
      .create({
        data: {
          actorId: caller,
          actorName: `rp:${caller}`,
          action: 'entitlement.play',
          targetType: 'User',
          targetId: sub,
          note: `product=${productId} recorded=${recorded} test=${verdict.test}`,
        },
      })
      .catch((e) =>
        console.error('[ent] nhật ký biên nhận Play hỏng:', e instanceof Error ? e.message : e)
      )
    const { state } = await loadState(sub)
    res.json({
      status: recorded ? 'recorded' : 'already_recorded',
      product: verdict.kind,
      pro_until: state.proUntil ? state.proUntil.toISOString() : null,
    })
  })().catch(next)
})
