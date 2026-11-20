// Tài khoản liên kết (STD43): oauth/list, oauth/link (chỉ BFF gọi), oauth/unlink.
//
// Bất biến:
//   (1) Cần khẳng định danh tính - không có ⇒ 401.
//   (2) link: cặp (provider, id) của NGƯỜI KHÁC ⇒ 409, không chuyển chủ; của mình ⇒ idempotent.
//   (3) Tối đa một liên kết mỗi nhà cung cấp trên một tài khoản.
//   (4) unlink: không gỡ được lối vào CUỐI CÙNG (không mật khẩu, không passkey, không liên kết khác).
//   (5) list không lộ providerAccountId.
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
delete process.env.INTERNAL_API_TOKEN

export {}

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { app } = require('../src/index')

const stamp = Date.now()
const ME = `oauth-acc-me-${stamp}`
const OTHER = `oauth-acc-other-${stamp}`
const SECRET = process.env.INTERNAL_IDENTITY_SECRET as string

const post = async (who: string, path: string, body: Record<string, unknown> = {}) =>
  request(app)
    .post(`/api/identity/oauth/${path}`)
    .set({ Authorization: `Bearer ${await signIdentity({ sub: who }, SECRET)}` })
    .send(body)

let meId = ''

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { username: { in: [ME, OTHER] } } })
  const me = await prisma.user.create({
    data: { username: ME, email: `${ME}@example.com`, role: 'MEMBER' },
  })
  meId = me.id
  const other = await prisma.user.create({
    data: { username: OTHER, email: `${OTHER}@example.com`, role: 'MEMBER' },
  })
  await prisma.oAuthAccount.create({
    data: { provider: 'github', providerAccountId: `gh-other-${stamp}`, userId: other.id },
  })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: { in: [ME, OTHER] } } })
  await prisma.$disconnect()
})

test('không khẳng định danh tính ⇒ 401', async () => {
  const res = await request(app).post('/api/identity/oauth/list').send({})
  expect(res.status).toBe(401)
})

test('link + list: liên kết vào ĐÚNG người đang đăng nhập, list không lộ id', async () => {
  const link = await post(ME, 'link', { provider: 'google', providerAccountId: `goo-${stamp}` })
  expect(link.status).toBe(200)
  const again = await post(ME, 'link', { provider: 'google', providerAccountId: `goo-${stamp}` })
  expect(again.status).toBe(200)
  const list = await post(ME, 'list')
  expect(list.status).toBe(200)
  expect(list.body.accounts).toHaveLength(1)
  expect(list.body.accounts[0].provider).toBe('google')
  expect(JSON.stringify(list.body)).not.toContain(`goo-${stamp}`)
  expect(list.body.hasPassword).toBe(false)
  expect(list.body.passkeys).toBe(0)
  const ev = await prisma.securityEvent.findFirst({ where: { userId: meId, type: 'oauth_linked' } })
  expect(ev).not.toBeNull()
})

test('link: cặp của người khác ⇒ 409, không chuyển chủ', async () => {
  const res = await post(ME, 'link', { provider: 'github', providerAccountId: `gh-other-${stamp}` })
  expect(res.status).toBe(409)
  expect(res.body.error).toBe('oauth_linked_elsewhere')
  const row = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: { provider: 'github', providerAccountId: `gh-other-${stamp}` },
    },
  })
  expect(row.userId).not.toBe(meId)
})

test('link: nhà cung cấp đã có liên kết khác trên tài khoản ⇒ 409', async () => {
  await post(ME, 'link', { provider: 'google', providerAccountId: `goo-a-${stamp}` })
  const res = await post(ME, 'link', { provider: 'google', providerAccountId: `goo-b-${stamp}` })
  expect(res.status).toBe(409)
  expect(res.body.error).toBe('oauth_provider_already_linked')
})

test('link: provider lạ ⇒ 400', async () => {
  const res = await post(ME, 'link', { provider: 'facebook', providerAccountId: 'x' })
  expect(res.status).toBe(400)
})

test('unlink: lối vào cuối cùng ⇒ 409; còn lối khác ⇒ gỡ được', async () => {
  await post(ME, 'link', { provider: 'google', providerAccountId: `goo-${stamp}` })
  const blocked = await post(ME, 'unlink', { provider: 'google' })
  expect(blocked.status).toBe(409)
  expect(blocked.body.error).toBe('last_login_method')

  await post(ME, 'link', { provider: 'github', providerAccountId: `gh-me-${stamp}` })
  const ok = await post(ME, 'unlink', { provider: 'google' })
  expect(ok.status).toBe(200)
  expect(ok.body.ok).toBe(true)
  const left = await prisma.oAuthAccount.findMany({ where: { userId: meId } })
  expect(left.map((a: { provider: string }) => a.provider)).toEqual(['github'])
})

test('unlink: chưa liên kết ⇒ 404', async () => {
  const res = await post(ME, 'unlink', { provider: 'google' })
  expect(res.status).toBe(404)
})
