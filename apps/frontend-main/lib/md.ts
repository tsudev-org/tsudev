// Markdown → HTML cho nội dung trong DB (bài viết, tài liệu, dự án).
//
// ADR-0003 (P4 PR 4.2): bộ vẽ là `marked` 17.0.6 - CHÍNH bộ phân tích mà trình
// soạn (Tiptap + `@tiptap/markdown`) dùng để đọc/ghi Markdown. Trước đây đây là
// 177 dòng regex tự viết, và trình soạn với trang công khai hiểu Markdown khác
// nhau: nghiêng, gạch, H4, danh sách số, trích dẫn, bảng, chú thích ảnh lưu đúng
// rồi hiện sai, im lặng (F-P1-01). `test/mdRoundTrip.test.ts` canh độ đủ cú pháp.
//
// RANH GIỚI BẢO MẬT: đầu ra đi thẳng vào `dangerouslySetInnerHTML`. `marked`
// KHÔNG lọc HTML, nên lớp an toàn nằm ở renderer bên dưới (không hậu xử lý chuỗi):
//
// - token `html` (khối + nội dòng) ⇒ VĂN BẢN đã thoát; không đường nào đưa HTML
//   thô ra trang;
// - mọi `href`/`src` qua `safeHref` (danh sách TRẮNG giao thức);
// - mọi văn bản và thuộc tính qua `esc()` (gồm nháy đơn/kép);
// - `id` tiêu đề chỉ gồm [a-z0-9-] (`slugifyHeading`).
//
// Hai lỗ từng khai thác được ở bản regex (giữ làm bài học): `esc()` không thoát
// nháy kép ⇒ `[x](" onmouseover="alert(1))` chèn thuộc tính; href không kiểm
// giao thức ⇒ `javascript:` đi thẳng vào. `test/md.test.ts` + `md.property.test.ts`
// canh cả hai.
import { Marked, type Token, type Tokens } from 'marked';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Giao thức được phép trong `href`/`src`. Danh sách TRẮNG, không phải danh sách
 * đen: chặn theo kiểu "cấm javascript:" luôn thua trước các biến thể
 * (`java\nscript:`, `JaVaScRiPt:`, `data:`, `vbscript:`…).
 *
 * Cho phép: http/https, mailto, và mọi đường dẫn tương đối/neo trong site.
 */
