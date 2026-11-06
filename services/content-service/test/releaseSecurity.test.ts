// Trung tâm an ninh phát hành (docs/security-plan.md §3, B2/B3/B6).
//
// Canh các bất biến mà một trang quản trị "trông vẫn chạy" sẽ che mất:
//   - tệp bị thay trong kho ⇒ LECH_TOAN_VEN, tự gỡ công bố, link tải chết, và
//     KHÔNG ký lại được qua nút Niêm phong;
//   - thu hồi/khôi phục/ký lại đòi step-up (TOTP < 5 phút) + lý do;
//   - VirusTotal thiếu khoá ⇒ CHUA_QUET (không giả vờ đã quét); có phát hiện ⇒
//     NGHI_MA_DOC + gỡ công bố;
//   - route cron chỉ mở với token riêng;
//   - nhật ký là chỉ-thêm và chuỗi băm chỉ ra chỗ đứt.
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!'
process.env.RELEASE_INTEGRITY_TOKEN = 'token-kiem-toan-ven-test'
delete process.env.INTERNAL_API_TOKEN
delete process.env.VIRUSTOTAL_API_KEY
process.env.S3_PUBLIC_ENDPOINT = 'https://cdn-test.example'
process.env.S3_BUCKET = 'tsudev-test'
process.env.S3_ACCESS_KEY = 'test-access-key'
process.env.S3_SECRET_KEY = 'test-secret-key'

const request = require('supertest')
const { prisma } = require('@tsudev/db')
const { signIdentity } = require('@tsudev/identity-token')
const { issueStepUp } = require('@tsudev/auth')
const { app } = require('../src/index')
const { store } = require('../src/objectStore')
const releaseSigning = require('../src/releaseSigning')

const ADMIN = 'test-admin-relsec'
const OWNER = 'test-owner-relsec'
const SLUG = 'test-relsec-du-an'
const SECRET = process.env.INTERNAL_IDENTITY_SECRET as string
const ZIP_HEAD = Buffer.from([0x50, 0x4b, 0x03, 0x04])
const SHA_GOC = 'c'.repeat(64)
const SHA_BI_THAY = 'd'.repeat(64)
const LY_DO = 'nghi lộ khoá S3, thu hồi để điều tra'

const asUser = async (sub: string) => ({
  Authorization: `Bearer ${await signIdentity({ sub }, SECRET)}`,
})
const stepUpCua = async (username: string) => {
  const u = await prisma.user.findUnique({ where: { username } })
  return issueStepUp(u, SECRET).token
}

const clean = () =>
  prisma.$transaction([
    prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_hard_delete = 'on'`),
    prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_audit_purge = 'on'`),
    prisma.$executeRawUnsafe(
      `DELETE FROM "TrustAuditLog" WHERE "targetType" = 'ProjectRelease' AND "targetLabel" LIKE '${SLUG}%'`
    ),
    prisma.$executeRawUnsafe(`DELETE FROM "Project" WHERE slug = '${SLUG}'`),
  ])

let projectId = ''
const hashGoc = async () => ({
  sha256: SHA_GOC,
  size: 1000,
  head: ZIP_HEAD,
  tail: Buffer.alloc(0),
})

beforeAll(async () => {
  await clean()
  for (const [u, role] of [
    [ADMIN, 'ADMIN'],
    [OWNER, 'OWNER'],
  ] as const) {
    await prisma.user.upsert({
      where: { username: u },
      update: { role },
      create: { username: u, email: `${u}@tsudev.local`, displayName: u, role },
    })
    await prisma.user.update({
      where: { username: u },
      data: {
        totp: {
          upsert: {
            create: { secretEnc: 'test', confirmedAt: new Date() },
            update: { confirmedAt: new Date() },
          },
        },
      },
    })
  }
  const p = await prisma.project.create({
    data: { slug: SLUG, name: 'Dự án test an ninh', summary: 'x', published: true },
  })
  projectId = p.id
}, 30000)

afterAll(async () => {
  await clean()
  await prisma.user.deleteMany({ where: { username: { in: [ADMIN, OWNER] } } })
  await prisma.$disconnect()
})

