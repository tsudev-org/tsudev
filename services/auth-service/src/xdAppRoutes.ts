import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { prisma } from '@tsudev/db'
import { createRateLimit } from '@tsudev/ratelimit'
import * as xd from './crossDevice'
import { findAccessToken } from './oidc'
import { accountIsLocked, callerCountry, callerIp } from './throttle'

/**
 * QR2b - vai XÁC NHẬN trong app (CROSS_DEVICE_LOGIN mục 1 + 7, Đ2 Kéo; phiếu 20261124-QR1).
 *
 * App Flutter đã đăng nhập quét QR ở màn đăng nhập máy tính rồi gọi:
 *   POST https://tsudev.com/api/xd/scan|approve|deny  (Authorization: Bearer <access token OIDC>)
 * BFF thấy header `Authorization` ⇒ chuyển tới đây (`/ent/xd/*`), KHÔNG kèm cookie phiên hay INTERNAL_API_TOKEN.
 *
 * Gắn NGOÀI `/api` như `/ent/me`: người gọi là app, mỗi request tự xác thực bằng access token có scope
 * `tsudev.xd` (client chỉ xin được khi bảng `OAuthClient.scopes` có nó). Mở khoá cục bộ (sinh trắc/PIN, T8) là việc
 * của app TRƯỚC khi gọi `approve` - máy chủ không kiểm được, `tsudev_ui` bắt buộc ở phía widget.
 *
 * Giới hạn: 60/phút/IP trước khi tra token (chặn dò token), rồi 20/phút/tài khoản (mục 5: quét 20/phút/tài khoản).
 * Máy trạng thái, kiểm quốc gia, mã khớp: dùng NGUYÊN các hàm của `crossDevice.ts` như luồng trình duyệt.
 */
export const XD_SCOPE = 'tsudev.xd'

type Approver = { id: string; country: string }
type XdReq = Request & { xdApprover?: Approver }

export const xdAppRouter = express.Router()

xdAppRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

const ipKey = (req: Request) =>
  `ip:${callerIp(req.headers as Record<string, unknown>, req.ip || '0.0.0.0')}`

xdAppRouter.use(createRateLimit({ name: 'xd-app-ip', windowMs: 60_000, max: 60, keyOf: ipKey }))

const bearer = (req: Request): string => {
  const h = req.headers.authorization
  return typeof h === 'string' && /^Bearer [^\s]+$/.test(h) ? h.slice(7) : ''
}

/** Access token OIDC còn hạn + scope `tsudev.xd` + tài khoản không bị khoá. */
xdAppRouter.use((req: XdReq, res: Response, next: NextFunction) => {
  ;(async () => {
    const t = await findAccessToken(bearer(req))
    if (!t) {
      res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"')
      return void res.status(401).json({ error: 'invalid_token' })
    }
    if (!t.scopes.includes(XD_SCOPE)) {
      res.setHeader('WWW-Authenticate', `Bearer error="insufficient_scope", scope="${XD_SCOPE}"`)
      return void res.status(403).json({ error: 'insufficient_scope', scope: XD_SCOPE })
    }
    const user = await prisma.user.findUnique({ where: { id: t.accountId } })
    if (!user) return void res.status(401).json({ error: 'invalid_token' })
    if (accountIsLocked(user)) return void res.status(423).json({ error: 'account_locked' })
    req.xdApprover = {
      id: user.id,
      country: callerCountry(req.headers as Record<string, unknown>) || '',
    }
    next()
  })().catch(next)
})

xdAppRouter.use(
  createRateLimit({
    name: 'xd-app-tai-khoan',
    windowMs: 60_000,
    max: 20,
    keyOf: (req: Request) => `acct:${(req as XdReq).xdApprover?.id || ''}`,
  })
)

const id = (req: Request) => (typeof req.body?.id === 'string' ? req.body.id.slice(0, 40) : '')
const k = (req: Request) => (typeof req.body?.k === 'string' ? req.body.k.slice(0, 80) : '')

const route =
  (fn: (a: Approver, req: Request) => Promise<unknown>) =>
  (req: XdReq, res: Response, next: NextFunction) => {
    fn(req.xdApprover as Approver, req)
      .then((body) => res.json(body))
      .catch((e) => {
        if (e instanceof xd.XdError) return res.status(e.status).json({ error: e.code })
        return next(e)
      })
  }

/** Quét QR Đ2 ⇒ thông tin thiết bị mới cho màn Cho phép (mục 6.3). */
xdAppRouter.post(
  '/scan',
  route((a, req) => xd.scan(id(req), k(req), a.id, a.country))
)

/** Cho phép ⇒ mã khớp CHỈ trả cho app này. */
xdAppRouter.post(
  '/approve',
  route((a, req) => xd.approve(id(req), a.id, a.country))
)

xdAppRouter.post(
  '/deny',
  route(async (a, req) => {
    await xd.deny(id(req), a.id)
    return { ok: true }
  })
)
