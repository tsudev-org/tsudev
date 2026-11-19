import { createHmac, createPublicKey, sign as cryptoSign, verify as cryptoVerify } from 'crypto'
import type { JsonWebKey, KeyObject } from 'crypto'
import { prisma } from '@tsudev/db'

/**
 * PRO-B - máy chủ quyền lợi dùng chung (docs/adr/0002-may-chu-quyen-loi.md).
 *
 * Hợp đồng chung ở tsudev-standards `docs/PRODUCT_POLICY.md` mục 7.4: JWS ES256 ký bằng
 * khoá OIDC của tsudev.com, `exp` ≤ `iat` + 7 ngày, `badge` đã áp `badge_display`,
 * `devices_30d` là SỐ ĐẾM (không bao giờ là danh sách).
 *
 * Bất biến (test/entitlements.test.ts canh):
 *   - App/máy chủ sản phẩm KHÔNG gửi được quyền lợi lên: mọi thay đổi đi qua sổ cái
 *     `EntitlementEvent` do chính máy chủ này ghi sau khi đã xác minh nguồn.
 *   - Mã cài đặt chỉ lưu HMAC-SHA-256 (khoá suy từ INTERNAL_IDENTITY_SECRET).
 *   - Kênh RP: `private_key_jwt` (RFC 7523) ES256, `aud` khớp tuyệt đối, `jti` dùng một
 *     lần, chỉ trả cho `sub` đã cấp quyền (Grant OIDC) cho đúng client đó.
 */

export const JWS_TTL_S = 7 * 24 * 60 * 60
export const DEVICE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
/** Bản ghi mã cài đặt không hoạt động quá 90 ngày bị xoá (AUTH_AND_ACCOUNT 14.3). */
export const INSTALLATION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000
/** Thời hạn tối đa của một client assertion (giây). */
export const ASSERTION_MAX_TTL_S = 300

export type Source = 'play' | 'appstore' | 'web'
export type BadgeDisplay = 'AUTO' | 'PRO' | 'DONOR' | 'BOTH' | 'HIDDEN'
export type Badge = 'pro' | 'donor' | 'both' | 'none'

export type LedgerEvent = {
  kind: string
  proUntil: Date | null
  proSource: Source | null
  donation: boolean
  createdAt: Date
}

export type EntState = { proUntil: Date | null; proSource: Source | null; donorSince: Date | null }

/**
 * Gộp sổ cái thành trạng thái. Mỗi NGUỒN (play/appstore/web; sự kiện quản trị không nguồn
 * thuộc nhóm `admin`) giữ mốc của sự kiện MỚI NHẤT của nguồn đó - gia hạn đẩy mốc lên,
 * hoàn tiền/huỷ đặt mốc về quá khứ mà không đụng Pro mua ở kênh khác. `admin.revoke` đặt
 * MỌI nguồn về mốc của nó. Pro tổng = mốc lớn nhất. Ủng hộ: vĩnh viễn từ lần đầu.
 */
export function foldEvents(events: LedgerEvent[]): EntState {
  const sorted = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  const bySource = new Map<string, Date>()
  let donorSince: Date | null = null
  for (const e of sorted) {
    if (e.donation && !donorSince) donorSince = e.createdAt
    if (!e.proUntil) continue
    if (e.kind === 'admin.revoke') {
      for (const k of bySource.keys()) bySource.set(k, e.proUntil)
      continue
    }
    bySource.set(e.proSource ?? 'admin', e.proUntil)
  }
  let proUntil: Date | null = null
  let proSource: Source | null = null
  for (const [k, v] of bySource) {
    if (!proUntil || v > proUntil) {
      proUntil = v
      proSource = k === 'admin' ? null : (k as Source)
    }
  }
  return { proUntil, proSource, donorSince }
}

/** Bảng 4.1 PRODUCT_POLICY: lựa chọn chỉ có hiệu lực với trạng thái đang có. */
export function badgeFor(state: EntState, display: BadgeDisplay, now: Date): Badge {
  const pro = Boolean(state.proUntil && state.proUntil > now)
  const donor = Boolean(state.donorSince)
  const auto: Badge = pro && donor ? 'both' : pro ? 'pro' : donor ? 'donor' : 'none'
  switch (display) {
    case 'HIDDEN':
      return 'none'
    case 'PRO':
      return pro ? 'pro' : 'none'
    case 'DONOR':
      return donor ? 'donor' : 'none'
    default:
      return auto
  }
}

export type EntitlementClaims = {
  iss: string
  sub: string
  aud: string
  iat: number
  exp: number
  pro_until: number
  pro_source: Source | null
  donor: boolean
  badge: Badge
  devices_30d: number
}

