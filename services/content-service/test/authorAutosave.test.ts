// P4 PR 4.4 - backend tự lưu của trình soạn (TDD v2.0: ED-08, ED-10, ED-13, API-03, API-04).
//
//   - POST /api/author/posts/:slug/autosave: chỉ bài Nháp của chính mình, không đổi
//     trạng thái, trả `updatedAt` mới; bản lịch sử GỘP trong cửa sổ 10 phút.
//   - PATCH /api/author/posts/:slug: `updatedAt` cũ ⇒ 409 `edit_conflict`; `force`
//     chỉ MODERATOR+.
//   - GET /api/author/tags?q=: gợi ý thẻ, không lộ thẻ của bản nháp người khác.
//   - GET /api/author/posts?sort=: danh sách trắng.
//
// Ma trận vai trò (CI-02) dùng `roleMatrix.ts`.
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
delete process.env.INTERNAL_API_TOKEN

import { prisma } from '@tsudev/db'
import {
  ROLE_LADDER,
  authHeader,
  dropRoleUsers,
  expectedStatus,
  makeRoleUsers,
  type LadderRole,
  type MatrixUser,
} from './roleMatrix'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../src/index')

const stamp = Date.now()
let users: Record<LadderRole, MatrixUser>

/** Tạo một bài Nháp qua đúng API của tác giả; trả bài (thẻ tác giả). */
async function draft(u: MatrixUser, suffix: string, extra: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/author/posts')
    .set(await authHeader(u))
    .send({ slug: `as-${suffix}-${stamp}`, title: `Bài ${suffix}`, contentMd: 'Mở đầu.', ...extra })
  expect(res.status).toBe(201)
  expect(res.body.status).toBe('DRAFT')
  return res.body as { id: string; slug: string; updatedAt: string }
}

const revisionCount = (postId: string) => prisma.postRevision.count({ where: { postId } })

beforeAll(async () => {
  users = await makeRoleUsers(`as${stamp}`)
}, 60_000)

afterAll(async () => {
  await dropRoleUsers(users)
  await prisma.$disconnect()
})

describe('CI-02 ma trận vai trò - endpoint mới của PR 4.4', () => {
  test.each(ROLE_LADDER)('GET /api/author/tags - %s', async (role) => {
    const res = await request(app)
      .get('/api/author/tags?q=a')
      .set(await authHeader(users[role]))
    expect(res.status).toBe(expectedStatus(role, 'AUTHOR', 200))
  })

  test.each(ROLE_LADDER)('POST /api/author/posts/:slug/autosave - %s', async (role) => {
    const u = users[role]
    // Bậc được phép tự lưu bài CỦA MÌNH; bậc dưới gọi vào một slug bất kỳ.
    const allowed = expectedStatus(role, 'AUTHOR', 200) === 200
    const slug = allowed ? (await draft(u, `mx-${role.toLowerCase()}`)).slug : `khong-co-${stamp}`
    const res = await request(app)
      .post(`/api/author/posts/${slug}/autosave`)
      .set(await authHeader(u))
      .send({ contentMd: `Tự lưu của ${role}.` })
    expect(res.status).toBe(expectedStatus(role, 'AUTHOR', 200))
  })

  test.each(ROLE_LADDER)('GET /api/author/posts?sort=title - %s', async (role) => {
    const res = await request(app)
      .get('/api/author/posts?sort=title')
      .set(await authHeader(users[role]))
    expect(res.status).toBe(expectedStatus(role, 'AUTHOR', 200))
  })
})

