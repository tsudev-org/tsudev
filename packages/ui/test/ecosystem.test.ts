import { ECOSYSTEM_APPS, ECO_GAMES, PKG_REPO, installCommands } from '../src/lib/ecosystem';

describe('lệnh cài từ kho APT/RPM pkg.tsudev.com', () => {
  const lotus = ECOSYSTEM_APPS.find((a) => a.id === 'lotus');

  it('vân tay khóa là 40 ký tự hex, khớp keys/ của tsudev-org/linux-packages', () => {
    expect(PKG_REPO.fingerprint.replace(/\s/g, '')).toBe(
      '388310F47FA8224D76C0A9C79745B6AF3EA33C74'
    );
  });

  it('APT dùng signed-by, không dùng apt-key', () => {
    const apt = installCommands(lotus!).find((c) => c.channel === 'APT');
    expect(apt?.cmd).toContain(
      '[signed-by=/usr/share/keyrings/tsudev.gpg] https://pkg.tsudev.com/apt stable main'
    );
    expect(apt?.cmd).not.toContain('apt-key');
    expect(apt?.cmd).toMatch(/sudo apt install lotus-share$/);
  });

  it('DNF lấy tệp .repo của kho rồi cài', () => {
    const dnf = installCommands(lotus!).find((c) => c.channel === 'DNF');
    expect(dnf?.cmd).toBe(
      'sudo curl -fsSLo /etc/yum.repos.d/tsudev.repo https://pkg.tsudev.com/rpm/tsudev.repo && sudo dnf install lotus-share'
    );
  });

  it('app không có gói trong kho thì không hiện lệnh apt/dnf (PACKAGING.md mục 8)', () => {
    for (const app of ECOSYSTEM_APPS.filter((a) => !a.pkg)) {
      expect(installCommands(app).map((c) => c.channel)).not.toContain('APT');
    }
  });
});

describe('mục Trò chơi (phiếu 20261112-02)', () => {
  it('sáu game, id duy nhất, website https://<id>.tsudev.com', () => {
    expect(ECO_GAMES).toHaveLength(6);
    expect(new Set(ECO_GAMES.map((g) => g.id)).size).toBe(ECO_GAMES.length);
    for (const g of ECO_GAMES) expect(g.website).toBe(`https://${g.id}.tsudev.com`);
  });

  it('repo private: không lộ link GitHub, không link studio sau Cloudflare Access', () => {
    const all = JSON.stringify(ECO_GAMES);
    expect(all).not.toMatch(/github\.com|TsuGameLabs|studio-/i);
    for (const g of ECO_GAMES) expect(g.openSource).toBe(false);
  });
});

describe('thẻ trò chơi có bản cài (phiếu 20261113-01)', () => {
  const go = ECO_GAMES.find((g) => g.id === 'luyen-go-phim');

  it('Luyện Gõ Phím sinh đúng hai lệnh APT/DNF cho gói tsudev-luyen-go-phim', () => {
    const cmds = installCommands(go!);
    expect(cmds.map((c) => c.channel)).toEqual(['APT', 'DNF']);
    expect(cmds[0]?.cmd).toMatch(/sudo apt install tsudev-luyen-go-phim$/);
    expect(cmds[1]?.cmd).toMatch(/sudo dnf install tsudev-luyen-go-phim$/);
    expect(go?.pkgArch).toBe('Linux x86-64');
  });

  it('game không có `pkg` thì không có lệnh nào', () => {
    for (const g of ECO_GAMES.filter((x) => !x.pkg)) expect(installCommands(g)).toEqual([]);
  });
});

describe('biểu tượng phân biệt được từng sản phẩm (13/11/2026)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { existsSync } = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join } = require('path') as typeof import('path');
  const PUBLIC = join(__dirname, '..', '..', '..', 'apps', 'frontend-main', 'public');

  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * l[0]! + 0.7152 * l[1]! + 0.0722 * l[2]!;
  };
  const all = [...ECOSYSTEM_APPS, ...ECO_GAMES];

  it('mỗi sản phẩm một dải màu riêng (không hai thẻ trùng màu)', () => {
    const tints = all.map((x) => x.tint.join('|'));
    expect(new Set(tints).size).toBe(tints.length);
  });

  it('glyph trắng đạt >= 3:1 trên màu đầu của dải (WCAG 1.4.11)', () => {
    for (const x of all) {
      const ratio = (1 + 0.05) / (lum(x.tint[0]) + 0.05);
      expect([x.id, ratio >= 3]).toEqual([x.id, true]);
    }
  });

  it('logo khai trong dữ liệu có tệp thật trong public/ (nếu không: ảnh vỡ trên production)', () => {
    for (const a of ECOSYSTEM_APPS.filter((x) => x.logo)) {
      expect(a.logo).toMatch(/^\/eco\/[a-z0-9-]+\.webp$/);
      expect([a.id, existsSync(join(PUBLIC, a.logo!))]).toEqual([a.id, true]);
    }
  });

  it('tên trafficmonitor là tên chính thức hiện hành, không phải tên cũ', () => {
    const tm = ECOSYSTEM_APPS.find((a) => a.id === 'trafficmonitor');
    expect(tm?.name).toBe('tsudev-trafficmonitor');
    expect(JSON.stringify(ECOSYSTEM_APPS)).not.toMatch(/TrafficMonitor-VN/i);
  });
});

describe('gói APT/RPM suy từ catalog.json của kho, không gõ tay (phiếu 20261113-02)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PKG_CATALOG } = require('../src/lib/pkgCatalog.generated');

  it('bản chụp đúng hợp đồng schema 1 và vân tay khớp PKG_REPO', () => {
    expect(PKG_CATALOG.schema).toBe(1);
    expect(PKG_CATALOG.fingerprint).toBe(PKG_REPO.fingerprint.replace(/\s/g, ''));
  });

  it('mọi gói của 3 kho có website trùng một sản phẩm đều được ghép (không gói nào lạc)', () => {
    const all = [...ECOSYSTEM_APPS, ...ECO_GAMES] as { website?: string; [k: string]: unknown }[];
    for (const kind of ['pkg', 'scoop', 'brew'] as const) {
      for (const p of PKG_CATALOG[kind] as { name: string; homepage: string }[]) {
        const owner = all.find((x) => x.website === p.homepage);
        if (!owner) continue;
        expect([kind, p.name, owner[kind]]).toEqual([kind, p.name, p.name]);
      }
    }
  });

  it('kênh Scoop/Homebrew khớp thực tế đã đo (tsudev-trafficmonitor, SWICO, files, Lotus Share)', () => {
    const by = (id: string) => ECOSYSTEM_APPS.find((a) => a.id === id);
    expect(by('trafficmonitor')?.scoop).toBe('tsudev-trafficmonitor');
    expect(by('swico')?.scoop).toBe('tsudev-swico');
    expect(by('files')?.brew).toBe('tsudev-files');
    expect(by('lotus')?.brew).toBe('lotus-share');
    // Gói chuyển tiếp `tsudev-lotus` (replacedBy) KHÔNG được hiện.
    expect(JSON.stringify(PKG_CATALOG)).not.toContain('tsudev-lotus');
  });

  it('Lotus Share có cả x86-64 và ARM64 theo catalog', () => {
    expect(ECOSYSTEM_APPS.find((a) => a.id === 'lotus')?.pkgArch).toBe('Linux x86-64 · ARM64');
  });
});
