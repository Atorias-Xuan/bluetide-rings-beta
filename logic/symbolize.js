/* 感知环符号化 · sym v1
   职责边界（094 设计定稿，2026-10-31 复核）：
   1) 只描述「这句话说了什么」，不裁决对错、不给行动指令；
   2) 拿不准的进 missing，不猜（M3）；
   3) 每个 unit 保留 surface 原文，可回溯；
   4) ground 必须指向真实锚点（lexicon / 上一层给的 anchor 清单），不编。
   纯函数：无 IO、无时间依赖、不写任何文件。 */

const V = 1;

/* 受控符号表：canon 只能取表内 id。表外一律 null + missing——
   防幻觉靠这张表，不靠提示词。 */
import { symbolsIn, validateSym, symbolWeight } from './symbols.js';
export { validateSym };

const ACT_RULES = [
  { act: 'commit', re: /(我这就|马上做|立刻|这就去|我来|交给我)/ },
  { act: 'request', re: /(帮我|请你|麻烦|给我|去把|去做|改一下|查一下|看一下|实现|加上)/ },
  { act: 'question', re: /(吗[？?]?$|是不是|能不能|可不可以|是否|为什么|怎么|如何|哪[个里])/ },
  { act: 'objection', re: /(不对|错了|不是这样|但是|可是|反而|又回档|过头)/ },
  { act: 'praise', re: /(厉害|好棒|漂亮|优秀|靠谱|做得好|辛苦了)/ },
  { act: 'complain', re: /(烦|失望|难受|崩了|坏了|启动不了|又这样)/ },
];

const MODALITY_RULES = [
  { key: 'must', re: /(必须|一定要|务必|不许|禁止)/ },
  { key: 'need', re: /(需要|要你|得)/ },
  { key: 'can', re: /(可以|能不能|能|允许)/ },
];

const COND_RE = /(如果|假如|要是|一旦|只要|除非)[^，。；？！,;?!]{1,40}/g;
const NEG_RE = /(不|没|别|勿|未|无)/;
const PRONOUN_RE = /(它|他|她|这个|那个|这些|那些|上面|刚才|之前说的)/g;

/* 词表在 symbols.js（受控表）。这里不再自带词条，避免两处定义漂移。 */

