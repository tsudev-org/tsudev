import React from 'react';
import { Icon, Badge } from '@tsudev/ui';
import type { EcoGame } from '@tsudev/ui';

/**
 * Thẻ một trò chơi của hệ sinh thái (mục "Trò chơi" ở /apps).
 *
 * Game chạy trên trình duyệt ở website riêng: CHỈ một nút mở tab mới, không lệnh
 * cài, không ô chọn winget. Không nhúng iframe - game cấm đóng khung
 * (`frame-ancestors 'self'`). Repo private nên không có link mã nguồn.
 */
export default function EcoGameCard({ game }: { game: EcoGame }) {
  return (
    <article className="tsu-glow-card flex min-w-0 flex-col rounded-lg border border-line bg-surface p-5">
      <div className="flex items-start gap-4">
        <span
          className="tsu-monogram inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
          aria-hidden="true"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={game.icon} />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-fg text-base leading-snug">{game.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{game.genre}</Badge>
            <Badge tone="outline">Trình duyệt</Badge>
          </div>
        </div>
      </div>

      <p className="mt-3 flex-1 text-sm text-fg-secondary">{game.tagline}</p>

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
