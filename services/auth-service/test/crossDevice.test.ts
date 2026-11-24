// Đăng nhập chéo thiết bị bằng QR + mã khớp (CROSS_DEVICE_LOGIN v1.0.0, crossDevice.ts).
//
// Bất biến: mã khớp chỉ trả cho thiết bị xác nhận; gõ đúng ⇒ vé một lần; sai 3 lần ⇒ phiên chết; hai thiết bị
// khác quốc gia ⇒ từ chối; QR dùng một lần; CSDL chỉ chứa băm; vé đổi được đúng MỘT lần.
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.RATE_LIMIT_STORE = 'memory'
process.env.RATE_LIMIT_SENSITIVE_MAX = '1000'
delete process.env.INTERNAL_API_TOKEN

export {}

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { app } = require('../src/index')

const stamp = Date.now()
const U = `test-xd-${stamp}`
const VN = {
  'cf-ipcountry': 'VN',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
}
const US = {
  'cf-ipcountry': 'US',
  'user-agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/131.0 Mobile',
}

let uId: string
const asUser = async () => ({
  Authorization: `Bearer ${await signIdentity({ sub: U, sv: 0 }, process.env.INTERNAL_IDENTITY_SECRET)}`,
})
const post = (path: string, body: object, headers: object = VN) =>
  request(app).post(`/api/identity/xd/${path}`).set(headers).send(body)

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { username: U } })
  const u = await prisma.user.create({
    data: { username: U, email: `${U}@tsudev.local`, role: 'MEMBER', displayName: 'Người thử' },
  })
  uId = u.id
})

afterAll(async () => {
  await prisma.oidcPayload.deleteMany({ where: { type: 'XdSession' } })
  await prisma.user.deleteMany({ where: { username: U } })
  await prisma.$disconnect()
})

/** Đ2 tới bước có mã khớp. */
async function pullToCode(requester = VN) {
  const c = await post('create-pull', {}, requester)
  expect(c.status).toBe(200)
  const auth = await asUser()
  const s = await post('scan', { id: c.body.id, k: c.body.k }, { ...VN, ...auth })
  expect(s.status).toBe(200)
  const a = await post('approve', { id: c.body.id }, { ...VN, ...auth })
  return { c, s, a, auth }
}

