import { createHmac, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * KHOÁ ORIGIN `X-Tsu-Edge` (CP1, ADR-0005 mục 5, `.standards` CONTROL_PLANE.md mục 6).
 *
 * Backend chạy trên URL Render CÔNG KHAI (`tsudev-backend.onrender.com`): ai biết địa chỉ đều gọi thẳng được, bỏ
 * qua WAF, giới hạn tần suất và mọi luật ở biên Cloudflare. Middleware này đòi bằng chứng rằng request do một
 * Worker của hệ gửi: `X-Tsu-Edge: <ts>.<base64url HMAC-SHA256(khoá, "<ts>.<METHOD>.<pathname>")>`, `ts` (giây)
 * lệch ≤ 300 giây. Path + method nằm trong chữ ký ⇒ chữ ký của `GET /api/posts` không dùng lại được cho
 * `POST /api/admin/...`; `ts` ⇒ phát lại chỉ sống 5 phút (học từ `ubnd` `chiQuaBien.ts`).
 *
 * Công tắc `EDGE_MODE=tat|ghi|chan`, mặc định `ghi` khi có khoá: `ghi` cho qua + đếm lượt không đạt theo lý do
 * (`thieu|sai|het_han`), tiền tố đường dẫn và loại UA; `chan` trả 403. Rollback = đặt `tat` trên Render, không cần
 * deploy. Chưa có `EDGE_SIGNING_KEY` ⇒ KHÔNG làm gì (máy dev, test, CI). `EDGE_SIGNING_KEY_PREV` cho giai đoạn xoay
 * khoá (Worker đã ký bằng khoá mới, backend còn nhận khoá cũ). Miễn `/health`: Render health check gọi thẳng.
 *
 * Bên ký PHẢI khớp `edgeSigningInput` từng byte: `apps/frontend-main/lib/services.ts` (node:crypto) và
 * `infrastructure/canh-site-cron/src/edge.ts` (WebCrypto). Cả ba có chung một vectơ thử ở test.
 */

export type EdgeMode = 'tat' | 'ghi' | 'chan';
export type EdgeResult = 'ky' | 'mien' | 'thieu' | 'sai' | 'het_han';

export const EDGE_HEADER = 'x-tsu-edge';
export const EDGE_MAX_SKEW_SECONDS = 300;
const EXEMPT = ['/health'];

export const edgeMode = (v = process.env.EDGE_MODE): EdgeMode => {
  const s = String(v || '')
    .trim()
    .toLowerCase();
  return s === 'tat' || s === 'chan' ? s : 'ghi';
};

/** Chuỗi được ký. Đổi ở đây ⇒ đổi cùng lúc ở cả hai bên ký, nếu không mọi lượt thành `sai`. */
export const edgeSigningInput = (ts: number | string, method: string, pathname: string): string =>
  `${ts}.${String(method || 'GET').toUpperCase()}.${pathname}`;

export const signEdge = (
  key: string,
  method: string,
  pathname: string,
  nowMs = Date.now()
): string => {
  const ts = Math.floor(nowMs / 1000);
  const mac = createHmac('sha256', key)
    .update(edgeSigningInput(ts, method, pathname))
    .digest('base64url');
  return `${ts}.${mac}`;
};

const sameBytes = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export interface EdgeInput {
  method: string;
  /** Đường dẫn GỐC (không query) - `originalUrl`, không phải `url` đã bị router con cắt. */
  pathname: string;
  header?: string;
  keys: string[];
  nowMs?: number;
}

/** Hàm thuần: lượt này có bằng chứng đi qua biên không. */
export const evaluateEdge = ({
  method,
  pathname,
  header,
  keys,
  nowMs = Date.now(),
}: EdgeInput): EdgeResult => {
  if (EXEMPT.includes(pathname)) return 'mien';
  if (!header) return 'thieu';
  const dot = header.indexOf('.');
  const tsText = header.slice(0, dot);
  if (dot < 1 || !/^\d{1,12}$/.test(tsText)) return 'sai';
  const ts = Number(tsText);
  const got = header.slice(dot + 1);
  const ok = keys.some((k) =>
    sameBytes(
      got,
      createHmac('sha256', k)
        .update(edgeSigningInput(ts, method, pathname))
        .digest('base64url')
    )
  );
  if (!ok) return 'sai';
  return Math.abs(Math.floor(nowMs / 1000) - ts) > EDGE_MAX_SKEW_SECONDS ? 'het_han' : 'ky';
};

/* --------------------------------------------------------------------- bộ đếm cho chế độ `ghi` */

/** Loại UA thô - phân biệt trình duyệt / công cụ / máy quét mà không lưu chuỗi UA. */
export const uaKind = (ua = ''): string => {
  const s = ua.toLowerCase();
  if (!s) return 'rong';
  if (/render|health/.test(s)) return 'render';
  if (/bot|spider|crawl|scan|nuclei|zgrab|masscan/.test(s)) return 'bot';
  if (
    /curl|wget|python|go-http|java|okhttp|node|axios|undici|powershell|httpie|libwww|reqwest/.test(
      s
    )
  )
    return 'cong-cu';
  if (/mozilla/.test(s)) return 'trinh-duyet';
  return 'khac';
};

/** Tiền tố 2 đoạn (`/api/posts`) - không lưu id/token/slug trong đường dẫn. */
export const pathPrefix = (pathname: string): string =>
  pathname.split('/').slice(0, 3).join('/').slice(0, 60) || '/';

const MAX_KEYS = 500;
let counts = new Map<string, number>();
let logged = new Set<string>();
let since = new Date();

export const recordEdge = (
  result: EdgeResult,
  method: string,
  pathname: string,
  ua?: string
): void => {
  // Lượt đạt chỉ đếm theo tiền tố (không theo UA) - đủ để thấy chữ ký có chạy, không phình bảng.
  const k =
    result === 'ky'
      ? `ky|${method.toUpperCase()} ${pathPrefix(pathname)}`
      : `${result}|${method.toUpperCase()} ${pathPrefix(pathname)}|${uaKind(ua)}`;
  if (!counts.has(k) && counts.size >= MAX_KEYS) return;
  counts.set(k, (counts.get(k) || 0) + 1);
  if (result !== 'ky' && !logged.has(k)) {
    logged.add(k);
    // Một dòng cho MỖI khoá mới - log Render là nơi đo khi tiến trình khởi động lại (bộ đếm nằm trong bộ nhớ).
    console.warn(`[edge] lượt KHÔNG qua biên (${edgeMode()}): ${k}`);
  }
};

export const edgeKeys = (env: NodeJS.ProcessEnv = process.env): string[] =>
  // `_CONSOLE`: khoá biên RIÊNG của Worker console. (CP2) - lộ khoá của một Worker không giả được Worker kia ở nhật ký.
  [env.EDGE_SIGNING_KEY, env.EDGE_SIGNING_KEY_PREV, env.EDGE_SIGNING_KEY_CONSOLE].filter(
    (k): k is string => typeof k === 'string' && k.length > 0
  );

/** Đọc cho `GET /api/admin/edge-stats` (ADMIN). Không trả khoá, chỉ trả việc có khoá hay không. */
export const edgeStats = (): Record<string, unknown> => {
  const tong: Record<string, number> = {};
  for (const [k, n] of counts) {
    const r = k.split('|')[0] ?? '';
    tong[r] = (tong[r] || 0) + n;
  }
  return {
    mode: edgeMode(),
    hasKey: Boolean(process.env.EDGE_SIGNING_KEY),
    hasPrevKey: Boolean(process.env.EDGE_SIGNING_KEY_PREV),
    hasConsoleKey: Boolean(process.env.EDGE_SIGNING_KEY_CONSOLE),
    active: edgeKeys().length > 0 && edgeMode() !== 'tat',
    since: since.toISOString(),
    totals: tong,
    counts: Object.fromEntries([...counts].sort((a, b) => b[1] - a[1])),
  };
};

/** Chỉ cho test. */
export const __resetEdgeStats = (): void => {
  counts = new Map();
  logged = new Set();
  since = new Date();
};

/**
 * Middleware - gắn ĐẦU TIÊN trong app của mỗi service (trước body parser, cổng phiên bản, OIDC). Ở chế độ gộp
 * `backend-bundle` gọi đúng MỘT app con cho mỗi request nên mỗi lượt được xét đúng một lần.
 */
/**
 * Request đã mang chữ ký biên HỢP LỆ (`ky`). CP2: chữ ký biên thay được `INTERNAL_API_TOKEN` tĩnh ở cổng `/api`
 * (`internalTokenMatches`) - mạnh hơn token tĩnh (buộc METHOD + đường dẫn, sống 300 s) và cho phép Worker mới
 * (`console.`) gọi backend mà không phải chép token tĩnh dùng chung sang (ADR-0005 mục 5). WeakSet: không rò bộ nhớ,
 * không ai ngoài edgeGuard đánh dấu được.
 */
const edgeSigned = new WeakSet<object>();
export const isEdgeSigned = (req: object): boolean => edgeSigned.has(req);

export function edgeGuard(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const keys = edgeKeys();
    const mode = edgeMode();
    if (mode === 'tat' || keys.length === 0) return next();
    const pathname = String(req.originalUrl || req.url || '/').split('?')[0] ?? '/';
    const result = evaluateEdge({
      method: req.method,
      pathname,
      header: req.get(EDGE_HEADER),
      keys,
    });
    if (result === 'mien') return next();
    recordEdge(result, req.method, pathname, req.get('user-agent'));
    if (result === 'ky') edgeSigned.add(req);
    if (result === 'ky' || mode !== 'chan') return next();
    res.setHeader('Cache-Control', 'no-store');
    return res
      .status(403)
      .json({ error: 'edge_required', message: 'Yêu cầu không đi qua cổng hợp lệ của hệ thống.' });
  };
}
