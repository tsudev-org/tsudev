// Bản phát hành tải về được của dự án (ProjectRelease).
//
// ──────────────────────────────────────────────────────────────────────────────
// BỐN BẤT BIẾN ĐƯỢC CANH Ở ĐÂY, VÀ CẢ BỐN ĐỀU HỎNG IM LẶNG NẾU MẤT
// ──────────────────────────────────────────────────────────────────────────────
//
//   1. `storageKey` KHÔNG BAO GIỜ ra khỏi API công khai. Nó là khoá object
//      trong R2; rò ra là mời người ta gọi thẳng bucket, và lượt tải đó không
//      đi qua bộ đếm. Hỏng im lặng vì `downloadCount` đứng yên trông giống hệt
//      "chưa ai tải".
//
//   2. Bản NHÁP (`publishedAt: null`) không được lọt ra đường đọc công khai.
//      Mất điều kiện này thì một bản chưa sẵn sàng xuất hiện trên trang chủ, và
//      không có gì báo lỗi - nó chỉ là một hàng nữa trong danh sách.
//
//   3. `signature` phải đi kèm `signingKid`. Vòng khoá của repo này CÓ xoay
//      (`RELEASE_SIGNING_KEYS_RETIRED`), nên một chữ ký không nói nó được ký bằng
//      khoá nào là chữ ký không kiểm được sau lần xoay đầu tiên. Lúc đó người
//      tải chạy phép kiểm, thất bại, và kết luận tệp đã bị can thiệp.
//
//   4. Đường tải TĂNG bộ đếm rồi mới chuyển hướng. Đây là lý do tồn tại của cả
//      route đó - bỏ phép tăng đi thì route trở thành một chặng mạng vô nghĩa.
//
// Và một bất biến phân quyền: mọi đường ghi tự gọi `requireAdmin()`, theo đúng
// khuôn mà CLAUDE.md đòi ("Thêm route ghi mới thì phải theo khuôn đó, đừng dựa
// vào middleware").
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
delete process.env.INTERNAL_API_TOKEN
process.env.S3_PUBLIC_ENDPOINT = 'https://cdn-test.example'
process.env.S3_BUCKET = 'tsudev-test'
// Khoá giả: ký URL presign là phép tính cục bộ, không gọi mạng.
process.env.S3_ACCESS_KEY = 'test-access-key'
process.env.S3_SECRET_KEY = 'test-secret-key'

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { app } = require('../src/index')
const { store } = require('../src/objectStore')
const releaseSigning = require('../src/releaseSigning')

const ADMIN = 'test-admin-release'
const THUONG = 'test-member-release'
const SLUG = 'test-release-du-an'
const SHA = 'a'.repeat(64)

const asUser = async (sub: string) => ({
  Authorization: `Bearer ${await signIdentity({ sub }, process.env.INTERNAL_IDENTITY_SECRET)}`,
})

// Xoá CỨNG bị chặn ở cấp database (trigger + `tsudev.allow_hard_delete`). Dữ
// liệu test vẫn phải biến mất hẳn, nếu không lần chạy sau đụng ràng buộc UNIQUE.
// ProjectRelease đi theo nhờ `onDelete: Cascade`.
const clean = () =>
  prisma.$transaction([
    prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_hard_delete = 'on'`),
    prisma.$executeRawUnsafe(`DELETE FROM "Project" WHERE slug = '${SLUG}'`),
  ])

let projectId = ''

beforeAll(async () => {
  await clean()
  for (const [u, role] of [
    [ADMIN, 'ADMIN'],
    [THUONG, 'MEMBER'],
  ] as const) {
    await prisma.user.upsert({
      where: { username: u },
      update: { role },
      create: { username: u, email: `${u}@tsudev.local`, displayName: u, role },
    })
  }
  // Ép 2FA (G6): requireAdmin đòi TOTP đã xác nhận hoặc passkey.
  await prisma.user.update({
    where: { username: ADMIN },
    data: {
      totp: {
        upsert: {
          create: { secretEnc: 'test', confirmedAt: new Date() },
          update: { confirmedAt: new Date() },
        },
      },
    },
  })
  const p = await prisma.project.create({
    data: { slug: SLUG, name: 'Dự án test phát hành', summary: 'x', published: true },
  })
  projectId = p.id
}, 30000)

afterAll(async () => {
  await clean()
  await prisma.user.deleteMany({ where: { username: { in: [ADMIN, THUONG] } } })
  await prisma.$disconnect()
})

beforeEach(async () => {
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_hard_delete = 'on'`),
    prisma.$executeRawUnsafe(`DELETE FROM "ProjectRelease" WHERE "projectId" = '${projectId}'`),
  ])
})