let soPhienBan = 0
/** Tạo + niêm phong + công bố một bản ANDROID có tệp trong kho. */
async function banDaCongBo(): Promise<string> {
  const h = await asUser(ADMIN)
  soPhienBan++
  const tao = await request(app)
    .post(`/api/admin/projects/${SLUG}/releases`)
    .set(h)
    .send({
      version: `9.0.${soPhienBan}`,
      platform: 'ANDROID',
      storageKey: `releases/${SLUG}/k${soPhienBan}/app.apk`,
    })
  expect(tao.status).toBe(201)
  store.hashObject = hashGoc
  const ns = await request(app).post(`/api/admin/releases/${tao.body.id}/seal`).set(h)
  expect(ns.status).toBe(200)
  const cb = await request(app)
    .patch(`/api/admin/releases/${tao.body.id}`)
    .set(h)
    .send({ published: true })
  expect(cb.status).toBe(200)
  return tao.body.id
}

const congKhai = async () =>
  (await request(app).get(`/api/projects/${SLUG}/releases`)).body.map((r: { id: string }) => r.id)
const taiVe = (id: string) => request(app).get(`/api/projects/${SLUG}/releases/${id}/download`)
const nhatKy = (id: string) =>
  prisma.trustAuditLog.findMany({
    where: { targetType: 'ProjectRelease', targetId: id },
    orderBy: { createdAt: 'asc' },
  })

describe('niêm phong ghi nhận an ninh', () => {
  test('seal đặt lastIntegrityAt, ghi CHUA_QUET khi thiếu khoá VirusTotal, ghi nhật ký', async () => {
    const id = await banDaCongBo()
    const r = await prisma.projectRelease.findUnique({ where: { id } })
    expect(r.lastIntegrityAt).not.toBeNull()
    expect(r.scanResult).toMatchObject({ status: 'CHUA_QUET' })
    expect(r.securityState).toBe('OK')
    const actions = (await nhatKy(id)).map((l: { action: string }) => l.action)
    expect(actions).toEqual(['RELEASE_SEAL', 'RELEASE_PUBLISH'])
  })
})

