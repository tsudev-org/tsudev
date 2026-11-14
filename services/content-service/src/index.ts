require('source-map-support').install()
require('dotenv').config({ quiet: true })
// npm workspace đặt cwd ở thư mục service, nơi không có .env - nạp thêm .env ở
// gốc repo. Thiếu bước này thì `npm --workspace ... test` chạy không có
// DATABASE_URL và mọi route chạm DB đều trả 500.
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ quiet: true, path: require('path').join(__dirname, '../../../.env') })
}
// Initialize optional Sentry instrumentation for server-side
try {
  require('../../../packages/observability/initSentry').initServer({ service: 'content-service' })
} catch (e) {
  // ignore
}
import express from 'express'
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express'
import { prisma } from '@tsudev/db'
import {
  createAuthMiddleware,
  internalTokenMatches,
  lookupUser,
  requireSecondFactor,
  requireStepUp,
} from '@tsudev/auth'
import { createRateLimit, identityKey, largePageRateLimit, peerIp } from '@tsudev/ratelimit'
import type { Doc, Post, Prisma, Project, ProjectRelease, User } from '@prisma/client'
import { hasAtLeastRole, emailUsable, pageMeta, parsePaging, MAX_PAGE_SIZE } from '@tsudev/types'
import * as releaseSigning from './releaseSigning'
import * as anNinh from './releaseSecurity'
import {
  store as objectStore,
  MAX_RELEASE_BYTES,
  RELEASE_FILE_TYPES,
  loaiTepPhatHanh,
  tenTepTrongKho,
} from './objectStore'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { buildDocSearch, buildPostSearch, buildSnippet, viNormalizeText } from '@tsudev/search'
import {
  editedStatus,
  effectiveStatus,
  initialStatus,
  statusFields,
  transition,
} from './postWorkflow'

type Notifier = { alert: (payload: Record<string, unknown>) => Promise<void> }

/**
 * Đọc một tham số truy vấn dạng CHUỖI.
 *
 * Express khai `req.query.x` là `string | ParsedQs | (string|ParsedQs)[] |
 * undefined` - và nó nói đúng: người gọi điều khiển hình dạng này. `?limit=1`
 * cho chuỗi, `?limit=1&limit=2` cho mảng, `?limit[a]=1` cho object. Bản cũ đưa
 * thẳng giá trị đó vào parseInt, nơi mảng bị ép về chuỗi và object thành NaN -
 * im lặng cả hai trường hợp. Ở đây chỉ chuỗi mới được đi tiếp.
 */
const qStr = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
const qInt = (v: unknown, dflt: number): number => {
  const n = parseInt(qStr(v) ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : dflt
}

let notify: Notifier = { alert: async () => {} }
try {
  notify = require('../../../packages/observability/notify')
} catch (e) {
  /* observability không bắt buộc */
}
const app = express()
app.use(express.json({ limit: '1mb' }))

// Header bảo mật cho mọi phản hồi của service. Ba service đều phục vụ cho bên
// thứ ba (huy hiệu SVG, JWKS, trang xác minh), nên `nosniff` ở đây không thừa:
// nó chặn trình duyệt tự diễn giải một phản hồi thành HTML thực thi được.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

const port = process.env.PORT || process.env.PORT_CONTENT_SERVICE || 4001
// Mặc định 0.0.0.0 - đừng đổi: bind loopback bên trong container là tự cắt liên
// lạc giữa các container. Máy dev đặt BIND_HOST=127.0.0.1 qua .env (topology).
const bindHost = process.env.BIND_HOST || '0.0.0.0'

// Xác thực dùng chung. Trước đây mỗi service giữ một bản authMiddleware gần
// trùng nhau, và CLAUDE.md phải cảnh báo "đổi hành vi xác thực phải sửa cả ba".
const auth = createAuthMiddleware('content')

// Bọc handler async: Promise bị từ chối mà không có .catch sẽ không bao giờ tới
// được error handler của Express - request treo cho tới khi client bỏ cuộc.
//
// `req` mang tham số đường dẫn kiểu `string`: @types/express 5 khai
// `string | string[]` vì path-to-regexp 8 cho phép wildcard `*name` (trả mảng).
// Service này KHÔNG có route wildcard nào - mọi tham số là `:name` nên luôn là
// chuỗi. Thêm route `*name` thì đừng đi qua asyncHandler này.
type FlatParamsRequest = Request<Record<string, string>>
const asyncHandler =
  (fn: (req: FlatParamsRequest, res: Response, next: NextFunction) => unknown): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req as FlatParamsRequest, res, next)).catch(next)

// Thẻ tác giả gắn vào bài blog. Không còn `reputation`/`rank`: điểm uy tín
// thành viên là cơ chế của diễn đàn, đã bỏ; uy tín nay là hồ sơ tổ chức gắn
// con dấu (docs/refactor-personal-site.md §3.3).
const authorCard = (
  u: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'> | null | undefined
) =>
  u
    ? {
        id: u.id,
        username: u.username,
        displayName: u.displayName || u.username,
        avatarUrl: u.avatarUrl,
      }
    : null

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'content-service' }))

// Khoá công khai ký bản phát hành. CÔNG KHAI có chủ đích và nằm NGOÀI /api, nên
// không dính cổng INTERNAL_API_TOKEN bên dưới: người tải tự xác minh chữ ký
// offline mà không phải tin API của tsudev. Frontend rewrite
// /.well-known/tsudev-release-jwks.json về đây (qua /api/releases/jwks).
app.get('/.well-known/tsudev-release-jwks.json', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.json(releaseSigning.jwks())
})

// Ba service backend nằm trên URL Render CÔNG KHAI - không giấu sau mạng nội bộ
// được, vì frontend-main chạy trên Cloudflare Workers, ngoài mạng Render. Cổng
// chặn này là lớp bù: chỉ ai biết INTERNAL_API_TOKEN mới gọi được /api.
//
// TỰ NGUYỆN: biến không đặt thì middleware là no-op, nên local dev và CI không
// đổi hành vi. Đặt nó ở Render (và cùng giá trị cho biến của frontend) là bật.
// /health đứng ngoài để health check của Render vẫn chạy.
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN || ''

// Giới hạn tần suất cho lưu lượng TRỰC TIẾP (không mang internal token tin cậy).
// Lưu lượng qua BFF của Next mang token đúng được MIỄN TRỪ: BFF không chuyển IP
// client xuống, nên giới hạn theo IP mà không miễn trừ sẽ gộp cả site vào một xô
// (xem @tsudev/ratelimit). Đặt TRƯỚC cổng token để chặn dội request không hợp lệ
// rẻ tiền. Ngưỡng chỉnh được qua env cho vận hành và test.
const directLimit = createRateLimit({
  name: 'content-direct',
  // IP NGANG HÀNG (phần tử cuối XFF): phần tử đầu do người gửi tự đặt được.
  keyOf: peerIp,
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_DIRECT_MAX) || 300,
})
app.use('/api', (req, res, next) => {
  if (internalTokenMatches(req, INTERNAL_TOKEN)) return next()
  return directLimit(req, res, next)
})

app.use('/api', (req, res, next) => {
  if (!INTERNAL_TOKEN) return next()
  if (internalTokenMatches(req, INTERNAL_TOKEN)) return next()
  return res.status(401).json({ error: 'Thiếu hoặc sai x-internal-token' })
})

// Giới hạn THEO TÀI KHOẢN cho lưu lượng đã xác thực đi qua BFF. `directLimit` ở
// trên miễn trừ BFF (mọi người dùng chung IP egress của Worker), nên trước đây
// một tài khoản đã đăng nhập gọi được các đường ghi KHÔNG giới hạn. Khoá là `sub`
// của khẳng định danh tính (identityKey); chỉ đếm request CÓ danh tính - SSR ẩn
// danh của các trang công khai không bị gộp vào một xô.
const accountLimit = createRateLimit({
  name: 'content-account',
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_ACCOUNT_MAX) || 600,
  keyOf: identityKey,
  when: (req) => typeof req.headers.authorization === 'string',
})
app.use('/api', accountLimit)

// XÁC THỰC TUỲ CHỌN, không phải chặn cứng. Gắn req.user nếu người gọi có mang
// danh tính; KHÔNG từ chối nếu không có.
//
// Trước đây đây là `app.use('/api', auth)` - chặn cứng - và nó làm production
// trống trơn: blog, tài liệu và dự án là nội dung CÔNG KHAI, nhưng BFF của Next
// gọi SSR chỉ kèm x-internal-token chứ không có Bearer JWT (không có phiên người
// dùng nào khi khách vãng lai mở trang). Ở local khi ấy không lộ ra vì
// AUTH_DEV_BYPASS bật; ở production nó trả 401, `lib/api.ts` nuốt lỗi thành []
// nên TRIỆU CHỨNG LÀ TRANG TRỐNG, KHÔNG PHẢI TRANG LỖI.
//
// An toàn vì đường ghi không dựa vào lớp này: mọi route ghi nằm dưới /api/admin
// và tự gọi requireAdmin(), vốn đọc vai trò TỪ DB và trả 401 khi thiếu req.user
// - fail closed. Đây cũng là hình mà storage-service (auth theo từng route) và
// trust-service (auth theo nhánh) vốn đã dùng; content-service là cái lệch.
//
// Token SAI vẫn bị từ chối: chỉ bỏ qua khi người gọi không đưa gì cả.
//
// Nhánh AUTH_DEV_BYPASS đã bị gỡ cùng với chính cờ đó. Nó làm mọi request ở
// local đi qua xác thực bắt buộc trong khi ở production thì không - tức là hai
// môi trường chạy hai đường khác nhau ngay tại chỗ nhạy cảm nhất, và đó là lý
// do lỗi 401 của production không bao giờ lộ ra khi chạy local.
const optionalAuth: RequestHandler = (req, res, next) => {
  const bearer = /^Bearer /i.test(req.get('authorization') || '')
  if (!bearer) return next()
  return auth(req, res, next)
}
app.use('/api', optionalAuth)

// ---------------- Blog ----------------
//
// KHÔNG có cổng vai trò ở đây, có chủ đích: blog, tài liệu và dự án là nội dung
// công khai. Bản trước từng gắn một cổng vai trò lên chính đường đọc này, thứ
// chỉ vô hại vì cổng đó khi ấy là no-op - bật lên là blog biến mất khỏi site.
//
// Thứ cần bảo vệ là đường GHI, nằm dưới /api/admin với requireAdmin().

// Điều kiện HIỂN THỊ CÔNG KHAI, gom một chỗ để không đường đọc nào quên:
//   - `deletedAt: null` BẮT BUỘC (Toà soạn xoá mềm; quên = bài xoá lộ ra).
//   - cổng LỊCH: publishedAt NULL (dữ liệu cũ) hoặc <= bây giờ. Bài hẹn tương lai ẩn.
const publicVisibleAnd = (now: Date): Prisma.PostWhereInput[] => [
  { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
]
const publicPostWhere = (now: Date): Prisma.PostWhereInput => ({
  published: true,
  deletedAt: null,
  AND: publicVisibleAnd(now),
})

type PostWithAuthor = Post & { author: User | null }
// Thẻ danh sách/tìm kiếm: đủ để render card, KHÔNG lộ cột nội bộ (search*Norm,
// authoredByAgentId, sourceDraftId). Ngày hiển thị = publishedAt (fallback createdAt).
const publicPostCard = (p: PostWithAuthor) => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  tags: p.tags,
  coverImageUrl: p.coverImageUrl,
  publishedAt: p.publishedAt ?? p.createdAt,
  createdAt: p.createdAt,
  pinned: Boolean(p.pinnedAt),
  categoryId: p.categoryId,
  author: authorCard(p.author),
})
const publicPostDetail = (p: PostWithAuthor) => ({
  ...publicPostCard(p),
  contentMd: p.contentMd,
  references: (p.references ?? []) as PostRef[],
  metaDescription: p.metaDescription,
  updatedAt: p.updatedAt,
})

// Xếp hạng độ liên quan (SEARCH_AND_FILTER §5). Khớp trên cột đã chuẩn hoá; qn là
// từ khoá đã chuẩn hoá không dấu. Tie-break: bài mới hơn trước (§5 tiêu chí phụ).
const scorePost = (p: Post, qn: string): number => {
  if (!qn) return 0
  const t = p.searchTitleNorm ?? ''
  const b = p.searchBodyNorm ?? ''
  let s = 0
  if (t === qn) s += 100
  else if (t.startsWith(qn)) s += 70
  else if (t.includes(qn)) s += 50
  if (p.tags.some((tag) => viNormalizeText(tag).includes(qn))) s += 30
  if (b.includes(qn)) s += 10
  return s
}

app.get(
  '/api/posts',
  asyncHandler(async (req, res) => {
    const now = new Date()
    const take = Math.min(qInt(req.query.limit, 20), 50)
    const tag = qStr(req.query.tag)?.trim()
    // P2: lọc theo chuyên mục (slug).
    const category = qStr(req.query.category)?.trim()
    const posts = await prisma.post.findMany({
      where: {
        ...publicPostWhere(now),
        ...(tag ? { tags: { has: tag } } : {}),
        ...(category ? { category: { slug: category } } : {}),
      },
      // Bài GHIM lên đầu (P2, MODERATOR+ ghim), rồi theo ngày HIỂN THỊ (publishedAt),
      // fallback createdAt cho dữ liệu cũ.
      orderBy: [
        { pinnedAt: { sort: 'desc', nulls: 'last' } },
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take,
      include: { author: true },
    })
    res.json(posts.map(publicPostCard))
  })
)

// Loại nội dung nằm trong phạm vi tìm kiếm (§10.4 "thêm loại nội dung mới").
// Thêm một loại = thêm một mục ở đây + một nhánh nạp ứng viên; hình dạng phản hồi
// KHÔNG phải đổi, vì mỗi hàng tự khai `kind`.
const SEARCH_TYPES = ['post', 'doc'] as const
type SearchType = (typeof SEARCH_TYPES)[number]
const isSearchType = (s: string): s is SearchType => (SEARCH_TYPES as readonly string[]).includes(s)

/**
 * Đọc `type=post,doc`. Tham số lọc KHÔNG hợp lệ thì bỏ qua chứ không báo lỗi
 * (§7) - và nếu sau khi lọc không còn giá trị nào thì coi như không lọc, thay vì
 * trả 0 kết quả một cách khó hiểu cho một chữ gõ sai.
 */
const parseSearchTypes = (raw?: string): SearchType[] => {
  const picked = [
    ...new Set(
      (raw ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(isSearchType)
    ),
  ]
  return picked.length ? picked : [...SEARCH_TYPES]
}

// Hàng Doc dùng cho xếp hạng: CỐ Ý không kéo `contentMd`/`searchBodyNorm` về.
// Tập ứng viên lên tới RANK_CAP hàng, mà hai cột đó lớn ngang cả bài - kéo về chỉ
// để chấm điểm là nhân băng thông với 500 cho mỗi lượt gõ phím.
type DocRank = {
  id: string
  slug: string
  title: string
  category: string
  updatedAt: Date
  searchTitleNorm: string | null
}
const DOC_RANK_SELECT = {
  id: true,
  slug: true,
  title: true,
  category: true,
  updatedAt: true,
  searchTitleNorm: true,
} as const

// Xếp hạng Doc, đối xứng với `scorePost`: chuyên mục đóng vai trò của thẻ.
const scoreDoc = (d: DocRank, qn: string): number => {
  if (!qn) return 0
  const t = d.searchTitleNorm ?? ''
  let s = 0
  if (t === qn) s += 100
  else if (t.startsWith(qn)) s += 70
  else if (t.includes(qn)) s += 50
  if (viNormalizeText(d.category).includes(qn)) s += 30
  // Tiêu đề không chứa từ khoá ⇒ hàng này lọt qua WHERE nhờ khớp THÂN BÀI. Suy ra
  // thay vì kéo `searchBodyNorm` về (xem chú thích ở DOC_RANK_SELECT).
  if (!t.includes(qn)) s += 10
  return s
}

// Trần của NHÁNH XẾP HẠNG theo độ liên quan - phải chấm điểm cả tập nên phải có
// trần. Nhánh sắp theo NGÀY không dùng trần này: nó chỉ lấy đúng `page*page_size`
// hàng đầu của mỗi loại rồi trộn, nên phân trang theo ngày là CHÍNH XÁC ở mọi
// trang, kể cả khi tập khớp vượt trần.
const RANK_CAP = 500

// Tìm kiếm/lọc theo SEARCH_AND_FILTER §7. ĐỨNG TRƯỚC '/api/posts/:slug' để không
// bị nuốt thành slug "search".
//
// ⚠️ Đường dẫn nói "posts" nhưng phạm vi là TOÀN SITE (bài viết + tài liệu, từ
// DOCS-SEARCH 26/08/2026). Giữ nguyên đường dẫn có chủ đích: đổi nó phải sửa đồng
// thời proxy `apps/frontend-main/pages/api/search.ts` và BẢNG TIỀN TỐ của
// `services/backend-bundle` - mà tiền tố mới không nằm trong bảng thì route 404 ở
// production trong khi chạy service riêng vẫn sống, KHÔNG có gì báo lỗi.
/**
 * P2.1 chuyên mục, công khai. Khai TRƯỚC `/api/posts/:slug` - nếu không,
 * "categories" bị hiểu là slug của một bài (cùng lý do với /api/posts/search).
 */
app.get(
  '/api/posts/categories',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] })
    res.json(rows.map((c) => ({ id: c.id, slug: c.slug, name: c.name, position: c.position })))
  })
)

