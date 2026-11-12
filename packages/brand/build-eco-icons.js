#!/usr/bin/env node
'use strict';
/**
 * Lấy LOGO THẬT của từng app trong hệ sinh thái về tsudev.com.
 *
 *   node packages/brand/build-eco-icons.js
 *
 * Vì sao tự lưu chứ không nhúng thẳng URL của website app: CSP `img-src` của
 * tsudev.com chỉ cho 'self' (và nên giữ vậy - một site con hỏng/bị chiếm không
 * được phép vẽ lên trang chủ). Vì vậy logo được tải về, chuẩn hoá thành WebP
 * vuông 128px (hiển thị 48px, đủ cho màn 2x-2.5x) và commit vào
 * `apps/frontend-main/public/eco/<id>.webp`.
 *
 * CHỈ app có logo RIÊNG mới nằm ở đây (đo 13/11/2026). cwico, SWICO,
 * tsudev-contact và sáu trò chơi đang dùng chung con cú thương hiệu làm favicon -
 * đặt chúng lên danh bạ thì mọi thẻ trông y hệt nhau, nên thẻ của chúng vẽ ô màu
 * riêng (`tint` trong packages/ui/src/lib/ecosystem.ts). Khi repo nào có logo
 * riêng: thêm một dòng vào SOURCES, chạy lại script, đặt `logo` cho mục đó.
 *
 * Chạy lại khi một app đổi logo - script in SHA-256 của tệp nguồn để ghi vào nhật
 * ký phiên.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Thiếu `sharp`. Chạy: npm i --no-save sharp');
  process.exit(1);
}

const OUT = path.join(__dirname, '..', '..', 'apps', 'frontend-main', 'public', 'eco');
const SIZE = 128;

/** id (khớp `EcoApp.id`) → URL logo trên website CHÍNH THỨC của app. */
const SOURCES = {
  trafficmonitor: 'https://trafficmonitor.tsudev.com/brand/mark-tsudev-trafficmonitor.png',
  files: 'https://files.tsudev.com/android-chrome-512x512.png',
  lotus: 'https://lotus.tsudev.com/android-chrome-512x512.png',
  compass: 'https://compass.tsudev.com/icon-512.png',
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [id, url] of Object.entries(SOURCES)) {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`${id}: ${url} trả ${res.status}`);
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) throw new Error(`${id}: ${url} không phải ảnh (${type})`);
    const src = Buffer.from(await res.arrayBuffer());
    const sha = crypto.createHash('sha256').update(src).digest('hex');
    const out = await sharp(src)
      .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90, effort: 6 })
      .toBuffer();
    fs.writeFileSync(path.join(OUT, `${id}.webp`), out);
    console.log(
      `  eco/${id}.webp ${(out.length / 1024).toFixed(1)} kB  ← ${url}  sha256:${sha.slice(0, 16)}…`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
