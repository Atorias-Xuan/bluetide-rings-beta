#!/usr/bin/env node
/* 装前自检（preflight）：只检查、不建目录、不改任何文件。
 *
 * 用法：
 *   node preflight.mjs                 # 按环境变量 / 默认位置检查
 *   node preflight.mjs D:\某个工作区    # 指定将要使用的工作区
 *
 * 退出码：0 全部通过 / 1 有警告但能装 / 2 用法错 / 3 有致命项（装了也跑不起来）
 *
 * 为什么分开「检查」与「首次加载」：首次加载会真的建目录，
 * 装之前应该先能问一句「我这台机器能跑吗」，而不留下任何痕迹。
 */
import { existsSync, readFileSync, readdirSync, statSync, accessSync, constants, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layoutPaths } from './store/layout.js';

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const fatal = [];
const warn = [];
const ok = [];

const say = (tag, text) => console.log(`${tag} ${text}`);

/* ① Node 版本：按包里的 engines 判，不按我印象判 */
const need = (() => {
  try {
    const pkg = JSON.parse(readFileSync(join(SELF_DIR, 'package.json'), 'utf8'));
    return String((pkg.engines && pkg.engines.node) || '>=20');
  } catch {
    return '>=20';
  }
})();
const floor = Number(String(need).replace(/[^0-9]/g, '').slice(0, 2)) || 20;
const major = Number(process.versions.node.split('.')[0]);
if (major >= floor) ok.push(`Node ${process.versions.node}（要求 ${need}）`);
else fatal.push(`Node ${process.versions.node} 低于要求 ${need}`);

/* ② DSH 是否在这台机器上：找 ~/.dsh 与 profile */
const home = homedir();
const dshHome = join(home, '.dsh');
if (existsSync(dshHome)) {
  ok.push(`DSH 目录存在：${dshHome}`);
  const profiles = join(dshHome, 'profiles');
  if (existsSync(profiles)) {
    const names = readdirSync(profiles).filter((n) => {
      try { return statSync(join(profiles, n)).isDirectory(); } catch { return false; }
    });
    if (names.length) ok.push(`profiles：${names.join(' / ')}`);
    else warn.push('profiles 目录是空的：还没创建过 profile');
  } else {
    warn.push('没有 profiles 目录：可能还没初始化 DSH');
  }
} else {
  fatal.push(`没找到 ${dshHome}：这台机器似乎没装 DSH`);
}

/* ③ 目标工作区：能不能写、有没有现成清单 */
const target = process.argv[2] || process.env.BLUETIDE_WORKSPACE || join(home, '蓝潮工作区');
const layoutFile = join(target, 'BLUE Files', 'Config', 'layout.json');
const probe = join(target === join(home, '蓝潮工作区') && !existsSync(target) ? home : (existsSync(target) ? target : dirname(target)), '.bluetide-write-probe');
let writable = false;
try {
  const dir = mkdtempSync(join(tmpdir(), 'bluetide-preflight-'));
  writeFileSync(join(dir, 'probe'), 'ok');
  rmSync(dir, { recursive: true, force: true });
  writable = true;
} catch {
  writable = false;
}
if (writable) ok.push('临时目录可写（说明不是只读环境）');
else fatal.push('临时目录不可写：装上也存不了数据');

try {
  accessSync(existsSync(target) ? target : dirname(target), constants.W_OK);
  ok.push(`工作区可写：${target}`);
} catch {
  fatal.push(`工作区不可写：${target}`);
}

if (existsSync(layoutFile)) {
  ok.push(`发现已有 layout.json：${layoutFile}`);
  try {
    const layout = JSON.parse(readFileSync(layoutFile, 'utf8'));
    const areas = layout && layout.areas ? Object.keys(layout.areas) : [];
    if (areas.length === 4) ok.push(`清单四区齐全：${areas.join(' / ')}`);
    else warn.push(`清单只有 ${areas.length} 个区，首次加载会按默认补齐`);
  } catch {
    warn.push('layout.json 读不动（坏 JSON），首次加载会重建');
  }
} else {
  warn.push(`没有 layout.json：全新安装的正常状态，首次加载会自动在 ${target} 建一套 BLUE Files 骨架`);
}

/* ④ 与别的插件的关系：只提示，不判定别人 */
for (const peer of ['bluetide-voice', 'bluetide-companion']) {
  const found = existsSync(join(SELF_DIR, '..', peer)) || existsSync(join(home, '.dsh', 'profiles'));
  if (!found) warn.push(`看不到 ${peer}（可选插件，不影响三环）`);
}

console.log('\n将创建的位置（仅预览，本脚本不建）：');
const plan = layoutPaths(target);
for (const [key, dir] of Object.entries(plan.areas)) console.log(`  ${key.padEnd(12)} ${dir}`);
console.log(`  layout.json   ${layoutFile}`);

console.log('\n检查结果：');
for (const line of ok) say('  ✓', line);
for (const line of warn) say('  !', line);
for (const line of fatal) say('  ✗', line);

if (fatal.length) {
  console.log(`\n有 ${fatal.length} 项致命问题：装上也无法正常运行。`);
  process.exit(3);
}
console.log(warn.length ? `\n可以安装，但有 ${warn.length} 条提醒（不影响使用）。` : '\n可以安装。');
/* 2026-11-09 修：原来「有提醒」就返回 1，可新用户的空工作区必然产生
   「没有 layout.json」这条提醒 —— 首次加载建目录是设计好的行为，不是故障。
   返回 1 会让人以为装不上。现在只有致命问题（exit 3）才算失败。 */
process.exit(0);
