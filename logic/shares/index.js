/**
 * 三环占比 · 单芯片插座（2026-11-09 · 芯片化）
 *
 * ── 这块要解决的问题 ─────────────────────────────────────────────
 * v4 与 v5 原本各算各的：ratioV4 无条件跑占比，ringWeightV5 在旁边另算一遍
 * 只给面板看。「现在听谁的」没有边界，改一个就可能碰到另一个。
 *
 * ── 定性（别搞错）────────────────────────────────────────────────
 * **v5 是 v4 的替换升级，不是并列项。** 见 095 卡：v4 把「事件计数（小数）」
 * 与「人格绝对强度（1 量级）」塞进同一个分母，量纲不一致 —— 人格常年 50–55%
 * 不是因为干得多，是尺子不同。v5 换掉的就是这个结构。
 * 两者产出的是**同一件事**：给三环提供占比、作用耦合、驱动面板显示。
 *
 * ── 所以是「单接口 · 单芯片 · 芯片可换」─────────────────────────
 *   上层只调 pickShares(signals, { formula })
 *   **同一时刻只有一块芯片生效**，只有一套数字，不存在两套并存
 *   换芯片 = 换实现，不换职责；上层不需要知道自己插的是哪块
 *
 * ── 输入（signals，超集）─────────────────────────────────────────
 *   v4 用：events hits memCaptured memHits slots temps slot valence
 *   v5 用：q sigma2 bias avg config
 *   芯片各取所需，多余的忽略；上层喂法不因换芯片而变
 *
 * ── 输出（两块必须完全一致）──────────────────────────────────────
 *   {
 *     shares:   { perception, memory, persona },  // 三项和 = 1；无事件时全 0
 *     dominant: 'perception' | 'memory' | 'persona' | null,
 *     source:   'v4' | 'v5',
 *     audit:    { ... }                            // 芯片私有，只给展示/诊断用
 *   }
 *
 * ── 硬约束（由本文件统一兜底，芯片自己做不到也不许漏出去）─────────
 *   1. shares 三项都必须是 [0,1] 的有限数，不许 NaN
 *   2. 只要有一项非零，三项和就必须归一到 1
 *   3. 任何异常都不外抛：坏输入退化成「全 0 + source 标注」，不让面板崩
 */

import { chipV4 } from './chip-v4.js';
/* 本版未收录 v5 芯片 —— 选不到就回退 v4，行为确定 */

export const CHIPS = { v4: chipV4 };
export const DEFAULT_CHIP = 'v4';
/* 只发 v4。v5 是开发版能力，作为后续版本的更新内容。 */
export const CHIP_NAMES = Object.keys(CHIPS);

const RINGS = ['perception', 'memory', 'persona'];
const ZERO = { perception: 0, memory: 0, persona: 0 };

const safeNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const round3 = (value) => Number(safeNumber(value).toFixed(3));

function normalize(out, fallbackSource) {
  const source = (out && out.source) || fallbackSource;
  const rawShares = (out && out.shares) || ZERO;

  let shares = {};
  let sum = 0;
  for (const ring of RINGS) {
    const value = Math.max(0, Math.min(1, safeNumber(rawShares[ring])));
    shares[ring] = value;
    sum += value;
  }

  /* 和不为 1 就归一；全 0 保持全 0（这是「本轮什么都没发生」的合法状态） */
  if (sum > 0 && Math.abs(sum - 1) > 1e-9) {
    for (const ring of RINGS) shares[ring] = round3(shares[ring] / sum);
  } else {
    for (const ring of RINGS) shares[ring] = round3(shares[ring]);
  }

  /* 四舍五入后可能差 0.001，补给最大的那一项，保证面板加得起来就正好 1 */
  const total = RINGS.reduce((n, ring) => n + shares[ring], 0);
  if (total > 0 && Math.abs(total - 1) > 1e-9) {
    const biggest = RINGS.reduce((best, ring) => (shares[ring] > shares[best] ? ring : best), RINGS[0]);
    shares[biggest] = round3(shares[biggest] + (1 - total));
  }

  let dominant = out && out.dominant;
  if (!RINGS.includes(dominant)) {
    dominant = total > 0 ? RINGS.reduce((best, ring) => (shares[ring] > shares[best] ? ring : best), RINGS[0]) : null;
  }

  return {
    shares: { ...shares },
    dominant,
    source,
    /* units 只为兼容既有下游而透传；新代码应当只读 shares */
    units: (out && out.units) || null,
    audit: (out && out.audit) || {},
  };
}

/* 唯一入口。**同一时刻只有一块芯片生效** —— 这是本模块存在的全部理由。
   v5 不是 v4 的并列项，是替换升级（见 095 卡：v4 把「事件计数」与
   「人格绝对强度」塞进同一个分母，量纲不一致；v5 换掉的是这个结构）。
   所以这里只跑一块、只返回一套数字：占比、主导环、耦合偏置、面板显示，
   全部由同一块芯片供给。绝不并行算两块再对比 —— 那等于把过渡期的
   「默认关、两套并存」固化成制度，会让「现在听谁的」重新变成问题。

   formula 不认识就退回默认芯片，并在 audit 里留痕，不抛错。 */
export function pickShares(signals = {}, opts = {}) {
  const wanted = String((opts && opts.formula) || DEFAULT_CHIP).toLowerCase();
  const name = CHIPS[wanted] ? wanted : DEFAULT_CHIP;
  const chip = CHIPS[name];
  const input = signals && typeof signals === 'object' ? signals : {};

  let out = null;
  try {
    out = chip(input);
  } catch (error) {
    /* 芯片自己炸了也不能让上游跟着炸：退化成全 0，source 标明是谁坏的 */
    return normalize({ shares: ZERO, dominant: null, audit: { error: String((error && error.message) || error) } }, `${name}(failed)`);
  }

  const result = normalize(out, name);
  if (name !== wanted) result.audit = { ...result.audit, requestedChip: wanted, fallback: name };
  return result;
}
