import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Extension } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';
import { Button, Input, Modal } from '@tsudev/ui';
import { viWordCount } from '@tsudev/search';
import { contentExtensions } from './editor/extensions';
import { BLOCKS, CODE_LANGS, filterBlocks, type Block } from './editor/blocks';
import { CALLOUT_KINDS, type CalloutKind } from './editor/callout';
import { readingMinutes } from '../lib/readingTime';

/**
 * Trình soạn bài (P2.3 + UX1-b/PR 4.6, quyết định D3 - docs/adr/0001-tiptap-markdown.md):
 * Tiptap 3 + extension Markdown chính thức. Vào/ra đều là MARKDOWN - `contentMd`
 * vẫn là nguồn sự thật duy nhất, nên render công khai, ISR, tìm kiếm không đổi.
 *
 * Cả tệp nằm trong chunk NẠP LƯỜI (`next/dynamic` ở trang soạn) - bảng, menu nổi,
 * floating-ui không vào JS tải ban đầu (ngân sách 170 KB, `npm run budget:js`).
 *
 * Mọi nút sinh nội dung có ca khứ hồi ở `test/mdRoundTrip.test.ts` (nhãn `Btn`
 * trích bằng regex, khối chèn duyệt theo `BLOCKS`).
 */
type Props = {
  value: string;
  onChange: (markdown: string) => void;
  /** Đổi khi nạp bài khác/khôi phục bản cũ - trình soạn đặt lại nội dung. */
  resetKey?: string;
  label?: string;
  /** Mở bảng phím tắt (ED-14) - trang giữ hộp thoại vì `?` cũng mở được từ ngoài trình soạn. */
  onHelp?: () => void;
};

