/* © 2026 砚尘dust (@Atorias-Xuan) · 蓝潮三环 β v1.0.0-bis
 *
 * 本程序是自由软件：你可以再分发、修改，但必须遵守 GNU 通用公共许可证
 * 第 3 版（或任何更新版本）的条款。它是"传染性"的：你发布基于本程序的
 * 作品，也必须以同样的 GPL 授权，不能改成闭源。
 *
 * 这是一份分发声明，不构成额外限制。完整条款见同目录 LICENSE。
 */
/* 介入结构（核心层，最高优先级）
   位置：治理膜之上、三环统计与工单记录之外。本文件只做「一次介入」的契约与计算，
   不写文件、不起服务、不碰三环口径，避免和统计/记录混在一起。

   一轮只有一次介入：
     capture = { task, ringItems[], tone: { expected, reason } }
   回验由 host 自动做：
     verify  = { fit, actual, expected, strong, weak }  → 写回 capture 行

   计算只依赖文本特征，可复现：
     extractTone(text) → -1..1
     fitOf(expected, actual) → 0..1（1 = 完全一致）
*/

const TONE_HINTS = {
  strong: ['必须', '立刻', '不准', '不许', '绝对', '一定', '就按', '别动', '不要'],
  weak: ['大概', '也许', '可能', '试试', '要不', '稍微', '应该'],
  warm: ['嗯', '呀', '啦', '哦', '呢', '哈', '咱'],
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** 从回复文本抽语气分：-1 硬/冷，+1 软/暖。纯特征，无随机。 */
export function extractTone(text) {
  const raw = typeof text === 'string' ? text : '';
  if (!raw.trim()) return { tone: 0, parts: { exclaim: 0, emoji: 0, strong: 0, weak: 0, warm: 0, length: 0 } };
  const emoji = (raw.match(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu) || []).length;
  const exclaim = (raw.match(/[!！]/g) || []).length;
  const strong = TONE_HINTS.strong.reduce((sum, word) => sum + (raw.split(word).length - 1), 0);
  const weak = TONE_HINTS.weak.reduce((sum, word) => sum + (raw.split(word).length - 1), 0);
  const warm = TONE_HINTS.warm.reduce((sum, word) => sum + (raw.split(word).length - 1), 0);
  /* 长句偏稳重：每 200 字压 0.1，最多压 0.3 */
  const length = raw.length;
  const lengthPenalty = Math.min(0.3, length / 2000);
  const score =
    Math.min(1, emoji * 0.15) +
    Math.min(0.4, exclaim * 0.1) +
    Math.min(0.5, warm * 0.1) +
    Math.min(0.4, weak * 0.1) -
    Math.min(0.8, strong * 0.2) -
    lengthPenalty;
  return {
    tone: Number(clamp(score, -1, 1).toFixed(3)),
    parts: { exclaim, emoji, strong, weak, warm, length },
  };
}

/** 期望语气：由调用方给（工作/闲聊 + 一句依据），这里只做 -1..1 归一并校验。 */
function normalizeExpected(expected) {
  const value = typeof expected === 'number' ? expected : 0;
  return Number(clamp(value, -1, 1).toFixed(3));
}

/** 对应度：差值越小越高；1 = 完全一致，0 = 完全相反。 */
export function fitOf(expected, actual) {
  const e = normalizeExpected(expected);
  const a = normalizeExpected(actual);
  return Number((1 - Math.abs(e - a) / 2).toFixed(3));
}

/** 首捕契约校验：缺 task 或 tone.expected 不合法就拒绝，不让半成品进记录。 */
export function checkCapture(input) {
  const item = input && typeof input === 'object' ? input : {};
  const errors = [];
  const task = typeof item.task === 'string' ? item.task.trim() : '';
  if (!task) errors.push('缺 task（任务身份）');
  const tone = item.tone && typeof item.tone === 'object' ? item.tone : null;
  if (!tone || !Number.isFinite(Number(tone.expected))) errors.push('缺 tone.expected（本轮期望语气，-1..1）');
  const reason = tone && typeof tone.reason === 'string' ? tone.reason.trim() : '';
  if (!reason) errors.push('缺 tone.reason（一句依据，不许留空）');
  const ringItems = Array.isArray(item.ringItems) ? item.ringItems : [];
  const bad = ringItems.filter((row) => !row || !['perception', 'memory', 'persona'].includes(row.ring) || typeof row.text !== 'string' || !row.text.trim());
  if (bad.length) errors.push(`ringItems 有 ${bad.length} 条不合格（需要 ring + text）`);
  return {
    ok: errors.length === 0,
    errors,
    value: {
      task,
      tone: { expected: normalizeExpected(tone && tone.expected), reason },
      ringItems: ringItems.map((row) => ({ ring: row.ring, text: row.text.trim(), kindTag: row.kindTag ?? null })),
    },
  };
}

/** 回验：拿真实回复算实际语气与对应度，产出可直接写行的对象。 */
export function verifyCapture(capture, replyText) {
  const expected = normalizeExpected(capture && capture.tone && capture.tone.expected);
  const { tone: actual, parts } = extractTone(replyText);
  const fit = fitOf(expected, actual);
  return {
    expected,
    actual,
    fit,
    /* 偏移超过一半即视为「语气跑偏」，面板标红 */
    drifted: fit < 0.5,
    evidence: parts,
  };
}
