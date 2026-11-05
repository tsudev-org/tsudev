// Ép 2FA cho bề mặt quản trị của content-service (G6, docs/security-plan.md).
//
// auth.test.ts đã kiểm cổng trên MỘT route đại diện. Tệp này khoá ba luật mà
// một route đại diện không khoá được:
//
//   1. MỌI route dưới /api/admin - kể cả route thêm SAU này - đều chặn ADMIN
//      chưa có 2FA bằng 403 MFA_REQUIRED. Danh sách route đọc từ CHÍNH router
//      của Express, không gõ tay: route mới quên gọi requireAdmin() thì đỏ ở đây.
//   2. OWNER cũng bị ép (requireAdmin là "ADMIN trở lên"); MODERATOR/AUTHOR giữ
//      nguyên hành vi cũ (403 không mã ở /api/admin, đường /api/author vẫn mở).
//   3. Thứ tự cổng: phiên bị thu hồi (sessionVersion) bị chặn 401 TRƯỚC bước
//      kiểm 2FA - kẻ giữ phiên đã bị đá ra không được biết tài khoản có 2FA không.
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
delete process.env.INTERNAL_API_TOKEN

const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { app } = require('../src/index')

const P = 'test-mfagate-'
const ADMIN = `${P}admin`
const OWNER = `${P}owner`
const MODERATOR = `${P}moderator`
const AUTHOR = `${P}author`

const asUser = async (sub: string, sv?: number) => ({
  Authorization: `Bearer ${await signIdentity({ sub, sv }, process.env.INTERNAL_IDENTITY_SECRET)}`,
})

type Layer = { route?: { path: string | string[]; methods: Record<string, boolean> } }

/** [METHOD, path] của mọi route dưới /api/admin, đọc từ router của Express. */
const adminRoutes = (): [string, string][] =>
  ((app._router?.stack ?? []) as Layer[])
    .filter((l) => l.route)
    .flatMap((l) => {
      const paths = Array.isArray(l.route!.path) ? l.route!.path : [l.route!.path]
      const methods = Object.keys(l.route!.methods).filter((m) => m !== '_all')
      return paths.flatMap((p) => methods.map((m): [string, string] => [m.toUpperCase(), p]))
    })
    .filter(([, p]) => p === '/api/admin' || p.startsWith('/api/admin/'))

/** Thay tham số đường dẫn bằng giá trị giả - cổng phải chặn trước khi tra gì. */
const concrete = (p: string) => p.replace(/:([A-Za-z_]+)/g, 'mfa-gate-khong-ton-tai')

const send = async (method: string, p: string, headers: Record<string, string>) => {
  const call = request(app)[method.toLowerCase()]
  return call(concrete(p))
    .set(headers)
    .send({ slug: 'mfa-gate-khong-ton-tai', name: 'X', summary: 'Y' })
}

const mkUser = (username: string, role: string) =>
  prisma.user.create({
    data: { username, email: `${username}@tsudev.local`, displayName: username, role },
  })

const ids: Record<string, string> = {}
const idOf = (u: string): string => ids[u] as string

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { username: { startsWith: P } } })
  const roster: [string, string][] = [
    [ADMIN, 'ADMIN'],
    [OWNER, 'OWNER'],
    [MODERATOR, 'MODERATOR'],
    [AUTHOR, 'AUTHOR'],
  ]
  for (const [u, r] of roster) {
    ids[u] = (await mkUser(u, r)).id
  }
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: { startsWith: P } } })
  await prisma.$disconnect()
})

