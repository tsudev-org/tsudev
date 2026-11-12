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
 * Hai loại nguồn:
 *   - URL `https://...` - logo đang chạy trên website của app (nguồn sự thật khi
 *     app đã tự phát hành logo của nó);
 *   - tệp trong `source/eco/` - logo chủ dự án giao trực tiếp, CHƯA lên website app
 *     (cwico, SWICO, tsudev-contact: 13/11/2026). Khi repo app đã dùng logo đó trên
 *     website của nó, đổi dòng tương ứng sang URL.
 *
 * `mode` quyết định cách xử lý ảnh gốc:
 *   - 'as-is'  : giữ nguyên, chỉ đặt vào khung vuông (logo đã nền trong suốt);
 *   - 'tile'   : logo vẽ sẵn trên NỀN ĐẶC (ô app) - cắt vuông chính giữa, bo góc 22%
 *                như biểu tượng ứng dụng. KHÔNG xoá nền: nét trắng sẽ mất trên nền Sáng;
 *   - 'no-white': xoá nền TRẮNG bằng flood fill từ mép ảnh (lòng logo khép kín giữ
 *                nguyên), làm mềm biên + khử nhân với trắng, cắt sát rồi đặt vào khung vuông.
 *
 * Sáu trò chơi chưa có logo riêng (favicon là cú dùng chung) - thẻ của chúng vẽ ô
 * màu riêng (`tint` trong packages/ui/src/lib/ecosystem.ts).
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
  trafficmonitor: { src: 'https://trafficmonitor.tsudev.com/brand/mark-tsudev-trafficmonitor.png' },
  files: { src: 'https://files.tsudev.com/android-chrome-512x512.png' },
  lotus: { src: 'https://lotus.tsudev.com/android-chrome-512x512.png' },
  compass: { src: 'https://compass.tsudev.com/icon-512.png' },
  cwico: { src: 'source/eco/cwico.png', mode: 'no-white' },
  swico: { src: 'source/eco/swico.png', mode: 'tile' },
  contact: { src: 'source/eco/contact.png', mode: 'tile' },
};

/** Ô app: cắt vuông chính giữa rồi bo góc (mặt nạ SVG), cạnh ra = SIZE * 4 để thu nhỏ mượt. */
async function tile(buf) {
  const m = await sharp(buf).metadata();
  const side = Math.min(m.width, m.height);
  const big = SIZE * 4;
  const sq = await sharp(buf)
    .extract({
      left: Math.floor((m.width - side) / 2),
      top: Math.floor((m.height - side) / 2),
      width: side,
      height: side,
    })
    .resize(big, big, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const r = Math.round(big * 0.22);
  const mask = Buffer.from(
    `<svg width="${big}" height="${big}"><rect width="${big}" height="${big}" rx="${r}" ry="${r}"/></svg>`
  );
  return sharp(sq)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/** Xoá nền trắng nối liền mép ảnh; giữ mọi mảng trắng nằm TRONG logo. */
async function noWhite(buf, { inner = 12, outer = 40 } = {}) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const C = 4;
  // "Độ lệch khỏi trắng" = 255 - kênh NHỎ nhất (màu bão hoà hay tối đều lệch nhiều).
  const dev = (p) => 255 - Math.min(data[p * C], data[p * C + 1], data[p * C + 2]);
  const bg = new Uint8Array(W * H);
  const st = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x;
    if (bg[p] || dev(p) > outer) return;
    bg[p] = 1;
    st.push(x, y);
  };
  for (let x = 0; x < W; x++) {
    push(x, 0);
    push(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    push(0, y);
    push(W - 1, y);
  }
  while (st.length) {
    const y = st.pop();
    const x = st.pop();
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  for (let p = 0; p < W * H; p++) {
    if (!bg[p]) continue;
    const d = dev(p);
    const a = d <= inner ? 0 : Math.round(((d - inner) / (outer - inner)) * 255);
    if (a > 0 && a < 255) {
      // Khử nhân với nền trắng: obs = a*c + (1-a)*255  ⇒  c = (obs - (1-a)*255) / a.
      const k = a / 255;
      for (let c = 0; c < 3; c++) {
        const v = (data[p * C + c] - (1 - k) * 255) / k;
        data[p * C + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
    }
    data[p * C + 3] = a;
  }
  const png = await sharp(data, { raw: { width: W, height: H, channels: C } })
    .png()
    .toBuffer();
  return sharp(png).trim({ threshold: 1 }).png().toBuffer();
}

async function load(src) {
  if (/^https:\/\//.test(src)) {
    const res = await fetch(src, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`${src} trả ${res.status}`);
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) throw new Error(`${src} không phải ảnh (${type})`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFileSync(path.join(__dirname, src));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [id, { src: from, mode = 'as-is' }] of Object.entries(SOURCES)) {
    const raw = await load(from);
    const sha = crypto.createHash('sha256').update(raw).digest('hex');
    const src = mode === 'tile' ? await tile(raw) : mode === 'no-white' ? await noWhite(raw) : raw;
    const out = await sharp(src)
      .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90, effort: 6 })
      .toBuffer();
    fs.writeFileSync(path.join(OUT, `${id}.webp`), out);
    console.log(
      `  eco/${id}.webp ${(out.length / 1024).toFixed(1)} kB  ← ${from} (${mode})  sha256:${sha.slice(0, 16)}…`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
