import crypto from 'crypto'
import express from 'express'
import type { Request, Response } from 'express'
import { prisma } from '@tsudev/db'
import { esc, sendMail } from './mailer'

/**
 * PRO2 2.4 - thư nhắc gia hạn TsuDEV Pro (tsudev-standards PRODUCT_POLICY 7.2 + 7.6).
 *
 * Người đã xác minh email nhận tối đa MỘT thư ở mỗi mốc của mỗi `pro_until`:
 *   before7 - 7 ngày trước khi hết kỳ   [pro_until - 7d, pro_until)
 *   expired - ngày hết kỳ               [pro_until, + 7d)
 *   purge30 - 30 ngày trước khi xoá     [pro_until + 60d, + 67d)
 *   purge7  - 7 ngày trước khi xoá      [pro_until + 83d, + 90d)
 * Mỗi mốc có cửa sổ 7 ngày (không phải đúng một thời điểm): cron chạy mỗi ngày một lần và
 * có thể lỡ vài lượt (Render ngủ, Resend lỗi) - vẫn gửi được, nhưng không gửi thư "ngày hết
 * kỳ" cho người đã hết kỳ từ ba tuần trước (lúc tính năng lên production).
 *
 * Gia hạn ⇒ `pro_until` mới ⇒ khoá (userId, mốc, pro_until) mới ⇒ chu kỳ nhắc mới.
 * Bị thu hồi (hoàn tiền Play / quản trị viên thu hồi) ⇒ KHÔNG nhắc: người đó không "quên gia hạn".
 *
 * Gọi bởi Worker `canh-site-cron` mỗi ngày: `POST /ent/reminders/run` + header
 * `x-internal-token: INTERNAL_API_TOKEN` (nằm NGOÀI `/api` nên cổng chung không gác - route tự
 * kiểm, và từ chối 503 khi token chưa đặt thay vì mở toang).
 */

const DAY = 24 * 60 * 60 * 1000

export type ReminderKind = 'before7' | 'expired' | 'purge30' | 'purge7'

/** [bắt đầu, kết thúc) tính bằng ms lệch so với `pro_until`. */
export const WINDOWS: ReadonlyArray<{ kind: ReminderKind; from: number; to: number }> = [
  { kind: 'before7', from: -7 * DAY, to: 0 },
  { kind: 'expired', from: 0, to: 7 * DAY },
  { kind: 'purge30', from: 60 * DAY, to: 67 * DAY },
  { kind: 'purge7', from: 83 * DAY, to: 90 * DAY },
]

/** Bản sao đám mây bị xoá ở `pro_until` + 90 ngày (PRODUCT_POLICY 7.2). */
export const PURGE_AFTER = 90 * DAY

/** Sự kiện đặt `pro_until` vào quá khứ vì THU HỒI, không phải vì hết kỳ. */
const REVOKE_KINDS = ['admin.revoke', 'play.voided']

export function dueKind(proUntil: Date, now: number): ReminderKind | null {
  const d = now - proUntil.getTime()
  for (const w of WINDOWS) if (d >= w.from && d < w.to) return w.kind
  return null
}

const TZ_DATE = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
})
/** `DD/MM/YYYY` giờ Việt Nam (DESIGN_SYSTEM §4) - cùng quy tắc `apps/frontend-main/lib/format.ts`. */
export const formatDateVN = (d: Date): string => TZ_DATE.format(d)

const daysLeft = (target: number, now: number): number =>
  Math.max(1, Math.ceil((target - now) / DAY))

/** Nguyên văn PRODUCT_POLICY 7.6 (hai mốc đầu) - `test/proReminders.test.ts` đối chiếu `.standards`. */
export const TEXT = {
  before7: {
    title: 'Gia hạn TsuDEV Pro',
    body: 'Gói TsuDEV Pro của bạn hết hạn sau {n} ngày (ngày {ngày}). Gia hạn để tiếp tục đồng bộ và sao lưu đám mây. Nếu không gia hạn, ứng dụng sẽ trở về bản miễn phí: dữ liệu trên thiết bị vẫn giữ nguyên nhưng không còn đồng bộ lên đám mây.',
  },
  expired: {
    title: 'TsuDEV Pro đã hết hạn',
    body: 'Ứng dụng đã trở về bản miễn phí và ngừng đồng bộ lên đám mây. Dữ liệu trên thiết bị vẫn giữ nguyên. Bản sao trên đám mây còn tải về được tới ngày {ngày_xoá}.',
  },
  // Hai mốc trước khi xoá: bộ quy ước chưa có câu nguyên văn (7.2 chỉ quy định mốc) - viết theo
  // giọng 7.6, nói rõ dữ liệu trên thiết bị KHÔNG bị xoá.
  purge: {
    title: 'Bản sao đám mây TsuDEV sẽ bị xoá sau {n} ngày',
    body: 'TsuDEV Pro của bạn đã hết hạn từ ngày {ngày}. Bản sao trên đám mây sẽ bị xoá vào ngày {ngày_xoá}. Gia hạn trước ngày đó để giữ lại và tiếp tục đồng bộ, hoặc mở ứng dụng để tải bản sao về. Dữ liệu trên thiết bị không bao giờ bị xoá.',
  },
} as const

