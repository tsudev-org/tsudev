import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Giới hạn tần suất DÙNG CHUNG cho các service backend.
 *
 * Tách ra từ trust-service (nơi nó ra đời để chặn lạm dụng các endpoint CÔNG
 * KHAI của con dấu) để content-service và storage-service dùng lại mà không sao
 * chép. Ba service gộp thành MỘT tiến trình (`services/backend-bundle`), nên bộ
 * đếm trong bộ nhớ tiến trình là chia sẻ đúng như giả định dưới đây.
 *
 * VÌ SAO Ở ĐÂY MÀ KHÔNG PHẢI Ở DB
 *
 * Các endpoint này bị gọi bởi trình duyệt của khách trên site BÊN THỨ BA - mỗi
 * lượt xem một trang có gắn huy hiệu là một request. Ghi một dòng DB cho mỗi
 * lượt xem đó là biến bộ đếm chống lạm dụng thành chính nguồn tải.
 *
 * GIẢ ĐỊNH MỘT TIẾN TRÌNH
 *
 * Bộ đếm nằm trong bộ nhớ tiến trình. Giả định: production chạy ĐÚNG MỘT tiến
 * trình (`services/backend-bundle`, xem render.yaml). Giả định đó ghi ra đây vì
 * nó VỠ nếu sau này chạy nhiều bản - lúc đó mỗi bản có xô riêng và ngưỡng thực
 * tế nhân lên theo số bản.
 *
 * KEY LÀ IP CLIENT THẬT, KHÔNG PHẢI IP HẠ TẦNG
 *
 * `callerIp` đọc `x-forwarded-for`. Lưu ý: BFF của Next (Cloudflare Workers)
 * KHÔNG chuyển IP client xuống khi gọi service, nên lưu lượng hợp lệ đi qua BFF
 * mang chung một IP egress. Vì thế nơi gọi phải MIỄN TRỪ lưu lượng tin cậy (mang
 * `x-internal-token` đúng) khỏi limiter, và chỉ giới hạn lưu lượng TRỰC TIẾP
 * (không token) theo IP thật - đó mới là mối đe dọa. trust-service cố ý không có
 * internal token nên giới hạn toàn bộ nhánh công khai của nó.
 *
 * Thuật toán là cửa sổ trượt xấp xỉ bằng hai xô: đơn giản hơn token bucket,
 * không cần hẹn giờ, và không bao giờ cho qua quá 2× ngưỡng trong một cửa sổ.
 */

type Bucket = { windowStart: number; count: number; prevCount: number };

/**
 * Kho đếm LƯU BỀN (G9, D8) - tuỳ chọn. Có `store` thì giới hạn chạy theo cửa sổ
 * CỐ ĐỊNH: `hit` tăng bộ đếm của (khoá, đầu cửa sổ) một cách NGUYÊN TỬ và trả về
 * giá trị SAU khi tăng. Kho ở RAM không sống qua khởi động lại và nhân ngưỡng
 * theo số bản chạy; kho này thì có.
 *
 * Kho hỏng (DB mất kết nối) ⇒ FAIL-OPEN có log: một bộ giới hạn làm sập đăng
 * nhập khi DB chập chờn là tự gây ra đúng thứ nó định chặn. Lớp chặn thứ hai
 * (khoá tài khoản theo `failedLoginCount`, throttle `LoginAttempt`) vẫn đứng.
 */
export type RateLimitStore = {
  hit(key: string, windowStart: Date): Promise<number>;
};

/**
 * Giới hạn số mục nhớ.
 *
 * Không có nó thì chính bộ giới hạn trở thành lỗ hổng: kẻ tấn công gửi request
 * từ các IP giả khác nhau và bảng lớn tới lúc hết bộ nhớ. Chạm trần thì xoá
 * sạch - thà mất bộ đếm một nhịp còn hơn chết vì hết RAM.
 */
const MAX_KEYS = 20_000;

