// INT1-b - cổng `X-Tsu-App` (APP_INTEGRITY 2.1) + SecurityAuditLog (PRODUCT_POLICY 7.7).
//
// Những cách hỏng mà site vẫn "chạy":
//  1. Bản app cũ hơn `latest` của kênh vẫn lấy được quyền lợi/userinfo (I2 thủng).
//  2. Nâng `latest` của kênh `github` khoá luôn bản Play chưa có bản mới (người dùng bị khoá
//     mà không có gì để cập nhật).
//  3. Một route app mới gắn dưới `/ent` TRƯỚC cổng, hoặc proxy Next quên chuyển header ⇒
//     mọi app bị coi như không gửi header, 426 không bao giờ xảy ra.
//  4. BFF trình duyệt (`/api/identity/*`) dính cổng của app.
//  5. Nhật ký giữ IP thô hoặc `jkt` gốc; không bao giờ được dọn.
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.RATE_LIMIT_STORE = 'memory'
delete process.env.INTERNAL_API_TOKEN
delete process.env.X_TSU_APP_REQUIRED

export {}

const fs = require('node:fs')
const path = require('node:path')
const request = require('supertest')
const { prisma } = require('@tsudev/db')
const oidc = require('../src/oidc')
const { app } = require('../src/index')
const { clearAppVersionCache, compareAppVersion, parseXTsuApp } = require('../src/appVersionGate')
const { ipPrefix, purgeSecurityAudit, resetSecurityAuditState } = require('../src/securityAudit')

const stamp = Date.now().toString(36)
const SP = `test-gate-${stamp}`
const LATEST = '26.11.2601'
const URL_GH = `https://github.com/tsudev-org/${SP}/releases/tag/v${LATEST}`

const waitFor = async <T>(fn: () => Promise<T | null | undefined>, ms = 3000): Promise<T> => {
  const end = Date.now() + ms
  for (;;) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) throw new Error('hết giờ chờ')
    await new Promise((r) => setTimeout(r, 25))
  }
}

beforeAll(async () => {
  await prisma.appVersionChannel.create({
    data: {
      product: SP,
      channel: 'github',
      latest: LATEST,
      url: URL_GH,
      verifiedAt: new Date(),
      raisedBy: 'test',
    },
  })
})

beforeEach(() => {
  clearAppVersionCache()
  resetSecurityAuditState()
})

afterEach(() => {
  jest.restoreAllMocks()
  delete process.env.X_TSU_APP_REQUIRED
})

afterAll(async () => {
  await prisma.securityAuditLog.deleteMany({
    where: { OR: [{ product: SP }, { path: { contains: stamp } }] },
  })
  await prisma.appVersionChannel.deleteMany({ where: { product: SP } })
  await prisma.$disconnect()
})

const meWith = (h: Record<string, string>) =>
  request(app)
    .get(`/ent/me?t=${stamp}`)
    .set({ 'x-forwarded-for': '203.0.113.77', ...h })

describe('định dạng và so phiên bản', () => {
  test('parseXTsuApp nhận đúng ba phần, từ chối mọi biến thể', () => {
    expect(parseXTsuApp('qulythuchi/26.11.2601/play')).toEqual({
      product: 'qulythuchi',
      version: '26.11.2601',
      channel: 'play',
    })
    expect(parseXTsuApp('tsucwico/26.11.2601-beta.2/github')).not.toBeNull()
    for (const bad of [
      '',
      'qulythuchi/26.11.2601',
      'qulythuchi/v26.11.2601/play',
      'Qulythuchi/26.11.2601/play',
      'qulythuchi/26.11/play',
      'qulythuchi/26.11.2601/play/x',
      'qulythuchi/26.11.2601/play, qulythuchi/26.11.2601/play',
      'a/26.11.2601/play',
    ]) {
      expect(parseXTsuApp(bad)).toBeNull()
    }
  })

  test('compareAppVersion: số, bản thử < bản chính thức cùng số', () => {
    expect(compareAppVersion('26.11.2601', '26.11.2601')).toBe(0)
    expect(compareAppVersion('26.9.3001', '26.11.101')).toBeLessThan(0)
    expect(compareAppVersion('26.11.2601-beta.1', '26.11.2601')).toBeLessThan(0)
    expect(compareAppVersion('26.11.2601-beta.10', '26.11.2601-beta.9')).toBeGreaterThan(0)
    expect(compareAppVersion('26.11.2602', '26.11.2601')).toBeGreaterThan(0)
  })

  test('ipPrefix rút gọn /24 và /48; IPv4 nhúng tính như IPv4; rác ⇒ null', () => {
    expect(ipPrefix('203.0.113.77')).toBe('203.0.113.0/24')
    expect(ipPrefix('2001:db8:abcd:12::1')).toBe('2001:db8:abcd::/48')
    expect(ipPrefix('2001:db8::1')).toBe('2001:db8:0::/48')
    expect(ipPrefix('::ffff:198.51.100.9')).toBe('198.51.100.0/24')
    expect(ipPrefix('không-phải-ip')).toBeNull()
    expect(ipPrefix('')).toBeNull()
  })
})