app.get(
  '/api/posts/search',
  // Trần nay là 200 (mốc chuẩn cao nhất) thay vì 100, và giới hạn tần suất mốc
  // lớn là ĐIỀU KIỆN của việc nâng đó, không phải tuỳ chọn (DATA_TABLE.md 8.4).
  // Tìm kiếm công khai nên phần lớn người gọi không có danh tính - khi đó
  // largePageRateLimit tự lùi về đếm theo IP.
  largePageRateLimit({
    name: 'posts/search page_size lớn',
    identify: (req) => req.user?.preferred_username || req.user?.sub,
  }),
  asyncHandler(async (req, res) => {
    const now = new Date()
    const rawQ = (qStr(req.query.q) ?? '').trim()
    const qn = viNormalizeText(rawQ)
    const tag = qStr(req.query.tag)?.trim()
    const category = qStr(req.query.category)?.trim()
    const types = parseSearchTypes(qStr(req.query.type))
    const sort = qStr(req.query.sort) ?? 'relevance'
    const paging = parsePaging(req.query)
    const { page, pageSize } = paging

    // Truy vấn từ 2 ký tự (§2.1). Không q, không bộ lọc ⇒ không tìm gì.
    const hasQuery = qn.length >= 2
    if (!hasQuery && !tag && !category) {
      return res.json({
        data: [],
        meta: { ...pageMeta(0, paging), query_normalized: qn },
        facets: { tag: [], category: [], type: [] },
      })
    }

    // Thẻ là trục của BÀI VIẾT, chuyên mục là trục của TÀI LIỆU. Lọc AND giữa các
    // nhóm (§6.1) ⇒ chọn một trục loại trừ luôn loại không mang trục đó. Đặt hai
    // cờ này TÁCH khỏi bộ lọc `type` để facet đếm vẫn nói được "chuyển sang loại
    // kia thì có bao nhiêu kết quả".
    const postApplicable = !category
    const docApplicable = !tag
    const wantPost = postApplicable && types.includes('post')
    const wantDoc = docApplicable && types.includes('doc')

    const postWhere: Prisma.PostWhereInput = {
      published: true,
      deletedAt: null,
      AND: [
        ...publicVisibleAnd(now),
        ...(hasQuery
          ? [
              {
                OR: [{ searchTitleNorm: { contains: qn } }, { searchBodyNorm: { contains: qn } }],
              } as Prisma.PostWhereInput,
            ]
          : []),
        ...(tag ? [{ tags: { has: tag } } as Prisma.PostWhereInput] : []),
      ],
    }

    const docWhere: Prisma.DocWhereInput = {
      deletedAt: null,
      AND: [
        ...(hasQuery
          ? [
              {
                OR: [{ searchTitleNorm: { contains: qn } }, { searchBodyNorm: { contains: qn } }],
              } as Prisma.DocWhereInput,
            ]
          : []),
        ...(category ? [{ category } as Prisma.DocWhereInput] : []),
      ],
    }

    // Hai phép đếm này chạy trong CSDL nên CHÍNH XÁC, không dính trần xếp hạng.
    // Chúng vừa là facet loại, vừa là nguồn của `total`.
    const [postCount, docCount] = await Promise.all([
      postApplicable ? prisma.post.count({ where: postWhere }) : Promise.resolve(0),
      docApplicable ? prisma.doc.count({ where: docWhere }) : Promise.resolve(0),
    ])
    const total = (wantPost ? postCount : 0) + (wantDoc ? docCount : 0)

    const byDate = sort === 'newest' || sort === 'oldest' || !hasQuery
    const asc = sort === 'oldest'
    // Trộn hai nguồn đã sắp: để lấy đúng trang P mốc S, mỗi nguồn chỉ cần P*S hàng
    // đầu - hàng thứ P*S+1 của một nguồn không thể lọt vào P*S hàng đầu của tập
    // trộn. Nhờ vậy nhánh ngày không cần trần và không mất bản ghi nào.
    const dateTake = page * pageSize
    const take = byDate ? dateTake : RANK_CAP

    const [postRows, docRows] = await Promise.all([
      wantPost
        ? prisma.post.findMany({
            where: postWhere,
            ...(byDate
              ? {
                  orderBy: [
                    { publishedAt: asc ? ('asc' as const) : ('desc' as const) },
                    { createdAt: asc ? ('asc' as const) : ('desc' as const) },
                  ],
                }
              : {}),
            take,
            include: { author: true },
          })
        : Promise.resolve([] as PostWithAuthor[]),
      wantDoc
        ? prisma.doc.findMany({
            where: docWhere,
            ...(byDate
              ? { orderBy: { updatedAt: asc ? ('asc' as const) : ('desc' as const) } }
              : {}),
            take,
            select: DOC_RANK_SELECT,
          })
        : Promise.resolve([] as DocRank[]),
    ])

    // Trộn: mỗi ứng viên mang sẵn khoá sắp xếp để hai loại so được với nhau.
    // `sortAt` của bài là NGÀY HIỂN THỊ; của tài liệu là lần cập nhật gần nhất.
    type Candidate =
      | { kind: 'post'; sortAt: number; score: number; post: PostWithAuthor }
      | { kind: 'doc'; sortAt: number; score: number; doc: DocRank }
    const candidates: Candidate[] = [
      ...postRows.map((p) => ({
        kind: 'post' as const,
        sortAt: (p.publishedAt ?? p.createdAt).getTime(),
        score: scorePost(p, qn),
        post: p,
      })),
      ...docRows.map((d) => ({
        kind: 'doc' as const,
        sortAt: d.updatedAt.getTime(),
        score: scoreDoc(d, qn),
        doc: d,
      })),
    ]
    candidates.sort((a, b) => {
      if (!byDate) {
        const d = b.score - a.score
        if (d !== 0) return d
      }
      // Tie-break của nhánh xếp hạng, và khoá chính của nhánh ngày (§5).
      return asc ? a.sortAt - b.sortAt : b.sortAt - a.sortAt
    })
    const slice = candidates.slice((page - 1) * pageSize, page * pageSize)

    // Đoạn trích của tài liệu cần `contentMd`, nên chỉ nạp cho ĐÚNG các hàng lên
    // trang - không phải cả tập ứng viên.
    const pageDocIds = slice
      .filter((c) => c.kind === 'doc')
      .map((c) => (c as { doc: DocRank }).doc.id)
    const docBodies = new Map<string, string>()
    if (pageDocIds.length > 0) {
      const bodies = await prisma.doc.findMany({
        where: { id: { in: pageDocIds } },
        select: { id: true, contentMd: true },
      })
      for (const b of bodies) docBodies.set(b.id, b.contentMd)
    }

    const data = slice.map((c) =>
      c.kind === 'post'
        ? { kind: 'post' as const, ...publicPostCard(c.post) }
        : {
            kind: 'doc' as const,
            id: c.doc.id,
            slug: c.doc.slug,
            title: c.doc.title,
            // Doc không có cột tóm tắt; dựng đoạn trích quanh chỗ khớp để thẻ kết
            // quả có phần mô tả và tô sáng được như thẻ bài viết.
            excerpt: buildSnippet(docBodies.get(c.doc.id) ?? '', rawQ),
            category: c.doc.category,
            updatedAt: c.doc.updatedAt,
          }
    )

    // Facet thẻ: đếm trong tập bài khớp (trần 500) - "khi khả thi" (§6.3).
    const facetSource = postApplicable
      ? await prisma.post.findMany({ where: postWhere, take: RANK_CAP, select: { tags: true } })
      : []
    const tagCount = new Map<string, number>()
    for (const r of facetSource)
      for (const tg of r.tags) tagCount.set(tg, (tagCount.get(tg) ?? 0) + 1)
    const tagFacet = [...tagCount.entries()]
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // Facet chuyên mục: đếm bằng `groupBy` trong CSDL, nên CHÍNH XÁC (khác facet
    // thẻ - `tags` là mảng nên không group được).
    const categoryFacet = docApplicable
      ? (
          await prisma.doc.groupBy({
            by: ['category'],
            where: docWhere,
            _count: { _all: true },
          })
        )
          .map((g) => ({ slug: g.category, count: g._count._all }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20)
      : []

    res.json({
      data,
      meta: { ...pageMeta(total, paging), query_normalized: qn },
      facets: {
        tag: tagFacet,
        category: categoryFacet,
        // Đếm theo loại BỎ QUA bộ lọc `type` có chủ đích (§6.3 "biết trước lọc có
        // ra kết quả hay không") - đang xem tài liệu vẫn phải thấy có bao nhiêu bài.
        type: [
          { slug: 'post', count: postCount },
          { slug: 'doc', count: docCount },
        ],
      },
    })
  })
)

app.get(
  '/api/posts/:slug',
  asyncHandler(async (req, res) => {
    const now = new Date()
    const post = await prisma.post.findUnique({
      where: { slug: req.params.slug },
      include: { author: true },
    })
    // Cổng lịch: bài hẹn tương lai coi như chưa tồn tại với công chúng.
    const scheduled = post?.publishedAt ? post.publishedAt.getTime() > now.getTime() : false
    if (!post || !post.published || post.deletedAt || scheduled)
      return res.status(404).json({ error: 'Post not found' })
    res.json(publicPostDetail(post))
  })
)

// ---------------- Docs ----------------
app.get(
  '/api/docs',
  // Trước 26/08/2026 truy vấn này KHÔNG có trần nào. Nó sống sót qua QU-STD-TABLE
  // vì `/docs` là mục lục công khai chứ không phải bảng bản ghi - nhưng "không
  // phải bảng" không có nghĩa là "được phép không có trần", và Toà soạn Agent AI
  // vừa bắt đầu đăng tài liệu tự động nên số hàng ở đây sẽ tự tăng.
  //
  // Mục lục là thứ trang cần ĐỦ để dựng điều hướng, nên mặc định lấy trần cao
  // nhất thay vì mốc 10 của bảng: khách vào `/docs` phải thấy hết chuyên mục,
  // không phải trang 1 của chuyên mục.
  largePageRateLimit({
    name: 'docs page_size lớn',
    identify: (req) => req.user?.preferred_username || req.user?.sub,
  }),
  asyncHandler(async (req, res) => {
    const paging = parsePaging({
      page: req.query.page,
      page_size: req.query.page_size ?? MAX_PAGE_SIZE,
    })
    const [total, docs] = await Promise.all([
      prisma.doc.count({ where: { deletedAt: null } }),
      prisma.doc.findMany({
        where: { deletedAt: null },
        orderBy: [{ category: 'asc' }, { position: 'asc' }],
        skip: paging.skip,
        take: paging.take,
      }),
    ])
    res.json({
      data: docs.map((d) => ({ id: d.id, slug: d.slug, title: d.title, category: d.category })),
      meta: pageMeta(total, paging),
    })
  })
)

app.get(
  '/api/docs/:slug',
  asyncHandler(async (req, res) => {
    const doc = await prisma.doc.findUnique({ where: { slug: req.params.slug } })
    if (!doc || doc.deletedAt) return res.status(404).json({ error: 'Doc not found' })
    res.json(doc)
  })
)

// ---------------- Dự án & bản quyền ----------------
//
// Đọc: công khai. Ghi: chỉ ADMIN, kiểm bằng vai trò LƯU TRONG DB qua
// requireAdmin(). Thêm đường ghi mới phải theo đúng khuôn đó.

const PROJECT_KINDS = new Set(['APP', 'TOOL', 'LIBRARY', 'SERVICE'])
const RELEASE_CHANNELS = new Set(['STABLE', 'BETA', 'ALPHA'])
const RELEASE_PLATFORMS = new Set(['ANDROID', 'WINDOWS', 'MACOS', 'LINUX', 'WEB', 'SOURCE'])

const PROJECT_STATUSES = new Set(['WIP', 'BETA', 'STABLE', 'ARCHIVED'])
const COPYRIGHT_STATUSES = new Set(['NONE', 'PENDING', 'REGISTERED'])

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

async function requireAdmin(req: Request, res: Response): Promise<User | null> {
  // lookupUser() của @tsudev/auth: tra cứu chứ KHÔNG tạo (đường ghi phải khớp
  // một User có thật), và nó cũng đối chiếu sessionVersion để một phiên đã bị
  // thu hồi không đi qua được. Trước đây đây là bản `actingUser` cục bộ - bản
  // thứ ba của cùng một hàm, và là bản duy nhất bỏ sót phép so sánh đó.
  const user = await lookupUser(req)
  if (!user) {
    res.status(401).json({ error: 'Bạn cần đăng nhập' })
    return null
  }
  if (!hasAtLeastRole(user.role, 'ADMIN')) {
    res.status(403).json({ error: 'Yêu cầu quyền quản trị' })
    return null
  }
  // Ép 2FA (G6): ADMIN chưa có TOTP đã xác nhận ⇒ 403
  // MFA_REQUIRED (passkey KHÔNG tính - xem hasConfirmedTotp); lỗi DB ⇒ 503. Kiểm ở @tsudev/auth, dùng chung với requireOwner.
  if (!(await requireSecondFactor(user, res))) return null
  return user
}

/**
 * P2.2: như requireAdmin nhưng ngưỡng MODERATOR - duyệt bài, ghim, chuyên mục.
 * Cùng cổng 2FA: người duyệt bị chiếm tài khoản là trang công khai bị đăng hộ.
 */
async function requireModerator(req: Request, res: Response): Promise<User | null> {
  const user = await lookupUser(req)
  if (!user) {
    res.status(401).json({ error: 'Bạn cần đăng nhập' })
    return null
  }
  if (!hasAtLeastRole(user.role, 'MODERATOR')) {
    res.status(403).json({ error: 'Yêu cầu quyền kiểm duyệt' })
    return null
  }
  if (!(await requireSecondFactor(user, res))) return null
  return user
}

/** Người thao tác, dạng mà nhật ký `TrustAuditLog` lưu. */
const tacNhanCua = (u: Pick<User, 'id' | 'username' | 'displayName'>): anNinh.TacNhan => ({
  id: u.id,
  name: u.displayName || u.username,
})

const projectCard = (p: Project) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  summary: p.summary,
  kind: p.kind,
  status: p.status,
  version: p.version,
  releasedAt: p.releasedAt,
  license: p.license,
  copyrightStatus: p.copyrightStatus,
  copyrightNo: p.copyrightNo,
  copyrightAt: p.copyrightAt,
  repoUrl: p.repoUrl,
  homepageUrl: p.homepageUrl,
  featured: p.featured,
})

/// Nhận và làm sạch phần thân request. Trả { data } hoặc { error }.
type ProjectWritable = Partial<Prisma.ProjectUncheckedCreateInput>
/**
 * Discriminant tường minh (`ok`) chứ không phải "có trường error hay không".
 * Nhờ nó mà sau `if (!parsed.ok) return`, TypeScript BIẾT `parsed.data` có mặt -
 * không còn chỗ nào đọc data của một request đã bị từ chối.
 */
type ReadBodyResult = { ok: true; data: ProjectWritable } | { ok: false; error: string }

