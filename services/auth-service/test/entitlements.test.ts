// PRO-B - máy chủ quyền lợi (ADR-0002, tsudev-standards PRODUCT_POLICY 7.4, AUTH_AND_ACCOUNT 14.3).
//
// Những cách hỏng mà site vẫn "chạy":
//  1. Hoàn tiền ở MỘT kênh xoá luôn Pro mua ở kênh khác (gộp sổ cái sai).
//  2. JWS nhận `alg` khác ES256 hoặc chữ ký sửa tay - app tin quyền lợi giả.
//  3. Máy chủ RP lấy được quyền lợi của `sub` chưa từng đăng nhập vào nó (liệt kê tài khoản),
//     hoặc phát lại một client assertion cũ.
//  4. Mã cài đặt thô nằm trong DB (thành định danh thiết bị).
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.SITE_URL = 'https://tsudev.test'
process.env.RATE_LIMIT_ENTITLEMENT_MAX = '1000'
delete process.env.INTERNAL_API_TOKEN

export {}

const request = require('supertest')
const crypto = require('crypto')
const { prisma } = require('@tsudev/db')
const oidc = require('../src/oidc')
const ent = require('../src/entitlements')
const { app } = require('../src/index')

const DAY = 24 * 60 * 60 * 1000
const USER = 'test-ent-user'
const CLIENT = 'test-ent-rp'
const OTHER = 'test-ent-khac'
const AUD = 'https://tsudev.test/api/rp/entitlements'

const ev = (o: Record<string, unknown>) => ({
  kind: 'web.vietqr',
  proUntil: null,
  proSource: null,
  donation: false,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  ...o,
})

describe('foldEvents', () => {
  const t = (d: string) => new Date(`2026-${d}T00:00:00Z`)
  it('sổ cái rỗng ⇒ miễn phí', () => {
    expect(ent.foldEvents([])).toEqual({ proUntil: null, proSource: null, donorSince: null })
  })
  it('mua rồi gia hạn ⇒ mốc mới nhất', () => {
    const s = ent.foldEvents([
      ev({ kind: 'play.purchase', proSource: 'play', proUntil: t('12-01'), createdAt: t('11-01') }),
      ev({ kind: 'play.rtdn', proSource: 'play', proUntil: t('12-31'), createdAt: t('11-30') }),
    ])
    expect(s.proUntil).toEqual(t('12-31'))
    expect(s.proSource).toBe('play')
  })
  it('hoàn tiền Play KHÔNG xoá Pro mua trên web', () => {
    const s = ent.foldEvents([
      ev({ kind: 'web.vietqr', proSource: 'web', proUntil: t('12-20'), createdAt: t('11-02') }),
      ev({ kind: 'play.purchase', proSource: 'play', proUntil: t('12-31'), createdAt: t('11-03') }),
      ev({ kind: 'play.voided', proSource: 'play', proUntil: t('11-05'), createdAt: t('11-05') }),
    ])
    expect(s.proUntil).toEqual(t('12-20'))
    expect(s.proSource).toBe('web')
  })
  it('admin.revoke đặt mọi nguồn về mốc của nó', () => {
    const s = ent.foldEvents([
      ev({ kind: 'web.vietqr', proSource: 'web', proUntil: t('12-20'), createdAt: t('11-02') }),
      ev({ kind: 'play.purchase', proSource: 'play', proUntil: t('12-31'), createdAt: t('11-03') }),
      ev({ kind: 'admin.revoke', proUntil: t('11-10'), createdAt: t('11-10') }),
    ])
    expect(s.proUntil).toEqual(t('11-10'))
  })
  it('ủng hộ hai lần ⇒ mốc lần đầu, vĩnh viễn', () => {
    const s = ent.foldEvents([
      ev({ donation: true, createdAt: t('11-09') }),
      ev({ donation: true, createdAt: t('11-03') }),
    ])
    expect(s.donorSince).toEqual(t('11-03'))
    expect(s.proUntil).toBeNull()
  })
})