describe('phân quyền đường ghi', () => {
  test('không đăng nhập thì POST trả 401', async () => {
    const res = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .send({ version: '1.0.0', platform: 'ANDROID', storageKey: `releases/${SLUG}/r/a.apk` })
    expect(res.status).toBe(401)
  })

  test('MEMBER thì POST trả 403 - thang vai trò, không phải cờ', async () => {
    const res = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(await asUser(THUONG))
      .send({ version: '1.0.0', platform: 'ANDROID', storageKey: `releases/${SLUG}/r/a.apk` })
    expect(res.status).toBe(403)
  })

  test('PATCH và DELETE cũng tự gọi requireAdmin', async () => {
    const h = await asUser(THUONG)
    const r = await prisma.projectRelease.create({
      data: {
        projectId,
        version: '1.0.0',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/r/a.apk`,
      },
    })
    expect((await request(app).patch(`/api/admin/releases/${r.id}`).set(h).send({})).status).toBe(
      403
    )
    expect((await request(app).delete(`/api/admin/releases/${r.id}`).set(h)).status).toBe(403)
  })
})

describe('ba bất biến của thân request', () => {
  test('thiếu cả storageKey lẫn externalUrl thì 400', async () => {
    const res = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(await asUser(ADMIN))
      .send({ version: '1.0.0', platform: 'ANDROID' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/storageKey|externalUrl/)
  })

  test('có CẢ HAI thì 400 - không ai biết nút tải dẫn đi đâu', async () => {
    const res = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(await asUser(ADMIN))
      .send({
        version: '1.0.0',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/r/a.apk`,
        externalUrl: 'https://x.test/a.apk',
      })
    expect(res.status).toBe(400)
  })

  test('client gửi signature thì 400 - chữ ký do MÁY CHỦ tạo', async () => {
    const res = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(await asUser(ADMIN))
      .send({
        version: '1.0.0',
        platform: 'SOURCE',
        externalUrl: 'https://github.test/x',
        sha256: SHA,
        signature: 'abc',
        signingKid: 'tsu-2026-08',
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/máy chủ/)
  })

  test('sha256 cho tệp trong R2 từ client thì 400 - phải Niêm phong', async () => {
    const res = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(await asUser(ADMIN))
      .send({
        version: '1.0.0',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/r/a.apk`,
        sha256: SHA,
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Niêm phong/)
  })

  test('sha256 sai hình dạng thì 400 - checksum sai còn tệ hơn không có', async () => {
    const res = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(await asUser(ADMIN))
      .send({
        version: '1.0.0',
        platform: 'SOURCE',
        externalUrl: 'https://github.test/x',
        sha256: 'khongphai',
      })
    expect(res.status).toBe(400)
  })

  test('tệp R2 chưa niêm phong thì KHÔNG công bố được', async () => {
    const res = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(await asUser(ADMIN))
      .send({
        version: '1.0.0',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/r/a.apk`,
        published: true,
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/niêm phong/)
  })

  test('platform ngoài enum thì 400', async () => {
    const res = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(await asUser(ADMIN))
      .send({ version: '1.0.0', platform: 'SYMBIAN', storageKey: `releases/${SLUG}/r/a.apk` })
    expect(res.status).toBe(400)
  })

  /**
   * 🔴 TEST NÀY RA ĐỜI TỪ MỘT KHUYẾT ĐÃ ĐO ĐƯỢC, đừng gộp nó vào test dưới.
   *
   * Bản đầu khai `arch String?`. Trong SQL `NULL != NULL`, nên ràng buộc
   * `@@unique([projectId, version, platform, arch])` KHÔNG chặn trùng khi `arch`
   * bỏ trống - và bỏ trống là trường hợp PHỔ BIẾN NHẤT. Đã kiểm trực tiếp trên
   * Postgres: hai lượt INSERT cùng (projectId, version, platform) với arch NULL
   * đều lọt, cho ra hai hàng y hệt nhau.
   *
   * Điều khiến nó sống sót qua cả một bộ test: test "trùng thì 409" bên dưới
   * truyền `arch: 'arm64'`, tức nó chỉ chứng minh ràng buộc hoạt động ở nhánh
   * mà ràng buộc vốn đã hoạt động. Ràng buộc vẫn hiện ra trong `\d`, test vẫn
   * xanh, và không gì báo lỗi.
   *
   * Cột nay là NOT NULL DEFAULT ''. Test này canh đúng nhánh BỎ TRỐNG.
   */
  test('trùng khi KHÔNG khai arch cũng phải 409 - NULL != NULL trong SQL', async () => {
    const h = await asUser(ADMIN)
    const than = { version: '3.0.0', platform: 'ANDROID', storageKey: `releases/${SLUG}/r/a.apk` }
    const dau = await request(app).post(`/api/admin/projects/${SLUG}/releases`).set(h).send(than)
    expect(dau.status).toBe(201)
    // Đối ngoại `arch` vẫn là null dù trong database là chuỗi rỗng.
    expect(dau.body.arch).toBe('')

    const lai = await request(app).post(`/api/admin/projects/${SLUG}/releases`).set(h).send(than)
    expect(lai.status).toBe(409)
  })

  test('gửi arch: null cũng quy về chuỗi rỗng, không tạo lỗ UNIQUE thứ hai', async () => {
    const h = await asUser(ADMIN)
    const a = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(h)
      .send({
        version: '4.0.0',
        platform: 'LINUX',
        storageKey: `releases/${SLUG}/r/a.deb`,
        arch: null,
      })
    expect(a.status).toBe(201)
    const b = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(h)
      .send({ version: '4.0.0', platform: 'LINUX', storageKey: `releases/${SLUG}/r/b.deb` })
    expect(b.status).toBe(409)
  })

  test('trùng (version, platform, arch) thì 409, không phải 500', async () => {
    const h = await asUser(ADMIN)
    const than = {
      version: '1.0.0',
      platform: 'ANDROID',
      arch: 'arm64',
      storageKey: `releases/${SLUG}/r/a.apk`,
    }
    expect(
      (await request(app).post(`/api/admin/projects/${SLUG}/releases`).set(h).send(than)).status
    ).toBe(201)
    const lai = await request(app).post(`/api/admin/projects/${SLUG}/releases`).set(h).send(than)
    expect(lai.status).toBe(409)
  })
})

describe('đường đọc công khai', () => {
  test('KHÔNG rò storageKey, và có downloadPath thay thế', async () => {
    await prisma.projectRelease.create({
      data: {
        projectId,
        version: '1.0.0',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/bi-mat.apk`,
        publishedAt: new Date(),
      },
    })
    const res = await request(app).get(`/api/projects/${SLUG}/releases`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    // Khẳng định trên CHUỖI JSON, không chỉ trên trường: một trường lồng hay một
    // khoá đổi tên vẫn làm rò, và phép kiểm theo tên trường sẽ bỏ qua.
    expect(JSON.stringify(res.body)).not.toContain('storageKey')
    expect(JSON.stringify(res.body)).not.toContain('bi-mat.apk')
    expect(res.body[0].downloadPath).toBe(
      `/api/projects/${SLUG}/releases/${res.body[0].id}/download`
    )
    // Hợp đồng đối ngoại: chuỗi rỗng trong database hiện ra là `null`, không
    // phải `""`. Giao diện kiểm `r.arch &&` để quyết định có vẽ nhãn kiến trúc,
    // và chuỗi rỗng cũng falsy - nhưng hợp đồng phải nói rõ một giá trị, không
    // để hai giá trị cùng nghĩa.
    expect(res.body[0].arch).toBeNull()
  })

  test('bản NHÁP không lọt ra công khai, nhưng admin thấy', async () => {
    await prisma.projectRelease.create({
      data: {
        projectId,
        version: '2.0.0-nhap',
        platform: 'WINDOWS',
        storageKey: `releases/${SLUG}/r/n.exe`,
      },
    })
    const congKhai = await request(app).get(`/api/projects/${SLUG}/releases`)
    expect(congKhai.body).toHaveLength(0)

    const quanTri = await request(app)
      .get(`/api/admin/projects/${SLUG}/releases`)
      .set(await asUser(ADMIN))
    expect(quanTri.status).toBe(200)
    expect(quanTri.body).toHaveLength(1)
  })

  test('mặc định chỉ STABLE; BETA phải xin bằng ?channel=', async () => {
    await prisma.projectRelease.createMany({
      data: [
        {
          projectId,
          version: '1.0.0',
          platform: 'ANDROID',
          channel: 'STABLE',
          storageKey: `releases/${SLUG}/r/s.apk`,
          publishedAt: new Date(),
        },
        {
          projectId,
          version: '1.1.0',
          platform: 'ANDROID',
          channel: 'BETA',
          storageKey: `releases/${SLUG}/r/b.apk`,
          publishedAt: new Date(),
        },
      ],
    })
    const macDinh = await request(app).get(`/api/projects/${SLUG}/releases`)
    expect(macDinh.body.map((r: { version: string }) => r.version)).toEqual(['1.0.0'])

    const beta = await request(app).get(`/api/projects/${SLUG}/releases?channel=BETA`)
    expect(beta.body.map((r: { version: string }) => r.version)).toEqual(['1.1.0'])
  })

  test('bản ĐÃ XOÁ MỀM không lọt ra công khai', async () => {
    await prisma.projectRelease.create({
      data: {
        projectId,
        version: '1.0.0',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/r/a.apk`,
        publishedAt: new Date(),
        deletedAt: new Date(),
      },
    })
    const res = await request(app).get(`/api/projects/${SLUG}/releases`)
    expect(res.body).toHaveLength(0)
  })

  test('dự án chưa công bố thì 404, không phải mảng rỗng', async () => {
    await prisma.project.update({ where: { id: projectId }, data: { published: false } })
    const res = await request(app).get(`/api/projects/${SLUG}/releases`)
    await prisma.project.update({ where: { id: projectId }, data: { published: true } })
    expect(res.status).toBe(404)
  })

  test('/api/releases gộp theo dự án và chỉ gồm dự án CÓ bản phát hành', async () => {
    await prisma.projectRelease.create({
      data: {
        projectId,
        version: '1.0.0',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/r/a.apk`,
        publishedAt: new Date(),
      },
    })
    const res = await request(app).get('/api/releases?limit=50')
    expect(res.status).toBe(200)
    const muc = res.body.find((x: { project: { slug: string } }) => x.project.slug === SLUG)
    expect(muc).toBeDefined()
    expect(muc.releases).toHaveLength(1)
    expect(JSON.stringify(res.body)).not.toContain('storageKey')
    // Mọi dự án trả về đều PHẢI có ít nhất một bản - đó là cả ý nghĩa của endpoint.
    for (const x of res.body) expect(x.releases.length).toBeGreaterThan(0)
  })
})

describe('đường tải', () => {
  // Đích là URL PRESIGN, không phải `endpoint/bucket/key` trần: bucket R2 của
  // production không mở đọc ẩn danh. Bản trước của test này khẳng định đúng cái
  // URL trần đó - tức nó canh một hành vi hỏng ở production (objectStore.ts).
  test('tăng downloadCount rồi chuyển hướng 302 tới URL presign có chữ ký', async () => {
    const r = await prisma.projectRelease.create({
      data: {
        projectId,
        version: '1.0.0',
        platform: 'ANDROID',
        storageKey: 'releases/app.apk',
        fileName: 'Ứng dụng 1.0.apk',
        publishedAt: new Date(),
      },
    })
    expect(r.downloadCount).toBe(0)

    const res = await request(app).get(`/api/projects/${SLUG}/releases/${r.id}/download`)
    expect(res.status).toBe(302)
    const loc = new URL(res.headers.location)
    expect(`${loc.origin}${loc.pathname}`).toBe(
      'https://cdn-test.example/tsudev-test/releases/app.apk'
    )
    expect(loc.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/)
    expect(Number(loc.searchParams.get('X-Amz-Expires'))).toBeLessThanOrEqual(600)
    // Tên lưu về máy khớp tên hiển thị (đã làm sạch dấu) - người ta gõ nó vào sha256sum.
    expect(loc.searchParams.get('response-content-disposition')).toBe(
      'attachment; filename="Ung-dung-1.0.apk"'
    )

    const sau = await prisma.projectRelease.findUnique({ where: { id: r.id } })
    expect(sau?.downloadCount).toBe(1)
  })

  test('nền tảng WEB/SOURCE chuyển hướng ra externalUrl', async () => {
    const r = await prisma.projectRelease.create({
      data: {
        projectId,
        version: '1.0.0',
        platform: 'SOURCE',
        externalUrl: 'https://github.test/tsudev/x/releases/tag/v1',
        publishedAt: new Date(),
      },
    })
    const res = await request(app).get(`/api/projects/${SLUG}/releases/${r.id}/download`)
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('https://github.test/tsudev/x/releases/tag/v1')
  })

  test('bản nháp KHÔNG tải được - cổng không chỉ ở đường liệt kê', async () => {
    const r = await prisma.projectRelease.create({
      data: {
        projectId,
        version: '9.9.9',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/r/n.apk`,
      },
    })
    const res = await request(app).get(`/api/projects/${SLUG}/releases/${r.id}/download`)
    expect(res.status).toBe(404)
  })

  test('id của dự án KHÁC không tải được qua slug này', async () => {
    const khac = await prisma.project.create({
      data: { slug: `${SLUG}-khac`, name: 'Khác', summary: 'x', published: true },
    })
    const r = await prisma.projectRelease.create({
      data: {
        projectId: khac.id,
        version: '1.0.0',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/r/x.apk`,
        publishedAt: new Date(),
      },
    })
    const res = await request(app).get(`/api/projects/${SLUG}/releases/${r.id}/download`)
    await prisma.$transaction([
      prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_hard_delete = 'on'`),
      prisma.$executeRawUnsafe(`DELETE FROM "Project" WHERE id = '${khac.id}'`),
    ])
    expect(res.status).toBe(404)
  })
})

describe('xoá mềm', () => {
  test('DELETE đặt deletedAt, không xoá hàng', async () => {
    const r = await prisma.projectRelease.create({
      data: {
        projectId,
        version: '1.0.0',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/r/a.apk`,
      },
    })
    const res = await request(app)
      .delete(`/api/admin/releases/${r.id}`)
      .set(await asUser(ADMIN))
    expect(res.status).toBe(200)

    const sau = await prisma.projectRelease.findUnique({ where: { id: r.id } })
    // Hàng VẪN CÒN: một bản đã công bố có thể đang được ai đó đối chiếu checksum.
    expect(sau).not.toBeNull()
    expect(sau?.deletedAt).not.toBeNull()
  })
})

export {}

const ZIP_HEAD = Buffer.from('504b0304140000000800', 'hex')

describe('§6.6 - tải lên R2, niêm phong, ký', () => {
  const thuc = { ...store }
  afterEach(() => Object.assign(store, thuc))

  test('upload-url: chỉ ADMIN, khoá do máy chủ đặt, không ghi đè nhau', async () => {
    const tu = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases/upload-url`)
      .set(await asUser(THUONG))
      .send({ fileName: 'a.apk', platform: 'ANDROID', fileSize: 10 })
    expect(tu.status).toBe(403)

    const h = await asUser(ADMIN)
    const mot = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases/upload-url`)
      .set(h)
      .send({ fileName: '../../Bản cài đặt.apk', platform: 'ANDROID', fileSize: 4242 })
    expect(mot.status).toBe(200)
    expect(mot.body.key).toMatch(new RegExp(`^releases/${SLUG}/[0-9a-f]{12}/Ban-cai-dat\\.apk$`))
    expect(new URL(mot.body.url).searchParams.get('X-Amz-Signature')).toBeTruthy()

    const hai = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases/upload-url`)
      .set(h)
      .send({ fileName: 'Bản cài đặt.apk', platform: 'ANDROID', fileSize: 4242 })
    expect(hai.body.key).not.toBe(mot.body.key)
  })

  test('seal: máy chủ tính sha256 + dung lượng THẬT rồi ký; chữ ký kiểm được ở JWKS', async () => {
    const h = await asUser(ADMIN)
    const tao = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(h)
      .send({
        version: '2.0.0',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/x/app.apk`,
        fileName: 'app.apk',
        fileSize: 1, // lời khai sai của client - phải bị thay bằng số thật
      })
    expect(tao.status).toBe(201)
    expect(tao.body.sha256).toBeNull()
    expect(tao.body.signature).toBeNull()

    const SHA_THAT = 'b'.repeat(64)
    store.hashObject = async (key: string) => {
      expect(key).toBe(`releases/${SLUG}/x/app.apk`)
      return { sha256: SHA_THAT, size: 4242, head: ZIP_HEAD, tail: Buffer.alloc(0) }
    }
    const ns = await request(app).post(`/api/admin/releases/${tao.body.id}/seal`).set(h)
    expect(ns.status).toBe(200)
    expect(ns.body.sha256).toBe(SHA_THAT)
    expect(ns.body.fileSize).toBe(4242)
    expect(ns.body.signingKid).toBe(releaseSigning.kid)

    const v = releaseSigning.verify(ns.body.signature)
    expect(v.valid).toBe(true)
    expect(v.payload).toMatchObject({
      typ: 'tsudev-release',
      project: SLUG,
      version: '2.0.0',
      platform: 'ANDROID',
      sha256: SHA_THAT,
      fileSize: 4242,
    })

    // Niêm phong xong thì công bố được.
    const cb = await request(app)
      .patch(`/api/admin/releases/${tao.body.id}`)
      .set(h)
      .send({ published: true })
    expect(cb.status).toBe(200)
    expect(releaseSigning.verify(cb.body.signature).valid).toBe(true)
  })

  test('seal: kho lỗi thì 502 nói rõ, không ghi gì', async () => {
    const h = await asUser(ADMIN)
    const tao = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(h)
      .send({ version: '2.1.0', platform: 'ANDROID', storageKey: `releases/${SLUG}/x/b.apk` })
    store.hashObject = async () => {
      throw new Error('NoSuchKey')
    }
    const ns = await request(app).post(`/api/admin/releases/${tao.body.id}/seal`).set(h)
    expect(ns.status).toBe(502)
    const r = await prisma.projectRelease.findUnique({ where: { id: tao.body.id } })
    expect(r?.sha256).toBeNull()
  })

  test('seal: MEMBER 403; bản đường dẫn ngoài 409', async () => {
    const h = await asUser(ADMIN)
    const tao = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(h)
      .send({ version: '2.2.0', platform: 'SOURCE', externalUrl: 'https://github.test/x' })
    expect(
      (
        await request(app)
          .post(`/api/admin/releases/${tao.body.id}/seal`)
          .set(await asUser(THUONG))
      ).status
    ).toBe(403)
    expect((await request(app).post(`/api/admin/releases/${tao.body.id}/seal`).set(h)).status).toBe(
      409
    )
  })

  test('đường dẫn ngoài + sha256 khai tay ⇒ máy chủ tự ký lời khai', async () => {
    const res = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(await asUser(ADMIN))
      .send({
        version: '2.3.0',
        platform: 'SOURCE',
        externalUrl: 'https://github.test/x',
        sha256: SHA,
      })
    expect(res.status).toBe(201)
    const v = releaseSigning.verify(res.body.signature)
    expect(v.valid).toBe(true)
    expect(v.payload).toMatchObject({ sha256: SHA, version: '2.3.0' })
  })

  test('đổi tệp (storageKey mới) xoá checksum + chữ ký cũ, buộc niêm phong lại', async () => {
    const h = await asUser(ADMIN)
    const tao = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(h)
      .send({ version: '2.4.0', platform: 'ANDROID', storageKey: `releases/${SLUG}/x/c.apk` })
    store.hashObject = async () => ({
      sha256: 'c'.repeat(64),
      size: 10,
      head: ZIP_HEAD,
      tail: Buffer.alloc(0),
    })
    await request(app).post(`/api/admin/releases/${tao.body.id}/seal`).set(h)

    const doi = await request(app)
      .patch(`/api/admin/releases/${tao.body.id}`)
      .set(h)
      .send({ storageKey: `releases/${SLUG}/x/d.apk` })
    expect(doi.status).toBe(200)
    expect(doi.body.sha256).toBeNull()
    expect(doi.body.signature).toBeNull()
  })
})

// §3.3 kế hoạch ATTT (G3): siết tải lên. Mỗi lớp chặn một thứ khác nhau - đuôi
// theo danh sách trắng + trần ở `upload-url`, `Content-Length` ký vào URL ở kho,
// và byte đầu/cuối của chính tệp lúc niêm phong. Lớp cuối là lớp duy nhất nhìn
// NỘI DUNG: `ghi-chu.txt` đổi đuôi `.apk` qua được hai lớp đầu.
describe('§3.3 - siết tải lên: fileSize, trần, đuôi, magic bytes', () => {
  const thuc = { ...store }
  afterEach(() => Object.assign(store, thuc))
  const url = `/api/admin/projects/${SLUG}/releases/upload-url`
  const hop = { fileName: 'app.apk', platform: 'ANDROID', fileSize: 4242 }

  test('upload-url ký Content-Length + Content-Type do máy chủ suy vào URL', async () => {
    const res = await request(app)
      .post(url)
      .set(await asUser(ADMIN))
      .send(hop)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      contentType: 'application/vnd.android.package-archive',
      fileSize: 4242,
      maxBytes: 2 * 1024 ** 3,
    })
    const ky = new URL(res.body.url).searchParams.get('X-Amz-SignedHeaders')!.split(';')
    expect(ky).toEqual(expect.arrayContaining(['content-length', 'content-type', 'host']))
  })

  test.each([
    ['thiếu', undefined],
    ['0', 0],
    ['âm', -5],
    ['thập phân', 1.5],
    ['chuỗi', '4242'],
  ])('fileSize %s ⇒ 400 FILE_SIZE_KHONG_HOP_LE', async (_ten, fileSize) => {
    const res = await request(app)
      .post(url)
      .set(await asUser(ADMIN))
      .send({ ...hop, fileSize })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('FILE_SIZE_KHONG_HOP_LE')
  })

  test('vượt trần 2 GB ⇒ 413 VUOT_TRAN_KICH_THUOC; đúng trần thì qua', async () => {
    const h = await asUser(ADMIN)
    const vuot = await request(app)
      .post(url)
      .set(h)
      .send({ ...hop, fileSize: 2 * 1024 ** 3 + 1 })
    expect(vuot.status).toBe(413)
    expect(vuot.body.code).toBe('VUOT_TRAN_KICH_THUOC')
    const tran = await request(app)
      .post(url)
      .set(h)
      .send({ ...hop, fileSize: 2 * 1024 ** 3 })
    expect(tran.status).toBe(200)
  })

  test.each([
    ['ANDROID', 'app.exe'],
    ['ANDROID', 'ghi-chu.txt'],
    ['WINDOWS', 'app.apk'],
    ['LINUX', 'app.gz'],
    ['SOURCE', 'nguon.exe'],
    ['MACOS', 'dmg'],
  ])('%s + %s ⇒ 400 DUOI_TEP_KHONG_CHO_PHEP', async (platform, fileName) => {
    const res = await request(app)
      .post(url)
      .set(await asUser(ADMIN))
      .send({ ...hop, platform, fileName })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('DUOI_TEP_KHONG_CHO_PHEP')
  })

  test('đuôi trong danh sách trắng: không phân biệt hoa thường, giữ đuôi khi tên dài', async () => {
    const h = await asUser(ADMIN)
    for (const [platform, fileName, duoi, ct] of [
      ['LINUX', 'Tool-x86_64.appimage', '.AppImage', 'application/vnd.appimage'],
      ['LINUX', 'tool-1.0.TAR.GZ', '.tar.gz', 'application/gzip'],
      ['WINDOWS', 'Setup.MSI', '.msi', 'application/x-msi'],
      ['MACOS', 'App.dmg', '.dmg', 'application/x-apple-diskimage'],
      ['SOURCE', 'src.zip', '.zip', 'application/zip'],
      ['ANDROID', `${'a'.repeat(300)}.apk`, '.apk', 'application/vnd.android.package-archive'],
    ]) {
      const res = await request(app)
        .post(url)
        .set(h)
        .send({ ...hop, platform, fileName })
      expect(res.status).toBe(200)
      expect(res.body.key.endsWith(duoi)).toBe(true)
      expect(res.body.contentType).toBe(ct)
    }
  })

  test('WEB không có tệp ⇒ 400; platform lạ ⇒ 400; contentType từ client ⇒ 400', async () => {
    const h = await asUser(ADMIN)
    const web = await request(app)
      .post(url)
      .set(h)
      .send({ ...hop, platform: 'WEB', fileName: 'x.zip' })
    expect(web.status).toBe(400)
    expect(web.body.code).toBe('NEN_TANG_KHONG_CO_TEP')
    const la = await request(app)
      .post(url)
      .set(h)
      .send({ ...hop, platform: 'SYMBIAN' })
    expect(la.status).toBe(400)
    expect(la.body.code).toBe('PLATFORM_KHONG_HOP_LE')
    const ct = await request(app)
      .post(url)
      .set(h)
      .send({ ...hop, contentType: 'text/html' })
    expect(ct.status).toBe(400)
    expect(ct.body.code).toBe('CONTENT_TYPE_DO_MAY_CHU')
  })

  const taoNhap = async (version: string, platform: string, storageKey: string) => {
    const tao = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(await asUser(ADMIN))
      .send({ version, platform, storageKey })
    expect(tao.status).toBe(201)
    return tao.body.id as string
  }

  test('seal: .txt đổi đuôi .apk ⇒ 422 SAI_LOAI_TEP, không ghi gì, không ký', async () => {
    const id = await taoNhap('5.0.0', 'ANDROID', `releases/${SLUG}/x/ghi-chu.apk`)
    const noiDung = Buffer.from('Day chi la mot tep van ban thuong.\n')
    store.hashObject = async () => ({
      sha256: 'd'.repeat(64),
      size: noiDung.length,
      head: noiDung.subarray(0, 16),
      tail: noiDung,
    })
    const ns = await request(app)
      .post(`/api/admin/releases/${id}/seal`)
      .set(await asUser(ADMIN))
    expect(ns.status).toBe(422)
    expect(ns.body.code).toBe('SAI_LOAI_TEP')
    const r = await prisma.projectRelease.findUnique({ where: { id } })
    expect(r?.sha256).toBeNull()
    expect(r?.signature).toBeNull()
  })

  test('seal: đuôi storageKey ngoài danh sách trắng ⇒ 422, không đọc kho', async () => {
    const id = await taoNhap('5.1.0', 'ANDROID', `releases/${SLUG}/x/app.txt`)
    let daDoc = false
    store.hashObject = async () => {
      daDoc = true
      return { sha256: 'e'.repeat(64), size: 1, head: ZIP_HEAD, tail: Buffer.alloc(0) }
    }
    const ns = await request(app)
      .post(`/api/admin/releases/${id}/seal`)
      .set(await asUser(ADMIN))
    expect(ns.status).toBe(422)
    expect(ns.body.code).toBe('DUOI_TEP_KHONG_CHO_PHEP')
    expect(daDoc).toBe(false)
  })

  test('seal: tệp thật trong kho vượt trần ⇒ 422 VUOT_TRAN_KICH_THUOC', async () => {
    const id = await taoNhap('5.2.0', 'ANDROID', `releases/${SLUG}/x/to.apk`)
    store.hashObject = async () => ({
      sha256: 'f'.repeat(64),
      size: 2 * 1024 ** 3 + 1,
      head: ZIP_HEAD,
      tail: Buffer.alloc(0),
    })
    const ns = await request(app)
      .post(`/api/admin/releases/${id}/seal`)
      .set(await asUser(ADMIN))
    expect(ns.status).toBe(422)
    expect(ns.body.code).toBe('VUOT_TRAN_KICH_THUOC')
    const r = await prisma.projectRelease.findUnique({ where: { id } })
    expect(r?.signature).toBeNull()
  })

  test.each([
    ['WINDOWS', `releases/${SLUG}/x/a.exe`, Buffer.from('MZ\x90\x00', 'latin1'), Buffer.alloc(0)],
    ['MACOS', `releases/${SLUG}/x/a.pkg`, Buffer.from('xar!\x00\x1c', 'latin1'), Buffer.alloc(0)],
    [
      'LINUX',
      `releases/${SLUG}/x/a.AppImage`,
      Buffer.from('\x7fELF\x02\x01', 'latin1'),
      Buffer.alloc(0),
    ],
    [
      'LINUX',
      `releases/${SLUG}/x/a.deb`,
      Buffer.from('!<arch>\ndebian', 'latin1'),
      Buffer.alloc(0),
    ],
    ['LINUX', `releases/${SLUG}/x/a.tar.gz`, Buffer.from([0x1f, 0x8b, 0x08]), Buffer.alloc(0)],
    [
      'MACOS',
      `releases/${SLUG}/x/a.dmg`,
      Buffer.from([0x78, 0xda]),
      Buffer.concat([Buffer.from('koly'), Buffer.alloc(508)]),
    ],
  ])('seal: %s %s đúng magic ⇒ niêm phong + ký', async (platform, key, head, tail) => {
    const id = await taoNhap(`6.0.0-${key.split('.').slice(1).join('-')}`, platform, key)
    store.hashObject = async () => ({ sha256: '1'.repeat(64), size: 100, head, tail })
    const ns = await request(app)
      .post(`/api/admin/releases/${id}/seal`)
      .set(await asUser(ADMIN))
    expect(ns.status).toBe(200)
    expect(releaseSigning.verify(ns.body.signature).valid).toBe(true)
  })

  test('seal: đuôi storageKey viết HOA vẫn nhận ra loại và ký', async () => {
    const id = await taoNhap('6.2.0', 'ANDROID', `releases/${SLUG}/x/APP.APK`)
    store.hashObject = async () => ({
      sha256: '3'.repeat(64),
      size: 100,
      head: ZIP_HEAD,
      tail: Buffer.alloc(0),
    })
    const ns = await request(app)
      .post(`/api/admin/releases/${id}/seal`)
      .set(await asUser(ADMIN))
    expect(ns.status).toBe(200)
    expect(releaseSigning.verify(ns.body.signature).valid).toBe(true)
  })

  test('seal: đuôi HOA nhưng nội dung sai loại vẫn 422 - hoa thường không mở cửa sau', async () => {
    const id = await taoNhap('6.3.0', 'WINDOWS', `releases/${SLUG}/x/SETUP.EXE`)
    store.hashObject = async () => ({
      sha256: '4'.repeat(64),
      size: 100,
      head: ZIP_HEAD,
      tail: Buffer.alloc(0),
    })
    const ns = await request(app)
      .post(`/api/admin/releases/${id}/seal`)
      .set(await asUser(ADMIN))
    expect(ns.status).toBe(422)
    expect(ns.body.code).toBe('SAI_LOAI_TEP')
  })

  test('seal: tệp hợp lệ nhưng đuôi thuộc nền tảng KHÁC ⇒ 422, không đọc kho', async () => {
    const id = await taoNhap('6.4.0', 'WINDOWS', `releases/${SLUG}/x/app.apk`)
    let daDoc = false
    store.hashObject = async () => {
      daDoc = true
      return { sha256: '5'.repeat(64), size: 100, head: ZIP_HEAD, tail: Buffer.alloc(0) }
    }
    const ns = await request(app)
      .post(`/api/admin/releases/${id}/seal`)
      .set(await asUser(ADMIN))
    expect(ns.status).toBe(422)
    expect(ns.body.code).toBe('DUOI_TEP_KHONG_CHO_PHEP')
    expect(daDoc).toBe(false)
  })

  test('bất biến cũ vẫn giữ sau khi siết: signingKid trần ⇒ 400, sha256 tệp R2 khai tay ⇒ 400', async () => {
    const h = await asUser(ADMIN)
    const kid = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(h)
      .send({
        version: '6.5.0',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/r/a.apk`,
        signingKid: 'k',
      })
    expect(kid.status).toBe(400)
    const id = await taoNhap('6.5.1', 'ANDROID', `releases/${SLUG}/x/e.apk`)
    for (const than of [{ sha256: SHA }, { signature: 'abc' }, { signingKid: 'k' }]) {
      const p = await request(app).patch(`/api/admin/releases/${id}`).set(h).send(than)
      expect(p.status).toBe(400)
    }
    const r = await prisma.projectRelease.findUnique({ where: { id } })
    expect(r?.sha256).toBeNull()
    expect(r?.signature).toBeNull()
  })

  test('seal: .dmg thiếu khối koly ở 512 byte cuối ⇒ 422 SAI_LOAI_TEP', async () => {
    const id = await taoNhap('6.1.0', 'MACOS', `releases/${SLUG}/x/b.dmg`)
    store.hashObject = async () => ({
      sha256: '2'.repeat(64),
      size: 600,
      head: ZIP_HEAD,
      tail: Buffer.alloc(512),
    })
    const ns = await request(app)
      .post(`/api/admin/releases/${id}/seal`)
      .set(await asUser(ADMIN))
    expect(ns.status).toBe(422)
    expect(ns.body.code).toBe('SAI_LOAI_TEP')
  })

  // Lỗi qa-test tìm ra ở A3: PATCH đổi `platform` sau niêm phong giữ sha256 và
  // ký lại với nền tảng mới ⇒ "bản WINDOWS" trỏ vào tệp .apk được công bố.
  const niemPhongApk = async (version: string) => {
    const id = await taoNhap(version, 'ANDROID', `releases/${SLUG}/x/a.apk`)
    store.hashObject = async () => ({
      sha256: '7'.repeat(64),
      size: 100,
      head: ZIP_HEAD,
      tail: Buffer.alloc(0),
    })
    const ns = await request(app)
      .post(`/api/admin/releases/${id}/seal`)
      .set(await asUser(ADMIN))
    expect(ns.status).toBe(200)
    return id
  }

  test('PATCH đổi platform sang nền tảng không nhận đuôi tệp ⇒ 422, không ghi gì', async () => {
    const id = await niemPhongApk('7.0.0')
    const truoc = await prisma.projectRelease.findUnique({ where: { id } })
    const p = await request(app)
      .patch(`/api/admin/releases/${id}`)
      .set(await asUser(ADMIN))
      .send({ platform: 'WINDOWS', published: true })
    expect(p.status).toBe(422)
    expect(p.body.code).toBe('DUOI_TEP_KHONG_CHO_PHEP')
    const sau = await prisma.projectRelease.findUnique({ where: { id } })
    expect(sau?.platform).toBe('ANDROID')
    expect(sau?.publishedAt).toBeNull()
    expect(sau?.sha256).toBe(truoc?.sha256)
    expect(sau?.signature).toBe(truoc?.signature)
  })

  test('PATCH đổi platform mà đuôi vẫn hợp ⇒ xoá sha256 + chữ ký, buộc niêm phong lại', async () => {
    const h = await asUser(ADMIN)
    const id = await taoNhap('7.1.0', 'WINDOWS', `releases/${SLUG}/x/app.zip`)
    store.hashObject = async () => ({
      sha256: '8'.repeat(64),
      size: 100,
      head: ZIP_HEAD,
      tail: Buffer.alloc(0),
    })
    expect((await request(app).post(`/api/admin/releases/${id}/seal`).set(h)).status).toBe(200)

    // Kèm `published: true`: tệp vừa mất niêm phong nên không công bố được.
    const congBo = await request(app)
      .patch(`/api/admin/releases/${id}`)
      .set(h)
      .send({ platform: 'MACOS', published: true })
    expect(congBo.status).toBe(400)

    const doi = await request(app)
      .patch(`/api/admin/releases/${id}`)
      .set(h)
      .send({ platform: 'MACOS' })
    expect(doi.status).toBe(200)
    expect(doi.body.platform).toBe('MACOS')
    expect(doi.body.sha256).toBeNull()
    expect(doi.body.fileSize).toBeNull()
    expect(doi.body.signature).toBeNull()
    expect(doi.body.signingKid).toBeNull()

    const lai = await request(app).post(`/api/admin/releases/${id}/seal`).set(h)
    expect(lai.status).toBe(200)
    expect(releaseSigning.verify(lai.body.signature).payload).toMatchObject({ platform: 'MACOS' })
  })

  test('PATCH không đổi platform (gửi lại đúng giá trị cũ) thì giữ niêm phong', async () => {
    const id = await niemPhongApk('7.2.0')
    const p = await request(app)
      .patch(`/api/admin/releases/${id}`)
      .set(await asUser(ADMIN))
      .send({ platform: 'ANDROID', published: true })
    expect(p.status).toBe(200)
    expect(p.body.sha256).toBe('7'.repeat(64))
    expect(releaseSigning.verify(p.body.signature).valid).toBe(true)
  })

  test.each([
    ['dự án khác', 'releases/du-an-khac/abc/a.apk'],
    ['ngoài releases/', 'uploads/a.apk'],
    ['leo thư mục', `releases/${SLUG}/../du-an-khac/a.apk`],
    ['đoạn rỗng', `releases/${SLUG}//a.apk`],
    ['chỉ có tiền tố', `releases/${SLUG}/`],
    ['tiền tố của slug dài hơn', `releases/${SLUG}-x/abc/a.apk`],
  ])('create/PATCH storageKey %s ⇒ 400 STORAGE_KEY_SAI_DU_AN', async (_ten, storageKey) => {
    const h = await asUser(ADMIN)
    const tao = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(h)
      .send({ version: '8.0.0', platform: 'ANDROID', storageKey })
    expect(tao.status).toBe(400)
    expect(tao.body.code).toBe('STORAGE_KEY_SAI_DU_AN')

    const id = await taoNhap(`8.0.1-${_ten.length}`, 'ANDROID', `releases/${SLUG}/x/f.apk`)
    const p = await request(app).patch(`/api/admin/releases/${id}`).set(h).send({ storageKey })
    expect(p.status).toBe(400)
    expect(p.body.code).toBe('STORAGE_KEY_SAI_DU_AN')
    const r = await prisma.projectRelease.findUnique({ where: { id } })
    expect(r?.storageKey).toBe(`releases/${SLUG}/x/f.apk`)
  })

  test('seal: storageKey ngoài tiền tố dự án (hàng cũ, ghi thẳng DB) ⇒ 422, không đọc kho', async () => {
    const r = await prisma.projectRelease.create({
      data: {
        projectId,
        version: '8.1.0',
        platform: 'ANDROID',
        storageKey: 'releases/du-an-khac/abc/a.apk',
      },
    })
    let daDoc = false
    store.hashObject = async () => {
      daDoc = true
      return { sha256: '9'.repeat(64), size: 100, head: ZIP_HEAD, tail: Buffer.alloc(0) }
    }
    const ns = await request(app)
      .post(`/api/admin/releases/${r.id}/seal`)
      .set(await asUser(ADMIN))
    expect(ns.status).toBe(422)
    expect(ns.body.code).toBe('STORAGE_KEY_SAI_DU_AN')
    expect(daDoc).toBe(false)
    const sau = await prisma.projectRelease.findUnique({ where: { id: r.id } })
    expect(sau?.sha256).toBeNull()
  })
})
