import { ECOSYSTEM_APPS, type EcoApp, type EcoPlatform } from '../src/lib/ecosystem';

/**
 * Cổng C4 (docs/de-xuat-bao-mat-cms-cai-bang-lenh.md P3): mọi app trong danh bạ có
 * ÍT NHẤT MỘT kênh cài bằng lệnh qua trình quản lý gói chính thức cho MỖI hệ điều
 * hành máy tính nó khai (`platforms`). Kênh suy từ catalog thật của từng kho
 * (`pkgCatalog.generated.ts`) - nên thêm app mới hay gói rơi khỏi kho là test đỏ,
 * không phải /apps lặng lẽ hiện một thẻ chỉ có nút tải tệp trần.
 *
 * Android không có kênh lệnh hợp lý (APK ký + trang sản phẩm) nên không đòi. App
 * KHÔNG có hệ điều hành máy tính nào phải được khai ngoại lệ TƯỜNG MINH dưới đây,
 * kèm lý do - để danh sách ngoại lệ là một quyết định, không phải một khe hở.
 */
const CHANNELS: Record<Exclude<EcoPlatform, 'android'>, (a: EcoApp) => string[]> = {
  windows: (a) =>
    [a.winget && `winget ${a.winget}`, a.scoop && `scoop ${a.scoop}`].filter(Boolean) as string[],
  apple: (a) => (a.brew ? [`brew ${a.brew}`] : []),
  linux: (a) => (a.pkg ? [`apt/dnf ${a.pkg}`] : []),
};

const EXCEPTIONS: Record<string, string> = {
  compass:
    'D6 - La bàn là app Android độc quyền: APK có chữ ký + trang sản phẩm, không có kênh lệnh',
};

describe('C4: kênh cài bằng lệnh cho mọi app', () => {
  test.each(ECOSYSTEM_APPS.map((a) => [a.id, a] as const))('%s', (id, app) => {
    const desktop = app.platforms.filter((p) => p !== 'android') as (keyof typeof CHANNELS)[];
    if (desktop.length === 0) {
      expect(EXCEPTIONS[id]).toBeTruthy();
      return;
    }
    for (const os of desktop) {
      expect({ os, channels: CHANNELS[os](app) }).toEqual({
        os,
        channels: expect.arrayContaining([expect.any(String)]),
      });
    }
  });

  test('không có ngoại lệ mồ côi (app đã gỡ hoặc đã có kênh)', () => {
    for (const id of Object.keys(EXCEPTIONS)) {
      const app = ECOSYSTEM_APPS.find((a) => a.id === id);
      expect(app).toBeDefined();
      expect(app!.platforms.some((p) => p !== 'android')).toBe(false);
    }
  });
});
