// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Slug ISR CHƯA từng vào cache + backend chết ⇒ 503 + trang thân thiện, không
 * phải 500 trần, và KHÔNG cache trang lỗi (phiếu 20261105-02 §3b).
 *
 * Canh hai tầng: logic chọn mã (unit, `lib/isr.ts`) và việc nối dây (quét nguồn
 * `pages/_error.tsx`) - ở dev Next vẽ lớp phủ lỗi thay cho `_error`, nên nối dây
 * hỏng không hiện ra ở dev lẫn E2E.
 */
const ROOT = join(__dirname, '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const fakeRes = (statusCode = 500) => {
  const headers: Record<string, string> = {};
  return {
    statusCode,
    headers,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
  };
};

describe('resolveErrorStatus', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const isr = require('../lib/isr') as typeof import('../lib/isr');

  test('lỗi do keepStaleOnFailure ⇒ 503 + Retry-After', () => {
    const res = fakeRes();
    let err: unknown;
    try {
      delete process.env.NEXT_PHASE;
      isr.keepStaleOnFailure(true, '/blog/[slug]');
    } catch (e) {
      err = e;
    }
    expect(isr.resolveErrorStatus(res, err)).toBe(503);
    expect(res.statusCode).toBe(503);
    expect(res.headers['retry-after']).toBe(String(isr.RETRY_AFTER_SECONDS));
  });

  test('nhận ra bằng `code` dù lớp đã bị bundler đổi tên', () => {
    const res = fakeRes();
    const e = Object.assign(new Error('x'), { code: isr.UPSTREAM_UNAVAILABLE, name: 'a' });
    expect(isr.resolveErrorStatus(res, e)).toBe(503);
  });

  test('bug thật KHÔNG bị ngụy trang thành 503', () => {
    const res = fakeRes(500);
    expect(isr.resolveErrorStatus(res, new TypeError('boom'))).toBe(500);
    expect(res.statusCode).toBe(500);
    expect(res.headers['retry-after']).toBeUndefined();
  });

  test('phía client (không có res) không ném và không đổi mã', () => {
    expect(isr.resolveErrorStatus(undefined, { statusCode: 404 })).toBe(404);
    expect(isr.resolveErrorStatus(undefined, null)).toBe(500);
  });
});

describe('nối dây trang lỗi', () => {
  test('pages/_error.tsx dùng resolveErrorStatus trong getInitialProps', () => {
    const src = read('pages/_error.tsx');
    expect(src).toMatch(/getInitialProps/);
    expect(src).toMatch(/resolveErrorStatus\(res, err\)/);
  });

  test('KHÔNG có pages/500.tsx - nó sẽ chặn _error và nuốt mất mã 503', () => {
    // Next ưu tiên trang /500 tĩnh hơn _error cho mọi lỗi 500, nên getInitialProps
    // của _error không bao giờ chạy và mã 503 biến mất - im lặng.
    expect(existsSync(join(ROOT, 'pages/500.tsx'))).toBe(false);
  });

  test('pages/404.tsx tồn tại và tĩnh - 404 không đi qua _error động', () => {
    const src = read('pages/404.tsx');
    expect(src).not.toMatch(
      /\.getInitialProps\s*=|export\s+(async\s+)?function\s+getServerSideProps/
    );
  });
});