function snippet(value, max = 24) {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function splitClauses(text) {
  return String(text || '')
    .split(/[。；;！!？?\n]+|，(?=(?:然后|再|接着|最后|之后))/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function pickAct(text) {
  for (const rule of ACT_RULES) if (rule.re.test(text)) return rule.act;
  return 'inform';
}

function pickModality(text) {
  const out = {};
  for (const rule of MODALITY_RULES) out[rule.key] = rule.re.test(text);
  return out;
}

function polarityOf(text) {
  return NEG_RE.test(text) ? -1 : 1;
}

function entitiesOf(text) {
  const found = [];
  const add = (kind, surface) => {
    const value = String(surface || '').trim();
    if (!value || value.length < 2) return;
    if (found.some((item) => item.surface === value)) return;
    found.push({ kind, surface: value });
  };
  for (const match of String(text).matchAll(/[「『"“]([^」』"”]{1,30})[」』"”]/g)) add('quoted', match[1]);
  for (const match of String(text).matchAll(/[A-Za-z]:\\[^\s，。；]+/g)) add('path', match[0]);
  for (const match of String(text).matchAll(/\b[a-z][a-z0-9_-]{2,}\.(?:js|mjs|json|md|yml|ndjson)\b/gi)) add('file', match[0]);
  for (const match of String(text).matchAll(/\b(?:bluetide|dsh|qqbot)[a-z0-9_-]*\b/gi)) add('system', match[0]);
  return found;
}

export function symbolize(text, options = {}) {
  const raw = String(text == null ? '' : text);
  const trimmed = raw.trim();
  const anchors = Array.isArray(options.anchors) ? options.anchors : [];

  const clauses = splitClauses(trimmed);
  const act = pickAct(trimmed);
  const modality = pickModality(trimmed);
  const polarity = trimmed ? polarityOf(trimmed) : 0;

  const entities = entitiesOf(trimmed);
  const lexiconHits = symbolsIn(trimmed);

  const units = [];
  let unitId = 0;
  const pushUnit = (role, surface, canon) => {
    const text = String(surface == null ? '' : surface).trim();
    if (!text) return;
    unitId += 1;
    /* canon 只能显式给（表内 id）或 null；未给时按 null 处理，绝不拿原文冒充符号 */
    units.push({ id: `u${unitId}`, role, surface: snippet(text), canon: canon === undefined ? null : canon });
  };

  /* 谓词的 canon 不填行为类别（act 是分类不是符号），留 null 由表决定 */
  pushUnit('predicate', clauses[0] ? snippet(clauses[0]) : '', null);
  for (const entity of entities) pushUnit('entity', entity.surface, null);
  for (const hit of lexiconHits) pushUnit('entity', hit.word, hit.entry.id);

  const conditions = [];
  for (const match of trimmed.matchAll(COND_RE)) {
    const head = String(match[0]).replace(/^(如果|假如|要是|一旦|只要|除非)/, '').trim();
    conditions.push({ if: snippet(head, 40), then: null });
  }

  const references = [];
  for (const match of trimmed.matchAll(PRONOUN_RE)) references.push({ kind: 'pronoun', surface: match[0], target: null });

  const anchorPool = new Set(anchors.map((item) => String(item)));
  const ground = [];
  for (const hit of lexiconHits) ground.push({ unitId: null, anchor: hit.entry.anchor });
  for (const anchor of anchorPool) ground.push({ unitId: null, anchor });

  const missing = [];
  if (!trimmed) missing.push('空输入：无任何可编码内容');
  if (act === 'question' && !entities.length) missing.push('疑问缺少对象');
  if (references.length && references.every((item) => !item.target)) missing.push('指称未消解（代词/省略）');
  if (conditions.length && conditions.some((item) => !item.then)) missing.push('条件缺后件');
  if (!lexiconHits.length && !entities.length) missing.push('无锚点：无可接回的既有概念');
  /* 表外词：只留原文，不猜它是什么符号 */
  const unbound = units.filter((unit) => unit.canon == null).map((unit) => unit.surface);
  if (unbound.length) missing.push(`未收录符号（不猜）：${unbound.slice(0, 6).join('、')}`);

  const recognized = lexiconHits.length + entities.length + (conditions.length ? 1 : 0);
  const confidence = trimmed
    ? Math.max(0.05, Math.min(0.95, Number((0.35 + recognized * 0.12).toFixed(2))))
    : 0;

  return {
    v: V,
    form: { text: snippet(trimmed, 80), len: raw.length, clauses: clauses.length },
    units,
    frame: {
      act,
      agentHint: /你|你(?!们)/.test(trimmed) ? 'user' : null,
      targetHint: entities.length ? entities[0].surface : null,
      object: clauses.length > 1 ? snippet(clauses.slice(1).join('；'), 40) : null,
    },
    polarity,
    modality,
    conditions,
    references,
    ground,
    confidence,
    missing,
  };
}

/* 旧行没有 sym：视为「未符号化」，检索回退词元。这里只给判定，不做补写。 */
export function hasSymbol(value) {
  return Boolean(value && typeof value === 'object' && value.v && Array.isArray(value.units));
}

/* 写盘用的紧凑形（2026-11-01）：只保留检索真正需要的两样——受控符号 id 列表 + act。
   完整 sym 树（form / units.surface / conditions / references / ground / missing）
   每行要占 300~600 字节，而 symOverlap 只读 units[].canon 和 frame.act。
   canon 全空时返回 null：这种行对 symOverlap 恒等于 0（空集合早退），
   写进盘里只是噪音——实测 109 条带 sym 的感知行里 63 条属于这种。

   为什么单独抽一个函数：以前写入侧手写了一段 IIFE 拼紧凑形，
   读取侧又自己过滤一遍，两处口径靠人记着保持一致。出一处偏差就断链。
   现在只有一个出口，写入/读取都调它。 */
export function compactSym(sym) {
  if (!hasSymbol(sym)) return null;
  const canons = (sym.units || [])
    .map((unit) => (unit && unit.canon != null ? String(unit.canon) : ''))
    .filter(Boolean);
  if (!canons.length) return null;
  return {
    v: sym.v || V,
    units: canons.map((canon) => ({ canon })),
    frame: { act: (sym.frame && sym.frame.act) || null },
  };
}

/* 检索用：两条 sym 的键重合度（0~1）。人格/记忆只读它，不据此下结论。
   ── 三轮修的记录，每一轮都是上一轮没修透的地方 ──
   第一轮：canon 为空的 unit 不能参与比较。以前 keysOf 用 `String(unit.canon || '')`，
          canon=null 全折成同一个空字符串 key，两条「什么都没认出」的句子算出 1.0。
   第二轮：删掉 actBonus。上一轮只在注释里写了「act 相同也不兜底」，代码仍保留 `+0.2`，
          于是「句式像」白拿分，冒充「概念像」。
   第三轮（本轮）：**改加权**。修完前两轮之后实测仍然不对——
          407 条带 sym 的 entry 两两比对，90% 以上非零，`sym.owner` 出现在 44% 的行里。
          两条毫不相干的句子只要都提「你」就算重合，这层分数等于「人人有奖」，
          加进 S 反而把 K/H/A 的真实差异掩盖掉。
          现在按 symbolWeight 加权，并设下限：加权并集 < 0.5 视为符号太单薄，不给分。 */
const MIN_SYM_WEIGHT = 0.5;

export function symOverlap(a, b) {
  if (!hasSymbol(a) || !hasSymbol(b)) return 0;
  const keysOf = (sym) => new Set(
    sym.units
      .map((unit) => (unit && unit.canon != null ? String(unit.canon) : ''))
      .filter(Boolean),
  );
  const left = keysOf(a);
  const right = keysOf(b);
  if (!left.size || !right.size) return 0;

  let sharedW = 0;
  let unionW = 0;
  for (const key of left) {
    const w = symbolWeight(key);
    unionW += w;
    if (right.has(key)) sharedW += w;
  }
  for (const key of right) if (!left.has(key)) unionW += symbolWeight(key);

  /* 符号太单薄就不判：只有「你」「任务」这类泛词的行，不该和谁都说像 */
  if (unionW < MIN_SYM_WEIGHT) return 0;

  return Math.min(1, Number((sharedW / unionW).toFixed(3)));
}
