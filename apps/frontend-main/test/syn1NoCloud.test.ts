// Giữ tệp là MODULE (xem searchHeader.test.ts).
export {};

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Phiếu SYN1 (tsudev-standards v7.0.0 PRODUCT_POLICY mục 7): dữ liệu người dùng chỉ ở thiết bị,
 * đồng bộ đám mây và Pro Q3 đã BỎ. Hai điều phải giữ, vì cả hai hỏng im lặng:
 *  1. Không nội dung công khai nào còn hứa "đồng bộ/sao lưu đám mây" (hồ sơ BCT đối chiếu trang bán).
 *  2. Đăng nhập Google/GitHub chỉ xin phạm vi định danh (PRODUCT_POLICY 7.7) - ghim tường minh để
 *     một bản next-auth đổi mặc định không nới được.
 */
const ROOT = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const walk = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((n) => {
    const p = `${dir}/${n}`;
    if (statSync(join(ROOT, p)).isDirectory()) return walk(p);
    return /\.(tsx?|jsx?)$/.test(n) ? [p] : [];
  });

const PUBLIC = [
  ...walk('apps/frontend-main/pages'),
  ...walk('apps/frontend-main/components'),
  ...walk('apps/frontend-main/lib'),
  ...walk('packages/ui/src/components'),
  'packages/ui/src/lib/ecosystem.ts',
  'services/auth-service/src/proReminders.ts',
];
// Câu hiển thị hay xuống dòng giữa hai chữ ("đồng\n bộ") - so trên bản đã gộp khoảng trắng.
// Ca sót thật (26/11/2026, điều phối in PDF hồ sơ BCT): FAQ /pro "Bản trên máy chủ vẫn tải về..." và
// /chinh-sach-thanh-toan "dịch vụ đồng bộ không hoạt động".
const CLOUD =
  /(đồng bộ|sao lưu)( dữ liệu)?( lên)? đám mây|bản (sao )?trên đám mây|(bản|dữ liệu) trên máy chủ (vẫn )?(tải về|xuất)|bản sao đám mây|dịch vụ đồng bộ|cloud (sync|backup)/i;

describe('SYN1 - không còn hứa đồng bộ/sao lưu đám mây', () => {
  test.each(PUBLIC)('%s', (p) => {
    // Chỉ xét chuỗi hiển thị, bỏ chú thích (chú thích được phép kể lịch sử).
    const code = read(p)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\s+/g, ' ');
    expect(code).not.toMatch(CLOUD);
  });

  test('/pro không liệt kê quyền lợi đồng bộ', () => {
    const src = read('apps/frontend-main/pages/pro.tsx');
    const features = src.slice(
      src.indexOf('const FEATURES'),
      src.indexOf('];', src.indexOf('const FEATURES'))
    );
    expect(features).not.toMatch(/đồng bộ|sao lưu/i);
  });
});

describe('PRODUCT_POLICY 7.7 - phạm vi đăng nhập bên thứ ba', () => {
  const src = read('apps/frontend-main/pages/api/auth/[...nextauth].ts');
  test('GitHub chỉ read:user user:email, Google chỉ openid email profile', () => {
    expect(src).toContain("GITHUB_SCOPE = 'read:user user:email'");
    expect(src).toContain("GOOGLE_SCOPE = 'openid email profile'");
    expect(src.match(/scope: GITHUB_SCOPE/g)).toHaveLength(1);
    expect(src.match(/scope: GOOGLE_SCOPE/g)).toHaveLength(1);
    // Không chỗ nào khác tự khai `scope` (vd. thêm `repo` thẳng vào một provider).
    expect(src.match(/\bscope:/g)).toHaveLength(2);
  });
  test('/privacy nêu bảng dữ liệu 7.7 và lối xoá tài khoản tự phục vụ', () => {
    const p = read('apps/frontend-main/pages/privacy.tsx');
    expect(p).toContain('Xoá sau 90 ngày không hoạt động');
    expect(p).toContain('Tối đa 12 tháng');
    expect(p).toContain('/settings/security#xoa-tai-khoan');
    expect(read('apps/frontend-main/pages/settings/security.tsx')).toContain('id="xoa-tai-khoan"');
  });
});
