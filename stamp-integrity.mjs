/**
 * 生成产物完整性表：对 dist 下每个 .js 算 sha256，写入 bluetide-build.json 的 integrity.files。
 * 用法：node stamp-integrity.mjs <产物目录>
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const dir = process.argv[2];
if (!dir) {
  console.error('用法: node stamp-integrity.mjs <产物目录>');
  process.exit(2);
}

const files = {};
function walk(d) {
  for (const n of readdirSync(d)) {
    if (n === 'node_modules') continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs)$/.test(n)) {
      files[relative(dir, p).split('\\').join('/')] = createHash('sha256').update(readFileSync(p)).digest('hex');
    }
  }
}
walk(dir);

const buildPath = join(dir, 'bluetide-build.json');
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
build.integrity = build.integrity || {};
build.integrity.files = files;
build.integrity.at = new Date().toISOString();
writeFileSync(buildPath, `${JSON.stringify(build, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ files: Object.keys(files).length }));
