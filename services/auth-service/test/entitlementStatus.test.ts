// PRO2 - kênh trạng thái + DPoP (tsudev-standards PRODUCT_POLICY 7.4, docs/adr/0004).
//
// Những cách hỏng mà site vẫn "chạy":
//  1. Người gia hạn trên web nhưng không mở app > 30 ngày: grant OIDC hết hạn, kênh trả
//     `unknown_subject` ⇒ máy chủ đồng bộ hoãn mãi (tốt) hoặc - tệ hơn - kênh trả `ok` với
//     `pro_until` cũ ⇒ xoá nhầm bản sao đám mây. Kênh phải nhớ "đã TỪNG cấp quyền".
//  2. Tài khoản đã xoá không để lại dấu ⇒ không bao giờ trả được `deleted`, dữ liệu đám
//     mây của người đã xoá tài khoản sống mãi.
//  3. Một RP hỏi được trạng thái người dùng của RP khác (liệt kê tài khoản qua client khác).
//  4. Bằng chứng DPoP sai mà JWS vẫn được cấp (có/không `cnf`) - khoá thiết bị vô nghĩa.
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.SITE_URL = 'https://tsudev.test'
process.env.RATE_LIMIT_ENTITLEMENT_MAX = '1000'
process.env.RATE_LIMIT_ENTITLEMENT_STATUS_MAX = '1000'
delete process.env.INTERNAL_API_TOKEN

export {}

const request = require('supertest')
const crypto = require('crypto')
const { prisma } = require('@tsudev/db')
const oidc = require('../src/oidc')
const ent = require('../src/entitlements')
const routes = require('../src/entitlementRoutes')
const { app } = require('../src/index')

const DAY = 24 * 60 * 60 * 1000
const P = 'test-st-'
const CLIENT = `${P}rp`
const OTHER = `${P}khac`
const SYNC = `${P}tsusync`
const STATUS_AUD = 'https://tsudev.test/api/rp/entitlements/status'
const HTU = 'https://tsudev.test/api/me/entitlements'

type Keys = { privateKey: unknown; publicKey: { export: (o: object) => object } }
const keyPair = (): Keys => crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })
const rpKeys = keyPair()
const otherKeys = keyPair()
const syncKeys = keyPair()
const SIGNER = { key: keyPair().privateKey, kid: 'test-kid' }
const signerPub = () => crypto.createPublicKey(SIGNER.key)

const ids = { fresh: '', old: '', gone: '', stranger: '', goneOther: '', oldSub: '', recent: '' }

const assertion = (o: Record<string, unknown> = {}, iss = CLIENT, key = rpKeys.privateKey) => {
  const now = Math.floor(Date.now() / 1000)
  return ent.signJws(
    { iss, sub: iss, aud: STATUS_AUD, iat: now, exp: now + 60, jti: crypto.randomUUID(), ...o },
    { key, kid: 'rp' }
  )
}

const status = (body: unknown, token = assertion()) =>
  request(app).post('/ent/status').set('Authorization', `Bearer ${token}`).send(body)

const mkUser = async (name: string) =>
  (
    await prisma.user.create({
      data: { username: `${P}${name}`, email: `${P}${name}@tsudev.local`, role: 'MEMBER' },
    })
  ).id

const grant = (id: string, accountId: string, clientId: string, expiresAt: Date) =>
  prisma.oidcPayload.create({
    data: {
      type: 'Grant',
      id: `${P}${id}`,
      grantId: `${P}${id}`,
      payload: { accountId, clientId, kind: 'Grant' },
      expiresAt,
    },
  })

const clean = async () => {
  await prisma.oidcPayload.deleteMany({ where: { id: { startsWith: P } } })
  const users = await prisma.user.findMany({
    where: { username: { startsWith: P } },
    select: { id: true },
  })
  await prisma.user.deleteMany({ where: { username: { startsWith: P } } })
  const subs = [...users.map((u: { id: string }) => u.id), ...Object.values(ids)]
  await prisma.rpSubject.deleteMany({
    where: { OR: [{ clientId: { startsWith: P } }, { sub: { in: subs } }] },
  })
  await prisma.deletedSubject.deleteMany({
    where: { OR: [{ sub: { in: subs } }, { sub: { startsWith: P } }] },
  })
  await prisma.oAuthClient.deleteMany({ where: { id: { startsWith: P } } })
}

