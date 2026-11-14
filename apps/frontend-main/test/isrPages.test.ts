// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Trang ĐỌC công khai phải là ISR, không phải SSR (kế hoạch Q4/2026 §6.4).
 *
 * Vì sao canh bằng quét NGUỒN: một trang quay lại getServerSideProps vẫn chạy
 * hoàn hảo ở dev, ở CI, ở E2E - chỉ khác là MỖI lượt xem trên production lại đi
 * Worker → Render → Neon. Không cổng nào đỏ; hoá đơn là hạn mức compute của
 * database, và ngày nó cạn thì cả site trống (sự cố 28/10/2026).
 *
 * Danh sách CỐ Ý đóng. KHÔNG thêm trang phụ thuộc người dùng hay tham số vào
 * đây (/search, /login, /settings/*, /admin/*): cache một trang per-user là lỗ
 * rò dữ liệu.
 */
const ROOT = join(__dirname, '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const ISR_PAGES = [
  'pages/index.tsx',
  'pages/blog/index.tsx',
  'pages/blog/[slug].tsx',
  'pages/docs/index.tsx',
  'pages/docs/[slug].tsx',
  'pages/projects/index.tsx',
  'pages/projects/[slug].tsx',
];

describe('trang đọc công khai là ISR', () => {
  test.each(ISR_PAGES)('%s dùng getStaticProps, không dùng getServerSideProps', (p) => {
    const src = read(p);
    expect(src).not.toMatch(/export\s+(async\s+)?function\s+getServerSideProps/);
    expect(src).toMatch(/export\s+async\s+function\s+getStaticProps/);
  });

  // HTML ISR có thể cũ hàng giờ; trình duyệt hydrate với giờ HIỆN TẠI. Chữ phụ thuộc
  // đồng hồ (Date.now(), "x ngày trước") lệch hai bên ⇒ React #418 - đã đo trên
  // production 14/11/2026 ở /blog. Ngày hiển thị phải là ngày tuyệt đối (lib/format).
  test.each(ISR_PAGES)('%s không render chữ phụ thuộc đồng hồ (Date.now/"trước")', (p) => {
    const src = read(p);
    expect(src).not.toMatch(/Date\.now\(\)/);
    expect(src).not.toMatch(/(phút|giờ|ngày) trước/);
  });

  test.each(ISR_PAGES)('%s đi qua keepStaleOnFailure - lỗi không ghi đè bản cache tốt', (p) => {
    // Trả props `failed: true` mà không ném thì Next CACHE LUÔN trang lỗi, và nó
    // sống tới lượt dựng lại sau - đúng thứ cache ở biên sinh ra để chặn.
    expect(read(p)).toMatch(/keepStaleOnFailure\(/);
  });

  test.each(ISR_PAGES.filter((p) => p.includes('[slug]')))(
    '%s dựng theo yêu cầu (fallback blocking), không khung rỗng',
    (p) => {
      expect(read(p)).toMatch(/fallback:\s*'blocking'/);
    }
  );
});

describe('hạ tầng cache ở biên', () => {
  test('open-next.config.ts bật R2 incremental cache và hàng đợi dựng lại', () => {
    const cfg = read('open-next.config.ts');
    expect(cfg).toMatch(/^\s*incrementalCache:\s*r2IncrementalCache/m);
    expect(cfg).toMatch(/^\s*queue:\s*memoryQueue/m);
  });

  test('wrangler.jsonc khai binding R2 đúng tên OpenNext đọc', () => {
    expect(read('wrangler.jsonc')).toMatch(/"binding":\s*"NEXT_INC_CACHE_R2_BUCKET"/);
    // memoryQueue gọi lại chính Worker qua binding này.
    expect(read('wrangler.jsonc')).toMatch(/"binding":\s*"WORKER_SELF_REFERENCE"/);
  });
});

describe('lib/isr.ts - lỗi lúc chạy GIỮ bản cũ', () => {
  const load = () => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../lib/isr') as typeof import('../lib/isr');
  };
  const prev = process.env.NEXT_PHASE;
  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = prev;
  });

  test('thành công ⇒ nhịp dựng lại bình thường', () => {
    const isr = load();
    expect(isr.keepStaleOnFailure(false, '/x')).toBe(isr.REVALIDATE_SECONDS);
  });

  test('thất bại lúc chạy ⇒ NÉM, để Next giữ bản cache tốt', () => {
    delete process.env.NEXT_PHASE;
    const isr = load();
    expect(() => isr.keepStaleOnFailure(true, '/x')).toThrow(/giữ bản cache/);
  });

  test('thất bại lúc build ⇒ không ném (build không hỏng), nhịp dựng lại ngắn', () => {
    process.env.NEXT_PHASE = 'phase-production-build';
    const isr = load();
    expect(isr.keepStaleOnFailure(true, '/x')).toBe(isr.REVALIDATE_ON_FAILURE_SECONDS);
  });
});
