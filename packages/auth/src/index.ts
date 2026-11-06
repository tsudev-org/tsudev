import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { prisma } from '@tsudev/db';
import type { User } from '@prisma/client';
import { hasAtLeastRole } from '@tsudev/types';
import type { Role } from '@tsudev/types';
import { readSecret, verifyIdentity, SECRET_ENV, MIN_SECRET_LEN } from '@tsudev/identity-token';

export type { Role };

declare global {
  // Mở rộng interface của Express BẮT BUỘC dùng namespace - đó là hình dạng mà
  // @types/express khai. Không có cú pháp module ES2015 tương đương.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }

  /**
   * Danh tính người gọi, lấy từ khẳng định có chữ ký của BFF.
   *
   * `preferred_username` giữ tên theo quy ước OIDC vì mã tiêu thụ đang đọc nó;
   * nay nó luôn bằng `sub`.
   */
  type AuthenticatedUser = {
    sub: string;
    preferred_username: string;
    role?: string;
    /** Xem `IdentityClaims.sv` - đối chiếu với User.sessionVersion. */
    sv?: number;
  };
}

/**
 * Middleware xác thực.
 *
 * Kiểm KHẲNG ĐỊNH DANH TÍNH do BFF ký (xem @tsudev/identity-token) - tsudev
 * không dùng nhà cung cấp danh tính ngoài nào. Người dùng không bao giờ giữ token này; BFF ký lại cho từng
 * request từ phiên next-auth, với hạn dùng 120 giây.
 *
 * KHÔNG CÒN ĐƯỜNG TẮT NÀO. Bản trước có nhánh `AUTH_DEV_BYPASS=true` cho phép
 * khai danh tính bằng header `x-dev-user`. Nhánh đó là nguồn của một lỗi hai
 * chiều: tắt ở production nên mọi đường ghi trả 401, mà bật lên thì một dòng
 * header cấp được quyền ADMIN. Dev và production nay chạy CÙNG một đường -
 * chính sự khác biệt giữa hai môi trường mới là thứ đã giấu lỗi đó suốt.
 *
 * `service` chỉ dùng cho tiền tố log.
 */
export function createAuthMiddleware(service: string): RequestHandler {
  return async function authenticate(req: Request, res: Response, next: NextFunction) {
    const secret = readSecret(process.env);
    if (!secret) {
      // Thiếu khoá = không kiểm được ai cả. Từ chối, và nói rõ ở log tại sao -
      // im lặng trả 401 ở đây từng tốn cả một phiên để chẩn đoán.
      console.error(
        `[${service}] ${SECRET_ENV} thiếu hoặc ngắn hơn ${MIN_SECRET_LEN} ký tự - không xác thực được ai`
      );
      return res.status(503).json({ error: 'Máy chủ chưa cấu hình xác thực' });
    }

    const authHeader = req.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const claims = await verifyIdentity(authHeader.slice(7), secret);
    if (!claims) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      sub: claims.sub,
      preferred_username: claims.sub,
      role: claims.role,
      sv: claims.sv,
    };
    return next();
  };
}

/**
 * Tài khoản trong DB tương ứng với người gọi, TẠO NẾU CHƯA CÓ.
 *
 * Upsert chứ không phải findUnique: khẳng định đã qua được bước kiểm chữ ký,
 * nên người gọi là người thật, và để họ nhận 401 chỉ vì service chưa từng thấy
 * họ là sai. Vai trò mặc định là MEMBER - mức thấp nhất có danh tính, không
 * phải mức có đặc quyền.
 */
export async function resolveUser(req: Request): Promise<User | null> {
  const username = req.user?.preferred_username || req.user?.sub;
  if (!username) return null;
  const user = await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      email: `${username}@tsudev.local`,
      displayName: username,
      role: 'MEMBER',
    },
  });
  return sessionIsCurrent(req, user) ? user : null;
}

/** Chỉ tra cứu, KHÔNG tạo. Dùng cho đường ghi nhạy cảm của trang quản trị. */
export async function lookupUser(req: Request): Promise<User | null> {
  const username = req.user?.preferred_username || req.user?.sub;
  if (!username) return null;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return null;
  return sessionIsCurrent(req, user) ? user : null;
}

