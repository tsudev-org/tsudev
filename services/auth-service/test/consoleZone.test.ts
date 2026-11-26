// CP2 (ADR-0005 mục 3-4, CONTROL_PLANE.md mục 3 L2 + L5, checklist mục 9): vùng ký `console` và JWT Access.
//
//  1. Có `INTERNAL_IDENTITY_SECRET_CONSOLE` ⇒ route useradmin TỪ CHỐI khẳng định vùng main (Worker công khai bị
//     chiếm không quản lý được tài khoản), nhận khẳng định vùng console rồi mới tới cổng OWNER đọc từ DB.
//  2. Khoá console ký với `aud` main (hay ngược lại) không qua - hai lớp độc lập.
//  3. JWT Access: RS256 + `aud` + `iss` đúng mới `ok`; JWKS giả, thiếu, sai `aud`, HS256 ⇒ không `ok`;
//     `chan` ⇒ 403, không cấu hình/không tải được JWKS ⇒ 503.
export {}
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.INTERNAL_IDENTITY_SECRET_CONSOLE = 'k'.repeat(40) // khoá giả của test
process.env.NEXT_PUBLIC_MAIN_URL ||= 'https://tsudev.test'
delete process.env.INTERNAL_API_TOKEN
delete process.env.CF_ACCESS_MODE
delete process.env.CF_ACCESS_TEAM_DOMAIN
delete process.env.CF_ACCESS_AUD_CONSOLE

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const jose = require('jose')
const {
  signIdentity,
  verifyIdentity,
  verifyAccessJwt,
  accessDecision,
  accessIssuer,
} = require('@tsudev/identity-token')
const { __resetConsoleGate } = require('@tsudev/auth')
const { app } = require('../src/index')

const MAIN = process.env.INTERNAL_IDENTITY_SECRET as string
const CONSOLE = process.env.INTERNAL_IDENTITY_SECRET_CONSOLE as string
const MEMBER = 'test-cz-member'

const bearer = async (secret: string, zone: 'main' | 'console', sub = MEMBER) => ({
  Authorization: `Bearer ${await signIdentity({ sub }, secret, zone)}`,
})

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { username: MEMBER } })
  await prisma.user.create({
    data: { username: MEMBER, email: `${MEMBER}@tsudev.test`, role: 'MEMBER' },
  })
})
afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: MEMBER } })
  await prisma.$disconnect()
})
beforeEach(() => {
  __resetConsoleGate()
  delete process.env.CF_ACCESS_MODE
})

describe('khẳng định danh tính theo vùng', () => {
  test('khoá + aud phải cùng vùng', async () => {
    const t = await signIdentity({ sub: 'a' }, CONSOLE, 'console')
    expect((await verifyIdentity(t, CONSOLE, 'console'))?.zone).toBe('console')
    expect(await verifyIdentity(t, CONSOLE, 'main')).toBeNull() // đúng khoá, sai aud
    expect(await verifyIdentity(t, MAIN, 'console')).toBeNull() // đúng aud, sai khoá
    const m = await signIdentity({ sub: 'a' }, CONSOLE, 'main') // khoá console nhưng aud main
    expect(await verifyIdentity(m, CONSOLE, 'console')).toBeNull()
  })
})

describe('route useradmin chỉ nhận vùng console', () => {
  test('khẳng định vùng main ⇒ 403 console_required', async () => {
    const r = await request(app)
      .post('/api/identity/useradmin/list')
      .set(await bearer(MAIN, 'main'))
      .send({})
    expect(r.status).toBe(403)
    expect(r.body.code).toBe('console_required')
  })

  test('khẳng định vùng console ⇒ qua cổng vùng, tới cổng OWNER (MEMBER ⇒ forbidden)', async () => {
    const r = await request(app)
      .post('/api/identity/useradmin/list')
      .set(await bearer(CONSOLE, 'console'))
      .send({})
    expect(r.status).toBe(403)
    expect(r.body.error).toBe('forbidden')
  })

  test('useradmin/security còn ở tsudev.com tới CP3 - không bị cổng vùng chặn', async () => {
    const r = await request(app)
      .post('/api/identity/useradmin/security')
      .set(await bearer(MAIN, 'main'))
      .send({})
    expect(r.body.code).not.toBe('console_required')
  })

  test('CF_ACCESS_MODE=chan + thiếu JWT Access ⇒ 403/503, không bao giờ cho qua', async () => {
    process.env.CF_ACCESS_MODE = 'chan'
    const r1 = await request(app)
      .post('/api/identity/useradmin/list')
      .set(await bearer(CONSOLE, 'console'))
      .send({})
    expect(r1.status).toBe(503) // chưa cấu hình team/AUD ⇒ đóng
    process.env.CF_ACCESS_TEAM_DOMAIN = 'gia.cloudflareaccess.com'
    process.env.CF_ACCESS_AUD_CONSOLE = 'aud-gia'
    const r2 = await request(app)
      .post('/api/identity/useradmin/list')
      .set(await bearer(CONSOLE, 'console'))
      .send({})
    expect(r2.status).toBe(403)
    expect(r2.body.code).toBe('thieu')
    delete process.env.CF_ACCESS_TEAM_DOMAIN
    delete process.env.CF_ACCESS_AUD_CONSOLE
  })

  test('chưa có khoá console trên backend ⇒ chuyển tiếp: vùng main còn qua', async () => {
    delete process.env.INTERNAL_IDENTITY_SECRET_CONSOLE
    try {
      const r = await request(app)
        .post('/api/identity/useradmin/list')
        .set(await bearer(MAIN, 'main'))
        .send({})
      expect(r.body.code).not.toBe('console_required')
    } finally {
      process.env.INTERNAL_IDENTITY_SECRET_CONSOLE = CONSOLE
    }
  })
})

