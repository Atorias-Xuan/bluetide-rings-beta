/**
 * 三环 · 占比与本能（纯逻辑层）
 *
 * 这一层只有算式和常量：不读盘、不发事件、不碰宿主。
 * 之所以单独成文件（2026-10-28 你定「逻辑优先、拆开好改」）：
 *   占比口径改得比什么都频繁，而它又最容易被宿主接线、事件、UI 代码缠在一起。
 *   拆出来之后，改口径只动这一个文件，其余一行不碰。
 *
 * 依赖约定：
 *   · 本文件不许 import 任何宿主模块（插件 ctx / 目录 / 事件），只允许 node:fs 读写本能槽。
 *   · 输入输出都是普通对象，测试可以直接喂数字。
 */
import { readFileSync, writeFileSync } from 'node:fs';

/* 三环的名字与顺序：这是「环」这一概念的唯一来源，别在别处再写一遍数组字面量 */
export const MIX_TRACKED = ['perception', 'memory', 'persona'];

/* 占比口径版本：写进 taskstats 的 unitsV，读端按它过滤旧口径行。
   放在这里是因为它就是「这套算式是第几版」，与 RATIO 同寿；
   宿主与 settle 层都 import 这一份，不许在别处再写字面量 4。 */
export const UNITS_VERSION = 5;

/* ── 占比参数（全部落常量 · 你定「参数要能一次改完」）─────────────────
     感知 = 经验命中数 ÷ 总事件数（未命中按 1 记，新问题不被归零）
     记忆 =（长期记忆捕捉 + 经验命中）÷ 事件 ÷ 2；均为 0 时退到下线的候选/临时
     人格 =（情绪偏离中性 + 本能步长 × 槽）÷ 参考满值   ← 0~1，与另两环同量纲
   2026-11-01 口径 A：人格原来是「绝对强度」（mood × (1+0.5·槽)，中性就有 0.9 底座，
   上限 1.5 且本能激活后不封顶），另两环是 0~1 的比值。三环量纲不同，导致除极端情况外
   「主导环」恒为 persona —— 实测 5 组信号里 4 组被它独占，记忆做得再多也判不到它头上。
   现在人格也归一到 0~1：中性且无本能 = 0（人格环没动），只有情绪偏离或本能激活才算数。
   改口径只改这张表，别在算式里留魔数。 */
export const RATIO = {
  memoryAvg: 2,                 /* 记忆 =（记忆捕捉占比 + 经验捕捉占比）÷ 2 */
  moodNeutral: 0.9,             /* 中性情绪系数 */
  moodMax: 1.5,                 /* 情绪上限（未激活本能时的人格封顶也用它） */
  moodMin: 0.5,                 /* 情绪下限 */
  moodGain: 0.5,                /* 情绪增益：1 ± 增益 × |valence| */
  moodEdge: 0.3,                /* 超过这个绝对值才算有情绪，否则取中性 */
  instinctOn: 3,                /* 本能激活阈值（槽 ≥ 它 → 人格不封顶） */
  instinctCap: 5,               /* 本能槽上限 */
  instinctStep: 0.5,            /* 本能增量基数：+步长 + 步长 × 强度 */
  instinctTrigger: 0.7,         /* 触发线：valence 与 arousal 都要高过它 */
  instinctTtlMs: 2 * 60 * 60 * 1000, /* 距最后一次触发 2h 归零（惰性判定，不用真定时器） */
  hitMin: 0.15,                 /* 经验命中阈值（词元重叠率） */
  /* 人格反向控制情绪（负反馈）：人格是在场强度，不能让「在场强」自己把自己顶得更高。
     阈值按新量纲重定（2026-11-01 口径 A）：persona units 现在上限是 1，原来的 1.0
     永远够不着 —— 那条负反馈一直是哑的。取 0.7 相当于「情绪或本能已明显在场」。 */
  personaDampOn: 0.7,           /* 人格强度（0~1）超过它才启动阻尼 */
  personaDampGain: 0.5,         /* 每超出阈值 1 点，压 50%（新量纲下按超出比例算） */
  personaDampMax: 0.4,          /* 单轮最多压 40%，别把当下情绪一下抹平 */
};

