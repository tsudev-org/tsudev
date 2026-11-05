// Ranh giới đọc/ghi của content-service.
//
// Bản trước kiểm rằng GET /api/posts đòi vai trò `content:read`. Đó chính là
// thứ khiến REQUIRE_ROLE_ENFORCEMENT không bao giờ bật được: bật lên là blog
// biến mất khỏi site. Cổng đó đã được gỡ - bài viết là nội dung công khai.
//
// Bất biến cần khoá lại nay là: ĐỌC mở, GHI đóng.
//
// Danh tính nay đến từ KHẲNG ĐỊNH CÓ CHỮ KÝ của BFF, không phải header
// `x-dev-user` + cờ AUTH_DEV_BYPASS. Đặt khoá TRƯỚC khi require app.
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
// Không phụ thuộc thứ tự file test: cổng chặn internal-token phải tắt ở đây.
delete process.env.INTERNAL_API_TOKEN

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { app } = require('../src/index')

const MEMBER = 'test-member-content'

/** Header Authorization như BFF sẽ gửi. */
const asUser = async (sub: string, role?: string) => ({
  Authorization: `Bearer ${await signIdentity(
    { sub, role },
    process.env.INTERNAL_IDENTITY_SECRET
  )}`,
})

beforeAll(async () => {
  await prisma.user.upsert({
    where: { username: MEMBER },
    update: { role: 'MEMBER' },
    create: {
      username: MEMBER,
      email: `${MEMBER}@tsudev.local`,
      displayName: MEMBER,
      role: 'MEMBER',
    },
  })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: MEMBER } })
  await prisma.$disconnect()
})

describe('content-service: đọc công khai, ghi cần quản trị', () => {
  test('GET /api/posts mở cho người chưa đăng nhập', async () => {
    const res = await request(app).get('/api/posts')
    expect(res.status).toBe(200)
  })

  test('GET /api/posts không đòi vai trò nào kể cả khi đã đăng nhập', async () => {
    const res = await request(app)
      .get('/api/posts')
      .set(await asUser(MEMBER))
    expect(res.status).toBe(200)
  })

  test('MEMBER không tạo được dự án - đường ghi đòi ADMIN', async () => {
    const res = await request(app)
      .post('/api/admin/projects')
      .set(await asUser(MEMBER))
      .send({ slug: 'khong-duoc-phep', name: 'X', summary: 'Y' })
    expect(res.status).toBe(403)
  })

  // Claim `role` trong khẳng định là THAM KHẢO, không phải nguồn phân quyền:
  // requireAdmin() đọc User.role từ DB. Một khẳng định ký hợp lệ mà khai
  // role=ADMIN vẫn phải bị từ chối nếu DB nói người đó là MEMBER.
  test('claim role trong khẳng định KHÔNG nâng được quyền', async () => {
    const res = await request(app)
      .post('/api/admin/projects')
      .set(await asUser(MEMBER, 'ADMIN'))
      .send({ slug: 'van-khong-duoc-phep', name: 'X', summary: 'Y' })
    expect(res.status).toBe(403)
  })

  // Đường tắt cũ: khai danh tính bằng một dòng chữ. Nay nó không còn nghĩa gì.
  test('header x-dev-user không còn cấp danh tính nào', async () => {
    const res = await request(app)
      .post('/api/admin/projects')
      .set('x-dev-user', 'tsudev')
      .set('x-dev-roles', 'admin,ADMIN')
      .send({ slug: 'header-tran-khong-du', name: 'X', summary: 'Y' })
    expect(res.status).toBe(401)
  })

  test('khẳng định ký bằng khoá khác bị từ chối', async () => {
    const forged = await signIdentity({ sub: MEMBER }, 'khoa-hoan-toan-khac-nhung-van-du-dai!!')
    const res = await request(app)
      .post('/api/admin/projects')
      .set('Authorization', `Bearer ${forged}`)
      .send({ slug: 'chu-ky-gia', name: 'X', summary: 'Y' })
    expect(res.status).toBe(401)
  })
})

