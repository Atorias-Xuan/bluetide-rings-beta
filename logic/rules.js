/**
 * 三环 · 入口判定（纯逻辑层）
 *
 * 一句话怎么判「任务 / 闲聊」，只在这里。判据是**加权打分**，不是「命中一个词就算任务」：
 *   强任务词 +3（明确动作要求：帮我/改一下/修复/部署……）
 *   弱任务词 +1 每个（最多 +2，且整句要够长，否则「看」一个字也算任务）
 *   闲聊词   −2（情绪/语气词）
 *   长句     +1（≥20 字，说明在交代事）
 *   ≥2 → 任务级
 *
 * 为什么不判「任务」就完事：外层膜按这个决定注入哪套规则、收尾要不要写执行记录。
 * 判错会让闲聊被要求写任务卡，也会让真任务漏掉自检。
 *
 * 边界：纯函数，不读盘、不写状态；阈值改动只动这个文件，跑全量即可验证。
 */

/* 强任务词 = 明确的动作要求 */
const STRONG_TASK = /(帮我|给我|请你|麻烦你?|改一下|改成|修改|修复|加一下|加上|删掉|删了|去掉|移除|装上|装载|安装|部署|测试|跑一下|跑一遍|生成|实现|接入|回退|撤销|升级|对比|导出|打包|搬到|移到|建一个|查一下|找一下|整理|重做|换成|配置|设定|开启|关闭|检查|验证|补上|补一下|压缩|清理|审计|评估|排查)/;
/* 弱任务词 = 泛动词，要配合长度才算 */
const WEAK_TASK = /(写|看|做|跑|查|找|加|改|换|装|输出|描述|再写)/;
/* 闲聊信号 = 情绪/语气词，减分 */
const CHAT_HINT = /(哈哈|嘿嘿|笑死|好累|好困|困了|心情|可爱|喜欢你|想你|晚安|抱抱|摸鱼|鱼家印|生气|委屈|难过|开心|无聊|啊|呀|呗|嘛|啦)/;

export function classifyLevel(text) {
  const value = typeof text === 'string' ? text.trim() : '';
  if (!value) return { level: 'chat', why: '空输入 → 闲聊级', score: 0, hits: [] };
  const hits = [];
  let score = 0;
  const strong = STRONG_TASK.exec(value);
  if (strong) { score += 3; hits.push(strong[0]); }
  /* 弱词要收集全部：exec 只给第一个，会把同一句里的「看 / 描述」漏掉 */
  const weakHits = [...new Set(Array.from(value.matchAll(new RegExp(WEAK_TASK.source, 'g')), (m) => m[0]))].slice(0, 3);
  if (weakHits.length && value.length >= 8) { score += Math.min(2, weakHits.length); hits.push(...weakHits); }
  const chat = CHAT_HINT.exec(value);
  if (chat) { score -= 2; hits.push(`闲聊「${chat[0]}」`); }
  if (value.length >= 20) { score += 1; hits.push('长句'); }
  if (score >= 2) {
    return { level: 'task', why: `打分 ${score}（${hits.join(' / ')}）→ 任务级`, score, hits };
  }
  return { level: 'chat', why: `打分 ${score}（${hits.join(' / ') || '无信号'}）→ 闲聊级`, score, hits };
}

/* ── 条目状态机与计分（087）──────────────────────────────────────
   active → cooling(×0.3) → archived；冷却期内被验对一次即复活。
   全部是纯函数，时钟由调用方传入，测试可以造任意时间；参数来自 rules.json。

   一条容易被改坏的规则：**曝光不算对**。`hits` 只记「被检索到」，一分不给；
   只有 `proofs`（被验证过对/错）才计分，而且按半衰衰减。
   理由：越热门越正确正好是反的 —— 常被检索到的条目可能只是话题热闹。 */

/* 两处都要用它算「几天几档」，所以导出 —— 别在宿主里再写一份 60*60*1000。 */
export const HOUR_MS = 60 * 60 * 1000;

