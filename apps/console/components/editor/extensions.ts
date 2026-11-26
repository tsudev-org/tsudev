import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Callout } from './callout';

/**
 * Bộ extension NỘI DUNG của trình soạn - MỘT nguồn cho cả `MarkdownEditor.tsx`
 * lẫn `test/mdRoundTrip.test.ts`. Bản trước khai cấu hình hai nơi và test phải
 * chép tay cho khớp; lệch một tuỳ chọn là test xanh trên bộ tuần tự hoá khác
 * với bộ người dùng thật đang chạy.
 *
 * Chỉ bật định dạng Markdown (GFM + `> [!NOTE]`) biểu diễn được. Định dạng không
 * lưu được (màu chữ, căn lề, gạch chân, gộp ô bảng) KHÔNG có nút - một nút bấm
 * được mà lưu xong biến mất là lỗi im lặng tệ hơn không có nút.
 */
export const contentExtensions = () => [
  StarterKit.configure({
    // Gạch chân không có trong Markdown - tắt để không có định dạng lưu xong mất.
    underline: false,
    link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] },
    heading: { levels: [2, 3, 4] },
  }),
  // `title` của ảnh = chú thích: `lib/md.ts` vẽ ảnh có title thành <figure><figcaption>.
  Image,
  // Bảng GFM: ô không gộp được (Markdown không có colspan) ⇒ không có nút gộp ô.
  TableKit.configure({ table: { resizable: false } }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Callout,
];