/* 情绪 → 系数。中性 0.9；越积极越高（封顶 1.5）；越负越低（下限 0.5）。 */
export function moodFactor(valence) {
  const v = Number(valence);
  if (!Number.isFinite(v)) return RATIO.moodNeutral;
  if (Math.abs(v) <= RATIO.moodEdge) return RATIO.moodNeutral;
  if (v > 0) return Math.min(RATIO.moodMax, 1 + RATIO.moodGain * Math.min(1, v));
  return Math.max(RATIO.moodMin, 1 - RATIO.moodGain * Math.min(1, -v));
}

/* 本轮三环取值。
   events     本轮总事件数（用户消息 1 + 工具 + 三环写入 + 检索 + 判断）
   hits       经验命中数
   memCaptured 写进记忆环的条目数
   memHits    检索捞出来的长期记忆条目数
   slots/temps 进候选槽 / 进临时区的条目数
   slot       本能槽；valence 当前情绪
   events 为 0 返回 null —— 调用方退回 autoMix，别造一个没有分母的占比。 */
export function ratioV4(signals = {}) {
  const events = Math.max(0, Number(signals.events) || 0);
  if (!(events > 0)) return null;
  const hits = Math.max(0, Math.min(events, Number(signals.hits) || 0));
  const memCaptured = Math.max(0, Math.min(events, Number(signals.memCaptured) || 0));
  const slots = Math.max(0, Number(signals.slots) || 0);
  const temps = Math.max(0, Number(signals.temps) || 0);
  const slot = Math.max(0, Math.min(RATIO.instinctCap, Number(signals.slot) || 0));
  const valence = Number.isFinite(Number(signals.valence)) ? Number(signals.valence) : 0;
  const mood = moodFactor(valence);
  const active = slot >= RATIO.instinctOn;
  /* 2026-11-01 修正：上一版用「偏离中性」当强度，静息时人格被算成 0 ——
     三环里人格永远在场，归零是错的（这是 UI 上肉眼可见的坏值）。
     改为「情绪系数 / 情绪上限」的绝对比例：中性 mood=0.9 → 0.6，
     低落 0.55 → 0.37，高涨 1.5 → 1.0。有基线、不归零，同时仍与另两环同量纲。
     本能再叠一半权重：静息 0（没触发就是没参与），满槽 +0.5。 */
  const moodPart = RATIO.moodMax > 0 ? Math.min(1, Math.max(0, mood / RATIO.moodMax)) : 0;
  const instinctSpan = RATIO.instinctStep * RATIO.instinctCap;
  const instinctPart = instinctSpan > 0
    ? Math.min(1, (RATIO.instinctStep * slot) / instinctSpan)
    : 0;
  const persona = Math.min(1, Math.max(0, 0.5 * moodPart + 0.5 * instinctPart));
  /* 长期记忆捕捉 = 写入记忆环 + 检索命中（在用/冷却/归档都算）。
     检索命中也算「记忆区动过手」，否则查了 5 条照样被判成没动作。 */
  const memHits = Math.max(0, Math.min(events, Number(signals.memHits) || 0));
  const longTerm = Math.min(events, memCaptured + memHits);
  const offline = longTerm === 0 && hits === 0;
  const pending = Math.min(events, slots + temps);
  const perception = hits > 0 ? hits / events : Math.min(1, 1 / events);
  /* 记忆区所有区域都 0 命中 → 与感知同数：这一轮两环都只是「接住了信息」 */
  const idle = offline && pending === 0;
  const units = {
    perception,
    memory: idle
      ? perception
      : (offline ? pending : longTerm + hits) / (events * RATIO.memoryAvg),
    persona,
  };
  const total = units.perception + units.memory + units.persona;
  const shares = {};
  for (const key of MIX_TRACKED) shares[key] = total > 0 ? Number((units[key] / total).toFixed(3)) : 0;
  const dominant = total > 0 ? MIX_TRACKED.reduce((best, key) => (units[key] > units[best] ? key : best), MIX_TRACKED[0]) : null;
  return {
    units, shares, dominant,
    raw: { events, hits, memCaptured, memHits, longTerm, slots, temps, offline, idle, valence, mood, slot, instinct: active },
    source: 'v4',
  };
}