beforeAll(async () => {
  await clean()
  const mk = (id: string, k: Keys, extra: Record<string, unknown> = {}) =>
    prisma.oAuthClient.create({
      data: {
        id,
        name: id,
        redirectUris: [`https://${id}.test/cb`],
        scopes: ['profile', 'tsudev.entitlements'],
        rpPublicJwk: k.publicKey.export({ format: 'jwk' }),
        ...extra,
      },
    })
  await mk(CLIENT, rpKeys)
  await mk(OTHER, otherKeys)
  await mk(SYNC, syncKeys, { redirectUris: [], statusDelegateFor: [CLIENT] })

  // fresh: grant còn hạn. old: grant hết hạn từ 45 ngày trước nhưng đã gia hạn Pro trên web.
  // gone: từng cấp quyền rồi xoá tài khoản. stranger: chưa từng cấp quyền cho CLIENT.
  ids.fresh = await mkUser('fresh')
  ids.old = await mkUser('old')
  ids.gone = await mkUser('gone')
  ids.stranger = await mkUser('stranger')
  ids.goneOther = await mkUser('gone-other')
  await grant('g-fresh', ids.fresh, CLIENT, new Date(Date.now() + DAY))
  await grant('g-old', ids.old, CLIENT, new Date(Date.now() - 45 * DAY))
  await grant('g-gone', ids.gone, CLIENT, new Date(Date.now() + DAY))
  await grant('g-stranger', ids.stranger, OTHER, new Date(Date.now() + DAY))
  await grant('g-gone-other', ids.goneOther, OTHER, new Date(Date.now() + DAY))
  await ent.recordEvent({
    userId: ids.old,
    kind: 'web.vietqr',
    externalId: `${P}GIAHAN`,
    proUntil: new Date('2027-11-20T00:00:00Z'),
    proSource: 'web',
  })
  await prisma.user.delete({ where: { id: ids.gone } })
  await prisma.user.delete({ where: { id: ids.goneOther } })
})

beforeEach(() => {
  ent._resetJti()
  routes._resetStatusLimit()
  jest.spyOn(oidc, 'entitlementSigningKey').mockReturnValue(SIGNER)
})

afterEach(() => jest.restoreAllMocks())

afterAll(async () => {
  await clean()
  await prisma.$disconnect()
})

describe('trigger CSDL', () => {
  it('Grant OIDC ⇒ RpSubject; xoá tài khoản ⇒ DeletedSubject', async () => {
    const rs = await prisma.rpSubject.findMany({ where: { clientId: CLIENT } })
    expect(rs.map((r: { sub: string }) => r.sub).sort()).toEqual(
      [ids.fresh, ids.old, ids.gone].sort()
    )
    expect(await prisma.deletedSubject.findUnique({ where: { sub: ids.gone } })).not.toBeNull()
  })
})

describe('POST /ent/status - xác thực (mục 2.2)', () => {
  const body = () => ({ client_id: CLIENT, subs: [ids.fresh] })

  it('assertion hợp lệ ⇒ 200, no-store', async () => {
    const r = await status(body())
    expect(r.status).toBe(200)
    expect(r.headers['cache-control']).toBe('no-store')
  })

  it('client lạ ⇒ 401', async () => {
    const r = await status(body(), assertion({}, `${P}khong-co`, keyPair().privateKey))
    expect(r.status).toBe(401)
    expect(r.body.error).toBe('invalid_client')
  })

  it.each([
    ['aud của kênh JWS (không phải /status)', { aud: 'https://tsudev.test/api/rp/entitlements' }],
    ['aud lạ', { aud: 'https://tsudev.com/api/rp/entitlements/status' }],
    ['exp quá 300 giây', { exp: Math.floor(Date.now() / 1000) + 3600 }],
    ['thiếu jti', { jti: undefined }],
  ])('%s ⇒ 401', async (_n, o) => {
    expect((await status(body(), assertion(o))).status).toBe(401)
  })

  it('khoá không khớp client ⇒ 401', async () => {
    expect((await status(body(), assertion({}, CLIENT, otherKeys.privateKey))).status).toBe(401)
  })

  it('dùng lại jti ⇒ 401', async () => {
    const a = assertion()
    expect((await status(body(), a)).status).toBe(200)
    expect((await status(body(), a)).status).toBe(401)
  })

  it('assertion của kênh trạng thái KHÔNG dùng được cho GET /rp/:sub', async () => {
    const r = await request(app)
      .get(`/ent/rp/${ids.fresh}`)
      .set('Authorization', `Bearer ${assertion()}`)
    expect(r.status).toBe(401)
  })
})

