/* © 2026 砚尘dust (@Atorias-Xuan) · 蓝潮三环 β v1.0.0-bis
 *
 * 本程序是自由软件：你可以再分发、修改，但必须遵守 GNU 通用公共许可证
 * 第 3 版（或任何更新版本）的条款。它是"传染性"的：你发布基于本程序的
 * 作品，也必须以同样的 GPL 授权，不能改成闭源。
 *
 * 这是一份分发声明，不构成额外限制。完整条款见同目录 LICENSE。
 */
/* ── store/files.js —— 文本解析与文件原语（2026-10-28 拆分，work-092）
   这一层只认两件事：怎么把 ndjson 切成行并解析、怎么把行安全地写回文件。
   它不认四区、不认插件目录、不认 ctx —— 路径一律由调用方传进来。

   三条被坑出来的约定（别丢，每一条都对应一次实盘事故）：
   1. 锁要按「绝对路径」串行。同一个 ndjson 有两个写者：appendArea 的追加，与
      sweep 的「读→过滤→写临时→rename」。不排队时 rename 会覆盖窗口内的追加
      （054 实测丢过记录）。
   2. 24h 只按「行」判龄，不按任务判。按任务取最晚一条当到期线，会让无 task 的
      行共用一条线、互相续命（2026-10-26 实测：748 行里 431 行超期仍被当成活着）。
   3. 解析白名单只进不出。以前 parseExecutionText 没抄 unitsV / mixV4，读盘后
      所有行都变成「不知道哪一版」，版本过滤等于没做。加字段要连口径版本一起加。

   这一层的函数都是纯的（除了三个 IO 原语）：同样的输入给定 now/mtime，
   输出必须完全确定 —— 清理判定能被断言的前提。 */

import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { RETENTION, retentionOfRow, fadeOf, hoursUntilGone } from '../logic/forgetting.js';

/* 工作区原先的固定 TTL：24h。
   2026-11-01 起判龄改用遗忘曲线（logic/forgetting.js）：幂律衰减 + 访问加成，
   低于 keepAt 才清扫，低于 showAt 先渐隐。这个常量只留作兼容导出（宿主与
   旧测试还引用它），**不再参与任何判龄**。 */
export const WORK_TTL_MS = 24 * 60 * 60 * 1000;
/* 面板要显示「还能留多久」时用它，别再写死 24 */
export { hoursUntilGone, RETENTION } from '../logic/forgetting.js';

/* 把一段文本切成非空行（去首尾空白）。全仓唯一实现，别再各自写一份。 */
export const lines = (text) => (text ? text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : []);

export function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* ── 单文件串行锁 ────────────────────────────────────────────────
   按 key（调用方传绝对路径）排队，只让两个写者互相等。
   不改触发时机、不改 TTL、不改文件格式 —— 锁只负责顺序。 */
const fileLocks = new Map();
export function withFileLock(key, task) {
  const prev = fileLocks.get(key) || Promise.resolve();
  const run = prev.then(task, task);
  const tail = run.then(() => {}, () => {});
  fileLocks.set(key, tail);
  tail.then(() => {
    if (fileLocks.get(key) === tail) fileLocks.delete(key);
  });
  return run;
}

/* 追加一行到 dir/file。目录不存在就先建。走同一把锁。 */
export async function appendArea(dir, file, row) {
  const path = join(dir, file);
  return withFileLock(path, async () => {
    await mkdir(dir, { recursive: true });
    await appendFile(path, JSON.stringify(row) + '\n', 'utf8');
  });
}

/* workspace 五类行：只有这几种进「任务产出」口径。
   decision / cross / cycle / gate / 各类治理行一律不算产出。 */
const WORK_ROW_TYPES = ['result', 'data', 'turn', 'taskstats', 'photo'];

export function parseExecutionText(text) {
  /* 边界只判「是不是工作区的行」，字段一律原样透传 —— 不再按字段清单重建对象。
     2026-11-01 之前这里是白名单式重建的，代价是每加一个字段都要在四处各补一次：
     写侧构造、collectShots、这里、读侧。unitsV / mixV4 / shares / v5 / detail
     都因为漏补而丢过，v5 连丢三次 —— 症状是「占比条永远走旧公式」。
     清单本身就是 bug 温床：判类型是一道闸，复制数据是四道闸。 */
  return lines(text).map(parseJson)
    .filter((row) => row && WORK_ROW_TYPES.includes(row.type))
    .map((row) => ({ ...row, ts: row.ts ?? null, task: row.task ?? null }))
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
}

