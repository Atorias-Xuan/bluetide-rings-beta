/* ── settle/packet.js —— 判断卡（结算的第二半，2026-10-29 拆出，work-092）
   五格三填两空：插件只填 intent / evidence / gap；choice 从模型已写下的执行记录里摘，
   摘不到就留空字符串 —— **不编**。空着本身是信号：「这轮没记录判断」。

   硬规则：卡里不许出现 units / shares。账在 taskstats，判断在卡上，两边不混。
   所以这个函数**故意不接收 units**：上一版签名里有它却从没用过，留着只会让人以为卡上带账。

   这一层不读盘、不碰 ctx：行时间（单调 nowIso）与截断（squeeze）由宿主注入。
   两者都是全仓单一口径，复制一份就会漂。 */

import { MIX_TRACKED, UNITS_VERSION } from '../logic/mix.js';

/* 兜底只用于直接调用（测试/脚本）时；宿主一定会传，别指望兜底和宿主一样。 */
const fallbackSqueeze = (value, max) => {
  if (typeof value !== 'string') return value ?? null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

export function buildSettlePacket(fields = {}, deps = {}) {
  const { stamp, task, level, cross, intent, choice } = fields;
  const nowIso = typeof deps.nowIso === 'function' ? deps.nowIso : () => new Date().toISOString();
  const squeeze = typeof deps.squeeze === 'function' ? deps.squeeze : fallbackSqueeze;

  const evidence = (cross && cross.evidence) || { perception: [], memory: [], persona: [] };
  const missing = MIX_TRACKED.filter((ring) => !(evidence[ring] && evidence[ring].length));
  const crossTotal = cross && cross.panel ? Number(cross.panel.total) || 0 : 0;
  const captured = cross
    ? Object.values(cross.capture || {}).reduce((sum, n) => sum + Number(n || 0), 0)
    : 0;
  const gaps = [];
  if (cross && cross.verdict === 'mismatch') gaps.push(`对账差 ${cross.delta}（工单 ${crossTotal} / 环 ${captured}）`);
  if (missing.length) gaps.push(`缺环：${missing.join('、')}`);
  if (!choice) gaps.push('本轮未记录选择');
  const nextInject = gaps.length
    ? `上轮结算：${gaps.slice(0, 2).join('；')}`
    : '上轮结算：平';
  return {
    v: 1, ts: nowIso(), type: 'decision', stamp: stamp || null, task: task ?? null,
    packet: true, level: level ?? null, unitsV: UNITS_VERSION,
    intent: intent ? squeeze(String(intent), 40) : null,
    evidence,
    gap: { missing, verdict: (cross && cross.verdict) || null, delta: cross ? cross.delta : null, items: gaps },
    /* 判断格：由模型自己写下的执行记录摘；摘不到就空 */
    choice: choice ? squeeze(String(choice), 40) : '',
    nextInject,
    panelOnly: true,
    note: '一轮一条：只带依据与缺口，不带 units；下一轮开头读它',
  };
}
