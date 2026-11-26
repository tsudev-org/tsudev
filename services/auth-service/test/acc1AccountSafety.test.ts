// ACC1 (26/11/2026) - đường tạo / liên kết tài khoản.
//
// Bất biến:
//   (1) oauth/upsert KHÔNG tự liên kết vào tài khoản vai trò >= AUTHOR, hoặc đã bật TOTP /
//       passkey ⇒ 409 oauth_link_required, không tạo OAuthAccount. MEMBER trần vẫn tự liên kết.
//   (2) Email khác chuỗi nhưng CÙNG hộp Gmail (dấu chấm, +nhãn, googlemail.com) ⇒ 409
//       email_taken, không tạo tài khoản thứ hai.
//   (3) oauth/link + oauth/link-check: tài khoản có TOTP phải kèm token step-up còn hạn.
//   (4) canonicalEmail / findEmailOwnerId đúng quy tắc, domain khác Gmail không bị gộp.
//   (5) Seed chỉ chạy trên DB cục bộ.
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
delete process.env.INTERNAL_API_TOKEN

export {}

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { issueStepUp } = require('@tsudev/auth')
const { app } = require('../src/index')
const { canonicalEmail, findEmailOwnerId } = require('../src/emailCanon')
const { assertLocalDatabase } = require('../../../packages/db/prisma/localOnly')

const stamp = Date.now()
const SECRET = process.env.INTERNAL_IDENTITY_SECRET as string
const AUTHOR = `acc1-author-${stamp}`
const TOTPU = `acc1-totp-${stamp}`
const MEMBER = `acc1-member-${stamp}`
const GMAILU = `acc1-gmail-${stamp}`
const GMAIL = `acc1.box${stamp}@gmail.com`
const ALL = [AUTHOR, TOTPU, MEMBER, GMAILU]

const upsert = (body: Record<string, unknown>) =>
  request(app).post('/api/identity/oauth/upsert').send(body)
const asUser = async (who: string, path: string, body: Record<string, unknown> = {}) =>
  request(app)
    .post(`/api/identity/oauth/${path}`)
    .set({ Authorization: `Bearer ${await signIdentity({ sub: who }, SECRET)}` })
    .send(body)

const ids: Record<string, string> = {}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { username: { in: ALL } } })
  const mk = async (username: string, email: string, role: string) =>
    (ids[username] = (await prisma.user.create({ data: { username, email, role } })).id)
  await mk(AUTHOR, `${AUTHOR}@example.com`, 'AUTHOR')
  await mk(TOTPU, `${TOTPU}@example.com`, 'MEMBER')
  await mk(MEMBER, `${MEMBER}@example.com`, 'MEMBER')
  await mk(GMAILU, GMAIL, 'MEMBER')
  await prisma.totpCredential.create({
    data: {
      userId: ids[TOTPU]!,
      secretEnc: 'khong-giai-ma-trong-test-nay',
      confirmedAt: new Date(),
    },
  })
})

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { OR: [{ username: { in: ALL } }, { email: { startsWith: `acc1` } }] },
  })
  await prisma.$disconnect()
})

describe('(1) chặn tự liên kết vào tài khoản đáng giá', () => {
  test.each([
    ['AUTHOR', AUTHOR],
    ['MEMBER có TOTP', TOTPU],
  ])('%s + email đã xác minh ⇒ 409 oauth_link_required, không có OAuthAccount', async (_, who) => {
    const pid = `acc1-goo-${who}`
    const res = await upsert({
      provider: 'google',
      providerAccountId: pid,
      email: `${who}@example.com`,
      emailVerified: true,
    })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('oauth_link_required')
    expect(await prisma.oAuthAccount.count({ where: { providerAccountId: pid } })).toBe(0)
    const ev = await prisma.securityEvent.count({
      where: { userId: ids[who]!, type: 'oauth_autolink_blocked' },
    })
    expect(ev).toBe(1)
  })

  test('MEMBER không 2FA/passkey ⇒ vẫn tự liên kết như trước', async () => {
    const res = await upsert({
      provider: 'github',
      providerAccountId: `acc1-gh-${stamp}`,
      email: `${MEMBER}@example.com`,
      emailVerified: true,
    })
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(ids[MEMBER])
  })
})

describe('(2) cùng hộp Gmail', () => {
  test.each([
    GMAIL.replace(/\./g, '').replace('gmailcom', 'gmail.com'),
    GMAIL.replace('@', '+nhan@'),
    GMAIL.replace('gmail.com', 'googlemail.com'),
    GMAIL.toUpperCase(),
  ])('%s ⇒ 409 email_taken, không tạo tài khoản', async (email) => {
    const before = await prisma.user.count()
    const res = await upsert({
      provider: 'google',
      providerAccountId: `acc1-alias-${email}`,
      email,
      emailVerified: true,
    })
    // Chữ hoa = CÙNG chuỗi sau khi hạ chữ thường ⇒ đi nhánh khớp chính xác (MEMBER trần ⇒ 200).
    if (email === GMAIL.toUpperCase()) {
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(ids[GMAILU])
    } else {
      expect(res.status).toBe(409)
      expect(res.body.error).toBe('email_taken')
      expect(await prisma.user.count()).toBe(before)
    }
  })
})