/**
 * Phiên đã bị thu hồi chưa?
 *
 * `User.sessionVersion` tăng lên khi đổi mật khẩu hoặc "đăng xuất mọi thiết
 * bị". Khẳng định mang số cũ nghĩa là nó được ký từ một phiên đã bị đá ra -
 * người dùng vẫn giữ một cookie next-auth hợp lệ, nhưng nó không còn giá trị.
 *
 * Nếu tài khoản bị chiếm thì kẻ chiếm đang giữ một phiên hợp lệ, và đổi mật
 * khẩu mà không có phép so sánh này thì KHÔNG lấy lại được gì.
 *
 * Khẳng định KHÔNG mang `sv` (undefined) được coi là hợp lệ, có chủ đích: đó là
 * token do bản BFF cũ ký, còn sống tối đa 120 giây sau khi phát hành. Từ chối
 * chúng sẽ làm mọi người bị đăng xuất trong lúc triển khai.
 */
function sessionIsCurrent(req: Request, user: User): boolean {
  const sv = req.user?.sv;
  if (sv === undefined) return true;
  return sv === user.sessionVersion;
}

/**
 * Chặn route nếu người gọi chưa đạt vai trò tối thiểu.
 *
 * FAIL CLOSED, và không có biến môi trường nào tắt được. Bản trước gác sau
 * `REQUIRE_ROLE_ENFORCEMENT` mặc định TẮT, nghĩa là mọi route "được bảo vệ" đều
 * mở ở mọi môi trường - trong khi mã nguồn đọc vào thì trông như đã có bảo vệ.
 *
 * `role` là union `Role` (từ @tsudev/types) chứ không phải string tự do: gõ sai
 * là lỗi biên dịch, không phải một cổng lặng lẽ cho qua.
 */
export function requireRole(role: Role): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = await resolveUser(req);
      if (!user) return res.status(401).json({ error: 'Bạn cần đăng nhập' });
      if (!hasAtLeastRole(user.role, role)) {
        return res.status(403).json({ error: `Yêu cầu vai trò tối thiểu: ${role}` });
      }
      return next();
    } catch (e) {
      // Lỗi DB không được biến thành "cho qua".
      console.error('[auth] requireRole lỗi:', e instanceof Error ? e.message : e);
      return res.status(503).json({ error: 'Không kiểm tra được quyền' });
    }
  };
}

/** Mã máy đọc được của lỗi "tài khoản quản trị chưa bật 2FA". Frontend bắt mã này. */
export const MFA_REQUIRED = 'MFA_REQUIRED';

/** Thông điệp đi kèm `MFA_REQUIRED` - nói rõ người dùng phải làm gì, ở đâu. */
export const MFA_REQUIRED_MESSAGE =
  'Tài khoản quản trị phải bật ứng dụng xác thực (TOTP) ở /settings/security trước khi dùng chức năng này. Passkey hiện chưa được tính cho khu quản trị.';

/**
 * Tài khoản có TOTP ĐÃ XÁC NHẬN không - yếu tố thứ hai DUY NHẤT mà cổng quản
 * trị chấp nhận.
 *
 * Vì sao KHÔNG tính passkey: đăng nhập mật khẩu ở auth-service
 * (`/api/identity/verify-credentials`) chỉ đòi bước hai khi có TOTP đã xác nhận.
 * Tài khoản chỉ có passkey vẫn đăng nhập được bằng MẬT KHẨU ĐƠN THUẦN, và phiên
 * đó không ghi lại phương thức xác thực (amr) - nên tính passkey ở đây nghĩa là
 * một mật khẩu bị lộ đủ để vào khu quản trị. Fail closed cho tới khi phiên mang
 * được amr (cùng step-up B3, docs/security-plan.md).
 *
 * TOTP chưa xác nhận (`confirmedAt` NULL) KHÔNG tính - đó là bí mật đã sinh mà
 * người dùng chưa từng chứng minh mình giữ, và đăng nhập cũng không hỏi mã cho
 * nó. Cổng này đúng CHỈ KHI bất biến sau còn giữ: TOTP đã xác nhận ⇒ đăng nhập
 * mật khẩu thiếu mã bị 401 `totp_required` (auth-service/test/ownerMfaGate.test.ts).
 *
 * NÉM khi lỗi DB - người gọi phải coi đó là từ chối (xem `requireSecondFactor`).
 */
