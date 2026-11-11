import React, { useState } from 'react';
import { Icon, Badge, ECO_PLATFORM_LABEL, ECO_CATEGORY_LABEL, installCommands } from '@tsudev/ui';
import type { EcoApp, IconName } from '@tsudev/ui';

/**
 * Thẻ một app của hệ sinh thái (danh bạ /apps và khối trang chủ).
 *
 * Hai nút ra NGOÀI site đều mở TAB MỚI (`target="_blank"` + `rel="noopener
 * noreferrer"` - thiếu `noopener` thì trang đích điều khiển được tab này qua
 * `window.opener`). Nhãn đọc màn hình nói rõ "mở tab mới", vì mũi tên ↗ chỉ là
 * dấu hiệu thị giác.
 *
 * `selectable` bật ô chọn kiểu winstall: chọn nhiều app rồi lấy MỘT lệnh winget.
 */
type Props = {
  app: EcoApp;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
};

const PLATFORM_ICON: Record<EcoApp['platforms'][number], IconName> = {
  windows: 'windows',
  android: 'android',
  apple: 'apple',
  linux: 'linux',
};

const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' } as const;

export default function EcoAppCard({ app, selectable, selected, onToggle }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const cmds = installCommands(app);

  const copy = async (channel: string, cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(channel);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      // Clipboard bị chặn (HTTP thường, iframe): lệnh vẫn hiện nguyên văn để chép tay.
    }
  };

  return (
    <article
      className={`tsu-glow-card flex min-w-0 flex-col rounded-lg border bg-surface p-5 ${
        selected ? 'border-primary' : 'border-line'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Biểu tượng riêng của từng app (ecosystem.ts > icon), mực --text-link trên
            ô tím nhạt - xem `.tsu-monogram` ở globals.css. */}
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
            <path d={app.icon} />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-fg text-base leading-snug">{app.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{ECO_CATEGORY_LABEL[app.category]}</Badge>
            <Badge tone="outline">{app.openSource ? 'Mã nguồn mở' : 'Độc quyền'}</Badge>
          </div>
        </div>
        {selectable && (
          <label className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-subtle">
            <input
              type="checkbox"
              className="h-4 w-4 accent-(--primary)"
              checked={Boolean(selected)}
              onChange={() => onToggle?.(app.id)}
              aria-label={`Chọn ${app.name} để cài cùng lúc`}
            />
          </label>
        )}
      </div>

      <p className="mt-3 flex-1 text-sm text-fg-secondary">{app.tagline}</p>
      {app.basedOn && <p className="mt-1.5 text-xs text-fg-muted">Dựa trên {app.basedOn}</p>}

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Nền tảng hỗ trợ">
        {app.platforms.map((p) => (
          <li
            key={p}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs text-fg-secondary"
          >
            <Icon name={PLATFORM_ICON[p]} size={14} />
            {ECO_PLATFORM_LABEL[p]}
          </li>
        ))}
      </ul>

      {cmds.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label={`Lệnh cài ${app.name}`}>
          {cmds.map(({ channel, cmd }) => (
            <li
              key={channel}
              className="flex items-center gap-2 rounded-md border border-line bg-subtle pl-3 pr-1 py-1 font-mono text-xs text-fg-secondary"
            >
              <span className="shrink-0 text-link">{channel}</span>
              <code className="min-w-0 flex-1 truncate" title={cmd}>
                {cmd}
              </code>
              <button
                type="button"
                onClick={() => copy(channel, cmd)}
                className="inline-flex h-7 items-center gap-1 rounded px-2 text-fg-secondary hover:bg-subtle hover:text-fg"
                aria-label={`Sao chép lệnh ${channel} cài ${app.name}`}
              >
                <Icon name={copied === channel ? 'check' : 'copy'} size={14} />
                <span aria-live="polite">{copied === channel ? 'Đã chép' : 'Chép'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {app.website && (
          <a
            href={app.website}
            {...NEW_TAB}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary-hover bg-primary px-3 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
          >
            <Icon name="globe" size={16} />
            Trang sản phẩm
            <span aria-hidden="true">↗</span>
            <span className="sr-only"> (mở tab mới)</span>
          </a>
        )}
        {app.releases && (
          <a
            href={app.releases}
            {...NEW_TAB}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors ${
              app.website
                ? 'border-line-strong bg-surface text-fg hover:border-line-control hover:bg-hovered'
                : 'border-primary-hover bg-primary text-on-primary hover:bg-primary-hover'
            }`}
          >
            <Icon name="download" size={16} />
            Tải bản mới nhất
            <span aria-hidden="true">↗</span>
            <span className="sr-only"> (mở tab mới)</span>
          </a>
        )}
      </div>
    </article>
  );
}
