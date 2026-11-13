#!/usr/bin/env node
/**
 * Đo TÍN HIỆU CỘNG ĐỒNG của mọi repo công khai trong tsudev-org - thứ các chương trình như
 * SignPath Foundation dùng để đánh giá một dự án mã nguồn mở (sao, fork, người đóng góp ngoài,
 * phát hành đều đặn, tệp cộng đồng, điểm bảo mật OpenSSF Scorecard).
 *
 *   npm run he-sinh-thai:tin-hieu            # in bảng + ghi ảnh chụp logs/tin-hieu/<YYYYMMDD>.json
 *   npm run he-sinh-thai:tin-hieu -- --json  # chỉ in JSON (cho script khác)
 *
 * Cần `gh` đã đăng nhập (chỉ ĐỌC dữ liệu công khai). Miễn phí: GitHub API + api.securityscorecards.dev.
 * So với ảnh chụp gần nhất trong logs/tin-hieu/ để thấy tiến độ (cột Δ).
 * Kế hoạch dùng số liệu này: ~/projects/logs/handover/20261113-02_ke-hoach-uy-tin-he-sinh-thai.md
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORG = 'tsudev-org';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SNAP_DIR = path.join(ROOT, 'logs', 'tin-hieu');
const JSON_ONLY = process.argv.includes('--json');
// Tài khoản của chủ dự án / agent - KHÔNG tính là "người đóng góp bên ngoài". Thêm tài khoản nội
// bộ mới vào đây, nếu không số "đóng góp ngoài" bị thổi phồng.
const NOI_BO = new Set(['tsudev-tsudev', 'nguyentrangtinhsu', 'b4djl1h', 'Copilot']);
const VIET = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const gh = (args) => {
  try {
    return JSON.parse(
      execFileSync('gh', ['api', ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
    );
  } catch {
    return null;
  }
};

async function scorecard(name) {
  try {
    const r = await fetch(`https://api.securityscorecards.dev/projects/github.com/${ORG}/${name}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j.score === 'number' ? j.score : null;
  } catch {
    return null;
  }
}

async function main() {
  const repos = (gh([`orgs/${ORG}/repos?per_page=100&type=public`]) || []).filter(
    (r) => !r.archived
  );
  const since = Date.now() - 90 * 864e5;
  const rows = [];
  for (const r of repos) {
    const full = `${ORG}/${r.name}`;
    // "Đóng góp ngoài" = tác giả commit trong 12 THÁNG GẦN NHẤT, trừ nội bộ và bot. Không dùng
    // /contributors: repo là bản fork (Lotus Share từ LocalSend, tsudev-files từ Filee) mang cả
    // người đóng góp của dự án GỐC - đo vậy là tự lừa mình (13/11/2026 ra 98 và 59).
    // Mốc = muộn hơn trong (12 tháng trước, ngày repo được tạo ở tsudev): commit nhập từ dự án gốc
    // giữ ngày gốc nên rơi ra ngoài mốc này.
    const yearAgo = new Date(
      Math.max(Date.now() - 365 * 864e5, Date.parse(r.created_at))
    ).toISOString();
    const authors = new Set();
    for (let page = 1; page <= 5; page++) {
      const commits =
        gh([`repos/${full}/commits?since=${yearAgo}&per_page=100&page=${page}`]) || [];
      for (const c of commits) {
        const login = c.author?.login;
        if (login && c.author.type === 'User' && !NOI_BO.has(login)) authors.add(login);
      }
      if (commits.length < 100) break;
    }
    const releases = gh([`repos/${full}/releases?per_page=50`]) || [];
    const community = gh([`repos/${full}/community/profile`]);
    const pvr = gh([`repos/${full}/private-vulnerability-reporting`]);
    const readmes = (gh([`repos/${full}/contents/`]) || [])
      .map((f) => f.name)
      .filter((n) => /^readme/i.test(n));
    rows.push({
      repo: r.name,
      sao: r.stargazers_count,
      fork: r.forks_count,
      theo_doi: r.subscribers_count ?? null,
      nguoi_dong_gop_ngoai: authors.size,
      phat_hanh_90_ngay: releases.filter((x) => !x.draft && Date.parse(x.published_at) > since)
        .length,
      phat_hanh_moi_nhat: releases.find((x) => !x.draft)?.published_at?.slice(0, 10) ?? null,
      issue_mo: r.open_issues_count,
      discussions: Boolean(r.has_discussions),
      giay_phep: r.license?.spdx_id ?? null,
      topics: (r.topics || []).length,
      mo_ta_tieng_anh: Boolean(r.description) && !VIET.test(r.description),
      readme_tieng_anh: readmes.some((n) => /en/i.test(n.replace(/^readme/i, ''))),
      suc_khoe_cong_dong: community?.health_percentage ?? null,
      bao_cao_lo_hong_rieng: pvr?.enabled ?? null,
      scorecard: await scorecard(r.name),
    });
  }
  rows.sort((a, b) => b.sao - a.sao || a.repo.localeCompare(b.repo));
  const snap = { do_luc: new Date().toISOString(), org: ORG, repos: rows };
  if (JSON_ONLY) {
    process.stdout.write(JSON.stringify(snap, null, 2) + '\n');
    return;
  }

  fs.mkdirSync(SNAP_DIR, { recursive: true });
  const prevFile = fs
    .readdirSync(SNAP_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .pop();
  const prev = prevFile ? JSON.parse(fs.readFileSync(path.join(SNAP_DIR, prevFile), 'utf8')) : null;
  const before = new Map((prev?.repos || []).map((x) => [x.repo, x]));
  const d = (now, old) =>
    old == null || now === old ? '' : ` (${now - old > 0 ? '+' : ''}${now - old})`;
  const yn = (v) => (v == null ? '?' : v ? 'có' : 'KHÔNG');

  const head = [
    'Repo',
    'Sao',
    'Fork',
    'Đóng góp ngoài',
    'Phát hành 90 ngày',
    'Sức khoẻ %',
    'Scorecard',
    'Giấy phép',
    'Topics',
    'Mô tả EN',
    'README EN',
    'Discussions',
    'Báo lỗ hổng riêng',
  ];
  const lines = [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`];
  for (const x of rows) {
    const o = before.get(x.repo);
    lines.push(
      `| ${[
        x.repo,
        x.sao + d(x.sao, o?.sao),
        x.fork + d(x.fork, o?.fork),
        x.nguoi_dong_gop_ngoai + d(x.nguoi_dong_gop_ngoai, o?.nguoi_dong_gop_ngoai),
        x.phat_hanh_90_ngay,
        x.suc_khoe_cong_dong ?? '?',
        x.scorecard ?? '-',
        x.giay_phep ?? 'KHÔNG',
        x.topics,
        yn(x.mo_ta_tieng_anh),
        yn(x.readme_tieng_anh),
        yn(x.discussions),
        yn(x.bao_cao_lo_hong_rieng),
      ].join(' | ')} |`
    );
  }
  const tong = rows.reduce((s, x) => s + x.sao, 0);
  console.log(
    `Tín hiệu cộng đồng ${ORG} - ${snap.do_luc.slice(0, 10)}${prevFile ? ` (so với ${prevFile})` : ''}\n`
  );
  console.log(lines.join('\n'));
  console.log(`\nTổng sao: ${tong} · repo: ${rows.length}`);

  const out = path.join(SNAP_DIR, `${snap.do_luc.slice(0, 10).replaceAll('-', '')}.json`);
  fs.writeFileSync(out, JSON.stringify(snap, null, 2) + '\n');
  console.log(`Ảnh chụp: ${path.relative(ROOT, out)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