// G6 (docs/security-plan.md): ADMIN chưa có TOTP ĐÃ XÁC NHẬN thì
// requireAdmin trả 403 MFA_REQUIRED. Dùng GET /api/admin/projects làm đại diện:
// mọi route /api/admin/* đi qua cùng một requireAdmin.
describe('content-service: ép 2FA cho ADMIN', () => {
  const ADMIN = 'test-admin-mfa-content'
  let adminId = ''

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { username: ADMIN } })
    const u = await prisma.user.create({
      data: { username: ADMIN, email: `${ADMIN}@tsudev.local`, displayName: ADMIN, role: 'ADMIN' },
    })
    adminId = u.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: ADMIN } })
  })

  test('ADMIN không 2FA ⇒ 403 MFA_REQUIRED ở cả đường đọc lẫn ghi', async () => {
    const h = await asUser(ADMIN)
    const doc = await request(app).get('/api/admin/projects').set(h)
    expect(doc.status).toBe(403)
    expect(doc.body.code).toBe('MFA_REQUIRED')
    expect(doc.body.error).toMatch(/settings\/security/)
    const ghi = await request(app)
      .post('/api/admin/projects')
      .set(h)
      .send({ slug: 'test-mfa-khong-duoc', name: 'X', summary: 'Y' })
    expect(ghi.status).toBe(403)
    expect(ghi.body.code).toBe('MFA_REQUIRED')
    const kd = await request(app).get('/api/admin/content?kind=doc').set(h)
    expect(kd.status).toBe(403)
    expect(kd.body.code).toBe('MFA_REQUIRED')
  })

  test('TOTP CHƯA xác nhận ⇒ vẫn 403 MFA_REQUIRED', async () => {
    await prisma.totpCredential.create({ data: { userId: adminId, secretEnc: 'test' } })
    const res = await request(app)
      .get('/api/admin/projects')
      .set(await asUser(ADMIN))
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('MFA_REQUIRED')
  })

  test('TOTP đã xác nhận ⇒ 200', async () => {
    await prisma.totpCredential.create({
      data: { userId: adminId, secretEnc: 'test', confirmedAt: new Date() },
    })
    const res = await request(app)
      .get('/api/admin/projects')
      .set(await asUser(ADMIN))
    expect(res.status).toBe(200)
  })

  test('chỉ có passkey (không TOTP) ⇒ 403 MFA_REQUIRED', async () => {
    // Passkey KHÔNG đạt cổng: đăng nhập mật khẩu chỉ đòi bước hai khi có TOTP
    // đã xác nhận, nên tài khoản chỉ có passkey vẫn vào được bằng mật khẩu đơn
    // thuần. Tính passkey ở đây = mật khẩu lộ là vào được khu quản trị. Fail
    // closed cho tới khi phiên ghi được amr (step-up B3).
    await prisma.webAuthnCredential.create({
      data: { userId: adminId, credentialId: `test-mfa-content-${Date.now()}`, publicKey: 'x' },
    })
    const res = await request(app)
      .get('/api/admin/projects')
      .set(await asUser(ADMIN))
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('MFA_REQUIRED')
  })

  test('MEMBER vẫn nhận 403 cũ, không phải MFA_REQUIRED', async () => {
    const res = await request(app)
      .get('/api/admin/projects')
      .set(await asUser(MEMBER))
    expect(res.status).toBe(403)
    expect(res.body.code).toBeUndefined()
  })

  test('lỗi tra DB khi kiểm 2FA ⇒ từ chối (fail closed), không cho qua', async () => {
    await prisma.totpCredential.create({
      data: { userId: adminId, secretEnc: 'test', confirmedAt: new Date() },
    })
    const spy = jest
      .spyOn(prisma.totpCredential, 'findFirst')
      .mockRejectedValueOnce(new Error('DB sập giả lập'))
    try {
      const res = await request(app)
        .get('/api/admin/projects')
        .set(await asUser(ADMIN))
      expect(spy).toHaveBeenCalled()
      expect(res.status).toBe(503)
    } finally {
      spy.mockRestore()
    }
  })
})

export {}