export async function hasConfirmedTotp(userId: string): Promise<boolean> {
  const totp = await prisma.totpCredential.findFirst({
    where: { userId, confirmedAt: { not: null } },
    select: { id: true },
  });
  return Boolean(totp);
}

/**
 * Ép 2FA cho bề mặt quản trị (G6, docs/security-plan.md). Gọi SAU khi đã kiểm
 * vai trò, để người không đủ vai trò vẫn nhận đúng 403 cũ.
 *
 * Trả `true` nếu cho qua; nếu không, đã ghi phản hồi và trả `false`:
 *   - chưa có TOTP đã xác nhận ⇒ 403 `{ error, code: 'MFA_REQUIRED' }`;
 *   - lỗi tra DB ⇒ 503. FAIL CLOSED: lỗi không bao giờ thành "cho qua".
 *
 * KHÔNG dùng cho các route tự bật TOTP/passkey của chính tài khoản - chặn ở đó
 * thì ADMIN/OWNER chưa có 2FA không còn đường nào bật nó, tự khoá mình ngoài.
 */
export async function requireSecondFactor(user: Pick<User, 'id'>, res: Response): Promise<boolean> {
  try {
    if (await hasConfirmedTotp(user.id)) return true;
    res.status(403).json({ error: MFA_REQUIRED_MESSAGE, code: MFA_REQUIRED });
    return false;
  } catch (e) {
    console.error('[auth] requireSecondFactor lỗi:', e instanceof Error ? e.message : e);
    res.status(503).json({ error: 'Không kiểm tra được xác thực hai lớp' });
    return false;
  }
}

/**
 * `x-internal-token` của request có khớp `expected` không - so THỜI GIAN HẰNG.
 *
 * `===` dừng ở byte sai đầu tiên, nên thời gian phản hồi rò rỉ độ dài tiền tố
 * đúng: đủ lượt đo là đoán được token từng byte một. Token này là thứ duy nhất
 * đứng giữa Internet và `/api` của ba service (backend chạy công khai trên
 * Render), nên không chấp nhận `===` ở đây. Băm SHA-256 trước để hai bên luôn
 * cùng độ dài - `timingSafeEqual` ném lỗi khi độ dài khác, và chính việc ném đó
 * lại rò rỉ độ dài.
 */
