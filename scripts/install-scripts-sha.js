#!/usr/bin/env node
'use strict';
/**
 * Ghi `install.sh.sha256` / `install.ps1.sha256` cạnh hai script cài một dòng
 * (tsudev-standards PACKAGING.md mục 6: "có bản .sha256 công bố cạnh script").
 *
 *   npm run install-scripts:sha
 *
 * Sửa script ⇒ chạy lệnh này trong CÙNG commit; test apps/frontend-main/test/installScripts.test.ts
 * đỏ nếu băm lệch.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUB = path.join(__dirname, '..', 'apps', 'frontend-main', 'public');
for (const f of ['install.sh', 'install.ps1']) {
  const sha = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(PUB, f)))
    .digest('hex');
  fs.writeFileSync(path.join(PUB, `${f}.sha256`), `${sha}  ${f}\n`);
  console.log(`${sha}  ${f}`);
}
