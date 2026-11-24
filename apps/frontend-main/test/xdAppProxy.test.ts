/**
 * QR2b - BFF `/api/xd/*` với `Authorization: Bearer` (app đã đăng nhập làm vai xác nhận, CROSS_DEVICE_LOGIN mục 1).
 *
 * Canh: chỉ `scan|approve|deny` đi tới `/ent/xd/*`; KHÔNG kèm cookie phiên hay INTERNAL_API_TOKEN; hành động của
 * thiết bị mới (`verify`, `create-pull`...) không đi đường Bearer.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '../pages/api/xd/[...path]';

type Call = { url: string; init: RequestInit };

function fakeRes() {
  const r = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
    status(c: number) {
      r.statusCode = c;
      return r;
    },
    json(b: unknown) {
      r.body = b;
      return r;
    },
    send(b: unknown) {
      r.body = b;
      return r;
    },
    setHeader(k: string, v: unknown) {
      r.headers[k.toLowerCase()] = v;
      return r;
    },
  };
  return r;
}

const calls: Call[] = [];
beforeEach(() => {
  calls.length = 0;
  process.env.INTERNAL_API_TOKEN = 'noi-bo';
  globalThis.fetch = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ code: 'ABCD-EFGH' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
});

const call = (path: string, headers: Record<string, string>) => {
  const res = fakeRes();
  return handler(
    {
      method: 'POST',
      query: { path: [path] },
      headers: { 'cf-ipcountry': 'VN', cookie: 'tsudev.session-token=bi-mat', ...headers },
      body: { id: 'x'.repeat(22) },
      socket: {},
    } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  ).then(() => res);
};

test.each(['scan', 'approve', 'deny'])(
  'Bearer + %s ⇒ /ent/xd, không cookie, không token nội bộ',
  async (a) => {
    const res = await call(a, { authorization: 'Bearer tok' });
    expect(res.statusCode).toBe(200);
    expect(calls).toHaveLength(1);
    const first = calls[0]!;
    expect(first.url).toMatch(new RegExp(`/ent/xd/${a}$`));
    const h = first.init.headers as Record<string, string>;
    expect(h.authorization).toBe('Bearer tok');
    expect(h['cf-ipcountry']).toBe('VN');
    expect(Object.keys(h).map((k) => k.toLowerCase())).not.toEqual(
      expect.arrayContaining(['cookie', 'x-internal-token'])
    );
    expect(JSON.stringify(h)).not.toContain('noi-bo');
  }
);

test.each(['verify', 'create-pull', 'create-push', 'peek'])(
  'Bearer + %s ⇒ 404, không gọi xuống',
  async (a) => {
    const res = await call(a, { authorization: 'Bearer tok' });
    expect(res.statusCode).toBe(404);
    expect(calls).toHaveLength(0);
  }
);
