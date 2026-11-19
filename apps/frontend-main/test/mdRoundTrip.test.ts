/**
 * Cổng KHỨ HỒI trình soạn → trang công khai (ADR-0003 mục 5, PG-01, SEC-06).
 *
 * F-P1-01: trình soạn và trang công khai từng dùng HAI bộ hiểu Markdown khác
 * nhau, nên nghiêng/gạch/H4/danh sách số/trích dẫn lưu đúng rồi hiện sai - im
 * lặng, vì test cũ chỉ canh ranh giới XSS chứ không canh độ đủ cú pháp.
 *
 * Tệp này dùng CHÍNH bộ tuần tự hoá của trình soạn (`@tiptap/markdown`, cùng cấu
 * hình extension với `components/MarkdownEditor.tsx`) để sinh Markdown cho từng
 * nút trên thanh công cụ, rồi khẳng định `renderMarkdown` vẽ ra đúng thẻ.
 * Thêm nút mới vào trình soạn mà không thêm ca ở đây ⇒ test "mọi nút có ca" đỏ.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { extractHeadings, renderMarkdown } from '../lib/md';

type Node = Record<string, unknown>;

const manager = new MarkdownManager({
  extensions: [
    StarterKit.configure({
      underline: false,
      link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] },
      heading: { levels: [2, 3, 4] },
    }),
    Image,
  ],
});

const text = (t: string, marks: string[] = []): Node => ({
  type: 'text',
  text: t,
  ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
});
const para = (...content: Node[]): Node => ({ type: 'paragraph', content });
const item = (t: string): Node => ({ type: 'listItem', content: [para(text(t))] });
const toMd = (...content: Node[]): string => manager.serialize({ type: 'doc', content });

/** Mỗi nút thanh công cụ (nhãn y hệt `MarkdownEditor.tsx`) ⇒ tài liệu nó tạo + thẻ phải vẽ ra. */
const BUTTONS: Record<string, { doc: Node[]; expect: RegExp }> = {
  'Đậm (Ctrl+B)': { doc: [para(text('đậm', ['bold']))], expect: /<strong>đậm<\/strong>/ },
  'Nghiêng (Ctrl+I)': { doc: [para(text('nghiêng', ['italic']))], expect: /<em>nghiêng<\/em>/ },
  'Gạch ngang': { doc: [para(text('gạch', ['strike']))], expect: /<del>gạch<\/del>/ },
  'Mã trong dòng': { doc: [para(text('a<b', ['code']))], expect: /<code>a&lt;b<\/code>/ },
  'Tiêu đề cấp 2': {
    doc: [{ type: 'heading', attrs: { level: 2 }, content: [text('Hai')] }],
    expect: /<h2 id="hai">Hai<\/h2>/,
  },
  'Tiêu đề cấp 3': {
    doc: [{ type: 'heading', attrs: { level: 3 }, content: [text('Ba')] }],
    expect: /<h3 id="ba">Ba<\/h3>/,
  },
  'Tiêu đề cấp 4': {
    doc: [{ type: 'heading', attrs: { level: 4 }, content: [text('Bốn')] }],
    expect: /<h4 id="bon">Bốn<\/h4>/,
  },
  'Danh sách chấm': {
    doc: [{ type: 'bulletList', content: [item('một'), item('hai')] }],
    expect: /<ul>\s*<li>một<\/li>\s*<li>hai<\/li>\s*<\/ul>/,
  },
  'Danh sách số': {
    doc: [{ type: 'orderedList', attrs: { start: 1 }, content: [item('một'), item('hai')] }],
    expect: /<ol>\s*<li>một<\/li>\s*<li>hai<\/li>\s*<\/ol>/,
  },
  'Trích dẫn': {
    doc: [{ type: 'blockquote', content: [para(text('lời dẫn'))] }],
    expect: /<blockquote>\s*<p>lời dẫn<\/p>\s*<\/blockquote>/,
  },
  'Khối mã': {
    doc: [{ type: 'codeBlock', attrs: { language: 'bash' }, content: [text('ls -la')] }],
    expect:
      /<div class="code-lang">bash<\/div><pre><code class="language-bash">ls -la<\/code><\/pre>/,
  },
  'Đường phân cách': {
    doc: [para(text('a')), { type: 'horizontalRule' }, para(text('b'))],
    expect: /<hr>/,
  },
  'Liên kết': {
    doc: [
      para({
        type: 'text',
        text: 'tsudev',
        marks: [{ type: 'link', attrs: { href: 'https://tsudev.com/blog' } }],
      }),
    ],
    expect: /<a href="https:\/\/tsudev\.com\/blog">tsudev<\/a>/,
  },
  Ảnh: {
    doc: [
      {
        type: 'image',
        attrs: { src: 'https://media.tsudev.com/a.webp', alt: 'Mô tả', title: 'Chú thích' },
      },
    ],
    expect:
      /<figure class="md-figure"><img src="https:\/\/media\.tsudev\.com\/a\.webp" alt="Mô tả"[^>]*><figcaption>Chú thích<\/figcaption><\/figure>/,
  },
};

