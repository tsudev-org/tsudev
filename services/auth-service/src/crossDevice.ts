import { createHash, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from 'crypto'
import { prisma } from '@tsudev/db'
import type { Prisma } from '@prisma/client'

/**
 * Đăng nhập chéo thiết bị bằng mã QR + mã khớp - tsudev-standards `CROSS_DEVICE_LOGIN.md` v1.0.0
 * (phiếu điều phối 20261124-QR1).
 *
 * Hai luồng, hai vai:
 *   - Đ2 KÉO (`pull`): thiết bị MỚI (trang đăng nhập tsudev.com) tạo phiên + hiện QR; thiết bị ĐÃ đăng nhập quét,
 *     bấm Cho phép, hiện mã khớp; người dùng gõ mã trên thiết bị mới.
 *   - Đ1 ĐẨY (`push`): thiết bị ĐÃ đăng nhập tạo phiên + hiện QR; thiết bị MỚI quét (`claim`), thiết bị đã đăng nhập
 *     bấm Cho phép, hiện mã khớp; người dùng gõ mã trên thiết bị mới.
 * Mã khớp LUÔN hiện trên thiết bị đã đăng nhập và LUÔN gõ trên thiết bị mới. Kết quả là một VÉ dùng một lần (60 giây)
 * mà NextAuth (provider `qr`) đổi lấy phiên tsudev.com - từ đó mọi app đi tiếp luồng OIDC + PKCE như cũ (SSO).
 *
 * Bất biến (test/crossDevice.test.ts canh):
 *   - Chỉ lưu BĂM: bí mật QR `k`, `poll`, vé = SHA-256 (đều ≥ 256 bit ngẫu nhiên); mã khớp (~39 bit) = HMAC-SHA-256
 *     với khoá dẫn xuất HKDF từ INTERNAL_IDENTITY_SECRET (dò ngược từ CSDL rò rỉ là vô ích).
 *   - Máy trạng thái MỘT CHIỀU, mỗi bước là `UPDATE ... WHERE state = <cũ>` nguyên tử: hai thiết bị cùng quét/cùng gõ
 *     ⇒ đúng một bên thắng.
 *   - Sai mã 3 lần ⇒ phiên chết. Phiên tới `awaiting_code` trong 120 giây, mã khớp sống 60 giây, vé 60 giây.
 *   - Hai thiết bị khác QUỐC GIA (cf-ipcountry) ⇒ từ chối (chống QRLJacking từ xa - T1).
 *
 * Lưu ở bảng `OidcPayload` (type `XdSession`): kho trạng thái TẠM của IdP, có sẵn `expiresAt` - không cần migration.
 */

export const XD_TYPE = 'XdSession'
const CREATE_TTL_MS = 120_000
const CODE_TTL_MS = 60_000
const TICKET_TTL_MS = 60_000
const MAX_ATTEMPTS = 3
/** Crockford Base32 bỏ thêm 0 và 1 (CROSS_DEVICE_LOGIN mục 5): 30 ký tự, không lẫn O/0, I/1/L, U/V. */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
export const CODE_LENGTH = 8

export type XdFlow = 'pull' | 'push'
export type XdState = 'created' | 'scanned' | 'awaiting_code' | 'completed' | 'dead'

export type XdDevice = { label: string; country: string }

export type XdPayload = {
  flow: XdFlow
  state: XdState
  kHash: string
  /** Băm `poll` của thiết bị MỚI (Đ2: lúc tạo; Đ1: lúc claim). */
  pollHash?: string
  /** Tài khoản xác nhận (Đ1: người tạo; Đ2: người quét). */
  approverId?: string
  approverCountry?: string
  requester?: XdDevice
  codeHmac?: string
  codeExpiresAt?: number
  attempts: number
  ticketHash?: string
  ticketExpiresAt?: number
  createdAt: number
}

export class XdError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string
  ) {
    super(code)
  }
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')
const token = (bytes = 32) => randomBytes(bytes).toString('base64url')

function codeKey(): Buffer {
  const secret = process.env.INTERNAL_IDENTITY_SECRET || ''
  if (!secret && process.env.NODE_ENV === 'production') throw new XdError(503, 'xd_disabled')
  return Buffer.from(hkdfSync('sha256', secret || 'dev-only', 'tsudev', 'tsudev-xd-code-v1', 32))
}
const codeHmac = (code: string) => createHmac('sha256', codeKey()).update(code).digest('hex')

