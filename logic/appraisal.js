/**
 * 情绪 · appraisal → emotion（按 094 DESIGN-符号化 §5 实现）
 *
 * 设计要点（逐条对应文档）：
 * §5.1 七类：喜 joy / 怒 anger / 哀 sadness / 惧 fear / 惊 surprise / 厌 disgust / 中性 neutral
 *      （离散分类是工程取舍，便于断言与回放；不是科学定论——Barrett 建构论另有说法）
 * §5.2 映射规则：按文档表格顺序，先命中先返回
 *      强度 = relevance × |congruence| × (0.5 + 0.5×certainty)，夹到 0–1
 * §5.3 与老件怎么合：与词表增量**并列**，取强度更大的那条，不叠加（避免双重放大）；
 *      老件（增量表/半衰/阻尼/四档风格）不动。
 *
 * 输入只用 sym.appraisal 的五个字段（relevance/congruence/control/certainty/agency），
 * 缺省值按 §2 表：relevance 0.5 · congruence 0 · control 0.5 · certainty 0.5 · agency world。
 * 纯函数：不读盘、不改入参、同输入同输出。
 */

export const APPRAISAL_EMOTIONS = ['joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust', 'neutral'];

const APPRAISAL_LABELS = {
  joy: '喜', anger: '怒', sadness: '哀', fear: '惧',
  surprise: '惊', disgust: '厌', neutral: '中性',
};

const clamp01 = (n) => Math.min(1, Math.max(0, Number.isFinite(Number(n)) ? Number(n) : 0));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** 按 §2 缺省值补全五个字段。 */
export function normalizeAppraisal(appraisal) {
  const a = appraisal && typeof appraisal === 'object' ? appraisal : {};
  return {
    relevance: clamp01(num(a.relevance, 0.5)),
    congruence: Math.min(1, Math.max(-1, num(a.congruence, 0))),
    control: clamp01(num(a.control, 0.5)),
    certainty: clamp01(num(a.certainty, 0.5)),
    agency: ['self', 'user', 'other', 'world'].includes(a.agency) ? a.agency : 'world',
  };
}

/** §5.2 映射：顺序即优先级，第一个命中即为结果。 */
export function emotionFromAppraisal(appraisal) {
  const a = normalizeAppraisal(appraisal);
  let emotion = 'neutral';
  if (a.congruence > 0.3 && a.relevance > 0.5) emotion = 'joy';
  else if ((a.agency === 'user' || a.agency === 'self') && a.congruence < -0.3 && a.control > 0.5) emotion = 'anger';
  else if (a.congruence < -0.3 && a.control <= 0.5) emotion = 'sadness';
  else if (a.certainty < 0.4 && a.relevance > 0.6) emotion = 'fear';
  else if (a.certainty < 0.3 && a.relevance <= 0.6) emotion = 'surprise';
  else if (a.congruence < -0.2 && a.agency === 'other' && a.control <= 0.3) emotion = 'disgust';

  const intensity = clamp01(a.relevance * Math.abs(a.congruence) * (0.5 + 0.5 * a.certainty));
  return {
    emotion,
    label: APPRAISAL_LABELS[emotion],
    intensity: Number(intensity.toFixed(4)),
    basis: a,
  };
}

/**
 * §5.3 合并：appraisal 情绪 与 词表增量 并列，取强度更大的那条。
 * 平局时保留词表侧（老件优先，保守）；两侧都缺省时返回中性。
 * 入参：
 *   fromAppraisal = emotionFromAppraisal(...) 的返回
 *   fromLexicon   = { emotion: string|null, intensity: number }（现有 affectOf 侧折算）
 */
export function mergeEmotionSources(fromAppraisal, fromLexicon) {
  const ap = fromAppraisal && typeof fromAppraisal === 'object' ? fromAppraisal : null;
  const lx = fromLexicon && typeof fromLexicon === 'object' ? fromLexicon : null;
  const apIntensity = ap ? clamp01(num(ap.intensity, 0)) : 0;
  const lxIntensity = lx ? clamp01(num(lx.intensity, 0)) : 0;
  if (!ap && !lx) return { emotion: 'neutral', label: APPRAISAL_LABELS.neutral, intensity: 0, source: 'none' };
  if (lxIntensity >= apIntensity) {
    return { emotion: lx.emotion || 'neutral', label: APPRAISAL_LABELS[lx.emotion] || '中性', intensity: Number(lxIntensity.toFixed(4)), source: 'lexicon' };
  }
  return { emotion: ap.emotion, label: ap.label, intensity: Number(apIntensity.toFixed(4)), source: 'appraisal' };
}