function readProjectBody(body: unknown, { partial }: { partial: boolean }): ReadBodyResult {
  const b = (body ?? {}) as Record<string, unknown>
  const data: ProjectWritable = {}
  // Các vòng lặp bên dưới gán theo khoá động. Giữ MỘT tham chiếu lỏng kiểu ở đây
  // thay vì rắc cast khắp nơi - hình dạng trả về cho nơi gọi vẫn là ProjectWritable.
  const loose = data as Record<string, unknown>
  const set = (key: string, value: unknown) => {
    if (value !== undefined) loose[key] = value
  }

  if (!partial || b.slug !== undefined) {
    const slug = (b.slug || '').toString().trim().toLowerCase()
    if (!SLUG_RE.test(slug))
      return { ok: false, error: 'slug phải là chữ thường, số và dấu gạch nối (ví dụ: tsudev-cli)' }
    data.slug = slug
  }
  if (!partial || b.name !== undefined) {
    const name = (b.name || '').toString().trim()
    if (!name) return { ok: false, error: 'Thiếu name' }
    data.name = name
  }
  if (!partial || b.summary !== undefined) {
    const summary = (b.summary || '').toString().trim()
    if (!summary) return { ok: false, error: 'Thiếu summary' }
    data.summary = summary
  }

  // Ba trường enum: Set.has() nhận `unknown` nên bản cũ vẫn "kiểm" đúng lúc chạy,
  // nhưng giá trị đi ra vẫn là `any`. Thu hẹp về string trước khi tra Set thì
  // vừa giữ nguyên hành vi, vừa không để `any` chảy vào tầng Prisma.
  if (b.kind !== undefined) {
    const kind = String(b.kind)
    if (!PROJECT_KINDS.has(kind)) return { ok: false, error: `kind không hợp lệ: ${kind}` }
    data.kind = kind as Prisma.ProjectUncheckedCreateInput['kind']
  }
  if (b.status !== undefined) {
    const status = String(b.status)
    if (!PROJECT_STATUSES.has(status)) return { ok: false, error: `status không hợp lệ: ${status}` }
    data.status = status as Prisma.ProjectUncheckedCreateInput['status']
  }
  if (b.copyrightStatus !== undefined) {
    const cs = String(b.copyrightStatus)
    if (!COPYRIGHT_STATUSES.has(cs))
      return { ok: false, error: `copyrightStatus không hợp lệ: ${cs}` }
    data.copyrightStatus = cs as Prisma.ProjectUncheckedCreateInput['copyrightStatus']
  }

  // REGISTERED mà không có số giấy chứng nhận là một khẳng định pháp lý không có
  // gì chống lưng - chặn ngay ở đây, đừng để nó hiện lên trang công khai.
  const nextCopyright = data.copyrightStatus
  const nextNo = b.copyrightNo === undefined ? undefined : String(b.copyrightNo || '').trim()
  if (nextCopyright === 'REGISTERED' && !partial && !nextNo)
    return { ok: false, error: 'copyrightStatus=REGISTERED thì bắt buộc có copyrightNo' }
  for (const k of [
    'descriptionMd',
    'version',
    'repoUrl',
    'homepageUrl',
    'downloadUrl',
    'license',
  ]) {
    if (b[k] !== undefined) loose[k] = b[k] === null ? null : String(b[k])
  }
  for (const k of ['copyrightNo', 'copyrightOwner']) {
    if (b[k] !== undefined) loose[k] = b[k] === null || b[k] === '' ? null : String(b[k])
  }
  for (const k of ['releasedAt', 'copyrightAt']) {
    const v = b[k]
    if (v === undefined) continue
    if (v === null || v === '') {
      set(k, null)
      continue
    }
    // `new Date(x)` nhận cả number lẫn string; mọi thứ khác cho Invalid Date và
    // bị bỏ qua ở dòng dưới, đúng như bản cũ.
    const d = new Date(v as string | number)
    if (Number.isNaN(d.getTime())) continue
    loose[k] = d
  }
  for (const k of ['featured', 'published']) {
    if (b[k] !== undefined) loose[k] = Boolean(b[k])
  }
  if (b.sortOrder !== undefined) data.sortOrder = parseInt(String(b.sortOrder), 10) || 0

  return { ok: true, data }
}

app.get(
  '/api/projects',
  asyncHandler(async (req, res) => {
    // `deletedAt: null` bắt buộc trên mọi đường đọc công khai - xem đợt 5 của
    // docs/refactor-newsroom-agents.md.
    const where: Prisma.ProjectWhereInput = { published: true, deletedAt: null }
    const kind = qStr(req.query.kind)
    const status = qStr(req.query.status)
    const copyright = qStr(req.query.copyright)
    if (kind && PROJECT_KINDS.has(kind)) where.kind = kind as Prisma.ProjectWhereInput['kind']
    if (status && PROJECT_STATUSES.has(status))
      where.status = status as Prisma.ProjectWhereInput['status']
    if (copyright && COPYRIGHT_STATUSES.has(copyright))
      where.copyrightStatus = copyright as Prisma.ProjectWhereInput['copyrightStatus']
    if (req.query.featured === '1') where.featured = true

    const take = Math.min(qInt(req.query.limit, 50), 100)
    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take,
    })
    res.json(projects.map(projectCard))
  })
)

app.get(
  '/api/projects/:slug',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { slug: req.params.slug } })
    if (!project || !project.published || project.deletedAt)
      return res.status(404).json({ error: 'Không tìm thấy dự án' })
    res.json(project)
  })
)

/// Thẻ phát hành công khai.
///
/// `storageKey` KHÔNG BAO GIỜ ra ngoài. Nó là khoá nội bộ trong R2, và để nó rò
/// ra là mời người ta thử gọi thẳng bucket - trong khi lượt tải PHẢI đi qua
/// route đếm ở dưới. Đường tải đối ngoại duy nhất là `downloadPath`.
const releaseCard = (r: ProjectRelease, slug: string) => ({
  id: r.id,
  version: r.version,
  channel: r.channel,
  platform: r.platform,
  // Chuỗi rỗng trong database nghĩa là "không phân biệt kiến trúc"; đối ngoại
  // nó là `null`. Lưu rỗng thay vì NULL là bắt buộc để ràng buộc UNIQUE có tác
  // dụng (SQL coi NULL != NULL) - xem chú thích ở schema.prisma.
  arch: r.arch || null,
  fileName: r.fileName,
  fileSize: r.fileSize,
  sha256: r.sha256,
  signature: r.signature,
  signingKid: r.signingKid,
  releaseNotesMd: r.releaseNotesMd,
  minOsVersion: r.minOsVersion,
  downloadCount: r.downloadCount,
  publishedAt: r.publishedAt,
  /// Nền tảng WEB/SOURCE trỏ ra ngoài (địa chỉ app, repo); mọi nền tảng khác đi
  /// qua route đếm của chính site. Quyết định điều hướng nằm ở ĐÂY chứ không ở
  /// giao diện: nếu để client tự chọn thì một ngày nào đó nó sẽ gọi thẳng R2 và
  /// bộ đếm lặng lẽ đứng yên.
  externalUrl: r.externalUrl,
  downloadPath: r.storageKey ? `/api/projects/${slug}/releases/${r.id}/download` : null,
})

/// Danh sách bản phát hành của một dự án - CÔNG KHAI.
///
/// Mặc định chỉ trả kênh STABLE. Beta/alpha phải xin bằng `?channel=`, vì trang
/// tải về của một người dùng bình thường không được phép mời họ tải bản alpha.
app.get(
  '/api/projects/:slug/releases',
  asyncHandler(async (req, res) => {
    // Buộc thành `string`: express khai `req.params` lỏng nên dưới `strict` nó
    // là `string | undefined`, dù route đã khớp `/:slug` thì nó không thể thiếu.
    const slug = String(req.params.slug || '')
    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true, published: true, deletedAt: true },
    })
    if (!project || !project.published || project.deletedAt)
      return res.status(404).json({ error: 'Không tìm thấy dự án' })

    const channel = qStr(req.query.channel)
    const where: Prisma.ProjectReleaseWhereInput = {
      projectId: project.id,
      // Bản nháp (`publishedAt: null`), đã thu hồi, hay đang có sự cố an ninh
      // (lệch toàn vẹn, nghi mã độc) KHÔNG lọt ra trang công khai. Một điều kiện
      // dùng chung cho mọi đường đọc công khai: releaseSecurity.ts `CONG_KHAI`.
      ...anNinh.CONG_KHAI,
    }
    if (channel && RELEASE_CHANNELS.has(channel))
      where.channel = channel as Prisma.ProjectReleaseWhereInput['channel']
    else where.channel = 'STABLE'

    const releases = await prisma.projectRelease.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }],
      take: Math.min(qInt(req.query.limit, 50), 100),
    })
    res.json(releases.map((r) => releaseCard(r, slug)))
  })
)

/// MỌI bản phát hành đang công bố, gộp theo dự án - CÔNG KHAI.
///
/// Vì sao có endpoint này thay vì để trang chủ gọi `/releases` cho từng dự án:
/// khối "Tải app" ở trang chủ cần biết dự án NÀO có tệp tải về, và câu đó không
/// trả lời được bằng danh sách dự án - phải đọc bảng phát hành. Gọi lần lượt thì
/// thành N+1 lượt mạng ở mỗi lần dựng trang chủ, trên một backend ngủ sau 15
/// phút và một database tính tiền theo thời gian thức.
///
/// Trả về MẢNG đã gộp chứ không phải map: thứ tự dự án là thông tin (nó theo
/// `sortOrder` do chủ dự án đặt), và JSON object không bảo toàn thứ tự một cách
/// đáng tin.
app.get(
  '/api/releases',
  asyncHandler(async (req, res) => {
    const channel = qStr(req.query.channel)
    const kenh = channel && RELEASE_CHANNELS.has(channel) ? channel : 'STABLE'

    const projects = await prisma.project.findMany({
      where: {
        published: true,
        deletedAt: null,
        releases: {
          some: {
            ...anNinh.CONG_KHAI,
            channel: kenh as Prisma.ProjectReleaseWhereInput['channel'],
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: Math.min(qInt(req.query.limit, 20), 50),
      include: {
        releases: {
          where: {
            ...anNinh.CONG_KHAI,
            channel: kenh as Prisma.ProjectReleaseWhereInput['channel'],
          },
          orderBy: [{ publishedAt: 'desc' }],
        },
      },
    })

    res.json(
      projects.map((p) => ({
        project: projectCard(p),
        releases: p.releases.map((r) => releaseCard(r, p.slug)),
      }))
    )
  })
)

/// Đếm lượt tải rồi chuyển hướng tới tệp.
///
/// Vì sao phải có một chặng ở giữa thay vì đưa URL R2 ra thẳng giao diện: bộ đếm
/// sống ở đây. Một đường tải đi thẳng vào bucket thì `downloadCount` đứng yên
/// mãi mãi và không ai phát hiện, vì con số 0 trông giống hệt "chưa ai tải".
///
/// `increment` chạy TRƯỚC khi chuyển hướng và KHÔNG được await lồng trong nhánh
/// lỗi: đếm hụt một lượt là chấp nhận được, nhưng từ chối một lượt tải vì bộ đếm
/// lỗi thì không.
app.get(
  '/api/projects/:slug/releases/:id/download',
  asyncHandler(async (req, res) => {
    const release = await prisma.projectRelease.findFirst({
      where: {
        id: req.params.id,
        // Thu hồi / lệch toàn vẹn / nghi mã độc ⇒ link tải chết ngay (404), kể cả
        // link đã được chia sẻ ra ngoài trước đó.
        ...anNinh.CONG_KHAI,
        project: { slug: req.params.slug, published: true, deletedAt: null },
      },
      select: { id: true, storageKey: true, externalUrl: true, fileName: true },
    })
    if (!release) return res.status(404).json({ error: 'Không tìm thấy bản phát hành' })

    // Tệp trong R2 đi qua URL PRESIGN thời hạn ngắn, không phải `endpoint/bucket/key`
    // trần: bucket production không mở đọc ẩn danh - xem objectStore.ts.
    const dich = release.storageKey
      ? await objectStore.presignGet(release.storageKey, release.fileName)
      : release.externalUrl
    if (!dich)
      return res
        .status(409)
        .json({ error: 'Bản phát hành này chưa có tệp hoặc đường dẫn - dữ liệu không đầy đủ' })

    try {
      await prisma.projectRelease.update({
        where: { id: release.id },
        data: { downloadCount: { increment: 1 } },
      })
    } catch (e) {
      // Đếm hụt thì chỉ mất một con số; chặn lượt tải thì mất người dùng.
      console.error('[content] không tăng được downloadCount:', e)
    }

    // 302 chứ không 301: đích có thể đổi (xoay bucket, đổi tên miền R2), và 301
    // bị trình duyệt cache vĩnh viễn nên một lần sai là sai mãi trên máy đó.
    res.redirect(302, dich)
  })
)

/// Danh sách đầy đủ cho trang quản trị - gồm cả dự án chưa công bố.
app.get(
  '/api/admin/projects',
  largePageRateLimit({
    name: 'admin/projects page_size lớn',
    identify: (req) => req.user?.preferred_username || req.user?.sub,
  }),
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    // `?trash=1` xem thùng rác. Mặc định ẩn đã xoá: trang quản trị mà trộn lẫn
    // dự án còn sống với dự án đã xoá là cách để một ngày nào đó sửa nhầm cái
    // đã bỏ đi rồi tưởng mình vừa sửa cái đang chạy.
    const trash = req.query.trash === '1'
    // Thùng rác và danh sách sống là HAI tập khác nhau, nên `where` của phép
    // đếm phải là chính `where` của truy vấn - đếm lệch làm dòng tóm tắt nói
    // một đằng, bảng hiện một nẻo.
    const where = trash ? { deletedAt: { not: null } } : { deletedAt: null }
    const paging = parsePaging(req.query)
    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: paging.skip,
        take: paging.take,
      }),
    ])
    res.json({ data: projects, meta: pageMeta(total, paging) })
  })
)

/// Đọc và kiểm thân request của một bản phát hành.
///
/// ──────────────────────────────────────────────────────────────────────────────
/// BA BẤT BIẾN ĐƯỢC KIỂM Ở ĐÂY, VÀ CẢ BA ĐỀU TỪNG LÀ LỖ IM LẶNG Ở CHỖ KHÁC
/// ──────────────────────────────────────────────────────────────────────────────
///
///   1. Phải có ĐÚNG MỘT trong `storageKey` / `externalUrl`. Không có cái nào
///      thì nút tải chết; có cả hai thì không ai biết nút dẫn đi đâu, và route
///      tải sẽ im lặng chọn `storageKey`.
///   2. `signature` KHÔNG ĐƯỢC đứng một mình. Chữ ký không nói nó được ký bằng
///      khoá nào là chữ ký không kiểm được sau lần xoay khoá đầu tiên - và vòng
///      khoá của repo này CÓ xoay (`RELEASE_SIGNING_KEYS_RETIRED`). Nên
///      `signature` đòi `signingKid`, và cả hai đòi `sha256` vì chữ ký là chữ ký
///      CỦA chuỗi sha256.
///   3. `sha256` phải đúng hình dạng 64 ký tự thập lục phân. Một checksum sai
///      hình dạng còn tệ hơn không có: người tải chạy `sha256sum`, thấy không
///      khớp, và kết luận tệp đã bị can thiệp.
function readReleaseBody(
  body: unknown,
  opts: { partial: boolean }
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  const data: Record<string, unknown> = {}

  const str = (k: string) => (typeof b[k] === 'string' ? (b[k] as string).trim() : undefined)

  const version = str('version')
  const platform = str('platform')

  if (!opts.partial) {
    if (!version) return { ok: false, error: 'thiếu version' }
    if (!platform) return { ok: false, error: 'thiếu platform' }
  }
  if (version !== undefined) data.version = version
  if (platform !== undefined) {
    if (!RELEASE_PLATFORMS.has(platform))
      return { ok: false, error: `platform không hợp lệ: ${platform}` }
    data.platform = platform
  }

  const channel = str('channel')
  if (channel !== undefined) {
    if (!RELEASE_CHANNELS.has(channel))
      return { ok: false, error: `channel không hợp lệ: ${channel}` }
    data.channel = channel
  }

  // `arch` tách riêng khỏi nhóm dưới: nó KHÔNG nhận null. Cột này là NOT NULL
  // với mặc định chuỗi rỗng, vì một `arch` NULL làm ràng buộc UNIQUE mất tác
  // dụng ở đúng trường hợp phổ biến nhất (SQL: NULL != NULL). Gửi null hay bỏ
  // trống đều quy về ''.
  if (b.arch !== undefined) data.arch = b.arch === null ? '' : str('arch') || ''

  for (const k of ['storageKey', 'externalUrl', 'fileName', 'minOsVersion']) {
    if (b[k] === null) data[k] = null
    else {
      const v = str(k)
      if (v !== undefined) data[k] = v || null
    }
  }

  if (b.releaseNotesMd !== undefined) data.releaseNotesMd = String(b.releaseNotesMd ?? '')

  if (b.fileSize !== undefined && b.fileSize !== null) {
    const n = parseInt(String(b.fileSize), 10)
    if (Number.isNaN(n) || n < 0) return { ok: false, error: 'fileSize phải là số không âm' }
    data.fileSize = n
  }

  const sha = str('sha256')
  if (sha !== undefined) {
    if (sha && !/^[0-9a-f]{64}$/i.test(sha))
      return { ok: false, error: 'sha256 phải là 64 ký tự thập lục phân' }
    data.sha256 = sha ? sha.toLowerCase() : null
  }

  // Chữ ký do MÁY CHỦ tạo, không bao giờ nhận từ client (§6.6, 05/11/2026).
  //
  // Trước đó form quản trị có ô dán `signature` + `signingKid`. Một chữ ký dán
  // tay không ai kiểm: nó có thể ký một sha256 khác, bằng một khoá không có
  // trong JWKS, và trang tải vẫn hiện "Đã ký Ed25519". Nay `kyLaiNeuCo()` ký
  // mỗi lần ghi, bằng chính vòng khoá phát hành ở JWKS.
  if (b.signature !== undefined || b.signingKid !== undefined)
    return {
      ok: false,
      error: 'signature/signingKid do máy chủ tạo khi ghi, không nhận từ client',
    }

  // `publishedAt` là CÔNG TẮC công bố. Nhận boolean cho tiện gọi từ giao diện
  // (`published: true`) và nhận cả mốc thời gian tường minh.
  if (b.published !== undefined) data.publishedAt = b.published ? new Date() : null
  else if (b.publishedAt !== undefined) {
    if (b.publishedAt === null) data.publishedAt = null
    else {
      const d = new Date(b.publishedAt as string)
      if (Number.isNaN(d.getTime()))
        return { ok: false, error: 'publishedAt không phải ngày hợp lệ' }
      data.publishedAt = d
    }
  }

  return { ok: true, data }
}

