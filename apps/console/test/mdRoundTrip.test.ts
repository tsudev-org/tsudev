/**
 * Cổng KHỨ HỒI trình soạn → trang công khai (ADR-0003 mục 5, PG-01, SEC-06).
 *
 * F-P1-01: trình soạn và trang công khai từng dùng HAI bộ hiểu Markdown khác
 * nhau, nên nghiêng/gạch/H4/danh sách số/trích dẫn lưu đúng rồi hiện sai - im
 * lặng, vì test cũ chỉ canh ranh giới XSS chứ không canh độ đủ cú pháp.
 *
 * Tệp này dùng CHÍNH bộ tuần tự hoá của trình soạn (`@tiptap/markdown`, cùng cấu
 * hình extension `components/editor/extensions.ts`) để sinh Markdown cho từng
 * nút/khối của trình soạn, rồi khẳng định `renderMarkdown` vẽ ra đúng thẻ VÀ đọc
 * ngược Markdown đó về đúng cây nút (khứ hồi hai chiều).
 * Thêm nút/khối mới mà không thêm ca ở đây ⇒ test "mọi nút có ca" đỏ.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MarkdownManager } from '@tiptap/markdown';
import { contentExtensions } from '../components/editor/extensions';
import { BLOCKS } from '../components/editor/blocks';
import { extractHeadings, renderMarkdown } from '../../frontend-main/lib/md';

type Node = Record<string, unknown>;

// CHÍNH bộ extension của trình soạn (một nguồn - `components/editor/extensions.ts`).
const manager = new MarkdownManager({ extensions: contentExtensions() });

const text = (t: string, marks: string[] = []): Node => ({
  type: 'text',
  text: t,
  ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
});
const para = (...content: Node[]): Node => ({ type: 'paragraph', content });
const item = (t: string): Node => ({ type: 'listItem', content: [para(text(t))] });
const toMd = (...content: Node[]): string => manager.serialize({ type: 'doc', content });

const cell = (kind: string, t: string): Node => ({ type: kind, content: [para(text(t))] });
const linkDoc = [
  para({
    type: 'text',
    text: 'tsudev',
    marks: [{ type: 'link', attrs: { href: 'https://tsudev.com/blog' } }],
  }),
];
const linkRe = /<a href="https:\/\/tsudev\.com\/blog">tsudev<\/a>/;

/** Nút ĐỊNH DẠNG/CHÈN có nhãn literal trong `<Btn label="...">` (thanh công cụ + menu nổi). */
const BUTTONS: Record<string, { doc: Node[]; expect: RegExp }> = {
  'Đậm (Ctrl+B)': { doc: [para(text('đậm', ['bold']))], expect: /<strong>đậm<\/strong>/ },
  'Nghiêng (Ctrl+I)': { doc: [para(text('nghiêng', ['italic']))], expect: /<em>nghiêng<\/em>/ },
  'Gạch ngang': { doc: [para(text('gạch', ['strike']))], expect: /<del>gạch<\/del>/ },
  'Mã trong dòng': { doc: [para(text('a<b', ['code']))], expect: /<code>a&lt;b<\/code>/ },
  'Liên kết (Ctrl+K)': { doc: linkDoc, expect: linkRe },
  'Hộp ghi chú': {
    doc: [{ type: 'callout', attrs: { kind: 'note' }, content: [para(text('Lưu ý'))] }],
    expect:
      /<aside class="md-callout md-callout-note" role="note"><p class="md-callout-title">Ghi chú<\/p>\s*<p>Lưu ý<\/p>/,
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
// Menu nổi khi bôi chọn: cùng lệnh với nút thanh công cụ.
BUTTONS['Đậm'] = BUTTONS['Đậm (Ctrl+B)']!;
BUTTONS['Nghiêng'] = BUTTONS['Nghiêng (Ctrl+I)']!;
BUTTONS['Gạch'] = BUTTONS['Gạch ngang']!;
BUTTONS['Mã'] = BUTTONS['Mã trong dòng']!;
BUTTONS['Gắn liên kết'] = BUTTONS['Liên kết (Ctrl+K)']!;

/** Mỗi khối trong `BLOCKS` (menu `/` + nút khối trên thanh công cụ). */
const calloutCase = (kind: string, title: string) => ({
  doc: [
    {
      type: 'callout',
      attrs: { kind },
      content: [para(text('Dòng một', ['bold'])), para(text('Dòng hai'))],
    },
  ],
  expect: new RegExp(
    `<aside class="md-callout md-callout-${kind}" role="note"><p class="md-callout-title">${title}</p>\\s*<p><strong>Dòng một</strong></p>\\s*<p>Dòng hai</p>\\s*</aside>`
  ),
});
const BLOCK_CASES: Record<string, { doc: Node[]; expect: RegExp }> = {
  paragraph: { doc: [para(text('chữ'))], expect: /^<p>chữ<\/p>/ },
  h2: {
    doc: [{ type: 'heading', attrs: { level: 2 }, content: [text('Hai')] }],
    expect: /<h2 id="hai">Hai<\/h2>/,
  },
  h3: {
    doc: [{ type: 'heading', attrs: { level: 3 }, content: [text('Ba')] }],
    expect: /<h3 id="ba">Ba<\/h3>/,
  },
  h4: {
    doc: [{ type: 'heading', attrs: { level: 4 }, content: [text('Bốn')] }],
    expect: /<h4 id="bon">Bốn<\/h4>/,
  },
  bulletList: {
    doc: [{ type: 'bulletList', content: [item('một'), item('hai')] }],
    expect: /<ul>\s*<li>một<\/li>\s*<li>hai<\/li>\s*<\/ul>/,
  },
  orderedList: {
    doc: [{ type: 'orderedList', content: [item('một'), item('hai')] }],
    expect: /<ol>\s*<li>một<\/li>\s*<li>hai<\/li>\s*<\/ol>/,
  },
  taskList: {
    doc: [
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [para(text('chưa'))] },
          { type: 'taskItem', attrs: { checked: true }, content: [para(text('xong'))] },
        ],
      },
    ],
    expect:
      /<ul>\s*<li><input disabled="" type="checkbox"> chưa<\/li>\s*<li><input checked="" disabled="" type="checkbox"> xong<\/li>/,
  },
  blockquote: {
    doc: [{ type: 'blockquote', content: [para(text('lời dẫn'))] }],
    expect: /<blockquote>\s*<p>lời dẫn<\/p>\s*<\/blockquote>/,
  },
  'callout-note': calloutCase('note', 'Ghi chú'),
  'callout-tip': calloutCase('tip', 'Mẹo'),
  'callout-important': calloutCase('important', 'Quan trọng'),
  'callout-warning': calloutCase('warning', 'Cảnh báo'),
  'callout-caution': calloutCase('caution', 'Thận trọng'),
  codeBlock: {
    doc: [{ type: 'codeBlock', attrs: { language: 'bash' }, content: [text('ls -la')] }],
    expect:
      /<div class="code-lang">bash<\/div><pre><code class="language-bash">ls -la<\/code><\/pre>/,
  },
  table: {
    doc: [
      {
        type: 'table',
        content: [
          { type: 'tableRow', content: [cell('tableHeader', 'A'), cell('tableHeader', 'B')] },
          { type: 'tableRow', content: [cell('tableCell', '1'), cell('tableCell', '2')] },
        ],
      },
    ],
    expect:
      /<div class="md-table"><table><thead><tr>\s*<th>A<\/th>\s*<th>B<\/th>[\s\S]*<td>1<\/td>\s*<td>2<\/td>/,
  },
  horizontalRule: {
    doc: [para(text('a')), { type: 'horizontalRule' }, para(text('b'))],
    expect: /<hr>/,
  },
};

