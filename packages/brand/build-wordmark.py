"""Sinh wordmark SVG "tsudev" từ font Be Vietnam Pro 700 tự host của site.

Chữ được ĐỔI THÀNH ĐƯỜNG VẼ: SVG dùng <text> sẽ vẽ bằng font của máy người xem
(Windows ra Segoe UI, Android ra Roboto) - đúng lỗi "mỗi thiết bị một font" đã
chạy trên production 28/10/2026. Màu lấy từ tông chàm (tokens/extensions.tsudev-web.json
> brand): "tsu" mang text-primary, "dev" mang primary, mỗi chế độ sáng/tối một bản.

Chạy (cần fonttools + brotli, không nằm trong dependency của repo):
    python3 -m venv /tmp/venv && /tmp/venv/bin/pip install fonttools brotli
    /tmp/venv/bin/python packages/brand/build-wordmark.py
"""
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
FONT = ROOT / 'apps/frontend-main/public/fonts/be-vietnam-pro-700-latin.woff2'
OUT = Path(__file__).resolve().parent / 'source'
MODES = [('light', '#1E1B3A', '#4F46E5'), ('dark', '#ECEBF7', '#8B8CF8')]

font = TTFont(FONT)
glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font['hmtx']
ascent = font['hhea'].ascent


def draw(text, x, pen_factory):
    pens = []
    for ch in text:
        name = cmap[ord(ch)]
        pen = pen_factory()
        glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, ascent)))
        pens.append(pen)
        x += hmtx[name][0]
    return pens, x


tsu_pens, x = draw('tsu', 0, lambda: SVGPathPen(glyphs))
dev_pens, _ = draw('dev', x, lambda: SVGPathPen(glyphs))
tsu = ' '.join(p.getCommands() for p in tsu_pens)
dev = ' '.join(p.getCommands() for p in dev_pens)

bounds = BoundsPen(glyphs)
draw('tsudev', 0, lambda: bounds)
xmin, ymin, xmax, ymax = bounds.bounds
pad = 20
view_box = f'{int(xmin - pad)} {int(ymin - pad)} {int(xmax - xmin + 2 * pad)} {int(ymax - ymin + 2 * pad)}'

for mode, ink, accent in MODES:
    (OUT / f'wordmark-{mode}.svg').write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" role="img" aria-label="tsudev">\n'
        f'  <!-- SINH bởi packages/brand/build-wordmark.py - đừng sửa tay. Bản {mode}. -->\n'
        f'  <path fill="{ink}" d="{tsu}"/>\n'
        f'  <path fill="{accent}" d="{dev}"/>\n'
        '</svg>\n'
    )
    print(f'đã sinh source/wordmark-{mode}.svg')