describe('kiểm toàn vẹn (G5)', () => {
  test('tệp khớp ⇒ KHOP, vẫn công bố', async () => {
    const id = await banDaCongBo()
    store.hashObject = hashGoc
    const res = await request(app)
      .post(`/api/admin/releases/${id}/integrity`)
      .set(await asUser(ADMIN))
    expect(res.status).toBe(200)
    expect(res.body.ketQua).toBe('KHOP')
    expect(await congKhai()).toContain(id)
  })

  test('sửa một byte trong kho ⇒ LECH_TOAN_VEN, tự gỡ công bố, link tải 404, nhật ký 1 dòng', async () => {
    const id = await banDaCongBo()
    expect((await taiVe(id)).status).toBe(302)

    store.hashObject = async () => ({ ...(await hashGoc()), sha256: SHA_BI_THAY })
    const h = await asUser(ADMIN)
    const lan1 = await request(app).post(`/api/admin/releases/${id}/integrity`).set(h)
    expect(lan1.body.ketQua).toBe('LECH')
    // Lượt kiểm lặp lại không đẻ thêm dòng báo động cho cùng một sự cố.
    await request(app).post(`/api/admin/releases/${id}/integrity`).set(h)

    const r = await prisma.projectRelease.findUnique({ where: { id } })
    expect(r.securityState).toBe('LECH_TOAN_VEN')
    expect(r.publishedAt).toBeNull()
    expect(await congKhai()).not.toContain(id)
    expect((await taiVe(id)).status).toBe(404)
    const lech = (await nhatKy(id)).filter(
      (l: { action: string }) => l.action === 'RELEASE_INTEGRITY_MISMATCH'
    )
    expect(lech).toHaveLength(1)
    const admin = await prisma.user.findUnique({ where: { username: ADMIN } })
    expect(lech[0].actorId).toBe(admin.id)
  })

  test('tệp biến mất khỏi kho (NoSuchKey) ⇒ LECH, không phải lỗi tạm', async () => {
    const id = await banDaCongBo()
    store.hashObject = async () => {
      const e = new Error('The specified key does not exist.')
      e.name = 'NoSuchKey'
      throw e
    }
    const res = await request(app)
      .post(`/api/admin/releases/${id}/integrity`)
      .set(await asUser(ADMIN))
    expect(res.body.ketQua).toBe('LECH')
  })

  test('kho chập chờn ⇒ 502 LOI, KHÔNG đổi trạng thái (không báo động oan)', async () => {
    const id = await banDaCongBo()
    store.hashObject = async () => {
      throw new Error('socket hang up')
    }
    const res = await request(app)
      .post(`/api/admin/releases/${id}/integrity`)
      .set(await asUser(ADMIN))
    expect(res.status).toBe(502)
    const r = await prisma.projectRelease.findUnique({ where: { id } })
    expect(r.securityState).toBe('OK')
    expect(r.publishedAt).not.toBeNull()
  })

  test('bản đang LỆCH: không công bố lại được, không niêm phong lại được (không ký tệp bị thay)', async () => {
    const id = await banDaCongBo()
    const h = await asUser(ADMIN)
    store.hashObject = async () => ({ ...(await hashGoc()), sha256: SHA_BI_THAY })
    await request(app).post(`/api/admin/releases/${id}/integrity`).set(h)

    const cb = await request(app)
      .patch(`/api/admin/releases/${id}`)
      .set(h)
      .send({ published: true })
    expect(cb.status).toBe(409)
    expect(cb.body.code).toBe('KHONG_CONG_BO_DUOC')

    const ns = await request(app).post(`/api/admin/releases/${id}/seal`).set(h)
    expect(ns.status).toBe(409)
    expect(ns.body.code).toBe('KHONG_NIEM_PHONG_LAI')
    const r = await prisma.projectRelease.findUnique({ where: { id } })
    expect(r.sha256).toBe(SHA_GOC)

    const doiTep = await request(app)
      .patch(`/api/admin/releases/${id}`)
      .set(h)
      .send({ storageKey: `releases/${SLUG}/moi/app.apk` })
    expect(doiTep.status).toBe(409)
    expect(doiTep.body.code).toBe('GIU_TEP_DIEU_TRA')
  })

  test('niêm phong LẠI bản OK mà kho ra băm khác ⇒ 409 LECH_TOAN_VEN, chữ ký cũ giữ nguyên', async () => {
    const id = await banDaCongBo()
    const truoc = await prisma.projectRelease.findUnique({ where: { id } })
    store.hashObject = async () => ({ ...(await hashGoc()), sha256: SHA_BI_THAY })
    const ns = await request(app)
      .post(`/api/admin/releases/${id}/seal`)
      .set(await asUser(ADMIN))
    expect(ns.status).toBe(409)
    expect(ns.body.code).toBe('LECH_TOAN_VEN')
    const sau = await prisma.projectRelease.findUnique({ where: { id } })
    expect(sau.signature).toBe(truoc.signature)
    expect(sau.sha256).toBe(SHA_GOC)
    expect(sau.securityState).toBe('LECH_TOAN_VEN')
    expect(sau.publishedAt).toBeNull()
  })

  test('tệp được khôi phục đúng nguyên bản ⇒ gỡ cờ LỆCH nhưng KHÔNG tự công bố lại', async () => {
    const id = await banDaCongBo()
    const h = await asUser(ADMIN)
    store.hashObject = async () => ({ ...(await hashGoc()), sha256: SHA_BI_THAY })
    await request(app).post(`/api/admin/releases/${id}/integrity`).set(h)
    store.hashObject = hashGoc
    const res = await request(app).post(`/api/admin/releases/${id}/integrity`).set(h)
    expect(res.body.ketQua).toBe('KHOP')
    const r = await prisma.projectRelease.findUnique({ where: { id } })
    expect(r.securityState).toBe('OK')
    expect(r.publishedAt).toBeNull()
  })
})