/// Kiểm ba bất biến trên giá trị SAU khi ghép, không trên thân request.
///
/// Phải làm trên giá trị đã ghép vì PATCH chỉ gửi phần thay đổi: một PATCH đặt
/// `signature` mà không gửi `signingKid` vẫn hợp lệ nếu bản ghi đã có `kid`.
/// Kiểm trên thân request sẽ từ chối oan đúng trường hợp đó.
function kiemBatBienRelease(m: {
  storageKey?: unknown
  externalUrl?: unknown
  sha256?: unknown
  signature?: unknown
  signingKid?: unknown
  publishedAt?: unknown
}): string | null {
  const coKhoa = Boolean(m.storageKey)
  const coUrl = Boolean(m.externalUrl)
  if (!coKhoa && !coUrl) return 'phải có storageKey (tệp đã tải lên) hoặc externalUrl'
  if (coKhoa && coUrl) return 'chỉ được một trong storageKey hoặc externalUrl, không cả hai'
  if (m.signature && !m.signingKid)
    return 'signature phải đi kèm signingKid - chữ ký không nói được ký bằng khoá nào thì không kiểm được sau khi xoay khoá'
  if (m.signature && !m.sha256) return 'signature là chữ ký CỦA sha256, nên phải có sha256'
  // Tệp trong R2 chưa NIÊM PHONG (máy chủ chưa đọc lại để tính sha256) thì không
  // được công bố: nút tải sẽ phát một tệp không ai đối chiếu được.
  if (coKhoa && m.publishedAt && !m.sha256)
    return 'tệp chưa niêm phong (chưa có sha256 do máy chủ tính) - bấm "Niêm phong" trước khi công bố'
  return null
}

/// Ký bản phát hành nếu nó có sha256; xoá chữ ký nếu không.
///
/// Payload ký gồm cả danh tính bản phát hành, không chỉ sha256: chữ ký trên MỘT
/// chuỗi sha256 trần thì bê được sang bất kỳ bản nào khác cùng tệp ("bản 0.9
/// beta" mượn chữ ký của "bản 1.0 stable"). Ký lại MỖI lần ghi để payload không
/// bao giờ lệch khỏi hàng trong database.
function kyLaiNeuCo(
  slug: string,
  m: Record<string, unknown>
): { signature: string | null; signingKid: string | null } {
  if (!m.sha256) return { signature: null, signingKid: null }
  const payload = {
    typ: 'tsudev-release',
    project: slug,
    version: m.version,
    platform: m.platform,
    channel: m.channel ?? 'STABLE',
    arch: (m.arch as string) || null,
    fileName: m.fileName ?? null,
    fileSize: m.fileSize ?? null,
    sha256: m.sha256,
    iat: Math.floor(Date.now() / 1000),
  }
  return { signature: releaseSigning.sign(payload), signingKid: releaseSigning.kid }
}

/// Tệp trong R2 thì sha256 CHỈ đến từ máy chủ (đường niêm phong), không từ client.
///
/// Với `externalUrl` (WEB/SOURCE) không có tệp nào để máy chủ đọc lại, nên chủ dự
/// án được khai sha256 bằng tay - và máy chủ ký lời khai đó như một lời xác nhận.
/// Với `storageKey` thì có: nhận sha256 từ client ở đây là ký một con số thay vì
/// ký tệp thật (xem objectStore.ts).
function shaTuClientChoTep(
  ghep: Record<string, unknown>,
  than: Record<string, unknown> = ghep
): string | null {
  if (ghep.storageKey && than.sha256)
    return 'sha256 của tệp trong R2 do máy chủ tính (Niêm phong), không nhận từ client'
  return null
}

/// `storageKey` phải nằm dưới `releases/<slug>/` của ĐÚNG dự án (§3.3, 05/11/2026).
///
/// `storageKey` do `upload-url` cấp nhưng đi vòng qua client rồi mới quay lại ở
/// bước tạo/sửa. Không kiểm thì một bản phát hành của dự án A trỏ được vào tệp
/// của dự án B (hay bất kỳ object nào trong bucket), và niêm phong sẽ ký tệp đó
/// dưới tên dự án A. Chặn cả đoạn rỗng, `.` và `..`: khoá S3 không chuẩn hoá
/// đường dẫn, nhưng một khoá trông như leo thư mục thì không có lý do để nhận.
function loiKhoaKhongThuocDuAn(slug: string, key: unknown): string | null {
  if (typeof key !== 'string' || !key) return null
  const tienTo = `releases/${slug}/`
  const sai =
    !slug ||
    !key.startsWith(tienTo) ||
    key.length === tienTo.length ||
    key.includes('\\') ||
    key.split('/').some((d) => d === '' || d === '.' || d === '..')
  return sai
    ? `storageKey phải nằm dưới ${tienTo} (khoá do upload-url của chính dự án này cấp)`
    : null
}

/// Danh sách phát hành cho trang quản trị - GỒM CẢ bản nháp và bản đã xoá mềm.
app.get(
  '/api/admin/projects/:slug/releases',
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    const project = await prisma.project.findUnique({
      where: { slug: String(req.params.slug || '') },
      select: { id: true },
    })
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' })
    const releases = await prisma.projectRelease.findMany({
      where: { projectId: project.id },
      orderBy: [{ createdAt: 'desc' }],
    })
    res.json(releases)
  })
)

app.post(
  '/api/admin/projects/:slug/releases',
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    const project = await prisma.project.findUnique({
      where: { slug: String(req.params.slug || '') },
      select: { id: true },
    })
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' })

    const parsed = readReleaseBody(req.body, { partial: false })
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const loiSha = shaTuClientChoTep(parsed.data)
    if (loiSha) return res.status(400).json({ error: loiSha })
    const loiKhoa = loiKhoaKhongThuocDuAn(String(req.params.slug), parsed.data.storageKey)
    if (loiKhoa) return res.status(400).json({ code: 'STORAGE_KEY_SAI_DU_AN', error: loiKhoa })
    const loi = kiemBatBienRelease(parsed.data)
    if (loi) return res.status(400).json({ error: loi })

    try {
      const r = await prisma.projectRelease.create({
        data: {
          ...parsed.data,
          ...kyLaiNeuCo(String(req.params.slug), parsed.data),
          projectId: project.id,
        } as Prisma.ProjectReleaseUncheckedCreateInput,
      })
      res.status(201).json(r)
    } catch (e) {
      // P2002 = vi phạm ràng buộc UNIQUE. Trả 409 thay vì 500: bấm hai lần nút
      // "Tạo bản phát hành" là chuyện thường, và một mã 500 làm người ta tưởng
      // hệ thống hỏng rồi thử lại lần thứ ba.
      if ((e as { code?: string }).code === 'P2002')
        return res.status(409).json({
          error: 'Đã có bản phát hành cùng phiên bản, nền tảng và kiến trúc cho dự án này',
        })
      throw e
    }
  })
)

app.patch(
  '/api/admin/releases/:id',
  asyncHandler(async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    const current = await prisma.projectRelease.findUnique({ where: { id: String(req.params.id) } })
    if (!current) return res.status(404).json({ error: 'Không tìm thấy bản phát hành' })

    const parsed = readReleaseBody(req.body, { partial: true })
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })

    // Trung tâm an ninh (B3): bản đang thu hồi hoặc có sự cố (lệch toàn vẹn, nghi
    // mã độc) KHÔNG công bố được, và KHÔNG đổi tệp được - tệp đó là bằng chứng
    // điều tra, và phiên bản đã ký là bất biến (muốn sửa thì phát hành bản mới).
    const coSuCo = Boolean(current.revokedAt) || current.securityState !== 'OK'
    if (coSuCo && parsed.data.publishedAt)
      return res.status(409).json({
        code: 'KHONG_CONG_BO_DUOC',
        error: current.revokedAt
          ? 'bản phát hành đã bị thu hồi - khôi phục ở /admin/release-security trước'
          : `bản phát hành đang có sự cố an ninh (${current.securityState}) - không công bố được`,
      })
    if (
      coSuCo &&
      parsed.data.storageKey !== undefined &&
      parsed.data.storageKey !== current.storageKey
    )
      return res.status(409).json({
        code: 'GIU_TEP_DIEU_TRA',
        error: 'bản đang thu hồi/có sự cố giữ nguyên tệp để điều tra - phát hành phiên bản mới',
      })

    const ghep: Record<string, unknown> = { ...current, ...parsed.data }
    const loiSha = shaTuClientChoTep(ghep, parsed.data)
    if (loiSha) return res.status(400).json({ error: loiSha })

    const project = await prisma.project.findUnique({
      where: { id: current.projectId },
      select: { slug: true },
    })
    const slug = project?.slug ?? ''
    if (parsed.data.storageKey) {
      const loiKhoa = loiKhoaKhongThuocDuAn(slug, parsed.data.storageKey)
      if (loiKhoa) return res.status(400).json({ code: 'STORAGE_KEY_SAI_DU_AN', error: loiKhoa })
    }

    // Đổi NỀN TẢNG của bản có tệp trong R2: loại tệp phải hợp với nền tảng mới,
    // và checksum + chữ ký cũ phải bỏ. Chữ ký phủ `platform`, nên giữ sha256 rồi
    // ký lại là chứng thực "bản WINDOWS" cho một tệp chỉ từng được kiểm magic
    // bytes như một `.apk` (lỗi qa-test tìm ra ở A3, 05/11/2026). Đuôi không
    // hợp ⇒ 422, không ghi gì; hợp ⇒ xoá, buộc niêm phong lại (seal kiểm magic
    // bytes theo nền tảng mới).
    const doiNenTang =
      parsed.data.platform !== undefined && parsed.data.platform !== current.platform
    if (doiNenTang && ghep.storageKey) {
      const nenTang = String(parsed.data.platform)
      if (!loaiTepPhatHanh(nenTang, String(ghep.storageKey)))
        return res.status(422).json({
          code: 'DUOI_TEP_KHONG_CHO_PHEP',
          error: `tệp hiện tại không thuộc danh sách trắng của ${nenTang} - chỉ nhận: ${
            (RELEASE_FILE_TYPES[nenTang] ?? []).map((l) => l.duoi).join(' ') || '(không có tệp)'
          }`,
        })
    }
    // Đổi tệp (storageKey mới) thì checksum cũ không còn là của tệp này nữa:
    // xoá, buộc niêm phong lại. Đổi nền tảng của tệp R2 cũng vậy (xem trên).
    if (
      (parsed.data.storageKey !== undefined && parsed.data.storageKey !== current.storageKey) ||
      (doiNenTang && ghep.storageKey)
    ) {
      ghep.sha256 = null
      ghep.fileSize = null
      parsed.data.sha256 = null
      parsed.data.fileSize = null
    }
    // Chữ ký cũ không tính: `kyLaiNeuCo()` thay nó ngay dưới đây.
    const loi = kiemBatBienRelease({ ...ghep, signature: null, signingKid: null })
    if (loi) return res.status(400).json({ error: loi })

    const r = await prisma.projectRelease.update({
      where: { id: current.id },
      data: {
        ...parsed.data,
        ...kyLaiNeuCo(slug, ghep),
      } as Prisma.ProjectReleaseUncheckedUpdateInput,
    })
    if (Boolean(current.publishedAt) !== Boolean(r.publishedAt))
      await anNinh.ghiNhatKy(
        tacNhanCua(admin),
        r.publishedAt ? 'RELEASE_PUBLISH' : 'RELEASE_UNPUBLISH',
        r,
        slug
      )
    res.json(r)
  })
)

/// XOÁ MỀM. Đặt `deletedAt`, không DELETE thật.
///
/// Lý do giống hệt `Project`: một bản phát hành đã công bố có thể đã được người
/// ta tải về và đang đối chiếu checksum. Xoá cứng thì checksum đó biến thành
/// không kiểm được, và người tải không có cách nào biết tệp trên máy họ là thật
/// hay giả.
app.delete(
  '/api/admin/releases/:id',
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    const current = await prisma.projectRelease.findUnique({ where: { id: String(req.params.id) } })
    if (!current) return res.status(404).json({ error: 'Không tìm thấy bản phát hành' })
    if (current.deletedAt) return res.status(409).json({ error: 'Bản phát hành đã bị xoá' })
    await prisma.projectRelease.update({
      where: { id: current.id },
      data: { deletedAt: new Date() },
    })
    res.json({ ok: true })
  })
)

/// Cấp URL tải tệp phát hành LÊN thẳng R2 (§6.6).
///
/// Tệp đi THẲNG từ trình duyệt vào bucket, không qua Worker hay Render: Worker
/// giới hạn thân request 100 MB, Render free có 512 MB RAM, còn bản cài đặt có
/// thể lớn hơn cả hai. Khoá do MÁY CHỦ đặt (không nhận khoá từ client) và gắn
/// một đoạn ngẫu nhiên, để hai lần tải cùng tên tệp không ghi đè lên nhau - tệp
/// cũ có thể đang là đích của một bản đã công bố với checksum đã phát ra ngoài.
///
/// Siết tải lên (§3.3 kế hoạch ATTT, đóng G3 - 05/11/2026):
///   - `platform` + `fileName`: đuôi phải nằm trong danh sách TRẮNG của nền tảng
///     (`RELEASE_FILE_TYPES`, objectStore.ts).
///   - `fileSize` (số nguyên dương, BẮT BUỘC) được KÝ vào URL (`Content-Length`):
///     PUT có kích thước khác bị kho từ chối. Vượt trần nền tảng ⇒ 413.
///   - `contentType` do máy chủ suy từ đuôi và cũng được ký vào URL. Client gửi
///     `contentType` ⇒ 400, cùng khuôn với `signature`/`sha256`: trường do máy
///     chủ quyết thì từ chối thẳng, không lặng lẽ bỏ qua - bỏ qua thì client
///     tưởng giá trị của nó được dùng.
/// Lỗi trả `{ error, code }` - `code` ổn định để giao diện rẽ nhánh, `error` để đọc.
app.post(
  '/api/admin/projects/:slug/releases/upload-url',
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    const project = await prisma.project.findUnique({
      where: { slug: String(req.params.slug || '') },
      select: { slug: true },
    })
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' })

    const b = (req.body ?? {}) as Record<string, unknown>
    if (b.contentType !== undefined)
      return res.status(400).json({
        code: 'CONTENT_TYPE_DO_MAY_CHU',
        error: 'contentType do máy chủ suy từ đuôi tệp, không nhận từ client',
      })
    const fileName = typeof b.fileName === 'string' ? b.fileName.trim() : ''
    if (!fileName) return res.status(400).json({ code: 'THIEU_FILE_NAME', error: 'thiếu fileName' })

    const platform = typeof b.platform === 'string' ? b.platform.trim() : ''
    if (!RELEASE_PLATFORMS.has(platform))
      return res.status(400).json({
        code: 'PLATFORM_KHONG_HOP_LE',
        error: platform ? `platform không hợp lệ: ${platform}` : 'thiếu platform',
      })
    const dsLoai = RELEASE_FILE_TYPES[platform]
    if (!dsLoai)
      return res.status(400).json({
        code: 'NEN_TANG_KHONG_CO_TEP',
        error: `nền tảng ${platform} không có tệp tải lên - dùng đường dẫn ngoài (externalUrl)`,
      })

    // Chỉ nhận số JSON: chuỗi "123abc" mà parseInt cho qua là đúng loại lời khai
    // mơ hồ mà một con số được ký vào URL không được phép mang.
    const fileSize = b.fileSize
    if (typeof fileSize !== 'number' || !Number.isSafeInteger(fileSize) || fileSize <= 0)
      return res.status(400).json({
        code: 'FILE_SIZE_KHONG_HOP_LE',
        error: 'fileSize phải là số nguyên dương (số byte của tệp sẽ tải lên)',
      })

    const loai = loaiTepPhatHanh(platform, fileName)
    if (!loai)
      return res.status(400).json({
        code: 'DUOI_TEP_KHONG_CHO_PHEP',
        error: `đuôi tệp không được phép cho ${platform} - chỉ nhận: ${dsLoai
          .map((l) => l.duoi)
          .join(' ')}`,
      })

    const maxBytes = MAX_RELEASE_BYTES[platform] ?? 0 // nền tảng không có trần ⇒ fail closed
    if (fileSize > maxBytes)
      return res.status(413).json({
        code: 'VUOT_TRAN_KICH_THUOC',
        error: `tệp ${fileSize} byte vượt trần ${maxBytes} byte của ${platform}`,
      })

    const key = `releases/${project.slug}/${randomBytes(6).toString('hex')}/${tenTepTrongKho(
      fileName,
      loai
    )}`
    const url = await objectStore.presignPut(key, loai.contentType, fileSize)
    // `contentType` và `fileSize` trả về là thứ ĐÃ KÝ vào URL: PUT phải mang đúng
    // `Content-Type` này và đúng chừng ấy byte, lệch là kho trả 403.
    res.json({ url, key, contentType: loai.contentType, fileSize, maxBytes })
  })
)

