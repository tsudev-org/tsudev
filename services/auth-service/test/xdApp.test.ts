// QR2b - vai XÁC NHẬN trong app (CROSS_DEVICE_LOGIN mục 1, 7): `/ent/xd/scan|approve|deny` bằng access token OIDC.
//
// Những cách hỏng mà site vẫn "chạy":
//  1. Token thiếu scope `tsudev.xd` (vd. chỉ `tsudev.entitlements`) vẫn cho phép đăng nhập máy khác.
//  2. App của tài khoản B cho phép hộ phiên mà tài khoản A đã quét.
//  3. Tài khoản bị khoá vẫn mở cửa cho thiết bị mới.
//  4. Mã khớp từ app không gõ được ở thiết bị mới (lệch máy trạng thái với luồng trình duyệt).
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.RATE_LIMIT_STORE = 'memory'
process.env.RATE_LIMIT_SENSITIVE_MAX = '1000'
delete process.env.INTERNAL_API_TOKEN

export {}

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const oidc = require('../src/oidc')
const { app } = require('../src/index')

const stamp = Date.now()
const A = `test-xdapp-a-${stamp}`
const B = `test-xdapp-b-${stamp}`
const VN = {
  'cf-ipcountry': 'VN',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
}
let aId: string
let bId: string

const tokenFor = (accountId: string, scopes = ['openid', 'tsudev.xd']) =>
  jest
    .spyOn(oidc, 'findAccessToken')
    .mockResolvedValue({ accountId, clientId: 'qulythuchi', scopes })
const appPost = (path: string, body: object, country = 'VN') =>
  request(app)
    .post(`/ent/xd/${path}`)
    .set({ Authorization: 'Bearer t', 'cf-ipcountry': country })
    .send(body)
const idPost = (path: string, body: object) =>
  request(app).post(`/api/identity/xd/${path}`).set(VN).send(body)

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { username: { in: [A, B] } } })
  aId = (
    await prisma.user.create({ data: { username: A, email: `${A}@tsudev.local`, role: 'MEMBER' } })
  ).id
  bId = (
    await prisma.user.create({ data: { username: B, email: `${B}@tsudev.local`, role: 'MEMBER' } })
  ).id
})

afterEach(() => jest.restoreAllMocks())

afterAll(async () => {
  await prisma.oidcPayload.deleteMany({ where: { type: 'XdSession' } })
  await prisma.user.deleteMany({ where: { username: { in: [A, B] } } })
  await prisma.$disconnect()
})

test('scope tsudev.xd có trong cấu hình OIDC (discovery công bố)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../src/oidc.ts'), 'utf8')
  expect(src).toMatch(/scopes: \[[^\]]*'tsudev\.xd'/)
})

test('không token / token lạ ⇒ 401, không chạm phiên', async () => {
  expect((await request(app).post('/ent/xd/scan').send({})).status).toBe(401)
  const r = await request(app)
    .post('/ent/xd/scan')
    .set('Authorization', 'Bearer khong-ton-tai')
    .send({})
  expect(r.status).toBe(401)
  expect(r.headers['cache-control']).toBe('no-store')
})

test('token thiếu scope tsudev.xd ⇒ 403 insufficient_scope', async () => {
  tokenFor(aId, ['openid', 'tsudev.entitlements'])
  const c = await idPost('create-pull', {})
  const r = await appPost('scan', { id: c.body.id, k: c.body.k })
  expect(r.status).toBe(403)
  expect(r.body).toEqual({ error: 'insufficient_scope', scope: 'tsudev.xd' })
})

test('Đ2 từ app: quét ⇒ cho phép ⇒ mã gõ được ở thiết bị mới ⇒ vé', async () => {
  tokenFor(aId)
  const c = await idPost('create-pull', {})
  const s = await appPost('scan', { id: c.body.id, k: c.body.k })
  expect(s.status).toBe(200)
  expect(s.body.requester).toEqual({ label: expect.any(String), country: 'VN' })
  const a = await appPost('approve', { id: c.body.id })
  expect(a.status).toBe(200)
  expect(a.body.code).toMatch(/^[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/)
  const v = await idPost('verify', { id: c.body.id, poll: c.body.poll, code: a.body.code })
  expect(v.status).toBe(200)
  const r = await idPost('redeem', { ticket: v.body.ticket })
  expect(r.body.id).toBe(aId)
})

test('bí mật QR sai ⇒ 404; quét lại QR đã dùng ⇒ 410', async () => {
  tokenFor(aId)
  const c = await idPost('create-pull', {})
  expect((await appPost('scan', { id: c.body.id, k: 'sai' })).status).toBe(404)
  expect((await appPost('scan', { id: c.body.id, k: c.body.k })).status).toBe(200)
  expect((await appPost('scan', { id: c.body.id, k: c.body.k })).status).toBe(410)
})

test('tài khoản khác KHÔNG cho phép hộ được', async () => {
  tokenFor(aId)
  const c = await idPost('create-pull', {})
  await appPost('scan', { id: c.body.id, k: c.body.k })
  jest.restoreAllMocks()
  tokenFor(bId)
  expect((await appPost('approve', { id: c.body.id })).status).toBe(404)
  expect((await appPost('deny', { id: c.body.id })).status).toBe(404)
})

test('Từ chối từ app ⇒ thiết bị mới thấy dead', async () => {
  tokenFor(aId)
  const c = await idPost('create-pull', {})
  await appPost('scan', { id: c.body.id, k: c.body.k })
  const d = await appPost('deny', { id: c.body.id })
  expect(d.body).toEqual({ ok: true })
  const st = await idPost('status', { id: c.body.id, poll: c.body.poll })
  expect(st.body.state).toBe('dead')
})

test('khác quốc gia ⇒ 403 country_mismatch', async () => {
  tokenFor(aId)
  const c = await idPost('create-pull', {})
  await appPost('scan', { id: c.body.id, k: c.body.k }, 'US')
  const a = await appPost('approve', { id: c.body.id }, 'US')
  expect(a.status).toBe(403)
  expect(a.body.error).toBe('country_mismatch')
})

test('tài khoản bị khoá ⇒ 423', async () => {
  await prisma.user.update({
    where: { id: bId },
    data: { lockedUntil: new Date(Date.now() + 3_600_000) },
  })
  tokenFor(bId)
  const c = await idPost('create-pull', {})
  const r = await appPost('scan', { id: c.body.id, k: c.body.k })
  expect(r.status).toBe(423)
})
