import { Node, mergeAttributes, type JSONContent } from '@tiptap/core';

/**
 * Hộp ghi chú `> [!NOTE]` (ED-05, ADR-0003 mục 2) - đúng cú pháp GitHub mà
 * `lib/md.ts` vẽ thành `<aside class="md-callout ...">` trên trang công khai.
 *
 * Phải là NÚT RIÊNG, không phải trích dẫn có đoạn đầu "[!NOTE]": bộ tuần tự
 * hoá Markdown thoát dấu ngoặc thành `\[!NOTE\]`, và trang công khai vẽ ra một
 * trích dẫn có chữ "[!NOTE]" - lưu xong hỏng im lặng (đo 25/11/2026).
 */
export const CALLOUT_KINDS = {
  note: 'Ghi chú',
  tip: 'Mẹo',
  important: 'Quan trọng',
  warning: 'Cảnh báo',
  caution: 'Thận trọng',
} as const;
export type CalloutKind = keyof typeof CALLOUT_KINDS;

const isKind = (k: string): k is CalloutKind => k in CALLOUT_KINDS;
// Dòng đầu `> [!KIND]` (có thể kèm chữ phía sau), rồi mọi dòng liền kề bắt đầu bằng `>`.
const BLOCK =
  /^ {0,3}> ?\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(.*)(?:\n|$)((?: {0,3}>.*(?:\n|$))*)/i;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /** Bọc khối đang chọn vào hộp ghi chú; đã ở trong hộp thì đổi loại. */
      setCallout: (kind: CalloutKind) => ReturnType;
      /** Gỡ hộp ghi chú, giữ nội dung. */
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: 'note' as CalloutKind,
        parseHTML: (el) => {
          const k = el.getAttribute('data-callout') || 'note';
          return isKind(k) ? k : 'note';
        },
        renderHTML: (attrs) => {
          const kind = isKind(String(attrs.kind)) ? (attrs.kind as CalloutKind) : 'note';
          return {
            'data-callout': kind,
            'data-label': CALLOUT_KINDS[kind],
            class: `md-callout md-callout-${kind}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'aside[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['aside', mergeAttributes(HTMLAttributes, { role: 'note' }), 0];
  },

  addCommands() {
    return {
      setCallout:
        (kind) =>
        ({ editor, commands }) =>
          editor.isActive(this.name)
            ? commands.updateAttributes(this.name, { kind })
            : commands.wrapIn(this.name, { kind }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },

  markdownTokenizer: {
    name: 'callout',
    level: 'block',
    start: (src: string) => {
      const m = /^ {0,3}> ?\[!/m.exec(src);
      return m ? m.index : -1;
    },
    tokenize: (src, _tokens, lexer) => {
      const m = BLOCK.exec(src);
      if (!m) return undefined;
      const rest = (m[3] || '')
        .split('\n')
        .map((l) => l.replace(/^ {0,3}> ?/, ''))
        .join('\n');
      const inner = [m[2] || '', rest].filter((s) => s.trim() !== '').join('\n');
      return {
        type: 'callout',
        raw: m[0],
        kind: (m[1] || 'NOTE').toLowerCase(),
        tokens: lexer.blockTokens(inner),
      };
    },
  },

  parseMarkdown: (token, h) => {
    const kind = String((token as { kind?: string }).kind || 'note');
    const parse = h.parseBlockChildren ?? h.parseChildren;
    const content = parse(token.tokens || []);
    return h.createNode(
      'callout',
      { kind: isKind(kind) ? kind : 'note' },
      content.length ? content : [{ type: 'paragraph' }]
    );
  },

  renderMarkdown: (node: JSONContent, h) => {
    const kind = isKind(String(node.attrs?.kind)) ? String(node.attrs?.kind) : 'note';
    const body = (node.content ?? [])
      .map((child, i) =>
        (h.renderChild?.(child, i) ?? h.renderChildren([child]))
          .split('\n')
          .map((line) => (line.trim() === '' ? '>' : `> ${line}`))
          .join('\n')
      )
      .join('\n>\n');
    return `> [!${kind.toUpperCase()}]\n${body}`;
  },
});