test('Đ2 trọn vẹn: tạo ⇒ quét ⇒ cho phép ⇒ gõ mã ⇒ vé ⇒ đổi vé đúng một lần', async () => {
  const { c, s, a } = await pullToCode()
  expect(s.body.requester).toEqual({ label: expect.any(String), country: 'VN' })
  expect(a.status).toBe(200)
  expect(a.body.code).toMatch(/^[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/)

  const st = await post('status', { id: c.body.id, poll: c.body.poll })
  expect(st.body).toEqual({ state: 'awaiting_code' })

  const v = await post('verify', {
    id: c.body.id,
    poll: c.body.poll,
    code: a.body.code.toLowerCase(),
  })
  expect(v.status).toBe(200)
  const r1 = await post('redeem', { ticket: v.body.ticket })
  expect(r1.status).toBe(200)
  expect(r1.body.id).toBe(uId)
  const r2 = await post('redeem', { ticket: v.body.ticket })
  expect(r2.status).toBe(401)
})

test('Đ1 trọn vẹn: tạo ⇒ claim ⇒ cho phép ⇒ thiết bị mới thấy email che ⇒ gõ mã', async () => {
  const auth = await asUser()
  const c = await post('create-push', {}, { ...VN, ...auth })
  expect(c.status).toBe(200)
  expect(c.body.poll).toBeUndefined()
  const cl = await post('claim', { id: c.body.id, k: c.body.k })
  expect(cl.status).toBe(200)
  const pk = await post('peek', { id: c.body.id }, { ...VN, ...auth })
  expect(pk.body.state).toBe('scanned')
  const a = await post('approve', { id: c.body.id }, { ...VN, ...auth })
  const st = await post('status', { id: c.body.id, poll: cl.body.poll })
  expect(st.body.state).toBe('awaiting_code')
  expect(st.body.account.email).toMatch(/^te\*\*\*@tsudev\.local$/)
  const v = await post('verify', { id: c.body.id, poll: cl.body.poll, code: a.body.code })
  expect(v.status).toBe(200)
})

test('sai mã 3 lần ⇒ phiên chết, mã đúng sau đó cũng bị từ chối', async () => {
  const { c, a } = await pullToCode()
  const wrong = a.body.code === 'AAAA-AAAA' ? 'BBBB-BBBB' : 'AAAA-AAAA'
  const v1 = await post('verify', { id: c.body.id, poll: c.body.poll, code: wrong })
  expect([v1.status, v1.body]).toEqual([401, { error: 'wrong_code', attemptsLeft: 2 }])
  await post('verify', { id: c.body.id, poll: c.body.poll, code: wrong })
  const v3 = await post('verify', { id: c.body.id, poll: c.body.poll, code: wrong })
  expect(v3.status).toBe(410)
  const ok = await post('verify', { id: c.body.id, poll: c.body.poll, code: a.body.code })
  expect(ok.status).toBe(409)
})

test('hai thiết bị khác quốc gia ⇒ không sinh mã (T1)', async () => {
  const c = await post('create-pull', {}, US)
  const auth = await asUser()
  await post('scan', { id: c.body.id, k: c.body.k }, { ...VN, ...auth })
  const a = await post('approve', { id: c.body.id }, { ...VN, ...auth })
  expect([a.status, a.body.error]).toEqual([403, 'country_mismatch'])
  const st = await post('status', { id: c.body.id, poll: c.body.poll }, US)
  expect(st.body.state).toBe('dead')
})

test('QR dùng một lần: thiết bị thứ hai quét cùng QR ⇒ từ chối', async () => {
  const c = await post('create-pull', {})
  const auth = await asUser()
  const s1 = await post('scan', { id: c.body.id, k: c.body.k }, { ...VN, ...auth })
  const s2 = await post('scan', { id: c.body.id, k: c.body.k }, { ...VN, ...auth })
  expect([s1.status, s2.status]).toEqual([200, 410])
})

test('bí mật sai ⇒ 404 không phân biệt (không dò được phiên)', async () => {
  const c = await post('create-pull', {})
  const auth = await asUser()
  expect((await post('scan', { id: c.body.id, k: 'sai' }, { ...VN, ...auth })).status).toBe(404)
  expect((await post('status', { id: c.body.id, poll: 'sai' })).status).toBe(404)
  expect((await post('status', { id: 'khong-ton-tai-0000000', poll: 'x' })).status).toBe(404)
})

test('thiết bị xác nhận phải đăng nhập; người khác không cho phép hộ được', async () => {
  const c = await post('create-pull', {})
  expect((await post('scan', { id: c.body.id, k: c.body.k })).status).toBe(401)
  const auth = await asUser()
  await post('scan', { id: c.body.id, k: c.body.k }, { ...VN, ...auth })
  const other = await prisma.user.create({
    data: { username: `${U}-b`, email: `${U}-b@tsudev.local`, role: 'MEMBER' },
  })
  const otherAuth = {
    Authorization: `Bearer ${await signIdentity({ sub: other.username, sv: 0 }, process.env.INTERNAL_IDENTITY_SECRET)}`,
  }
  expect((await post('approve', { id: c.body.id }, { ...VN, ...otherAuth })).status).toBe(404)
  await prisma.user.delete({ where: { id: other.id } })
})

test('CSDL chỉ chứa băm: không có k, poll, mã khớp hay vé dạng rõ', async () => {
  const { c, a } = await pullToCode()
  const row = await prisma.oidcPayload.findUnique({
    where: { type_id: { type: 'XdSession', id: c.body.id } },
  })
  const dump = JSON.stringify(row?.payload)
  for (const secret of [c.body.k, c.body.poll, a.body.code, a.body.code.replace('-', '')]) {
    expect(dump).not.toContain(secret)
  }
})

test('hai lệnh verify đúng mã song song ⇒ đúng một vé', async () => {
  const { c, a } = await pullToCode()
  const both = await Promise.all([
    post('verify', { id: c.body.id, poll: c.body.poll, code: a.body.code }),
    post('verify', { id: c.body.id, poll: c.body.poll, code: a.body.code }),
  ])
  expect(both.map((r: { status: number }) => r.status).sort()).toEqual([200, 409])
})

test('từ chối trên thiết bị xác nhận ⇒ thiết bị mới thấy dead', async () => {
  const c = await post('create-pull', {})
  const auth = await asUser()
  await post('scan', { id: c.body.id, k: c.body.k }, { ...VN, ...auth })
  await post('deny', { id: c.body.id }, { ...VN, ...auth })
  expect((await post('status', { id: c.body.id, poll: c.body.poll })).body.state).toBe('dead')
})
