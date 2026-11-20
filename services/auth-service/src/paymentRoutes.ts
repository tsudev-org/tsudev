import express from 'express'
import type { Request, Response } from 'express'
import { randomInt } from 'crypto'
import { prisma } from '@tsudev/db'
import { lookupUser, requireSecondFactor } from '@tsudev/auth'
import { createRateLimit } from '@tsudev/ratelimit'
import { badgeFor, loadState, recordEvent } from './entitlements'
import type { BadgeDisplay } from './entitlements'

/**
 * PRO-B bước B3 - mua Pro / ủng hộ trên web bằng chuyển khoản VietQR (PRODUCT_POLICY 7.4).
 *
 * Luồng: người dùng tạo `PaymentIntent` ⇒ nhận mã `TSU <8 ký tự>` + số tiền ⇒ chuyển khoản với
 * đúng nội dung đó ⇒ OWNER đối soát sao kê và xác nhận ở /admin/thanh-toan ⇒ `recordEvent`
 * ('web.vietqr' cho Pro, 'web.donate' cho ủng hộ) với `externalId` = mã. Không có cổng thanh
 * toán tự động nên KHÔNG có đường nào cấp quyền lợi mà không qua tay OWNER (đã bật 2FA).
 *
 * Bất biến (test/payments.test.ts):
 *  - Xác nhận hai lần ⇒ MỘT sự kiện (cập nhật có điều kiện `status IN (pending, expired)` +
 *    `recordEvent` idempotent theo (kind, externalId)).
 *  - Chỉ OWNER + TOTP đã xác nhận; vai trò đọc từ DB (lookupUser), không từ claim.
 *  - Ý định hết hạn sau 72 giờ; OWNER vẫn xác nhận được ý định `expired` (tiền về trễ) nhưng
 *    không xác nhận lại được ý định `confirmed`/`rejected`.
 *
 * Gắn ở `/api/identity/pay` (người dùng) và `/api/identity/payadmin` (OWNER), qua proxy CÓ
 * PHIÊN `pages/api/account/[...path].ts` - tên action 2 đoạn.
 */

export const INTENT_TTL_MS = 72 * 60 * 60 * 1000
/** Trần ý định đang chờ mỗi tài khoản - chặn bơm bảng bằng nút "Tạo mã". */
export const MAX_PENDING = 5

export type PlanKind =
  'pro_month' | 'pro_year' | 'donate_20k' | 'donate_50k' | 'donate_100k' | 'donate_200k'

/**
 * Bảng giá PRODUCT_POLICY 7.2 (v4.0.0): MỘT gói Pro kỳ 1 năm 490.000 ₫, không gói tháng.
 * `months` = số tháng Pro cộng thêm (12 = 1 năm theo lịch, UTC); 0 = ủng hộ.
 * `legacy` = KHÔNG tạo mới được; chỉ còn để xác nhận ý định đã tạo trước PRO2 (người đã
 * chuyển 49.000 ₫ vẫn nhận đúng 1 tháng đã trả). Hết hạn 72 giờ sau PRO2 thì vô dụng.
 */
export const PLANS: Record<PlanKind, { amountVnd: number; months: number; legacy?: true }> = {
  pro_year: { amountVnd: 490_000, months: 12 },
  pro_month: { amountVnd: 49_000, months: 1, legacy: true },
  donate_20k: { amountVnd: 20_000, months: 0 },
  donate_50k: { amountVnd: 50_000, months: 0 },
  donate_100k: { amountVnd: 100_000, months: 0 },
  donate_200k: { amountVnd: 200_000, months: 0 },
}

export const isPlanKind = (v: unknown): v is PlanKind =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(PLANS, v)

/** Gói còn bán (tạo ý định mới được). */
export const isSellable = (v: unknown): v is PlanKind => isPlanKind(v) && !PLANS[v].legacy

/** Crockford base32: không có I, L, O, U ⇒ đọc/gõ lại từ sao kê không nhầm. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{8}$/

export function newCode(): string {
  let s = ''
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(32)]
  return s
}

/**
 * Chuẩn hoá mã OWNER gõ/dán từ sao kê: bỏ tiền tố `TSU`, khoảng trắng, gạch; in hoa; O→0,
 * I/L→1 (quy tắc Crockford). Trả null nếu không ra đúng 8 ký tự hợp lệ.
 */
export function normalizeCode(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v
    .toUpperCase()
    .replace(/^\s*TSU/, '')
    .replace(/[\s_-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  return CODE_RE.test(s) ? s : null
}

/** `?app=` của luồng mua: client_id OIDC. Sai dạng ⇒ bỏ qua (không chặn việc mua). */
const CLIENT_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/

/** Cộng tháng theo lịch (UTC); ngày 31 + 1 tháng ⇒ ngày cuối tháng sau, không tràn sang tháng kế. */
export function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime())
  const day = r.getUTCDate()
  r.setUTCDate(1)
  r.setUTCMonth(r.getUTCMonth() + months)
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate()
  r.setUTCDate(Math.min(day, last))
  return r
}

