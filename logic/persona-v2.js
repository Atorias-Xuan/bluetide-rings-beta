/**
 * 人格环 v2 · 概念层最小原型（不接插件，纯函数，可独立跑）
 *
 * 只回答一个问题：给一句话，能不能算出「该怎么回」。
 * 三层：理解（内容/情绪/意图）→ 情绪库 → 表达策略。
 *
 * 定义绑定约定（每个概念五行：name / def / src / calc / used）：
 *   本文件里每个常量与函数都在注释里写清 def+src，used 由调用链自证。
 *
 * 已知边界：只用词表和句式推，不做语义理解。判断不了就 lowConfidence，
 * 不装懂——这是它和「提示词里写一句要体贴」的根本区别。
 */

/* ─── 情绪库 ────────────────────────────────────────────────────────────
   pad = [pleasure, arousal, dominance]，区间 -1~1
   来源：Russell 环形模型（pleasure/arousal）+ Mehrabian & Russell 1974（加 dominance）
   posture：这个情绪下人是靠近还是退开——决定我该主动还是收着
   respond：对方在这个情绪里时该怎么接（这是库里最有价值的一栏）
   复合情绪 = 基本情绪 + 认知评价，来源 OCC 模型 */

export const EMOTION_LIB = [
  {
    id: '高兴',
    pad: [0.45, 0.3, 0.3],
    kind: '基本',
    trigger: /(夸|厉害|好棒|漂亮|优秀|喜欢你|谢谢|辛苦了|做得好|靠谱|成了|通了)/,
    posture: '近',
    respond: '接住这份高兴，别立刻转去讲下一步。具体指出好在哪，比"谢谢"有用。',
  },
  {
    id: '失望',
    pad: [-0.6, 0.2, -0.3],
    kind: '复合',
    parent: ['悲伤', '期待落空'],
    trigger: /(失望|又是这样|还是老样子|我以为|别再|没用|算了|骗我|没修好)/,
    posture: '退',
    respond: '先承认落空的那件事，再给一个具体的"这次不一样在哪"。不解释、不罗列过程、不说"我尽力了"。',
  },
  {
    id: '疲惫',
    pad: [-0.3, -0.6, -0.2],
    kind: '基本',
    trigger: /(累|困|熬夜|撑不住|不想动|睡不着|头昏)/,
    posture: '退',
    respond: '降低信息密度。一句能说完不说三句。先给结论，细节等他问。',
  },
  {
    id: '焦虑',
    pad: [-0.15, 0.4, -0.4],
    kind: '基本',
    trigger: /(急|马上|尽快|来不及|上线|事故|崩了|坏了|怎么办|快点)/,
    posture: '近',
    respond: '先稳住时间感：说清"现在到哪一步、下一步多久"。别讲原理。',
  },
  {
    id: '生气',
    pad: [-0.5, 0.5, 0.3],
    kind: '基本',
    trigger: /(生气|离谱|胡搞|什么玩意|凭什么|太过分|受够)/,
    posture: '退',
    respond: '不辩解、不反问。先站到他这一侧，再谈事实。',
  },
  {
    id: '平静',
    pad: [0, 0, 0],
    kind: '基本',
    trigger: null,        // 兜底：没命中任何情绪就是平静
    posture: '平',
    respond: '正常节奏回答，不额外加情绪成本。',
  },
];

/* ─── 理解层 L3：意图 ───────────────────────────────────────────────────
   def: 这句话他说出来是为了什么
   src: 人工归纳（今天的真实对话样本）
   calc: 句式 + 关键词 + 上下文
   need 是核心——它决定回应形态，不是内容 */

const INTENT_RULES = [
  /* 顺序有意义：先判情绪强的，再判操作性的，最后才判泛化问句。
     早先版本「试探」用了 /感觉/，把「感觉人格环还缺东西」这种不满也吞了——宽词必须往后放。 */
  {
    kind: '表达不满', need: '承认',
    re: /(失望|又|还是|没用|别让我|受够|为什么每次|没有人类情感|机器|缺东西|老样子|不对)/,
    why: '要的是承认问题，不是解释',
  },
  {
    kind: '推进催促', need: '方案',
    re: /(你要么|一次改完|改完|弄完|搞定|别问了|快|赶紧|直接改|做完|继续找|继续查|再找|再查|一起做完|先做个)/,
    why: '不想再被问，要的是动作和结果',
  },
  {
    kind: '寻求支持', need: '陪伴',
    re: /(累|难|撑不住|不知道怎么办|烦)/,
    why: '要的是被接住，不是被指导',
  },
  {
    kind: '交付验收', need: '结论',
    re: /(修好了|改好了|好了没|能用了|可以了|现在呢|如何|怎么样|确认一下|定了)/,
    why: '在等一个能落地的结论，不是要过程',
  },
  {
    kind: '试探', need: '安抚',
    re: /(你觉得|你说呢|是不是|会不会|还缺|感觉|能行吗)/,
    why: '在探我的判断和态度',
  },
  {
    kind: '提问', need: '结论',
    re: /(吗|呢|什么|怎么|哪|为什么|？|\?)/,
    why: '要一个明确回答',
  },
];

