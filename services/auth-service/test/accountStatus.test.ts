// LG3-a - trạng thái tài khoản cho app (tsudev-standards AUTH_AND_ACCOUNT 9.2, 10, 14.4.4).
// App hiện `suspended`/`restricted` theo đúng giá trị máy chủ trả - suy sai ở đây là app
// khoá nhầm người dùng hợp lệ, hoặc để lọt tài khoản đáng lẽ bị hạn chế.
export {}

const { accountStatus, VERIFY_GRACE_MS } = require('../src/accountStatus')

const now = new Date('2026-11-26T00:00:00Z')
const base = {
  createdAt: new Date('2026-11-01T00:00:00Z'),
  emailVerifiedAt: new Date('2026-11-01T01:00:00Z'),
  lockedUntil: null,
  deactivatedAt: null,
  deletionScheduledAt: null,
}

describe('accountStatus', () => {
  it('đã xác minh ⇒ active, không lý do', () => {
    expect(accountStatus(base, now)).toEqual({ status: 'active', status_reason: null })
  })
  it('chưa xác minh trong 7 ngày ⇒ active + account_unverified', () => {
    const u = {
      ...base,
      emailVerifiedAt: null,
      createdAt: new Date(now.getTime() - VERIFY_GRACE_MS),
    }
    expect(accountStatus(u, now)).toEqual({ status: 'active', status_reason: 'account_unverified' })
  })
  it('chưa xác minh quá 7 ngày ⇒ restricted + account_restricted', () => {
    const u = {
      ...base,
      emailVerifiedAt: null,
      createdAt: new Date(now.getTime() - VERIFY_GRACE_MS - 1),
    }
    expect(accountStatus(u, now)).toEqual({
      status: 'restricted',
      status_reason: 'account_restricted',
    })
  })
  it('khoá còn hạn ⇒ locked; khoá đã hết hạn ⇒ active', () => {
    expect(accountStatus({ ...base, lockedUntil: new Date(now.getTime() + 1) }, now).status).toBe(
      'locked'
    )
    expect(accountStatus({ ...base, lockedUntil: new Date(now.getTime() - 1) }, now).status).toBe(
      'active'
    )
  })
  it('hẹn xoá thắng mọi trạng thái khác', () => {
    const u = { ...base, deletionScheduledAt: now, lockedUntil: new Date(now.getTime() + 1) }
    expect(accountStatus(u, now)).toEqual({
      status: 'pending_deletion',
      status_reason: 'account_pending_deletion',
    })
  })
  it('vô hiệu hoá mềm ⇒ restricted + account_deactivated', () => {
    expect(accountStatus({ ...base, deactivatedAt: now }, now)).toEqual({
      status: 'restricted',
      status_reason: 'account_deactivated',
    })
  })
})