export function buildClaims(a: {
  iss: string
  sub: string
  aud: string
  now: Date
  state: EntState
  display: BadgeDisplay
  devices30d: number
}): EntitlementClaims {
  const iat = Math.floor(a.now.getTime() / 1000)
  return {
    iss: a.iss,
    sub: a.sub,
    aud: a.aud,
    iat,
    exp: iat + JWS_TTL_S,
    pro_until: a.state.proUntil ? Math.floor(a.state.proUntil.getTime() / 1000) : 0,
    pro_source: a.state.proUntil ? a.state.proSource : null,
    donor: Boolean(a.state.donorSince),
    badge: badgeFor(a.state, a.display, a.now),
    devices_30d: Math.max(0, Math.floor(a.devices30d)),
  }
}

const b64 = (v: unknown): string => Buffer.from(JSON.stringify(v)).toString('base64url')

/** JWS compact ES256 (chữ ký dạng IEEE P1363 r||s như RFC 7518 3.4). */
export function signJws(
  payload: Record<string, unknown>,
  signer: { key: KeyObject; kid: string }
): string {
  const head = b64({ alg: 'ES256', typ: 'tsu-ent+jwt', kid: signer.kid })
  const input = `${head}.${b64(payload)}`
  const sig = cryptoSign('sha256', Buffer.from(input), {
    key: signer.key,
    dsaEncoding: 'ieee-p1363',
  })
  return `${input}.${sig.toString('base64url')}`
}

/** Tách + kiểm chữ ký ES256 của một JWS compact. Sai bất kỳ chỗ nào ⇒ `null`. */
export function verifyEs256(
  token: string,
  key: KeyObject
): { header: Record<string, unknown>; payload: Record<string, unknown> } | null {
  if (typeof token !== 'string' || token.length > 4096) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, b, sig] = parts as [string, string, string]
  try {
    const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'))
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf8'))
    // Chỉ ES256 - chặn `alg: none`, HS256 dùng khoá công khai làm bí mật, v.v.
    if (!header || header.alg !== 'ES256' || !payload || typeof payload !== 'object') return null
    const ok = cryptoVerify(
      'sha256',
      Buffer.from(`${h}.${b}`),
      { key, dsaEncoding: 'ieee-p1363' },
      Buffer.from(sig, 'base64url')
    )
    return ok ? { header, payload } : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Mã cài đặt (AUTH_AND_ACCOUNT 14.3)
// ---------------------------------------------------------------------------
const INSTALLATION_RE = /^[A-Za-z0-9_-]{22}$/
const PLATFORMS = new Set(['android', 'ios', 'windows', 'macos', 'linux', 'web'])

/** Header `X-Tsu-Installation`: đúng 22 ký tự base64url (128 bit). Sai ⇒ bỏ qua. */
export const parseInstallationId = (v: unknown): string | null =>
  typeof v === 'string' && INSTALLATION_RE.test(v) ? v : null

export const parsePlatform = (v: unknown): string =>
  typeof v === 'string' && PLATFORMS.has(v.toLowerCase()) ? v.toLowerCase() : 'other'

function installationKey(): Buffer {
  const s = process.env.INTERNAL_IDENTITY_SECRET || ''
  if (s.length < 32) throw new Error('thiếu INTERNAL_IDENTITY_SECRET')
  return createHmac('sha256', s).update('tsudev-installation-v1').digest()
}

export const hashInstallationId = (id: string): string =>
  createHmac('sha256', installationKey()).update(id).digest('base64url')

/** Ghi lần thấy mã cài đặt + dọn bản ghi quá hạn của chính tài khoản đó. */
export async function touchInstallation(
  userId: string,
  clientId: string,
  installationId: string | null,
  platform: string,
  now: Date
): Promise<void> {
  if (!installationId) return
  const installationIdHash = hashInstallationId(installationId)
  await prisma.appInstallation.upsert({
    where: { userId_clientId_installationIdHash: { userId, clientId, installationIdHash } },
    create: { userId, clientId, installationIdHash, platform, firstSeenAt: now, lastSeenAt: now },
    update: { lastSeenAt: now, platform },
  })
  await prisma.appInstallation.deleteMany({
    where: { userId, lastSeenAt: { lt: new Date(now.getTime() - INSTALLATION_RETENTION_MS) } },
  })
}

export const countDevices30d = (userId: string, clientId: string, now: Date): Promise<number> =>
  prisma.appInstallation.count({
    where: { userId, clientId, lastSeenAt: { gte: new Date(now.getTime() - DEVICE_WINDOW_MS) } },
  })

/** Trạng thái hiện tại: đọc bản tổng hợp; chưa có ⇒ gộp từ sổ cái (rỗng ⇒ miễn phí). */
export async function loadState(
  userId: string
): Promise<{ state: EntState; display: BadgeDisplay }> {
  const row = await prisma.entitlement.findUnique({ where: { userId } })
  if (row) {
    return {
      state: { proUntil: row.proUntil, proSource: row.proSource, donorSince: row.donorSince },
      display: row.badgeDisplay,
    }
  }
  const events = await prisma.entitlementEvent.findMany({ where: { userId } })
  return { state: foldEvents(events), display: 'AUTO' }
}

/**
 * Ghi một sự kiện vào sổ cái rồi tính lại bản tổng hợp - trong MỘT giao dịch.
 * Trùng (kind, externalId) ⇒ không ghi lại (idempotent), trả `false`.
 * Đường duy nhất làm đổi quyền lợi; nguồn (Play, VietQR, quản trị) gọi SAU khi đã xác minh.
 */
export async function recordEvent(e: {
  userId: string
  kind: string
  externalId?: string | null
  proUntil?: Date | null
  proSource?: Source | null
  donation?: boolean
  actorId?: string | null
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    if (e.externalId) {
      const dup = await tx.entitlementEvent.findUnique({
        where: { kind_externalId: { kind: e.kind, externalId: e.externalId } },
      })
      if (dup) return false
    }
    await tx.entitlementEvent.create({
      data: {
        userId: e.userId,
        kind: e.kind,
        externalId: e.externalId ?? null,
        proUntil: e.proUntil ?? null,
        proSource: e.proSource ?? null,
        donation: Boolean(e.donation),
        actorId: e.actorId ?? null,
      },
    })
    const all = await tx.entitlementEvent.findMany({ where: { userId: e.userId } })
    const s = foldEvents(all)
    await tx.entitlement.upsert({
      where: { userId: e.userId },
      create: { userId: e.userId, ...s },
      update: s,
    })
    return true
  })
}

