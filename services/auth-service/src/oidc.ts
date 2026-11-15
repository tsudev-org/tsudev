import { createHmac, generateKeyPairSync } from 'crypto'
import type { Request, Response, RequestHandler } from 'express'
import { prisma } from '@tsudev/db'
import type { Prisma } from '@prisma/client'

/**
 * P4 - tsudev.com làm nhà cung cấp OpenID Connect cho các site `*.tsudev.com`
 * (quyết định D1). Thư viện `oidc-provider` (panva, có chứng nhận OpenID) - KHÔNG tự
 * viết giao thức: sai một chi tiết của OIDC là một lỗ hổng.
 *
 * Bất biến (test/oidc.test.ts canh):
 *   - CHỈ Authorization Code + PKCE S256. Không implicit, không hybrid, không
 *     password grant, không dynamic registration.
 *   - Client CÔNG KHAI (`token_endpoint_auth_method: none`), đọc từ bảng `OAuthClient`;
 *     redirect URI khớp TUYỆT ĐỐI (thư viện so chuỗi nguyên vẹn).
 *   - Khoá ký ES256 RIÊNG (`OIDC_SIGNING_JWK`) - không dùng chung khoá ký bản phát hành.
 *   - Refresh token xoay vòng; dùng lại token đã xoay ⇒ thư viện thu hồi cả grant.
 *   - Đổi `sessionVersion` ⇒ trigger Postgres xoá mọi trạng thái OIDC của người đó
 *     (migration 20261114140000).
 *
 * Thư viện là ESM thuần, service là CommonJS ⇒ nạp bằng `import()` động trong
 * `initOidc()`. Thiếu khoá ký ở production ⇒ OIDC TẮT (503) kèm log, KHÔNG chặn
 * khởi động: chưa site con nào dùng, chặn khởi động là sập đăng nhập của chính tsudev.com.
 */

// Kiểu tối thiểu của phần thư viện ta dùng - tránh kéo kiểu ESM vào biên dịch CJS.
type OidcProvider = {
  callback: () => (req: unknown, res: unknown) => void
  proxy: boolean
  interactionDetails: (req: unknown, res: unknown) => Promise<Interaction>
  interactionResult: (
    req: unknown,
    res: unknown,
    result: unknown,
    opts?: unknown
  ) => Promise<string>
  Grant: new (args: { accountId: string; clientId: string }) => GrantInstance
  Client: { find: (id: string) => Promise<{ clientName?: string; clientId: string } | undefined> }
}
type GrantInstance = {
  addOIDCScope: (s: string) => void
  addOIDCClaims: (c: string[]) => void
  addResourceScope: (r: string, s: string) => void
  save: () => Promise<string>
}
type Interaction = {
  uid: string
  prompt: { name: string; details: Record<string, unknown> }
  params: Record<string, unknown>
  session?: { accountId?: string }
  grantId?: string
}

let provider: OidcProvider | null = null
let disabledReason = 'chưa khởi tạo'

export const oidcIssuer = (): string =>
  (
    process.env.OIDC_ISSUER ||
    `${(process.env.SITE_URL || 'https://tsudev.com').replace(/\/$/, '')}/oidc`
  ).replace(/\/$/, '')

/** Khoá cookie của provider - suy từ INTERNAL_IDENTITY_SECRET (đã có), không thêm secret mới. */
const cookieKey = (): string | null => {
  const s = process.env.INTERNAL_IDENTITY_SECRET || ''
  return s.length >= 32
    ? createHmac('sha256', s).update('tsudev-oidc-cookie-v1').digest('base64url')
    : null
}

/** Khoá ký ES256: JWK riêng tư từ env; dev/test sinh tạm (token mất hiệu lực khi khởi động lại - chấp nhận). */
function signingJwk(): Record<string, unknown> | null {
  const raw = (process.env.OIDC_SIGNING_JWK || '').trim()
  if (raw) {
    const jwk = JSON.parse(raw) as Record<string, unknown>
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.d) {
      throw new Error('OIDC_SIGNING_JWK phải là JWK EC P-256 RIÊNG TƯ (có trường d)')
    }
    return { use: 'sig', alg: 'ES256', ...jwk }
  }
  if (process.env.NODE_ENV === 'production') return null
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
  return { ...privateKey.export({ format: 'jwk' }), use: 'sig', alg: 'ES256', kid: 'dev-tam' }
}

// ---------------------------------------------------------------------------
// Adapter Postgres (bảng OidcPayload). Loại `Client` đọc từ bảng OAuthClient.
// ---------------------------------------------------------------------------
type Payload = Record<string, unknown> & {
  grantId?: string
  userCode?: string
  uid?: string
  consumed?: number
}

