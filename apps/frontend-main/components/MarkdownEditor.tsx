import React, { useEffect, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Markdown } from '@tiptap/markdown';
import { viWordCount } from '@tsudev/search';

/**
 * Trình soạn bài (P2.3, quyết định D3 - docs/adr/0001-tiptap-markdown.md):
 * Tiptap 3 + extension Markdown chính thức. Vào/ra đều là MARKDOWN - `contentMd`
 * vẫn là nguồn sự thật duy nhất, nên render công khai, ISR, tìm kiếm không đổi.
 *
 * Chỉ bật những định dạng Markdown biểu diễn được (đậm, nghiêng, gạch ngang, mã,
 * tiêu đề, danh sách, trích dẫn, phân cách, khối mã, liên kết, ảnh). Định dạng
 * Markdown không lưu được (màu chữ, căn lề, gạch chân) KHÔNG có nút - một nút bấm
 * được mà lưu xong biến mất là lỗi im lặng tệ hơn không có nút.
 */
type Props = {
  value: string;
  onChange: (markdown: string) => void;
  /** Đổi khi nạp bài khác/khôi phục bản cũ - trình soạn đặt lại nội dung. */
  resetKey?: string;
  label?: string;
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
      className={`min-w-8 rounded-md px-2 py-1 text-sm transition-colors disabled:opacity-40 ${
        active ? 'bg-glow text-link' : 'text-fg-secondary hover:bg-hovered hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const c = () => editor.chain().focus();
  const link = () => {
    const prev = (editor.getAttributes('link').href as string) || '';
    const url = window.prompt('Địa chỉ liên kết (https://…). Để trống để gỡ.', prev);
    if (url === null) return;
    if (!url.trim()) return c().unsetLink().run();
    // Chặn `javascript:`/`data:` NGAY ở trình soạn (backend vẫn lọc khi render).
    if (!LINK_OK.test(url.trim()))
      return window.alert('Chỉ nhận liên kết http(s), mailto hoặc đường dẫn nội bộ.');
    c().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };
  const image = () => {
    const src = window.prompt('Địa chỉ ảnh (https://…)');
    if (!src || !/^https:\/\//i.test(src.trim())) return;
    const alt = window.prompt('Mô tả ảnh (bắt buộc - cho trình đọc màn hình)') || '';
    if (!alt.trim()) return window.alert('Ảnh cần mô tả (văn bản thay thế).');
    c().setImage({ src: src.trim(), alt: alt.trim() }).run();
  };
  return (
    <div
      role="toolbar"
      aria-label="Định dạng"
      className="sticky top-14 z-10 flex flex-wrap gap-0.5 border-b border-line bg-surface p-1.5"
    >
      <Btn label="Đậm (Ctrl+B)" active={editor.isActive('bold')} on={() => c().toggleBold().run()}>
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
      <Btn label="Mã trong dòng" active={editor.isActive('code')} on={() => c().toggleCode().run()}>
        {'</>'}
      </Btn>
      {([2, 3, 4] as const).map((level) => (
        <Btn
          key={level}
          label={`Tiêu đề cấp ${level}`}
          active={editor.isActive('heading', { level })}
          on={() => c().toggleHeading({ level }).run()}
        >
          H{level}
        </Btn>
      ))}
      <Btn
        label="Danh sách chấm"
        active={editor.isActive('bulletList')}
        on={() => c().toggleBulletList().run()}
      >
        •
      </Btn>
      <Btn
        label="Danh sách số"
        active={editor.isActive('orderedList')}
        on={() => c().toggleOrderedList().run()}
      >
        1.
      </Btn>
      <Btn
        label="Trích dẫn"
        active={editor.isActive('blockquote')}
        on={() => c().toggleBlockquote().run()}
      >
        ❝
      </Btn>
      <Btn
        label="Khối mã"
        active={editor.isActive('codeBlock')}
        on={() => c().toggleCodeBlock().run()}
      >
        {'{ }'}
      </Btn>
      <Btn label="Đường phân cách" on={() => c().setHorizontalRule().run()}>
        ―
      </Btn>
      <Btn label="Liên kết" active={editor.isActive('link')} on={link}>
        🔗
      </Btn>
      <Btn label="Ảnh" on={image}>
        🖼
      </Btn>
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
    </div>
  );
}

export function MarkdownEditor({ value, onChange, resetKey, label = 'Nội dung' }: Props) {
  const changeRef = useRef(onChange);
  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    // SSR của Next: dựng ở trình duyệt, tránh lệch hydrate.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Gạch chân không có trong Markdown - tắt để không có định dạng lưu xong mất.
        underline: false,
        link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] },
        heading: { levels: [2, 3, 4] },
      }),
      Image,
      Markdown,
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

  const words = viWordCount(value);
  return (
    <div className="overflow-hidden rounded-md border border-line-control bg-surface">
      {editor ? <Toolbar editor={editor} /> : <div className="h-10 border-b border-line" />}
      <EditorContent editor={editor} />
      <p className="border-t border-line px-3 py-1.5 text-xs text-fg-muted" aria-live="polite">
        {words} từ · {value.length} ký tự
      </p>
    </div>
  );
}
