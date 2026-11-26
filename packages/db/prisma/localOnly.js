'use strict'
// Chốt "chỉ DB cục bộ" cho script ghi dữ liệu dựng sẵn (seed). Tách từ
// services/auth-service/scripts/seed-dev-users.js (ACC1, 26/11/2026).
//
// Vì sao cần CẢ HAI chốt: lệnh deploy và `db:migrate` lên Neon chạy từ máy dev,
// nơi NODE_ENV thường KHÔNG được đặt - chỉ cần DATABASE_URL đang trỏ production
// là một lần `npm run db:seed` gõ nhầm sẽ tạo tài khoản dev và đặt lại OWNER thật.
// Không có cờ vượt: seed production KHÔNG phải một việc hợp lệ.
const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/** Ném Error nếu môi trường không phải DB cục bộ (dev :5433, CI :5432). */
function assertLocalDatabase(name, env = process.env) {
  if (env.NODE_ENV === 'production') {
    throw new Error(`[${name}] TỪ CHỐI chạy ở production (NODE_ENV=production).`)
  }
  let host
  try {
    host = new URL(env.DATABASE_URL || '').hostname
  } catch {
    host = ''
  }
  if (!LOCAL_DB_HOSTS.has(host)) {
    throw new Error(
      `[${name}] TỪ CHỐI chạy: DATABASE_URL trỏ host "${host || '(không đọc được)'}", ` +
        'không phải localhost/127.0.0.1/::1 - chỉ được chạy trên DB local hoặc DB của CI.'
    )
  }
}

module.exports = { assertLocalDatabase, LOCAL_DB_HOSTS }
