'use strict'
// Seed dữ liệu khởi tạo cho môi trường dev: user, blog, docs, chương trình dấu.
const path = require('path')
require('dotenv').config({ quiet: true, path: path.join(__dirname, '../../../.env') })
const { prisma } = require('../src/index')

async function main() {
  // --- Users ---
  // tsudev là OWNER - quản trị cao nhất, bậc duy nhất tạo được tài khoản và cấp
  // vai trò. `update.role` được đặt CÓ CHỦ ĐÍCH (khác các user khác dưới đây):
  // tài khoản tsudev đã tồn tại từ đợt seed cũ với role ADMIN, nên phải nâng nó
  // ở nhánh update, không chỉ nhánh create. Đây là đường DUY NHẤT cấp OWNER -
  // không endpoint dữ liệu nào cấp được bậc này.
  // tsudev do người vận hành kiểm soát, gắn với hộp thư thật; seed nó là đã xác
  // minh - đây là tài khoản gốc, không đi qua luồng đăng ký nên không có token
  // xác minh nào. Đặt ở CẢ create lẫn update vì tài khoản đã tồn tại từ đợt seed
  // cũ (emailVerifiedAt = NULL), cùng lý do với role.
  const admin = await prisma.user.upsert({
    where: { username: 'tsudev' },
    update: { role: 'OWNER', emailVerifiedAt: new Date() },
    create: {
      username: 'tsudev',
      email: 'devnguyentrangtinhsu@gmail.com',
      displayName: 'Nguyễn Trang Tình Sử',
      role: 'OWNER',
      emailVerifiedAt: new Date(),
      bio: 'Founder của tsudev - Decoding the Future, One Commit at a Time.',
    },
  })
  await prisma.user.upsert({
    where: { username: 'alice' },
    update: {},
    create: {
      username: 'alice',
      email: 'alice@tsudev.com',
      displayName: 'Alice',
      role: 'MEMBER',
    },
  })
  await prisma.user.upsert({
    where: { username: 'bob' },
    update: {},
    create: {
      username: 'bob',
      email: 'bob@tsudev.com',
      displayName: 'Bob',
      role: 'VIP',
    },
  })

  // --- Blog posts ---
  const posts = [
    {
      slug: 'welcome-to-tsudev',
      title: 'Chào mừng đến với tsudev',
      excerpt: 'Nơi phát hành ứng dụng tự phát triển, kèm tài liệu cài đặt và blog kỹ thuật.',
      tags: ['thông báo', 'giới thiệu'],
      contentMd:
        '# Chào mừng\n\ntsudev là website cá nhân để **phát hành các ứng dụng tự phát triển**: mỗi bản cài đặt kèm **SHA-256** do máy chủ tính và **chữ ký Ed25519** xác minh được bằng khoá công khai, cùng **tài liệu** cài đặt và **blog** kỹ thuật.\n\n> Decoding the Future, One Commit at a Time.',
    },
    {
      slug: 'kien-truc-microservices',
      title: 'Kiến trúc từ Monolith đến Microservices',
      excerpt: 'Vì sao nên bắt đầu bằng modular monolith.',
      tags: ['kiến trúc', 'backend'],
      contentMd:
        '## Modular Monolith\n\nVới đội nhỏ, gộp service và tách sau khi cần scale là lựa chọn tối ưu về chi phí vận hành.',
    },
    {
      slug: 'toi-uu-seo-nextjs',
      title: 'Tối ưu SEO với Next.js App Router',
      excerpt: 'RSC, streaming và metadata API.',
      tags: ['frontend', 'seo'],
      contentMd:
        '## SEO-first\n\nApp Router mang lại Server Components và metadata API giúp SEO tuyệt đối cho blog và docs.',
    },
  ]
  for (const p of posts) {
    await prisma.post.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...p, authorId: admin.id },
    })
  }

  // --- Docs ---
  const docs = [
    {
      slug: 'getting-started',
      title: 'Bắt đầu nhanh',
      category: 'guide',
      position: 1,
      contentMd: '## Cài đặt\n\n```bash\nnpm run dev:local\n```',
    },
    {
      slug: 'api-reference',
      title: 'Tài liệu API',
      category: 'reference',
      position: 2,
      contentMd:
        '## Endpoint công khai\n\nĐường công khai duy nhất của tsudev cho bên thứ ba là khoá ký bản phát hành:\n\n- `GET /.well-known/tsudev-release-jwks.json` - khoá công khai Ed25519, dùng để tự xác minh chữ ký của tệp cài đặt mà không cần tin máy chủ tsudev\n\nCác đường dẫn nội dung (`/api/posts`, `/api/docs`, `/api/projects`) **không** mở ra ngoài: chúng chỉ phục vụ lớp render của chính site và nằm sau cổng chặn `INTERNAL_API_TOKEN`.',
    },
  ]
  for (const d of docs) {
    await prisma.doc.upsert({ where: { slug: d.slug }, update: {}, create: d })
  }

  // --- Dự án & bản quyền ---
  // Ba trạng thái bản quyền đều có mặt để trang /projects và /admin/projects
  // hiện được cả ba nhánh hiển thị ngay từ lần chạy đầu.
  const projects = [
    {
      slug: 'tsudev-platform',
      name: 'tsudev Platform',
      summary:
        'Nền tảng web monorepo: phát hành ứng dụng, blog, tài liệu, đăng nhập và object storage.',
      descriptionMd:
        '## Tổng quan\n\nMonorepo npm workspaces gồm một ứng dụng Next.js và ba service Express dùng chung một database qua Prisma.\n\n- Một cổng vào duy nhất ở dev, phân biệt bằng subdomain\n- Nguồn sự thật về cổng/tên miền nằm trong `config/topology.json`\n- Trình duyệt không bao giờ gọi thẳng cổng service\n',
      kind: 'APP',
      status: 'BETA',
      version: '0.1.0',
      license: 'MIT',
      repoUrl: 'https://github.com/tsudev-tsudev/tsudev',
      copyrightStatus: 'PENDING',
      copyrightOwner: 'Nguyễn Trang Tình Sử',
      featured: true,
      sortOrder: 1,
    },
    {
      slug: 'tsudev-trust-crypto',
      name: 'Ký bản phát hành tsudev',
      summary:
        'Thư viện ký Ed25519 viết bằng Rust biên dịch sang WASM - ký checksum của mọi tệp cài đặt phát hành trên tsudev.com.',
      descriptionMd:
        '## Ký bản phát hành\n\nDự án cá nhân không có chứng chỉ ký mã thương mại. Mỗi bản phát hành trên tsudev.com vì thế kèm SHA-256 và một chữ ký Ed25519 xác minh được độc lập qua JWKS công khai - không cần tin máy chủ tsudev.\n',
      kind: 'LIBRARY',
      status: 'BETA',
      version: '0.1.0',
      license: 'MIT',
      copyrightStatus: 'REGISTERED',
      copyrightNo: 'TSD-2026-0001',
      copyrightAt: new Date('2026-03-14'),
      copyrightOwner: 'Nguyễn Trang Tình Sử',
      featured: true,
      sortOrder: 2,
    },
    {
      slug: 'tsudev-ui',
      name: '@tsudev/ui',
      summary:
        'Hệ thống thiết kế ba chế độ Sáng · Ấm · Tối: token màu, component dùng chung, Storybook.',
      descriptionMd:
        '## Design system\n\nThứ bậc thị giác dựng bằng độ sáng nền (`--surface` < `--panel` < `--panel-2`) chứ không bằng viền hay đổ bóng.\n',
      kind: 'LIBRARY',
      status: 'STABLE',
      version: '0.1.0',
      license: 'MIT',
      copyrightStatus: 'NONE',
      sortOrder: 3,
    },
    {
      slug: 'topology-check',
      name: 'topology:check',
      summary:
        'Cổng chặn giữ cổng và tên miền trong mã nguồn luôn khớp một nguồn sự thật duy nhất.',
      descriptionMd:
        '## Vì sao\n\nCổng bị hardcode rải rác là thứ mọc lại sau mỗi lần dọn. `topology:check` chạy trong CI và `pre-push`, bắt ba loại lệch: literal ngoài danh sách miễn trừ, cổng không có trong topology, và compose công bố sai cổng.\n',
      kind: 'TOOL',
      status: 'STABLE',
      version: '1.0.0',
      license: 'MIT',
      copyrightStatus: 'NONE',
      sortOrder: 4,
    },
  ]
  for (const p of projects) {
    await prisma.project.upsert({ where: { slug: p.slug }, update: { ...p }, create: { ...p } })
  }

  // --- Bản phát hành tải về được -------------------------------------------
  //
  // Seed có bản phát hành là BẮT BUỘC, không phải trang trí: khối "Tải về" ở
  // trang chủ TỰ ẨN khi không có bản nào (xem components/DownloadSection.tsx),
  // nên không có dữ liệu seed thì cả tính năng đó vô hình ở môi trường dev và
  // người rà giao diện sẽ không biết nó tồn tại để mà rà.
  //
  // `storageKey` ở đây trỏ tới object KHÔNG CÓ THẬT trong MinIO. Cố ý: seed
  // không được phép đẻ ra 50 MB tệp nhị phân. Hệ quả cần biết khi thử tay: bấm
  // "Tải" sẽ chuyển hướng tới MinIO rồi ăn 404 - đường dẫn và bộ đếm vẫn chạy
  // đúng, chỉ không có tệp ở cuối. Bản SOURCE thì tải được thật vì nó trỏ ra
  // GitHub.
  //
  // sha256 là giá trị GIẢ có hình dạng đúng (64 ký tự hex). Nó phải đúng hình
  // dạng vì đường ghi của API từ chối chuỗi sai hình dạng - một seed không đi
  // qua được chính phép kiểm của mình là một seed nói dối về hệ thống.
  const releases = [
    {
      slug: 'tsudev-ui',
      version: '0.1.0',
      platform: 'SOURCE',
      externalUrl: 'https://github.com/tsudev-tsudev/tsudev',
      releaseNotesMd: '- Bộ token ba chế độ Sáng/Ấm/Tối\n- 78 icon theo vai trò màu\n',
    },
    {
      slug: 'topology-check',
      version: '1.0.0',
      platform: 'LINUX',
      arch: 'x86_64',
      storageKey: 'releases/topology-check-1.0.0-linux-x86_64.tar.gz',
      fileName: 'topology-check-1.0.0-linux-x86_64.tar.gz',
      fileSize: 2_418_176,
      sha256: '3f7a1c9d2e5b8406af1230bc7d9e45f682a3b1c0d4e7f8a9b2c3d4e5f607182a',
      minOsVersion: 'glibc 2.31+',
      releaseNotesMd: '- Bắt ba loại lệch cổng\n- Mã thoát 0/1 để cắm CI\n',
    },
    {
      slug: 'topology-check',
      version: '1.0.0',
      platform: 'WINDOWS',
      arch: 'x86_64',
      storageKey: 'releases/topology-check-1.0.0-win-x64.zip',
      fileName: 'topology-check-1.0.0-win-x64.zip',
      fileSize: 2_883_584,
      sha256: '91b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      minOsVersion: 'Windows 10 64-bit',
    },
    {
      slug: 'tsudev-trust-crypto',
      version: '0.1.0',
      platform: 'SOURCE',
      externalUrl: 'https://github.com/tsudev-tsudev/tsudev/tree/main/packages/trust-crypto',
      releaseNotesMd: '- Ed25519 bằng Rust → WASM\n- Tương thích từng byte với node:crypto\n',
    },
  ]
  let soRelease = 0
  for (const r of releases) {
    const { slug, ...rest } = r
    const prj = await prisma.project.findUnique({ where: { slug }, select: { id: true } })
    if (!prj) continue
    await prisma.projectRelease.upsert({
      // Khoá đúng bằng chính ràng buộc UNIQUE của bảng. `arch` phải viết tường
      // minh thành CHUỖI RỖNG, không phải null: cột là NOT NULL default ''
      // chính vì một `arch` NULL làm UNIQUE mất tác dụng (SQL: NULL != NULL).
      // Và Prisma cũng không cho truyền null vào khoá tổ hợp - thử rồi, nó báo
      // "Argument `arch` must not be null".
      where: {
        projectId_version_platform_arch: {
          projectId: prj.id,
          version: rest.version,
          platform: rest.platform,
          arch: rest.arch ?? '',
        },
      },
      update: { ...rest, arch: rest.arch ?? '', publishedAt: new Date() },
      create: { ...rest, arch: rest.arch ?? '', projectId: prj.id, publishedAt: new Date() },
    })
    soRelease += 1
  }

  console.log('Seed hoàn tất:', {
    admin: admin.username,
    users: 3,
    posts: posts.length,
    docs: docs.length,
    projects: projects.length,
    releases: soRelease,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