describe('ED-08 tự lưu', () => {
  test('lưu Nháp: không đổi trạng thái, trả updatedAt mới, nội dung vào DB', async () => {
    const p = await draft(users.AUTHOR, 'luu')
    const res = await request(app)
      .post(`/api/author/posts/${p.slug}/autosave`)
      .set(await authHeader(users.AUTHOR))
      .send({ title: 'Tiêu đề mới', contentMd: 'Đoạn mới.', updatedAt: p.updatedAt })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('DRAFT')
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(new Date(p.updatedAt).getTime())
    const row = await prisma.post.findUnique({ where: { id: p.id } })
    expect(row?.title).toBe('Tiêu đề mới')
    expect(row?.contentMd).toBe('Đoạn mới.')
    expect(row?.status).toBe('DRAFT')
  })

  test('chỉ nhận title/contentMd/excerpt - slug, published, tags bị bỏ qua', async () => {
    const p = await draft(users.AUTHOR, 'loc')
    const res = await request(app)
      .post(`/api/author/posts/${p.slug}/autosave`)
      .set(await authHeader(users.AUTHOR))
      .send({ contentMd: 'x', slug: `doi-slug-${stamp}`, published: true, tags: ['lén'] })
    expect(res.status).toBe(200)
    const row = await prisma.post.findUnique({ where: { id: p.id } })
    expect(row?.slug).toBe(p.slug)
    expect(row?.published).toBe(false)
    expect(row?.tags).toEqual([])
  })

  test('thân rỗng hoặc contentMd trống ⇒ 400', async () => {
    const p = await draft(users.AUTHOR, 'rong')
    const h = await authHeader(users.AUTHOR)
    expect(
      (await request(app).post(`/api/author/posts/${p.slug}/autosave`).set(h).send({})).status
    ).toBe(400)
    const blank = await request(app)
      .post(`/api/author/posts/${p.slug}/autosave`)
      .set(h)
      .send({ contentMd: '   ' })
    expect(blank.status).toBe(400)
  })

  test('bài KHÔNG còn Nháp ⇒ 409 not_draft, nội dung không đổi', async () => {
    const p = await draft(users.AUTHOR, 'cho-duyet')
    await prisma.post.update({ where: { id: p.id }, data: { status: 'PENDING' } })
    const res = await request(app)
      .post(`/api/author/posts/${p.slug}/autosave`)
      .set(await authHeader(users.AUTHOR))
      .send({ contentMd: 'gõ dở' })
    expect(res.status).toBe(409)
    expect(res.body.code).toBe('not_draft')
    const row = await prisma.post.findUnique({ where: { id: p.id } })
    expect(row?.contentMd).toBe('Mở đầu.')
  })

  test('bài của tác giả khác ⇒ 404 (không tiết lộ tồn tại)', async () => {
    const p = await draft(users.AUTHOR, 'cua-nguoi-khac')
    const res = await request(app)
      .post(`/api/author/posts/${p.slug}/autosave`)
      .set(await authHeader(users.MODERATOR))
      .send({ contentMd: 'cướp' })
    expect(res.status).toBe(404)
  })

  test('gộp bản lịch sử: nhiều lần tự lưu trong 10 phút ⇒ MỘT bản, mang nội dung cuối', async () => {
    const p = await draft(users.AUTHOR, 'gop')
    const before = await revisionCount(p.id)
    const h = await authHeader(users.AUTHOR)
    for (const n of [1, 2, 3]) {
      const r = await request(app)
        .post(`/api/author/posts/${p.slug}/autosave`)
        .set(h)
        .send({ contentMd: `Lần ${n}.` })
      expect(r.status).toBe(200)
    }
    // Bài vừa tạo đã có bản lịch sử lúc tạo (cùng người, chưa quá 10 phút) ⇒ ba lần
    // tự lưu gộp VÀO bản đó; bài chưa có bản nào thì sinh đúng một bản.
    expect(await revisionCount(p.id)).toBe(Math.max(before, 1))
    const last = await prisma.postRevision.findFirst({
      where: { postId: p.id },
      orderBy: { createdAt: 'desc' },
    })
    expect(last?.contentMd).toBe('Lần 3.')
  })

  test('quá 10 phút từ bản cuối ⇒ thêm bản MỚI (không gộp vô hạn)', async () => {
    const p = await draft(users.AUTHOR, 'qua-cua-so')
    const h = await authHeader(users.AUTHOR)
    await request(app).post(`/api/author/posts/${p.slug}/autosave`).set(h).send({ contentMd: 'A.' })
    const n1 = await revisionCount(p.id)
    await prisma.postRevision.updateMany({
      where: { postId: p.id },
      data: { createdAt: new Date(Date.now() - 11 * 60 * 1000) },
    })
    await request(app).post(`/api/author/posts/${p.slug}/autosave`).set(h).send({ contentMd: 'B.' })
    expect(await revisionCount(p.id)).toBe(n1 + 1)
  })

  test('KHÔNG gộp qua ranh giới trạng thái: bản đã công bố giữ nguyên trong lịch sử', async () => {
    const p = await draft(users.MODERATOR, 'qua-trang-thai')
    const h = await authHeader(users.MODERATOR)
    await request(app)
      .post(`/api/author/posts/${p.slug}/autosave`)
      .set(h)
      .send({ contentMd: 'Bản duyệt.' })
    const pub = await request(app)
      .post(`/api/author/posts/${p.slug}/transition`)
      .set(h)
      .send({ action: 'publish' })
    expect(pub.status).toBe(200)
    await request(app)
      .patch(`/api/author/posts/${p.slug}`)
      .set(h)
      .send({ contentMd: 'Sửa sau khi đăng.' })
    const all = await prisma.postRevision.findMany({ where: { postId: p.id } })
    expect(all.map((r) => r.contentMd)).toContain('Bản duyệt.')
    expect(all.map((r) => r.contentMd)).toContain('Sửa sau khi đăng.')
  })

  test('PATCH bài Nháp cũng gộp (cùng cửa sổ với tự lưu)', async () => {
    const p = await draft(users.AUTHOR, 'patch-gop')
    const h = await authHeader(users.AUTHOR)
    const before = await revisionCount(p.id)
    await request(app).patch(`/api/author/posts/${p.slug}`).set(h).send({ contentMd: 'P1.' })
    await request(app).patch(`/api/author/posts/${p.slug}`).set(h).send({ contentMd: 'P2.' })
    expect(await revisionCount(p.id)).toBe(Math.max(before, 1))
  })

  test('nội dung không đổi ⇒ không thêm bản lịch sử', async () => {
    const p = await draft(users.AUTHOR, 'khong-doi')
    const before = await revisionCount(p.id)
    await request(app)
      .post(`/api/author/posts/${p.slug}/autosave`)
      .set(await authHeader(users.AUTHOR))
      .send({ contentMd: 'Mở đầu.' })
    expect(await revisionCount(p.id)).toBe(before)
  })
})

