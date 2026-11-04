// Hình dạng dữ liệu mà các service trả về, nhìn từ phía app.
//
// Đây là HỢP ĐỒNG ĐỌC, không phải bản sao schema Prisma: chỉ khai những trường
// app thực sự dùng tới. Service thêm trường mới thì file này không cần đổi;
// service ĐỔI hoặc BỎ một trường đang được khai ở đây thì trang dùng nó thành
// lỗi biên dịch - đúng lúc cần biết.
//
// Trước đây mọi thứ đi qua `getJSON()` đều là `any`, nên một lần đổi tên trường
// ở service chỉ lộ ra dưới dạng "undefined" hiện trên trang thật.

import type { PageMeta } from '@tsudev/types';

export type Author = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
};

export type PostRef = {
  label: string;
  url: string;
};

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  contentMd?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  publishedAt?: string | null;
  author?: Author | null;
  tags?: string[];
  references?: PostRef[];
  coverImageUrl?: string | null;
  metaDescription?: string | null;
};

/** Một mục facet: giá trị lọc kèm số kết quả dự kiến (SEARCH_AND_FILTER §6.3). */
export type Facet = { slug: string; count: number };

/**
 * Một hàng kết quả tìm kiếm. Phạm vi tìm kiếm phủ NHIỀU loại nội dung từ
 * DOCS-SEARCH (26/08/2026), nên `data` không còn là `Post[]`. Phân biệt bằng
 * `kind` chứ đừng đoán theo trường nào có mặt - thêm loại mới (§10.4) chỉ là thêm
 * một nhánh vào union này, và TypeScript sẽ chỉ ra mọi chỗ phải xử lý nó.
 */
export type SearchHit =
  | ({ kind: 'post' } & Post)
  | {
      kind: 'doc';
      id: string;
      slug: string;
      title: string;
      /** Đoạn trích dựng quanh chỗ khớp - Doc không có cột tóm tắt. */
      excerpt: string;
      category: string;
      updatedAt: string;
    };

/** Kết quả từ endpoint tìm kiếm `/api/posts/search` (SEARCH_AND_FILTER §7). */
export type PostSearchResult = {
  data: SearchHit[];
  // `total_pages` đến từ `pageMeta` của @tsudev/types - RecordFooter dựng dãy ô
  // trang từ nó, nên thiếu trường này là bộ phân trang câm.
  meta: PageMeta & { query_normalized: string };
  facets: { tag: Facet[]; category: Facet[]; type: Facet[] };
};

export type Doc = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  contentMd?: string | null;
  category?: string | null;
  updatedAt?: string | null;
};

/** Nền tảng của một bản phát hành. Khớp enum `ReleasePlatform` của Prisma. */
export type ReleasePlatform = 'ANDROID' | 'WINDOWS' | 'MACOS' | 'LINUX' | 'WEB' | 'SOURCE';

export type ReleaseChannel = 'STABLE' | 'BETA' | 'ALPHA';

/**
 * Một bản phát hành tải về được, ở dạng mà API công khai trả ra.
 *
 * ⚠️ KHÔNG có `storageKey` ở đây, và đó là CỐ Ý: khoá object trong R2 không bao
 * giờ ra khỏi content-service. Đường tải đối ngoại duy nhất là `downloadPath`
 * (đi qua route đếm) hoặc `externalUrl` (nền tảng WEB/SOURCE). Thêm `storageKey`
 * vào đây là mời người ta gọi thẳng bucket và vô hiệu hoá bộ đếm.
 */
export type ProjectRelease = {
  id: string;
  version: string;
  channel: ReleaseChannel;
  platform: ReleasePlatform;
  arch?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  /** Thập lục phân 64 ký tự. Người tải đối chiếu bằng `sha256sum`. */
  sha256?: string | null;
  /** Ed25519 base64url của `sha256`. Kiểm bằng khoá công khai ở JWKS. */
  signature?: string | null;
  signingKid?: string | null;
  releaseNotesMd?: string;
  minOsVersion?: string | null;
  downloadCount?: number;
  publishedAt?: string | null;
  externalUrl?: string | null;
  /** Đường tải qua route đếm. Null khi bản này không có tệp (WEB/SOURCE). */
  downloadPath?: string | null;
};

/** Một dự án kèm toàn bộ bản phát hành của nó - hình dạng của `GET /api/releases`. */
export type ProjectWithReleases = {
  project: Project;
  releases: ProjectRelease[];
};

export type Project = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  kind: string;
  status: string;
  version?: string | null;
  releasedAt?: string | null;
  license?: string | null;
  copyrightStatus?: string | null;
  copyrightNo?: string | null;
  copyrightAt?: string | null;
  copyrightOwner?: string | null;
  repoUrl?: string | null;
  homepageUrl?: string | null;
  downloadUrl?: string | null;
  descriptionMd?: string | null;
  featured?: boolean;
  published?: boolean;
  sortOrder?: number;
};
