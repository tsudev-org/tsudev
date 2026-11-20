// PRO-B bước B3 - mua Pro / ủng hộ bằng VietQR (src/paymentRoutes.ts).
//
// Đây là đường CẤP QUYỀN LỢI CÓ TRẢ TIỀN duy nhất trên web, nên mọi thứ khoá ở đây là
// cách nó hỏng mà site vẫn chạy bình thường:
//  1. Chỉ OWNER (vai trò từ DB) + TOTP xác nhận được; claim role giả không qua.
//  2. Xác nhận hai lần (kể cả song song) ⇒ đúng MỘT sự kiện sổ cái.
//  3. Mã hết hạn/đã từ chối không tự cấp gì; mã trùng/sai dạng bị từ chối.
//  4. Pro cộng dồn từ mốc còn hạn, không mất ngày đã trả.
export {}
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.NEXT_PUBLIC_MAIN_URL ||= 'https://tsudev.test'
delete process.env.INTERNAL_API_TOKEN
// Giới hạn 30/phút/tài khoản đếm trong RAM, test gọi nhiều hơn thế.
process.env.RATE_LIMIT_PAYMENT_MAX = '100000'

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { app } = require('../src/index')
const {
  addMonths,
  extendPro,
  INTENT_TTL_MS,
  MAX_PENDING,
  newCode,
  normalizeCode,
  CODE_RE,
} = require('../src/paymentRoutes')

const OWNER = 'test-pay-owner'
const OWNER_NO_2FA = 'test-pay-owner2'
const MEMBER = 'test-pay-member'

const auth = async (sub: string, extra: Record<string, unknown> = {}) => ({
  Authorization: `Bearer ${await signIdentity({ sub, ...extra }, process.env.INTERNAL_IDENTITY_SECRET)}`,
})
const call = async (path: string, sub: string | null, body: Record<string, unknown> = {}) => {
  const r = request(app).post(`/api/identity/${path}`)
  if (sub) r.set(await auth(sub))
  return r.send(body)
}
const idOf = async (username: string) =>
  (await prisma.user.findUnique({ where: { username } }))!.id as string

