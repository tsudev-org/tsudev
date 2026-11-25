/**
 * Trạng thái tài khoản cho app (LG3-a, tsudev-standards AUTH_AND_ACCOUNT 9.2 + 14.4.4).
 *
 * App đọc `status` + `status_reason` từ userinfo (OIDC) và từ JWS quyền lợi; app KHÔNG tự
 * suy luận vi phạm ở máy khách. Hàm này là nguồn DUY NHẤT của phép suy ra - đọc từ các cột
 * sẵn có của `User`, không thêm cột.
 *
 * `suspended` (khoá do vi phạm, chỉ quản trị gỡ) CHƯA có cột trong DB: giá trị nằm trong
 * kiểu để hợp đồng ổn định, và sẽ được suy ra khi có cột riêng (cần migration).
 */

export const ACCOUNT_STATUSES = [
  'active',
  'restricted',
  'suspended',
  'locked',
  'pending_deletion',
  'deleted',
] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

/** Mã lý do máy đọc được (mục 10) - cùng bộ mã với thân `403`. */
export type StatusReason =
  | 'account_unverified'
  | 'account_restricted'
  | 'account_suspended'
  | 'account_locked'
  | 'account_deactivated'
  | 'account_pending_deletion'

/** Hạn xác minh email (mục 8.3): quá 7 ngày kể từ lúc tạo mà chưa xác minh ⇒ `restricted`. */
export const VERIFY_GRACE_MS = 7 * 24 * 60 * 60 * 1000

export type StatusInput = {
  createdAt: Date
  emailVerifiedAt: Date | null
  lockedUntil: Date | null
  deactivatedAt: Date | null
  deletionScheduledAt: Date | null
}

export type StatusResult = { status: AccountStatus; status_reason: StatusReason | null }

export function accountStatus(u: StatusInput, now: Date): StatusResult {
  if (u.deletionScheduledAt) {
    return { status: 'pending_deletion', status_reason: 'account_pending_deletion' }
  }
  // Vô hiệu hoá mềm do chính chủ: đăng nhập lại là khôi phục ⇒ gần nhất với `pending_deletion`
  // về hành vi app (không dùng được cho tới khi chủ tài khoản quay lại), nhưng giữ mã riêng.
  if (u.deactivatedAt) return { status: 'restricted', status_reason: 'account_deactivated' }
  if (u.lockedUntil && u.lockedUntil.getTime() > now.getTime()) {
    return { status: 'locked', status_reason: 'account_locked' }
  }
  if (!u.emailVerifiedAt) {
    return now.getTime() - u.createdAt.getTime() > VERIFY_GRACE_MS
      ? { status: 'restricted', status_reason: 'account_restricted' }
      : { status: 'active', status_reason: 'account_unverified' }
  }
  return { status: 'active', status_reason: null }
}

/** Cột cần đọc - dùng làm `select` của Prisma để không kéo `passwordHash`. */
export const STATUS_SELECT = {
  createdAt: true,
  emailVerifiedAt: true,
  lockedUntil: true,
  deactivatedAt: true,
  deletionScheduledAt: true,
} as const
