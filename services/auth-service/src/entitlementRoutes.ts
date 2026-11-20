import express from 'express'
import type { Request, Response } from 'express'
import { createRateLimit } from '@tsudev/ratelimit'
import { entitlementSigningKey, findAccessToken, oidcIssuer } from './oidc'
import { callerIp } from './throttle'
import {
  buildClaims,
  countDevices30d,
  loadState,
  parseInstallationId,
  parsePlatform,
  signJws,
  subjectGrantedTo,
  touchInstallation,
  verifyClientAssertion,
} from './entitlements'

/**
 * PRO-B - đường công khai của máy chủ quyền lợi (ADR-0002, PRODUCT_POLICY 7.4).
 *
 * Gắn ở `/ent` (NGOÀI `/api`, như `/oidc`): người gọi là app/máy chủ RP, không phải BFF,
 * nên không qua cổng INTERNAL_API_TOKEN - mỗi route tự xác thực. Next proxy công khai:
 *   https://tsudev.com/api/me/entitlements        → /ent/me
 *   https://tsudev.com/api/rp/entitlements/{sub}  → /ent/rp/{sub}
 *
 * Trả `{ "jws": "<compact>" }`, `Cache-Control: no-store`. Lỗi theo mã ngắn, không lộ
 * vì sao một `sub` không trả được (không có tài khoản / không có grant ⇒ cùng một 404).
 */
export const entitlementRouter = express.Router()

/** `aud` mà client assertion của RP phải ghi - cố định theo cấu hình, không theo request. */
export const rpAssertionAudience = (): string =>
  `${(process.env.SITE_URL || 'https://tsudev.com').replace(/\/$/, '')}/api/rp/entitlements`

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
  now: Date
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
    await issue(res, t.accountId, t.clientId, req, new Date())
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
