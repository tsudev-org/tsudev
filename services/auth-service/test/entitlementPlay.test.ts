// B2 - biên nhận Google Play do máy chủ RP chuyển tiếp (ADR-0002 mục 5, phiếu QT5).
//
// Những cách hỏng mà site vẫn "chạy":
//  1. Biên nhận của người A được RP gắn vào tài khoản B (obfuscatedExternalAccountId không
//     được so, hoặc thiếu mà vẫn cho qua) ⇒ một lần mua mở Pro cho bao nhiêu tài khoản cũng được.
//  2. RP gửi lại cùng biên nhận (thử lại sau 503) ⇒ cộng thêm một năm mỗi lần.
//  3. Nạp thêm khi còn hạn mà mốc mới tính từ "bây giờ" ⇒ người mua mất phần còn lại.
//  4. Acknowledge trước khi ghi sổ cái ⇒ Google giữ tiền mà không có quyền lợi.
//  5. Chưa cấu hình tài khoản dịch vụ mà trả 4xx ⇒ app coi biên nhận là sai, không thử lại.
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.SITE_URL = 'https://tsudev.test'
process.env.RATE_LIMIT_ENTITLEMENT_MAX = '1000'
process.env.RATE_LIMIT_ENTITLEMENT_PLAY_MAX = '1000'
delete process.env.INTERNAL_API_TOKEN

export {}

const request = require('supertest')
const crypto = require('crypto')
const { prisma } = require('@tsudev/db')
const ent = require('../src/entitlements')
const routes = require('../src/entitlementRoutes')
const pb = require('../src/playBilling')
const { app } = require('../src/index')

const DAY = 24 * 60 * 60 * 1000
const P = 'test-pl-'
const CLIENT = `${P}rp`
const OTHER = `${P}khac`
const PKG = 'com.tsudev.testplay'
const AUD = 'https://tsudev.test/api/rp/entitlements/play'
const TOKEN = 'tok-abcdefghijklmnop.1234'

type Keys = { privateKey: unknown; publicKey: { export: (o: object) => object } }
const ecPair = (): Keys => crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })
const rpKeys = ecPair()
const otherKeys = ecPair()
const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
const SA = JSON.stringify({
  client_email: 'play@test.iam.gserviceaccount.com',
  private_key: rsa.privateKey.export({ type: 'pkcs8', format: 'pem' }),
})

const ids = { buyer: '', other: '', stranger: '' }

const assertion = (o: Record<string, unknown> = {}, iss = CLIENT, key = rpKeys.privateKey) => {
  const now = Math.floor(Date.now() / 1000)
  return ent.signJws(
    { iss, sub: iss, aud: AUD, iat: now, exp: now + 60, jti: crypto.randomUUID(), ...o },
    { key, kid: 'rp' }
  )
}

const body = (o: Record<string, unknown> = {}) => ({
  client_id: CLIENT,
  sub: ids.buyer,
  packageName: PKG,
  productId: 'tsudev_pro',
  purchaseToken: TOKEN,
  ...o,
})

const post = (b: unknown, token = assertion()) =>
  request(app).post('/ent/play').set('Authorization', `Bearer ${token}`).send(b)

// ---- Google giả: ghi lại mọi lời gọi, trả theo bảng `google`.
type Call = { url: string; method: string; auth?: string }
let calls: Call[] = []
let google: {
  sub?: Record<string, unknown>
  product?: Record<string, unknown>
  status?: number
  ackStatus?: number
  tokenStatus?: number
}

const subscription = (o: Record<string, unknown> = {}, account = ids.buyer) => ({
  subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
  acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
  externalAccountIdentifiers: { obfuscatedExternalAccountId: pb.obfuscatedAccountId(account) },
  lineItems: [
    {
      productId: 'tsudev_pro',
      expiryTime: '2027-11-20T00:00:00Z',
      prepaidPlan: { allowExtendAfterTime: '2027-11-17T00:00:00Z' },
      offerDetails: { basePlanId: 'nam' },
      latestSuccessfulOrderId: 'GPA.0001',
    },
  ],
  ...o,
})

