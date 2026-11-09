/**
 * 芯片 v4（2026-11-09 · 芯片化）
 *
 * 现有的生产算法：三环各算一个 units，再除以三者之和归一。
 * 公式本体仍在 logic/mix.js 的 ratioV4 —— 这里只做**适配**，
 * 不复制数学，避免「两处实现同一公式」这种老问题再长出来。
 *
 * 输入见 ./index.js 的契约；v4 只认计数类字段，其余忽略。
 */
import { ratioV4 } from '../mix.js';

export function chipV4(signals = {}) {
  const s = signals && typeof signals === 'object' ? signals : {};
  const raw = ratioV4(s);

  /* ratioV4 在「本轮没有任何事件」时返回 null —— 这是合法状态，
     契约要求此时 shares 全 0、dominant 为 null，不是错误。 */
  if (!raw) {
    return {
      shares: { perception: 0, memory: 0, persona: 0 },
      dominant: null,
      source: 'v4',
      audit: { idle: true },
    };
  }

  return {
    shares: raw.shares,
    dominant: raw.dominant,
    source: 'v4',
    /* units 是 v4 的中间量（三环各自的原始强度）。契约里保留它，
       但**只是为了让换芯片时下游不用改**；新代码应当只读 shares。 */
    units: raw.units,
    audit: {
      units: raw.units,
      raw: raw.raw,
      formula: 'shares = units / Σunits',
    },
  };
}

export default chipV4;
