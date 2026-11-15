// Giữ tệp là MODULE.
export {}

process.env.NODE_ENV = 'test'
process.env.INTERNAL_API_TOKEN = 'token-noi-bo-chi-de-test-khong-phai-bi-mat'
process.env.RATE_LIMIT_SENSITIVE_MAX = '5'
process.env.RATE_LIMIT_IDENTITY_MAX = '1000'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require('@tsudev/db')

const TOKEN = process.env.INTERNAL_API_TOKEN as string

/**
 * Bộ đếm tần suất LƯU BỀN (P1.6, G9, D8). Hai điều bộ đếm trong RAM không làm được:
 *
 * 1. NGUYÊN TỬ dưới tải đồng thời: 20 yêu cầu cùng lúc ⇒ ĐÚNG `max` lọt qua. Một
 *    bản đọc-rồi-ghi sẽ cho lọt nhiều hơn, đúng lúc bị dò dồn dập.
 * 2. Sống qua KHỞI ĐỘNG LẠI: nạp lại module (tiến trình mới) vẫn chặn tiếp.
 */
const goi = (app: unknown, ip: string) =>
  request(app)
    .post('/api/identity/reset-password')
    .set('x-internal-token', TOKEN)
    .set('x-forwarded-for', ip)
    .send({})

const freshApp = (): unknown => {
  let app: unknown
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    app = require('../src/index').app
  })
  return app
}

// Nạp lại cả app (isolateModules) + có thể đợi qua ranh giới phút ⇒ rộng tay.
jest.setTimeout(30_000)

beforeAll(() => prisma.rateLimitBucket.deleteMany({}))
afterAll(() => prisma.$disconnect())

// Cửa sổ cố định 60s: chạy sát ranh giới phút thì nửa số yêu cầu rơi sang cửa sổ
// mới. Đợi qua ranh giới nếu còn dưới 5s - test phải chứng minh ngưỡng, không
// phải chứng minh may mắn.
const awayFromBoundary = async () => {
  const left = 60_000 - (Date.now() % 60_000)
  if (left < 5000) await new Promise((r) => setTimeout(r, left + 200))
}

test('20 yêu cầu đồng thời ⇒ đúng 5 lọt qua, 15 bị 429', async () => {
  await awayFromBoundary()
  const app = freshApp()
  const res = await Promise.all(Array.from({ length: 20 }, () => goi(app, '203.0.113.41')))
  const blocked = res.filter((r: { status: number }) => r.status === 429).length
  expect(blocked).toBe(15)
})

test('khởi động lại (nạp lại module) KHÔNG trả lại lượt', async () => {
  await awayFromBoundary()
  const first = freshApp()
  for (let i = 0; i < 5; i++) expect((await goi(first, '203.0.113.42')).status).not.toBe(429)
  const second = freshApp()
  const res = await goi(second, '203.0.113.42')
  expect(res.status).toBe(429)
  expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
})

test('kho hỏng ⇒ cho qua (fail-open), không làm sập đường nhạy cảm', async () => {
  const { createRateLimit } = await import('@tsudev/ratelimit')
  const mw = createRateLimit({
    name: 'thu-kho-hong',
    windowMs: 60_000,
    max: 1,
    store: { hit: () => Promise.reject(new Error('mất kết nối')) },
  })
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
  const next = jest.fn()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mw({ headers: {}, ip: '1.2.3.4' } as any, {} as any, next)
  await new Promise((r) => setImmediate(r))
  expect(next).toHaveBeenCalledTimes(1)
  expect(spy).toHaveBeenCalled()
  spy.mockRestore()
})
