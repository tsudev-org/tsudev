// CP4: vùng ký `id` của cổng id.tsudev.com. Worker cổng ký bằng INTERNAL_IDENTITY_SECRET_ID (không giữ khoá vùng main):
//  1. khẳng định vùng id được nhận với quyền ngang main (route tài khoản thường);
//  2. KHÔNG qua route điều hành (useradmin chỉ nhận vùng console);
//  3. backend thiếu khoá vùng id ⇒ khẳng định vùng id bị từ chối (401), không rơi về khoá khác;
//  4. khoá id + aud main (hay ngược lại) không qua.
export {}
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.INTERNAL_IDENTITY_SECRET_CONSOLE = 'k'.repeat(40) // khoá giả của test
process.env.INTERNAL_IDENTITY_SECRET_ID = 'i'.repeat(40) // khoá giả của test
process.env.NEXT_PUBLIC_MAIN_URL ||= 'https://tsudev.test'
delete process.env.INTERNAL_API_TOKEN

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity, verifyIdentity } = require('@tsudev/identity-token')
const { app } = require('../src/index')

const MAIN = process.env.INTERNAL_IDENTITY_SECRET as string
const ID = process.env.INTERNAL_IDENTITY_SECRET_ID as string
const MEMBER = 'test-idz-member'

const bearer = async (secret: string, zone: 'main' | 'console' | 'id') => ({
  Authorization: `Bearer ${await signIdentity({ sub: MEMBER }, secret, zone)}`,
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

test('khoá + aud phải cùng vùng id', async () => {
  const t = await signIdentity({ sub: 'a' }, ID, 'id')
  expect((await verifyIdentity(t, ID, 'id'))?.zone).toBe('id')
  expect(await verifyIdentity(t, ID, 'main')).toBeNull()
  expect(await verifyIdentity(t, MAIN, 'id')).toBeNull()
  expect(await verifyIdentity(await signIdentity({ sub: 'a' }, ID, 'main'), ID, 'id')).toBeNull()
})

test('vùng id được nhận ở route tài khoản thường', async () => {
  const r = await request(app)
    .post('/api/identity/session-state')
    .set(await bearer(ID, 'id'))
    .send({})
  expect(r.status).toBe(200)
  expect(r.body.role).toBe('MEMBER')
})

test('vùng id KHÔNG qua route điều hành', async () => {
  const r = await request(app)
    .post('/api/identity/useradmin/list')
    .set(await bearer(ID, 'id'))
    .send({})
  expect(r.status).toBe(403)
  expect(r.body.code).toBe('console_required')
})

test('backend thiếu khoá vùng id ⇒ 401, không rơi về khoá khác', async () => {
  const h = await bearer(ID, 'id')
  delete process.env.INTERNAL_IDENTITY_SECRET_ID
  try {
    const r = await request(app).post('/api/identity/session-state').set(h).send({})
    expect(r.status).toBe(401)
  } finally {
    process.env.INTERNAL_IDENTITY_SECRET_ID = ID
  }
})
