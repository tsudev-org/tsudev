#!/usr/bin/env node
'use strict'
/**
 * Đặt mật khẩu cho ba tài khoản dev, và TOTP đã xác nhận cho tài khoản quản trị.
 *
 *   node services/auth-service/scripts/seed-dev-users.js
 *
 * CỐ Ý TÁCH KHỎI packages/db/prisma/seed.js: seed chính thức chỉ chứa dữ
 * liệu tham chiếu - thứ mà MỌI môi trường, kể cả production, đều cần. Mật khẩu
 * đã biết trước thì ngược lại: đó chính xác là loại dữ liệu không bao giờ được
 * mọc lên ở production.
 *
 * Thay cho cờ bỏ qua xác thực + `devpass`, thứ cho phép đăng nhập bằng BẤT
 * KỲ username nào và chỉ được gác sau một biến môi trường. Ngày 16/08/2026 bản
 * production đã từng mang theo cờ đó. Ở đây mật khẩu là hash Argon2id thật
 * trong DB, đi qua đúng đường mà người dùng thật đi.
 */

require('dotenv').config()
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
}

// CHẶN CỨNG, không phải cảnh báo. Nếu script này chạy nhầm ở production thì ba
// tài khoản - trong đó có một ADMIN - sẽ có mật khẩu nằm công khai trong repo.
if (process.env.NODE_ENV === 'production') {
  console.error(
    '[seed-dev-users] TỪ CHỐI chạy ở production: script này đặt mật khẩu đã biết trước.'
  )
  process.exit(1)
}

// CHỐT THỨ HAI: chỉ ghi vào DB nằm trên chính máy này (dev :5433, CI :5432).
// Chốt NODE_ENV ở trên không đủ: lệnh deploy và `db:migrate` lên Neon chạy từ
// máy dev, nơi NODE_ENV thường KHÔNG được đặt - chỉ cần DATABASE_URL đang trỏ
// production là script này sẽ gắn mật khẩu VÀ bí mật TOTP công khai vào tài
// khoản OWNER thật. Từ chối mọi host không phải loopback, không có cờ vượt.
const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
{
  let host
  try {
    host = new URL(process.env.DATABASE_URL || '').hostname
  } catch {
    host = ''
  }
  if (!LOCAL_DB_HOSTS.has(host)) {
    console.error(
      `[seed-dev-users] TỪ CHỐI chạy: DATABASE_URL trỏ host "${host || '(không đọc được)'}", ` +
        'không phải localhost/127.0.0.1/::1. Script này đặt mật khẩu và bí mật TOTP đã biết trước - ' +
        'chỉ được chạy trên DB local hoặc DB của CI.'
    )
    process.exit(1)
  }
}

const { prisma } = require('@tsudev/db')
const { hashPassword } = require('../dist/password')
const { encryptSecret } = require('../dist/totp')

// Mật khẩu dev, giống nhau cho cả ba. Dài hơn MIN_PASSWORD_LEN vì nó đi qua
// đúng chính sách mà người dùng thật phải qua - không có đường vòng nào.
const DEV_PASSWORD = process.env.DEV_SEED_PASSWORD || 'tsudev-dev-2026!'

// Bí mật TOTP (base32) CHỈ DÀNH CHO DEV/CI - công khai trong repo, cố ý viết
// thành chữ đọc được để không ai nhầm nó là bí mật thật. Cổng quản trị ép 2FA
// (G6) nên tài khoản dev từ ADMIN trở lên phải có TOTP ĐÃ XÁC NHẬN, giống
// production (OWNER đã bật 2FA). Lấy mã: `oathtool --totp -b <bí mật>` hoặc thêm
// vào app authenticator.
const DEV_TOTP_SECRET = process.env.DEV_SEED_TOTP_SECRET || 'TSUDEVDEVONLYTOTPTSUDEVDEVONLY22'

// Vai trò nhận TOTP: mọi bậc mà cổng đòi 2FA - từ 14/11/2026 (P1.2) gồm cả AUTHOR,
// vì đường GHI bài của tác giả cũng đòi TOTP. alice (MEMBER) vẫn không có.
const TOTP_ROLES = new Set(['AUTHOR', 'MODERATOR', 'ADMIN', 'OWNER'])

