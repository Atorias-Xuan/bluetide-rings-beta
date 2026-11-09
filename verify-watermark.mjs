/**
 * 水印检测（独立脚本，不依赖插件运行）。
 *
 * 用法：node verify-watermark.mjs <插件目录>
 * 退出码：0 通过（源码态或水印一致）；1 不通过；2 用法错误
 *
 * 判定：
 *   · build.json 没有 watermark 字段 → 源码态，放行（本地开发）
 *   · 有 watermark 字段 → 必须能在 index.js / client.js 里找到同值标记，缺一即失败
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const dir = process.argv[2] || process.cwd();
const buildPath = join(dir, 'bluetide-build.json');
const distHasMark = () => {
  const p = join(dir, 'index.js');
  /* 锚定 var 赋值语句，避免把校验脚本里的正则字面量当成水印 */
  return existsSync(p) && /var\s+__btw_mark__\s*=\s*"/.test(readFileSync(p, 'utf8'));
};
if (!existsSync(buildPath)) {
  /* 防「删档绕过」：产物身上有水印标记却没有构建记录 → 档案被删，判不合格。
     两者都没有才是真源码态。 */
  if (distHasMark()) {
    console.error('✗ 有 __btw_mark__ 却缺 bluetide-build.json：档案被删，判不合格');
    process.exit(1);
  }
  console.log('· 源码态（无构建记录、无水印标记），放行');
  process.exit(0);
}

const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const expected = build.watermark;
if (!expected) {
  console.log('· 源码态（无 watermark 字段），放行');
  process.exit(0);
}

const files = ['index.js', 'client.js'];
let bad = 0;
for (const f of files) {
  const p = join(dir, f);
  if (!existsSync(p)) {
    console.error(`✗ 缺文件 ${f}`);
    bad += 1;
    continue;
  }
  const text = readFileSync(p, 'utf8');
  const hit = text.match(/__btw_mark__\s*=\s*"([^"]+)"/);
  if (!hit) {
    console.error(`✗ ${f} 找不到水印标记`);
    bad += 1;
  } else if (hit[1] !== expected) {
    console.error(`✗ ${f} 水印不一致：${hit[1]} ≠ ${expected}`);
    bad += 1;
  } else {
    console.log(`✓ ${f} 水印一致`);
  }

  /* 互锁（2026-11-07）：使用声明必须在，且正文摘要与 build 记录一致。
     删掉声明、替换成别的字样、或只改一个字 —— 这里都会失败。 */
  const notice = text.match(/__btw_notice__\s*=\s*"((?:[^"\\]|\\.)*)"/);
  if (!notice) {
    console.error(`✗ ${f} 找不到使用声明 __btw_notice__`);
    bad += 1;
    continue;
  }
  /* 2026-11-09：公开版改 GPL-3.0，声明正文的关键字样跟着换 */
  if (!notice[1].includes('GPL-3.0')) {
    console.error(`✗ ${f} 声明正文被替换（缺 GPL-3.0）`);
    bad += 1;
    continue;
  }
  if (!build.noticeDigest) {
    console.error('✗ bluetide-build.json 缺 noticeDigest（产物态必须记声明摘要）');
    bad += 1;
    continue;
  }
  const got = createHash('sha256').update(notice[1]).digest('hex').slice(0, 16);
  if (got !== build.noticeDigest) {
    console.error(`✗ ${f} 声明与构建记录不一致：${got} ≠ ${build.noticeDigest}`);
    bad += 1;
    continue;
  }
  console.log(`✓ ${f} 使用声明一致`);
}

if (bad) {
  console.error(`\n水印检测未通过（${bad} 项）。该包会被插件拒绝启用。`);
  process.exit(1);
}
console.log('\n水印检测通过：', expected);
process.exit(0);
