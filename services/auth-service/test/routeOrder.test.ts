// Giữ tệp là MODULE (scope riêng), tránh trùng tên biến top-level với test khác.
export {}

process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET =
  process.env.INTERNAL_IDENTITY_SECRET || 'khoa-test-du-dai-cho-hmac-256-bit!!'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../src/index')

/**
 * Mọi route dưới /api phải đứng SAU một tầng giới hạn tần suất áp được cho nó.
 *
 * Vì sao test này tồn tại: CodeQL (js/missing-rate-limiting) chỉ nhận ra các thư
 * viện quen như express-rate-limit, không nhận ra `@tsudev/ratelimit`, nên nó báo
 * MỌI route ở đây là "thiếu giới hạn" - 28 cảnh báo dương tính giả đã được dismiss
 * ngày 06/11/2026 kèm lý do trỏ về test này. Dismiss mà không có gì canh thì một
 * route thật sự lọt ra ngoài limiter sẽ chìm giữa đống cảnh báo giả.
 *
 * Cách kiểm: đọc thẳng router stack của Express (thứ tự là thứ tự mount) và hỏi
 * chính layer của limiter "có khớp đường dẫn của route này không" bằng
 * `layer.match()` - đúng phép khớp Express dùng lúc chạy.
 */
type Layer = {
  name: string
  route?: { path: string | string[] }
  match: (path: string) => boolean
}

const stack: Layer[] = (app.router ?? app._router).stack
const paths = (p: string | string[]): string[] => (Array.isArray(p) ? p : [p])

describe('auth-service - limiter đứng trước mọi route /api', () => {
  const unguarded: string[] = []
  let apiRoutes = 0
  stack.forEach((layer, i) => {
    if (!layer.route) return
    for (const p of paths(layer.route.path)) {
      if (typeof p !== 'string' || !p.startsWith('/api')) continue
      apiRoutes += 1
      const guarded = stack.slice(0, i).some((l) => l.name === 'rateLimit' && l.match(p))
      if (!guarded) unguarded.push(p)
    }
  })

  it('có route /api để kiểm (test không rỗng một cách im lặng)', () => {
    expect(apiRoutes).toBeGreaterThan(0)
  })

  it('không route /api nào nằm ngoài tầng giới hạn tần suất', () => {
    expect(unguarded).toEqual([])
  })
})