/// NIÊM PHONG một bản phát hành có tệp trong R2: máy chủ đọc lại trọn object,
/// tính sha256 + dung lượng THẬT, rồi ký bằng khoá phát hành (§6.6).
///
/// Tách khỏi POST tạo vì đọc lại một tệp vài trăm MB mất thời gian, và một lượt
/// niêm phong thất bại (tệp chưa lên xong, R2 chập chờn) phải thử lại được mà
/// không tạo lại bản phát hành. Gọi lại nhiều lần là an toàn - kết quả như nhau.
///
/// Trước khi ký, kiểm loại tệp (§3.3, G3): đuôi của `storageKey` phải thuộc danh
/// sách trắng của nền tảng, dung lượng thật không vượt trần, và byte đầu/cuối -
/// lấy trong CHÍNH lượt đọc đang băm - phải khớp loại mà đuôi tuyên bố. Lệch ⇒
/// 422 kèm `code`, không ghi gì, không ký. `storageKey` do client gửi lại ở bước
/// tạo, nên đuôi được kiểm lại ở đây chứ không tin lớp `upload-url`.
app.post(
  '/api/admin/releases/:id/seal',
  asyncHandler(async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    const current = await prisma.projectRelease.findUnique({
      where: { id: String(req.params.id) },
      include: { project: { select: { slug: true } } },
    })
    if (!current) return res.status(404).json({ error: 'Không tìm thấy bản phát hành' })
    if (current.deletedAt) return res.status(409).json({ error: 'Bản phát hành đã bị xoá' })
    if (!current.storageKey)
      return res
        .status(409)
        .json({ error: 'Chỉ niêm phong được bản có tệp trong R2 (không phải đường dẫn ngoài)' })
    // Niêm phong lại một tệp ĐÃ LỆCH là KÝ tệp bị thay - chính thứ cơ chế này tồn
    // tại để chặn. Bản thu hồi giữ nguyên trạng thái để điều tra.
    if (current.revokedAt || current.securityState === 'LECH_TOAN_VEN')
      return res.status(409).json({
        code: 'KHONG_NIEM_PHONG_LAI',
        error: current.revokedAt
          ? 'bản đã thu hồi không niêm phong lại được'
          : 'tệp đang lệch toàn vẹn - không ký lại tệp bị thay; phát hành phiên bản mới',
      })

    const loiKhoa = loiKhoaKhongThuocDuAn(current.project.slug, current.storageKey)
    if (loiKhoa) return res.status(422).json({ code: 'STORAGE_KEY_SAI_DU_AN', error: loiKhoa })

    const loai = loaiTepPhatHanh(current.platform, current.storageKey)
    if (!loai)
      return res.status(422).json({
        code: 'DUOI_TEP_KHONG_CHO_PHEP',
        error: `đuôi tệp không được phép cho ${current.platform} - chỉ nhận: ${
          (RELEASE_FILE_TYPES[current.platform] ?? []).map((l) => l.duoi).join(' ') ||
          '(không có tệp)'
        }`,
      })

    let doc: Awaited<ReturnType<typeof objectStore.hashObject>>
    try {
      doc = await objectStore.hashObject(current.storageKey)
    } catch (e) {
      console.error('[content] niêm phong: không đọc được object', current.storageKey, e)
      return res.status(502).json({
        error: 'Không đọc được tệp trong kho - tệp đã tải lên xong chưa? Thử lại sau giây lát.',
      })
    }

    const maxBytes = MAX_RELEASE_BYTES[current.platform] ?? 0 // nền tảng không có trần ⇒ fail closed
    if (doc.size > maxBytes)
      return res.status(422).json({
        code: 'VUOT_TRAN_KICH_THUOC',
        error: `tệp trong kho ${doc.size} byte vượt trần ${maxBytes} byte của ${current.platform}`,
      })
    if (!loai.khop(doc.head, doc.tail)) {
      console.warn(
        '[content] niêm phong: tệp sai loại',
        current.storageKey,
        doc.head.toString('hex')
      )
      return res.status(422).json({
        code: 'SAI_LOAI_TEP',
        error: `nội dung tệp không phải ${loai.duoi} (mong đợi ${loai.dauHieu}) - từ chối niêm phong`,
      })
    }

    // Tệp ĐÃ niêm phong mà băm lại ra số khác ⇒ bị thay trong kho. Khoá object do
    // máy chủ cấp, ngẫu nhiên cho MỖI lượt tải lên, và đổi tệp hợp lệ đi qua PATCH
    // storageKey (xoá sha256 cũ) - nên cùng một khoá không bao giờ có tệp mới hợp
    // lệ. Trước 06/11/2026 nhánh này ký luôn tệp mới: "gọi lại nhiều lần là an
    // toàn" đúng với kho chập chờn, nhưng biến nút Niêm phong thành nút hợp thức
    // hoá tệp bị thay.
    const actor = tacNhanCua(admin)
    if (current.sha256 && current.sha256 !== doc.sha256) {
      await anNinh.danhDauLech(
        current,
        actor,
        `niêm phong lại: kho ${doc.sha256} (${doc.size} B) ≠ đã ký ${current.sha256}`
      )
      return res.status(409).json({
        code: 'LECH_TOAN_VEN',
        error:
          'tệp trong kho KHÔNG khớp sha256 đã niêm phong - đã đánh dấu lệch toàn vẹn và gỡ công bố',
      })
    }

    const { project, ...hang } = current
    const ghep: Record<string, unknown> = { ...hang, sha256: doc.sha256, fileSize: doc.size }
    const r = await prisma.projectRelease.update({
      where: { id: current.id },
      data: {
        sha256: doc.sha256,
        fileSize: doc.size,
        lastIntegrityAt: new Date(),
        ...kyLaiNeuCo(project.slug, ghep),
      },
    })
    await anNinh.ghiNhatKy(actor, 'RELEASE_SEAL', r, project.slug, `sha256=${doc.sha256}`)
    // Quét mã độc (G4): tra BĂM trên VirusTotal. Có phát hiện ⇒ NGHI_MA_DOC, chặn
    // công bố. Thiếu khoá ⇒ ghi CHUA_QUET, không chặn, không giả vờ đã quét.
    const scan = await anNinh.traVirusTotal(doc.sha256)
    await anNinh.apDungKetQuaQuet({ ...r, project }, scan, actor)
    res.json(await prisma.projectRelease.findUnique({ where: { id: r.id } }))
  })
)

// ---------------------------------------------------------------------------
// TRUNG TÂM AN NINH PHÁT HÀNH (docs/security-plan.md §3, B3)
//
// Mọi route dưới /api/admin tự gọi requireAdmin() (vai trò từ DB + ép TOTP).
// Thu hồi / khôi phục / ký lại còn đòi STEP-UP (TOTP < 5 phút, `requireStepUp`)
// và lý do bắt buộc. Trạng thái an ninh tính Ở MÁY CHỦ (`trangThaiAnNinh`).
// ---------------------------------------------------------------------------

const TRANG_THAI_AN_NINH: readonly anNinh.TrangThaiAnNinh[] = [
  'OK',
  'CHUA_NIEM_PHONG',
  'KHOA_DA_NGHI',
  'LECH_TOAN_VEN',
  'NGHI_MA_DOC',
  'DA_THU_HOI',
  'CHU_KY_LOI',
  'DUONG_DAN_NGOAI',
]

/** Lý do thu hồi/khôi phục: bắt buộc, đủ dài để còn nghĩa khi đọc lại sau nửa năm. */
function docLyDo(body: unknown): string | null {
  const v = (body ?? {}) as Record<string, unknown>
  const lyDo = typeof v.reason === 'string' ? v.reason.trim() : ''
  return lyDo.length >= 10 && lyDo.length <= 500 ? lyDo : null
}

/// Bảng kê tài sản: mọi bản phát hành chưa xoá + trạng thái an ninh tính ở máy
/// chủ. Lọc `project` (slug), `platform`, `state`; phân trang `page`/`page_size`.
/// Lọc theo trạng thái làm TRONG bộ nhớ vì trạng thái là giá trị tính (kiểm chữ
/// ký), không phải cột - số bản phát hành của một người vận hành là hàng chục.
app.get(
  '/api/admin/release-security',
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    const paging = parsePaging(req.query)
    const slug = qStr(req.query.project)?.trim()
    const platform = qStr(req.query.platform)?.trim()
    const state = qStr(req.query.state)?.trim()
    if (platform && !RELEASE_PLATFORMS.has(platform))
      return res.status(400).json({ error: `platform không hợp lệ: ${platform}` })
    if (state && !TRANG_THAI_AN_NINH.includes(state as anNinh.TrangThaiAnNinh))
      return res.status(400).json({ error: `state không hợp lệ: ${state}` })

    const rows = await prisma.projectRelease.findMany({
      where: {
        deletedAt: null,
        ...(slug ? { project: { slug } } : {}),
        ...(platform ? { platform: platform as Prisma.ProjectReleaseWhereInput['platform'] } : {}),
      },
      include: { project: { select: { slug: true, name: true } } },
      orderBy: [{ createdAt: 'desc' }],
    })
    const now = Date.now()
    const all = rows.map((r) => {
      const tt = anNinh.trangThaiAnNinh(r)
      return {
        id: r.id,
        project: r.project,
        version: r.version,
        channel: r.channel,
        platform: r.platform,
        arch: r.arch || null,
        fileName: r.fileName,
        fileSize: r.fileSize,
        sha256: r.sha256,
        signingKid: r.signingKid,
        hasFile: Boolean(r.storageKey),
        externalUrl: r.externalUrl,
        createdAt: r.createdAt,
        publishedAt: r.publishedAt,
        downloadCount: r.downloadCount,
        lastIntegrityAt: r.lastIntegrityAt,
        integrityStale:
          Boolean(r.storageKey && r.sha256) &&
          (!r.lastIntegrityAt || now - r.lastIntegrityAt.getTime() > anNinh.TOAN_VEN_QUA_HAN_MS),
        revokedAt: r.revokedAt,
        revokeReason: r.revokeReason,
        scanResult: r.scanResult,
        state: tt.state,
        stateDetail: tt.detail,
      }
    })
    const summary = Object.fromEntries(TRANG_THAI_AN_NINH.map((t) => [t, 0])) as Record<
      anNinh.TrangThaiAnNinh,
      number
    >
    for (const r of all) summary[r.state]++
    const loc = state ? all.filter((r) => r.state === state) : all
    res.json({
      items: loc.slice(paging.skip, paging.skip + paging.take),
      summary,
      currentKid: releaseSigning.kid,
      virusTotalConfigured: Boolean(process.env.VIRUSTOTAL_API_KEY),
      ...pageMeta(loc.length, paging),
    })
  })
)

/// Kiểm chuỗi băm của nhật ký quản trị (G8). Đứt chuỗi = có dòng bị xoá ở giữa.
app.get(
  '/api/admin/release-security/audit-chain',
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    const kq = await anNinh.kiemChuoiNhatKy()
    res.json({ ok: kq.breaks.length === 0, ...kq })
  })
)

/// Lịch sử một bản phát hành (niêm phong, công bố, kiểm toàn vẹn, thu hồi...),
/// đọc từ nhật ký CHỈ-THÊM.
app.get(
  '/api/admin/releases/:id/history',
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    const items = await prisma.trustAuditLog.findMany({
      where: { targetType: 'ProjectRelease', targetId: String(req.params.id) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
      select: { id: true, actorName: true, action: true, note: true, createdAt: true },
    })
    res.json({ items })
  })
)

/// Kiểm lại toàn vẹn NGAY (băm lại tệp trong kho, so sha256 đã ký).
app.post(
  '/api/admin/releases/:id/integrity',
  asyncHandler(async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    const kq = await anNinh.kiemToanVen(String(req.params.id), tacNhanCua(admin))
    if (kq.ketQua === 'BO_QUA' && kq.lyDo === 'không tìm thấy')
      return res.status(404).json({ error: 'Không tìm thấy bản phát hành' })
    if (kq.ketQua === 'LOI') return res.status(502).json({ ...kq, error: kq.lyDo })
    res.json(kq)
  })
)

/// THU HỒI: ẩn khỏi trang công khai, chặn link tải, GIỮ tệp để điều tra.
/// ADMIN + step-up + lý do. Không xoá, không đổi publishedAt (khôi phục trả lại
/// đúng trạng thái công bố trước đó).
app.post(
  '/api/admin/releases/:id/revoke',
  asyncHandler(async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    if (!requireStepUp(req, res, admin)) return
    const lyDo = docLyDo(req.body)
    if (!lyDo)
      return res.status(400).json({ code: 'THIEU_LY_DO', error: 'lý do bắt buộc, 10-500 ký tự' })
    const r = await prisma.projectRelease.findUnique({
      where: { id: String(req.params.id) },
      include: { project: { select: { slug: true } } },
    })
    if (!r || r.deletedAt) return res.status(404).json({ error: 'Không tìm thấy bản phát hành' })
    if (r.revokedAt) return res.status(409).json({ code: 'DA_THU_HOI', error: 'đã thu hồi rồi' })
    const sau = await prisma.projectRelease.update({
      where: { id: r.id },
      data: { revokedAt: new Date(), revokeReason: lyDo },
    })
    await anNinh.ghiNhatKy(tacNhanCua(admin), 'RELEASE_REVOKE', r, r.project.slug, lyDo)
    res.json(sau)
  })
)

/// KHÔI PHỤC bản đã thu hồi. Cùng mức bảo vệ với thu hồi. Bản còn sự cố an ninh
/// (lệch toàn vẹn, nghi mã độc) vẫn bị bộ lọc công khai chặn sau khi khôi phục.
app.post(
  '/api/admin/releases/:id/restore',
  asyncHandler(async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    if (!requireStepUp(req, res, admin)) return
    const lyDo = docLyDo(req.body)
    if (!lyDo)
      return res.status(400).json({ code: 'THIEU_LY_DO', error: 'lý do bắt buộc, 10-500 ký tự' })
    const r = await prisma.projectRelease.findUnique({
      where: { id: String(req.params.id) },
      include: { project: { select: { slug: true } } },
    })
    if (!r || r.deletedAt) return res.status(404).json({ error: 'Không tìm thấy bản phát hành' })
    if (!r.revokedAt)
      return res.status(409).json({ code: 'CHUA_THU_HOI', error: 'bản này chưa bị thu hồi' })
    const sau = await prisma.projectRelease.update({
      where: { id: r.id },
      data: { revokedAt: null, revokeReason: null },
    })
    await anNinh.ghiNhatKy(
      tacNhanCua(admin),
      'RELEASE_RESTORE',
      r,
      r.project.slug,
      `${lyDo} (lý do thu hồi trước: ${r.revokeReason ?? '-'})`
    )
    res.json(sau)
  })
)

/// KÝ LẠI bằng khoá hiện hành (sau xoay khoá). OWNER + step-up. Chỉ ký lại
/// sha256 ĐÃ có - không đọc lại tệp; bản có sự cố hoặc chữ ký hỏng thì không.
app.post(
  '/api/admin/releases/:id/resign',
  asyncHandler(async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    if (admin.role !== 'OWNER')
      return res.status(403).json({ error: 'Chỉ OWNER được ký lại bản phát hành' })
    if (!requireStepUp(req, res, admin)) return
    const r = await prisma.projectRelease.findUnique({
      where: { id: String(req.params.id) },
      include: { project: { select: { slug: true } } },
    })
    if (!r || r.deletedAt) return res.status(404).json({ error: 'Không tìm thấy bản phát hành' })
    const tt = anNinh.trangThaiAnNinh(r)
    if (tt.state !== 'KHOA_DA_NGHI' && tt.state !== 'OK')
      return res.status(409).json({
        code: 'KHONG_KY_LAI_DUOC',
        error: `trạng thái ${tt.state} - chỉ ký lại bản OK hoặc ký bằng khoá đã nghỉ`,
      })
    const { project, ...hang } = r
    const sau = await prisma.projectRelease.update({
      where: { id: r.id },
      data: kyLaiNeuCo(project.slug, hang as Record<string, unknown>),
    })
    await anNinh.ghiNhatKy(
      tacNhanCua(admin),
      'RELEASE_RESIGN',
      r,
      project.slug,
      `${r.signingKid ?? '-'} → ${sau.signingKid}`
    )
    res.json(sau)
  })
)