async function clientMetadata(id: string): Promise<Record<string, unknown> | undefined> {
  const c = await prisma.oAuthClient.findUnique({ where: { id } })
  if (!c || c.disabledAt) return undefined
  return {
    client_id: c.id,
    client_name: c.name,
    redirect_uris: c.redirectUris,
    post_logout_redirect_uris: c.postLogoutRedirectUris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: ['openid', 'offline_access', ...c.scopes].join(' '),
  }
}

export class PrismaAdapter {
  constructor(private readonly type: string) {}

  async upsert(id: string, payload: Payload, expiresIn: number): Promise<void> {
    const data = {
      payload: payload as unknown as Prisma.InputJsonValue,
      grantId: payload.grantId ?? null,
      userCode: payload.userCode ?? null,
      uid: payload.uid ?? null,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
    }
    await prisma.oidcPayload.upsert({
      where: { type_id: { type: this.type, id } },
      create: { type: this.type, id, ...data },
      update: data,
    })
  }

  async find(id: string): Promise<Payload | undefined> {
    if (this.type === 'Client') return clientMetadata(id)
    const row = await prisma.oidcPayload.findUnique({ where: { type_id: { type: this.type, id } } })
    if (!row || (row.expiresAt && row.expiresAt.getTime() < Date.now())) return undefined
    return {
      ...(row.payload as Payload),
      ...(row.consumedAt ? { consumed: Math.floor(row.consumedAt.getTime() / 1000) } : {}),
    }
  }

  async findByUid(uid: string): Promise<Payload | undefined> {
    const row = await prisma.oidcPayload.findFirst({ where: { type: this.type, uid } })
    return row ? this.find(row.id) : undefined
  }

  async findByUserCode(userCode: string): Promise<Payload | undefined> {
    const row = await prisma.oidcPayload.findFirst({ where: { type: this.type, userCode } })
    return row ? this.find(row.id) : undefined
  }

  async consume(id: string): Promise<void> {
    await prisma.oidcPayload.updateMany({
      where: { type: this.type, id },
      data: { consumedAt: new Date() },
    })
  }

  async destroy(id: string): Promise<void> {
    await prisma.oidcPayload.deleteMany({ where: { type: this.type, id } })
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    await prisma.oidcPayload.deleteMany({ where: { grantId } })
  }
}

// ---------------------------------------------------------------------------
// Tài khoản: claim theo scope. `sub` = User.id (ổn định qua đổi tên/email).
// ---------------------------------------------------------------------------
async function findAccount(_ctx: unknown, id: string) {
  const u = await prisma.user.findUnique({ where: { id } })
  if (!u || u.deactivatedAt || u.deletionScheduledAt) return undefined
  return {
    accountId: u.id,
    async claims() {
      return {
        sub: u.id,
        preferred_username: u.username,
        name: u.displayName || u.username,
        picture: u.avatarUrl || undefined,
        email: u.email,
        email_verified: Boolean(u.emailVerifiedAt),
      }
    },
  }
}

export async function initOidc(): Promise<void> {
  const key = cookieKey()
  let jwk: Record<string, unknown> | null
  try {
    jwk = signingJwk()
  } catch (e) {
    disabledReason = e instanceof Error ? e.message : String(e)
    console.error(`[auth] OIDC TẮT: ${disabledReason}`)
    return
  }
  if (!key || !jwk) {
    disabledReason = !key ? 'thiếu INTERNAL_IDENTITY_SECRET' : 'thiếu OIDC_SIGNING_JWK'
    console.error(`[auth] OIDC TẮT (${disabledReason}) - /oidc trả 503`)
    return
  }
  const mod = (await import('oidc-provider')) as unknown as {
    default: new (issuer: string, config: Record<string, unknown>) => OidcProvider
  }
  const p = new mod.default(oidcIssuer(), {
    adapter: PrismaAdapter,
    findAccount,
    jwks: { keys: [jwk] },
    cookies: { keys: [key] },
    responseTypes: ['code'],
    // Khoá duy nhất là ES256 ⇒ mặc định client và thuật toán công bố cũng chỉ ES256.
    clientDefaults: { id_token_signed_response_alg: 'ES256' },
    enabledJWA: { idTokenSigningAlgValues: ['ES256'] },
    pkce: { required: () => true },
    scopes: ['openid', 'offline_access', 'profile', 'email'],
    claims: {
      openid: ['sub'],
      profile: ['preferred_username', 'name', 'picture'],
      email: ['email', 'email_verified'],
    },
    features: {
      devInteractions: { enabled: false },
      registration: { enabled: false },
      revocation: { enabled: true },
      introspection: { enabled: false },
      rpInitiatedLogout: { enabled: true },
    },
    // Đường tương đối: trình duyệt giải theo origin của issuer (tsudev.com) - trang Next
    // `/oidc/interaction/[uid]` (KHÔNG bị rewrite về backend) đọc phiên NextAuth sẵn có.
    interactions: { url: (_ctx: unknown, i: { uid: string }) => `/oidc/interaction/${i.uid}` },
    rotateRefreshToken: true,
    ttl: {
      AccessToken: 15 * 60,
      AuthorizationCode: 60,
      IdToken: 15 * 60,
      Interaction: 10 * 60,
      Grant: 30 * 24 * 60 * 60,
      Session: 14 * 24 * 60 * 60,
      RefreshToken: 30 * 24 * 60 * 60,
    },
    clientBasedCORS: () => false,
    // Trang lỗi của chính tsudev: mặc định của thư viện nạp font từ Google (ngoài CSP)
    // và nói tiếng Anh. Mã lỗi OAuth giữ nguyên văn để site con chẩn đoán được.
    renderError: async (ctx: { type: string; body: string }, out: Record<string, string>) => {
      const esc = (v: unknown) =>
        String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
      ctx.type = 'html'
      ctx.body = `<!doctype html><html lang="vi"><meta charset="utf-8"><title>Không đăng nhập được - tsudev</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>Không đăng nhập được</h1><p>Yêu cầu đăng nhập từ ứng dụng này không hợp lệ.</p><p><code>${esc(out.error)}</code>: ${esc(out.error_description)}</p><p><a href="/">Về tsudev.com</a></p></body></html>`
    },
  })
  // Sau proxy (Cloudflare Worker → Render): tin X-Forwarded-Proto để cookie `secure` đúng.
  p.proxy = true
  provider = p
  disabledReason = ''
}

