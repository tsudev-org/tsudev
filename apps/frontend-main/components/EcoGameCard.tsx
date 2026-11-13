import React from 'react';
import { Icon, Badge } from '@tsudev/ui';
import type { EcoGame } from '@tsudev/ui';
import EcoIcon from './EcoIcon';
import InstallCommands from './InstallCommands';
import ExternalArrow from './ExternalArrow';
import SelectCircle, { toggleOnCardClick } from './SelectCircle';
import PlatformRow from './PlatformRow';

/**
 * Thẻ một trò chơi của hệ sinh thái (mục "Trò chơi" ở /apps).
 *
 * Game chạy trên trình duyệt ở website riêng: nút chính mở tab mới. Game đã có bản
 * cài máy tính trong kho pkg.tsudev.com (`pkg`) thì hiện thêm khối lệnh APT/DNF
 * (phiếu 20261113-01) và CHỌN ĐƯỢC như thẻ app để vào lệnh cài gộp. Không nhúng
 * iframe - game cấm đóng khung (`frame-ancestors 'self'`). Repo private nên không có
 * link mã nguồn. Bố cục giống `EcoAppCard` (hàng nền tảng ở đáy thẻ).
 */
type Props = {
  game: EcoGame;
  selected?: boolean;
  onToggle?: (id: string) => void;
};

export default function EcoGameCard({ game, selected, onToggle }: Props) {
  const selectable = Boolean(game.pkg && onToggle);
  return (
    // Bấm chuột vào vùng trống chỉ là lối tắt; bàn phím dùng ô chọn tròn.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <article
      onClick={selectable ? (e) => toggleOnCardClick(e, () => onToggle?.(game.id)) : undefined}
      data-selected={selectable ? Boolean(selected) : undefined}
      className={`tsu-glow-card flex min-w-0 flex-col rounded-lg border bg-surface p-5 transition-colors ${
        selectable ? 'cursor-pointer' : ''
      } ${selected ? 'border-primary ring-1 ring-primary' : 'border-line'}`}
    >
      <div className="flex items-start gap-4">
        <EcoIcon name={game.name} logo={game.logo} tint={game.tint} icon={game.icon} tile />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-fg text-base leading-snug">{game.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{game.genre}</Badge>
          </div>
        </div>
        {selectable && (
          <SelectCircle
            checked={Boolean(selected)}
            onChange={() => onToggle?.(game.id)}
            label={`Chọn ${game.name} để cài cùng lúc`}
          />
        )}
      </div>

      <p className="mt-3 flex-1 text-sm text-fg-secondary">{game.tagline}</p>

      <InstallCommands
        name={game.name}
        item={game}
        note={game.pkgArch && `Bản cài máy tính · ${game.pkgArch}`}
      />

      <div className="mt-4">
        <a
          href={game.website}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex h-8 items-center gap-1.5 rounded-md border border-primary-hover bg-primary px-3 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
        >
          <Icon name="play" size={16} />
          Chơi ngay
          <ExternalArrow />
          <span className="sr-only"> {game.name} (mở tab mới)</span>
        </a>
      </div>

      <PlatformRow platforms={game.pkg ? ['web', 'linux'] : ['web']} />
    </article>
  );
}
