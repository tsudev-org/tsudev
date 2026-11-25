import {
  ECOSYSTEM_APPS,
  ECO_GAMES,
  PKG_REPO,
  installCommands,
  installPlan,
  guessInstallTarget,
  INSTALL_TARGETS,
  ecoAuthorLine,
} from '../src/lib/ecosystem';
import CONTRIBUTORS_JSON from '../src/lib/contributors.json';

const CONTRIBUTORS: { repos: Record<string, number> } = CONTRIBUTORS_JSON;

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

  it('sáu trò chơi đều có logo riêng (chủ dự án giao 13/11/2026)', () => {
    expect(ECO_GAMES.map((g) => g.logo)).toEqual(ECO_GAMES.map((g) => `/eco/game-${g.id}.webp`));
  });

  it('logo khai trong dữ liệu có tệp thật trong public/ (nếu không: ảnh vỡ trên production)', () => {
    for (const a of all.filter((x) => x.logo)) {
      expect(a.logo).toMatch(/^\/eco\/[a-z0-9-]+\.(webp|svg)$/);
      expect([a.id, existsSync(join(PUBLIC, a.logo!))]).toEqual([a.id, true]);
    }
  });

  it('logo SVG (xoá nền, 24/11/2026) luôn có bản nền Sáng đi kèm, có tệp thật', () => {
    for (const a of ECOSYSTEM_APPS.filter((x) => x.logo?.endsWith('.svg'))) {
      expect([a.id, a.logoLight]).toEqual([a.id, a.logo!.replace(/\.svg$/, '-light.svg')]);
      expect([a.id, existsSync(join(PUBLIC, a.logoLight!))]).toEqual([a.id, true]);
    }
    expect(
      ECOSYSTEM_APPS.filter((x) => x.logoLight)
        .map((x) => x.id)
        .sort()
    ).toEqual(['contact', 'disk', 'sounddb', 'swico']);
  });

  it('tên trafficmonitor là tên chính thức hiện hành, không phải tên cũ', () => {
    const tm = ECOSYSTEM_APPS.find((a) => a.id === 'trafficmonitor');
    // Tsu Tramon từ 24/11/2026 (phiếu 20261124-TM1); repo/website cũ chỉ còn sống nhờ chuyển hướng.
    expect(tm?.name).toBe('Tsu Tramon');
    expect(tm?.website).toBe('https://tramon.tsudev.com');
    expect(tm?.releases).toMatch(/^https:\/\/github\.com\/tsudev-org\/tsutramon\//);
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

  it('kênh Scoop/Homebrew khớp thực tế đã đo (tsudev-trafficmonitor, Tsu Swico, files, Lotus Share)', () => {
    const by = (id: string) => ECOSYSTEM_APPS.find((a) => a.id === id);
    expect(by('trafficmonitor')?.scoop).toBe('tsudev-trafficmonitor');
    // Tsu Swico (16/11/2026): gói mới `tsuswico`; `tsudev-swico` là gói chuyển tiếp, KHÔNG hiện.
    expect(by('swico')?.scoop).toBe('tsuswico');
    expect((PKG_CATALOG.scoop as { name: string }[]).map((p) => p.name)).not.toContain(
      'tsudev-swico'
    );
    expect(by('files')?.brew).toBe('tsudev-files');
    expect(by('lotus')?.brew).toBe('lotus-share');
    // Gói chuyển tiếp `tsudev-lotus` (replacedBy) KHÔNG được hiện.
    expect(JSON.stringify(PKG_CATALOG)).not.toContain('tsudev-lotus');
  });

  it('Lotus Share có cả x86-64 và ARM64 theo catalog', () => {
    expect(ECOSYSTEM_APPS.find((a) => a.id === 'lotus')?.pkgArch).toBe('Linux x86-64 · ARM64');
  });
});

describe('lệnh cài GỘP theo hệ điều hành (khay chọn nhiều ở /apps, 13/11/2026)', () => {
  const a = { name: 'A', winget: 'tsudev.A', scoop: 'a', brew: 'a', pkg: 'tsudev-a' };
  const b = { name: 'B', scoop: 'b', pkg: 'tsudev-b' };
  const c = { name: 'C', brew: 'c' };
  const d = { name: 'D' };

  it('Windows: winget ưu tiên, Scoop cho phần còn lại, bucket thêm MỘT lần, nối bằng ; (PowerShell 5.1)', () => {
    const p = installPlan([a, b, d], 'windows');
    expect(p.cmd).toBe(
      'winget install --id tsudev.A -e --accept-package-agreements --accept-source-agreements; ' +
        'scoop bucket add tsudev https://github.com/tsudev-org/scoop-bucket; scoop install tsudev/b'
    );
    expect(p.covered).toEqual([
      { name: 'A', channel: 'winget' },
      { name: 'B', channel: 'Scoop' },
    ]);
    expect(p.missing).toEqual(['D']);
    expect(p.cmd).not.toMatch(/&&|apt|brew|dnf/);
  });

  it('scoop install nhận nhiều gói trong MỘT lệnh', () => {
    expect(installPlan([b, { name: 'E', scoop: 'e' }], 'windows').cmd).toMatch(
      /scoop install tsudev\/b tsudev\/e$/
    );
  });

  it('macOS: một lệnh brew cho mọi cask, không lẫn winget/apt', () => {
    const p = installPlan([a, c, b], 'macos');
    expect(p.cmd).toBe('brew install --cask tsudev-org/tap/a tsudev-org/tap/c');
    expect(p.missing).toEqual(['B']);
  });

  it('Debian: thêm kho một lần (signed-by), apt install mọi gói, nối bằng &&', () => {
    const p = installPlan([a, b, c], 'debian');
    expect(p.cmd.match(/sources\.list\.d/g)).toHaveLength(1);
    expect(p.cmd).toMatch(/&& sudo apt update && sudo apt install -y tsudev-a tsudev-b$/);
    expect(p.cmd).not.toMatch(/apt-key|winget|brew/);
    expect(p.missing).toEqual(['C']);
  });

  it('Fedora: tệp .repo một lần, dnf install mọi gói', () => {
    expect(installPlan([a, b], 'fedora').cmd).toBe(
      `sudo curl -fsSLo /etc/yum.repos.d/tsudev.repo ${PKG_REPO.url}/rpm/tsudev.repo && sudo dnf install -y tsudev-a tsudev-b`
    );
  });

  it('không sản phẩm nào có kênh cho đích ⇒ lệnh rỗng', () => {
    for (const t of INSTALL_TARGETS) expect(installPlan([d], t.id).cmd).toBe('');
  });

  it('dữ liệu thật: lệnh gộp của mọi đích không chứa chuỗi undefined', () => {
    const all = [...ECOSYSTEM_APPS, ...ECO_GAMES];
    for (const t of INSTALL_TARGETS) expect(installPlan(all, t.id).cmd).not.toMatch(/undefined/);
  });

  it('đoán hệ điều hành từ User-Agent', () => {
    expect(guessInstallTarget('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('windows');
    expect(guessInstallTarget('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)')).toBe('macos');
    expect(guessInstallTarget('Mozilla/5.0 (X11; Fedora; Linux x86_64)')).toBe('fedora');
    expect(guessInstallTarget('Mozilla/5.0 (X11; Linux x86_64)')).toBe('debian');
    expect(guessInstallTarget('Mozilla/5.0 (Linux; Android 14)')).toBe('windows');
  });
});

describe('Author/Contributors trên thẻ app (ECO1-a)', () => {
  // Tên cũ bất khả xâm phạm (CLAUDE.md): repo đã đổi tên, chỉ sống nhờ chuyển hướng.
  const OLD_NAMES = [
    'tsudev-files',
    'tsudev-contact',
    'tsudev-swico',
    'tsudev-cwico',
    'tsudev-trafficmonitor',
    'swico',
  ];

  it('app mã nguồn mở nào cũng có `repo` tsudev-org/*, không mang tên cũ', () => {
    for (const app of ECOSYSTEM_APPS.filter((a) => a.openSource)) {
      expect({ id: app.id, repo: app.repo }).toEqual({
        id: app.id,
        repo: expect.stringMatching(/^tsudev-org\/[A-Za-z0-9._-]+$/),
      });
      expect(OLD_NAMES).not.toContain(app.repo!.split('/')[1]);
    }
  });

  it('contributors.json khớp đúng tập repo trong ecosystem.ts (quên chạy `npm run eco:contributors` thì đỏ)', () => {
    const repos = [...new Set(ECOSYSTEM_APPS.flatMap((a) => (a.repo ? [a.repo] : [])))].sort();
    expect(Object.keys(CONTRIBUTORS.repos).sort()).toEqual(repos);
    for (const n of Object.values(CONTRIBUTORS.repos)) {
      expect(Number.isInteger(n) && n >= 0).toBe(true);
    }
  });

  it('số contributors trên app lấy từ bản chụp theo repo', () => {
    for (const app of ECOSYSTEM_APPS) {
      expect(app.contributors).toBe(app.repo ? CONTRIBUTORS.repos[app.repo] : 0);
    }
  });

  it('dòng tác giả: không contributor / số ít / số nhiều', () => {
    expect(ecoAuthorLine({ contributors: 0 })).toBe('Author: TsuDEV');
    expect(ecoAuthorLine({})).toBe('Author: TsuDEV');
    expect(ecoAuthorLine({ contributors: 1 })).toBe('Author: TsuDEV + 1 Contributor');
    expect(ecoAuthorLine({ contributors: 3 })).toBe('Author: TsuDEV + 3 Contributors');
  });
});
