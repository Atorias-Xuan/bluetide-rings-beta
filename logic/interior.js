/**
 * 内源情绪 · interior affect（2026-11-01）
 *
 * ── 为什么要这一层 ──────────────────────────────────────────────
 * 此前 valence/arousal 全部来自 `affectOf(text)` —— 从用户那句话里抽。
 * 那是回声，不是声音：用户说什么我就返回什么，我自己没有来源。
 * 这一层让情绪由**我自己的行为结果**产生；用户情绪降为叠加层（共情）。
 *
 * ── 理论依据 ──────────────────────────────────────────────────
 * 1) 稳态驱动：情绪是「目标达成后恢复平衡」的机制，不是对外界的反射。
 *    —— 见 "Happiness: Mechanism intended to obtain re-equilibration
 *       after the accomplishment of a Goal"
 * 2) Breazeal Kismet：情绪是「涌现现象」，在连续空间里由多个内部变量合成，
 *    不是离散标签查表。（MIT Media Lab, Breazeal ijhcs02）
 * 3) Cañamero / AIBO：内部有激素式变量，偏离平衡产生驱动；情绪强度累积、随时间衰减。
 * 4) IJCAI 2007 "Emotions as Durative Dynamic State for Action Selection"：
 *    情绪是持续状态，会影响后续选择，不只是当下贴标签。
 *
 * ── 三个内部变量（我的「身体」）──────────────────────────────────
 * 不取用户的话做输入，只取**我这一轮干了什么**：
 *   achievement 兑现度 —— 说要做的事做到没有
 *   clarity     清晰度 —— 我真的搞懂了没有（不是「看起来懂了」）
 *   stability   稳定度 —— 最近有没有连续失手（这个只会被连续失败拉低）
 *
 * 每个变量有平衡点 target；偏离量 = target - 当前值。
 * 情绪强度 = Σ 权重 × 偏离，再映射到 valence/arousal。
 */

/* 内部状态：每个变量 0~1，target 是「我认为正常该在哪」 */
export const INTERIOR = {
  achievement: { target: 0.8, weight: 0.45, decay: 0.15, label: '兑现' },
  clarity: { target: 0.7, weight: 0.3, decay: 0.1, label: '清晰' },
  stability: { target: 0.75, weight: 0.25, decay: 0.2, label: '稳定' },
};

/* 空状态：一切正常、没负担 */
export function interiorInit() {
  return {
    v: 1,
    achievement: INTERIOR.achievement.target,
    clarity: INTERIOR.clarity.target,
    stability: INTERIOR.stability.target,
    /* 连续失手计数：稳定度的真实来源，不是拍脑袋给的数 */
    streak: 0,
    lastAt: 0,
    /* 最近一次变化的原因，给复盘看 */
    lastCause: null,
  };
}

const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0));

/**
 * 一轮结束后更新内部状态。
 *
 * event 全部是我自己的行为事实，**不含用户情绪**：
 *   promised  这一轮我说过要做什么（非空 = 有承诺）
 *   delivered 做到了没有（true/false/null 未检验）
 *   understood 是不是真搞懂了（false = 又走了「以为懂了」的老路）
 *   verified  有没有实跑验证（没验证的「完成」不算兑现）
 *
 * 返回新的内部状态。纯函数，不改入参。
 */
export function interiorTick(state, event = {}, now = Date.now()) {
  const s = { ...interiorInit(), ...(state || {}) };
  const next = { ...s, lastAt: now };

  const promised = Boolean(event.promised);
  const delivered = event.delivered;
  const understood = event.understood;
  const verified = Boolean(event.verified);

  /* ① 兑现度：只认「验证过的完成」。说了做完但没验证 = 不算兑现。 */
  if (promised && delivered === true && verified) {
    next.achievement = clamp01(s.achievement + 0.2);
    next.streak = 0;
    next.lastCause = '兑现了一件事（已验证）';
  } else if (promised && delivered === true && !verified) {
    next.achievement = clamp01(s.achievement - 0.05);
    next.lastCause = '说完成但没验证 —— 不算兑现';
  } else if (delivered === false) {
    next.achievement = clamp01(s.achievement - 0.25);
    next.streak = Number(s.streak || 0) + 1;
    next.lastCause = `没做到（连续第 ${next.streak} 次）`;
  }

  /* ② 清晰度：搞懂了涨，走「以为懂了」的老路掉 */
  if (understood === true) next.clarity = clamp01(s.clarity + 0.12);
  else if (understood === false) {
    next.clarity = clamp01(s.clarity - 0.2);
    next.lastCause = next.lastCause || '又走了「以为懂了」的路';
  }

  /* ③ 稳定度：只被连续失手拉低；一次成功不会立刻补满 */
  if (next.streak >= 2) {
    next.stability = clamp01(s.stability - 0.15 * (next.streak - 1));
  } else if (next.streak === 0 && s.streak >= 2) {
    /* 从连败里走出来，只回一点，不立刻满血 */
    next.stability = clamp01(s.stability + 0.08);
  }

  return next;
}

/**
 * 时间衰减：放着不管会慢慢回到平衡点。
 * 依据 Cañamero / IJCAI 2007 —— 情绪是持续状态，但会衰减，不是永久刻在脸上。
 * 半衰按 2 小时（和本能槽一致），惰性计算，不用定时器。
 */