describe('thu hồi / khôi phục (G7 step-up)', () => {
  test('thiếu step-up ⇒ 401 STEP_UP_REQUIRED, không đổi gì', async () => {
    const id = await banDaCongBo()
    const res = await request(app)
      .post(`/api/admin/releases/${id}/revoke`)
      .set(await asUser(ADMIN))
      .send({ reason: LY_DO })
    expect(res.status).toBe(401)
    expect(res.body.code).toBe('STEP_UP_REQUIRED')
    expect((await prisma.projectRelease.findUnique({ where: { id } })).revokedAt).toBeNull()
  })

  test('step-up của NGƯỜI KHÁC, hết hạn, hay sai chữ ký ⇒ 401', async () => {
    const id = await banDaCongBo()
    const h = await asUser(ADMIN)
    const owner = await prisma.user.findUnique({ where: { username: OWNER } })
    const admin = await prisma.user.findUnique({ where: { username: ADMIN } })
    const cuaNguoiKhac = issueStepUp(owner, SECRET).token
    const hetHan = issueStepUp(admin, SECRET, Date.now() - 6 * 60 * 1000).token
    const saiKhoa = issueStepUp(admin, 'mot-bi-mat-khac-du-dai-32-ky-tu!!!').token
    for (const stepUp of [cuaNguoiKhac, hetHan, saiKhoa, 'rac.rac'])
      expect(
        (
          await request(app)
            .post(`/api/admin/releases/${id}/revoke`)
            .set(h)
            .send({ reason: LY_DO, stepUp })
        ).status
      ).toBe(401)
  })

  test('đổi mật khẩu (sessionVersion tăng) làm token step-up cũ chết', async () => {
    const id = await banDaCongBo()
    const token = await stepUpCua(ADMIN)
    await prisma.user.update({
      where: { username: ADMIN },
      data: { sessionVersion: { increment: 1 } },
    })
    const admin = await prisma.user.findUnique({ where: { username: ADMIN } })
    const res = await request(app)
      .post(`/api/admin/releases/${id}/revoke`)
      .set({
        Authorization: `Bearer ${await signIdentity({ sub: ADMIN, sv: admin.sessionVersion }, SECRET)}`,
      })
      .send({ reason: LY_DO, stepUp: token })
    expect(res.status).toBe(401)
  })

  test('lý do quá ngắn ⇒ 400 THIEU_LY_DO', async () => {
    const id = await banDaCongBo()
    const res = await request(app)
      .post(`/api/admin/releases/${id}/revoke`)
      .set(await asUser(ADMIN))
      .send({ reason: 'ngắn', stepUp: await stepUpCua(ADMIN) })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('THIEU_LY_DO')
  })

  test('thu hồi ⇒ ẩn khỏi trang công khai + link tải 404, GIỮ tệp; khôi phục ⇒ hiện lại', async () => {
    const id = await banDaCongBo()
    const h = await asUser(ADMIN)
    const th = await request(app)
      .post(`/api/admin/releases/${id}/revoke`)
      .set(h)
      .send({ reason: LY_DO, stepUp: await stepUpCua(ADMIN) })
    expect(th.status).toBe(200)
    expect(th.body.revokeReason).toBe(LY_DO)
    expect(th.body.storageKey).toBeTruthy()
    expect(await congKhai()).not.toContain(id)
    expect((await taiVe(id)).status).toBe(404)
    // Thu hồi rồi thì không công bố "vòng qua" bằng PATCH.
    const cb = await request(app)
      .patch(`/api/admin/releases/${id}`)
      .set(h)
      .send({ published: true })
    expect(cb.body.code).toBe('KHONG_CONG_BO_DUOC')

    const kp = await request(app)
      .post(`/api/admin/releases/${id}/restore`)
      .set(h)
      .send({ reason: 'điều tra xong, tệp nguyên vẹn', stepUp: await stepUpCua(ADMIN) })
    expect(kp.status).toBe(200)
    expect(await congKhai()).toContain(id)
    const actions = (await nhatKy(id)).map((l: { action: string }) => l.action)
    expect(actions).toEqual([
      'RELEASE_SEAL',
      'RELEASE_PUBLISH',
      'RELEASE_REVOKE',
      'RELEASE_RESTORE',
    ])
  })
})

describe('ký lại (OWNER + step-up)', () => {
  test('ADMIN ⇒ 403; OWNER có step-up ⇒ chữ ký mới bằng khoá hiện hành, nhật ký', async () => {
    const id = await banDaCongBo()
    const a = await request(app)
      .post(`/api/admin/releases/${id}/resign`)
      .set(await asUser(ADMIN))
      .send({ stepUp: await stepUpCua(ADMIN) })
    expect(a.status).toBe(403)

    const o = await request(app)
      .post(`/api/admin/releases/${id}/resign`)
      .set(await asUser(OWNER))
      .send({ stepUp: await stepUpCua(OWNER) })
    expect(o.status).toBe(200)
    expect(o.body.signingKid).toBe(releaseSigning.kid)
    expect(releaseSigning.verify(o.body.signature).valid).toBe(true)
    expect((await nhatKy(id)).map((l: { action: string }) => l.action)).toContain('RELEASE_RESIGN')
  })
})