const USERS = [
  // OWNER, KHÔNG phải ADMIN: packages/db/prisma/seed.js đặt tsudev là OWNER và
  // script này chạy SAU nó - ghi ADMIN ở đây từng hạ tsudev xuống ADMIN ở mọi
  // DB dev/CI, lệch với production (OWNER chỉ tsudev giữ, cấp bằng seed).
  { username: 'tsudev', role: 'OWNER' },
  { username: 'alice', role: 'MEMBER' },
  // bob là AUTHOR (trước 04/11/2026 là VIP - vé vào Con dấu, nay đã gỡ):
  // tài khoản dev để thử đường đăng bài/tài liệu mà không cần quyền ADMIN.
  { username: 'bob', role: 'AUTHOR' },
]

async function main() {
  if ((process.env.TOTP_ENCRYPTION_KEY || '').length < 32) {
    throw new Error(
      '[seed-dev-users] Thiếu TOTP_ENCRYPTION_KEY (tối thiểu 32 ký tự): cần nó để mã hoá bí mật ' +
        'TOTP của tài khoản dev quản trị. Dev: chép từ .env.example; CI: đặt trong env của job. ' +
        'Phải TRÙNG với khoá auth-service dùng, nếu không đăng nhập báo totp_invalid.'
    )
  }
  if (!/^[A-Z2-7]{16,}$/.test(DEV_TOTP_SECRET)) {
    throw new Error(
      '[seed-dev-users] DEV_SEED_TOTP_SECRET phải là base32 (A-Z, 2-7), tối thiểu 16 ký tự.'
    )
  }
  const passwordHash = await hashPassword(DEV_PASSWORD)
  const totpUsers = []
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      // Email đã xác minh sẵn: luồng xác minh cần gửi thư thật, và dev không
      // có RESEND_API_KEY. Đây là điều DUY NHẤT script này bỏ qua.
      //
      // `role` PHẢI có mặt ở nhánh update, không chỉ ở create.
      //
      // Thiếu nó thì mọi thứ nâng vai trò giữa chừng đều VĨNH VIỄN, và bộ e2e
      // tự bắn vào chân mình: một spec nâng vai trò ở lượt đầu thì lượt chạy THỨ
      // HAI trên cùng một DB luôn đỏ, ở một bước KHÔNG liên quan. Đã mất một
      // vòng chạy vì chuyện này ở phiên 7 (invite.spec.js, nay đã gỡ).
      //
      // Đây là seed DEV: ba tài khoản này phải trở về đúng bậc ban đầu ở mỗi
      // lượt chạy, đó mới là "trạng thái đã biết" mà test dựa vào.
      update: {
        passwordHash,
        role: u.role,
        emailVerifiedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        username: u.username,
        email: `${u.username}@tsudev.local`,
        displayName: u.username,
        role: u.role,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    })
    if (TOTP_ROLES.has(u.role)) {
      // Mã hoá lại mỗi lượt (IV mới) - cùng hàm auth-service dùng, không chép
      // thuật toán. confirmedAt đặt ngay: đây là trạng thái "đã bật 2FA".
      const secretEnc = encryptSecret(DEV_TOTP_SECRET)
      await prisma.totpCredential.upsert({
        where: { userId: user.id },
        update: { secretEnc, confirmedAt: new Date() },
        create: { userId: user.id, secretEnc, confirmedAt: new Date() },
      })
      totpUsers.push(u.username)
    } else {
      // Trạng thái đã biết: tài khoản dưới ADMIN KHÔNG có TOTP, kể cả khi một
      // lượt thử tay trước đó đã bật - nếu không, đăng nhập của nó đòi mã.
      await prisma.totpCredential.deleteMany({ where: { userId: user.id } })
    }
  }
  // Tài khoản rác do e2e tạo ra: xoá để lần chạy sau bắt đầu từ cùng một chỗ.
  // Chỉ nhận diện theo tiền tố cố định của bộ test, không quét rộng hơn.
  const { count } = await prisma.user.deleteMany({ where: { username: { startsWith: 'e2e-' } } })

  console.log(`Đặt mật khẩu dev cho: ${USERS.map((u) => `${u.username} (${u.role})`).join(', ')}`)
  if (count) console.log(`Đã xoá ${count} tài khoản e2e-* tồn đọng.`)
  console.log(`Mật khẩu: ${DEV_PASSWORD}`)
  console.log(`TOTP đã xác nhận cho: ${totpUsers.join(', ')} - bí mật dev: ${DEV_TOTP_SECRET}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