/**
 * Pro mới = max(pro_until, bây giờ) + số tháng của gói (7.2: `max(pro_until, now) + 1 năm`).
 * Cộng dồn - gia hạn sớm không mất ngày đã trả. Idempotent theo mã ý định ở `recordEvent`.
 */
export const extendPro = (current: Date | null, now: Date, months: number): Date =>
  addMonths(current && current > now ? current : now, months)

const BADGE_DISPLAYS: readonly BadgeDisplay[] = ['AUTO', 'PRO', 'DONOR', 'BOTH', 'HIDDEN']

type IntentRow = {
  code: string
  kind: string
  amountVnd: number
  status: string
  clientId: string | null
  expiresAt: Date
  confirmedAt: Date | null
  createdAt: Date
}

const publicIntent = (r: IntentRow) => ({
  code: r.code,
  kind: r.kind,
  amountVnd: r.amountVnd,
  status: r.status,
  app: r.clientId,
  expiresAt: r.expiresAt.toISOString(),
  confirmedAt: r.confirmedAt ? r.confirmedAt.toISOString() : null,
  createdAt: r.createdAt.toISOString(),
})

/** Đánh dấu hết hạn lười - không cần cron. */
const expireStale = (now: Date, userId?: string) =>
  prisma.paymentIntent.updateMany({
    where: { status: 'pending', expiresAt: { lte: now }, ...(userId ? { userId } : {}) },
    data: { status: 'expired' },
  })

const str = (v: unknown, max = 200): string => (typeof v === 'string' ? v.slice(0, max) : '')

const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next)
  }

const noStore = (_req: Request, res: Response, next: () => void) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
}

// ---------------------------------------------------------------------------
// Người dùng: /api/identity/pay/*
// ---------------------------------------------------------------------------
export const payRouter = express.Router()
payRouter.use(noStore)
payRouter.use(
  createRateLimit({
    name: 'thanh-toan',
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_PAYMENT_MAX) || 30,
    keyOf: (req: Request) => `u:${req.user?.sub || req.ip || '?'}`,
  })
)

/** Trạng thái Pro/Ủng hộ + huy hiệu + 20 ý định gần nhất của chính mình. */
payRouter.post(
  '/status',
  handle(async (req, res) => {
    const user = await lookupUser(req)
    if (!user) return res.status(401).json({ error: 'unauthenticated' })
    const now = new Date()
    await expireStale(now, user.id)
    const [{ state, display }, intents] = await Promise.all([
      loadState(user.id),
      prisma.paymentIntent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])
    return res.json({
      proUntil: state.proUntil ? state.proUntil.toISOString() : null,
      proActive: Boolean(state.proUntil && state.proUntil > now),
      proSource: state.proSource,
      donor: Boolean(state.donorSince),
      badgeDisplay: display,
      badge: badgeFor(state, display, now),
      intents: intents.map(publicIntent),
    })
  })
)

/** Tạo (hoặc dùng lại) ý định thanh toán. Trả mã + số tiền; trang tự dựng VietQR. */
payRouter.post(
  '/create',
  handle(async (req, res) => {
    const user = await lookupUser(req)
    if (!user) return res.status(401).json({ error: 'unauthenticated' })
    const kind = req.body?.kind
    if (!isSellable(kind)) return res.status(400).json({ error: 'invalid_kind' })
    const app = str(req.body?.app, 64).trim().toLowerCase()
    const clientId = app && CLIENT_ID_RE.test(app) ? app : null

    const now = new Date()
    await expireStale(now, user.id)
    // Bấm lại cùng gói ⇒ trả lại đúng mã đang chờ: người dùng có thể đã chuyển khoản theo mã đó.
    const same = await prisma.paymentIntent.findFirst({
      where: { userId: user.id, kind, clientId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    })
    if (same) return res.json(publicIntent(same))

    const pending = await prisma.paymentIntent.count({
      where: { userId: user.id, status: 'pending' },
    })
    if (pending >= MAX_PENDING) return res.status(429).json({ error: 'too_many_pending' })

    for (let i = 0; i < 5; i++) {
      try {
        const row = await prisma.paymentIntent.create({
          data: {
            code: newCode(),
            userId: user.id,
            kind,
            amountVnd: PLANS[kind].amountVnd,
            clientId,
            expiresAt: new Date(now.getTime() + INTENT_TTL_MS),
          },
        })
        return res.status(201).json(publicIntent(row))
      } catch (e) {
        // P2002 = trùng khoá chính (mã) - 40 bit nên hiếm, thử mã khác.
        if ((e as { code?: string })?.code !== 'P2002') throw e
      }
    }
    return res.status(503).json({ error: 'code_collision' })
  })
)

/** Tài khoản → Huy hiệu: chọn cách hiển thị (bảng 4.1 PRODUCT_POLICY). */
payRouter.post(
  '/badge',
  handle(async (req, res) => {
    const user = await lookupUser(req)
    if (!user) return res.status(401).json({ error: 'unauthenticated' })
    const display = req.body?.display
    if (!BADGE_DISPLAYS.includes(display)) return res.status(400).json({ error: 'invalid_display' })
    const { state } = await loadState(user.id)
    await prisma.entitlement.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...state, badgeDisplay: display },
      update: { badgeDisplay: display },
    })
    return res.json({ badgeDisplay: display, badge: badgeFor(state, display, new Date()) })
  })
)