const LINK_OK = /^(https?:|mailto:|\/|#)/i;

function Btn({
  on,
  active,
  label,
  children,
  disabled,
}: {
  on: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      className={`min-w-8 shrink-0 rounded-md px-2 py-1 text-sm transition-colors disabled:opacity-40 ${
        active ? 'bg-glow text-link' : 'text-fg-secondary hover:bg-hovered hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-line" />;

/** Chữ hiện trên nút khối - nhãn ARIA bắt đầu bằng đúng chữ này khi là chữ (ED-06, WCAG 2.5.3). */
const SHORT: Record<string, string> = {
  h2: 'H2',
  h3: 'H3',
  h4: 'H4',
  bulletList: '•',
  orderedList: '1.',
  taskList: '☑',
  blockquote: '❝',
  codeBlock: '{ }',
  table: '▦',
  horizontalRule: '―',
};
const TOOLBAR_BLOCKS = BLOCKS.filter((b) => b.id in SHORT);
// Chữ hiện có chữ cái/chữ số ("H2", "1.") ⇒ nhãn ARIA PHẢI chứa nó (axe
// `label-content-name-mismatch`, serious - E2E UX1-d bắt ở "1."); ký hiệu thuần
// (•, ❝, ▦) không tính là chữ nên giữ nhãn gọn.
const ariaOf = (b: Block) =>
  /[\p{L}\p{N}]/u.test(SHORT[b.id] ?? '') ? `${SHORT[b.id]} - ${b.label}` : b.label;

const selectCls =
  'rounded-md border border-line-control bg-surface px-2 py-1 text-sm text-fg focus-visible:outline-2 focus-visible:outline-focus';

type DialogState =
  | { kind: 'link'; href: string }
  | { kind: 'image'; src: string; alt: string; caption: string }
  | null;

function Toolbar({
  editor,
  openLink,
  openImage,
  onHelp,
}: {
  editor: Editor;
  openLink: () => void;
  openImage: () => void;
  onHelp?: () => void;
}) {
  const c = () => editor.chain().focus();
  const inTable = editor.isActive('table');
  const inCode = editor.isActive('codeBlock');
  const inCallout = editor.isActive('callout');
  return (
    <div
      role="toolbar"
      aria-label="Định dạng"
      className="tsu-editor-toolbar rounded-t-md border-b border-line bg-surface p-1.5"
    >
      {/* Hàng chính MỘT dòng, cuộn ngang khi hẹp: xuống dòng thì hàng đầu để trống
          nửa phải (khoảng trống ghi ở UX1-a) và thanh cao gấp đôi. */}
      <div className="flex items-center gap-0.5 overflow-x-auto">
        <Btn
          label="Đậm (Ctrl+B)"
          active={editor.isActive('bold')}
          on={() => c().toggleBold().run()}
        >
          <b>B</b>
        </Btn>
        <Btn
          label="Nghiêng (Ctrl+I)"
          active={editor.isActive('italic')}
          on={() => c().toggleItalic().run()}
        >
          <i>I</i>
        </Btn>
        <Btn
          label="Gạch ngang"
          active={editor.isActive('strike')}
          on={() => c().toggleStrike().run()}
        >
          <s>S</s>
        </Btn>
        <Btn
          label="Mã trong dòng"
          active={editor.isActive('code')}
          on={() => c().toggleCode().run()}
        >
          {'</>'}
        </Btn>
        <Btn label="Liên kết (Ctrl+K)" active={editor.isActive('link')} on={openLink}>
          🔗
        </Btn>
        <Sep />
        {TOOLBAR_BLOCKS.map((b) => (
          <button
            key={b.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => b.run(c()).run()}
            disabled={inTable}
            aria-label={ariaOf(b)}
            title={`${b.label} (${b.hint})`}
            aria-pressed={b.active ? b.active(editor) : undefined}
            className={`min-w-8 shrink-0 rounded-md px-2 py-1 text-sm transition-colors disabled:opacity-40 ${
              b.active?.(editor)
                ? 'bg-glow text-link'
                : 'text-fg-secondary hover:bg-hovered hover:text-fg'
            }`}
          >
            {SHORT[b.id]}
          </button>
        ))}
        <Btn
          label="Hộp ghi chú"
          active={inCallout}
          disabled={inTable}
          on={() => c().setCallout('note').run()}
        >
          <span className="font-semibold">!</span>
        </Btn>
        <Btn label="Ảnh" on={openImage} disabled={inTable}>
          🖼
        </Btn>
        <Sep />
        <Btn label="Hoàn tác (Ctrl+Z)" on={() => c().undo().run()} disabled={!editor.can().undo()}>
          ↶
        </Btn>
        <Btn
          label="Làm lại (Ctrl+Shift+Z)"
          on={() => c().redo().run()}
          disabled={!editor.can().redo()}
        >
          ↷
        </Btn>
        {onHelp && (
          <Btn label="Phím tắt (?)" on={onHelp}>
            ⌨
          </Btn>
        )}
      </div>
      {/* Hàng ngữ cảnh: chỉ hiện khi con trỏ đứng trong bảng / khối mã / hộp ghi chú. */}
      {(inTable || inCode || inCallout) && (
        <div className="mt-1 flex w-full flex-wrap items-center gap-1 border-t border-line pt-1.5">
          {inTable && (
            <>
              <span className="px-1 text-xs text-fg-muted">Bảng:</span>
              <Btn label="Thêm hàng phía dưới" on={() => c().addRowAfter().run()}>
                + hàng
              </Btn>
              <Btn label="Thêm cột bên phải" on={() => c().addColumnAfter().run()}>
                + cột
              </Btn>
              <Btn label="Xoá hàng" on={() => c().deleteRow().run()}>
                − hàng
              </Btn>
              <Btn label="Xoá cột" on={() => c().deleteColumn().run()}>
                − cột
              </Btn>
              <Btn label="Xoá bảng" on={() => c().deleteTable().run()}>
                Xoá bảng
              </Btn>
            </>
          )}
          {inCode && (
            <label className="flex items-center gap-2 px-1 text-xs text-fg-muted">
              Ngôn ngữ
              <select
                className={selectCls}
                value={(editor.getAttributes('codeBlock').language as string) || ''}
                onChange={(e) =>
                  c()
                    .updateAttributes('codeBlock', { language: e.target.value || null })
                    .run()
                }
              >
                <option value="">(không ghi)</option>
                {CODE_LANGS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
          {inCallout && (
            <>
              <label className="flex items-center gap-2 px-1 text-xs text-fg-muted">
                Loại hộp
                <select
                  className={selectCls}
                  value={(editor.getAttributes('callout').kind as string) || 'note'}
                  onChange={(e) =>
                    c()
                      .setCallout(e.target.value as CalloutKind)
                      .run()
                  }
                >
                  {Object.entries(CALLOUT_KINDS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <Btn label="Gỡ hộp ghi chú" on={() => c().unsetCallout().run()}>
                Gỡ hộp
              </Btn>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Hằng ở cấp module: hàm mới mỗi lần vẽ khiến BubbleMenu đăng ký lại plugin ⇒ phát
// transaction ⇒ vẽ lại ⇒ lặp vô hạn ("Maximum update depth exceeded", đo 25/11/2026).
const bubbleShouldShow = ({ editor: e, from, to }: { editor: Editor; from: number; to: number }) =>
  from !== to && !e.isActive('codeBlock') && !e.isActive('image');

type Slash = { from: number; to: number; query: string; left: number; top: number };

export function MarkdownEditor({ value, onChange, resetKey, label = 'Nội dung', onHelp }: Props) {
  const changeRef = useRef(onChange);
  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [slash, setSlash] = useState<Slash | null>(null);
  const [slashIdx, setSlashIdx] = useState(0);
  // Esc đóng menu `/` cho ĐÚNG dấu `/` đó; gõ `/` mới ở chỗ khác thì mở lại.
  const dismissedRef = useRef<number | null>(null);
  const queryRef = useRef<string | null>(null);
  const keyRef = useRef<(e: KeyboardEvent) => boolean>(() => false);
  const linkRef = useRef<() => void>(() => {});

  const editor = useEditor({
    // SSR của Next: dựng ở trình duyệt, tránh lệch hydrate.
    immediatelyRender: false,
    // Trusted Types (console): tiptap chèn CSS bằng `style.innerHTML` - bộ lọc HTML sẽ làm hỏng CSS. Quy tắc gốc
    // của nó nằm ở `styles/globals.css`.
    injectCSS: false,
    extensions: [
      ...contentExtensions(),
      Markdown,
      Extension.create({
        name: 'tsuShortcuts',
        addKeyboardShortcuts: () => ({
          'Mod-k': () => {
            linkRef.current();
            return true;
          },
        }),
      }),
    ],
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'prose-tsu min-h-[360px] px-4 py-3 focus:outline-none',
        'aria-label': label,
        'aria-multiline': 'true',
        role: 'textbox',
      },
      handleKeyDown: (_view, e) => keyRef.current(e),
    },
    onUpdate: ({ editor: e }) => changeRef.current(e.getMarkdown()),
  });

  // Nạp bài khác / khôi phục bản cũ ⇒ đặt lại nội dung (không phát onUpdate).
  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
    // `value` cố ý không nằm trong deps: gõ phím đổi value, đặt lại mỗi phím là nhảy con trỏ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, resetKey]);

  // Menu `/` (ED-05): mở khi đoạn văn hiện tại CHỈ gồm `/từ-khoá` trước con trỏ.
  // Chỉ ở đầu đoạn - `/` giữa câu hay trong URL không bật menu.
  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const { $from, empty } = editor.state.selection;
      const before =
        empty && $from.parent.type.name === 'paragraph'
          ? $from.parent.textBetween(0, $from.parentOffset, undefined, '￼')
          : '';
      const m = /^\/([^\s/]{0,24})$/.exec(before);
      const from = $from.pos - before.length;
      if (!m || dismissedRef.current === from) {
        if (!m) dismissedRef.current = null;
        setSlash(null);
        return;
      }
      const at = editor.view.coordsAtPos($from.pos);
      const query = m[1] ?? '';
      if (queryRef.current !== query) {
        queryRef.current = query;
        setSlashIdx(0);
      }
      setSlash((prev) =>
        prev &&
        prev.from === from &&
        prev.to === $from.pos &&
        prev.query === query &&
        prev.left === at.left &&
        prev.top === at.bottom + 4
          ? prev
          : { from, to: $from.pos, query, left: at.left, top: at.bottom + 4 }
      );
    };
    editor.on('transaction', sync);
    return () => {
      editor.off('transaction', sync);
    };
  }, [editor]);

  const slashQuery = slash?.query;
  const items = useMemo(
    () => (slashQuery === undefined ? [] : filterBlocks(slashQuery)),
    [slashQuery]
  );
  const pick = useCallback(
    (b: Block) => {
      if (!editor || !slash) return;
      b.run(editor.chain().focus().deleteRange({ from: slash.from, to: slash.to })).run();
      setSlash(null);
    },
    [editor, slash]
  );

  useEffect(() => {
    keyRef.current = (e) => {
      if (!slash) return false;
      if (e.key === 'Escape') {
        dismissedRef.current = slash.from;
        setSlash(null);
        return true;
      }
      if (!items.length) return false;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const d = e.key === 'ArrowDown' ? 1 : -1;
        setSlashIdx((i) => (i + d + items.length) % items.length);
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const b = items[Math.min(slashIdx, items.length - 1)];
        if (b) pick(b);
        return true;
      }
      return false;
    };
  }, [slash, items, slashIdx, pick]);

  const openLink = useCallback(() => {
    if (!editor) return;
    setDialog({ kind: 'link', href: (editor.getAttributes('link').href as string) || '' });
  }, [editor]);
  useEffect(() => {
    linkRef.current = openLink;
  }, [openLink]);
  const openImage = () => setDialog({ kind: 'image', src: '', alt: '', caption: '' });

  const words = viWordCount(value);
  const minutes = readingMinutes(words);
  return (
    <div className="tsu-editor rounded-md border border-line-control bg-surface">
      {editor ? (
        <Toolbar editor={editor} openLink={openLink} openImage={openImage} onHelp={onHelp} />
      ) : (
        <div className="h-10 border-b border-line" />
      )}
      {editor && (
        // Menu nổi khi bôi chọn (ED-05): định dạng trong dòng, không hiện trong khối mã.
        <BubbleMenu
          editor={editor}
          shouldShow={bubbleShouldShow}
          className="flex gap-0.5 rounded-md border border-line bg-surface p-1 shadow-lg"
        >
          <Btn
            label="Đậm"
            active={editor.isActive('bold')}
            on={() => editor.chain().focus().toggleBold().run()}
          >
            <b>B</b>
          </Btn>
          <Btn
            label="Nghiêng"
            active={editor.isActive('italic')}
            on={() => editor.chain().focus().toggleItalic().run()}
          >
            <i>I</i>
          </Btn>
          <Btn
            label="Gạch"
            active={editor.isActive('strike')}
            on={() => editor.chain().focus().toggleStrike().run()}
          >
            <s>S</s>
          </Btn>
          <Btn
            label="Mã"
            active={editor.isActive('code')}
            on={() => editor.chain().focus().toggleCode().run()}
          >
            {'</>'}
          </Btn>
          <Btn label="Gắn liên kết" active={editor.isActive('link')} on={openLink}>
            🔗
          </Btn>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
      {slash && items.length > 0 && (
        <ul
          role="listbox"
          aria-label="Chèn khối"
          className="fixed z-50 max-h-72 w-64 overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-lg"
          style={{
            left: Math.min(
              slash.left,
              (typeof window !== 'undefined' ? window.innerWidth : 1024) - 272
            ),
            top: slash.top,
          }}
        >
          {items.map((b, i) => (
            <li
              key={b.id}
              role="option"
              aria-selected={i === slashIdx}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(b);
              }}
              onMouseEnter={() => setSlashIdx(i)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1.5 text-sm ${
                i === slashIdx ? 'bg-hovered text-fg' : 'text-fg-secondary'
              }`}
            >
              <span>{b.label}</span>
              <span className="font-mono text-xs text-fg-muted">{b.hint}</span>
            </li>
          ))}
        </ul>
      )}
      <p
        className="flex flex-wrap gap-x-3 border-t border-line px-3 py-1.5 text-xs text-fg-muted"
        aria-live="polite"
      >
        <span>{words} từ</span>
        <span>{minutes ? `~${minutes} phút đọc` : 'Chưa có chữ'}</span>
        <span>{value.length} ký tự</span>
        <span className="ml-auto hidden sm:inline">Gõ / ở đầu dòng để chèn khối</span>
      </p>

      <LinkImageDialog state={dialog} setState={setDialog} editor={editor} />
    </div>
  );
}

