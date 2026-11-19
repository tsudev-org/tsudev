import React, { useCallback, useEffect, useState } from 'react';
import { ECOSYSTEM_APPS, ECO_GAMES, Icon } from '@tsudev/ui';
import type { IconName } from '@tsudev/ui';
import type { Post } from '../lib/types';

/**
 * Khối "Có thể thứ bạn cần tìm đang ở đây" ở trang chủ (chủ dự án yêu cầu 19/11/2026):
 * bốn thẻ LỚN xếp ZICZAC theo chiều dọc - thẻ lẻ lệch trái, thẻ chẵn lệch phải, phần
 * hình minh hoạ đổi bên theo thẻ. Mỗi thẻ mang một sắc riêng (`--sc`, lấy từ token
 * vai trò - không cắm hex) và trượt vào từ phía nó lệch về khi cuộn tới.
 *
 * Cả thẻ bấm được nhờ "liên kết kéo giãn" (`::after` phủ kín thẻ) chứ KHÔNG bọc thẻ
 * trong <a>: thẻ Trò chơi có nút tiến/lùi, và nút nằm trong <a> là HTML không hợp lệ
 * (bàn phím và trình đọc màn hình xử lý sai). Nút được nâng `z-10` lên trên lớp phủ.
 */

type Tone = 'apps' | 'docs' | 'blog' | 'games';

type Item = {
  tone: Tone;
  title: string;
  desc: string;
  href: string;
  cta: string;
  icon: IconName;
};

const ITEMS: Item[] = [
  {
    tone: 'apps',
    title: 'Danh sách ứng dụng',
    desc: 'Mọi app của hệ sinh thái ở một chỗ - tìm, lọc theo nền tảng, mở website riêng hoặc cài nhiều app một lượt bằng một lệnh.',
    href: '/apps',
    cta: 'Duyệt ứng dụng',
    icon: 'package',
  },
  {
    tone: 'docs',
    title: 'Tài liệu',
    desc: 'Hướng dẫn cài đặt, nhật ký thay đổi và cách xử lý sự cố của từng app - kèm cách tự kiểm SHA-256 và chữ ký.',
    href: '/docs',
    cta: 'Đọc tài liệu',
    icon: 'book',
  },
  {
    tone: 'blog',
    title: 'Blog',
    desc: 'Bài viết kỹ thuật, hướng dẫn và góc nhìn công nghệ - viết bằng tiếng Việt, cho người dùng thật.',
    href: '/blog',
    cta: 'Đọc blog',
    icon: 'list',
  },
  {
    tone: 'games',
    title: 'Trò chơi trên web',
    desc: 'Trò chơi nhẹ chạy ngay trên trình duyệt - không cần cài, không quảng cáo. Bấm mũi tên để xem từng trò.',
    href: '/apps#tro-choi',
    cta: 'Xem tất cả trò chơi',
    icon: 'play',
  },
];

const AUTO_MS = 3800;

/** `prefers-reduced-motion` ⇒ không tự chuyển (WCAG 2.2.2: nội dung tự chạy phải dừng được). */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);
  return reduced;
}

