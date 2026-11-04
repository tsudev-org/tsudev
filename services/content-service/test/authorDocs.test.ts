// Đường ghi tài liệu: `/api/author/docs`.
//
// Trước bề mặt này, Toà soạn Agent AI là đường ghi Doc duy nhất ở production -
// gỡ nó mà thiếu bề mặt này thì /docs đóng băng (kế hoạch Q4/2026 §8.3c).
//
// Bất biến khoá lại:
//   (1) Cổng vai trò AUTHOR đọc từ DB, fail closed - MEMBER 403, khách 401.
//   (2) Tài liệu tạo ra HIỆN trên đường đọc công khai và TÌM ĐƯỢC (chỉ mục tìm
//       kiếm tính cùng lượt ghi).
//   (3) Xoá là xoá MỀM: biến khỏi đường đọc công khai, bản ghi còn nguyên.
//   (4) Slug trùng ⇒ 409, kể cả trùng với bản đã xoá mềm.
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
delete process.env.INTERNAL_API_TOKEN

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { app } = require('../src/index')

const stamp = Date.now()
const AUTH = `test-docauthor-${stamp}`
const MEM = `test-docmem-${stamp}`
const TITLE = `Hướng dẫn cài đặt ${stamp}`
const SLUG = `huong-dan-cai-dat-${stamp}`
const CATEGORY = `test-cat-${stamp}`

const asUser = async (sub: string) => ({
  Authorization: `Bearer ${await signIdentity({ sub }, process.env.INTERNAL_IDENTITY_SECRET)}`,
})

const mkUser = (username: string, role: string) =>
  prisma.user.upsert({
    where: { username },
    update: { role },
    create: { username, email: `${username}@tsudev.local`, displayName: username, role },
  })

beforeAll(async () => {
  await Promise.all([mkUser(AUTH, 'AUTHOR'), mkUser(MEM, 'MEMBER')])
})

afterAll(async () => {
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_hard_delete = 'on'`),
    prisma.$executeRawUnsafe(`DELETE FROM "Doc" WHERE "slug" LIKE $1`, `%${stamp}%`),
  ])
  await prisma.user.deleteMany({ where: { username: { in: [AUTH, MEM] } } })
  await prisma.$disconnect()
})

describe('cổng vai trò', () => {
  test('khách chưa đăng nhập ⇒ 401', async () => {
    const r = await request(app).post('/api/author/docs').send({ title: 'x', contentMd: 'y' })
    expect(r.status).toBe(401)
  })

  test('MEMBER ⇒ 403, cả đọc lẫn ghi', async () => {
    const h = await asUser(MEM)
    expect((await request(app).get('/api/author/docs').set(h)).status).toBe(403)
    const w = await request(app)
      .post('/api/author/docs')
      .set(h)
      .send({ title: 'x', contentMd: 'y' })
    expect(w.status).toBe(403)
  })
})

describe('vòng đời tài liệu', () => {
  test('tạo: slug suy từ tiêu đề có dấu, vị trí tự xếp cuối nhóm', async () => {
    const h = await asUser(AUTH)
    const r = await request(app)
      .post('/api/author/docs')
      .set(h)
      .send({ title: TITLE, contentMd: '# Cài đặt\n\nChạy tệp **setup.exe**.', category: CATEGORY })
    expect(r.status).toBe(201)
    expect(r.body.slug).toBe(SLUG)
    expect(r.body.category).toBe(CATEGORY)
    expect(r.body.position).toBe(1)

    const second = await request(app)
      .post('/api/author/docs')
      .set(h)
      .send({ title: `Phần hai ${stamp}`, contentMd: 'b', category: CATEGORY })
    expect(second.body.position).toBe(2)
  })

  test('hiện trên đường đọc công khai và có chỉ mục tìm kiếm', async () => {
    const pub = await request(app).get(`/api/docs/${SLUG}`)
    expect(pub.status).toBe(200)
    expect(pub.body.title).toBe(TITLE)
    const row = await prisma.doc.findUnique({ where: { slug: SLUG } })
    expect(row.searchTitleNorm).toContain('huong dan cai dat')
    expect(row.searchBodyNorm).toContain('setup.exe')
    expect(row.authoredByAgentId).toBeNull()
  })

  test('slug trùng ⇒ 409; dữ liệu sai ⇒ 400', async () => {
    const h = await asUser(AUTH)
    const dup = await request(app)
      .post('/api/author/docs')
      .set(h)
      .send({ title: 'khác', slug: SLUG, contentMd: 'z' })
    expect(dup.status).toBe(409)
    const bad = await request(app)
      .post('/api/author/docs')
      .set(h)
      .send({ title: '', contentMd: 'z' })
    expect(bad.status).toBe(400)
    const badSlug = await request(app)
      .post('/api/author/docs')
      .set(h)
      .send({ title: 'x', slug: 'Có Dấu', contentMd: 'z' })
    expect(badSlug.status).toBe(400)
  })

  test('sửa: tính lại chỉ mục từ giá trị sau khi trộn', async () => {
    const h = await asUser(AUTH)
    const r = await request(app)
      .patch(`/api/author/docs/${SLUG}`)
      .set(h)
      .send({ contentMd: 'Vượt cảnh báo SmartScreen' })
    expect(r.status).toBe(200)
    expect(r.body.title).toBe(TITLE)
    const row = await prisma.doc.findUnique({ where: { slug: SLUG } })
    expect(row.searchBodyNorm).toContain('vuot canh bao smartscreen')
  })

  test('danh sách của tác giả có tài liệu', async () => {
    const h = await asUser(AUTH)
    const r = await request(app).get('/api/author/docs?page_size=100').set(h)
    expect(r.status).toBe(200)
    expect(r.body.data.some((d: { slug: string }) => d.slug === SLUG)).toBe(true)
  })

  test('xoá mềm: biến khỏi đường đọc công khai, bản ghi còn, slug vẫn bị giữ', async () => {
    const h = await asUser(AUTH)
    const del = await request(app).delete(`/api/author/docs/${SLUG}`).set(h)
    expect(del.status).toBe(200)
    expect(del.body.softDeleted).toBe(true)
    expect((await request(app).get(`/api/docs/${SLUG}`)).status).toBe(404)
    expect((await request(app).get(`/api/author/docs/${SLUG}`).set(h)).status).toBe(404)
    const row = await prisma.doc.findUnique({ where: { slug: SLUG } })
    expect(row.deletedAt).not.toBeNull()
    const again = await request(app)
      .post('/api/author/docs')
      .set(h)
      .send({ title: 'x', slug: SLUG, contentMd: 'z' })
    expect(again.status).toBe(409)
  })
})

export {}