const SAFE_HREF = /^(?:https?:\/\/|mailto:|\/|#|\.\/|\.\.\/)/i;

const safeHref = (raw: string): string => {
  const url = raw.trim();
  return SAFE_HREF.test(url) ? url : '#';
};

/**
 * Tiêu đề → neo trong URL.
 *
 * Bỏ dấu tiếng Việt trước khi lọc ký tự: giữ nguyên thì "Cài đặt" ra `c-i-t`,
 * một chuỗi vô nghĩa và trùng nhau giữa các mục khác nhau.
 *
 * Kết quả CHỈ gồm [a-z0-9-]. Điều đó vừa cho ra neo sạch, vừa đóng luôn khả
 * năng chèn thuộc tính: chuỗi này đi vào `id="..."` của HTML sinh ra từ nội
 * dung người soạn.
 */
export function slugifyHeading(text: string): string {
  let s = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
  // Gỡ thẻ LẶP tới khi hết: một lượt duy nhất để `<<b>script>` còn lại `<script>`
  // (CodeQL js/incomplete-multi-character-sanitization). Bước lọc [a-z0-9] ở dưới
  // vốn đã chặn mọi ký tự `<`, nhưng phép gỡ thẻ không được phép là nửa vời.
  let prev;
  do {
    prev = s;
    s = s.replace(/<[^>]*>/g, '');
  } while (s !== prev);
  return s
    .replace(/&[a-z]+;|&#\d+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export type Heading = { id: string; text: string; level: number };

/** Hộp ghi chú theo cú pháp GitHub `> [!NOTE]` (ADR-0003 mục 2). */
const CALLOUTS: Record<string, string> = {
  note: 'Ghi chú',
  tip: 'Mẹo',
  important: 'Quan trọng',
  warning: 'Cảnh báo',
  caution: 'Thận trọng',
};
const CALLOUT_MARK = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*/i;

type HeadingTok = Tokens.Heading & { tsuId?: string };
type QuoteTok = Tokens.Blockquote & { tsuCallout?: string };

/**
 * `> [!NOTE]` ⇒ gắn loại hộp lên token và gỡ dấu `[!NOTE]` khỏi đoạn đầu. Làm
 * trên CÂY TOKEN (không lex lại chuỗi con) để tiêu đề bên trong hộp vẫn nằm
 * trong lần gán id chung - bất biến "mục lục trỏ đúng neo".
 */
function markCallout(q: QuoteTok): void {
  const first = q.tokens[0];
  if (!first || first.type !== 'paragraph') return;
  const p = first as Tokens.Paragraph;
  const head = p.tokens[0];
  if (!head || head.type !== 'text') return;
  const m = CALLOUT_MARK.exec((head as Tokens.Text).text);
  if (!m) return;
  q.tsuCallout = (m[1] as string).toLowerCase();
  const rest = (head as Tokens.Text).text.slice(m[0].length).replace(/^\n/, '');
  const tail = p.tokens.slice(1);
  // Dấu xuống dòng ngay sau `[!NOTE]` thành token `br` (breaks: true) - bỏ nó.
  if (!rest && tail[0]?.type === 'br') tail.shift();
  p.tokens = rest
    ? [{ ...(head as Tokens.Text), text: rest, raw: rest, tokens: undefined }, ...tail]
    : tail;
  if (p.tokens.length === 0) q.tokens.shift();
}

/** Tên ngôn ngữ của khối mã: whitelist hẹp vì nó đi vào `class` và nhãn. */
const LANG = /^[A-Za-z0-9_+#.-]{1,20}$/;

/** Kích thước ảnh lấy từ tên khoá `...-1200x630.webp` (PF-07, chống nhảy bố cục). */
const DIM = /-(\d{2,5})x(\d{2,5})\.[a-z0-9]+(?:[?#]|$)/i;

/**
 * Nhúng video: một đoạn văn CHỈ chứa URL YouTube/Vimeo. ID qua whitelist ký tự,
 * và iframe luôn trỏ `youtube-nocookie.com` / `player.vimeo.com` - đúng hai
 * nguồn `frame-src` của CSP mở (SEC-07). URL gốc không bao giờ vào `src`.
 */
const YOUTUBE =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[&?#]\S*)?$/;
const VIMEO = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d{1,12})(?:[?#]\S*)?$/;

function embedFor(text: string): string | null {
  const url = text.trim();
  const yt = YOUTUBE.exec(url);
  const vm = yt ? null : VIMEO.exec(url);
  if (!yt && !vm) return null;
  const src = yt
    ? `https://www.youtube-nocookie.com/embed/${yt[1]}`
    : `https://player.vimeo.com/video/${(vm as RegExpExecArray)[1]}`;
  const title = yt ? 'Video YouTube' : 'Video Vimeo';
  return (
    `<div class="md-embed"><iframe src="${src}" title="${title}" loading="lazy" ` +
    `referrerpolicy="strict-origin-when-cross-origin" ` +
    `sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" ` +
    `allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`
  );
}

const isExternal = (url: string): boolean =>
  /^https?:\/\//i.test(url) && !/^https?:\/\/(?:[a-z0-9-]+\.)*tsudev\.com(?:[/:?#]|$)/i.test(url);

/** Trạng thái của MỘT lần vẽ (đồng bộ, nên biến mô-đun là đủ). */
const state = { images: 0 };

const parser = new Marked({
  gfm: true,
  // Bản regex cũ đổi mỗi xuống dòng đơn thành <br/>, và nội dung cũ (soạn ở form
  // thô) dựa vào điều đó. Giữ nguyên để bài cũ không dính dòng.
  breaks: true,
  renderer: {
    // ── Lớp an toàn: HTML thô KHÔNG BAO GIỜ ra trang ──
    html({ text, block }) {
      return block ? `<p>${esc(text.trim())}</p>\n` : esc(text);
    },
    text(token) {
      if ('tokens' in token && token.tokens) return this.parser.parseInline(token.tokens);
      return esc(token.text);
    },
    codespan({ text }) {
      return `<code>${esc(text)}</code>`;
    },
    code({ text, lang }) {
      const name = (lang ?? '').trim().split(/\s+/)[0] ?? '';
      const body = esc(text);
      // Dòng ```bash thành nhãn trên thanh tiêu đề, không in lẫn vào mã.
      return LANG.test(name)
        ? `<div class="code-block"><div class="code-lang">${name}</div><pre><code class="language-${name}">${body}</code></pre></div>\n`
        : `<pre><code>${body}</code></pre>\n`;
    },
    heading(token) {
      const t = token as HeadingTok;
      const id = t.tsuId ?? slugifyHeading(t.text);
      return `<h${t.depth} id="${id}">${this.parser.parseInline(t.tokens)}</h${t.depth}>\n`;
    },
    blockquote(token) {
      const q = token as QuoteTok;
      const body = this.parser.parse(q.tokens);
      const kind = q.tsuCallout;
      if (kind && CALLOUTS[kind]) {
        return `<aside class="md-callout md-callout-${kind}" role="note"><p class="md-callout-title">${CALLOUTS[kind]}</p>${body}</aside>\n`;
      }
      return `<blockquote>${body}</blockquote>\n`;
    },
    link({ href, title, tokens }) {
      const url = safeHref(href);
      const t = title ? ` title="${esc(title)}"` : '';
      // SEC-06: liên kết ra ngoài không trao `window.opener` và không lộ Referer.
      const rel = isExternal(url) ? ' rel="noopener noreferrer"' : '';
      return `<a href="${esc(url)}"${t}${rel}>${this.parser.parseInline(tokens)}</a>`;
    },
    image({ href, title, text }) {
      const url = safeHref(href);
      if (url === '#') return '';
      const src = esc(url);
      const alt = esc(text);
      if (/\.(mp4|webm|ogg)(?:[?#]|$)/i.test(url)) {
        return `<video src="${src}" controls preload="metadata" class="md-video"></video>`;
      }
      // PF-07: ảnh đầu tải ngay (thường là ảnh lớn đầu bài - LCP), còn lại lười.
      state.images += 1;
      const lazy = state.images > 1 ? ' loading="lazy"' : '';
      const dim = DIM.exec(url);
      const size = dim ? ` width="${dim[1]}" height="${dim[2]}"` : '';
      const img = `<img src="${src}" alt="${alt}"${size}${lazy} decoding="async" class="md-img" />`;
      // Chú thích ảnh = tiêu đề ảnh chuẩn `![alt](url "chú thích")` (ADR-0003).
      return title
        ? `<figure class="md-figure">${img}<figcaption>${esc(title)}</figcaption></figure>`
        : img;
    },
    paragraph({ tokens, text }) {
      const embed = embedFor(text);
      if (embed) return `${embed}\n`;
      const inner = this.parser.parseInline(tokens);
      // Đoạn chỉ có MỘT ảnh/video ⇒ không bọc <p> (<figure> trong <p> là HTML sai).
      const only = tokens.filter((t) => !(t.type === 'text' && !t.raw.trim()));
      if (only.length === 1 && only[0]?.type === 'image') return `${inner}\n`;
      return `<p>${inner}</p>\n`;
    },
    table(token) {
      // Bảng rộng cuộn trong khung riêng, không làm cả trang cuộn ngang ở 390 px.
      const head = this.tablerow({ text: token.header.map((c) => this.tablecell(c)).join('') });
      const rows = token.rows
        .map((r) => this.tablerow({ text: r.map((c) => this.tablecell(c)).join('') }))
        .join('');
      return `<div class="md-table"><table><thead>${head}</thead>${rows ? `<tbody>${rows}</tbody>` : ''}</table></div>\n`;
    },
  },
});

/**
 * MỘT lần duyệt cây token cho cả `extractHeadings` và `renderMarkdown`: gán id
 * tiêu đề theo đúng thứ tự đọc (kể cả tiêu đề trong trích dẫn/danh sách) và đánh
 * dấu hộp ghi chú. Hai bên tính riêng thì mục lục trỏ tới neo không tồn tại -
 * triệu chứng chỉ là "bấm vào không nhảy".
 */
function prepare(md: string): { tokens: Token[]; headings: Heading[] } {
  const tokens = parser.lexer(md);
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  let n = 0;
  parser.walkTokens(tokens, (t) => {
    if (t.type === 'blockquote') markCallout(t as QuoteTok);
    if (t.type !== 'heading') return;
    const h = t as HeadingTok;
    n += 1;
    const text = h.text.trim();
    const base = slugifyHeading(text) || `muc-${n}`;
    // Hai mục trùng tên phải ra hai neo khác nhau, nếu không neo thứ hai không
    // bao giờ tới được.
    const k = (seen.get(base) ?? 0) + 1;
    seen.set(base, k);
    h.tsuId = k === 1 ? base : `${base}-${k}`;
    headings.push({ id: h.tsuId, text, level: h.depth });
  });
  return { tokens, headings };
}

/**
 * Danh sách tiêu đề cấp 1-3 (mục lục), theo thứ tự xuất hiện. Dùng CHUNG lần
 * duyệt token với `renderMarkdown`, nên id luôn khớp neo trong HTML.
 */
export function extractHeadings(md = ''): Heading[] {
  return prepare(md).headings.filter((h) => h.level <= 3);
}

export function renderMarkdown(md = ''): string {
  state.images = 0;
  const { tokens } = prepare(md);
  return (parser.parser(tokens) as string).trim();
}