function GameCarousel() {
  const games = ECO_GAMES;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const n = games.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);

  useEffect(() => {
    if (paused || reduced || n < 2) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % n), AUTO_MS);
    return () => window.clearInterval(t);
  }, [paused, reduced, n]);

  if (n === 0) return null;
  const g = games[i] ?? games[0]!;

  return (
    <div
      className="relative h-full min-h-72 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="group"
      aria-roledescription="băng chuyền"
      aria-label="Các trò chơi đang có"
    >
      {/* Nền: logo của trò đang chọn phóng to + làm mờ, chồng dải màu riêng của trò. Mọi
          lớp đều vẽ sẵn và chỉ đổi độ mờ ⇒ chuyển cảnh mượt, không tải lại ảnh. */}
      {games.map((x, k) => (
        <div
          key={x.id}
          aria-hidden="true"
          className="tsu-sc-slide absolute inset-0"
          data-on={k === i ? 'true' : 'false'}
          style={{
            background: `linear-gradient(135deg, ${x.tint[0]}, ${x.tint[1]})`,
          }}
        >
          {x.logo && (
            <img
              src={x.logo}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full scale-150 object-cover opacity-45 blur-[6px]"
            />
          )}
        </div>
      ))}

      <div className="relative flex h-full min-h-72 flex-col items-center justify-center gap-4 p-6 text-center">
        <a
          key={g.id}
          href={g.website}
          target="_blank"
          rel="noopener noreferrer"
          className="tsu-sc-pop relative z-10 block rounded-2xl outline-offset-4"
        >
          {g.logo ? (
            <img
              src={g.logo}
              alt={`Logo ${g.name}`}
              width={128}
              height={128}
              className="h-28 w-28 rounded-2xl shadow-2xl ring-1 ring-white/20 md:h-32 md:w-32"
            />
          ) : (
            <span className="flex h-28 w-28 items-center justify-center rounded-2xl bg-black/30 text-white">
              <svg
                viewBox="0 0 24 24"
                width="56"
                height="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d={g.icon} />
              </svg>
            </span>
          )}
          <span className="sr-only"> - mở {g.name} (tab mới)</span>
        </a>
        <div
          className="rounded-lg bg-black/45 px-3 py-1.5 text-white backdrop-blur-sm"
          aria-live="polite"
        >
          <p className="text-sm font-semibold">{g.name}</p>
          <p className="text-xs text-white/80">{g.genre}</p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Trò chơi trước"
            className="tsu-sc-arrow"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="flex gap-1.5">
            {games.map((x, k) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setI(k)}
                aria-label={`Xem ${x.name}`}
                aria-current={k === i ? 'true' : undefined}
                className="tsu-sc-dot"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Trò chơi kế tiếp"
            className="tsu-sc-arrow"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function AppsVisual() {
  const withLogo = ECOSYSTEM_APPS.filter((a) => a.logo).slice(0, 8);
  return (
    <div className="flex h-full min-h-72 items-center justify-center p-8" aria-hidden="true">
      <div className="grid grid-cols-4 gap-3 md:gap-4">
        {withLogo.map((a, k) => (
          <img
            key={a.id}
            src={a.logo}
            alt=""
            loading="lazy"
            width={64}
            height={64}
            className="tsu-sc-float h-14 w-14 rounded-xl shadow-lg ring-1 ring-line md:h-16 md:w-16"
            style={{ animationDelay: `${(k % 4) * 0.4 + Math.floor(k / 4) * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function DocsVisual() {
  return (
    <div className="flex h-full min-h-72 items-center justify-center p-8" aria-hidden="true">
      <div className="tsu-sc-float w-full max-w-sm rounded-xl border border-line-strong bg-base/80 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <span className="ml-2 font-mono text-xs text-fg-muted">cai-dat.md</span>
        </div>
        <div className="space-y-2.5 p-4">
          <div className="h-3 w-2/3 rounded bg-fg/20" />
          <div className="h-2 w-full rounded bg-fg/10" />
          <div className="h-2 w-5/6 rounded bg-fg/10" />
          <pre className="mt-3 overflow-hidden rounded-md bg-subtle px-3 py-2 font-mono text-xs text-fg-secondary">
            <span className="text-link">$</span> winget install tsudev.cwico
          </pre>
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <Icon name="check-circle" size={14} /> SHA-256 · chữ ký Ed25519
          </div>
        </div>
      </div>
    </div>
  );
}

function BlogVisual({ posts }: { posts: Post[] }) {
  // Luôn ba thẻ xếp chồng: thiếu bài thì lấp bằng nhãn chung để hình không trơ một thẻ.
  const fill = ['Hướng dẫn cài đặt', 'Ghi chép kỹ thuật', 'Nhật ký phát hành'];
  const titles = [...posts.slice(0, 3).map((p) => p.title), ...fill].slice(0, 3);
  return (
    <div className="flex h-full min-h-72 items-center justify-center p-8" aria-hidden="true">
      <div className="relative h-52 w-full max-w-sm">
        {titles.map((t, k) => (
          <div
            key={t + k}
            className="tsu-sc-stack absolute inset-x-0 rounded-xl border border-line-strong bg-surface p-4 shadow-lg"
            style={{ top: `${k * 3.25}rem`, zIndex: 3 - k, ['--k' as string]: k }}
          >
            <p className="line-clamp-1 text-sm font-semibold text-fg">{t}</p>
            <div className="mt-2 h-2 w-4/5 rounded bg-fg/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomeShowcase({ posts }: { posts: Post[] }) {
  return (
    <div className="flex flex-col gap-8 md:gap-12">
      {ITEMS.map((it, k) => {
        const right = k % 2 === 1;
        return (
          <article
            key={it.tone}
            className={`tsu-sc tsu-sc-${it.tone} reveal ${right ? 'reveal-from-right md:ml-auto' : 'reveal-from-left'} group relative w-full overflow-hidden rounded-2xl border border-line md:w-[88%]`}
          >
            <div className={`grid md:grid-cols-2 ${right ? 'md:[&>*:first-child]:order-2' : ''}`}>
              <div className="relative flex flex-col justify-center p-7 md:p-10">
                <span className="tsu-sc-badge mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl">
                  <Icon name={it.icon} size={24} />
                </span>
                <h3 className="text-2xl font-semibold tracking-tight text-fg md:text-3xl">
                  <a
                    href={it.href}
                    className="tsu-sc-link text-fg no-underline outline-none hover:text-fg"
                  >
                    {it.title}
                  </a>
                </h3>
                <p className="mt-3 max-w-md text-fg-secondary text-pretty">{it.desc}</p>
                <span className="tsu-sc-cta mt-6 inline-flex items-center gap-1.5 text-sm font-medium">
                  {it.cta}
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
              </div>
              <div
                className={`relative border-t border-line md:border-t-0 ${right ? 'md:border-r' : 'md:border-l'}`}
              >
                {it.tone === 'games' ? (
                  <GameCarousel />
                ) : it.tone === 'apps' ? (
                  <AppsVisual />
                ) : it.tone === 'docs' ? (
                  <DocsVisual />
                ) : (
                  <BlogVisual posts={posts} />
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
