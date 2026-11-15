#!/usr/bin/env node
'use strict';
// Gắn thẻ phiên bản cho MỖI lần phát hành production của tsudev.com.
//
// tsudev là website triển khai liên tục, không có bản phát hành dạng tệp. Nhưng
// "bản đang chạy trên tsudev.com" vẫn phải có một tên duy nhất trong git để người
// đọc đối chiếu được (OpenSSF Best Practices: version_unique, version_tags,
// release_notes - phiếu 20261115-01). Trước tệp này không có thẻ nào, nên câu hỏi
// "production đang chạy commit nào" chỉ trả lời được bằng nhật ký deploy.
//
// Khuôn: CalVer `vYYYY.MM.DD.N` (N đếm từ 1 trong ngày, giờ Việt Nam). Thẻ ANNOTATED,
// nội dung là ghi chú phát hành: danh sách PR đã merge kể từ thẻ trước. GitHub hiện
// nó ở https://github.com/tsudev-org/tsudev/releases/tag/<thẻ>.
//
// CỐ Ý không tạo GitHub Release: Release không kèm chữ ký thì Scorecard
// (Signed-Releases) chấm 0 thay vì "không áp dụng".
//
//   node scripts/release-tag.js               gắn thẻ HEAD rồi đẩy lên origin
//   node scripts/release-tag.js --dry-run     chỉ in tên thẻ + ghi chú
//   node scripts/release-tag.js --from-deploy gọi từ deploy-frontend.js: lỗi điều kiện
//                                             chỉ cảnh báo, không làm hỏng lần deploy
//
// Chỉ gắn khi HEAD TRÙNG origin/main và cây làm việc sạch: bản dựng từ nhánh tính
// năng hay từ thay đổi chưa commit không phải "phiên bản" của ai cả.

const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fromDeploy = args.includes('--from-deploy');

const git = (...a) =>
  execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function stop(msg) {
  if (fromDeploy) {
    console.warn(`⚠ không gắn thẻ phiên bản: ${msg}`);
    process.exit(0);
  }
  console.error(`✘ ${msg}`);
  process.exit(1);
}

/** Ngày theo giờ Việt Nam (UTC+7), không phụ thuộc múi giờ của máy dev. */
function vnDate(now = new Date()) {
  const d = new Date(now.getTime() + 7 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return {
    y: d.getUTCFullYear(),
    m: p(d.getUTCMonth() + 1),
    d: p(d.getUTCDate()),
    hm: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
  };
}

/** "Merge pull request #12 from org/nhánh" + dòng tiêu đề PR ⇒ "#12 tiêu đề". */
function noteLine(subject, body) {
  const m = subject.match(/^Merge pull request (#\d+)/);
  const title = (body.split('\n').find((l) => l.trim()) || '').trim();
  return m ? `- ${m[1]} ${title || subject}` : `- ${subject}`;
}

function releaseNotes(prev) {
  const range = prev ? `${prev}..HEAD` : 'HEAD~20..HEAD';
  const raw = git('log', '--first-parent', '--format=%s%x1f%b%x1e', range);
  return raw
    .split('\x1e')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const [s, b = ''] = r.split('\x1f');
      return noteLine(s, b);
    });
}

function main() {
  try {
    git('fetch', '--quiet', '--tags', 'origin', 'main');
  } catch {
    stop('không fetch được origin');
  }
  const head = git('rev-parse', 'HEAD');
  if (head !== git('rev-parse', 'origin/main')) stop('HEAD không trùng origin/main');
  if (git('status', '--porcelain', '--untracked-files=no'))
    stop('cây làm việc có thay đổi chưa commit');

  const onHead = git('tag', '--points-at', 'HEAD', '--list', 'v*');
  if (onHead) {
    console.log(`✓ HEAD đã có thẻ ${onHead.split('\n')[0]} - không gắn thêm`);
    return;
  }

  const t = vnDate();
  const day = `v${t.y}.${t.m}.${t.d}`;
  const sameDay = git('tag', '--list', `${day}.*`).split('\n').filter(Boolean);
  const n = sameDay.reduce((max, s) => Math.max(max, Number(s.split('.').pop()) || 0), 0) + 1;
  const name = `${day}.${n}`;

  let prev = '';
  try {
    prev = git('describe', '--tags', '--abbrev=0', '--match', 'v*', 'HEAD');
  } catch {
    // thẻ đầu tiên
  }
  const lines = releaseNotes(prev);
  const msg = [
    `tsudev.com ${name}`,
    '',
    `Production deployment at ${t.hm} ${t.d}/${t.m}/${t.y} (UTC+7), commit ${head.slice(0, 12)}.`,
    prev ? `Changes since ${prev}:` : 'Changes (first tagged deployment, last 20 commits on main):',
    '',
    ...(lines.length ? lines : ['- (no new commits)']),
    '',
  ].join('\n');

  console.log(msg);
  if (dryRun) {
    console.log(`(chạy thử - chưa gắn ${name})`);
    return;
  }
  git('tag', '-a', name, '-m', msg);
  try {
    git('push', 'origin', `refs/tags/${name}`);
  } catch {
    stop(`đã gắn ${name} ở máy nhưng chưa đẩy được - chạy: git push origin ${name}`);
  }
  console.log(`✓ gắn thẻ ${name} và đẩy lên origin`);
  console.log(
    `  Thêm một dòng vào CHANGELOG.md mục "Bản triển khai": ${name} - ${t.d}/${t.m}/${t.y} - <tóm tắt>`
  );
}

if (require.main === module) main();
module.exports = { noteLine, vnDate };
