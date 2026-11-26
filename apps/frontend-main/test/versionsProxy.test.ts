// INT1-a: `/.well-known/tsudev/versions.json(.sig)` + JWKS đi qua route proxy, BYTE NGUYÊN
// VĂN (chữ ký phủ đúng từng byte - serialize lại là app bỏ bản kê), `.json` và `.sig` lấy
// THEO CẶP, upstream hỏng thì phục vụ cặp cũ. Đo luật rewrite bằng chính bộ so khớp của Next.
export {};

/* eslint-disable @typescript-eslint/no-require-imports */
const config = require('../next.config.js');
const { getPathMatch } = require('next/dist/shared/lib/router/utils/path-match');
const { prepareDestination } = require('next/dist/shared/lib/router/utils/prepare-destination');
/* eslint-enable @typescript-eslint/no-require-imports */

import handler, { _clearVersionsCache } from '../pages/api/versions/[...path]';

type Rule = { source: string; destination: string };

test('rewrite: ba tệp bản kê tới /api/versions/<tệp>, tệp khác dưới /.well-known/tsudev thì không', async () => {
  const r = (await config.rewrites()) as { afterFiles: Rule[] };
  const rule = r.afterFiles.find((x) => x.source.startsWith('/.well-known/tsudev/'))!;
  const match = getPathMatch(rule.source, { removeUnnamedParams: true, strict: true });
  const dest = (p: string) => {
    const params = match(p);
    if (!params) return null;
    return prepareDestination({
      appendParamsToQuery: false,
      destination: rule.destination,
      params,
      query: {},
    }).parsedDestination.pathname;
  };
  expect(dest('/.well-known/tsudev/versions.json')).toBe('/api/versions/versions.json');
  expect(dest('/.well-known/tsudev/versions.json.sig')).toBe('/api/versions/versions.json.sig');
  expect(dest('/.well-known/tsudev/versions-jwks.json')).toBe('/api/versions/versions-jwks.json');
  expect(dest('/.well-known/tsudev/khac.json')).toBeNull();
});

function mockRes() {
  const out: { status?: number; body?: unknown; headers: Record<string, string> } = { headers: {} };
  const res = {
    setHeader: (k: string, v: string) => ((out.headers[k.toLowerCase()] = v), res),
    status: (s: number) => ((out.status = s), res),
    send: (b: unknown) => ((out.body = b), res),
    json: (b: unknown) => ((out.body = b), res),
  };
  return { res, out };
}
const call = async (method: string, path: string[], extra: Record<string, unknown> = {}) => {
  const { res, out } = mockRes();
  await handler({ method, query: { path }, headers: {}, ...extra } as never, res as never);
  return out;
};

const BODY = '{"v":1,"issued_at":1,"expires_at":604801,"products":{}}';
const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  _clearVersionsCache();
});

test('trả byte nguyên văn + lấy theo cặp + phục vụ cặp cũ khi upstream hỏng', async () => {
  const fetchMock = jest.fn(async (u: string) => {
    const text = u.endsWith('.sig') ? 'aGVhZA..c2ln' : BODY;
    return new Response(text, { status: 200 });
  });
  global.fetch = fetchMock as never;
  const b = await call('GET', ['versions.json']);
  expect(b.status).toBe(200);
  expect(Buffer.isBuffer(b.body) && (b.body as Buffer).toString()).toBe(BODY);
  expect(b.headers['cache-control']).toBe('public, max-age=300');
  const s = await call('GET', ['versions.json.sig']);
  expect((s.body as Buffer).toString()).toBe('aGVhZA..c2ln');
  expect(fetchMock).toHaveBeenCalledTimes(3); // một cặp (json, sig, json kiểm lại), sig lấy từ đệm

  global.fetch = jest.fn(async () => new Response('down', { status: 503 })) as never;
  jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 10 * 60_000);
  const stale = await call('GET', ['versions.json']);
  expect(stale.status).toBe(200);
  expect((stale.body as Buffer).toString()).toBe(BODY);
  jest.restoreAllMocks();
});

test('chưa có bản nào + upstream hỏng ⇒ 503 Retry-After', async () => {
  global.fetch = jest.fn(async () => new Response('x', { status: 503 })) as never;
  const r = await call('GET', ['versions.json']);
  expect(r.status).toBe(503);
  expect(r.headers['retry-after']).toBe('300');
});

test('POST raise: thiếu token 401, đích sai 400, đường lạ 404', async () => {
  expect((await call('POST', ['raise', 'qulythuchi', 'github'], { body: {} })).status).toBe(401);
  expect((await call('POST', ['raise', 'Q!', 'github'], { body: {} })).status).toBe(400);
  expect((await call('GET', ['khac.json'])).status).toBe(404);
});