const fakeFetch = async (
  input: string,
  init: { method?: string; headers?: Record<string, string> }
) => {
  const url = String(input)
  calls.push({ url, method: init?.method || 'GET', auth: init?.headers?.authorization })
  const json = (status: number, v: unknown) =>
    new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } })
  if (url === 'https://oauth2.googleapis.com/token') {
    return google.tokenStatus
      ? json(google.tokenStatus, { error: 'x' })
      : json(200, { access_token: 'ya29.test', expires_in: 3600 })
  }
  if (url.endsWith(':acknowledge')) return new Response(null, { status: google.ackStatus || 204 })
  if (google.status) return json(google.status, { error: { code: google.status } })
  if (url.includes('/purchases/subscriptionsv2/')) return json(200, google.sub ?? subscription())
  if (url.includes('/purchases/products/')) return json(200, google.product ?? {})
  return json(404, {})
}

const mkUser = async (name: string) =>
  (
    await prisma.user.create({
      data: { username: `${P}${name}`, email: `${P}${name}@tsudev.local`, role: 'MEMBER' },
    })
  ).id

const grant = (id: string, accountId: string, clientId: string) =>
  prisma.oidcPayload.create({
    data: {
      type: 'Grant',
      id: `${P}${id}`,
      grantId: `${P}${id}`,
      payload: { accountId, clientId, kind: 'Grant' },
      expiresAt: new Date(Date.now() + DAY),
    },
  })

const clean = async () => {
  await prisma.oidcPayload.deleteMany({ where: { id: { startsWith: P } } })
  const users = await prisma.user.findMany({
    where: { username: { startsWith: P } },
    select: { id: true },
  })
  const uids = users.map((u: { id: string }) => u.id)
  await prisma.rpSubject.deleteMany({
    where: { OR: [{ clientId: { startsWith: P } }, { sub: { in: uids } }] },
  })
  await prisma.user.deleteMany({ where: { username: { startsWith: P } } })
  await prisma.oAuthClient.deleteMany({ where: { id: { startsWith: P } } })
}

const resetLedger = async () => {
  await prisma.entitlementEvent.deleteMany({ where: { userId: { in: Object.values(ids) } } })
  await prisma.entitlement.deleteMany({ where: { userId: { in: Object.values(ids) } } })
}

beforeAll(async () => {
  await clean()
  const mk = (id: string, k: Keys) =>
    prisma.oAuthClient.create({
      data: {
        id,
        name: id,
        redirectUris: [`https://${id}.test/cb`],
        scopes: ['profile', 'tsudev.entitlements'],
        rpPublicJwk: k.publicKey.export({ format: 'jwk' }),
      },
    })
  await mk(CLIENT, rpKeys)
  await mk(OTHER, otherKeys)
  ids.buyer = await mkUser('buyer')
  ids.other = await mkUser('other')
  ids.stranger = await mkUser('stranger')
  await grant('g-buyer', ids.buyer, CLIENT)
  await grant('g-other', ids.other, CLIENT)
  await grant('g-stranger', ids.stranger, OTHER)
})

beforeEach(async () => {
  ent._resetJti()
  routes._resetStatusLimit()
  process.env.PLAY_SERVICE_ACCOUNT_JSON = SA
  process.env.PLAY_PACKAGES = `${CLIENT}=${PKG};${OTHER}=com.tsudev.khac`
  calls = []
  google = {}
  pb._setPlayFetch(fakeFetch)
  await resetLedger()
})

afterEach(() => jest.restoreAllMocks())

afterAll(async () => {
  pb._setPlayFetch(null)
  await resetLedger()
  await clean()
  await prisma.$disconnect()
})

const proUntil = async (id = ids.buyer) =>
  (await prisma.entitlement.findUnique({ where: { userId: id } }))?.proUntil ?? null

