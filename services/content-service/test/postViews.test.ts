// Lượt xem bài theo lô (POST /api/internal/post-views) - chỉ cron gọi.
//
// Canh: token riêng (503 khi thiếu cấu hình, 401 khi sai), ĐẶT chứ không cộng dồn
// (gửi lại cùng lô ra đúng số cũ - cron thử lại sau lỗi không làm phồng số), slug
// lạ bị bỏ qua, đầu vào xấu ⇒ 400.
process.env.POST_VIEWS_TOKEN = 'token-luot-xem-test'
delete process.env.INTERNAL_API_TOKEN

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { app } = require('../src/index')

const stamp = Date.now()
const SLUG = `test-luot-xem-${stamp}`
const DUONG = '/api/internal/post-views'
const TOKEN = { 'x-post-views-token': 'token-luot-xem-test' }
let postId = ''

beforeAll(async () => {
  const p = await prisma.post.create({
    data: {
      slug: SLUG,
      title: `Bài lượt xem ${stamp}`,
      contentMd: 'x',
      published: true,
      publishedAt: new Date(),
      searchTitleNorm: `bai luot xem ${stamp}`,
      searchBodyNorm: 'x',
    },
  })
  postId = p.id
})

afterAll(async () => {
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_hard_delete = 'on'`),
    prisma.$executeRawUnsafe(`DELETE FROM "Post" WHERE slug = $1`, SLUG),
  ])
  await prisma.$disconnect()
})

const soLuot = async (day: string) =>
  (
    await prisma.postViewDaily.findUnique({
      where: { postId_day: { postId, day: new Date(`${day}T00:00:00Z`) } },
    })
  )?.count

test('thiếu hoặc sai token ⇒ 401', async () => {
  expect((await request(app).post(DUONG).send({ items: [] })).status).toBe(401)
  expect(
    (await request(app).post(DUONG).set('x-post-views-token', 'sai').send({ items: [] })).status
  ).toBe(401)
})

test('đúng token ⇒ ghi; gửi lại cùng lô KHÔNG cộng dồn; slug lạ bị bỏ qua', async () => {
  const lo = {
    items: [
      { slug: SLUG, day: '2026-11-14', count: 7 },
      { slug: SLUG, day: '2026-11-15', count: 3 },
      { slug: `khong-co-bai-nay-${stamp}`, day: '2026-11-15', count: 99 },
    ],
  }
  const r1 = await request(app).post(DUONG).set(TOKEN).send(lo)
  expect(r1.status).toBe(200)
  expect(r1.body).toEqual({ nhan: 3, ghi: 2, boQua: 1 })
  const r2 = await request(app).post(DUONG).set(TOKEN).send(lo)
  expect(r2.status).toBe(200)
  expect(await soLuot('2026-11-14')).toBe(7)
  expect(await soLuot('2026-11-15')).toBe(3)
})

test.each([
  [{ items: 'x' }],
  [{ items: [{ slug: 'A HOA', day: '2026-11-15', count: 1 }] }],
  [{ items: [{ slug: 'ok', day: '15/11/2026', count: 1 }] }],
  [{ items: [{ slug: 'ok', day: '2026-11-15', count: -1 }] }],
  [{ items: [{ slug: 'ok', day: '2026-11-15', count: 1.5 }] }],
])('đầu vào xấu ⇒ 400 (%j)', async (body) => {
  expect((await request(app).post(DUONG).set(TOKEN).send(body)).status).toBe(400)
})
