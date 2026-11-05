/**
 * Nhận diện lỗi "quản trị viên chưa bật 2FA" do backend trả về.
 *
 * `requireAdmin` (content-service) và `requireOwner` (auth-service) trả 403
 * `{ error, code: 'MFA_REQUIRED' }` khi tài khoản ADMIN/OWNER chưa có TOTP đã
 * xác nhận hay passkey nào. Hằng gốc sống ở `@tsudev/auth`, nhưng package đó kéo
 * Prisma nên KHÔNG nạp được trên Cloudflare Workers - vì thế khai lại ở đây
 * dưới dạng chuỗi. Đổi giá trị ở một bên mà quên bên kia thì giao diện quay về
 * thông báo "không có quyền" chung chung; `test/mfa.test.ts` đối chiếu hai nơi.
 *
 * Nhận diện theo `code`, KHÔNG theo chuỗi `error`: chuỗi là văn bản cho người
 * đọc và được phép đổi câu chữ bất cứ lúc nào.
 */
export const MFA_REQUIRED = 'MFA_REQUIRED';

/** Đường dẫn TƯƠNG ĐỐI tới trang bật 2FA - tsudev chỉ có một origin. */
export const MFA_SETUP_PATH = '/settings/security';

export function isMfaRequired(status: number, body: unknown): boolean {
  return (
    status === 403 &&
    typeof body === 'object' &&
    body !== null &&
    (body as { code?: unknown }).code === MFA_REQUIRED
  );
}

/**
 * Lỗi ném ra từ các hàm gọi API kiểu "ném khi hỏng" để nơi bắt phân biệt được
 * "chưa bật 2FA" với lỗi thường mà không phải so chuỗi thông điệp.
 */
export class MfaRequiredError extends Error {
  readonly code = MFA_REQUIRED;
  constructor(message = 'Tài khoản quản trị cần bật xác thực hai lớp (2FA).') {
    super(message);
    this.name = 'MfaRequiredError';
  }
}
