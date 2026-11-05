import React from 'react';
import Seo from '../components/Seo';
import DownloadSection from '../components/DownloadSection';
import { useScrollReveal } from '../lib/useScrollReveal';
import { Layout, Button, Card, Badge, SectionHeading, Avatar, EmptyState, Icon } from '@tsudev/ui';
import type { IconName } from '@tsudev/ui';
import { api } from '../lib/api';
import { KIND_LABEL, STATUS_LABEL, copyrightMeta } from '../lib/projectLabels';
import type { Post, Project, ProjectWithReleases } from '../lib/types';
import { keepStaleOnFailure } from '../lib/isr';

/**
 * Bốn phân hệ ở khối "Hệ sinh thái". Từ 29/10/2026 tsudev.com là nơi ĐĂNG VÀ
 * PHÁT HÀNH FILE CÀI ĐẶT của các app tự phát triển, nên Dự án đứng đầu.
 *
 * Trước đây mỗi mục mang một chuỗi `d` SVG viết tay cộng một `tone` luân phiên
 * brand/teal. Hai vấn đề, và cái thứ hai mới là vấn đề thật:
 *
 *   1. Bốn icon nằm NGOÀI `@tsudev/ui`, nên chúng không đi qua bảng màu theo
 *      vai trò và không cổng tương phản nào canh chúng ở ba chế độ.
 *   2. `tone` luân phiên theo VỊ TRÍ, không theo nghĩa - màu như thế là trang
 *      trí, không phải tín hiệu.
 *
 * Nay mỗi mục khai một `IconName` và màu do VAI TRÒ của icon quyết định: chữ
 * ký ra ngọc vì nó là trust, dự án ra xanh lá vì `package` thuộc nhóm create
 * (thứ tạo ra và phát hành được).
 */
const ECOSYSTEM: { title: string; desc: string; href: string; icon: IconName }[] = [
  {
    title: 'Dự án & tải về',
    desc: 'Ứng dụng, công cụ và thư viện do tsudev phát triển - tải bản cài đặt cho từng nền tảng.',
    href: '/projects',
    icon: 'package',
  },
  {
    title: 'Tài liệu',
    desc: 'Hướng dẫn cài đặt, nhật ký thay đổi và cách xử lý sự cố của từng app.',
    href: '/docs',
    icon: 'book',
  },
  {
    title: 'Blog',
    desc: 'Bài viết kỹ thuật, hướng dẫn và góc nhìn công nghệ.',
    href: '/blog',
    icon: 'list',
  },
  {
    title: 'Tải về an toàn',
    desc: 'Mỗi bản phát hành công bố SHA-256 và chữ ký Ed25519 để bạn tự đối chiếu.',
    href: '/docs',
    icon: 'signature',
  },
];

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}

type HomeProps = {
  posts: Post[];
  postsFailed: boolean;
  projects: Project[];
  projectsFailed: boolean;
  downloads: ProjectWithReleases[];
  downloadsFailed: boolean;
};