/* 人格 → 情绪 的反向控制（负反馈）。
   为什么要负反馈：情绪推人格（moodFactor）、人格再推情绪，就是正反馈，会越转越大。
   所以只在人格强度超过阈值时**压**情绪，压完下一轮人格自然回落：
     超调 = max(0, 人格 - personaDampOn)
     阻尼 = min(personaDampMax, 超调 × personaDampGain)
   写回的是「已经积累的在场情绪」，不是用户这一句本身。 */
export function dampAffect(affect, personaUnits) {
  const base = affect && typeof affect === 'object' ? affect : { valence: 0, arousal: 0 };
  const persona = Math.min(1, Math.max(0, Number(personaUnits) || 0));
  /* 阈值以上的剩余区间归一：persona 到 1 时 over=1，才可能压满 dampMax。
     不归一的话，0.7~1.0 这段最多只换来 0.15 的阻尼，阈值等于白设。 */
  const span = Math.max(1e-6, 1 - RATIO.personaDampOn);
  const over = Math.max(0, (persona - RATIO.personaDampOn) / span);
  const damp = Math.min(RATIO.personaDampMax, over * RATIO.personaDampGain);
  if (!(damp > 0)) {
    return { valence: Number(base.valence) || 0, arousal: Number(base.arousal) || 0, damp: 0 };
  }
  const keep = 1 - damp;
  return {
    valence: Number(((Number(base.valence) || 0) * keep).toFixed(3)),
    arousal: Number(((Number(base.arousal) || 0) * keep).toFixed(3)),
    damp: Number(damp.toFixed(3)),
  };
}

/* ── 本能层（正向原始欲望：狂热、极端依赖，没有恶意）─────────────────
   只向上，不惩罚：触发才加，不触发只等着过期。
   触发：valence > 0.7 且 arousal > 0.7（积极高唤起）
   增量：+0.5 + 0.5 × 强度（强度 = (valence+arousal)/2，按强度加权）
   消退：距**最后一次触发**超过 2 小时 → 归零。惰性判定：比时间戳，不用真定时器。
   落盘文件由调用方给路径（本层不认识插件目录）。 */
export function instinctLoad(file) {
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    return { slot: Math.max(0, Math.min(RATIO.instinctCap, Number(raw.slot) || 0)), lastAt: Number(raw.lastAt) || 0 };
  } catch {
    return { slot: 0, lastAt: 0 };
  }
}

export function instinctTick(state, valence, arousal, now = Date.now()) {
  const prev = state && typeof state === 'object' ? state : { slot: 0, lastAt: 0 };
  const lastAt = Number(prev.lastAt) || 0;
  const alive = lastAt > 0 && now - lastAt <= RATIO.instinctTtlMs;
  let slot = alive ? Math.max(0, Math.min(RATIO.instinctCap, Number(prev.slot) || 0)) : 0;
  const v = Number(valence) || 0;
  const a = Number(arousal) || 0;
  let triggered = false;
  if (v > RATIO.instinctTrigger && a > RATIO.instinctTrigger) {
    const strength = Math.min(1, (v + a) / 2);
    slot = Math.min(RATIO.instinctCap, slot + RATIO.instinctStep + RATIO.instinctStep * strength);
    triggered = true;
  }
  return {
    slot: Number(slot.toFixed(2)),
    lastAt: triggered ? now : alive ? lastAt : 0,
    triggered,
    active: slot >= RATIO.instinctOn,
  };
}

export function instinctSave(file, state) {
  try {
    writeFileSync(file, `${JSON.stringify({ slot: Number(state.slot) || 0, lastAt: Number(state.lastAt) || 0 })}\n`, 'utf8');
  } catch {
    /* 落盘失败不影响本轮判定：下次按 0 起算，最多丢一次累积 */
  }
}
