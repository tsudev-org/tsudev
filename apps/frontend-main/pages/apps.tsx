import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { viNormalizeText } from '@tsudev/search';
import {
  Layout,
  Icon,
  EmptyState,
  ECOSYSTEM_APPS,
  ECO_GAMES,
  ECO_PLATFORM_LABEL,
  ECO_CATEGORY_LABEL,
  PKG_REPO,
} from '@tsudev/ui';
import type { EcoPlatform, EcoCategory, IconName } from '@tsudev/ui';
import Seo from '../components/Seo';
import PageHeader from '../components/PageHeader';
import EcoAppCard from '../components/EcoAppCard';
import EcoGameCard from '../components/EcoGameCard';
import InstallTray from '../components/InstallTray';

/**
 * Danh bạ ứng dụng của hệ sinh thái tsudev - học theo winstall.app:
 *   - tìm nhanh (bỏ dấu tiếng Việt, khớp tên + mô tả) và lọc theo nền tảng/nhóm;
 *   - chọn NHIỀU app/game (ô tròn hoặc bấm vùng trống của thẻ) rồi lấy MỘT lệnh cài
 *     gộp cho từng hệ điều hành (InstallTray) - winget không bao giờ chung dòng với apt/brew;
 *   - mỗi thẻ có nút mở website riêng của sản phẩm / trang tải ở TAB MỚI.
 *
 * Trang TĨNH (không getStaticProps/ISR): dữ liệu là danh mục `ECOSYSTEM_APPS`
 * trong @tsudev/ui, không gọi backend, nên không có nhánh "máy chủ chết".
 * Mục "Cài bằng lệnh" (#cai-bang-lenh) gom cách thêm nguồn của mọi kênh gói.
 *
 * Tham số `?q=` (ô tìm ở trang chủ gửi tới) được đọc từ router SAU hydrat; ô
 * nhập giữ giá trị riêng một khi người dùng gõ - không đồng bộ ngược bằng effect
 * (react-hooks 7 cấm set-state-in-effect).
 */

/** Bốn kênh gói của hệ sinh thái - lệnh THÊM NGUỒN (một lần cho mỗi máy). */
const CHANNELS: { name: string; os: string; icon: IconName; setup: string; note: string }[] = [
  {
    name: 'winget',
    os: 'Windows 10/11',
    icon: 'windows',
    setup: 'winget install --id <mã gói> -e',
    note: 'Có sẵn trong Windows, không cần thêm nguồn. Mã gói ghi trên thẻ từng app.',
  },
  {
    name: 'Scoop',
    os: 'Windows',
    icon: 'windows',
    setup: 'scoop bucket add tsudev https://github.com/tsudev-org/scoop-bucket',
    note: 'Cài không cần quyền quản trị; cập nhật: scoop update *.',
  },
  {
    name: 'Homebrew',
    os: 'macOS / Linux',
    icon: 'apple',
    setup: 'brew tap tsudev-org/tap',
    note: 'Cập nhật cùng mọi gói khác: brew upgrade.',
  },
  {
    name: 'APT / DNF',
    os: 'Ubuntu, Debian, Fedora',
    icon: 'linux',
    setup: `curl -fsSL ${PKG_REPO.keyring} | sudo tee /usr/share/keyrings/tsudev.gpg >/dev/null`,
    note: 'Kho pkg.tsudev.com ký GPG; apt/dnf tự kiểm chữ ký. Lệnh đầy đủ trên thẻ từng app.',
  },
];

const SOURCES: [string, string][] = [
  ['tsudev-org/scoop-bucket', 'https://github.com/tsudev-org/scoop-bucket'],
  ['tsudev-org/homebrew-tap', 'https://github.com/tsudev-org/homebrew-tap'],
  ['tsudev-org/linux-packages', PKG_REPO.source],
];

const PLATFORMS: EcoPlatform[] = ['windows', 'android', 'apple', 'linux'];
const CATEGORIES = Object.keys(ECO_CATEGORY_LABEL) as EcoCategory[];

const chip = (on: boolean) =>
  `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
    on
      ? 'border-primary bg-primary text-on-primary'
      : 'border-line bg-surface text-fg-secondary hover:border-line-strong hover:text-fg'
  }`;