describe('(3) step-up cho liên kết khi đã đăng nhập', () => {
  test('link-check: không TOTP ⇒ 200; có TOTP thiếu token ⇒ 401 STEP_UP_REQUIRED', async () => {
    expect((await asUser(MEMBER, 'link-check')).status).toBe(200)
    const r = await asUser(TOTPU, 'link-check')
    expect(r.status).toBe(401)
    expect(r.body.code).toBe('STEP_UP_REQUIRED')
  })

  test('link: có TOTP thiếu token ⇒ 401, không tạo; token hợp lệ ⇒ 200', async () => {
    const pid = `acc1-link-${stamp}`
    const no = await asUser(TOTPU, 'link', { provider: 'github', providerAccountId: pid })
    expect(no.status).toBe(401)
    expect(await prisma.oAuthAccount.count({ where: { providerAccountId: pid } })).toBe(0)
    const u = await prisma.user.findUnique({ where: { id: ids[TOTPU]! } })
    const { token } = issueStepUp(u, SECRET)
    const ok = await asUser(TOTPU, 'link', {
      provider: 'github',
      providerAccountId: pid,
      stepUp: token,
    })
    expect(ok.status).toBe(200)
  })

  test('link-check không khẳng định danh tính ⇒ 401', async () => {
    expect((await request(app).post('/api/identity/oauth/link-check').send({})).status).toBe(401)
  })
})

describe('(4) chuẩn hoá email', () => {
  test('canonicalEmail', () => {
    expect(canonicalEmail('Dev.Nguyen+abc@GoogleMail.com')).toBe('devnguyen@gmail.com')
    expect(canonicalEmail('a.b+c@example.com')).toBe('a.b+c@example.com')
  })
  test('findEmailOwnerId: chính xác vs cùng hộp; domain khác không gộp', async () => {
    expect(await findEmailOwnerId(GMAIL)).toEqual({ id: ids[GMAILU], exact: true })
    expect(await findEmailOwnerId(GMAIL.replace('@', '+x@'))).toEqual({
      id: ids[GMAILU],
      exact: false,
    })
    expect(await findEmailOwnerId(`${MEMBER.replace(/-/g, '.')}@example.com`)).toBeNull()
  })
})

describe('(5) seed chỉ DB cục bộ', () => {
  test.each([
    [{ DATABASE_URL: 'postgresql://u:p@ep-x.neon.tech/db' }, /TỪ CHỐI/],
    [{ DATABASE_URL: 'postgresql://u@localhost/db', NODE_ENV: 'production' }, /production/],
    [{ DATABASE_URL: 'khong-phai-url' }, /TỪ CHỐI/],
  ])('%o ⇒ ném', (env, re) => {
    expect(() => assertLocalDatabase('seed', env)).toThrow(re)
  })
  test('localhost / 127.0.0.1 ⇒ qua', () => {
    expect(() =>
      assertLocalDatabase('seed', { DATABASE_URL: 'postgresql://u@localhost/d' })
    ).not.toThrow()
    expect(() =>
      assertLocalDatabase('seed', { DATABASE_URL: 'postgresql://u@127.0.0.1/d' })
    ).not.toThrow()
  })
  test('seed.js gọi chốt TRƯỚC khi nạp Prisma, không chứa email thật', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../../../packages/db/prisma/seed.js'),
      'utf8'
    )
    expect(src.indexOf('assertLocalDatabase')).toBeGreaterThan(-1)
    expect(src.indexOf('assertLocalDatabase')).toBeLessThan(src.indexOf("require('../src/index')"))
    expect(src).not.toMatch(/@gmail\.com/)
  })
})

describe('rà đường tạo tài khoản', () => {
  // Thêm một `prisma.user.create(` mới ở mã chạy production ⇒ đỏ: chỗ đó phải đi qua bảng ở
  // phiếu ACC1 mục 2 (vai trò cố định, kiểm trùng email chuẩn hoá) rồi mới được thêm vào đây.
  test('prisma.user.create chỉ ở register, oauth/upsert, useradmin/create', () => {
    const fs = require('fs')
    const path = require('path')
    const src = path.join(__dirname, '../src')
    const hits: string[] = []
    for (const f of fs.readdirSync(src)) {
      if (!f.endsWith('.ts')) continue
      const n = (fs.readFileSync(path.join(src, f), 'utf8').match(/prisma\.user\.create\(/g) || [])
        .length
      if (n) hits.push(`${f}:${n}`)
    }
    expect(hits).toEqual(['index.ts:3'])
    const idx = fs.readFileSync(path.join(src, 'index.ts'), 'utf8') as string
    const before = (marker: string) => {
      const at = idx.indexOf(marker)
      const next = idx.indexOf('prisma.user.create(', at)
      return idx.slice(at, next).includes('findEmailOwnerId')
    }
    expect(before("'/api/identity/register',\n  asyncHandler")).toBe(true)
    expect(before("'/api/identity/oauth/upsert'")).toBe(true)
    expect(before('useradmin/create')).toBe(true)
  })
})