describe('bảng kê', () => {
  test('trạng thái tính ở máy chủ + đếm theo trạng thái + lọc', async () => {
    const ok = await banDaCongBo()
    const lech = await banDaCongBo()
    store.hashObject = async () => ({ ...(await hashGoc()), sha256: SHA_BI_THAY })
    const h = await asUser(ADMIN)
    await request(app).post(`/api/admin/releases/${lech}/integrity`).set(h)
    const nhap = await prisma.projectRelease.create({
      data: {
        projectId,
        version: '0.0.1-nhap',
        platform: 'ANDROID',
        storageKey: `releases/${SLUG}/nhap/a.apk`,
      },
    })

    const res = await request(app).get(`/api/admin/release-security?project=${SLUG}`).set(h)
    expect(res.status).toBe(200)
    const theoId = Object.fromEntries(
      res.body.items.map((i: { id: string; state: string }) => [i.id, i.state])
    )
    expect(theoId[ok]).toBe('OK')
    expect(theoId[lech]).toBe('LECH_TOAN_VEN')
    expect(theoId[nhap.id]).toBe('CHUA_NIEM_PHONG')
    expect(res.body.summary.LECH_TOAN_VEN).toBeGreaterThanOrEqual(1)
    expect(res.body.items[0]).not.toHaveProperty('storageKey')

    const loc = await request(app)
      .get(`/api/admin/release-security?project=${SLUG}&state=LECH_TOAN_VEN`)
      .set(h)
    expect(loc.body.items.map((i: { id: string }) => i.id)).toEqual(expect.arrayContaining([lech]))
    expect(loc.body.items.every((i: { state: string }) => i.state === 'LECH_TOAN_VEN')).toBe(true)
    expect((await request(app).get('/api/admin/release-security?state=BIA').set(h)).status).toBe(
      400
    )
  })

  test('ký bằng khoá đã nghỉ ⇒ KHOA_DA_NGHI (chữ ký vẫn hợp lệ)', async () => {
    const id = await banDaCongBo()
    const r = await prisma.projectRelease.findUnique({ where: { id } })
    const goc = releaseSigning.verify
    // Mô phỏng sau xoay khoá: chữ ký kiểm được nhưng bằng một kid KHÁC khoá đang ký.
    releaseSigning.verify = (jws: string) => {
      const v = goc(jws)
      return v.valid ? { ...v, keyId: 'khoa-cu-2025' } : v
    }
    try {
      const res = await request(app)
        .get(`/api/admin/release-security?project=${SLUG}`)
        .set(await asUser(ADMIN))
      const dong = res.body.items.find((i: { id: string }) => i.id === r.id)
      expect(dong.state).toBe('KHOA_DA_NGHI')
    } finally {
      releaseSigning.verify = goc
    }
  })
})

describe('VirusTotal (G4)', () => {
  const fetchGoc = global.fetch
  afterEach(() => {
    global.fetch = fetchGoc
    delete process.env.VIRUSTOTAL_API_KEY
  })

  test('có phát hiện ⇒ NGHI_MA_DOC, chặn công bố; chỉ gửi BĂM', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'vt-test'
    const goi: string[] = []
    global.fetch = (async (url: string) => {
      goi.push(String(url))
      return new Response(
        JSON.stringify({
          data: { attributes: { last_analysis_stats: { malicious: 3, suspicious: 1 } } },
        }),
        { status: 200 }
      )
    }) as typeof fetch
    const h = await asUser(ADMIN)
    const tao = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(h)
      .send({ version: '9.9.9', platform: 'ANDROID', storageKey: `releases/${SLUG}/vt/app.apk` })
    store.hashObject = hashGoc
    const ns = await request(app).post(`/api/admin/releases/${tao.body.id}/seal`).set(h)
    expect(ns.status).toBe(200)
    expect(ns.body.securityState).toBe('NGHI_MA_DOC')
    expect(ns.body.scanResult).toMatchObject({ status: 'PHAT_HIEN', malicious: 3 })
    expect(goi).toEqual([`https://www.virustotal.com/api/v3/files/${SHA_GOC}`])
    const cb = await request(app)
      .patch(`/api/admin/releases/${tao.body.id}`)
      .set(h)
      .send({ published: true })
    expect(cb.body.code).toBe('KHONG_CONG_BO_DUOC')
  })

  test('băm chưa từng thấy (404) ⇒ CHUA_CO_DU_LIEU, không chặn', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'vt-test'
    global.fetch = (async () => new Response('{}', { status: 404 })) as typeof fetch
    const h = await asUser(ADMIN)
    const tao = await request(app)
      .post(`/api/admin/projects/${SLUG}/releases`)
      .set(h)
      .send({ version: '9.9.8', platform: 'ANDROID', storageKey: `releases/${SLUG}/vt2/app.apk` })
    store.hashObject = hashGoc
    const ns = await request(app).post(`/api/admin/releases/${tao.body.id}/seal`).set(h)
    expect(ns.body.securityState).toBe('OK')
    expect(ns.body.scanResult).toMatchObject({ status: 'CHUA_CO_DU_LIEU' })
  })
})