/** Chuẩn hoá mã người dùng gõ: bỏ gạch/khoảng trắng, chữ hoa. */
export const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[\s-]/g, '').slice(0, 16)

export function newCode(): string {
  let s = ''
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return s
}

function eqHex(a: string | undefined, b: string): boolean {
  if (!a || a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

async function load(id: string): Promise<XdPayload> {
  if (!/^[A-Za-z0-9_-]{22}$/.test(id)) throw new XdError(404, 'not_found')
  const row = await prisma.oidcPayload.findUnique({ where: { type_id: { type: XD_TYPE, id } } })
  if (!row || (row.expiresAt && row.expiresAt.getTime() < Date.now()))
    throw new XdError(404, 'expired')
  return row.payload as unknown as XdPayload
}

/** So-và-đổi nguyên tử: chỉ ghi khi trạng thái trong CSDL vẫn là `from`. */
async function transition(id: string, from: XdState, next: XdPayload): Promise<void> {
  const n = await prisma.$executeRaw`
    UPDATE "OidcPayload" SET payload = ${JSON.stringify(next)}::jsonb
    WHERE type = ${XD_TYPE} AND id = ${id} AND payload->>'state' = ${from}`
  if (n !== 1) throw new XdError(409, 'conflict')
}

async function kill(id: string, p: XdPayload): Promise<void> {
  await transition(id, p.state, { ...p, state: 'dead' }).catch(() => undefined)
}

async function create(flow: XdFlow, extra: Partial<XdPayload>) {
  // Dọn phiên hết hạn (bảng không có cron dọn riêng) - giới hạn theo type, chỉ mục expiresAt.
  await prisma.oidcPayload.deleteMany({ where: { type: XD_TYPE, expiresAt: { lt: new Date() } } })
  const id = token(16)
  const k = token()
  const payload: XdPayload = {
    flow,
    state: 'created',
    kHash: sha256(k),
    attempts: 0,
    createdAt: Date.now(),
    ...extra,
  }
  await prisma.oidcPayload.create({
    data: {
      type: XD_TYPE,
      id,
      payload: payload as unknown as Prisma.InputJsonValue,
      // Bản ghi sống đủ cho cả chuỗi (tạo 120s + mã 60s + vé 60s), rồi bị dọn.
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  })
  return { id, k, expiresIn: CREATE_TTL_MS / 1000 }
}

const expired = (p: XdPayload) => Date.now() - p.createdAt > CREATE_TTL_MS

function checkK(p: XdPayload, k: string) {
  if (!eqHex(p.kHash, sha256(k))) throw new XdError(404, 'not_found')
}

function checkPoll(p: XdPayload, poll: string) {
  if (!eqHex(p.pollHash, sha256(poll))) throw new XdError(404, 'not_found')
}

// ---------- Đ2 KÉO ----------

/** Thiết bị mới (chưa đăng nhập) tạo phiên. Trả `poll` - BFF giữ nó trong cookie HttpOnly. */
export async function createPull(requester: XdDevice) {
  const poll = token()
  const s = await create('pull', { pollHash: sha256(poll), requester })
  return { ...s, poll }
}

/** Thiết bị đã đăng nhập quét QR Đ2 ⇒ xem thông tin thiết bị mới trước khi Cho phép. */
export async function scan(id: string, k: string, approverId: string, approverCountry: string) {
  const p = await load(id)
  checkK(p, k)
  if (p.flow !== 'pull') throw new XdError(400, 'wrong_flow')
  if (p.state !== 'created' || expired(p)) throw new XdError(410, 'used_or_expired')
  await transition(id, 'created', { ...p, state: 'scanned', approverId, approverCountry })
  return { requester: p.requester, createdAt: p.createdAt }
}

// ---------- Đ1 ĐẨY ----------

/** Thiết bị đã đăng nhập tạo phiên + QR. */
export async function createPush(approverId: string, approverCountry: string) {
  return create('push', { approverId, approverCountry })
}

/** Thiết bị mới quét QR Đ1. Trả `poll` (BFF giữ trong cookie HttpOnly). */
export async function claim(id: string, k: string, requester: XdDevice) {
  const p = await load(id)
  checkK(p, k)
  if (p.flow !== 'push') throw new XdError(400, 'wrong_flow')
  if (p.state !== 'created' || expired(p)) throw new XdError(410, 'used_or_expired')
  const poll = token()
  await transition(id, 'created', { ...p, state: 'scanned', pollHash: sha256(poll), requester })
  return { poll }
}

// ---------- Thiết bị xác nhận ----------

/** Đ1: người tạo xem đã có thiết bị nào quét chưa. */
export async function peek(id: string, approverId: string) {
  const p = await load(id)
  if (p.approverId !== approverId) throw new XdError(404, 'not_found')
  return { state: p.state, requester: p.state === 'created' ? undefined : p.requester }
}

/** Cho phép ⇒ sinh mã khớp, CHỈ trả cho thiết bị xác nhận. */
export async function approve(id: string, approverId: string, approverCountry: string) {
  const p = await load(id)
  if (p.approverId !== approverId) throw new XdError(404, 'not_found')
  if (p.state !== 'scanned') throw new XdError(409, 'conflict')
  const a = (p.approverCountry || approverCountry || '').toUpperCase()
  const r = (p.requester?.country || '').toUpperCase()
  if (a && r && a !== 'XX' && r !== 'XX' && a !== r) {
    await kill(id, p)
    throw new XdError(403, 'country_mismatch')
  }
  const code = newCode()
  await transition(id, 'scanned', {
    ...p,
    state: 'awaiting_code',
    codeHmac: codeHmac(code),
    codeExpiresAt: Date.now() + CODE_TTL_MS,
  })
  return { code: `${code.slice(0, 4)}-${code.slice(4)}`, expiresIn: CODE_TTL_MS / 1000 }
}

export async function deny(id: string, approverId: string) {
  const p = await load(id)
  if (p.approverId !== approverId) throw new XdError(404, 'not_found')
  await kill(id, p)
}

// ---------- Thiết bị mới ----------

/** Thăm dò trạng thái. `account` chỉ có ở Đ1 khi đã được Cho phép (T3 - thấy tài khoản sắp vào trước khi gõ mã). */
export async function status(id: string, poll: string) {
  const p = await load(id)
  checkPoll(p, poll)
  const state: XdState = p.state === 'created' && expired(p) ? 'dead' : p.state
  return {
    state,
    approverId: p.state === 'awaiting_code' && p.flow === 'push' ? p.approverId : undefined,
  }
}

/** Gõ mã khớp. Đúng ⇒ vé một lần. Sai 3 lần ⇒ phiên chết. */
export async function verify(id: string, poll: string, rawCode: string) {
  const p = await load(id)
  checkPoll(p, poll)
  if (p.state !== 'awaiting_code') throw new XdError(409, 'conflict')
  if (!p.codeExpiresAt || p.codeExpiresAt < Date.now()) {
    await kill(id, p)
    throw new XdError(410, 'used_or_expired')
  }
  const ok = eqHex(p.codeHmac, codeHmac(normalizeCode(rawCode)))
  if (!ok) {
    const attempts = p.attempts + 1
    const left = MAX_ATTEMPTS - attempts
    await transition(id, 'awaiting_code', {
      ...p,
      attempts,
      state: left <= 0 ? 'dead' : 'awaiting_code',
    })
    throw new XdError(left <= 0 ? 410 : 401, left <= 0 ? 'too_many_attempts' : `wrong_code:${left}`)
  }
  const ticket = token()
  await transition(id, 'awaiting_code', {
    ...p,
    state: 'completed',
    ticketHash: sha256(ticket),
    ticketExpiresAt: Date.now() + TICKET_TTL_MS,
  })
  return { ticket: `${id}.${ticket}` }
}

/**
 * CHỈ NextAuth (provider `qr`, phía máy chủ) gọi: đổi vé lấy `userId` rồi XOÁ phiên - vé không dùng lại được.
 * Không có ở proxy công khai của trình duyệt.
 */
export async function redeem(rawTicket: string): Promise<string> {
  const [id, ticket] = String(rawTicket).split('.')
  if (!id || !ticket) throw new XdError(401, 'invalid_ticket')
  // Mọi lý do từ chối (không có, hết hạn, đã đổi) trả CÙNG một mã - không lộ trạng thái phiên.
  const p = await load(id).catch(() => {
    throw new XdError(401, 'invalid_ticket')
  })
  if (
    p.state !== 'completed' ||
    !p.approverId ||
    !p.ticketExpiresAt ||
    p.ticketExpiresAt < Date.now() ||
    !eqHex(p.ticketHash, sha256(ticket))
  ) {
    throw new XdError(401, 'invalid_ticket')
  }
  const gone = await prisma.oidcPayload.deleteMany({
    where: { type: XD_TYPE, id, payload: { path: ['state'], equals: 'completed' } },
  })
  if (gone.count !== 1) throw new XdError(401, 'invalid_ticket')
  return p.approverId
}
