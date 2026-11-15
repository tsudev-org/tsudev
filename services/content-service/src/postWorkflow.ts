import type { PostStatus } from '@prisma/client'

/**
 * Máy trạng thái bài viết (P2.2, docs/de-xuat-bao-mat-cms-cai-bang-lenh.md).
 *
 *   DRAFT ──submit──▶ PENDING ──approve──▶ PUBLISHED | SCHEDULED
 *     ▲                 │  └──reject (kèm lý do)──▶ DRAFT
 *     │                 └──withdraw──▶ DRAFT
 *     └──restore── ARCHIVED ◀──archive── PUBLISHED | SCHEDULED
 *   DRAFT ──publish (MODERATOR+)──▶ PUBLISHED | SCHEDULED
 *
 * MỌI cạnh không có ở bảng dưới ⇒ 409 (route trả). Module thuần: không chạm DB,
 * test bằng bảng ví dụ (test/postWorkflow.test.ts).
 *
 * Quyết định (14/11/2026):
 *   - AUTHOR chỉ GỬI DUYỆT; MODERATOR+ duyệt, đăng thẳng, ghim, lưu trữ bài bất kỳ.
 *   - AUTHOR sửa TIÊU ĐỀ/NỘI DUNG của bài đã đăng ⇒ bài về PENDING (`editedStatus`).
 *     Không có bản nháp tách riêng cho bài đã đăng (D3: `contentMd` là nguồn sự thật
 *     duy nhất), nên chỉ có hai lựa chọn: sửa là lên luôn, hoặc gỡ chờ duyệt. Lên
 *     luôn là lỗ "được duyệt rồi tráo nội dung" - chọn gỡ chờ duyệt.
 *   - `published` (cột cũ) SUY RA từ trạng thái qua `statusFields` - chỗ DUY NHẤT ghi nó.
 */
export type Action =
  'submit' | 'withdraw' | 'approve' | 'reject' | 'publish' | 'archive' | 'restore'

export const ACTIONS: readonly Action[] = [
  'submit',
  'withdraw',
  'approve',
  'reject',
  'publish',
  'archive',
  'restore',
]

type Edge = { from: PostStatus[]; moderatorOnly: boolean; needsNote?: boolean }

const EDGES: Record<Action, Edge> = {
  submit: { from: ['DRAFT'], moderatorOnly: false },
  withdraw: { from: ['PENDING'], moderatorOnly: false },
  approve: { from: ['PENDING'], moderatorOnly: true },
  reject: { from: ['PENDING'], moderatorOnly: true, needsNote: true },
  publish: { from: ['DRAFT'], moderatorOnly: true },
  archive: { from: ['PUBLISHED', 'SCHEDULED'], moderatorOnly: false },
  restore: { from: ['ARCHIVED'], moderatorOnly: false },
}

export type TransitionInput = {
  action: string
  from: PostStatus
  /** Người gọi là MODERATOR trở lên. */
  moderator: boolean
  /** Người gọi là tác giả của bài. */
  owner: boolean
  /** Giờ đăng đã đặt (tương lai ⇒ SCHEDULED). */
  publishedAt: Date | null
  note?: string | null
  now?: Date
}

export type TransitionResult =
  | { ok: true; to: PostStatus; note: string | null }
  | { ok: false; status: 400 | 403 | 409; error: string }

export function transition(i: TransitionInput): TransitionResult {
  if (!(ACTIONS as readonly string[]).includes(i.action)) {
    return {
      ok: false,
      status: 400,
      error: `action không hợp lệ: ${String(i.action).slice(0, 40)}`,
    }
  }
  const action = i.action as Action
  const edge = EDGES[action]
  // Quyền TRƯỚC cạnh: người không đủ quyền không được biết bài đang ở trạng thái nào.
  if (edge.moderatorOnly && !i.moderator) {
    return { ok: false, status: 403, error: 'Thao tác này cần quyền kiểm duyệt (MODERATOR)' }
  }
  if (!edge.moderatorOnly && !i.owner && !i.moderator) {
    return { ok: false, status: 403, error: 'Chỉ tác giả hoặc người kiểm duyệt làm được' }
  }
  if (!edge.from.includes(i.from)) {
    return {
      ok: false,
      status: 409,
      error: `Không thể "${action}" bài đang ở trạng thái ${i.from}`,
    }
  }
  const note = (i.note ?? '').trim().slice(0, 1000) || null
  if (edge.needsNote && !note) {
    return { ok: false, status: 400, error: 'Trả bài về cần ghi lý do cho tác giả' }
  }
  return { ok: true, to: target(action, i.publishedAt, i.now ?? new Date()), note }
}

function target(action: Action, publishedAt: Date | null, now: Date): PostStatus {
  switch (action) {
    case 'submit':
      return 'PENDING'
    case 'approve':
    case 'publish':
      return publishedAt && publishedAt.getTime() > now.getTime() ? 'SCHEDULED' : 'PUBLISHED'
    case 'archive':
      return 'ARCHIVED'
    default:
      // withdraw, reject, restore
      return 'DRAFT'
  }
}

/** Trường ghi kèm một trạng thái - nơi DUY NHẤT đặt cột cũ `published`. */
export function statusFields(status: PostStatus): { status: PostStatus; published: boolean } {
  return { status, published: status === 'PUBLISHED' || status === 'SCHEDULED' }
}

/**
 * Trạng thái HIỂN THỊ: bài SCHEDULED đã tới giờ là PUBLISHED trên thực tế (đường đọc
 * công khai đã thấy nó). Không cần cron đổi cột - suy lúc đọc.
 */
export function effectiveStatus(
  p: { status: PostStatus; publishedAt: Date | null },
  now = new Date()
): PostStatus {
  if (p.status === 'SCHEDULED' && p.publishedAt && p.publishedAt.getTime() <= now.getTime()) {
    return 'PUBLISHED'
  }
  return p.status
}

/**
 * Trạng thái sau khi sửa TIÊU ĐỀ/NỘI DUNG: tác giả không phải người kiểm duyệt sửa
 * bài đang hiện công khai (hoặc đã hẹn) ⇒ PENDING. Người kiểm duyệt sửa thì giữ.
 */
export function editedStatus(current: PostStatus, moderator: boolean): PostStatus {
  if (moderator) return current
  return current === 'PUBLISHED' || current === 'SCHEDULED' ? 'PENDING' : current
}

/** Trạng thái lúc TẠO bài. AUTHOR: DRAFT hoặc PENDING. MODERATOR+: thêm đăng thẳng. */
export function initialStatus(
  requested: unknown,
  moderator: boolean,
  publishedAt: Date | null,
  now = new Date()
): { ok: true; status: PostStatus } | { ok: false; error: string } {
  const r = requested === undefined || requested === null || requested === '' ? 'DRAFT' : requested
  if (r === 'DRAFT' || r === 'PENDING') return { ok: true, status: r }
  if (r === 'PUBLISHED') {
    if (!moderator) return { ok: false, error: 'Tác giả gửi duyệt (PENDING), không đăng thẳng' }
    return { ok: true, status: target('publish', publishedAt, now) }
  }
  return { ok: false, error: 'status lúc tạo chỉ nhận DRAFT, PENDING hoặc PUBLISHED' }
}
