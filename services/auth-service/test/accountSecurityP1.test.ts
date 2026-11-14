// P1 bảo mật tài khoản (docs/de-xuat-bao-mat-cms-cai-bang-lenh.md):
//   P1.1 `security/posture` trả SỰ KIỆN THÔ, "chưa kiểm HIBP" ≠ "sạch".
//   P1.3 tài khoản CÓ TOTP ⇒ đổi email / đổi mật khẩu / tắt TOTP / xoá passkey /
//        tạo lại mã dự phòng thiếu step-up ⇒ 401 STEP_UP_REQUIRED; tài khoản
//        CHƯA có TOTP vẫn làm được bằng mật khẩu hiện tại (không tự khoá mình).
//   P1.5 `revoke-sessions`: token SESSION_REVOKE dùng MỘT lần ⇒ sessionVersion++.
// Giữ tệp là MODULE: không có dòng này thì hằng của tệp đụng tên với stepUp.test.ts.
export {}

process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.TOTP_ENCRYPTION_KEY = 'khoa-ma-hoa-totp-du-dai-cho-test-0123456789'
process.env.RATE_LIMIT_STORE = 'memory'
process.env.RATE_LIMIT_SENSITIVE_MAX = '1000'
delete process.env.INTERNAL_API_TOKEN

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { STEP_UP_REQUIRED } = require('@tsudev/auth')
const { app } = require('../src/index')
const { encryptSecret, generateSecret, totpCode } = require('../src/totp')
const { hashPassword } = require('../src/password')
const { issueToken } = require('../src/tokens')

const USER = 'test-p1-user'
const SECRET_IDENTITY = process.env.INTERNAL_IDENTITY_SECRET as string
const TOTP = generateSecret()
const PW = 'mat-khau-hien-tai-cua-test-p1'

let userId = ''
const asUser = async () => ({
  Authorization: `Bearer ${await signIdentity({ sub: USER }, SECRET_IDENTITY)}`,
})
const post = async (path: string, body: Record<string, unknown> = {}) =>
  request(app)
    .post(`/api/identity/${path}`)
    .set(await asUser())
    .send(body)
const enableTotp = () =>
  prisma.totpCredential.create({
    data: { userId, secretEnc: encryptSecret(TOTP), confirmedAt: new Date() },
  })
const getStepUp = async () => (await post('step-up', { code: totpCode(TOTP) })).body.token

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { username: USER } })
})

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { username: USER } })
  const u = await prisma.user.create({
    data: {
      username: USER,
      email: `${USER}@tsudev.local`,
      displayName: USER,
      passwordHash: await hashPassword(PW),
      emailVerifiedAt: new Date(),
    },
  })
  userId = u.id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: USER } })
  await prisma.$disconnect()
})

describe('P1.1 security/posture', () => {
  test('chưa kiểm HIBP ⇒ breached null (chưa rõ), không phải false', async () => {
    const res = await post('security/posture')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      emailVerified: true,
      totp: false,
      passkeys: 0,
      backupCodesRemaining: null,
      password: { set: true, checkedAt: null, breached: null },
    })
  })

  test('có TOTP + đã kiểm HIBP ⇒ đếm mã dự phòng còn lại, trả kết quả kiểm', async () => {
    await enableTotp()
    await prisma.backupCode.createMany({
      data: [
        { userId, codeHash: 'h1' },
        { userId, codeHash: 'h2', usedAt: new Date() },
      ],
    })
    await prisma.user.update({
      where: { id: userId },
      data: { passwordCheckedAt: new Date(), passwordBreached: true },
    })
    const res = await post('security/posture')
    expect(res.body.totp).toBe(true)
    expect(res.body.backupCodesRemaining).toBe(1)
    expect(res.body.password.breached).toBe(true)
  })

  test('không đăng nhập ⇒ 401', async () => {
    const res = await request(app).post('/api/identity/security/posture').send({})
    expect(res.status).toBe(401)
  })
})

describe('P1.3 step-up khi tài khoản có TOTP', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['email/change', { password: PW, newEmail: 'moi-p1@tsudev.local' }],
    ['password/change', { currentPassword: PW, newPassword: 'mat-khau-moi-du-dai-p1-2026' }],
    ['totp/disable', { password: PW }],
    ['passkey/delete', { id: 'khong-co' }],
    ['totp/backup-codes', {}],
  ]

  test.each(cases)('%s thiếu step-up ⇒ 401 STEP_UP_REQUIRED', async (path, body) => {
    await enableTotp()
    const res = await post(path, body)
    expect(res.status).toBe(401)
    expect(res.body.code).toBe(STEP_UP_REQUIRED)
  })

  test.each(cases.filter(([p]) => p !== 'totp/backup-codes'))(
    '%s CHƯA có TOTP ⇒ không đòi step-up',
    async (path, body) => {
      const res = await post(path, body)
      expect(res.body.code).not.toBe(STEP_UP_REQUIRED)
    }
  )

  test('totp/disable có step-up + mật khẩu ⇒ tắt được', async () => {
    await enableTotp()
    const res = await post('totp/disable', { password: PW, stepUp: await getStepUp() })
    expect(res.status).toBe(200)
    expect(await prisma.totpCredential.count({ where: { userId } })).toBe(0)
  })

  test('totp/backup-codes: chưa có TOTP ⇒ 409; có step-up ⇒ bộ mới, bộ cũ hết', async () => {
    expect((await post('totp/backup-codes')).status).toBe(409)
    await enableTotp()
    await prisma.backupCode.create({ data: { userId, codeHash: 'cu' } })
    const res = await post('totp/backup-codes', { stepUp: await getStepUp() })
    expect(res.status).toBe(200)
    expect(res.body.backupCodes.length).toBeGreaterThan(0)
    expect(await prisma.backupCode.count({ where: { userId, codeHash: 'cu' } })).toBe(0)
    expect(await prisma.backupCode.count({ where: { userId } })).toBe(res.body.backupCodes.length)
  })
})

describe('P1.5 revoke-sessions ("Không phải tôi")', () => {
  test('token đúng ⇒ sessionVersion tăng; dùng lần hai ⇒ 400', async () => {
    const before = (await prisma.user.findUnique({ where: { id: userId } })).sessionVersion
    const { raw } = await issueToken(userId, 'SESSION_REVOKE')
    const ok = await request(app).post('/api/identity/revoke-sessions').send({ token: raw })
    expect(ok.status).toBe(200)
    const after = (await prisma.user.findUnique({ where: { id: userId } })).sessionVersion
    expect(after).toBe(before + 1)
    const again = await request(app).post('/api/identity/revoke-sessions').send({ token: raw })
    expect(again.status).toBe(400)
  })

  test('token của mục đích khác (đặt lại mật khẩu) ⇒ 400, không thu hồi', async () => {
    const { raw } = await issueToken(userId, 'PASSWORD_RESET')
    const res = await request(app).post('/api/identity/revoke-sessions').send({ token: raw })
    expect(res.status).toBe(400)
  })
})
