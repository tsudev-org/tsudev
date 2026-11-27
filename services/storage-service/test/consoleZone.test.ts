// CP3 (ADR-0005, CONTROL_PLANE.md mục 3 L5): xin URL presign và tải tệp lên chỉ dành cho trang điều hành - khẳng
// định vùng main (Worker công khai) bị 403 console_required, vùng console qua được cổng vùng.
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
const AUTHOR = 'test-cz-storage-author'

const bearer = async (secret: string, zone: 'main' | 'console') => ({
  Authorization: `Bearer ${await signIdentity({ sub: AUTHOR }, secret, zone)}`,
})

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { username: AUTHOR } })
  await prisma.user.create({
    data: { username: AUTHOR, email: `${AUTHOR}@tsudev.test`, role: 'AUTHOR' },
  })
})
afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: AUTHOR } })
  await prisma.$disconnect()
})
beforeEach(() => __resetConsoleGate())

describe('storage-service: presign/upload chỉ nhận vùng console', () => {
  test.each([
    ['get', '/api/presign?key=x.png'],
    ['post', '/api/presign'],
    ['post', '/api/upload'],
  ])('%s %s với vùng main ⇒ 403 console_required', async (method, url) => {
    const call = request(app)[method]
    const r = await call(url)
      .set(await bearer(MAIN, 'main'))
      .send({})
    expect(r.status).toBe(403)
    expect(r.body.code).toBe('console_required')
  })

  test('vùng console ⇒ qua cổng vùng (có thể lỗi ở bước sau, nhưng không phải console_required)', async () => {
    const r = await request(app)
      .post('/api/presign')
      .set(await bearer(CONSOLE, 'console'))
      .send({})
    expect(r.body.code).not.toBe('console_required')
  })
})
