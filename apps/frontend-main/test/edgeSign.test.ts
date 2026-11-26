// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

import { edgeHeaders, internalHeaders } from '../lib/services';
import { kyBien } from '../../../infrastructure/canh-site-cron/src/edge';

/**
 * CP1 - chữ ký biên `X-Tsu-Edge` (ADR-0005 mục 5). Vectơ dưới đây PHẢI trùng
 * `services/content-service/test/edgeGuard.test.ts`: bên kiểm (@tsudev/auth, Node), bên ký Worker Next
 * (node:crypto) và bên ký Worker cron (WebCrypto) khớp nhau qua đúng hai chuỗi này.
 */
const KEY = 'tsu-edge-vector-key';
const NOW = 1764100000_000;
const VECTOR_POST = '1764100000.OXHN5jZBVaEJsftcHWL-ICHATMLriSmXaxCx-lHmTj4';
const VECTOR_GET = '1764100000.Vn1-eCkSGQBlnerVWPNDQav3JPY-J-L8hdy0Mz8neWY';
const BASE = 'https://tsudev-backend.onrender.com';

afterEach(() => {
  delete process.env.EDGE_SIGNING_KEY;
  delete process.env.INTERNAL_API_TOKEN;
});

describe('edgeHeaders (Worker Next)', () => {
  test('không có khoá ⇒ không header (dev/CI)', () => {
    expect(edgeHeaders('GET', `${BASE}/api/posts`)).toEqual({});
  });

  test('ký đúng vectơ chung; query không nằm trong chữ ký', () => {
    process.env.EDGE_SIGNING_KEY = KEY;
    expect(edgeHeaders('GET', `${BASE}/api/posts?limit=3`, NOW)).toEqual({
      'x-tsu-edge': VECTOR_GET,
    });
    expect(edgeHeaders('post', `${BASE}/api/internal/post-views`, NOW)).toEqual({
      'x-tsu-edge': VECTOR_POST,
    });
  });

  test('internalHeaders gộp token tĩnh + chữ ký', () => {
    process.env.EDGE_SIGNING_KEY = KEY;
    process.env.INTERNAL_API_TOKEN = 't';
    const h = internalHeaders('GET', `${BASE}/api/posts`);
    expect(h['x-internal-token']).toBe('t');
    expect(h['x-tsu-edge']).toMatch(/^\d+\.[A-Za-z0-9_-]{43}$/);
  });
});

describe('kyBien (Worker cron, WebCrypto)', () => {
  test('ký đúng vectơ chung', async () => {
    expect(await kyBien(KEY, 'POST', `${BASE}/api/internal/post-views`, NOW)).toBe(VECTOR_POST);
    expect(await kyBien(KEY, 'GET', `${BASE}/api/posts?x=1`, NOW)).toBe(VECTOR_GET);
  });
});

/**
 * Quét NGUỒN: mọi tệp gọi backend (`${CONTENT}`/`${IDENTITY}`/`${STORAGE}`) phải ký. Thiếu ở một proxy mới thì ở
 * chế độ `ghi` chỉ là bộ đếm `thieu` tăng, nhưng sang `chan` thì đường đó 403 trên production - không test E2E
 * nào bắt được vì dev không đặt khoá.
 */
describe('mọi lượt gọi backend đều ký', () => {
  const root = join(__dirname, '..');
  const files: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(n)) files.push(p);
    }
  };
  walk(join(root, 'pages'));
  walk(join(root, 'lib'));

  const callers = files.filter((f) =>
    /\$\{(CONTENT|IDENTITY|STORAGE)\}/.test(readFileSync(f, 'utf8'))
  );

  test('có tệp gọi backend để quét', () => {
    expect(callers.length).toBeGreaterThan(10);
  });

  test.each(callers.map((f) => [relative(root, f)]))('%s ký X-Tsu-Edge', (rel) => {
    const src = readFileSync(join(root, rel), 'utf8');
    expect(/\b(internalHeaders|edgeHeaders)\(/.test(src)).toBe(true);
    // Lượt gọi backend = fetch thẳng tới `${X}` hoặc `const url = `${X}...`` rồi fetch(url).
    const fetches = (src.match(/(fetch\(|const url = )`\$\{(CONTENT|IDENTITY|STORAGE)\}/g) || [])
      .length;
    const signs = (src.match(/\b(internalHeaders|edgeHeaders)\((?!\))/g) || []).length;
    // lib/api.ts dồn mọi lượt qua getJSON() nên một chữ ký phủ hết; ở tệp khác mỗi fetch một chữ ký.
    if (!rel.endsWith('lib/api.ts')) expect(signs).toBeGreaterThanOrEqual(fetches);
  });
});