describe('ED-10 / API-04 - 409 khi sửa chồng', () => {
  test('PATCH với updatedAt cũ ⇒ 409 edit_conflict kèm người sửa cuối; DB không đổi', async () => {
    const p = await draft(users.AUTHOR, 'chong')
    const h = await authHeader(users.AUTHOR)
    // "Tab khác" lưu trước.
    await request(app)
      .post(`/api/author/posts/${p.slug}/autosave`)
      .set(h)
      .send({ contentMd: 'Tab A.' })
    const res = await request(app)
      .patch(`/api/author/posts/${p.slug}`)
      .set(h)
      .send({ contentMd: 'Tab B ghi đè.', updatedAt: p.updatedAt })
    expect(res.status).toBe(409)
    expect(res.body.code).toBe('edit_conflict')
    expect(res.body.lastEditor).toBe(users.AUTHOR.username)
    expect(res.body.updatedAt).toBeTruthy()
    const row = await prisma.post.findUnique({ where: { id: p.id } })
    expect(row?.contentMd).toBe('Tab A.')
  })

  test('autosave với updatedAt cũ cũng ⇒ 409', async () => {
    const p = await draft(users.AUTHOR, 'chong-tu-luu')
    const h = await authHeader(users.AUTHOR)
    await request(app).patch(`/api/author/posts/${p.slug}`).set(h).send({ title: 'Đổi tên' })
    const res = await request(app)
      .post(`/api/author/posts/${p.slug}/autosave`)
      .set(h)
      .send({ contentMd: 'muộn', updatedAt: p.updatedAt })
    expect(res.status).toBe(409)
    expect(res.body.code).toBe('edit_conflict')
  })

  test('updatedAt khớp ⇒ 200; không gửi ⇒ 200 (tương thích form cũ)', async () => {
    const p = await draft(users.AUTHOR, 'khop')
    const h = await authHeader(users.AUTHOR)
    const ok = await request(app)
      .patch(`/api/author/posts/${p.slug}`)
      .set(h)
      .send({ contentMd: 'Một.', updatedAt: p.updatedAt })
    expect(ok.status).toBe(200)
    const legacy = await request(app)
      .patch(`/api/author/posts/${p.slug}`)
      .set(h)
      .send({ contentMd: 'Hai.' })
    expect(legacy.status).toBe(200)
  })

  test('updatedAt không phải ngày ⇒ coi là lệch (409), không bỏ qua kiểm', async () => {
    const p = await draft(users.AUTHOR, 'rac')
    const res = await request(app)
      .patch(`/api/author/posts/${p.slug}`)
      .set(await authHeader(users.AUTHOR))
      .send({ contentMd: 'x', updatedAt: 'khong-phai-ngay' })
    expect(res.status).toBe(409)
  })

  test('force: true - AUTHOR vẫn 409, MODERATOR+ ghi đè được', async () => {
    const pa = await draft(users.AUTHOR, 'ep-author')
    const ra = await request(app)
      .patch(`/api/author/posts/${pa.slug}`)
      .set(await authHeader(users.AUTHOR))
      .send({ contentMd: 'x', updatedAt: '2000-01-01T00:00:00.000Z', force: true })
    expect(ra.status).toBe(409)

    const pm = await draft(users.MODERATOR, 'ep-mod')
    const rm = await request(app)
      .patch(`/api/author/posts/${pm.slug}`)
      .set(await authHeader(users.MODERATOR))
      .send({ contentMd: 'ghi đè', updatedAt: '2000-01-01T00:00:00.000Z', force: true })
    expect(rm.status).toBe(200)
  })
})