/* 给行算龄：坏时间戳用文件 mtime 兜底、未来时间戳按「这张纸实际写下的时候」算。
   两者都不再让记录永久滞留（057）。decision / photo 不参与过期。
   2026-11-01：判龄从「满 24h」改成保留率曲线——expired 等价于「保留率低于 keepAt」，
   同时把 retention / fade 一起带出去，摘要与面板用它决定「还显不显示」。 */
export function expireRows(rows, now = Date.now(), fallbackMs = now) {
  return rows.map((row) => {
    const info = retentionOfRow(row, now, fallbackMs);
    const exempt = row.type === 'decision' || row.type === 'photo';
    const expired = exempt ? false : fadeOf(info.retention) === 'gone';
    /* expiresAt 不再是「到点就没」，而是「按当前强度推算它什么时候跌破 keepAt」——
       只作展示用，不参与判定。2026-11-01 修正：原先漏了 (1+age/tau) 里的 1，
       把 40.4h 算成 9.6h。 */
    const hoursLeft = Math.max(0, hoursUntilGone(info.hits) - info.ageHours);
    return {
      ...row,
      endedAt: new Date(now - info.ageHours * 3600000).toISOString(),
      expiresAt: new Date(now + hoursLeft * 3600000).toISOString(),
      retention: info.retention,
      fade: info.fade,
      expired,
    };
  });
}

export function parseWorkText(text, now = Date.now(), fallbackMs = now) {
  return expireRows(parseExecutionText(text), now, fallbackMs);
}

/* ── 清理判定（纯函数：只算，不写）───────────────────────────────
   返回 { changed, removed, kept, text }。调用方负责读文件、拿 mtime、写临时、rename。
   把判定从 IO 里拆出来，是因为「偶发丢行」这类故障没法靠读代码发现，
   只有当它能被给定 now/mtime 直接断言时才抓得住。

   四条免死规则，逐条都有理由：
   - decision：裁定是长期证据，清了等于治理记录作废。
   - cross：对账记录的用途就是事后证明「当时的账对得上」，跟着工单清掉等于白做。
   - photo：照片按张数滚动（只留最近 photoLimit 张），不按时间。
   - cycle：不进 parseWorkText（不是任务产出），按自己的 ts 单独判寿。 */