const siteUrl = (): string => (process.env.SITE_URL || 'https://tsudev.com').replace(/\/$/, '')

/** Khoá HMAC cho link huỷ nhận - tách miền khỏi INTERNAL_IDENTITY_SECRET (không thêm bí mật mới). */
function unsubKey(): Buffer | null {
  const s = process.env.INTERNAL_IDENTITY_SECRET
  if (!s) return null
  return crypto.createHmac('sha256', s).update('tsudev/pro-reminder-unsubscribe/v1').digest()
}

export function unsubscribeToken(userId: string): string | null {
  const k = unsubKey()
  return k ? crypto.createHmac('sha256', k).update(userId).digest('base64url') : null
}

export function verifyUnsubscribe(userId: unknown, token: unknown): boolean {
  if (typeof userId !== 'string' || typeof token !== 'string') return false
  if (!userId || userId.length > 64 || token.length > 64) return false
  const want = unsubscribeToken(userId)
  if (!want) return false
  const a = Buffer.from(want)
  const b = Buffer.from(token)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Trang xác nhận (link trong thân thư) - người dùng bấm nút, trang POST lên API. */
export function unsubscribeUrl(userId: string, kind: 'page' | 'api' = 'page'): string | null {
  const t = unsubscribeToken(userId)
  if (!t) return null
  const q = new URLSearchParams({ u: userId, t })
  return `${siteUrl()}${kind === 'api' ? '/api/pro/huy-nhac' : '/pro/huy-nhac'}?${q}`
}

export type ReminderMail = { subject: string; html: string }

export function buildMail(
  kind: ReminderKind,
  displayName: string,
  proUntil: Date,
  now: number,
  unsubLink: string
): ReminderMail {
  const until = proUntil.getTime()
  const purgeAt = new Date(until + PURGE_AFTER)
  let subject: string
  let body: string
  if (kind === 'before7') {
    subject = TEXT.before7.title
    body = TEXT.before7.body
      .replace('{n}', String(daysLeft(until, now)))
      .replace('{ngày}', formatDateVN(proUntil))
  } else if (kind === 'expired') {
    subject = TEXT.expired.title
    body = TEXT.expired.body.replace('{ngày_xoá}', formatDateVN(purgeAt))
  } else {
    const n = String(daysLeft(purgeAt.getTime(), now))
    subject = TEXT.purge.title.replace('{n}', n)
    body = TEXT.purge.body
      .replace('{ngày}', formatDateVN(proUntil))
      .replace('{ngày_xoá}', formatDateVN(purgeAt))
  }
  const renew = `${siteUrl()}/pro`
  const html = `<p>Chào ${esc(displayName)},</p>
<p>${esc(body)}</p>
<p><a href="${esc(renew)}">Gia hạn</a></p>
<p style="color:#666;font-size:13px">Bạn nhận thư này vì đã dùng TsuDEV Pro với địa chỉ email đã xác minh. <a href="${esc(
    unsubLink
  )}">Huỷ nhận thư nhắc gia hạn</a> (thư bảo mật và giao dịch vẫn gửi bình thường).</p>`
  return { subject, html }
}

export type RunReport = {
  candidates: number
  sent: number
  failed: number
  skipped: number
  byKind: Record<ReminderKind, number>
}

/**
 * Một lượt nhắc. Giành chỗ bằng INSERT khoá chính TRƯỚC khi gửi (hai lượt chồng nhau ⇒ một bên
 * nhận P2002 và bỏ qua), gửi hỏng ⇒ xoá dòng để lượt sau thử lại. Mỗi lượt tối đa `limit` thư:
 * Resend gói 0 đồng giới hạn 100 thư/ngày.
 */
export async function runReminders(
  now: number = Date.now(),
  limit = Number(process.env.PRO_REMINDER_DAILY_MAX) || 80
): Promise<RunReport> {
  const report: RunReport = {
    candidates: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    byKind: { before7: 0, expired: 0, purge30: 0, purge7: 0 },
  }
  const unsubOk = unsubKey() !== null
  if (!unsubOk) throw new Error('INTERNAL_IDENTITY_SECRET chưa đặt - không tạo được link huỷ nhận')

  const rows = await prisma.entitlement.findMany({
    where: {
      proUntil: { gt: new Date(now - PURGE_AFTER), lte: new Date(now + 7 * DAY) },
      remindersOptOutAt: null,
      user: { emailVerifiedAt: { not: null }, deactivatedAt: null, deletionScheduledAt: null },
    },
    select: {
      userId: true,
      proUntil: true,
      user: { select: { email: true, displayName: true, username: true } },
    },
    orderBy: { proUntil: 'asc' },
  })
  report.candidates = rows.length

  for (const r of rows) {
    if (report.sent + report.failed >= limit) break
    if (!r.proUntil) continue
    const kind = dueKind(r.proUntil, now)
    if (!kind) continue

    // pro_until trong quá khứ vì bị thu hồi ⇒ không nhắc.
    if (kind !== 'before7') {
      const last = await prisma.entitlementEvent.findFirst({
        where: { userId: r.userId, proUntil: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { kind: true },
      })
      if (last && REVOKE_KINDS.includes(last.kind)) {
        report.skipped++
        continue
      }
    }

    const key = { userId: r.userId, kind, proUntil: r.proUntil }
    // ON CONFLICT DO NOTHING: count 0 ⇒ lượt khác đã giành mốc này.
    const claimed = await prisma.proReminderSent.createMany({ data: [key], skipDuplicates: true })
    if (claimed.count === 0) {
      report.skipped++
      continue
    }

    const link = unsubscribeUrl(r.userId) as string
    const mail = buildMail(kind, r.user.displayName || r.user.username, r.proUntil, now, link)
    const res = await sendMail(r.user.email, mail.subject, mail.html, `pro-reminder:${kind}`, {
      // One-Click (RFC 8058) POST thẳng vào API - trang /pro/huy-nhac không nhận POST.
      'List-Unsubscribe': `<${unsubscribeUrl(r.userId, 'api')}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })
    if (res.ok) {
      report.sent++
      report.byKind[kind]++
    } else {
      report.failed++
      await prisma.proReminderSent.delete({ where: { userId_kind_proUntil: key } }).catch(() => {})
    }
  }
  return report
}

function tokenOk(got: unknown): boolean {
  const want = process.env.INTERNAL_API_TOKEN || ''
  if (!want || typeof got !== 'string') return false
  const a = crypto.createHash('sha256').update(want).digest()
  const b = crypto.createHash('sha256').update(got).digest()
  return crypto.timingSafeEqual(a, b)
}

export const proReminderRouter = express.Router()

proReminderRouter.post('/run', async (req: Request, res: Response) => {
  if (!process.env.INTERNAL_API_TOKEN) {
    return res.status(503).json({ error: 'reminders_unavailable' })
  }
  if (!tokenOk(req.headers['x-internal-token'])) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  try {
    const report = await runReminders()
    console.log(
      `[auth] thư nhắc Pro: ${report.sent} gửi, ${report.failed} hỏng, ${report.skipped} bỏ qua / ${report.candidates}`
    )
    res.setHeader('Cache-Control', 'no-store')
    return res.json(report)
  } catch (e) {
    console.error('[auth] thư nhắc Pro hỏng:', e instanceof Error ? e.message : String(e))
    return res.status(500).json({ error: 'reminders_failed' })
  }
})

/**
 * Huỷ nhận thư nhắc. Nhận `u`/`t` từ query (One-Click POST của RFC 8058: thân là
 * `List-Unsubscribe=One-Click`, tham số nằm trong URL) hoặc thân JSON (trang /pro/huy-nhac).
 * Chỉ POST: trình quét link trong hộp thư mở GET tự động - GET mà huỷ là huỷ hộ người dùng.
 */
proReminderRouter.post('/unsubscribe', async (req: Request, res: Response) => {
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
  const u = typeof req.query.u === 'string' ? req.query.u : body.u
  const t = typeof req.query.t === 'string' ? req.query.t : body.t
  res.setHeader('Cache-Control', 'no-store')
  if (!verifyUnsubscribe(u, t)) return res.status(400).json({ error: 'invalid_link' })
  // Không có hàng Entitlement (chưa từng Pro) ⇒ không có thư nào để huỷ, vẫn trả ok.
  await prisma.entitlement.updateMany({
    where: { userId: u as string, remindersOptOutAt: null },
    data: { remindersOptOutAt: new Date() },
  })
  return res.json({ ok: true })
})
