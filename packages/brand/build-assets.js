#!/usr/bin/env node
'use strict';
/**
 * Sinh toàn bộ tài nguyên thương hiệu cho web từ các file gốc trong `source/`.
 *
 *   node packages/brand/build-assets.js
 *
 * Yêu cầu: `sharp` (có sẵn trong node_modules gốc qua Next; thiếu thì
 * `npm i --no-save sharp`). Kết quả đã được commit sẵn nên chỉ cần chạy lại
 * script này khi thay ảnh gốc.
 *
 * Nguồn logo DUY NHẤT từ 13/11/2026: `source/logo-tsudev.png` (1254x1254, cú +
 * chữ "tsudev" trên nền đen) - chủ dự án chốt dùng NGUYÊN logo này cho mọi chỗ,
 * kể cả favicon, chỉ xoá nền. Không cắt, không kéo giãn: mọi cỡ đều `fit:
 * 'contain'` trên khung vuông, giữ đúng tỉ lệ gốc.
 *
 * Đầu ra được ghi vào `public/` của MỌI app trong APPS bên dưới.
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Thiếu `sharp`. Chạy: npm i --no-save sharp');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(__dirname, 'source');
const APPS = ['apps/frontend-main'].map((a) => path.join(ROOT, a, 'public'));

// Số biến thể avatar mặc định + góc xoay hue (độ) so với ảnh gốc (xanh dương).
const AVATAR_VARIANTS = [
  { name: 'default-01', hue: 0 }, // xanh dương (gốc)
  { name: 'default-02', hue: -40 }, // xanh ngọc
  { name: 'default-03', hue: -90 }, // xanh lá
  { name: 'default-04', hue: 45 }, // tím
  { name: 'default-05', hue: 95 }, // hồng sen
  { name: 'default-06', hue: 155 }, // hổ phách
];
// Tông xanh gốc của thương hiệu; các biến thể lệch hue so với mốc này.
const BASE_HUE = 213;

// Hai mức chi tiết cho quả cầu lưới. Ở 32-40px, 3 kinh + 5 vĩ bị rối nét, nên
// bản `sm` rút còn 2 kinh + 3 vĩ và tăng bề dày nét tương đối để vẫn rõ.
// `Avatar.jsx` chọn bộ nào theo prop `size` (ngưỡng AVATAR_SMALL_MAX).
const DETAIL = {
  lg: {
    dir: 'avatars',
    size: 256,
    meridians: [0, 32, 58],
    latitudes: [-52, -26, 0, 26, 52],
    nodesEq: 8,
    nodesOther: 6,
    strokeScale: 1,
  },
  sm: {
    dir: 'avatars/sm',
    size: 128,
    meridians: [0, 50],
    latitudes: [-32, 0, 32],
    nodesEq: 6,
    nodesOther: 4,
    strokeScale: 1.45,
  },
};

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

/**
 * Avatar mặc định: quả cầu lưới phát sáng, VẼ BẰNG VECTOR.
 *
 * Vì sao không cắt từ `source/avatar.png`: ảnh đó có dòng chữ "tsudev_" đè lên
 * vùng xích đạo của quả cầu, nên phần lưới nằm dưới chữ đã mất hẳn dữ liệu.
 * Mọi cách vá (lấp từ bản xoay, nội suy) đều để lại vệt rõ. Dựng lại bằng vector
 * cho hình sạch tuyệt đối ở mọi kích thước, file nhỏ, và đổi màu chính xác theo
 * từng biến thể thay vì xoay hue gần đúng.
 */
