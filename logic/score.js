/**
 * 三环 · 相似度与评分（纯逻辑层）
 *
 * 这一层只做「两段文字有多像」「条目身份怎么认」「时间衰减多重」这类计算。
 * 不读盘、不发事件、不认宿主；输入都是字符串或普通对象。
 *
 * 边界（2026-10-28 拆分约定）：
 *   · 不许 import 宿主模块；允许被 index.js 与测试同时引用。
 *   · 任何「要不要写」「写去哪」的决定都不在这里——这里只算分。
 */

import { retentionOf } from './forgetting.js';

/* 时间衰减：统一走 forgetting.js 的幂律（参数 tau 由半衰天数换算）。
   ts 坏掉时按 1（不衰减），别让坏数据把条目压死。 */
export function decayWeight(ts, halfLifeDays, now) {
  const at = Date.parse(ts);
  if (!Number.isFinite(at)) return 1;
  const hours = Math.max(0, (now - at) / 3_600_000);
  /* 2026-11-09 统一到幂律（按「工作记忆」三分口径选的实现）：
     半衰 h 天 ↔ τ = h × 8 小时 —— 20 天 ↔ 160h，在这一点上两式严格相等。
     换公式后短时距衰减变慢（同一份数据权重略高），这是选择的预期结果。
     刻度仍然只看 halfLifeDays 这个参数，换 τ 不需要改这里。 */
  const tau = Math.max(1, Number(halfLifeDays) || 20) * 8;
  return retentionOf({ ageHours: hours, hits: 0, tau });
}

/* 极性：句子里出现否定词就算反向。只用于同主题互证，不用于判断对错。 */
export function polarityOf(text) {
  return /(不|别|不要|不能|禁止|不许|无需|避免)/.test(text) ? -1 : 1;
}

export const stripPolarity = (text) => String(text).replace(/(不能|不要|禁止|不许|无需|避免|不|别)/g, '');

/* 中文没有空格：用二字滑窗当「词元」，去标点后去重。相似度与覆盖率的共同底座。 */
export function gramsOf(text) {
  const s = String(text).replace(/[\s，。、；：！？“”‘’（）()【】[\]…—\-|]/g, '');
  const set = new Set();
  for (let i = 0; i < s.length - 1; i += 1) set.add(s.slice(i, i + 2));
  return set;
}

/* 对称相似度（Dice 系数）：两段文字各取词元，取交集的两倍除以词元总数。
   注意：整段余弦对长正文只有 0.03 级别，经验命中靠的是词元重叠（见 logic/mix.js 的 hitMin）。 */
export function similarity(a, b) {
  const left = gramsOf(a);
  const right = gramsOf(b);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const gram of left) if (right.has(gram)) overlap += 1;
  return (2 * overlap) / (left.size + right.size);
}

/* 单向覆盖率：inner 有多少比例的词元出现在 outer 里。用于「回验：输出用上了多少捕捉」。 */
export function coverage(inner, outer) {
  const left = gramsOf(inner);
  const right = gramsOf(outer);
  if (!left.size) return 0;
  let hit = 0;
  for (const gram of left) if (right.has(gram)) hit += 1;
  return hit / left.size;
}

/* 条目身份：人格抽象条目不盖时间码，只有 ts；其余用 stamp。
   全工程只认这一个函数来指认「同一条目」，别再各写各的。 */
export function entryKey(row) {
  if (row && typeof row.stamp === 'string' && row.stamp) return row.stamp;
  return `${row && row.ring}:${row && row.ts}`;
}
