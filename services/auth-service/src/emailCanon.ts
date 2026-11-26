import { prisma } from '@tsudev/db'

/**
 * ACC1 (26/11/2026): email TRÙNG theo cách hộp thư hiểu, không chỉ theo chuỗi.
 *
 * Gmail bỏ qua dấu chấm và phần `+nhãn` ở phần trước `@`, và coi `googlemail.com` là
 * `gmail.com`. So chuỗi trần thì `a.b@gmail.com` và `ab@gmail.com` là hai email khác nhau,
 * nhưng thư của cả hai rơi vào CÙNG một hộp - nên một người có thể vô tình (hoặc cố ý)
 * mở tài khoản thứ hai trên cùng hộp thư, đúng chuyện đã xảy ra với `dev.nguyentrangtinhsu`.
 *
 * Không đổi cột `email` đã lưu (không migration): chỉ dùng khi KIỂM TRÙNG lúc tạo tài khoản
 * hoặc đổi email. Domain khác Gmail chỉ hạ chữ thường - nhà cung cấp khác không cam kết
 * quy tắc tương tự, gộp bừa là chặn nhầm người dùng thật.
 */
const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

export function canonicalEmail(email: string): string {
  const e = email.trim().toLowerCase()
  const at = e.lastIndexOf('@')
  if (at <= 0) return e
  const local = e.slice(0, at)
  const domain = e.slice(at + 1)
  if (!GMAIL_DOMAINS.has(domain)) return e
  const base = local.split('+')[0]!.replace(/\./g, '')
  return `${base}@gmail.com`
}

export function isGmail(email: string): boolean {
  const e = email.trim().toLowerCase()
  return GMAIL_DOMAINS.has(e.slice(e.lastIndexOf('@') + 1))
}

/**
 * id của tài khoản đang giữ `email` - khớp CHÍNH XÁC trước, rồi khớp theo dạng chuẩn
 * hoá Gmail. `exact` cho nơi gọi biết đó là cùng chuỗi hay chỉ cùng hộp thư.
 * Truy vấn thô được tham số hoá (tagged template), không ghép chuỗi.
 */
export async function findEmailOwnerId(
  email: string
): Promise<{ id: string; exact: boolean } | null> {
  const e = email.trim().toLowerCase()
  const hit = await prisma.user.findUnique({ where: { email: e }, select: { id: true } })
  if (hit) return { id: hit.id, exact: true }
  if (!isGmail(e)) return null
  const canon = canonicalEmail(e).split('@')[0]!
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User"
    WHERE lower(split_part(email, '@', 2)) IN ('gmail.com', 'googlemail.com')
      AND replace(split_part(split_part(lower(email), '@', 1), '+', 1), '.', '') = ${canon}
    LIMIT 1`
  return rows[0] ? { id: rows[0].id, exact: false } : null
}
