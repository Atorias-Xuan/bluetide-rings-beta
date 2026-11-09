/**
 * 三环 · 印章与任务码（纯逻辑层）
 *
 * 时间码是全工程的通用语言：工单、快照、记忆条目、面板、交叉比对都靠它认亲。
 * 这层只做三件事：造码、拆码、比码；不读盘、不发事件。
 *
 * 两个必须守住的约定（都是被坑出来的）：
 *   1. 三位代号（#ABC / ABC / 086）**不是身份**，到 taskCode 必须原样返回；
 *      以前代号被当成任务名再哈希一遍（taskCode('#906')='4EA'），一行生一个新任务。
 *   2. 交叉比对认「同码 + 同一瞬间」（容差 1 秒），不要求字符串完全相等：
 *      工单与环行分两次写，跨秒就会各盖各的码，苛刻相等会误报「捕捉 0 行」。
 */
import { createHash } from 'node:crypto';

const pad = (n) => String(n).padStart(2, '0');
/* 只用于「没有数字可用」时派生三位码；与 index.js 的 sha 同算法，各自独立不互相依赖 */
const shortHash = (text) => createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);

const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

/* 时间码的核心：261028T085650（本地时间，2 位年） */
export const stampCore = (date) =>
  `${String(date.getFullYear()).slice(2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

/* 三位代号：只用于「代号不许再算代号」与显示，不当身份 */
export function isTaskCode(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^#?[0-9A-F]{3}$/i.test(text);
}

/* 有身份的任务：①英文前缀+编号（work-086 / duty-086）②三位以上编号 + slug（089-settings-page）
   ③任务仓里按全名或前缀认得出名字。其余（086 / ABC / #ABC）只是代号。 */
const TASK_ID_PREFIXED = /^(work|duty)-\d+$/i;
const TASK_ID_SLUG = /^\d{3,}-[a-z0-9-]+$/i;
export function isTaskIdentity(task, nameOf) {
  const text = typeof task === 'string' ? task.trim() : '';
  if (!text) return false;
  if (TASK_ID_PREFIXED.test(text) || TASK_ID_SLUG.test(text)) return true;
  return typeof nameOf === 'function' ? Boolean(nameOf(text)) : false;
}

export function taskCode(task) {
  const text = typeof task === 'string' ? task.trim() : '';
  if (!text) return '---';
  if (isTaskCode(text)) return text.replace(/^#/, '').toUpperCase();
  /* 「任务 #ABC」是「还没起名、先用代号顶着」的占位写法，码要原样沿用 */
  const placeholder = /^任务\s*#?([0-9A-F]{3})$/i.exec(text);
  if (placeholder) return placeholder[1].toUpperCase();
  /* work-086 / duty-086：身份带编号，显示码直接用编号，码与编号同义 */
  const tail = /\d+$/.exec(text);
  if (tail && /^(work|duty)-\d+$/i.test(text)) {
    const num = tail[0];
    return num.length >= 3 ? num.slice(0, 3) : num.padStart(3, '0');
  }
  const num = /^(\d+)/.exec(text);
  if (num) return num[1].length >= 3 ? num[1].slice(0, 3) : num[1].padStart(3, '0');
  return shortHash(text).slice(0, 3).toUpperCase();
}

/* 只算不占号：给「时间基准」行与快照用 */
export const stampPreview = (date, task) => `${stampCore(date)}#${taskCode(task)}`;

/* 同一秒可能多次开单：同码递增尾缀（…#4EA.2）。表满 1000 就淘汰最早的一个。 */
const stampSeen = new Map();
export function stampOf(date = new Date(), task = null) {
  const base = stampPreview(date, task);
  const seen = (stampSeen.get(base) || 0) + 1;
  if (stampSeen.size > 1000) {
    const first = stampSeen.keys().next().value;
    if (first !== undefined) stampSeen.delete(first);
  }
  stampSeen.set(base, seen);
  return seen === 1 ? base : `${base}.${seen}`;
}

/* 时间码拆解：261028T085650#4EA[.2] → { at, code }；解析不出来返回 null（不猜）。 */
export const STAMP_SKEW_MS = 1000;
export function stampParts(stamp) {
  const text = String(stamp || '');
  /* stampOf 的重复序号加在码后面（…#4EA.2），所以码与尾缀两处都要能吃 */
  const match = /^(\d{2})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.\d+)?#(.+?)(?:\.\d+)?$/.exec(text);
  if (!match) return null;
  const [, yy, mm, dd, hh, mi, ss, code] = match;
  const at = new Date(2000 + Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss)).getTime();
  if (!Number.isFinite(at)) return null;
  return { at, code };
}

/* 交叉比对认亲：同码 + 1 秒内；拆不出来就退回字符串相等。 */
export function sameCapture(stampA, stampB) {
  const a = stampParts(stampA);
  const b = stampParts(stampB);
  if (!a || !b) return String(stampA || '') === String(stampB || '');
  return a.code === b.code && Math.abs(a.at - b.at) <= STAMP_SKEW_MS;
}

/* 读取时引入现实时间：条码/时间 → 「多久以前」 */
export function ageText(ts, now = Date.now()) {
  const at = Date.parse(ts);
  if (!Number.isFinite(at)) return '时间未知';
  const diff = now - at;
  if (diff < 45_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))} 分钟前`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} 小时前`;
  const days = Math.round(diff / 86_400_000);
  return days <= 45 ? `${days} 天前` : `${Math.round(days / 30)} 个月前`;
}

export const localText = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

export const weekText = (date = new Date()) => `周${WEEK_CN[date.getDay()]}`;
