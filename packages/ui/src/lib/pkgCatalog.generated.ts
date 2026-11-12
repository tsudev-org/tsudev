// SINH TỰ ĐỘNG bởi scripts/pkg-catalog-sync.js từ https://pkg.tsudev.com/catalog.json - ĐỪNG SỬA TAY.
// Cập nhật: `npm run pkg:catalog`. Chỉ gồm gói ĐÃ có trong kho (PACKAGING.md mục 8).
/* eslint-disable */
export const PKG_CATALOG = {
  schema: 1,
  updated: '2026-11-12T17:13:51Z',
  fingerprint: '388310F47FA8224D76C0A9C79745B6AF3EA33C74',
  packages: [
    {
      name: 'lotus-share',
      version: '2.0.0-7',
      arch: ['arm64', 'x64'],
      homepage: 'https://lotus.tsudev.com',
      displayName: 'Lotus Share',
    },
    {
      name: 'tsudev-luyen-go-phim',
      version: '26.11.1201-1',
      arch: ['x64'],
      homepage: 'https://luyen-go-phim.tsudev.com',
      displayName: 'Luyện Gõ Phím',
    },
  ],
} as const;