describe('badgeFor (bảng 4.1)', () => {
  const now = new Date('2026-11-20T00:00:00Z')
  const pro = { proUntil: new Date('2026-12-01T00:00:00Z'), proSource: 'web', donorSince: null }
  const both = { ...pro, donorSince: new Date('2026-11-01T00:00:00Z') }
  const donor = { proUntil: new Date('2026-11-01T00:00:00Z'), proSource: 'web', donorSince: now }
  it.each([
    [pro, 'AUTO', 'pro'],
    [both, 'AUTO', 'both'],
    [both, 'PRO', 'pro'],
    [both, 'DONOR', 'donor'],
    [both, 'HIDDEN', 'none'],
    [donor, 'AUTO', 'donor'],
    [donor, 'PRO', 'none'],
    [pro, 'BOTH', 'pro'],
  ])('%#', (s, d, want) => expect(ent.badgeFor(s, d, now)).toBe(want))
})

describe('JWS ES256', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })
  const signer = { key: privateKey, kid: 'k1' }
  it('ký rồi kiểm được; sửa một ký tự ⇒ hỏng', () => {
    const jws = ent.signJws({ a: 1 }, signer)
    expect(ent.verifyEs256(jws, publicKey)?.payload).toEqual({ a: 1 })
    const [h, , s] = jws.split('.')
    const forged = `${h}.${Buffer.from('{"a":2}').toString('base64url')}.${s}`
    expect(ent.verifyEs256(forged, publicKey)).toBeNull()
  })
  it('`alg: none` bị từ chối', () => {
    const h = Buffer.from('{"alg":"none"}').toString('base64url')
    const b = Buffer.from('{"a":1}').toString('base64url')
    expect(ent.verifyEs256(`${h}.${b}.`, publicKey)).toBeNull()
  })
})