export function createRateLimit(opts: {
  windowMs: number;
  max: number;
  /** Tiền tố log, để biết bộ nào đang chặn. */
  name: string;
  /**
   * Khoá của một xô. Mặc định là IP người gọi.
   *
   * Đổi được vì có giới hạn phải đếm theo TÀI KHOẢN chứ không theo IP: mốc
   * `page_size` lớn (DATA_TABLE.md mục 8.4) là quyền của một tài khoản đã đăng
   * nhập, và đếm theo IP thì cả một văn phòng dùng chung NAT sẽ chặn lẫn nhau,
   * trong khi một tài khoản đổi IP lại thoát.
   */
  keyOf?: (req: Request) => string;
  /**
   * Chỉ tính giới hạn khi hàm này trả true. Mặc định: mọi request.
   *
   * Dùng cho giới hạn CÓ ĐIỀU KIỆN - ví dụ chỉ chặn khi client xin mốc lớn, còn
   * lưu lượng bình thường đi thẳng. Trả false là KHÔNG đếm, không chỉ là không
   * chặn: nếu vẫn đếm thì một người lật trang mốc 10 cả ngày sẽ tự khoá mình ra
   * khỏi mốc 200.
   */
  when?: (req: Request) => boolean;
  /** Kho lưu bền - xem `RateLimitStore`. Không truyền ⇒ đếm trong RAM. */
  store?: RateLimitStore;
}): RequestHandler {
  const buckets = new Map<string, Bucket>();
  const store = opts.store;

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    if (opts.when && !opts.when(req)) return next();

    if (store) {
      const now = Date.now();
      const start = Math.floor(now / opts.windowMs) * opts.windowMs;
      const key = `${opts.name}:${opts.keyOf ? opts.keyOf(req) : callerIp(req)}`;
      store.hit(key, new Date(start)).then(
        (count) => {
          if (count > opts.max) {
            const retryAfter = Math.ceil((start + opts.windowMs - now) / 1000);
            res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
            res.status(429).json({ error: 'Quá nhiều yêu cầu, thử lại sau' });
            return;
          }
          next();
        },
        (err: unknown) => {
          console.error(
            `[ratelimit] ${opts.name}: kho lưu bền hỏng, CHO QUA:`,
            err instanceof Error ? err.message : err
          );
          next();
        }
      );
      return;
    }

    const now = Date.now();
    const key = opts.keyOf ? opts.keyOf(req) : callerIp(req);

    let b = buckets.get(key);
    if (!b) {
      if (buckets.size >= MAX_KEYS) buckets.clear();
      b = { windowStart: now, count: 0, prevCount: 0 };
      buckets.set(key, b);
    }

    const elapsed = now - b.windowStart;
    if (elapsed >= opts.windowMs) {
      // Cửa sổ mới. Giữ lại số đếm của cửa sổ trước để nội suy - nếu không thì
      // đúng lúc chuyển cửa sổ, một kẻ tấn công gửi được 2× ngưỡng liền nhau.
      b.prevCount = elapsed >= opts.windowMs * 2 ? 0 : b.count;
      b.count = 0;
      b.windowStart = now;
    }

    const weight = 1 - (now - b.windowStart) / opts.windowMs;
    const estimated = b.count + b.prevCount * weight;

    if (estimated >= opts.max) {
      const retryAfter = Math.ceil((opts.windowMs - (now - b.windowStart)) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({ error: 'Quá nhiều yêu cầu, thử lại sau' });
    }

    b.count += 1;
    return next();
  };
}

/**
 * IP của người gọi.
 *
 * Đọc `x-forwarded-for` là bắt buộc: service luôn đứng sau proxy (dev-proxy ở
 * local, Render ở production), nên `req.ip` là địa chỉ của proxy - giới hạn
 * theo nó sẽ gộp cả thế giới vào một xô.
 */
export function callerIp(req: Request): string {
  const raw = req.headers['x-forwarded-for'];
  const first = Array.isArray(raw) ? raw[0] : raw;
  const ip = first?.split(',')[0]?.trim() || req.ip || 'unknown';
  return ip.slice(0, 45);
}

/**
 * IP của bên kết nối TỚI HẠ TẦNG - phần tử CUỐI của `x-forwarded-for`.
 *
 * Phần tử ĐẦU do người gửi tự đặt được: gửi `X-Forwarded-For: <ip giả>` thì
 * proxy của Render chỉ NỐI THÊM IP thật vào cuối. Giới hạn lưu lượng TRỰC TIẾP
 * (không token) theo phần tử đầu là cho kẻ tấn công một xô mới ở mỗi request -
 * cùng lỗi đã vá ở BFF ngày 05/11/2026 (lib/clientIp.ts). Phần tử cuối là thứ
 * proxy tin cậy gần nhất ghi, người gửi không sửa được.
 *
 * `callerIp` (phần tử đầu) vẫn đúng cho lưu lượng ĐÃ QUA cổng token: khi đó BFF
 * là bên đặt header, bằng IP thật lấy từ CF-Connecting-IP.
 */