/// LƯỢT KIỂM THEO LỊCH - chỉ Worker cron `canh-site-cron` gọi (B4).
///
/// Gác bằng bí mật RIÊNG `RELEASE_INTEGRITY_TOKEN` (header
/// `x-release-integrity-token`), KHÔNG bằng INTERNAL_API_TOKEN: BFF cũng giữ
/// token đó và gắn nó vào mọi request nó chuyển tiếp. Thiếu bí mật ⇒ 503 (fail
/// closed - không có chế độ "để trống là mở"). Nằm ngoài /api/admin vì không có
/// người dùng nào đứng sau.
const INTEGRITY_TOKEN = process.env.RELEASE_INTEGRITY_TOKEN || ''
const khopTokenKiem = (got: unknown): boolean => {
  if (!INTEGRITY_TOKEN || typeof got !== 'string' || !got) return false
  const a = createHash('sha256').update(got).digest()
  const b = createHash('sha256').update(INTEGRITY_TOKEN).digest()
  return timingSafeEqual(a, b)
}
app.post(
  '/api/internal/releases/integrity',
  asyncHandler(async (req, res) => {
    if (!INTEGRITY_TOKEN)
      return res.status(503).json({ error: 'RELEASE_INTEGRITY_TOKEN chưa cấu hình' })
    if (!khopTokenKiem(req.get('x-release-integrity-token')))
      return res.status(401).json({ error: 'sai hoặc thiếu x-release-integrity-token' })
    const b = (req.body ?? {}) as Record<string, unknown>
    const nganSach = Math.min(Math.max(Number(b.budgetMs) || 120_000, 1_000), 600_000)
    const bc = await anNinh.luotKiemTheoLich(nganSach)
    console.log(
      `[release-security] lượt kiểm: ${bc.checked} tệp, khớp ${bc.khop}, lệch ${bc.lech.length}, ` +
        `lỗi ${bc.loi.length}, còn ${bc.conLai}, tra lại VirusTotal ${bc.quetLai}`
    )
    res.json(bc)
  })
)

app.post(
  '/api/admin/projects',
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    const parsed = readProjectBody(req.body, { partial: false })
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    // `partial: false` ⇒ readProjectBody đã chặn thiếu slug/name/summary bằng
    // `return { error }` ở trên. Đây là chỗ DUY NHẤT khẳng định điều đó.
    const data = parsed.data as Prisma.ProjectUncheckedCreateInput

    const clash = await prisma.project.findUnique({ where: { slug: data.slug } })
    if (clash) return res.status(409).json({ error: `slug "${data.slug}" đã tồn tại` })

    const project = await prisma.project.create({ data })
    res.status(201).json(project)
  })
)

app.patch(
  '/api/admin/projects/:slug',
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    const current = await prisma.project.findUnique({ where: { slug: req.params.slug } })
    if (!current) return res.status(404).json({ error: 'Không tìm thấy dự án' })

    const parsed = readProjectBody(req.body, { partial: true })
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const data = parsed.data

    // Kiểm chéo với giá trị SAU khi ghép, không phải với phần thân request:
    // PATCH chỉ gửi copyrightStatus vẫn phải thoả ràng buộc "REGISTERED cần số".
    const merged = { ...current, ...data }
    if (merged.copyrightStatus === 'REGISTERED' && !merged.copyrightNo)
      return res
        .status(400)
        .json({ error: 'copyrightStatus=REGISTERED thì bắt buộc có copyrightNo' })

    if (data.slug && data.slug !== current.slug) {
      const clash = await prisma.project.findUnique({ where: { slug: data.slug } })
      if (clash) return res.status(409).json({ error: `slug "${data.slug}" đã tồn tại` })
    }

    const project = await prisma.project.update({ where: { id: current.id }, data })
    res.json(project)
  })
)

/**
 * XOÁ MỀM, không phải xoá cứng.
 *
 * Đổi ở đợt 5 của Toà soạn Agent AI. Giữ nguyên động từ DELETE và hình dạng
 * phản hồi để không phá `/admin/projects` đang chạy - thay đổi nằm ở chỗ bản
 * ghi vẫn còn trong DB và khôi phục được.
 *
 * ⚠️ Route này PHẢI đổi TRƯỚC khi trigger tsudev_block_hard_delete được gắn cho
 * bảng Project. Đảo thứ tự là mọi lượt xoá dự án ném lỗi 500 - một tính năng
 * đang chạy được bỗng hỏng vì một migration.
 */
app.delete(
  '/api/admin/projects/:slug',
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    const current = await prisma.project.findUnique({ where: { slug: req.params.slug } })
    if (!current || current.deletedAt)
      return res.status(404).json({ error: 'Không tìm thấy dự án' })
    await prisma.project.update({ where: { id: current.id }, data: { deletedAt: new Date() } })
    res.json({ ok: true, softDeleted: true })
  })
)

/** Khôi phục từ thùng rác. Chỉ ADMIN, giống mọi đường ghi khác dưới /api/admin. */
app.post(
  '/api/admin/projects/:slug/restore',
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    const current = await prisma.project.findUnique({ where: { slug: req.params.slug } })
    if (!current) return res.status(404).json({ error: 'Không tìm thấy dự án' })
    const project = await prisma.project.update({
      where: { id: current.id },
      data: { deletedAt: null },
    })
    res.json(project)
  })
)

// ---------------- Đăng bài cho AUTHOR ----------------
//
// Bề mặt để NGƯỜI có vai trò AUTHOR (trở lên) tự đăng và sửa bài blog của CHÍNH
// MÌNH. Khác hẳn hai đường ghi còn lại của service:
//   - `/api/admin/*` gác requireAdmin (ADMIN trở lên), không giới hạn tác giả;
//   - Toà soạn Agent AI ghi qua ContentDraft rồi CHIẾU sang Post.
//
// Ở đây gác requireRole('AUTHOR') VÀ mọi truy vấn kẹp thêm `authorId === me.id`:
// người đi qua đường này - kể cả ADMIN/OWNER, vốn cao hơn AUTHOR - chỉ đụng được
// bài của chính họ. Muốn sửa bài của người khác là một bề mặt KHÁC, chưa có.
// Bài do người viết mang `authoredByAgentId: null` (phân biệt với bài Toà soạn).

async function requireAuthor(req: Request, res: Response): Promise<User | null> {
  // Cùng khuôn requireAdmin: lookupUser() tra cứu (không tạo) và đối chiếu
  // sessionVersion, fail closed. Ngưỡng là AUTHOR thay vì ADMIN.
  const user = await lookupUser(req)
  if (!user) {
    res.status(401).json({ error: 'Bạn cần đăng nhập' })
    return null
  }
  if (!hasAtLeastRole(user.role, 'AUTHOR')) {
    res.status(403).json({ error: 'Yêu cầu quyền đăng bài' })
    return null
  }
  return user
}

/**
 * requireAuthor + email ĐỦ DÙNG. Dùng cho đường GHI Post (tạo/sửa/xoá): chưa xác
 * minh mà đã quá ân hạn thì chặn. Đường ĐỌC (list/get) vẫn dùng requireAuthor -
 * xem được bản nháp của mình dù chưa xác minh là vô hại. Ngưỡng ân hạn sống một
 * chỗ ở @tsudev/types, khớp với cổng nâng vai trò ở auth-service.
 */
async function requireVerifiedAuthor(req: Request, res: Response): Promise<User | null> {
  const me = await requireAuthor(req, res)
  if (!me) return null
  if (!emailUsable(me.emailVerifiedAt, me.createdAt)) {
    res.status(403).json({ error: 'email_unverified' })
    return null
  }
  // P1.2: từ AUTHOR trở lên, đường GHI đòi TOTP đã xác nhận (trước 14/11/2026 chỉ
  // ADMIN). Một tài khoản đăng bài bị chiếm bằng mật khẩu lộ là trang công khai
  // của tsudev.com bị viết hộ. Đường ĐỌC (xem nháp của mình) không chặn - để trang
  // /author vẫn mở được và chỉ đường bật 2FA. 403 `MFA_REQUIRED`, lỗi DB ⇒ 503.
  if (!(await requireSecondFactor(me, res))) return null
  return me
}

// Suy slug từ tiêu đề tiếng Việt: bỏ dấu (NFD tách dấu ra rồi xoá), đ→d, gom
// mọi thứ không phải [a-z0-9] thành gạch nối. Kết quả vẫn được SLUG_RE kiểm lại.
const slugify = (s: string): string =>
  // Cắt độ dài TRƯỚC: tiêu đề do người dùng gửi, và mọi bước sau tỉ lệ với nó.
  s
    .slice(0, 500)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    // Bước trên đã gom mọi chuỗi ký tự lạ thành MỘT '-', nên mỗi đầu có tối đa
    // một '-'. `/^-+|-+$/` trên chuỗi dài toàn '-' là đa thức (js/polynomial-redos).
    .replace(/^-|-$/g, '')

type PostRef = { label: string; url: string }
type PostWritable = {
  slug?: string
  title?: string
  excerpt?: string | null
  contentMd?: string
  tags?: string[]
  published?: boolean
  publishedAt?: Date | null
  references?: PostRef[]
  coverImageUrl?: string | null
  metaDescription?: string | null
}
type PostBodyResult = { ok: true; data: PostWritable } | { ok: false; error: string }

// URL người dùng khai (nguồn tham khảo, ảnh bìa) CHỈ chấp nhận http/https - chặn
// `javascript:`/`data:` (XSS khi render) và giao thức lạ. Trần độ dài chống nhồi.
const isHttpUrl = (s: string): boolean => {
  if (s.length > 2048) return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** Làm sạch mảng "Nguồn tham khảo": mỗi phần tử {label,url}, url phải http/https. */
function readReferences(
  raw: unknown
): { ok: true; refs: PostRef[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: 'references phải là mảng' }
  if (raw.length > 50) return { ok: false, error: 'references tối đa 50 mục' }
  const refs: PostRef[] = []
  for (const item of raw) {
    const o = (item ?? {}) as Record<string, unknown>
    const url = String(o.url ?? '').trim()
    if (!url) continue
    if (!isHttpUrl(url)) return { ok: false, error: `URL nguồn không hợp lệ: ${url.slice(0, 80)}` }
    // Nhãn rỗng ⇒ suy từ host để vùng hiển thị luôn có chữ đọc được.
    let label = String(o.label ?? '')
      .trim()
      .slice(0, 200)
    if (!label) {
      try {
        label = new URL(url).host
      } catch {
        label = url
      }
    }
    refs.push({ label, url })
  }
  return { ok: true, refs }
}

/**
 * Làm sạch phần thân request cho Post. `authorId`/`authoredByAgentId` CỐ Ý không
 * đọc từ đây - tác giả do phiên quyết định, không do người dùng khai.
 */
function readPostBody(body: unknown, { partial }: { partial: boolean }): PostBodyResult {
  const b = (body ?? {}) as Record<string, unknown>
  const data: PostWritable = {}

  if (!partial || b.title !== undefined) {
    const title = String(b.title ?? '').trim()
    if (!title) return { ok: false, error: 'Thiếu title' }
    data.title = title
  }
  if (!partial || b.contentMd !== undefined) {
    const contentMd = String(b.contentMd ?? '')
    if (!contentMd.trim()) return { ok: false, error: 'Thiếu contentMd' }
    data.contentMd = contentMd
  }
  // slug: gửi thì kiểm; tạo mới mà bỏ trống thì suy từ title.
  if (b.slug !== undefined && String(b.slug).trim() !== '') {
    const slug = String(b.slug).trim().toLowerCase()
    if (!SLUG_RE.test(slug))
      return {
        ok: false,
        error: 'slug phải là chữ thường, số và dấu gạch nối (ví dụ: bai-viet-dau)',
      }
    data.slug = slug
  } else if (!partial) {
    const derived = slugify(data.title || '')
    if (!SLUG_RE.test(derived))
      return { ok: false, error: 'Không suy được slug từ title; hãy nhập slug' }
    data.slug = derived
  }
  if (b.excerpt !== undefined) {
    const ex = b.excerpt === null ? null : String(b.excerpt).trim()
    data.excerpt = ex === '' ? null : ex
  }
  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags)) return { ok: false, error: 'tags phải là mảng chuỗi' }
    data.tags = b.tags.map((t) => String(t).trim()).filter((t) => t.length > 0)
  }
  if (b.published !== undefined) data.published = Boolean(b.published)

  // Ngày hiển thị/lên lịch. null = xoá (đọc công khai fallback createdAt). Chuỗi
  // ISO ⇒ Date; ngày tương lai = hẹn lịch (đường đọc ẩn tới giờ).
  if (b.publishedAt !== undefined) {
    if (b.publishedAt === null || b.publishedAt === '') {
      data.publishedAt = null
    } else {
      const d = new Date(String(b.publishedAt))
      if (Number.isNaN(d.getTime())) return { ok: false, error: 'publishedAt không hợp lệ' }
      data.publishedAt = d
    }
  }
  if (b.references !== undefined) {
    const r = readReferences(b.references)
    if (!r.ok) return { ok: false, error: r.error }
    data.references = r.refs
  }
  if (b.coverImageUrl !== undefined) {
    const c = b.coverImageUrl === null ? null : String(b.coverImageUrl).trim()
    if (c && !isHttpUrl(c)) return { ok: false, error: 'coverImageUrl phải là http/https' }
    data.coverImageUrl = c === '' ? null : c
  }
  if (b.metaDescription !== undefined) {
    const m = b.metaDescription === null ? null : String(b.metaDescription).trim().slice(0, 320)
    data.metaDescription = m === '' ? null : m
  }

  return { ok: true, data }
}

// Thẻ bài cho trang soạn của tác giả. KHÁC authorCard/đường đọc công khai: mang
// theo cả `published` và bài chưa công bố, vì chủ nhân cần thấy bản nháp của mình.
const authorPostCard = (p: Post) => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  contentMd: p.contentMd,
  tags: p.tags,
  published: p.published,
  status: effectiveStatus(p),
  reviewNote: p.reviewNote,
  categoryId: p.categoryId,
  pinned: Boolean(p.pinnedAt),
  publishedAt: p.publishedAt,
  references: p.references ?? [],
  coverImageUrl: p.coverImageUrl,
  metaDescription: p.metaDescription,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
})

const isModerator = (u: User): boolean => hasAtLeastRole(u.role, 'MODERATOR')

const POST_STATUSES = ['DRAFT', 'PENDING', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const
type PostStatusName = (typeof POST_STATUSES)[number]
const asStatus = (v: unknown): PostStatusName | null =>
  (POST_STATUSES as readonly string[]).includes(String(v)) ? (v as PostStatusName) : null

/**
 * Bộ lọc danh sách bài cho trang quản lý (DATA_TABLE.md): trạng thái, chuyên mục,
 * thẻ, tìm tiếng Việt BỎ DẤU trên cột chỉ mục đã chuẩn hoá lúc ghi.
 */
function postListFilter(q: Request['query']): Prisma.PostWhereInput {
  const where: Prisma.PostWhereInput = { deletedAt: null }
  const st = asStatus(qStr(q.status))
  if (st) where.status = st
  const cat = qStr(q.category)?.trim()
  if (cat) where.categoryId = cat
  const tag = qStr(q.tag)?.trim()
  if (tag) where.tags = { has: tag }
  const text = viNormalizeText(String(qStr(q.q) ?? '').slice(0, 200)).trim()
  if (text) {
    where.OR = [{ searchTitleNorm: { contains: text } }, { searchBodyNorm: { contains: text } }]
  }
  return where
}

/** Đếm theo trạng thái cho thẻ tổng quan /author và các tab lọc. */
async function statusCounts(base: Prisma.PostWhereInput): Promise<Record<PostStatusName, number>> {
  const rows = await prisma.post.groupBy({ by: ['status'], where: base, _count: { _all: true } })
  const out = Object.fromEntries(POST_STATUSES.map((s) => [s, 0])) as Record<PostStatusName, number>
  for (const r of rows) out[r.status as PostStatusName] = r._count._all
  return out
}

/**
 * Ghi MỘT lần chuyển trạng thái: cột status + published (qua statusFields) + nhật ký.
 * Một giao dịch: không bao giờ có bài đổi trạng thái mà nhật ký không có dòng.
 */
async function applyStatus(
  post: Post,
  to: PostStatusName,
  actorId: string,
  note: string | null,
  extra: Prisma.PostUpdateInput = {}
): Promise<Post> {
  const [saved] = await prisma.$transaction([
    prisma.post.update({ where: { id: post.id }, data: { ...statusFields(to), ...extra } }),
    prisma.postStatusEvent.create({
      data: { postId: post.id, from: post.status, to, actorId, note },
    }),
  ])
  return saved
}

/** Ghi một bản lịch sử nội dung (CHỈ-THÊM). */
const recordRevision = (postId: string, title: string, contentMd: string, editorId: string) =>
  prisma.postRevision.create({ data: { postId, title, contentMd, editorId } })

/**
 * Tương thích trang soạn cũ: thân request mang `published` (bool) thay vì gọi
 * /transition. Ánh xạ sang hành động đúng quyền - AUTHOR bật "công bố" là GỬI DUYỆT.
 */
function legacyPublishedAction(
  published: boolean,
  current: PostStatusName,
  moderator: boolean
): string | null {
  if (published) {
    if (current === 'DRAFT') return moderator ? 'publish' : 'submit'
    if (current === 'PENDING' && moderator) return 'approve'
    if (current === 'ARCHIVED') return 'restore'
    return null
  }
  if (current === 'PUBLISHED' || current === 'SCHEDULED') return 'archive'
  if (current === 'PENDING') return 'withdraw'
  return null
}

/** Bài còn sống của CHÍNH tác giả (gồm bản chưa công bố). Không lộ bài đã xoá. */
app.get(
  '/api/author/posts',
  largePageRateLimit({
    name: 'author/posts page_size lớn',
    identify: (req) => req.user?.preferred_username || req.user?.sub,
  }),
  asyncHandler(async (req, res) => {
    const me = await requireAuthor(req, res)
    if (!me) return
    const own: Prisma.PostWhereInput = { authorId: me.id, deletedAt: null }
    const where: Prisma.PostWhereInput = { ...postListFilter(req.query), authorId: me.id }
    const paging = parsePaging(req.query)
    const [total, posts, counts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: paging.skip,
        take: paging.take,
      }),
      statusCounts(own),
    ])
    res.json({ data: posts.map(authorPostCard), meta: pageMeta(total, paging), counts })
  })
)