describe('mã cài đặt', () => {
  it('chỉ nhận đúng 22 ký tự base64url', () => {
    expect(ent.parseInstallationId(crypto.randomBytes(16).toString('base64url'))).toHaveLength(22)
    for (const bad of ['', 'ngan', 'x'.repeat(23), 'a+b/'.padEnd(22, 'a'), 123, undefined]) {
      expect(ent.parseInstallationId(bad)).toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// Đường HTTP
// ---------------------------------------------------------------------------
let userId = ''
let rpKeys: { privateKey: unknown; publicKey: { export: (o: object) => object } }

const clean = async () => {
  await prisma.oidcPayload.deleteMany({ where: { id: { startsWith: 'test-ent-' } } })
  await prisma.user.deleteMany({ where: { username: USER } })
  await prisma.oAuthClient.deleteMany({ where: { id: { in: [CLIENT, OTHER] } } })
}

// `oidc-provider` là ESM thuần - jest (CJS) không nạp được, nên `initOidc` chỉ chạy trong
// test/oidc.node.test.mjs. Ở đây thay khoá ký bằng một khoá ES256 sinh tạm.
const SIGNER = {
  key: crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey,
  kid: 'test-kid',
}
const signerPub = () => crypto.createPublicKey(SIGNER.key)

const assertion = (o: Record<string, unknown> = {}, key = rpKeys.privateKey, alg = 'ES256') => {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: CLIENT,
    sub: CLIENT,
    aud: AUD,
    iat: now,
    exp: now + 60,
    jti: crypto.randomUUID(),
    ...o,
  }
  if (alg !== 'ES256') {
    const h = Buffer.from(JSON.stringify({ alg })).toString('base64url')
    const b = Buffer.from(JSON.stringify(payload)).toString('base64url')
    return `${h}.${b}.${crypto.createHmac('sha256', 'x').update(`${h}.${b}`).digest('base64url')}`
  }
  return ent.signJws(payload, { key: key, kid: 'rp' })
}

beforeAll(async () => {
  await clean()
  rpKeys = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })
  const u = await prisma.user.create({
    data: { username: USER, email: `${USER}@tsudev.local`, role: 'MEMBER' },
  })
  userId = u.id
  await prisma.oAuthClient.create({
    data: {
      id: CLIENT,
      name: 'RP thử',
      redirectUris: ['https://rp.test/cb'],
      scopes: ['profile', 'tsudev.entitlements'],
      rpPublicJwk: rpKeys.publicKey.export({ format: 'jwk' }),
    },
  })
  await prisma.oAuthClient.create({
    data: { id: OTHER, name: 'Không có kênh RP', redirectUris: ['https://khac.test/cb'] },
  })
  await prisma.oidcPayload.create({
    data: {
      type: 'Grant',
      id: 'test-ent-grant',
      grantId: 'test-ent-grant',
      payload: { accountId: userId, clientId: CLIENT, kind: 'Grant' },
      expiresAt: new Date(Date.now() + DAY),
    },
  })
})

beforeEach(() => {
  ent._resetJti()
  jest.spyOn(oidc, 'entitlementSigningKey').mockReturnValue(SIGNER)
})

afterAll(async () => {
  await clean()
  await prisma.$disconnect()
})

afterEach(() => jest.restoreAllMocks())

describe('GET /ent/me', () => {
  it('không token / token lạ ⇒ 401', async () => {
    expect((await request(app).get('/ent/me')).status).toBe(401)
    const r = await request(app).get('/ent/me').set('Authorization', 'Bearer khong-ton-tai')
    expect(r.status).toBe(401)
  })

  it('token thiếu scope tsudev.entitlements ⇒ 403', async () => {
    jest.spyOn(oidc, 'findAccessToken').mockResolvedValue({
      accountId: userId,
      clientId: CLIENT,
      scopes: ['openid', 'profile'],
    })
    const r = await request(app).get('/ent/me').set('Authorization', 'Bearer t')
    expect(r.status).toBe(403)
    expect(r.body.error).toBe('insufficient_scope')
  })

  it('JWS hợp lệ: aud = client, exp = iat + 7 ngày, đếm thiết bị, chỉ lưu HMAC', async () => {
    jest.spyOn(oidc, 'findAccessToken').mockResolvedValue({
      accountId: userId,
      clientId: CLIENT,
      scopes: ['openid', 'tsudev.entitlements'],
    })
    const ids = [
      crypto.randomBytes(16).toString('base64url'),
      crypto.randomBytes(16).toString('base64url'),
    ]
    let last: Record<string, unknown> = {}
    for (const id of [...ids, ids[0]]) {
      const r = await request(app)
        .get('/ent/me')
        .set('Authorization', 'Bearer t')
        .set('X-Tsu-Installation', id)
        .set('X-Tsu-Platform', 'android')
      expect(r.status).toBe(200)
      expect(r.headers['cache-control']).toBe('no-store')
      const v = ent.verifyEs256(r.body.jws, signerPub())
      expect(v.header.kid).toBe('test-kid')
      last = v.payload
    }
    expect(last).toMatchObject({
      sub: userId,
      aud: CLIENT,
      pro_until: 0,
      pro_source: null,
      donor: false,
      badge: 'none',
      devices_30d: 2,
    })
    expect((last.exp as number) - (last.iat as number)).toBe(7 * 24 * 60 * 60)
    const rows = await prisma.appInstallation.findMany({ where: { userId } })
    expect(rows).toHaveLength(2)
    for (const row of rows) expect(ids).not.toContain(row.installationIdHash)
  })

  it('header mã cài đặt sai định dạng ⇒ bỏ qua, không lỗi', async () => {
    jest.spyOn(oidc, 'findAccessToken').mockResolvedValue({
      accountId: userId,
      clientId: CLIENT,
      scopes: ['tsudev.entitlements'],
    })
    const r = await request(app)
      .get('/ent/me')
      .set('Authorization', 'Bearer t')
      .set('X-Tsu-Installation', 'IMEI-356938035643809')
    expect(r.status).toBe(200)
  })
})

describe('sổ cái + JWS phản ánh Pro', () => {
  it('ghi trùng (kind, externalId) ⇒ không ghi lại; JWS có pro + badge', async () => {
    const until = new Date(Date.now() + 30 * DAY)
    const e = {
      userId,
      kind: 'web.vietqr',
      externalId: 'TSU-TEST0001',
      proUntil: until,
      proSource: 'web',
    }
    expect(await ent.recordEvent(e)).toBe(true)
    expect(await ent.recordEvent(e)).toBe(false)
    expect(await prisma.entitlementEvent.count({ where: { userId } })).toBe(1)
    const r = await request(app)
      .get(`/ent/rp/${userId}`)
      .set('Authorization', `Bearer ${assertion()}`)
    expect(r.status).toBe(200)
    const p = ent.verifyEs256(r.body.jws, signerPub()).payload
    expect(p).toMatchObject({ aud: CLIENT, pro_source: 'web', badge: 'pro' })
    // LG3-a: JWS mang trạng thái tài khoản do máy chủ quyết (người dùng thử chưa xác minh, mới tạo).
    expect(p).toMatchObject({ status: 'active', status_reason: 'account_unverified' })
    expect(p.pro_until).toBe(Math.floor(until.getTime() / 1000))
  })

  it('tài khoản bị tạm khoá ⇒ JWS mang status suspended + account_suspended', async () => {
    await prisma.user.update({ where: { id: userId }, data: { suspendedAt: new Date() } })
    try {
      const r = await request(app)
        .get(`/ent/rp/${userId}`)
        .set('Authorization', `Bearer ${assertion()}`)
      expect(r.status).toBe(200)
      const p = ent.verifyEs256(r.body.jws, signerPub()).payload
      expect(p).toMatchObject({ status: 'suspended', status_reason: 'account_suspended' })
    } finally {
      await prisma.user.update({ where: { id: userId }, data: { suspendedAt: null } })
    }
  })
})

describe('GET /ent/rp/:sub (private_key_jwt)', () => {
  const get = (sub: string, token: string) =>
    request(app).get(`/ent/rp/${sub}`).set('Authorization', `Bearer ${token}`)

  it('assertion hợp lệ ⇒ 200; phát lại cùng jti ⇒ 401', async () => {
    const a = assertion()
    expect((await get(userId, a)).status).toBe(200)
    expect((await get(userId, a)).status).toBe(401)
  })

  it.each([
    ['sai aud', { aud: 'https://tsudev.test/api/rp' }],
    ['exp quá 300 giây', { exp: Math.floor(Date.now() / 1000) + 3600 }],
    ['đã hết hạn', { exp: Math.floor(Date.now() / 1000) - 1 }],
    ['thiếu jti', { jti: undefined }],
    ['iss khác sub', { sub: OTHER }],
  ])('%s ⇒ 401', async (_n, o) => {
    expect((await get(userId, assertion(o))).status).toBe(401)
  })

  it('HS256 / khoá lạ / client không có kênh RP ⇒ 401', async () => {
    expect((await get(userId, assertion({}, undefined, 'HS256'))).status).toBe(401)
    const khoaLa = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey
    expect((await get(userId, assertion({}, khoaLa))).status).toBe(401)
    expect((await get(userId, assertion({ iss: OTHER, sub: OTHER }))).status).toBe(401)
  })

  it('sub chưa cấp quyền cho client / sub lạ ⇒ cùng 404', async () => {
    const other = await prisma.user.create({
      data: { username: `${USER}-2`, email: `${USER}-2@tsudev.local`, role: 'MEMBER' },
    })
    try {
      const r1 = await get(other.id, assertion())
      const r2 = await get('khong-co-ai', assertion())
      expect([r1.status, r2.status]).toEqual([404, 404])
      expect(r1.body).toEqual(r2.body)
    } finally {
      await prisma.user.delete({ where: { id: other.id } })
    }
  })
})