// ---------------------------------------------------------------------------
// OWNER: /api/identity/payadmin/*
// ---------------------------------------------------------------------------
export const payAdminRouter = express.Router()
payAdminRouter.use(noStore)

/** Như requireOwner của index.ts: vai trò TỪ DB, fail closed, bắt buộc TOTP (G6). */
async function requireOwner(req: Request, res: Response) {
  const user = await lookupUser(req)
  if (!user) {
    res.status(401).json({ error: 'unauthenticated' })
    return null
  }
  if (user.role !== 'OWNER') {
    res.status(403).json({ error: 'forbidden' })
    return null
  }
  if (!(await requireSecondFactor(user, res))) return null
  return user
}

const audit = (
  actor: { id: string; displayName: string | null; username: string },
  action: string,
  targetId: string,
  targetLabel: string,
  note: string
) =>
  prisma.trustAuditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.displayName || actor.username,
      action,
      targetType: 'User',
      targetId,
      targetLabel,
      note,
    },
  })

const STATUSES = ['pending', 'expired', 'confirmed', 'rejected'] as const

payAdminRouter.post(
  '/list',
  handle(async (req, res) => {
    if (!(await requireOwner(req, res))) return
    const now = new Date()
    await expireStale(now)
    const status = str(req.body?.status, 20)
    const code = normalizeCode(req.body?.q)
    const where = code
      ? { code }
      : { status: (STATUSES as readonly string[]).includes(status) ? status : 'pending' }
    const rows = await prisma.paymentIntent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { username: true, displayName: true } } },
    })
    return res.json({
      items: rows.map((r) => ({
        ...publicIntent(r),
        username: r.user.username,
        displayName: r.user.displayName,
        confirmedBy: r.confirmedBy,
      })),
    })
  })
)

payAdminRouter.post(
  '/confirm',
  handle(async (req, res) => {
    const actor = await requireOwner(req, res)
    if (!actor) return
    const code = normalizeCode(req.body?.code)
    if (!code) return res.status(400).json({ error: 'invalid_code' })
    const intent = await prisma.paymentIntent.findUnique({
      where: { code },
      include: { user: { select: { username: true } } },
    })
    if (!intent) return res.status(404).json({ error: 'not_found' })
    if (!isPlanKind(intent.kind)) return res.status(409).json({ error: 'invalid_kind' })
    const now = new Date()
    // Khoá trạng thái TRƯỚC khi ghi sổ: hai lần bấm song song chỉ một lần qua được điều kiện này.
    const claimed = await prisma.paymentIntent.updateMany({
      where: { code, status: { in: ['pending', 'expired'] } },
      data: { status: 'confirmed', confirmedBy: actor.id, confirmedAt: now },
    })
    if (claimed.count !== 1) return res.status(409).json({ error: 'already_' + intent.status })

    const plan = PLANS[intent.kind]
    let proUntil: Date | null = null
    if (plan.months > 0) {
      const { state } = await loadState(intent.userId)
      proUntil = extendPro(state.proUntil, now, plan.months)
    }
    const recorded = await recordEvent({
      userId: intent.userId,
      kind: plan.months > 0 ? 'web.vietqr' : 'web.donate',
      externalId: code,
      proUntil,
      proSource: plan.months > 0 ? 'web' : null,
      donation: plan.months === 0,
      actorId: actor.id,
    })
    await audit(
      actor,
      'payment.confirm',
      intent.userId,
      intent.user.username,
      `${code} ${intent.kind} ${intent.amountVnd}`
    )
    return res.json({
      code,
      status: 'confirmed',
      recorded,
      proUntil: proUntil ? proUntil.toISOString() : null,
    })
  })
)

payAdminRouter.post(
  '/reject',
  handle(async (req, res) => {
    const actor = await requireOwner(req, res)
    if (!actor) return
    const code = normalizeCode(req.body?.code)
    if (!code) return res.status(400).json({ error: 'invalid_code' })
    const intent = await prisma.paymentIntent.findUnique({
      where: { code },
      include: { user: { select: { username: true } } },
    })
    if (!intent) return res.status(404).json({ error: 'not_found' })
    const r = await prisma.paymentIntent.updateMany({
      where: { code, status: { in: ['pending', 'expired'] } },
      data: { status: 'rejected', confirmedBy: actor.id, confirmedAt: new Date() },
    })
    if (r.count !== 1) return res.status(409).json({ error: 'already_' + intent.status })
    await audit(actor, 'payment.reject', intent.userId, intent.user.username, code)
    return res.json({ code, status: 'rejected' })
  })
)