/** Middleware Express gắn ở `/oidc`. OIDC tắt ⇒ 503 nói rõ lý do. */
export const oidcHandler: RequestHandler = (req, res) => {
  if (!provider) {
    res.status(503).json({ error: 'oidc_disabled', detail: disabledReason })
    return
  }
  provider.callback()(req, res)
}

export const oidcEnabled = (): boolean => provider !== null

/**
 * Đọc interaction bằng cookie `_interaction` mà trình duyệt gửi tới trang Next, được
 * BFF chuyển nguyên văn trong `x-oidc-cookie`. Cookie đó do provider ký - BFF không
 * giả được, và nó buộc interaction với ĐÚNG trình duyệt đã bắt đầu luồng.
 */
function withOidcCookie(req: Request): Request {
  const raw = String(req.get('x-oidc-cookie') || '').slice(0, 8192)
  // CHỈ cookie của provider - không chuyển cookie phiên tsudev xuống service.
  const kept = raw
    .split(';')
    .map((c) => c.trim())
    .filter((c) => /^_(interaction|interaction_resume|session)(\.legacy)?(\.sig)?=/.test(c))
    .join('; ')
  req.headers.cookie = kept
  return req
}

export async function interactionDetails(req: Request, res: Response) {
  if (!provider) return null
  const i = await provider.interactionDetails(withOidcCookie(req), res)
  const clientId = String(i.params.client_id || '')
  const client = await provider.Client.find(clientId)
  return {
    uid: i.uid,
    prompt: i.prompt.name,
    clientId,
    clientName: client?.clientName || clientId,
    scopes: String(i.params.scope || '')
      .split(' ')
      .filter(Boolean),
  }
}

/**
 * Hoàn tất interaction cho `userId` (đã xác thực ở BFF, tra lại ở service). Một lượt
 * làm cả login + consent: người dùng đã đăng nhập tsudev.com và bấm "Cho phép" trên
 * trang đồng ý - không hỏi lại mật khẩu (SSO là mục đích của D1).
 */
export async function interactionFinish(
  req: Request,
  res: Response,
  userId: string,
  allow: boolean
): Promise<string | null> {
  if (!provider) return null
  const r = withOidcCookie(req)
  const i = await provider.interactionDetails(r, res)
  if (!allow) {
    return provider.interactionResult(r, res, {
      error: 'access_denied',
      error_description: 'Người dùng từ chối',
    })
  }
  const clientId = String(i.params.client_id || '')
  const grant = new provider.Grant({ accountId: userId, clientId })
  const requested = String(i.params.scope || '')
    .split(' ')
    .filter(Boolean)
  const meta = await clientMetadata(clientId)
  const allowed = new Set(String(meta?.scope || 'openid').split(' '))
  grant.addOIDCScope(requested.filter((s) => allowed.has(s)).join(' '))
  const grantId = await grant.save()
  return provider.interactionResult(
    r,
    res,
    { login: { accountId: userId }, consent: { grantId } },
    { mergeWithLastSubmission: false }
  )
}