describe('mọi route /api/admin đi qua cổng ép 2FA', () => {
  // Chặn trường hợp router đổi cấu trúc và danh sách rỗng: test.each trên mảng
  // rỗng thì "xanh" mà không kiểm gì. 13 route admin ở thời điểm viết.
  test('liệt kê được route quản trị từ router', () => {
    expect(adminRoutes().length).toBeGreaterThanOrEqual(13)
  })

  test.each(adminRoutes())('%s %s: ADMIN không 2FA ⇒ 403 MFA_REQUIRED', async (method, p) => {
    const res = await send(method, p, await asUser(ADMIN))
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('MFA_REQUIRED')
  })

  test.each(adminRoutes())('%s %s: OWNER không 2FA ⇒ 403 MFA_REQUIRED', async (method, p) => {
    const res = await send(method, p, await asUser(OWNER))
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('MFA_REQUIRED')
  })

  test.each(adminRoutes())('%s %s: MODERATOR ⇒ 403 cũ, không mã MFA', async (method, p) => {
    const res = await send(method, p, await asUser(MODERATOR))
    expect(res.status).toBe(403)
    expect(res.body.code).toBeUndefined()
  })

  // Lưới thứ hai, quét NGUỒN: router Express chỉ thấy route đăng ký trên `app`.
  // Một Router con gắn bằng app.use('/api/admin…') sẽ lọt khỏi danh sách trên -
  // cấm hẳn kiểu gắn đó để mọi route quản trị luôn hiện ra ở router gốc.
  test('không route quản trị nào gắn qua app.use/Router con', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8')
    expect(src).not.toMatch(/\.use\(\s*['"`]\/api\/admin/)
  })

  test('requireAdmin kiểm 2FA SAU bước kiểm vai trò', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8')
    const start = src.indexOf('async function requireAdmin(')
    expect(start).toBeGreaterThan(-1)
    const body = src.slice(start, src.indexOf('\n}\n', start))
    const role = body.indexOf("hasAtLeastRole(user.role, 'ADMIN')")
    const mfa = body.indexOf('requireSecondFactor(user, res)')
    expect(role).toBeGreaterThan(-1)
    expect(mfa).toBeGreaterThan(role)
  })
})

describe('OWNER bị ép như ADMIN', () => {
  test('OWNER có TOTP đã xác nhận ⇒ 200', async () => {
    await prisma.totpCredential.create({
      data: { userId: idOf(OWNER), secretEnc: 'test', confirmedAt: new Date() },
    })
    const res = await request(app)
      .get('/api/admin/projects')
      .set(await asUser(OWNER))
    expect(res.status).toBe(200)
  })

  test('OWNER chỉ có passkey ⇒ 403 MFA_REQUIRED', async () => {
    // Passkey KHÔNG đạt cổng: đăng nhập mật khẩu chỉ đòi bước hai khi có TOTP
    // đã xác nhận, nên tài khoản chỉ có passkey vẫn vào được bằng mật khẩu đơn
    // thuần. Tính passkey ở đây = mật khẩu lộ là vào được khu quản trị. Fail
    // closed cho tới khi phiên ghi được amr (step-up B3).
    await prisma.webAuthnCredential.create({
      data: { userId: idOf(OWNER), credentialId: `${P}cred-${Date.now()}`, publicKey: 'x' },
    })
    const res = await request(app)
      .get('/api/admin/projects')
      .set(await asUser(OWNER))
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('MFA_REQUIRED')
    expect(res.body.error).toMatch(/TOTP/)
  })
})

describe('vai trò dưới ADMIN không đổi hành vi', () => {
  test('AUTHOR ở /api/admin ⇒ 403 cũ, không mã MFA', async () => {
    const res = await request(app)
      .get('/api/admin/projects')
      .set(await asUser(AUTHOR))
    expect(res.status).toBe(403)
    expect(res.body.code).toBeUndefined()
  })

  test('AUTHOR không 2FA vẫn đọc được bài của mình ở /api/author', async () => {
    const res = await request(app)
      .get('/api/author/posts')
      .set(await asUser(AUTHOR))
    expect(res.status).toBe(200)
  })

  test('chưa đăng nhập ở /api/admin ⇒ 401, không mã MFA', async () => {
    const res = await request(app).get('/api/admin/projects')
    expect(res.status).toBe(401)
    expect(res.body.code).toBeUndefined()
  })
})

describe('thứ tự cổng: thu hồi phiên chặn TRƯỚC kiểm 2FA', () => {
  const revoke = (username: string) =>
    prisma.user.update({ where: { username }, data: { sessionVersion: { increment: 1 } } })

  test('ADMIN không 2FA, phiên đã thu hồi ⇒ 401, không lộ MFA_REQUIRED, không tra 2FA', async () => {
    await revoke(ADMIN)
    const spy = jest.spyOn(prisma.totpCredential, 'findFirst')
    try {
      const res = await request(app)
        .get('/api/admin/projects')
        .set(await asUser(ADMIN, 0))
      expect(res.status).toBe(401)
      expect(res.body.code).toBeUndefined()
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  test('OWNER CÓ 2FA, phiên đã thu hồi ⇒ vẫn 401 (2FA không cứu phiên cũ)', async () => {
    await prisma.totpCredential.create({
      data: { userId: idOf(OWNER), secretEnc: 'test', confirmedAt: new Date() },
    })
    await revoke(OWNER)
    const res = await request(app)
      .post('/api/admin/projects')
      .set(await asUser(OWNER, 0))
      .send({ slug: `${P}khong-duoc`, name: 'X', summary: 'Y' })
    expect(res.status).toBe(401)
  })

  test('cùng OWNER, phiên HIỆN HÀNH ⇒ 200 (đối chứng)', async () => {
    await prisma.totpCredential.create({
      data: { userId: idOf(OWNER), secretEnc: 'test', confirmedAt: new Date() },
    })
    const u = await revoke(OWNER)
    const res = await request(app)
      .get('/api/admin/projects')
      .set(await asUser(OWNER, u.sessionVersion))
    expect(res.status).toBe(200)
  })
})

export {}