export function peerIp(req: Request): string {
  const raw = req.headers['x-forwarded-for'];
  const joined = Array.isArray(raw) ? raw.join(',') : raw || '';
  const parts = joined
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return (parts[parts.length - 1] || req.ip || 'unknown').slice(0, 45);
}

/**
 * Khoá xô theo TÀI KHOẢN cho lưu lượng đã qua BFF: `sub` trong khẳng định danh
 * tính (`Authorization: Bearer <jwt>`), lùi về `callerIp` khi không có.
 *
 * Đọc `sub` mà KHÔNG kiểm chữ ký - cố ý: đây chỉ là chọn xô, không phải xác
 * thực (middleware xác thực chạy sau và vẫn kiểm đầy đủ). Kẻ không có
 * INTERNAL_API_TOKEN không tới được đây; BFF ký khẳng định cho đúng người dùng
 * thật, nên `sub` là tài khoản thật. Không giải mã được thì lùi về IP.
 */
export function identityKey(req: Request): string {
  const h = req.headers.authorization;
  const m = typeof h === 'string' ? /^Bearer\s+([^.\s]+)\.([^.\s]+)\./.exec(h) : null;
  if (m) {
    try {
      const payload = JSON.parse(Buffer.from(m[2] as string, 'base64url').toString('utf8'));
      if (payload && typeof payload.sub === 'string' && payload.sub) {
        return `u:${payload.sub.slice(0, 64)}`;
      }
    } catch {
      // rơi xuống IP
    }
  }
  return `ip:${callerIp(req)}`;
}

/**
 * Giới hạn riêng cho yêu cầu xin mốc `page_size` LỚN (>= 100).
 *
 * DATA_TABLE.md mục 8.4 gọi đây là "cái giá của việc nâng trần từ 100 lên 200,
 * và là điều kiện của việc nâng đó" - nên nó không phải tuỳ chọn. Một tài khoản
 * kéo 200 bản ghi mỗi lần, lặp liên tục, là đường cạn tài nguyên rẻ nhất mà một
 * người ĐÃ ĐĂNG NHẬP có thể tạo ra.
 *
 * Đếm theo TÀI KHOẢN (mục 8.4 nói "/tài khoản"), lùi về IP khi chưa nhận dạng
 * được. Chỉ đếm khi request thật sự xin mốc lớn: người lật trang ở mốc 10 cả
 * ngày không được phép tự khoá mình ra khỏi mốc 200.
 *
 * `identify` do service truyền vào vì mỗi service nhận dạng người gọi một kiểu
 * (khẳng định danh tính của BFF, phiên, token nội bộ) - module này cố ý không
 * biết gì về xác thực.
 */
export function largePageRateLimit(opts: {
  /** Mặc định 10 yêu cầu / phút / tài khoản, đúng đề xuất của mục 8.4. */
  max?: number;
  windowMs?: number;
  name?: string;
  identify?: (req: Request) => string | null | undefined;
}): RequestHandler {
  const threshold = 100;
  return createRateLimit({
    windowMs: opts.windowMs ?? 60_000,
    max: opts.max ?? 10,
    name: opts.name ?? 'page_size lớn',
    when: (req) => {
      // Đọc CẢ query lẫn body: bộ tham số chuẩn là của một GET, nhưng vài
      // endpoint danh sách trong repo này là POST (chúng gác bằng khẳng định
      // danh tính trong body). Chỉ đọc query thì giới hạn im lặng không bao giờ
      // kích hoạt trên đúng những endpoint quản trị cần nó nhất.
      const q = (req.query as Record<string, unknown> | undefined)?.page_size;
      const b = (req.body as Record<string, unknown> | undefined)?.page_size;
      const n = parseInt(String(q ?? b ?? ''), 10);
      return Number.isFinite(n) && n >= threshold;
    },
    keyOf: (req) => {
      const who = opts.identify?.(req);
      return who ? `u:${who}` : `ip:${callerIp(req)}`;
    },
  });
}
