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
