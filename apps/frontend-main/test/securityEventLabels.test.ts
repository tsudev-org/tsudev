import fs from 'fs';
import path from 'path';
import { hienIp } from '../lib/ip';

// Quét NGUỒN: mọi loại sự kiện auth-service ghi bằng logSecurity(...) phải có nhãn tiếng Việt ở
// components/SecurityEventList.tsx - thiếu thì trang Bảo mật in mã thô (vd "step_up_failed", đo 17/11/2026).
const ROOT = path.join(__dirname, '..', '..', '..');

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'node_modules' || d.name === 'dist' ? [] : filesUnder(p);
    return p.endsWith('.ts') && !p.includes(`${path.sep}test${path.sep}`) ? [p] : [];
  });
}

test('mọi loại sự kiện bảo mật có nhãn tiếng Việt', () => {
  const types = new Set<string>();
  for (const f of filesUnder(path.join(ROOT, 'services'))) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/logSecurity\([^,]+,\s*'([a-z_]+)'/g))
      if (m[1]) types.add(m[1]);
  }
  expect(types.size).toBeGreaterThan(10);
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'SecurityEventList.tsx'),
    'utf8'
  );
  const thieu = [...types].filter((t) => !new RegExp(`^\\s+${t}:`, 'm').test(src));
  expect(thieu).toEqual([]);
});

test('hienIp: IPv4 bọc IPv6 về IPv4, địa chỉ khác giữ nguyên', () => {
  expect(hienIp('::ffff:127.0.0.1')).toBe('127.0.0.1');
  expect(hienIp('::ffff:203.0.113.9')).toBe('203.0.113.9');
  expect(hienIp('2001:db8::1')).toBe('2001:db8::1');
  expect(hienIp('::1')).toBe('::1');
});
