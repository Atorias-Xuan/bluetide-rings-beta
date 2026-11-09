/* 符号定义表（受控词表）· sym v1
   目的：符号化只允许引用表内符号，表外一律 canonical=null 并记 missing。
   这样「sym」不会自己发明概念——防幻觉靠的是表，不靠提示词。
   规则：id 一经发布不改名（旧数据要靠它解析）；新增只加不改。 */

const SYMBOL_TABLE_VERSION = 1;

export const ROLES = ['predicate', 'entity', 'time', 'modality', 'polarity', 'condition', 'question'];

export const ACTS = ['request', 'inform', 'question', 'objection', 'praise', 'complain', 'commit'];

/* 符号权重（2026-11-01）：重叠度必须加权，否则等于没做区分。
   实测 407 条带 sym 的 entry 两两比对：90% 以上非零，`sym.owner`（你）
   出现在 44% 的行里。两条不相干的句子只要都提到「你」就算重合，
   这层分数就成了「人人有奖」，加进 S 反而掩盖 K/H/A 的真实差异。

   权重按**语义特异性**给，不按当前频次（频次会变，语义不会）：
     0.2  几乎每句话都有的词 —— 命中它不能说明两句在讲同一件事
     0.35 系统核心名词，日常高频但仍有指向
     0.6  具体机制/动作，指向明确
     1.0  罕见概念，一旦命中基本就是同一话题
   另设重叠下限：加权并集 < 0.5 视为「符号太单薄」，不给分——
   单靠一个「你」撑起来的行不该和任何句子判重合。 */
const BASE_WEIGHT = {
  'sym.owner': 0.2,
  'sym.rings': 0.35, 'sym.memory': 0.35, 'sym.persona': 0.35,
  'sym.perception': 0.35, 'sym.task': 0.35, 'sym.chat': 0.35, 'sym.code': 0.35,
  'sym.emotion': 0.6, 'sym.verify': 0.6, 'sym.formula': 0.6, 'sym.share': 0.6,
  'sym.judge': 0.6, 'sym.recall': 0.6, 'sym.symbolize': 0.6, 'sym.startup': 0.6,
  'sym.paper': 0.6, 'sym.plan': 0.6, 'sym.check': 0.6,
};

/* 取符号权重；表外 / 未知 id 一律 1.0（宁可算准，不给不确定的降权） */
export function symbolWeight(id) {
  const key = String(id == null ? '' : id);
  return Object.prototype.hasOwnProperty.call(BASE_WEIGHT, key) ? BASE_WEIGHT[key] : 1.0;
}

