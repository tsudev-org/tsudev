import { readFileSync } from 'fs';
import { join } from 'path';

import { OPERATOR } from '../lib/legal';

// Chân trang (packages/ui) không import được lib/legal.ts của app nên chép tay thông tin chủ
// sở hữu. Hồ sơ Bộ Công Thương đối chiếu chân trang với /terms - lệch nhau là bị yêu cầu bổ sung.
test('chân trang ghi đúng thông tin chủ sở hữu như lib/legal.ts', () => {
  const src = readFileSync(
    join(__dirname, '../../../packages/ui/src/components/SiteFooter.tsx'),
    'utf8'
  ).replace(/\s+/g, ' ');
  for (const v of [
    OPERATOR.legalName,
    OPERATOR.taxCode,
    OPERATOR.address,
    OPERATOR.email,
    OPERATOR.phone,
  ]) {
    expect(src).toContain(v);
  }
});

test('chân trang có liên kết chính sách thanh toán, hoàn tiền', () => {
  const src = readFileSync(
    join(__dirname, '../../../packages/ui/src/components/SiteFooter.tsx'),
    'utf8'
  );
  expect(src).toContain("'/chinh-sach-thanh-toan'");
});
