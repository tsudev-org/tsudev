import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AppGateModal } from '../src/components/AppGateModal';
import {
  GATE_TEXT,
  compareVersions,
  gateCopy,
  gateFromResponse,
  xTsuApp,
} from '../src/lib/appGate';

/**
 * INT1 (e) - modal khoá phiên bản / không chính thức cho web/PWA (APP_INTEGRITY 2.2-2.3). Hỏng im lặng:
 *  - câu chữ lệch nguyên văn bộ quy ước (chuẩn đổi mà ở đây không đổi);
 *  - so phiên bản sai thứ tự ⇒ khoá nhầm người đang dùng bản mới, hoặc không khoá bản cũ;
 *  - modal có lối thoát (nút Đóng) hoặc thiếu "Xuất dữ liệu" (giam dữ liệu - cấm, I6).
 */
const policy = readFileSync(
  join(__dirname, '../../../.standards/docs/APP_INTEGRITY.md'),
  'utf8'
).replace(/\s*\n\s*/g, ' ');

describe('nguyên văn APP_INTEGRITY 2.2-2.3', () => {
  const cases = (['update', 'unofficial'] as const).flatMap((k) =>
    (['vi', 'en'] as const).flatMap((l) =>
      Object.entries(GATE_TEXT[k][l]).map(([f, t]) => [`${k}.${l}.${f}`, t] as const)
    )
  );
  it.each(cases)('%s có trong bộ quy ước', (_k, text) => {
    expect(policy).toContain(`| ${text} |`);
  });
});

describe('compareVersions (VERSIONING 2.1)', () => {
  it.each([
    ['26.11.2501', '26.11.2401', 1],
    ['26.11.2401', '26.11.2501', -1],
    ['26.12.0101', '26.11.3101', 1],
    ['27.1.0101', '26.12.3199', 1],
    ['26.11.2501', '26.11.2501', 0],
    ['v26.11.2501', '26.11.2501', 0],
    ['26.11.2501', '26.11.2501-rc.1', 1],
    ['26.11.2501-beta.2', '26.11.2501-beta.10', -1],
    ['26.11.2501-beta.1', '26.11.2501-rc.1', -1],
  ])('%s so %s', (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b) as number)).toBe(sign);
  });
  it.each(['', 'abc', '26.11', '26.11.x'])('chuỗi hỏng %p ⇒ null (không khoá nhầm)', (v) => {
    expect(compareVersions(v, '26.11.2501')).toBeNull();
  });
});

describe('gateFromResponse', () => {
  it('426 update_required ⇒ modal cập nhật', () => {
    expect(
      gateFromResponse(426, { error: 'update_required', latest: '26.11.2601', url: 'https://x' })
    ).toEqual({ kind: 'update', latest: '26.11.2601', url: 'https://x' });
  });
  it('403 untrusted_client ⇒ modal không chính thức', () => {
    expect(gateFromResponse(403, { error: 'untrusted_client' })).toEqual({ kind: 'unofficial' });
  });
  it.each([
    [403, { error: 'forbidden' }],
    [426, { error: 'update_required' }],
    [200, {}],
    [426, null],
  ])('%d %p ⇒ null', (s, b) => {
    expect(gateFromResponse(s, b)).toBeNull();
  });
  it('X-Tsu-App', () => {
    expect(xTsuApp('compass', '26.11.2501', 'web')).toBe('compass/26.11.2501/web');
  });
});

describe('AppGateModal', () => {
  const html = (props: Record<string, unknown>) =>
    renderToStaticMarkup(
      React.createElement(AppGateModal, {
        onPrimary: () => {},
        onExport: () => {},
        ...props,
      } as never)
    );
  it('cập nhật: điền phiên bản, đúng HAI nút, không nút Đóng', () => {
    const h = html({ kind: 'update', latest: '26.11.2601', current: '26.11.2401' });
    expect(h).toContain('role="alertdialog"');
    expect(h).toContain(
      gateCopy('update', 'vi', { latest: '26.11.2601', current: '26.11.2401' }).body
    );
    expect(h.match(/<button/g)).toHaveLength(2);
    expect(h).toContain('Cập nhật ngay');
    expect(h).toContain('Xuất dữ liệu');
    expect(h).not.toMatch(/Đóng|Để sau|Close/);
  });
  it('không chính thức, tiếng Anh', () => {
    const h = html({ kind: 'unofficial', lang: 'en' });
    expect(h).toContain('Unofficial version');
    expect(h).toContain('Download official version');
    expect(h).toContain('Export data');
    expect(h).toContain('lang="en"');
  });
});
