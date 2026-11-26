import { createLocalJWKSet, errors, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';

/**
 * KIỂM JWT CLOUDFLARE ACCESS (CP2, `.standards` CONTROL_PLANE.md mục 3 L2, ADR-0005 mục 3).
 *
 * Cloudflare Access đứng trước `console.tsudev.com` (L1) và gắn `Cf-Access-Jwt-Assertion` (RS256) vào MỌI request đã
 * qua cổng. Kiểm lại ở Worker và ở backend là lớp THỨ HAI: nếu ai đó gọi thẳng Worker qua `*.workers.dev`, hoặc một
 * route quên nằm trong ứng dụng Access, header này vắng/sai và lượt đó bị đếm (`ghi`) hay chặn (`chan`).
 *
 * Kiểm: chữ ký RS256 bằng khoá từ `https://<team>/cdn-cgi/access/certs` (đệm ≤ 1 giờ), `aud` = AUD tag của ứng dụng,
 * `iss` = `https://<team>`, `exp`/`nbf` (dung sai 60 s - Access ký ở biên khác máy). Học từ `ubnd`
 * `backend/src/middleware/kiemCloudflareAccess.ts`, viết lại bằng `jose` (đã là phụ thuộc, chạy cả Workers lẫn Node).
 *
 * Công tắc `CF_ACCESS_MODE=tat|ghi|chan`, mặc định `ghi` khi đủ cấu hình. `chan` mà không tải được JWKS ⇒ ĐÓNG (503),
 * không bao giờ "không kiểm được thì cho qua".
 */

export type AccessMode = 'tat' | 'ghi' | 'chan';
export type AccessResult = 'ok' | 'thieu' | 'sai' | 'khong_jwks' | 'chua_cau_hinh';

export const ACCESS_HEADER = 'cf-access-jwt-assertion';
/** Worker console chuyển tiếp JWT Access xuống backend bằng header này (tên riêng - không giả làm header của Cloudflare). */
export const ACCESS_FORWARD_HEADER = 'x-tsu-access-jwt';
const JWKS_CACHE_MS = 60 * 60 * 1000;

export const accessMode = (v?: string): AccessMode => {
  const s = String(v || '')
    .trim()
    .toLowerCase();
  return s === 'tat' || s === 'chan' ? s : 'ghi';
};

/** `purple-cake-8f2a.cloudflareaccess.com` | `https://.../` ⇒ `https://purple-cake-8f2a.cloudflareaccess.com`. */
export const accessIssuer = (teamDomain: string): string =>
  `https://${teamDomain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')}`;

export interface AccessConfig {
  teamDomain?: string;
  aud?: string;
  mode?: string;
}

export const readAccessConfig = (
  env: Record<string, string | undefined>,
  audEnv = 'CF_ACCESS_AUD_CONSOLE'
): AccessConfig => ({
  teamDomain: env.CF_ACCESS_TEAM_DOMAIN,
  aud: env[audEnv],
  mode: env.CF_ACCESS_MODE,
});

/**
 * Bộ khoá tải bằng `fetch` toàn cục rồi đệm ≤ 1 giờ - KHÔNG dùng `createRemoteJWKSet`: bản Node của jose gọi
 * `http.get`, thứ Worker (OpenNext, `nodejs_compat`) không bảo đảm có. `fetch` chạy giống nhau ở Workers và Node 18+.
 * Không thấy `kid` (Access xoay khoá) ⇒ tải lại một lần nếu bản đệm đã cũ hơn 30 giây.
 */
type KeyCacheEntry = { at: number; getKey: JWTVerifyGetKey };
const jwksCache = new Map<string, KeyCacheEntry>();
const loadKeys = async (issuer: string, force = false): Promise<JWTVerifyGetKey> => {
  const hit = jwksCache.get(issuer);
  const now = Date.now();
  if (hit && !force && now - hit.at < JWKS_CACHE_MS) return hit.getKey;
  if (hit && force && now - hit.at < 30_000) return hit.getKey;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5_000);
  try {
    const r = await fetch(`${issuer}/cdn-cgi/access/certs`, { signal: ctl.signal });
    if (!r.ok) throw new TypeError(`JWKS ${r.status}`);
    const getKey = createLocalJWKSet((await r.json()) as Parameters<typeof createLocalJWKSet>[0]);
    jwksCache.set(issuer, { at: now, getKey });
    return getKey;
  } finally {
    clearTimeout(timer);
  }
};

export interface AccessVerdict {
  result: AccessResult;
  /** Email Access xác nhận - CHỈ để ghi nhật ký, không phải nguồn phân quyền (vai trò luôn đọc từ DB). */
  email?: string;
}

/** Lỗi do không tải/không dùng được bộ khoá - khác với "token sai". */
const isJwksFailure = (e: unknown): boolean => {
  if (e instanceof errors.JWKSTimeout || e instanceof errors.JWKSInvalid) return true;
  if (e instanceof Error && e.name === 'AbortError') return true;
  if (e instanceof errors.JOSEError) return false;
  // Lỗi mạng của fetch/http (TypeError, ECONNREFUSED...) - không phải lỗi xác minh.
  return true;
};

/**
 * Kiểm một JWT Access. `getKey` chỉ để test truyền JWKS giả (`createLocalJWKSet`); production tải từ miền nhóm.
 * Không bao giờ ném - mọi thất bại thành một `result`.
 */
export async function verifyAccessJwt(
  token: string | null | undefined,
  cfg: AccessConfig,
  getKey?: JWTVerifyGetKey
): Promise<AccessVerdict> {
  if (!cfg.teamDomain || !cfg.aud) return { result: 'chua_cau_hinh' };
  if (!token) return { result: 'thieu' };
  const issuer = accessIssuer(cfg.teamDomain);
  const opts = { issuer, audience: cfg.aud, algorithms: ['RS256'], clockTolerance: 60 };
  try {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, getKey ?? (await loadKeys(issuer)), opts));
    } catch (e) {
      if (getKey || !(e instanceof errors.JWKSNoMatchingKey)) throw e;
      ({ payload } = await jwtVerify(token, await loadKeys(issuer, true), opts));
    }
    return {
      result: 'ok',
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
  } catch (e) {
    return { result: isJwksFailure(e) ? 'khong_jwks' : 'sai' };
  }
}

/**
 * Quyết định cho một lượt: `allow` + mã HTTP khi chặn. `chua_cau_hinh` ở chế độ `chan` ⇒ 503 (thiếu cấu hình là lỗi
 * vận hành, phải ồn ào); ở `ghi` ⇒ cho qua.
 */
export function accessDecision(
  verdict: AccessVerdict,
  mode: AccessMode
): { allow: boolean; status?: 403 | 503 } {
  if (mode === 'tat' || verdict.result === 'ok') return { allow: true };
  if (mode === 'ghi') return { allow: true };
  if (verdict.result === 'khong_jwks' || verdict.result === 'chua_cau_hinh') {
    return { allow: false, status: 503 };
  }
  return { allow: false, status: 403 };
}

/** Chỉ cho test. */
export const __resetAccessKeys = (): void => jwksCache.clear();