/** Nút không sinh nội dung MỚI - không cần ca (thao tác bảng đã có ca `table`). */
const NON_CONTENT = new Set([
  'Hoàn tác (Ctrl+Z)',
  'Làm lại (Ctrl+Shift+Z)',
  'Phím tắt (?)',
  'Thêm hàng phía dưới',
  'Thêm cột bên phải',
  'Xoá hàng',
  'Xoá cột',
  'Xoá bảng',
  'Gỡ hộp ghi chú',
]);

/** Gỡ thuộc tính mặc định mà bộ đọc thêm vào, để so cây nút với cây gốc. */
const strip = (n: unknown): unknown => {
  if (Array.isArray(n)) return n.map(strip);
  if (!n || typeof n !== 'object') return n;
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
    if (k === 'attrs') {
      const a = Object.fromEntries(
        Object.entries(v as Record<string, unknown>).filter(
          ([, x]) => x !== null && x !== undefined
        )
      );
      if (Object.keys(a).length) o.attrs = a;
    } else o[k] = strip(v);
  }
  return o;
};

describe('khứ hồi: mỗi nút của trình soạn vẽ đúng thẻ trên trang công khai', () => {
  test('mọi nút trên thanh công cụ và menu nổi đều có ca trong test này', () => {
    const src = readFileSync(join(__dirname, '../components/MarkdownEditor.tsx'), 'utf8');
    const labels = [...src.matchAll(/<Btn\s+label="([^"]+)"/g)].map((m) => m[1] as string);
    // Bắt được ít nhất đủ số nút hiện có - regex trích nhãn hỏng thì test không được xanh rỗng.
    expect(labels.length).toBeGreaterThanOrEqual(20);
    const missing = labels.filter((l) => !NON_CONTENT.has(l) && !(l in BUTTONS));
    expect(missing).toEqual([]);
  });

  test('mọi khối của menu `/` có ca khứ hồi', () => {
    expect(BLOCKS.length).toBeGreaterThanOrEqual(15);
    expect(BLOCKS.map((b) => b.id).filter((id) => !(id in BLOCK_CASES))).toEqual([]);
  });

  test.each(Object.entries({ ...BUTTONS, ...BLOCK_CASES }))(
    '%s',
    (_label, { doc, expect: want }) => {
      const md = toMd(...doc);
      expect(renderMarkdown(md)).toMatch(want);
      // Chiều ngược: Markdown đã lưu mở lại trong trình soạn ra ĐÚNG cây nút ban đầu.
      expect(strip(manager.parse(md).content)).toEqual(strip(doc));
    }
  );

  test('hộp ghi chú viết tay theo GitHub (chữ cùng dòng với dấu) đọc được vào trình soạn', () => {
    const doc = manager.parse('> [!WARNING] Cẩn thận\n> dòng hai\n\nsau');
    expect(doc.content?.[0]).toMatchObject({ type: 'callout', attrs: { kind: 'warning' } });
    expect(doc.content?.[1]).toMatchObject({ type: 'paragraph' });
  });

  test('trích dẫn thường KHÔNG bị đọc thành hộp ghi chú', () => {
    expect(manager.parse('> chỉ là trích dẫn').content?.[0]?.type).toBe('blockquote');
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
