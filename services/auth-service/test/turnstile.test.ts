// P1.7 Turnstile (D9). Không gọi mạng thật: fetcher tiêm, hoặc `global.fetch` giả
// cho phần route.
export {}

process.env.NODE_ENV = 'test'
delete process.env.INTERNAL_API_TOKEN

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { verifyTurnstile, assertTurnstileConfig, turnstileBlocks } = require('../src/turnstile')

describe('verifyTurnstile', () => {
  test('chưa cấu hình khoá ⇒ skipped, không chặn', async () => {
    const r = await verifyTurnstile('', null, async () => ({ success: false }), '')
    expect(r).toBe('skipped')
    expect(turnstileBlocks(r)).toBe(false)
  })

  test('có khoá mà thiếu token ⇒ invalid, CHẶN (không gọi siteverify)', async () => {
    const fetcher = jest.fn()
    const r = await verifyTurnstile(undefined, null, fetcher, 'khoa')
    expect(r).toBe('invalid')
    expect(turnstileBlocks(r)).toBe(true)
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('gửi đúng secret + token + IP cho siteverify; success ⇒ ok', async () => {
    let sent: URLSearchParams | null = null
    const r = await verifyTurnstile(
      'tok',
      '203.0.113.5',
      async (b: URLSearchParams) => {
        sent = b
        return { success: true }
      },
      'khoa'
    )
    expect(r).toBe('ok')
    expect(sent!.get('secret')).toBe('khoa')
    expect(sent!.get('response')).toBe('tok')
    expect(sent!.get('remoteip')).toBe('203.0.113.5')
  })

  test('siteverify từ chối ⇒ invalid; không trả lời ⇒ unavailable (fail-open)', async () => {
    expect(await verifyTurnstile('t', null, async () => ({ success: false }), 'k')).toBe('invalid')
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const r = await verifyTurnstile('t', null, async () => null, 'k')
    expect(r).toBe('unavailable')
    expect(turnstileBlocks(r)).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('assertTurnstileConfig', () => {
  test('TURNSTILE_REQUIRED=1 mà thiếu khoá ⇒ ném (từ chối khởi động)', () => {
    expect(() => assertTurnstileConfig({ TURNSTILE_REQUIRED: '1' })).toThrow(/TURNSTILE/)
  })
  test('production thiếu khoá (chưa bắt buộc) ⇒ log lỗi, KHÔNG ném', () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => assertTurnstileConfig({ NODE_ENV: 'production' })).not.toThrow()
    expect(err).toHaveBeenCalled()
    err.mockRestore()
  })
  test('có khoá ⇒ im lặng', () => {
    expect(() =>
      assertTurnstileConfig({ TURNSTILE_SECRET_KEY: 'k', TURNSTILE_REQUIRED: '1' })
    ).not.toThrow()
  })
})

describe('route: đăng ký và quên mật khẩu đòi Turnstile khi đã cấu hình', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const request = require('supertest')
  let app: unknown
  const realFetch = global.fetch
  beforeAll(() => {
    process.env.TURNSTILE_SECRET_KEY = 'khoa-thu'
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      app = require('../src/index').app
    })
    global.fetch = (async () =>
      new Response(JSON.stringify({ success: false }), { status: 200 })) as typeof fetch
  })
  afterAll(async () => {
    global.fetch = realFetch
    delete process.env.TURNSTILE_SECRET_KEY
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await require('@tsudev/db').prisma.$disconnect()
  })

  test('register token sai ⇒ 400 turnstile_failed', async () => {
    const res = await request(app).post('/api/identity/register').send({
      username: 'khong-tao',
      email: 'x@tsudev.local',
      password: 'x',
      turnstileToken: 'sai',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('turnstile_failed')
  })

  test('request-password-reset thiếu token ⇒ 400, giống nhau với mọi email', async () => {
    const a = await request(app)
      .post('/api/identity/request-password-reset')
      .send({ email: 'a@x.vn' })
    const b = await request(app)
      .post('/api/identity/request-password-reset')
      .send({ email: 'khong@co.vn' })
    expect(a.status).toBe(400)
    expect(b.body).toEqual(a.body)
  })
})
