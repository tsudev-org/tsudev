#!/usr/bin/env node
'use strict';
/**
 * Lấy LOGO THẬT của từng app trong hệ sinh thái về tsudev.com.
 *
 *   node packages/brand/build-eco-icons.js            # mọi sản phẩm
 *   node packages/brand/build-eco-icons.js game-nuicam3d  # chỉ vài id
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
 *   - tệp trong `source/eco/` - logo chủ dự án giao trực tiếp, CHƯA lên website app.
 *     Khi repo app đã dùng logo đó trên website của nó, đổi dòng sang URL và xoá tệp
 *     (cwico, SWICO, tsudev-contact đã chuyển 13/11/2026 - tsudev-cwico#68, swico#18,
 *     contact#23; bản trên website đã xử lý nền, nên dùng 'as-is').
 *
 * `mode` quyết định cách xử lý ảnh gốc:
 *   - 'as-is'  : giữ nguyên, chỉ đặt vào khung vuông (logo đã nền trong suốt);
 *   - 'tile'   : logo vẽ sẵn trên NỀN ĐẶC (ô app) - cắt vuông chính giữa, bo góc 22%
 *                như biểu tượng ứng dụng. KHÔNG xoá nền: nét trắng sẽ mất trên nền Sáng;
 *   - 'no-white': xoá nền TRẮNG bằng flood fill từ mép ảnh (lòng logo khép kín giữ
 *                nguyên), làm mềm biên + khử nhân với trắng, cắt sát rồi đặt vào khung vuông.
 *   - 'mark-tile': logo dạng "biểu tượng + chữ" trên nền đặc (sáu trò chơi, chủ dự án giao
 *                13/11/2026). Tìm khung bao của BIỂU TƯỢNG trong vùng `region` (tỉ lệ
 *                [x0, y0, x1, y1] của ảnh - loại dòng chữ tên game, không đọc được ở 48px,
 *                và dấu ✦ của công cụ tạo ảnh ở góc), cắt sát rồi đặt giữa ô vuông nền đặc
 *                cùng màu nền gốc (đệm 14% mỗi cạnh), bo góc 22% như biểu tượng ứng dụng.
 *                KHÔNG xoá nền: nét trắng (Xin Chào Núi Cấm, Luyện Gõ Phím) biến mất trên
 *                nền Sáng, chim đen (Chú Chim Vỗ Cánh) biến mất trên nền Tối - ô nền đặc
 *                là cách DUY NHẤT để cả sáu đọc được ở cả hai chế độ.
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
  cwico: { src: 'https://cwico.tsudev.com/brand/logo-cwico.png' },
  swico: { src: 'https://swico.tsudev.com/brand/logo-swico.png' },
  contact: { src: 'https://contact.tsudev.com/brand/logo-contact.png' },
  // Logo riêng TsuDisk (phiếu 20261117-D2): ô nền đặc bo góc sẵn trong ảnh.
  disk: { src: 'https://disk.tsudev.com/brand/logo-tsudisk.png' },
  // Phiếu 20261120-LG1: Quly Thu Chi phục vụ logo trên ô nền TRẮNG đục (chỉ góc trong suốt) ⇒ 'no-white';
  // Sound Db là ô nền navy bo góc sẵn, đã bỏ dấu ✦ của công cụ tạo ảnh ⇒ giữ nguyên.
  qulythuchi: { src: 'https://qulythuchi.tsudev.com/brand/logo-qulythuchi.png', mode: 'no-white' },
  sounddb: { src: 'https://sound.tsudev.com/brand/logo-sound-db.png' },
  // Trò chơi: năm game đã phục vụ logo riêng trên website của mình (16/11/2026, phiếu
  // 20261113-04, sinh bởi tsudev-game-kit/tools/sinh-thuong-hieu.mjs - ô nền đặc bo góc sẵn).
  // nuicam3d vẫn dùng tệp gốc tới khi website của nó có /brand/mark-512.png.
  'game-xin-chao-nui-cam': { src: 'https://xin-chao-nui-cam.tsudev.com/brand/mark-512.png' },
  'game-chu-chim-vo-canh': { src: 'https://chu-chim-vo-canh.tsudev.com/brand/mark-512.png' },
  'game-lat-manh-ghep': { src: 'https://lat-manh-ghep.tsudev.com/brand/mark-512.png' },
  'game-noi-hinh-giong-nhau': { src: 'https://noi-hinh-giong-nhau.tsudev.com/brand/mark-512.png' },
  'game-luyen-go-phim': { src: 'https://luyen-go-phim.tsudev.com/brand/mark-512.png' },
  'game-nuicam3d': {
    src: 'source/eco/game-nuicam3d.png',
    mode: 'mark-tile',
    region: [0.12, 0.08, 0.88, 0.585],
  },
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

/**
 * Ô biểu tượng từ logo "biểu tượng + chữ" trên nền đặc - xem mode 'mark-tile' ở đầu tệp.
 * Nền = trung vị 4 góc ảnh; điểm thuộc biểu tượng = lệch khỏi nền > 60 (tổng 3 kênh).
 */
async function markTile(buf, region) {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const at = (x, y) => {
    const i = (y * W + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners = [at(2, 2), at(W - 3, 2), at(2, H - 3), at(W - 3, H - 3)];
  const bg = [0, 1, 2].map((c) => corners.map((p) => p[c]).sort((a, b) => a - b)[1]);
  const [rx0, ry0, rx1, ry1] = region;
  let x0 = W,
    y0 = H,
    x1 = -1,
    y1 = -1;
  for (let y = Math.floor(ry0 * H); y < Math.ceil(ry1 * H); y++) {
    for (let x = Math.floor(rx0 * W); x < Math.ceil(rx1 * W); x++) {
      const p = at(x, y);
      if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 60) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('mark-tile: không thấy biểu tượng trong vùng đã khai');
  // Cắt SÁT biểu tượng rồi đặt giữa một ô nền đặc cùng màu nền gốc. Không cắt ô vuông
  // thẳng từ ảnh gốc: biểu tượng bề ngang lớn (Xin Chào Núi Cấm) kéo ô vuông lấn xuống
  // dòng chữ tên game bên dưới.
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const side = Math.round(Math.max(w, h) / (1 - 2 * 0.14));
  const mark = await sharp(buf)
    .removeAlpha()
    .extract({ left: x0, top: y0, width: w, height: h })
    .png()
    .toBuffer();
  const ext = await sharp({
    create: {
      width: side,
      height: side,
      channels: 3,
      background: { r: bg[0], g: bg[1], b: bg[2] },
    },
  })
    .composite([{ input: mark, left: Math.round((side - w) / 2), top: Math.round((side - h) / 2) }])
    .png()
    .toBuffer();
  return tile(ext);
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
  const only = process.argv.slice(2);
  for (const [id, { src: from, mode = 'as-is', region }] of Object.entries(SOURCES)) {
    if (only.length && !only.includes(id)) continue;
    const raw = await load(from);
    const sha = crypto.createHash('sha256').update(raw).digest('hex');
    const src =
      mode === 'tile'
        ? await tile(raw)
        : mode === 'no-white'
          ? await noWhite(raw)
          : mode === 'mark-tile'
            ? await markTile(raw, region)
            : raw;
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
