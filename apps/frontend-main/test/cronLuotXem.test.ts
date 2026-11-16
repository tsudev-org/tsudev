// Gộp lượt xem D1 → Neon của Worker cron (infrastructure/canh-site-cron/src/luotXem.ts).
//
// Canh: chỉ gắn vào nhịp thưa; không có dòng ⇒ KHÔNG gọi backend (không đánh thức
// Neon); backend hỏng ⇒ KHÔNG xoá D1 (không mất lượt xem); chỉ gộp ngày đã qua.
import { readFileSync } from 'fs';
import { join } from 'path';
import { gopLuotXem, ngayVN } from '../../../infrastructure/canh-site-cron/src/luotXem';

const src = readFileSync(
  join(__dirname, '../../../infrastructure/canh-site-cron/src/index.ts'),
  'utf8'
);

function fakeDb(rows: Array<{ day: string; slug: string; count: number }>) {
  const calls: Array<{ sql: string; v: unknown[] }> = [];
  return {
    calls,
    prepare: (sql: string) => ({
      bind: (...v: unknown[]) => ({
        all: async () => {
          calls.push({ sql, v });
          return { results: rows as never[] };
        },
        run: async () => {
          calls.push({ sql, v });
        },
      }),
    }),
  };
}

const NOW = new Date('2026-11-16T06:23:00Z'); // 13:23 giờ VN ngày 16/11

test('chỉ ở nhịp thưa, cùng các lượt chạm database khác', () => {
  expect(src).toMatch(/kiemToanVenPhatHanh\(env\),\s*gopLuotXemBai\(env\)/);
  const keepWarm = src.slice(src.indexOf('async function keepWarm'));
  expect(keepWarm.slice(0, keepWarm.indexOf('\n}\n'))).not.toMatch(/gopLuotXem/);
});

test('thiếu binding/secret ⇒ bỏ qua, có lý do', async () => {
  expect(await gopLuotXem(undefined, 'https://b', { views: 't' }, NOW)).toEqual({
    chay: false,
    lyDo: 'thiếu binding VIEWS_DB',
  });
  expect((await gopLuotXem(fakeDb([]), 'https://b', {}, NOW)).chay).toBe(false);
});

test('không có dòng ⇒ không gọi backend', async () => {
  const f = jest.fn();
  const db = fakeDb([]);
  const kq = await gopLuotXem(db, 'https://b', { views: 't' }, NOW, f as never);
  expect(kq).toEqual({ chay: true, ok: true, dong: 0, ghi: 0, boQua: 0 });
  expect(f).not.toHaveBeenCalled();
  expect(db.calls[0]?.v).toEqual([ngayVN(NOW)]);
  expect(ngayVN(NOW)).toBe('2026-11-16');
});

test('gửi một lô có token, rồi mới xoá đúng các dòng đã gửi', async () => {
  const db = fakeDb([
    { day: '2026-11-15', slug: 'a', count: 3 },
    { day: '2026-11-15', slug: 'b', count: 1 },
  ]);
  const f = jest.fn(async () => new Response(JSON.stringify({ nhan: 2, ghi: 2, boQua: 0 })));
  const kq = await gopLuotXem(db, 'https://b', { views: 'tok' }, NOW, f as never);
  expect(kq).toEqual({ chay: true, ok: true, dong: 2, ghi: 2, boQua: 0 });
  const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://b/api/internal/post-views');
  expect((init.headers as Record<string, string>)['x-post-views-token']).toBe('tok');
  expect(JSON.parse(String(init.body)).items).toHaveLength(2);
  const del = db.calls.find((c) => c.sql.startsWith('DELETE'));
  expect(del?.v).toEqual(['2026-11-15', 'a', 'b']);
});

test('backend hỏng ⇒ KHÔNG xoá D1', async () => {
  const db = fakeDb([{ day: '2026-11-15', slug: 'a', count: 3 }]);
  const f = jest.fn(async () => new Response('down', { status: 503 }));
  const kq = await gopLuotXem(db, 'https://b', { views: 'tok' }, NOW, f as never);
  expect(kq.chay && !kq.ok).toBe(true);
  expect(db.calls.some((c) => c.sql.startsWith('DELETE'))).toBe(false);
});