/** Nút không sinh nội dung - không cần ca. */
const NON_CONTENT = new Set(['Hoàn tác (Ctrl+Z)', 'Làm lại (Ctrl+Shift+Z)']);

describe('khứ hồi: mỗi nút của trình soạn vẽ đúng thẻ trên trang công khai', () => {
  test('mọi nút trên thanh công cụ đều có ca trong test này', () => {
    const src = readFileSync(join(__dirname, '../components/MarkdownEditor.tsx'), 'utf8');
    const labels = [...src.matchAll(/<Btn\s+label="([^"]+)"/g)].map((m) => m[1] as string);
    const levels = /\(\[([\d,\s]+)\] as const\)\.map\(\(level\)/.exec(src)?.[1] ?? '';
    for (const l of levels.split(',')) labels.push(`Tiêu đề cấp ${l.trim()}`);
    // Bắt được ít nhất đủ số nút hiện có - regex trích nhãn hỏng thì test không được xanh rỗng.
    expect(labels.length).toBeGreaterThanOrEqual(15);
    const missing = labels.filter((l) => !NON_CONTENT.has(l) && !(l in BUTTONS));
    expect(missing).toEqual([]);
  });

  test.each(Object.entries(BUTTONS))('%s', (_label, { doc, expect: want }) => {
    const md = toMd(...doc);
    expect(renderMarkdown(md)).toMatch(want);
  });
});

describe('mở rộng cú pháp của ADR-0003 mục 2', () => {
  test('bảng GFM ⇒ <table> trong khung cuộn riêng', () => {
    const html = renderMarkdown('| A | B |\n| - | - |\n| 1 | 2 |');
    expect(html).toMatch(/^<div class="md-table"><table><thead><tr>/);
    expect(html).toMatch(/<td>1<\/td>\s*<td>2<\/td>/);
  });

  test('danh sách việc - [ ] / - [x]', () => {
    const html = renderMarkdown('- [ ] chưa\n- [x] xong');
    expect(html).toMatch(/<input[^>]*disabled[^>]*type="checkbox"/);
    expect(html).toMatch(/<input checked="" disabled="" type="checkbox"/);
  });

  test('danh sách lồng không rơi ra ngoài <ul>', () => {
    expect(renderMarkdown('- a\n  - b')).toMatch(/<li>a\s*<ul>\s*<li>b<\/li>/);
  });

  test.each([
    ['NOTE', 'note', 'Ghi chú'],
    ['TIP', 'tip', 'Mẹo'],
    ['IMPORTANT', 'important', 'Quan trọng'],
    ['WARNING', 'warning', 'Cảnh báo'],
    ['CAUTION', 'caution', 'Thận trọng'],
  ])('hộp ghi chú > [!%s]', (mark, cls, title) => {
    const html = renderMarkdown(`> [!${mark}]\n> Nội dung **đậm**.`);
    expect(html).toContain(`<aside class="md-callout md-callout-${cls}" role="note">`);
    expect(html).toContain(`<p class="md-callout-title">${title}</p>`);
    expect(html).toContain('<strong>đậm</strong>');
    expect(html).not.toContain('[!');
    expect(html).not.toContain('<blockquote>');
  });

  test('trích dẫn thường vẫn là <blockquote>', () => {
    expect(renderMarkdown('> chỉ là trích dẫn')).toMatch(/^<blockquote>/);
  });

  test('tiêu đề trong hộp ghi chú vẫn khớp mục lục', () => {
    const md = '## Mở đầu\n\n> [!TIP]\n> ### Mẹo nhỏ\n> nội dung\n\n## Mở đầu';
    const html = renderMarkdown(md);
    const ids = [...html.matchAll(/<h[123] id="([^"]+)"/g)].map((m) => m[1]);
    expect(extractHeadings(md).map((h) => h.id)).toEqual(ids);
    expect(ids).toEqual(['mo-dau', 'meo-nho', 'mo-dau-2']);
  });

  test('ảnh không chú thích: không <figure>, không bọc <p>', () => {
    const html = renderMarkdown('![Mô tả](/a.png)');
    expect(html).toMatch(/^<img src="\/a\.png" alt="Mô tả"/);
  });

  test('PF-07: ảnh đầu tải ngay, ảnh sau lười; kích thước từ tên khoá; decoding async', () => {
    const html = renderMarkdown('![a](/x-1200x630.webp)\n\n![b](/y.png)');
    const imgs = html.match(/<img[^>]*>/g) ?? [];
    expect(imgs[0]).toContain('width="1200" height="630"');
    expect(imgs[0]).not.toContain('loading=');
    expect(imgs[1]).toContain('loading="lazy"');
    for (const i of imgs) expect(i).toContain('decoding="async"');
  });

  test('video ngắn theo đuôi tệp vẫn là <video>', () => {
    expect(renderMarkdown('![clip](/v.mp4)')).toContain('<video src="/v.mp4" controls');
  });

  test.each([
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://vimeo.com/76979871', 'https://player.vimeo.com/video/76979871'],
  ])('SEC-07: dòng chỉ có URL %s ⇒ iframe nhúng an toàn', (url, src) => {
    const html = renderMarkdown(url);
    expect(html).toContain(`<iframe src="${src}"`);
    expect(html).toContain(
      'sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"'
    );
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
  });

  test('URL YouTube nằm giữa câu chỉ là liên kết, không nhúng', () => {
    const html = renderMarkdown('Xem https://youtu.be/dQw4w9WgXcQ nhé');
    expect(html).not.toContain('<iframe');
    expect(html).toContain('<a href="https://youtu.be/dQw4w9WgXcQ"');
  });

  test('xuống dòng đơn giữ thành <br> như bản cũ (nội dung cũ dựa vào nó)', () => {
    expect(renderMarkdown('dòng một\ndòng hai')).toMatch(/<p>dòng một<br>\s*dòng hai<\/p>/);
  });
});

describe('SEC-06: liên kết và lớp lọc', () => {
  test('liên kết ra ngoài có rel="noopener noreferrer"; liên kết trong site thì không', () => {
    expect(renderMarkdown('[x](https://example.com)')).toContain('rel="noopener noreferrer"');
    expect(renderMarkdown('[x](https://tsudev.com/a)')).not.toContain('rel=');
    expect(renderMarkdown('[x](https://docs.tsudev.com/a)')).not.toContain('rel=');
    expect(renderMarkdown('[x](/blog)')).not.toContain('rel=');
    // Miền giả mạo có đuôi tsudev.com không được coi là "trong site".
    expect(renderMarkdown('[x](https://tsudev.com.evil.io/)')).toContain(
      'rel="noopener noreferrer"'
    );
  });

  // Mẫu từ OWASP XSS Filter Evasion Cheat Sheet - đều phải ra VĂN BẢN hoặc href="#".
  const OWASP = [
    '<script>alert(1)</script>',
    '<IMG SRC="javascript:alert(\'XSS\');">',
    '<IMG SRC=javascript:alert(&quot;XSS&quot;)>',
    '<img src=x onerror="alert(1)">',
    '<svg/onload=alert(1)>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<a href="javascript:alert(1)">x</a>',
    '<BODY ONLOAD=alert(1)>',
    '<details open ontoggle=alert(1)>',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
    '[x](javascript:alert(1))',
    '[x](JAVASCRIPT:alert(1))',
    '[x](  javascript:alert(1))',
    '[x](java\tscript:alert(1))',
    '[x](&#106;avascript:alert(1))',
    '[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
    '[x](vbscript:msgbox(1))',
    '[x](<javascript:alert(1)>)',
    '[x]: javascript:alert(1)\n\n[y][x]',
    '![x](javascript:alert(1))',
    '![x](x" onerror="alert(1))',
    '![x"onerror="alert(1)](/a.png)',
    '[x](/a "t\\" onmouseover=\\"alert(1)")',
    '<javascript:alert(1)>',
    '`<script>`',
    '```"><script>alert(1)</script>\nx\n```',
    '> [!NOTE]\n> <script>alert(1)</script>',
    '| <img src=x onerror=alert(1)> |\n| - |\n| x |',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ"onload="alert(1)',
  ];

  test.each(OWASP)('%s', (input) => {
    const html = renderMarkdown(input);
    expect(html).not.toMatch(/<(script|svg|object|embed|style|math|body|details)\b/i);
    // iframe CHỈ được có từ bộ nhúng video, với src cố định của hai nhà cung cấp.
    for (const f of html.match(/<iframe[^>]*>/gi) ?? []) {
      expect(f).toMatch(
        /^<iframe src="https:\/\/(www\.youtube-nocookie\.com\/embed|player\.vimeo\.com\/video)\/[A-Za-z0-9_-]+"/
      );
    }
    for (const tag of html.match(/<[a-z][^>]*>/gi) ?? []) {
      const names = tag.replace(/"[^"]*"|'[^']*'/g, '""');
      expect(names).not.toMatch(/[\s"'/]on\w+\s*=/i);
      expect(tag).not.toMatch(/(href|src)\s*=\s*["']?\s*(javascript|vbscript|data):/i);
    }
  });
});
