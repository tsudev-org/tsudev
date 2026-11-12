// SINH TỰ ĐỘNG bởi scripts/pkg-catalog-sync.js - ĐỪNG SỬA TAY. Cập nhật: `npm run pkg:catalog`.
// Nguồn: https://pkg.tsudev.com/catalog.json · https://raw.githubusercontent.com/tsudev-org/scoop-bucket/main/catalog.json · https://raw.githubusercontent.com/tsudev-org/homebrew-tap/main/catalog.json
// Chỉ gồm gói ĐÃ cài thử được trong từng kho (PACKAGING.md mục 8); bỏ gói có replacedBy.
/* eslint-disable */
export const PKG_CATALOG = {
  schema: 1,
  fingerprint: '388310F47FA8224D76C0A9C79745B6AF3EA33C74',
  pkg: [
    {
      name: 'lotus-share',
      version: '2.0.0-7',
      arch: ['arm64', 'x64'],
      homepage: 'https://lotus.tsudev.com',
    },
    {
      name: 'tsudev-luyen-go-phim',
      version: '26.11.1201-1',
      arch: ['x64'],
      homepage: 'https://luyen-go-phim.tsudev.com',
    },
  ],
  scoop: [
    {
      name: 'lotus-share',
      version: '2.0.0-lotus.7',
      arch: ['any'],
      homepage: 'https://lotus.tsudev.com',
    },
    {
      name: 'tsudev-contact',
      version: '26.11.1001',
      arch: ['any'],
      homepage: 'https://contact.tsudev.com',
    },
    {
      name: 'tsudev-files',
      version: '2.4.0-vn.1',
      arch: ['any'],
      homepage: 'https://files.tsudev.com',
    },
    {
      name: 'tsudev-swico',
      version: '26.8.18.2',
      arch: ['any'],
      homepage: 'https://swico.tsudev.com',
    },
    {
      name: 'tsudev-trafficmonitor',
      version: '26.11.1202',
      arch: ['32bit', '64bit', 'arm64'],
      homepage: 'https://trafficmonitor.tsudev.com',
    },
  ],
  brew: [
    {
      name: 'lotus-share',
      version: '2.0.0-lotus.7',
      arch: ['any'],
      homepage: 'https://lotus.tsudev.com',
    },
    {
      name: 'tsudev-files',
      version: '2.4.0-vn.1',
      arch: ['arm64', 'x64'],
      homepage: 'https://files.tsudev.com',
    },
  ],
} as const;
