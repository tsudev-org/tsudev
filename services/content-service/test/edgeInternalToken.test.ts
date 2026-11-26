// CP2 - chữ ký biên `X-Tsu-Edge` hợp lệ thay được `INTERNAL_API_TOKEN` tĩnh ở cổng `/api` (ADR-0005 mục 5).
// Worker mới (`console.`) gọi backend bằng khoá biên RIÊNG, không chép token tĩnh dùng chung sang. Thiếu/sai chữ ký
// mà không có token ⇒ vẫn 401 như cũ.
export {}
process.env.INTERNAL_API_TOKEN = 'token-tinh-cho-test-0123456789'
const request = require('supertest')
const { signEdge } = require('@tsudev/auth')
const { app } = require('../src/index')

const KEY = 'khoa-bien-console-cho-test'
afterEach(() => {
  delete process.env.EDGE_SIGNING_KEY
  delete process.env.EDGE_SIGNING_KEY_CONSOLE
})

test('không token, không chữ ký ⇒ 401', async () => {
  process.env.EDGE_SIGNING_KEY_CONSOLE = KEY
  const r = await request(app).get('/api/posts')
  expect(r.status).toBe(401)
})

test('không token nhưng chữ ký biên của console hợp lệ ⇒ qua cổng /api', async () => {
  process.env.EDGE_SIGNING_KEY_CONSOLE = KEY
  const r = await request(app)
    .get('/api/posts')
    .set('x-tsu-edge', signEdge(KEY, 'GET', '/api/posts'))
  expect(r.status).not.toBe(401)
})

test('chữ ký của path khác (phát lại) ⇒ 401', async () => {
  process.env.EDGE_SIGNING_KEY_CONSOLE = KEY
  const r = await request(app)
    .get('/api/posts')
    .set('x-tsu-edge', signEdge(KEY, 'GET', '/api/projects'))
  expect(r.status).toBe(401)
})

test('token tĩnh vẫn chạy (Worker cũ)', async () => {
  const r = await request(app)
    .get('/api/posts')
    .set('x-internal-token', 'token-tinh-cho-test-0123456789')
  expect(r.status).not.toBe(401)
})
