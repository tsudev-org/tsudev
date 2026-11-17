import fs from 'fs';
import path from 'path';

// Quét NGUỒN: hộp thoại có sẵn nút phụ (Huỷ) trong thân thì phải tắt nút "Đóng" ở chân (`closeButton={false}`),
// nếu không người dùng thấy hai nút thoát cạnh nhau - đo ở hộp "Xác thực lại" 17/11/2026.
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'node_modules' || d.name.startsWith('.') ? [] : files(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
}

test('Modal có nút Huỷ riêng thì tắt nút Đóng ở chân', () => {
  const root = path.join(__dirname, '..');
  const sai: string[] = [];
  let soHop = 0;
  for (const f of [...files(path.join(root, 'pages')), ...files(path.join(root, 'components'))]) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/<Modal\b([\s\S]*?)<\/Modal>/g)) {
      const khoi = m[1] ?? '';
      const moThe = khoi.slice(0, khoi.indexOf('>') + 1);
      // Nút thoát riêng = nút có chữ "Huỷ"/"Hủy" (không tính nút phụ khác như "Tải về" của DownloadModal).
      if (!/<Button[^>]*>\s*H[uủ][ỷy]\s*</.test(khoi)) continue;
      soHop++;
      if (!/closeButton=\{false\}/.test(moThe)) sai.push(path.relative(root, f));
    }
  }
  expect(soHop).toBeGreaterThan(0);
  expect(sai).toEqual([]);
});
