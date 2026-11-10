#!/usr/bin/env node
/**
 * Dọn nội dung LẠC ĐỀ khỏi tsudev.com - XOÁ MỀM (đặt `deletedAt`), đảo được.
 *
 * Bối cảnh (đo 10/11/2026 trên production, từ bên ngoài):
 *  - `/projects` có 3 mục là thư viện/công cụ NỘI BỘ của chính repo này
 *    (`tsudev-platform`, `tsudev-ui`, `topology-check`) - không phải sản phẩm
 *    người dùng tải về. Sản phẩm thật của hệ sinh thái nằm ở `/apps`
 *    (packages/ui/src/lib/ecosystem.ts).
 *  - `/docs` có ~50 bài do Toà soạn Agent AI (đã gỡ 29/10/2026) sinh ra, phần lớn
 *    là bản trùng của nhau với tiêu đề sai chính tả ("Huấn dẫn", "Kiều trúc").
 *  - `/blog` là tin công nghệ/đời sống do Toà soạn dịch lại - không liên quan tới
 *    hệ sinh thái tsudev.
 *
 * Quy tắc chọn (KHÔNG chọn theo cảm tính từng bài):
 *  - Post, Doc: có dấu vết Toà soạn (`authoredByAgentId` hoặc `sourceDraftId`
 *    khác NULL), HOẶC là bài mẫu của `packages/db/prisma/seed.js`.
 *  - Project: đúng các slug mẫu của seed (thư viện nội bộ).
 * Mục nào KHÔNG khớp quy tắc thì chỉ được LIỆT KÊ để chủ dự án tự quyết.
 *
 * Xoá MỀM vì: mọi đường đọc công khai đã lọc `deletedAt: null`, và đảo lại chỉ cần
 * `UPDATE ... SET "deletedAt" = NULL WHERE id IN (...)` - danh sách id được in ra.
 * Trang ISR tự dựng lại trong ≤300s (revalidate) sau khi áp.
 *
 *   node scripts/don-noi-dung-lac-de.js            # CHỈ IN - không ghi gì
 *   node scripts/don-noi-dung-lac-de.js --apply    # xoá mềm những mục đã in
 *   ... --apply --noi-dung                         # + đăng nội dung THẬT thay thế
 *
 * `--noi-dung` upsert (theo slug) các tài liệu/bài viết ở scripts/noi-dung-he-sinh-thai.js,
 * tác giả là tài khoản `tsudev`, cột tìm kiếm chuẩn hoá tính bằng @tsudev/search -
 * đúng hàm content-service dùng, nên bài mới tìm được ngay. Không có nó thì site
 * rỗng và cron canh-site-cron báo động mỗi ngày.
 *
 * Chạy với production: đặt DATABASE_URL của Neon trong shell (KHÔNG ghi vào .env).
 * Neon đang ngủ thì lượt đầu chậm vài giây - bình thường.
 */
const path = require('path');
require('dotenv').config({ quiet: true, path: path.join(__dirname, '..', '.env') });
const { prisma } = require('../packages/db/src/index');
const { buildPostSearch, buildDocSearch } = require('../packages/search/dist/index.js');
const { DOCS, POSTS } = require('./noi-dung-he-sinh-thai');

const SEED_POSTS = ['welcome-to-tsudev', 'kien-truc-microservices', 'toi-uu-seo-nextjs'];
const SEED_DOCS = ['getting-started', 'api-reference'];
// `tsudev-trust-seal` = Con dấu tín nhiệm, tính năng đã gỡ 04/11/2026.
const SEED_PROJECTS = [
  'tsudev-platform',
  'tsudev-trust-crypto',
  'tsudev-ui',
  'topology-check',
  'tsudev-trust-seal',
];

const agentOrSeed = (seedSlugs) => ({
  deletedAt: null,
  OR: [
    { authoredByAgentId: { not: null } },
    { sourceDraftId: { not: null } },
    { slug: { in: seedSlugs } },
  ],
});