describe('cổng trên /ent và /oidc/me', () => {
  test('header sai ⇒ 400 app_header_invalid + nhật ký', async () => {
    const r = await meWith({ 'X-Tsu-App': 'rác' })
    expect(r.status).toBe(400)
    expect(r.body).toEqual({ error: 'app_header_invalid' })
    await waitFor(() =>
      prisma.securityAuditLog.findFirst({ where: { type: 'app_header_invalid', path: `/ent/me` } })
    )
  })

  test('thiếu header: chưa bật X_TSU_APP_REQUIRED ⇒ cho qua; bật ⇒ 400 app_header_required', async () => {
    const lenient = await meWith({})
    expect(lenient.status).toBe(401) // tới route quyền lợi - thiếu token
    process.env.X_TSU_APP_REQUIRED = '1'
    const strict = await meWith({})
    expect(strict.status).toBe(400)
    expect(strict.body).toEqual({ error: 'app_header_required' })
  })

  test('cũ hơn latest của kênh ⇒ 426 update_required + nhật ký đủ trường, IP rút gọn, jkt băm', async () => {
    jest
      .spyOn(oidc, 'findAccessToken')
      .mockResolvedValue({ accountId: 'x', clientId: `client-${stamp}`, scopes: ['openid'] })
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: 'f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU',
      y: 'x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0',
    }
    const dpop = `${Buffer.from(JSON.stringify({ typ: 'dpop+jwt', alg: 'ES256', jwk })).toString('base64url')}.e30.sig`
    const r = await meWith({
      'X-Tsu-App': `${SP}/26.11.2501/github`,
      Authorization: 'Bearer tok',
      DPoP: dpop,
    })
    expect(r.status).toBe(426)
    expect(r.body).toEqual({ error: 'update_required', latest: LATEST, url: URL_GH })
    expect(r.headers['cache-control']).toBe('no-store')
    const row = await waitFor<{ jktHash: string | null }>(() =>
      prisma.securityAuditLog.findFirst({ where: { type: 'update_required', product: SP } })
    )
    expect(row).toMatchObject({
      clientId: `client-${stamp}`,
      ipPrefix: '203.0.113.0/24',
      version: '26.11.2501',
      channel: 'github',
      path: '/ent/me',
    })
    expect(row.jktHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(row)).not.toContain('203.0.113.77')
  })

  test('bản thử của chính latest ⇒ 426; bằng hoặc mới hơn ⇒ cho qua', async () => {
    expect((await meWith({ 'X-Tsu-App': `${SP}/${LATEST}-rc.1/github` })).status).toBe(426)
    expect((await meWith({ 'X-Tsu-App': `${SP}/${LATEST}/github` })).status).toBe(401)
    expect((await meWith({ 'X-Tsu-App': `${SP}/26.12.101/github` })).status).toBe(401)
  })

  test('kênh khác hoặc sản phẩm chưa có dòng ⇒ cho qua dù phiên bản rất cũ', async () => {
    expect((await meWith({ 'X-Tsu-App': `${SP}/1.0.0/play` })).status).toBe(401)
    expect((await meWith({ 'X-Tsu-App': `khong-co-${stamp}/1.0.0/github` })).status).toBe(401)
  })

  test('mọi nhánh của /ent mà app gọi đều qua cổng; /ent/reminders (cron) thì không', async () => {
    const old = { 'X-Tsu-App': `${SP}/1.0.0/github` }
    expect((await request(app).get('/ent/rp/abc').set(old)).status).toBe(426)
    expect((await request(app).post('/ent/status').set(old).send({})).status).toBe(426)
    expect((await request(app).post('/ent/play').set(old).send({})).status).toBe(426)
    expect((await request(app).post('/ent/xd/scan').set(old).send({})).status).toBe(426)
    expect((await request(app).post('/ent/reminders/run').set(old).send({})).status).not.toBe(426)
  })

  test('userinfo /oidc/me qua cổng', async () => {
    const r = await request(app)
      .get('/oidc/me')
      .set({ 'X-Tsu-App': `${SP}/1.0.0/github` })
    expect(r.status).toBe(426)
    expect((await request(app).get('/oidc/me').set({ 'X-Tsu-App': 'rác' })).status).toBe(400)
  })

  test('BFF trình duyệt (/api/identity/*) không dính cổng dù header sai', async () => {
    process.env.X_TSU_APP_REQUIRED = '1'
    const r = await request(app)
      .post('/api/identity/session-state')
      .set({ 'X-Tsu-App': 'rác' })
      .send({})
    expect([400, 426]).not.toContain(r.status)
  })
})