/** Hộp thoại Liên kết / Ảnh - thay `window.prompt` (không theo giao diện, chặn luồng JS). */
function LinkImageDialog({
  state,
  setState,
  editor,
}: {
  state: DialogState;
  setState: (s: DialogState) => void;
  editor: Editor | null;
}) {
  const [error, setError] = useState('');
  const close = () => {
    setError('');
    setState(null);
  };
  if (!state || !editor) return null;
  const c = () => editor.chain().focus();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind === 'link') {
      const url = state.href.trim();
      if (!url) {
        c().extendMarkRange('link').unsetLink().run();
        return close();
      }
      // Chặn `javascript:`/`data:` NGAY ở trình soạn (bộ vẽ công khai vẫn lọc).
      if (!LINK_OK.test(url))
        return setError('Chỉ nhận liên kết http(s), mailto hoặc đường dẫn nội bộ.');
      c().extendMarkRange('link').setLink({ href: url }).run();
      return close();
    }
    const src = state.src.trim();
    if (!/^(https:\/\/|\/)/i.test(src))
      return setError('Địa chỉ ảnh phải bắt đầu bằng https:// hoặc /.');
    if (!state.alt.trim())
      return setError('Ảnh cần mô tả (văn bản thay thế) cho trình đọc màn hình.');
    c()
      .setImage({ src, alt: state.alt.trim(), title: state.caption.trim() || undefined })
      .run();
    close();
  };
  return (
    <Modal
      open
      onClose={close}
      title={state.kind === 'link' ? 'Liên kết' : 'Chèn ảnh'}
      closeButton={false}
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        {state.kind === 'link' ? (
          <Input
            id="ed-link"
            label="Địa chỉ"
            value={state.href}
            placeholder="https://…"
            hint="Để trống rồi Lưu để gỡ liên kết."
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setState({ ...state, href: e.target.value })
            }
          />
        ) : (
          <>
            <Input
              id="ed-img-src"
              label="Địa chỉ ảnh"
              value={state.src}
              placeholder="https://…"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setState({ ...state, src: e.target.value })
              }
            />
            <Input
              id="ed-img-alt"
              label="Mô tả ảnh (bắt buộc)"
              value={state.alt}
              hint="Trình đọc màn hình đọc dòng này thay cho ảnh."
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setState({ ...state, alt: e.target.value })
              }
            />
            <Input
              id="ed-img-caption"
              label="Chú thích (tuỳ chọn)"
              value={state.caption}
              hint="Hiện dưới ảnh trên trang bài."
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setState({ ...state, caption: e.target.value })
              }
            />
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger-ink">
            {error}
          </p>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            Huỷ
          </Button>
          <Button type="submit">{state.kind === 'link' ? 'Lưu' : 'Chèn ảnh'}</Button>
        </div>
      </form>
    </Modal>
  );
}