describe('POST /ent/play - xác thực và phạm vi', () => {
  test('không có / sai client assertion ⇒ 401, không gọi Google', async () => {
    expect((await request(app).post('/ent/play').send(body())).status).toBe(401)
    // assertion của kênh trạng thái không dùng được cho kênh Play (aud khớp tuyệt đối)
    const r = await post(body(), assertion({ aud: `${AUD.replace('/play', '/status')}` }))
    expect(r.status).toBe(401)
    expect(calls).toHaveLength(0)
  })

  test('client_id trong thân khác client đã xác thực ⇒ 403', async () => {
    const r = await post(body({ client_id: OTHER }))
    expect(r.status).toBe(403)
    expect(r.body.error).toBe('forbidden_client_id')
  })

  test('gói Android không đăng ký cho client ⇒ 403 forbidden_package', async () => {
    const r = await post(body({ packageName: 'com.tsudev.khac' }))
    expect(r.status).toBe(403)
    expect(r.body.error).toBe('forbidden_package')
    delete process.env.PLAY_PACKAGES
    expect((await post(body())).status).toBe(403)
  })

  test('sub chưa cấp quyền cho client ⇒ 404 unknown_subject', async () => {
    const r = await post(body({ sub: ids.stranger }))
    expect(r.status).toBe(404)
    expect(r.body.error).toBe('unknown_subject')
    expect(calls).toHaveLength(0)
  })

  test('thân sai hình dạng ⇒ 400', async () => {
    for (const b of [
      body({ purchaseToken: '' }),
      body({ purchaseToken: 'có dấu cách và chữ Việt' }),
      body({ productId: 'TSUDEV_PRO' }),
      body({ packageName: 'khong-phai-goi' }),
      body({ sub: 42 }),
    ]) {
      expect((await post(b)).status).toBe(400)
    }
  })

  test('sản phẩm lạ ⇒ 400 unknown_product, không gọi Google', async () => {
    const r = await post(body({ productId: 'tsudev_pro_thang' }))
    expect(r.status).toBe(400)
    expect(r.body.error).toBe('unknown_product')
    expect(calls).toHaveLength(0)
  })
})

