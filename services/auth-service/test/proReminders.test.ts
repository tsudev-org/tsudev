// PRO2 2.4 - thư nhắc gia hạn TsuDEV Pro (PRODUCT_POLICY 7.2 + 7.6).
//
// Những cách hỏng mà site vẫn "chạy":
//  1. Cron chạy hai lần trong ngày (hoặc hai lượt chồng nhau) ⇒ người dùng nhận hai thư cùng mốc.
//  2. Resend lỗi ⇒ mốc bị đánh dấu "đã gửi" ⇒ người dùng không bao giờ được nhắc.
//  3. Gia hạn xong vẫn nhận thư "đã hết hạn" của kỳ cũ (khoá mốc không gắn với pro_until).
//  4. Người bị hoàn tiền/thu hồi nhận thư "hãy gia hạn"; người chưa xác minh email nhận thư.
//  5. Link huỷ nhận đoán được (chỉ có userId) ⇒ người khác tắt thư của nạn nhân.
//  6. `/run` mở toang khi INTERNAL_API_TOKEN chưa đặt.
//  7. Câu chữ trôi khỏi nguyên văn bộ quy ước.
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.SITE_URL = 'https://tsudev.test'
process.env.RESEND_API_KEY = 'test-resend'
process.env.INTERNAL_API_TOKEN = 'test-internal-token'
process.env.RATE_LIMIT_PRO_REMINDER_MAX = '1000'

export {}

const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { prisma } = require('@tsudev/db')
const pr = require('../src/proReminders')
const { app } = require('../src/index')

const DAY = 24 * 60 * 60 * 1000
const P = 'test-nhac-'
const NOW = Date.UTC(2027, 0, 15, 1, 23)

type Sent = { to: string; subject: string; html: string; headers?: Record<string, string> }
let sent: Sent[] = []
let failNext = 0
const realFetch = global.fetch

beforeAll(() => {
  global.fetch = (async (url: string, init: { body: string }) => {
    if (new URL(String(url)).host === 'api.resend.com') {
      if (failNext > 0) {
        failNext--
        return new Response('boom', { status: 500 })
      }
      sent.push(JSON.parse(init.body))
      return new Response('{}', { status: 200 })
    }
    return realFetch(url, init as RequestInit)
  }) as typeof fetch
})

const cleanup = () => prisma.user.deleteMany({ where: { username: { startsWith: P } } })

beforeEach(async () => {
  sent = []
  failNext = 0
  await cleanup()
})

afterAll(async () => {
  global.fetch = realFetch
  await cleanup()
  await prisma.$disconnect()
})

const mk = async (
  name: string,
  proUntil: number,
  o: { verified?: boolean; optOut?: boolean; revoked?: boolean } = {}
) => {
  const u = await prisma.user.create({
    data: {
      username: `${P}${name}`,
      email: `${P}${name}@tsudev.local`,
      role: 'MEMBER',
      emailVerifiedAt: o.verified === false ? null : new Date(NOW - 100 * DAY),
    },
  })
  await prisma.entitlement.create({
    data: {
      userId: u.id,
      proUntil: new Date(proUntil),
      remindersOptOutAt: o.optOut ? new Date(NOW - DAY) : null,
    },
  })
  if (o.revoked)
    await prisma.entitlementEvent.create({
      data: { userId: u.id, kind: 'admin.revoke', proUntil: new Date(proUntil) },
    })
  return u
}

const mine = (s: Sent[]) => s.filter((m) => m.to.startsWith(P))

describe('dueKind - cửa sổ mốc', () => {
  const pu = new Date(NOW)
  it.each([
    [-8 * DAY, null],
    [-7 * DAY, 'before7'],
    [-1, 'before7'],
    [0, 'expired'],
    [7 * DAY - 1, 'expired'],
    [7 * DAY, null],
    // Mốc "trước khi xoá bản sao đám mây" đã bỏ (PRODUCT_POLICY v2.0.0 mục 7).
    [60 * DAY, null],
    [83 * DAY, null],
  ])('lệch %d ms ⇒ %s', (d, k) => {
    expect(pr.dueKind(pu, NOW + d)).toBe(k)
  })
})

