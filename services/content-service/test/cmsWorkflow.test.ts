// P2.2 nghiệm thu luồng CMS qua HTTP (DB thật): AUTHOR viết → gửi duyệt →
// MODERATOR duyệt → bài hiện ở /api/posts; trả về cần lý do; tác giả sửa bài đã
// đăng ⇒ chờ duyệt lại; mỗi lần lưu ghi lịch sử; khôi phục bản cũ.
process.env.NODE_ENV = 'test'
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
delete process.env.INTERNAL_API_TOKEN

export {}

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { app } = require('../src/index')

const stamp = Date.now()
const AUTH = `test-cms-author-${stamp}`
const MOD = `test-cms-mod-${stamp}`
const TOTP_ON = { secretEnc: 'test', confirmedAt: new Date() }
const ids: string[] = []

const as = async (sub: string) => ({
  Authorization: `Bearer ${await signIdentity({ sub }, process.env.INTERNAL_IDENTITY_SECRET)}`,
})
const mk = (username: string, role: string) =>
  prisma.user.create({
    data: {
      username,
      email: `${username}@tsudev.local`,
      role,
      emailVerifiedAt: new Date(),
      totp: { create: TOTP_ON },
    },
  })

beforeAll(async () => {
  ids.push((await mk(AUTH, 'AUTHOR')).id, (await mk(MOD, 'MODERATOR')).id)
})