describe('POST /ent/play - gói trả trước tsudev_pro', () => {
  test('biên nhận đúng ⇒ 200, Pro một năm, acknowledge SAU khi ghi sổ cái', async () => {
    const before = Date.now()
    const r = await post(body())
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ status: 'recorded', product: 'pro' })
    const until = (await proUntil())!.getTime()
    const year = new Date(before)
    year.setUTCFullYear(year.getUTCFullYear() + 1)
    expect(Math.abs(until - year.getTime())).toBeLessThan(60_000)
    expect(r.body.pro_until).toBe(new Date(until).toISOString())
    const ack = calls.find((c) => c.url.endsWith(':acknowledge'))
    expect(ack?.url).toContain(`/${PKG}/purchases/subscriptions/tsudev_pro/tokens/`)
    expect(ack?.method).toBe('POST')
    expect(
      calls.every((c) => c.url.startsWith('https://oauth2') || c.auth === 'Bearer ya29.test')
    ).toBe(true)
  })

  test('gửi lại cùng biên nhận ⇒ 200 already_recorded, KHÔNG cộng thêm năm', async () => {
    await post(body())
    const first = await proUntil()
    google.sub = subscription({ acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' })
    calls = []
    const r = await post(body())
    expect(r.status).toBe(200)
    expect(r.body.status).toBe('already_recorded')
    expect(await proUntil()).toEqual(first)
    expect(calls.some((c) => c.url.endsWith(':acknowledge'))).toBe(false)
  })

  test('nạp thêm khi còn hạn ⇒ cộng dồn từ mốc cũ (max(pro_until, now) + 1 năm)', async () => {
    await ent.recordEvent({
      userId: ids.buyer,
      kind: 'web.vietqr',
      externalId: `${P}WEB`,
      proUntil: new Date(Date.now() + 100 * DAY),
      proSource: 'web',
    })
    const old = (await proUntil())!
    expect((await post(body())).status).toBe(200)
    const want = new Date(old.getTime())
    want.setUTCFullYear(want.getUTCFullYear() + 1)
    expect((await proUntil())!.getTime()).toBe(want.getTime())
    // lần thanh toán mới (orderId khác, cùng token) cộng thêm năm nữa
    google.sub = subscription()
    ;(google.sub.lineItems as Array<Record<string, unknown>>)[0]!.latestSuccessfulOrderId =
      'GPA.0002'
    expect((await post(body())).body.status).toBe('recorded')
    want.setUTCFullYear(want.getUTCFullYear() + 1)
    expect((await proUntil())!.getTime()).toBe(want.getTime())
  })

  test('biên nhận của người khác (obfuscatedAccountId lệch hoặc thiếu) ⇒ 422, không ghi', async () => {
    google.sub = subscription({}, ids.other)
    let r = await post(body())
    expect(r.status).toBe(422)
    expect(r.body.error).toBe('account_mismatch')
    google.sub = subscription({ externalAccountIdentifiers: {} })
    r = await post(body())
    expect(r.status).toBe(422)
    expect(await proUntil()).toBeNull()
    expect(calls.some((c) => c.url.endsWith(':acknowledge'))).toBe(false)
  })

  test('đang chờ thanh toán ⇒ 409; hết hạn/huỷ ⇒ 422; Google 404/410 ⇒ 422', async () => {
    google.sub = subscription({ subscriptionState: 'SUBSCRIPTION_STATE_PENDING' })
    expect((await post(body())).status).toBe(409)
    google.sub = subscription({ subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED' })
    expect((await post(body())).status).toBe(422)
    google.sub = undefined
    google.status = 410
    expect((await post(body())).status).toBe(422)
    google.status = 404
    expect((await post(body())).status).toBe(422)
    expect(await proUntil()).toBeNull()
  })

  test('thuê bao tự gia hạn hoặc base plan lạ ⇒ 422 (chỉ gói trả trước đã biết)', async () => {
    const s = subscription()
    delete (s.lineItems[0] as Record<string, unknown>).prepaidPlan
    google.sub = s
    expect((await post(body())).status).toBe(422)
    const t = subscription()
    ;(t.lineItems[0] as Record<string, unknown>).offerDetails = { basePlanId: 'thang' }
    google.sub = t
    expect((await post(body())).status).toBe(422)
    expect(await proUntil()).toBeNull()
  })

  test('acknowledge hỏng ⇒ 503 nhưng đã ghi; gửi lại ⇒ 200 already_recorded + acknowledge lại', async () => {
    google.ackStatus = 500
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const r = await post(body())
    expect(r.status).toBe(503)
    expect(r.headers['retry-after']).toBe('300')
    const until = await proUntil()
    expect(until).not.toBeNull()
    google.ackStatus = undefined
    calls = []
    const again = await post(body())
    expect(again.status).toBe(200)
    expect(again.body.status).toBe('already_recorded')
    expect(await proUntil()).toEqual(until)
    expect(calls.some((c) => c.url.endsWith(':acknowledge'))).toBe(true)
  })
})

describe('POST /ent/play - ủng hộ (tiêu hao)', () => {
  test('ung_ho_20k đã mua ⇒ 200, ghi ủng hộ, KHÔNG acknowledge (app tự consume)', async () => {
    google.product = {
      purchaseState: 0,
      orderId: 'GPA.9001',
      obfuscatedExternalAccountId: pb.obfuscatedAccountId(ids.buyer),
    }
    const r = await post(body({ productId: 'ung_ho_20k' }))
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ status: 'recorded', product: 'donation', pro_until: null })
    const row = await prisma.entitlement.findUnique({ where: { userId: ids.buyer } })
    expect(row?.donorSince).not.toBeNull()
    expect(calls.find((c) => c.url.includes('/purchases/products/ung_ho_20k/tokens/'))).toBeTruthy()
    expect(calls.some((c) => c.url.endsWith(':acknowledge'))).toBe(false)
  })

  test('đang chờ ⇒ 409; đã huỷ ⇒ 422; người khác ⇒ 422', async () => {
    const acc = pb.obfuscatedAccountId(ids.buyer)
    google.product = { purchaseState: 2, obfuscatedExternalAccountId: acc }
    expect((await post(body({ productId: 'ung_ho_50k' }))).status).toBe(409)
    google.product = { purchaseState: 1, obfuscatedExternalAccountId: acc }
    expect((await post(body({ productId: 'ung_ho_50k' }))).status).toBe(422)
    google.product = {
      purchaseState: 0,
      obfuscatedExternalAccountId: pb.obfuscatedAccountId(ids.other),
    }
    expect((await post(body({ productId: 'ung_ho_50k' }))).status).toBe(422)
    expect(await prisma.entitlement.findUnique({ where: { userId: ids.buyer } })).toBeNull()
  })
})

