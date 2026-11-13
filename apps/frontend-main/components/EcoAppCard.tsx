import React from 'react';
import { Icon, Badge, ECO_CATEGORY_LABEL } from '@tsudev/ui';
import type { EcoApp } from '@tsudev/ui';
import EcoIcon from './EcoIcon';
import InstallCommands from './InstallCommands';
import ExternalArrow from './ExternalArrow';
import SelectCircle, { toggleOnCardClick } from './SelectCircle';
import PlatformRow from './PlatformRow';

/**
 * Thẻ một app của hệ sinh thái (danh bạ /apps và khối trang chủ).
 *
 * Hai nút ra NGOÀI site đều mở TAB MỚI (`target="_blank"` + `rel="noopener
 * noreferrer"` - thiếu `noopener` thì trang đích điều khiển được tab này qua
 * `window.opener`). Nhãn đọc màn hình nói rõ "mở tab mới", vì mũi tên ↗ chỉ là
 * dấu hiệu thị giác.
 *
 * `selectable` bật ô chọn TRÒN kiểu winstall: chọn nhiều app rồi lấy MỘT lệnh cài gộp
 * theo hệ điều hành (khay ở /apps). Bấm vào vùng trống của thẻ cũng chọn/bỏ chọn.
 *
 * Bố cục thống nhất mọi thẻ sản phẩm (app lẫn trò chơi): đầu thẻ → mô tả → lệnh cài →
 * nút → hàng biểu tượng nền tảng ở ĐÁY thẻ (chủ dự án yêu cầu 13/11/2026), nên các thẻ
 * cùng hàng lưới có hàng nền tảng thẳng hàng nhau.
 */
type Props = {
  app: EcoApp;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
};

const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' } as const;

export default function EcoAppCard({ app, selectable, selected, onToggle }: Props) {
  return (
    // Bấm chuột vào vùng trống chỉ là lối tắt; bàn phím dùng ô chọn tròn (jsx-a11y).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <article
      onClick={selectable ? (e) => toggleOnCardClick(e, () => onToggle?.(app.id)) : undefined}
      data-selected={selectable ? Boolean(selected) : undefined}
      className={`tsu-glow-card flex min-w-0 flex-col rounded-lg border bg-surface p-5 transition-colors ${
        selectable ? 'cursor-pointer' : ''
      } ${selected ? 'border-primary ring-1 ring-primary' : 'border-line'}`}
    >
      <div className="flex items-start gap-4">
        <EcoIcon name={app.name} logo={app.logo} tint={app.tint} icon={app.icon} />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-fg text-base leading-snug">{app.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{ECO_CATEGORY_LABEL[app.category]}</Badge>
            <Badge tone="outline">{app.openSource ? 'Mã nguồn mở' : 'Độc quyền'}</Badge>
          </div>
        </div>
        {selectable && (
          <SelectCircle
            checked={Boolean(selected)}
            onChange={() => onToggle?.(app.id)}
            label={`Chọn ${app.name} để cài cùng lúc`}
          />
        )}
      </div>

      {/* Mô tả + ghi công giãn CHUNG (flex-1): ghi công đi liền mô tả, phần trống dồn xuống
          dưới để nút và hàng nền tảng các thẻ cùng hàng thẳng nhau. */}
      <div className="mt-3 flex-1">
        <p className="text-sm text-fg-secondary">{app.tagline}</p>
        {app.basedOn && <p className="mt-1.5 text-xs text-fg-muted">Dựa trên {app.basedOn}</p>}
      </div>

      <InstallCommands
        name={app.name}
        item={app}
        note={app.pkgArch && `Gói APT/DNF: ${app.pkgArch}`}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {app.website && (
          <a
            href={app.website}
            {...NEW_TAB}
            className="group inline-flex h-8 items-center gap-1.5 rounded-md border border-primary-hover bg-primary px-3 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
          >
            <Icon name="globe" size={16} />
            Trang sản phẩm
            <ExternalArrow />
            <span className="sr-only"> (mở tab mới)</span>
          </a>
        )}
        {app.releases && (
          <a
            href={app.releases}
            {...NEW_TAB}
            className={`group inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors ${
              app.website
                ? 'border-line-strong bg-surface text-fg hover:border-line-control hover:bg-hovered'
                : 'border-primary-hover bg-primary text-on-primary hover:bg-primary-hover'
            }`}
          >
            <Icon name="download" size={16} />
            Tải bản mới nhất
            <ExternalArrow />
            <span className="sr-only"> (mở tab mới)</span>
          </a>
        )}
      </div>

      <PlatformRow platforms={app.platforms} />
    </article>
  );
}