afterAll(async () => {
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_hard_delete = 'on'`),
    prisma.$executeRawUnsafe(`DELETE FROM "Post" WHERE "authorId" = ANY($1)`, ids),
  ])
  await prisma.category.deleteMany({ where: { slug: { startsWith: `cm-${stamp}` } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

const slug = `bai-cms-${stamp}`
let postId = ''
const isPublic = async () =>
  ((await request(app).get('/api/posts').query({ limit: 50 })).body as { slug: string }[]).some(
    (p) => p.slug === slug
  )

test('AUTHOR viết → gửi duyệt → MODERATOR duyệt → bài hiện công khai', async () => {
  const created = await request(app)
    .post('/api/author/posts')
    .set(await as(AUTH))
    .send({ slug, title: `CMS ${stamp}`, contentMd: 'Bản đầu.' })
  expect(created.status).toBe(201)
  expect(created.body.status).toBe('DRAFT')
  postId = created.body.id
  expect(await isPublic()).toBe(false)

  const sub = await request(app)
    .post(`/api/author/posts/${slug}/transition`)
    .set(await as(AUTH))
    .send({ action: 'submit' })
  expect(sub.body.status).toBe('PENDING')

  // AUTHOR tự duyệt ⇒ 403.
  const self = await request(app)
    .post(`/api/author/posts/${slug}/transition`)
    .set(await as(AUTH))
    .send({ action: 'approve' })
  expect(self.status).toBe(403)

  const queue = await request(app)
    .get('/api/admin/posts')
    .set(await as(MOD))
  expect(queue.status).toBe(200)
  expect(queue.body.data.map((p: { id: string }) => p.id)).toContain(postId)

  const ok = await request(app)
    .post(`/api/admin/posts/${postId}/transition`)
    .set(await as(MOD))
    .send({ action: 'approve' })
  expect(ok.body.status).toBe('PUBLISHED')
  expect(await isPublic()).toBe(true)

  const events = await prisma.postStatusEvent.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
  })
  expect(events.map((e: { to: string }) => e.to)).toEqual(['DRAFT', 'PENDING', 'PUBLISHED'])
})

test('cạnh cấm qua HTTP ⇒ 409 (duyệt bài đã đăng)', async () => {
  const res = await request(app)
    .post(`/api/admin/posts/${postId}/transition`)
    .set(await as(MOD))
    .send({ action: 'approve' })
  expect(res.status).toBe(409)
})

test('tác giả sửa nội dung bài đã đăng ⇒ PENDING, gỡ khỏi công khai, ghi lịch sử', async () => {
  const res = await request(app)
    .patch(`/api/author/posts/${slug}`)
    .set(await as(AUTH))
    .send({ contentMd: 'Bản hai - đã tráo.' })
  expect(res.body.status).toBe('PENDING')
  expect(await isPublic()).toBe(false)
  const revs = await request(app)
    .get(`/api/author/posts/${slug}/revisions`)
    .set(await as(AUTH))
  expect(revs.body.meta.total).toBe(2)
})

test('trả về thiếu lý do ⇒ 400; có lý do ⇒ DRAFT + tác giả đọc được reviewNote', async () => {
  const bad = await request(app)
    .post(`/api/admin/posts/${postId}/transition`)
    .set(await as(MOD))
    .send({ action: 'reject' })
  expect(bad.status).toBe(400)
  const rej = await request(app)
    .post(`/api/admin/posts/${postId}/transition`)
    .set(await as(MOD))
    .send({ action: 'reject', note: 'Thiếu nguồn tham khảo' })
  expect(rej.body.status).toBe('DRAFT')
  const mine = await request(app)
    .get(`/api/author/posts/${slug}`)
    .set(await as(AUTH))
  expect(mine.body.reviewNote).toBe('Thiếu nguồn tham khảo')
})

test('khôi phục bản lịch sử đầu ⇒ nội dung cũ + thêm một bản lịch sử', async () => {
  const revs = await request(app)
    .get(`/api/author/posts/${slug}/revisions`)
    .set(await as(AUTH))
  const oldest = revs.body.data[revs.body.data.length - 1]
  const res = await request(app)
    .post(`/api/author/posts/${slug}/revisions/${oldest.id}/restore`)
    .set(await as(AUTH))
  expect(res.body.contentMd).toBe('Bản đầu.')
  const after = await request(app)
    .get(`/api/author/posts/${slug}/revisions`)
    .set(await as(AUTH))
  expect(after.body.meta.total).toBe(3)
})

test('trang soạn cũ gửi published:true ⇒ AUTHOR thành gửi duyệt, không đăng thẳng', async () => {
  const s2 = `${slug}-cu`
  const res = await request(app)
    .post('/api/author/posts')
    .set(await as(AUTH))
    .send({ slug: s2, title: `Cũ ${stamp}`, contentMd: 'x', published: true })
  expect(res.body.status).toBe('PENDING')
})

test('chuyên mục: MODERATOR tạo, bài gắn được, /api/posts lọc theo chuyên mục; ghim lên đầu', async () => {
  const cat = await request(app)
    .post('/api/admin/categories')
    .set(await as(MOD))
    .send({ name: 'Hướng dẫn', slug: `cm-${stamp}` })
  expect(cat.status).toBe(201)
  const pub = await request(app)
    .post('/api/author/posts')
    .set(await as(MOD))
    .send({
      slug: `${slug}-cm`,
      title: 'Có chuyên mục',
      contentMd: 'x',
      status: 'PUBLISHED',
      categoryId: cat.body.id,
    })
  expect(pub.body.categoryId).toBe(cat.body.id)
  const list = await request(app)
    .get('/api/posts')
    .query({ category: `cm-${stamp}` })
  expect(list.body.map((p: { slug: string }) => p.slug)).toEqual([`${slug}-cm`])
  const pin = await request(app)
    .post(`/api/admin/posts/${pub.body.id}/pin`)
    .set(await as(MOD))
    .send({ pinned: true })
  expect(pin.body.pinned).toBe(true)
  const first = (await request(app).get('/api/posts')).body[0]
  expect(first.slug).toBe(`${slug}-cm`)
  // Bài chưa công khai không ghim được.
  const pend = await request(app)
    .post(`/api/admin/posts/${postId}/pin`)
    .set(await as(MOD))
    .send({ pinned: true })
  expect(pend.status).toBe(409)
  await request(app)
    .post(`/api/admin/posts/${pub.body.id}/pin`)
    .set(await as(MOD))
    .send({ pinned: false })
  const cats = await request(app).get('/api/posts/categories')
  expect(cats.body.some((c: { slug: string }) => c.slug === `cm-${stamp}`)).toBe(true)
})
