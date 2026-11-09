/**
 * 用法：node verify-integrity.mjs <产物目录>
 * 退出码 0 通过 / 1 不一致 / 2 用法或缺少构建记录
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const dir = process.argv[2];
if (!dir) {
  console.error('用法: node verify-integrity.mjs <产物目录>');
  process.exit(2);
}
const buildPath = join(dir, 'bluetide-build.json');
if (!existsSync(buildPath)) {
  console.error('缺少 bluetide-build.json');
  process.exit(2);
}
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
/* 2026-11-09 修：这里原来只认 integrity.files，而实际 bluetide-build.json 里
   integrity 是平铺的 { "index.js": "...", "client.js": "..." } —— 两者对不上，
   于是永远走下面这条「放行」分支，文件被改也查不出来。现在两种格式都认。 */
const expected = (build.integrity && (build.integrity.files || build.integrity)) || null;
if (!expected) {
  console.log('· 无完整性表（源码态），放行');
  process.exit(0);
}

const actual = {};
function walk(d) {
  for (const n of readdirSync(d)) {
    if (n === 'node_modules') continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs)$/.test(n)) actual[relative(dir, p).split('\\').join('/')] = createHash('sha256').update(readFileSync(p)).digest('hex');
  }
}
walk(dir);

let bad = 0;
for (const [rel, hash] of Object.entries(expected)) {
  if (!(rel in actual)) {
    console.error(`✗ 缺文件 ${rel}`);
    bad += 1;
  } else if (actual[rel] !== hash) {
    console.error(`✗ 内容被改 ${rel}`);
    bad += 1;
  }
}
for (const rel of Object.keys(actual)) {
  if (!(rel in expected)) {
    console.error(`✗ 多出脚本 ${rel}`);
    bad += 1;
  }
}

if (bad) {
  console.error(`\n完整性校验未通过（${bad} 项）`);
  process.exit(1);
}
console.log(`完整性校验通过：${Object.keys(expected).length} 个脚本`);
process.exit(0);
