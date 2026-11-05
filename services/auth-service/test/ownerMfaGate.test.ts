// Ép 2FA cho bề mặt OWNER của auth-service (G6, docs/security-plan.md).
//
// useradmin.test.ts đã kiểm các route useradmin/alias theo danh sách GÕ TAY.
// Tệp này đọc route từ CHÍNH router của Express để khoá ba luật:
//
//   1. MỌI route dưới /api/identity/useradmin và /api/identity/alias - kể cả
//      route thêm sau này - chặn OWNER chưa có 2FA bằng 403 MFA_REQUIRED.
//   2. MỌI route dưới /api/identity/totp và /api/identity/passkey KHÔNG bao giờ
//      trả MFA_REQUIRED: đó là đường duy nhất để OWNER chưa có 2FA tự bật nó.
//      Ai lỡ gắn cổng 2FA lên đó thì OWNER tự khoá mình khỏi khu quản trị.
//   3. Thứ tự cổng: phiên bị thu hồi (sessionVersion) bị chặn 401 TRƯỚC bước
//      kiểm 2FA.
export {}
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.TOTP_ENCRYPTION_KEY = 'khoa-ma-hoa-totp-du-dai-cho-test-0123456789'
process.env.NEXT_PUBLIC_MAIN_URL ||= 'https://tsudev.test'
delete process.env.INTERNAL_API_TOKEN

const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { app } = require('../src/index')

const P = 'test-omfa-'
const OWNER = `${P}owner`

const asUser = async (sub: string, sv?: number) => ({
  Authorization: `Bearer ${await signIdentity({ sub, sv }, process.env.INTERNAL_IDENTITY_SECRET)}`,
})

type Layer = { route?: { path: string | string[]; methods: Record<string, boolean> } }

/** [METHOD, path] của mọi route nằm dưới một trong các tiền tố. */
const routesUnder = (...prefixes: string[]): [string, string][] =>
  ((app._router?.stack ?? []) as Layer[])
    .filter((l) => l.route)
    .flatMap((l) => {
      const paths = Array.isArray(l.route!.path) ? l.route!.path : [l.route!.path]
      const methods = Object.keys(l.route!.methods).filter((m) => m !== '_all')
      return paths.flatMap((p) => methods.map((m): [string, string] => [m.toUpperCase(), p]))
    })
    .filter(([, p]) => prefixes.some((x) => p === x || p.startsWith(x + '/')))

const OWNER_SURFACE = routesUnder('/api/identity/useradmin', '/api/identity/alias')
const ENROLL_SURFACE = routesUnder('/api/identity/totp', '/api/identity/passkey')

const send = async (method: string, p: string, headers: Record<string, string> = {}) => {
  const call = request(app)[method.toLowerCase()]
  return call(p).set(headers).send({ id: 'omfa-khong-ton-tai', code: '000000' })
}

let ownerId = ''
let startedAt = new Date()

beforeEach(async () => {
  startedAt = new Date()
  await prisma.user.deleteMany({ where: { username: { startsWith: P } } })
  const u = await prisma.user.create({
    data: { username: OWNER, email: `${OWNER}@tsudev.local`, displayName: OWNER, role: 'OWNER' },
  })
  ownerId = u.id
})

afterEach(async () => {
  // passkey/login-options sinh challenge không gắn userId - dọn theo thời điểm.
  await prisma.webAuthnChallenge.deleteMany({
    where: { OR: [{ userId: ownerId }, { userId: null, createdAt: { gte: startedAt } }] },
  })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: { startsWith: P } } })
  await prisma.$disconnect()
})

describe('bề mặt OWNER: mọi route useradmin/alias bị ép 2FA', () => {
  // test.each trên mảng rỗng thì "xanh" mà không kiểm gì. Thời điểm viết:
  // useradmin 7 route (list/create/update/role/revoke/delete/security) + alias 4.
  test('liệt kê được route OWNER từ router', () => {
    expect(OWNER_SURFACE.length).toBeGreaterThanOrEqual(11)
  })

  test.each(OWNER_SURFACE)(
    '%s %s: OWNER không 2FA ⇒ 403 MFA_REQUIRED',
    async (method, p) => {
      const res = await send(method, p, await asUser(OWNER))
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('MFA_REQUIRED')
    },
    20000
  )
})