describe('runReminders', () => {
  it('gửi đúng mốc, mỗi mốc MỘT thư dù chạy hai lần', async () => {
    await mk('a7', NOW + 3 * DAY)
    await mk('het', NOW - DAY)
    await mk('x30', NOW - 61 * DAY)
    await mk('x7', NOW - 84 * DAY)
    await mk('xa', NOW + 30 * DAY)
    await pr.runReminders(NOW)
    const first = mine(sent)
    // Hết kỳ lâu rồi (x30, x7) ⇒ không còn thư nào: không còn bản sao đám mây để báo xoá.
    expect(first.map((m) => m.to.replace(P, '').split('@')[0]).sort()).toEqual(['a7', 'het'])
    sent = []
    await pr.runReminders(NOW + 3600_000)
    expect(mine(sent)).toHaveLength(0)
  })

  it('câu chữ: số ngày còn lại, ngày DD/MM/YYYY, link Gia hạn + huỷ nhận + List-Unsubscribe', async () => {
    const pu = Date.UTC(2027, 0, 18, 10) // 18/01/2027 17:00 giờ VN
    const u = await mk('chu', pu)
    await pr.runReminders(NOW)
    const m = mine(sent)[0] as Sent
    expect(m.subject).toBe('Gia hạn TsuDEV Pro')
    expect(m.html).toContain('hết hạn sau 4 ngày (ngày 18/01/2027)')
    expect(m.html).toContain('https://tsudev.test/pro"')
    const link = pr.unsubscribeUrl(u.id)
    expect(m.html).toContain(link.replace(/&/g, '&amp;'))
    expect(m.headers?.['List-Unsubscribe']).toBe(
      `<https://tsudev.test/api/pro/huy-nhac?${link.split('?')[1]}>`
    )
    expect(m.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })

  it('không thư nào nhắc tới đồng bộ/đám mây (SYN1)', async () => {
    await mk('sy7', NOW + 3 * DAY)
    await mk('syhet', NOW - DAY)
    await pr.runReminders(NOW)
    const m = mine(sent)
    expect(m).toHaveLength(2)
    for (const x of m) expect(x.html).not.toMatch(/đồng bộ|đám mây/i)
  })

  it('không gửi: chưa xác minh email, đã huỷ nhận, bị thu hồi', async () => {
    await mk('chuaxm', NOW - DAY, { verified: false })
    await mk('huy', NOW - DAY, { optOut: true })
    await mk('thuhoi', NOW - DAY, { revoked: true })
    await pr.runReminders(NOW)
    expect(mine(sent)).toHaveLength(0)
  })

  it('Resend hỏng ⇒ không đánh dấu, lượt sau gửi lại', async () => {
    await mk('loi', NOW - DAY)
    failNext = 1
    const r1 = await pr.runReminders(NOW)
    expect(r1.failed).toBeGreaterThanOrEqual(1)
    expect(mine(sent)).toHaveLength(0)
    await pr.runReminders(NOW)
    expect(mine(sent)).toHaveLength(1)
  })

  it('gia hạn ⇒ pro_until mới ⇒ chu kỳ nhắc mới', async () => {
    const u = await mk('giahan', NOW + 2 * DAY)
    await pr.runReminders(NOW)
    expect(mine(sent)).toHaveLength(1)
    sent = []
    const moi = NOW + 2 * DAY + 365 * DAY
    await prisma.entitlement.update({ where: { userId: u.id }, data: { proUntil: new Date(moi) } })
    await pr.runReminders(moi - 3 * DAY)
    expect(mine(sent)).toHaveLength(1)
  })
})

describe('link huỷ nhận', () => {
  it('HMAC đúng ⇒ tắt thư; sai/ghép userId khác ⇒ 400', async () => {
    const a = await mk('ua', NOW - DAY)
    const b = await mk('ub', NOW - DAY)
    const ta = pr.unsubscribeToken(a.id)
    await request(app).post('/ent/reminders/unsubscribe').send({ u: b.id, t: ta }).expect(400)
    await request(app).post('/ent/reminders/unsubscribe').send({ u: a.id, t: 'x' }).expect(400)
    // One-Click RFC 8058: tham số trong URL, thân form.
    await request(app)
      .post(`/ent/reminders/unsubscribe?u=${encodeURIComponent(a.id)}&t=${ta}`)
      .type('form')
      .send('List-Unsubscribe=One-Click')
      .expect(200)
    const ea = await prisma.entitlement.findUnique({ where: { userId: a.id } })
    const eb = await prisma.entitlement.findUnique({ where: { userId: b.id } })
    expect(ea.remindersOptOutAt).not.toBeNull()
    expect(eb.remindersOptOutAt).toBeNull()
  })

  it('GET không huỷ (trình quét link trong hộp thư)', async () => {
    const a = await mk('get', NOW - DAY)
    await request(app)
      .get(`/ent/reminders/unsubscribe?u=${a.id}&t=${pr.unsubscribeToken(a.id)}`)
      .expect(404)
  })
})

describe('/ent/reminders/run', () => {
  it('thiếu/sai token ⇒ 401; chưa đặt INTERNAL_API_TOKEN ⇒ 503', async () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {})
    await request(app).post('/ent/reminders/run').expect(401)
    await request(app).post('/ent/reminders/run').set('x-internal-token', 'sai').expect(401)
    // Từ chối phải để lại dấu vết ở log Render (lượt 21/11/2026 im lặng), không lộ token.
    const logs = err.mock.calls.map((c) => String(c[0]))
    expect(logs).toContain('[auth] thư nhắc Pro: TỪ CHỐI 401 - x-internal-token thiếu')
    expect(logs).toContain('[auth] thư nhắc Pro: TỪ CHỐI 401 - x-internal-token lệch')
    err.mockRestore()
    const keep = process.env.INTERNAL_API_TOKEN
    delete process.env.INTERNAL_API_TOKEN
    await request(app).post('/ent/reminders/run').set('x-internal-token', 'sai').expect(503)
    process.env.INTERNAL_API_TOKEN = keep
  })

  it('token đúng ⇒ 200 + báo cáo', async () => {
    const r = await request(app)
      .post('/ent/reminders/run')
      .set('x-internal-token', 'test-internal-token')
      .expect(200)
    expect(r.body).toHaveProperty('sent')
    expect(r.headers['cache-control']).toBe('no-store')
  })
})

describe('nguyên văn PRODUCT_POLICY 7.6', () => {
  const policy = fs
    .readFileSync(path.join(__dirname, '../../../.standards/docs/PRODUCT_POLICY.md'), 'utf8')
    .replace(/\s*\n\s*/g, ' ')
  it.each([
    ['before7.title', pr.TEXT.before7.title],
    ['before7.body', pr.TEXT.before7.body],
    ['expired.title', pr.TEXT.expired.title],
    ['expired.body', pr.TEXT.expired.body],
  ])('%s có trong bộ quy ước', (_k, text) => {
    expect(policy).toContain(text)
  })
})