export function internalTokenMatches(req: Request, expected: string): boolean {
  if (!expected) return false;
  const got = req.get('x-internal-token');
  if (typeof got !== 'string' || !got) return false;
  const a = createHash('sha256').update(got).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// XÁC THỰC LẠI (step-up, G7 - docs/security-plan.md §3.3 mục 6)
//
// Thao tác nguy hiểm (thu hồi/khôi phục/ký lại bản phát hành) đòi một bằng
// chứng MỚI rằng người đang ngồi trước phiên vẫn giữ yếu tố thứ hai: phiên bị
// chiếm (XSS, máy bỏ quên) không đủ để làm chúng.
//
// Luồng: auth-service kiểm mã TOTP (`POST /api/identity/step-up`) rồi phát token
// này; service khác kiểm nó bằng `requireStepUp`. Token buộc vào `sub` VÀ
// `sessionVersion` - đổi mật khẩu/thu hồi phiên là token cũ chết theo - và sống
// `STEP_UP_TTL_SECONDS`.
//
// Khoá HMAC DẪN XUẤT từ INTERNAL_IDENTITY_SECRET với nhãn riêng: không thêm bí
// mật nào phải đồng bộ giữa Workers và Render, mà token step-up cũng không bao
// giờ kiểm được như một khẳng định danh tính (khác khoá, khác định dạng).
// Chỉ TOTP: passkey chưa được tính cho khu quản trị (xem hasConfirmedTotp).
// ---------------------------------------------------------------------------

/** Tuổi tối đa của token step-up: 5 phút (kế hoạch §3.3). */
export const STEP_UP_TTL_SECONDS = 5 * 60;
/** Mã lỗi máy đọc được khi thiếu/sai/hết hạn step-up. Frontend bắt mã này để mở hộp nhập TOTP. */
export const STEP_UP_REQUIRED = 'STEP_UP_REQUIRED';

const STEP_UP_TYP = 'tsudev-step-up-v1';

const stepUpKey = (secret: string): Buffer =>
  createHmac('sha256', secret).update(STEP_UP_TYP).digest();

const b64u = (buf: Buffer | string): string => Buffer.from(buf).toString('base64url');

/** Bí mật dùng cho step-up (INTERNAL_IDENTITY_SECRET đủ dài), hoặc null. */
export const stepUpSecret = (): string | null => readSecret(process.env);

/** Phát token step-up cho `user`. Gọi CHỈ sau khi đã kiểm mã TOTP đúng. */
export function issueStepUp(
  user: Pick<User, 'id' | 'sessionVersion'>,
  secret: string,
  now = Date.now()
): { token: string; expiresAt: string } {
  const iat = Math.floor(now / 1000);
  const exp = iat + STEP_UP_TTL_SECONDS;
  const body = b64u(
    JSON.stringify({
      typ: STEP_UP_TYP,
      sub: user.id,
      sv: user.sessionVersion,
      amr: 'totp',
      iat,
      exp,
    })
  );
  const mac = b64u(createHmac('sha256', stepUpKey(secret)).update(body).digest());
  return { token: `${body}.${mac}`, expiresAt: new Date(exp * 1000).toISOString() };
}

/** Token có hợp lệ cho đúng `user` vào lúc `now` không. Mọi lý do hỏng ⇒ false. */
export function verifyStepUp(
  token: unknown,
  user: Pick<User, 'id' | 'sessionVersion'>,
  secret: string,
  now = Date.now()
): boolean {
  if (typeof token !== 'string' || token.length > 1024) return false;
  const dot = token.indexOf('.');
  if (dot < 1 || dot !== token.lastIndexOf('.')) return false;
  const body = token.slice(0, dot);
  const got = Buffer.from(token.slice(dot + 1), 'base64url');
  const want = createHmac('sha256', stepUpKey(secret)).update(body).digest();
  if (got.length !== want.length || !timingSafeEqual(got, want)) return false;
  try {
    const c = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    const t = Math.floor(now / 1000);
    return (
      c.typ === STEP_UP_TYP &&
      c.sub === user.id &&
      c.sv === user.sessionVersion &&
      typeof c.iat === 'number' &&
      typeof c.exp === 'number' &&
      c.iat <= t + 5 &&
      c.exp > t &&
      c.exp - c.iat <= STEP_UP_TTL_SECONDS
    );
  } catch {
    return false;
  }
}

/**
 * Cổng step-up cho route nguy hiểm. Đọc token ở `req.body.stepUp` (hoặc header
 * `x-step-up`). Gọi SAU requireAdmin/requireOwner. Trả true nếu cho qua; nếu
 * không đã ghi 401 `{ code: 'STEP_UP_REQUIRED' }` (hoặc 503 khi thiếu bí mật -
 * FAIL CLOSED) và trả false.
 */
export function requireStepUp(
  req: Request,
  res: Response,
  user: Pick<User, 'id' | 'sessionVersion'>
): boolean {
  const secret = stepUpSecret();
  if (!secret) {
    console.error(`[auth] requireStepUp: thiếu ${SECRET_ENV} (>= ${MIN_SECRET_LEN} ký tự)`);
    res.status(503).json({ error: 'Không kiểm được xác thực lại' });
    return false;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const token = body.stepUp ?? req.get('x-step-up');
  if (verifyStepUp(token, user, secret)) return true;
  res.status(401).json({
    code: STEP_UP_REQUIRED,
    error: 'Thao tác này cần xác thực lại: nhập mã TOTP (hiệu lực 5 phút).',
  });
  return false;
}
