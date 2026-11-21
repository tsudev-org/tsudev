import React from 'react';
import { Icon, ECOSYSTEM_APPS, ECO_GAMES, ECO_CATEGORY_LABEL } from '@tsudev/ui';
import type { EcoCategory, IconName } from '@tsudev/ui';
import EcoIcon from './EcoIcon';

/**
 * Lưới thẻ danh mục của bố cục `cong` (tsudev-standards v5.0.0, DESIGN_SYSTEM.md mục 1.2.2):
 * hero ngắn + lưới thẻ danh mục NHIỀU CỘT ngay màn đầu - TsuDEV là cổng tập hợp nhiều sản phẩm.
 *
 * Sáu thẻ: bốn nhóm app (mở /apps?nhom=<nhóm> - chip nhóm chọn sẵn), trò chơi trên web, và
 * cài bằng một lệnh. Số đếm và hàng logo SUY từ ECOSYSTEM_APPS/ECO_GAMES - không gõ tay, nên
 * thêm app vào danh bạ là thẻ tự đúng (bài học hàng số liệu hero cũ: số gõ/đếm sai đứng yên
 * nhiều tháng). Nhóm chưa có app nào thì không vẽ thẻ.
 */

type Tile = {
  key: string;
  href: string;
  title: string;
  note: string;
  icon: IconName;
  marks: {
    id: string;
    name: string;
    logo?: string;
    tint: readonly [string, string];
    icon: string;
  }[];
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
        href: `/apps?nhom=${c}`,
        title: ECO_CATEGORY_LABEL[c],
        note: `${apps.length} ứng dụng`,
        icon: CATEGORY_ICON[c],
        marks: apps,
      };
    })
    .filter((t) => t.marks.length > 0);
  out.push({
    key: 'games',
    href: '/apps#tro-choi',
    title: 'Trò chơi trên web',
    note: `${ECO_GAMES.length} trò chơi`,
    icon: 'play',
    marks: ECO_GAMES,
  });
  const installable = ECOSYSTEM_APPS.filter((a) => a.winget || a.scoop || a.brew || a.pkg);
  out.push({
    key: 'install',
    href: '/apps#cai-bang-lenh',
    title: 'Cài bằng một lệnh',
    note: `${installable.length} app qua winget · Scoop · Homebrew · APT/DNF`,
    icon: 'code',
    marks: [],
  });
  return out;
}

export default function HomeCategories() {
  return (
    <section aria-labelledby="danh-muc-tieu-de" className="pt-2" data-cong-grid>
      <h2 id="danh-muc-tieu-de" className="sr-only">
        Danh mục
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles().map((t) => (
          <li key={t.key} className="min-w-0">
            <a
              href={t.href}
              className="tsu-glow-card group flex h-full min-w-0 flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-control"
            >
              <span className="tsu-monogram inline-flex h-9 w-9 items-center justify-center rounded-md">
                <Icon name={t.icon} size={18} />
              </span>
              <span className="mt-3 font-medium text-fg leading-snug group-hover:text-link">
                {t.title}
              </span>
              <span className="mt-1 text-xs text-fg-muted">{t.note}</span>
              {t.marks.length > 0 && (
                <span className="mt-auto flex items-center pt-3" aria-hidden="true">
                  {t.marks.slice(0, 4).map((m, i) => (
                    <span
                      key={m.id}
                      className={`inline-flex rounded-md bg-surface ring-2 ring-(--bg-surface) ${i ? '-ml-1.5' : ''}`}
                    >
                      <EcoIcon name={m.name} logo={m.logo} tint={m.tint} icon={m.icon} size={22} />
                    </span>
                  ))}
                  {t.marks.length > 4 && (
                    <span className="ml-1.5 text-xs text-fg-muted">+{t.marks.length - 4}</span>
                  )}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
