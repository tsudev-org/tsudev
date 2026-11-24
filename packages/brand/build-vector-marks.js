#!/usr/bin/env node
'use strict';
/**
 * Logo VECTOR nền trong suốt cho các sản phẩm có logo vẽ trên ô nền tối (24/11/2026).
 *
 *   node packages/brand/build-vector-marks.js            # mọi sản phẩm trong MARKS
 *   node packages/brand/build-vector-marks.js swico disk # chỉ vài id
 *   node packages/brand/build-vector-marks.js --check    # CI: tệp đã commit có khớp dây chuyền không
 *
 * Vì sao: bốn logo (Tsu Swico, TsuDisk, Sound Db, Tsu Contact) được giao dạng PNG 441-1024 px vẽ trên ô nền
 * navy/than chì. Đặt lên trang Sáng thì thành một khối tối, và phóng to thì mờ. Dây chuyền này:
 *
 *   1. Tải ẢNH GỐC từ repo sản phẩm (nguồn sự thật - BRAND_ASSETS mục 15), đối chiếu SHA-256 đã ghi.
 *   2. Xoá nền bằng khoá màu TOÀN ẢNH (không flood fill: nền lọt trong lòng chữ S, lưới điện thoại cũng
 *      là nền), alpha mềm theo khoảng cách màu, khử nhân với màu nền để biên không còn viền tối.
 *   3. Lượng tử hoá về `colors` màu chủ đạo (k-means, hạt giống cố định ⇒ chạy lại ra đúng tệp cũ).
 *   4. Mỗi màu một mặt nạ, trace bằng `vtracer` (Rust, chế độ bw, spline) ở 2x, gộp thành một SVG.
 *   5. Hai biến thể theo nền, mỗi màu đạt ≥ 3:1 với nền (WCAG 1.4.11, DESIGN_SYSTEM mục 1):
 *        <id>.svg        - cho nền Tối #0A0A0A: màu gốc, màu quá tối được làm sáng dần;
 *        <id>-light.svg  - cho nền Sáng #FFFFFF: nét TRẮNG đổi sang màu nền gốc của logo (giữ nhận diện),
 *                          màu quá nhạt được làm tối dần;
 *        <id>-adaptive.svg - gộp hai bản, tự đổi theo `prefers-color-scheme` (favicon.svg, nơi không biết
 *                          chủ đề trang).
 *   6. Tối ưu bằng SVGO (một chữ số thập phân, nhiều lượt).
 *
 * Cần: `vtracer` trên PATH (`cargo install vtracer --version 0.6.4 --locked`), `sharp`, `svgo`.
 * Đổi logo một sản phẩm: sửa `src` + `sha256` dưới đây, chạy lại, xem ảnh trên cả hai nền rồi commit.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const sharp = require('sharp');
const { optimize } = require('svgo');

const OUT = path.join(__dirname, '..', '..', 'apps', 'frontend-main', 'public', 'eco');
const RAW = 'https://raw.githubusercontent.com/tsudev-org';
const BG_DARK = [10, 10, 10]; // #0A0A0A - bg-base Tối (tokens v3.0.0)
const BG_LIGHT = [255, 255, 255];
const MIN_CONTRAST = 3;

/**
 * id (khớp `EcoApp.id`) → ảnh gốc ở repo sản phẩm.
 * `bg`: màu ô nền đo ở 4 góc ảnh gốc. `crop` [trái, trên, rộng, cao]: chỉ lấy biểu tượng (TsuDisk bỏ dòng chữ
 * "TsuDisk"; Sound Db bỏ dấu ✦ của công cụ tạo ảnh - cùng vùng với brand.json của repo đó). `colors`: số màu chủ đạo.
 */
