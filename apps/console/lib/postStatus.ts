import type { BadgeTone } from '@tsudev/ui';

/** Trạng thái bài (P2) - khớp enum `PostStatus` của schema, nhãn tiếng Việt cho mọi trang CMS. */
export type PostStatus = 'DRAFT' | 'PENDING' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export const POST_STATUSES: PostStatus[] = [
  'DRAFT',
  'PENDING',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
];

export const STATUS_LABEL: Record<PostStatus, { text: string; tone: BadgeTone }> = {
  DRAFT: { text: 'Bản nháp', tone: 'neutral' },
  PENDING: { text: 'Chờ duyệt', tone: 'warning' },
  SCHEDULED: { text: 'Đã hẹn giờ', tone: 'info' },
  PUBLISHED: { text: 'Đã đăng', tone: 'success' },
  ARCHIVED: { text: 'Lưu trữ', tone: 'outline' },
};
