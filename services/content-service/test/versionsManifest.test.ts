// INT1-a - bản kê phiên bản có chữ ký (tsudev-standards APP_INTEGRITY 2.1, 6).
//
// Bốn bất biến, cả bốn hỏng IM LẶNG nếu mất:
//  1. Chữ ký phủ ĐÚNG các byte phát ra - app kiểm `.sig` trên byte tải về; máy chủ mà
//     serialize lại (res.json) là mọi app bỏ bản kê, và không ai bị khoá khi cần khoá.
//  2. `expires_at` = `issued_at` + 7 ngày (trần của chuẩn); quá hạn app bỏ.
//  3. Chốt chặn theo kênh: URL tải 404 / không thấy phiên bản ⇒ 409 và KHÔNG nâng. Nâng sớm
//     là khoá người dùng mà không có bản để cập nhật - lỗi nặng nhất của chuẩn.
//  4. Không hạ `latest` (mở khoá lại bản cũ) và chỉ pipeline có token riêng hoặc ADMIN nâng.
export {}
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.VERSIONS_RAISE_TOKEN = 'token-nang-phien-ban-du-dai-cho-test-0123'
delete process.env.INTERNAL_API_TOKEN
delete process.env.VERSIONS_SIGNING_KEY

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { app } = require('../src/index')
const v = require('../src/versionsManifest')

const P = 'test-vm-app'
const MEMBER = 'test-vm-member'
const TOKEN = { 'x-versions-token': process.env.VERSIONS_RAISE_TOKEN as string }
const TAG = 'https://github.com/tsudev-org/test-vm-app/releases/tag/v26.11.2601'
const LATEST = 'https://github.com/tsudev-org/test-vm-app/releases/latest'

type FakeRes = { status: number; headers: { get: (k: string) => string | null }; body: null }
const res = (status: number, location?: string): FakeRes => ({
  status,
  headers: { get: (k: string) => (k.toLowerCase() === 'location' ? (location ?? null) : null) },
  body: null,
})
/** fetch giả theo bảng URL → phản hồi; URL lạ ⇒ 404. */
const fakeFetch = (table: Record<string, FakeRes>) =>
  jest.fn(async (u: string) => table[u] ?? res(404))

