/**
 * Nhận diện lỗi "quản trị viên chưa bật 2FA" do backend trả về.
 *
 * `requireAdmin` (content-service) và `requireOwner` (auth-service) trả 403
 * `{ error, code: 'MFA_REQUIRED' }` khi tài khoản ADMIN/OWNER chưa có TOTP đã
 * xác nhận. Hằng gốc sống ở `@tsudev/auth`, nhưng package đó kéo
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

/**
 * Mã lỗi "thao tác này cần xác thực lại" (step-up, G7). Backend trả 401
 * `{ error, code: 'STEP_UP_REQUIRED' }` khi thiếu/sai/hết hạn token step-up -
 * giao diện bắt mã này để mở hộp nhập TOTP. Hằng gốc ở `@tsudev/auth`;
 * `test/mfa.test.ts` đối chiếu hai nơi.
 */
export const STEP_UP_REQUIRED = 'STEP_UP_REQUIRED';

export function isStepUpRequired(status: number, body: unknown): boolean {
  return (
    status === 401 &&
    typeof body === 'object' &&
    body !== null &&
    (body as { code?: unknown }).code === STEP_UP_REQUIRED
  );
}

/** Đổi mã TOTP lấy token step-up (5 phút). Trả null khi mã sai/hết hạn. */
export async function requestStepUp(
  code: string
): Promise<{ token: string; expiresAt: string } | null> {
  const r = await fetch('/api/account/step-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = (await r.json().catch(() => ({}))) as { token?: string; expiresAt?: string };
  return r.ok && data.token ? { token: data.token, expiresAt: data.expiresAt || '' } : null;
}