const MARKS = {
  swico: {
    src: `${RAW}/tsuswico/main/assets/brand/source/logo-swico.png`,
    sha256: 'cb2f58a2f7344a6c065d5b959a9a1d9c300622403a36fb5f2dfe355fb5ee7bb8',
    bg: '#2c3942',
    colors: 1,
  },
  disk: {
    src: `${RAW}/tsudisk/main/assets/brand/source/logo-tsudisk.png`,
    sha256: '933d93add9ee961863ef2586355a2c6527e0075871508e8ae16723a7febf1fa9',
    bg: '#0c0f16',
    crop: [163, 167, 392, 221],
    colors: 3,
  },
  sounddb: {
    src: `${RAW}/sound-db/main/assets/brand/source/logo-sound-db.png`,
    sha256: '32c1ae431ca6878e8059d9459cf84d5c317927ecadd741b0c2c7b4a297bd1955',
    bg: '#0e192d',
    crop: [159, 160, 704, 704],
    colors: 3,
  },
  contact: {
    src: `${RAW}/tsucontact/main/assets/brand/source/logo-contact.png`,
    sha256: 'ad1ccc1fef04a825e8c662310eac8f4e33155a192329ed8c90a33fd4c568e6e4',
    bg: '#1f313f',
    colors: 3,
  },
};

// ---------- màu ----------
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const unhex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** Trộn dần về `toward` (trắng hoặc đen) tới khi đạt ngưỡng tương phản với nền. */
function ensureContrast(c, bg, toward) {
  let out = c;
  for (let t = 0; t <= 1 && contrast(out, bg) < MIN_CONTRAST; t += 0.02) {
    out = c.map((v, i) => v + (toward[i] - v) * t);
  }
  return out;
}

// ---------- xử lý ảnh ----------
async function load(src) {
  const res = await fetch(src, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${src} trả ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Xoá nền theo khoá màu ⇒ { rgb: Float32Array, alpha: Float32Array, W, H }. */
async function keyOut(buf, bgHex, crop) {
  let img = sharp(buf).removeAlpha();
  if (crop) img = img.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const bg = unhex(bgHex);
  const rgb = new Float32Array(W * H * 3);
  const alpha = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const px = [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]];
    const d = Math.hypot(px[0] - bg[0], px[1] - bg[1], px[2] - bg[2]);
    const a = Math.min(1, Math.max(0, (d - 28) / 42));
    alpha[p] = a;
    for (let c = 0; c < 3; c++) {
      // Khử nhân với nền: obs = a*col + (1-a)*bg  ⇒  col = (obs - (1-a)*bg) / a.
      rgb[p * 3 + c] = a > 0 ? Math.min(255, Math.max(0, (px[c] - (1 - a) * bg[c]) / a)) : 0;
    }
  }
  return { rgb, alpha, W, H };
}

/** k-means hạt giống cố định trên điểm đặc (alpha > 0.9) ⇒ bảng màu + nhãn từng điểm. */
function quantize({ rgb, alpha, W, H }, k) {
  const solid = [];
  for (let p = 0; p < W * H; p++) if (alpha[p] > 0.9) solid.push(p);
  let seed = 1;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const at = (p) => [rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]];
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  let C = Array.from({ length: k }, () => at(solid[Math.floor(rand() * solid.length)]));
  const nearest = (c) => C.reduce((best, cc, i) => (d2(c, cc) < d2(c, C[best]) ? i : best), 0);
  for (let it = 0; it < 30; it++) {
    const sum = C.map(() => [0, 0, 0, 0]);
    for (const p of solid) {
      const c = at(p);
      const s = sum[nearest(c)];
      s[0] += c[0];
      s[1] += c[1];
      s[2] += c[2];
      s[3]++;
    }
    C = C.map((c, i) => (sum[i][3] ? sum[i].slice(0, 3).map((v) => v / sum[i][3]) : c));
  }
  const label = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) label[p] = nearest(at(p));
  return { palette: C, label };
}

/** Trace một mặt nạ (Float32 0..1, kích thước w x h) ⇒ danh sách `<path>` không màu. */
async function trace(mask, w, h) {
  const g = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 255 - Math.round(mask[i] * 255);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tsu-mark-'));
  const png = path.join(tmp, 'm.png');
  const svg = path.join(tmp, 'm.svg');
  await sharp(g, { raw: { width: w, height: h, channels: 1 } })
    .resize(w * 2, h * 2, { kernel: 'lanczos3' })
    .threshold(128)
    .png()
    .toFile(png);
  execFileSync('vtracer', [
    '--input',
    png,
    '--output',
    svg,
    '--colormode',
    'bw',
    '--mode',
    'spline',
    '--filter_speckle',
    '6',
    '--corner_threshold',
    '90',
    '--segment_length',
    '8',
    '--splice_threshold',
    '60',
    '--path_precision',
    '1',
  ]);
  const out = fs.readFileSync(svg, 'utf8');
  fs.rmSync(tmp, { recursive: true, force: true });
  return [...out.matchAll(/<path\b[^>]*>/g)].map((m) => {
    const d = /\bd="([^"]+)"/.exec(m[0])[1].trim();
    const tr = /transform="translate\(([^)]+)\)"/.exec(m[0]);
    return { d, tr: tr ? tr[1] : null };
  });
}