describe('đường tự bật 2FA KHÔNG bị ép', () => {
  test('liệt kê được route totp/passkey từ router', () => {
    // totp setup/confirm/disable + passkey login-options/login-verify/
    // register-options/register-verify/list/delete.
    expect(ENROLL_SURFACE.length).toBeGreaterThanOrEqual(9)
  })

  test.each(ENROLL_SURFACE)(
    '%s %s: OWNER không 2FA không nhận MFA_REQUIRED',
    async (method, p) => {
      const res = await send(method, p, await asUser(OWNER))
      expect(res.body.code).not.toBe('MFA_REQUIRED')
      // 5xx ở đây nghĩa là route hỏng chứ không phải từ chối có chủ đích.
      expect(res.status).toBeLessThan(500)
    },
    20000
  )

  // Lưới quét NGUỒN: cổng 2FA chỉ được gọi ở MỘT chỗ - bên trong requireOwner -
  // và requireOwner chỉ được gọi trong route useradmin/alias. Gọi thẳng
  // requireSecondFactor ở route khác sẽ lọt qua test hành vi nếu route đó không
  // nằm dưới totp/passkey, nên khoá thêm ở đây.
  test('requireSecondFactor chỉ được gọi trong requireOwner', () => {
    const src: string = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8')
    const calls = [...src.matchAll(/requireSecondFactor\(/g)].map((m) => m.index as number)
    expect(calls.length).toBe(1)
    const start = src.indexOf('const requireOwner = async')
    const end = src.indexOf('\n}\n', start)
    expect(start).toBeGreaterThan(-1)
    expect(calls[0]).toBeGreaterThan(start)
    expect(calls[0]).toBeLessThan(end)
  })

  test('requireOwner chỉ được gọi trong route useradmin/alias', () => {
    const src: string = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8')
    const re = /\napp\.(?:get|post|put|patch|delete)\(\s*'([^']+)'/g
    const routes = [...src.matchAll(re)].map((m) => ({ path: m[1], at: m.index as number }))
    const offenders = routes
      .map((r, i) => ({ ...r, body: src.slice(r.at, routes[i + 1]?.at ?? src.length) }))
      .filter((r) => /requireOwner\(/.test(r.body))
      .filter((r) => !/^\/api\/identity\/(useradmin|alias)\//.test(r.path as string))
      .map((r) => r.path)
    expect(offenders).toEqual([])
  })

  test('không route useradmin/alias nào gắn qua Router con', () => {
    const src: string = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8')
    // app.use('/api/identity/useradmin', auth) là middleware xác thực - được phép.
    // Thứ bị cấm là gắn một Router (route của nó không hiện ở router gốc).
    const mounts = src.match(/\.use\(\s*'\/api\/identity\/(?:useradmin|alias)[^)]*\)/g) ?? []
    expect(mounts.length).toBeGreaterThan(0)
    for (const m of mounts) expect(m).toMatch(/,\s*auth\)$/)
  })
})

describe('thứ tự cổng: thu hồi phiên chặn TRƯỚC kiểm 2FA', () => {
  test('OWNER không 2FA, phiên đã thu hồi ⇒ 401, không lộ MFA_REQUIRED, không tra 2FA', async () => {
    await prisma.user.update({ where: { id: ownerId }, data: { sessionVersion: { increment: 1 } } })
    const spy = jest.spyOn(prisma.totpCredential, 'findFirst')
    try {
      const res = await request(app)
        .post('/api/identity/useradmin/list')
        .set(await asUser(OWNER, 0))
        .send({})
      expect(res.status).toBe(401)
      expect(res.body.code).toBeUndefined()
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  }, 20000)

  test('OWNER CÓ 2FA, phiên đã thu hồi ⇒ vẫn 401; phiên hiện hành ⇒ 200', async () => {
    await prisma.totpCredential.create({
      data: { userId: ownerId, secretEnc: 'test', confirmedAt: new Date() },
    })
    const u = await prisma.user.update({
      where: { id: ownerId },
      data: { sessionVersion: { increment: 1 } },
    })
    const old = await request(app)
      .post('/api/identity/useradmin/list')
      .set(await asUser(OWNER, 0))
      .send({})
    expect(old.status).toBe(401)
    const cur = await request(app)
      .post('/api/identity/useradmin/list')
      .set(await asUser(OWNER, u.sessionVersion))
      .send({})
    expect(cur.status).toBe(200)
  }, 20000)
})
