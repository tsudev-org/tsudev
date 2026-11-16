/**
 * Lượt xem bài (lib/luotXem.ts + pages/api/views.ts).
 *
 * Canh: beacon KHÔNG chạm backend (chỉ D1), một (ngày, bài, khách) là một dòng,
 * không lưu IP, bot / cross-site / slug xấu bị bỏ qua, và lỗi D1 không làm hỏng trang.
 */
const ctx: { env: Record<string, unknown> } = { env: {} };
jest.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: () => ctx }));

import { readFileSync } from 'fs';
import { join } from 'path';
import handler from '../pages/api/views';
import { docSlug, laBot, maKhach, ngayVN } from '../lib/luotXem';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

function fakeDb() {
  const rows: unknown[][] = [];
  return {
    rows,
    prepare: (sql: string) => ({
      bind: (...v: unknown[]) => ({
        run: async () => {
          expect(sql).toMatch(/^INSERT OR IGNORE INTO luot_xem/);
          rows.push(v);
        },
      }),
    }),
  };
}

async function goi(opts: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  const req = {
    method: opts.method || 'POST',
    body: opts.body,
    headers: { 'user-agent': UA, 'cf-connecting-ip': '203.0.113.7', ...opts.headers },
    socket: {},
  };
  let status = 0;
  const res = {
    setHeader: () => res,
    status: (s: number) => {
      status = s;
      return res;
    },
    end: () => res,
  };
  await handler(req as never, res as never);
  return status;
}

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = 'khoa-test-luot-xem';
  ctx.env = {};
});

test('ngày theo giờ Việt Nam', () => {
  expect(ngayVN(new Date('2026-11-15T16:59:00Z'))).toBe('2026-11-15');
  expect(ngayVN(new Date('2026-11-15T17:00:00Z'))).toBe('2026-11-16');
});

test('docSlug nhận chuỗi JSON hoặc object, từ chối slug xấu', () => {
  expect(docSlug('{"slug":"bai-viet-1"}')).toBe('bai-viet-1');
  expect(docSlug({ slug: 'bai-viet-1' })).toBe('bai-viet-1');
  expect(docSlug('{"slug":"../x"}')).toBeNull();
  expect(docSlug('{"slug":"A"}')).toBeNull();
  expect(docSlug('không phải json')).toBeNull();
  expect(docSlug({ slug: 'x'.repeat(161) })).toBeNull();
});

test('laBot', () => {
  expect(laBot(UA)).toBe(false);
  expect(laBot('Googlebot/2.1')).toBe(true);
  expect(laBot('HeadlessChrome/131')).toBe(true);
  expect(laBot('')).toBe(true);
});

test('mã khách không chứa IP, ổn định, đổi theo khoá', async () => {
  const a = await maKhach('k1', '203.0.113.7', UA);
  expect(a).toMatch(/^[0-9a-f]{32}$/);
  expect(a).not.toContain('203');
  expect(await maKhach('k1', '203.0.113.7', UA)).toBe(a);
  expect(await maKhach('k2', '203.0.113.7', UA)).not.toBe(a);
});

test('beacon hợp lệ ⇒ đúng một dòng D1 (ngày, slug, khách) và 204', async () => {
  const db = fakeDb();
  ctx.env = { VIEWS_DB: db };
  expect(
    await goi({ body: '{"slug":"bai-viet-1"}', headers: { 'sec-fetch-site': 'same-origin' } })
  ).toBe(204);
  expect(db.rows).toHaveLength(1);
  const [ngay, slug, khach] = db.rows[0] as string[];
  expect(ngay).toBe(ngayVN());
  expect(slug).toBe('bai-viet-1');
  expect(khach).toMatch(/^[0-9a-f]{32}$/);
});

test.each([
  ['GET', { method: 'GET', body: '{"slug":"a"}' }, 405],
  ['bot', { body: '{"slug":"a"}', headers: { 'user-agent': 'Googlebot' } }, 204],
  ['cross-site', { body: '{"slug":"a"}', headers: { 'sec-fetch-site': 'cross-site' } }, 204],
  ['slug xấu', { body: '{"slug":"<x>"}' }, 204],
])('%s ⇒ không ghi', async (_t, opts, code) => {
  const db = fakeDb();
  ctx.env = { VIEWS_DB: db };
  expect(await goi(opts as never)).toBe(code);
  expect(db.rows).toHaveLength(0);
});

test('không có binding (dev) hoặc D1 lỗi ⇒ vẫn 204', async () => {
  expect(await goi({ body: '{"slug":"a"}' })).toBe(204);
  ctx.env = {
    VIEWS_DB: {
      prepare: () => ({
        bind: () => ({
          run: async () => {
            throw new Error('D1 hết hạn mức');
          },
        }),
      }),
    },
  };
  const err = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(await goi({ body: '{"slug":"a"}' })).toBe(204);
  expect(err).toHaveBeenCalled();
  err.mockRestore();
});

test('route KHÔNG gọi backend (lượt xem không được đánh thức Neon)', () => {
  const src = readFileSync(join(__dirname, '../pages/api/views.ts'), 'utf8');
  expect(src).not.toMatch(/lib\/(api|bff|services)|fetch\(/);
});
