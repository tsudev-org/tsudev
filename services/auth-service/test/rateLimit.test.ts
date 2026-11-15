// Giữ tệp là MODULE.
export {}

process.env.NODE_ENV = 'test'
process.env.INTERNAL_API_TOKEN = 'token-noi-bo-chi-de-test-khong-phai-bi-mat'
process.env.RATE_LIMIT_SENSITIVE_MAX = '3'
process.env.RATE_LIMIT_IDENTITY_MAX = '1000'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../src/index')

const TOKEN = process.env.INTERNAL_API_TOKEN as string

// Tầng nhạy cảm nay đếm trong Postgres (G9) - xô của lượt chạy trước còn đó nếu
// chạy lại trong cùng phút. Dọn để test không phụ thuộc lượt trước.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require('@tsudev/db')
beforeAll(() => prisma.rateLimitBucket.deleteMany({}))
afterAll(() => prisma.$disconnect())

/**
 * Hai việc canh ở đây, cả hai từng HỞ trước 06/11/2026:
 *
 * 1. Token nội bộ so thời gian hằng - và vẫn TỪ CHỐI token sai/thiếu (đổi phép so
 *    mà lỡ tay làm nó luôn đúng là mở toang /api ra Internet).
 * 2. Route dò được bằng cách thử nhiều lần (mã 6 số, mật khẩu hiện tại…) có giới
 *    hạn tần suất THEO KHOÁ: trước đây chỉ đăng nhập có throttle.
 */
describe('cổng token nội bộ', () => {
  test('thiếu token ⇒ 401', async () => {
    const res = await request(app).post('/api/identity/register').send({})
    expect(res.status).toBe(401)
  })
  test('token sai (cùng độ dài) ⇒ 401', async () => {
    const res = await request(app)
      .post('/api/identity/register')
      .set('x-internal-token', TOKEN.replace(/.$/, 'X'))
      .send({})
    expect(res.status).toBe(401)
  })
  test('token sai (khác độ dài) ⇒ 401, không ném lỗi', async () => {
    const res = await request(app)
      .post('/api/identity/register')
      .set('x-internal-token', 'ngan')
      .send({})
    expect(res.status).toBe(401)
  })
})

describe('giới hạn tần suất route nhạy cảm', () => {
  test('quá ngưỡng ⇒ 429 kèm Retry-After, theo từng IP do BFF đặt', async () => {
    const goi = (ip: string) =>
      request(app)
        .post('/api/identity/reset-password')
        .set('x-internal-token', TOKEN)
        .set('x-forwarded-for', ip)
        .send({})

    for (let i = 0; i < 3; i++) expect((await goi('198.51.100.7')).status).not.toBe(429)
    const chan = await goi('198.51.100.7')
    expect(chan.status).toBe(429)
    expect(Number(chan.headers['retry-after'])).toBeGreaterThan(0)

    // IP khác là xô khác - không khoá lây sang người dùng khác.
    expect((await goi('198.51.100.8')).status).not.toBe(429)
  })
})
