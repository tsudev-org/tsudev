#!/usr/bin/env node
'use strict';
/**
 * Chụp trạng thái GitHub của repo từng app hệ sinh thái và ghi `packages/ui/src/lib/contributors.json`:
 *   - `visibility` (phiếu 20261125-ECO2, tsudev-standards PRODUCT_POLICY 3.7.7) - nguồn DUY NHẤT của nhãn
 *     OPEN (repo `public`) / PRIVATE. Repo không đọc được (404/403 - private mà token không có quyền) ghi
 *     `private`: không bao giờ đoán OPEN;
 *   - số CONTRIBUTORS (phiếu 20261125-ECO1, phase ECO1-a) - dòng "Author: TsuDEV + N Contributors". Repo
 *     không public thì KHÔNG đếm (không lộ gì từ repo private) - ghi 0.
 *
 *   npm run eco:contributors              # tải + ghi bản chụp (in danh sách login để người duyệt PR đối chiếu)
 *   npm run eco:contributors -- --check   # chỉ báo bản chụp có lệch GitHub không (exit 1 nếu lệch)
 *
 * Vì sao BẢN CHỤP đã commit chứ không gọi GitHub lúc chạy (giống pkg-catalog-sync.js): trang chủ + /apps là
 * trang tĩnh/ISR, CSP `connect-src` không mở api.github.com, giới hạn 60 lượt/giờ cho IP ẩn danh, và bản dựng
 * không được phụ thuộc mạng. Action `.github/workflows/eco-contributors.yml` chạy hằng tuần, đổi thì mở PR.
 *
 * Danh sách repo đọc từ trường `repo: '<owner>/<name>'` trong `packages/ui/src/lib/ecosystem.ts` - KHÔNG khai
 * lại ở đây (test `ecosystem.test.ts` canh mọi `repo` đều có số trong JSON và ngược lại).
 *
 * Lọc (chỉ đếm NGƯỜI ĐÓNG GÓP KHÁC chủ dự án - chủ dự án đã nằm trong chữ "TsuDEV"):
 *   - bot: `type === 'Bot'` hoặc login đuôi `[bot]`;
 *   - tài khoản của chủ dự án (TsuDEV): OWNER_LOGINS;
 *   - tài khoản tự động/AI không phải người: AUTOMATION_LOGINS.
 * Có `GITHUB_TOKEN` thì dùng (CI); không có vẫn chạy (60 lượt/giờ là đủ cho ~10 repo).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ECOSYSTEM = path.join(ROOT, 'packages', 'ui', 'src', 'lib', 'ecosystem.ts');
const OUT = path.join(ROOT, 'packages', 'ui', 'src', 'lib', 'contributors.json');

/** Tài khoản GitHub của chủ dự án - hiện chung một chữ "TsuDEV", không tính là contributor. */
const OWNER_LOGINS = ['nguyentrangtinhsu', 'tsudev-tsudev', 'b4djl1h'];
/** Tài khoản tự động không phải người (GitHub không gắn `type: Bot` cho chúng). */
const AUTOMATION_LOGINS = [
  'claude',
  'copilot',
  'github-actions',
  'web-flow',
  'actions-user',
  'weblate',
];
const SKIP = new Set([...OWNER_LOGINS, ...AUTOMATION_LOGINS].map((l) => l.toLowerCase()));

// tsudev-org/* hoặc repo còn sống dưới tài khoản cũ tsudev-tsudev (vd. app-la-ban) - nhưng KHÔNG BAO GIỜ một
// tên đã chuyển/đổi tên (chỉ sống nhờ chuyển hướng của GitHub, ~/.claude/CLAUDE.md).
const REPO_RE = /^(tsudev-org|tsudev-tsudev)\/[A-Za-z0-9._-]+$/;
const OLD_NAMES = new Set([
  'tsudev',
  'tsudev-files',
  'tsudev-contact',
  'tsudev-swico',
  'swico',
  'tsudev-cwico',
  'tsudev-trafficmonitor',
  'tsudev-standards',
]);
const MAX_PAGES = 20; // 2000 contributors - trần an toàn, vượt là dừng chứ không lặp mãi

function fail(msg) {
  console.error(`eco-contributors: ${msg}`);
  process.exit(1);
}

