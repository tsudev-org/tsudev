/**
 * Kiểm thử THEO TÍNH CHẤT (fast-check) cho ranh giới XSS của `lib/md.ts`.
 *
 * `md.test.ts` liệt kê các vector đã biết; tệp này hỏi câu ngược lại: với hàng
 * nghìn đầu vào ngẫu nhiên - kể cả những chuỗi không ai nghĩ ra - các bất biến
 * bảo mật có còn đúng không. Đầu ra của `renderMarkdown` đi thẳng vào
 * `dangerouslySetInnerHTML`, và `slugifyHeading` đi vào thuộc tính `id="..."`.
 *
 * Bộ sinh trộn các mảnh nguy hiểm (`<script`, `javascript:`, nháy, `onerror=`)
 * với chuỗi bất kỳ, để fast-check co nhỏ phản ví dụ về dạng tối thiểu khi có lỗi.
 */
import fc from 'fast-check';
import { renderMarkdown, slugifyHeading } from '../lib/md';

const DANGER_PIECES = [
  '<',
  '>',
  '<script>',
  '</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  'javascript:',
  'JaVaScRiPt:',
  'vbscript:',
  'data:text/html,',
  '"',
  "'",
  ' onmouseover=',
  '[x](',
  ')',
  '```',
  '\n',
  '# ',
  '&#60;',
  '&lt;',
];

/** Chuỗi ghép từ mảnh nguy hiểm và văn bản bất kỳ (kể cả Unicode). */
const hostile = fc
  .array(
    fc.oneof(fc.constantFrom(...DANGER_PIECES), fc.string(), fc.string({ unit: 'grapheme' })),
    {
      maxLength: 12,
    }
  )
  .map((parts) => parts.join(''));

const RUNS = { numRuns: 500 };

describe('slugifyHeading - tính chất', () => {
  test('chỉ gồm [a-z0-9-], không gạch đầu/cuối, tối đa 80 ký tự', () => {
    fc.assert(
      fc.property(hostile, (input) => {
        const slug = slugifyHeading(input);
        expect(slug).toMatch(/^[a-z0-9-]*$/);
        expect(slug.startsWith('-') || slug.endsWith('-')).toBe(false);
        expect(slug.length).toBeLessThanOrEqual(80);
      }),
      RUNS
    );
  });

  test('ổn định: slug của slug là chính nó', () => {
    fc.assert(
      fc.property(hostile, (input) => {
        const slug = slugifyHeading(input);
        expect(slugifyHeading(slug)).toBe(slug);
      }),
      RUNS
    );
  });
});

describe('renderMarkdown - tính chất', () => {
  test('không bao giờ sinh thẻ thực thi được', () => {
    fc.assert(
      fc.property(hostile, (input) => {
        const html = renderMarkdown(input);
        expect(html).not.toMatch(/<(script|img|svg|iframe|object|embed|style)\b/i);
      }),
      RUNS
    );
  });

  test('không bao giờ sinh thuộc tính sự kiện hay URL thực thi trong thẻ', () => {
    fc.assert(
      fc.property(hostile, (input) => {
        const html = renderMarkdown(input);
        // Chỉ xét phần BÊN TRONG thẻ: văn bản đã thoát có thể chứa "onerror="
        // một cách vô hại.
        for (const tag of html.match(/<[a-z][^>]*>/gi) ?? []) {
          // Thuộc tính sự kiện là một TÊN thuộc tính, nên xét thẻ sau khi đã
          // làm rỗng các giá trị có nháy. Bản đầu quét cả giá trị và đỏ ngẫu
          // nhiên theo seed: `[x](# <img src=x onerror=alert(1)>` cho ra
          // `<a href="# &lt;img src=x onerror=alert(1">` - vô hại, vì `"` và
          // `<` đã thoát nên chữ "onerror=" không thoát được khỏi giá trị href.
          // Nếu một giá trị mở nháy mà không đóng, phần thừa vẫn nằm lại và bị xét.
          // Ranh giới gồm cả nháy: trình duyệt đọc `href="#"onclick=x` là HAI
          // thuộc tính dù thiếu khoảng trắng - bản đầu (`\s` trước `on`) bỏ lọt.
          const names = tag.replace(/"[^"]*"|'[^']*'/g, '""');
          expect(names).not.toMatch(/[\s"'/]on\w+\s*=/i);
          expect(tag).not.toMatch(/(href|src)\s*=\s*["']?\s*(javascript|vbscript|data):/i);
        }
      }),
      {
        ...RUNS,
        examples: [['[x](# <img src=x onerror=alert(1)>'], ['[x](# " onerror=alert(1) ")']],
      }
    );
  });
});
