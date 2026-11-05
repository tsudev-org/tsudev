// Kiểm duyệt nội dung cho ADMIN: GET /api/admin/content + POST /api/admin/content/bulk.
//
// Lý do tồn tại: ~50 tài liệu trùng lặp do Toà soạn AI (đã gỡ) sinh ra trên
// production không gỡ được qua giao diện - route tác giả chỉ chạm bài của chính
// người gọi. Bất biến canh ở đây: chỉ ADMIN; chỉ xoá MỀM và khôi phục được; mỗi
// bản ghi đổi trạng thái có đúng một dòng nhật ký; trần lô.
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
delete process.env.INTERNAL_API_TOKEN

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { app } = require('../src/index')

const ADMIN = 'test-admin-moderation'
const MEMBER = 'test-member-moderation'
const PREFIX = 'test-kiem-duyet-'

const asUser = async (sub: string) => ({
  Authorization: `Bearer ${await signIdentity({ sub }, process.env.INTERNAL_IDENTITY_SECRET)}`,
})

const clean = () =>
  prisma.$transaction([
    prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_hard_delete = 'on'`),
    prisma.$executeRawUnsafe(`DELETE FROM "Doc" WHERE slug LIKE '${PREFIX}%'`),
    prisma.$executeRawUnsafe(`DELETE FROM "Post" WHERE slug LIKE '${PREFIX}%'`),
    prisma.$executeRawUnsafe(`DELETE FROM "TrustAuditLog" WHERE "targetLabel" LIKE '${PREFIX}%'`),
  ])

beforeAll(async () => {
  await clean()
  for (const [username, role] of [
    [ADMIN, 'ADMIN'],
    [MEMBER, 'MEMBER'],
  ]) {
    await prisma.user.upsert({
      where: { username },
      update: { role },
      create: { username, email: `${username}@tsudev.local`, displayName: username, role },
    })
  }
  await prisma.doc.create({
    data: { slug: `${PREFIX}ai-1`, title: 'AI 1', contentMd: 'x', authoredByAgentId: 'agent' },
  })
  await prisma.doc.create({
    data: { slug: `${PREFIX}ai-2`, title: 'AI 2', contentMd: 'xx', authoredByAgentId: 'agent' },
  })
  await prisma.doc.create({ data: { slug: `${PREFIX}nguoi`, title: 'Người', contentMd: 'abc' } })
}, 30000)

afterAll(async () => {
  await clean()
  await prisma.user.deleteMany({ where: { username: { in: [ADMIN, MEMBER] } } })
  await prisma.$disconnect()
})

const mine = (rows: { slug: string }[]) =>
  rows
    .map((r) => r.slug)
    .filter((x) => x.startsWith(PREFIX))
    .sort()

describe('content-service - kiểm duyệt nội dung', () => {
  test('không đăng nhập ⇒ 401; MEMBER ⇒ 403', async () => {
    expect((await request(app).get('/api/admin/content?kind=doc')).status).toBe(401)
    const r = await request(app)
      .get('/api/admin/content?kind=doc')
      .set(await asUser(MEMBER))
    expect(r.status).toBe(403)
    const b = await request(app)
      .post('/api/admin/content/bulk')
      .set(await asUser(MEMBER))
      .send({ kind: 'doc', action: 'hide', slugs: [`${PREFIX}ai-1`] })
    expect(b.status).toBe(403)
  })

  test('lọc nguồn: origin=agent chỉ ra bài do Toà soạn tạo, không trả thân bài', async () => {
    const r = await request(app)
      .get('/api/admin/content?kind=doc&origin=agent&pageSize=100')
      .set(await asUser(ADMIN))
    expect(r.status).toBe(200)
    expect(mine(r.body.data)).toEqual([`${PREFIX}ai-1`, `${PREFIX}ai-2`])
    const row = r.body.data.find((x: { slug: string }) => x.slug === `${PREFIX}ai-2`)
    expect(row).toMatchObject({ origin: 'agent', contentLength: 2 })
    expect(row.contentMd).toBeUndefined()
  })

  test('ẩn hàng loạt ⇒ biến khỏi danh sách sống, có nhật ký; khôi phục được', async () => {
    const admin = await asUser(ADMIN)
    const slugs = [`${PREFIX}ai-1`, `${PREFIX}ai-2`, `${PREFIX}khong-ton-tai`]
    const hide = await request(app)
      .post('/api/admin/content/bulk')
      .set(admin)
      .send({ kind: 'doc', action: 'hide', slugs })
    expect(hide.status).toBe(200)
    expect(hide.body.changed.sort()).toEqual([`${PREFIX}ai-1`, `${PREFIX}ai-2`])
    expect(hide.body.skipped).toEqual([`${PREFIX}khong-ton-tai`])

    // Đọc công khai không còn thấy.
    const pub = await request(app).get(`/api/docs/${PREFIX}ai-1`)
    expect(pub.status).toBe(404)

    const logs = await prisma.trustAuditLog.findMany({
      where: { targetLabel: { startsWith: PREFIX }, action: 'CONTENT_HIDE' },
    })
    expect(logs).toHaveLength(2)

    // Ẩn lại lần nữa không đổi gì và không ghi nhật ký ma.
    const again = await request(app)
      .post('/api/admin/content/bulk')
      .set(admin)
      .send({ kind: 'doc', action: 'hide', slugs: [`${PREFIX}ai-1`] })
    expect(again.body.changed).toEqual([])

    const trash = await request(app)
      .get('/api/admin/content?kind=doc&state=deleted&pageSize=100')
      .set(admin)
    expect(mine(trash.body.data)).toEqual([`${PREFIX}ai-1`, `${PREFIX}ai-2`])

    const restore = await request(app)
      .post('/api/admin/content/bulk')
      .set(admin)
      .send({ kind: 'doc', action: 'restore', slugs: [`${PREFIX}ai-1`] })
    expect(restore.body.changed).toEqual([`${PREFIX}ai-1`])
    expect((await request(app).get(`/api/docs/${PREFIX}ai-1`)).status).toBe(200)
  })

  test('đầu vào xấu ⇒ 400: kind lạ, action lạ, slug sai hình dạng, vượt trần lô', async () => {
    const admin = await asUser(ADMIN)
    const send = (body: unknown) =>
      request(app).post('/api/admin/content/bulk').set(admin).send(body)
    expect((await send({ kind: 'user', action: 'hide', slugs: ['a'] })).status).toBe(400)
    expect((await send({ kind: 'doc', action: 'purge', slugs: ['a'] })).status).toBe(400)
    expect((await send({ kind: 'doc', action: 'hide', slugs: ['../x'] })).status).toBe(400)
    const many = Array.from({ length: 201 }, (_, i) => `s-${i}`)
    expect((await send({ kind: 'doc', action: 'hide', slugs: many })).status).toBe(400)
  })
})