describe('POST /ent/status - phạm vi client', () => {
  it('RP hỏi client_id khác ⇒ 403', async () => {
    const r = await status({ client_id: OTHER, subs: [ids.stranger] })
    expect(r.status).toBe(403)
    expect(r.body.error).toBe('forbidden_client_id')
  })

  it('tsusync hỏi thay client trong statusDelegateFor ⇒ 200', async () => {
    const r = await status(
      { client_id: CLIENT, subs: [ids.old] },
      assertion({}, SYNC, syncKeys.privateKey)
    )
    expect(r.status).toBe(200)
    expect(r.body.results[ids.old].status).toBe('ok')
  })

  it('tsusync hỏi client KHÔNG nằm trong danh sách ⇒ 403', async () => {
    const r = await status(
      { client_id: OTHER, subs: [ids.stranger] },
      assertion({}, SYNC, syncKeys.privateKey)
    )
    expect(r.status).toBe(403)
  })

  it('client bị tắt mất quyền hỏi thay', async () => {
    await prisma.oAuthClient.update({ where: { id: SYNC }, data: { disabledAt: new Date() } })
    try {
      const r = await status(
        { client_id: CLIENT, subs: [ids.old] },
        assertion({}, SYNC, syncKeys.privateKey)
      )
      expect(r.status).toBe(401)
    } finally {
      await prisma.oAuthClient.update({ where: { id: SYNC }, data: { disabledAt: null } })
    }
  })
})

describe('POST /ent/status - thân yêu cầu', () => {
  it('> 100 sub ⇒ 400', async () => {
    const subs = Array.from({ length: 101 }, (_, i) => `s${i}`)
    const r = await status({ client_id: CLIENT, subs })
    expect(r.status).toBe(400)
    expect(r.body.max_subs).toBe(100)
  })

  it('đúng 100 sub ⇒ 200', async () => {
    const subs = [ids.fresh, ...Array.from({ length: 99 }, (_, i) => `s${i}`)]
    expect((await status({ client_id: CLIENT, subs })).status).toBe(200)
  })

  it.each([
    ['subs rỗng', { client_id: CLIENT, subs: [] }],
    ['subs không phải mảng', { client_id: CLIENT, subs: 'abc' }],
    ['sub không phải chuỗi', { client_id: CLIENT, subs: [1] }],
    ['thiếu client_id', { subs: ['a'] }],
  ])('%s ⇒ 400', async (_n, b) => {
    expect((await status(b)).status).toBe(400)
  })
})

