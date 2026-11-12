import React from 'react';
import { Icon, Badge } from '@tsudev/ui';
import type { EcoGame } from '@tsudev/ui';
import EcoIcon from './EcoIcon';
import InstallCommands from './InstallCommands';

/**
 * Thẻ một trò chơi của hệ sinh thái (mục "Trò chơi" ở /apps).
 *
 * Game chạy trên trình duyệt ở website riêng: nút chính mở tab mới. Game đã có bản
 * cài máy tính trong kho pkg.tsudev.com (`pkg`) thì hiện thêm khối lệnh APT/DNF
 * (phiếu 20261113-01). Không nhúng iframe - game cấm đóng khung
 * (`frame-ancestors 'self'`). Repo private nên không có link mã nguồn.
 */
export default function EcoGameCard({ game }: { game: EcoGame }) {
  return (
    <article className="tsu-glow-card flex min-w-0 flex-col rounded-lg border border-line bg-surface p-5">
      <div className="flex items-start gap-4">
        <EcoIcon name={game.name} tint={game.tint} icon={game.icon} />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-fg text-base leading-snug">{game.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{game.genre}</Badge>
            <Badge tone="outline">Trình duyệt</Badge>
            {game.pkg && <Badge tone="outline">Linux</Badge>}
          </div>
        </div>
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
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary-hover bg-primary px-3 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
        >
          <Icon name="play" size={16} />
          Chơi ngay
          <span aria-hidden="true">↗</span>
          <span className="sr-only"> {game.name} (mở tab mới)</span>
        </a>
      </div>
    </article>
  );
}
