// VS1 mục 4 (CP4): Worker cron canh bản kê phiên bản khác 200 và báo động; chỉ ở nhịp thưa.
import { readFileSync } from 'fs';
import { join } from 'path';
import { kiemPhienBan } from '../../../infrastructure/canh-site-cron/src/kiemPhienBan';

const src = readFileSync(
  join(__dirname, '../../../infrastructure/canh-site-cron/src/index.ts'),
  'utf8'
);

test('200 cả hai tệp ⇒ ok; gọi đúng đường app ghim', async () => {
  const urls: string[] = [];
  const kq = await kiemPhienBan('https://tsudev.com/', (async (u: string) => {
    urls.push(u);
    return new Response('x', { status: 200 });
  }) as never);
  expect(kq).toEqual({ chay: true, ok: true, lyDo: 'ok' });
  expect(urls).toEqual([
    'https://tsudev.com/.well-known/tsudev/versions.json',
    'https://tsudev.com/.well-known/tsudev/versions.json.sig',
  ]);
});

test('503 hoặc lỗi mạng ⇒ không ok kèm lý do; thiếu SITE_URL ⇒ không chạy', async () => {
  const kq = await kiemPhienBan('https://tsudev.com', (async (u: string) => {
    if (u.endsWith('.sig')) throw new Error('mạng');
    return new Response('x', { status: 503 });
  }) as never);
  expect(kq.chay && !kq.ok).toBe(true);
  expect(kq.lyDo).toMatch(/versions\.json HTTP 503/);
  expect(kq.lyDo).toMatch(/versions\.json\.sig mạng/);
  expect(await kiemPhienBan('')).toEqual({ chay: false, lyDo: 'thiếu SITE_URL' });
});

test('chỉ gắn vào nhịp thưa và có báo động', () => {
  const nhipThua = src.slice(
    src.indexOf('event.cron === CRON_DEM_NOI_DUNG'),
    src.indexOf(': keepWarm(env)')
  );
  expect(nhipThua).toContain('canhPhienBan(env)');
  expect(src).toMatch(/baoDong\(\s*env,\s*'Bản kê phiên bản'/);
});