function networkGlobeSvg({ hue = 210, size = 256, detail = DETAIL.lg } = {}) {
  const S = size;
  const c = S / 2;
  const R = S * 0.345;
  const { meridians: MERIDIANS, latitudes: LATITUDES, nodesEq, nodesOther, strokeScale } = detail;
  const hsl = (h, s, l, a = 1) => `hsl(${((h % 360) + 360) % 360} ${s}% ${l}% / ${a})`;
  const arc = hsl(hue, 72, 58);
  const arcDim = hsl(hue, 65, 44);
  const nodeHot = hsl(hue, 95, 88);

  // Kinh tuyến: hình chiếu trực giao của kinh tuyến lên mặt cầu là ellipse có
  // bán trục ngang R*cos(λ), bán trục dọc R.
  const meridians = MERIDIANS.map((deg) => {
    const rx = Math.max(1.2, R * Math.cos((deg * Math.PI) / 180));
    return `<ellipse cx="${c}" cy="${c}" rx="${rx.toFixed(1)}" ry="${R.toFixed(1)}"/>`;
  }).join('');

  // Vĩ tuyến: ellipse dẹt, tâm dịch theo R*sin(φ).
  const latitudes = LATITUDES.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const rx = R * Math.cos(rad);
    const ry = Math.max(1.1, rx * 0.28);
    const cy = c - R * Math.sin(rad) * 0.92;
    return `<ellipse cx="${c}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"/>`;
  }).join('');

  // Nút mạng đặt trên các vĩ tuyến, cỡ và độ sáng thay đổi theo một chuỗi tất
  // định (không dùng random để mỗi lần build ra kết quả giống hệt).
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const nodes = [];
  for (const deg of LATITUDES) {
    const rad = (deg * Math.PI) / 180;
    const rx = R * Math.cos(rad);
    const ry = Math.max(1.1, rx * 0.28);
    const cy = c - R * Math.sin(rad) * 0.92;
    const n = deg === 0 ? nodesEq : nodesOther;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2 + rnd() * 0.25;
      const x = c + rx * Math.cos(t);
      const y = cy + ry * Math.sin(t);
      const r = (rnd() * 1.7 + 1.5) * (S / 256) * strokeScale;
      const hot = rnd() > 0.62;
      nodes.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${
          hot ? nodeHot : arc
        }"/>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <radialGradient id="disc" cx="50%" cy="42%" r="62%">
      <stop offset="0%" stop-color="${hsl(hue, 42, 12)}"/>
      <stop offset="70%" stop-color="${hsl(hue, 38, 7)}"/>
      <stop offset="100%" stop-color="${hsl(hue, 30, 4)}"/>
    </radialGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${(S / 90).toFixed(2)}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <circle cx="${c}" cy="${c}" r="${c}" fill="url(#disc)"/>
  <g filter="url(#glow)">
    <g fill="none" stroke="${arcDim}" stroke-width="${((S / 170) * strokeScale).toFixed(
      2
    )}" opacity="0.85">${meridians}${latitudes}</g>
    <circle cx="${c}" cy="${c}" r="${R.toFixed(1)}" fill="none" stroke="${arc}" stroke-width="${(
      (S / 140) *
      strokeScale
    ).toFixed(2)}"/>
    <g>${nodes.join('')}</g>
  </g>