async function main() {
  const apply = process.argv.includes('--apply');
  const host = (process.env.DATABASE_URL || '').replace(/^[^@]*@/, '').replace(/[/?].*$/, '');
  console.log(
    `DB: ${host || '(chưa đặt DATABASE_URL)'} - chế độ: ${apply ? 'ÁP DỤNG' : 'CHỈ IN'}\n`
  );

  const posts = await prisma.post.findMany({
    where: agentOrSeed(SEED_POSTS),
    select: { id: true, slug: true, title: true },
  });
  const docs = await prisma.doc.findMany({
    where: agentOrSeed(SEED_DOCS),
    select: { id: true, slug: true, title: true },
  });
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, slug: { in: SEED_PROJECTS } },
    select: { id: true, slug: true, name: true },
  });

  const show = (label, rows, key = 'title') => {
    console.log(`== ${label}: ${rows.length} mục sẽ xoá mềm`);
    for (const r of rows) console.log(`  - ${r.slug}  (${r[key]})`);
    console.log('');
  };
  show('Bài blog', posts);
  show('Tài liệu', docs);
  show('Dự án', projects, 'name');

  // Mục còn lại sau khi dọn - chủ dự án đọc danh sách này để quyết phần còn lại.
  const ids = (rows) => rows.map((r) => r.id);
  const [keepPosts, keepDocs, keepProjects] = await Promise.all([
    prisma.post.findMany({
      where: { deletedAt: null, id: { notIn: ids(posts) } },
      select: { slug: true, title: true },
    }),
    prisma.doc.findMany({
      where: { deletedAt: null, id: { notIn: ids(docs) } },
      select: { slug: true, title: true },
    }),
    prisma.project.findMany({
      where: { deletedAt: null, id: { notIn: ids(projects) } },
      select: { slug: true, name: true },
    }),
  ]);
  console.log('== CÒN LẠI (không khớp quy tắc - chủ dự án tự quyết):');
  for (const r of keepPosts) console.log(`  blog    ${r.slug}  (${r.title})`);
  for (const r of keepDocs) console.log(`  docs    ${r.slug}  (${r.title})`);
  for (const r of keepProjects) console.log(`  project ${r.slug}  (${r.name})`);
  if (!keepPosts.length && !keepDocs.length && !keepProjects.length)
    console.log('  (không còn gì)');

  if (!apply) {
    console.log('\nChưa ghi gì. Chạy lại với --apply để xoá mềm.');
    return;
  }
  const now = new Date();
  const [p, d, j] = await prisma.$transaction([
    prisma.post.updateMany({ where: { id: { in: ids(posts) } }, data: { deletedAt: now } }),
    prisma.doc.updateMany({ where: { id: { in: ids(docs) } }, data: { deletedAt: now } }),
    prisma.project.updateMany({ where: { id: { in: ids(projects) } }, data: { deletedAt: now } }),
  ]);
  console.log(
    `\nĐã xoá mềm: ${p.count} bài, ${d.count} tài liệu, ${j.count} dự án (deletedAt=${now.toISOString()}).`
  );
  console.log(
    'Đảo lại: SET "deletedAt" = NULL WHERE "deletedAt" = thời điểm trên, ở ba bảng Post/Doc/Project.'
  );

  if (process.argv.includes('--noi-dung')) await dangNoiDung();
}

async function dangNoiDung() {
  const tacGia = await prisma.user.findUnique({
    where: { username: 'tsudev' },
    select: { id: true },
  });
  if (!tacGia) throw new Error('Không có tài khoản tsudev - không đăng nội dung.');
  const now = new Date();
  for (const d of DOCS) {
    const data = { ...d, ...buildDocSearch(d), deletedAt: null };
    await prisma.doc.upsert({ where: { slug: d.slug }, update: data, create: data });
    console.log(`  + docs ${d.slug}`);
  }
  for (const p of POSTS) {
    const data = {
      ...p,
      ...buildPostSearch(p),
      published: true,
      authorId: tacGia.id,
      deletedAt: null,
    };
    await prisma.post.upsert({
      where: { slug: p.slug },
      update: data,
      create: { ...data, publishedAt: now },
    });
    console.log(`  + blog ${p.slug}`);
  }
  console.log(`Đã đăng ${DOCS.length} tài liệu, ${POSTS.length} bài viết.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 2;
  })
  .finally(() => prisma.$disconnect());
