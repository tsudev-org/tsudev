import React from 'react';
import { Modal } from '@tsudev/ui';

/**
 * Bảng phím tắt (ED-14) - mở bằng `?` (khi không gõ trong ô chữ), Ctrl+/ ở bất
 * kỳ đâu, hoặc nút "Phím tắt" trên thanh công cụ. Phím định dạng là mặc định của
 * Tiptap 3 (đã kiểm trong mã extension), không phải phím tự đặt.
 */
const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: 'Trang soạn',
    keys: [
      ['Ctrl + S', 'Lưu'],
      ['Ctrl + Enter', 'Gửi duyệt (bản nháp) hoặc Lưu'],
      ['Ctrl + Shift + P', 'Bật/tắt Xem trước'],
      ['?  hoặc  Ctrl + /', 'Mở bảng này'],
    ],
  },
  {
    title: 'Trong trình soạn',
    keys: [
      ['/', 'Menu chèn khối (ở đầu dòng trống)'],
      ['Ctrl + B', 'Đậm'],
      ['Ctrl + I', 'Nghiêng'],
      ['Ctrl + Shift + S', 'Gạch ngang'],
      ['Ctrl + E', 'Mã trong dòng'],
      ['Ctrl + K', 'Liên kết'],
      ['Ctrl + Alt + 2 / 3 / 4', 'Tiêu đề cấp 2 / 3 / 4'],
      ['Ctrl + Shift + 8', 'Danh sách chấm'],
      ['Ctrl + Shift + 7', 'Danh sách số'],
      ['Ctrl + Shift + 9', 'Danh sách việc'],
      ['Ctrl + Shift + B', 'Trích dẫn'],
      ['Ctrl + Alt + C', 'Khối mã'],
      ['Tab / Shift + Tab', 'Sang ô kế / ô trước (trong bảng)'],
      ['Ctrl + Z / Ctrl + Shift + Z', 'Hoàn tác / Làm lại'],
    ],
  },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Phím tắt">
      {GROUPS.map((g) => (
        <section key={g.title} className="mb-4 last:mb-0">
          <h4 className="mb-2 text-sm font-semibold text-fg">{g.title}</h4>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {g.keys.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt>
                  <kbd className="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-xs text-fg">
                    {k}
                  </kbd>
                </dt>
                <dd className="text-fg-secondary">{v}</dd>
              </React.Fragment>
            ))}
          </dl>
        </section>
      ))}
      <p className="mt-3 text-xs text-fg-muted">Trên macOS dùng ⌘ thay cho Ctrl.</p>
    </Modal>
  );
}