// ---------------------------------------------------------------------------
// Kênh máy chủ ↔ máy chủ cho RP (b1): private_key_jwt
// ---------------------------------------------------------------------------
const seenJti = new Map<string, number>()

/** Chống phát lại `jti` trong tiến trình (một tiến trình - như @tsudev/ratelimit). */
function claimJti(clientId: string, jti: string, expS: number, nowS: number): boolean {
  for (const [k, exp] of seenJti) if (exp < nowS) seenJti.delete(k)
  const k = `${clientId}\u0000${jti}`
  if (seenJti.has(k)) return false
  if (seenJti.size > 50_000) return false // trần bộ nhớ: thà từ chối còn hơn phình RAM
  seenJti.set(k, expS)
  return true
}

/** Chỉ cho test. */
export const _resetJti = (): void => seenJti.clear()

/**
 * Kiểm client assertion RFC 7523 của máy chủ RP. Trả `client_id` hoặc `null`.
 * `iss` = `sub` = client_id; `aud` khớp TUYỆT ĐỐI `expectedAud`; `exp` trong tương lai và
 * không quá 300 giây; `jti` bắt buộc, dùng một lần; khoá công khai lấy từ OAuthClient.
 */
export async function verifyClientAssertion(
  token: string,
  expectedAud: string,
  now: Date
): Promise<string | null> {
  const parts = typeof token === 'string' ? token.split('.') : []
  if (parts.length !== 3) return null
  let claimed: Record<string, unknown>
  try {
    claimed = JSON.parse(Buffer.from(parts[1] as string, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  const clientId = typeof claimed.iss === 'string' ? claimed.iss.slice(0, 64) : ''
  if (!clientId || claimed.sub !== clientId) return null
  const client = await prisma.oAuthClient.findUnique({ where: { id: clientId } })
  if (!client || client.disabledAt || !client.rpPublicJwk) return null
  let key: KeyObject
  try {
    const jwk = client.rpPublicJwk as Record<string, unknown>
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || 'd' in jwk) return null
    key = createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' })
  } catch {
    return null
  }
  const v = verifyEs256(token, key)
  if (!v) return null
  const p = v.payload
  const nowS = Math.floor(now.getTime() / 1000)
  const aud = Array.isArray(p.aud) ? p.aud : [p.aud]
  if (!aud.includes(expectedAud)) return null
  if (typeof p.exp !== 'number' || p.exp <= nowS || p.exp > nowS + ASSERTION_MAX_TTL_S) return null
  if (typeof p.iat === 'number' && p.iat > nowS + 60) return null
  if (typeof p.jti !== 'string' || !p.jti || p.jti.length > 128) return null
  if (!claimJti(clientId, p.jti, p.exp, nowS)) return null
  return clientId
}

/** `sub` có Grant OIDC còn hạn cho đúng client này, và tài khoản còn hoạt động. */
export async function subjectGrantedTo(sub: string, clientId: string, now: Date): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(sub)) return false
  const user = await prisma.user.findUnique({ where: { id: sub } })
  if (!user || user.deactivatedAt || user.deletionScheduledAt) return false
  const grant = await prisma.oidcPayload.findFirst({
    where: {
      type: 'Grant',
      AND: [
        { payload: { path: ['accountId'], equals: sub } },
        { payload: { path: ['clientId'], equals: clientId } },
      ],
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  })
  return Boolean(grant)
}
