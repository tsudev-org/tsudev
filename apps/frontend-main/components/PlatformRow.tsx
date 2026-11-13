import React from 'react';
import { Icon, ECO_PLATFORM_LABEL } from '@tsudev/ui';
import type { EcoPlatform, IconName } from '@tsudev/ui';

/**
 * Hàng biểu tượng nền tảng ở ĐÁY thẻ sản phẩm. Mô tả của thẻ giãn (`flex-1`) nên trong
 * lưới các thẻ cao bằng nhau, hàng này của mọi thẻ cùng hàng nằm thẳng nhau ở đáy.
 * `web` = chạy trên trình duyệt (trò chơi).
 */
type Platform = EcoPlatform | 'web';

const ICON: Record<Platform, IconName> = {
  windows: 'windows',
  android: 'android',
  apple: 'apple',
  linux: 'linux',
  web: 'globe',
};

const LABEL: Record<Platform, string> = { ...ECO_PLATFORM_LABEL, web: 'Trình duyệt' };

export default function PlatformRow({ platforms }: { platforms: readonly Platform[] }) {
  return (
    <ul
      className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4"
      aria-label="Nền tảng hỗ trợ"
    >
      {platforms.map((p) => (
        <li key={p} className="inline-flex items-center gap-1.5 text-xs text-fg-secondary">
          <Icon name={ICON[p]} size={14} />
          {LABEL[p]}
        </li>
      ))}
    </ul>
  );
}