const clean = async () => {
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_audit_purge = 'on'`),
    prisma.trustAuditLog.deleteMany({ where: { targetType: 'AppVersionChannel' } }),
  ])
  await prisma.appVersionChannel.deleteMany({ where: { product: { startsWith: 'test-vm-' } } })
  await prisma.user.deleteMany({ where: { username: MEMBER } })
  v.invalidate()
}

const realFetch = global.fetch
beforeEach(clean)
afterEach(() => {
  global.fetch = realFetch
})
afterAll(async () => {
  await clean()
  await prisma.$disconnect()
})

describe('chữ ký tách + JWKS', () => {
  test('ký rồi kiểm được; sửa một byte ⇒ hỏng; JWKS có đúng kid', () => {
    const body = v.buildBody([{ product: P, channel: 'github', latest: '26.11.2601', url: TAG }], 1)
    const sig = v.signDetached(body)
    expect(sig).toMatch(/^[\w-]+\.\.[\w-]+$/)
    expect(v.verifyDetached(body, sig)).toBe(true)
    expect(v.verifyDetached(body.replace('2601', '2602'), sig)).toBe(false)
    const kid = JSON.parse(Buffer.from(sig.split('.')[0], 'base64url').toString()).kid
    expect(v.jwks().keys.map((k: { kid: string }) => k.kid)).toContain(kid)
  })

  test('bản kê tất định, expires_at = issued_at + 7 ngày', () => {
    const rows = [
      { product: 'b', channel: 'play', latest: '1.1.1', url: null },
      { product: 'a', channel: 'github', latest: '1.1.2', url: TAG },
    ]
    const a = v.buildBody(rows, 1000)
    expect(v.buildBody([...rows].reverse(), 1000)).toBe(a)
    const m = JSON.parse(a)
    expect(m.v).toBe(1)
    expect(m.expires_at - m.issued_at).toBe(7 * 24 * 3600)
    expect(Object.keys(m.products)).toEqual(['a', 'b'])
    expect(m.products.b.channels.play).toEqual({ latest: '1.1.1' })
  })
})

describe('verifyDownload (chốt chặn theo kênh)', () => {
  test('releases/latest → tag đúng phiên bản → 200 ⇒ đạt', async () => {
    const f = fakeFetch({ [LATEST]: res(302, TAG), [TAG]: res(200) })
    expect(await v.verifyDownload(LATEST, '26.11.2601', 'github', f)).toEqual({
      ok: true,
      finalUrl: TAG,
    })
  })
  test('404 ⇒ không đạt', async () => {
    const r = await v.verifyDownload(TAG, '26.11.2601', 'github', fakeFetch({}))
    expect(r.ok).toBe(false)
  })
  test('200 nhưng URL không mang phiên bản (kênh github) ⇒ không đạt', async () => {
    const f = fakeFetch({
      [LATEST]: res(302, TAG.replace('2601', '2501')),
      [TAG.replace('2601', '2501')]: res(200),
    })
    const r = await v.verifyDownload(LATEST, '26.11.2601', 'github', f)
    expect(r.ok).toBe(false)
  })
  test('kênh cửa hàng: 200 là đủ', async () => {
    const play = 'https://play.google.com/store/apps/details?id=com.tsudev.x'
    expect(
      (await v.verifyDownload(play, '26.11.2601', 'play', fakeFetch({ [play]: res(200) }))).ok
    ).toBe(true)
  })
  test('http, host lạ, chuyển hướng sang host lạ ⇒ không đạt (chặn SSRF)', async () => {
    expect(
      (
        await v.verifyDownload(
          'http://github.com/x/v26.11.2601',
          '26.11.2601',
          'github',
          fakeFetch({})
        )
      ).ok
    ).toBe(false)
    expect(
      (
        await v.verifyDownload(
          'https://169.254.169.254/v26.11.2601',
          '26.11.2601',
          'github',
          fakeFetch({})
        )
      ).ok
    ).toBe(false)
    const f = fakeFetch({ [TAG]: res(302, 'https://evil.example/v26.11.2601') })
    expect((await v.verifyDownload(TAG, '26.11.2601', 'github', f)).ok).toBe(false)
  })
  test('phiên bản phải đứng riêng trong URL', () => {
    expect(v.urlHasVersion('https://x/tsucwico_26.11.2601_windows-x64.exe', '26.11.2601')).toBe(
      true
    )
    expect(v.urlHasVersion('https://x/v126.11.26011', '26.11.2601')).toBe(false)
  })
})

describe('POST /api/admin/versions/:product/:channel + GET bản kê', () => {
  // Có `x-versions-token` ⇒ đường pipeline (/api/pipeline - CP4 gỡ /api/internal/versions); không có ⇒ đường ADMIN (/api/admin).
  const raise = (body: Record<string, unknown>, headers: Record<string, string> = TOKEN) =>
    request(app)
      .post(`/api/${'x-versions-token' in headers ? 'pipeline' : 'admin'}/versions/${P}/github`)
      .set(headers)
      .send(body)

  test('pipeline nâng ⇒ bản kê có kênh mới, chữ ký kiểm được trên byte tải về, có nhật ký', async () => {
    global.fetch = fakeFetch({ [LATEST]: res(302, TAG), [TAG]: res(200) }) as never
    const r = await raise({ latest: '26.11.2601', url: LATEST })
    expect(r.status).toBe(200)
    expect(r.body.data).toMatchObject({ latest: '26.11.2601', raisedBy: 'pipeline' })

    const body = await request(app).get('/.well-known/tsudev/versions.json')
    const sig = await request(app).get('/.well-known/tsudev/versions.json.sig')
    expect(body.status).toBe(200)
    expect(body.headers['cache-control']).toBe('public, max-age=300')
    expect(v.verifyDetached(body.text, sig.text)).toBe(true)
    const m = JSON.parse(body.text)
    expect(m.products[P].channels.github).toEqual({ latest: '26.11.2601', url: LATEST })
    expect(m.expires_at - m.issued_at).toBe(7 * 24 * 3600)

    const log = await prisma.trustAuditLog.findFirst({ where: { targetId: `${P}/github` } })
    expect(log?.note).toMatch(/^chưa có -> 26\.11\.2601 \| url: .+ \| ip: /)
  })

  test('URL tải 404 ⇒ 409 download_unverified, KHÔNG nâng', async () => {
    global.fetch = fakeFetch({}) as never
    const r = await raise({ latest: '26.11.2601', url: TAG })
    expect(r.status).toBe(409)
    expect(r.body.error).toBe('download_unverified')
    expect(await prisma.appVersionChannel.count({ where: { product: P } })).toBe(0)
  })

  test('không hạ phiên bản ⇒ 409 version_not_newer', async () => {
    await prisma.appVersionChannel.create({
      data: {
        product: P,
        channel: 'github',
        latest: '26.11.2601',
        url: TAG,
        verifiedAt: new Date(),
        raisedBy: 'pipeline',
      },
    })
    const r = await raise({ latest: '26.11.2501', url: TAG })
    expect(r.status).toBe(409)
    expect(r.body.error).toBe('version_not_newer')
  })

  test('token sai 401; không danh tính 401; MEMBER 403; latest bản thử 400', async () => {
    expect(
      (await raise({ latest: '26.11.2601', url: TAG }, { 'x-versions-token': 'sai' })).status
    ).toBe(401)
    expect((await raise({ latest: '26.11.2601', url: TAG }, {})).status).toBe(401)
    await prisma.user.create({
      data: { username: MEMBER, email: `${MEMBER}@tsudev.local`, role: 'MEMBER' },
    })
    const bearer = `Bearer ${await signIdentity({ sub: MEMBER }, process.env.INTERNAL_IDENTITY_SECRET)}`
    expect(
      (await raise({ latest: '26.11.2601', url: TAG }, { Authorization: bearer })).status
    ).toBe(403)
    expect((await raise({ latest: '26.11.2601-beta.1', url: TAG })).body.error).toBe(
      'invalid_latest'
    )
  })

  test('LG3: tài khoản bị tạm khoá gọi đường ghi ⇒ 403 account_suspended (cổng chung @tsudev/auth)', async () => {
    await prisma.user.create({
      data: {
        username: MEMBER,
        email: `${MEMBER}@tsudev.local`,
        role: 'MEMBER',
        suspendedAt: new Date(),
      },
    })
    const bearer = `Bearer ${await signIdentity({ sub: MEMBER }, process.env.INTERNAL_IDENTITY_SECRET)}`
    const r = await raise({ latest: '26.11.2601', url: TAG }, { Authorization: bearer })
    expect(r.status).toBe(403)
    expect(r.body.code).toBe('account_suspended')
    // Đường đọc công khai vẫn chạy với danh tính bị tạm khoá.
    const read = await request(app).get('/api/posts').set('Authorization', bearer)
    expect(read.status).toBe(200)
  })

  test('JWKS bản kê công khai', async () => {
    const r = await request(app).get('/.well-known/tsudev/versions-jwks.json')
    expect(r.status).toBe(200)
    expect(r.body.keys[0]).toMatchObject({ kty: 'OKP', crv: 'Ed25519', alg: 'EdDSA' })
  })
})