export function planSweep(text, { now = Date.now(), mtimeMs = now, photoLimit = 10 } = {}) {
  if (!text) return { changed: false, removed: 0, kept: 0, text: '' };
  const rows = lines(text).map(parseJson).filter(Boolean);
  const parsed = expireRows(parseExecutionText(text), now, mtimeMs);
  /* 2026-11-01 修：只让**带任务码**的过期行连坐同任务。
     以前这里把 row.task ?? '__untasked__' 全塞进集合，于是所有无任务码的行
     （turn / gate / affect 常见 task=null）挤在同一个桶里：只要其中任意一条过期，
     整桶被删——包括刚刚写下的那些。实测（097）：60 行 null-task 里删掉 58 行。
     无任务码的行现在只按自己的 ts 判龄（见下面 staleRow），不参与连坐。 */
  /* 2026-11-01（遗忘曲线）：**去掉按任务连坐**。
     以前只要一条带任务码的行过期，同任务的行整桶连坐。它和曲线天然冲突——
     一条旧行淡出本该只代表它自己老了，却会顺手带走同任务刚写下的新行；
     历史上它已经误删过两次（无任务码整桶误杀、photo 连坐全删）。
     现在每条行按自己的保留率走，任务不再有「整桶生死」。 */

  /* 判龄统一走遗忘曲线：保留率跌破 keepAt 才算该走（2026-11-01）。
     下面的 stale* 三个判定都只是这条曲线的三种读法，别再各写一套 24h。 */
  const gone = (row) => fadeOf(retentionOfRow(row, now, mtimeMs).retention) === 'gone';

  const staleCycle = (row) => {
    if (!row || row.type !== 'cycle') return false;
    return gone(row);
  };
  const cycleGone = rows.filter(staleCycle).length;

  const photoRows = rows.filter((row) => row && row.type === 'photo')
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  const keepPhotos = new Set(photoRows.slice(0, photoLimit).map((row) => row.ts + '|' + row.task));
  /* 工单仍按任务 24h 到期（它是过程凭证）；照片单独按张数滚动，两者生命周期解耦 */
  const staleStats = (row) => Boolean(row && row.type === 'photo' && !keepPhotos.has(row.ts + '|' + row.task));
  const statsGone = rows.filter(staleStats).length;

  /* 早退：只有「确实有行该走」时才重写文件（省 IO）。
     2026-11-01 修：以前只看任务桶 / cycle / photo 三个信号。上面那个修复把
     无任务码的行移出了任务桶，于是它们超期也不再触发清理 —— 文件只增不减。
     这里补一条行级过期判断：早退不能因为「看不见」而跳过该删的行。 */
  const anyExpiredRow = rows.some((row) => {
    if (!row) return true;
    if (row.type === 'decision' || row.type === 'photo' || row.type === 'cross') return false;
    return gone(row);
  });
  if (cycleGone === 0 && statsGone === 0 && !anyExpiredRow) {
    return { changed: false, removed: 0, kept: rows.length, text: '' };
  }

  /* 免死行之外，一律按保留率判：跌破 keepAt 才走（曲线替代 24h 悬崖） */
  const staleRow = (row) => {
    if (!row) return true;
    if (row.type === 'decision') return false;
    if (row.type === 'photo') return false;
    if (row.type === 'cross') return false;
    return gone(row);
  };
  /* 并集只剩三种免死判定，别在最后一步把它们又判死一次。
     photo 与 decision / cross 同属免死：它按张数滚动（上面 keepPhotos）。
     2026-11-01：这里不再查任务桶——任务连坐已随遗忘曲线一起删掉。 */
  const keep = rows.filter((row) => !staleCycle(row) && !staleStats(row) && !staleRow(row));

  return {
    changed: true,
    removed: rows.length - keep.length,
    kept: keep.length,
    text: keep.map((row) => JSON.stringify(row)).join('\n') + (keep.length > 0 ? '\n' : ''),
  };
}

/* ── 「已入记忆」后的降级判定（纯函数：只算，不写）─────────────────
   规则（你定）：某个任务的内容已经进了记忆区（感知/记忆/人格/反馈），
   或已经沉淀成记忆块 —— 就把该任务在工作区的执行/素材行降级成一行短标签：
   正文清空，只留标题 + ts + 「指向哪条记忆」的机器可读指针；24 小时后连标签一起清。
   turn（占比图数据源）与 decision（治理记录）不动。

   为什么正文必须清掉：经验已经搬到长期区，工作区再留一份就是两处各说一套，
   改了一边另一边立刻变成过期副本。留指针是唯一不撒谎的写法——
   面板要靠它显示「这条已经进记忆区了」，也靠它回查原文。

   注意 stored.ring 存的是机器可读的英文 kind（perception / memory / persona /
   feedback / block），中文标签只在面板翻译。这里不做翻译，免得两处各有一套词。 */
export const RING_LABEL = { perception: '感知', memory: '记忆', persona: '人格', feedback: '反馈' };
export const PURGE_TYPES = ['result', 'data'];

export function planPurge(text, { stored, nowIso, purgeTypes = PURGE_TYPES } = {}) {
  if (!text || !stored || !stored.size) return { changed: false, purged: 0, total: 0, text: '' };
  const rows = lines(text).map(parseJson).filter(Boolean);
  let purged = 0;
  const next = rows.map((row) => {
    if (row.purged || !purgeTypes.includes(row.type) || !row.task) return row;
    const saved = stored.get(row.task);
    if (!saved) return row;
    purged += 1;
    return {
      v: row.v ?? 1,
      ts: row.ts,
      stamp: row.stamp ?? null,
      type: row.type,
      task: row.task,
      title: row.title ?? null,
      purged: true,
      purgedAt: nowIso(),
      stored: { ring: saved.kind, stamp: saved.stamp ?? null, ts: saved.ts ?? null },
    };
  });
  if (!purged) return { changed: false, purged: 0, total: rows.length, text: '' };
  return {
    changed: true,
    purged,
    total: rows.length,
    text: next.map((row) => JSON.stringify(row)).join('\n') + (next.length ? '\n' : ''),
  };
}