describe('ED-13 gợi ý thẻ', () => {
  beforeAll(async () => {
    const own = await draft(users.AUTHOR, 'the-rieng', {
      tags: [`riengtu${stamp}`, `chung${stamp}`],
    })
    const other = await draft(users.ADMIN, 'the-nhap-khac', { tags: [`biMat${stamp}`] })
    const pub = await draft(users.ADMIN, 'the-cong-khai', {
      tags: [`chung${stamp}`, `congkhai${stamp}`],
    })
    const sched = await draft(users.ADMIN, 'the-hen-gio', { tags: [`hengio${stamp}`] })
    expect(other.id && own.id).toBeTruthy()
    await prisma.post.update({
      where: { id: pub.id },
      data: { status: 'PUBLISHED', published: true, publishedAt: new Date(Date.now() - 60_000) },
    })
    await prisma.post.update({
      where: { id: sched.id },
      data: {
        status: 'PUBLISHED',
        published: true,
        publishedAt: new Date(Date.now() + 86_400_000),
      },
    })
  })

  const tags = async (q: string) => {
    const res = await request(app)
      .get(`/api/author/tags?q=${encodeURIComponent(q)}`)
      .set(await authHeader(users.AUTHOR))
    expect(res.status).toBe(200)
    return res.body.data as { tag: string; count: number }[]
  }

  test('thẻ của bài mình + bài đã công bố; đếm số bài', async () => {
    expect(await tags(`riengtu${stamp}`)).toEqual([{ tag: `riengtu${stamp}`, count: 1 }])
    expect(await tags(`chung${stamp}`)).toEqual([{ tag: `chung${stamp}`, count: 2 }])
    expect((await tags(`congkhai${stamp}`)).map((t) => t.tag)).toEqual([`congkhai${stamp}`])
  })

  test('KHÔNG lộ thẻ bản nháp của người khác, kể cả bài hẹn giờ chưa tới', async () => {
    expect(await tags(`bimat${stamp}`)).toEqual([])
    expect(await tags(`hengio${stamp}`)).toEqual([])
  })

  test('tiền tố, không phân biệt hoa thường; ký tự đại diện LIKE bị thoát; tối đa 10', async () => {
    expect((await tags(`CHUNG${stamp}`)).map((t) => t.tag)).toEqual([`chung${stamp}`])
    expect(await tags('%')).toEqual([])
    expect(await tags('_')).toEqual([])
    expect((await tags('')).length).toBeLessThanOrEqual(10)
  })
})

describe('API-03 sort danh sách bài tác giả', () => {
  test('sort=title xếp A→Z; giá trị lạ ⇒ mặc định, không 400', async () => {
    const h = await authHeader(users.OWNER)
    await draft(users.OWNER, 'z-cuoi', { title: `Zzz ${stamp}` })
    await draft(users.OWNER, 'a-dau', { title: `Aaa ${stamp}` })
    const res = await request(app).get('/api/author/posts?sort=title').set(h)
    expect(res.status).toBe(200)
    const titles = res.body.data.map((p: { title: string }) => p.title)
    expect(titles.indexOf(`Aaa ${stamp}`)).toBeLessThan(titles.indexOf(`Zzz ${stamp}`))
    const odd = await request(app).get('/api/author/posts?sort=;DROP').set(h)
    expect(odd.status).toBe(200)
  })
})
