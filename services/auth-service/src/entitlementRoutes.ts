import express from 'express'
import type { Request, Response } from 'express'
import { prisma } from '@tsudev/db'
import { createRateLimit } from '@tsudev/ratelimit'
import { entitlementSigningKey, findAccessToken, oidcIssuer } from './oidc'
import { callerIp } from './throttle'
import {
  buildClaims,
  countDevices30d,
  loadState,
  mayQueryStatusFor,
  parseInstallationId,
  parsePlatform,
  purgeDeletedSubjects,
  signJws,
  STATUS_MAX_SUBS,
  subjectGrantedTo,
  subjectStatuses,
  touchInstallation,
  verifyClientAssertion,
  verifyDpopProof,
} from './entitlements'

/**
 * PRO-B - đường công khai của máy chủ quyền lợi (ADR-0002, PRODUCT_POLICY 7.4).
 *
 * Gắn ở `/ent` (NGOÀI `/api`, như `/oidc`): người gọi là app/máy chủ RP, không phải BFF,
 * nên không qua cổng INTERNAL_API_TOKEN - mỗi route tự xác thực. Next proxy công khai:
 *   https://tsudev.com/api/me/entitlements        → /ent/me
 *   https://tsudev.com/api/rp/entitlements/{sub}  → /ent/rp/{sub}
 *   POST https://tsudev.com/api/rp/entitlements/status → /ent/status (PRO2, ADR-0004)
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
    // DPoP (RFC 9449, PRO2): có header ⇒ PHẢI hợp lệ (sai ⇒ 401, không âm thầm bỏ `cnf`);
    // không có ⇒ JWS như cũ. Access token không gắn khoá; chỉ JWS mang `cnf.jkt`.
    const dpop = req.headers.dpop
    let jkt: string | null = null
    if (dpop !== undefined) {
      if (typeof dpop !== 'string' || dpop.includes(',')) {
        return void res.status(400).json({ error: 'invalid_dpop_proof' })
      }
      jkt = verifyDpopProof(dpop, { htm: 'GET', htu: meEntitlementsHtu(), accessToken: token, now })
      if (!jkt) {
        res.setHeader('WWW-Authenticate', 'DPoP error="invalid_dpop_proof"')
        return void res.status(401).json({ error: 'invalid_dpop_proof' })
      }
    }
    await issue(res, t.accountId, t.clientId, req, now, jkt)
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
const STATUS_WINDOW_MS = 60_000
const statusHits = new Map<string, { start: number; n: number }>()

/** Giới hạn theo CLIENT (đã xác thực) - IP của máy chủ RP không phải danh tính. */
function statusAllowed(clientId: string, now: number): boolean {
  const max = Number(process.env.RATE_LIMIT_ENTITLEMENT_STATUS_MAX) || 30
  const b = statusHits.get(clientId)
  if (!b || now - b.start >= STATUS_WINDOW_MS) {
    statusHits.set(clientId, { start: now, n: 1 })
    return true
  }
  b.n += 1
  return b.n <= max
}

/** Chỉ cho test. */
export const _resetStatusLimit = (): void => statusHits.clear()

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