/* 每个词条：id（稳定）、term（主词）、aliases（同义）、anchor（接地锚点） */
export const SYMBOLS = [
  { id: 'sym.perception', term: '感知', aliases: ['感知环', '输入'], anchor: 'ring:perception' },
  { id: 'sym.memory', term: '记忆', aliases: ['记忆环', '召回'], anchor: 'ring:memory' },
  { id: 'sym.persona', term: '人格', aliases: ['人格环', '语气', '风格'], anchor: 'ring:persona' },
  { id: 'sym.rings', term: '三环', aliases: ['三环占比', '环'], anchor: 'ring:all' },
  { id: 'sym.symbolize', term: '符号化', aliases: ['sym', '符号'], anchor: 'module:symbolize' },
  { id: 'sym.verify', term: '验证', aliases: ['验证闭环', '回验'], anchor: 'module:verify' },
  { id: 'sym.formula', term: '公式', aliases: ['新公式', '打分', '权重'], anchor: 'module:formula' },
  { id: 'sym.share', term: '占比', aliases: ['配额', '比例'], anchor: 'module:ratio' },
  { id: 'sym.emotion', term: '情绪', aliases: ['心情', '感受'], anchor: 'module:affect' },
  { id: 'sym.recall', term: '召回', aliases: ['检索'], anchor: 'module:recall' },
  { id: 'sym.task', term: '任务', aliases: ['工单'], anchor: 'level:task' },
  { id: 'sym.chat', term: '闲聊', aliases: ['聊天'], anchor: 'level:chat' },
  { id: 'sym.judge', term: '判定', aliases: ['判断'], anchor: 'module:gate' },
  { id: 'sym.startup', term: '启动', aliases: ['开机', '起不来'], anchor: 'module:boot' },
  { id: 'sym.boot_fail', term: '启动不了', aliases: ['崩了'], anchor: 'module:boot' },
  { id: 'sym.code', term: '代码', aliases: ['实现', '源码'], anchor: 'object:code' },
  { id: 'sym.paper', term: '论文', aliases: ['文献'], anchor: 'source:paper' },
  /* ── 2026-11-01 扩表（第一轮 canon 命中率实测 63/109 条全空，表太小） ──
     只收「明确指向系统里一个真实概念」的词；不收「你/我/这个」这类高频泛词，
     否则会把不相关的句子全串起来，比不命中更糟。
     注意别与上表别名重复：byWord 先到先得，重复的静默失效。 */
  { id: 'sym.interior', term: '内源情绪', aliases: ['内源'], anchor: 'module:interior' },
  { id: 'sym.fulfill', term: '兑现', aliases: ['兑现度', '说到做到'], anchor: 'module:interior' },
  { id: 'sym.clarity', term: '清晰度', aliases: ['搞懂', '没搞懂'], anchor: 'module:interior' },
  { id: 'sym.stability', term: '稳定度', aliases: ['不稳定'], anchor: 'module:interior' },
  { id: 'sym.concept', term: '概念层', aliases: ['定义绑定'], anchor: 'module:concept' },
  { id: 'sym.intent', term: '意图', aliases: ['诉求'], anchor: 'module:concept' },
  { id: 'sym.empathy', term: '共情', aliases: ['回应深度'], anchor: 'module:concept' },
  { id: 'sym.daily', term: '闲聊经验', aliases: ['日常记忆'], anchor: 'area:daily' },
  { id: 'sym.field', term: '字段', aliases: ['落盘'], anchor: 'module:store' },
  { id: 'sym.chain', term: '链路', aliases: ['全链路'], anchor: 'module:chain' },
  { id: 'sym.fix', term: '修复', aliases: ['改正', '改好'], anchor: 'action:fix' },
  { id: 'sym.pack', term: '打包', aliases: ['发包'], anchor: 'action:pack' },
  { id: 'sym.restart', term: '重启', aliases: ['重开'], anchor: 'action:restart' },
  { id: 'sym.nickname', term: '称呼', aliases: ['昵称', '叫我'], anchor: 'relation:name' },
  { id: 'sym.owner', term: '你', aliases: [], anchor: 'relation:owner' },
  { id: 'sym.plan', term: '方案', aliases: ['怎么改'], anchor: 'object:plan' },
  { id: 'sym.check', term: '自检', aliases: ['核对'], anchor: 'action:check' },
  { id: 'sym.rollback', term: '回滚', aliases: ['撤销'], anchor: 'action:rollback' },
  { id: 'sym.error', term: '报错', aliases: ['出错', '失败'], anchor: 'object:error' },
  { id: 'sym.testcase', term: '测试', aliases: ['用例', '断言'], anchor: 'action:test' },
  { id: 'sym.gap', term: '缺口', aliases: ['漏洞', '断点'], anchor: 'object:gap' },
  { id: 'sym.deceive', term: '以为懂了', aliases: ['想当然'], anchor: 'lesson:false-understanding' },
];

const byWord = new Map();
for (const entry of SYMBOLS) {
  byWord.set(entry.term, entry);
  for (const alias of entry.aliases) if (!byWord.has(alias)) byWord.set(alias, entry);
}

/* 从一段文本里挑出表内词条（长词优先，避免「记忆」吃掉「记忆环」） */
export function symbolsIn(text) {
  const body = String(text == null ? '' : text);
  const hits = [];
  const seen = new Set();
  for (const [word, entry] of byWord) {
    if (!word || seen.has(entry.id)) continue;
    if (!body.includes(word)) continue;
    seen.add(entry.id);
    hits.push({ entry, word });
  }
  return hits.sort((a, b) => b.word.length - a.word.length);
}

/* 校验一个 sym：canon 必须为空或表内 id（防手写/模型编造符号） */
export function validateSym(sym) {
  const unknown = [];
  if (!sym || typeof sym !== 'object') return { ok: false, unknown: ['not-an-object'] };
  const allowed = new Set(SYMBOLS.map((entry) => entry.id));
  for (const unit of Array.isArray(sym.units) ? sym.units : []) {
    const canon = unit && unit.canon;
    if (canon == null) continue;
    if (!allowed.has(canon)) unknown.push(String(canon));
  }
  return { ok: unknown.length === 0, unknown };
}