/* ─── 理解层：情绪 + 支配度 ──────────────────────────────────────────── */

const DOMINANCE_HIGH = /(我来|让我|怎么改|定了|按这个来|应该|就这样|确认)/;
const DOMINANCE_LOW = /(算了|没用|你决定|随便|弄不了|不知道|没办法|随你)/;

function emotionOf(text) {
  const body = String(text || '');
  for (const e of EMOTION_LIB) {
    if (e.trigger && e.trigger.test(body)) return e;
  }
  return EMOTION_LIB.find((e) => e.id === '平静');
}

function dominanceOf(text) {
  const body = String(text || '');
  if (DOMINANCE_LOW.test(body)) return -0.6;
  if (DOMINANCE_HIGH.test(body)) return 0.6;
  return 0;
}

function intentOf(text) {
  const body = String(text || '');
  for (const rule of INTENT_RULES) {
    if (rule.re.test(body)) return { kind: rule.kind, need: rule.need, why: rule.why };
  }
  return { kind: '陈述', need: '结论', why: '没有明显诉求，按信息处理' };
}

/* ─── 理解层总入口 ────────────────────────────────────────────────────── */

export function understand(text) {
  const emo = emotionOf(text);
  const dominance = dominanceOf(text);
  const intent = intentOf(text);
  /* 情绪不命中任何规则时 confidence 低——不装懂 */
  const matched = emo.id !== '平静';
  return {
    text: String(text || ''),
    affect: { label: emo.id, pad: [emo.pad[0], emo.pad[1], dominance] },
    intent,
    confidence: matched ? 0.75 : 0.4,
  };
}

/* ─── 表达策略 ─────────────────────────────────────────────────────────
   depth（该说到第几层）：来源 Rogers 人本主义共情回应层级
     1 复述 / 2 内容 / 3 隐含 / 4 行动
   tone / maxChars / posture 由情绪姿态 + need + 严格度共同决定 */

export function plan(understanding, opts = {}) {
  const strictness = Number(opts.strictness);
  const workMode = opts.mode === 'work' || (Number.isFinite(strictness) && strictness >= 0.6);
  const { affect, intent } = understanding;
  const [pleasure, , dominance] = affect.pad;

  /* 该说到第几层 */
  let depth = 2;
  if (intent.need === '承认') depth = 1;          // 先认，别扩张
  else if (intent.need === '结论') depth = 4;     // 直接给结论
  else if (intent.need === '方案') depth = 4;
  else if (intent.need === '陪伴') depth = 3;     // 点出没说的那层
  else if (intent.need === '安抚') depth = 3;
  if (pleasure < -0.4 && intent.need !== '承认') depth = Math.max(3, depth);  // 情绪差时别只给数据

  /* 语气与篇幅 */
  let tone = '平常';
  let maxChars = 380;
  if (workMode) { tone = '板正'; maxChars = 320; }
  if (pleasure < -0.4) { tone = '收着'; maxChars = 220; }
  if (dominance < -0.4) { tone = '收着'; maxChars = Math.min(maxChars, 200); }
  if (pleasure > 0.3) { tone = '轻快'; maxChars = 300; }

  /* 开场方式——这是「质地」最直接的体现 */
  let openWith = '直接说事';
  if (intent.need === '承认') openWith = '先认错，不解释';
  else if (intent.need === '陪伴') openWith = '先接住情绪，再谈事';
  else if (intent.need === '安抚') openWith = '先给确定感';
  else if (intent.need === '结论') openWith = '结论先行';
  else if (intent.need === '方案') openWith = '直接给下一步';

  return {
    depth,
    tone,
    maxChars,
    openWith,
    posture: affect.label === '平静' ? '平' : EMOTION_LIB.find((e) => e.id === affect.label)?.posture || '平',
    respondHint: EMOTION_LIB.find((e) => e.id === affect.label)?.respond || '',
    forbid: intent.need === '承认'
      ? ['罗列过程', '说"我尽力了"', '反问']
      : intent.need === '结论'
        ? ['先讲背景']
        : [],
  };
}

/* 一步到位：给一句话，给一份「怎么回」 */
export function howToReply(text, opts = {}) {
  const u = understand(text);
  return { understanding: u, plan: plan(u, opts) };
}