app.post(
  '/api/author/posts',
  asyncHandler(async (req, res) => {
    const me = await requireVerifiedAuthor(req, res)
    if (!me) return
    const parsed = readPostBody(req.body, { partial: false })
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const data = parsed.data as Required<Pick<PostWritable, 'slug' | 'title' | 'contentMd'>> &
      PostWritable

    const clash = await prisma.post.findUnique({ where: { slug: data.slug } })
    if (clash) return res.status(409).json({ error: `slug "${data.slug}" đã tồn tại` })

    // P2: trạng thái lúc tạo. `status` mới; `published` (trang soạn cũ) ánh xạ:
    // true ⇒ MODERATOR đăng thẳng / AUTHOR gửi duyệt; false hoặc bỏ trống ⇒ DRAFT.
    const moderator = isModerator(me)
    const requested =
      req.body?.status ??
      (data.published === true ? (moderator ? 'PUBLISHED' : 'PENDING') : undefined)
    const publishedAt = data.publishedAt ?? new Date()
    const init = initialStatus(requested, moderator, publishedAt)
    if (!init.ok) return res.status(400).json({ error: init.error })
    const categoryId = await readCategoryId(req.body?.categoryId)
    if (categoryId === false) return res.status(400).json({ error: 'categoryId không tồn tại' })

    // Cột chỉ mục tìm kiếm tính SẴN lúc ghi (SEARCH_AND_FILTER §4). Một nguồn.
    const search = buildPostSearch({
      title: data.title,
      excerpt: data.excerpt ?? null,
      contentMd: data.contentMd,
    })
    const post = await prisma.post.create({
      // Tác giả bị GHIM theo phiên; authoredByAgentId null = do người viết.
      data: {
        slug: data.slug,
        title: data.title,
        contentMd: data.contentMd,
        excerpt: data.excerpt ?? null,
        tags: data.tags ?? [],
        ...statusFields(init.status),
        ...(categoryId ? { categoryId } : {}),
        // Không khai ⇒ ngày hiển thị = lúc tạo; khai tương lai = lên lịch khi được duyệt.
        publishedAt,
        references: (data.references ?? []) as unknown as Prisma.InputJsonValue,
        coverImageUrl: data.coverImageUrl ?? null,
        metaDescription: data.metaDescription ?? null,
        ...search,
        authorId: me.id,
        authoredByAgentId: null,
      },
    })
    await prisma.$transaction([
      prisma.postRevision.create({
        data: { postId: post.id, title: post.title, contentMd: post.contentMd, editorId: me.id },
      }),
      prisma.postStatusEvent.create({
        data: { postId: post.id, from: null, to: init.status, actorId: me.id, note: 'tạo bài' },
      }),
    ])
    res.status(201).json(authorPostCard(post))
  })
)

/**
 * Tìm một bài mà `me` được phép sửa: đúng slug, đúng tác giá, chưa xoá. Trả 404
 * cho MỌI trường hợp khác (không có / của người khác / đã xoá) - không tiết lộ
 * bài của tác giả khác có tồn tại hay không.
 */
async function findOwnPost(slug: string | undefined, meId: string): Promise<Post | null> {
  if (!slug) return null
  const post = await prisma.post.findUnique({ where: { slug } })
  if (!post || post.authorId !== meId || post.deletedAt) return null
  return post
}

app.get(
  '/api/author/posts/:slug',
  asyncHandler(async (req, res) => {
    const me = await requireAuthor(req, res)
    if (!me) return
    const post = await findOwnPost(req.params.slug, me.id)
    if (!post) return res.status(404).json({ error: 'Không tìm thấy bài của bạn' })
    res.json(authorPostCard(post))
  })
)

app.patch(
  '/api/author/posts/:slug',
  asyncHandler(async (req, res) => {
    const me = await requireVerifiedAuthor(req, res)
    if (!me) return
    const current = await findOwnPost(req.params.slug, me.id)
    if (!current) return res.status(404).json({ error: 'Không tìm thấy bài của bạn' })

    const parsed = readPostBody(req.body, { partial: true })
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const data = parsed.data

    if (data.slug && data.slug !== current.slug) {
      const clash = await prisma.post.findUnique({ where: { slug: data.slug } })
      if (clash) return res.status(409).json({ error: `slug "${data.slug}" đã tồn tại` })
    }

    const moderator = isModerator(me)
    const categoryId =
      req.body?.categoryId !== undefined ? await readCategoryId(req.body.categoryId) : undefined
    if (categoryId === false) return res.status(400).json({ error: 'categoryId không tồn tại' })

    // `published` KHÔNG còn ghi thẳng (cột suy ra) - ánh xạ sang chuyển trạng thái.
    const { references, published, ...rest } = data
    const contentChanged =
      (data.title !== undefined && data.title !== current.title) ||
      (data.contentMd !== undefined && data.contentMd !== current.contentMd)

    // Tính lại chỉ mục từ giá trị SAU khi trộn (patch có thể chỉ đổi một phần).
    const search = buildPostSearch({
      title: data.title ?? current.title,
      excerpt: data.excerpt !== undefined ? data.excerpt : current.excerpt,
      contentMd: data.contentMd ?? current.contentMd,
    })
    let post = await prisma.post.update({
      where: { id: current.id },
      data: {
        ...rest,
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(references !== undefined
          ? { references: references as unknown as Prisma.InputJsonValue }
          : {}),
        ...search,
      },
    })
    if (contentChanged) {
      await recordRevision(post.id, post.title, post.contentMd, me.id)
      // Tác giả sửa bài đang công khai ⇒ gỡ chờ duyệt lại (postWorkflow.editedStatus).
      const next = editedStatus(current.status, moderator)
      if (next !== current.status) {
        post = await applyStatus(post, next, me.id, 'sửa nội dung bài đã đăng - chờ duyệt lại')
      }
    }
    if (published !== undefined) {
      const action = legacyPublishedAction(published, effectiveStatus(post), moderator)
      if (action) {
        const t = transition({
          action,
          from: post.status,
          moderator,
          owner: true,
          publishedAt: post.publishedAt,
        })
        if (t.ok) post = await applyStatus(post, t.to, me.id, null)
      }
    }
    res.json(authorPostCard(post))
  })
)

/** XOÁ MỀM, khớp khuôn của Toà soạn (xoá cứng bị trigger Postgres chặn). */
app.delete(
  '/api/author/posts/:slug',
  asyncHandler(async (req, res) => {
    const me = await requireVerifiedAuthor(req, res)
    if (!me) return
    const current = await findOwnPost(req.params.slug, me.id)
    if (!current) return res.status(404).json({ error: 'Không tìm thấy bài của bạn' })
    await prisma.post.update({ where: { id: current.id }, data: { deletedAt: new Date() } })
    res.json({ ok: true, softDeleted: true })
  })
)

/**
 * Chuyên mục gửi lên: chuỗi rỗng/null ⇒ bỏ chuyên mục (null); id lạ ⇒ false
 * (người gọi trả 400); undefined ⇒ không khai.
 */
async function readCategoryId(raw: unknown): Promise<string | null | false | undefined> {
  if (raw === undefined) return undefined
  if (raw === null || raw === '') return null
  const id = String(raw).slice(0, 60)
  const found = await prisma.category.findUnique({ where: { id }, select: { id: true } })
  return found ? found.id : false
}

/** Chuyên mục cho trang soạn - cùng dữ liệu với /api/posts/categories, qua proxy author/*. */
app.get(
  '/api/author/categories',
  asyncHandler(async (req, res) => {
    if (!(await requireAuthor(req, res))) return
    const rows = await prisma.category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] })
    res.json(rows.map((c) => ({ id: c.id, slug: c.slug, name: c.name, position: c.position })))
  })
)

/** P2.2: chuyển trạng thái bài CỦA CHÍNH MÌNH (gửi duyệt, rút, lưu trữ, khôi phục). */
app.post(
  '/api/author/posts/:slug/transition',
  asyncHandler(async (req, res) => {
    const me = await requireVerifiedAuthor(req, res)
    if (!me) return
    const current = await findOwnPost(req.params.slug, me.id)
    if (!current) return res.status(404).json({ error: 'Không tìm thấy bài của bạn' })
    const t = transition({
      action: String(req.body?.action ?? ''),
      from: effectiveStatus(current),
      moderator: isModerator(me),
      owner: true,
      publishedAt: current.publishedAt,
      note: req.body?.note,
    })
    if (!t.ok) return res.status(t.status).json({ error: t.error })
    const post = await applyStatus(current, t.to, me.id, t.note, { reviewNote: null })
    res.json(authorPostCard(post))
  })
)

/** P2.2: lịch sử nội dung của bài (mới nhất trước), không kèm thân để danh sách nhẹ. */
app.get(
  '/api/author/posts/:slug/revisions',
  asyncHandler(async (req, res) => {
    const me = await requireAuthor(req, res)
    if (!me) return
    const post = await findOwnPost(req.params.slug, me.id)
    if (!post) return res.status(404).json({ error: 'Không tìm thấy bài của bạn' })
    const paging = parsePaging(req.query)
    const where = { postId: post.id }
    const [total, rows] = await Promise.all([
      prisma.postRevision.count({ where }),
      prisma.postRevision.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: paging.skip,
        take: paging.take,
        select: { id: true, title: true, editorId: true, createdAt: true, contentMd: true },
      }),
    ])
    res.json({
      data: rows.map((r) => ({ ...r, contentMd: undefined, length: r.contentMd.length })),
      meta: pageMeta(total, paging),
    })
  })
)

/** Một bản lịch sử đầy đủ - để so sánh với bản hiện tại ở trang. */
app.get(
  '/api/author/posts/:slug/revisions/:id',
  asyncHandler(async (req, res) => {
    const me = await requireAuthor(req, res)
    if (!me) return
    const post = await findOwnPost(req.params.slug, me.id)
    if (!post) return res.status(404).json({ error: 'Không tìm thấy bài của bạn' })
    const rev = await prisma.postRevision.findFirst({
      where: { id: String(req.params.id), postId: post.id },
    })
    if (!rev) return res.status(404).json({ error: 'Không có bản lịch sử này' })
    res.json(rev)
  })
)

/**
 * Khôi phục một bản lịch sử: chép tiêu đề + nội dung về bài, GHI THÊM một bản mới
 * (lịch sử chỉ-thêm - khôi phục cũng là một lần sửa), và theo đúng luật sửa bài
 * đã đăng (tác giả ⇒ chờ duyệt lại).
 */
app.post(
  '/api/author/posts/:slug/revisions/:id/restore',
  asyncHandler(async (req, res) => {
    const me = await requireVerifiedAuthor(req, res)
    if (!me) return
    const current = await findOwnPost(req.params.slug, me.id)
    if (!current) return res.status(404).json({ error: 'Không tìm thấy bài của bạn' })
    const rev = await prisma.postRevision.findFirst({
      where: { id: String(req.params.id), postId: current.id },
    })
    if (!rev) return res.status(404).json({ error: 'Không có bản lịch sử này' })
    const search = buildPostSearch({
      title: rev.title,
      excerpt: current.excerpt,
      contentMd: rev.contentMd,
    })
    let post = await prisma.post.update({
      where: { id: current.id },
      data: { title: rev.title, contentMd: rev.contentMd, ...search },
    })
    await recordRevision(post.id, post.title, post.contentMd, me.id)
    const next = editedStatus(current.status, isModerator(me))
    if (next !== current.status) {
      post = await applyStatus(post, next, me.id, `khôi phục bản ${rev.id} - chờ duyệt lại`)
    }
    res.json(authorPostCard(post))
  })
)

// ---------------- Soạn TÀI LIỆU cho AUTHOR ----------------
//
// Trước bề mặt này, đường ghi Doc DUY NHẤT ở production là dispatcher của Toà soạn
// Agent AI. Gỡ Toà soạn mà không có nó thì /docs đóng băng vĩnh viễn (kế hoạch
// Q4/2026 §8.3). Khuôn y hệt /api/author/posts: gác requireAuthor (đọc) và
// requireVerifiedAuthor (ghi), tự gọi trong handler, không dựa middleware.
//
// KHÁC Post ở một điểm có chủ đích: Doc không có cột tác giả - tài liệu là của
// SITE (hướng dẫn cài đặt, nhật ký thay đổi), không của một người. Nên mọi AUTHOR
// trở lên sửa được mọi tài liệu còn sống. Muốn khoá theo người thì phải thêm cột
// qua data-schema, đừng giả lập bằng authoredByAgentId.

type DocWritable = {
  slug?: string
  title?: string
  contentMd?: string
  category?: string
  position?: number
}
type DocBodyResult = { ok: true; data: DocWritable } | { ok: false; error: string }

const DOC_CATEGORY_MAX = 60

function readDocBody(body: unknown, { partial }: { partial: boolean }): DocBodyResult {
  const b = (body ?? {}) as Record<string, unknown>
  const data: DocWritable = {}

  if (!partial || b.title !== undefined) {
    const title = String(b.title ?? '').trim()
    if (!title) return { ok: false, error: 'Thiếu title' }
    if (title.length > 200) return { ok: false, error: 'title tối đa 200 ký tự' }
    data.title = title
  }
  if (!partial || b.contentMd !== undefined) {
    const contentMd = String(b.contentMd ?? '')
    if (!contentMd.trim()) return { ok: false, error: 'Thiếu contentMd' }
    data.contentMd = contentMd
  }
  if (b.slug !== undefined && String(b.slug).trim() !== '') {
    const slug = String(b.slug).trim().toLowerCase()
    if (!SLUG_RE.test(slug))
      return {
        ok: false,
        error: 'slug phải là chữ thường, số và dấu gạch nối (ví dụ: huong-dan-cai-dat)',
      }
    data.slug = slug
  } else if (!partial) {
    const derived = slugify(data.title || '')
    if (!SLUG_RE.test(derived))
      return { ok: false, error: 'Không suy được slug từ title; hãy nhập slug' }
    data.slug = derived
  }
  if (b.category !== undefined) {
    const category = String(b.category ?? '').trim()
    if (!category) return { ok: false, error: 'category không được rỗng' }
    if (category.length > DOC_CATEGORY_MAX)
      return { ok: false, error: `category tối đa ${DOC_CATEGORY_MAX} ký tự` }
    data.category = category
  }
  if (b.position !== undefined && b.position !== null && b.position !== '') {
    const position = Number(b.position)
    if (!Number.isInteger(position) || position < 0 || position > 100000)
      return { ok: false, error: 'position phải là số nguyên 0-100000' }
    data.position = position
  }
  return { ok: true, data }
}

const authorDocCard = (d: Doc) => ({
  id: d.id,
  slug: d.slug,
  title: d.title,
  contentMd: d.contentMd,
  category: d.category,
  position: d.position,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
})

/** Tài liệu còn sống theo slug. 404 cho cả "không có" lẫn "đã xoá mềm". */
async function findLiveDoc(slug: string | undefined): Promise<Doc | null> {
  if (!slug) return null
  const doc = await prisma.doc.findUnique({ where: { slug } })
  if (!doc || doc.deletedAt) return null
  return doc
}

app.get(
  '/api/author/docs',
  largePageRateLimit({
    name: 'author/docs page_size lớn',
    identify: (req) => req.user?.preferred_username || req.user?.sub,
  }),
  asyncHandler(async (req, res) => {
    const me = await requireAuthor(req, res)
    if (!me) return
    const where = { deletedAt: null }
    const paging = parsePaging(req.query)
    const [total, docs] = await Promise.all([
      prisma.doc.count({ where }),
      prisma.doc.findMany({
        where,
        orderBy: [{ category: 'asc' }, { position: 'asc' }],
        skip: paging.skip,
        take: paging.take,
      }),
    ])
    res.json({ data: docs.map(authorDocCard), meta: pageMeta(total, paging) })
  })
)

