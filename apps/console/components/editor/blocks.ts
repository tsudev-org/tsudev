import type { ChainedCommands, Editor } from '@tiptap/core';
import type { CalloutKind } from './callout';

/**
 * Sổ lệnh CHÈN KHỐI dùng chung cho menu `/` và thanh công cụ (ED-05).
 * `test/mdRoundTrip.test.ts` duyệt `BLOCKS` - thêm khối mà không thêm ca khứ hồi
 * ⇒ test "mọi khối có ca" đỏ.
 *
 * `keywords` không dấu để gõ `/bang` hay `/bảng` đều ra (so bằng `fold`).
 */
export type Block = {
  id: string;
  label: string;
  hint: string;
  keywords: string;
  run: (c: ChainedCommands) => ChainedCommands;
  active?: (e: Editor) => boolean;
};

const callout = (kind: CalloutKind, label: string, keywords: string): Block => ({
  id: `callout-${kind}`,
  label: `Hộp ${label.toLowerCase()}`,
  hint: `> [!${kind.toUpperCase()}]`,
  keywords: `callout hop ${keywords}`,
  run: (c) => c.setCallout(kind),
});

export const BLOCKS: Block[] = [
  {
    id: 'paragraph',
    label: 'Đoạn văn',
    hint: 'Chữ thường',
    keywords: 'doan van text p',
    run: (c) => c.setParagraph(),
  },
  {
    id: 'h2',
    label: 'Tiêu đề 2',
    hint: '##',
    keywords: 'tieu de heading h2',
    run: (c) => c.toggleHeading({ level: 2 }),
    active: (e) => e.isActive('heading', { level: 2 }),
  },
  {
    id: 'h3',
    label: 'Tiêu đề 3',
    hint: '###',
    keywords: 'tieu de heading h3',
    run: (c) => c.toggleHeading({ level: 3 }),
    active: (e) => e.isActive('heading', { level: 3 }),
  },
  {
    id: 'h4',
    label: 'Tiêu đề 4',
    hint: '####',
    keywords: 'tieu de heading h4',
    run: (c) => c.toggleHeading({ level: 4 }),
    active: (e) => e.isActive('heading', { level: 4 }),
  },
  {
    id: 'bulletList',
    label: 'Danh sách chấm',
    hint: '-',
    keywords: 'danh sach cham bullet ul list',
    run: (c) => c.toggleBulletList(),
    active: (e) => e.isActive('bulletList'),
  },
  {
    id: 'orderedList',
    label: 'Danh sách số',
    hint: '1.',
    keywords: 'danh sach so ordered ol list',
    run: (c) => c.toggleOrderedList(),
    active: (e) => e.isActive('orderedList'),
  },
  {
    id: 'taskList',
    label: 'Danh sách việc',
    hint: '- [ ]',
    keywords: 'danh sach viec task todo checkbox',
    run: (c) => c.toggleTaskList(),
    active: (e) => e.isActive('taskList'),
  },
  {
    id: 'blockquote',
    label: 'Trích dẫn',
    hint: '>',
    keywords: 'trich dan quote blockquote',
    run: (c) => c.toggleBlockquote(),
    active: (e) => e.isActive('blockquote'),
  },
  callout('note', 'Ghi chú', 'ghi chu note info'),
  callout('tip', 'Mẹo', 'meo tip'),
  callout('important', 'Quan trọng', 'quan trong important'),
  callout('warning', 'Cảnh báo', 'canh bao warning'),
  callout('caution', 'Thận trọng', 'than trong caution danger'),
  {
    id: 'codeBlock',
    label: 'Khối mã',
    hint: '```',
    keywords: 'khoi ma code block pre',
    run: (c) => c.toggleCodeBlock(),
    active: (e) => e.isActive('codeBlock'),
  },
  {
    id: 'table',
    label: 'Bảng',
    hint: '3 × 3',
    keywords: 'bang table',
    run: (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
  },
  {
    id: 'horizontalRule',
    label: 'Đường phân cách',
    hint: '---',
    keywords: 'duong phan cach hr divider',
    run: (c) => c.setHorizontalRule(),
  },
];

/** Bỏ dấu + chữ thường: "Bảng" ⇒ "bang", "đ" ⇒ "d". */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

export const filterBlocks = (q: string): Block[] => {
  const f = fold(q.trim());
  if (!f) return BLOCKS;
  return BLOCKS.filter((b) => fold(b.label).includes(f) || b.keywords.includes(f));
};

/** Ngôn ngữ cho khối mã - nhãn vẽ ở `div.code-lang` của trang công khai. */
export const CODE_LANGS = [
  'bash',
  'powershell',
  'javascript',
  'typescript',
  'tsx',
  'json',
  'html',
  'css',
  'python',
  'rust',
  'go',
  'csharp',
  'java',
  'sql',
  'yaml',
  'toml',
  'diff',
  'text',
] as const;