describe('hạn lưu 12 tháng', () => {
  test('purgeSecurityAudit xoá dòng quá 12 tháng, giữ dòng còn hạn', async () => {
    const now = new Date('2027-12-15T00:00:00Z')
    const old = await prisma.securityAuditLog.create({
      data: { type: 'update_required', product: SP, createdAt: new Date('2026-12-14T00:00:00Z') },
    })
    const keep = await prisma.securityAuditLog.create({
      data: { type: 'update_required', product: SP, createdAt: new Date('2026-12-16T00:00:00Z') },
    })
    await purgeSecurityAudit(now)
    expect(await prisma.securityAuditLog.findUnique({ where: { id: old.id } })).toBeNull()
    expect(await prisma.securityAuditLog.findUnique({ where: { id: keep.id } })).not.toBeNull()
  })
})

describe('quét nguồn: mọi route app nằm sau cổng', () => {
  const root = path.join(__dirname, '..', '..', '..')
  const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8')

  test('index.ts: cổng /ent đứng sau /ent/reminders và TRƯỚC mọi mount khác của /ent; /oidc/me trước provider', () => {
    const src = read('services/auth-service/src/index.ts')
    const gate = src.indexOf("app.use('/ent', appVersionGate)")
    expect(gate).toBeGreaterThan(-1)
    expect(src.indexOf("app.use('/ent/reminders'")).toBeLessThan(gate)
    const mounts = [...src.matchAll(/app\.(use|get|post|put|delete|all)\(\s*['"`](\/ent[^'"`]*)/g)]
    for (const m of mounts) {
      if (m[2] === '/ent/reminders' || m.index === gate) continue
      expect(`${m[2]}@${m.index! > gate}`).toBe(`${m[2]}@true`)
    }
    const me = src.indexOf("app.use('/oidc/me', appVersionGate)")
    expect(me).toBeGreaterThan(-1)
    expect(me).toBeLessThan(src.indexOf("app.use('/oidc', oidcHandler)"))
  })

  test('proxy Next chuyển x-tsu-app; mọi route /api/me, /api/rp, /api/xd đi qua proxyEntitlement', () => {
    expect(read('apps/frontend-main/lib/entitlementProxy.ts')).toMatch(/'x-tsu-app'/)
    expect(read('apps/frontend-main/pages/api/oidc/[...path].ts')).toMatch(/'x-tsu-app'/)
    const walk = (d: string): string[] =>
      fs
        .readdirSync(path.join(root, d), { withFileTypes: true })
        .flatMap((e: { name: string; isDirectory(): boolean }) =>
          e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]
        )
    const files = ['me', 'rp', 'xd'].flatMap((d) =>
      fs.existsSync(path.join(root, `apps/frontend-main/pages/api/${d}`))
        ? walk(`apps/frontend-main/pages/api/${d}`)
        : []
    )
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) expect(`${f}:${/proxyEntitlement\(/.test(read(f))}`).toBe(`${f}:true`)
  })
})
