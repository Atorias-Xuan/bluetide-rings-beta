/* ── 遗忘曲线（2026-11-01）─────────────────────────────────────────
   替掉临时记忆区（工作区）原来那条「满 24 小时整条消失」的悬崖。

   依据（经典结论，不是自创）：
   · Ebbinghaus（1885/1913）留下的是「保持随时间下降」这条曲线，不是某个固定截止点；
   · Wixted & Ebbesen（1991, Psychological Science, "On the form of forgetting"）
     比较指数与幂函数，指出**幂函数**拟合保持率更好——指数衰减在长时距上掉得太快；
   · Anderson & Schooler（1991, Psychological Science, "Reflections of the environment
     in memory"）把记忆强度解释成环境统计的反映：保留概率随 **时距**与 **出现频次**
     一起变，两者都服从幂律。ACT-R 的基级激活 B_i = ln(Σ_j t_j^-d)（d≈0.5）
     是同一思想的可计算公式化版本。

   所以这里的保留率取幂律，并让「被再访问过」加成：
       base  = (1 + ageHours / TAU) ^ (-D)
       boost = 1 + K * ln(1 + hits)
       R     = min(1, base * boost)

   两个阈值，把「清掉」拆成「渐隐」和「清除」：
       R >= SHOW_AT  正常显示
       KEEP_AT <= R < SHOW_AT  还在盘上，但不进摘要/最近列表（渐隐）
       R <  KEEP_AT  才真正清扫
   这样一条行是「慢慢淡出」的，而不是到第 1441 分钟突然消失。

   纯函数：给定 now / 时间戳就算得出来，能被断言。IO 一律不碰。 */

export const RETENTION = {
  /* TAU：年龄尺度。4 小时意味着 4h≈0.707、24h≈0.378、48h≈0.277 */
  tauHours: 4,
  /* D：幂律指数。0.5 是与 ACT-R 一致的常用取值 */
  decay: 0.5,
  /* 每被再访问一次（hits）的加厚系数：hits=5 时 boost≈1.63 */
  hitsFactor: 0.35,
  /* 低于这个值不再进入摘要 / 最近列表（渐隐） */
  showAt: 0.5,
  /* 低于这个值才允许清扫（真清除） */
  keepAt: 0.3,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* 一条行的保留率。ageHours 已由调用方按「坏时间戳用 mtime 兜底」算好。 */
export function retentionOf({ ageHours = 0, hits = 0, tau } = {}) {
  const age = Math.max(0, Number(ageHours) || 0);
  const n = Math.max(0, Number(hits) || 0);
  /* tau 是**参数**（刻度），不是实现。三种传法：
       tau 省略            → 退回全局默认 RETENTION.tauHours（老调用方行为逐字不变）
       tau = null          → 不衰减，恒为 1（工作记忆：永久不清）
       tau = 数字（小时）  → 用该刻度（工作区 4 / 感知 72 / 记忆区 160）
     参数表在 versions.json 的 config.decay.tauByArea，不在这个函数里。 */
  const scale = tau === null ? null : (tau === undefined ? RETENTION.tauHours : Number(tau));
  if (scale === null) return 1;
  if (!Number.isFinite(scale) || scale <= 0) return 0;
  const base = Math.pow(1 + age / scale, -RETENTION.decay);
  const boost = 1 + RETENTION.hitsFactor * Math.log1p(n);
  return Number(clamp(base * boost, 0, 1).toFixed(4));
}

export function fadeOf(retention) {
  const r = Number(retention) || 0;
  if (r < RETENTION.keepAt) return 'gone';
  if (r < RETENTION.showAt) return 'fading';
  return 'fresh';
}

/* 从「现在」起还要多久才跌破 keepAt（hits 越高越久）。
   解 base*boost < keepAt：
     (1+age/tau)^-d * boost < k  →  age > tau * ((k/boost)^(-1/d) - 1)
   2026-11-01 修正：我第一版写成 ln(1/k)/d*tau，漏了 (1+age/tau) 里的那个 1，
   算出 9.6h（真值 40.4h），expiresAt 因此一直在骗人。 */
export function hoursUntilGone(hits = 0) {
  const n = Math.max(0, Number(hits) || 0);
  const boost = 1 + RETENTION.hitsFactor * Math.log1p(n);
  const ratio = Math.pow(RETENTION.keepAt / boost, -1 / RETENTION.decay);
  return Number((RETENTION.tauHours * (ratio - 1)).toFixed(2));
}

/* 给行算保留率：时间戳坏掉用 fallbackMs 兜底，未来时间戳按 now 截断。 */
export function retentionOfRow(row, now = Date.now(), fallbackMs = now) {
  const at = Date.parse(row && row.ts);
  const stamp = Number.isFinite(at) ? Math.min(at, fallbackMs, now) : Math.min(fallbackMs, now);
  const ageHours = Math.max(0, (now - stamp) / 3600000);
  const hits = Number(row && (row.hits ?? row.uses)) || 0;
  const retention = retentionOf({ ageHours, hits });
  return { ageHours: Number(ageHours.toFixed(2)), hits, retention, fade: fadeOf(retention) };
}

/* 面板/摘要用：这条行还该不该出现。免死行（decision/cross/photo）永远显示。 */
export function isVisible(row, now = Date.now(), fallbackMs = now) {
  const type = row && row.type;
  if (type === 'decision' || type === 'cross' || type === 'photo') return true;
  return fadeOf(retentionOfRow(row, now, fallbackMs).retention) !== 'gone';
}

/* 曲线数值表：测试与文档共用一份，别在两处各写一套期望值。 */
export function curveTable() {
  return [1, 4, 8, 24, 48, 72, 168, 336, 720].map((hours) => ({
    hours,
    untouched: retentionOf({ ageHours: hours, hits: 0 }),
    touched3: retentionOf({ ageHours: hours, hits: 3 }),
  }));
}
