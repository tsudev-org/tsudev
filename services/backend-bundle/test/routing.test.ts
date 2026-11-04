// Bất biến của chế độ gộp: mỗi tiền tố TỚI ĐƯỢC đúng app sở hữu nó.
//
// Nếu ai đó "đơn giản hoá" src/index.js thành `root.use(app)` nhiều lần, request
// của app sau sẽ đi vào app content trước và dính cổng chặn INTERNAL_API_TOKEN
// của nó - không có ngoại lệ nào ném ra, không log nào đỏ. Bài học gốc đến từ
// Con dấu tín nhiệm (đã gỡ 04/11/2026), phần chú thích dưới đây giữ làm hồ sơ.
//
// ⚠️ DẤU HIỆU PHÂN BIỆT ĐÃ PHẢI ĐỔI. Bản trước dùng mã trạng thái: huy hiệu SVG
// và danh bạ là endpoint CÔNG KHAI, nên 200 nghĩa là tới được trust còn 401
// nghĩa là bị content nuốt. Từ khi Con dấu về chế độ mời, chính app trust cũng
// trả 401 cho request không mang danh tính - hai khả năng cho ra CÙNG một mã, và
// một test không phân biệt được hai trạng thái nó sinh ra để phân biệt là một
// test đã chết mà vẫn xanh.
//
// Dấu hiệu nay là THÂN phản hồi: cổng của content nói 'Thiếu hoặc sai
// x-internal-token', cổng danh tính của trust nói 'Missing or invalid
// Authorization header'. Hai chuỗi đó do hai middleware khác nhau sinh ra, nên
// chúng thật sự chỉ ra request đã đi tới đâu.
//
// Đặt biến TRƯỚC khi require app: giá trị được đọc lúc module nạp.
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.INTERNAL_API_TOKEN = 'test-token'
const request = require('supertest')
const { app, SERVICES } = require('../src/index')

const { signIdentity } = require('@tsudev/identity-token')

/** Header Authorization như BFF sẽ gửi - thay cho header `x-dev-user` đã gỡ. */
const asUser = async (sub: string) => ({
  Authorization: `Bearer ${await signIdentity({ sub }, process.env.INTERNAL_IDENTITY_SECRET)}`,
})

afterAll(() => {
  delete process.env.INTERNAL_API_TOKEN
})

/** Thân 401 của cổng INTERNAL_API_TOKEN ở app content. Thấy nó ⇒ đã bị nuốt. */
const CONTENT_GATE = 'Thiếu hoặc sai x-internal-token'

describe('backend-bundle - JWKS ký bản phát hành tới được content và CÔNG KHAI', () => {
  test('JWKS trả 200 dù INTERNAL_API_TOKEN đang bật', async () => {
    // Bằng chứng mạnh nhất: nội dung thật, không cần danh tính. 401 = bị cổng
    // token nuốt; 404 = thiếu '/.well-known' trong bảng tiền tố.
    const res = await request(app).get('/.well-known/tsudev-release-jwks.json')
    expect(res.status).toBe(200)
    expect(res.body.keys.length).toBeGreaterThan(0)
    expect(res.body.keys[0]).toMatchObject({ kty: 'OKP', crv: 'Ed25519', alg: 'EdDSA' })
  })
})

describe('backend-bundle - Con dấu tín nhiệm đã gỡ (04/11/2026)', () => {
  // Gỡ cũng là đổi bề mặt - và chỗ thứ tư (tệp này) là chỗ từng lọt lưới.
  test('/api/trust/* và JWKS cũ ⇒ 404', async () => {
    expect((await request(app).get('/api/trust/directory')).status).toBe(404)
    expect((await request(app).get('/api/trust/seal/x.svg')).status).toBe(404)
    expect((await request(app).get('/.well-known/tsudev-trust-jwks.json')).status).toBe(404)
  })
})

describe('backend-bundle - cổng chặn của content và storage vẫn nguyên vẹn', () => {
  test('/api/posts thiếu x-internal-token ⇒ 401', async () => {
    const res = await request(app)
      .get('/api/posts')
      .set(await asUser('tester'))
    expect(res.status).toBe(401)
  })

  test('/api/posts đúng token ⇒ không còn 401 vì token', async () => {
    const res = await request(app)
      .get('/api/posts')
      .set('x-internal-token', 'test-token')
      .set(await asUser('tester'))
    expect(res.status).not.toBe(401)
  })

  test('/api/presign thiếu x-internal-token ⇒ 401', async () => {
    const res = await request(app).get('/api/presign')
    expect(res.status).toBe(401)
  })

  // Tiền tố MỚI dễ lọt lưới nhất: '/api/author/*' (đường ghi bài của AUTHOR) là
  // của content nhưng chỉ sống ở production nếu có trong bảng tiền tố. Thân 401
  // phải là cổng token của CONTENT - chứng minh request đã tới đúng app, không
  // phải 404 vì thiếu tiền tố.
  test('/api/author/posts thiếu token ⇒ dừng ở cổng của CONTENT, không 404', async () => {
    const res = await request(app).get('/api/author/posts')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe(CONTENT_GATE)
  })
})

describe('backend-bundle - điều phối và health', () => {
  test('/health trả 200 và kể tên đủ ba service', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.bundled).toEqual(['content', 'storage', 'identity'])
  })

  test('đường dẫn không thuộc bảng sở hữu ⇒ 404, không rơi nhầm vào service nào', async () => {
    const res = await request(app).get('/api/khong-ai-so-huu')
    expect(res.status).toBe(404)
  })

  test('tiền tố so khớp theo ranh giới đoạn, không nuốt tên dài hơn', async () => {
    // '/api/postsomething' KHÔNG được coi là thuộc content chỉ vì bắt đầu bằng
    // '/api/posts'. Nếu bảng dùng startsWith trần thì đây là 401 (dính cổng
    // chặn của content) chứ không phải 404.
    const res = await request(app).get('/api/postsomething')
    expect(res.status).toBe(404)
  })

  test('bảng sở hữu không có tiền tố nào trùng nhau giữa hai service', () => {
    const seen = new Map()
    SERVICES.forEach((s: { name: string; prefixes: string[] }) =>
      s.prefixes.forEach((p) => {
        expect(seen.has(p)).toBe(false)
        seen.set(p, s.name)
      })
    )
  })
})

// Đánh dấu tệp này là MODULE. Không có import/export thì TypeScript coi nó là
// script toàn cục, và các biến top-level (`request`, `app`) của những tệp test
// khác nhau sẽ đụng tên nhau. Không đổi gì lúc chạy.
export {}

describe('backend-bundle - Toà soạn Agent AI đã gỡ (29/10/2026)', () => {
  // Gỡ cũng là đổi bề mặt. /api/newsroom/* phải 404 ở tầng bundle - còn sống
  // nghĩa là có một app ma vẫn được mount, và có thể vẫn gọi LLM.
  test('/api/newsroom/* ⇒ 404', async () => {
    expect((await request(app).post('/api/newsroom/tick')).status).toBe(404)
    expect((await request(app).get('/api/newsroom/state')).status).toBe(404)
  })
})