describe('route cron nội bộ', () => {
  const duong = '/api/internal/releases/integrity'

  test('thiếu hoặc sai token ⇒ 401, kể cả khi có danh tính ADMIN', async () => {
    expect((await request(app).post(duong)).status).toBe(401)
    expect((await request(app).post(duong).set('x-release-integrity-token', 'sai')).status).toBe(
      401
    )
    expect(
      (
        await request(app)
          .post(duong)
          .set(await asUser(ADMIN))
      ).status
    ).toBe(401)
  })

  test('đúng token ⇒ băm lại, báo cáo bản lệch', async () => {
    const id = await banDaCongBo()
    // Lượt kiểm theo lịch quét MỌI bản trong DB. DB local là DB dev dùng chung:
    // khoá ngoài dự án test PHẢI ra lỗi tạm (LOI - không đổi trạng thái), nếu
    // không kho giả sẽ đánh dấu LỆCH và gỡ công bố dữ liệu dev thật (đã xảy ra
    // một lần lúc viết test này, 06/11/2026).
    store.hashObject = async (key: string) => {
      if (!key.startsWith(`releases/${SLUG}/`)) throw new Error('ngoài phạm vi test')
      return key.includes(`/k${soPhienBan}/`)
        ? { ...(await hashGoc()), sha256: SHA_BI_THAY }
        : hashGoc()
    }
    const res = await request(app)
      .post(duong)
      .set('x-release-integrity-token', process.env.RELEASE_INTEGRITY_TOKEN)
      .send({ budgetMs: 60000 })
    expect(res.status).toBe(200)
    expect(res.body.checked).toBeGreaterThanOrEqual(1)
    expect(res.body.lech.map((l: { id: string }) => l.id)).toContain(id)
    const log = (await nhatKy(id)).find(
      (l: { action: string }) => l.action === 'RELEASE_INTEGRITY_MISMATCH'
    )
    expect(log.actorId).toBe('system')
  })
})

describe('nhật ký chỉ-thêm (G8)', () => {
  test('DELETE/UPDATE dòng nhật ký ⇒ trigger từ chối', async () => {
    const id = await banDaCongBo()
    const [dong] = await nhatKy(id)
    await expect(prisma.trustAuditLog.delete({ where: { id: dong.id } })).rejects.toThrow(
      /CHỈ-THÊM/
    )
    await expect(
      prisma.trustAuditLog.update({ where: { id: dong.id }, data: { note: 'sửa' } })
    ).rejects.toThrow(/CHỈ-THÊM/)
  })

  test('xoá một dòng ở GIỮA ⇒ kiểm chuỗi chỉ ra dòng ngay sau nó', async () => {
    const id = await banDaCongBo()
    const h = await asUser(ADMIN)
    store.hashObject = async () => ({ ...(await hashGoc()), sha256: SHA_BI_THAY })
    await request(app).post(`/api/admin/releases/${id}/integrity`).set(h)
    const dong = await nhatKy(id)
    expect(dong.length).toBeGreaterThanOrEqual(3)
    const truoc = await request(app).get('/api/admin/release-security/audit-chain').set(h)
    expect(truoc.status).toBe(200)
    expect(truoc.body.breaks.map((b: { id: string }) => b.id)).not.toContain(dong[2].id)

    await prisma.$transaction([
      prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_audit_purge = 'on'`),
      prisma.$executeRawUnsafe(`DELETE FROM "TrustAuditLog" WHERE id = $1`, dong[1].id),
    ])
    const sau = await request(app).get('/api/admin/release-security/audit-chain').set(h)
    expect(sau.body.ok).toBe(false)
    expect(sau.body.breaks.map((b: { id: string }) => b.id)).toContain(dong[2].id)
  })
})
