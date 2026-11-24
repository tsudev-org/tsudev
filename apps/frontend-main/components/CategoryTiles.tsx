import React from 'react';
import { Icon, ECOSYSTEM_APPS, ECO_GAMES, ECO_CATEGORY_LABEL } from '@tsudev/ui';
import type { EcoCategory, IconName } from '@tsudev/ui';
import EcoIcon from './EcoIcon';

/**
 * Lưới thẻ danh mục ở ĐẦU trang /apps (25/11/2026: chủ dự án dời từ trang chủ sang đây cho trang
 * chủ gọn; trước đó là lưới bố cục `cong` của tsudev-standards v5.0.0 ngay dưới hero trang chủ).
 *
 * Sáu thẻ: bốn nhóm app là NÚT LỌC (aria-pressed) - thay luôn hàng chip nhóm trùng chức năng
 * trong thanh lọc; trò chơi trên web và cài bằng một lệnh là liên kết neo trong trang.
 *
 * Mỗi thẻ một chuyển động biểu tượng riêng khi rê chuột (`data-motion`, CSS ở globals.css khối
 * THẺ DANH MỤC): bánh răng quay, thư mục nhấc lên, quả địa cầu toả sóng, ô lưới nảy, nút chạy
 * nhích tới, dấu mã gõ nhịp. Tắt hết dưới prefers-reduced-motion. Số đếm và hàng logo SUY từ ECOSYSTEM_APPS/ECO_GAMES - không gõ tay, nên
 * thêm app vào danh bạ là thẻ tự đúng (bài học hàng số liệu hero cũ: số gõ/đếm sai đứng yên
 * nhiều tháng). Nhóm chưa có app nào thì không vẽ thẻ.
 */

type Tile = {
  key: string;
  /** Có `category` ⇒ thẻ là nút lọc; không có ⇒ liên kết `href`. */
  category?: EcoCategory;
  href: string;
  motion: string;
  title: string;
  note: string;
  icon: IconName;
  marks: {
    id: string;
    name: string;
    logo?: string;
    logoLight?: string;
    tint: readonly [string, string];
    icon: string;
  }[];
};

const CATEGORY_MOTION: Record<EcoCategory, string> = {
  system: 'spin',
  files: 'lift',
  network: 'ping',
  utility: 'pop',
};

const CATEGORY_ICON: Record<EcoCategory, IconName> = {
  system: 'settings',
  files: 'folder',
  network: 'globe',
  utility: 'grid',
};

function tiles(): Tile[] {
  const cats = Object.keys(ECO_CATEGORY_LABEL) as EcoCategory[];
  const out: Tile[] = cats
    .map((c) => {
      const apps = ECOSYSTEM_APPS.filter((a) => a.category === c);
      return {
        key: c,
        category: c,
        href: `/apps?nhom=${c}`,
        motion: CATEGORY_MOTION[c],
        title: ECO_CATEGORY_LABEL[c],
        note: `${apps.length} ứng dụng`,
        icon: CATEGORY_ICON[c],
        marks: apps,
      };
    })
    .filter((t) => t.marks.length > 0);
  out.push({
    key: 'games',
    href: '#tro-choi',
    motion: 'nudge',
    title: 'Trò chơi trên web',
    note: `${ECO_GAMES.length} trò chơi`,
    icon: 'play',
    marks: ECO_GAMES,
  });
  const installable = ECOSYSTEM_APPS.filter((a) => a.winget || a.scoop || a.brew || a.pkg);
  out.push({
    key: 'install',
    href: '#cai-bang-lenh',
    motion: 'type',
    title: 'Cài bằng một lệnh',
    note: `${installable.length} app qua winget · Scoop · Homebrew · APT/DNF`,
    icon: 'code',
    marks: [],
  });
  return out;
}

type Props = {
  /** Nhóm đang lọc (null = mọi nhóm). */
  active: EcoCategory | null;
  onPick: (c: EcoCategory | null) => void;
};

const TILE =
  'tsu-glow-card tsu-tile group flex h-full w-full min-w-0 flex-col rounded-lg border bg-surface p-4 text-left transition-colors hover:border-line-control';

export default function CategoryTiles({ active, onPick }: Props) {
  return (
    <section aria-labelledby="danh-muc-tieu-de" data-cong-grid>
      <h2 id="danh-muc-tieu-de" className="sr-only">
        Danh mục
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles().map((t) => {
          const on = t.category !== undefined && active === t.category;
          const body = <TileBody t={t} />;
          return (
            <li key={t.key} className="min-w-0">
              {t.category !== undefined ? (
                <button
                  type="button"
                  aria-pressed={on}
                  data-motion={t.motion}
                  onClick={() => onPick(on ? null : (t.category ?? null))}
                  className={`${TILE} ${on ? 'border-primary ring-1 ring-primary' : 'border-line'}`}
                >
                  {body}
                </button>
              ) : (
                <a href={t.href} data-motion={t.motion} className={`${TILE} border-line`}>
                  {body}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TileBody({ t }: { t: Tile }) {
  return (
    <>
      <span className="tsu-monogram tsu-tile-icon relative inline-flex h-9 w-9 items-center justify-center rounded-md">
        <Icon name={t.icon} size={18} />
      </span>
      <span className="mt-3 font-medium text-fg leading-snug group-hover:text-link">{t.title}</span>
      <span className="mt-1 text-xs text-fg-muted">{t.note}</span>
      {t.marks.length > 0 && (
        <span className="mt-auto flex items-center pt-3" aria-hidden="true">
          {t.marks.slice(0, 4).map((m, i) => (
            <span
              key={m.id}
              className={`inline-flex rounded-md bg-surface ring-2 ring-(--bg-surface) ${i ? '-ml-1.5' : ''}`}
            >
              <EcoIcon
                name={m.name}
                logo={m.logo}
                logoLight={m.logoLight}
                tint={m.tint}
                icon={m.icon}
                size={22}
              />
            </span>
          ))}
          {t.marks.length > 4 && (
            <span className="ml-1.5 text-xs text-fg-muted">+{t.marks.length - 4}</span>
          )}
        </span>
      )}
    </>
  );
}
