// CI-02 (TDD v2.0 chương 21): helper DÙNG CHUNG cho test ma trận vai trò.
//
// Mỗi endpoint mới phải được kiểm với ĐỦ thang vai trò (khách → OWNER), không chỉ
// "người được phép" và "một người không được phép": lỗ hổng phân quyền hay nằm
// ở bậc giữa (VIP, MODERATOR) mà không ai nghĩ tới khi viết test tay.
//
// Danh tính đi đúng đường production: khẳng định có chữ ký của BFF, vai trò đọc
// từ `User.role` trong DB (claim chỉ tham khảo). Người dùng tạo ở đây có email
// đã xác minh + TOTP đã xác nhận để đo ĐÚNG cổng vai trò, không đo nhầm cổng
// email/2FA (hai cổng đó có test riêng).
import { prisma } from '@tsudev/db'
import { signIdentity } from '@tsudev/identity-token'

/** Thang vai trò đầy đủ (packages/types). `GUEST` = không gửi danh tính. */
export const ROLE_LADDER = [
  'GUEST',
  'MEMBER',
  'VIP',
  'AUTHOR',
  'MODERATOR',
  'ADMIN',
  'OWNER',
] as const
export type LadderRole = (typeof ROLE_LADDER)[number]

const TOTP_ON = { secretEnc: 'test', confirmedAt: new Date() }

export type MatrixUser = { role: LadderRole; username: string; id: string | null }

/** Tạo một người dùng cho mỗi bậc (trừ GUEST). `tag` phân biệt giữa các tệp test. */
export async function makeRoleUsers(tag: string): Promise<Record<LadderRole, MatrixUser>> {
  const out = {} as Record<LadderRole, MatrixUser>
  for (const role of ROLE_LADDER) {
    if (role === 'GUEST') {
      out[role] = { role, username: '', id: null }
      continue
    }
    const username = `rm-${tag}-${role.toLowerCase()}`
    const u = await prisma.user.upsert({
      where: { username },
      update: {
        role,
        emailVerifiedAt: new Date(),
        totp: { upsert: { create: TOTP_ON, update: TOTP_ON } },
      },
      create: {
        username,
        email: `${username}@tsudev.local`,
        displayName: username,
        role,
        emailVerifiedAt: new Date(),
        totp: { create: TOTP_ON },
      },
    })
    out[role] = { role, username, id: u.id }
  }
  return out
}

/** Header Authorization như BFF gửi; GUEST ⇒ không header nào. */
export async function authHeader(u: MatrixUser): Promise<Record<string, string>> {
  if (!u.id) return {}
  const token = await signIdentity(
    { sub: u.username },
    String(process.env.INTERNAL_IDENTITY_SECRET)
  )
  return { Authorization: `Bearer ${token}` }
}

/** Dọn: bài của các người dùng ma trận (đường xoá cứng duy nhất) rồi chính họ. */
export async function dropRoleUsers(users: Record<LadderRole, MatrixUser>): Promise<void> {
  const ids = Object.values(users)
    .map((u) => u.id)
    .filter((x): x is string => Boolean(x))
  if (ids.length) {
    await prisma.$transaction([
      prisma.$executeRawUnsafe(`SET LOCAL tsudev.allow_hard_delete = 'on'`),
      prisma.$executeRawUnsafe(`DELETE FROM "Post" WHERE "authorId" = ANY($1::text[])`, ids),
    ])
    await prisma.user.deleteMany({ where: { id: { in: ids } } })
  }
}

/** Mã mong đợi khi chỉ ngưỡng `min` trở lên được phép: khách 401, dưới ngưỡng 403. */
export function expectedStatus(role: LadderRole, min: LadderRole, allowed: number): number {
  if (role === 'GUEST') return 401
  return ROLE_LADDER.indexOf(role) >= ROLE_LADDER.indexOf(min) ? allowed : 403
}