/* 注意：RULES_STATE / RULES_DECAY 是**活对象**。宿主读 rules.json 之后会直接改这两个的
   字段（cooldown.ticks / states.cooling.weight / decay.halfLifeDays）——
   导出的是绑定，改属性两边都看得见；别改成「重新赋值」，那样宿主就改不动了。 */
export const RULES_STATE = { ticks: 3, tickHours: 24, coolingWeight: 0.3 };
export const RULES_DECAY = { halfLifeDays: 20 };

export function entryStateOf(entry, now = Date.now(), rules = RULES_STATE) {
  if (!entry || typeof entry !== 'object') return 'active';
  if (entry.state === 'archived') return 'archived';
  if (!entry.state || entry.state === 'active' || entry.state === 'revived') return 'active';
  const cooledAt = Date.parse(entry.cooledAt);
  if (!Number.isFinite(cooledAt)) return 'cooling';
  const tickMs = Math.max(1, rules.tickHours) * HOUR_MS;
  const ticks = Math.floor(Math.max(0, now - cooledAt) / tickMs);
  return ticks >= Math.max(1, rules.ticks) ? 'archived' : 'cooling';
}

export function stateWeightOf(state, rules = RULES_STATE) {
  if (state === 'archived') return 0;
  if (state === 'cooling') return rules.coolingWeight;
  return 1;
}

export function scoreOf(entry) {
  const src = (entry && entry.score) || {};
  const proofs = Number.isFinite(src.proofs) ? src.proofs : 0;
  return {
    hits: Number.isFinite(src.hits) ? src.hits : 0,
    proofs,
    /* v1.15.3 展示用：真实次数。老数据没这个字段时退化成 proofs，行为不变 */
    uses: Number.isFinite(src.uses) ? src.uses : proofs,
    /* 087 学习环第 6 步：被指错的**累计次数**。与 proofs 不同 ——
       proofs 是「净分」，错到底也不下 0；errs 只增不减，用来算复发率。
       老数据没有这个字段时按 0，行为不变。 */
    errs: Number.isFinite(src.errs) ? src.errs : 0,
  };
}

/* 曝光：只加 hits，一分不给 */
export function bumpHit(entry) {
  const base = entry && typeof entry === 'object' ? entry : {};
  const score = scoreOf(base);
  return { ...base, score: { ...score, hits: score.hits + 1 } };
}

/* 验证：对 +1、错 -1，下限 0（错到底也不倒扣成负数）。
   087：被指错时另外累加 errs —— 净分会被「对」抵消，errs 不会，
   否则「对三次错三次」和「从没动过」看起来一模一样，复发率就没了。 */
export function bumpProof(entry, delta = 1) {
  const base = entry && typeof entry === 'object' ? entry : {};
  const score = scoreOf(base);
  const step = delta < 0 ? -1 : 1;
  const next = { ...score, proofs: Math.max(0, score.proofs + step) };
  if (step < 0) next.errs = score.errs + 1;
  return { ...base, score: next };
}

/* 计分：proofs 按半衰衰减；hits 不参与 */
export function effectiveProofs(entry, now = Date.now(), rules = RULES_DECAY) {
  const { proofs } = scoreOf(entry);
  if (proofs <= 0) return 0;
  const anchor = Date.parse((entry && entry.provedAt) || (entry && entry.ts));
  if (!Number.isFinite(anchor)) return proofs;
  const days = Math.max(0, now - anchor) / (24 * HOUR_MS);
  const halfLife = Math.max(1, rules.halfLifeDays);
  return proofs * Math.pow(0.5, days / halfLife);
}

/* 候选排序：先看有效 proofs（多者优先），再看新旧 */
export function rankEntries(entries, now = Date.now()) {
  const rows = Array.isArray(entries) ? entries : [];
  return rows.slice().sort((a, b) => {
    const diff = effectiveProofs(b, now) - effectiveProofs(a, now);
    if (diff !== 0) return diff;
    return String(b.ts).localeCompare(String(a.ts));
  });
}

