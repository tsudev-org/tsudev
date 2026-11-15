/**
 * Script cài một dòng (tsudev-standards PACKAGING.md mục 6) - test quét NGUỒN, vì không bộ test
 * nào ở đây chạy được `curl | sh` thật (việc đó ở workflow install-scripts.yml, trong container).
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ECOSYSTEM_APPS, PKG_REPO } from '../../../packages/ui/src/lib/ecosystem';

const pub = (f: string) => join(__dirname, '..', 'public', f);
const sh = readFileSync(pub('install.sh'), 'utf8');
const ps = readFileSync(pub('install.ps1'), 'utf8');
const code = (src: string, comment: RegExp) =>
  src
    .split('\n')
    .filter((l) => !comment.test(l))
    .join('\n');

describe('install.sh / install.ps1', () => {
  test.each(['install.sh', 'install.ps1'])('%s.sha256 công bố đúng băm của script', (f) => {
    const sha = createHash('sha256')
      .update(readFileSync(pub(f)))
      .digest('hex');
    expect(readFileSync(pub(`${f}.sha256`), 'utf8')).toBe(`${sha}  ${f}\n`);
  });

  test('install.sh ghim vân tay khoá khớp PKG_REPO, kiểm SHA-256 khoá trước khi thêm kho', () => {
    expect(sh).toContain(`FINGERPRINT="${PKG_REPO.fingerprint}"`);
    expect(sh).toMatch(/PIN_GPG_SHA256="[0-9a-f]{64}"/);
    expect(sh).toMatch(/PIN_ASC_SHA256="[0-9a-f]{64}"/);
    expect(sh).toContain('set -eu');
    expect(sh).toContain("grep -Eq '^[a-z][a-z0-9-]+$'");
  });

  test('install.sh không chạy mã tải về (không eval, không pipe vào shell)', () => {
    // Bỏ chuỗi HƯỚNG DẪN cách gọi script (`curl ... install.sh | sh -s --`) - đó là văn bản in ra
    // cho người dùng, không phải lệnh script tự chạy.
    const body = code(sh, /^\s*#/).replaceAll('https://tsudev.com/install.sh | sh -s --', '');
    expect(body).not.toMatch(/\beval\b/);
    expect(body).not.toMatch(/\|\s*(ba)?sh\b/);
    expect(body).not.toMatch(/\bsource\b|^\s*\.\s/m);
  });

  test('C2: nhiều gói - kiểm MỌI tên trước khi thêm kho / cài (không cài dở một nửa)', () => {
    const body = code(sh, /^\s*#/);
    const check = body.indexOf('in_catalog "$pkg" "$CATALOG_PKG"');
    const add = body.indexOf('install_apt "$@"');
    expect(check).toBeGreaterThan(-1);
    expect(add).toBeGreaterThan(check);
    expect(body).toContain('$SUDO apt-get install -y "$@"');
    // install.ps1: lập kế hoạch cho cả danh sách rồi mới chạy vòng cài.
    expect(ps).toContain('ValueFromRemainingArguments = $true');
    expect(ps.indexOf('$plan = foreach')).toBeLessThan(ps.indexOf('foreach ($item in $plan)'));
  });

  test('install.ps1 không có `exit` (đóng cửa sổ người dùng) và không Invoke-Expression', () => {
    const body = code(ps, /^\s*#/);
    expect(body).not.toMatch(/\bexit\b/i);
    expect(body).not.toMatch(/Invoke-Expression|\biex\b/i);
    expect(body).toContain("-cnotmatch '^[a-z][a-z0-9-]+$'");
  });

  test('mã winget trong install.ps1 = mã winget ĐÃ có trong danh bạ /apps', () => {
    const inScript = [...ps.matchAll(/'tsudev-[a-z]+' = '([^']+)'/g)].map((m) => m[1]).sort();
    const inData = ECOSYSTEM_APPS.map((a) => a.winget)
      .filter((x): x is string => Boolean(x))
      .sort();
    expect(inScript).toEqual(inData);
  });

  test('_headers phục vụ hai script với no-cache + CSP', () => {
    const h = readFileSync(pub('_headers'), 'utf8');
    for (const f of ['/install.sh', '/install.ps1']) {
      const block = h
        .slice(h.indexOf(`${f}\n`))
        .split('\n')
        .slice(0, 5)
        .join('\n');
      expect(block).toContain('Cache-Control: no-cache');
      expect(block).toContain("Content-Security-Policy: default-src 'none'");
    }
  });
});