/** Đọc mọi `repo: '...'` trong ecosystem.ts (chỉ chấp nhận repo trong tsudev-org). */
function readRepos() {
  const src = fs.readFileSync(ECOSYSTEM, 'utf8');
  const repos = [...src.matchAll(/^\s*repo:\s*'([^']+)'/gm)].map((m) => m[1]);
  if (repos.length === 0) fail('không thấy trường `repo:` nào trong ecosystem.ts');
  for (const r of repos) {
    if (!REPO_RE.test(r)) fail(`repo không hợp lệ (phải tsudev-org/* hoặc tsudev-tsudev/*): ${r}`);
    const [owner, name] = r.split('/');
    if (owner === 'tsudev-tsudev' && OLD_NAMES.has(name)) fail(`repo mang tên cũ đã chuyển: ${r}`);
  }
  return [...new Set(repos)].sort();
}

/** Có phải người đóng góp được tính không. */
function counts(c) {
  const login = String(c.login || '');
  if (!login) return false;
  if (c.type === 'Bot' || /\[bot\]$/i.test(login)) return false;
  return !SKIP.has(login.toLowerCase());
}

function ghHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'tsudev-eco-contributors',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

/** `public` | `private` | `internal`; 404/403 (không đọc được) ⇒ `private` - không đoán OPEN. */
async function fetchVisibility(repo) {
  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: ghHeaders(),
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 404 || res.status === 403) return 'private';
  if (!res.ok) fail(`${repo}: GitHub trả ${res.status} (${(await res.text()).slice(0, 200)})`);
  const body = await res.json();
  const v = String(body.visibility || (body.private === false ? 'public' : 'private'));
  return v === 'public' ? 'public' : 'private';
}

async function fetchContributors(repo) {
  const headers = ghHeaders();
  const all = [];
  let url = `https://api.github.com/repos/${repo}/contributors?per_page=100`;
  for (let page = 0; url; page++) {
    if (page >= MAX_PAGES) fail(`${repo}: quá ${MAX_PAGES} trang contributors`);
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    // 204 = repo rỗng (chưa commit) - không có contributor nào.
    if (res.status === 204) break;
    if (!res.ok) fail(`${repo}: GitHub trả ${res.status} (${(await res.text()).slice(0, 200)})`);
    const body = await res.json();
    if (!Array.isArray(body)) fail(`${repo}: phản hồi không phải mảng`);
    all.push(...body);
    const next = /<([^>]+)>;\s*rel="next"/.exec(res.headers.get('link') || '');
    url = next ? next[1] : null;
  }
  return all
    .filter(counts)
    .map((c) => c.login)
    .sort((a, b) => a.localeCompare(b));
}

async function main() {
  const check = process.argv.includes('--check');
  const repos = readRepos();
  const result = {};
  const visibility = {};
  for (const repo of repos) {
    visibility[repo] = await fetchVisibility(repo);
    // Repo không public: không đếm, không in login (không lộ gì từ repo private).
    const logins = visibility[repo] === 'public' ? await fetchContributors(repo) : [];
    result[repo] = logins.length;
    console.log(
      `${repo} [${visibility[repo]}]: ${logins.length}${logins.length ? ` - ${logins.join(', ')}` : ''}`
    );
  }
  // Chỉ số đếm vào JSON (tệp này vào bundle trình duyệt của / và /apps - giữ nhỏ); danh sách login
  // in ra stdout để workflow đưa vào thân PR cho người duyệt đối chiếu.
  const next = JSON.stringify({ repos: result, visibility }, null, 2) + '\n';
  if (check) {
    // Chỉ ĐỌC ở chế độ kiểm; chế độ ghi thì ghi thẳng (git diff cho biết có đổi không) - không
    // "kiểm rồi ghi" trên cùng tệp (CodeQL js/file-system-race).
    let prev = '';
    try {
      prev = fs.readFileSync(OUT, 'utf8');
    } catch {
      /* chưa có bản chụp ⇒ coi như lệch */
    }
    if (prev !== next) fail('contributors.json lệch GitHub - chạy `npm run eco:contributors`');
    console.log('eco-contributors: khớp');
    return;
  }
  fs.writeFileSync(OUT, next);
  console.log(`eco-contributors: đã ghi ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
