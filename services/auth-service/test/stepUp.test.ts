// Xác thực lại (step-up, G7): `POST /api/identity/step-up` đổi một mã TOTP đúng
// lấy token sống 5 phút mà content-service kiểm cho thu hồi/khôi phục/ký lại.
//
// Canh: chỉ TOTP ĐÃ XÁC NHẬN; mã sai không phát token và để lại dấu vết; token
// buộc đúng người + sessionVersion; route nằm trong tầng giới hạn chặt.
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.TOTP_ENCRYPTION_KEY = 'khoa-ma-hoa-totp-du-dai-cho-test-0123456789'
delete process.env.INTERNAL_API_TOKEN

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { verifyStepUp, STEP_UP_TTL_SECONDS } = require('@tsudev/auth')
const { app } = require('../src/index')
const { encryptSecret, generateSecret, totpCode } = require('../src/totp')

const USER = 'test-stepup-user'
const SECRET_IDENTITY = process.env.INTERNAL_IDENTITY_SECRET as string
const TOTP = generateSecret()

let userId = ''
const asUser = async () => ({
  Authorization: `Bearer ${await signIdentity({ sub: USER }, SECRET_IDENTITY)}`,
})
const stepUp = async (code: string) =>
  request(app)
    .post('/api/identity/step-up')
    .set(await asUser())
    .send({ code })

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { username: USER } })
  const u = await prisma.user.create({
    data: { username: USER, email: `${USER}@tsudev.local`, displayName: USER, role: 'ADMIN' },
  })
  userId = u.id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: USER } })
  await prisma.$disconnect()
})

test('không đăng nhập ⇒ 401', async () => {
  const res = await request(app).post('/api/identity/step-up').send({ code: '123456' })
  expect(res.status).toBe(401)
})

test('chưa bật TOTP, hoặc TOTP chưa xác nhận ⇒ 403 totp_not_enabled', async () => {
  expect((await stepUp('123456')).body.error).toBe('totp_not_enabled')
  await prisma.totpCredential.create({
    data: { userId, secretEnc: encryptSecret(TOTP), confirmedAt: null },
  })
  const res = await stepUp(totpCode(TOTP))
  expect(res.status).toBe(403)
})

test('mã sai ⇒ 401, không có token, ghi step_up_failed', async () => {
  await prisma.totpCredential.create({
    data: { userId, secretEnc: encryptSecret(TOTP), confirmedAt: new Date() },
  })
  const sai = totpCode(TOTP) === '000000' ? '111111' : '000000'
  const res = await stepUp(sai)
  expect(res.status).toBe(401)
  expect(res.body.token).toBeUndefined()
  // logSecurity là fire-and-forget: đợi nó chạm DB.
  await new Promise((r) => setTimeout(r, 200))
  const ev = await prisma.securityEvent.findMany({ where: { userId, type: 'step_up_failed' } })
  expect(ev).toHaveLength(1)
})

test('mã đúng ⇒ token hợp lệ cho ĐÚNG người, đúng sessionVersion, sống 5 phút', async () => {
  await prisma.totpCredential.create({
    data: { userId, secretEnc: encryptSecret(TOTP), confirmedAt: new Date() },
  })
  const res = await stepUp(totpCode(TOTP))
  expect(res.status).toBe(200)
  const u = await prisma.user.findUnique({ where: { id: userId } })
  expect(verifyStepUp(res.body.token, u, SECRET_IDENTITY)).toBe(true)
  expect(verifyStepUp(res.body.token, { ...u, id: 'nguoi-khac' }, SECRET_IDENTITY)).toBe(false)
  expect(
    verifyStepUp(res.body.token, { ...u, sessionVersion: u.sessionVersion + 1 }, SECRET_IDENTITY)
  ).toBe(false)
  expect(
    verifyStepUp(res.body.token, u, SECRET_IDENTITY, Date.now() + STEP_UP_TTL_SECONDS * 1000 + 1000)
  ).toBe(false)
  const conLai = new Date(res.body.expiresAt).getTime() - Date.now()
  expect(conLai).toBeGreaterThan((STEP_UP_TTL_SECONDS - 10) * 1000)
  expect(conLai).toBeLessThanOrEqual(STEP_UP_TTL_SECONDS * 1000)
})

test('token step-up KHÔNG dùng được như khẳng định danh tính', async () => {
  await prisma.totpCredential.create({
    data: { userId, secretEnc: encryptSecret(TOTP), confirmedAt: new Date() },
  })
  const { token } = (await stepUp(totpCode(TOTP))).body
  const res = await request(app)
    .get('/api/identity/security/events')
    .set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(401)
})
