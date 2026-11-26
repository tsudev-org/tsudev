// CP1 - khoá origin `X-Tsu-Edge` (@tsudev/auth edge.ts, ADR-0005 mục 5).
//
// Hàm thuần + middleware thật trong app content. Biến môi trường đọc LÚC REQUEST nên đặt/xoá theo từng bài được.
// Vectơ thử dưới đây PHẢI trùng `apps/frontend-main/test/edgeSign.test.ts` - ba bên ký/kiểm (Node backend,
// Worker Next dùng node:crypto, Worker cron dùng WebCrypto) khớp nhau qua đúng hai chuỗi này.
const request = require('supertest')
const {
  evaluateEdge,
  signEdge,
  edgeMode,
  edgeStats,
  pathPrefix,
  uaKind,
  __resetEdgeStats,
} = require('@tsudev/auth')
const { app } = require('../src/index')

const KEY = 'tsu-edge-vector-key'
const NOW = 1764100000_000
const VECTOR_POST = '1764100000.OXHN5jZBVaEJsftcHWL-ICHATMLriSmXaxCx-lHmTj4' // POST /api/internal/post-views
const VECTOR_GET = '1764100000.Vn1-eCkSGQBlnerVWPNDQav3JPY-J-L8hdy0Mz8neWY' // GET /api/posts

const clearEnv = () => {
  delete process.env.EDGE_SIGNING_KEY
  delete process.env.EDGE_SIGNING_KEY_PREV
  delete process.env.EDGE_MODE
}
afterEach(() => {
  clearEnv()
  __resetEdgeStats()
})

describe('evaluateEdge - hàm thuần', () => {
  const base = { method: 'GET', pathname: '/api/posts', keys: [KEY], nowMs: NOW }

  test('vectơ chung: signEdge ra đúng chuỗi mà hai Worker ký', () => {
    expect(signEdge(KEY, 'POST', '/api/internal/post-views', NOW)).toBe(VECTOR_POST)
    expect(signEdge(KEY, 'get', '/api/posts', NOW)).toBe(VECTOR_GET)
  })

  test('chữ ký đúng ⇒ ky', () => {
    expect(evaluateEdge({ ...base, header: VECTOR_GET })).toBe('ky')
  })

  test('thiếu header ⇒ thieu; /health ⇒ mien', () => {
    expect(evaluateEdge({ ...base })).toBe('thieu')
    expect(evaluateEdge({ ...base, pathname: '/health' })).toBe('mien')
  })

  test('phát lại sang path khác hoặc method khác ⇒ sai', () => {
    expect(evaluateEdge({ ...base, pathname: '/api/admin/projects', header: VECTOR_GET })).toBe(
      'sai'
    )
    expect(evaluateEdge({ ...base, method: 'POST', header: VECTOR_GET })).toBe('sai')
  })

  test('lệch giờ > 300 s ⇒ het_han; ≤ 300 s ⇒ ky', () => {
    expect(evaluateEdge({ ...base, header: VECTOR_GET, nowMs: NOW + 301_000 })).toBe('het_han')
    expect(evaluateEdge({ ...base, header: VECTOR_GET, nowMs: NOW - 301_000 })).toBe('het_han')
    expect(evaluateEdge({ ...base, header: VECTOR_GET, nowMs: NOW + 300_000 })).toBe('ky')
  })

  test('khoá sai, ts hỏng, chữ ký cắt cụt ⇒ sai', () => {
    expect(evaluateEdge({ ...base, keys: ['khoa-khac'], header: VECTOR_GET })).toBe('sai')
    expect(evaluateEdge({ ...base, header: 'abc.' + VECTOR_GET.split('.')[1] })).toBe('sai')
    expect(evaluateEdge({ ...base, header: VECTOR_GET.slice(0, -2) })).toBe('sai')
    expect(evaluateEdge({ ...base, header: '.x' })).toBe('sai')
  })

  test('xoay khoá: khoá cũ trong danh sách vẫn ky', () => {
    expect(evaluateEdge({ ...base, keys: ['khoa-moi', KEY], header: VECTOR_GET })).toBe('ky')
  })

  test('edgeMode mặc định ghi; tiền tố không giữ slug; loại UA', () => {
    expect(edgeMode(undefined)).toBe('ghi')
    expect(edgeMode('CHAN')).toBe('chan')
    expect(edgeMode('bat-bua')).toBe('ghi')
    expect(pathPrefix('/api/posts/bi-mat-123')).toBe('/api/posts')
    expect(uaKind('curl/8.5')).toBe('cong-cu')
    expect(uaKind('Mozilla/5.0')).toBe('trinh-duyet')
    expect(uaKind('Render/1.0')).toBe('render')
    expect(uaKind('')).toBe('rong')
  })
})

describe('edgeGuard trong app content', () => {
  const P = '/api/khong-ton-tai-cp1'

  test('không có khoá ⇒ không làm gì (dev/CI)', async () => {
    process.env.EDGE_MODE = 'chan'
    const res = await request(app).get(P)
    expect(res.status).not.toBe(403)
    expect(edgeStats().totals).toEqual({})
  })

  test('ghi: thiếu chữ ký vẫn cho qua nhưng bị đếm theo lý do/tiền tố/UA', async () => {
    process.env.EDGE_SIGNING_KEY = KEY
    const res = await request(app).get(P).set('user-agent', 'curl/8')
    expect(res.status).not.toBe(403)
    const s = edgeStats()
    expect(s.mode).toBe('ghi')
    expect(s.active).toBe(true)
    expect(s.counts).toEqual({ [`thieu|GET /api/khong-ton-tai-cp1|cong-cu`]: 1 })
    expect(JSON.stringify(s)).not.toContain(KEY)
  })

  test('chan: thiếu/sai ⇒ 403 edge_required; ký đúng ⇒ đi tiếp', async () => {
    process.env.EDGE_SIGNING_KEY = KEY
    process.env.EDGE_MODE = 'chan'
    expect((await request(app).get(P)).status).toBe(403)
    const sai = await request(app)
      .get(P)
      .set('x-tsu-edge', signEdge('khoa-khac', 'GET', P))
    expect(sai.status).toBe(403)
    expect(sai.body.error).toBe('edge_required')
    const dung = await request(app)
      .get(`${P}?a=1`)
      .set('x-tsu-edge', signEdge(KEY, 'GET', P))
    expect(dung.status).not.toBe(403)
    expect(edgeStats().totals).toEqual({ thieu: 1, sai: 1, ky: 1 })
  })

  test('chan: /health vẫn mở cho Render', async () => {
    process.env.EDGE_SIGNING_KEY = KEY
    process.env.EDGE_MODE = 'chan'
    expect((await request(app).get('/health')).status).toBe(200)
  })

  test('tat: không kiểm, không đếm (rollback không cần deploy)', async () => {
    process.env.EDGE_SIGNING_KEY = KEY
    process.env.EDGE_MODE = 'tat'
    expect((await request(app).get(P)).status).not.toBe(403)
    expect(edgeStats().totals).toEqual({})
  })
})

export {}