function svgDoc(w, h, layers) {
  const body = layers
    .map(({ fill, paths }) =>
      paths
        .map(
          (p) => `<path fill="${fill}"${p.tr ? ` transform="translate(${p.tr})"` : ''} d="${p.d}"/>`
        )
        .join('')
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

const minify = (svg) =>
  optimize(svg, { multipass: true, floatPrecision: 1, plugins: ['preset-default'] }).data;

/** Hai biến thể trong một tệp, đổi theo prefers-color-scheme (mặc định Tối, như tsudev.com). */
function adaptive(darkSvg, lightSvg) {
  const inner = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const open = /^<svg[^>]*>/.exec(darkSvg)[0];
  return (
    open +
    '<style>.l{display:none}@media (prefers-color-scheme:light){.d{display:none}.l{display:inline}}</style>' +
    `<g class="d">${inner(darkSvg)}</g><g class="l">${inner(lightSvg)}</g></svg>`
  );
}

async function build(id, cfg) {
  const raw = await load(cfg.src);
  const sha = crypto.createHash('sha256').update(raw).digest('hex');
  if (sha !== cfg.sha256) {
    throw new Error(
      `${id}: SHA-256 ảnh gốc ${sha} không khớp ${cfg.sha256} - ảnh gốc đã đổi? Xem lại rồi sửa MARKS.`
    );
  }
  const img = await keyOut(raw, cfg.bg, cfg.crop);
  const { palette, label } = quantize(img, cfg.colors);
  const { alpha, W, H } = img;
  let x0 = W,
    y0 = H,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (alpha[y * W + x] > 0.5) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  // Lớp lớn nhất vẽ trước để lớp nhỏ (chi tiết) nằm trên.
  const area = palette.map((_, i) => {
    let n = 0;
    for (let p = 0; p < W * H; p++) if (label[p] === i && alpha[p] > 0.5) n++;
    return n;
  });
  const order = palette.map((_, i) => i).sort((a, b) => area[b] - area[a]);
  const layers = [];
  for (const i of order) {
    if (area[i] < 30) continue;
    const m = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const p = (y + y0) * W + (x + x0);
        m[y * w + x] = label[p] === i ? alpha[p] : 0;
      }
    layers.push({ color: palette[i], paths: await trace(m, w, h) });
  }
  const bgSrc = unhex(cfg.bg);
  const dark = layers.map((l) => ({ ...l, fill: hex(ensureContrast(l.color, BG_DARK, BG_LIGHT)) }));
  const light = layers.map((l) => ({
    ...l,
    fill: hex(lum(l.color) > 0.8 ? bgSrc : ensureContrast(l.color, BG_LIGHT, [0, 0, 0])),
  }));
  const d = minify(svgDoc(w * 2, h * 2, dark));
  const l = minify(svgDoc(w * 2, h * 2, light));
  return {
    [`${id}.svg`]: d,
    [`${id}-light.svg`]: l,
    [`${id}-adaptive.svg`]: adaptive(d, l),
    _log: `${id}: sha256 ${sha.slice(0, 16)}…, ${layers.length} màu [${dark.map((x) => x.fill)}] / [${light.map((x) => x.fill)}]`,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const only = args.filter((a) => !a.startsWith('--'));
  let drift = 0;
  for (const [id, cfg] of Object.entries(MARKS)) {
    if (only.length && !only.includes(id)) continue;
    const { _log, ...files } = await build(id, cfg);
    console.log(_log);
    for (const [name, data] of Object.entries(files)) {
      const file = path.join(OUT, name);
      if (check) {
        const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
        if (cur !== data) {
          console.error(`  LỆCH  eco/${name}`);
          drift++;
        }
      } else {
        fs.writeFileSync(file, data);
        console.log(`  eco/${name} ${(Buffer.byteLength(data) / 1024).toFixed(1)} kB`);
      }
    }
  }
  if (drift) process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