</svg>`;
}

/** Ghi cùng một buffer vào cùng đường dẫn tương đối của mọi app. */
function emit(relPath, buf) {
  for (const pub of APPS) {
    const out = path.join(pub, relPath);
    ensureDir(path.dirname(out));
    fs.writeFileSync(out, buf);
  }
  console.log(`  ${relPath.padEnd(34)} ${(buf.length / 1024).toFixed(1)} kB`);
}

/**
 * Xoá nền ĐEN của logo, giữ nguyên mọi mảng tối BÊN TRONG logo.
 *
 * Khó ở chỗ: logo vẽ trên nền đen và lòng logo cũng có nhiều mảng gần đen (mặt
 * cú, nền mạch điện). Flood fill trần từ mép ảnh LỌT qua các khe tối hẹp giữa tai
 * cú và vòng tròn, ăn thủng mặt cú - trên nền đen không ai thấy, trên nền Sáng
 * thì mặt cú thành lỗ trắng (đã đo 13/11/2026).
 *
 * Cách làm:
 *   1. Mặt nạ "nội dung" = pixel có độ sáng (max R,G,B) > `content`.
 *   2. Đóng hình thái học (giãn rồi co, cửa sổ vuông bán kính `seal`) để bịt các
 *      khe hẹp hơn 2*seal - mặt nạ đóng là RÀO CHẮN của flood fill.
 *   3. Flood fill từ mép qua pixel tối không thuộc rào. Vùng tới được là nền.
 *   4. Trong vùng nền, alpha tăng dần theo độ sáng (giữ quầng sáng xanh mềm), và
 *      màu được "khử nhân" với nền đen để quầng giữ đúng sắc khi đặt lên nền sáng.
 *
 * `seal=14` là kết quả dò trên ảnh 1254px: 6 còn lọt vào mặt cú, 14 kín mà không
 * lấp các khe rộng giữa tai và vòng tròn.
 */
async function removeDarkBackground(
  inputPath,
  { inner = 14, outer = 34, content = 40, seal = 14 } = {}
) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const C = 4;
  const N = W * H;
  const lum = (p) => Math.max(data[p * C], data[p * C + 1], data[p * C + 2]);

  const fg = new Uint8Array(N);
  for (let p = 0; p < N; p++) fg[p] = lum(p) > content ? 1 : 0;

  // Giãn/co cửa sổ vuông bằng tổng tiền tố 2 chiều - O(N), không phụ thuộc bán kính.
  const morph = (m, r, dilate) => {
    const ps = new Int32Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) {
      let row = 0;
      for (let x = 0; x < W; x++) {
        row += m[y * W + x];
        ps[(y + 1) * (W + 1) + x + 1] = ps[y * (W + 1) + x + 1] + row;
      }
    }
    const o = new Uint8Array(N);
    for (let y = 0; y < H; y++) {
      const y0 = Math.max(0, y - r);
      const y1 = Math.min(H - 1, y + r);
      for (let x = 0; x < W; x++) {
        const x0 = Math.max(0, x - r);
        const x1 = Math.min(W - 1, x + r);
        const s =
          ps[(y1 + 1) * (W + 1) + x1 + 1] -
          ps[y0 * (W + 1) + x1 + 1] -
          ps[(y1 + 1) * (W + 1) + x0] +
          ps[y0 * (W + 1) + x0];
        o[y * W + x] = dilate ? (s > 0 ? 1 : 0) : s === (x1 - x0 + 1) * (y1 - y0 + 1) ? 1 : 0;
      }
    }
    return o;
  };
  const sealed = morph(morph(fg, seal, true), seal, false);

  const bg = new Uint8Array(N);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x;
    if (bg[p] || lum(p) > outer || (sealed[p] && !fg[p])) return;
    bg[p] = 1;
    stack.push(x, y);
  };
  for (let x = 0; x < W; x++) {
    push(x, 0);
    push(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    push(0, y);
    push(W - 1, y);
  }
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  let removed = 0;
  for (let p = 0; p < N; p++) {
    if (!bg[p]) continue;
    const d = lum(p);
    const a = d <= inner ? 0 : Math.round(((d - inner) / (outer - inner)) * 255);
    if (a > 0 && a < 255) {
      const k = 255 / a;
      for (let c = 0; c < 3; c++) data[p * C + c] = Math.min(255, Math.round(data[p * C + c] * k));
    }
    data[p * C + 3] = a;
    if (a === 0) removed++;
  }
  console.log(`  xoá nền đen: ${((removed / N) * 100).toFixed(1)}% pixel trong suốt`);

  const png = await sharp(data, { raw: { width: W, height: H, channels: C } })
    .png()
    .toBuffer();
  return sharp(png).trim({ threshold: 1 }).png().toBuffer();
}

/** PNG nén bảng màu - logo là hình đồ hoạ nên giảm được rất nhiều dung lượng. */
const pngOpts = { palette: true, quality: 90, effort: 10, compressionLevel: 9 };

/** Đặt ảnh vào khung vuông `size`, giữ NGUYÊN tỉ lệ (không kéo giãn). */
const square = (buf, size) =>
  sharp(buf)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'lanczos3',
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

/** Dựng file .ico thật (container nhiều độ phân giải, dữ liệu PNG bên trong). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;
  entries.forEach((e, i) => {
    const b = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b + 0);
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b + 1);
    dir.writeUInt8(0, b + 2); // số màu bảng
    dir.writeUInt8(0, b + 3); // reserved
    dir.writeUInt16LE(1, b + 4); // planes
    dir.writeUInt16LE(32, b + 6); // bits per pixel
    dir.writeUInt32LE(e.data.length, b + 8);
    dir.writeUInt32LE(offset, b + 12);
    offset += e.data.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
}

async function main() {
  for (const pub of APPS) ensureDir(pub);

  console.log('\n[1/5] Logo - xoá nền đen, giữ nguyên hình');
  const logo = await removeDarkBackground(path.join(SRC, 'logo-tsudev.png'));
  const meta = await sharp(logo).metadata();
  console.log(`  logo sau khi cắt viền trong suốt: ${meta.width}x${meta.height}`);

  // Bản lớn cho README, tài liệu, bản in.
  emit(
    'brand/logo-tsudev.png',
    await sharp(await square(logo, 1024))
      .png(pngOpts)
      .toBuffer()
  );
  // Bản cho giao diện: header vẽ logo ở 40-48px. Logo.tsx chọn bậc vừa cỡ qua
  // <picture> + srcset (AVIF trước, WebP sau, PNG 256 làm đường lui cuối) - đổi bậc
  // thì sửa LOGO_SIZES ở Logo.tsx.
  for (const s of [48, 96, 144, 192]) {
    const base = sharp(await square(logo, s));
    emit(
      `brand/logo-tsudev-${s}.avif`,
      await base.clone().avif({ quality: 70, effort: 9 }).toBuffer()
    );
    emit(
      `brand/logo-tsudev-${s}.webp`,
      await base.clone().webp({ quality: 90, effort: 6 }).toBuffer()
    );
  }
  emit(
    'brand/logo-tsudev-256.png',
    await sharp(await square(logo, 256))
      .png(pngOpts)
      .toBuffer()
  );

  console.log('\n[2/5] Avatar mặc định - quả cầu lưới, 6 tông × 2 mức chi tiết');
  for (const d of [DETAIL.lg, DETAIL.sm]) {
    for (const v of AVATAR_VARIANTS) {
      const svg = networkGlobeSvg({ hue: BASE_HUE + v.hue, size: d.size, detail: d });
      emit(
        `${d.dir}/${v.name}.webp`,
        await sharp(Buffer.from(svg)).webp({ quality: 88, effort: 6 }).toBuffer()
      );
    }
  }

  console.log('\n[3/5] Favicon - NGUYÊN logo (cú + chữ "tsudev"), nền trong suốt');
  // Chủ dự án chốt 13/11/2026: favicon là logo HOÀN CHỈNH có chữ, chỉ bỏ nền - KHÁC
  // `.standards/docs/BRAND_ASSETS.md` (đòi "chỉ hình cú"). Đã mở đề xuất cập nhật
  // quy ước ở repo tsudev-standards; cho tới khi nó được nhận, đây là chỗ repo này
  // lệch chuẩn CÓ CHỦ Ý.
  const PNG_SMALL = { compressionLevel: 9, palette: true, quality: 90, effort: 10 };
  const iconAt = (size) => square(logo, size);
  const iconPng = async (size) =>
    sharp(await iconAt(size))
      .png(PNG_SMALL)
      .toBuffer();

  // Nền đặc cho icon mà HỆ ĐIỀU HÀNH tự tô nền nếu để trong suốt (iOS, maskable
  // Android). Dùng gần-đen #0A0A0A = `--bg-base` chế độ Tối: logo vốn vẽ trên nền
  // đen, nên đây là nền nó được thiết kế cho.
  const SOLID_BG = { r: 0x0a, g: 0x0a, b: 0x0a, alpha: 1 };

  // `removeAlpha()` hạ PNG xuống color type 2 (RGB) để `scripts/check-brand-assets.js`
  // đọc được "nền đặc" từ header ảnh mà không cần giải mã pixel.
  const onSolid = async (size, scale) => {
    const inner = Math.round(size * scale);
    const pad = Math.round((size - inner) / 2);
    return sharp({ create: { width: size, height: size, channels: 4, background: SOLID_BG } })
      .composite([{ input: await iconAt(inner), top: pad, left: pad }])
      .flatten({ background: SOLID_BG })
      .removeAlpha()
      .png(PNG_SMALL)
      .toBuffer();
  };

  emit('android-chrome-512x512.png', await iconPng(512));
  emit('android-chrome-192x192.png', await iconPng(192));
  // Maskable: Android xén theo hình dạng máy, vùng an toàn là 80% giữa.
  emit('android-chrome-maskable-512x512.png', await onSolid(512, 0.8));
  emit('android-chrome-maskable-192x192.png', await onSolid(192, 0.8));
  // apple-touch-icon `MUST` nền đặc: iOS tô ĐEN vào chỗ trong suốt và tự bo góc.
  emit('apple-touch-icon.png', await onSolid(180, 0.9));
  emit('favicon-96x96.png', await iconPng(96));
  emit('favicon-32x32.png', await iconAt(32));
  emit('favicon-16x16.png', await iconAt(16));

  // ICO thật bảy lớp (BRAND_ASSETS.md mục 7).
  const icoEntries = [];
  for (const size of [16, 24, 32, 48, 64, 128, 256])
    icoEntries.push({
      size,
      data: await sharp(await iconAt(size))
        .png(PNG_SMALL)
        .toBuffer(),
    });
  emit('favicon.ico', buildIco(icoEntries));

  console.log('\n[4/5] Web app manifest');
  const manifest = {
    name: 'tsudev - Hệ sinh thái phần mềm',
    short_name: 'tsudev',
    description:
      'Tìm, tải và cài ứng dụng của hệ sinh thái tsudev bằng một lệnh: winget, Scoop, Homebrew, APT, DNF.',
    start_url: '/',
    display: 'standalone',
    // = `--bg-base` chế độ Tối (mặc định); `test/themeTokens.test.ts` canh.
    theme_color: '#0a0a0a',
    background_color: '#0a0a0a',
    // `purpose` khai TÁCH BẠCH: gộp 'any maskable' trên một ảnh thì một trong hai
    // cách Android dùng nó chắc chắn sai.
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/android-chrome-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/android-chrome-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
  emit('site.webmanifest', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));

  // Ảnh xem trước khi chia sẻ link. Nền tối là HẰNG thương hiệu (không theo chế độ
  // của người đọc - nền tảng chia sẻ cache một ảnh cho mọi người).
  console.log('\n[5/5] Ảnh Open Graph 1200x630');
  const OG_W = 1200;
  const OG_H = 630;
  const LOGO_H = 420;
  const ogBackdrop = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
      <defs>
        <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0%" stop-color="#1b2a4a"/><stop offset="100%" stop-color="#0a0a0a"/>
        </radialGradient>
      </defs>
      <rect width="${OG_W}" height="${OG_H}" fill="url(#glow)"/>
      <text x="${OG_W / 2}" y="${OG_H - 92}" text-anchor="middle"
            font-family="DejaVu Sans, Verdana, sans-serif" font-size="30" fill="#d4d4d8">
        Hệ sinh thái phần mềm · Cài bằng một lệnh
      </text>
      <text x="${OG_W / 2}" y="${OG_H - 46}" text-anchor="middle"
            font-family="DejaVu Sans, Verdana, sans-serif" font-size="24" fill="#38bdf8">
        tsudev.com
      </text>
    </svg>`
  );
  emit(
    'og-image.png',
    await sharp(ogBackdrop)
      .composite([
        { input: await square(logo, LOGO_H), left: Math.round((OG_W - LOGO_H) / 2), top: 30 },
      ])
      .png(pngOpts)
      .toBuffer()
  );

  console.log('\nXong. Đầu ra:');
  for (const pub of APPS) console.log('  ' + path.relative(ROOT, pub));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