describe('JWT Cloudflare Access (JWKS giả)', () => {
  const TEAM = 'nhom-thu.cloudflareaccess.com'
  const AUD = 'aud-console-thu'
  const cfg = { teamDomain: TEAM, aud: AUD }
  type Pair = Awaited<ReturnType<typeof import('jose').generateKeyPair>>
  let keys: Pair
  let jwks: ReturnType<typeof import('jose').createLocalJWKSet>
  let otherKeys: Pair

  beforeAll(async () => {
    keys = await jose.generateKeyPair('RS256')
    otherKeys = await jose.generateKeyPair('RS256')
    const pub = await jose.exportJWK(keys.publicKey)
    jwks = jose.createLocalJWKSet({ keys: [{ ...pub, kid: 'k1', alg: 'RS256' }] })
  })

  const sign = (claims: Record<string, unknown>, k = keys.privateKey, kid = 'k1') =>
    new jose.SignJWT({ email: 'chu@tsudev.test', ...claims })
      .setProtectedHeader({ alg: 'RS256', kid })
      .setIssuer((claims.iss as string) ?? accessIssuer(TEAM))
      .setAudience((claims.aud as string) ?? AUD)
      .setIssuedAt()
      .setExpirationTime((claims.exp as number) ?? '10m')
      .sign(k)

  test('đúng chữ ký, aud, iss ⇒ ok + email', async () => {
    const v = await verifyAccessJwt(await sign({}), cfg, jwks)
    expect(v).toEqual({ result: 'ok', email: 'chu@tsudev.test' })
  })
  test('miền nhóm có https:// và / cuối vẫn khớp iss', async () => {
    const v = await verifyAccessJwt(
      await sign({}),
      { ...cfg, teamDomain: `https://${TEAM}/` },
      jwks
    )
    expect(v.result).toBe('ok')
  })
  test('sai aud / sai iss / khoá lạ / hết hạn / HS256 ⇒ sai', async () => {
    expect((await verifyAccessJwt(await sign({ aud: 'aud-khac' }), cfg, jwks)).result).toBe('sai')
    expect(
      (await verifyAccessJwt(await sign({ iss: 'https://ke-gia.cloudflareaccess.com' }), cfg, jwks))
        .result
    ).toBe('sai')
    expect((await verifyAccessJwt(await sign({}, otherKeys.privateKey), cfg, jwks)).result).toBe(
      'sai'
    )
    const old = Math.floor(Date.now() / 1000) - 3600
    expect((await verifyAccessJwt(await sign({ exp: old }), cfg, jwks)).result).toBe('sai')
    const hs = await new jose.SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(accessIssuer(TEAM))
      .setAudience(AUD)
      .setExpirationTime('10m')
      .sign(new TextEncoder().encode('h'.repeat(40)))
    expect((await verifyAccessJwt(hs, cfg, jwks)).result).toBe('sai')
  })
  test('thiếu token / thiếu cấu hình', async () => {
    expect((await verifyAccessJwt(null, cfg, jwks)).result).toBe('thieu')
    expect((await verifyAccessJwt(await sign({}), { teamDomain: TEAM }, jwks)).result).toBe(
      'chua_cau_hinh'
    )
  })
  test('không tải được JWKS ⇒ khong_jwks (không phải ok)', async () => {
    const hong = async () => {
      throw new TypeError('fetch failed')
    }
    expect((await verifyAccessJwt(await sign({}), cfg, hong)).result).toBe('khong_jwks')
  })
  test('quyết định theo chế độ', () => {
    expect(accessDecision({ result: 'sai' }, 'ghi')).toEqual({ allow: true })
    expect(accessDecision({ result: 'sai' }, 'chan')).toEqual({ allow: false, status: 403 })
    expect(accessDecision({ result: 'thieu' }, 'chan')).toEqual({ allow: false, status: 403 })
    expect(accessDecision({ result: 'khong_jwks' }, 'chan')).toEqual({ allow: false, status: 503 })
    expect(accessDecision({ result: 'ok' }, 'chan')).toEqual({ allow: true })
    expect(accessDecision({ result: 'sai' }, 'tat')).toEqual({ allow: true })
  })
})
