/**
 * CP1 (ADR-0005 mục 5): chữ ký biên `X-Tsu-Edge` cho lượt Worker cron → backend Render.
 *
 * `X-Tsu-Edge: <ts>.<base64url HMAC-SHA256(EDGE_SIGNING_KEY, "<ts>.<METHOD>.<pathname>")>` - PHẢI khớp
 * `edgeSigningInput` của `@tsudev/auth` (packages/auth/src/edge.ts) từng byte; cả hai có chung vectơ thử.
 * WebCrypto (không node:crypto) để Worker này không phụ thuộc gói nào của monorepo.
 * Không có khoá ⇒ gửi như cũ (backend ở chế độ `ghi` chỉ đếm; ở `chan` sẽ 403 - đặt secret trước khi chuyển).
 */
const b64url = (buf: ArrayBuffer): string => {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export async function kyBien(
  key: string,
  method: string,
  url: string,
  nowMs = Date.now()
): Promise<string> {
  const ts = Math.floor(nowMs / 1000);
  const pathname = new URL(url).pathname;
  const k = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    k,
    new TextEncoder().encode(`${ts}.${method.toUpperCase()}.${pathname}`)
  );
  return `${ts}.${b64url(mac)}`;
}

/** Bọc `fetch`: thêm `x-tsu-edge` khi có khoá. Dùng làm `fetchFn` cho các lượt gọi backend. */
export function fetchCoKy(key: string | undefined, fetchFn: typeof fetch = fetch): typeof fetch {
  if (!key) return fetchFn;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || (input instanceof Request ? input.method : 'GET');
    const headers = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined)
    );
    headers.set('x-tsu-edge', await kyBien(key, method, url));
    return fetchFn(input, { ...init, headers });
  }) as typeof fetch;
}
