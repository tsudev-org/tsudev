// Giữ tệp là MODULE (scope riêng), tránh trùng tên biến top-level với test khác.
export {}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest')

/**
 * SEC-11: `/debug/boom` là cò nổ CỐ Ý để nghiệm thu đường cảnh báo. Nó không cần
 * đăng nhập, nên ở production bất kỳ ai cũng bắn được cảnh báo thật về kênh trực.
 * Route chỉ được ĐĂNG KÝ ngoài production, và không biến môi trường nào mở lại
 * được (cửa `ENABLE_DEBUG_BOOM` cũ đã gỡ ở P4 PR 4.1).
 */
const loadApp = (env: Record<string, string | undefined>) => {
  const saved = { ...process.env }
  // EMBEDDED=1: ở NODE_ENV=production module tự mở cổng nếu không nhúng; như
  // backend-bundle, test chỉ cần `app`, không cần cổng.
  Object.assign(process.env, { EMBEDDED: '1' }, env)
  process.env.INTERNAL_IDENTITY_SECRET =
    process.env.INTERNAL_IDENTITY_SECRET || 'khoa-test-du-dai-cho-hmac-256-bit!!'
  let app: unknown
  jest.isolateModules(() => {
    app = require('../src/index').app
  })
  process.env = saved
  return app
}

describe('SEC-11 - /debug/boom chỉ tồn tại ngoài production', () => {
  test('ngoài production: route có và trả 500', async () => {
    const app = loadApp({ NODE_ENV: 'test' })
    const res = await request(app).get('/debug/boom')
    expect(res.status).toBe(500)
  })

  test('production: route KHÔNG được đăng ký (404)', async () => {
    const app = loadApp({ NODE_ENV: 'production' })
    const res = await request(app).get('/debug/boom')
    expect(res.status).toBe(404)
  })

  test('production + ENABLE_DEBUG_BOOM=true: vẫn 404 - cửa mở lại đã gỡ', async () => {
    const app = loadApp({ NODE_ENV: 'production', ENABLE_DEBUG_BOOM: 'true' })
    const res = await request(app).get('/debug/boom')
    expect(res.status).toBe(404)
  })
})
