// Mọi route của ba app con phải có tiền tố trong bảng SERVICES.
//
// Vì sao tồn tại: bundle điều phối theo BẢNG TIỀN TỐ. Route có tiền tố chưa nằm
// trong bảng vẫn sống khi chạy service riêng (dev, test của service) nhưng 404 ở
// production - không có gì báo lỗi. Đã xảy ra 2 lần: JWKS (04/11/2026) và
// `GET /api/releases` (khối "Tải app" ở trang chủ hiện lỗi từ #109 tới 05/11/2026).
// routing.test.ts chỉ kiểm các tiền tố ĐÃ biết; test này đọc route từ chính
// router của Express nên bắt được cả tiền tố hoàn toàn mới.
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
const { SERVICES } = require('../src/index')

type Layer = { route?: { path: string | string[] } }

const routesOf = (app: { _router?: { stack: Layer[] } }): string[] =>
  (app._router?.stack ?? [])
    .filter((l) => l.route)
    .flatMap((l) => (Array.isArray(l.route!.path) ? l.route!.path : [l.route!.path]))
    .filter((p): p is string => typeof p === 'string')

// Route của app con mà bundle CỐ Ý không phục vụ: /health của từng service bị
// /health của chính bundle che (xem src/index.ts).
const BUNDLE_OWNED = new Set(['/health'])

const owns = (prefix: string, path: string) => path === prefix || path.startsWith(prefix + '/')

describe('backend-bundle - mọi route của app con đều có tiền tố trong bảng', () => {
  type Svc = { name: string; prefixes: string[]; mod: { app: never } }
  test.each((SERVICES as Svc[]).map((s): [string, Svc] => [s.name, s]))('%s', (_name, svc) => {
    const routes = routesOf(svc.mod.app)
    expect(routes.length).toBeGreaterThan(0)
    const orphans = routes.filter(
      (r) => !BUNDLE_OWNED.has(r) && !svc.prefixes.some((p) => owns(p, r))
    )
    expect(orphans).toEqual([])
  })
})