describe('POST /ent/status - kết quả (mục 2.2)', () => {
  it('grant đã quá 30 ngày vẫn trả ok + pro_until đã gia hạn', async () => {
    const r = await status({ client_id: CLIENT, subs: [ids.old] })
    expect(r.status).toBe(200)
    expect(r.body.results[ids.old]).toEqual({
      status: 'ok',
      pro_until: Math.floor(Date.parse('2027-11-20T00:00:00Z') / 1000),
    })
    // Đối chứng: kênh JWS vẫn 404 cho đúng sub này (grant hết hạn) - đó là lý do kênh này tồn tại.
    const j = await request(app)
      .get(`/ent/rp/${ids.old}`)
      .set(
        'Authorization',
        `Bearer ${assertion({ aud: 'https://tsudev.test/api/rp/entitlements' })}`
      )
    expect(j.status).toBe(404)
  })

  it('tài khoản đã xoá ⇒ deleted; chưa có Pro ⇒ pro_until 0', async () => {
    const r = await status({ client_id: CLIENT, subs: [ids.gone, ids.fresh] })
    expect(r.body.results).toEqual({
      [ids.gone]: { status: 'deleted' },
      [ids.fresh]: { status: 'ok', pro_until: 0 },
    })
  })

  it('chưa từng cấp quyền cho client này ⇒ unknown_subject (dù tồn tại hay đã xoá)', async () => {
    const r = await status({
      client_id: CLIENT,
      subs: [ids.stranger, ids.goneOther, 'khong-co-ai', '../x'],
    })
    for (const s of [ids.stranger, ids.goneOther, 'khong-co-ai', '../x']) {
      expect(r.body.results[s]).toEqual({ status: 'unknown_subject' })
    }
  })

  it('chỉ trả status/pro_until - không email, huy hiệu, thiết bị', async () => {
    const r = await status({ client_id: CLIENT, subs: [ids.old] })
    expect(Object.keys(r.body)).toEqual(['results'])
    expect(Object.keys(r.body.results[ids.old]).sort()).toEqual(['pro_until', 'status'])
  })

  it('nhật ký kiểm toán: client + số sub, KHÔNG có danh sách sub', async () => {
    await status({ client_id: CLIENT, subs: [ids.fresh, ids.old] })
    const row = await prisma.trustAuditLog.findFirst({
      where: { action: 'entitlement.status', actorId: CLIENT },
      orderBy: { createdAt: 'desc' },
    })
    expect(row).toMatchObject({ targetId: CLIENT, note: 'subs=2' })
    expect(JSON.stringify(row)).not.toContain(ids.fresh)
  })

  it('giới hạn tần suất theo client ⇒ 429', async () => {
    process.env.RATE_LIMIT_ENTITLEMENT_STATUS_MAX = '2'
    try {
      const codes = []
      for (let i = 0; i < 3; i++)
        codes.push((await status({ client_id: CLIENT, subs: ['a'] })).status)
      expect(codes).toEqual([200, 200, 429])
    } finally {
      process.env.RATE_LIMIT_ENTITLEMENT_STATUS_MAX = '1000'
    }
  })
})

describe('dọn dấu xoá sau thời hạn giữ', () => {
  it('quá 400 ngày ⇒ xoá DeletedSubject + RpSubject; trong 1 năm ⇒ giữ', async () => {
    const oldSub = `${P}xoa-lau`
    const recent = `${P}xoa-gan`
    ids.oldSub = oldSub
    ids.recent = recent
    await prisma.deletedSubject.createMany({
      data: [
        { sub: oldSub, deletedAt: new Date(Date.now() - 401 * DAY) },
        { sub: recent, deletedAt: new Date(Date.now() - 365 * DAY) },
      ],
    })
    await prisma.rpSubject.createMany({
      data: [
        { clientId: CLIENT, sub: oldSub },
        { clientId: CLIENT, sub: recent },
      ],
    })
    ent._resetPurge()
    await ent.purgeDeletedSubjects(new Date())
    expect(await prisma.deletedSubject.findUnique({ where: { sub: oldSub } })).toBeNull()
    expect(await prisma.rpSubject.count({ where: { sub: oldSub } })).toBe(0)
    expect(await prisma.deletedSubject.findUnique({ where: { sub: recent } })).not.toBeNull()
    const r = await status({ client_id: CLIENT, subs: [recent] })
    expect(r.body.results[recent]).toEqual({ status: 'deleted' })
  })
})

// ---------------------------------------------------------------------------
// DPoP (RFC 9449) - hình dạng yêu cầu của tsudev_ui v0.2.0 (phiếu PRO2 mục 2.3)
// ---------------------------------------------------------------------------
const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url')

function proof(
  token: string,
  o: Record<string, unknown> = {},
  h: Record<string, unknown> = {},
  k: Keys = deviceKeys
) {
  const jwk = k.publicKey.export({ format: 'jwk' }) as Record<string, unknown>
  const header = { typ: 'dpop+jwt', alg: 'ES256', jwk, ...h }
  const payload = {
    jti: crypto.randomBytes(16).toString('base64url'),
    htm: 'GET',
    htu: HTU,
    iat: Math.floor(Date.now() / 1000),
    ath: crypto.createHash('sha256').update(token).digest('base64url'),
    ...o,
  }
  const input = `${b64(header)}.${b64(payload)}`
  const sig = crypto.sign('sha256', Buffer.from(input), {
    key: k.privateKey,
    dsaEncoding: 'ieee-p1363',
  })
  return `${input}.${sig.toString('base64url')}`
}
const deviceKeys = keyPair()
const deviceJkt = () => {
  const j = deviceKeys.publicKey.export({ format: 'jwk' }) as Record<string, string>
  return ent.jwkThumbprint({ crv: j.crv, kty: j.kty, x: j.x, y: j.y })
}

