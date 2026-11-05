import type { IconName } from '@tsudev/ui';

/**
 * Nhãn tiếng Việt + icon cho chuyên mục tài liệu. Cột `Doc.category` là chuỗi tự
 * do (mặc định "general"), nên trước đây trang in thẳng "GUIDE", "REFERENCE" -
 * tiếng Anh, viết hoa, giữa một site tiếng Việt. Chuyên mục chưa có trong bảng
 * vẫn hiện, chỉ với nhãn viết hoa chữ đầu và icon chung.
 */
const KNOWN: Record<string, { label: string; icon: IconName; order: number }> = {
  guide: { label: 'Hướng dẫn', icon: 'book', order: 1 },
  install: { label: 'Cài đặt', icon: 'download', order: 2 },
  changelog: { label: 'Nhật ký thay đổi', icon: 'clock', order: 3 },
  troubleshooting: { label: 'Xử lý sự cố', icon: 'question', order: 4 },
  security: { label: 'Bảo mật', icon: 'shield', order: 5 },
  reference: { label: 'Tham khảo kỹ thuật', icon: 'code', order: 6 },
  general: { label: 'Chung', icon: 'doc', order: 9 },
};

export function docCategory(raw: string | null | undefined) {
  const key = (raw || 'general').trim().toLowerCase();
  const k = KNOWN[key];
  if (k) return { key, ...k };
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return { key, label, icon: 'doc' as IconName, order: 8 };
}
