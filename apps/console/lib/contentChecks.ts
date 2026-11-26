import { Lexer, type Token, type Tokens } from 'marked';
import { viWordCount } from '@tsudev/search';
import { extractHeadings } from '../../frontend-main/lib/md';
import { readingMinutes } from './readingTime';

/**
 * Bảng "Kiểm tra" của trình soạn (ED-12, chạy ở trình duyệt - gợi ý, không chặn).
 * Hàm THUẦN: không DOM, không mạng - P7 (WF-05) chuyển nguyên hàm này sang
 * `packages/types` để service chạy lại khi duyệt/công bố và CHẶN mục `error`.
 *
 * Duyệt cây token của `marked` (cùng bộ hiểu Markdown với trang công khai) thay
 * vì regex trên chữ thô: `# ` trong khối mã hay `![](x)` trong mã trong dòng
 * không được tính là tiêu đề/ảnh.
 */
export type CheckLevel = 'ok' | 'warn' | 'error';
export type Check = { id: string; level: CheckLevel; text: string };
export type CheckInput = {
  title: string;
  contentMd: string;
  metaDescription?: string;
  excerpt?: string;
  coverImageUrl?: string;
};

export const TITLE_MAX = 70;
export const META_MAX = 160;
export const PARAGRAPH_MAX_WORDS = 120;

const LINK_OK = /^(https?:|mailto:|\/|#)/i;

function walk(tokens: Token[], fn: (t: Token) => void) {
  for (const t of tokens) {
    fn(t);
    const kids = (t as { tokens?: Token[] }).tokens;
    if (kids) walk(kids, fn);
    if (t.type === 'list') for (const it of (t as Tokens.List).items) walk(it.tokens, fn);
    if (t.type === 'table') {
      const tb = t as Tokens.Table;
      for (const c of tb.header) walk(c.tokens, fn);
      for (const r of tb.rows) for (const c of r) walk(c.tokens, fn);
    }
  }
}

export function contentChecks(input: CheckInput): {
  checks: Check[];
  words: number;
  minutes: number;
} {
  const checks: Check[] = [];
  const add = (id: string, level: CheckLevel, text: string) => checks.push({ id, level, text });

  const title = input.title.trim();
  if (!title) add('title', 'error', 'Chưa có tiêu đề.');
  else if (title.length > TITLE_MAX)
    add(
      'title',
      'warn',
      `Tiêu đề ${title.length}/${TITLE_MAX} ký tự - kết quả tìm kiếm sẽ cắt bớt.`
    );
  else add('title', 'ok', `Tiêu đề ${title.length}/${TITLE_MAX} ký tự.`);

  const meta = (input.metaDescription || '').trim();
  if (!meta)
    add(
      'meta',
      'warn',
      input.excerpt?.trim()
        ? 'Chưa có mô tả SEO - sẽ dùng phần tóm tắt.'
        : 'Chưa có mô tả SEO lẫn tóm tắt.'
    );
  else if (meta.length > META_MAX)
    add('meta', 'warn', `Mô tả SEO ${meta.length}/${META_MAX} ký tự - sẽ bị cắt.`);
  else add('meta', 'ok', `Mô tả SEO ${meta.length}/${META_MAX} ký tự.`);

  if (!(input.coverImageUrl || '').trim())
    add('cover', 'warn', 'Chưa có ảnh bìa - thẻ chia sẻ sẽ không có ảnh.');
  else add('cover', 'ok', 'Có ảnh bìa.');

  const tokens = Lexer.lex(input.contentMd || '', { gfm: true });
  const anchors = new Set(extractHeadings(input.contentMd || '').map((h) => h.id));
  let noAlt = 0;
  let insecure = 0;
  const broken: string[] = [];
  let longParas = 0;
  let h1 = 0;
  const jumps: string[] = [];
  let prevLevel = 1; // tiêu đề bài là h1

  walk(tokens, (t) => {
    if (t.type === 'image' && !(t as Tokens.Image).text.trim()) noAlt += 1;
    if (t.type === 'link') {
      const href = (t as Tokens.Link).href.trim();
      if (/^http:\/\//i.test(href)) insecure += 1;
      if (!href || !LINK_OK.test(href)) broken.push(href || '(trống)');
      else if (
        href.startsWith('#') &&
        href.length > 1 &&
        !anchors.has(decodeURIComponent(href.slice(1)))
      )
        broken.push(href);
      else if (/^https?:/i.test(href)) {
        try {
          new URL(href);
        } catch {
          broken.push(href);
        }
      }
    }
    if (t.type === 'heading') {
      const d = (t as Tokens.Heading).depth;
      if (d === 1) h1 += 1;
      else if (d > prevLevel + 1)
        jumps.push(`H${prevLevel}→H${d} "${(t as Tokens.Heading).text.slice(0, 40)}"`);
      prevLevel = d;
    }
    if (t.type === 'paragraph' && viWordCount((t as Tokens.Paragraph).text) > PARAGRAPH_MAX_WORDS)
      longParas += 1;
  });

  if (noAlt) add('alt', 'error', `${noAlt} ảnh thiếu mô tả (alt) - trình đọc màn hình bỏ qua ảnh.`);
  else add('alt', 'ok', 'Mọi ảnh đều có mô tả.');
  if (h1) add('h1', 'warn', `${h1} tiêu đề cấp 1 trong thân bài - tiêu đề bài đã là cấp 1.`);
  if (jumps.length) add('headings', 'warn', `Tiêu đề nhảy cấp: ${jumps.slice(0, 3).join('; ')}.`);
  else add('headings', 'ok', 'Thứ bậc tiêu đề liền mạch.');
  if (broken.length)
    add('links', 'error', `${broken.length} liên kết hỏng: ${broken.slice(0, 3).join(', ')}.`);
  else add('links', 'ok', 'Không thấy liên kết hỏng.');
  if (insecure)
    add('http', 'warn', `${insecure} liên kết http: (không mã hoá) - nên đổi sang https.`);
  if (longParas)
    add(
      'paragraphs',
      'warn',
      `${longParas} đoạn dài hơn ${PARAGRAPH_MAX_WORDS} từ - nên tách cho dễ đọc.`
    );

  const words = viWordCount(input.contentMd || '');
  if (words < 300) add('length', 'warn', `Bài ngắn: ${words} từ (gợi ý từ 300 từ).`);
  else add('length', 'ok', `${words} từ.`);

  return { checks, words, minutes: readingMinutes(words) };
}
