import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  ACCESS_FORWARD_HEADER,
  accessDecision,
  accessMode,
  readAccessConfig,
  readSecret,
  verifyAccessJwt,
  ZONE_SECRET_ENV,
} from '@tsudev/identity-token';
import type { AccessResult } from '@tsudev/identity-token';

/**
 * CỔNG VÙNG ĐIỀU HÀNH (CP2, ADR-0005 mục 3-4, `.standards` CONTROL_PLANE.md mục 3 L2 + L5).
 *
 * Gắn SAU `createAuthMiddleware()` cho route điều hành. Hai lớp độc lập:
 *
 * - **L5 vùng ký**: khẳng định danh tính phải do Worker `console.` ký (`zone === 'console'`, bí mật
 *   `INTERNAL_IDENTITY_SECRET_CONSOLE`, `aud` riêng). Worker công khai `tsudev.com` bị chiếm không có khoá đó.
 *   Chuyển tiếp: backend CHƯA có khoá console ⇒ cho qua + một dòng log (để deploy mã trước, đặt biến Render sau mà
 *   không gãy trang). Có khoá ⇒ chặn ngay, không cần công tắc thứ hai: khoá chỉ được đặt khi Worker console đã ký.
 * - **L2 JWT Access ở backend**: Worker console chuyển tiếp `Cf-Access-Jwt-Assertion` qua `X-Tsu-Access-Jwt`; kiểm
 *   lại ở đây theo `CF_ACCESS_MODE` (`ghi` mặc định: đếm + log mỗi lý do một lần; `chan`: 403, không tải được JWKS
 *   ⇒ 503). Không tin email trong JWT để phân quyền - vai trò vẫn đọc từ DB ở `requireOwner`/`requireRole`.
 */

export const CONSOLE_REQUIRED = 'console_required';
export const CONSOLE_REQUIRED_MESSAGE =
  'Thao tác điều hành chỉ làm được ở trạm điều hành console.tsudev.com.';

let warnedNoKey = false;
const accessSeen = new Set<string>();
const accessCounts = new Map<AccessResult, number>();

/** Bộ đếm L2 cho bảng An ninh (CP5) và test. */
export const consoleAccessStats = (): Record<string, number> => Object.fromEntries(accessCounts);
/** Chỉ cho test. */
export const __resetConsoleGate = (): void => {
  warnedNoKey = false;
  accessSeen.clear();
  accessCounts.clear();
};

export function requireConsole(service: string): RequestHandler {
  return async function consoleGate(req: Request, res: Response, next: NextFunction) {
    if (!readSecret(process.env, 'console')) {
      if (!warnedNoKey) {
        warnedNoKey = true;
        console.warn(
          `[${service}] [console] chưa có ${ZONE_SECRET_ENV.console} - route điều hành còn nhận khẳng định vùng main (chuyển tiếp CP2)`
        );
      }
      return next();
    }
    if (req.user?.zone !== 'console') {
      return res.status(403).json({
        error: CONSOLE_REQUIRED,
        code: CONSOLE_REQUIRED,
        message: CONSOLE_REQUIRED_MESSAGE,
      });
    }

    const mode = accessMode(process.env.CF_ACCESS_MODE);
    if (mode === 'tat') return next();
    const verdict = await verifyAccessJwt(
      req.get(ACCESS_FORWARD_HEADER) || null,
      readAccessConfig(process.env)
    );
    accessCounts.set(verdict.result, (accessCounts.get(verdict.result) || 0) + 1);
    if (verdict.result !== 'ok' && !accessSeen.has(verdict.result)) {
      accessSeen.add(verdict.result);
      console.warn(`[${service}] [access] JWT Access không đạt (${mode}): ${verdict.result}`);
    }
    const d = accessDecision(verdict, mode);
    if (d.allow) return next();
    return res.status(d.status ?? 403).json({ error: 'access_denied', code: verdict.result });
  };
}