/* ── 087 第 6 步：同类错误复发率 ──────────────────────────────────
   经验区前面五步（记 / 判 / 写回 / 取 / 升）都在，缺的是「它到底管不管用」。
   唯一能回答这个问题的指标：**同一 topic 上被指错的次数 ÷ 该 topic 被验证的次数**。

   为什么按 topic 而不是按条目：经验是「一文一事」存在 topic 抽屉里的，
   同一个坑换一行字写，仍然算同一个坑。按条目算会永远算出 0。

   为什么用 errs 而不是 proofs：proofs 是净分，对一次能把错一次抵掉；
   复发率要的是「错过几次」这个事实，不能被后来的正确抹掉。 */

export const RULES_RECUR = {
  /* ≥0.5：两次验证里至少错一次，该条目视为「没学会」 */
  threshold: 0.5,
  /* 少于两次验证不判 —— 只错过一次就定罪，样本太薄 */
  minExposures: 2,
  /* 是否让复发率直接触发冷却。默认关：先只统计、只在面板显示，
     等数字看准了再打开（打开后行为变化是全局的）。 */
  autoCool: false,
};

/* 一个 topic 的复发情况。entries 传该环全部条目即可。 */
export function recurrenceOf(entries, topic, opts = {}) {
  const rows = Array.isArray(entries) ? entries : [];
  const want = String(topic == null ? '' : topic);
  let errs = 0;
  let exposures = 0;
  let n = 0;
  for (const row of rows) {
    if (!row || String(row.topic || '') !== want) continue;
    const s = scoreOf(row);
    n += 1;
    errs += s.errs;
    /* 曝光：被验证过的次数。uses 是新字段，老数据退化成 proofs + errs */
    exposures += Math.max(s.uses, s.proofs + s.errs, s.errs);
  }
  const minExposures = Number.isFinite(opts.minExposures) ? opts.minExposures : RULES_RECUR.minExposures;
  const rate = exposures > 0 ? errs / exposures : 0;
  return {
    topic: want,
    entries: n,
    errs,
    exposures,
    rate: Number(rate.toFixed(4)),
    /* 样本够不够判 */
    judged: exposures >= Math.max(1, minExposures),
  };
}

/* 该条目所在 topic 的复发率（供单条目展示） */
export function recurrenceOfEntry(entry, entries, opts = {}) {
  if (!entry) return recurrenceOf([], '', opts);
  return recurrenceOf(entries, entry.topic, opts);
}

/* 该不该因复发而降级。autoCool 关着时永远返回 false —— 只统计不动状态。 */
export function shouldCoolByRecurrence(entry, entries, opts = {}) {
  const cfg = { ...RULES_RECUR, ...opts };
  if (!cfg.autoCool) return false;
  const r = recurrenceOfEntry(entry, entries, cfg);
  if (!r.judged) return false;
  return r.rate >= cfg.threshold;
}

/* 面板用：整环的复发概览（哪些 topic 没学会） */
export function recurrenceSummary(entries, opts = {}) {
  const rows = Array.isArray(entries) ? entries : [];
  const topics = [...new Set(rows.map((r) => r && r.topic).filter(Boolean))];
  const list = topics.map((t) => recurrenceOf(rows, t, opts)).filter((r) => r.judged);
  list.sort((a, b) => b.rate - a.rate);
  const totalErrs = rows.reduce((n, r) => n + scoreOf(r).errs, 0);
  const totalExp = rows.reduce((n, r) => {
    const s = scoreOf(r);
    return n + Math.max(s.uses, s.proofs + s.errs, s.errs);
  }, 0);
  return {
    topics: list.length,
    judged: list.length,
    errs: totalErrs,
    exposures: totalExp,
    rate: totalExp > 0 ? Number((totalErrs / totalExp).toFixed(4)) : 0,
    worst: list.slice(0, 5),
    /* 反复错到底的：rate 超阈值 */
    notLearned: list.filter((r) => r.rate >= (opts.threshold ?? RULES_RECUR.threshold)).length,
  };
}
