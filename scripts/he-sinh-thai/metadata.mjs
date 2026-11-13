#!/usr/bin/env node
/**
 * Metadata GitHub của tsudev-org dưới dạng MÃ - một tệp (`metadata.json`) quyết định mô tả, trang
 * chủ, topics của mọi repo công khai, hồ sơ tổ chức, Discussions và báo cáo lỗ hổng riêng tư.
 *
 *   npm run he-sinh-thai:metadata              # --check: liệt kê chỗ lệch, exit 1 nếu có
 *   npm run he-sinh-thai:metadata -- --apply   # áp lên GitHub (cần gh đăng nhập quyền admin org)
 *
 * Vì sao là mã: mô tả và topics là thứ người lạ (và người đánh giá như SignPath) thấy ĐẦU TIÊN,
 * nhưng sửa tay trên web thì không ai biết ai đổi gì, khi nào - và repo mới sinh ra thiếu hết.
 * Topics chỉ được THÊM (repo có thể tự đặt topic riêng); mô tả/trang chủ thì GHI ĐÈ theo tệp.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CFG = JSON.parse(
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'metadata.json'), 'utf8')
);
const APPLY = process.argv.includes('--apply');
const ORG = 'tsudev-org';

const api = (args, input) =>
  execFileSync('gh', ['api', ...args], {
    encoding: 'utf8',
    input,
    stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'],
  });
const get = (p) => JSON.parse(api([p]));

const diffs = [];
const note = (where, what, from, to) => diffs.push({ where, what, from, to });

// --- Hồ sơ tổ chức.
const org = get(`orgs/${ORG}`);
for (const k of ['name', 'description', 'blog']) {
  if ((org[k] ?? '') !== CFG.org[k]) note('org', k, org[k], CFG.org[k]);
}
if (APPLY && diffs.some((d) => d.where === 'org'))
  api(['-X', 'PATCH', `orgs/${ORG}`, '--input', '-'], JSON.stringify(CFG.org));

// --- Từng repo.
const live = new Set(
  get(`orgs/${ORG}/repos?per_page=100&type=public`)
    .filter((r) => !r.archived)
    .map((r) => r.name)
);
for (const name of live)
  if (!CFG.repos[name]) note(name, 'THIẾU trong metadata.json', null, '(thêm mục)');

for (const [name, want] of Object.entries(CFG.repos)) {
  if (!live.has(name)) {
    note(name, 'repo không tồn tại / không công khai', null, null);
    continue;
  }
  const full = `${ORG}/${name}`;
  const r = get(`repos/${full}`);
  const patch = {};
  if ((r.description ?? '') !== want.description) {
    note(name, 'description', r.description, want.description);
    patch.description = want.description;
  }
  if ((r.homepage ?? '') !== want.homepage) {
    note(name, 'homepage', r.homepage, want.homepage);
    patch.homepage = want.homepage;
  }
  const discussions = CFG.discussions.includes(name);
  if (discussions && !r.has_discussions) {
    note(name, 'has_discussions', false, true);
    patch.has_discussions = true;
  }
  if (APPLY && Object.keys(patch).length)
    api(['-X', 'PATCH', `repos/${full}`, '--input', '-'], JSON.stringify(patch));

  const missing = want.topics.filter((t) => !(r.topics || []).includes(t));
  if (missing.length) {
    note(name, 'topics +', null, missing.join(', '));
    if (APPLY) {
      const names = [...new Set([...(r.topics || []), ...want.topics])].slice(0, 20);
      api(['-X', 'PUT', `repos/${full}/topics`, '--input', '-'], JSON.stringify({ names }));
    }
  }

  // Báo cáo lỗ hổng riêng tư (GitHub Security Advisories) - miễn phí, là tín hiệu "dự án có quy
  // trình bảo mật" mà OpenSSF Scorecard và người đánh giá đều xem.
  const pvr = JSON.parse(api([`repos/${full}/private-vulnerability-reporting`]));
  if (!pvr.enabled) {
    note(name, 'private-vulnerability-reporting', false, true);
    if (APPLY) api(['-X', 'PUT', `repos/${full}/private-vulnerability-reporting`]);
  }
}

if (!diffs.length) {
  console.log('metadata: khớp metadata.json.');
} else {
  for (const d of diffs)
    console.log(
      `${APPLY ? 'ĐÃ ÁP' : 'LỆCH '}  ${d.where.padEnd(22)} ${d.what}: ${JSON.stringify(d.from)} → ${JSON.stringify(d.to)}`
    );
  if (!APPLY) {
    console.log(`\n${diffs.length} chỗ lệch - chạy với --apply để áp.`);
    process.exit(1);
  }
}
