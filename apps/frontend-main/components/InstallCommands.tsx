import React, { useState } from 'react';
import { Icon, installCommands } from '@tsudev/ui';
import type { Installable } from '@tsudev/ui';

/**
 * Khối "Cài bằng lệnh" trên thẻ app/game - mỗi kênh một dòng, có nút chép.
 * Chỉ kênh ĐÃ có gói thật (PACKAGING.md mục 8): `installCommands` lấy từ dữ liệu
 * ecosystem.ts, sản phẩm không có kênh nào thì khối này không vẽ gì.
 */
export default function InstallCommands({
  name,
  item,
  note,
}: {
  name: string;
  item: Installable;
  /** Ghi chú ngắn cạnh khối (vd. "Linux x86-64"). */
  note?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const cmds = installCommands(item);
  if (cmds.length === 0) return null;

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
    <div className="mt-4">
      {note && <p className="mb-2 text-xs text-fg-muted">{note}</p>}
      <ul className="space-y-2" aria-label={`Lệnh cài ${name}`}>
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
              aria-label={`Sao chép lệnh ${channel} cài ${name}`}
            >
              <Icon name={copied === channel ? 'check' : 'copy'} size={14} />
              <span aria-live="polite">{copied === channel ? 'Đã chép' : 'Chép'}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