describe('DPoP cho GET /ent/me', () => {
  const TOKEN = 'access-token-thu'
  const me = (dpop?: string) => {
    const r = request(app).get('/ent/me').set('Authorization', `Bearer ${TOKEN}`)
    return dpop === undefined ? r : r.set('DPoP', dpop)
  }
  beforeEach(() => {
    jest.spyOn(oidc, 'findAccessToken').mockResolvedValue({
      accountId: ids.fresh,
      clientId: CLIENT,
      scopes: ['openid', 'tsudev.entitlements'],
    })
  })

  it('thumbprint RFC 7638 khớp vector chung (khoá RFC 6979 A.2.5, tsudev_ui dpop_test.dart)', () => {
    const hex = (s: string) => Buffer.from(s, 'hex').toString('base64url')
    expect(
      ent.jwkThumbprint({
        crv: 'P-256',
        kty: 'EC',
        x: hex('60FED4BA255A9D31C961EB74C6356D68C049B8923B61FA6CE669622E60F29FB6'),
        y: hex('7903FE1008B8BC99A41AE9E95628BC64F2F1B20C2D7E9F5177A3C294D4462299'),
      })
    ).toBe('DOvxvJiAdIqVWIkFt5hDtCunXLF0BV4-JGv4f-ALSm0')
  })

  it('không có DPoP ⇒ JWS như cũ, không cnf', async () => {
    const r = await me()
    expect(r.status).toBe(200)
    expect(ent.verifyEs256(r.body.jws, signerPub()).payload.cnf).toBeUndefined()
  })

  it('DPoP hợp lệ ⇒ cnf.jkt = thumbprint khoá thiết bị', async () => {
    const r = await me(proof(TOKEN))
    expect(r.status).toBe(200)
    expect(ent.verifyEs256(r.body.jws, signerPub()).payload.cnf).toEqual({ jkt: deviceJkt() })
  })

  it('htu kèm query/fragment vẫn khớp (RFC 9449 4.3)', async () => {
    expect((await me(proof(TOKEN, { htu: `${HTU}?a=1#x` }))).status).toBe(200)
  })

  it.each([
    ['htm sai', { htm: 'POST' }, {}],
    ['htu sai', { htu: 'https://tsudev.test/api/me/khac' }, {}],
    ['iat lệch quá 60 giây', { iat: Math.floor(Date.now() / 1000) - 120 }, {}],
    ['iat ở tương lai quá 60 giây', { iat: Math.floor(Date.now() / 1000) + 120 }, {}],
    ['thiếu jti', { jti: undefined }, {}],
    ['ath không khớp access token', { ath: 'sai' }, {}],
    ['thiếu ath', { ath: undefined }, {}],
    ['typ sai', {}, { typ: 'JWT' }],
    ['alg khác ES256', {}, { alg: 'ES384' }],
    [
      'jwk có khoá bí mật',
      {},
      {
        jwk: (deviceKeys.privateKey as { export: (o: object) => object }).export({ format: 'jwk' }),
      },
    ],
  ])('%s ⇒ 401 invalid_dpop_proof', async (_n, o, h) => {
    const r = await me(proof(TOKEN, o, h))
    expect(r.status).toBe(401)
    expect(r.body.error).toBe('invalid_dpop_proof')
    expect(r.headers['www-authenticate']).toContain('DPoP')
  })

  it('chữ ký bằng khoá khác khoá trong jwk ⇒ 401', async () => {
    const other = keyPair()
    const p = proof(TOKEN).split('.')
    const forged = proof(TOKEN, {}, {}, other).split('.')
    expect((await me(`${p[0]}.${p[1]}.${forged[2]}`)).status).toBe(401)
  })

  it('phát lại cùng bằng chứng (jti) ⇒ 401', async () => {
    const p = proof(TOKEN)
    expect((await me(p)).status).toBe(200)
    expect((await me(p)).status).toBe(401)
  })
})