export default function AppsPage() {
  const router = useRouter();
  const urlQ = typeof router.query.q === 'string' ? router.query.q : '';
  const [typed, setTyped] = useState<string | null>(null);
  const q = typed ?? urlQ;
  const [platform, setPlatform] = useState<EcoPlatform | null>(null);
  const [category, setCategory] = useState<EcoCategory | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  const list = useMemo(() => {
    const nq = viNormalizeText(q);
    return ECOSYSTEM_APPS.filter(
      (a) =>
        (!platform || a.platforms.includes(platform)) &&
        (!category || a.category === category) &&
        (!nq || viNormalizeText(`${a.name} ${a.tagline} ${a.basedOn ?? ''}`).includes(nq))
    );
  }, [q, platform, category]);

  // Trò chơi chạy trên trình duyệt (mọi nền tảng) - chỉ ô tìm áp lên mục này;
  // chip nền tảng / nhóm là bộ lọc của app cài đặt.
  const games = useMemo(() => {
    const nq = viNormalizeText(q);
    return ECO_GAMES.filter(
      (g) => !nq || viNormalizeText(`${g.name} ${g.genre} ${g.tagline}`).includes(nq)
    );
  }, [q]);

  const toggle = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  // Sản phẩm đã chọn, theo thứ tự danh bạ (app trước, game có bản cài sau).
  const pickedItems = [...ECOSYSTEM_APPS, ...ECO_GAMES].filter((x) => picked.includes(x.id));

  return (
    <Layout active="/apps" bare>
      <Seo
        title="Danh bạ ứng dụng"
        path="/apps"
        description="Mọi ứng dụng và trò chơi của hệ sinh thái tsudev ở một chỗ: tìm, lọc theo nền tảng, mở website sản phẩm, tải bản mới nhất hoặc cài nhiều app một lượt bằng một lệnh cho Windows, macOS hay Linux."
      />
      <PageHeader
        eyebrow="Hệ sinh thái tsudev"
        title={
          <>
            Danh bạ <span className="tsu-text-gradient">ứng dụng</span>
          </>
        }
        description="Tìm app bạn cần, mở website riêng của sản phẩm hoặc tải bản mới nhất. Chọn nhiều app để lấy một lệnh cài tất cả - riêng cho Windows, macOS hay Linux."
        crumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Ứng dụng' }]}
      />

      <div className="max-w-6xl mx-auto px-4 py-10 pb-32">
        {/* Bộ lọc. Là <form> để Enter không tải lại trang mà vẫn có ngữ nghĩa tìm kiếm. */}
        {/* Thanh lọc DÍNH ngay dưới header (h-16): lớp bọc nền trang phủ kín dải giữa header
            và ô lọc, nên khi cuộn nội dung không còn lộ qua khe hở (lỗi chủ dự án báo
            13/11/2026 - trước đó `top-20` để hở 16px). Cùng màu nền trang nên không tạo dải
            nền khác màu. */}
        <div className="sticky top-16 z-20 -mx-4 bg-base px-4 pb-3 pt-3">
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="tsu-glass rounded-lg border border-line p-3 md:p-4"
          >
            <label className="flex h-10 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-fg-muted focus-within:border-primary">
              <Icon name="search" size={18} />
              <input
                type="search"
                value={q}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Tìm ứng dụng: chuyển đổi tệp, theo dõi mạng, la bàn…"
                aria-label="Tìm ứng dụng"
                className="h-full flex-1 bg-transparent text-base text-fg outline-hidden placeholder:text-fg-muted"
              />
            </label>
            {/* Di động: chip cuộn NGANG một hàng - xuống dòng thì thanh dính chiếm nửa màn hình. */}
            <div
              className="-mx-3 mt-3 flex items-center gap-2 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
              role="group"
              aria-label="Lọc theo nền tảng và nhóm"
            >
              <button
                type="button"
                className={chip(platform === null)}
                onClick={() => setPlatform(null)}
                aria-pressed={platform === null}
              >
                Mọi nền tảng
              </button>
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={chip(platform === p)}
                  onClick={() => setPlatform(platform === p ? null : p)}
                  aria-pressed={platform === p}
                >
                  <Icon name={p} size={14} />
                  {ECO_PLATFORM_LABEL[p]}
                </button>
              ))}
              <span className="mx-1 hidden h-5 w-px bg-line sm:inline-block" aria-hidden="true" />
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={chip(category === c)}
                  onClick={() => setCategory(category === c ? null : c)}
                  aria-pressed={category === c}
                >
                  {ECO_CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </form>
        </div>

        <p className="mt-3 text-sm text-fg-muted" aria-live="polite">
          {list.length} / {ECOSYSTEM_APPS.length} ứng dụng
        </p>

        {list.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon="search"
              title="Không có ứng dụng nào khớp"
              explain="Thử bỏ bớt bộ lọc hoặc gõ từ khoá ngắn hơn - tìm kiếm đã bỏ dấu tiếng Việt."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((a) => (
              <EcoAppCard
                key={a.id}
                app={a}
                selectable
                selected={picked.includes(a.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        )}

        <section id="tro-choi" className="mt-14 scroll-mt-24" aria-labelledby="tro-choi-tieu-de">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="tro-choi-tieu-de" className="text-xl font-semibold text-fg">
              Trò chơi
            </h2>
            <p className="text-sm text-fg-muted">
              {games.length} / {ECO_GAMES.length} trò chơi · chơi ngay trên trình duyệt, không cần
              cài
            </p>
          </div>
          {games.length === 0 ? (
            <p className="mt-4 text-sm text-fg-secondary">Không có trò chơi nào khớp từ khoá.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {games.map((g) => (
                <EcoGameCard
                  key={g.id}
                  game={g}
                  selected={picked.includes(g.id)}
                  onToggle={toggle}
                />
              ))}
            </div>
          )}
        </section>

        {/* Cài bằng lệnh - trang đích của nút "Cài bằng một lệnh" ở trang chủ. Mỗi kênh
            chỉ cần THÊM NGUỒN MỘT LẦN; lệnh cài từng app nằm trên thẻ của app đó (chỉ
            kênh đã có gói thật - PACKAGING.md mục 8). */}
        <section
          id="cai-bang-lenh"
          className="mt-14 scroll-mt-24 rounded-lg border border-line bg-surface p-6 md:p-8"
          aria-labelledby="cai-bang-lenh-tieu-de"
        >
          <h2 id="cai-bang-lenh-tieu-de" className="text-xl font-semibold text-fg">
            Cài bằng lệnh
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-fg-secondary">
            Mọi gói dựng từ đúng tệp đã phát hành trên GitHub, kèm SHA-256; trình quản lý gói tự
            kiểm trước khi cài. Thêm nguồn tsudev một lần, sau đó cài và cập nhật như mọi phần mềm
            khác.
          </p>
          {/* Lệnh cài một dòng (PACKAGING.md mục 6): script chỉ chuyển sang trình quản lý gói,
              khoá ký ghim SHA-256, có tệp .sha256 công bố để tự kiểm trước khi chạy. */}
          <div className="mt-5 rounded-md border border-primary/40 bg-subtle p-4">
            <div className="text-sm font-medium text-fg">Một lệnh cho mọi máy</div>
            <dl className="mt-2 grid gap-2 text-xs md:grid-cols-[max-content_1fr] md:gap-x-4">
              <dt className="text-fg-secondary">Linux, macOS</dt>
              <dd className="min-w-0 break-all font-mono text-fg">
                curl -fsSL https://tsudev.com/install.sh | sh -s -- &lt;tên-gói&gt; [tên-gói …]
              </dd>
              <dt className="text-fg-secondary">Windows</dt>
              <dd className="min-w-0 break-all font-mono text-fg">
                &amp; ([scriptblock]::Create((irm https://tsudev.com/install.ps1))) &lt;tên-gói&gt;
                [tên-gói …]
              </dd>
            </dl>
            <p className="mt-2 text-xs text-fg-muted">
              Thay <code>&lt;tên-gói&gt;</code> bằng <code>--list</code> (Windows:{' '}
              <code>-List</code>) để xem gói có thể cài. Script chỉ gọi winget, Scoop, Homebrew, apt
              hoặc dnf - đọc trước khi chạy:{' '}
              <a href="/install.sh" className="text-link underline">
                install.sh
              </a>{' '}
              (
              <a href="/install.sh.sha256" className="text-link underline">
                SHA-256
              </a>
              ),{' '}
              <a href="/install.ps1" className="text-link underline">
                install.ps1
              </a>{' '}
              (
              <a href="/install.ps1.sha256" className="text-link underline">
                SHA-256
              </a>
              ).
            </p>
          </div>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {CHANNELS.map((c) => (
              <li key={c.name} className="min-w-0 rounded-md border border-line bg-subtle p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-fg">
                  <Icon name={c.icon} size={16} />
                  {c.name}
                  <span className="text-xs font-normal text-fg-muted">· {c.os}</span>
                </div>
                <code className="mt-2 block break-all font-mono text-xs text-fg-secondary">
                  {c.setup}
                </code>
                <p className="mt-2 text-xs text-fg-muted">{c.note}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-2 text-sm md:grid-cols-[max-content_1fr] md:gap-x-4">
            <dt className="text-fg-secondary">Vân tay khóa APT/DNF</dt>
            <dd className="min-w-0 break-all font-mono text-fg">{PKG_REPO.fingerprint}</dd>
            <dt className="text-fg-secondary">Tự kiểm</dt>
            <dd className="min-w-0 break-all font-mono text-xs text-fg-secondary">
              curl -fsSL {PKG_REPO.keyring} | gpg --show-keys
            </dd>
            <dt className="text-fg-secondary">Mã nguồn kho</dt>
            <dd className="min-w-0 flex flex-wrap gap-x-4 gap-y-1">
              {SOURCES.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="text-link underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                  <span className="sr-only"> (mở tab mới)</span>
                </a>
              ))}
            </dd>
          </dl>
        </section>
      </div>

      {/* Khay chọn nhiều - kiểu "pack" của winstall: một lệnh cài gộp cho mỗi hệ điều hành. */}
      {pickedItems.length > 0 && <InstallTray items={pickedItems} onClear={() => setPicked([])} />}
    </Layout>
  );
}