export default function Home({
  posts,
  postsFailed,
  projects,
  projectsFailed,
  downloads,
  downloadsFailed,
}: HomeProps) {
  // Bật scroll-reveal cho các khối mang class `reveal` bên dưới. Hook này tự tắt
  // dưới `prefers-reduced-motion` và KHÔNG ẩn gì khi JavaScript không chạy -
  // xem lý do ở lib/useScrollReveal.ts.
  useScrollReveal();

  return (
    <Layout active="/" bare>
      <Seo
        path="/"
        description="Tải ứng dụng do tsudev tự phát triển cho Windows, Android, macOS, Linux - kèm SHA-256, chữ ký Ed25519, tài liệu cài đặt và blog kỹ thuật."
      />

      {/* ---------- HERO ----------
          Tông chàm (phiếu 20261105-03). Khung bên phải trước đây là một
          "terminal" in cứng `content healthy` - một trạng thái KHÔNG được đo, tức
          là nói dối khi backend chết. Nay nó mô tả đúng thứ trang này phát hành:
          nền tảng, checksum, chữ ký - không có con số nào giả vờ là số đo. */}
      <section className="relative overflow-hidden border-b border-line tsu-hero-bg">
        <div
          className="absolute inset-0 tsu-grid"
          // `#000` ở đây là kênh alpha của mặt nạ, không phải màu hiển thị.
          style={{
            maskImage: 'radial-gradient(70% 70% at 70% 0%, #000 25%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(70% 70% at 70% 0%, #000 25%, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-fg-secondary shadow-sm mb-6">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              Ứng dụng tự phát triển · tải miễn phí
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-fg text-balance leading-[1.08]">
              Phần mềm nhỏ, gọn,
              <br />
              <span className="tsu-text-gradient">làm ra để dùng thật</span>.
            </h1>
            <p className="mt-6 text-lg text-fg-secondary max-w-xl">
              Nơi tsudev phát hành các ứng dụng tự phát triển - tải bản cài đặt cho Windows,
              Android, macOS, Linux, kèm checksum và chữ ký để bạn tự kiểm trước khi cài.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button as="a" href="/projects" size="lg">
                <Icon name="download" size={18} />
                Xem & tải ứng dụng
              </Button>
              <Button as="a" href="/docs" variant="secondary" size="lg">
                Hướng dẫn cài đặt
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted">
              {['Mã nguồn mở', 'SHA-256 do máy chủ tính', 'Chữ ký Ed25519'].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Icon name="check-circle" size={16} />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-up hidden lg:block" style={{ animationDelay: '.1s' }}>
            <Card className="p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-glow">
                  <Icon name="package" size={24} />
                </span>
                <div>
                  <div className="font-semibold text-fg">Một bản phát hành trên tsudev</div>
                  <div className="text-sm text-fg-muted">gồm những gì bạn nhận được</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {(
                  [
                    ['windows', 'Windows'],
                    ['android', 'Android'],
                    ['apple', 'macOS'],
                    ['linux', 'Linux'],
                  ] as [IconName, string][]
                ).map(([icon, label]) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-line bg-base py-3 text-xs text-fg-secondary"
                  >
                    <Icon name={icon} size={20} />
                    {label}
                  </div>
                ))}
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Icon name="hash" size={18} />
                  <div>
                    <dt className="font-medium text-fg">SHA-256</dt>
                    <dd className="text-fg-muted">Máy chủ tự tính khi niêm phong tệp.</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="signature" size={18} />
                  <div>
                    <dt className="font-medium text-fg">Chữ ký Ed25519</dt>
                    <dd className="text-fg-muted">Kiểm được bằng khoá công khai (JWKS).</dd>
                  </div>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4">
        {/* ---------- ECOSYSTEM ---------- */}
        <section className="pt-16 pb-6 reveal">
          <SectionHeading eyebrow="Có gì ở đây" title="Mọi thứ cho một ứng dụng, ở một chỗ" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ECOSYSTEM.map((e) => (
              <Card as="a" hover key={e.title} href={e.href} className="p-5 block group">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl mb-4 bg-glow">
                  <Icon name={e.icon} size={22} />
                </span>
                <h3 className="font-semibold text-fg group-hover:text-link transition-colors">
                  {e.title}
                </h3>
                <p className="mt-1.5 text-sm text-fg-muted">{e.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---------- TẢI VỀ ----------
            Đặt TRƯỚC khu "Dự án": thứ người lạ vào tsudev.com muốn làm được
            ngay là TẢI một thứ về dùng, không phải đọc mô tả dự án. Khu này tự
            ẩn khi chưa có bản phát hành nào - xem DownloadSection. */}
        <DownloadSection items={downloads} failed={downloadsFailed} />

        {/* ---------- PROJECTS ---------- */}
        <section className="py-10 reveal">
          <SectionHeading
            eyebrow="Sản phẩm"
            title="Dự án của tsudev"
            action={
              <Button as="a" href="/projects" variant="ghost" size="sm">
                Xem tất cả →
              </Button>
            }
          />
          <div className="grid md:grid-cols-3 gap-4">
            {/* `projectsFailed` phải được kiểm TRƯỚC `length === 0`: khi lượt gọi
                thất bại thì `projects` cũng rỗng, nên đảo thứ tự là nhánh lỗi
                không bao giờ chạy tới - đúng kiểu hỏng im lặng mà cả đợt này ra
                đời để chấm dứt. */}
            {projectsFailed ? (
              <div className="md:col-span-3">
                <EmptyState
                  kind="failed"
                  icon="warning"
                  title="Không tải được danh sách dự án"
                  explain="Máy chủ nội dung không trả lời. Danh sách dự án vẫn còn nguyên."
                  action={{ label: 'Mở trang dự án', href: '/projects' }}
                />
              </div>
            ) : (
              projects.length === 0 && (
                <div className="md:col-span-3">
                  <EmptyState
                    icon="tag"
                    title="Chưa có dự án nào"
                    explain="Dự án do chủ dự án đăng thủ công, vì mỗi dự án mang phiên bản, giấy phép và trạng thái bản quyền."
                  />
                </div>
              )
            )}
            {projects.slice(0, 3).map((p: Project) => {
              const cr = copyrightMeta(p.copyrightStatus);
              return (
                <Card
                  as="a"
                  hover
                  key={p.id}
                  href={`/projects/${p.slug}`}
                  className="p-5 flex flex-col group"
                >
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge tone="neutral">{KIND_LABEL[p.kind] || p.kind}</Badge>
                    <Badge tone="outline">{STATUS_LABEL[p.status] || p.status}</Badge>
                  </div>
                  <h3 className="font-semibold text-fg text-lg leading-snug group-hover:text-link transition-colors text-balance">
                    {p.name}
                  </h3>
                  <p className="mt-2 text-sm text-fg-muted flex-1">{p.summary}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                    <Badge tone={cr.tone}>{cr.label}</Badge>
                    {p.license && <span className="font-mono">{p.license}</span>}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ---------- FEATURED POSTS ---------- */}
        <section className="py-10 reveal">
          <SectionHeading
            eyebrow="Mới nhất"
            title="Bài viết nổi bật"
            action={
              <Button as="a" href="/blog" variant="ghost" size="sm">
                Xem tất cả →
              </Button>
            }
          />
          <div className="grid md:grid-cols-3 gap-4">
            {postsFailed ? (
              <div className="md:col-span-3">
                <EmptyState
                  kind="failed"
                  icon="warning"
                  title="Không tải được bài viết"
                  explain="Máy chủ nội dung không trả lời. Các bài đã đăng vẫn còn nguyên."
                  action={{ label: 'Mở trang blog', href: '/blog' }}
                />
              </div>
            ) : (
              posts.length === 0 && (
                <div className="md:col-span-3">
                  <EmptyState
                    icon="doc"
                    title="Chưa có bài viết"
                    explain="Bài viết do tác giả đăng thủ công, nên khoảng trống giữa hai bài là bình thường."
                    action={{ label: 'Xem toàn bộ blog', href: '/blog' }}
                  />
                </div>
              )
            )}
            {posts.slice(0, 3).map((p: Post) => (
              <Card
                as="a"
                hover
                key={p.id}
                href={`/blog/${p.slug}`}
                className="p-5 flex flex-col group"
              >
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(p.tags || []).slice(0, 2).map((t: string) => (
                    <Badge key={t} tone="neutral">
                      {t}
                    </Badge>
                  ))}
                </div>
                <h3 className="font-semibold text-fg text-lg leading-snug group-hover:text-link transition-colors text-balance">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-fg-muted flex-1">{p.excerpt}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-fg-muted">
                  <Avatar name={p.author?.displayName || 'tsudev'} size={22} />
                  <span>{p.author?.displayName || 'tsudev'}</span>
                  <span>·</span>
                  <span>{timeAgo(p.createdAt)}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="pb-20">
          <div className="tsu-cta-bg rounded-2xl border border-line p-10 md:p-14 text-center">
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface shadow-sm mb-5">
                <Icon name="shield" size={24} />
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-fg text-balance">
                Tải về rồi mà Windows hay Android cảnh báo?
              </h2>
              <p className="mt-3 text-fg-secondary max-w-lg mx-auto">
                Dự án cá nhân không có chứng chỉ ký mã thương mại. Mỗi bản phát hành đều kèm SHA-256
                và chữ ký Ed25519 - tài liệu chỉ cách đối chiếu trước khi cài.
              </p>
              <div className="mt-7 flex justify-center gap-3">
                <Button as="a" href="/projects" size="lg">
                  Xem ứng dụng
                </Button>
                <Button as="a" href="/docs" variant="secondary" size="lg">
                  Tài liệu
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  // Lấy đúng số mục mà trang này VẼ RA (mỗi khu ba cái). Bản trước lấy 6 bài,
  // 100 dự án và toàn bộ tài liệu chỉ để đếm cho hàng số liệu ở hero - mà phép
  // đếm đó đếm nhầm: nó đếm số bản ghi VỪA TẢI VỀ chứ không phải số bản ghi
  // trên site, nên "Bài viết" đứng yên ở 6 trong khi blog có 48. Hàng số liệu
  // đã bỏ; đừng dựng lại bằng `.length` của một truy vấn có trần.
  const [rPosts, rProjects, rDownloads] = await Promise.all([
    api.posts(3),
    api.projects(3),
    // Trần 6: trang chủ vẽ tối đa hai hàng ba thẻ. Lấy 20 rồi cắt ở client là
    // trả tiền băng thông cho thứ không hiện ra - đúng lỗi mà khối số liệu hero
    // cũ đã mắc (lấy 100 dự án chỉ để đếm).
    api.releases(6),
  ]);

  // Hai khu độc lập nhau nên hai cờ RIÊNG, không gộp thành một `failed` chung:
  // blog chết không có nghĩa là danh sách dự án cũng chết, và nói nó chết là nói
  // sai với người đọc.
  // ISR (lib/isr.ts): blog hoặc dự án chết lúc dựng lại ⇒ GIỮ bản cache cũ. Khu
  // tải về chết thì không chặn - trang vẫn có giá trị, khu đó tự hiện trạng thái lỗi.
  const revalidate = keepStaleOnFailure(rPosts.failed || rProjects.failed, '/');
  return {
    revalidate,
    props: {
      posts: rPosts.data,
      postsFailed: rPosts.failed,
      projects: rProjects.data,
      projectsFailed: rProjects.failed,
      downloads: rDownloads.data,
      downloadsFailed: rDownloads.failed,
    },
  };
}