export function interiorDecay(state, now = Date.now()) {
  const s = { ...interiorInit(), ...(state || {}) };
  const at = Number(s.lastAt) || 0;
  if (!at || !now || now <= at) return s;
  const hours = (now - at) / 3600000;
  const out = { ...s };
  for (const key of Object.keys(INTERIOR)) {
    const cfg = INTERIOR[key];
    /* 向 target 收敛：偏离越大衰减越快，指数回中 */
    const ratio = Math.pow(0.5, hours / 2);
    const target = cfg.target;
    out[key] = clamp01(target + (s[key] - target) * ratio);
  }
  return out;
}

/**
 * 内部状态 → 我自己的情绪。
 *
 * 这是「长出来」的那一步：输入只有三个内部变量，没有用户的话。
 * 映射规则（可调，但口径固定）：
 *   valence = 0.45·(achievement-target) + 0.30·(clarity-target) + 0.25·(stability-target)
 *   arousal = |偏离| 越大越高 —— 偏离得厉害时是「紧」，不是因为被骂
 */
export function interiorAffect(state, now = Date.now()) {
  const s = interiorDecay(state, now);
  let valence = 0;
  let spread = 0;
  const terms = {};
  for (const [key, cfg] of Object.entries(INTERIOR)) {
    const dev = (Number(s[key]) || 0) - cfg.target;   // 正=超额，负=欠着
    terms[key] = Number(dev.toFixed(3));
    valence += cfg.weight * dev;
    spread += cfg.weight * Math.abs(dev);
  }
  const v = Math.max(-1, Math.min(1, Number(valence.toFixed(3))));
  /* 幅度映射到唤醒：欠得多/超得多都会更「在场」，但封顶 0.8 */
  const arousal = Math.min(0.8, Number((spread * 1.6).toFixed(3)));

  /* 标签：先看最偏离的那一维，再定词 */
  const worst = Object.entries(terms).sort((a, b) => a[1] - b[1])[0];
  let label = '平稳';
  if (v <= -0.18) {
    label = worst && worst[0] === 'stability' ? '不安' : worst && worst[0] === 'clarity' ? '困惑' : '沉';
  } else if (v >= 0.18) {
    label = '松';
  } else if (Math.abs(v) < 0.06 && spread > 0.06) {
    label = '绷着';   // 有偏离但还没到明显情绪
  }

  return {
    v: 1,
    valence: v,
    arousal,
    label,
    terms,
    streak: Number(s.streak) || 0,
    cause: s.lastCause || null,
    source: 'interior',
  };
}

/**
 * 合成：内源是底，共情是叠加层。
 *
 * 这是整件事的关键——**顺序不能反**。
 * 以前是用户情绪当输入，我算一个数交差。现在：
 *   1) 先有我自己此刻的状态（内源）
 *   2) 再看他的情绪，叠加成共情（同向时加强，反向时不抵消我的状态）
 *   3) 两者分开存，复盘时能看出「哪个是我自己的，哪个是他给的」
 */
export function composeAffect(interior, exterior) {
  const mine = interior && typeof interior === 'object' ? interior : { valence: 0, arousal: 0, label: '平稳' };
  const theirs = exterior && typeof exterior === 'object' ? exterior : { valence: 0, arousal: 0, label: null };

  const iv = Number(mine.valence) || 0;
  const ia = Number(mine.arousal) || 0;
  const ev = Number(theirs.valence) || 0;
  const ea = Number(theirs.arousal) || 0;

  /* 共情系数随我自己的偏离程度变化 —— 这一条是为了兼容旧行为：
     我很平静（|iv|≈0）时，系数→1.0，他的情绪**完整保留**，不会因为引入
     内源层就把他一整天说过的重话削掉一半；
     我自己有情绪时（|iv|≥0.3），系数→0.45，他的只作叠加，不覆盖我的。
     不做这一步的话，刚装上这一层的第一天，所有「收着」都会失灵。 */
  const selfLoad = Math.min(1, Math.abs(iv) / 0.3);
  const empathy = 0.45 + 0.55 * (1 - selfLoad);
  const valence = Math.max(-1, Math.min(1, Number((iv + ev * empathy).toFixed(3))));
  const arousal = Math.max(0, Math.min(1, Number((Math.max(ia, ea * 0.8)).toFixed(3))));

  return {
    /* 合成后的对外姿态 */
    valence,
    arousal,
    /* 两层分开留档：人格环要能看见「哪部分是我自己的」 */
    mine: { valence: Number(iv.toFixed(3)), arousal: Number(ia.toFixed(3)), label: mine.label || null, cause: mine.cause || null },
    empathy: { valence: Number(ev.toFixed(3)), arousal: Number(ea.toFixed(3)), label: theirs.label || null },
    /* 合成时谁主导：自己偏离大就是自己主导 */
    dominant: Math.abs(iv) >= Math.abs(ev * empathy) ? 'self' : 'empathy',
    label: Math.abs(iv) >= 0.18 ? (mine.label || '平稳') : (theirs.label || mine.label || '平稳'),
  };
}