const clean = async () => {
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_audit_purge = 'on'`),
    prisma.trustAuditLog.deleteMany({ where: { targetLabel: { startsWith: 'test-pay-' } } }),
  ])
  await prisma.user.deleteMany({ where: { username: { startsWith: 'test-pay-' } } })
}

beforeEach(async () => {
  await clean()
  for (const [username, role, totp] of [
    [OWNER, 'OWNER', true],
    [OWNER_NO_2FA, 'OWNER', false],
    [MEMBER, 'MEMBER', false],
  ] as const) {
    await prisma.user.create({
      data: {
        username,
        email: `${username}@tsudev.local`,
        displayName: username,
        role,
        ...(totp ? { totp: { create: { secretEnc: 'test', confirmedAt: new Date() } } } : {}),
      },
    })
  }
})

afterAll(async () => {
  await clean()
  await prisma.$disconnect()
})

describe('hàm thuần', () => {
  test('mã 8 ký tự Crockford, không I/L/O/U', () => {
    for (let i = 0; i < 200; i++) {
      const c = newCode()
      expect(c).toMatch(CODE_RE)
      expect(c).not.toMatch(/[ILOU]/)
    }
  })

  test('chuẩn hoá mã gõ từ sao kê', () => {
    expect(normalizeCode('TSU ab12cd34')).toBe('AB12CD34')
    expect(normalizeCode('tsu-AB12-CD34')).toBe('AB12CD34')
    expect(normalizeCode('O0IL2345')).toBe('00112345')
    expect(normalizeCode('AB12CD3')).toBeNull()
    expect(normalizeCode('AB12CD3U')).toBeNull()
    expect(normalizeCode(42)).toBeNull()
  })

  test('cộng tháng theo lịch không tràn (31/01 + 1 tháng = 28/02)', () => {
    expect(addMonths(new Date('2027-01-31T10:00:00Z'), 1).toISOString()).toBe(
      '2027-02-28T10:00:00.000Z'
    )
    expect(addMonths(new Date('2026-11-20T00:00:00Z'), 12).toISOString()).toBe(
      '2027-11-20T00:00:00.000Z'
    )
  })

  test('Pro cộng dồn từ mốc còn hạn; hết hạn thì tính từ bây giờ', () => {
    const now = new Date('2026-11-20T00:00:00Z')
    expect(extendPro(new Date('2026-12-10T00:00:00Z'), now, 1).toISOString()).toBe(
      '2027-01-10T00:00:00.000Z'
    )
    expect(extendPro(new Date('2026-10-01T00:00:00Z'), now, 1).toISOString()).toBe(
      '2026-12-20T00:00:00.000Z'
    )
    expect(extendPro(null, now, 12).toISOString()).toBe('2027-11-20T00:00:00.000Z')
  })
})

describe('người dùng tạo ý định', () => {
  test('chưa đăng nhập ⇒ 401; gói lạ ⇒ 400', async () => {
    expect((await call('pay/create', null, { kind: 'pro_year' })).status).toBe(401)
    expect((await call('pay/create', MEMBER, { kind: 'pro_tron_doi' })).status).toBe(400)
    // PRO2 (PRODUCT_POLICY 7.2 v4.0.0): gói tháng đã bỏ - không tạo mới được.
    expect((await call('pay/create', MEMBER, { kind: 'pro_month' })).status).toBe(400)
  }, 20000)

  test('tạo đúng giá + hết hạn 72 giờ; bấm lại cùng gói ⇒ CÙNG mã', async () => {
    const a = await call('pay/create', MEMBER, { kind: 'pro_year', app: 'qulythuchi' })
    expect(a.status).toBe(201)
    expect(a.body).toMatchObject({
      kind: 'pro_year',
      amountVnd: 490000,
      status: 'pending',
      app: 'qulythuchi',
    })
    expect(a.body.code).toMatch(CODE_RE)
    const ttl = Date.parse(a.body.expiresAt) - Date.parse(a.body.createdAt)
    expect(Math.abs(ttl - INTENT_TTL_MS)).toBeLessThan(5000)
    const b = await call('pay/create', MEMBER, { kind: 'pro_year', app: 'qulythuchi' })
    expect(b.status).toBe(200)
    expect(b.body.code).toBe(a.body.code)
    const y = await call('pay/create', MEMBER, { kind: 'donate_50k' })
    expect(y.body.amountVnd).toBe(50000)
    expect(y.body.code).not.toBe(a.body.code)
  }, 20000)

  test('`app` sai dạng bị bỏ qua, không chặn việc mua', async () => {
    const r = await call('pay/create', MEMBER, { kind: 'donate_20k', app: '../evil<script>' })
    expect(r.status).toBe(201)
    expect(r.body.app).toBeNull()
  }, 20000)

  test(`quá ${MAX_PENDING} ý định đang chờ ⇒ 429`, async () => {
    const uid = await idOf(MEMBER)
    for (let i = 0; i < MAX_PENDING; i++) {
      await prisma.paymentIntent.create({
        data: {
          code: `TESTP${i}AA`.slice(0, 8),
          userId: uid,
          kind: 'donate_50k',
          amountVnd: 50000,
          clientId: `app${i}`,
          expiresAt: new Date(Date.now() + INTENT_TTL_MS),
        },
      })
    }
    const r = await call('pay/create', MEMBER, { kind: 'pro_year' })
    expect(r.status).toBe(429)
    expect(r.body.error).toBe('too_many_pending')
  }, 20000)

  test('status: ý định quá hạn tự thành expired; chỉ thấy của chính mình', async () => {
    const uid = await idOf(MEMBER)
    await prisma.paymentIntent.create({
      data: {
        code: 'EXP1RED0',
        userId: uid,
        kind: 'pro_month',
        amountVnd: 49000,
        expiresAt: new Date(Date.now() - 1000),
      },
    })
    const r = await call('pay/status', MEMBER)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      proActive: false,
      donor: false,
      badge: 'none',
      badgeDisplay: 'AUTO',
    })
    expect(r.body.intents).toEqual([
      expect.objectContaining({ code: 'EXP1RED0', status: 'expired' }),
    ])
    const other = await call('pay/status', OWNER)
    expect(other.body.intents).toEqual([])
  }, 20000)

  // Mã 40 bit nên va chạm thật gần như không xảy ra trong test - giả lập lỗi P2002 của Prisma
  // ở lần ghi để khoá vòng thử lại: trùng mã ⇒ thử mã KHÁC; hết 5 lần ⇒ 503 code_collision;
  // lỗi khác ⇒ không nuốt, không thử lại.
  describe('va chạm mã (P2002)', () => {
    const p2002 = () => Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    afterEach(() => jest.restoreAllMocks())

    test('trùng mã hai lần ⇒ thử lại với mã mới, vẫn 201', async () => {
      const real = prisma.paymentIntent.create.bind(prisma.paymentIntent)
      const codes: string[] = []
      let n = 0
      jest.spyOn(prisma.paymentIntent, 'create').mockImplementation(((args: {
        data: { code: string }
      }) => {
        codes.push(args.data.code)
        if (++n <= 2) return Promise.reject(p2002())
        return real(args)
      }) as never)
      const r = await call('pay/create', MEMBER, { kind: 'donate_20k' })
      expect(r.status).toBe(201)
      expect(codes).toHaveLength(3)
      expect(r.body.code).toBe(codes[2])
      for (const c of codes) expect(c).toMatch(CODE_RE)
    }, 20000)

    test('trùng mã cả 5 lần ⇒ 503 code_collision, không để lại ý định nào', async () => {
      const spy = jest
        .spyOn(prisma.paymentIntent, 'create')
        .mockImplementation((() => Promise.reject(p2002())) as never)
      const r = await call('pay/create', MEMBER, { kind: 'pro_year' })
      expect(r.status).toBe(503)
      expect(r.body.error).toBe('code_collision')
      expect(spy).toHaveBeenCalledTimes(5)
      jest.restoreAllMocks()
      expect(await prisma.paymentIntent.count({ where: { userId: await idOf(MEMBER) } })).toBe(0)
    }, 20000)

    test('lỗi KHÁC P2002 ⇒ không thử lại, không trả code_collision', async () => {
      const spy = jest
        .spyOn(prisma.paymentIntent, 'create')
        .mockImplementation((() =>
          Promise.reject(Object.assign(new Error('db down'), { code: 'P1001' }))) as never)
      const r = await call('pay/create', MEMBER, { kind: 'pro_year' })
      expect(r.status).toBeGreaterThanOrEqual(500)
      expect(r.body.error).not.toBe('code_collision')
      expect(spy).toHaveBeenCalledTimes(1)
    }, 20000)
  })
})

describe('OWNER xác nhận', () => {
  const create = async (kind: string) =>
    (await call('pay/create', MEMBER, { kind })).body.code as string

  test('không phải OWNER / OWNER chưa bật TOTP / claim giả ⇒ chặn', async () => {
    const code = await create('pro_year')
    expect((await call('payadmin/confirm', null, { code })).status).toBe(401)
    expect((await call('payadmin/confirm', MEMBER, { code })).status).toBe(403)
    expect((await call('payadmin/list', MEMBER)).status).toBe(403)
    expect((await call('payadmin/confirm', OWNER_NO_2FA, { code })).status).toBe(403)
    const forged = await signIdentity(
      { sub: MEMBER, role: 'OWNER' },
      process.env.INTERNAL_IDENTITY_SECRET
    )
    const r = await request(app)
      .post('/api/identity/payadmin/confirm')
      .set({ Authorization: `Bearer ${forged}` })
      .send({ code })
    expect(r.status).toBe(403)
    expect(await prisma.entitlementEvent.count({ where: { userId: await idOf(MEMBER) } })).toBe(0)
  }, 20000)

  test('xác nhận Pro năm ⇒ Pro 1 năm, nguồn web, actorId = OWNER; lần 2 ⇒ 409, vẫn 1 sự kiện', async () => {
    const code = await create('pro_year')
    const r = await call('payadmin/confirm', OWNER, { code: `TSU ${code.toLowerCase()}` })
    expect(r.status).toBe(200)
    expect(r.body.recorded).toBe(true)
    const again = await call('payadmin/confirm', OWNER, { code })
    expect(again.status).toBe(409)
    expect(again.body.error).toBe('already_confirmed')

    const uid = await idOf(MEMBER)
    const ev = await prisma.entitlementEvent.findMany({ where: { userId: uid } })
    expect(ev).toHaveLength(1)
    expect(ev[0]).toMatchObject({
      kind: 'web.vietqr',
      externalId: code,
      proSource: 'web',
      actorId: await idOf(OWNER),
    })
    const st = (await call('pay/status', MEMBER)).body
    expect(st).toMatchObject({ proActive: true, proSource: 'web', badge: 'pro' })
    const days = (Date.parse(st.proUntil) - Date.now()) / 86400000
    expect(days).toBeGreaterThan(364)
    expect(days).toBeLessThan(367)
  }, 20000)

  test('ý định gói tháng tạo TRƯỚC PRO2 vẫn xác nhận được (đã trả 49.000 ₫ ⇒ 1 tháng)', async () => {
    const uid = await idOf(MEMBER)
    await prisma.paymentIntent.create({
      data: {
        code: 'MNTH0001',
        userId: uid,
        kind: 'pro_month',
        amountVnd: 49000,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    })
    const r = await call('payadmin/confirm', OWNER, { code: 'MNTH0001' })
    expect(r.status).toBe(200)
    const st = (await call('pay/status', MEMBER)).body
    const days = (Date.parse(st.proUntil) - Date.now()) / 86400000
    expect(days).toBeGreaterThan(27)
    expect(days).toBeLessThan(32)
  }, 20000)

  test('gia hạn sớm cộng dồn: max(pro_until, now) + 1 năm', async () => {
    const first = await create('pro_year')
    expect((await call('payadmin/confirm', OWNER, { code: first })).status).toBe(200)
    const a = Date.parse((await call('pay/status', MEMBER)).body.proUntil)
    const second = await create('pro_year')
    expect((await call('payadmin/confirm', OWNER, { code: second })).status).toBe(200)
    const b = Date.parse((await call('pay/status', MEMBER)).body.proUntil)
    expect(new Date(b).toISOString()).toBe(addMonths(new Date(a), 12).toISOString())
  }, 20000)

  test('hai lần xác nhận SONG SONG ⇒ đúng một 200 và một sự kiện', async () => {
    const code = await create('pro_year')
    const rs = await Promise.all([1, 2, 3].map(() => call('payadmin/confirm', OWNER, { code })))
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1)
    expect(await prisma.entitlementEvent.count({ where: { externalId: code } })).toBe(1)
  }, 20000)

  test('ủng hộ ⇒ donor vĩnh viễn, không đụng Pro', async () => {
    const code = await create('donate_100k')
    expect((await call('payadmin/confirm', OWNER, { code })).status).toBe(200)
    const st = (await call('pay/status', MEMBER)).body
    expect(st).toMatchObject({ donor: true, proActive: false, badge: 'donor' })
    const ev = await prisma.entitlementEvent.findFirst({ where: { externalId: code } })
    expect(ev).toMatchObject({ kind: 'web.donate', donation: true, proUntil: null })
  }, 20000)

  test('mã hết hạn vẫn xác nhận được (tiền về trễ); đã từ chối thì không', async () => {
    const uid = await idOf(MEMBER)
    await prisma.paymentIntent.create({
      data: {
        code: 'DATE0002',
        userId: uid,
        kind: 'donate_20k',
        amountVnd: 20000,
        expiresAt: new Date(Date.now() - 1000),
      },
    })
    expect((await call('payadmin/confirm', OWNER, { code: 'DATE0002' })).status).toBe(200)

    const code = await create('pro_year')
    expect((await call('payadmin/reject', OWNER, { code })).status).toBe(200)
    const r = await call('payadmin/confirm', OWNER, { code })
    expect(r.status).toBe(409)
    expect(r.body.error).toBe('already_rejected')
    expect(await prisma.entitlementEvent.count({ where: { externalId: code } })).toBe(0)
  }, 20000)

  test('mã không tồn tại ⇒ 404; sai dạng ⇒ 400', async () => {
    expect((await call('payadmin/confirm', OWNER, { code: 'ZZZZZZZZ' })).status).toBe(404)
    expect((await call('payadmin/confirm', OWNER, { code: 'bad' })).status).toBe(400)
  }, 20000)

  test('list: mặc định đang chờ, tìm theo mã', async () => {
    const code = await create('pro_year')
    const l = await call('payadmin/list', OWNER)
    expect(l.status).toBe(200)
    expect(l.body.items.map((i: { code: string }) => i.code)).toContain(code)
    const q = await call('payadmin/list', OWNER, { q: `TSU ${code}` })
    expect(q.body.items).toEqual([
      expect.objectContaining({ code, username: MEMBER, amountVnd: 490000 }),
    ])
  }, 20000)
})

describe('Tài khoản → Huy hiệu', () => {
  test('chọn cách hiển thị; giá trị lạ ⇒ 400; HIDDEN ⇒ none', async () => {
    expect((await call('pay/badge', MEMBER, { display: 'GOLD' })).status).toBe(400)
    const code = (await call('pay/create', MEMBER, { kind: 'donate_50k' })).body.code
    await call('payadmin/confirm', OWNER, { code })
    const h = await call('pay/badge', MEMBER, { display: 'HIDDEN' })
    expect(h.body).toEqual({ badgeDisplay: 'HIDDEN', badge: 'none' })
    const st = (await call('pay/status', MEMBER)).body
    expect(st).toMatchObject({ donor: true, badgeDisplay: 'HIDDEN', badge: 'none' })
    expect((await call('pay/badge', MEMBER, { display: 'DONOR' })).body.badge).toBe('donor')
  }, 20000)
})
