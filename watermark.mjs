/**
 * 水印生成（独立脚本）：给发布产物打上可追溯标记，并把指纹写进 bluetide-build.json。
 *
 * 用法：node watermark.mjs <产物目录> [映射输出目录]
 *   打完水印后 index.js / client.js 会被写入 __btw_mark__ 等标记，
 *   build.json 增加 watermark 字段；插件启动时会用它做校验（见 verify-watermark.mjs）。
 *
 * 只做无副作用追加（var 声明 + void 引用），不改控制流、不改导出。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

const distDir = process.argv[2];
const mapDir = process.argv[3];
if (!distDir) {
  console.error('用法: node watermark.mjs <产物目录> [映射输出目录]');
  process.exit(2);
}

const buildFile = join(distDir, 'bluetide-build.json');
if (!existsSync(buildFile)) {
  console.error('缺少 bluetide-build.json，先跑构建');
  process.exit(2);
}
const build = JSON.parse(readFileSync(buildFile, 'utf8'));
const buildId = String(build.id || build.version || 'unknown');

const salt = randomBytes(4).toString('hex');
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const token = `BTW-${buildId}-${stamp}-${salt}`;
const digest = createHash('sha256').update(token).digest('hex').slice(0, 12);

const marks = [
  `var __btw_mark__ = "${token}"; void __btw_mark__;\n`,
  `var __btw_digest__ = "${digest}"; void __btw_digest__;\n`,
  `var __btw_sig__ = "bluetide ${buildId} ${salt}"; void __btw_sig__;\n`,
];

/* 使用声明：写成可执行字符串常量，不是注释 —— 注释会被 strip 剥掉，常量不会。
   互锁（2026-11-07）：notice 正文的 sha256 记进 build.json 的 noticeDigest；
   运行时 watermarkCheck() 与 verify-watermark.mjs 都比这一条 —— 删掉或改一个字，插件不启用。 */
const noticeText = 'BLUETIDE RINGS / GPL-3.0-or-later. Free software: run, modify, redistribute, and sell allowed. Derived works must stay under GPL. Keep this notice and the copyright line. See LICENSE. build ' + buildId + '. '
  + '\\u672c\\u4ea7\\u7269\\u4ee5 GPL-3.0 \\u8bb8\\u53ef\\u5206\\u53d1\\uff1a\\u53ef\\u8fd0\\u884c\\u3001\\u53ef\\u4fee\\u6539\\u3001\\u53ef\\u518d\\u5206\\u53d1\\u3001\\u53ef\\u5546\\u7528\\uff1b\\u6d3e\\u751f\\u4f5c\\u54c1\\u987b\\u540c\\u6837\\u4ee5 GPL \\u5f00\\u653e\\u3002\\u8bf7\\u4fdd\\u7559\\u672c\\u58f0\\u660e\\u4e0e\\u7248\\u6743\\u884c\\u3002';
const notice = `var __btw_notice__ = "${noticeText}"; void __btw_notice__;\n`;
const noticeDigest = createHash('sha256').update(noticeText).digest('hex').slice(0, 16);

const plan = [
  { file: 'index.js', count: 3 },
  { file: 'client.js', count: 2 },
];

const applied = [];
for (const { file, count } of plan) {
  const p = join(distDir, file);
  if (!existsSync(p)) continue;
  const before = readFileSync(p, 'utf8');
  if (/^var __btw_mark__ = "/m.test(before)) {
    console.log('已注过水印，跳过:', file);
    continue;
  }
  const after = `${notice}${before}\n${marks.slice(0, count).join('')}`;
  writeFileSync(p, after, 'utf8');
  applied.push({ file, count, bytes: after.length - before.length });
}

build.watermark = token;
build.watermarkAt = new Date().toISOString();
/* 互锁的另一半：notice 正文摘要。缺了它，产物态一律判不合格。 */
build.noticeDigest = noticeDigest;
/* 机器可读的一条：不用打开 LICENSE 也知道这份产物是什么许可 */
build.usage = 'GPL-3.0-or-later · run / modify / redistribute / sell allowed · derived works must stay GPL · keep this notice · see LICENSE and AI-USAGE.md';
/* 2026-11-09 修：原来只更新 build.dist.integrity，而 build.json 里根本没有 dist 字段
   —— 这个 if 永不执行，哈希永远停在构建那一刻。现在直接写回平铺的 build.integrity，
   并且用 sha256（与 verify-integrity.mjs 的计算方式一致，md5 对不上会永远判不一致）。 */
build.integrity = build.integrity || {};
for (const f of ['index.js', 'client.js']) {
  const p2 = join(distDir, f);
  if (existsSync(p2)) build.integrity[f] = createHash('sha256').update(readFileSync(p2)).digest('hex');
}
if (build.dist && build.dist.integrity) {
  build.dist.integrity['index.js'] = createHash('sha256').update(readFileSync(join(distDir, 'index.js'))).digest('hex');
  build.dist.integrity['client.js'] = createHash('sha256').update(readFileSync(join(distDir, 'client.js'))).digest('hex');
}
writeFileSync(buildFile, `${JSON.stringify(build, null, 2)}\n`, 'utf8');

if (mapDir) {
  mkdirSync(mapDir, { recursive: true });
  writeFileSync(
    join(mapDir, `watermark-${buildId}.json`),
    JSON.stringify({ buildId, token, digest, salt, createdAt: new Date().toISOString(), files: applied, note: '本地留存，勿上传' }, null, 2),
    'utf8',
  );
}

console.log('水印已注入:', JSON.stringify(applied));
console.log('指纹:', token);
