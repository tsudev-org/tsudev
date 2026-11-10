import React from 'react';
import { useRecoverBuildPlaceholder } from '../lib/useRecoverBuildPlaceholder';
import Seo from '../components/Seo';
import DownloadSection from '../components/DownloadSection';
import EcoAppCard from '../components/EcoAppCard';
import { useScrollReveal } from '../lib/useScrollReveal';
import {
  Layout,
  Button,
  Card,
  Badge,
  SectionHeading,
  Avatar,
  EmptyState,
  Icon,
  platformChipClass,
  platformInkClass,
  ECOSYSTEM_APPS,
} from '@tsudev/ui';
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
const FEATURES: { title: string; desc: string; href: string; icon: IconName }[] = [
  {
    title: 'Danh bạ ứng dụng',
    desc: 'Mọi app của hệ sinh thái ở một chỗ - tìm, lọc theo nền tảng, cài nhiều app một lượt bằng winget.',
    href: '/apps',
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
  const retrying = useRecoverBuildPlaceholder(postsFailed || projectsFailed);
  // Bật scroll-reveal cho các khối mang class `reveal` bên dưới. Hook này tự tắt
  // dưới `prefers-reduced-motion` và KHÔNG ẩn gì khi JavaScript không chạy -
  // xem lý do ở lib/useScrollReveal.ts.
  useScrollReveal();

  return (
    <Layout active="/" bare>
      <Seo
        path="/"
        description="Hệ sinh thái phần mềm tsudev: tìm, tải và cài ứng dụng cho Windows, Android, macOS, Linux - website riêng từng sản phẩm, winget, SHA-256 và chữ ký Ed25519."
      />

      {/* ---------- HERO ----------
          Tông đen + xanh (chủ dự án chọn 10/11/2026), bố cục học theo winstall.app:
          ô tìm ứng dụng là thứ đầu tiên mắt chạm tới. Ô đó là <form method="get">
          THẬT trỏ vào /apps - chạy được cả khi JavaScript chưa tải.

          Khung bên phải là các LỆNH THẬT (gói winget có trong microsoft/winget-pkgs,
          đo 10/11/2026), không phải một "terminal" in trạng thái giả - bản cũ từng
          in cứng `content healthy`, tức là nói dối khi backend chết. */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="tsu-aurora" aria-hidden="true">
          <span />
        </div>
        <div className="absolute inset-0 tsu-grid tsu-grid-fade" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-line tsu-glass px-3 py-1 text-xs font-semibold text-fg-secondary mb-6">
              <span className="tsu-live-dot h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              {ECOSYSTEM_APPS.length} ứng dụng · Windows · Android · macOS · Linux
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-fg text-balance leading-[1.08] md:leading-(--text-6xl--line-height)">
              Hệ sinh thái phần mềm
              <br />
              <span className="tsu-text-gradient">nhỏ, gọn, dùng thật</span>.
            </h1>
            <p className="mt-6 text-lg text-fg-secondary max-w-xl">
              Tìm, tải và cài các ứng dụng do tsudev tự phát triển - mở website riêng của từng sản
              phẩm, cài nhiều app một lượt bằng winget, kèm checksum và chữ ký để bạn tự kiểm.
            </p>

            <form
              action="/apps"
              method="get"
              role="search"
              className="mt-8 flex max-w-xl items-center gap-2 rounded-xl border border-line-control tsu-glass p-1.5 pl-4 focus-within:border-primary"
            >
              <Icon name="search" size={20} />
              <input
                type="search"
                name="q"
                aria-label="Tìm ứng dụng trong hệ sinh thái tsudev"
                placeholder="Bạn cần app gì? Ví dụ: chuyển đổi tệp"
                className="h-11 min-w-0 flex-1 bg-transparent text-base text-fg outline-hidden placeholder:text-fg-muted"
              />
              <button
                type="submit"
                className="tsu-btn-glow inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
              >
                Tìm app
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button as="a" href="/apps" size="lg" className="tsu-btn-glow">
                <Icon name="grid" size={18} />
                Duyệt mọi ứng dụng
              </Button>
              <Button as="a" href="/projects" variant="secondary" size="lg">
                <Icon name="download" size={18} />
                Bản phát hành có chữ ký
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted">
              {['Mã nguồn mở', 'SHA-256 do máy chủ tính', 'Chữ ký Ed25519', 'Cài bằng winget'].map(
                (t) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <Icon name="check-circle" size={16} />
                    {t}
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="animate-fade-up hidden lg:block" style={{ animationDelay: '.1s' }}>
            <div className="tsu-glow-card rounded-2xl border border-line tsu-glass shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-danger" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-warning" aria-hidden="true" />
                <span className="h-3 w-3 rounded-full bg-success" aria-hidden="true" />
                <span className="ml-2 text-xs text-fg-muted font-mono">
                  PowerShell - cài bằng winget
                </span>
              </div>
              <pre className="px-5 py-4 font-mono text-sm leading-relaxed text-fg-secondary whitespace-pre-wrap">
                {ECOSYSTEM_APPS.filter((a) => a.winget).map((a) => (
                  <span key={a.id} className="block">
                    <span className="text-accent">PS&gt;</span> winget install --id{' '}
                    <span className="text-link">{a.winget}</span> -e
                  </span>
                ))}
                <span className="mt-2 block text-fg-muted">
                  # hoặc chọn nhiều app ở /apps để lấy một lệnh
                </span>
              </pre>
              <div className="grid grid-cols-4 gap-2 border-t border-line p-4">
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
                    className={`flex flex-col items-center gap-1.5 rounded-lg border border-line bg-base py-3 text-xs text-fg-secondary ${platformChipClass(
                      icon
                    )}`}
                  >
                    <Icon name={icon} size={20} />
                    {/* Chữ đổi màu cùng dấu hiệu khi ô ra màu hãng - nếu không
                        chữ xám đứng trên nền xanh/vàng sẽ tụt tương phản. */}
                    <span className={platformInkClass(icon)}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4">
        {/* ---------- HỆ SINH THÁI ----------
            Mỗi thẻ mở WEBSITE RIÊNG của sản phẩm (*.tsudev.com) ở tab mới - đó là
            nơi giới thiệu đầy đủ và tải bản cài đặt của từng app. */}
        <section className="pt-16 pb-6 reveal" id="he-sinh-thai">
          <SectionHeading
            eyebrow="Hệ sinh thái"
            title="Sản phẩm của tsudev"
            action={
              <Button as="a" href="/apps" variant="ghost" size="sm">
                Danh bạ đầy đủ →
              </Button>
            }
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ECOSYSTEM_APPS.slice(0, 6).map((a) => (
              <EcoAppCard key={a.id} app={a} />
            ))}
          </div>
        </section>

        {/* ---------- CÓ GÌ Ở ĐÂY ---------- */}
        <section className="pt-10 pb-6 reveal">
          <SectionHeading eyebrow="Có gì ở đây" title="Mọi thứ cho một ứng dụng, ở một chỗ" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((e) => (
              <a
                key={e.title}
                href={e.href}
                className="tsu-glow-card block rounded-xl border border-line bg-surface p-5 group"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl mb-4 bg-glow">
                  <Icon name={e.icon} size={22} />
                </span>
                <h3 className="font-semibold text-fg group-hover:text-link transition-colors">
                  {e.title}
                </h3>
                <p className="mt-1.5 text-sm text-fg-muted">{e.desc}</p>
              </a>
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
                  title={retrying ? 'Đang cập nhật nội dung…' : 'Không tải được danh sách dự án'}
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
                  title={retrying ? 'Đang cập nhật nội dung…' : 'Không tải được bài viết'}
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
          <div className="relative overflow-hidden rounded-2xl border border-line">
            <div className="tsu-aurora" aria-hidden="true">
              <span />
            </div>
            <div className="relative tsu-glass p-10 md:p-14 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-5 bg-glow border border-line">
                <Icon name="shield" size={24} />
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-fg text-balance">
                Tải về rồi mà Windows hay Android cảnh báo?
              </h2>
              <p className="mt-3 text-fg-secondary max-w-lg mx-auto">
                Dự án cá nhân không có chứng chỉ ký mã thương mại. Mỗi bản phát hành đều kèm SHA-256
                và chữ ký Ed25519 - tài liệu chỉ cách đối chiếu trước khi cài.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button as="a" href="/apps" size="lg" className="tsu-btn-glow">
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
