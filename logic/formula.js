/**
 * 公式层（纯数学，2026-10-30 · 任务 095）
 *
 * 只有算式，没有业务、不读盘、不碰宿主。改参数去 logic/ring-weight.js 的 RING_V5。
 * 出处：精度加权 Ernst & Banks 2002；softmax 门控 Jacobs 1991 / Shazeer 2017。
 */

const FORMULA_EPS = 1e-6;

/* 钳到 [0,1]：输入是脏数据时返回 0，不返回 NaN（NaN 会一路污染到面板） */
export function clamp01(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(1, Math.max(0, num));
}

/* 精度加权：w_r = (1/σ_r²) / Σ(1/σ_s²)
   σ² 越小（越可靠）权重越大。σ² 缺省给 1，避免 0 除。 */
export function precisionWeights(sigma2 = {}, rings = ['perception', 'memory', 'persona']) {
  const raw = {};
  let sum = 0;
  for (const ring of rings) {
    const s2 = Number(sigma2[ring]);
    const safe = Number.isFinite(s2) && s2 > FORMULA_EPS ? s2 : 1;
    raw[ring] = 1 / safe;
    sum += raw[ring];
  }
  const out = {};
  for (const ring of rings) out[ring] = sum > 0 ? raw[ring] / sum : 1 / rings.length;
  return out;
}

/* softmax：数值稳定版（减最大值不改变分布） */
export function softmax(scores = {}, rings = ['perception', 'memory', 'persona']) {
  const list = rings.map((ring) => {
    const value = Number(scores[ring]);
    return Number.isFinite(value) ? value : 0;
  });
  const max = Math.max(...list);
  const exps = list.map((value) => Math.exp(value - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const out = {};
  rings.forEach((ring, index) => { out[ring] = sum > 0 ? exps[index] / sum : 1 / rings.length; });
  return out;
}

/* 偏离均匀的程度：0 = 三个环等分，1 = 全压在一个环上 */
export function biasStrengthOf(g = {}, rings = ['perception', 'memory', 'persona']) {
  const uniform = 1 / rings.length;
  const values = rings.map((ring) => Number(g[ring]) || 0);
  const max = Math.max(...values);
  return clamp01((max - uniform) / (1 - uniform));
}

export function argmaxOf(g = {}, rings = ['perception', 'memory', 'persona']) {
  let best = rings[0];
  for (const ring of rings) if ((Number(g[ring]) || 0) > (Number(g[best]) || 0)) best = ring;
  return best;
}

/* ── 11.x 检索打分（094 DESIGN §11，2026-10-31 落地为纯函数）─────────────
   S = wK·K + wH·H + wA·A + wSym·Sym
   β_eff = β0·(1 + κ·arousal)      β0 = 1/τ
   z = β_eff·S + b_ring
   出处：Generative Agents（相关性加权）、ACT-R（基底激活）、Easterbrook（唤醒收窄注意）。
   只算数，不选谁：选不选由调用方决定，方便灰度。

   2026-11-01：加第四项 Sym（受控符号重合度）。此前 symbol 只写进感知行、
   没有任何消费者（symOverlap 注释写着「检索用」却零调用），等于符号化白做。
   Sym 通过 symOverlap(querySym, row.sym) 给；行上没有 sym 或查询没编码时恒为 0，
   所以老数据不受影响。四项权重按原比例缩到和为 1：
   原 .40/.35/.25（和 1.0）→ .34/.30/.21/.15（和 1.00）。 */
export const RETRIEVAL_V5 = { wK: 0.34, wH: 0.30, wA: 0.21, wSym: 0.15, tau: 0.15, kappa: 0.5, d: 0.5 };

/* ACT-R 基底激活：A_i = ln(Σ t^-d)，t 以小时计；空历史 → 0（不是 -Infinity） */
export function activationOf(agesHours = [], d = RETRIEVAL_V5.d) {
  let sum = 0;
  for (const age of agesHours) {
    const t = Number(age);
    if (!Number.isFinite(t) || t <= 0) continue;
    sum += Math.pow(t, -d);
  }
  return sum > 0 ? Math.log(sum) : 0;
}

/* 激活量映射到 [0,1]：ln 值域约 [-3,3] 截断，映射后可直接进 S */
export function activationScore(activation) {
  const num = Number(activation);
  if (!Number.isFinite(num)) return 0;
  return clamp01((Math.min(3, Math.max(-3, num)) + 3) / 6);
}

export function retrievalScore(input = {}, options = {}) {
  const cfg = { ...RETRIEVAL_V5, ...options };
  const K = clamp01(input.K);
  const H = clamp01(input.H);
  const A = clamp01(input.A);
  /* Sym = 受控符号重合度；行上没有 sym / 查询没编码时恒 0，老数据等价于不参与 */
  const Sym = clamp01(input.Sym);
  const arousal = clamp01(input.arousal);
  const S = cfg.wK * K + cfg.wH * H + cfg.wA * A + cfg.wSym * Sym;
  const beta = (1 / cfg.tau) * (1 + cfg.kappa * arousal);
  const ring = String(input.ring || 'memory');
  const bMap = input.b && typeof input.b === 'object' ? input.b : {};
  const bias = Number.isFinite(Number(bMap[ring])) ? Number(bMap[ring]) : 0;
  return {
    S: Number(S.toFixed(6)),
    beta: Number(beta.toFixed(6)),
    bias: Number(bias.toFixed(6)),
    z: Number((beta * S + bias).toFixed(6)),
    terms: { K, H, A, Sym, arousal },
    weights: { wK: cfg.wK, wH: cfg.wH, wA: cfg.wA, wSym: cfg.wSym },
  };
}

/* 一组候选的归一化后验（softmax over z）。候选为空返回空数组，不出 NaN。 */
export function retrievalPosterior(candidates = []) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (!list.length) return [];
  const zs = list.map((item) => Number(item && item.z) || 0);
  const max = Math.max(...zs);
  const exps = zs.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return list.map((item, index) => ({
    ...item,
    p: sum > 0 ? Number((exps[index] / sum).toFixed(6)) : 1 / list.length,
  }));
}