app.post(
  '/api/author/docs',
  asyncHandler(async (req, res) => {
    const me = await requireVerifiedAuthor(req, res)
    if (!me) return
    const parsed = readDocBody(req.body, { partial: false })
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const data = parsed.data as Required<Pick<DocWritable, 'slug' | 'title' | 'contentMd'>> &
      DocWritable

    // Slug là @unique trên CẢ bản đã xoá mềm - trùng với bản đã xoá vẫn là 409.
    const clash = await prisma.doc.findUnique({ where: { slug: data.slug } })
    if (clash) return res.status(409).json({ error: `slug "${data.slug}" đã tồn tại` })

    const category = data.category ?? 'general'
    let position = data.position
    if (position === undefined) {
      const last = await prisma.doc.findFirst({
        where: { category, deletedAt: null },
        orderBy: { position: 'desc' },
        select: { position: true },
      })
      position = (last?.position ?? 0) + 1
    }
    const doc = await prisma.doc.create({
      data: {
        slug: data.slug,
        title: data.title,
        contentMd: data.contentMd,
        category,
        position,
        authoredByAgentId: null,
        // Chỉ mục tìm kiếm tính CÙNG lượt ghi - bỏ sót thì đọc được mà không tìm thấy.
        ...buildDocSearch({ title: data.title, contentMd: data.contentMd }),
      },
    })
    res.status(201).json(authorDocCard(doc))
  })
)

app.get(
  '/api/author/docs/:slug',
  asyncHandler(async (req, res) => {
    const me = await requireAuthor(req, res)
    if (!me) return
    const doc = await findLiveDoc(req.params.slug)
    if (!doc) return res.status(404).json({ error: 'Không tìm thấy tài liệu' })
    res.json(authorDocCard(doc))
  })
)

app.patch(
  '/api/author/docs/:slug',
  asyncHandler(async (req, res) => {
    const me = await requireVerifiedAuthor(req, res)
    if (!me) return
    const current = await findLiveDoc(req.params.slug)
    if (!current) return res.status(404).json({ error: 'Không tìm thấy tài liệu' })

    const parsed = readDocBody(req.body, { partial: true })
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const data = parsed.data

    if (data.slug && data.slug !== current.slug) {
      const clash = await prisma.doc.findUnique({ where: { slug: data.slug } })
      if (clash) return res.status(409).json({ error: `slug "${data.slug}" đã tồn tại` })
    }

    const doc = await prisma.doc.update({
      where: { id: current.id },
      data: {
        ...data,
        ...buildDocSearch({
          title: data.title ?? current.title,
          contentMd: data.contentMd ?? current.contentMd,
        }),
      },
    })
    res.json(authorDocCard(doc))
  })
)

/** XOÁ MỀM - xoá cứng bị trigger Postgres chặn, như Post. */
app.delete(
  '/api/author/docs/:slug',
  asyncHandler(async (req, res) => {
    const me = await requireVerifiedAuthor(req, res)
    if (!me) return
    const current = await findLiveDoc(req.params.slug)
    if (!current) return res.status(404).json({ error: 'Không tìm thấy tài liệu' })
    await prisma.doc.update({ where: { id: current.id }, data: { deletedAt: new Date() } })
    res.json({ ok: true, softDeleted: true })
  })
)

// Cò nổ có chủ đích để kiểm thử đường dây cảnh báo (TSD §6.3).
//
// Chặn ở production: endpoint này không cần đăng nhập, và mỗi lần gọi là một
// cảnh báo thật bắn về Telegram/email. Để mở thì bất kỳ ai cũng làm ngập kênh
// trực của đội - thứ khiến cảnh báo thật bị bỏ qua.
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG_BOOM === 'true') {
  app.get('/debug/boom', () => {
    throw new Error('Boom! Lỗi chủ động để kiểm thử cảnh báo.')
  })
}

// Express chỉ nhận diện đây là middleware xử lý lỗi khi hàm khai đủ 4 tham số;
// bỏ `next` cho hết lint thì toàn bộ xử lý lỗi im lặng ngừng hoạt động.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('[content] error', err instanceof Error ? err.stack || message : err)
  notify.alert({
    service: 'content-service',
    level: 'error',
    message,
    error: err,
    context: `${req.method} ${req.url}`,
  })
  // Ở production trả chuỗi chung: `err.message` hay mang theo đường dẫn tệp trên
  // máy chủ hoặc tên bảng - thứ giúp người dò tìm dựng bản đồ hệ thống. Chi tiết
  // đã được ghi đầy đủ vào log ở trên.
  if (res && !res.headersSent)
    res
      .status(500)
      .json({ error: process.env.NODE_ENV === 'production' ? 'internal error' : message })
}
// ---------------- Kiểm duyệt NỘI DUNG cho ADMIN ----------------
//
// Route của tác giả chỉ sửa/xoá được bài CỦA CHÍNH MÌNH (findOwnPost), nên nội
// dung do Toà soạn AI đã gỡ sinh ra (authoredByAgentId != null - ~50 tài liệu
// trùng lặp, sai chính tả trên production) không ai gỡ được qua giao diện. Hai
// route dưới đây là bề mặt duy nhất cho việc đó.
//
// Bất biến:
//  - CHỈ xoá MỀM / khôi phục - xoá cứng bị trigger Postgres chặn, và một thao tác
//    hàng loạt nhầm phải gỡ lại được bằng chính trang đó;
//  - MỖI bản ghi đổi trạng thái để lại một dòng TrustAuditLog (bảng nhật ký quản
//    trị dùng chung) - ai, lúc nào, làm gì với cái gì;
//  - trần MODERATION_BATCH_MAX slug một lượt: một request lạc không quét sạch kho.

const MODERATION_BATCH_MAX = 200
type ModerationKind = 'post' | 'doc'
const moderationKind = (v: unknown): ModerationKind | null =>
  v === 'post' || v === 'doc' ? v : null

// ---------------- Kiểm duyệt bài viết (P2.2) ----------------
//
// Hàng chờ duyệt và mọi thao tác của người kiểm duyệt lên bài BẤT KỲ. Tác giả tự
// thao tác bài của mình ở /api/author/posts/:slug/transition.

/** Danh sách bài mọi tác giả - mặc định hàng chờ duyệt (PENDING), cũ nhất trước. */
app.get(
  '/api/admin/posts',
  largePageRateLimit({
    name: 'admin/posts page_size lớn',
    identify: (req) => req.user?.preferred_username || req.user?.sub,
  }),
  asyncHandler(async (req, res) => {
    if (!(await requireModerator(req, res))) return
    const query = { ...req.query, status: req.query.status ?? 'PENDING' }
    const where = postListFilter(query)
    const paging = parsePaging(req.query)
    const [total, posts, counts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy: { updatedAt: where.status === 'PENDING' ? 'asc' : 'desc' },
        skip: paging.skip,
        take: paging.take,
        include: { author: true },
      }),
      statusCounts({ deletedAt: null }),
    ])
    res.json({
      data: posts.map((p) => ({ ...authorPostCard(p), author: authorCard(p.author) })),
      meta: pageMeta(total, paging),
      counts,
    })
  })
)

/** Duyệt / trả về (kèm lý do) / đăng / lưu trữ / khôi phục bài bất kỳ. */
app.post(
  '/api/admin/posts/:id/transition',
  asyncHandler(async (req, res) => {
    const me = await requireModerator(req, res)
    if (!me) return
    const current = await prisma.post.findFirst({
      where: { id: String(req.params.id), deletedAt: null },
    })
    if (!current) return res.status(404).json({ error: 'Không tìm thấy bài' })
    const action = String(req.body?.action ?? '')
    const t = transition({
      action,
      from: effectiveStatus(current),
      moderator: true,
      owner: current.authorId === me.id,
      publishedAt: current.publishedAt,
      note: req.body?.note,
    })
    if (!t.ok) return res.status(t.status).json({ error: t.error })
    // Lý do trả về hiện cho tác giả ở trang sửa bài; mọi hành động khác xoá nó.
    const post = await applyStatus(current, t.to, me.id, t.note, {
      reviewNote: action === 'reject' ? t.note : null,
    })
    res.json(authorPostCard(post))
  })
)

/** Ghim / bỏ ghim lên đầu /blog. Chỉ bài đang công khai mới ghim được. */
app.post(
  '/api/admin/posts/:id/pin',
  asyncHandler(async (req, res) => {
    const me = await requireModerator(req, res)
    if (!me) return
    const current = await prisma.post.findFirst({
      where: { id: String(req.params.id), deletedAt: null },
    })
    if (!current) return res.status(404).json({ error: 'Không tìm thấy bài' })
    const pin = Boolean(req.body?.pinned)
    if (pin && effectiveStatus(current) !== 'PUBLISHED') {
      return res.status(409).json({ error: 'Chỉ ghim được bài đang công khai' })
    }
    const post = await prisma.post.update({
      where: { id: current.id },
      data: { pinnedAt: pin ? new Date() : null },
    })
    res.json(authorPostCard(post))
  })
)

// Chuyên mục (P2.4): CRUD cho MODERATOR+. Xoá chuyên mục KHÔNG xoá bài - bài về
// "không chuyên mục" (onDelete: SetNull).
const readCategoryBody = (
  b: Record<string, unknown>
): { ok: true; slug: string; name: string; position: number } | { ok: false; error: string } => {
  const name = String(b.name ?? '')
    .trim()
    .slice(0, 80)
  if (!name) return { ok: false, error: 'Thiếu tên chuyên mục' }
  const slug =
    String(b.slug ?? '')
      .trim()
      .toLowerCase() || slugify(name)
  if (!SLUG_RE.test(slug)) return { ok: false, error: 'slug chuyên mục không hợp lệ' }
  const position = Number.isFinite(Number(b.position)) ? Math.trunc(Number(b.position)) : 0
  return { ok: true, slug, name, position }
}

app.post(
  '/api/admin/categories',
  asyncHandler(async (req, res) => {
    if (!(await requireModerator(req, res))) return
    const c = readCategoryBody((req.body ?? {}) as Record<string, unknown>)
    if (!c.ok) return res.status(400).json({ error: c.error })
    const clash = await prisma.category.findUnique({ where: { slug: c.slug } })
    if (clash) return res.status(409).json({ error: `slug "${c.slug}" đã tồn tại` })
    const row = await prisma.category.create({
      data: { slug: c.slug, name: c.name, position: c.position },
    })
    res.status(201).json(row)
  })
)

app.patch(
  '/api/admin/categories/:id',
  asyncHandler(async (req, res) => {
    if (!(await requireModerator(req, res))) return
    const cur = await prisma.category.findUnique({ where: { id: String(req.params.id) } })
    if (!cur) return res.status(404).json({ error: 'Không có chuyên mục này' })
    const c = readCategoryBody({ ...cur, ...((req.body ?? {}) as Record<string, unknown>) })
    if (!c.ok) return res.status(400).json({ error: c.error })
    if (c.slug !== cur.slug && (await prisma.category.findUnique({ where: { slug: c.slug } }))) {
      return res.status(409).json({ error: `slug "${c.slug}" đã tồn tại` })
    }
    const row = await prisma.category.update({
      where: { id: cur.id },
      data: { slug: c.slug, name: c.name, position: c.position },
    })
    res.json(row)
  })
)

app.delete(
  '/api/admin/categories/:id',
  asyncHandler(async (req, res) => {
    if (!(await requireModerator(req, res))) return
    const gone = await prisma.category.deleteMany({ where: { id: String(req.params.id) } })
    if (!gone.count) return res.status(404).json({ error: 'Không có chuyên mục này' })
    res.json({ ok: true })
  })
)

app.get(
  '/api/admin/content',
  asyncHandler(async (req, res) => {
    if (!(await requireAdmin(req, res))) return
    const kind = moderationKind(req.query.kind)
    if (!kind) return res.status(400).json({ error: 'kind phải là post hoặc doc' })
    const paging = parsePaging(req.query)
    const state = qStr(req.query.state) === 'deleted' ? 'deleted' : 'active'
    const origin = qStr(req.query.origin)
    const where = {
      deletedAt: state === 'deleted' ? { not: null } : null,
      ...(origin === 'agent'
        ? { authoredByAgentId: { not: null } }
        : origin === 'human'
          ? { authoredByAgentId: null }
          : {}),
    }
    const select = {
      id: true,
      slug: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      authoredByAgentId: true,
      contentMd: true,
    } as const
    const [total, rows] =
      kind === 'post'
        ? await Promise.all([
            prisma.post.count({ where }),
            prisma.post.findMany({
              where,
              select,
              orderBy: { createdAt: 'desc' },
              skip: paging.skip,
              take: paging.take,
            }),
          ])
        : await Promise.all([
            prisma.doc.count({ where }),
            prisma.doc.findMany({
              where,
              select,
              orderBy: { createdAt: 'desc' },
              skip: paging.skip,
              take: paging.take,
            }),
          ])
    res.json({
      // Không trả cả thân bài: trang kiểm duyệt chỉ cần độ dài để nhận ra bài
      // rỗng/quá ngắn, và trả thân 50 bài một lượt là trả băng thông vô ích.
      data: rows.map(({ contentMd, authoredByAgentId, ...r }) => ({
        ...r,
        origin: authoredByAgentId ? 'agent' : 'human',
        contentLength: contentMd.length,
      })),
      meta: pageMeta(total, paging),
    })
  })
)

app.post(
  '/api/admin/content/bulk',
  asyncHandler(async (req, res) => {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    const kind = moderationKind(req.body?.kind)
    const action = req.body?.action
    const slugs: unknown = req.body?.slugs
    if (!kind) return res.status(400).json({ error: 'kind phải là post hoặc doc' })
    if (action !== 'hide' && action !== 'restore')
      return res.status(400).json({ error: 'action phải là hide hoặc restore' })
    if (
      !Array.isArray(slugs) ||
      slugs.length === 0 ||
      slugs.length > MODERATION_BATCH_MAX ||
      !slugs.every((x) => typeof x === 'string' && SLUG_RE.test(x))
    ) {
      return res
        .status(400)
        .json({ error: `slugs phải là mảng 1-${MODERATION_BATCH_MAX} slug hợp lệ` })
    }
    const unique = [...new Set(slugs as string[])]
    // Chỉ chạm bản ghi ĐANG ở trạng thái ngược lại - ẩn lại thứ đã ẩn không đổi
    // deletedAt gốc (mốc đó là bằng chứng), và nhật ký không ghi thao tác ma.
    const where = {
      slug: { in: unique },
      deletedAt: action === 'hide' ? null : { not: null },
    }
    const data = { deletedAt: action === 'hide' ? new Date() : null }
    const select = { id: true, slug: true, title: true } as const
    const targets =
      kind === 'post'
        ? await prisma.post.findMany({ where, select })
        : await prisma.doc.findMany({ where, select })
    if (targets.length > 0) {
      const ids = targets.map((t) => t.id)
      await prisma.$transaction([
        kind === 'post'
          ? prisma.post.updateMany({ where: { id: { in: ids } }, data })
          : prisma.doc.updateMany({ where: { id: { in: ids } }, data }),
        prisma.trustAuditLog.createMany({
          data: targets.map((t) => ({
            actorId: admin.id,
            actorName: admin.displayName || admin.username,
            action: action === 'hide' ? 'CONTENT_HIDE' : 'CONTENT_RESTORE',
            targetType: kind === 'post' ? 'Post' : 'Doc',
            targetId: t.id,
            targetLabel: `${t.slug} - ${t.title}`.slice(0, 300),
          })),
        }),
      ])
    }
    res.json({
      ok: true,
      changed: targets.map((t) => t.slug),
      skipped: unique.filter((x) => !targets.some((t) => t.slug === x)),
    })
  })
)

app.use(errorHandler)

/** Chuẩn bị trước khi phục vụ. Chạy ở CẢ hai chế độ: tiến trình riêng và nhúng
 *  trong services/backend-bundle. content-service không có gì phải dựng sẵn -
 *  giữ hàm rỗng để ba service có cùng một hợp đồng khởi tạo. */
async function init() {}

async function startServer() {
  await init()
  // Express 5: lỗi listen đến qua callback - ném để tiến trình chết ồn ào.
  app.listen(Number(port), bindHost, (err?: Error) => {
    if (err) throw err
    console.log(`content-service listening on ${bindHost}:${port}`)
  })
}

// EMBEDDED=1 do services/backend-bundle đặt trước khi require file này: ở chế
// độ gộp chỉ tiến trình cha mở cổng, và chính nó gọi init(). Mở cổng riêng ở
// đây là tranh cổng với cha.
if (process.env.NODE_ENV !== 'test' && !process.env.EMBEDDED) startServer().catch(() => {})

export { app, startServer, init }