describe('POST /ent/play - Google/cấu hình hỏng ⇒ 503 (thử lại được, không phải 4xx)', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}))

  test('chưa cấu hình tài khoản dịch vụ ⇒ 503 play_unavailable, không gọi mạng', async () => {
    delete process.env.PLAY_SERVICE_ACCOUNT_JSON
    const r = await post(body())
    expect(r.status).toBe(503)
    expect(r.body.error).toBe('play_unavailable')
    expect(calls).toHaveLength(0)
  })

  test('JSON tài khoản dịch vụ dạng base64 cũng đọc được', async () => {
    process.env.PLAY_SERVICE_ACCOUNT_JSON = Buffer.from(SA).toString('base64')
    expect((await post(body())).status).toBe(200)
  })

  test('lấy token Google hỏng / Play trả 500 hoặc 403 ⇒ 503', async () => {
    google.tokenStatus = 400
    expect((await post(body())).status).toBe(503)
    pb._setPlayFetch(fakeFetch)
    google = { status: 500 }
    expect((await post(body())).status).toBe(503)
    google = { status: 403 }
    expect((await post(body())).status).toBe(503)
    expect(await proUntil()).toBeNull()
  })

  test('assertion gửi Google ký RS256 bằng khoá tài khoản dịch vụ, đúng scope androidpublisher', async () => {
    let assertionJwt = ''
    pb._setPlayFetch(async (input: string, init: { body?: string }) => {
      if (String(input).startsWith('https://oauth2')) {
        assertionJwt = new URLSearchParams(String(init.body)).get('assertion') || ''
      }
      return fakeFetch(input, init as never)
    })
    expect((await post(body())).status).toBe(200)
    const [h, p, s] = assertionJwt.split('.')
    expect(JSON.parse(Buffer.from(h!, 'base64url').toString()).alg).toBe('RS256')
    const claims = JSON.parse(Buffer.from(p!, 'base64url').toString())
    expect(claims).toMatchObject({
      iss: 'play@test.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
    })
    expect(
      crypto.verify(
        'RSA-SHA256',
        Buffer.from(`${h}.${p}`),
        rsa.publicKey,
        Buffer.from(s!, 'base64url')
      )
    ).toBe(true)
  })
})

describe('playBilling - hàm thuần', () => {
  test('obfuscatedAccountId = base64url(SHA-256("tsudev-pro|" + sub)) không đệm (khớp app qulythuchi)', () => {
    const want = crypto.createHash('sha256').update('tsudev-pro|abc').digest('base64url')
    expect(pb.obfuscatedAccountId('abc')).toBe(want)
    expect(want).not.toContain('=')
  })

  test('addMonths theo lịch UTC', () => {
    expect(pb.addMonths(new Date('2026-11-20T01:02:03Z'), 12).toISOString()).toBe(
      '2027-11-20T01:02:03.000Z'
    )
  })
})
