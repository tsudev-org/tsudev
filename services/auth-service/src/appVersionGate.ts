import type { NextFunction, Request, Response } from 'express'
import { prisma } from '@tsudev/db'
import { jwkThumbprint } from './entitlements'
import { findAccessToken } from './oidc'
import { recordSecurityAudit, type SecurityAuditType } from './securityAudit'
import { callerIp } from './throttle'

/**
 * INT1-b - cổng phiên bản cho MỌI API mà app gọi (APP_INTEGRITY 2.1, I2):
 *
 *   X-Tsu-App: <ma-san-pham>/<phiên bản>/<kênh>
 *
 * - Header sai định dạng (kể cả gửi hai lần) ⇒ `400 app_header_invalid`.
 * - Thiếu header ⇒ `400 app_header_required` khi `X_TSU_APP_REQUIRED=1`. Chưa bật thì cho qua
 *   và ghi `app_header_missing` vào nhật ký: bản app đã cài hôm nay (tsudisk, tsuswico, máy chủ
 *   RP của qulythuchi...) chưa gửi header này, và trả 400 cho chúng là khoá người dùng khi chưa
 *   có bản nào để cập nhật - đúng lỗi mà APP_INTEGRITY 2.1 gọi là nghiêm trọng nhất. Bật cờ là
 *   việc của chủ dự án ở INT1-f, khi nhật ký cho thấy không còn app nào thiếu header.
 * - Phiên bản < `latest` của (sản phẩm, kênh) trong `AppVersionChannel` ⇒ `426`
 *   `{"error":"update_required","latest","url"}`. Bản thử của chính `latest` (`-beta.N`) là cũ hơn.
 * - Kênh khác / sản phẩm chưa có dòng ⇒ cho qua (chốt chặn theo KÊNH: chỉ kênh đã có bản mới
 *   tải được mới bị khoá).
 *
 * Gắn ở `/ent/*` (trừ `/ent/reminders` - cron) và `/oidc/me` (userinfo). BFF trình duyệt đi
 * `/api/identity/*` nên không bao giờ qua cổng này. Đọc bảng lỗi ⇒ cho qua (không khoá người
 * dùng vì DB chập chờn; route phía sau tự lỗi nếu DB thật sự hỏng).
 */

const HEADER_RE =
  /^([a-z0-9][a-z0-9-]{1,39})\/(\d{1,4}\.\d{1,4}\.\d{1,6}(?:-[0-9A-Za-z.-]{1,32})?)\/([a-z][a-z0-9-]{1,23})$/

export type AppHeader = { product: string; version: string; channel: string }

export function parseXTsuApp(v: unknown): AppHeader | null {
  if (typeof v !== 'string' || v.length > 120) return null
  const m = HEADER_RE.exec(v)
  return m ? { product: m[1] as string, version: m[2] as string, channel: m[3] as string } : null
}

/** So `a.b.c[-pre]` như `compareVersions` của @tsudev/ui; bản thử < bản chính thức cùng số. */
export function compareAppVersion(a: string, b: string): number {
  const split = (v: string) => {
    const i = v.indexOf('-')
    return {
      core: (i < 0 ? v : v.slice(0, i)).split('.').map(Number),
      pre: i < 0 ? null : v.slice(i + 1),
    }
  }
  const x = split(a)
  const y = split(b)
  for (let i = 0; i < 3; i++) {
    const d = (x.core[i] ?? 0) - (y.core[i] ?? 0)
    if (d !== 0) return d
  }
  if (x.pre === y.pre) return 0
  if (x.pre === null) return 1
  if (y.pre === null) return -1
  const px = x.pre.split('.')
  const py = y.pre.split('.')
  for (let i = 0; i < Math.max(px.length, py.length); i++) {
    const p = px[i]
    const q = py[i]
    if (p === undefined) return -1
    if (q === undefined) return 1
    if (/^\d+$/.test(p) && /^\d+$/.test(q)) {
      if (Number(p) !== Number(q)) return Number(p) - Number(q)
    } else if (p !== q) {
      return p < q ? -1 : 1
    }
  }
  return 0
}

export const appHeaderRequired = (): boolean => process.env.X_TSU_APP_REQUIRED === '1'

type Channel = { latest: string; url: string | null } | null
const CACHE_MS = 60_000
const cache = new Map<string, { at: number; row: Channel }>()

/** Chỉ cho test và cho đường nâng `latest` cùng tiến trình. */
export function clearAppVersionCache(): void {
  cache.clear()
}

async function channelRow(product: string, channel: string): Promise<Channel> {
  const key = `${product}/${channel}`
  const hit = cache.get(key)
  const now = Date.now()
  if (hit && now - hit.at < CACHE_MS) return hit.row
  const r = await prisma.appVersionChannel.findUnique({
    where: { product_channel: { product, channel } },
    select: { latest: true, url: true },
  })
  const row = r ? { latest: r.latest, url: r.url } : null
  if (cache.size > 500) cache.clear()
  cache.set(key, { at: now, row })
  return row
}

/** `jkt` KHAI (chưa kiểm chữ ký) trong bằng chứng DPoP - chỉ để nhật ký so được hai lượt. */
function claimedJkt(dpop: unknown): string | null {
  if (typeof dpop !== 'string' || dpop.length > 4096) return null
  try {
    const h = JSON.parse(Buffer.from(dpop.split('.')[0] ?? '', 'base64url').toString('utf8'))
    const j = h?.jwk
    if (
      j?.kty !== 'EC' ||
      j.crv !== 'P-256' ||
      typeof j.x !== 'string' ||
      typeof j.y !== 'string'
    ) {
      return null
    }
    return jwkThumbprint({ crv: 'P-256', kty: 'EC', x: j.x, y: j.y })
  } catch {
    return null
  }
}

function audit(req: Request, type: SecurityAuditType, app: AppHeader | null): void {
  const auth = req.headers.authorization
  const token =
    typeof auth === 'string' && /^(Bearer|DPoP) [^\s]+$/.test(auth)
      ? auth.slice(auth.indexOf(' ') + 1)
      : ''
  recordSecurityAudit({
    type,
    ip: callerIp(req.headers as Record<string, unknown>, req.ip || ''),
    clientId: token ? async () => (await findAccessToken(token))?.clientId ?? null : null,
    jkt: claimedJkt(req.headers.dpop),
    product: app?.product,
    version: app?.version,
    channel: app?.channel,
    path: req.originalUrl,
  })
}

export function appVersionGate(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS') return next()
  void (async () => {
    const raw = req.headers['x-tsu-app']
    if (raw === undefined) {
      audit(req, 'app_header_missing', null)
      if (appHeaderRequired()) {
        res.setHeader('Cache-Control', 'no-store')
        return void res.status(400).json({ error: 'app_header_required' })
      }
      return next()
    }
    const app = parseXTsuApp(raw)
    if (!app) {
      audit(req, 'app_header_invalid', null)
      res.setHeader('Cache-Control', 'no-store')
      return void res.status(400).json({ error: 'app_header_invalid' })
    }
    let row: Channel
    try {
      row = await channelRow(app.product, app.channel)
    } catch (e) {
      console.error(
        '[cong-phien-ban] đọc AppVersionChannel hỏng:',
        e instanceof Error ? e.message : e
      )
      return next()
    }
    if (row && compareAppVersion(app.version, row.latest) < 0) {
      audit(req, 'update_required', app)
      res.setHeader('Cache-Control', 'no-store')
      return void res
        .status(426)
        .json({ error: 'update_required', latest: row.latest, url: row.url })
    }
    next()
  })().catch(next)
}
