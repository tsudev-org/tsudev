import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { TsuBadge } from '../src/components/TsuBadge';

/**
 * TsuBadge (PRO-C, PRODUCT_POLICY 4.1-4.2). Cách hỏng mà trang vẫn chạy:
 *  - hiện huy hiệu cho giá trị lạ / `none` (người dùng đã chọn Ẩn mà vẫn thấy);
 *  - Ủng hộ đứng trước Pro; thiếu nhãn đọc màn hình (màu thành tín hiệu duy nhất);
 *  - shimmer/nhịp tim chạy cả khi hệ điều hành bật "Giảm chuyển động".
 */
const html = (props: Record<string, unknown>) =>
  renderToStaticMarkup(React.createElement(TsuBadge, props as never));

describe('TsuBadge', () => {
  it.each(['none', null, undefined, 'PRO', 'admin'])('giá trị %p ⇒ không vẽ gì', (badge) => {
    expect(html({ badge })).toBe('');
  });

  it('pro ⇒ một huy hiệu có nhãn đọc màn hình', () => {
    const h = html({ badge: 'pro' });
    expect(h).toContain('aria-label="Tài khoản Pro"');
    expect(h).toContain('role="img"');
    expect(h).not.toContain('tsu-badge--donor');
  });

  it('both ⇒ Pro trước, Ủng hộ sau', () => {
    const h = html({ badge: 'both' });
    expect(h.indexOf('tsu-badge--pro')).toBeGreaterThan(-1);
    expect(h.indexOf('tsu-badge--pro')).toBeLessThan(h.indexOf('tsu-badge--donor'));
    expect(h).toContain('Ủng hộ');
  });

  it('en ⇒ Supporter + nhãn tiếng Anh', () => {
    const h = html({ badge: 'donor', lang: 'en' });
    expect(h).toContain('Supporter');
    expect(h).toContain('aria-label="Supported TsuDEV"');
  });

  it('CSS: tắt shimmer + nhịp tim khi giảm chuyển động; nhịp shimmer ≥ 6 giây', () => {
    const css = readFileSync(
      join(__dirname, '..', '..', '..', 'apps', 'frontend-main', 'styles', 'globals.css'),
      'utf8'
    );
    const block = css.slice(css.indexOf('.tsu-badges {'));
    expect(block).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*\.tsu-badge--pro::after,\s*\.tsu-badge--donor \.tsu-badge__heart\s*\{\s*animation: none/
    );
    const secs = Number(/tsu-badge-shimmer (\d+(?:\.\d+)?)s/.exec(block)?.[1]);
    expect(secs).toBeGreaterThanOrEqual(6);
    expect(secs).toBeLessThanOrEqual(8);
  });
});
