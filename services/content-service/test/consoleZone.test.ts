// CP3 (ADR-0005, CONTROL_PLANE.md mục 3 L5): mọi route điều hành của content-service chỉ nhận khẳng định vùng
// `console`. Danh sách route đọc từ CHÍNH router của Express - route /api/admin hay /api/author thêm sau này mà
// không nằm sau cổng vùng thì đỏ ở đây.
export {}
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.INTERNAL_IDENTITY_SECRET_CONSOLE = 'k'.repeat(40) // khoá giả của test
delete process.env.INTERNAL_API_TOKEN
delete process.env.CF_ACCESS_MODE

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { __resetConsoleGate } = require('@tsudev/auth')
const { app } = require('../src/index')

const MAIN = process.env.INTERNAL_IDENTITY_SECRET as string
const CONSOLE = process.env.INTERNAL_IDENTITY_SECRET_CONSOLE as string
const ADMIN = 'test-cz-content-admin'

const bearer = async (secret: string, zone: 'main' | 'console') => ({
  Authorization: `Bearer ${await signIdentity({ sub: ADMIN }, secret, zone)}`,
})

type Layer = { route?: { path: string | string[]; methods: Record<string, boolean> } }
const routes = (): [string, string][] =>
  ((app.router?.stack ?? []) as Layer[])
    .filter((l) => l.route)
    .flatMap((l) => {
      const paths = Array.isArray(l.route!.path) ? l.route!.path : [l.route!.path]
      const methods = Object.keys(l.route!.methods).filter((m) => m !== '_all')
      return paths.flatMap((p) => methods.map((m): [string, string] => [m.toUpperCase(), p]))
    })
const operational = () => routes().filter(([, p]) => /^\/api\/(admin|author)(\/|$)/.test(p))
const concrete = (p: string) => p.replace(/:([A-Za-z_]+)/g, 'cz-khong-ton-tai')

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { username: ADMIN } })
  await prisma.user.create({
    data: { username: ADMIN, email: `${ADMIN}@tsudev.test`, role: 'ADMIN' },
  })
})
afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: ADMIN } })
  await prisma.$disconnect()
})
beforeEach(() => __resetConsoleGate())

describe('content-service: route điều hành chỉ nhận vùng console', () => {
  test('có ít nhất vài chục route điều hành để kiểm', () => {
    expect(operational().length).toBeGreaterThan(20)
  })

  test('MỌI route /api/admin + /api/author: vùng main ⇒ 403 console_required', async () => {
    const leaks: string[] = []
    for (const [m, p] of operational()) {
      const call = request(app)[m.toLowerCase()]
      const r = await call(concrete(p))
        .set(await bearer(MAIN, 'main'))
        .send({})
      if (r.status !== 403 || r.body.code !== 'console_required')
        leaks.push(`${m} ${p} ⇒ ${r.status}`)
    }
    expect(leaks).toEqual([])
  }, 60000)

  test('ẩn danh cũng bị cổng vùng chặn', async () => {
    const r = await request(app).get('/api/author/posts')
    expect(r.status).toBe(403)
    expect(r.body.code).toBe('console_required')
  })

  test('vùng console ⇒ qua cổng vùng', async () => {
    const r = await request(app)
      .get('/api/author/posts')
      .set(await bearer(CONSOLE, 'console'))
    expect(r.body.code).not.toBe('console_required')
  })

  test('đường đọc công khai không bị cổng vùng chạm tới', async () => {
    const r = await request(app).get('/api/posts')
    expect(r.body.code).not.toBe('console_required')
  })

  test('pipeline bản kê ở tiền tố riêng (đường cũ còn song song một nhịp)', () => {
    const paths = routes().map(([m, p]) => `${m} ${p}`)
    expect(paths).toContain('POST /api/pipeline/versions/:product/:channel')
    expect(paths).toContain('POST /api/internal/versions/:product/:channel')
  })
})
