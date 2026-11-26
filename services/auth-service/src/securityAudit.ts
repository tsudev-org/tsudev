import { createHash } from 'node:crypto'
import { isIPv4, isIPv6 } from 'node:net'
import { prisma } from '@tsudev/db'

/**
 * INT1-b - nhật ký an ninh của lượt gọi API từ app (APP_INTEGRITY 4, PRODUCT_POLICY 7.7).
 *
 * Khác `SecurityEvent` (dòng thời gian của MỘT tài khoản, giữ IP đầy đủ cho chủ tài khoản đọc):
 * bảng này ghi sự kiện của người gọi thường CHƯA xác thực (`426`, header sai, chứng thực thất
 * bại), nên chỉ giữ dữ liệu tối thiểu - IP rút gọn /24 hoặc /48, `jkt` đã băm - và tự dọn sau
 * 12 tháng. Ghi là FIRE-AND-FORGET: nhật ký hỏng không được làm hỏng lượt gọi.
 */

export type SecurityAuditType =
  'update_required' | 'app_header_invalid' | 'app_header_missing' | 'untrusted_client'

export type SecurityAuditEntry = {
  type: SecurityAuditType
  ip?: string | null
  /** Giá trị, hoặc hàm tra (chỉ được gọi khi dòng này THẬT SỰ được ghi - sau bộ chống trùng). */
  clientId?: string | null | (() => Promise<string | null>)
  jkt?: string | null
  product?: string | null
  version?: string | null
  channel?: string | null
  path?: string | null
}

/** Hạn lưu (PRODUCT_POLICY 7.7: "≤ 12 tháng"). */
export const RETENTION_MONTHS = 12
const PURGE_EVERY_MS = 60 * 60 * 1000
const DEDUPE_MS = 60_000
const DEDUPE_MAX = 5000

/** Mở rộng IPv6 thành 8 nhóm hex; chuỗi hỏng ⇒ null. */
function ipv6Groups(ip: string): number[] | null {
  let s = ip.split('%')[0] as string
  // Đuôi IPv4 nhúng (`::ffff:1.2.3.4`) ⇒ hai nhóm hex.
  const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(s)
  if (tail) {
    const o = (tail[1] as string).split('.').map(Number)
    s =
      s.slice(0, -(tail[1] as string).length) +
      `${((o[0]! << 8) | o[1]!).toString(16)}:${((o[2]! << 8) | o[3]!).toString(16)}`
  }
  const halves = s.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? (halves[0] as string).split(':') : []
  const rest = halves.length === 2 && halves[1] ? (halves[1] as string).split(':') : []
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0
  const all = [...head, ...Array(Math.max(fill, 0)).fill('0'), ...rest]
  if (all.length !== 8) return null
  const g = all.map((h) => parseInt(h, 16))
  return g.every((n) => Number.isInteger(n) && n >= 0 && n <= 0xffff) ? g : null
}

/**
 * IP ⇒ tiền tố mạng: IPv4 `a.b.c.0/24`, IPv6 `x:y:z::/48`; IPv4 nhúng trong IPv6
 * (`::ffff:a.b.c.d`) tính như IPv4. Không nhận ra ⇒ null (không ghi IP thô).
 */
export function ipPrefix(ip: string | null | undefined): string | null {
  if (!ip) return null
  const v = ip.trim()
  if (isIPv4(v)) return `${v.split('.').slice(0, 3).join('.')}.0/24`
  if (!isIPv6(v)) return null
  const g = ipv6Groups(v)
  if (!g) return null
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) {
    return `${g[6]! >> 8}.${g[6]! & 0xff}.${g[7]! >> 8}.0/24`
  }
  const keep = g.slice(0, 3).map((n) => n.toString(16))
  return `${keep.join(':')}::/48`
}

/** SHA-256 (hex) của `jkt` - không lưu thumbprint gốc. */
export const hashJkt = (jkt: string): string => createHash('sha256').update(jkt).digest('hex')

const seen = new Map<string, number>()
let lastPurge = 0

/** Xoá dòng cũ hơn 12 tháng. Trả số dòng đã xoá. */
export async function purgeSecurityAudit(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS)
  const r = await prisma.securityAuditLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
  return r.count
}

/** Chỉ cho test: quên bộ chống trùng và mốc dọn. */
export function resetSecurityAuditState(): void {
  seen.clear()
  lastPurge = 0
}

/**
 * Ghi một sự kiện. Cùng (loại, mạng, app, đường dẫn) trong 60 giây chỉ ghi MỘT dòng - một app
 * hỏng gọi lặp không được biến bảng này thành nơi đổ rác. Mỗi giờ dọn dòng quá hạn một lần.
 */
export function recordSecurityAudit(e: SecurityAuditEntry, now: Date = new Date()): void {
  const prefix = ipPrefix(e.ip ?? null)
  const key = [e.type, prefix, e.product, e.version, e.channel, e.path].join('|')
  const t = now.getTime()
  const last = seen.get(key)
  if (last !== undefined && t - last < DEDUPE_MS) return
  if (seen.size >= DEDUPE_MAX) seen.clear()
  seen.set(key, t)
  const client =
    typeof e.clientId === 'function'
      ? e.clientId().catch(() => null)
      : Promise.resolve(e.clientId ?? null)
  client
    .then((clientId) =>
      prisma.securityAuditLog.create({
        data: {
          type: e.type,
          clientId: clientId?.slice(0, 128) ?? null,
          jktHash: e.jkt ? hashJkt(e.jkt) : null,
          ipPrefix: prefix,
          product: e.product ?? null,
          version: e.version ?? null,
          channel: e.channel ?? null,
          path: e.path?.split('?')[0]?.slice(0, 200) ?? null,
        },
      })
    )
    .catch((err: unknown) =>
      console.error(
        '[an-ninh] ghi SecurityAuditLog hỏng:',
        err instanceof Error ? err.message : err
      )
    )
  if (t - lastPurge >= PURGE_EVERY_MS) {
    lastPurge = t
    purgeSecurityAudit(now).catch((err: unknown) =>
      console.error(
        '[an-ninh] dọn SecurityAuditLog hỏng:',
        err instanceof Error ? err.message : err
      )
    )
  }
}
