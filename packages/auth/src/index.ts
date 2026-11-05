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
  'Tài khoản quản trị phải bật xác thực hai lớp (ứng dụng TOTP hoặc passkey) ở /settings/security trước khi dùng chức năng này';

/**
 * Tài khoản có yếu tố thứ hai dùng được không: TOTP ĐÃ XÁC NHẬN hoặc ít nhất
 * một passkey.
 *
 * TOTP chưa xác nhận (`confirmedAt` NULL) KHÔNG tính - đó là bí mật đã sinh mà
 * người dùng chưa từng chứng minh mình giữ, đúng quy ước của auth-service
 * (đăng nhập cũng chỉ hỏi mã khi đã xác nhận).
 *
 * NÉM khi lỗi DB - người gọi phải coi đó là từ chối (xem `requireSecondFactor`).
 */
export async function hasSecondFactor(userId: string): Promise<boolean> {
  const [totp, passkey] = await Promise.all([
    prisma.totpCredential.findFirst({
      where: { userId, confirmedAt: { not: null } },
      select: { id: true },
    }),
    prisma.webAuthnCredential.findFirst({ where: { userId }, select: { id: true } }),
  ]);
  return Boolean(totp || passkey);
}

/**
 * Ép 2FA cho bề mặt quản trị (G6, docs/security-plan.md). Gọi SAU khi đã kiểm
 * vai trò, để người không đủ vai trò vẫn nhận đúng 403 cũ.
 *
 * Trả `true` nếu cho qua; nếu không, đã ghi phản hồi và trả `false`:
 *   - chưa có yếu tố thứ hai ⇒ 403 `{ error, code: 'MFA_REQUIRED' }`;
 *   - lỗi tra DB ⇒ 503. FAIL CLOSED: lỗi không bao giờ thành "cho qua".
 *
 * KHÔNG dùng cho các route tự bật TOTP/passkey của chính tài khoản - chặn ở đó
 * thì ADMIN/OWNER chưa có 2FA không còn đường nào bật nó, tự khoá mình ngoài.
 */
export async function requireSecondFactor(user: Pick<User, 'id'>, res: Response): Promise<boolean> {
  try {
    if (await hasSecondFactor(user.id)) return true;
    res.status(403).json({ error: MFA_REQUIRED_MESSAGE, code: MFA_REQUIRED });
    return false;
  } catch (e) {
    console.error('[auth] requireSecondFactor lỗi:', e instanceof Error ? e.message : e);
    res.status(503).json({ error: 'Không kiểm tra được xác thực hai lớp' });
    return false;
  }
}
