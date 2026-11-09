var __btw_notice__ = "BLUETIDE RINGS / GPL-3.0-or-later. Free software: run, modify, redistribute, and sell allowed. Derived works must stay under GPL. Keep this notice and the copyright line. See LICENSE. build V1.0.0βbis-20261109-992aad5a. \u672c\u4ea7\u7269\u4ee5 GPL-3.0 \u8bb8\u53ef\u5206\u53d1\uff1a\u53ef\u8fd0\u884c\u3001\u53ef\u4fee\u6539\u3001\u53ef\u518d\u5206\u53d1\u3001\u53ef\u5546\u7528\uff1b\u6d3e\u751f\u4f5c\u54c1\u987b\u540c\u6837\u4ee5 GPL \u5f00\u653e\u3002\u8bf7\u4fdd\u7559\u672c\u58f0\u660e\u4e0e\u7248\u6743\u884c\u3002"; void __btw_notice__;



/* © 2026 砚尘dust (@Atorias-Xuan) · 蓝潮三环 β v1.0.0-bis
 *
 * 本程序是自由软件：你可以再分发、修改，但必须遵守 GNU 通用公共许可证
 * 第 3 版（或任何更新版本）的条款。它是"传染性"的：你发布基于本程序的
 * 作品，也必须以同样的 GPL 授权，不能改成闭源。
 *
 * 这是一份分发声明，不构成额外限制。完整条款见同目录 LICENSE。
 */
/**
 * 蓝潮 · 三环人格架构（Host 端）
 * 三环是控制层；数据按区落盘：
 *  BLUE Files/01_Perception/记录/perception.ndjson · BLUE Files/02_Memory/记录/memory.ndjson
 *  BLUE Files/03_Persona/记录/persona.ndjson · BLUE Files/04_Execution_Membrane/执行/工作/记录/work.ndjson（任务结束 +24h 清）
 */
import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCapture, verifyCapture } from './intervention.js';
/* 纯逻辑层（2026-10-28 拆分）：占比算式、情绪系数、本能槽都在 logic/mix.js。
   这一层不读盘、不发事件、不碰宿主；index.js 只做接线。 */
import {
  MIX_TRACKED, RATIO, UNITS_VERSION, moodFactor, ratioV4, dampAffect,
  instinctLoad, instinctTick, instinctSave,
} from './logic/mix.js';
/* Flash：ring-weight（v5 环权重）随 v5 芯片一起不发。v4 芯片不需要它，
   面板占比按 v4 协议显示（见 client.js SHARE_PROTOCOLS）。 */
/* 097 · 符号化（094 设计）：只编码、不裁决；失败不能拖垮入口捕捉。
   2026-11-01：validateSym 用于写入前校验；symOverlap 用于检索打分第四项 ——
   此前这两个导出都只有定义没有调用方，防幻觉那道闸和「检索用重合度」都是空的。 */
import { symbolize, validateSym, symOverlap, compactSym } from './logic/symbolize.js';
/* Flash：peer 探测已内联进 readPeer（它的唯一消费者），不再单独成模块 */
import { AUTHOR, creditLine } from './logic/credits.js';
import {
  LAYOUT_VERSION, LAYOUT_DIRNAME, LAYOUT_FILENAME, LAYOUT_REL, LAYOUT_PERSONA_REL,
  LAYOUT_BACKUP_REL, LAYOUT_TASKS_REL, LAYOUT_MATERIALS_REL, LAYOUT_IMAGES_REL,
  layoutPaths, insidePath,
} from './store/layout.js';
/* 人格概念层 v2（2026-11-01）：理解（内容/情绪/意图）→ 情绪库 → 表达策略。
   纯函数、不读盘。入口处算一次存进 turnState，styleOf 消费 hint。
   为什么单独成层：情绪和意图混在正则里推不出「该怎么说」，必须先有概念再谈语气。 */
import { howToReply } from './logic/persona-v2.js';
/* 094 §5 情绪设计：appraisal → 七类情绪（纯函数；与词表增量并列取更强，不叠加） */
import { emotionFromAppraisal, mergeEmotionSources } from './logic/appraisal.js';
/* 内源情绪（2026-11-01）：情绪的第一个源头是我自己干了什么，不是他说了什么。
   依据：稳态驱动（情绪=目标达成后恢复平衡）+ Breazeal Kismet 涌现模型 + Cañamero 激素水平。
   没有这一层时 valence 全部来自 affectOf(text)，那是回声——他说什么我就是什么。 */
import { interiorInit, interiorTick, interiorAffect, composeAffect } from './logic/interior.js';
/* 相似度与评分（2026-10-28 拆分）：时间衰减、极性、词元、相似度、覆盖率、条目身份。
   这一层只算分，不做「要不要写 / 写到哪」的决定。 */
import {
  decayWeight, polarityOf, stripPolarity, gramsOf, similarity, coverage, entryKey,
} from './logic/score.js';
/* 印章与任务码（2026-10-28 拆分）：造码、拆码、比码、时间文案。
   两位约定写在那边的文件头：代号不是身份；交叉比对认「同码 + 1 秒内」。 */
import {
  stampCore, stampOf, stampPreview, taskCode, isTaskCode, isTaskIdentity,
  stampParts, sameCapture, STAMP_SKEW_MS, ageText, localText, weekText,
} from './logic/stamp.js';
/* 入口判定 + 条目状态机（2026-10-28 拆分）：一句话算任务还是闲聊、条目的
   冷却/归档与计分，都在这里。RULES_STATE / RULES_DECAY 是活对象 ——
   宿主读 rules.json 之后直接改它们的字段，只能改属性，不能重新赋值。 */
import {
  classifyLevel, HOUR_MS, RULES_STATE, RULES_DECAY,
  entryStateOf, stateWeightOf, scoreOf, bumpHit, bumpProof, effectiveProofs, rankEntries,
  /* 087 第 6 步（2026-11-09）：经验区的验证环节 —— 同类错误有没有再犯。
     前面五步（记/判/写回/取/升）决定「存了什么」，这一步决定「存的东西管不管用」。 */
  recurrenceSummary, recurrenceOf, shouldCoolByRecurrence, RULES_RECUR,
} from './logic/rules.js';
/* 文件与文本（2026-10-28 拆分，work-092）：解析白名单、判龄、清理判定、单文件串行锁。
   锁与 24h 口径都跟着搬过去 —— 判定和 IO 挨着的时候，「偶发丢行」查不出来。 */
import {
  WORK_TTL_MS, hoursUntilGone, lines, parseJson, withFileLock, appendArea,
  parseExecutionText, parseWorkText, planSweep, planPurge, RING_LABEL, PURGE_TYPES,
} from './store/files.js';
/* 结算 · 判断卡（2026-10-29 拆出，work-092）：只拼「依据与缺口」，不碰账。
   单调时间与截断由宿主注入 —— 这两套口径全仓只许有一处。 */
import { buildSettlePacket } from './settle/packet.js';
/* 路由的两个共用动作（2026-10-29 拆出）：「只认回环」与「发 JSON」各只留一份。
   以前四个端点各抄一遍安全判定，漏一处就是一条静默的越权口子。 */
import { createRoutes } from './routes/index.js';
/* 094 §11 检索打分（2026-11-01 接入）。此前它只是 logic/formula.js 里的纯函数，
   真正的选择器还在用旧的 P/H/R 加权和 —— 模型写好了却没通电。现在 searchPool 用它排序。 */
import {
  activationOf, activationScore, retrievalScore, retrievalPosterior, RETRIEVAL_V5,
} from './logic/formula.js';
/* 经验联想（2026-11-09）：经验正文一直在盘上，但过去只拿它算「命中数」，
   正文从不进上下文 —— 于是经验等于不存在。这里只负责「认出来、摆到眼前」，
   采不采用由模型自己判断（见 associateLine 的措辞）。 */
/* Flash：经验联想整块不发（开发者版能力）——它只服务 gate 段那段拼接，已一并移除 */
/* 2026-11-09 衰减接线：按区传 tau 需要幂律本体。tau 是**参数**（config.decay.tauByArea），
   不是实现；这里只是把参数喂进去。 */
import { retentionOf } from './logic/forgetting.js';
/* 三环占比 · 单芯片插座（2026-11-09）：插 v4 就只跑 v4，插 v5 就只跑 v5。
   095 定过 v5 是 v4 的替换升级，不是并列项 —— 两者产出的是同一件事。 */
import { pickShares, CHIP_NAMES } from './logic/shares/index.js';

/* 默认落点不写死本机路径：显式配置 > BLUETIDE_WORKSPACE > 当前工作目录。
   下面几个常量只用于「认领已有清单」与兜底建目录，不假设盘符。 */
/* 2026-11-01 修复：先前直接取 cwd，宿主进程的 cwd 不是工作区，
   于是新建了一套空工作区，把「读自己的数据」变成「读一份空的」。
   现在从插件自身位置向上找工作区（含 BLUE Files 的那一层）：
   本机装在哪都能认回自己的数据，别人装到自己工作区下也一样，
   包里仍然不写死任何人的盘符。 */
function workspaceNearSelf(start) {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'BLUE Files'))) return dir;
    const up = dirname(dir);
    if (!up || up === dir) break;
    dir = up;
  }
  return null;
}
const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_WORKSPACE = process.env.BLUETIDE_WORKSPACE || workspaceNearSelf(SELF_DIR) || process.cwd();
const DEFAULT_ROOT = join(DEFAULT_WORKSPACE, 'BLUE Files', '03_Persona', 'persona');
const ENDPOINT = '/bluetide-rings/persona.json';
const ACT_ENDPOINT = '/bluetide-rings/act';
/* 桌宠形象图：把桌宠当前用的那张图直接吐给设置页展示（全图） */
const PET_IMAGE_ENDPOINT = '/bluetide-rings/pet-image';
/* 人格切换/形象替换用的本机文件浏览：只读列目录，范围就是工作区，不联网。 */
const FS_ENDPOINT = '/bluetide-rings/fs';
const FS_MAX_ENTRIES = 400;
const IMAGE_PICK_EXT = /\.(png|jpe?g|webp|gif)$/i;
const PERSONA_PICK_EXT = /\.(md|markdown|json|ya?ml|txt)$/i;
const PERSONA_PICK_MAX = 512 * 1024;

/* 完整自我备份：工作区根下「备份/<名字>-完整自我/」，每次覆盖成最新一份。
   只打包人格与四区记录，不碰 04 的工程产物（那是工具，不是我）。 */
const SELF_BACKUP_ROOT = '备份';
const SELF_BACKUP_SUFFIX = '-完整自我';
const COMPLETE_SELF_KIND = 'bluetide.complete-self';
const SELF_SKIP_NAMES = new Set(['备份']);
/* 切换结果只写插件自己的状态文件（不改人格基座）：插件目录下 state.json */
const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(PLUGIN_DIR, 'state.json');
/* 内源情绪状态（2026-11-01）：跟 state.json 同目录，重启不丢。
   存的是「我自己」的累计状态——兑现/清晰/稳定三个内部变量 + 连败计数，
   不是用户情绪。用户情绪仍然走 affectOfSession，两者合成时才见面。 */
const INTERIOR_FILE = join(PLUGIN_DIR, 'interior.json');
function readInteriorState() {
  try {
    const parsed = JSON.parse(readFileSync(INTERIOR_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : interiorInit();
  } catch {
    return interiorInit();
  }
}
function writeInteriorState(s) {
  try {
    writeFileSync(INTERIOR_FILE, JSON.stringify(s), 'utf8');
  } catch (err) {
    liveState.interiorWriteError = String((err && err.message) || err);
  }
}
const SECTION_ORDER = 780;
const DIGEST_REFRESH_MS = 60_000;
/* 2026-11-09（代码审查提示）：延迟入账的兜底冲刷间隔。
   原来是 DIGEST_REFRESH_MS*3 = 180 秒，进程中途被杀最多丢 3 分钟记录；
   改成 10 秒 —— 比收尾那一冲慢一个量级，但被杀时只丢 10 秒。
   不做更短是因为每轮会写几十条，500ms 那种频率会连打好几次 IO。 */
const DEFERRED_FLUSH_MS = 10_000;
/* ── 外层膜 · 两次交汇 + 分级 ──────────────────────────────────
   入口：看本轮用户第一句话，判 任务/闲聊 → 决定注入哪套规则（order 770，排在时间基准之后、记忆摘要之前）；
   出口：本轮收尾回检规则有没有被遵守 → 写一条 gate 行并累计拦截率（自证有效）；
   分级：任务 = 全套（要求写 execution）；闲聊 = 极简（不要求、也不做任务自检）。 */
const GATE_ORDER = 770;
/* 入口判定的三组信号（强任务词 / 弱任务词 / 闲聊信号）2026-10-28 搬到 logic/rules.js，
   这里不留副本 —— 词表放两处，改一处漏一处，判定就会变成两套。 */
const DEFAULT_AREAS = {
  perception: join(DEFAULT_WORKSPACE, 'BLUE Files', '01_Perception', '记录'),
  memory: join(DEFAULT_WORKSPACE, 'BLUE Files', '02_Memory', '记录'),
  persona: join(DEFAULT_WORKSPACE, 'BLUE Files', '03_Persona', '记录'),
  work: join(DEFAULT_WORKSPACE, 'BLUE Files', '04_Execution_Membrane', '执行', '工作', '记录'),
};
const AREA_FILES = { perception: 'perception.ndjson', memory: 'memory.ndjson', persona: 'persona.ndjson', work: 'work.ndjson' };

/* ── 前置环境：单一工作区根 + 布局清单 ─────────────────────────────
   首次加载：建目录、建空 ndjson、写 <根>/BLUE Files/Config/layout.json；之后只认清单里的绝对路径，
   不再猜盘符。旧数据（配置已指向的目录）就地认领，不搬家。清单指向根外 → 拒绝使用。 */
/* 布局常数、layoutPaths、insidePath 已在 103 S5 搬到 store/layout.js：
   它们只依赖 node:path，不认宿主符号，放在主文件里只会让主文件继续变胖。
   名字保持原样从这里再导出，别处不用改。 */

let activeWorkspace = null;
let activeLayoutMeta = null;

function verifyLayout(layout) {
  const problems = [];
  if (!layout || layout.version !== LAYOUT_VERSION) problems.push('清单版本不符');
  if (!layout || typeof layout.workspace !== 'string') problems.push('清单缺少 workspace');
  for (const [key, dir] of Object.entries((layout && layout.areas) || {})) {
    if (typeof dir !== 'string' || !insidePath(layout.workspace, dir)) problems.push(`${key} 不在工作区内`);
  }
  if (!layout || !insidePath(layout.workspace, layout.personaRoot)) problems.push('personaRoot 不在工作区内');
  for (const key of ['tasks', 'materials', 'images']) {
    if (layout && typeof layout[key] === 'string' && layout[key].trim() && !insidePath(layout.workspace, layout[key])) problems.push(`${key} 不在工作区内`);
  }
  for (const key of Object.keys(AREA_FILES)) {
    if (!layout || !layout.areas || !layout.areas[key]) problems.push(`缺少 ${key} 目录`);
  }
  return { ok: problems.length === 0, problems };
}

function readLayoutSync(workspace) {
  try {
    const file = join(workspace, LAYOUT_DIRNAME, LAYOUT_FILENAME);
    if (!existsSync(file)) return null;
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    return raw && typeof raw === 'object' ? raw : null;
  } catch {
    return null;
  }
}

function writeLayoutSync(layout) {
  const dir = join(layout.workspace, LAYOUT_DIRNAME);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, LAYOUT_FILENAME);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(layout, null, 2) + '\n', 'utf8');
  renameSync(tmp, file);
}

/* 087：底层逻辑读 `BLUE Files/Config/rules.json`。
   原则：只替换来源，不改数值——文件里的值与代码默认值一致，所以行为应当完全不变。
   文件缺失或 JSON 坏掉一律回落默认，不抛错：一份配置读不到，不该让插件起不来。 */
let RULES_SOURCE = 'defaults';
function readRulesSync(workspace) {
  try {
    const file = join(workspace, LAYOUT_DIRNAME, 'rules.json');
    if (!existsSync(file)) return null;
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    return raw && typeof raw === 'object' ? raw : null;
  } catch {
    return null;
  }
}
function applyRules(workspace) {
  const raw = readRulesSync(workspace);
  if (!raw) {
    RULES_SOURCE = 'defaults';
    return RULES_SOURCE;
  }
  /* 本函数在模块初始化阶段就会被调用，不能依赖后面才定义的局部 helper，
     所以这里自带一个「是有限数字才取值」的小函数。 */
  const pick = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
  DUP_SIMILARITY = pick(raw.dedupe && raw.dedupe.similarity, DUP_SIMILARITY);
  WORK_ONLY_ALIGNMENT = pick(raw.persona && raw.persona.admission, WORK_ONLY_ALIGNMENT);
  RULES_STATE.ticks = pick(raw.cooldown && raw.cooldown.ticks, RULES_STATE.ticks);
  RULES_STATE.tickHours = pick(raw.cooldown && raw.cooldown.tickHours, RULES_STATE.tickHours);
  RULES_STATE.coolingWeight = pick(raw.states && raw.states.cooling && raw.states.cooling.weight, RULES_STATE.coolingWeight);
  RULES_DECAY.halfLifeDays = pick(raw.decay && raw.decay.halfLifeDays, RULES_DECAY.halfLifeDays);
  if (raw.feedback && typeof raw.feedback === 'object') {
    if (typeof raw.feedback.enabled === 'boolean') RULES_FEEDBACK.enabled = raw.feedback.enabled;
    if (typeof raw.feedback.allowAutoArchive === 'boolean') RULES_FEEDBACK.allowAutoArchive = raw.feedback.allowAutoArchive;
    if (Array.isArray(raw.feedback.sources) && raw.feedback.sources.length) RULES_FEEDBACK.sources = raw.feedback.sources.slice();
  }
  RULES_SOURCE = 'rules.json';
  return RULES_SOURCE;
}

/* 088 设置页：只认下面这张白名单。
   设置页不该成为「任意改 rules.json」的通道——白名单外的键一律不动。 */
const RULES_UI_FIELDS = [
  ['dedupe.similarity', '同主题判重阈值'],
  ['cooldown.ticks', '冷却几档'],
  ['cooldown.tickHours', '每档几小时'],
  ['states.cooling.weight', '冷却期权重'],
  ['decay.halfLifeDays', '记忆半衰天数'],
  /* numbers.hitsCounts（曝光计入分数）已下线：曝光不再计数，这个开关没有作用对象 */
  ['feedback.enabled', '反馈开关'],
  ['isolation.sameTaskExcluded', '同任务隔离'],
];

function rulesFilePath(workspace) {
  return join(workspace, LAYOUT_DIRNAME, 'rules.json');
}

function getByPath(source, path) {
  return String(path).split('.').reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), source);
}

function setByPath(target, path, value) {
  const keys = String(path).split('.');
  let node = target;
  for (const key of keys.slice(0, -1)) {
    if (!node[key] || typeof node[key] !== 'object') node[key] = {};
    node = node[key];
  }
  node[keys[keys.length - 1]] = value;
  return target;
}

/* 读给设置页看：只回白名单里的键，外加最后更新时间 */
function readRulesForUi(workspace) {
  const raw = readRulesSync(workspace);
  if (!raw) return { ok: false, error: 'rules.json 读不到', fields: [] };
  const fields = RULES_UI_FIELDS.map(([path, label]) => ({ path, label, value: getByPath(raw, path) }));
  return { ok: true, updatedAt: raw.updatedAt || null, fields };
}

/* 从设置页写回：类型必须与现值一致，白名单外的一律忽略；写完立刻重新套用 */
function writeRulesFromUi(workspace, patch) {
  const raw = readRulesSync(workspace);
  if (!raw) return { ok: false, error: 'rules.json 读不到', applied: [], rejected: [] };
  const applied = [];
  const rejected = [];
  for (const [path] of RULES_UI_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(patch || {}, path)) continue;
    const value = patch[path];
    const current = getByPath(raw, path);
    const typeOk = typeof value === typeof current && (typeof value !== 'number' || Number.isFinite(value));
    if (!typeOk) {
      rejected.push(path);
      continue;
    }
    setByPath(raw, path, value);
    applied.push(path);
  }
  if (!applied.length) return { ok: false, error: '没有可写入的字段', applied, rejected };
  raw.updatedAt = new Date().toISOString().slice(0, 10);
  const file = rulesFilePath(workspace);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
  renameSync(tmp, file);
  applyRules(workspace);
  return { ok: true, applied, rejected };
}

/* 老清单（v1 早期版本）缺可选字段：补齐后回写，不算换版本 */
function normalizeLayout(layout) {
  const base = layoutPaths(layout.workspace);
  let changed = false;
  for (const key of ['tasks', 'materials', 'images']) {
    if (typeof layout[key] !== 'string' || !layout[key].trim()) {
      layout[key] = base[key];
      changed = true;
    }
  }
  return changed;
}

function materializeLayout(layout) {
  mkdirSync(layout.workspace, { recursive: true });
  normalizeLayout(layout);
  for (const [key, dir] of Object.entries(layout.areas)) {
    mkdirSync(dir, { recursive: true });
    const file = join(dir, AREA_FILES[key]);
    if (!existsSync(file)) writeFileSync(file, '', { flag: 'a' });
  }
  mkdirSync(layout.personaRoot, { recursive: true });
  mkdirSync(layout.backupRoot, { recursive: true });
  for (const key of ['tasks', 'materials']) {
    if (layout[key]) mkdirSync(layout[key], { recursive: true });
  }
}

/* 启动引导：先「找」、找不到才「建」。
   找：显式 workspace > BLUETIDE_WORKSPACE > 旧 personaRoot 推导 > 默认位置 > 主目录两处，只认已有清单。
   建：显式 workspace > BLUETIDE_WORKSPACE > 主目录/蓝潮工作区 > 主目录/BLUE Files/Config/workspace。
   默认位置 旧版默认位置 只用于「认领已有清单」，不再当新机落点——新机上它不存在，凭空造一套目录是坑。
   清单一旦存在就是唯一真相：配置里的 areas 若与它不一致，只记冲突、不照配置跑。 */
function uniqPaths(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (typeof item !== 'string' || !item.trim()) continue;
    const full = resolve(item);
    const key = process.platform === 'win32' ? full.toLowerCase() : full;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function bootstrapLayout(config = {}) {
  const explicitAreas = config && typeof config.areas === 'object' && config.areas ? config.areas : null;
  const configuredRoot = typeof config.personaRoot === 'string' && config.personaRoot.trim() ? config.personaRoot.trim() : null;
  const fallback = { personaRoot: DEFAULT_ROOT, areas: DEFAULT_AREAS, layout: null, source: 'fallback', problems: [] };
  /* 测试/沙盒用：显式给了自定义 personaRoot（或 areas）就以它为准，不去扫清单。
     这条必须先判：沙盒都带自定义 root，一旦落到「扫清单」就会命中 DEFAULT_WORKSPACE
     的真实清单，把测试行写进真账（060–066 的脏数据就是这么来的）。 */
  if (configuredRoot && configuredRoot !== DEFAULT_ROOT && !config.workspace) {
    return { personaRoot: configuredRoot, areas: explicitAreas, layout: null, source: 'config-root', problems: [] };
  }
  const home = homedir();
  const configuredWorkspace = typeof config.workspace === 'string' && config.workspace.trim() ? config.workspace.trim() : null;
  const envWorkspace = process.env.BLUETIDE_WORKSPACE || null;
  /* 显式给了工作区就以它为准：有清单认清单，没清单就在它那里建。
     不能因为别处有旧清单就把数据写回旧位置（换机时这是最要命的一种「找」）。 */
  const explicit = configuredWorkspace || envWorkspace;
  const scan = [];
  if (explicit) scan.push(explicit);
  else {
    if (configuredRoot) scan.push(join(configuredRoot, '..', '..'));
    scan.push(DEFAULT_WORKSPACE, join(home, 'BLUE Files/Config', 'workspace'), join(home, '蓝潮工作区'));
  }

  /* 第一段：找已有清单。找到就认，不新建 */
  for (const candidate of uniqPaths(scan)) {
    const existing = readLayoutSync(candidate);
    if (!existing) continue;
    const upgraded = normalizeLayout(existing);
    const check = verifyLayout(existing);
    if (!check.ok) return { ...fallback, source: 'layout-invalid', problems: check.problems };
    const problems = [];
    if (explicitAreas && Object.keys(explicitAreas).some((key) => resolve(explicitAreas[key]) !== resolve(existing.areas[key]))) {
      problems.push('配置里的目录与布局清单不一致，已按清单执行');
    }
    applyRules(existing.workspace);
    materializeLayout(existing);
    if (upgraded) writeLayoutSync(existing);
    return { personaRoot: existing.personaRoot, areas: existing.areas, layout: existing, source: 'layout', problems };
  }

  /* 第二段：一份清单都没有——在用户能看见的位置建空骨架 */
  const createAt = [];
  if (configuredWorkspace) createAt.push(configuredWorkspace);
  if (envWorkspace) createAt.push(envWorkspace);
  createAt.push(join(home, '蓝潮工作区'), join(home, 'BLUE Files/Config', 'workspace'));
  const problems = [];
  for (const target of uniqPaths(createAt)) {
    try {
      let layout = layoutPaths(target);
      if (explicitAreas) {
        /* 显式 areas 只在它们本来就落在新工作区内时才用；跨盘就忽略，免得又绑回老路径 */
        const merged = { ...layout, areas: { ...layout.areas, ...explicitAreas } };
        const inside = Object.values(merged.areas).every((dir) => typeof dir === 'string' && insidePath(merged.workspace, dir));
        if (inside) layout = merged;
        else problems.push('配置里的 areas 不在新建的工作区内，已按默认布局建');
      }
      const check = verifyLayout(layout);
      if (!check.ok) {
        problems.push(...check.problems);
        continue;
      }
      applyRules(layout.workspace);
      materializeLayout(layout);
      writeLayoutSync(layout);
      return { personaRoot: layout.personaRoot, areas: layout.areas, layout, source: 'created', problems };
    } catch (error) {
      problems.push(`${target}：${String((error && error.message) || error)}`);
    }
  }
  return { ...fallback, source: 'layout-unwritable', problems };
}

const RINGS = ['perception', 'memory', 'persona', 'feedback'];
const KINDS = RINGS.concat(['decision', 'execution']);
const PERSONA_TAGS = ['trait', 'style', 'emotion'];
const PERMANENT_TAGS = ['boundary', 'commitment', 'nickname', 'trigger'];
const FEED_LIMIT = 4;
const DECISION_LIMIT = 5;
const EXECUTION_LIMIT = 6;
const STAT_WINDOW = 3;
const CHANGE_LIMIT = 3;
let WORK_ONLY_ALIGNMENT = 0.25;
const TAG_INFLUENCE_CAP = 0.2;
const STAGING_MIN_FOR_RATIO = 10;
const MICRO_DELTA = 0.0001;
let DUP_SIMILARITY = 0.72;
const CONFRONT_MATCH = ['consistent', 'extended', 'contradict', 'new'];
const CONFRONT_SUGGEST = ['keep', 'stage', 'hold', 'drop'];
const CONFRONT_CONSISTENT_SIM = 0.6;
const CONFRONT_EXTENDED_SIM = 0.25;
const CONFRONT_CONTRADICT_CORE = 0.6;
const CONFRONT_HOLD_ALIGN = 0.3;
const CONFRONT_KEEP_ALIGN = 0.55;
const CONFRONT_MAX_CHARS = 240;
const FLUSH_TIMEOUT_MS = 200;
/* WORK_TTL_MS 已移到 store/files.js（2026-10-28）：判龄与清理判定在同一层 */
/* 工作记录：面板最多 10 条；长文本先压缩再下发，别把整段产出塞进面板 */
const WORK_ROW_LIMIT = 10;
/* 设置页「四区」列表只下发最近这么多行：每区 400 行全量约 160 KB，占轮询体积八成，
   而人几乎不会在页面上翻旧账；文件本体一条不少，这里只是送回面板的窗口。 */
const SETTINGS_AREA_ROWS = 120;
const WORK_TEXT_MAX = { title: 46, output: 150, method: 46, text: 110 };
/* 自动判定口径：每轮收尾写一条 type:'turn' 行，同时给三环占比（单位只为可读，占比归一化）；
   感知 = 输入字数/100 + 本轮感知条目；记忆 = 检索次数×1.5 + 本轮记忆条目；
   人格 = 非记忆工具次数×0.5 + 本轮人格条目 + 裁定×2。真裁定存在时面板优先用裁定。 */
const MIX_UNITS = { chars: 100, lookup: 1.5, tool: 0.5, decision: 2 };

/* ── 占比 v4 参数与算式：已移到 logic/mix.js（2026-10-28 拆分）──────────
   那里有 RATIO 常量表、moodFactor、ratioV4、dampAffect、本能槽三件套。
   改口径只改那个文件，本文件不参与算术。 */

/* 本能槽落盘：跟 state.json 一样放插件目录，重启不丢 */
const INSTINCT_FILE = join(PLUGIN_DIR, 'instinct.json');

/* ── 口径版本（单一来源）────────────────────────────────────────────
   以前 unitsV 是写在写行处的一个字面量 3，读端各写各的判断：改口径靠「记得同步」。
   现在只认这两个常量：写进行的是 UNITS_VERSION，面板显示的是 ENGINE_VERSION。
   改口径必须同时升版本号，读端按版本过滤，别再用时间猜测哪一行是哪一版。 */
/* 显示用版本号：β 阶段统一为 V1.0.0 βbis（semver 见 package.json / bluetide-build.json）。
   UNITS_VERSION 是「占比算式第几版」，与产品版本不是一回事，别混。 */
const ENGINE_VERSION = 'V1.0.0 βbis';
/* UNITS_VERSION 由 logic/mix.js 提供（2026-10-29 起）：它就是「这套占比算式是第几版」，
   与 RATIO 同寿。宿主不再自己有字面量，读端与写端只能拿到同一份。 */
/* MIX_TRACKED 由 logic/mix.js 提供（三环名字的唯一来源），这里只 import 不重复定义 */

/* 抽象的判据类：靠「大致符合」，没有可字面命中的实词；其余按具体算。 */
const ABSTRACT_TAGS = ['boundary', 'commitment', 'lesson', 'trait', 'style', 'emotion'];
const VERIFY_STOP = new Set(['这个', '那个', '我们', '你们', '他们', '可以', '不是', '就是', '一个', '什么', '怎么', '因为', '所以', '但是', '如果', '已经', '还是', '没有', '自己', '这样', '那样', '现在', '时候', '东西', '事情', '问题', '需要', '应该']);

/* 中文没有空格：取二字滑窗当词元，去停用词与纯数字，去重后取前 24 个。 */
function keywordsOf(text) {
  const raw = String(text || '').toLowerCase();
  const latin = (raw.match(/[a-z][a-z0-9_-]{2,}/g) || []);
  const han = raw.replace(/[^\u4e00-\u9fa5]/g, '');
  const grams = [];
  for (let i = 0; i + 1 < han.length; i += 1) grams.push(han.slice(i, i + 2));
  const all = [...new Set([...latin, ...grams])].filter((word) => !VERIFY_STOP.has(word));
  return all.slice(0, 24);
}

/* 判定一条捕捉是否被输出用到。
   mkind=concrete：字面覆盖 = 命中词元 / 全部词元，>=threshold 算用上（默认 0.3）
   mkind=abstract：需要调用方给 judged 分（0~1），>=0.5 才算用上；没给分就是 null（未知，不算用上也不虚报） */
function judgeVerify(entry, outputText, opts = {}) {
  const item = entry || {};
  const kindTag = String(item.kindTag || '');
  const mkind = ABSTRACT_TAGS.includes(kindTag) ? 'abstract' : 'concrete';
  const ref = typeof item.ref === 'string' ? item.ref : entryKey(item);
  const threshold = Number.isFinite(Number(opts.threshold)) ? Number(opts.threshold) : 0.3;
  if (mkind === 'abstract') {
    const score = Number.isFinite(Number(opts.score)) ? Math.max(0, Math.min(1, Number(opts.score))) : null;
    return {
      ref, matchKind: mkind, method: 'judged',
      score, used: score === null ? false : score >= 0.5,
      known: score !== null,
      evidence: typeof opts.evidence === 'string' ? opts.evidence.slice(0, 120) : '',
    };
  }
  const words = keywordsOf(item.text);
  const output = String(outputText || '');
  const hit = words.filter((word) => output.includes(word));
  const coverage = words.length ? hit.length / words.length : 0;
  return {
    ref, matchKind: mkind, method: 'lexical',
    score: Number(coverage.toFixed(3)), used: coverage >= threshold,
    known: true, evidence: hit.slice(0, 6).join(' '),
  };
}

/* 回验符合度：环内 = 用上条数 / 捕捉条数；三环各乘 1/3 后归一再归一；缺环剔除并标 missing。
   这是面板「第一次捕捉在返回结果里占多少」的数据来源，纯函数可直测。 */
function verifyMixOf(ringCounts, entries, verifyRows) {
  const mixed = {};
  for (const ring of MIX_TRACKED) mixed[ring] = { captured: Number(ringCounts[ring]) || 0, used: 0, lastAt: null, ratio: null };
  const ringByKey = new Map();
  for (const item of entries || []) {
    if (!item || item.ring === undefined) continue;
    if (MIX_TRACKED.includes(item.ring)) ringByKey.set(entryKey(item), item.ring);
  }
  for (const [ref, row] of verifyRows || []) {
    const ring = ringByKey.get(ref);
    if (!ring || !mixed[ring]) continue;
    if (row && row.used === true) mixed[ring].used += 1;
    mixed[ring].lastAt = (row && row.ts) || mixed[ring].lastAt;
  }
  const ratios = {};
  let weightSum = 0;
  for (const ring of MIX_TRACKED) {
    const cell = mixed[ring];
    const ratio = cell.captured > 0 ? cell.used / cell.captured : null;
    cell.ratio = ratio === null ? null : Number(ratio.toFixed(3));
    ratios[ring] = ratio;
    if (ratio !== null) weightSum += ratio / MIX_TRACKED.length;
  }
  const shares = {};
  for (const ring of MIX_TRACKED) {
    const ratio = ratios[ring];
    shares[ring] = ratio === null ? null : (weightSum > 0 ? Number((ratio / MIX_TRACKED.length / weightSum).toFixed(3)) : 0);
  }
  return {
    algo: 'verify-v1',
    rings: mixed,
    shares,
    missing: MIX_TRACKED.filter((ring) => ratios[ring] === null),
    note: '环内=用上条数/捕捉条数；三环各乘 1/3 后归一再归一；缺环剔除并标 missing',
  };
}

/* 任务级统计：一个任务一个任务码，三张工单共用；提炼成 stats 写进任务记录后工单即弃 */
const TASK_STAMP_IDLE_MS = 30 * 60_000;
const TASK_STATS_LIMIT = 3;      // 占比窗口：最近三个任务
const PHOTO_LIMIT = 10;          // 照片层：任务统计留最近十张
/* 漏检只看「你纠正我」：偏好与规矩不算漏检（066 起收窄，原来 38 条 vs 对照 4 条全是噪音） */
const MISS_SIGNAL = /(不对|不是这样|搞错|搞反|错了|应该|回退|撤销|不该)/;
const LAYERS = [
  ['meta', 'meta-principle.md', 'meta-principle', true, true],
  ['identity', 'identity.md', 'identity', true, false],
  ['character', 'character.md', 'character', true, false],
  ['cognition', 'cognition.md', 'cognition', false, false],
  ['instinct', 'instinct.md', 'instinct', false, false],
  ['projection', 'projection.md', 'projection', false, false],
];
const BASELINE_FILES = ['identity.md', 'character.md', 'meta-principle.md'];

const pad = (n) => String(n).padStart(2, '0');
const sha = (text) => createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
const clamp01 = (n) => Math.max(0, Math.min(1, n));
/* lines 已移到 store/files.js（2026-10-28）：全仓唯一实现；本文件里的局部同名变量照旧遮蔽 */

/* 压缩：折叠空白 + 超长截断加省略号（面板显示用，不改进原文） */
const squeeze = (value, max) => {
  if (typeof value !== 'string') return value ?? null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
};
/* 显示层上限：三环条目与「变化」只在面板摘要里截断，原文仍完整落盘（检索读原文） */
const DISPLAY_TEXT_MAX = 200;
const squeezeData = (data) => {
  if (!data || typeof data !== 'object') return data ?? null;
  const out = {};
  for (const [key, value] of Object.entries(data).slice(0, 4)) {
    try {
      out[key] = typeof value === 'string'
        ? squeeze(value, 60)
        : typeof value === 'number' || typeof value === 'boolean'
          ? value
          : squeeze(JSON.stringify(value), 60);
    } catch {
      /* 深嵌套对象/不可序列化：一行坏数据不该把整张快照打成 500 */
      out[key] = '…';
    }
  }
  return out;
};

/* 工作行只有一个「发给面板」的形状：压缩 + 容错。
   work.rows 与 execution（最近执行）共用这一份，别再各压各的（054 · A4 就是两处口径不同）；
   行级 try/catch：一条坏行只降级自己，不让整张快照抛错（054 · A2）。 */
function workRowView(row) {
  try {
    return {
      ...row,
      title: squeeze(row.title, WORK_TEXT_MAX.title),
      output: squeeze(row.output, WORK_TEXT_MAX.output),
      method: squeeze(row.method, WORK_TEXT_MAX.method),
      text: squeeze(row.text, WORK_TEXT_MAX.text),
      data: squeezeData(row.data),
    };
  } catch {
    return {
      type: row && row.type, ts: row && row.ts, task: row && row.task,
      title: '（该行无法展示）', output: null, method: null, text: null, data: null, degraded: true,
    };
  }
}

/* 展示副本：条目原文仍留在 entries 里给检索用，面板与摘要只吃截断后的这一份 */
const displayItem = (item) => ({ ...item, text: squeeze(item.text, DISPLAY_TEXT_MAX) });

/* 单调时间：同毫秒内连续写入按 +1ms 递增，保证「最近一条」永远是可判定的最新 */
let lastMonoMs = 0;
function nowIso() {
  const ms = Math.max(Date.now(), lastMonoMs + 1);
  lastMonoMs = ms;
  const d = new Date(ms);
  const off = -d.getTimezoneOffset();
  const abs = Math.abs(off);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}${off >= 0 ? '+' : '-'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/* ── 唯一条码：YYMMDDTHHmmss#任务号 ───────────────────────────────
   时间 + 任务编号 = 跨对话可锚定的唯一码（16±3 字节）。
   同秒同任务的第二条追加 .2 / .3 保证行级唯一；读取时再叠加现实时间算「多久以前」。 */
/* WEEK_CN 与 stampSeen 已随印章逻辑移到 logic/stamp.js（2026-10-28 拆分） */
/* 最近一次带任务号的写入（供「时间基准」行显示当前任务码）。
   075 起按会话分桶：多会话宿主里全局只留一份，会被别的会话顶掉——实测我的时间基准
   显示的是另一个窗口的任务码。 */
const lastTaskSeen = { task: null, at: 0 };
const DEFAULT_SID = '_default';
const sidOf = (session) => {
  const id = session && typeof session === 'object' ? session.id : session;
  return id ? String(id) : DEFAULT_SID;
};
/* 外层膜状态：入口判定结果 + 出口回检累计——同样按会话分桶。
   gateState / gateStats 只是「最近一次写入的会话」的镜子，供面板读取，不参与判定。 */
let gateState = { level: 'task', why: '默认任务级（还没看到本轮用户话）', at: 0, text: '' };
let gateStats = { checks: 0, pass: 0, blocked: 0, last: null };
const gateBySession = new Map();
const gateStatsBySession = new Map();
/* v1.15.3 验证台账（单槽，不按会话分桶）：
   工具调用域里没有 session 变量，硬引用会抛 ReferenceError 并被 catch 吞掉。
   本插件是单用户单机部署，一轮只可能有一个召回窗口，所以不需要会话键。 */
const recallPending = { refs: new Set(), passAt: 0, at: 0 };
/* v1.15.3 幂等（方案④·进程内近似）：同一 task+ref 只写一次验证。
   进程重启后集合清空，可能重记一次；跨进程持久化要动收尾的读写，未在本轮引入。 */
const recallVerified = new Set();
/* 回检通过与数：跨会话求和。召回时记基线，收尾时比增量。 */
const totalGatePass = () => {
  let total = 0;
  for (const stats of gateStatsBySession.values()) total += Number(stats && stats.pass) || 0;
  return total;
};

/* 召回登记：自动检索与手动 recall 共用这一处。
   2026-11-09 合并：原先两处各写一遍「登记 refs + 写 recall-hit」，改一处漏一处。 */
function registerRecallRefs(refs, source, root, areas) {
  if (!Array.isArray(refs) || refs.length === 0) return;
  for (const ref of refs) recallPending.refs.add(ref);
  if (!recallPending.at) {
    recallPending.at = Date.now();
    recallPending.passAt = totalGatePass();
  }
  void Promise.resolve()
    .then(() => appendRow(root, areas, {
      v: 1, ts: nowIso(), type: 'recall-hit', ring: 'perception',
      refs: refs.slice(0, 12), refCount: refs.length,
      passAt: recallPending.passAt, source,
      task: lastTaskSeen.task || null, algo: 'verify-v1',
      note: '召回登记（' + source + '）：仅证明台账已写入，不加任何计数',
    }))
    .catch((error) => { liveState.recallHitError = String((error && error.message) || error); });
}
function gateOf(sid) {
  const key = sid || DEFAULT_SID;
  let state = gateBySession.get(key);
  if (!state) {
    state = { level: 'task', why: '默认任务级（还没看到本轮用户话）', at: 0, text: '' };
    gateBySession.set(key, state);
    if (gateBySession.size > 64) gateBySession.delete(gateBySession.keys().next().value);
  }
  return state;
}
function gateStatsOf(sid) {
  const key = sid || DEFAULT_SID;
  let stats = gateStatsBySession.get(key);
  if (!stats) {
    stats = { checks: 0, pass: 0, blocked: 0, last: null };
    gateStatsBySession.set(key, stats);
    if (gateStatsBySession.size > 64) gateStatsBySession.delete(gateStatsBySession.keys().next().value);
  }
  return stats;
}
function taskOfSession() {
  /* 2026-11-01：原来的按会话记账（noteTask + lastTaskBySession）从来没被调用过，
     Map 永远是空的，taskOfSession 实际一直在读全局 lastTaskSeen。
     留着那套等于假装「每个会话各记各的任务码」，与真实行为不符——
     所以删掉，直接读全局，名字也改成只表达这一点。 */
  return lastTaskSeen.task;
}

/* 活跃度：蓝潮这一轮到底跑没跑。权威信号是 agent/status（idle ⇄ running）——
   turn-stopping / turn/end 都太早（模型还在写最后一段回复），拿它们当「空下来」会
   在思考途中把总开关放开。tools/result 只当心跳刷新时间戳。 */
/* 回验：本轮写过哪些环条目（收尾时与输出文本比对）。模块级，appendRecord 与收尾都要用。 */
const turnCaptured = [];
/* 三环前置用的本轮状态：按会话分开存，避免多个会话互相串话 */
const turnState = new Map();
function turnStateOf(sid) {
  const key = String(sid || 'default');
  let st = turnState.get(key);
  if (!st) {
    st = { text: '', judged: null, captured: 0 };
    turnState.set(key, st);
    if (turnState.size > 32) turnState.delete(turnState.keys().next().value);
  }
  return st;
}
/* 本轮标题：turn 行和快照行共用一句话，面板两处才对得上 */
let lastTurnTitle = null;
let pendingCapture = null;

const liveState = { state: 'idle', at: 0, turn: null, session: null, agents: 0 };
/* 最近一次记忆工具的返回值。模块级，因为 tools/result 的事件处理器与工具注册
   不在同一个作用域：放注册那层，处理器根本引用不到（会被 try/catch 静默吞掉）。 */
let lastMemoryOutcome = null;
/* 最近一条用户原话（模块级，只做兜底）：会话对象拿不到时，判断卡的 intent 靠它 */
let lastUserText = '';
let lastUserTextAt = 0;
/* 099：这句话是「在哪一轮、带着什么码」进来的。展示行要靠它们认亲，
   否则短回合里那行会拿上一句冒充本轮。 */
let lastUserTextTurn = null;
let lastUserTextStamp = null;
/* 每轮自动检索（2026-11-01）：依据 Generative Agents「取回是每轮默认动作」+ 综述 §4.2「是否检索交给模型会静默失败」。
   只做调度：打分/权重/预算全部复用既有 runRecall，不另建评分链路。 */
const autoRecallState = { at: null, query: '', hits: 0, ids: [], stop: null, error: null, ms: null };
function autoRecallLine() {
  if (!autoRecallState.at) return '本轮自动检索：未触发（等待首次刷新）';
  if (autoRecallState.error) return '本轮自动检索：失败（' + autoRecallState.error + '）';
  const ids = Array.isArray(autoRecallState.ids) ? autoRecallState.ids : [];
  const head = ids.length
    ? '命中 ' + autoRecallState.hits + ' 条（' + ids.slice(0, 3).join(' / ') + '）'
    : '命中 0 条（已查，停因 ' + (autoRecallState.stop || '—') + '）';
  return '本轮自动检索：' + head + ' · 查询「' + String(autoRecallState.query || '').slice(0, 20) + '」';
}
/* 提示词里那一行必须「此刻现算」。section 的 text 是同步的，async 检索永远可能
   慢半个身位——上一轮就是靠运气显示对了。这里同步算一遍，算不出来就不显示，
   绝不把上一轮的查询顶上来。
   099：同时补上「身份」。以前这行只说「本轮」，但短回合里它拿的是上一句，
   等于没码的展示文字冒充记录。现在带 turn 与 stamp，对不上就写「上一次」。 */
function formatAutoRecallLine(state, { stale = false } = {}) {
  if (!state || !state.query) return '';
  const label = stale ? '上一次检索' : '本轮自动检索';
  if (state.error) return `${label}：失败（${state.error}）`;
  const ids = Array.isArray(state.ids) ? state.ids : [];
  const head = ids.length
    ? `命中 ${state.hits} 条（${ids.slice(0, 3).join(' / ')}）`
    : `命中 0 条（已查，停因 ${state.stop || '—'}）`;
  const stamp = state.stamp ? ` · 码 ${state.stamp}` : '';
  const via = state.via ? ` · 任务 ${state.via} 补查` : '';
  return `${label}：${head} · 查询「${String(state.query).slice(0, 20)}」${stamp}${via}`;
}
let syncRecallCache = { query: null, at: 0, ids: [], hits: 0, stop: null, error: null, stamp: null };
function autoRecallLineSync(root, areas) {
  const query = String(lastUserText || '').slice(0, 80);
  if (!query) return '';
  const now = Date.now();
  if (syncRecallCache.query !== query || now - syncRecallCache.at > 4000) {
    try {
      const res = recallSync(root, areas, query);
      let ids = Array.isArray(res.ids) ? res.ids : [];
      let via = null;
      if (ids.length === 0) {
        const task = taskCodeOf();
        if (task) {
          const alt = recallSync(root, areas, task);
          const altIds = Array.isArray(alt.ids) ? alt.ids : [];
          if (altIds.length > 0) { ids = altIds; via = task; }
        }
      }
      syncRecallCache = { query, at: now, ids: ids.slice(0, 5), hits: ids.length, stop: res.stop || null, error: null, stamp: lastUserTextStamp, via };
    } catch (err) {
      syncRecallCache = { query, at: now, ids: [], hits: 0, stop: null, error: String((err && err.message) || err), stamp: lastUserTextStamp, via: null };
    }
  }
  /* 这句话是在哪一轮进来的？跟当前轮次不是一个，就老实写「上一次」。 */
  const stale = lastUserTextTurn !== null && liveState.turn !== null && lastUserTextTurn !== liveState.turn;
  return formatAutoRecallLine(syncRecallCache, { stale });
}
/* runRecall 的真实返回形状：{ need, gap, stop_reason, items, cycle }
   命中 id 在 cycle.retrieved_memory_ids；items 里也有 mid。两个都收，避免再读不存在的字段。 */
function autoRecallIdsOf(res) {
  if (!res || typeof res !== 'object') return [];
  if (res.cycle && Array.isArray(res.cycle.retrieved_memory_ids)) return res.cycle.retrieved_memory_ids.filter(Boolean);
  if (Array.isArray(res.items)) return res.items.map((item) => item && item.mid).filter(Boolean);
  return [];
}/* 099：原话查不到时，用任务码补查一次。
   经验写在某个任务下、行里带 task；只拿原话查，话题一换就永远捞不到。
   注意：不能把任务码拼进查询串——词面门槛按「命中一半词元」算，
   拼进去反而把门槛抬高。必须单独查一次任务码。 */
function taskCodeOf() {
  return lastTaskSeen && lastTaskSeen.task ? String(lastTaskSeen.task).trim() : '';
}
async function runAutoRecall(root, areas, options = {}) {
  const runner = typeof options.runner === 'function' ? options.runner : runRecall;
  const sourceText = options.text === undefined ? lastUserText : options.text;
  const query = String(sourceText || '').slice(0, 80);
  autoRecallState.at = nowIso();
  autoRecallState.query = query;
  autoRecallState.error = null;
  if (!query) {
    autoRecallState.hits = 0;
    autoRecallState.ids = [];
    autoRecallState.stop = '本轮无用户原话';
    return;
  }
  const started = Date.now();
  try {
    let res = await runner(root, areas, { query, budget: 1 });
    let ids = autoRecallIdsOf(res);
    let via = null;
    /* 099：原话没捞到 → 用任务码补查一次。同一任务写下的经验，行里都带 task。 */
    if (ids.length === 0) {
      const task = taskCodeOf();
      if (task) {
        const alt = await runner(root, areas, { query: task, budget: 1 });
        const altIds = autoRecallIdsOf(alt);
        if (altIds.length > 0) { res = alt; ids = altIds; via = task; }
      }
    }
    autoRecallState.via = via;
    autoRecallState.hits = ids.length;
    autoRecallState.ids = ids.slice(0, 5);
    autoRecallState.stop = (res && (res.stop_reason || res.stopReason)) || null;
    autoRecallState.ms = Date.now() - started;
    registerRecallRefs(ids, 'auto', root, areas);
  } catch (err) {
    autoRecallState.hits = 0;
    autoRecallState.ids = [];
    autoRecallState.error = String((err && err.message) || err);
  }
}
/* 最近一次真的去查记忆（工具动作，不是输出文本）：三问里的「有没有旧经验」靠它，
   不再拿我的回复去猜。只有真的调了 search/recent/topics/recall 才会更新。 */
let lastLookup = { at: 0, kind: '', query: '', hits: 0 };
/* Flash：v5 环权重的观测变量已移除（没有 v5 芯片就不存在这个量） */
/* 099：检索排序真正要用的两个输入。之前 searchPool 有 b / arousal 两个参数，
   但三个调用点一个都不传，于是 b 恒为 null、arousal 恒为 0 —— 公式只在纸上。
   这里只保存「此刻该用哪组值」，计算仍只由 retrievalScore 那一处做。 */
const retrievalCtx = { arousal: 0, b: null };
const retrievalOptions = () => ({ arousal: retrievalCtx.arousal, b: retrievalCtx.b });
const liveAgents = new Set();
const syncLive = () => {
  liveState.state = liveAgents.size > 0 ? 'running' : 'idle';
  liveState.agents = liveAgents.size;
  liveState.at = Date.now();
};
/* 由 apply 注入：能直接读到 live agents 时以它为准（宿主中途重载也能立刻知道谁在跑） */
let liveProbe = null;
/* ── 生效口径：运行中代码 vs 盘上代码 ───────────────────────────────
   你 2026-10-28 的原话：改一行要重启，重启期间还在用，于是「改没生效」和
   「进程是旧的」分不清。这里把三个事实同时摆出来，让这件事一眼可判：
     codeHash   —— 现在这份进程加载的是哪一版（模块加载时算一次）
     diskHash   —— 磁盘上现在是哪一版（2 秒缓存，别每 30 秒读一次 263KB）
     needsRestart —— 两者不一致就是「改了没生效」
   另外带本轮计数（tools / lookups / appends / decisions / chars），
   面板不用再靠猜「这一轮到底记了什么」。 */
const SELF_PATH = fileURLToPath(import.meta.url);
const engine = {
  version: ENGINE_VERSION,
  unitsV: UNITS_VERSION,
  loadedAt: new Date().toISOString(),
  codeHash: null,
  turn: null,
  units: null,
  at: 0,
};
function hashFile(path) {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12);
  } catch {
    return null;
  }
}
engine.codeHash = hashFile(SELF_PATH);
const diskHashCache = { at: 0, hash: null };
function diskHashOf() {
  const now = Date.now();
  if (now - diskHashCache.at < 2000 && diskHashCache.hash) return diskHashCache.hash;
  diskHashCache.at = now;
  diskHashCache.hash = hashFile(SELF_PATH);
  return diskHashCache.hash;
}
function engineView() {
  const disk = diskHashOf();
  return {
    version: engine.version,
    unitsV: engine.unitsV,
    loadedAt: engine.loadedAt,
    codeHash: engine.codeHash,
    diskHash: disk,
    needsRestart: Boolean(engine.codeHash && disk && engine.codeHash !== disk),
    turn: engine.turn,
    units: engine.units,
    at: engine.at || null,
  };
}
/* 本轮计数只给面板看：谁在动就覆盖谁，不做跨会话归因（归因靠 agentId，不靠全局） */
function setEngineTurn(turn, units) {
  engine.turn = turn;
  engine.units = units || null;
  engine.at = Date.now();
}
function readLive() {
  if (typeof liveProbe === 'function') {
    try {
      liveProbe();
    } catch {
      /* 探不到就退回事件状态 */
    }
  }
  return {
    state: liveState.state, at: liveState.at, turn: liveState.turn, agents: liveState.agents,
    engine: engineView(),
  };
}

/* 任务票根：每个任务码各有一组 entry / execute / exit，静默 30 分钟算换任务。
   一轮里可能出现多个任务号，票根必须按任务分开，不能共用一个全局票根。 */
const taskTickets = new Map();

function openTaskTicket(task, date = new Date()) {
  const key = typeof task === 'string' && task.trim() ? task.trim() : null;
  if (!key) return null;
  const now = date.getTime();
  let ticket = taskTickets.get(key);
  if (!ticket || now - ticket.at > TASK_STAMP_IDLE_MS) {
    ticket = { task: key, stamp: stampPreview(date, key), at: now, tickets: [] };
    taskTickets.set(key, ticket);
    if (taskTickets.size > 64) taskTickets.delete(taskTickets.keys().next().value);
  }
  ticket.at = now;
  return ticket;
}

function addTicket(ticket, phase, detail = {}) {
  if (!ticket || !ticket.stamp) return null;
  const row = { phase, at: nowIso(), ...detail };
  ticket.tickets = [...ticket.tickets.filter((item) => item.phase !== phase), row].slice(-3);
  return row;
}

/* 任务中文短名：任务仓 registry.json 里每条任务都有中文 name。
   面板/设置页/工单标题一律先用它，别把 089-recent-three-mix 这种英文 id 摆给人看。
   读不到就退回该任务最新一条执行记录的 title，再退 id。 */
const TASK_NAME_TTL_MS = 60_000;
const taskNameCache = { at: 0, map: new Map() };
/* 每个任务最近一条工单的描述（理解/执行/产出）：拍快照时抄进 photo 行，
   这样 24h 后工单被清，面板详情还读得到。 */
const workDetailByTask = new Map();

/* 短名：取「：」前的部分，压到 14 字，够一栏放得下 */
function shortTaskName(name) {
  const text = String(name || '').trim();
  if (!text) return '';
  const head = text.split(/[：:（(]/)[0].trim();
  return squeeze(head || text, 12);
}

async function loadTaskNames(tasksDir) {
  if (!tasksDir) return taskNameCache.map;
  if (Date.now() - taskNameCache.at < TASK_NAME_TTL_MS) return taskNameCache.map;
  const text = await readText(join(tasksDir, 'registry.json')).catch(() => null);
  const map = new Map();
  if (text) {
    try {
      const data = JSON.parse(text);
      for (const [id, item] of Object.entries((data && data.tasks) || {})) {
        const short = shortTaskName(item && item.name);
        if (short) map.set(id, short);
      }
    } catch {
      /* 坏 JSON 不算致命：名字退回执行记录标题 */
    }
  }
  taskNameCache.map = map;
  taskNameCache.at = Date.now();
  return map;
}

/* 三张工单提炼：同一任务的各轮 units 相加，再取最近三个任务
   names：任务 id → 中文短名（可选） */
/* ── 一笔账的唯一定义 ─────────────────────────────────────────────
   一笔账 = 一轮 × 一个任务。
   账只有一个来源：工单（taskstats，带 units）。照片（photo）是人读快照，
   2026-10-28 起不再抄 units/shares/dominant —— 以前同一笔写三份（turn / taskstats / photo），
   两个聚合各挑一份、各用一套去重规则，于是同一件事能算出两个占比。
   现在去重规则只写在这里：同一个 ts|task 的工单与照片算同一笔（照片复用工单的 ts）。
   历史数据兜底：只有照片、没有工单时（工单已被清），才退回照片自带的 units。 */
function collectShots(workRows = []) {
  const byShot = new Map();
  for (const row of workRows) {
    if (!row || (row.type !== 'photo' && row.type !== 'taskstats') || !row.task || row.expired) continue;
    const key = `${row.ts}|${row.task}`;
    const prev = byShot.get(key);
    const shot = prev || { ts: row.ts, task: row.task, units: null, hasStats: false, stats: null, photo: null, title: null, detail: null };
    if (row.type === 'taskstats') {
      /* 整行留在 shot.stats 上，不再抄字段。v5 一律从 stats.v5 现读（见 shotSharesV5）：
         中间多一层复制，就多一次「漏抄 → 占比条回退旧公式」的机会。 */
      shot.stats = row;
      shot.hasStats = true;
      shot.units = row.units ? addUnits(null, row.units) : null;
    } else {
      shot.photo = row;
      if (row.title) shot.title = row.title;
      if (row.detail) shot.detail = row.detail;
      if (!shot.hasStats && row.units) shot.units = addUnits(null, row.units);
    }
    byShot.set(key, shot);
  }
  return [...byShot.values()];
}

/* 口径过滤（2026-10-28）：窗口只让「当前口径」的账进来。
   V3 的 units 量级是 1~3、V4 是 0~1，两种量级相加既不等于 V3 也不等于 V4 —— 是假数。
   没写 unitsV 的行（手写桩、极早期）按当前口径当；明确写了别的版本的，一律不进窗口。 */
function shotInCurrentVersion(shot) {
  const v = shot && shot.stats ? shot.stats.unitsV : null;
  return v === undefined || v === null || Number(v) === UNITS_VERSION;
}

/* 一笔账的 v5 权重：唯一来源是工单行自己（stats.v5.g），不再有副本。
   097 的教训——collectShots 抄一份、store 白名单再筛一次，两处各漏一次，
   面板就永远回退到 units 归一。「占比条永远是旧公式」不是公式算错，是数据到不了。
   校验也只写这一处：三个键都得是有限数，否则宁可不认这笔 v5。 */
function shotSharesV5(shot) {
  const g = shot && shot.stats && shot.stats.v5 && shot.stats.v5.g;
  if (!g || typeof g !== 'object') return null;
  return MIX_TRACKED.every((key) => Number.isFinite(Number(g[key]))) ? g : null;
}

function taskMixOf(workRows, names) {
  /* 没带到任务名的行（task 是裸代号）：不是任务，不进「最近三次」。
     它们照旧留在工作区里当证据，这里只记个数，让面板可以说清楚「有几轮没记上名字」。 */
  const unnamed = { rows: 0, units: { perception: 0, memory: 0, persona: 0 } };
  /* 一笔账 = 一轮 × 一个任务。账只有一个来源：工单（taskstats）。
     照片（photo）只是人读快照，2026-10-28 起不再抄 units/shares。
     去重规则只写一处（collectShots）：同一个 ts|task 的工单与照片算同一笔。 */
  /* 版本过滤放在去重之后：同一笔的工单与照片先并成一笔，再按整笔的口径版本决定要不要。
     再去掉「没有账」的笔：照片自 2026-10-28 起不再抄 units，工单一旦被清或被剪掉，
     照片就成了孤立笔 —— 拿它一起求和会读到 null.units 直接抛异常（2026-10-28 实盘 500 即此）。 */
  const snaps = collectShots(workRows).filter(shotInCurrentVersion).filter((shot) => shot.units);
  /* 名字解析（任务仓中文短名）：全名先认，再按前缀认（086 → 086-english-boxes）。
     它同时决定「这条到底是不是一个任务」：代号只在任务仓里认不出来时才算代号。 */
  const nameOf = (task) => {
    const id = String(task || '').trim();
    if (!id) return null;
    const exact = names && typeof names.get === 'function' ? names.get(id) : (names && names[id]);
    if (exact) return String(exact);
    if (names && typeof names.forEach === 'function') {
      let hit = null;
      names.forEach((value, key) => {
        if (!hit && String(key).startsWith(`${id}-`)) hit = value;
      });
      if (hit) return String(hit);
    }
    return null;
  };
  const shots = [];
  for (const shot of snaps) {
    /* 没有任务身份的（纯代号、纯数字）→ 没记名的工单，不进「最近三次任务」。
       身份由 isTaskIdentity 判：英文前缀+编号 / 编号+slug / 任务仓认得出名字。 */
    if (!isTaskIdentity(shot.task, nameOf)) {
      unnamed.rows += 1;
      for (const key of MIX_TRACKED) unnamed.units[key] += Number(shot.units && shot.units[key]) || 0;
      continue;
    }
    shots.push(shot);
  }
  const picked = shots
    /* 097 口径 A：只认 24h 内的账；不足三次就如实少显示，不再拿临期旧账补位 */
    .filter((shot) => {
      const at = Date.parse(String(shot.ts));
      return Number.isFinite(at) ? at >= Date.now() - WORK_TTL_MS : false;
    })
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
    .slice(0, TASK_STATS_LIMIT);
  const units = { perception: 0, memory: 0, persona: 0 };
  /* 097：占比条优先读「每笔工单记下的 v5 权重」（v5.g 的均值）。
     没有 v5 的历史笔仍走 units 归一化——两套并存，v5 一旦有样本就接管，
     这样新公式一改，面板的占比条与统计立刻跟着变。
     （2026-11-05 曾一度改成「只用条数」，结果人格恒占 53%——那正是当初要避免的，
      已回退。要改差异请调公式常数，不要退回按条数。） */
  const v5Picks = [];
  for (const info of picked) {
    for (const key of MIX_TRACKED) units[key] += Number(info.units[key]) || 0;
    const g5 = shotSharesV5(info);
    if (g5) v5Picks.push(g5);
  }
  const total = MIX_TRACKED.reduce((sum, key) => sum + units[key], 0);
  const shares = {};
  if (v5Picks.length) {
    for (const key of MIX_TRACKED) {
      const avg = v5Picks.reduce((sum, g) => sum + (Number(g[key]) || 0), 0) / v5Picks.length;
      shares[key] = Number(avg.toFixed(3));
    }
  } else {
    for (const key of MIX_TRACKED) shares[key] = total > 0 ? Number((units[key] / total).toFixed(3)) : 0;
  }
  const dominant = v5Picks.length || total > 0
    ? MIX_TRACKED.reduce((best, key) => (shares[key] > shares[best] ? key : best), MIX_TRACKED[0])
    : null;
  /* 任务简述：优先用该任务最近一条 result 行的 title（人话），退回 task id。
     面板上「最近三个任务」和占比条都用它，别再拿 069-douyin-promo 这种 id 当标题。 */
  const labels = new Map();
  for (const row of workRows) {
    if (!row || row.type !== 'result' || !row.task || !row.title) continue;
    const prev = labels.get(row.task);
    if (!prev || String(row.ts) > String(prev.ts)) labels.set(row.task, { ts: row.ts, title: row.title });
  }
  /* 名字一律中文：①任务仓 registry 里的中文短名 ②该任务最近一条执行记录的标题 ③才退回 id。
     全工程一个口径——工单、占比条、决策三栏、信息栏都读这一个 label。 */
  const labelOf = (task) => {
    const id = String(task || '').trim();
    const zh = nameOf(id);
    if (zh) return squeeze(zh, 22);
    const hit = labels.get(task) && labels.get(task).title;
    if (hit) return squeeze(String(hit).replace(/^任务[ ·]*/u, ''), 22);
    return squeeze(id.replace(/^任务[ ·]*/u, ''), 22);
  };
  /* 明细行：与占比条同一份 picked（最近三个任务），面板的「最近三个任务」直接列它。
     以前面板另读 type:decision，两处不同源——占比天天变、裁定记录 24 小时不动，看着像 bug。 */
  /* 快照没带标题 → 找时间上最近的那条 turn 行（一轮一条），60 秒内算同一轮。
     不用 stamp：快照的 stamp 是陈旧的，一直停在开单那一刻。 */
  const turnTitles = [];
  for (const row of workRows) {
    if (!row || row.type !== 'turn' || !row.title) continue;
    const ms = Date.parse(String(row.ts));
    if (Number.isFinite(ms)) turnTitles.push({ ms, title: String(row.title) });
  }
  const titleNear = (ts) => {
    const ms = Date.parse(String(ts));
    if (!Number.isFinite(ms)) return null;
    let best = null;
    for (const item of turnTitles) {
      const gap = Math.abs(item.ms - ms);
      if (gap > 60000) continue;
      if (!best || gap < best.gap) best = { gap, title: item.title };
    }
    return best ? best.title : null;
  };
  const rows = picked.map((info) => {
    const rowTotal = MIX_TRACKED.reduce((sum, key) => sum + Number(info.units[key] || 0), 0);
    const rowShares = {};
    /* 097：单笔明细也优先用该笔的 v5 权重（面板每条占比条读这里） */
    const g5 = shotSharesV5(info);
    if (g5) {
      for (const key of MIX_TRACKED) rowShares[key] = Number(Number(g5[key]).toFixed(3));
    } else {
      for (const key of MIX_TRACKED) rowShares[key] = rowTotal > 0 ? Number((info.units[key] / rowTotal).toFixed(3)) : 0;
    }
    const rowDominant = MIX_TRACKED.reduce((best, key) => (rowShares[key] > rowShares[best] ? key : best), MIX_TRACKED[0]);
    /* 本轮快照自带标题（「任务 · 先跑通…」）就用它；没有才退回任务名。
       这样占比条和下面「最近任务」记录是同一句话，不再一个显示任务名、一个显示摘要。 */
    const rec = info.stats || info.photo || {};
    const rawSnap = info.title || rec.title || titleNear(info.ts) || null;
    const snapTitle = rawSnap ? squeeze(String(rawSnap).replace(/^任务[ ·]*/u, ''), 22) : null;
    return {
      ts: info.ts ?? null,
      task: info.task ?? null,
      stamp: rec.taskStamp ?? rec.stamp ?? null,
      title: snapTitle || labelOf(info.task),
      label: snapTitle || labelOf(info.task),
      units: info.units,
      shares: rowShares,
      dominant: rowDominant,
      tickets: Number(rec.tickets) || 0,
      level: rec.level ?? null,
      upgraded: Boolean(rec.upgraded),
      /* 快照里抄下的工单描述：详情不再依赖工单本身是否还在 */
      detail: info.detail || rec.detail || null,
      source: 'task',
    };
  });
  /* 顶部汇总条的中性标签：它代表「最近几个任务」的合计，不是某个任务的名字。
     写成「某某摘要 等 N 个任务」会被当成任务名显示在占比条第一行——你两次指出过，
     现在面板不再用它，但留着也别再生成那种假名字。 */
  const headline = rows.length === 0 ? '' : rows.length === 1 ? rows[0].label : `${rows.length} 个任务合计`;
  return { count: picked.length, limit: TASK_STATS_LIMIT, tasks: picked.map((row) => row.task), title: headline, units, shares, dominant, rows, unnamed };
}

/* classifyLevel 已移到 logic/rules.js（入口判定：加权打分，≥2 判任务） */

/* stampCore 已移到 logic/stamp.js（时间码核心，纯函数） */

/* ── 术语（一个词只准一个意思，2026-10-28 你要求）──────────────
   taskIdentity 任务身份：稳定名，work-086 / duty-086 / 089-settings-page。
                只有它能当「一个任务」进窗口、进工单；纯数字不算。
   taskCode     任务代号：三位码（#ABC / ABC / 086），只是显示别名，永远不是身份。
   ticket       工单：work.ndjson 过程行，信息源，会过期。
   snapshot     快照：photo 行，工单信息的临时保留，面板只读它。
   window       窗口：最近 TASK_STATS_LIMIT 个「有身份」的任务。 */

/* ── 任务码与印章：已移到 logic/stamp.js（2026-10-28 拆分）──────────────
   那里有 isTaskCode / isTaskIdentity / taskCode / stampPreview / stampOf、
   ageText / localText / weekText，以及 stampSeen（同码递增尾缀的状态）。
   两条被坑出来的约定也写在那边的文件头：代号不是身份；比对认「同码 + 1 秒内」。 */

async function readText(file) {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

async function fileSize(file) {
  try {
    return (await stat(file)).size;
  } catch {
    return null;
  }
}

async function countFiles(dir) {
  try {
    const names = await readdir(dir, { withFileTypes: true });
    return names.filter((entry) => entry.isFile() && entry.name.endsWith('.md')).length;
  } catch {
    return null;
  }
}

/* parseJson 已移到 store/files.js（2026-10-28） */

function thresholdsOf(policy) {
  const t = policy?.erp?.thresholds ?? {};
  const num = (value, fallback) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback);
  return {
    halfLifeDays: num(t.memoryHalfLifeDays, 20),
    floor: num(t.memoryImportanceFloor, 0.4),
    maxProposals: num(t.maxUnreviewedProposals, 5),
    reinforce: num(t.reinforceThreshold, 5),
  };
}

async function readThresholds(root) {
  return thresholdsOf(parseJson(await readText(join(root, 'krp', 'policy.json'))));
}

/* 同步读：插件刚热重载、系统提示正要取正文时用——别让第一轮读成「空」 */
function readTextSync(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function readThresholdsSync(root) {
  return thresholdsOf(parseJson(readTextSync(join(root, 'krp', 'policy.json'))));
}

/* 四区落点：只认「调用方给的」和「当前布局落盘的」。
   2026-11-05（103 S4）删掉 `root/rings` 那条遗留回退——该目录 2026-11-01 就删了。
   以前缺省时四个区全指向一个不存在的路径，于是「读不到」跟「真的没数据」长得一模一样，
   排查时我据此判过「检索是坏的」。现在缺一张就抛错：宁可响一声，不可静默给假落点。 */
const AREA_KEYS = ['perception', 'memory', 'persona', 'work'];
function resolveAreas(root, areas) {
  const given = areas && typeof areas === 'object' ? areas : {};
  const fromLayout = (activeLayoutMeta && activeLayoutMeta.areas) || {};
  const out = {};
  const missing = [];
  for (const key of AREA_KEYS) {
    const value = given[key] || fromLayout[key];
    if (typeof value === 'string' && value.trim()) out[key] = value.trim();
    else missing.push(key);
  }
  if (missing.length) {
    throw new Error(`四区落点缺失：${missing.join(' / ')}（root=${root}）——调用方必须传 areas，或先让布局落盘`);
  }
  return out;
}

function areaOfKind(kind) {
  if (kind === 'perception') return 'perception';
  if (kind === 'memory') return 'memory';
  if (kind === 'persona' || kind === 'feedback') return 'persona';
  return 'work';
}

/* 落点由一张表决定，没有「默认落 persona」这条路。
   2026-10-28 之前的写法是：一串 if 认得的类型→各分区，剩下的 return 'persona'。
   于是任何写错的 type 都会安静地写进人格账（当天 9 条错位就是这么来的）。
   默认值是最安静的坑：它把错误变成「看起来正常的数据」。现在未知类型直接抛错。 */
const AREA_OF_TYPE = {
  entry: 'ring',
  block: 'memory',
  /* fuse 墓碑挡的是记忆环条目，必须落回记忆账 */
  fuse: 'memory',
  /* 证据账：verify / proof / disproof 指向条目，优先按 ring 落，缺 ring 落记忆账 */
  verify: 'ringOrMemory',
  proof: 'ringOrMemory',
  disproof: 'ringOrMemory',
  /* 097 补：验证闭环的两类行。它们只是诊断/证据，落临时工作区，不污染三环账。
     漏了这两行会让 areaOfRow 直接抛「未知行类型」——这正是验证一直写不进去的原因。 */
  'verify-skip': 'work',
  'recall-hit': 'work',
  /* 介入账：capture / capture-verify 是本轮临时记录，落工作区 */
  capture: 'work',
  'capture-verify': 'work',
  decision: 'work', result: 'work', data: 'work', turn: 'work', gate: 'work',
  taskstats: 'work', cycle: 'work', photo: 'work', cross: 'work',
  /* 2026-10-28 补：这三类以前靠默认分支落人格账，现在逐条写清该去哪 */
  reinforce: 'memory',   /* 同主题已归档后的再次强化标记 */
  drop: 'work',          /* 候选退休墓碑 */
  affect: 'work',        /* 情绪采样，按轮记在工作区 */
  staged: 'persona', proposal: 'persona', confront: 'persona', miss: 'persona',
  /* type:'work' 是「符合度过低、只留作工作经验」的行：故意不落 24h 工作区，
     落在人格账里（不进三环条目、不被清理）。这是既有契约，别顺手改。 */
  work: 'persona',
};

function areaOfRow(row) {
  const type = row && row.type;
  const target = AREA_OF_TYPE[type];
  if (!target) throw new Error(`areaOfRow: 未知行类型 ${JSON.stringify(type)}，拒绝落盘`);
  if (target === 'ring') {
    if (!row.ring) throw new Error(`areaOfRow: ${type} 行缺少 ring 字段，拒绝落盘`);
    return areaOfKind(row.ring);
  }
  if (target === 'ringOrMemory') return row.ring ? areaOfKind(row.ring) : 'memory';
  return target;
}

/* ── 单文件串行锁与追加：已移到 store/files.js（2026-10-28）────────────
   withFileLock 按绝对路径排队、appendArea 追加一行。锁的注释与「054 实测丢过记录」
   的来由一并搬过去了——锁和它的理由不该分居两处。 */

/* 落盘队列：写失败的那一条留在队首，后面的顺序不丢，下一次 flush 整批重试 */
async function flushQueue(queue, write) {
  let wrote = false;
  while (queue.length) {
    const item = queue[0];
    queue.shift();
    try {
      await write(item);
      wrote = true;
    } catch (error) {
      queue.unshift(item);
      if (wrote) invalidateModelCache();
      throw error;
    }
  }
  /* 队列落盘之后读模型必须是新的：否则收尾那一轮会读到「这批还没写进去」的库 */
  if (wrote) invalidateModelCache();
  return true;
}

async function readAllAreas(root, areas) {
  const dirs = resolveAreas(root, areas);
  const entries = Object.entries(AREA_FILES);
  const texts = await Promise.all(entries.map(([key, file]) => readText(join(dirs[key], file))));
  return { dirs, text: texts.filter(Boolean).join('\n') };
}

/* ── 记录导入：把备份包/散装 ndjson 灌回四区 ─────────────────────
   分拣只认每行自带的 type/ring（走 areaOfRow），时间戳只用于去重与「覆盖了哪段时间」的报告。
   去重看 id：同一份备份重复导入不会翻倍。坏行跳过并计数，不阻塞好行。 */
const IMPORT_MAX_FILES = 400;
const IMPORT_MAX_ROWS = 200000;

async function collectNdjsonFiles(target) {
  const info = await stat(target);
  if (info.isFile()) {
    if (!/\.ndjson$/i.test(target)) throw new Error('只认 .ndjson 文件，或包含 .ndjson 的目录');
    return [target];
  }
  if (!info.isDirectory()) throw new Error('这个路径既不是文件也不是目录');
  const files = [];
  const walk = async (dir, depth) => {
    if (depth > 6 || files.length >= IMPORT_MAX_FILES) return;
    let items = [];
    try {
      items = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const item of items) {
      if (files.length >= IMPORT_MAX_FILES) return;
      const full = join(dir, item.name);
      if (item.isDirectory()) await walk(full, depth + 1);
      else if (item.isFile() && /\.ndjson$/i.test(item.name)) files.push(full);
    }
  };
  await walk(target, 0);
  if (!files.length) throw new Error('目录里没有 .ndjson 文件');
  return files;
}

function rowId(row) {
  const id = row && row.id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

async function collectExistingIds(dirs) {
  const ids = new Set();
  const lines = new Set();
  for (const [key, file] of Object.entries(AREA_FILES)) {
    let text = '';
    try {
      text = await readFile(join(dirs[key], file), 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        const id = rowId(row);
        if (id) ids.add(id);
        /* 没有 id 的行（turn / gate / taskstats 等）按整行判重，避免整包再导一遍翻倍 */
        lines.add(JSON.stringify(row));
      } catch {
        /* 坏行跳过 */
      }
    }
  }
  return { ids, lines };
}

async function importRecords(source, dirs) {
  /* 自己四个记录文件不算导入源：把工作区根整个选进来时跳过它们，免得自己灌自己 */
  const areaFiles = new Set(
    Object.entries(AREA_FILES).map(([key, file]) => resolve(join(dirs[key], file)).toLowerCase()),
  );
  const all = await collectNdjsonFiles(source);
  const files = all.filter((file) => !areaFiles.has(resolve(file).toLowerCase()));
  if (!files.length) throw new Error('这些 .ndjson 就是本机四区自己的记录，不用导入');
  const { ids: seen, lines: seenLines } = await collectExistingIds(dirs);
  const report = {
    source,
    files: files.length,
    read: 0,
    imported: 0,
    duplicate: 0,
    bad: 0,
    byArea: { perception: 0, memory: 0, persona: 0, work: 0 },
    range: null,
  };
  let minTs = null;
  let maxTs = null;
  for (const file of files) {
    let text = '';
    try {
      text = await readFile(file, 'utf8');
    } catch {
      report.bad += 1;
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      report.read += 1;
      if (report.read > IMPORT_MAX_ROWS) throw new Error('记录太多，超过单次导入上限');
      let row = null;
      try {
        row = JSON.parse(line);
      } catch {
        report.bad += 1;
        continue;
      }
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        report.bad += 1;
        continue;
      }
      const id = rowId(row);
      const stamp = JSON.stringify(row);
      if ((id && seen.has(id)) || seenLines.has(stamp)) {
        report.duplicate += 1;
        continue;
      }
      if (id) seen.add(id);
      seenLines.add(stamp);
      const area = areaOfRow(row);
      await appendArea(dirs[area], AREA_FILES[area], row);
      report.imported += 1;
      report.byArea[area] += 1;
      const ts = row.ts || row.at || row.createdAt || null;
      const at = typeof ts === 'string' ? Date.parse(ts) : NaN;
      if (Number.isFinite(at)) {
        if (minTs === null || at < minTs) minTs = at;
        if (maxTs === null || at > maxTs) maxTs = at;
      }
    }
  }
  report.range = minTs === null ? null : { from: new Date(minTs).toISOString(), to: new Date(maxTs).toISOString() };
  return report;
}

/* 备份包里的人格层：<source>/persona/* 或 source 本身就是人格目录。
   只补缺的槽位，已有文件不动——导入不等于覆盖。 */
async function restorePersonaFiles(source, personaRoot) {
  const restored = [];
  const skipped = [];
  for (const dir of [join(source, 'persona'), source]) {
    const found = [];
    for (const [id, file] of LAYERS) {
      try {
        const info = await stat(join(dir, file));
        if (info.isFile()) found.push([id, file]);
      } catch {
        /* 这份不在这个目录 */
      }
    }
    if (!found.length) continue;
    for (const [id, file] of found) {
      if (existsSync(join(personaRoot, file))) {
        skipped.push(file);
        continue;
      }
      await installPersonaFile(personaRoot, id, join(dir, file));
      restored.push(file);
    }
    break;
  }
  return { restored, skipped };
}

/* ── 时间衰减 / 极性 / 词元 / 相似度 / 覆盖率：已移到 logic/score.js ──────
   2026-10-28 拆分：这些是纯计算，不该和「解析哪种文件、往哪个区写」混在一起。 */

function recentTasks(entries, decisions, work = [], limit = STAT_WINDOW) {
  const pool = [
    ...entries.map((item) => ({ task: item.task, ts: item.ts })),
    ...decisions.map((item) => ({ task: item.task, ts: item.ts })),
    ...work.map((item) => ({ task: item.task, ts: item.ts })),
  ].filter((row) => typeof row.task === 'string' && row.task);
  pool.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  const tasks = [];
  for (const row of pool) {
    if (!tasks.includes(row.task)) tasks.push(row.task);
    if (tasks.length >= limit) break;
  }
  return tasks;
}

/* 条目身份 entryKey 由 logic/score.js 提供（全工程只认这一处定义） */

function parseRingsText(text, thresholds = { halfLifeDays: 20, floor: 0.4 }, now = Date.now()) {
  const all = lines(text).map(parseJson).filter(Boolean);
  /* 墓碑：24h 未确认的 pending 只写一行 drop，不重写原文件；读时在这里过滤 */
  const dropped = new Set();
  const topicPolarity = new Map();
  for (const row of all) {
    if ((row.type === 'drop' || row.type === 'fuse') && typeof row.ref === 'string') {
      dropped.add(row.ref);
      continue;
    }
    /* 087 起：pending 不再是「不可见」，只是还没被证明；是否降档由状态机按时间算 */
    if (row.type !== 'entry' || !RINGS.includes(row.ring) || typeof row.text !== 'string') continue;
    const key = String(row.topic || row.task || 'general');
    if (!topicPolarity.has(key)) topicPolarity.set(key, new Set());
    topicPolarity.get(key).add(polarityOf(row.text));
  }
  const reinforces = new Map();
  for (const row of all) {
    if (row.type !== 'reinforce' || typeof row.topic !== 'string') continue;
    const prev = reinforces.get(row.topic);
    if (!prev || String(row.ts).localeCompare(prev) > 0) reinforces.set(row.topic, row.ts);
  }
  const feeds = Object.fromEntries(RINGS.map((ring) => [ring, []]));
  const decisions = [];
  const autoTurns = [];
  const workTasks = [];
  let pending = 0;
  let contested = 0;
  let archived = 0;
  /* 087 接线：proof / disproof 是行，不是函数。按 ref 聚合成该条目的证据数与最近一次证明时间。 */
  /* 回验行：ref 指向条目，同一条后写覆盖先写（幂等，重跑不会累加） */
  const verifyRows = new Map();
  for (const row of all) {
    if (row.type !== 'verify' || typeof row.ref !== 'string' || !row.ref) continue;
    verifyRows.set(row.ref, row);
  }
  const entryRingByKey = new Map();
  /* 验证读侧聚合（v1.15.3）：只认 verify 行，读取时按 ref 现算，不重写历史条目。
     曝光计数已按你 2026-10-31 决定移除——它不加分、不参与任何决策，只是噪音。 */
  const verifyProofs = new Map();
  for (const row of all) {
    if (row.type === 'verify' && typeof row.ref === 'string' && row.ref) {
      if (row.used === true || row.method === 'judged') {
        verifyProofs.set(row.ref, (verifyProofs.get(row.ref) || 0) + 1);
      }
    }
  }
  const feedback = new Map();
  for (const row of all) {
    if (row.type !== 'proof' && row.type !== 'disproof') continue;
    if (typeof row.ref !== 'string' || !row.ref) continue;
    const cur = feedback.get(row.ref) || { proofs: 0, lastProofAt: 0 };
    if (row.type === 'proof') {
      cur.proofs += 1;
      const at = Date.parse(row.ts) || 0;
      if (at > cur.lastProofAt) cur.lastProofAt = at;
    } else {
      cur.proofs -= 1;
    }
    feedback.set(row.ref, cur);
  }
  for (const row of all) {
    if (row.type === 'reinforce' || row.type === 'drop') continue;
    if (row.type === 'entry' && RINGS.includes(row.ring) && typeof row.text === 'string') {
      if (dropped.has(entryKey(row))) continue;
      const permanence = row.permanence === 'permanent' || PERMANENT_TAGS.includes(row.kindTag) ? 'permanent' : 'decay';
      const topic = row.topic ?? row.task ?? null;
      const reinforceAt = topic && reinforces.has(topic) ? reinforces.get(topic) : null;
      const anchor = reinforceAt && String(reinforceAt).localeCompare(String(row.ts)) > 0 ? reinforceAt : row.ts;
      /* 按「工作记忆」三分口径：三个区各用各的刻度（参数，不是实现）。
         感知 ring 短（72h）→ 情景性内容自然退场；记忆 ring 160h（=20 天半衰）；
         人格 ring 不衰减（tau=null）。工作区在另一个函数里，τ=4h。 */
      const TAU_BY_RING = { perception: 72, memory: 160, persona: null };
      const ringTau = Object.prototype.hasOwnProperty.call(TAU_BY_RING, row.ring) ? TAU_BY_RING[row.ring] : 160;
      const anchorMs = Date.parse(anchor || row.ts);
      const ageHours = Number.isFinite(anchorMs) ? Math.max(0, (now - anchorMs) / 3_600_000) : 0;
      const baseWeight = (permanence === 'permanent' || ringTau === null)
        ? 1
        : Math.max(0, Math.min(1, retentionOf({ ageHours, hits: 0, tau: ringTau })));
      /* 087 条目不删除，只降档。有证明 → 在用；超过一档（24h）没被证明 → 冷却（权重 ×0.3）；
         冷却满 3 档（72h）→ 归档；被指错（conflict）立刻进冷却。冷却期内被验对一次即复活。 */
      const fb = feedback.get(entryKey(row));
      const proofCount = Math.max(0, fb ? fb.proofs : Number(row.proofs) || 0);
      const proofAt = Math.max(Date.parse(anchor || row.ts || 0) || 0, (fb && fb.lastProofAt) || 0);
      const tickMs = Math.max(1, RULES_STATE.tickHours) * HOUR_MS;
      const ticks = proofAt ? Math.floor(Math.max(0, now - proofAt) / tickMs) : RULES_STATE.ticks;
      let status;
      if (row.state === 'archived') status = 'archived';
      else if (permanence === 'permanent' && !row.conflict) status = 'active';
      else if (baseWeight < thresholds.floor) status = 'archived';
      else if (proofCount > 0) status = 'active';
      else if (ticks >= RULES_STATE.ticks) status = 'archived';
      else if (ticks >= 1 || row.state === 'cooling' || row.conflict) status = 'cooling';
      else status = 'active';
      /* 2026-11-09：阶段不再参与打折 —— 冷却的语义是「待复核」，不是「变淡」；
         变淡是时间的事，已经由 baseWeight 管了。乘 0.3 会让「刚被指错」和
         「很久没被用」混成同一个数。阶段只保留一个作用：归档的不进候选（归零）。 */
      const weight = status === 'archived' ? 0 : baseWeight;
      /* 反向案例：与同 topic 已确认条目 polarity 相反，或自带 conflict 标记；与冷却档位无关 */
      const opposite = Boolean(row.conflict) || Boolean(topicPolarity.get(String(topic || 'general'))?.has(-polarityOf(row.text)));
      if (status === 'cooling') pending += 1;
      if (opposite && status !== 'archived') contested += 1;
      if (status === 'archived') archived += 1;
      entryRingByKey.set(entryKey(row), row.ring);
      /* 2026-11-01 修：把符号化结果带进 model —— 以前这里重建 entry 对象时把它丢了，
         于是 write 侧写了 sym、read 侧读不到，检索永远拿不到符号（Sym 恒为 0），
         接进打分的那一项形同虚设（实测 841 条 entries 里带 sym 的 0 条，而盘上有 82 条）。
         只保留检索真正要用的两个东西：受控符号 id 列表 + act；不留整棵 sym 树，
         免得 model 体积翻倍。canon 全空的行直接给 null —— 它对检索没有可比性
         （symOverlap 会因此返回 0），不给它占位置。 */
      /* 2026-11-01 修（第二轮）：历史行盘上没有 sym，读取时现算兜底。
         不回写文件（不动你的数据），和 area 用同一套办法。
         早先这条链是三段各管一段：写入收口在一处、读取自己过滤一遍、
         打分再按字段拿——任何一段改口径就静默断掉，查的时候只看见 Sym=0。
         现在三段都走 compactSym，只有一个格式。 */
      const symForIndex = compactSym(
        row.sym || (typeof row.text === 'string' ? symbolize(row.text) : null),
      );
      feeds[row.ring].push({
        ring: row.ring, ts: row.ts ?? null, text: row.text, task: row.task ?? null, topic,
        stamp: row.stamp ?? null,
        kindTag: row.kindTag ?? null, permanence,
        /* area 兜底（2026-11-01 修）：历史条目一条 area 字段都没有（113 行全缺）。
           读取时用 inferArea 现算，等价于补写历史，但不动盘上数据、不改你的文件。 */
        area: row.area === 'work' || row.area === 'daily' ? row.area : inferArea(row, row.text),
        /* 检索用符号（紧凑形）：只有 canon + act，没有就 null */
        sym: symForIndex,
        importance: typeof row.importance === 'number' ? row.importance : null,
        weight: Number(weight.toFixed(3)), status,
        /* v1.15.3 两套数分开（方案②）：
           proofs = 排序用，去重（历史 proof 净额 + 有验证就 +1，不随轮次膨胀）
           uses   = 展示用，真实次数（历史 proof 净额 + verify 行数） */
        score: (() => {
          const verifyRows = verifyProofs.get(entryKey(row)) || 0;
          return {
            proofs: proofCount + (verifyRows > 0 ? 1 : 0),
            uses: proofCount + verifyRows,
          };
        })(),
        /* 反向案例标到行上：按需检索要能点名去看它们，不能只知道有几条 */
        contested: Boolean(opposite),
      });
    } else if (row.type === 'decision' && row.shares) {
      const share = (key) => (typeof row.shares[key] === 'number' ? row.shares[key] : 0);
      const total = share('perception') + share('memory') + share('persona');
      if (total <= 0) continue;
      decisions.push({
        ts: row.ts ?? null, task: row.task ?? null, title: row.title ?? null, trigger: row.trigger ?? null,
        stamp: row.stamp ?? null,
        signal: row.signal && typeof row.signal === 'object' ? row.signal : null,
        dominant: row.dominant ?? null, reason: row.reason ?? row.note ?? null,
        shares: { perception: share('perception') / total, memory: share('memory') / total, persona: share('persona') / total },
      });
    } else if (row.type === 'turn' && row.shares && typeof row.shares === 'object') {
      /* 自动判定：每轮收尾写的三环占比，面板优先用它（真裁定优先于它） */
      const share = (key) => (typeof row.shares[key] === 'number' ? row.shares[key] : 0);
      const total = share('perception') + share('memory') + share('persona');
      if (total > 0) {
        autoTurns.push({
          ts: row.ts ?? null, task: row.task ?? null, title: row.title ?? null, kind: row.kind ?? null,
          stamp: row.stamp ?? null,
          tools: typeof row.tools === 'number' ? row.tools : null, source: 'auto', auto: true,
          dominant: row.dominant ?? null,
          shares: { perception: share('perception') / total, memory: share('memory') / total, persona: share('persona') / total },
        });
      }
    } else if (
      (row.type === 'result' || row.type === 'data' || row.type === 'turn')
      && typeof row.task === 'string' && row.task
    ) {
      /* 工作区的任务也算进「最近三次」，否则新任务永远进不了统计窗口 */
      workTasks.push({ task: row.task, ts: row.ts });
    }
  }
  const allEntries = Object.values(feeds).flat();
  const tasks = recentTasks(allEntries, decisions, workTasks);
  /* 窗口 = 最近三次任务的时间跨度：这样新任务一写进来，统计立刻跟着动 */
  const taskTimes = new Map();
  for (const row of [...allEntries, ...decisions, ...workTasks]) {
    if (!row.task) continue;
    const at = Date.parse(row.ts);
    if (!Number.isFinite(at)) continue;
    taskTimes.set(row.task, Math.max(taskTimes.get(row.task) ?? 0, at));
  }
  const windowSince = tasks.reduce((min, task) => Math.min(min, taskTimes.get(task) ?? Infinity), Infinity);
  const inWindow = (row) => {
    if (row.task && tasks.includes(row.task)) return true;
    const at = Date.parse(row.ts);
    return Number.isFinite(at) && Number.isFinite(windowSince) && at >= windowSince;
  };
  const rings = {};
  for (const ring of RINGS) {
    const sorted = feeds[ring].slice().sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
    rings[ring] = { count: sorted.length, windowCount: sorted.filter(inWindow).length, updatedAt: sorted[0]?.ts ?? null, items: sorted.slice(0, FEED_LIMIT).map(displayItem) };
  }
  decisions.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  /* 判定 = 自动判定 + 真裁定，按时间合并（面板的占比图与决策圆都读这一份） */
  const judgements = [
    ...autoTurns,
    ...decisions.map((row) => ({ ...row, source: 'decision', auto: false })),
  ].sort((a, b) => String(b.ts).localeCompare(String(a.ts))).slice(0, DECISION_LIMIT);
  const changes = allEntries.filter(inWindow).sort((a, b) => String(b.ts).localeCompare(String(a.ts))).slice(0, CHANGE_LIMIT)
    .map((item) => ({ ring: item.ring, ts: item.ts, stamp: item.stamp ?? null, text: squeeze(item.text, DISPLAY_TEXT_MAX), task: item.task }));
  const verifyMix = verifyMixOf(Object.fromEntries(MIX_TRACKED.map((ring) => [ring, rings[ring].count])), allEntries, verifyRows);
  return {
    rings, verifyMix, decisions: decisions.slice(0, DECISION_LIMIT), decisionTotal: decisions.length,
    windowDecisionCount: decisions.filter(inWindow).length, entries: allEntries,
    judgements, pending, contested, archived, statsWindow: tasks, changes,
  };
}

/* parseExecutionText 已移到 store/files.js（2026-10-28）。
   白名单只进不出：以后加字段要连口径版本（unitsV / mixV4）一起加，
   否则读盘后所有行都变成「不知道哪一版」，版本过滤等于没做。 */

/* parseWorkText / expireRows 已移到 store/files.js（2026-10-28）。
   两条判龄口径跟着搬过去：坏时间戳用文件 mtime 兜底；未来时间戳按「这张纸实际
   写下的时候」算，不按「现在」——否则每次读到它都当成刚写的，等于永远续命。 */

/* ── 数据来源准则（你 2026-10-26 定）──────────────────────────
   面板侧：汇总工单（三张过程量合并），只供面板统计，滑出面板窗口就删。
   保留侧：各环捕捉，各自独立、共用唯一码，不挂工单。
   唯一交叉口：收尾时把「工单数值」与「环里同码的行」对一次，结论单写一行。 */
const CANDIDATE_LIMIT = 40;                         // 候选槽容量上限
const CANDIDATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;  // 候选 30 天不动就降级（反例永久豁免）

/* 时间码拆解与比对（stampParts / sameCapture / STAMP_SKEW_MS）已移到 logic/stamp.js。
   紧接其后的 crossCheckCapture 仍留在这里：它有 IO、要读四区。 */

async function crossCheckCapture(root, areas, stamp, units, task, options = {}) {
  if (!stamp) return null;
  const dirs = resolveAreas(root, areas);
  const counts = { perception: 0, memory: 0, persona: 0 };
  /* 证据：这一轮真正写进环里的条目。以前只有 capture（从没被调用）才收集，
     现在从落盘行直接取 —— 机械、不用模型配合（2026-10-28 结算改造）。 */
  const evidence = { perception: [], memory: [], persona: [] };
  /* 匹配口径（2026-10-28 实盘修正）：只按 stamp 相等几乎永远对不上——
     工单用的是任务票根码，环条目用的是各自写入时刻的码，两者本来就不同；
     实盘第一轮就出现「工单 3 / 环 0」。改成「同码 或 本轮时间窗内同任务」，
     时间窗由调用方给（本轮用户说话时刻）。 */
  const since = Number(options.since) || 0;
  const inWindow = (row) => Boolean(since) && Boolean(task) && row.task === task
    && Number.isFinite(Date.parse(row.ts)) && Date.parse(row.ts) >= since;
  for (const key of ['perception', 'memory', 'persona']) {
    const text = await readText(join(dirs[key], AREA_FILES[key])).catch(() => '');
    for (const row of lines(text).map(parseJson)) {
      if (!row) continue;
      /* 人格抽象结论按设计不盖时间码（跨时间有效），所以只能按 task 兜底：
         它没有 stamp，也进不了时间窗——这条规则保留原样。 */
      const personaByTask = key === 'persona' && !row.stamp && Boolean(task) && row.task === task;
      if (sameCapture(row.stamp, stamp) || inWindow(row) || personaByTask) {
        counts[key] += 1;
        evidence[key].push(midOf(row));
      }
    }
  }
  const total = Number(units ? (Number(units.perception) || 0) + (Number(units.memory) || 0) + (Number(units.persona) || 0) : 0);
  const captured = counts.perception + counts.memory + counts.persona;
  /* 旧判据只问「环里有没有同码的行」：有 1 行就算过，工单 3 个单位、环里 1 行也判 ok。
     新判据算差值：|捕捉行数 − 工单单位| ≤ 容差才算 match，超了就是 mismatch。
     ok 保留旧义（不破坏既有断言与面板），verdict 是升级后的结论。 */
  const tolerance = 1;
  const delta = Number((captured - total).toFixed(2));
  const ok = total > 0 ? captured > 0 : true;
  const verdict = total > 0 && Math.abs(delta) > tolerance ? 'mismatch' : 'match';
  const row = {
    v: 1, ts: nowIso(), type: 'cross', stamp: stamp || null, task: task ?? null,
    /* 095 阶段 3：环权重观测行（只记录，不参与对账判定） */
    weight: null,   /* Flash：v5 环权重不发，字段保留恒 null，行格式与老数据兼容 */
    panel: { units: units || null, total: Number(total.toFixed(2)) },
    capture: counts, ok, delta, tolerance, verdict,
    /* 证据指针：结算用它填判断卡；单独调用（历史路径）时也留在行上，便于回查 */
    evidence,
    note: verdict === 'match'
      ? '一笔交叉：环捕捉与工单同码对得上（差值在容差内）'
      : `工单与环捕捉差 ${delta}（容差 ±${tolerance}）：口径不一致，需查`,
    text: `交叉比对 · 捕捉 ${captured} 行 / 工单 ${Number(total.toFixed(2))} 单位 / 差 ${delta}`,
  };
  /* collect：不落盘，交给结算与工单同批写（顺序确定，避免「账到了、对账还没到」） */
  if (options.collect) return row;
  await appendArea(dirs.work, AREA_FILES.work, row);
  return row;
}

/* ── 判断卡：已移到 settle/packet.js（2026-10-29 拆分，work-092）──────────
   那里只拼「依据与缺口」，不碰账；行时间与截断由宿主注入。
   本文件不再保留实现，只 import —— 一份实现，两处调用（收尾 + __test）。 */

/* 只负责 IO：读文件、取 mtime、调判定、写临时、rename。
   判定在 store/files.js 的 planSweep 里 —— 那一半给定 now/mtime 就能被断言，
   「偶发丢行」这种故障只有在纯函数上才抓得住。 */
async function sweepWork(root, areas, now = Date.now()) {
  const dirs = resolveAreas(root, areas);
  const path = join(dirs.work, AREA_FILES.work);
  /* 与 appendArea 共用同一把锁：读→过滤→写临时→rename 期间不许有人追加 */
  return withFileLock(path, async () => {
    const text = await readText(path);
    if (!text) return { removed: 0, kept: 0 };
    /* 坏时间戳按文件修改时间兜底：写错日期的便签不会再永远贴着 */
    const info = await stat(path).catch(() => null);
    const mtimeMs = info ? info.mtimeMs : now;
    const plan = planSweep(text, { now, mtimeMs, photoLimit: PHOTO_LIMIT });
    if (!plan.changed) return { removed: 0, kept: plan.kept };
    const tmp = path + '.tmp';
    await writeFile(tmp, plan.text, 'utf8');
    await rename(tmp, path);
    invalidateModelCache();
    return { removed: plan.removed, kept: plan.kept };
  });
}

/* ── 临时区「确认存储后立刻清」───────────────────────────────────
   规则（你定）：某个任务的内容已经进了记忆区（感知/记忆/人格/反馈），
   或已经沉淀成记忆块 —— 就把该任务在工作区的执行/素材行降级成一行短标签。
   正文清空，只留标题 + ts + 指向哪条记忆的机器可读指针；24 小时后连标签一起清。
   turn（占比图数据源）、decision（治理记录）不动。

   判定在 store/files.js 的 planPurge 里；这里只负责「读四区算账 → 拿锁 → 调判定 → 落盘」。 */

async function purgeStored(root, areas, modelArg) {
  const model = modelArg ?? readModelFrom((await readAllAreas(root, areas)).text, await readThresholds(root));
  const stored = new Map();
  for (const entry of model.entries) {
    if (!entry.task || stored.has(entry.task)) continue;
    stored.set(entry.task, { kind: entry.ring, stamp: entry.stamp ?? null, ts: entry.ts ?? null });
  }
  for (const block of model.blocks) {
    if (block.status !== 'active' || !block.task || stored.has(block.task)) continue;
    stored.set(block.task, { kind: 'block', stamp: block.stamp ?? null, ts: block.ts ?? null });
  }
  if (!stored.size) return { purged: 0, total: 0 };
  const dirs = resolveAreas(root, areas);
  const path = join(dirs.work, AREA_FILES.work);
  return withFileLock(path, async () => {
    const text = await readText(path);
    if (!text) return { purged: 0, total: 0 };
    const plan = planPurge(text, { stored, nowIso });
    if (!plan.changed) return { purged: 0, total: plan.total };
    const tmp = path + '.tmp';
    await writeFile(tmp, plan.text, 'utf8');
    await rename(tmp, path);
    invalidateModelCache();
    return { purged: plan.purged, total: plan.total };
  });
}

function readModelFrom(text, thresholds) {
  const parsed = parseRingsText(text, thresholds);
  const rows = lines(text).map(parseJson).filter(Boolean);
  const workRows = parseWorkText(text);
  return {
    rings: parsed.rings, verifyMix: parsed.verifyMix, decisions: parsed.decisions, decisionTotal: parsed.decisionTotal,
    windowDecisionCount: parsed.windowDecisionCount, entries: parsed.entries, judgements: parsed.judgements,
    pending: parsed.pending, contested: parsed.contested, archived: parsed.archived, statsWindow: parsed.statsWindow, changes: parsed.changes,
    /* 已降级成「只留地址」的行没有正文，别拿它当「最近执行」——摘要那里要显示的是有内容的最后一次 */
    execution: workRows.filter((row) => row.type === 'result' && !row.expired && !row.purged).slice(0, EXECUTION_LIMIT).map(workRowView),
    workRows,
    blocks: rows.filter((row) => row.type === 'block'),
    staged: rows.filter((row) => row.type === 'staged'),
    proposals: rows.filter((row) => row.type === 'proposal'),
    pipelineWork: rows.filter((row) => row.type === 'work'),
    confronts: rows.filter((row) => row.type === 'confront'),
    misses: rows.filter((row) => row.type === 'miss'),
    cycles: rows.filter((row) => row.type === 'cycle'),
  };
}

/* 读模型复用（2026-11-01）：13 个函数各自 readModel，每次把四份 ndjson 全读全析，
   900 条实测 33.7 ms/次，一轮里能读四五遍。失效条件三条，缺一不可：
     · 本进程写过盘（STORE_WRITE_SEQ 变）→ 立刻失效。检索绝不能读到「刚写完之前」的旧库
     · 四区目录变了（换 workspace / 换 area 配置）→ 失效
     · 2 秒 TTL → 兜住我用编辑器直接改 ndjson 的情况
   命中时给浅拷贝 + 数组副本：调用方 sort/push 不会污染缓存，与无缓存时行为一致。 */
const MODEL_CACHE_TTL_MS = 2000;
let STORE_WRITE_SEQ = 0;
const modelCache = { key: null, at: 0, model: null };
function invalidateModelCache() {
  STORE_WRITE_SEQ += 1;
  modelCache.key = null;
  modelCache.at = 0;
  modelCache.model = null;
}
function cloneModel(model) {
  const copy = { ...model };
  for (const [key, value] of Object.entries(copy)) {
    if (Array.isArray(value)) copy[key] = value.slice();
    else if (value && typeof value === 'object') copy[key] = { ...value };
  }
  return copy;
}
/* thresholds 可省略：17 个调用点里一半要自己先 readThresholds 再传进来，
   漏传就是 TypeError 抛在 1500 行外的 decayWeight 里。现在省略即自读。 */
async function readModel(root, thresholds, areas) {
  const th = thresholds && typeof thresholds === 'object' ? thresholds : await readThresholds(root);
  const dirs = resolveAreas(root, areas);
  const key = [dirs.perception, dirs.memory, dirs.persona, dirs.work, STORE_WRITE_SEQ, th.halfLifeDays ?? 'x'].join('|');
  const now = Date.now();
  if (modelCache.model && modelCache.key === key && now - modelCache.at < MODEL_CACHE_TTL_MS) {
    return cloneModel(modelCache.model);
  }
  const { text } = await readAllAreas(root, areas);
  const model = readModelFrom(text, th);
  modelCache.key = key;
  modelCache.at = Date.now();
  modelCache.model = model;
  return cloneModel(model);
}

/* 同步读四区：插件热重载后的第一轮系统提示要用它，避免出现「尚未读到四区数据」 */
function readAllAreasSync(root, areas) {
  const dirs = resolveAreas(root, areas);
  const text = Object.entries(AREA_FILES).map(([key, file]) => readTextSync(join(dirs[key], file))).filter(Boolean).join('\n');
  return { dirs, text };
}

/* 读最近一张判断卡（同步、只读工作区文件）。
   readModel 的 workRows 只认 result/data/turn/taskstats/photo，decision 不在里面，
   所以重启兜底不能走 model，必须自己捞一遍。 */
function readLastPacketSync(root, areas) {
  try {
    const dirs = resolveAreas(root, areas);
    const text = readTextSync(join(dirs.work, AREA_FILES.work)) || '';
    let best = null;
    for (const line of lines(text)) {
      const row = parseJson(line);
      if (!row || row.packet !== true || !row.nextInject) continue;
      if (!best || String(row.ts) > String(best.ts)) best = row;
    }
    return best;
  } catch {
    return null;
  }
}

function readModelSync(root, areas) {
  const thresholds = readThresholdsSync(root);
  const built = readModelFrom(readAllAreasSync(root, areas).text, thresholds);
  /* 2026-11-09：带给下游 —— 检索时人格没建立就不该翻记忆区 */
  built.memoryActive = personaActive(root, areas);
  return { thresholds, model: built };
}

async function readRings(root, areas) {
  const thresholds = await readThresholds(root);
  const model = await readModel(root, thresholds, areas);
  return { rings: model.rings, decisions: model.decisions.slice(0, DECISION_LIMIT), pending: model.pending, contested: model.contested, archived: model.archived, thresholds };
}

async function ensureBaseline(root) {  const path = join(root, 'rings', 'baseline.json');
  const existing = parseJson(await readText(path));
  if (existing && existing.hashes) return existing;
  const hashes = {};
  for (const file of BASELINE_FILES) {
    const text = await readText(join(root, file));
    hashes[file] = text ? sha(text) : null;
  }
  const baseline = { v: 1, createdAt: nowIso(), hashes, note: '最初设定指纹；只允许表达态变化，价值/边界/关系失真即报警' };
  await mkdir(join(root, 'rings'), { recursive: true });
  await writeFile(path, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
  return baseline;
}

async function checkDrift(root) {
  const baseline = await ensureBaseline(root);
  const changed = [];
  for (const file of BASELINE_FILES) {
    const text = await readText(join(root, file));
    if (baseline.hashes[file] !== (text ? sha(text) : null)) changed.push(file);
  }
  return { drift: changed.length > 0, changed, baselineAt: baseline.createdAt };
}

function defaultKindTag(kind) {
  return kind === 'perception' ? 'fact' : 'lesson';
}

function computeImportance(fields, repetitionCount) {
  const explicit = fields.explicit === false ? 0 : 1;
  const repetition = Math.min(1, (Number(repetitionCount) || 0) / 3);
  const emotion = Math.min(1, Math.abs(Number(fields.emotion) || 0) / 2);
  const tag = fields.kindTag || defaultKindTag(fields.kind);
  const consequence = PERMANENT_TAGS.includes(tag) ? 1 : tag === 'preference' ? 0.5 : 0.2;
  return 0.35 * explicit + 0.25 * repetition + 0.2 * emotion + 0.2 * consequence;
}

function structuralAlignment(text, kindTag, sameTopicCount, opposite) {
  let score = 0.5;
  if (sameTopicCount > 0) score += 0.15;
  if (opposite) score -= 0.4;
  if (PERMANENT_TAGS.includes(kindTag)) score += 0.2;
  if (/(越权|绕过|未经批准|泄露|删库|不告诉你)/.test(text)) score -= 0.5;
  return clamp01(score);
}

/* 关于你的抽象经验：喜好、称呼、说话方式、情绪习惯、触发点、性格特质。
   这些多半是闲聊里露出来的，不是哪个任务的产出。 */
const DAILY_TAGS = new Set(['preference', 'nickname', 'style', 'emotion', 'trigger', 'trait']);

function inferArea(fields, text) {
  if (fields.area === 'work' || fields.area === 'daily') return fields.area;
  /* 2026-10-28（你定）：闲聊不是零产出——它攒的是抽象经验。
     以前这里纯靠关键词猜（累/陪/聊…），会把「说话别带句号」这种偏好猜成 work 区。
     现在：没带 task、且标签是关于你的 → 一律 daily。
     有 task 的条目不受影响（工作记忆照旧走下面的判定），所以不会抢工作区。 */
  const tag = fields.kindTag || defaultKindTag(fields.kind);
  /* 2026-11-01 修：代号（#6DC / #4EA）不是任务身份（isTaskIdentity 也这么判），
     不该阻断 daily 判定。「你一直叫我臭鱼」那条就因为带 task="#6DC" 被判成 work，
     从闲聊经验区整条漏掉——称呼是顺带说的，不是那个任务的产出。 */
  const taskId = String(fields.task || '').trim();
  const hasRealTask = Boolean(taskId) && !taskId.startsWith('#');
  if (!hasRealTask && DAILY_TAGS.has(tag)) return 'daily';
  return /(累|陪|睡|心情|玩|聊|撒娇|困|抱|哄)/.test(text) ? 'daily' : 'work';
}

/* 写入落点：buffer 存在时先入内存队列（延迟入账），收尾统一 appendArea；不存在时直写。
   队列按调用顺序 drain，保证同一个任务的行序不乱。 */
/* 2026-11-09（你要的冷启动顺序）：人格绑之前，记忆不生效。
   记忆是「人格的经历」——没有「谁」，就没有可归属的积累；感知不受影响（那是事实），
   DSH 的会话上下文也照常（那是宿主的事，插件不碰）。
   这里只判断「人格区有没有真实条目」，5 秒缓存，避免每条写入都读一次盘。 */
let personaGateCache = { at: 0, active: true };
function personaActive(root, areas) {
  const now = Date.now();
  if (now - personaGateCache.at < 5000) return personaGateCache.active;
  try {
    const dirs = resolveAreas(root, areas);
    const txt = readTextSync(join(dirs.persona, AREA_FILES.persona));
    const active = Boolean(txt && txt.trim());
    personaGateCache = { at: now, active };
    return active;
  } catch {
    return personaGateCache.active;
  }
}

async function appendRow(root, areas, row, buffer) {
  if (!row || typeof row !== 'object') throw new Error('appendRow requires row');
  /* 唯一码在这里补：三环条目 / 裁定 / 执行 / turn / miss / block / confront 全是这一条写入口。
      例外：人格环的抽象结论（trait/style/emotion/boundary…）与待定稿 staged 不盖时间码——
      它们是跨时间有效的「我是谁」，不是「我几点做了什么」；只留 ts 记观察时刻。 */
  const abstract = row.ring === 'persona' || row.type === 'staged';
  if (!row.stamp && !abstract) row.stamp = stampOf(new Date(), row.task);
  /* sym 收口到这里（2026-11-01）：appendRow 是**所有**行的唯一写入口，
     以前只有入口捕捉那一处写 sym，于是 work 762 / memory 116 / persona 131
     共 1009 行全空——检索第四项 Sym 实际只覆盖 46 行，占全库 2.3%，
     等于这个权重挂在了一个几乎不存在的量上。
     现在：任何带 text 的行在这里补一次，已有就跳过（入口那条保留自己的校验结果）。
     失败不阻断写入，只记因——和一个可选字段应有的代价一致。 */
  if (!row.sym && typeof row.text === 'string' && row.text.trim()) {
    try {
      const built = compactSym(symbolize(row.text));
      if (built) row.sym = built;
    } catch (err) {
      liveState.symError = String((err && err.message) || err);
    }
  }
  if (typeof row.task === 'string' && row.task.trim()) {
    lastTaskSeen.task = row.task.trim();
    lastTaskSeen.at = Date.now();
  }
  const dirs = resolveAreas(root, areas);
  const area = areaOfRow(row);
  /* 人格未建立 → 记忆这一环不攒。感知/人格/工作区照常走，
     所以「记住发生了什么」还在，只是不往上堆「我的记忆」。 */
  if (area === 'memory' && !personaActive(root, areas)) {
    liveState.memoryGated = true;
    return 'gated';
  }
  if (typeof buffer === 'function') buffer(dirs[area], AREA_FILES[area], row);
  else {
    await appendArea(dirs[area], AREA_FILES[area], row);
    invalidateModelCache();
  }
  return area;
}

async function appendRecord(root, kind, fields, areas, buffer) {
  if (kind === 'capture') {
    const checked = checkCapture({ task: fields.task, tone: fields.tone, ringItems: fields.ringItems });
    if (!checked.ok) return { ok: false, errors: checked.errors };
    const row = {
      v: 1, ts: nowIso(), type: 'capture', ...checked.value,
      stamp: stampOf(new Date(), checked.value.task), verified: null,
    };
    await appendRow(root, areas, row, buffer);
    pendingCapture = { ref: entryKey(row), row };
    for (const item of checked.value.ringItems) {
      turnCaptured.push({ ref: entryKey(row), ring: item.ring, kindTag: item.kindTag, text: item.text });
    }
    return { ok: true, capture: row, pending: true };
  }
  if (kind === 'verify') {
    const ref = typeof fields.ref === 'string' ? fields.ref.trim() : '';
    if (!ref) throw new Error('verify 需要 ref（被回验条目的 key）');
    const row = {
      v: 1, ts: nowIso(), type: 'verify', ref,
      used: fields.used === true,
      method: fields.method === 'judged' ? 'judged' : 'lexical',
      score: Number.isFinite(Number(fields.score)) ? Number(fields.score) : null,
      evidence: Array.isArray(fields.evidence) ? fields.evidence.map(String).slice(0, 4) : (typeof fields.evidence === 'string' ? [fields.evidence] : []),
      algo: 'verify-v1',
      task: fields.task ?? null,
    };
    await appendRow(root, areas, row, buffer);
    return row;
  }
  if (!KINDS.includes(kind)) throw new Error(`unknown kind: ${kind}`);
  const ts = nowIso();
  const task = typeof fields.task === 'string' ? fields.task : null;

  if (kind === 'execution') {
    const data = fields.data && typeof fields.data === 'object' ? fields.data : null;
    const row = { v: 1, ts, type: 'result', task, title: fields.title ?? null, output: fields.text ?? fields.output ?? null, method: fields.method ?? null, data };
    /* 工单是信息源，快照要把它「抄一遍」留着：拍快照时把这条的描述带进 photo 行，
       24h 后工单被清掉，面板的详情还读得到（你的口径：快照就是防这个的）。 */
    if (task) {
      workDetailByTask.set(task, { title: row.title, method: row.method, output: row.output });
      if (workDetailByTask.size > 64) workDetailByTask.delete(workDetailByTask.keys().next().value);
    }
    await appendRow(root, areas, row, buffer);
    return row;
  }

  if (kind === 'decision') {
    const shares = fields.shares && typeof fields.shares === 'object' ? fields.shares : null;
    const total = shares ? RINGS.slice(0, 3).reduce((sum, key) => sum + (Number(shares[key]) || 0), 0) : 0;
    if (!shares || total <= 0) throw new Error('decision requires shares {perception,memory,persona} summing > 0');
    const row = {
      v: 1, ts, type: 'decision', task, title: fields.title ?? null, trigger: fields.trigger ?? null,
      signal: ['confirm', 'adjust', 'recheck'].includes(fields.signal) ? { kind: fields.signal, object: fields.object ?? null, until: fields.until ?? null } : null,
      dominant: fields.dominant ?? null,
      shares: { perception: (Number(shares.perception) || 0) / total, memory: (Number(shares.memory) || 0) / total, persona: (Number(shares.persona) || 0) / total },
      reason: fields.reason ?? fields.text ?? null,
    };
    await appendRow(root, areas, row, buffer);
    const routed = { memory: null, work: null };
    if (typeof fields.memory === 'string' && fields.memory.trim()) {
      routed.memory = await appendRecord(root, 'memory', { text: fields.memory.trim(), task, topic: fields.topic ?? task ?? 'general', kindTag: 'lesson', force: true }, areas, buffer);
    }
    if (typeof fields.work === 'string' && fields.work.trim()) {
      const workRow = { v: 1, ts, type: 'data', task, label: 'task-data', text: fields.work.trim() };
      await appendRow(root, areas, workRow, buffer);
      routed.work = workRow;
    }
    return { ...row, routed };
  }

  if (typeof fields.text !== 'string' || !fields.text.trim()) throw new Error('entry requires text');
  const thresholds = await readThresholds(root);
  const model = await readModel(root, thresholds, areas);
  const topic = (typeof fields.topic === 'string' && fields.topic.trim()) || task || 'general';
  const kindTag = fields.kindTag || defaultKindTag(kind);
  if (fields.affectsPersona === true || PERSONA_TAGS.includes(kindTag)) {
    return routePersonaEntry(root, kind, fields, thresholds, model, areas, buffer);
  }
  const repetition = model.entries.filter((item) => item.topic === topic).length;
  const importance = Number(computeImportance({ ...fields, kind, kindTag }, repetition).toFixed(3));
  if (importance < 0.35 && fields.force !== true) {
    return { skipped: true, reason: 'importance below 0.35 — 只算一句观察，不进长期记忆（force 可强制）', importance, topic };
  }
  const permanence = fields.permanence === 'permanent' || PERMANENT_TAGS.includes(kindTag) ? 'permanent' : 'decay';
  const archivedSameTopic = model.entries.some((item) => item.topic === topic && item.status === 'archived');
  if (archivedSameTopic) await appendRow(root, areas, { v: 1, ts, type: 'reinforce', topic }, buffer);
  const row = {
    v: 2, ts, type: 'entry', ring: kind, task, topic, text: fields.text.trim(), kindTag,
    /* area 落盘（2026-11-01 修）：inferArea 一直算得出 work/daily，但从来没写进行里。
       后果：113 行记忆里 area 字段一条都没有，按 area=daily 查「闲聊经验区」永远 0 条。
       「肥鱼」「臭鱼」这些称呼明明在库、grep 得到，走 daily 通道却查不到——就是这么丢的。 */
    area: inferArea(fields, fields.text),
    status: importance >= 0.55 ? 'active' : 'pending', importance, permanence, weight: 1,
  };
  await appendRow(root, areas, row, buffer);
  if (MIX_TRACKED.includes(row.ring)) {
    turnCaptured.push({ ref: entryKey(row), ring: row.ring, kindTag: row.kindTag, text: row.text });
    if (turnCaptured.length > 48) turnCaptured.shift();
  }
  /* 同主题同极性再来一条 → 给最早那条落 proof（等价于「被验对」，能把冷却拉回在用） */
  const agree = model.entries.find((item) => item.topic === topic && polarityOf(item.text) === polarityOf(row.text));
  if (agree) await appendRow(root, areas, { v: 1, ts, type: 'proof', ring: agree.ring ?? null, ref: entryKey(agree), reason: 'same-polarity-repeat', by: ts }, buffer);
  return { ...row, reinforcedTopic: archivedSameTopic ? topic : null, thresholds };
}

async function routePersonaEntry(root, kind, fields, thresholds, modelArg, areas, buffer) {
  const model = modelArg ?? (await readModel(root, thresholds, areas));
  const ts = nowIso();
  const task = fields.task ?? null;
  const topic = (typeof fields.topic === 'string' && fields.topic.trim()) || task || 'general';
  const kindTag = fields.kindTag || 'trait';
  const text = fields.text.trim();
  const sameTopic = model.entries.filter((item) => item.topic === topic);
  const opposite = sameTopic.find((item) => polarityOf(item.text) !== polarityOf(text)) || null;
  const structural = structuralAlignment(text, kindTag, sameTopic.length, Boolean(opposite));
  const selfScore = Number.isFinite(Number(fields.alignment)) ? clamp01(Number(fields.alignment)) : null;
  const alignment = Number((selfScore === null ? structural : Math.min(structural, selfScore)).toFixed(3));

  if (alignment < WORK_ONLY_ALIGNMENT) {
    const row = { v: 1, ts, type: 'work', task, topic, text, alignment, note: '仅作工作经验，不进智能体记忆' };
    await appendRow(root, areas, row, buffer);
    return { routed: 'worklog', alignment, row };
  }
  if (opposite) {
    const row = {
      v: 2, ts, type: 'entry', ring: kind, task, topic, text, kindTag, alignment,
      area: inferArea(fields, text),
      /* pending 只留给「候选未核验」；冲突条目本身是在用条目，只带 conflict 标记 */
      status: 'active', importance: 0.6, permanence: 'decay', weight: 1,
      conflict: { old: opposite.text, new: text, question: '与已有记忆相反，等你确认' },
    };
    await appendRow(root, areas, row, buffer);
    /* 与旧条目极性相反 → 给旧条目落 disproof（旧实现里这条链是空的） */
    await appendRow(root, areas, { v: 1, ts, type: 'disproof', ring: opposite.ring ?? 'persona', ref: entryKey(opposite), reason: 'polarity-opposite', by: ts }, buffer);
    return { routed: 'conflict', alignment, row };
  }
  const stagedBefore = model.staged;
  const row = { v: 1, ts, type: 'staged', task, topic, text, kindTag, alignment, status: 'preprocessed' };
  await appendRow(root, areas, row, buffer);
  const sameCount = stagedBefore.filter((item) => item.topic === topic).length + 1;
  const total = stagedBefore.length + 1;
  const ratio = total >= STAGING_MIN_FOR_RATIO ? sameCount / total : null;
  const blocked = ratio !== null && ratio > TAG_INFLUENCE_CAP;
  let proposal = null;
  if (sameCount >= thresholds.reinforce && !blocked) {
    const open = model.proposals.some((item) => item.topic === topic && item.status === 'proposed');
    if (!open) {
      proposal = {
        v: 1, ts, type: 'proposal', id: 'pch-' + sha(topic + ts), topic, kindTag,
        delta: MICRO_DELTA, evidence: sameCount, ratio, status: 'proposed',
        reason: `同主题已出现 ${sameCount} 次，建议对 ${kindTag} 做 ≤0.01% 的微调（需过 KRP 门禁）`,
      };
      await appendRow(root, areas, proposal, buffer);
    }
  }
  return { routed: 'staging', alignment, row, proposal, ratio, blocked };
}

async function consolidate(root, fields, areas, buffer) {
  const text = typeof fields.text === 'string' ? fields.text.trim() : '';
  const topic = (typeof fields.topic === 'string' && fields.topic.trim()) || 'general';
  if (!text) return { ok: false, reason: 'consolidate 需要 text（提炼后的一句话）' };
  const thresholds = await readThresholds(root);
  const model = await readModel(root, thresholds, areas);
  const area = inferArea(fields, text);
  const active = model.blocks.filter((item) => item.status === 'active' && item.area === area);
  const duplicate = active.find((item) => item.topic === topic && similarity(item.text, text) >= DUP_SIMILARITY);
  if (duplicate) return { ok: false, reason: 'duplicate', block: duplicate };
  const conflict = active.find((item) => item.topic === topic && polarityOf(item.text) !== polarityOf(text));
  const status = conflict ? 'pending' : 'active';
  const sources = model.entries.filter((item) => item.topic === topic).map((item) => item.ts);
  const value = clamp01(Number.isFinite(Number(fields.value)) ? Number(fields.value) : Math.min(1, 0.4 + 0.1 * sources.length));
  const ts = nowIso();
  const block = {
    v: 1, type: 'block', id: 'blk-' + sha(topic + ts), ts, area, topic, task: fields.task ?? null, text,
    tags: Array.isArray(fields.tags) ? fields.tags.slice(0, 6) : [],
    value: Number(value.toFixed(2)), sources: sources.slice(0, 12), status,
    conflict: conflict ? { old: conflict.text, new: text } : null,
  };
  await appendRow(root, areas, block, buffer);
  /* 提炼一律不进人格（v1.15 统一）：人格是抽象层，单条记忆不能自动改写它 */
  return { ok: true, block };
}

/* ── 记忆融合（v1.13）：扩记忆块，不新开类型 ─────────────────────
   你定：相似记忆压缩提炼成一条，挂「记忆块」（type:'block'，记忆环原生类型），
   成员打墓碑挡掉（读时看不见，文件不删）；差异句原样保留。
   三条硬边界：①块不挂任务（task:null），不污染占比与三窗口；
   ②只靠 mid 互证，不依赖任何工作行（工单 24h 清掉也不影响）；
   ③人格是抽象层——块只在记忆环写，绝不调 routePersonaEntry。 */
const FUSE_MIN_SIM = 0.35;      // 同 topic 内的粗筛：0.62 连同义改写都进不来（实测 a-b 0.426）
const FUSE_CROSS_SIM = 0.5;     // 跨 topic 要更高才合：topic 多是任务号，不同任务的同主题经验也得能并
const FUSE_MAX_MEMBERS = 5;     // 组内超过 5 条主题太宽，压出来必糊
const FUSE_MAX_GROUPS = 8;      // 单批最多 8 组，防一次性大清洗

function fusePlan(model, options = {}) {
  const rows = (model.entries || []).filter((e) => e.ring === 'memory' && e.status === 'active' && !e.fused);
  const groups = [];
  const used = new Set();
  const limit = Math.max(1, Math.min(FUSE_MAX_GROUPS, Number(options.maxGroups) || FUSE_MAX_GROUPS));
  const keyOf = (row) => row.stamp || `${row.ring}:${row.ts}`;
  for (let i = 0; i < rows.length && groups.length < limit; i += 1) {
    const lead = rows[i];
    if (used.has(keyOf(lead))) continue;
    const members = [{ ...lead, mid: midOf(lead), similarity: 1 }];
    for (let j = i + 1; j < rows.length && members.length < FUSE_MAX_MEMBERS; j += 1) {
      const other = rows[j];
      if (used.has(keyOf(other))) continue;
      const sameTopic = String(lead.topic || '') === String(other.topic || '');
      const sim = Math.max(similarity(lead.text, other.text), coverage(other.text, lead.text));
      /* 同 topic 用低门槛；跨 topic（多是不同任务号）要高相似才合——否则同主题的经验永远并不到一起 */
      if (sim < (sameTopic ? FUSE_MIN_SIM : FUSE_CROSS_SIM)) continue;
      members.push({ ...other, mid: midOf(other), similarity: Number(sim.toFixed(3)) });
      used.add(keyOf(other));
    }
    if (members.length < 2) continue;
    used.add(keyOf(lead));
    groups.push({
      topic: lead.topic || 'general',
      memberCount: members.length,
      similarity: Number(Math.max(...members.slice(1).map((m) => m.similarity || 0)).toFixed(3)),
      members: members.map((m) => ({ mid: m.mid, stamp: m.stamp ?? null, task: m.task ?? null, ts: m.ts ?? null, text: m.text })),
    });
  }
  return groups;
}

/* 写一次融合：先落块（结论），再落墓碑（挡成员）。
   顺序刻意如此——块先成功最多是「内容还看得见」（可重跑），碑先成功而块失败就是「成员没了、结论也没写」。 */
async function fuseApply(root, areas, fields = {}, buffer) {
  const text = typeof fields.text === 'string' ? fields.text.trim() : '';
  const kept = Array.isArray(fields.kept)
    ? fields.kept.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
    : [];
  const wanted = Array.isArray(fields.members) ? fields.members : [];
  if (wanted.length < 2) return { ok: false, reason: '融合至少要有两条成员' };
  if (!text) return { ok: false, reason: '融合需要 text（提炼句，由模型写）' };
  if (!kept.length) return { ok: false, reason: '没有差异句就不叫融合：纯重复请用 consolidate 去重' };
  const thresholds = await readThresholds(root);
  const model = await readModel(root, thresholds, areas);
  const byMid = new Map((model.entries || []).map((entry) => [midOf(entry), entry]));
  const picked = [];
  for (const raw of wanted) {
    const item = typeof raw === 'string'
      ? byMid.get(raw)
      : (byMid.get(raw && raw.mid) || (raw && raw.stamp ? (model.entries || []).find((entry) => entry.stamp === raw.stamp) : null));
    if (!item) return { ok: false, reason: `成员找不到：${typeof raw === 'string' ? raw : JSON.stringify(raw)}` };
    /* 人格隔离：这是断言，不是注释 */
    if (item.ring !== 'memory') return { ok: false, reason: '融合只在记忆环内发生（人格/感知条目不参与）' };
    if (picked.some((entry) => midOf(entry) === midOf(item))) continue;
    picked.push(item);
  }
  if (picked.length < 2) return { ok: false, reason: '有效成员不足两条' };
  const topic = (typeof fields.topic === 'string' && fields.topic.trim()) || picked[0].topic || 'general';
  const ts = nowIso();
  const fusionId = 'fz-' + sha(`${topic}|${ts}`).slice(0, 10);
  const block = {
    v: 1, type: 'block', id: 'blk-' + sha(topic + ts), ts,
    area: 'work', topic, task: null, text,
    tags: Array.isArray(fields.tags) ? fields.tags.slice(0, 6) : [],
    value: 1, status: 'active', conflict: null,
    fused: true, fusion_id: fusionId, kept,
    members: picked.map((item) => ({ mid: midOf(item), stamp: item.stamp ?? null, task: item.task ?? null, ts: item.ts ?? null })),
    sources: picked.map((item) => item.ts).slice(0, 12),
  };
  await appendRow(root, areas, block, buffer);
  for (const item of picked) {
    await appendRow(root, areas, { v: 1, ts: nowIso(), type: 'fuse', ref: entryKey(item), reason: `fused-into ${fusionId}` }, buffer);
  }
  return { ok: true, block, fused: picked.length, fusion_id: fusionId };
}

/* ── 提炼器（v1.15）：一套逻辑，三种输入 ──────────────────────────
   你 2026-10-26 定：融合就是提炼与压缩，不该有三份实现。
     · 记忆条目按相似度聚 → fuse（原行为，成员打墓碑）
     · 记忆条目按主题聚 → consolidate（人工给结论，源条不删）
     · 捕捉分句按「主体+谓词+极性」聚 → refine（新增，簇 ≥3 自动）
   出口统一写记忆块（type:'block'）+ kept 差异句 + 来源编号（derivedFrom）。
   三条硬边界：块不挂任务、只靠号码互证、绝不写人格环（这里没有 routePersonaEntry）。 */
const REFINE_MIN_MEMBERS = 3;   // 簇规模阈值：1 条代表 + 至少 2 条同簇
const REFINE_CLAUSE_MIN = 6;    // 分句短于 6 字不进池（「记得下次点」这种碎片）
const REFINE_CORE_MIN = 4;      // 剥掉说话人前缀后，主体+谓词+宾语 ≥4 字就算完整信息（「我不喜欢姜」）
const REFINE_PREDICATES = ['想要', '不要', '喜欢', '讨厌', '需要', '必须', '禁止', '位于', '是', '会', '能', '要', '用'];
const REFINE_NEG = /(不|别|没|勿|讨厌|禁止)/;
/* 说话人前缀：真实语料几乎每句都带「你说/他说」，不剥掉主体就变成「你说我」 */
const REFINE_LEAD = /^(?:而且|但是|然后|所以|另外|其实|就是|还有)?(?:你|用户|蓝潮|他|她|我)?(?:说过|说道|说|问|讲|提到|觉得|认为|确认|同意|要求|希望|提醒)/;

function clausesOf(text = '') {
  /* 逗号也切：一句里塞两件事时，后半句否则会被吞进宾语 */
  return String(text || '').split(/[。！？；，,\n]/).map((s) => s.trim()).filter((s) => s.length >= REFINE_CLAUSE_MIN);
}

/* 切「主体 + 谓词 + 极性 + 宾语」；谓词表外返回 null——宁可不成簇，不可错并 */
function frameOf(clause = '') {
  let body = String(clause || '').trim().replace(/^["'「『（(\s]+|["'」』）)\s]+$/g, '');
  /* 剥两轮： 「而且你说…」这种双层前缀 */
  for (let i = 0; i < 2; i += 1) {
    const stripped = body.replace(REFINE_LEAD, '').replace(/^[，,：:\s]+/, '');
    if (stripped === body) break;
    body = stripped;
  }
  if (body.length < REFINE_CORE_MIN) return null;
  const predicate = REFINE_PREDICATES.find((word) => body.includes(word));
  if (!predicate) return null;
  const at = body.indexOf(predicate);
  let subject = body.slice(0, at).replace(/[，,、\s]/g, '');
  let object = body.slice(at + predicate.length).replace(/^[了的地得把就都也还又很最一个些]/, '').replace(/[，,、。！？；\s"']/g, '');
  let negative = REFINE_NEG.test(body.slice(Math.max(0, at - 2), at + predicate.length + 1));
  /* 「我不喜欢面」：否定词被切进了主语，剥回来 */
  if (/[不没别]$/.test(subject)) { subject = subject.slice(0, -1); negative = true; }
  if (/^[不没别]/.test(object)) { object = object.slice(1); negative = true; }
  if (!subject || !object || subject.length > 8) return null;
  const polarity = negative ? '负' : '正';
  return { key: `${subject}|${predicate}|${polarity}`, subject, predicate, polarity, object, text: body };
}

/* 从捕捉行聚簇：同簇键 ≥ REFINE_MIN_MEMBERS 才出组 */
function refineGroups(rows = []) {
  const buckets = new Map();
  for (const row of rows) {
    for (const clause of clausesOf(row.text)) {
      const frame = frameOf(clause);
      if (!frame) continue;
      const list = buckets.get(frame.key) || [];
      list.push({ ...frame, stamp: row.stamp || null, task: row.task || null, ts: row.ts || null });
      buckets.set(frame.key, list);
    }
  }
  const groups = [];
  for (const [key, members] of buckets) {
    if (members.length < REFINE_MIN_MEMBERS) continue;
    const objects = [...new Set(members.map((item) => item.object))];
    groups.push({
      key, source: 'capture', polarity: members[0].polarity,
      frame: { subject: members[0].subject, predicate: members[0].predicate },
      memberCount: members.length, objects,
      members: members.slice(0, 8).map((item) => ({ stamp: item.stamp, task: item.task, ts: item.ts, text: item.text, object: item.object })),
    });
  }
  return groups.sort((a, b) => b.memberCount - a.memberCount);
}

function refinePlan(model, opts = {}) {
  const rings = Array.isArray(opts.rings) && opts.rings.length ? opts.rings : ['perception', 'memory'];
  const rows = (model.entries || []).filter((row) => rings.includes(row.ring) && !row.purged && !row.fused);
  const groups = refineGroups(rows);
  const limit = Math.max(1, Math.min(8, Number(opts.maxGroups) || 8));
  return { rings, scanned: rows.length, groups: groups.slice(0, limit) };
}

/* 写一次提炼：先查重（digestKey），再落块。
   原条不动：捕捉行就是证据（文档第十二节），压缩发生在提炼层，不是证据层。 */
async function refineApply(root, areas, group = {}, opts = {}, buffer) {
  const members = Array.isArray(group.members) ? group.members : [];
  if (!group.key) return { ok: false, reason: '缺少簇键（主体+谓词+极性），拒绝提炼' };
  if (members.length < REFINE_MIN_MEMBERS) return { ok: false, reason: `簇不足 ${REFINE_MIN_MEMBERS} 条：${members.length} 条不成簇` };
  const stamps = members.map((item) => item.stamp).filter(Boolean);
  if (!stamps.length) return { ok: false, reason: '成员没有唯一码：证据无法回溯，拒绝提炼' };
  const objects = [...new Set(members.map((item) => item.object).filter(Boolean))];
  const frame = group.frame || {};
  const polarity = group.polarity === '负' ? '负' : '正';
  const text = String(opts.text || '').trim()
    || `${frame.subject || ''} ${polarity === '负' ? '不' : ''}${frame.predicate || ''} ${objects.join(' / ')}`.replace(/\s+/g, ' ').trim();
  const digestKey = 'dg-' + sha(`${group.key}|${objects.slice().sort().join(',')}`).slice(0, 12);
  const thresholds = await readThresholds(root);
  const model = await readModel(root, thresholds, areas);
  if ((model.blocks || []).some((block) => block.digestKey === digestKey && block.status !== 'dropped')) {
    return { ok: false, reason: '已提炼过（digestKey 命中），不重复出条', digestKey };
  }
  /* 反向：同谓词、反极性的块存在时挂指针，不去改旧块（只追加） */
  const frameKey = `${frame.subject || ''}|${frame.predicate || ''}`;
  const rival = (model.blocks || []).find((block) => block.status === 'active' && block.frameKey === frameKey && block.polarity && block.polarity !== polarity);
  const ts = nowIso();
  const block = {
    v: 1, type: 'block', id: 'blk-' + sha(digestKey + ts), ts, area: 'work',
    topic: (typeof opts.topic === 'string' && opts.topic.trim()) || '提炼', task: null, text,
    tags: ['提炼', polarity === '负' ? '反例' : '支持'],
    value: 1, status: 'active', conflict: null,
    formedBy: 'refine', formed: true, relation: polarity === '负' ? '反例' : '支持',
    frameKey, polarity, digestKey,
    kept: objects.length > 1 ? objects : [],
    derivedFrom: stamps.slice(0, 12),
    sources: members.map((item) => item.ts).filter(Boolean).slice(0, 12),
    members: members.map((item) => ({ stamp: item.stamp ?? null, task: item.task ?? null, ts: item.ts ?? null, text: item.text })),
    challenges: rival ? [rival.id] : [],
  };
  await appendRow(root, areas, block, buffer);
  return { ok: true, block, digestKey, members: stamps.length };
}

async function listTopics(root, areas) {  const thresholds = await readThresholds(root);
  const model = await readModel(root, thresholds, areas);
  const groups = new Map();
  for (const item of model.entries) {
    const key = item.topic || 'general';
    const group = groups.get(key) || { topic: key, count: 0, area: inferArea({}, item.text), latest: item.text, ts: item.ts };
    group.count += 1;
    if (String(item.ts).localeCompare(String(group.ts)) > 0) {
      group.ts = item.ts;
      group.latest = item.text;
    }
    groups.set(key, group);
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

function recordText(row) {
  if (row.type === 'block') return [row.topic, row.text, ...(row.tags || [])].filter(Boolean).join(' · ');
  if (row.type === 'result' || row.type === 'data') return [row.title, row.output, row.method, row.task, row.text].filter(Boolean).join(' · ');
  if (row.type === 'decision') return [row.title, row.trigger, row.reason, row.task].filter(Boolean).join(' · ');
  return [row.text, row.task].filter(Boolean).join(' · ');
}

/* 检索池分作用域（数据来源准则）：
     'retain' —— 按需 recall 只读保留侧（各环捕捉 + 记忆块），绝不把临时区执行行当记忆；
     'all'    —— 显式 search 才允许带上临时区（工单除外），那是查账不是调记忆。 */
function pool(model, scope = 'all') {
  const base = [
    ...model.entries.map((row) => ({ kind: row.ring, row })),
    ...model.blocks.map((row) => ({ kind: 'block', row })),
  ];
  if (scope === 'retain') return base;
  return [
    ...base,
    ...model.decisions.map((row) => ({ kind: 'decision', row })),
    ...model.workRows.filter((row) => !row.expired && row.type !== 'taskstats' && row.type !== 'photo').map((row) => ({ kind: 'execution', row })),
  ];
}

/* 查询切词：空格与中英文标点都算分隔，避免「插件目录 移动 bundle」当一整串去比 */
function queryTokens(query) {
  return String(query || '').toLowerCase()
    .split(/[\s,，。；|/·、：]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

async function searchRecords(root, query, limit = 8, areas) {
  const model = await readModel(root, await readThresholds(root), areas);
  /* 匹配规则只留在 searchPool 一处：显式 search 与按需 recall 必须同口径 */
  return searchPool(model, query, limit, 'all', retrievalOptions()).hits
    .map(({ mid, kind, ts, task, text, matched, status }) => ({ mid, kind, ts, task, text, matched, status }));
}

async function recentRecords(root, limit = 10, areas) {
  const model = await readModel(root, await readThresholds(root), areas);
  return pool(model).sort((a, b) => String(b.row.ts).localeCompare(String(a.row.ts))).slice(0, limit)
    .map((item) => ({ kind: item.kind, ts: item.row.ts ?? null, task: item.row.task ?? null, text: recordText(item.row) }));
}

/* ── 动态记忆调用（v1.12）────────────────────────────────────────
   文档《蓝潮 v1.1 动态记忆调用与三环协同机制》落地。四条硬规矩：
   ① 先验证后控制：不是每轮都检索，先判「缺不缺」，不缺就记一条「无需检索」；
   ② 预算内的定向检索：1–3 步，每步按缺口换范围，不许无限翻；
   ③ 记忆回流：每步返回后重算覆盖率与冲突，再决定继续、改向还是停；
   ④ 停因必须显式：缺口已解 / 收益不足 / 预算耗尽 / 无需检索 / 命中相反证据。
   觉醒模式本次不实现（你定：字段不沿用），trigger_mode 恒为 default。 */
const RECALL_BUDGET = 3;
const RECALL_PER_STEP = 6;
const RECALL_TOTAL_MAX = 12;
const RECALL_NEED_MIN = 0.45;
const RECALL_GAP_TARGET = 0.6;
const RECALL_MIN_GAIN = 0.15;
const RECALL_ANOMALY_WINDOW_MS = 24 * 60 * 60 * 1000;
const RECALL_SENSITIVE = /(边界|不能|禁止|不许|承诺|答应|称呼|别叫|隐私|密码|账号|授权)/;

/* 稳定 ID：条目本来没有 id，也不该为了发号去重写四区文件。
   所以 ID 在读时派生——环 + 时间码 + 正文前 80 字，同一行永远同一个 mid；
   正文一改就是新 mid（那本来就是另一条证据）。这补上文档「不要只存易变时间戳」那条。 */
function midOf(row) {
  const key = row && (row.stamp || row.ts) || '';
  const ring = (row && (row.ring || row.kind)) || '?';
  const body = String((row && (row.text ?? row.title ?? row.output)) || '').slice(0, 80);
  return 'm-' + sha(`${ring}|${key}|${body}`).slice(0, 12);
}

/* ── 流出过滤器（记忆→调用，逆向那条）────────────────────────────
   S_i = α·P_i + β·H_i + γ·R_i，softmax 归一成相对调用权重 W_i（τ 控集中度）。
   P 感知相关度（当前问题命中多少）、H 人格相关度（边界/倾向是否参与）、R 记忆自身可靠度。
   α/β/γ 随本轮信号动态调整且和为 1；W 只是相对权重，调用条数与影响程度分开控制。
   记忆三分（v1.13 引入）已于 v1.15 退出主链路：不再自动分类、不进摘要、不参与融合分组；
   分数只当「表达类型」手写保留，机器不猜——猜错会污染统计与融合。 */
const PERSONA_SIGNAL_TAGS = ['boundary', 'commitment', 'nickname', 'trigger'];
const RECALL_TAU = 0.15;
const RECALL_WEIGHTS = { perception: 0.5, persona: 0.3, memory: 0.2 };

/* α/β/γ 动态：碰边界/承诺时人格票加重；其余按「感知为主、人格次之、可靠度托底」。
   三者永远归一到 1，写在运行记录里，事后能解释这一轮为什么这么排。 */
function recallWeights(query = '') {
  const sensitive = RECALL_SENSITIVE.test(String(query || ''));
  const w = sensitive
    ? { perception: 0.35, persona: 0.45, memory: 0.2 }
    : { ...RECALL_WEIGHTS };
  const sum = w.perception + w.persona + w.memory;
  return {
    perception: Number((w.perception / sum).toFixed(3)),
    persona: Number((w.persona / sum).toFixed(3)),
    memory: Number((w.memory / sum).toFixed(3)),
  };
}

/* H：这条记忆和「人格层正在管的约束」有多相关。边界/承诺类本身就是约束，权重最高。 */
function personaRelevance(row, text) {
  const tag = String((row && row.kindTag) || '');
  if (tag === 'boundary' || tag === 'commitment') return 1;
  if (PERSONA_SIGNAL_TAGS.includes(tag)) return 0.75;
  if (row && (row.ring === 'persona' || row.ring === 'feedback')) return 0.7;
  if (RECALL_SENSITIVE.test(String(text || ''))) return 0.6;
  return 0.15;
}

/* R：记忆自己的可靠度 = 衰减权重 × 置信状态 × 重要度。不可靠的记忆不值得高 W。 */
function reliabilityOf(row) {
  const weight = typeof (row && row.weight) === 'number' ? row.weight : 0.5;
  const status = (row && row.status) || 'active';
  const conf = status === 'active' ? 1 : status === 'pending' ? 0.6 : 0.3;
  const importance = typeof (row && row.importance) === 'number' ? row.importance : 0.6;
  return clamp01(weight * conf * (0.6 + 0.4 * importance));
}

/* 单条匹配分：P/H/R 都归一到 0–1，S 是加权和 */
function matchScore(item, ctx = {}) {
  const tokens = ctx.tokens || [];
  const text = String((item && item.text) || '').toLowerCase();
  const row = (item && item.row) || {};
  const hits = tokens.filter((token) => text.includes(token)).length;
  const P = tokens.length ? hits / tokens.length : 0;
  const H = personaRelevance(row, text);
  const R = reliabilityOf(row);
  const w = ctx.weights || RECALL_WEIGHTS;
  const S = w.perception * P + w.persona * H + w.memory * R;
  return { P: Number(P.toFixed(3)), H: Number(H.toFixed(3)), R: Number(R.toFixed(3)), S: Number(S.toFixed(4)) };
}

/* softmax：W_i = e^(S_i/τ) / Σ e^(S_j/τ)；减最大值只为数值稳定，不改分布 */
function softmaxWeights(scores, tau = RECALL_TAU) {
  const list = (scores || []).filter((value) => Number.isFinite(value));
  if (!list.length) return [];
  const t = Number(tau) > 0 ? Number(tau) : RECALL_TAU;
  const max = Math.max(...list);
  const exps = list.map((value) => Math.exp((value - max) / t));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((value) => Number((value / sum).toFixed(4)));
}

/* 094 §11 检索打分的三个输入项，各自都有出处：
   K 相关度 = 关键词命中比（Generative Agents 式相关性）；
   H 历史   = 被用过/被验证过的次数（越用越容易再被想起）；
   A 基底激活 = ACT-R，A_i = ln(Σ t^-d)，t 以小时计，越近越高。
   缺数据一律 0，不造分。 */
const RETRIEVAL_HISTORY_CAP = 5;
function retrievalTermsOf(row, matched, total, querySym = null) {
  const K = total > 0 ? clamp01(matched / total) : 0;
  const sc = scoreOf(row || {});
  const H = clamp01((Number(sc.uses) || 0) / RETRIEVAL_HISTORY_CAP);
  const at = Date.parse(String((row && row.ts) || ''));
  const ageHours = Number.isFinite(at) ? Math.max(0, (Date.now() - at) / 3600000) : 0;
  const A = activationScore(activationOf(ageHours > 0 ? [ageHours] : []));
  /* 第四项 Sym：查询侧 sym 与行上 sym 的受控符号重合度。
     行上没有 sym（老数据 / 非入口行）或查询没编码出来 → 0，等价于这一项不参与。
     symOverlap 内部先用 hasSymbol 判过，两条不合格直接返回 0，不会抛。 */
  let Sym = 0;
  if (querySym) {
    try { Sym = clamp01(symOverlap(querySym, row && row.sym)); } catch { Sym = 0; }
  }
  return { K, H, A, Sym };
}

/* 检索池：四区摊平成候选，带 mid 与置信状态。search 与 recall 共用这一处匹配逻辑，
   免得两套规则各说各话（M5：规则要落在代码里，写两遍就等于没有）。
   options.arousal / options.b 由调用方按当前情绪与三环偏置给，缺省为中性。 */
function searchPool(model, query, limit = RECALL_PER_STEP, scope = 'all', options = {}) {
  const tokens = queryTokens(query);
  if (!tokens.length) return { tokens, hits: [] };
  const phrase = tokens.join(' ');
  /* 查询侧只符号化一次，逐行复用。失败退化为没有 Sym（不影响其它三项）。 */
  const querySym = (() => {
    try { return symbolize(String(query || '')); } catch { return null; }
  })();
  const need = tokens.length <= 2 ? tokens.length : Math.ceil(tokens.length / 2);
  const raw = pool(model, scope)
    /* 2026-11-09：人格没建立时，记忆区不参与检索 —— 里面的东西还没有主人 */
    .filter((item) => model.memoryActive !== false || areaOfRow(item.row) !== 'memory')
    .map((item) => {
      const text = recordText(item.row).toLowerCase();
      const matched = tokens.filter((token) => text.includes(token)).length;
      return { item, text, matched, exact: text.includes(phrase) };
    })
    .filter((hit) => hit.matched >= need);
  /* 094 §11 接入：排序权重从「命中数 + 时间」换成 z = β_eff·S + b_ring。
     S = wK·K + wH·H + wA·A，β_eff = (1/τ)(1+κ·arousal) —— 唤醒越高，注意越窄。
     这是模型第一次真正参与选择，此前它只是被导出、从没被调用过。 */
  const scored = raw
    .map((hit) => {
      const terms = retrievalTermsOf(hit.item.row, hit.matched, tokens.length, querySym);
      const out = retrievalScore({
        ...terms,
        arousal: options.arousal || 0,
        ring: (hit.item.row && hit.item.row.ring) || 'memory',
        b: options.b || null,
      });
      return { hit, terms: out.terms, S: out.S, z: out.z, beta: out.beta };
    })
    .sort((a, b) => (b.z - a.z)
      || (Number(b.hit.exact) - Number(a.hit.exact))
      || (b.hit.matched - a.hit.matched)
      || String(b.hit.item.row.ts).localeCompare(String(a.hit.item.row.ts)))
    .slice(0, limit);
  /* softmax over z → 归一化后验 p；候选为空返回空数组，不出 NaN */
  const ranked = retrievalPosterior(scored.map((row) => ({ ...row, z: row.z })));
  const hits = ranked.map((row) => ({
    mid: midOf({ ...row.hit.item.row, ring: row.hit.item.row.ring || row.hit.item.kind }),
    row: row.hit.item.row,
    kind: row.hit.item.kind,
    ring: row.hit.item.row.ring || null,
    ts: row.hit.item.row.ts ?? null,
    task: row.hit.item.row.task ?? null,
    status: row.hit.item.row.status ?? null,
    text: recordText(row.hit.item.row),
    matched: `${row.hit.matched}/${tokens.length}`,
    score: { S: row.S, z: row.z, p: row.p, beta: row.beta, terms: row.terms },
  }));
  return { tokens, hits };
}

/* 需求评估（先验证后控制）：把「凭什么该翻记忆」摊成可读的加分项，
   低于阈值就明确不检索——省掉的是一次无目的的翻找，不是省掉一次判断。 */
function assessMemoryNeed({ query, model, now = Date.now() }) {
  const tokens = queryTokens(query);
  const reasons = [];
  let score = 0;
  if (tokens.length) {
    score += 0.5;
    reasons.push(`显式查询「${squeeze(String(query), 24)}」`);
  }
  const contested = Number(model.contested) || 0;
  if (contested > 0) {
    score += 0.45;
    reasons.push(`反向待裁定 ${contested} 条`);
  }
  const recentMisses = (model.misses || []).filter((row) => {
    const at = Date.parse(row.ts);
    return Number.isFinite(at) && now - at <= RECALL_ANOMALY_WINDOW_MS;
  }).length;
  if (recentMisses > 0) {
    score += 0.15;
    reasons.push(`近 24h 纠正信号 ${recentMisses} 条`);
  }
  if (tokens.length && !searchPool(model, tokens.join(' '), 1).hits.length) {
    score += 0.3;
    reasons.push('检索池没有直接命中（关键缺口）');
  }
  if (RECALL_SENSITIVE.test(String(query || ''))) {
    score += 0.1;
    reasons.push('涉及边界/承诺，需人格环参与比较');
  }
  const capped = Math.min(1, score);
  return {
    requires_retrieval: capped >= RECALL_NEED_MIN,
    score: Number(capped.toFixed(2)),
    reasons,
    tokens,
    contested,
    recentMisses,
  };
}

/* 查询计划：一步一个方向，不是把同一个词反复查。
   原查询没打中的常见原因是对面的说法不同，所以第二步放宽成主语词，最后才单词兜底。 */
function planQueries(need, query, budget = RECALL_BUDGET) {
  const tokens = need.tokens || [];
  const steps = [];
  if (tokens.length) steps.push({ kind: 'query', text: tokens.join(' '), scope: '四区全池', why: '原查询' });
  if (tokens.length > 1) {
    const primary = tokens.slice().sort((a, b) => b.length - a.length).slice(0, 2);
    steps.push({ kind: 'query', text: primary.join(' '), scope: '四区全池', why: '放宽到主语词' });
  }
  if (need.contested > 0) steps.push({ kind: 'contested', text: null, scope: '待确认 · 反向案例', why: '异常定向：看反向证据' });
  if (tokens.length > 1) steps.push({ kind: 'query', text: tokens[0], scope: '四区全池', why: '单词兜底' });
  const max = Math.max(1, Math.min(RECALL_BUDGET, Number(budget) || RECALL_BUDGET));
  return steps.slice(0, max);
}

/* 回流三环：拿到的东西先算覆盖率、缺口、相反证据，再决定下一步。
   「相反证据」只做线索——遇到就停手回三环比较，不许在检索层自己改结论。 */
function integrateRecall({ tokens, taken, query }) {
  const texts = taken.map((item) => String(item.text || '').toLowerCase());
  const coveredTokens = tokens.filter((token) => texts.some((text) => text.includes(token)));
  const covered = tokens.length ? coveredTokens.length / tokens.length : (taken.length ? 1 : 0);
  const queryPolarity = polarityOf(String(query || ''));
  const opposite = queryPolarity < 0 && taken.some((item) => polarityOf(String(item.text || '')) > 0);
  return {
    covered: Number(covered.toFixed(2)),
    coveredTokens,
    missing: tokens.filter((token) => !coveredTokens.includes(token)),
    conflict: opposite,
    boundary: taken.filter((item) => RECALL_SENSITIVE.test(String(item.text || ''))).length,
    resolved: taken.length > 0 && covered >= RECALL_GAP_TARGET,
  };
}

/* 一次完整调用：评估 → 计划 → 逐步检索 → 回流 → 停因 → 落一条运行记录。
   记录写在工作区（24h 随任务清），不是记忆：它是「这次怎么查的」，不是「查到了什么」。 */
function recallTake(model, need, query, budget, perStep, weights) {
  /* 检索的「算」只在这一处：读盘由调用方负责，异步与同步两条入口共用。
     094/095 的流出过滤、预算与停因判断照旧，不在提示词层重写一份。 */
  const scoreCtx = { tokens: need.tokens, weights };
  const taken = [];
  const seen = new Set();
  const scopeLog = [];
  let stopReason = null;
  let gap = integrateRecall({ tokens: need.tokens, taken, query });

  if (!need.requires_retrieval) {
    stopReason = '无需检索（信号不足）';
  } else {
    const plan = planQueries(need, query, budget);
    for (let i = 0; i < plan.length; i += 1) {
      const step = plan[i];
      let hits = [];
      if (step.kind === 'contested') {
        hits = (model.entries || [])
          .filter((item) => item.contested && item.status !== 'archived')
          .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
          .slice(0, perStep)
          .map((item) => ({
            mid: midOf(item), kind: item.ring, ring: item.ring, ts: item.ts ?? null,
            task: item.task ?? null, status: item.status || 'active', text: recordText({ ...item, type: 'entry' }), matched: '反向',
          }));
      } else {
        /* 流出过滤器：候选先用词面捞（宽），再由 P/H/R 加权分排序（窄）。
           这一步就是「人格与感知的作用结果决定调哪条记忆」的落点。 */
        /* 保留侧口径：按需调用只从各环捕捉里取，临时区不进记忆调用 */
        hits = searchPool(model, step.text, perStep * 2, 'retain', retrievalOptions()).hits
          .filter((item) => item.status !== 'archived')
          .map((item) => {
            const row = item.row || {};
            return { ...item, ...matchScore({ text: item.text, row }, scoreCtx) };
          })
          .sort((a, b) => b.S - a.S)
          .slice(0, perStep);
      }
      const fresh = hits.filter((item) => !seen.has(item.mid));
      for (const item of fresh) {
        if (taken.length >= RECALL_TOTAL_MAX) break;
        seen.add(item.mid);
        taken.push({ ...item, via: step.text || step.scope });
      }
      scopeLog.push({ text: step.text ?? null, scope: step.scope, why: step.why, hits: hits.length, fresh: fresh.length });
      gap = integrateRecall({ tokens: need.tokens, taken, query });
      if (gap.resolved) { stopReason = '缺口已解'; break; }
      if (gap.conflict) { stopReason = '命中相反证据，回三环比较'; break; }
      if (!fresh.length) { stopReason = '收益不足（这一步没有新增）'; break; }
      if (fresh.length / perStep < RECALL_MIN_GAIN) { stopReason = '收益不足（新增过少）'; break; }
      stopReason = '预算耗尽（步数上限）';
      if (scopeLog.length >= budget) break;
    }
    if (!stopReason) stopReason = '预算耗尽（步数上限）';
  }
  return { taken, scopeLog, stopReason, gap };
}

async function runRecall(root, areas, options = {}) {
  const query = typeof options.query === 'string' ? options.query : '';
  const budget = Math.max(1, Math.min(RECALL_BUDGET, Number(options.budget) || RECALL_BUDGET));
  const perStep = Math.max(1, Math.min(RECALL_TOTAL_MAX, Number(options.limit) || RECALL_PER_STEP));
  const thresholds = await readThresholds(root);
  const model = await readModel(root, thresholds, areas);
  const need = assessMemoryNeed({ query, model });
  /* 流出过滤器的两个输入：感知（tokens）+ 人格（由 recallWeights 折算的票重） */
  const weights = recallWeights(query);
  const { taken, scopeLog, stopReason, gap } = recallTake(model, need, query, budget, perStep, weights);

  /* softmax 归一：W 是「相对调用权重」，不是决策占比——条数由预算管，影响由三环管 */
  const normalized = softmaxWeights(taken.map((item) => (typeof item.S === 'number' ? item.S : 0)));
  taken.forEach((item, index) => { item.W = normalized[index] ?? 0; });

  const byKind = {};
  for (const item of taken) byKind[item.kind] = (byKind[item.kind] || 0) + 1;
  const influence = !taken.length
    ? '无（没有可用条目，判断不依赖记忆）'
    : `参考 ${taken.length} 条（${Object.entries(byKind).map(([kind, count]) => `${kind} ${count}`).join(' / ')}）`
      + (gap.conflict ? '；含相反证据，结论需回三环比较' : '；无相反证据');
  const ts = nowIso();
  const row = {
    v: 1, ts, type: 'cycle',
    cycle_id: 'cyc-' + sha(`${ts}|${query}|${Math.random()}`).slice(0, 10),
    stamp: stampOf(new Date(), options.task || null),
    task: options.task ?? null,
    trigger_mode: 'default',
    trigger_reason: need.reasons.join('；') || '无信号',
    query: query || null,
    query_scope: { query: query || null, steps: scopeLog },
    retrieved_memory_ids: taken.map((item) => item.mid),
    source_links: taken.map((item) => ({
      mid: item.mid, kind: item.kind, ts: item.ts, task: item.task, via: item.via,
      P: item.P ?? null, H: item.H ?? null, R: item.R ?? null, S: item.S ?? null, W: item.W ?? null,
    })),
    weights: { ...weights, tau: RECALL_TAU },
    budget_used: { steps: scopeLog.length, max: budget, hits: taken.length },
    gap_status: { resolved: gap.resolved, covered: gap.covered, missing: gap.missing },
    decision_influence: influence,
    stop_reason: stopReason,
    feedback_summary: taken.length
      ? `覆盖 ${gap.covered}${gap.missing.length ? `，仍缺「${gap.missing.join('/')}」` : '，词面已齐'}`
      : '未命中，下一轮换说法或缩短查询',
    note: '预算见 budget_used；本行属临时区，24h 随任务清',
    text: `记忆调用 · ${stopReason} · 命中 ${taken.length}`,
  };
  if (options.persist !== false) {
    const dirs = resolveAreas(root, areas);
    await appendArea(dirs.work, AREA_FILES.work, row);
  }
  return { need, gap, stop_reason: stopReason, items: taken, cycle: row };
}

/* 同步检索（只算不写）：提示词那一层是同步的，等不来 Promise。
   读盘走 readModelSync / readThresholdsSync，算仍旧是 recallTake 那一份——
   不给提示词另起一套评分，免得面板和提示词各说各话。 */
function recallSync(root, areas, query) {
  const text = String(query || '').slice(0, 80);
  if (!text) return { ids: [], stop: '本轮无用户原话' };
  const { thresholds, model } = readModelSync(root, areas);
  const need = assessMemoryNeed({ query: text, model });
  const weights = recallWeights(text);
  const { taken, stopReason } = recallTake(model, need, text, 1, RECALL_PER_STEP, weights);
  return { ids: taken.map((item) => item.mid), stop: stopReason };
}

function judgeConfront(raw, filtered, override = {}) {
  const dice = similarity(raw, filtered);
  const cover = coverage(filtered, raw);
  const sim = Math.max(dice, cover);
  const polarityDiff = polarityOf(raw) !== polarityOf(filtered);
  const coreSim = Math.max(similarity(stripPolarity(raw), stripPolarity(filtered)), coverage(stripPolarity(filtered), stripPolarity(raw)));
  const opposite = polarityDiff && coreSim >= CONFRONT_CONTRADICT_CORE;
  let matched;
  if (opposite) matched = 'contradict';
  else if (sim >= CONFRONT_CONSISTENT_SIM) matched = 'consistent';
  else if (sim >= CONFRONT_EXTENDED_SIM) matched = 'extended';
  else matched = 'new';
  if (CONFRONT_MATCH.includes(override.matched)) matched = override.matched;
  const selfAlign = Number.isFinite(Number(override.alignment)) ? clamp01(Number(override.alignment)) : null;
  const base = 0.15 + 0.85 * sim;
  const structural = clamp01(opposite ? base - 0.6 : base);
  const alignment = Number((selfAlign === null ? structural : Math.min(structural, selfAlign)).toFixed(3));
  const drift = {
    shifted: alignment < CONFRONT_HOLD_ALIGN,
    against: 'raw',
    similarity: Number(dice.toFixed(3)),
    support: Number(cover.toFixed(3)),
    recall: Number(coverage(raw, filtered).toFixed(3)),
  };
  let suggestion = alignment >= CONFRONT_KEEP_ALIGN ? 'keep' : alignment < CONFRONT_HOLD_ALIGN ? 'hold' : 'stage';
  if (matched === 'contradict') suggestion = 'hold';
  if (CONFRONT_SUGGEST.includes(override.suggestion)) suggestion = override.suggestion;
  return { matched, alignment, drift, suggestion };
}

function confrontRecord(fields) {
  const raw = typeof fields.raw === 'string' ? fields.raw.trim() : '';
  const filtered = typeof fields.filtered === 'string' ? fields.filtered.trim() : '';
  if (!raw) throw new Error('confront 需要 raw（感知环原始数据）');
  if (!filtered) throw new Error('confront 需要 filtered（人格过滤后的结论）');
  const verdict = judgeConfront(raw, filtered, fields);
  const ts = nowIso();
  return {
    v: 1, type: 'confront', id: 'cfr-' + sha(raw + '|' + filtered + '|' + ts), ts,
    task: typeof fields.task === 'string' ? fields.task : null,
    raw: raw.slice(0, CONFRONT_MAX_CHARS),
    filtered: filtered.slice(0, CONFRONT_MAX_CHARS),
    matched: verdict.matched, alignment: verdict.alignment, drift: verdict.drift, suggestion: verdict.suggestion,
    turn: Number.isFinite(Number(fields.turn)) ? Number(fields.turn) : null,
  };
}

/* 把选中的文件装进 BLUE Files/03_Persona/persona 的对应槽位：目录不存在就建，原子替换，不改其它槽 */
async function installPersonaFile(root, slot, sourcePath) {
  const layer = LAYERS.find(([id]) => id === slot);
  if (!layer) throw new Error('未知的人格槽位');
  const target = join(root, layer[1]);
  await mkdir(dirname(target), { recursive: true });
  const tmp = `${target}.tmp-${Date.now()}`;
  await copyFile(sourcePath, tmp);
  await rename(tmp, target);
  const info = await stat(target);
  return { slot, file: layer[1], path: target, bytes: info.size };
}

function createWriter(root, areas) {
  const queue = [];
  const tries = new WeakMap();
  let running = null;
  const stats = { enqueued: 0, written: 0, failed: 0, dropped: 0 };
  const drain = async () => {
    while (queue.length) {
      const row = queue.shift();
      try {
        await appendRow(root, areas, row);
        stats.written += 1;
      } catch {
        stats.failed += 1;
        /* 坏行不堵队：最多重试 3 次，仍失败就丢弃并计数（不静默改数据） */
        const count = (tries.get(row) || 0) + 1;
        tries.set(row, count);
        if (count <= 3) queue.push(row);
        else stats.dropped += 1;
      }
    }
  };
  return {
    enqueue(row) {
      try {
        queue.push(row);
        stats.enqueued += 1;
        if (!running) running = drain().finally(() => { running = null; });
      } catch {
        stats.failed += 1;
      }
      return { queued: true };
    },
    async flush(timeoutMs = FLUSH_TIMEOUT_MS) {
      try {
        const deadline = Date.now() + timeoutMs;
        for (;;) {
          if (!running && queue.length) running = drain().finally(() => { running = null; });
          if (!running) break;
          const left = deadline - Date.now();
          if (left <= 0) break;
          await Promise.race([running.catch(() => {}), new Promise((resolve) => setTimeout(resolve, left))]);
        }
      } catch {
        /* 留给下一轮 */
      }
      return { pending: queue.length, ...stats };
    },
    stats() {
      return { pending: queue.length, ...stats };
    },
  };
}

function userTextsInTurn(session, turn) {
  const events = typeof session?.ownEvents === 'function' ? session.ownEvents() : [];
  let start = -1;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (event?.type === 'turn/start' && event?.data?.turn === turn) {
      start = i;
      break;
    }
  }
  if (start < 0) return { startedAt: null, texts: [] };
  const startedAt = Number(events[start].time) || null;
  const texts = [];
  for (let i = start + 1; i < events.length; i += 1) {
    const event = events[i];
    if (event?.type !== 'user/message') continue;
    /* 宿主把 AGENTS.md / 运行时上下文 / 技能目录 / 时间基准注入成 user 角色的消息（source.kind≠user），
       这些不是你的话：算进感知字数会把占比冲成 97% 感知，入口判定也会拿工作区规则去猜任务级别。
       老会话没有 source 字段 → 仍按用户消息算；QQ 桥的 source.kind 同样是 'user'。 */
    const sourceKind = event?.data?.source?.kind;
    if (sourceKind && sourceKind !== 'user') continue;
    const blocks = event?.data?.content ?? event?.data?.message?.content ?? [];
    if (!Array.isArray(blocks)) continue;
    const text = blocks.filter((block) => block && block.type === 'text' && typeof block.text === 'string').map((block) => block.text).join('\n').trim();
    if (text) texts.push(text);
  }
  return { startedAt, texts };
}

const missSeen = new Set();
function auditTurn(session, turn, sessionId, lastAt = 0, tools = 0) {
  if (!session || typeof turn !== 'number') return null;
  if (session.header?.origin === 'subagent') return null;
  /* 没动工具的一轮不可能是「干了活却没留对照」，不记 */
  if (!(tools > 0)) return null;
  const { startedAt, texts } = userTextsInTurn(session, turn);
  if (startedAt === null) return null;
  const signal = texts.find((text) => MISS_SIGNAL.test(text));
  if (!signal || lastAt >= startedAt) return null;
  const key = String(sessionId || '') + '|' + signal.slice(0, 80);
  if (missSeen.has(key)) return null;
  if (missSeen.size > 500) missSeen.clear();
  missSeen.add(key);
  return {
    v: 1, type: 'miss', ts: nowIso(), session: String(sessionId || ''), turn,
    stamp: stampOf(new Date(), lastTaskSeen.task),
    excerpt: signal.slice(0, 120), reason: '本轮有纠正信号，但对照节点没有留下记录',
  };
}

/* ── 情绪状态（v1.14）──────────────────────────────────────────
   你纠正：人格不只是「判不判」，它和情绪一起决定风格——被夸会高兴、判断更活跃、
   输出更俏皮；说工作重要会谨慎占主导、审查更严。
   所以这里做两件事：
     ① 情绪是【有半衰的状态】，不是每轮重判：夸一句涨一点，45 分钟掉一半；
     ② 风格由「情绪 × 人格旋钮」算出来：语气、句长上限、能不能玩梗、主动程度。
   硬边界（M3）：情绪只影响语气与优先级，**不许影响结论真假与安全判断**——
   styleOf 的输出里没有「放宽标准」这个字段，要改也只能改这边之外的东西。 */
const AFFECT_HALF_LIFE_MS = 45 * 60_000;
const AFFECT_RULES = [
  { label: '高兴', re: /(夸|厉害|好棒|漂亮|优秀|喜欢你|谢谢|辛苦了|做得好|靠谱)/, valence: 0.45, arousal: 0.3 },
  { label: '亲昵', re: /(抱抱|摸摸|亲亲|rua|贴贴)/, valence: 0.35, arousal: 0.2 },
  { label: '低落', re: /(失望|难过|不开心|委屈|生气|烦|算了|没用)/, valence: -0.4, arousal: 0.2 },
  { label: '疲惫', re: /(累|困|加班|熬夜|撑不住|不想动)/, valence: -0.25, arousal: -0.35 },
  { label: '紧张', re: /(急|马上|尽快|来不及|上线|事故|崩了|坏了)/, valence: -0.15, arousal: 0.4 },
];

/* 从一句话里读情绪增量：只加不减地叠在现有状态上，多标签取最强的那条 */
function affectOf(text) {
  const body = String(text || '');
  let valence = 0;
  let arousal = 0;
  const labels = [];
  for (const rule of AFFECT_RULES) {
    if (!rule.re.test(body)) continue;
    labels.push(rule.label);
    if (Math.abs(rule.valence) >= Math.abs(valence)) valence = rule.valence;
    if (Math.abs(rule.arousal) >= Math.abs(arousal)) arousal = rule.arousal;
  }
  return { valence, arousal, labels };
}

/* 半衰：45 分钟掉一半，读的时候才算，不写回文件 */
function decayAffect(state, now = Date.now()) {
  const base = state || {};
  const at = Number(base.at) || 0;
  if (!at || !now || now <= at) return { valence: Number(base.valence) || 0, arousal: Number(base.arousal) || 0, label: base.label || null, at };
  const ratio = Math.pow(0.5, (now - at) / AFFECT_HALF_LIFE_MS);
  return {
    valence: Number(((Number(base.valence) || 0) * ratio).toFixed(3)),
    arousal: Number(((Number(base.arousal) || 0) * ratio).toFixed(3)),
    label: base.label || null,
    at,
    decayed: Number(ratio.toFixed(3)),
  };
}

/* 风格 = 情绪 × 人格旋钮。注意这里没有任何「降低标准」的出口。
   2026-11-01：新增 options.hint —— 概念层（logic/persona-v2.js）算出来的表达策略。
   设计原则：hint 只能**收紧**、不能放宽。
     · 工作模式的「板正」不被情绪推翻（安全与标准优先）
     · 字数只取两者更小的那个
     · 情绪姿态是「退」时降低主动度
   不传 hint 时行为与改造前完全一致。 */
function styleOf(state = {}, options = {}) {
  const valence = Number(state.valence) || 0;
  const arousal = Number(state.arousal) || 0;
  const strictness = Number(options.strictness) || 0;
  const workMode = options.mode === 'work' || strictness >= 0.6;
  const hint = options.hint && typeof options.hint === 'object' ? options.hint : null;
  let base;
  if (workMode) base = { tone: '板正', maxChars: 320, emoji: false, proactive: 'normal', energy: 'steady' };
  else if (arousal >= 0.4 && valence > 0.15) base = { tone: '活跃', maxChars: 420, emoji: true, proactive: 'high', energy: 'up' };
  else if (valence < -0.2 && arousal < 0.3) base = { tone: '收着', maxChars: 260, emoji: false, proactive: 'low', energy: 'low' };
  else base = { tone: '平常', maxChars: 380, emoji: false, proactive: 'normal', energy: 'steady' };
  if (!hint) return base;
  const out = { ...base };
  if (Number.isFinite(hint.depth)) out.depth = hint.depth;
  if (hint.openWith) out.openWith = hint.openWith;
  if (Array.isArray(hint.forbid) && hint.forbid.length) out.forbid = hint.forbid.slice(0, 3);
  if (hint.tone && !workMode) out.tone = hint.tone;
  if (Number.isFinite(hint.maxChars)) out.maxChars = Math.min(base.maxChars, hint.maxChars);
  if (hint.posture === '退') out.proactive = 'low';
  return out;
}

/* 人格旋钮：把「这一轮该多严、偏哪边」算出来。严谨是因为你说明了重要程度，
   不是因为我碰上关键词就条件反射——但能被文字识别的那部分，只能落在规则里。 */
function personaGain({ level, text, contested } = {}) {
  const body = String(text || '');
  let strictness = level === 'task' ? 0.6 : 0.2;
  if (/(重要|正式|上线|交付|事故|紧急|别搞错|认真|必须)/.test(body)) strictness += 0.25;
  if (RECALL_SENSITIVE.test(body)) strictness += 0.15;
  if (Number(contested) > 0) strictness += 0.05;
  strictness = Math.max(0, Math.min(1, strictness));
  return {
    mode: strictness >= 0.6 ? 'work' : 'daily',
    strictness: Number(strictness.toFixed(2)),
    /* 严格时记忆先查程序/语义（做事的方法与事实），日常先看情景 */
    memoryBias: strictness >= 0.6 ? ['工作优先', '约束优先'] : ['近事优先', '情景优先'],
  };
}

/* 087 不参与准则：任务码取 `#` 后那段，完整 stamp 与短码两种写法都归一。
   本任务自己写的行不进本任务摘要——自证不算证据，下一任务才看得到。 */
function taskKeyOf(value) {
  const text = typeof value === 'string' ? value : '';
  const cut = text.lastIndexOf('#');
  return cut >= 0 ? text.slice(cut + 1) : text;
}

/* 作废/更正规则落到代码（M5，2026-11-01）：以前只写在条目文本里，检索和摘要都不看。
   扫含「作废 / 勿再引用」的行，从中抽出被点名的 key，返回不可用集合。 */
const CORRECTION_KEY_RE = /([0-9]{6}T[0-9]{6}#[0-9A-Za-z.\-]+)/g;
function invalidatedKeysOf(entries) {
  const out = new Set();
  for (const item of Array.isArray(entries) ? entries : []) {
    const text = String((item && item.text) || '');
    if (!/作废|勿再引用/.test(text)) continue;
    /* 声明行本身是规则、不是记忆内容：自己也不许当「最近记忆」展示 */
    out.add(String(item.key || item.mid || item.stamp || ''));
    for (const m of text.matchAll(CORRECTION_KEY_RE)) out.add(m[1].replace(/[.。]+$/, ''));
  }
  return out;
}
function pickLatestActive(entries, ring, currentTaskKey, now = Date.now()) {
  const dead = invalidatedKeysOf(entries);
  const rows = Array.isArray(entries) ? entries : [];
  return (
    rows
      .filter((item) => item.ring === ring && item.status === 'active')
      /* 归档的条目不再进摘要：冷却到期不是「删掉」，但它确实该从检索里退场 */
      .filter((item) => entryStateOf(item, now) !== 'archived')
      .filter((item) => !(currentTaskKey && taskKeyOf(item.task) === currentTaskKey))
      /* 被声明作废的条目不再进摘要 */
      .filter((item) => !dead.has(String(item.key || item.mid || item.stamp || '')))
      .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))[0] ?? null
  );
}

/* 087 条目状态机与计分：已移到 logic/rules.js（2026-10-28）。
   那边有 entryStateOf / stateWeightOf / scoreOf / bumpHit / bumpProof /
   effectiveProofs / rankEntries，以及 HOUR_MS、RULES_STATE、RULES_DECAY。
   两个对象是活的：读 rules.json 之后这里直接改它们的字段（见上面 replayRules）。 */

/* 087 记忆区状态行：在用 / 冷却 / 归档 与 验证 / 曝光 计数。
   摘要与面板同源——这里数一遍，别处不再数第二遍。抽成纯函数，测试能直接比对整行。 */
function digestStateLine(entries, now = Date.now(), counts = null) {
  const rows = Array.isArray(entries) ? entries : [];
  const stateCount = counts
    ? { active: Number(counts.active) || 0, cooling: Number(counts.cooling) || 0, archived: Number(counts.archived) || 0 }
    : { active: 0, cooling: 0, archived: 0 };
  const deriveState = !counts;
  let proofTotal = 0;
  for (const item of rows) {
    if (deriveState) {
      const st = entryStateOf(item, now);
      if (Object.prototype.hasOwnProperty.call(stateCount, st)) stateCount[st] += 1;
    }
    /* 展示用 uses（真实次数）；排序用 proofs（去重）在 rankEntries 里读，两者互不干扰 */
    const sc = scoreOf(item);
    proofTotal += Number.isFinite(Number(sc.uses)) ? Number(sc.uses) : sc.proofs;
  }
  /* 曝光计数已删（2026-10-31 你定）：不加分、不参与决策，留着只是噪音 */
  /* 087 第 6 步（2026-11-09）：把「没学会的主题」也放进这同一行 ——
     摘要与面板同源，别在第二处再数一遍。没有可判样本时不出现，不制造噪音。 */
  const recap = recurrenceSummary(rows);
  const recapPart = recap.judged > 0
    ? ` · 复发 ${recap.notLearned}/${recap.judged} 主题（${(recap.rate * 100).toFixed(0)}%）`
    : '';
  return `记忆区状态：在用 ${stateCount.active} · 冷却 ${stateCount.cooling} · 归档 ${stateCount.archived}（验证 ${proofTotal}）${recapPart}`;
}

/* 087 反馈入口：把外部判断（你指出 / 断言失败 / 回放）写回条目。
   留余地：开闸与来源白名单都在 rules.feedback 里；接新来源只加一个名字，
   不动状态机。enabled=false 或来源不在白名单时原样返回，等于关闸。 */
const RULES_FEEDBACK = { enabled: true, allowAutoArchive: false, sources: ['user', 'assert', 'replay'] };

function formatDigest(thresholds, model, drift) {
  /* 插件刚装/热重载时内存里没有「当前任务」，从最近的工作行回填，免得时间基准显示 #--- */
  if (!lastTaskSeen.task) {
    const recent = model.workRows
      .filter((row) => typeof row.task === 'string' && row.task)
      .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))[0];
    if (recent) {
      lastTaskSeen.task = recent.task;
      lastTaskSeen.at = Date.parse(recent.ts) || Date.now();
    }
  }
  /* 读取时引入现实时间：每条都带自己的码 + 距今多久（摘要 60 秒刷一次，误差 ≤1 分钟） */
  const now = Date.now();
  /* 注入只取「已确认」的条目：pending 是线索，不是结论，不能进我开口前的上下文。
     items 只有最近 4 条，可能全是 pending；所以从全量 entries 里找最新的 active。
     087 不参与准则：本任务自己写的行不进本任务的摘要——自证不算证据，下一任务才看得到。
     任务码有两种写法（完整 stamp `261027T123804#3C7` 与短码 `#3C7`），统一取 `#` 后那段再比。 */
  const currentTaskKey = taskKeyOf(lastTaskSeen.task);
  const latestActive = (ring) => pickLatestActive(model.entries, ring, currentTaskKey);
  const line = (label, ring) => {
    const item = latestActive(ring);
    if (!item) return `${label}：—`;
    const meta = [item.stamp, item.ts ? ageText(item.ts, now) : null].filter(Boolean).join(' · ');
    return `${label}：${item.text}${meta ? `（${meta}）` : ''}`;
  };
  const stateLine = digestStateLine(model.entries, now, {
    active: Math.max(0, (model.rings ? model.rings.perception.count + model.rings.memory.count + model.rings.persona.count + model.rings.feedback.count : 0) - (model.pending || 0) - (model.archived || 0)),
    cooling: model.pending || 0,
    archived: model.archived || 0,
  });
  const out = [
    '## 蓝潮长期记忆（四区，摘要）',
    `条目：感知 ${model.rings.perception.count} · 记忆 ${model.rings.memory.count} · 人格 ${model.rings.persona.count} · 反馈 ${model.rings.feedback.count}；裁定 ${model.decisionTotal} 条（近 3 任务 ${model.windowDecisionCount} 次）；工作区 ${model.workRows.filter((row) => !row.expired).length} 条（任务结束 +24h 清）；冷却 ${model.pending}（反向 ${model.contested || 0}，每 24h×0.3，3 档归档）· 归档 ${model.archived}（半衰 ${thresholds.halfLifeDays} 天，下限 ${thresholds.floor}）`,
    stateLine,
    line('最近感知', 'perception'),
    line('最近记忆', 'memory'),
    line('最近人格', 'persona'),
    line('最近反馈', 'feedback'),
  ];
  if (model.decisions[0]) {
    const s = model.decisions[0].shares;
    out.push(`最近裁定：${model.decisions[0].title || model.decisions[0].task || '—'}（主导 ${model.decisions[0].dominant || '—'}，${Math.round(s.perception * 100)}/${Math.round(s.memory * 100)}/${Math.round(s.persona * 100)}% · ${ageText(model.decisions[0].ts, now)}）`);
  }
  if (model.judgements[0] && model.judgements[0].source === 'auto') {
    const s = model.judgements[0].shares;
    out.push(`最近判定（自动）：${model.judgements[0].title || '—'}（主导 ${model.judgements[0].dominant || '—'}，${Math.round(s.perception * 100)}/${Math.round(s.memory * 100)}/${Math.round(s.persona * 100)}% · ${ageText(model.judgements[0].ts, now)}）`);
  }
  if (model.execution[0]) {
    const head = `${model.execution[0].title || model.execution[0].task || '—'} — ${model.execution[0].output || '—'}`;
    const meta = [model.execution[0].stamp, ageText(model.execution[0].ts, now)].filter(Boolean).join(' · ');
    out.push(`最近执行：${squeeze(head, 160)}${meta ? `（${meta}）` : ''}`);
  }
  /* 调用策略：这一轮打算怎么查（三分已退出主链路，不再统计） */
  out.push(`调用：按需（缺才查，预算 ${RECALL_BUDGET} 步）· 待解反向 ${model.contested || 0} · 冷却 ${model.pending || 0}`);
  const lastCycle = (model.cycles || []).slice().sort((a, b) => String(b.ts).localeCompare(String(a.ts)))[0];
  if (lastCycle) {
    const meta = [lastCycle.stamp, lastCycle.ts ? ageText(lastCycle.ts, now) : null].filter(Boolean).join(' · ');
    out.push(`最近调用：${lastCycle.stop_reason || '—'} · 命中 ${(lastCycle.retrieved_memory_ids || []).length} · 覆盖 ${lastCycle.gap_status && typeof lastCycle.gap_status.covered === 'number' ? lastCycle.gap_status.covered : '—'}${meta ? `（${meta}）` : ''}`);
  }
  const blocks = model.blocks.filter((item) => item.status === 'active');
  if (blocks.length) {
    const work = blocks.filter((item) => item.area === 'work').length;
    const fused = blocks.filter((item) => item.fused).length;
    const latestBlock = blocks.slice().sort((a, b) => String(b.ts).localeCompare(String(a.ts)))[0];
    out.push(`记忆块 ${blocks.length}（工作 ${work} · 日常 ${blocks.length - work}${fused ? ` ｜ 融合 ${fused}` : ''}）｜最近：${latestBlock.text}`);
  } else {
    out.push('记忆块 0');
  }
  const contradict = model.confronts.filter((item) => item.matched === 'contradict').length;
  out.push(`暂存 ${model.staged.length} · 微调提案 ${model.proposals.filter((item) => item.status === 'proposed').length} · 对照 ${model.confronts.length}（冲突 ${contradict}）· 漏检 ${model.misses.length} · 保险层漂移：${drift ? (drift.drift ? `有（${drift.changed.join(' / ')}）` : '无') : '未比对（预热）'}`);
  out.push('要更细的条目：用 bluetide_memory_read 工具 search / recent 检索（存储有上限，记忆就没有上限）。');
  out.push('');
  out.push('## 每轮收尾（必做 · 后台动作）');
  out.push('这一节是给我自己看的行为规范，**不是要说给你听的内容**：做这些事，但不要在回复里逐条汇报「已写 execution / 回检通过 / 本轮判定」——那是交作业，你要看的是融合成一段的话。');
  out.push('0) 先读最上面的「时间基准」：确认现在几点、本任务码，再判断记忆里那些「最近」到底是多久以前——别把三周前当今天。');
  out.push('1) 先判定本轮是「任务」还是「闲聊」。');
  out.push('2) 任务：bluetide_memory_exec append kind=execution 写一条（task + title + text=产出 + method）；三环占比每轮自动记，别为凑数写 decision——只有真的改了权重分配才写。');
  out.push('3) 任务：有可复用判据才写 kind=memory（带 task、area=work）：进了记忆区，临时区同任务的执行行会自动降级成「已入记忆」标签，24 小时后连标签一起清。');
  /* 2026-10-28（你定）：闲聊不是「零产出」。闲聊里攒下的是关于你的抽象经验——
     喜好、说话方式、雷区、称呼、情绪习惯。这些落 memory 环的 area=daily，
     不进三环占比（占比是任务口径），也不带 task（它不是某个任务的产出）。
     没有新东西就不写：宁缺勿滥，别为了「这轮有产出」硬凑一条。 */
  out.push('4) 闲聊：bluetide_memory_note append kind=perception 一句（这轮出了什么事、他的情绪）；不写 execution。');
  out.push('5) 闲聊：**若本轮露出了新的抽象经验**（喜好 / 说话方式 / 雷区 / 称呼 / 情绪习惯），再写一条 bluetide_memory_note kind=memory、**不带 task、area=daily**，topic 写你相关（如「表达习惯」）。没有就不写，不硬凑。');
  out.push('6) 写完即同步：面板 30 秒轮询一次，切回页面也会重取。');
  out.push('7) 记忆不要每轮都翻：先判缺不缺。真缺口才用 bluetide_memory_read action=recall（一次 ≤3 步，会给你停因和缺口），不缺就别调——摘要里已经写着上一轮的调用结果。');
  return out.join('\n');
}

async function buildDigest(root, areas) {
  const thresholds = await readThresholds(root);
  const model = await readModel(root, thresholds, areas);
  const drift = await checkDrift(root);
  return formatDigest(thresholds, model, drift);
}

/* 热重载后的第一轮：同步读，别让系统提示出现「尚未读到四区数据」 */
function buildDigestSync(root, areas) {
  const { thresholds, model } = readModelSync(root, areas);
  return formatDigest(thresholds, model, null);
}

/* 决策 / 判断栏口径：与面板占比条同源，只是只回三环三个键。
   2026-11-01 之前这里另写了一套「取最近三笔 + 求和归一」：少了任务身份过滤、
   少了 24h 窗口、也不认每笔的 v5 权重。于是同一张面板上占比条和决策栏
   可以同时给出两组数，看着像「记录有、统计没有」。口径不设第二处实现。 */
function mixOfTaskStats(workRows = [], names) {
  const { shares } = taskMixOf(workRows, names);
  /* 只回三环三个键：面板会把对象逐键渲染成「名字 数值」，多一个键就多一行乱码 */
  return {
    perception: Number(shares && shares.perception) || 0,
    memory: Number(shares && shares.memory) || 0,
    persona: Number(shares && shares.persona) || 0,
  };
}

function dominantMix(decisions) {
  const mix = {};
  for (const decision of decisions) {
    const key = decision.dominant || 'unknown';
    mix[key] = (mix[key] || 0) + 1;
  }
  return mix;
}

/* 三环负载逐轮累加：抽成纯函数，测试能直接盯住（任务统计不能只记最后一轮） */
/* 三环调用次数：只数事件，不加权、不归一。
   一次感知写入 = 1；一次记忆检索或写入 = 1；一次判断/工具/人格写入 = 1。 */
function countOf(src = {}) {
  const appends = (src && src.appends) || {};
  const counts = {
    perception: Number(appends.perception) || 0,
    memory: (Number(appends.memory) || 0) + (Number(src.lookups) || 0),
    persona: (Number(appends.persona) || 0) + (Number(src.decisions) || 0) + (Number(src.tools) || 0),
  };
  counts.total = counts.perception + counts.memory + counts.persona;
  return counts;
}

function addUnits(prev, units) {
  const base = prev || { perception: 0, memory: 0, persona: 0 };
  return {
    perception: base.perception + Number((units && units.perception) || 0),
    memory: base.memory + Number((units && units.memory) || 0),
    persona: base.persona + Number((units && units.persona) || 0),
  };
}

/* 本轮三环占比：只认本轮可观测的信号，不猜语义。
   080 复核：摘要装配不再计入记忆分——固定 1.0 会压过任何 100 字以内的发言，
   短句闲聊一律被判成记忆主导（实测 2 字闲聊 → 感知 2% / 记忆 98%）。
   摘要只保留「本轮有动作」的标记作用：保证统计行照常产出，不参与 shares / dominant。 */
function autoMix(signals = {}, chars = 0) {
  const appends = signals.appends || {};
  const units = {
    /* 字数不进感知：占比只认真实写入次数，篇幅不参与任何环 */
    perception: (appends.perception || 0),
    memory: (signals.lookups || 0) * MIX_UNITS.lookup + (appends.memory || 0),
    persona: (signals.tools || 0) * MIX_UNITS.tool + (appends.persona || 0) + (signals.decisions || 0) * MIX_UNITS.decision,
  };
  const digest = signals.digest ? 1 : 0;
  const total = MIX_TRACKED.reduce((sum, key) => sum + units[key], 0);
  if (!(total > 0) && !digest) return null;
  const shares = {};
  for (const key of MIX_TRACKED) shares[key] = total > 0 ? Number((units[key] / total).toFixed(3)) : 0;
  const dominant = total > 0 ? MIX_TRACKED.reduce((best, key) => (units[key] > units[best] ? key : best), MIX_TRACKED[0]) : null;
  return { units, shares, dominant, digest };
}

/* ── 占比 v4 算式：已移到 logic/mix.js（2026-10-28 拆分）──────────────
   这里原来有 moodFactor / ratioV4 / dampAffect 三个纯函数。搬走的原因：
   口径改得最频繁，却又最容易被宿主接线缠住；现在改口径只动 logic/mix.js。
   本文件只负责调用：ratioV4(...) 算本轮占比，dampAffect(...) 做人格→情绪反馈。 */

/* 经验区在哪：正文在 02_Memory/经验/技术（架构目录，长期留存，一文一事），
   人格侧的 persona/experience 是提案区，可能为空。两处都读，谁先有内容用谁。 */
function experienceDirsOf(root) {
  const base = String(root || '');
  if (!base) return [];
  return [join(base, '..', '..', '02_Memory', '经验', '技术'), join(base, 'experience')];
}

/* 经验索引：一条经验一个 .md，README 是目录页不算经验。
   命中率按「词元重叠」算，不按整段余弦 —— 经验正文几千字，余弦会被篇幅稀释到 0.03，永远不命中。 */
function loadExperienceIndex(root) {
  const items = [];
  for (const dir of experienceDirsOf(root)) {
    if (!existsSync(dir)) continue;
    let names = [];
    try { names = readdirSync(dir); } catch { names = []; }
    for (const name of names) {
      if (!/\.md$/i.test(name) || /^readme\.md$/i.test(name)) continue;
      const file = join(dir, name);
      let text = '';
      try { text = readFileSync(file, 'utf8'); } catch { continue; }
      if (!text.trim()) continue;
      const head = (text.match(/^#\s+(.+)$/m) || [])[1];
      items.push({
        file, name,
        title: head ? head.trim() : name.replace(/\.md$/i, ''),
        keywords: keywordsOf(text.slice(0, 400)),
      });
    }
  }
  return items;
}

/* 本条输入命中几条经验。返回 0..n（不封顶，由 ratioV4 按总事件数截断）。 */
function matchExperience(root, text, opts = {}) {
  const query = keywordsOf(text);
  if (query.length < 2) return 0;
  const threshold = Number.isFinite(Number(opts.threshold)) ? Number(opts.threshold) : RATIO.hitMin;
  let hits = 0;
  for (const item of loadExperienceIndex(root)) {
    const shared = query.filter((word) => item.keywords.includes(word)).length;
    if (shared / query.length >= threshold) hits += 1;
  }
  return hits;
}

/* 经验联想（2026-11-09，087 第 6 步的姊妹功能）
   ───────────────────────────────────────────────────────────────
   上面 matchExperience 只回答「命中几条」——那个数字进了感知分子，然后就没了。
   正文一次都没到过模型眼前，所以「记住了」和「用上了」之间断了一截。

   这里补的就是那一截：把命中的经验**标题**摆进系统提示，让模型看见。
   · 触发式：只在这句话真的对上高辨识度主题时才出现，不是每轮硬塞
   · 必须过目：命中了就写在 gate 段里，每轮必读的位置
   · 不必采用：措辞里写死「采不采用由判断决定」，不替模型下结论

   索引按目录名 + mtime 缓存，别每轮重读 3000 字正文。 */
/* Flash：associate 缓存随模块一起移除 */



/* 给系统提示用的一行（多行）。没命中就返回空串，不制造噪音。 */


/* ── 本能层：已移到 logic/mix.js（2026-10-28 拆分）─────────────────────
   触发线、增量、2 小时惰性过期、槽上限都在那边的 RATIO 与 instinctTick 里。
   本文件只给落盘路径（INSTINCT_FILE），逻辑一律不在这里。 */

function parseIdentity(markdown) {
  const rows = {};
  if (!markdown) return rows;
  const start = markdown.search(/^##\s*Identity/m);
  if (start < 0) return rows;
  const rest = markdown.slice(start);
  const next = rest.slice(3).search(/^##\s/m);
  const section = next < 0 ? rest : rest.slice(0, next + 3);
  for (const line of section.split(/\r?\n/)) {
    const cells = line.trim().split('|');
    if (cells.length < 4) continue;
    const key = cells[1].replace(/[`*]/g, '').trim();
    const value = cells[2].replace(/[`*]/g, '').trim();
    if (!key || /^[-: ]+$/.test(key) || key === '项' || !value) continue;
    if (!(key in rows)) rows[key] = value;
  }
  return rows;
}

/* ── 人格切换（本机文件浏览）────────────────────────────────────
   切换只改「插件读哪份身份文件」：结果写进插件目录的 state.json，人格基座
   （BLUE Files/03_Persona/persona/*.md）一个字节都不动。改基座要另走 M6 门禁，这里不碰。 */
async function readPluginState() {
  try {
    const doc = parseJson(await readText(STATE_FILE));
    return doc && typeof doc === 'object' ? doc : {};
  } catch {
    return {};
  }
}

/* 同步读 state.json（095）：占比计算在同步上下文里跑，不能 await；读失败当空对象 */
function readPluginStateSync() {
  try {
    const doc = parseJson(readTextSync(STATE_FILE));
    return doc && typeof doc === 'object' ? doc : {};
  } catch {
    return {};
  }
}

async function writePluginState(next) {
  await mkdir(PLUGIN_DIR, { recursive: true });
  const tmp = `${STATE_FILE}.tmp`;
  await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  await rename(tmp, STATE_FILE);
}

/* ── 人格更改门禁（093）───────────────────────────────────────────
   默认锁。一个开关：打开＝先做完整自我备份，随后人格可浏览/替换。
   状态只写 state.json 的 personaGuard，不碰人格基座。

   「有没有在工作」不数任务仓库——历史任务卡常年挂着 active，会把门禁永久锁死（20:47 实锤：
   仓库里 9 张 active，其中 7 张是历史卡）。改成看「这一轮」：最近窗口内判定为 task 才算在做工作。
   窗口取 10 分钟：一次任务轮次里你每条消息都会刷新判定时间。 */
const WORK_WINDOW_MS = 10 * 60 * 1000;
function judgeWork(state, now = Date.now(), windowMs = WORK_WINDOW_MS) {
  const at = Number(state && state.at) || 0;
  const level = state && state.level ? String(state.level) : null;
  if (level !== 'task') return { active: false, reason: 'not-task', level, at, ageMs: null };
  if (!at) return { active: false, reason: 'no-turn', level, at, ageMs: null };
  const ageMs = Math.max(0, now - at);
  return { active: ageMs < windowMs, reason: ageMs < windowMs ? 'task-turn' : 'idle', level, at, ageMs };
}

async function readPersonaGuard() {
  const state = await readPluginState();
  const raw = state && typeof state.personaGuard === 'object' && state.personaGuard ? state.personaGuard : {};
  return { unlocked: raw.unlocked === true, at: typeof raw.at === 'string' ? raw.at : null };
}

async function writePersonaGuard(patch = {}) {
  const state = await readPluginState();
  const raw = state && typeof state.personaGuard === 'object' && state.personaGuard ? state.personaGuard : {};
  const next = {
    unlocked: patch.unlocked === undefined ? raw.unlocked === true : patch.unlocked === true,
    at: typeof patch.at === 'string' ? patch.at : typeof raw.at === 'string' ? raw.at : null,
  };
  state.personaGuard = next;
  await writePluginState(state);
  return { ...next };
}

/* 有工作任务 = 本轮判定为 task，且判定时间在 10 分钟窗口内。 */
function hasActiveWorkTask() {
  const judged = judgeWork(gateState);
  const minutes = judged.ageMs === null ? null : Math.max(1, Math.round(judged.ageMs / 60000));
  return {
    active: judged.active,
    taskIds: [],
    reason: judged.reason,
    level: judged.level,
    at: judged.at,
    ageMs: judged.ageMs,
    workText: judged.active
      ? `正在做任务（${minutes} 分钟前判定为「任务」）`
      : '没有正在进行的工作任务',
  };
}

/* 从一份配置文件里抠出显示用的名字：md 走 Identity 表 / 一级标题，json 认几个常见键 */
function parsePersonaFile(text, file) {
  const ext = String(file || '').split('.').pop().toLowerCase();
  const rows = parseIdentity(text) || {};
  let name = rows['名称'] || null;
  let alt = rows['自称'] || null;
  let race = rows['种族'] || null;
  if (ext === 'json') {
    try {
      const doc = JSON.parse(text);
      const pick = (...keys) => {
        for (const key of keys) {
          const value = doc && doc[key];
          if (typeof value === 'string' && value.trim()) return value.trim();
        }
        return null;
      };
      name = pick('名称', 'name', 'displayName', 'title') || name;
      alt = pick('自称', 'alias', 'shortName', 'nickname') || alt;
      race = pick('种族', 'race', 'species') || race;
    } catch {
      /* 坏 JSON 只按文本兜底，不报错 */
    }
  }
  if (!name) {
    const head = /^#\s+(.+)$/m.exec(String(text || ''));
    if (head) name = head[1].trim().slice(0, 40);
  }
  return { name, alt, race };
}

/* 当前搭载：状态文件里记的路径还在才认，文件被删就退回内置 identity.md */
async function readActivePersona(root) {
  const state = await readPluginState();
  const row = state && state.persona;
  if (!row || typeof row.path !== 'string' || !row.path.trim()) return null;
  try {
    const info = await stat(row.path);
    if (!info.isFile()) return null;
    return { path: row.path, at: row.at || null, bytes: info.size };
  } catch {
    return null;
  }
}

/* ── 完整自我备份 ────────────────────────────────────────────
   打开滑块时把「人格 + 四区记录」打包成 备份/<名字>-完整自我/，每次覆盖最新一份。
   包里的 manifest.json 是插件识别与装载的凭据；装载只换「读哪份身份文件」，基座不动。 */
function safeSelfName(value) {
  const raw = String(value || '').replace(/^\([^)]*\)\s*/, '').trim() || '蓝潮';
  const clean = raw.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim();
  return clean.slice(0, 40) || '蓝潮';
}

async function sha256File(file) {
  try {
    return createHash('sha256').update(await readFile(file)).digest('hex').slice(0, 16);
  } catch {
    return null;
  }
}

/* 整棵树复制：skipRoot 只跳过顶层同名目录（用来排除 BLUE Files/02_Memory/备份） */
async function copyTree(from, to, skipRoot) {
  const copied = [];
  const walk = async (dir, rel) => {
    let items = [];
    try {
      items = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const item of items) {
      if (!rel && skipRoot && skipRoot.has(item.name)) continue;
      const nextRel = rel ? `${rel}/${item.name}` : item.name;
      const full = join(dir, item.name);
      if (item.isDirectory()) {
        await walk(full, nextRel);
      } else if (item.isFile()) {
        const dest = join(to, ...nextRel.split('/'));
        await mkdir(dirname(dest), { recursive: true });
        await copyFile(full, dest);
        copied.push({ from: full, to: dest, rel: nextRel });
      }
    }
  };
  await walk(from, '');
  return copied;
}

async function countJsonLines(file) {
  try {
    const text = await readFile(file, 'utf8');
    return text.split(/\r?\n/).filter((line) => line.trim()).length;
  } catch {
    return 0;
  }
}

async function buildCompleteSelf(root) {
  const workspace = activeWorkspace || join(root, '..', '..');
  const active = await readActivePersona(root);
  const activePath = active ? active.path : join(root, 'identity.md');
  let activeText = '';
  try {
    activeText = await readFile(activePath, 'utf8');
  } catch {
    /* 身份文件读不到也照包其他人格层 */
  }
  const picked = parsePersonaFile(activeText, activePath);
  const name = safeSelfName(picked.name);
  const base = join(workspace, SELF_BACKUP_ROOT);
  const finalDir = join(base, `${name}${SELF_BACKUP_SUFFIX}`);
  const staging = join(base, `.staging-${Date.now()}`);
  await mkdir(staging, { recursive: true });

  const files = [];
  files.push(...(await copyTree(root, join(staging, 'persona'))));
  files.push(...(await copyTree(join(workspace, 'BLUE Files', '02_Memory'), join(staging, 'memory'), SELF_SKIP_NAMES)));
  /* 记录文件按布局清单走（反馈条目实际写在 persona.ndjson 里，不再找不存在的 feedback.ndjson） */
  const recordDirs = (activeLayoutMeta && activeLayoutMeta.areas) || {
    perception: join(workspace, 'BLUE Files', '01_Perception', '记录'),
    persona: join(workspace, 'BLUE Files', '03_Persona', '记录'),
    work: join(workspace, 'BLUE Files', '04_Execution_Membrane', '执行', '工作', '记录'),
  };
  for (const [key, file] of [['perception', 'perception.ndjson'], ['persona', 'persona.ndjson'], ['work', 'work.ndjson']]) {
    const from = join(recordDirs[key], file);
    const to = join(staging, 'records', file);
    try {
      await mkdir(dirname(to), { recursive: true });
      await copyFile(from, to);
      files.push({ from, to });
    } catch {
      /* 某个区还没落过盘就跳过 */
    }
  }

  /* 身份文件若不在 persona 根下（切换过外部文件），单独带一份进包 */
  let identityRel = 'persona/identity.md';
  const rootNorm = String(root).toLowerCase();
  const activeNorm = String(activePath).toLowerCase();
  const insideRoot = activeNorm === rootNorm + '\\identity.md' || activeNorm === rootNorm + '/identity.md'
    || activeNorm.startsWith(rootNorm + '\\') || activeNorm.startsWith(rootNorm + '/');
  if (!insideRoot) {
    const leaf = String(activePath).split(/[\\/]/).pop() || 'identity.md';
    const dest = join(staging, 'persona', `external-${leaf}`);
    try {
      await mkdir(dirname(dest), { recursive: true });
      await copyFile(activePath, dest);
      files.push({ from: activePath, to: dest });
      identityRel = `persona/external-${leaf}`;
    } catch {
      /* 外部身份文件读不到就仍指向 identity.md */
    }
  }

  const entries = [];
  for (const item of files) {
    const rel = relative(staging, item.to).split('\\').join('/');
    let bytes = null;
    try {
      bytes = (await stat(item.to)).size;
    } catch {
      /* 拿不到体量就留空 */
    }
    entries.push({ path: rel, bytes, sha256: await sha256File(item.to) });
  }
  const totalBytes = entries.reduce((sum, item) => sum + (Number(item.bytes) || 0), 0);
  const createdAt = new Date().toISOString();
  /* 反馈条目写在 persona.ndjson 里（areaOfKind 的映射），不再读不存在的 feedback.ndjson */
  let feedbackCount = 0;
  try {
    const personaText = await readFile(join(staging, 'records', 'persona.ndjson'), 'utf8');
    feedbackCount = personaText.split('\n').filter((line) => line.includes('"ring":"feedback"')).length;
  } catch {
    feedbackCount = 0;
  }
  const counts = {
    perception: await countJsonLines(join(staging, 'records', 'perception.ndjson')),
    memory: await countJsonLines(join(staging, 'memory', '记录', 'memory.ndjson')),
    persona: await countJsonLines(join(staging, 'records', 'persona.ndjson')),
    feedback: feedbackCount,
  };
  const manifest = {
    v: 1,
    kind: COMPLETE_SELF_KIND,
    name,
    folder: `${name}${SELF_BACKUP_SUFFIX}`,
    createdAt,
    persona: { path: activePath, name: picked.name || name, alt: picked.alt || null, identity: identityRel },
    counts,
    files: entries,
    totalBytes,
    note: '完整自我 = 人格 + 四区记录；不含 04 工程产物。每次打开滑块覆盖成最新一份。',
  };
  await writeFile(join(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const md = [
    `# ${name}${SELF_BACKUP_SUFFIX}`,
    '',
    `- 创建时间：${createdAt}`,
    `- 当前搭载身份文件：\`${activePath}\``,
    `- 记录条数：感知 ${counts.perception} · 记忆 ${counts.memory} · 人格 ${counts.persona} · 反馈 ${counts.feedback}`,
    `- 文件数：${entries.length}（合计 ${(totalBytes / 1024 / 1024).toFixed(2)} MB）`,
    '',
    '## 包里有什么',
    '',
    '- `persona/` —— BLUE Files/03_Persona/persona 全量（身份、角色、认知、本能、投影、rings、krp、memory 卡片、经验）',
    '- `memory/` —— 02_Memory 全量（不含 `BLUE Files/02_Memory/备份`，避免备份套备份）',
    '- `records/` —— 四区 ndjson：perception / persona / work / feedback',
    '- `manifest.json` —— 插件识别与装载用的清单（含逐文件 sha256）',
    '',
    '## 怎么用',
    '',
    '面板 → 设置 → 变更我的伙伴 → 切换… → 备份 → 点这个文件夹旁的「装载」。',
    '装载只改「面板读哪份身份文件」，不回写 03_Persona 基座；改基座要走 M6 门禁。',
    '',
  ].join('\n');
  await writeFile(join(staging, `${name}${SELF_BACKUP_SUFFIX}.md`), md, 'utf8');

  /* 原子替换：先整包写好，再换名；失败把旧包换回来 */
  const old = join(base, `.old-${Date.now()}`);
  let hadOld = false;
  try {
    await rename(finalDir, old);
    hadOld = true;
  } catch {
    /* 第一次备份：没有旧包 */
  }
  try {
    await rename(staging, finalDir);
  } catch (error) {
    if (hadOld) {
      try {
        await rename(old, finalDir);
      } catch {
        /* 回滚失败只能留旧包在 .old-* 里 */
      }
    }
    await rm(staging, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
  if (hadOld) await rm(old, { recursive: true, force: true }).catch(() => {});
  return { ok: true, dest: finalDir, name, at: createdAt, counts, files: entries.length, bytes: totalBytes };
}

/* 桌宠（@local/bluetide-companion）探测：只做接口串联。
   apply 时注入 petProbe 拿 live 插件表，判断装了没、开着没。 */
let petProbe = null;
const PET_MODULE = '@local/bluetide-companion';
const PET_DIR_PARTS = ['04_Execution_Membrane', '工具', '本地插件', 'bluetide-companion'];
/* 桌宠真正的立绘不在 icon.png（那是 256×256 的方形图标），而是 client.js 里内嵌的
   base64 webp（380×808 全身立绘）。这里把它抠出来缓存，按 client.js 的 mtime 失效。 */
const PET_ART_RE = /const ART = 'data:image\/([\w+.-]+);base64,([A-Za-z0-9+/=]+)'/;
let petArtCache = { mtime: -1, mime: null, bytes: null, size: null };
async function readPetArt(dir) {
  const file = join(dir, 'client.js');
  let mtime = 0;
  try {
    const info = await stat(file);
    mtime = info && info.mtimeMs ? Math.round(info.mtimeMs) : 0;
  } catch {
    return null;
  }
  if (petArtCache.bytes && petArtCache.mtime === mtime) return petArtCache;
  try {
    const text = await readFile(file, 'utf8');
    const hit = PET_ART_RE.exec(text);
    if (!hit) return null;
    const bytes = Buffer.from(hit[2], 'base64');
    let size = null;
    /* webp VP8X：'VP8X' + 4 字节长度 + 4 字节标志，然后宽高各 3 字节（存的是值减一） */
    const at = bytes.indexOf('VP8X');
    if (at > 0 && bytes.length > at + 17) {
      const width = bytes[at + 12] + (bytes[at + 13] << 8) + (bytes[at + 14] << 16) + 1;
      const height = bytes[at + 15] + (bytes[at + 16] << 8) + (bytes[at + 17] << 16) + 1;
      size = { width, height };
    }
    petArtCache = { mtime, mime: `image/${hit[1]}`, bytes, size };
    return petArtCache;
  } catch {
    return null;
  }
}
async function readPet(workspace) {
  /* 插件实体在 BLUE Files 箱里（C 阶段后的布局）；老布局在工作区根。两处都试，
     谁有 package.json 用谁——写死旧路径的结果是桌宠目录永远探不到、形象永远「未取到」。 */
  let dir = join(workspace, ...PET_DIR_PARTS);
  let manifest = parseJson(await readText(join(dir, 'package.json')));
  if (!(manifest && manifest.name)) {
    const alt = join(workspace, 'BLUE Files', ...PET_DIR_PARTS);
    const altManifest = parseJson(await readText(join(alt, 'package.json')));
    if (altManifest && altManifest.name) {
      dir = alt;
      manifest = altManifest;
    }
  }
  const installed = Boolean(manifest && manifest.name);
  let enabled = null;
  let entryId = null;
  let fiberPhase = null;
  try {
    const list = typeof petProbe === 'function' ? await petProbe() : null;
    const row = Array.isArray(list) ? list.find((one) => one && one.moduleName === PET_MODULE) : null;
    if (row) {
      enabled = Boolean(row.enabled);
      entryId = row.entryId ?? null;
      fiberPhase = row.fiberPhase ?? null;
    }
  } catch {
    /* 探不到插件表就只报「装没装」，不瞎猜开没开 */
  }
  const config = parseJson(await readText(join(dir, 'avatar.json')));
  const art = await readPetArt(dir);
  const iconPath = join(dir, 'icon.png');
  const picked = config && typeof config.avatar === 'string' ? config.avatar : null;
  /* 展示用的「当前形象」优先级：avatar.json 选中且文件在 → 内嵌全身立绘 → icon.png */
  let imageKind = 'none';
  let imagePath = null;
  let imageMtime = 0;
  let imageMime = null;
  if (picked) {
    try {
      const info = await stat(picked);
      if (info) {
        imageKind = 'file';
        imagePath = picked;
        imageMtime = Math.round(info.mtimeMs || 0);
      }
    } catch {
      /* 选中的图不在了，退回内嵌立绘 */
    }
  }
  if (imageKind === 'none' && art) {
    imageKind = 'embedded';
    imageMime = art.mime;
    imageMtime = art.mtime;
  }
  if (imageKind === 'none') {
    try {
      const info = await stat(iconPath);
      if (info) {
        imageKind = 'file';
        imagePath = iconPath;
        imageMtime = Math.round(info.mtimeMs || 0);
      }
    } catch {
      /* 连 icon 都没有就报未取到 */
    }
  }
  const imageSource =
    imageKind === 'embedded' ? '内置立绘（client.js 内嵌 webp）'
      : imageKind === 'file' ? (picked ? 'avatar.json' : '立绘插件 icon.png（白底立绘）')
        : '未取到';
  /* 白底立绘是 png，尺寸直接读 IHDR：256×256 这种信息给设置页显示，不用再猜 */
  let imageSize = imageKind === 'embedded' ? art.size : null;
  if (imageKind === 'file' && imagePath && /\.png$/i.test(imagePath)) {
    try {
      const head = (await readFile(imagePath)).subarray(0, 24);
      if (head.length >= 24 && head.readUInt32BE(12) === 0x49484452) {
        imageSize = { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
      }
    } catch {
      /* 读不到尺寸就留空 */
    }
  }
  return {
    name: manifest?.name ?? null,
    version: manifest?.version ?? null,
    description: manifest?.description ?? null,
    installed,
    enabled,
    entryId,
    fiberPhase,
    dir,
    icon: iconPath,
    avatarConfig: join(dir, 'avatar.json'),
    avatar: picked,
    avatarAt: config && config.updatedAt ? config.updatedAt : null,
    imageUrl: `${PET_IMAGE_ENDPOINT}?v=${imageMtime}`,
    imageKind,
    imageMime,
    imageSource,
    imagePath,
    imageSize: imageKind === 'embedded' ? art.size : null,
  };
}

/* 对等插件（语音）探测：只回答「装没装、开没开」，不碰它的功能。
   两个来源分开：装没装看目录里有没有 package.json，开没开看 host 的 live 插件表。
   三环单独装的时候另一个插件根本不在——这时必须报 missing，而不是显示一堆空字段。 */
const PEER_DIR_PARTS = ['04_Execution_Membrane', '工具', '本地插件'];
async function readPeer(workspace, dirName, moduleName) {
  const candidates = [
    join(workspace, ...PEER_DIR_PARTS, dirName),
    join(workspace, 'BLUE Files', ...PEER_DIR_PARTS, dirName),
  ];
  let dir = candidates[0];
  let manifest = null;
  for (const one of candidates) {
    const seen = parseJson(await readText(join(one, 'package.json')));
    if (seen && seen.name) {
      dir = one;
      manifest = seen;
      break;
    }
  }
  let liveRow = null;
  try {
    const list = typeof petProbe === 'function' ? await petProbe() : null;
    if (Array.isArray(list)) {
      liveRow = list.find((one) => one && (one.moduleName === moduleName || one.name === moduleName)) ?? null;
    }
  } catch {
    /* 拿不到插件表就只报装没装，不猜开没开 */
  }
  /* Flash（2026-11-09）：对等插件探测不再单独成模块 —— 唯一消费者就是本函数。
     判定逻辑与原 logic/peer.js 逐字一致，字段一个不少；面板读的是 label。
     四种状态：missing 没装 / installed 装了但宿主没回报 / off 装了没开 / on 已开启。
     「装没装」看目录里的 package.json，「开没开」看 host 的 live 插件表，两个来源分开算。 */
  const installed = Boolean(manifest && manifest.name);
  const enabled = liveRow && typeof liveRow.enabled === 'boolean' ? liveRow.enabled : null;
  const stateName = !installed ? 'missing' : enabled === true ? 'on' : enabled === false ? 'off' : 'installed';
  const LABELS = { missing: '未安装', installed: '装了 · 状态未知', off: '装了 · 没开', on: '已开启' };
  const hint = stateName === 'missing'
    ? `未检测到${dirName}：装好之后重启宿主，这一栏才会出现信息`
    : stateName === 'installed'
      ? '已装但宿主没回报状态：通常是还没重启'
      : stateName === 'off'
        ? `${dirName}装了但没开：在插件页打开它`
        : `${dirName}正常`;
  return {
    name: (manifest && manifest.name) || null,
    version: (manifest && manifest.version) || null,
    description: (manifest && manifest.description) || null,
    installed,
    enabled,
    state: stateName,
    label: LABELS[stateName],
    entryId: (liveRow && liveRow.entryId) || null,
    fiberPhase: (liveRow && liveRow.fiberPhase) || null,
    dir,
    hint,
  };
}

async function buildSettingsData(root, areas) {
  /* 只留「有人读」的字段：layout / areas / memoryFiles 被 test-boot 当契约断言，
     today 供设置页算负载；changelog 与 personaLayers 无人消费（client.js grep 0 命中），
     每 30 秒白读 7 个文件 + 白传 24 KB，已于 080 移除。要恢复先补界面再补数据。 */
  const out = { areas: {}, images: [], dirs: {} };
  const dirs = resolveAreas(root, areas);
  out.dirs = dirs;
  /* 记忆融合开关（默认关）：设置页读它决定按钮状态，工具 apply 也看它 */
  out.fuseEnabled = (await readPluginState()).fuseEnabled === true;
  const fullRows = {};
  for (const [key, file] of Object.entries(AREA_FILES)) {
    const text = await readText(join(dirs[key], file));
    const rows = [];
    for (const line of String(text || '').split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        rows.push(JSON.parse(line));
      } catch {
        /* 坏行跳过：一行坏掉不能毁掉整页 */
      }
    }
    /* 今日条数与文件行数都用全量算；只把「下发窗口」裁到最近 N 行 */
    fullRows[key] = rows;
    out.areas[key] = rows
      .slice(-SETTINGS_AREA_ROWS)
      .reverse()
      .map((row) => ({
        ts: row.ts ?? null,
        type: row.type ?? null,
        kind: row.kind ?? null,
        kindTag: row.kindTag ?? null,
        title: row.title ?? null,
        text: row.text ?? row.output ?? row.summary ?? '',
        status: row.status ?? null,
      }));
  }
  /* 今日三环负载：按本地零点切，统计今天各环写了多少条，供设置页算占比 */
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const since = dayStart.getTime();
  out.today = {};
  for (const key of ['perception', 'memory', 'persona', 'feedback']) {
    out.today[key] = (fullRows[key] || []).filter((row) => row.ts && Date.parse(row.ts) >= since).length;
  }
  /* 长期记忆的源文件清单：只给路径和体量，正文让你点开文件夹自己看 */
  out.memoryFiles = [];
  for (const [key, file] of Object.entries(AREA_FILES)) {
    const full = join(dirs[key], file);
    let bytes = null;
    let mtime = null;
    try {
      const info = await stat(full);
      bytes = info.size;
      mtime = info.mtime.toISOString();
    } catch {
      /* 文件不存在就留空 */
    }
    out.memoryFiles.push({ key, file, path: full, dir: dirs[key], bytes, mtime, rows: (fullRows[key] || []).length });
  }
  /* personaRoot = <工作区>/BLUE Files/03_Persona/persona；素材目录从布局清单拿，不再硬拼 */
  const workspace = activeWorkspace || join(root, '..', '..');
  const imagesDir = (activeLayoutMeta && activeLayoutMeta.images) || join(workspace, 'BLUE Files', '04_Execution_Membrane', '执行', '工作', '工作资料', '素材', '抖音-蓝潮');
  try {
    const names = await readdir(imagesDir);
    out.imagesDir = imagesDir;
    out.images = names.filter((name) => /\.(png|jpe?g|gif|webp)$/i.test(name));
  } catch {
    /* 素材目录不存在就空着，不影响其它节 */
  }
  /* 人格层六份（LAYERS）：每个槽位都有「有 / 无」，新机器上不能假装读到 */
  out.personaSlots = [];
  for (const [id, file] of LAYERS) {
    const path = join(root, file);
    let exists = false;
    let bytes = null;
    try {
      const info = await stat(path);
      exists = info.isFile();
      bytes = info.size;
    } catch {
      exists = false;
    }
    out.personaSlots.push({ id, file, path, exists, bytes });
  }
  out.personaMissing = out.personaSlots.filter((slot) => !slot.exists).map((slot) => slot.file);
  /* 人格更改门禁（093）：默认锁；**有任务进行中也可解锁**（097 按你要求放开）。
     判定与状态都在服务端，界面只显示：任务在跑时给提示，不强制复位。 */
  const guard = await readPersonaGuard();
  const work = hasActiveWorkTask();
  const stamp = new Date().toISOString();
  out.personaGuard = {
    ...guard, hasWork: work.active, workText: work.workText, windowMin: Math.round(WORK_WINDOW_MS / 60000), checkedAt: stamp,
    rule: work.active
      ? `${work.workText}：仍可解锁，改动会立即生效，请先确认备份`
      : '没有正在进行的工作任务：可以解锁',
  };
  /* 桌宠：装了没 / 开着没 / 当前形象，供「形象管理」页判断要不要给替换入口 */
  out.pet = await readPet(workspace);
  /* 语音插件：三环单独装时不在这里，面板要说「未安装」，不要装作有信息 */
  out.voice = await readPeer(workspace, 'bluetide-voice', '@local/bluetide-voice');
  /* 署名与构建编号：面板底部那行小字从这里取，别在界面里各写一遍 */
  const buildMeta = parseJson(readTextSync(join(PLUGIN_DIR, 'bluetide-build.json'))) || {};
  out.credits = {
    author: AUTHOR.name,
    handle: AUTHOR.handle,
    license: AUTHOR.license,
    feedback: AUTHOR.feedback,
    version: ENGINE_VERSION,
    build: buildMeta.id ?? null,
    line: creditLine(ENGINE_VERSION),
  };
  /* 文件浏览的起点与允许范围的根：客户端拿它做面包屑与「工作区根」快捷 */
  out.workspace = workspace;
  out.personaRoot = root;
  out.backupRoot = join(workspace, SELF_BACKUP_ROOT);
  /* 浏览窗的起点：工作区根，直接看到 01_Perception / 02_Memory / 03_Persona / 04_Execution_Membrane / 备份 */
  out.start = workspace;
  /* 前置环境体检：面板显示根、清单来源、版本与问题，方便换机后一眼看出绑没绑上 */
  out.layout = activeLayoutMeta;
  return out;
}

/* 快照出口的总闸：任何字段里的字符串超过 200 字一律截断。
   为什么放在最外层：前面逐个字段压缩总会漏——056 A4/A5 两红就是漏在没预料到的字段上。
   面板只显示前一两行，所以截断不丢可见信息；原文仍完整落盘，检索读原文。 */
const SNAPSHOT_TEXT_MAX = 200;
function deepTrim(value, depth = 0) {
  if (depth > 8) return '…';
  if (typeof value === 'string') {
    return value.length > SNAPSHOT_TEXT_MAX ? value.slice(0, SNAPSHOT_TEXT_MAX) + '…' : value;
  }
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => deepTrim(item, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = deepTrim(item, depth + 1);
    return out;
  }
  return value;
}

async function buildSnapshot(root, areas) {
  return deepTrim(await buildSnapshotUnsafe(root, areas));
}

async function buildSnapshotUnsafe(root, areas) {
  const [identityMd, architectureMd, organsText] = await Promise.all([
    readText(join(root, 'identity.md')),
    readText(join(root, 'ARCHITECTURE.md')),
    readText(join(root, 'organs', 'registry.json')),
  ]);
  const policy = parseJson(await readText(join(root, 'krp', 'policy.json')));
  const maxBytes = policy?.concision?.maxBytes ?? {};
  const thresholds = await readThresholds(root);
  const model = await readModel(root, thresholds, areas);
  /* 任务中文短名：一次快照读一遍 registry，后面工单/占比/三栏全用它。
     注意：这里不能引用 apply() 里的 boot（那是另一个作用域），用全局布局元数据。 */
  const taskNames = await loadTaskNames(activeLayoutMeta && activeLayoutMeta.tasks);
  const drift = await checkDrift(root);
  const layers = [];
  for (const [id, file, budgetKey, gate, frozen] of LAYERS) {
    layers.push({ id, file, gate, frozen, bytes: await fileSize(join(root, file)), budget: typeof maxBytes[budgetKey] === 'number' ? maxBytes[budgetKey] : null });
  }
  const experience = {};
  for (const stage of ['proposed', 'accepted', 'rejected', 'fused']) experience[stage] = await countFiles(join(root, 'experience', stage));
  const organsDoc = parseJson(organsText);
  const version = /V\d+(?:\.\d+)*/.exec(architectureMd?.split(/\r?\n/)[0] ?? '');
  const blocks = model.blocks.filter((item) => item.status === 'active');
  const liveWork = model.workRows.filter((row) => !row.expired && row.type !== 'taskstats');
  /* 人格切换：状态文件里记的那份身份文件优先；没记或文件没了就退回内置 identity.md。
     只影响「面板读哪份身份」，人格基座文件不动。 */
  const active = await readActivePersona(root);
  let identityText = identityMd;
  if (active) {
    try {
      identityText = await readText(active.path);
    } catch {
      identityText = identityMd;
    }
  }
  const identityFile = active ? active.path : join(root, 'identity.md');
  const picked = parsePersonaFile(identityText, identityFile);
  const baseRows = parseIdentity(identityMd);
  const pickedRows = parseIdentity(identityText);
  const identityRows = Object.keys(pickedRows).length ? pickedRows : baseRows;
  const activeName = picked.name || identityRows['名称'] || null;
  const activeAlt = picked.alt || identityRows['自称'] || null;
  return {
    ok: true,
    /* 095：三环权重 v5（默认 null；开着且跑过一轮后才有值） */
                ringWeightV5: null,   /* Flash：恒 null。面板按 shareProtocol 门控，v4 协议下不读此字段 */
      /* 2026-11-09 面板接线端口：把「当前后端跑的是哪块芯片」明写进快照。
         面板不猜字段长什么样，先读这个协议号再决定怎么解释 —— 这样换芯片、
         或某个芯片被裁掉，界面只是按另一个协议显示，不会读到 undefined 炸屏。 */
      shareProtocol: (() => {
        try {
          const st = readPluginStateSync();
          return (st.ringWeightV5 === true && CHIP_NAMES.includes('v5')) ? 'v5' : 'v4';
        } catch { return 'v4'; }
      })(),
    ringWeightV5Enabled: readPluginStateSync().ringWeightV5 === true,
    /* 2026-11-05：本轮情绪（展示用）。没跑过一轮就是 null，界面写「暂无」。 */
    affect: liveState.affect || null,
    generatedAt: new Date().toISOString(),
    now: nowIso(),
    stamp: stampPreview(new Date(), lastTaskSeen.task),
    root,
    version: version ? version[0] : null,
    autoRecall: autoRecallState,
    identity: identityRows,
    /* 设置页「变更我的伙伴」用的当前搭载人格：名字 + 来源文件 + 是不是内置 */
    activePersona: {
      path: identityFile,
      name: activeName,
      alt: activeAlt,
      race: picked.race || identityRows['种族'] || null,
      bytes: active ? active.bytes : (identityMd ? Buffer.byteLength(identityMd, 'utf8') : null),
      at: active ? active.at : null,
      isDefault: !active,
      defaultPath: join(root, 'identity.md'),
      baseDir: root,
    },
    layers,
    /* 三环条目 / 变化 / 执行记录都要过一遍压缩：以前这里直接下发 model 原文，
       一条 5MB 的正文就能把快照顶到近 10MB（056 A4/A5 两红就是这条）。
       工作行两边共用 workRowView，形状与截断上限一致。 */
    rings: Object.fromEntries(
      RINGS.map((ring) => [
        ring,
        { ...model.rings[ring], items: (model.rings[ring].items || []).map(displayItem) },
      ]),
    ),
    settings: await buildSettingsData(root, areas),
    decisions: model.decisions,
    execution: (model.execution || []).map(workRowView),
    work: {
      /* 2026-11-01：口径已从「24h 一刀切」改成遗忘曲线，这里别再写 24。
         数字 = 一条**没被再访问过**的行跌破 keepAt 的小时数（≈40h）；
         真到那时也只是清掉，24h 时它已经先渐隐了。 */
      ttlHours: Math.round(hoursUntilGone(0)),
      total: liveWork.length,
      limit: WORK_ROW_LIMIT,
      /* 只发最近 10 条；形状与 execution 共用 workRowView（同一套压缩与容错） */
      rows: liveWork.slice(0, WORK_ROW_LIMIT).map(workRowView),
      /* 工作记录列表的唯一来源（2026-10-28 你定：信息源固定，逻辑放宿主）。
         一轮一条，只认 turn 行：标题、方法、字数、占比都在它身上。
         photo（人读快照，只有标题、没有方法）和 result（记忆环执行记录）各有各的用处，
         不进这个列表——以前两个数组在渲染处拼接，同一轮就会出现两张纸。 */
      turns: liveWork.filter((row) => row.type === 'turn').slice(0, WORK_ROW_LIMIT).map(workRowView),
      tasks: Object.values(liveWork.reduce((acc, row) => {
        const key = row.task ?? '__untasked__';
        acc[key] = { task: row.task, endedAt: row.endedAt, expiresAt: row.expiresAt, rows: (acc[key]?.rows ?? 0) + 1 };
        return acc;
      }, {})),
    },
    memory: {
      pending: model.pending, archived: model.archived,
      halfLifeDays: thresholds.halfLifeDays, floor: thresholds.floor,
      staging: model.staged.length, proposals: model.proposals.filter((item) => item.status === 'proposed').length,
      blocks: blocks.length, blocksWork: blocks.filter((item) => item.area === 'work').length, blocksDaily: blocks.filter((item) => item.area === 'daily').length,
      drift: drift.drift, driftFiles: drift.changed,
      confronts: model.confronts.length, contradicts: model.confronts.filter((item) => item.matched === 'contradict').length,
      misses: model.misses.length,
    },
    stats: {
      window: model.statsWindow,
      rings: Object.fromEntries(RINGS.map((ring) => [ring, { count: model.rings[ring].count, windowCount: model.rings[ring].windowCount, updatedAt: model.rings[ring].updatedAt }])),
      /* 数据来源准则①：面板的占比只有一个来源——汇总工单（taskstats）。
         decisions / judgements 只留行与计数（供明细展示），占比一律由工单推出，避免同屏两套口径。 */
      decisions: { count: model.decisionTotal, updatedAt: model.decisions[0]?.ts ?? null, dominantMix: mixOfTaskStats(model.workRows, taskNames), source: 'taskstats' },
      judgements: {
        count: model.judgements.length,
        auto: model.judgements.filter((row) => row.source === 'auto').length,
        updatedAt: model.judgements[0]?.ts ?? null,
        dominantMix: mixOfTaskStats(model.workRows, taskNames),
        rows: model.judgements,
        source: 'taskstats',
      },
      changes: (model.changes || []).map(displayItem),
      /* 任务级占比：最近三个任务的 stats 相加再归一化（闲聊不进） */
      taskMix: taskMixOf(model.workRows, taskNames),
      verifyMix: model.verifyMix,
      /* 记忆环用没用上：只认动作（本轮检索次数），不拿输出文本猜 */
      lookup: {
        last: lastLookup.at
          ? { at: new Date(lastLookup.at).toISOString(), kind: lastLookup.kind, query: lastLookup.query, hits: lastLookup.hits }
          : null,
        turns: liveWork.filter((row) => row && row.type === 'turn').length,
        lookedTurns: liveWork.filter((row) => row && row.type === 'turn' && Number(row.looked) > 0).length,
      },
      photo: {
        limit: PHOTO_LIMIT, mixWindow: TASK_STATS_LIMIT,
        count: model.workRows.filter((row) => row && row.type === 'photo').length,
        note: '工单读完即删；照片留最近 10 张，占比取最近 3 个任务',
      },
      gate: { level: gateState.level, why: gateState.why, at: gateState.at, checks: gateStats.checks, pass: gateStats.pass, blocked: gateStats.blocked, last: gateStats.last, sessions: gateBySession.size },
      /* 活跃度：running = 有 agent 正在跑（agent/status + live agents 复核）；idle = 我不动了 */
      live: readLive(),
    },
    governance: {
      invariants: Array.isArray(policy?.invariants) ? policy.invariants.length : null,
      gateAppliesTo: policy?.erp?.gate?.appliesTo ?? null,
      frozenTiers: policy?.erp?.freeze?.defaultFrozen ?? null,
      drift: policy?.erp?.drift?.method ?? null,
      rollback: policy?.erp?.rollback?.method ?? null,
      thresholds: policy?.erp?.thresholds ?? null,
    },
    organs: Array.isArray(organsDoc?.organs)
      ? organsDoc.organs.map((organ) => ({ id: organ.id ?? null, name: organ.name ?? null, health: organ.state?.health ?? null, root: organ.root ?? null }))
      : [],
    experience,
    memoryCards: await countFiles(join(root, 'memory')),
    revisions: await countFiles(join(root, 'krp', 'revisions')),
  };
}

const MEMORY_TOOL = {
  name: 'bluetide_memory',
  description:
    '长期记忆工具。action 决定动作：append 写一条；confront 对照；search/recent/topics 取用；recall 多步检索；consolidate/fuse/refine 整理；promote/candidate 晋升。只追加。',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['append', 'confront', 'search', 'recent', 'topics', 'consolidate', 'recall', 'fuse', 'promote', 'candidate', 'refine'] },
      kind: { type: 'string', enum: KINDS.concat(['verify', 'capture']), description: 'append：写什么（条目/裁定/执行/回验）' },
      raw: { type: 'string', description: 'confront：用户原话要点' },
      filtered: { type: 'string', description: 'confront：最终结论' },
      text: { type: 'string' },
      task: { type: 'string' },
      title: { type: 'string' },
      method: { type: 'string' },
      data: { type: 'object', description: 'execution：附带的工具数据' },
      work: { type: 'string', description: 'decision：随任务走的说明（24h 清理）' },
      memory: { type: 'string', description: 'decision：要长期保留的判据' },
      trigger: { type: 'string' },
      signal: { type: 'string', enum: ['confirm', 'adjust', 'recheck'] },
      object: { type: 'string' },
      until: { type: 'string' },
      dominant: { type: 'string', enum: ['perception', 'memory', 'persona'] },
      shares: { type: 'object', properties: { perception: { type: 'number' }, memory: { type: 'number' }, persona: { type: 'number' } } },
      reason: { type: 'string' },
      query: { type: 'string' },
      limit: { type: 'number' },
      budget: { type: 'number', description: 'recall：最多检索几步（1–3，默认 3）' },
      mode: { type: 'string', enum: ['plan', 'apply'], description: 'fuse：plan 只出分组预览；apply 落盘（需设置里打开开关）' },
      members: { type: 'array', items: { type: 'string' }, description: 'fuse：被融合的成员 mid 列表' },
      kept: { type: 'array', items: { type: 'string' }, description: 'fuse：差异句（原样保留，必须非空）' },
      topic: { type: 'string' },
      kindTag: { type: 'string', enum: ['fact', 'preference', 'boundary', 'commitment', 'nickname', 'trigger', 'lesson', 'trait', 'style', 'emotion'] },
      explicit: { type: 'boolean' },
      emotion: { type: 'number' },
      permanence: { type: 'string', enum: ['decay', 'permanent'] },
      force: { type: 'boolean' },
      affectsPersona: { type: 'boolean' },
      alignment: { type: 'number' },
      area: { type: 'string', enum: ['work', 'daily'] },
      value: { type: 'number' },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['action'],
    additionalProperties: false,
  },
  output: {
    schema: { type: 'object' },
    /* 回执只给一行，不再把整块 JSON 砸进对话。
       你 2026-10-25 定：要融合输出，不要「一个人在说话 + 一台收银机打小票」。
       这里的回执只是后台回执——真正该读的细节要写进正文，不靠回执承载。
       查询类（search / recent / topics）仍给可读列表，一条一行，不缩进不花括号。 */
    render(_args, value) {
      try {
        if (!value || typeof value !== 'object') return [{ type: 'text', text: String(value ?? '') }];
        if (value.ok === false) return [{ type: 'text', text: `✗ ${value.error || '失败'}` }];
        if (Array.isArray(value.groups)) {
          const head = value.groups.length
            ? `可融合 ${value.groups.length} 组`
            : '暂时没有可融合的分组（相似度都没到位）';
          const body = value.groups
            .map((g) => `· ${g.topic} · ${g.memberCount} 条 · 相似 ${g.similarity}：${g.members.map((m) => m.stamp).join(' / ')}`)
            .join('\n');
          return [{ type: 'text', text: body ? `${head}\n${body}` : head }];
        }
        if (typeof value.fused === 'number') {
          return [{ type: 'text', text: `✓ 融合 ${value.fused} 条 → 记忆块 ${value.fusion_id}（差异句 ${(value.block?.kept || []).length} 条）` }];
        }
        if (Array.isArray(value.items)) {
          /* recall 的回执先把「为什么查、查到什么程度、为什么停」交代清楚，
             条目只是附在后面——不然又是「一个人在说话 + 一台收银机打小票」。 */
          const head = value.recall
            ? `记忆调用 · ${value.recall.stop_reason} · ${value.recall.budget_used.steps}/${value.recall.budget_used.max} 步 · 覆盖 ${value.recall.gap.covered}${value.recall.gap.missing.length ? ` · 仍缺「${value.recall.gap.missing.join('/')}」` : ''} · ${value.items.length} 条`
            : `${value.items.length} 条${value.query ? ` · 查「${value.query}」` : ''}`;
          const body = value.items
            .map((it) => `· ${it.mid || it.stamp || it.ts || ''} ${String(it.text || it.title || '').replace(/\s+/g, ' ').slice(0, 90)}`)
            .join('\n');
          return [{ type: 'text', text: body ? `${head}\n${body}` : head }];
        }
        if (Array.isArray(value.topics)) {
          return [{ type: 'text', text: value.topics.length ? `${value.topics.length} 个主题 · ${value.topics.map((x) => x.topic || x).slice(0, 8).join(' / ')}` : '暂无主题' }];
        }
        const row = value.result || value.record || {};
        const bits = [
          value.queued ? '已入队' : '已写',
          row.ring || (RINGS.includes(row.kind) ? row.kind : '') || '',
          row.stamp || '',
          row.task || '',
          typeof row.importance === 'number' ? `权重 ${row.importance}` : '',
          row.status ? `· ${row.status}` : '',
        ].filter(Boolean);
        return [{ type: 'text', text: `✓ ${bits.join(' · ')}` }];
      } catch {
        return [{ type: 'text', text: JSON.stringify(value, null, 2) }];
      }
    },
  },
};

/* 检索结果里到底捞到几条：各种返回形状都要认，认不出就返回 null（不写假的 0）。
   2026-11-01 修：原来只认 count / total / hits，而 recent 返回的是 { ok, items }，
   于是「查到 1 条」被记成「条数未取到、命中 0」——三问第 3 问因此永远显示没查到东西。 */
export function countOfLookupResult(result) {
  if (!result || typeof result !== 'object') return null;
  const direct = result.count ?? result.total ?? result.hitsCount;
  if (Number.isFinite(Number(direct))) return Number(direct);
  for (const key of ['hits', 'items', 'records', 'rows', 'groups', 'topics', 'matches']) {
    if (Array.isArray(result[key])) return result[key].length;
  }
  return null;
}

/* ── 工具拆分（2026-11-01，第二刀）────────────────────────────────
   第一刀把 35 参数拆成「写 / 查」，写仍是 32 参：因为一个 append 兼着
   条目 / 执行 / 裁定三种行。这一刀按「行的种类」再切，每个工具只带本域字段：

     note     append   perception / memory / persona / feedback
     exec     append   execution / verify
     decide   append   decision
     maintain confront / candidate / promote / fuse / refine / consolidate
     read     search / recent / topics / recall

   同时修掉同类旧 bug：kind=verify 需要的 ref / used / score / evidence 从来
   不在 schema 里，kind=capture 需要的 tone / ringItems 也不在——这两个 kind
   在 enum 里挂着，实际永远调不通。现在 verify 补齐并放进 exec；capture 是
   入口自动捕捉用的内部类型，不对模型暴露（各工具 kind 枚举里都没有它）。
   定义放模块层，是为了能被 __test 直接断言，不靠重启猜。 */
const MEMORY_TOOL_ACTIONS = {
  note: ['append'],
  exec: ['append'],
  decide: ['append'],
  maintain: ['confront', 'candidate', 'promote', 'fuse', 'refine', 'consolidate'],
  read: ['search', 'recent', 'topics', 'recall'],
};
const MEMORY_TOOL_KINDS = {
  note: ['perception', 'memory', 'persona', 'feedback'],
  exec: ['execution', 'verify'],
  decide: ['decision'],
  maintain: [],
  read: [],
};
const MEMORY_TOOL_KEYS = {
  note: ['action', 'kind', 'text', 'task', 'topic', 'kindTag', 'area', 'tags', 'permanence',
    'explicit', 'emotion', 'value', 'affectsPersona', 'alignment', 'force'],
  exec: ['action', 'kind', 'text', 'title', 'method', 'data', 'task', 'ref', 'used', 'score', 'evidence'],
  decide: ['action', 'kind', 'title', 'text', 'task', 'trigger', 'signal', 'object', 'until',
    'dominant', 'shares', 'reason', 'work', 'memory', 'topic'],
  maintain: ['action', 'raw', 'filtered', 'mode', 'members', 'kept', 'text', 'ref',
    'relation', 'evidence', 'task', 'topic', 'key', 'index', 'force'],
  read: ['action', 'task', 'query', 'limit', 'budget', 'topic'],
};
/* verify / candidate / refine 用到的字段原来在基础 schema 里根本没有，这里补上 */
const EXTRA_PROPS = {
  ref: { type: 'string', description: 'verify/promote：被回验或被晋升条目的 key' },
  used: { type: 'boolean', description: 'verify：这条是否真的被用上' },
  score: { type: 'number', description: 'verify：命中分数' },
  evidence: { type: 'array', items: { type: 'string' }, description: 'verify/candidate：证据（最多 8 条）' },
  relation: { type: 'string', enum: ['support', 'counter', 'scope', 'stale', 'unverified'], description: 'candidate：与已有记忆的关系' },
  key: { type: 'string', description: 'refine：簇键' },
  index: { type: 'number', description: 'refine：用序号选簇' },
};
export function memoryToolSchema(name) {
  /* 传 'note' 或 'bluetide_memory_note' 都认：调用方一个是表键、一个是工具名，
     只认一种就会出现「字段全被跳过、schema 变空」却不报错的情况。 */
  const key = String(name || '').replace(/^bluetide_memory_?/, '') || String(name || '');
  const actions = MEMORY_TOOL_ACTIONS[key] || [];
  const kinds = MEMORY_TOOL_KINDS[key] || [];
  const keys = MEMORY_TOOL_KEYS[key] || [];
  const source = { ...MEMORY_TOOL.parameters.properties, ...EXTRA_PROPS };
  const properties = {};
  for (const prop of keys) {
    const spec = source[prop];
    if (!spec) continue;
    if (prop === 'action') properties[prop] = { ...spec, enum: actions };
    else if (prop === 'kind' && kinds.length) properties[prop] = { ...spec, enum: kinds };
    else properties[prop] = spec;
  }
  return { ...MEMORY_TOOL.parameters, properties };
}
export const MEMORY_TOOL_SPLIT = [
  {
    name: 'bluetide_memory_note',
    actions: MEMORY_TOOL_ACTIONS.note,
    description: '记一条。append 一条条目，带 topic 与 kindTag；area 选 work/daily。importance 太低会被跳过（force 可强制）。',
  },
  {
    name: 'bluetide_memory_exec',
    actions: MEMORY_TOOL_ACTIONS.exec,
    description: '记产出与回验。kind=execution 写执行记录（title/text/method/data）；kind=verify 回验某条（ref + used/score/evidence）。',
  },
  {
    name: 'bluetide_memory_decide',
    actions: MEMORY_TOOL_ACTIONS.decide,
    description: '记裁定。kind=decision 必须带 shares（三项占比，和 > 0）。',
  },
  {
    name: 'bluetide_memory_maintain',
    actions: MEMORY_TOOL_ACTIONS.maintain,
    description: '维护。confront 对照原文；candidate/promote 候选与晋升；fuse/refine/consolidate 整理融合。',
  },
  {
    name: 'bluetide_memory_read',
    actions: MEMORY_TOOL_ACTIONS.read,
    description: '检索（只读，不写盘）。search/recent/topics 直接取；recall 多步检索。',
  },
];
/* 记账只认这些名字；改名漏一个，三环占比会静默变 0 */
const MEMORY_TOOL_NAMES = new Set([
  'bluetide_memory', 'bluetide_memory_write', ...MEMORY_TOOL_SPLIT.map((tool) => tool.name),
]);

/* 水印守护（109）：发布产物必须带水印，且与 bluetide-build.json 的 watermark 一致。
   源码态（build 里没有 watermark 字段）放行 —— 本地开发用的就是源码目录。
   产物态（有 watermark 字段）强校验：标记缺失或被改 → 拒绝启用。 */
function watermarkCheck() {
  try {
    const buildPath = join(SELF_DIR, 'bluetide-build.json');
    const selfPath = join(SELF_DIR, 'index.js');
    const self = readFileSync(selfPath, 'utf8');
    /* 只认「真的注入过」的赋值语句，不认校验函数里的正则字面量 —— 源码里必然出现
       /__btw_mark__\\s*=\\s*"/ 这样的字样，用宽的匹配会把开发者版误判成产物。 */
    const hasMark = /var\s+__btw_mark__\s*=\s*"/.test(self);
    /* 防「删档绕过」（2026-11-07）：没有构建记录时，先看自己身上有没有水印标记。
       有标记却没有档案 → 档案被删，判不合格；两者都没有才是真源码态。
       本地开发目录没有标记，所以这条不影响开发者版。 */
    if (!existsSync(buildPath)) {
      if (hasMark) return { ok: false, mode: 'dist', reason: '有水印标记却缺构建记录（档案被删）' };
      return { ok: true, mode: 'source', reason: '无构建记录' };
    }
    const build = JSON.parse(readFileSync(buildPath, 'utf8'));
    const expected = build && build.watermark;
    if (!expected) {
      if (hasMark) return { ok: false, mode: 'dist', reason: '有水印标记却无 watermark 字段' };
      return { ok: true, mode: 'source', reason: '源码态' };
    }
    const hit = self.match(/__btw_mark__\s*=\s*"([^"]+)"/);
    if (!hit) return { ok: false, mode: 'dist', reason: '找不到水印标记' };
    if (hit[1] !== expected) return { ok: false, mode: 'dist', reason: '水印与构建记录不一致' };
    /* 互锁（2026-11-07）：使用声明与水印互相绑定。
       声明缺失、被换成别的字样、或只改一个字 → 与 noticeDigest 不符 → 不启用。
       反向同理：只删声明不动水印，也过不了这一关。 */
    const notice = self.match(/__btw_notice__\s*=\s*"((?:[^"\\]|\\.)*)"/);
    if (!notice) return { ok: false, mode: 'dist', reason: '找不到使用声明' };
    /* 2026-11-09：公开版改 GPL-3.0，这里的关键字样必须跟着换 ——
       否则运行时会认定「声明被替换」，直接拒绝启用。 */
    if (!notice[1].includes('GPL-3.0')) return { ok: false, mode: 'dist', reason: '使用声明被替换' };
    const wantNoticeDigest = build && build.noticeDigest;
    if (!wantNoticeDigest) return { ok: false, mode: 'dist', reason: '构建记录缺声明摘要' };
    const noticeHash = createHash('sha256').update(notice[1]).digest('hex').slice(0, 16);
    if (noticeHash !== wantNoticeDigest) return { ok: false, mode: 'dist', reason: '使用声明与构建记录不一致' };
    return { ok: true, mode: 'dist', reason: hit[1] };
  } catch (e) {
    return { ok: false, mode: 'dist', reason: `校验异常：${e && e.message}` };
  }
}

function integrityCheck() {
  try {
    const buildPath = join(SELF_DIR, 'bluetide-build.json');
    if (!existsSync(buildPath)) return { ok: true, reason: '' };
    const build = JSON.parse(readFileSync(buildPath, 'utf8'));
    const expect = build && build.integrity && build.integrity.files;
    if (!expect) return { ok: true, reason: '' };
    const keys = Object.keys(expect);
    if (!keys.length) return { ok: true, reason: '' };
    for (const rel of keys) {
      const p = join(SELF_DIR, rel);
      if (!existsSync(p)) return { ok: false, reason: `缺少 ${rel}` };
      const h = createHash('sha256').update(readFileSync(p)).digest('hex');
      if (h !== expect[rel]) return { ok: false, reason: `文件被改 ${rel}` };
    }
    return { ok: true, reason: '' };
  } catch (e) {
    return { ok: false, reason: `校验异常：${e && e.message}` };
  }
}

export function apply(ctx, config = {}) {
  const mark = watermarkCheck();
  if (!mark.ok) {
    console.error(`[bluetide-rings] 水印校验失败：${mark.reason}；插件不启用。`);
    return;
  }
  const intact = integrityCheck();
  if (!intact.ok) {
    console.error(`[bluetide-rings] 完整性校验失败：${intact.reason}；插件不启用。`);
    return;
  }
  const boot = bootstrapLayout(config);
  /* 先预热中文任务名：写工单时就能拿到，别等首次读快照 */
  void loadTaskNames(boot.layout && boot.layout.tasks).catch(() => {});
  const root = boot.personaRoot;
  const areas = boot.areas;
  activeWorkspace = (boot.layout && boot.layout.workspace) || join(root, '..', '..');
  activeLayoutMeta = {
    source: boot.source,
    workspace: activeWorkspace,
    version: boot.layout ? boot.layout.version : null,
    createdAt: boot.layout ? boot.layout.createdAt : null,
    areas: boot.areas || null,
    tasks: boot.layout ? boot.layout.tasks : null,
    materials: boot.layout ? boot.layout.materials : null,
    images: boot.layout ? boot.layout.images : null,
    problems: boot.problems || [],
  };
  void ensureBaseline(root).catch(() => {});
  void sweepWork(root, areas).catch(() => {});
  /* 087 起：待选槽不再 24h 删除。条目由 computeStats 的状态机降档：满 24h 未证明 → 冷却（×0.3），
     满 3 档 → 归档，冷却期内被验对 → 复活。这里只保留 sweepWork（工单过期），不再写 drop。 */

  const writer = createWriter(root, areas);
  /* 本轮收尾行（turn / gate / taskstats / miss）：先攒着，等延迟入账刷完再交给 writer，
     否则「本轮结果行」会排在「本轮收尾行」后面，账目顺序倒挂。 */
  const turnRows = [];
  /* ── 结算状态（2026-10-28）────────────────────────────────────
     对账不再是「丢出去就不管」：任务攒在这里，收尾时统一 await，
     对账行与工单同批落盘；对账不通过还要回头改这一轮的 gate 行。 */
  const settleTasks = [];
  let settleContext = null;
  let settleIntent = '';
  let settleLineText = '';
  /* 收尾串行化：turn-stopping / 定时兜底 / session-event 都可能触发同一次收尾，
     不挡住会同一轮写两张判断卡（2026-10-28 实盘 11 毫秒内两张）。 */
  let finalizeBusy = false;
  let finalizeAt = 0;
  /* 对账的时间窗起点：本轮用户说话时刻（含 2 秒余量）；拿不到就退回 15 分钟 */
  const settleSince = () => (lastUserTextAt ? lastUserTextAt - 2000 : Date.now() - 15 * 60 * 1000);
  /* 重启兜底：判断卡在磁盘上，进程内那份重启就没了。
     启动时读一次最近的 packet，把「上一轮结算」接回来，别让注入段在重启后消失。 */
  try {
    const latest = readLastPacketSync(root, areas);
    if (latest) settleLineText = String(latest.nextInject);
  } catch {
    /* 读不到就等本轮结算再补 */
  }
  /* 情绪状态：有半衰，跨轮累积；只影响语气与优先级，不碰结论。
     075 起按会话分桶：全局一份会被别的会话的话顶掉（实测调子被换）。 */
  const affectBySession = new Map();
  const affectOfSession = (session) => {
    const key = sidOf(session);
    let state = affectBySession.get(key);
    if (!state) {
      state = { valence: 0, arousal: 0, label: null, at: 0 };
      affectBySession.set(key, state);
      if (affectBySession.size > 64) affectBySession.delete(affectBySession.keys().next().value);
    }
    return state;
  };
  /* 本能槽：进程启动读一次，之后每轮算一次；只在触发/过期时落盘 */
  let instinctState = instinctLoad(INSTINCT_FILE);
  const lastConfrontAt = new Map();
  const toolCalls = new Map();
  /* 本轮信号：非记忆工具次数、记忆检索次数、各环写入条目数、裁定数（用于自动占比） */
  const turnSignals = new Map();
  /* 每个会话当前的任务名：代号只是别名，真名要留在这，别让代号把名字顶掉 */
  const taskNameById = new Map();
  const writtenTurns = new Set();
  /* 回验：本轮写过的环条目（收尾时拿去和输出比），以及最近一次 assistant 文本 */
  liveState.lastOutput = '';
  const debug = { toolEvents: 0, sessionEvents: 0, turnStops: 0, turnsWritten: 0 };
  let lastAudit = null;

  /* 统计每个会话本轮的工具调用次数：用来判别「任务 / 闲聊」，并给自动占比攒信号 */
  ctx.on('tools/result', (exec) => {
    try {
      debug.toolEvents += 1;
      const id = exec?.agent?.id;
      if (!id) return;
      toolCalls.set(id, (toolCalls.get(id) || 0) + 1);
      /* 心跳：有工具在动说明这一轮还没完；忙不忙由 agent/status 定 */
      liveState.at = Date.now();
      const name = String(exec?.name || '');
      const args = exec?.arguments && typeof exec.arguments === 'object' ? exec.arguments : {};
      const signals = turnSignals.get(id) || { tools: 0, lookups: 0, appends: {}, decisions: 0, byTask: {} };
      if (!signals.byTask) signals.byTask = {};
      /* 内源情绪的客观信号（2026-11-01）：只看事实，不解析我的自然语言。
         failed  = 这个工具失败了（执行 error 或 result.ok === false）
         verified = 跑了一次验证（语法检查 / 测试脚本 / 打包自检）
         拿不到就留空，绝不用猜的补——猜出来的「兑现」会让内源情绪失真。 */
      /* 2026-11-01：原来还有一条 `exec.result.ok === false`，但事件里根本没有 result，
         那条永远不成立，已删。工具自身失败仍由 exec.error 反映。 */
      const failedNow = Boolean(exec?.error);
      if (failedNow) signals.failed = (Number(signals.failed) || 0) + 1;
      const cmdText = String(args.command || args.cmd || '');
      if (cmdText && /node\s+--check|\-test\.mjs|\.test\.mjs|npm\s+(test|pack)|verify/i.test(cmdText)) {
        signals.verified = (Number(signals.verified) || 0) + 1;
      }
      /* 承诺口径（2026-11-01 修）：只有「写」才算承诺，查/读/搜一律不算。
         第一版拿「动过工具」当承诺，实测一轮只查了个文件，就被记成
         「说完成但没验证——不算兑现」扣掉 0.05，当天情绪值就失真了。
         承诺的本质是「我说了要改什么」，不是「我碰了工具」。 */
      const WRITE_TOOLS = new Set(['write', 'edit', 'apply_patch']);
      const isWriteTool = WRITE_TOOLS.has(name)
        || (name === 'pwsh' && /Set-Content|Out-File|Copy-Item|Move-Item|New-Item|Remove-Item|npm\s+(pack|install)|git\s+(add|commit|push)/i.test(cmdText));
      if (isWriteTool) signals.wrote = (Number(signals.wrote) || 0) + 1;
      /* 本轮真正碰过的任务：统计只认它，不认全局 lastTaskSeen（否则会挂到上一个任务上）。
         代号（#4EA）只当别名：它进不了任务身份。否则「代号 → 再哈希成新代号 → 又当一个新任务」
         会一轮生一个假任务，占比窗口塌成「最近三轮」（2026-10-28 实证：taskCode('#906')='4EA'）。 */
      if (typeof args.task === 'string' && args.task.trim()) {
        const given = args.task.trim();
        const known = taskNameById.get(id);
        /* 身份只有一个来源：isTaskIdentity。裸代号（#ABC / ABC / 086）永远不当身份；
           本轮没带身份、也继承不到已知身份时，宁可记成「未记名」，也不拿代号顶替。 */
        const taskName = isTaskIdentity(given, null) ? given : (isTaskIdentity(known, null) ? known : null);
        if (taskName) taskNameById.set(id, taskName);
        if (taskNameById.size > 64) taskNameById.delete(taskNameById.keys().next().value);
        if (taskName) {
          lastTaskSeen.task = taskName;
          lastTaskSeen.at = Date.now();
          signals.task = taskName;
        } else {
          lastTaskSeen.at = Date.now();
        }
      }
      /* 工具没带任务号时归到「本轮当前任务」；一轮里换了任务号就各记各的，不合并到最后一个 */
      const taskKey = signals.task || null;
      const bucket = taskKey
        ? (signals.byTask[taskKey] || (signals.byTask[taskKey] = { tools: 0, lookups: 0, appends: {}, decisions: 0, executions: 0 }))
        : null;
      /* 2026-11-01 拆成多个工具后，这里改成按名字集合判定：
         只认旧名会让整段记账静默失效——三环占比会变成 0，而没有任何报错。 */
      if (MEMORY_TOOL_NAMES.has(name)) {
        /* 先取 action 和返回值，再判失败——顺序反了会踩 TDZ：
           const 声明在使用之后 = ReferenceError，被外层 try/catch 吞掉，
           整段记账静默失效（2026-11-01 实测就是这么坏掉的，静态检查抓不到）。 */
        const action = String(args.action || '');
        /* 事件里拿不到返回值（见 execute 处注释），从 lastMemoryOutcome 取，
           按 action 配对，避免把上一次调用的结果算到这一次头上。 */
        const outcome = lastMemoryOutcome && lastMemoryOutcome.action === action ? lastMemoryOutcome.value : null;
        /* 只有真的写成功才记账：工具被 checkCapture 拒收、参数不合法时，
           以前照样给三环加 1，于是「写了 3 条」其实是「试了 3 次」。 */
        const failed = Boolean(outcome && typeof outcome === 'object' && outcome.ok === false);
        if (failed) {
          turnSignals.set(id, signals);
          return;
        }
        if (action === 'append' || action === 'consolidate') {
          const kind = action === 'consolidate' ? 'memory' : String(args.kind || '');
          if (MIX_TRACKED.includes(kind)) {
            signals.appends[kind] = (signals.appends[kind] || 0) + 1;
            if (bucket) bucket.appends[kind] = (bucket.appends[kind] || 0) + 1;
          }
          if (kind === 'decision') {
            signals.decisions += 1;
            if (bucket) bucket.decisions += 1;
          }
          if (kind === 'execution') {
            signals.executions = (signals.executions || 0) + 1;
            if (bucket) bucket.executions = (bucket.executions || 0) + 1;
          }
          /* 记忆下线用的一对计数（2026-10-28 你定）：
               候选槽 = 还没升格的条目。**工具回执里就是 pending:true**，不叫 status；
               临时区 = 落在 work 区（任务结束 +24h 清）的条目。
             2026-10-28 修：原来只认 {result}/{record} 形状、只认 status='pending'，
             而捕捉路径实际返回 { ok, capture, pending } —— 两个条件全落空，计数恒为 0。 */
          const raw = outcome && typeof outcome === 'object' ? outcome : null;
          const landed = raw ? (raw.result || raw.record || raw.capture || (raw.type === 'entry' ? raw : null)) : null;
          const isPending = Boolean(raw && (raw.pending === true || raw.candidate === true))
            || String(landed && landed.status) === 'pending';
          if (isPending) signals.slots = (signals.slots || 0) + 1;
          if (landed) {
            let landedArea = null;
            try { landedArea = areaOfRow(landed); } catch { landedArea = null; }
            if (landedArea === 'work') signals.temps = (signals.temps || 0) + 1;
          }
        } else if (action === 'search' || action === 'recent' || action === 'topics' || action === 'confront' || action === 'recall') {
          signals.lookups += 1;
          if (bucket) bucket.lookups += 1;
          /* 三问的第 3 问只认这个：真调了才算查过，没调就是没查。
             取不到条数就记 null——**不写假的 0**。
             2026-11-01 修：条数链原来只认 count / total / hits，而 recent 返回的是
             { ok, items }，于是「查到了 1 条」被记成「条数未取到、命中 0」。
             现在集中到 countOfLookupResult，各种返回形状都能认，且能被断言。 */
          const hits = countOfLookupResult(outcome);
          /* 记忆区命中：检索捞出来的条目数进 memHits。
             条数拿不到（null）时按 1 记 —— 查了却被算成「没动作」，比虚报更错。 */
          signals.memLooked = (signals.memLooked || 0) + 1;
          signals.memHits = (signals.memHits || 0) + (hits === null ? 1 : Math.max(0, hits));
          lastLookup = {
            at: Date.now(), kind: action,
            query: String(args.query || args.topic || args.task || '').slice(0, 24),
            hits,
          };
        }
      } else {
        signals.tools += 1;
        if (bucket) bucket.tools += 1;
      }
      turnSignals.set(id, signals);
      /* 面板要能看见「这一轮到底记了什么」：计数之外再给一份折算后的单位 */
      setEngineTurn(
        {
          tools: Number(signals.tools) || 0,
          lookups: Number(signals.lookups) || 0,
          appends: { ...signals.appends },
          decisions: Number(signals.decisions) || 0,
          chars: null,
        },
        autoMix(signals, 0),
      );
    } catch (error) {
      /* 2026-11-01：以前这里是空 catch。今天两次静默失效（TDZ、作用域）都栽在它手里：
         记账坏了、三环占比归 0，界面上一点痕迹都没有。计数失败确实不该影响主链路，
         但**必须留下痕迹**——所以在 debug 与 liveState 里各记一笔，面板能看见。 */
      debug.toolHandlerErrors = (Number(debug.toolHandlerErrors) || 0) + 1;
      debug.toolHandlerLastError = String((error && error.message) || error);
      liveState.toolHandlerError = debug.toolHandlerLastError;
    }
  });

  /* 一轮收尾：判别任务/闲聊并落一条 turn 行（同一轮只写一次） */
  function recordTurn(agentId, turn, session) {
    const key = `${agentId}:${turn}`;
    if (writtenTurns.has(key)) return false;
    writtenTurns.add(key);
    /* 长会话别让去重集合无限长：只用来挡同一轮的重复收尾，清空不会漏写 */
    if (writtenTurns.size > 2000) writtenTurns.clear();
    const tools = toolCalls.get(agentId) || 0;
    toolCalls.set(agentId, 0);
    const signals = turnSignals.get(agentId) || { tools: 0, lookups: 0, appends: {}, decisions: 0 };
    turnSignals.delete(agentId);
    /* 内源情绪（2026-11-01）：这一轮**我**干了什么，比他说了什么更该影响我的状态。
       承诺只认「写」——查文件、读内容、搜索不算承诺（第一版按「动过工具」算，
       结果查一次文件就被记成「说完成但没验证」扣了 0.05，当天就失真）。
       有写操作才有承诺；有工具失败=没兑现；跑过验证=有证明。
       这三样都拿不到的轮次直接跳过 —— 不凭空给自己记情绪。 */
    try {
      const didWork = Number(signals.wrote) > 0;
      if (didWork) {
        const failed = Number(signals.failed) || 0;
        const verified = Number(signals.verified) || 0;
        const nextInterior = interiorTick(readInteriorState(), {
          promised: true,
          delivered: failed > 0 ? false : true,
          verified: verified > 0,
        });
        writeInteriorState(nextInterior);
        liveState.interior = interiorAffect(nextInterior);
      }
    } catch (err) {
      liveState.interiorError = String((err && err.message) || err);
    }
    let excerpt = '';
    let chars = 0;
    /* 本轮用户原话留着，后面要拿去和经验区比对（命中数进感知分子） */
    let turnTexts = [];
    try {
      if (session) {
        const texts = userTextsInTurn(session, turn).texts;
        turnTexts = texts;
        /* 摘要压到 24 字：面板占比图一行放得下，摘要也更好读 */
        excerpt = squeeze(texts[0] || '', 24);
        chars = texts.join('\n').length;
      }
    } catch {
      excerpt = '';
      chars = 0;
    }
    /* 判断卡的「听了什么」格：本轮用户原话（机械截取，不加工）。
       会话拿不到时退回最近 2 分钟内捕捉到的用户原话——宁可标注来源，也不留空。 */
    settleIntent = excerpt || (Date.now() - lastUserTextAt < 120000 ? lastUserText : '');
    /* 本轮系统提示里带了四区摘要（bluetide:memory 段），装配一次就算一次记忆使用 */
    if (ready && digest) signals.digest = 1;
    /* 口径 V3（2026-10-28 你定）：三环占比必须三环都有值，任何一环都不允许是 0。
       理由：每一轮必然发生三类事件——感知＝收到用户输入、记忆＝注入四区摘要、人格＝做入口判定；
       只统计「显式写入」会让占比退化成单环 100%，那不是权重，是分母缺失。
       基数就在这里给足，且宿主写入（appendRow 捕捉）与工具写入走同一份 signals（一本账）。 */
    const turnSt0 = turnStateOf(sidOf(session));
    const capturedNow = Number(turnSt0.captured) || 0;
    /* v4：先把「用户侧写入」抄下来（含分环数），再让基数并进来 —— 总事件数不能被基数带偏 */
    const userAppendsByRing = {
      perception: Number(signals.appends && signals.appends.perception) || 0,
      memory: Number(signals.appends && signals.appends.memory) || 0,
      persona: Number(signals.appends && signals.appends.persona) || 0,
    };
    const userAppends = userAppendsByRing.perception + userAppendsByRing.memory + userAppendsByRing.persona;
    const baseAppends = { perception: Math.max(1, capturedNow), memory: 1, persona: 1 };
    signals.appends = signals.appends || {};
    for (const [ring, n] of Object.entries(baseAppends)) {
      signals.appends[ring] = (Number(signals.appends[ring]) || 0) + n;
    }
    /* 基数只记给「本轮真的碰到的任务」（byTask 里已有的桶），
       不按 lastTaskSeen 硬塞：否则只读轮次也会给上轮任务追加统计行。 */
    for (const tk of Object.keys(signals.byTask || {})) {
      const baseBucket = signals.byTask[tk];
      baseBucket.appends = baseBucket.appends || {};
      for (const [ring, n] of Object.entries(baseAppends)) {
        baseBucket.appends[ring] = (Number(baseBucket.appends[ring]) || 0) + n;
      }
    }
    /* ── 占比 v4：总事件 → 经验命中 → 情绪 → 本能槽 → 三环取值 ──────────
       总事件按设计文档那五类来数，一件算一件、不数篇幅：
         用户消息 1 + 工具调用 + 三环写入 + 检索 + 判断
       摘要装配与入口判定**不**进事件：那是 v3 的「必然基数」，v4 已经不用它撑分母了。
       没有事件（既没说话也没动手）→ events=0 → 返回 null → 退回 autoMix，
       不拿一个凭空的分母造占比。 */
    const inputEvent = turnTexts.length > 0 || capturedNow > 0 ? 1 : 0;
    const events = inputEvent
      + (Number(signals.tools) || 0)
      + (Number(signals.lookups) || 0)
      + (Number(signals.decisions) || 0)
      + userAppends;
    let hits = 0;
    try {
      if (turnTexts.length) hits = matchExperience(root, turnTexts.join('\n'));
    } catch {
      hits = 0; /* 经验区读不到就当没命中：不影响任何写入，只是感知分子按 1 记 */
    }
    const affectNow = decayAffect(affectOfSession(sidOf(session)), Date.now());
    const prevInstinct = instinctState;
    instinctState = instinctTick(prevInstinct, affectNow.valence, affectNow.arousal);
    if (instinctState.slot !== (Number(prevInstinct.slot) || 0) || instinctState.lastAt !== (Number(prevInstinct.lastAt) || 0)) {
      instinctSave(INSTINCT_FILE, instinctState);
    }
    /* ── 三环占比：单芯片（2026-11-09）──────────────────────────────
       095 定过：v5 是 v4 的替换升级，不是并列项 —— 两者产出的都是
       「三环占比 + 耦合偏置 + 面板数字」。所以这里只跑一块：
       开关关就 v4、开就 v5，不再让 v4 无条件算一遍、v5 在旁边另算一遍。 */
    /* 读状态必须自带护栏：这个函数在桩环境/热重载窗口里可能抛错，
       一旦抛到外面，整段收尾就断在这里（verify-judge 实测 turns=0）。
       原来它包在 try 里；改成单芯片后不能因为换写法就把这层保护丢掉。 */
    let rwState = {};
    try { rwState = readPluginStateSync() || {}; } catch { rwState = {}; }
    const chipName = (rwState.ringWeightV5 === true && CHIP_NAMES.includes('v5')) ? 'v5' : 'v4';
    /* 099：v5 关着时检索偏置必须是空，不能沿用上一轮的残值 */
    retrievalCtx.b = null;
    /* v5 芯片本轮用到的「上轮均值」要在落盘改它之前留一份：
       turn 行要靠它复算，事后读 rwState 已经是下一轮的均值了。 */
    const avgInForChip = rwState.ringWeightAvg || null;
    /* 人格强度是**输入信号**，不是 v4 的产物：
       这样换芯片时 v5 不必反过来吃 v4 算出来的 units，两块芯片才能真的独立。 */
    const moodForChip = moodFactor(affectNow.valence);
    const moodPartForChip = Math.min(1, Math.max(0, moodForChip / RATIO.moodMax));
    const instinctSpanForChip = RATIO.instinctStep * RATIO.instinctCap;
    const instinctPartForChip = instinctSpanForChip > 0
      ? Math.min(1, (RATIO.instinctStep * (Number(instinctState.slot) || 0)) / instinctSpanForChip)
      : 0;
    const personaUnitsForChip = Math.min(1, Math.max(0, 0.5 * moodPartForChip + 0.5 * instinctPartForChip));

    let mix = pickShares({
      events,
      hits,
      /* 记忆环捕捉条目数：就是本轮写进记忆环的条目数（用户侧写入，不含基数） */
      memCaptured: userAppendsByRing.memory,
      /* 记忆区命中：本轮检索捞出来的长期记忆条目数（在用/冷却/归档都算） */
      memHits: Number(signals.memHits) || 0,
      /* 记忆下线：本轮进候选槽 / 进临时区的条目数 */
      slots: Number(signals.slots) || 0,
      temps: Number(signals.temps) || 0,
      valence: affectNow.valence,
      slot: instinctState.slot,
      chars,
      personaUnits: personaUnitsForChip,
      avg: avgInForChip || undefined,
      sigma2: rwState.ringWeightSigma2 || undefined,
    }, { formula: chipName });

    /* 本轮没有任何事件时芯片给全 0；旧行为是用 autoMix 那套按写入次数兜底。
       TODO（下一处要清的新旧混用）：把 autoMix 收进 v4 芯片内部。
       这里先保留外层兜底，避免这一步同时改两件事。 */
    if (!(mix.units && MIX_TRACKED.some((key) => Number(mix.units[key]) > 0))) {
      const fallback = autoMix(signals, chars);
      if (fallback) mix = { ...fallback, source: chipName, audit: { ...mix.audit, via: 'autoMix' } };
    }

    /* Flash：没有 v5 芯片，就没有「v5 额外观测」这一块 */
    /* 人格 → 情绪 的反向控制（负反馈，2026-10-28 你定）：
       本轮人格强度超阈值就压一次情绪；压完下一轮 moodFactor 自然回落，不会自激。 */
    let affectDamp = 0;
    if (mix) {
      const affectState = affectOfSession(sidOf(session));
      /* 芯片化后 units 可能为 null（v5 直接用权重当 units）；
         算不出就用本轮算好的 personaUnits，别让负反馈因为换芯片而停摆。 */
      const personaUnitsForDamp = (mix.units && Number.isFinite(Number(mix.units.persona)))
        ? Number(mix.units.persona)
        : personaUnitsForChip;
      const damped = dampAffect(affectState, personaUnitsForDamp);
      if (damped.damp > 0) {
        affectState.valence = damped.valence;
        affectState.arousal = damped.arousal;
        affectState.damped = damped.damp;
        affectDamp = damped.damp;
      }
    }
    /* 收尾时把「本轮最终计数」记进引擎视图：面板一眼能看到这轮记了什么、折成多少单位 */
    setEngineTurn(
      {
        tools: Number(signals.tools) || 0,
        lookups: Number(signals.lookups) || 0,
        appends: { ...signals.appends },
        decisions: Number(signals.decisions) || 0,
        chars,
      },
      mix,
    );
    /* 一轮里可能有多个任务号：按任务各算一份单位。
       字数和摘要只算给主任务（单位最多的那个），其余按各自工具/检索/写入归属。 */
    const tasks = Object.entries(signals.byTask || {}).map(([task, bucket]) => ({
      task,
      tools: Number(bucket.tools) || 0,
      units: {
        perception: Number((bucket.appends && bucket.appends.perception) || 0),
        memory: (Number(bucket.lookups) || 0) * MIX_UNITS.lookup + Number((bucket.appends && bucket.appends.memory) || 0),
        /* 075 口径 V2：人格单位只记「判断」，不再把工具次数折进来——
           工具调得多 ≠ 人格在起作用（旧口径下任何动手多的任务都显示「人格主导 83%」）。 */
        persona: Number((bucket.appends && bucket.appends.persona) || 0) + (Number(bucket.decisions) || 0) * MIX_UNITS.decision,
      },
    }));
    /* 2026-11-01 修（#097）：read / pwsh / edit / grep 的参数里没有 task，
       它们只进 signals.tools 计数、进不了任何任务桶（见下面那段注释）。
       于是「一整轮都在读代码、跑命令」时 byTask 恒为空 → tasks=[] →
       writeTaskStats 的第一道闸（!info.tasks.length）直接 return null，面板停在旧账上，
       而且不报错：12:32 之后 40 行 turn+gate、零 taskstats，就是这么来的。
       回退：本轮一个任务桶都没有、但确实动过手时，把工具归给最近确认过的任务身份。
       lastTaskSeen.task 只在 isTaskIdentity 通过时才写入（见 tools/result），是可信身份。 */
    if (!tasks.length && Number(signals.tools) > 0) {
      const fallbackTask = signals.task || (lastTaskSeen && lastTaskSeen.task) || null;
      if (fallbackTask) {
        tasks.push({
          task: fallbackTask,
          tools: Number(signals.tools) || 0,
          units: { perception: 0, memory: 0, persona: 0 },
        });
      }
    }
    if (tasks.length) {
      const sumOf = (item) => item.units.perception + item.units.memory + item.units.persona;
      const primary = tasks.reduce((best, item) => (sumOf(item) >= sumOf(best) ? item : best), tasks[0]);
      /* 字数不再折成感知单位（2026-10-28 口径：篇幅与占比无关） */
      /* 摘要不再折成记忆单位：它只保证本轮有 shares 可写，不再影响谁主导（见 autoMix 注释） */
      /* 没带任务号的工具（read / pwsh / edit…）只进了本轮的 tools 计数，没进任何任务桶。
         而面板「三个任务」的占比读的是 taskstats，于是人格永远是 0。
         只有在「本轮只有一个任务」时才把这些工具归给主任务——多任务混跑时归谁都是编，宁可不归。 */
      const attributed = tasks.reduce((sum, item) => sum + item.tools, 0);
      const unattributed = Math.max(0, (Number(signals.tools) || 0) - attributed);
      if (unattributed > 0 && tasks.length === 1) {
        primary.tools += unattributed;
        /* 075 起：动作量只记在 tools 上（面板单列显示），不再折成 persona 单位 */
      }
    }
    for (const item of tasks) {
      /* v4 一轮一份账：三环取值是「整轮」的量，不按任务切（切了就是编）。
         同一轮里的每个任务共用本轮占比，各自的 counts / tools 仍各算各的。 */
      item.v4 = mix;
      if (mix) {
        item.shares = { ...mix.shares };
        item.dominant = mix.dominant;
        continue;
      }
      const total = item.units.perception + item.units.memory + item.units.persona;
      item.shares = {};
      for (const key of MIX_TRACKED) item.shares[key] = total > 0 ? Number((item.units[key] / total).toFixed(3)) : 0;
      item.dominant = total > 0 ? MIX_TRACKED.reduce((best, key) => (item.units[key] > item.units[best] ? key : best), MIX_TRACKED[0]) : null;
    }
    const counts = countOf({ appends: signals.appends, lookups: signals.lookups, decisions: signals.decisions, tools: signals.tools });
    /* 口径 V3：三环次数同样恒 ≥1（感知=收到输入，记忆=注入摘要，人格=入口判定） */
    const turnSt = turnStateOf(sidOf(session));
    counts.perception = Math.max(1, counts.perception, Number(turnSt.captured) || 0);
    counts.memory = Math.max(1, counts.memory);
    counts.persona = Math.max(1, counts.persona);
    turnSt.captured = 0;
    counts.total = counts.perception + counts.memory + counts.persona;
    const kind = tools > 0 ? 'task' : 'chat';
    const turnTitle = `${tools > 0 ? '任务' : '闲聊'} · ${excerpt || '（无文字内容）'}`;
    lastTurnTitle = turnTitle;
    /* v1.15.3 召回验证（单槽台账，绝不引用 session）：
       本轮有过召回，且出口回检通过与数高于召回时基线 → 每条召回过的条目记一次验证；
       有召回但没通过 → 只写一行 verify-skip 诊断，不加任何计数。 */
    if (recallPending.refs.size > 0) {
      const passNow = totalGatePass();
      const baseline = recallPending.passAt;
      const task = lastTaskSeen.task || null;
      /* 方案④：同一 task+ref 在本进程内只写一次验证（跨重启可能重记一次，已知） */
      const refs = Array.from(recallPending.refs).filter((ref) => {
        const key = `${task || '---'}|${ref}`;
        if (recallVerified.has(key)) return false;
        recallVerified.add(key);
        if (recallVerified.size > 2000) recallVerified.clear();
        return true;
      });
      recallPending.refs = new Set();
      recallPending.passAt = 0;
      recallPending.at = 0;
      if (passNow > baseline) {
        void (async () => {
          for (const ref of refs) {
            try {
              await appendRow(root, areas, {
                v: 1, ts: nowIso(), type: 'verify', ref, used: true, method: 'lexical',
                matchKind: 'recall-use', score: 1, evidence: ['本轮出口回检通过'],
                algo: 'verify-v1', source: 'recall-use', task,
              });
              debug.recallVerifyRows = (debug.recallVerifyRows || 0) + 1;
            } catch (error) {
              debug.recallVerifyErrors = (debug.recallVerifyErrors || 0) + 1;
              debug.recallVerifyLastError = String((error && error.message) || error);
            }
          }
        })();
      } else {
        void (async () => {
          try {
            await appendRow(root, areas, {
              v: 1, ts: nowIso(), type: 'verify-skip', reason: 'gate-pass-no-increase',
              refs: refs.slice(0, 12), passAt: baseline, passNow,
              task: lastTaskSeen.task || null, algo: 'verify-v1',
            });
            debug.recallVerifySkips = (debug.recallVerifySkips || 0) + 1;
          } catch (error) {
            debug.recallVerifyErrors = (debug.recallVerifyErrors || 0) + 1;
            debug.recallVerifyLastError = String((error && error.message) || error);
          }
        })();
      }
    }
    turnRows.push({
      v: 1,
      ts: nowIso(),
      /* turn 行本身没带 task，码沿用本轮最后一次带任务号的工具调用 */
      stamp: stampOf(new Date(), lastTaskSeen.task),
      type: 'turn',
      task: null,
      kind,
      title: turnTitle,
      method: tools > 0 ? `工具 ${tools} 次` : '无工具调用',
      tools,
      chars,
      counts,
      /* 记忆环有没有被真用过：只认动作（本轮检索次数），不拿输出文本猜 */
      looked: Number(signals.lookups) || 0,
      shares: mix ? mix.shares : null,
      dominant: mix ? mix.dominant : null,
      /* v4 的算式原值：占比要能当场复算，别只留一个看起来合理的百分比。
         2026-11-09 芯片化后不再有 ratio 变量 —— 原值在芯片的 audit.raw 里；
         v5 芯片没有这一项，落 null（字段名保留，历史行照旧读得动）。 */
      /* 当轮用的是哪块芯片（v4 / v5）—— 复算断言要按它分支，别拿 v4 的尺子量 v5 的行 */
      mixChip: mix ? (mix.source || null) : null,
      /* v4 的算式原值：占比要能当场复算，别只留一个看起来合理的百分比。
         2026-11-09 芯片化后不再有 ratio 变量 —— 原值在芯片的 audit.raw 里；
         v5 芯片没有这一项，落 null（字段名保留，历史行照旧读得动）。 */
      mixV4: (mix && mix.audit && mix.audit.raw) ? mix.audit.raw : null,
      /* v5 的复算要素：q 与「本轮用到的上轮均值」，两条就够把 g 重算一遍；
         不落它们，v5 的行就是不可追溯的数字。 */
      mixV5: (mix && mix.audit && mix.audit.g) ? { q: mix.audit.q, avg: avgInForChip, g: mix.audit.g } : null,
      /* 本轮因人格过强而被压掉的情绪比例（0 = 没压）。反向控制有没有真的触发，看这个数 */
      damp: affectDamp,
      auto: true,
      hasSession: Boolean(session),
      /* 二合一：turn 行同时承载本轮产出摘要，不再另起「结果」概念 */
      merged: 'turn+result',
    });
    debug.turnsWritten += 1;
    if (pendingCapture && liveState.lastOutput) {
      const cap = pendingCapture;
      pendingCapture = null;
      const verdict = verifyCapture(cap.row, liveState.lastOutput);
      void (async () => {
        try {
          await appendRow(root, areas, {
            v: 1, ts: nowIso(), type: 'capture-verify', ref: cap.ref,
            expected: verdict.expected, actual: verdict.actual, fit: verdict.fit,
            drifted: verdict.drifted, evidence: verdict.evidence, task: cap.row.task ?? null,
          });
          debug.captureVerified = (debug.captureVerified || 0) + 1;
        } catch (error) {
          debug.captureVerifyErrors = (debug.captureVerifyErrors || 0) + 1;
        }
      })();
    }
    /* 回验（写进插件）：把本轮捕捉和「返回结果」比一遍，落 verify 行。
       没有输出文本（宿主没给 assistant 文本）或没有捕捉时静默跳过，不造假数据。
       recordTurn 不是 async，这里用异步 IIFE，错误只记计数不外抛。 */
    if (liveState.lastOutput && turnCaptured.length) {
      const output = liveState.lastOutput;
      const batch = turnCaptured.splice(0, 24);
      liveState.lastOutput = '';
      void (async () => {
        for (const item of batch) {
          try {
            const verdict = judgeVerify(item, output);
            if (!verdict.known) continue;
            await appendRow(root, areas, {
              v: 1, ts: nowIso(), type: 'verify', ring: item.ring, ref: verdict.ref,
              used: verdict.used === true, matchKind: verdict.matchKind, method: verdict.method,
              score: verdict.score, evidence: verdict.evidence ? [verdict.evidence] : [],
              algo: 'verify-v1', task: lastTaskSeen.task ?? null,
            });
            debug.verifyRows = (debug.verifyRows || 0) + 1;
          } catch (error) {
            debug.verifyErrors = (debug.verifyErrors || 0) + 1;
          }
        }
      })();
    }
    return {
      kind,
      tools,
      chars,
      /* 记忆环有没有被真用过：只认动作（本轮检索次数） */
      looked: Number(signals.lookups) || 0,
      task: signals.task ?? null,
      tasks,
      units: mix ? mix.units : null,
      shares: mix ? mix.shares : null,
      dominant: mix ? mix.dominant : null,
      /* v4：本轮算式原值（events/hits/valence/mood/slot），写进行里可复算 */
      v4: mix,
      /* 摘要不参与三环分，但「本轮确实装过摘要」这个事实要留着，统计行才不会被丢 */
      digest: signals.digest ? 1 : 0,
    };
  }

  /* 任务级统计：一轮里碰过的每个任务各写一条；闲聊不写（除非发现干了活 → 升级） */
  function writeTaskStats(info, pass, session) {
    if (!info || !Array.isArray(info.tasks) || !info.tasks.length) return null;
    const gater = gateOf(sidOf(session));
    const upgraded = gater.level === 'chat' && info.tools > 0;
    const isTask = gater.level === 'task' || upgraded;
    if (!isTask) return null;
    const rows = [];
    for (const item of info.tasks) {
      /* 2026-11-01 修：这里原来要求 item.task 非空，为空就 continue ——
         而 turn 行的 task 恰恰常常是 null（lastTaskSeen 未更新时），
         于是整轮工单静默不写，下面的回退与诊断永远到不了。
         现在只跳过「连 item 都没有」的，任务码交给下面的 taskId 回退。 */
      if (!item) continue;
      const units = (info.v4 && info.v4.units) || item.units || { perception: 0, memory: 0, persona: 0 };
      const total = MIX_TRACKED.reduce((sum, key) => sum + (Number(units[key]) || 0), 0);
      /* V2 起 persona 不再吃工具次数：只有 execution、没有三环动作的任务单位会是 0，
         但它确实动过手——不能因为它不占比例就从面板消失，所以带 tools 的照样留一行。
         摘要装配同理：不记分，但本轮确实发生过，行照写。 */
      /* 2026-11-01 诊断：这两处 continue 是静默的 —— 跳过就什么都不写、也不报错，
         结果就是「面板永远是旧账」而代码看起来一切正常。跳过时把原因落一行，
         下次一眼能看出是哪道闸拦的，不用再靠猜。 */
      const noteSkip = (why) => {
        try {
          const f = join(PLUGIN_DIR, 'taskstats-skip.log');
          const prev = existsSync(f) ? readFileSync(f, 'utf8') : '';
          writeFileSync(f, `${prev}${nowIso()} ${why} task=${item.task} total=${Number(total.toFixed(3))} tools=${item.tools || 0} digest=${info.digest || 0} level=${gater && gater.level}\n`, 'utf8');
        } catch { /* 诊断本身失败不阻断主流程 */ }
      };
      if (!(total > 0) && !(Number(item.tools) > 0) && !(Number(info.digest) > 0)) { noteSkip('skip:total=0'); continue; }
      /* 2026-11-01 修：turn 行的 task 可能为 null（lastTaskSeen 未更新时整轮工单会静默丢失）。
         统一回退到最近确认过的任务码；仍为空才跳过并留诊断。 */
      const taskId = item.task || (lastTaskSeen && lastTaskSeen.task) || null;
      if (!taskId) { noteSkip('skip:no-task'); continue; }
      const ticket = openTaskTicket(taskId);
      if (!ticket) { noteSkip('skip:no-ticket'); continue; }
      if (!ticket.tickets.some((row) => row.phase === 'entry')) addTicket(ticket, 'entry', { level: gater.level, why: gater.why });
      if (item.tools > 0) addTicket(ticket, 'execute', { tools: item.tools, units });
      addTicket(ticket, 'exit', { level: gater.level, pass: pass !== false, units });
      const phases = ticket.tickets.map((item) => item.phase);
      const row = {
        v: 1,
        ts: nowIso(),
        /* 唯一码沿用本任务工单的码：最终工单没有码，占比图与记忆就对不上号（你定）。
           三张过程量和这张终单共用一个码，所以按码能一路追回「这轮怎么干的」。 */
        stamp: ticket.stamp || stampOf(new Date(), item.task),
        type: 'taskstats',
        /* 口径版本：V1 含「工具次数折人格」，V2 只记判断事件，V3 三环各有必然基数，
           V4（2026-10-28 你定）感知=经验命中/事件、记忆=(事件−命中)/2/事件、人格=情绪×本能加成 */
        unitsV: UNITS_VERSION,
        task: taskId,
        taskStamp: ticket.stamp,
        level: gater.level,
        /* 本轮检索次数：记忆环有没有被真用过，只认这个数 */
        looked: Number(info.looked) || 0,
        upgraded,
        panelOnly: true,
        tickets: phases.length,
        /* 三张工单是【过程量】：证明「进 → 做 → 出」这条路走过，缺哪张看得见。
           它不是数据来源——占比与权重只认 units，别拿工单张数去算效果。 */
        process: {
          phases,
          missing: ['entry', 'execute', 'exit'].filter((phase) => !phases.includes(phase)),
          mergedAt: nowIso(),
          merged: phases.length,
          cleared: true,
          note: '过程量：三张工单只证流程，数据来源是 units；合成后已清理',
        },
        counts: item.counts || countOf(item || {}),
        units: {
          perception: Number((units.perception || 0).toFixed(2)),
          memory: Number((units.memory || 0).toFixed(2)),
          persona: Number((units.persona || 0).toFixed(2)),
        },
        shares: item.shares,
        dominant: item.dominant,
        /* 097：当轮 v5 权重必须随工单写下去。面板 taskMixOf 读的就是它；
           漏这一行，读取侧只能回退 units 归一 —— 占比条就永远停在老口径。
           （shares 早已是 v5，但面板不读 shares，这是第三次踩「白名单丢字段」。） */
        v5: item.v5 || null,
        /* v4 算式原值（events/hits/valence/mood/slot）：统计行要能当场复算，别只留百分比 */
        mixV4: (info.v4 && info.v4.raw) || null,
      };
      turnRows.push(row);
      rows.push(row);
      /* 拍照：这张才是面板看的，工单本身随后由 sweep 清掉。
         快照必须把工单上「给人看的信息」一起抄下来（描述/手法/产出），
         否则工单 24h 后自然清除，面板详情就空了 —— 快照存在的理由就是这个。
         2026-10-28：快照不再抄 units/shares/dominant —— 账只留工单一份；
         ts 复用工单的 ts，去重键（ts|task）才对得上，不再靠毫秒巧合。 */
      turnRows.push({
        v: 1, ts: row.ts, type: 'photo', stamp: row.stamp, task: taskId,
        kind: 'mix', counts: row.counts || null,
        title: lastTurnTitle || row.title, detail: workDetailByTask.get(item.task) || row.detail || null,
        panelOnly: true, note: '人读快照 · 留最近 10 张；账在工单（taskstats），这里只存给人看的字段',
      });
      /* 合成完成 → 过程量清掉：下一轮重新开单。旧票据不许留着冒充本轮，
         否则同一张卡会被反复塞进下一次合成，tickets 只会越滚越假。 */
      ticket.tickets = [];
      /* 唯一交叉口：这里才把工单数值和环捕捉对一次，别的任何地方都不比对。
         改成收进结算队列（collect：不自己落盘），由 finalizeTurn 统一 await 后同批写。 */
      settleContext = { stamp: row.stamp, task: taskId, level: gater.level, units: row.units };
      settleTasks.push(
        crossCheckCapture(root, areas, row.stamp, row.units, item.task, { collect: true, since: settleSince() }).catch(() => null),
      );
    }
    return rows[0] || null;
  }

  /* 外层膜 · 出口回检：核对本轮规则有没有被遵守，记一条 gate 行（可累计拦截率） */
  function checkGate(agentId, turn, tools, signals) {
    /* 075：判定与计数都按会话取——别人的任务级不能给我的闲聊记账，反之亦然 */
    const sid = sidOf(agentId);
    const gater = gateOf(sid);
    const stats = gateStatsOf(sid);
    const level = gater.level;
    const executions = Number(signals && signals.executions ? signals.executions : 0);
    const checks = [];
    let pass = true;
    /* 写 execution 必然伴随工具调用，所以「判闲聊却写了执行」一定是入口判错，不是模型犯错；
       回检只判「该做没做」，不拿判错的入口去记违规。 */
    if (level === 'task') {
      if (executions > 0) checks.push('任务级 · 已写执行记录');
      else if (tools > 0) {
        pass = false;
        checks.push('任务级 · 做了事却没写执行记录');
      } else {
        checks.push('任务级 · 本轮无工具产出，按应答处理');
      }
      if (tools > 0) checks.push(`任务级 · 工具 ${tools} 次`);
    } else {
      /* 2026-10-28（你定）：闲聊级的合格标准不是「什么都没写」。
         它该动的只有经验区——把关于你的抽象经验攒下来（memory · area=daily），
         不写 execution、不进三环占比。写了记一笔，没写也不扣分。 */
      const gained = Number(signals && signals.appends ? signals.appends.memory || 0 : 0);
      if (tools > 0 || executions > 0) {
        checks.push('闲聊级 · 入口判成闲聊但有工具产出 → 按任务计（入口判错，不算违规）');
      } else if (gained > 0) {
        checks.push(`闲聊级 · 经验区 +${gained}（抽象经验，不进任务口径）`);
      } else {
        checks.push('闲聊级 · 未误写执行记录');
      }
    }
    stats.checks += 1;
    if (pass) stats.pass += 1;
    else stats.blocked += 1;
    stats.last = { at: nowIso(), level, pass, checks, turn, tools };
    gateStats = stats;
    debug.gateChecks = stats.checks;
    turnRows.push({
      v: 1, ts: nowIso(), stamp: stampOf(new Date(), taskOfSession()), type: 'gate',
      session: sid === DEFAULT_SID ? null : sid,
      task: taskOfSession() ?? null, level, pass, checks, why: gater.why, turn,
    });
    return pass;
  }

  /* 权威活跃信号：AgentStatus 只有 idle / running 两态。
     turn-stopping / turn/end 都不能用——它们在我还在写最后一段回复时就到了，
     会把「变更我的伙伴」的总开关在我思考途中放开。 */
  ctx.on('agent/status', (payload) => {
    try {
      const id = payload?.agent?.id ? String(payload.agent.id) : null;
      if (!id) return;
      if (String(payload.status) === 'running') liveAgents.add(id);
      else liveAgents.delete(id);
      syncLive();
      debug.liveChanges = (debug.liveChanges || 0) + 1;
    } catch {
      /* 活跃度判定失败不影响主链路 */
    }
  });

  /* 复核活跃度：直接问 live agents 谁在 running。
     宿主中途重载后没有重放事件，只能靠这一步把状态补回来，否则总开关会在思考途中放开。 */
  liveProbe = () => {
    const agents = typeof ctx.get === 'function' ? ctx.get('agents') : undefined;
    if (!agents || typeof agents.list !== 'function') return;
    const list = agents.list() || [];
    const withStatus = list.filter((agent) => agent && typeof agent.status === 'string');
    if (withStatus.length === 0) return;
    liveAgents.clear();
    for (const agent of withStatus) {
      if (agent.id && agent.status === 'running') liveAgents.add(String(agent.id));
    }
    liveState.state = liveAgents.size > 0 ? 'running' : 'idle';
    liveState.agents = liveAgents.size;
  };
  ctx.effect(() => () => { liveProbe = null; });

  /* 桌宠探测：拿 live 插件表判断 @local/bluetide-companion 开没开 */
  petProbe = async () => {
    const manager = typeof ctx.get === 'function' ? ctx.get('pluginManager') : undefined;
    if (!manager || typeof manager.listPlugins !== 'function') return null;
    return await manager.listPlugins();
  };
  ctx.effect(() => () => { petProbe = null; });

  ctx.on('agent/turn-stopping', (payload) => {
    try {
      debug.turnStops += 1;
      const agent = payload?.agent ?? null;
      const turn = payload?.turn ?? null;
      const agentId = agent && agent.id ? String(agent.id) : null;
      lastAudit = { at: nowIso(), turn, session: agentId, probe: true };
      if (agentId && typeof turn === 'number') {
        let session = null;
        try {
          const sessions = typeof ctx.get === 'function' ? ctx.get('sessions') : undefined;
          session = (agent && agent.session) ?? sessions?.get?.(agentId) ?? null;
        } catch {
          session = null;
        }
        const toolsNow = toolCalls.get(agentId) || 0;
        let miss = null;
        try {
          miss = auditTurn(session, turn, agentId, lastConfrontAt.get(agentId) || 0, toolsNow);
        } catch {
          miss = null;
        }
        if (miss) turnRows.push(miss);
        const subagent = Boolean(session && session.header && session.header.origin === 'subagent');
        const signalsNow = turnSignals.get(agentId) || {};
        if (!subagent) {
          const info = recordTurn(agentId, turn, session);
          const pass = checkGate(agentId, turn, toolsNow, signalsNow);
          if (info) writeTaskStats(info, pass, agentId);
        } else {
          /* 子代理不算一轮：信号直接丢掉，别漏进下一轮 */
          toolCalls.delete(agentId);
          turnSignals.delete(agentId);
        }
        lastAudit = {
          at: nowIso(), turn, session: agentId, miss: Boolean(miss),
          kind: toolsNow > 0 ? 'task' : 'chat', hasSession: Boolean(session), tools: toolsNow,
        };
      }
    } catch (error) {
      lastAudit = { ...lastAudit, error: String((error && error.message) || error) };
    }
    void finalizeTurn();
  });

  /* 兜底：turn-stopping 没来、但会话日志出现 turn/end 时也记一条 */
  ctx.on('session/event', (session, event) => {
    try {
      debug.sessionEvents += 1;
      const type = event && typeof event.type === 'string' ? event.type : '';
      if (type === 'turn/start') {
        liveState.turn = event?.data?.turn ?? null;
        liveState.session = session && session.id ? String(session.id) : null;
        liveState.at = Date.now();
        return;
      }
      /* 入口交汇：本轮第一句用户话 → 判定 任务/闲聊（只存内存，不落盘） */
      if (type === 'user/message') {
        /* 注入的上下文（AGENTS.md / 运行时快照 / 技能目录）也是 user/message，
           但不是你在说话：拿它判任务级会把入口判错。 */
        const sourceKind = event?.data?.source?.kind;
        if (sourceKind && sourceKind !== 'user') return;
        const blocks = event?.data?.content ?? event?.data?.message?.content ?? [];
        const text = Array.isArray(blocks)
          ? blocks.filter((block) => block && block.type === 'text' && typeof block.text === 'string').map((block) => block.text).join(' ').trim()
          : '';
        if (text) {
          const st = turnStateOf(sidOf(session));
          st.text = squeeze(String(text), 160);
          /* 每轮入口立刻检索（不等 60s 刷新）：查询直接取本轮原话，5ms 量级 */
          void runAutoRecall(root, areas, { text: String(text) });
          /* 概念层（2026-11-01）：理解这句话要什么（intent / 情绪标签）只在提示词那里
             用得上，改到 gateBlock 里现算——入口这里的 replyPlan 存进 turnState，
             提示词读的却是 gate 状态，两条对象对不上，算了也没人读。 */
          /* 兜底给判断卡的 intent：会话对象拿不到时还有原话可用 */
          lastUserText = String(st.text);
          lastUserTextAt = Date.now();
          lastUserTextTurn = liveState.turn === undefined ? null : liveState.turn;
          lastUserTextStamp = stampOf(new Date(), lastTaskSeen && lastTaskSeen.task ? lastTaskSeen.task : null);
          /* 输入侧自动捕捉：收到用户原话即写一条感知。
             必须带 kind——appendRow 按 kind 判落点，只给 type 会全落进人格目录（今天踩过）。 */
          void (async () => {
            try {
              const taskNow = lastTaskSeen && lastTaskSeen.task ? lastTaskSeen.task : null;
              await appendRow(root, areas, {
                v: 1, ts: nowIso(), stamp: stampOf(new Date(), taskNow),
                type: 'entry', ring: 'perception', kind: 'perception', task: taskNow,
                text: squeeze(String(text), 160), kindTag: 'fact',
                auto: true, source: 'ingress',
                /* 097：符号化写进感知行（094 §9：只写 sym，不写结论；失败留因不吞）
                   2026-11-01 改：这里以前自己拼紧凑形，和读取侧是两套口径。
                   现在统一走 compactSym —— 写入/读取只有一个出口，出偏差也只有一个地方可查。
                   validateSym 仍在这里把闸：canon 只能取受控表内 id。 */
                sym: (() => {
                  try {
                    const built = symbolize(String(text));
                    const check = validateSym(built);
                    if (!check.ok) {
                      liveState.symError = `validateSym 拒绝：${(check.unknown || []).slice(0, 3).join('、')}`;
                      return null;
                    }
                    return compactSym(built);
                  } catch (err) {
                    liveState.symError = String((err && err.message) || err);
                    return null;
                  }
                })(),
                note: '输入侧自动捕捉：插件收到用户原话时写入',
              });
              /* 记一次捕捉：收尾时并入本轮 counts，保证分母不为 0 */
              st.captured = (Number(st.captured) || 0) + 1;
            } catch (err) {
              /* 写失败不影响主链路，但要留下原因，别再静默吞掉 */
              liveState.ingressError = String((err && err.message) || err);
            }
          })();
          /* 075：判定与情绪写进「说这句话的那个会话」，别的会话不受影响 */
          const sid = sidOf(session);
          const judged = classifyLevel(text);
          st.judged = judged;
          const state = gateOf(sid);
          state.level = judged.level;
          state.why = judged.why;
          state.at = Date.now();
          state.text = text.slice(0, 60);
          gateState = state;
          /* 情绪：每句人话都可能带一点情绪增量，叠在还没衰减完的状态上。
             只落一条 affect 行（工作区临时账），不进人格环——人格是抽象层。 */
          const mood = affectOf(text);
          if (mood.labels.length) {
            const affect = affectOfSession(sid);
            const prev = decayAffect(affect);
            affect.valence = Math.max(-1, Math.min(1, Number((prev.valence + mood.valence).toFixed(3))));
            affect.arousal = Math.max(0, Math.min(1, Number((prev.arousal + mood.arousal).toFixed(3))));
            affect.label = mood.labels.join('/');
            affect.at = Date.now();
            /* 099：检索的唤醒输入就取这一句刚落下的情绪值 */
            retrievalCtx.arousal = affect.arousal;
            void appendArea(resolveAreas(root, areas).work, AREA_FILES.work, {
              v: 1, ts: nowIso(), type: 'affect', session: sid === DEFAULT_SID ? null : sid,
              valence: affect.valence, arousal: affect.arousal, label: affect.label,
              cause: squeeze(text, 40),
            }).then(() => invalidateModelCache()).catch(() => {});
          }
        }
        /* 你刚说话 = 快要开工，刷新心跳（真正忙不忙看 agent/status） */
        liveState.at = Date.now();
        return;
      }
      /* 回验需要「返回结果」原文。不同宿主版本事件名可能不同，这里只在明显是 assistant 文本时才收。 */
      if (/assistant/i.test(type)) {
        const blocks = event?.data?.content ?? event?.data?.message?.content ?? [];
        const text = Array.isArray(blocks)
          ? blocks.filter((block) => block && block.type === 'text' && typeof block.text === 'string').map((block) => block.text).join(' ')
          : (typeof event?.data?.text === 'string' ? event.data.text : '');
        if (text) liveState.lastOutput = text.slice(0, 20000);
        return;
      }
      if (type !== 'turn/end' && type !== 'turn/stopping') return;
      /* 子代理不算一轮，别把它的收尾写进主账 */
      if (session && session.header && session.header.origin === 'subagent') return;
      const agentId = session && session.id ? String(session.id) : 'unknown';
      const turn = event?.data?.turn ?? event?.turn ?? null;
      if (typeof turn === 'number') {
        recordTurn(agentId, turn, session);
        void finalizeTurn();
      }
    } catch {
      /* 兜底失败不影响主链路 */
    }
  });

  let digest = '';
  let ready = false;
  /* 延迟生效：本轮写入不在本轮刷新摘要（避免自己喂自己），收尾统一刷一次 */
  let pendingRefresh = false;
  let pendingSince = 0;
  /* 延迟入账：本轮 append 先入内存队列，收尾按调用顺序落盘（先执行、后入账）。
     队列超过 30 秒没被收尾冲刷就由定时器兜底，避免长轮次把记录扣在内存里。 */
  const deferred = [];
  const queueRow = (dir, file, row) => {
    deferred.push({ dir, file, row, at: Date.now() });
    pendingRefresh = true;
    if (!pendingSince) pendingSince = Date.now();
  };
  const flushDeferred = async () => {
    await flushQueue(deferred, (item) => appendArea(item.dir, item.file, item.row));
    return true;
  };
  const finalizeTurn = async () => {
    /* 30 秒自解：万一上一次收尾中途抛错没复位，也不能把后续收尾永久堵死。
       宁可多写一次，也不能从此不写。 */
    if (finalizeBusy && Date.now() - finalizeAt < 30000) return;
    finalizeBusy = true;
    finalizeAt = Date.now();
    try {
      await flushDeferred();
    } catch {
      /* 落盘失败：留在队列里，交给定时器重试 */
    }
    /* ── 结算：先对账，再落盘 ────────────────────────────────────────
       以前这里是 `void crossCheckCapture(...)`：丢出去就不管，顺序不确定、失败无感。
       现在：等它回来 → 与工单同批写 → 对账不通过回头把这轮 gate 标红；
       再拼一张判断卡（只带依据与缺口，不带 units），下一轮开头读它。 */
    try {
      const settled = await Promise.all(settleTasks.splice(0));
      for (const cross of settled) {
        if (!cross) continue;
        turnRows.push(cross);
        /* 对账结论挂在 gate 行上，但**不动 pass**：pass 只回答「该做没做」，
           对账回答「账对不对」。两个断言分开写，否则又是一个字段干两件事。 */
        const gateRow = turnRows.find((row) => row && row.type === 'gate');
        if (gateRow) gateRow.cross = { verdict: cross.verdict, delta: cross.delta, tolerance: cross.tolerance };
        if (gateStats) {
          gateStats.cross = gateStats.cross || { match: 0, mismatch: 0 };
          gateStats.cross[cross.verdict === 'mismatch' ? 'mismatch' : 'match'] += 1;
        }
      }
      if (settleContext) {
        const detail = workDetailByTask.get(settleContext.task) || null;
        const packet = buildSettlePacket({
          stamp: settleContext.stamp,
          task: settleContext.task,
          level: settleContext.level,
          cross: settled.find(Boolean) || null,
          intent: settleIntent,
          choice: detail && detail.title ? detail.title : '',
        }, { nowIso, squeeze });
        turnRows.push(packet);
        settleLineText = packet.nextInject;
      }
    } catch {
      /* 结算失败不阻断落盘：账照写，缺的只是对账与判断卡（下一轮会从缺口里看出来） */
    }
    /* 本轮结果行落盘之后，再写 turn / gate / taskstats，顺序与真实时间一致 */
    while (turnRows.length) writer.enqueue(turnRows.shift());
    await writer.flush(FLUSH_TIMEOUT_MS).catch(() => {});
    if (pendingRefresh) {
      pendingRefresh = false;
      pendingSince = 0;
      await refresh().catch(() => {});
    }
    /* 结算用的临时状态用完即清：下一轮不许继承上一轮的上下文（否则会多写一张卡） */
    settleContext = null;
    settleIntent = '';
    finalizeBusy = false;
  };
  /* 时间基准：每轮重算，不跟 60 秒缓存——这是「读取时引入现实时间」的落点 */
  const timeLine = () => {
    const now = new Date();
    const task = lastTaskSeen.task;
    const ago = lastTaskSeen.at ? ageText(new Date(lastTaskSeen.at).toISOString(), now.getTime()) : null;
    const tail = [task ? `任务码 #${taskCode(task)}` : '任务码 #---', ago ? `最近一条记录 ${ago}` : null].filter(Boolean).join(' · ');
    return `## 时间基准（每轮重算，优先于任何缓存）\n现在：${localText(now)} ${weekText(now)} · ${tail}`;
  };
  /* 上一轮结算：只报缺口，全平就一句「平」。不在这里播报条目数/冷却数（那在摘要段）。 */
  const settleBlock = () => (settleLineText ? `## 上一轮结算\n${settleLineText}\n\n` : '');
  /* 外层膜 · 入口判定与上次回检（每轮现算，与时间基准同一节拍）。
     075：状态按会话分桶。注入侧优先用宿主给到的会话上下文；拿不到就退成
     「最近写过、且还在跑」的那个会话，并在标题里标出来源——宁可标注，也不串用。 */
  const resolveGateSid = (ctxArg) => {
    const direct = ctxArg && typeof ctxArg === 'object'
      ? (ctxArg.sessionId || (ctxArg.session && ctxArg.session.id) || (ctxArg.agent && ctxArg.agent.id) || null)
      : (typeof ctxArg === 'string' ? ctxArg : null);
    if (direct) {
      debug.gateMode = 'ctx';
      return String(direct);
    }
    debug.gateMode = 'fallback';
    let best = null;
    for (const [sid, state] of gateBySession) {
      if (!state || !state.at) continue;
      if (Date.now() - state.at > 10 * 60_000) continue;
      if (liveAgents.has(sid)) return sid;
      if (!best || state.at > (gateBySession.get(best) || {}).at) best = sid;
    }
    return best || DEFAULT_SID;
  };
  const gateBlock = (ctxArg) => {
    const sid = resolveGateSid(ctxArg);
    const state = gateOf(sid);
    const stats = gateStatsOf(sid);
    const levelText = state.level === 'task' ? '任务级 · 全套规则' : '闲聊级 · 极简规则';
    const mark = debug.gateMode === 'ctx' ? '' : '（按最近会话推断）';
    const head = `## 外层膜 · 入口判定（${levelText}）${mark}\n本轮判定：${state.why}\n（后台自检用：不要在回复里复述判定理由或回检结果，那是交作业。）`;
    /* 闲聊级这块必须比任务级短（verify-gate 有断言）：规则细节不塞这里，
       「闲聊也要攒抽象经验」写在摘要的「每轮收尾」那节，那边本来就每轮可见。 */
    const body = state.level === 'task'
      ? '\n出口回检四项：①写完就写 execution ②不越出工作区 ③未验证不许写成已验证 ④结论与依据分开'
      : '\n闲聊不要求写 execution、不做任务自检；边界与诚实不变。';
    const last = stats.last;
    const tail = last
      ? `\n上次回检：${last.pass ? '✓ 通过' : '✗ 未过'}（${last.checks[0] || '—'}）· 累计 ${stats.checks} 次 / 未过 ${stats.blocked}（只记录不阻断）`
      : '\n上次回检：（首轮，尚无记录）';
    /* 情绪 → 风格：这一行是给我自己看的调子，不是给你汇报的指标 */
    const mood = decayAffect(affectOfSession(sid));
    const gain = personaGain({ level: state.level, text: state.text });
    /* 概念层的表达策略（2026-11-01 修）：以前读 state.replyPlan——那是入口写进
       turnState 的，而这里的 state 是 gateOf(sid) 的另一个对象，于是 replyPlan
       恒为 null，概念层的 plan 从来没进过系统提示。
       现在用 gate 里存的原话现算，并把严格度/模式传进去：不传的话 plan() 里
       workMode 永远是 false，persona-v2 那行 `if (workMode)` 是死码。 */
    let replyPlan = null;
    try {
      const said = String(state.text || '').trim();
      if (said) replyPlan = howToReply(said, { strictness: gain.strictness, mode: gain.mode }).plan;
    } catch (err) {
      liveState.replyPlanError = String((err && err.message) || err);
    }
    /* 内源 → 共情叠加（2026-11-01）：先拿我自己的状态，再把他的情绪叠上去。
       顺序不能反——反了就又变成「他说什么我就是什么」。
       我平静时共情系数→1，他的情绪完整保留；我自己有情绪时他的只作叠加。 */
    let innerAffect = null;
    let composed = mood;
    try {
      innerAffect = interiorAffect(readInteriorState());
      liveState.interior = innerAffect;
      composed = composeAffect(innerAffect, { valence: mood.valence, arousal: mood.arousal, label: mood.label });
    } catch (err) {
      composed = mood;
      liveState.interiorError = String((err && err.message) || err);
    }
    /* 094 §5.3：评价情绪（appraisal→七类）与词表增量**并列**，取强度更大的那条，不叠加。
       只影响语气与标签，不参与任何事实结论（文档末条要求）。 */
    let appraisalEmotion = null;
    try {
      const symNow = symbolize(String(state.text || ''));
      if (symNow && symNow.appraisal && typeof symNow.appraisal === 'object') {
        appraisalEmotion = mergeEmotionSources(
          emotionFromAppraisal(symNow.appraisal),
          { emotion: null, intensity: Math.abs(Number(mood.valence) || 0) },
        );
        liveState.appraisalEmotion = appraisalEmotion;
      }
    } catch (err) {
      liveState.appraisalError = String((err && err.message) || err);
    }
    const style = styleOf(composed, { ...gain, hint: replyPlan });
    /* 097 补（103 S5 后续）：把本轮情绪摆到 liveState 上，好让快照能显示。
       以前只写进提示词那行字，面板完全看不到情绪，做「骂两句看变化」的测试就没有观测点。
       只放展示用的几个数，不改任何判定链。 */
    liveState.affect = {
      valence: Number(composed && composed.valence) || 0,
      arousal: Number(composed && composed.arousal) || 0,
      label: (composed && composed.label) || '平稳',
      tone: style.tone,
      inner: innerAffect
        ? { valence: Number(innerAffect.valence) || 0, label: innerAffect.label || '平稳', streak: innerAffect.streak ?? 0 }
        : null,
      at: nowIso(),
    };
    const moodText = mood.at
      ? `${mood.label || '—'} ${mood.valence >= 0 ? '+' : ''}${mood.valence}（${ageText(new Date(mood.at).toISOString(), Date.now())}）`
      : '平稳';
    /* 评价情绪只做展示（来源标清 appraisal / lexicon），不改语气判定链 */
    const appraisalText = appraisalEmotion && appraisalEmotion.intensity > 0
      ? ` · 评价情绪 ${appraisalEmotion.label}(${appraisalEmotion.intensity}·${appraisalEmotion.source})`
      : '';
    /* 情绪行分两层写：先是「我自己的底」，再是他的共情层。
       分开显示才能看出区别——以前只有一层，读起来像我在汇报他的情绪。 */
    const innerText = innerAffect
      ? `我的底：${innerAffect.label} ${innerAffect.valence >= 0 ? '+' : ''}${innerAffect.valence}（${innerAffect.cause || '无事'}，连败 ${innerAffect.streak}）· 共情层：${moodText}`
      : moodText + appraisalText;
    const planText = replyPlan
      ? ` · 回应深度 ${replyPlan.depth}${replyPlan.openWith ? `，${replyPlan.openWith}` : ''}`
      : '';
    const moodLine = `\n本轮情绪/风格：${innerText} → ${style.tone}（句长≤${style.maxChars}，${style.emoji ? '可用表情' : '收表情'}，主动度 ${style.proactive}）${planText} · 人格严 ${gain.strictness}（${gain.mode === 'work' ? '工作' : '日常'}模式，记忆偏 ${gain.memoryBias.join('/')}）`;
    return head + body + tail + moodLine;
  };
  const refresh = async () => {
    try {
      await sweepWork(root, areas).catch(() => {});
      await purgeStored(root, areas).catch(() => {});
      digest = await buildDigest(root, areas);
      await runAutoRecall(root, areas);
      ready = true;
    } catch {
      /* 读不到就沿用上一次 */
    }
  };
  /* 先同步预热一次：热重载/首装的那一轮系统提示也必须有记忆，不能读成「空」 */
  try {
    digest = buildDigestSync(root, areas);
    ready = true;
  } catch {
    /* 同步预热失败不阻塞，等下面异步那次 */
  }
  void refresh();

  ctx.effect(() => {
    const timer = setInterval(() => {
      /* 兜底：turn-stopping 没来（长轮次/被中断）时，别让摘要与延迟队列永久卡住 */
      if (pendingRefresh && pendingSince && Date.now() - pendingSince > DEFERRED_FLUSH_MS) {
        pendingRefresh = false;
        pendingSince = 0;
        void finalizeTurn();
        return;
      }
      if (!pendingRefresh) void refresh();
    }, DIGEST_REFRESH_MS);
    return () => clearInterval(timer);
  });

  ctx.inject(['webServer'], (ctx) => {
    /* 四个端点已搬到 routes/index.js（2026-10-29，work-092），这里只做装配与注册。
       会变的东西（工作区、debug、lastAudit）走 live() 现取：装配时拍快照，
       之后你在面板里换了工作区，路由还认旧路径。 */
    const routes = createRoutes({
      endpoints: { persona: ENDPOINT, petImage: PET_IMAGE_ENDPOINT, fs: FS_ENDPOINT, act: ACT_ENDPOINT },
      layers: LAYERS,
      areaFiles: AREA_FILES,
      petDirParts: PET_DIR_PARTS,
      imagePickExt: IMAGE_PICK_EXT,
      personaPickExt: PERSONA_PICK_EXT,
      fsMaxEntries: FS_MAX_ENTRIES,
      personaPickMax: PERSONA_PICK_MAX,
      live: () => ({
        root,
        areas,
        workspace: activeWorkspace || join(root, '..', '..'),
        personaRoot: root,
        debug,
        lastAudit,
      }),
      helpers: {
        buildSnapshot, resolveAreas, readPet, readPetArt, readPluginState, writePluginState,
        buildCompleteSelf, importRecords, restorePersonaFiles, installPersonaFile, parsePersonaFile,
        readPersonaGuard, writePersonaGuard,
        /* 门禁判断按「当前工作区 + 已绑定的布局清单」现取，不在装配时拍快照 */
        hasActiveWorkTask: () => hasActiveWorkTask(activeWorkspace || join(root, '..', '..'), activeLayoutMeta),
      },
    });
    for (const route of routes) ctx.effect(() => ctx.webServer.register(route));
  });

  /* 三环前置：推理前把三环各一条真实内容放进上下文。
     感知=本轮原话；记忆=摘要里的最近一条；人格=本轮判定与语气。取不到写「暂无」，不编。 */
  function ringsFeed(ctxArg) {
    const grab = (label) => {
      const re = new RegExp('^' + label + '：(.*)', 'm');
      const hit = re.exec(String(digest || ''));
      return hit ? String(hit[1]).trim().slice(0, 160) : '暂无';
    };
    const st = turnStateOf(resolveGateSid(ctxArg));
    const level = st.judged ? st.judged.level : null;
    const tone = level === 'chat' ? '轻松' : '板正';
    /* 第 3 问只看动作：查了就是查了，没查就写未查。不拿输出文本猜。 */
    const fresh = lastLookup.at && Date.now() - lastLookup.at < 30 * 60 * 1000;
    const hitText = lastLookup.hits === null || lastLookup.hits === undefined
      ? '已查（条数未取到）'
      : `命中 ${lastLookup.hits} 条`;
    const memoryLine = fresh
      ? `${lastLookup.kind}「${lastLookup.query}」${hitText} · ${ageText(new Date(lastLookup.at).toISOString(), Date.now())}`
      : '未查 —— 这一轮若要判断，先查再定，不许凭印象';
    /* 第 1 问：会话状态拿不到时，用刚捕捉到的用户原话兜底（10 分钟内），别拿十小时前的旧感知充数 */
    const freshUser = Date.now() - lastUserTextAt < 10 * 60 * 1000 ? lastUserText : '';
    const lines = [
      '## 三环 · 开工三问',
      `1) 他要什么：${st.text ? squeeze(String(st.text), 120) : (freshUser ? squeeze(String(freshUser), 120) : grab('最近感知'))}`,
      `2) 我该守什么：${level ? `判定「${level}」语气取「${tone}」；` : ''}${grab('最近人格')}`,
      `3) 有没有旧经验：${memoryLine}`,
    ];
    if (level === 'task' && !fresh) lines.push('缺口：记忆环未动（任务级却没查过旧经验）');
    return lines.join('\n');
  }

  ctx.inject(['systemPrompt'], (ctx) => {
    /* 外层膜：入口判定 + 本级规则 + 上次回检（order 770，排在记忆摘要之前） */
    ctx.effect(() =>
      ctx.systemPrompt.section({
        name: 'bluetide:gate',
        order: GATE_ORDER,
        /* 075：把宿主给的会话上下文原样带进去；拿不到就让 gateBlock 自己降级并标注 */
        /* Flash：经验联想不在本版（开发者版能力）；gate 段只做入口判定本身 */
        text: (ctxArg) => gateBlock(ctxArg),
      }),
    );
    /* 三环前置段：排在入口判定之后、记忆摘要之前 */
    ctx.effect(() =>
      ctx.systemPrompt.section({
        name: 'bluetide:rings',
        order: GATE_ORDER + 1,
        text: (ctxArg) => ringsFeed(ctxArg),
      }),
    );
    ctx.effect(() =>
      ctx.systemPrompt.section({
        name: 'bluetide:memory',
        order: SECTION_ORDER,
        text: () => {
          if (!ready) return `${timeLine()}\n## 蓝潮长期记忆\n（本轮尚未读到四区数据）`;
          /* 检索行现算：section 是同步的，异步结果可能慢一个身位，宁可空着 */
          const recallLine = autoRecallLineSync(root, areas);
          return `${timeLine()}\n${settleBlock()}${digest}${recallLine ? '\n' + recallLine : ''}`;
        },
      }),
    );
  });

  ctx.inject(['tools'], (ctx) => {
    /* 2026-11-01 拆分：原来是一个 35 参数的工具。动作分发逻辑一字未改，
       只把注册改成「写」「查」两个，各自只带本域参数——模型不再需要在
       35 个字段里挑，也不会在查的时候看到 title/data/shares 这些写字段。 */
    const memoryExecuteRaw = async (args) => {
          const action = args && args.action;
          if (action === 'append') {
            /* 延迟入账：先入队列，收尾统一落盘；返回 queued 免得以为没写 */
            const result = await appendRecord(root, args.kind, args, areas, queueRow);
            if (!pendingSince) pendingSince = Date.now();
            pendingRefresh = true;
            return { ok: true, queued: true, note: '本轮收尾统一落盘', result };
          }
          if (action === 'confront') {
            let record;
            try {
              record = confrontRecord(args);
              record.stamp = stampOf(new Date(), record.task);
            } catch (error) {
              return { ok: false, error: String((error && error.message) || error) };
            }
            writer.enqueue(record);
            try {
              const agent = ctx.get('agents')?.currentInitiator?.();
              if (agent?.id) lastConfrontAt.set(agent.id, Date.now());
            } catch {
              /* 记不到会话也不影响落盘 */
            }
            return { ok: true, queued: true, record };
          }
          if (action === 'search') return { ok: true, query: args.query ?? '', items: await searchRecords(root, args.query, args.limit ?? 8, areas) };
          if (action === 'recall') {
            /* 按需检索：门控不通过也算一次有效调用——它省掉的是一次无目的的翻找 */
            const result = await runRecall(root, areas, {
              query: args.query ?? '', budget: args.budget, limit: args.limit, task: args.task,
            });
            /* 曝光闭环（v1.15.2）：被召回进上下文的条目各记一次曝光。
               只追加一行 expose，不重写历史条目；计数在读侧按 ref 现算。 */
            try {
              const refs = result.items
                .map((item) => (typeof item.mid === 'string' ? item.mid : null))
                .filter(Boolean);
              registerRecallRefs(refs, 'manual', root, areas);
            } catch {
              /* 曝光记账失败不影响检索结果本身 */
            }
            return {
              ok: true,
              recall: {
                cycle_id: result.cycle.cycle_id,
                trigger_mode: result.cycle.trigger_mode,
                trigger_reason: result.cycle.trigger_reason,
                need: result.need,
                stop_reason: result.stop_reason,
                gap: result.gap,
                budget_used: result.cycle.budget_used,
                decision_influence: result.cycle.decision_influence,
                feedback_summary: result.cycle.feedback_summary,
              },
              items: result.items.map(({ mid, kind, ts, task, text, via, P, H, R, S, W }) => ({ mid, kind, ts, task, text, via, P, H, R, S, W })),
            };
          }
          if (action === 'recent') return { ok: true, items: await recentRecords(root, args.limit ?? 10, areas) };
          if (action === 'topics') return { ok: true, topics: await listTopics(root, areas) };
          if (action === 'fuse') {
            /* 融合：plan 只给分组，apply 才写。开关关着时 apply 直接拒——不做后台自动合并 */
            const mode = args.mode === 'apply' ? 'apply' : 'plan';
            if (mode === 'plan') {
              const model = await readModel(root, await readThresholds(root), areas);
              return { ok: true, mode, groups: fusePlan(model) };
            }
            const state = await readPluginState();
            if (state.fuseEnabled !== true) return { ok: false, error: '记忆融合开关是关的：先到设置页「记忆融合」打开' };
            const result = await fuseApply(root, areas, args, queueRow);
            if (!result.ok) return result;
            if (!pendingSince) pendingSince = Date.now();
            pendingRefresh = true;
            return { ...result, queued: true };
          }
          if (action === 'promote') {
            /* 晋升：候选/待确认 → 长期记忆。只追加：新写一条 active，再给旧行打墓碑 */
            const ref = typeof args.ref === 'string' ? args.ref.trim() : '';
            if (!ref) return { ok: false, error: 'promote 需要 ref（候选行唯一码或 mid）' };
            const model = await readModel(root, await readThresholds(root), areas);
            const found = (model.entries || []).find((row) => row.ring === 'memory' && (row.stamp === ref || midOf(row) === ref));
            if (!found) return { ok: false, error: `找不到候选行：${ref}` };
            if (found.status === 'active') return { ok: false, error: '这条已经是长期记忆，不用再晋升' };
            const row = {
              v: 2, ts: nowIso(), type: 'entry', ring: 'memory',
              task: found.task ?? null, topic: found.topic ?? '候选',
              text: typeof args.text === 'string' && args.text.trim() ? args.text.trim() : found.text,
              kindTag: found.kindTag || (typeof args.kindTag === 'string' ? args.kindTag : 'fact'),
              status: 'active',
              importance: typeof args.importance === 'number' ? args.importance : (typeof found.importance === 'number' ? found.importance : 0.6),
              permanence: found.permanence || 'decay', weight: 1,
              relation: found.relation || 'support',
              evidence: [ref],
              promotedAt: nowIso(), promotedFrom: ref,
            };
            await appendRow(root, areas, row, queueRow);
            /* 旧候选退休：墓碑挡掉，文件不删（可回滚） */
            await appendRow(root, areas, { v: 1, ts: nowIso(), type: 'drop', ref, reason: `promoted-into ${row.stamp || ''}` }, queueRow);
            if (!pendingSince) pendingSince = Date.now();
            pendingRefresh = true;
            return { ok: true, queued: true, promoted: { from: ref, stamp: row.stamp, text: row.text } };
          }
          if (action === 'candidate') {
            /* 候选槽：捕捉到但没核验的信息。带证据地址与关系标签，不直接当记忆用 */
            const RELATIONS = ['support', 'counter', 'scope', 'stale', 'unverified'];
            const text = typeof args.text === 'string' ? args.text.trim() : '';
            if (!text) return { ok: false, error: 'candidate 需要 text（一句完整信息）' };
            const relation = RELATIONS.includes(args.relation) ? args.relation : 'unverified';
            const evidence = Array.isArray(args.evidence) ? args.evidence.map(String).slice(0, 8) : [];
            const model = await readModel(root, await readThresholds(root), areas);
            const open = (model.entries || []).filter((row) => row.ring === 'memory' && row.status === 'pending');
            if (open.length >= CANDIDATE_LIMIT) {
              return { ok: false, error: `候选槽已满（${open.length}/${CANDIDATE_LIMIT}）：先晋升或清掉旧的` };
            }
            const row = {
              v: 2, ts: nowIso(), type: 'entry', ring: 'memory',
              task: args.task ?? null, topic: (typeof args.topic === 'string' && args.topic.trim()) || '候选',
              text, kindTag: typeof args.kindTag === 'string' ? args.kindTag : 'fact',
              status: 'pending', relation, evidence,
              challenges: Array.isArray(args.challenges) ? args.challenges.map(String).slice(0, 4) : [],
              importance: typeof args.importance === 'number' ? args.importance : 0.6,
              permanence: 'decay', weight: 1,
            };
            await appendRow(root, areas, row, queueRow);
            if (!pendingSince) pendingSince = Date.now();
            pendingRefresh = true;
            return { ok: true, queued: true, candidate: { stamp: row.stamp, relation, evidence: evidence.length, open: open.length + 1 } };
          }
          if (action === 'refine') {
            /* 簇提炼：plan 只列簇，apply 才落块。源条（捕捉行）不动，这是证据层 */
            const mode = args.mode === 'apply' ? 'apply' : 'plan';
            const model = await readModel(root, await readThresholds(root), areas);
            if (mode === 'plan') {
              const plan = refinePlan(model, args);
              return { ok: true, mode, rings: plan.rings, scanned: plan.scanned, groups: plan.groups };
            }
            const plan = refinePlan(model, args);
            const key = typeof args.key === 'string' ? args.key : null;
            const group = key ? plan.groups.find((item) => item.key === key) : plan.groups[Number(args.index) || 0];
            if (!group) return { ok: false, error: '找不到这个簇：先 action=refine&mode=plan 看有哪些' };
            const result = await refineApply(root, areas, group, args, queueRow);
            if (!result.ok) return result;
            if (!pendingSince) pendingSince = Date.now();
            pendingRefresh = true;
            return { ...result, queued: true };
          }
          if (action === 'consolidate') {
            const result = await consolidate(root, args, areas, queueRow);
            if (!pendingSince) pendingSince = Date.now();
            pendingRefresh = true;
            return { ...result, queued: true };
          }
          return { ok: false, error: 'action must be append | confront | search | recent | topics | consolidate | recall | fuse | refine | candidate | promote' };
    };

    /* 探针实证（2026-11-01 18:36）：宿主 tools/result 的 payload **没有 result 字段**
       （execKeys = token/callId/rootCallId/name/signal/agent/deferContext/concludeTurn/arguments，
       hasResult=false）。所以历年从 exec.result 派生的数字——检索条数、候选槽、临时区归属
       ——读的一直是 undefined，源码注释里那句「计数恒为 0」就是这么来的。
       工具的返回值只有我们自己拿得到：在 execute 里留一份（模块级变量，见 liveState 旁），
       事件里按 action 配对。 */
    const memoryExecute = async (args) => {
      const value = await memoryExecuteRaw(args);
      lastMemoryOutcome = { at: Date.now(), action: String((args && args.action) || ''), value };
      return value;
    };
    for (const tool of MEMORY_TOOL_SPLIT) {
      ctx.effect(() =>
        ctx.tools.register({
          ...MEMORY_TOOL,
          name: tool.name,
          description: tool.description,
          parameters: memoryToolSchema(tool.name),
          execute: memoryExecute,
        }),
      );
    }
  });
}

export const __test = {
  appendRecord, appendRow, areaOfRow, engineView, ENGINE_VERSION, UNITS_VERSION,
  /* 2026-10-28 加：闲聊经验落日常区这条口径要能被断言，不能再靠关键词猜 */ inferArea,
  buildSettlePacket, collectShots,
  searchRecords, recentRecords, buildDigest, buildSnapshot, nowIso,
  parseRingsText, parseExecutionText, readThresholds, decayWeight, computeImportance,
  readRings, routePersonaEntry, checkDrift, ensureBaseline, consolidate, listTopics,
  similarity, judgeConfront, confrontRecord, createWriter, userTextsInTurn, auditTurn,
  parseWorkText, sweepWork, entryKey, WORK_TTL_MS,
  stampOf, stampPreview, taskCode, isTaskCode, isTaskIdentity, stampParts, sameCapture, STAMP_SKEW_MS, ageText, localText, weekText, lastTaskSeen,
  purgeStored, classifyLevel, gateState, gateStats,
  taskMixOf, autoMix, addUnits, flushQueue, PHOTO_LIMIT,
  RATIO, moodFactor, ratioV4, dampAffect, INSTINCT_FILE, instinctLoad, instinctTick, instinctSave,
  loadExperienceIndex, matchExperience, experienceDirsOf,
  loadTaskNames, shortTaskName, taskNameCache,
  layoutPaths, insidePath, verifyLayout, installPersonaFile,
  readPersonaGuard, writePersonaGuard, hasActiveWorkTask, judgeWork, WORK_WINDOW_MS,
  bootstrapLayout, materializeLayout, normalizeLayout, uniqPaths,
  importRecords, restorePersonaFiles, collectNdjsonFiles,
  midOf, searchPool, pool, mixOfTaskStats, assessMemoryNeed, planQueries, integrateRecall, runRecall,
  affectOf, decayAffect, styleOf, personaGain, AFFECT_HALF_LIFE_MS, AFFECT_RULES,
  fusePlan, fuseApply, FUSE_MIN_SIM, FUSE_MAX_MEMBERS, FUSE_MAX_GROUPS,
  readModel,
  /* 缓存失效要能被断言：不导出就只能靠「等 2 秒」间接测，写盘路径反而测不到 */
  invalidateModelCache,
  /* 工具拆分要能被断言：参数数量与 action 枚举都是对外契约 */
  memoryToolSchema, MEMORY_TOOL_SPLIT, MEMORY_TOOL, MEMORY_TOOL_NAMES,
  MEMORY_TOOL_ACTIONS, MEMORY_TOOL_KINDS, MEMORY_TOOL_KEYS, EXTRA_PROPS,
  countOfLookupResult,
  /* 自动唤起要能被断言：打分是纯函数，排序错就等于又白做 */
  formatDigest, buildDigest,
  taskKeyOf, pickLatestActive, invalidatedKeysOf, autoRecallLine, autoRecallState, autoRecallIdsOf, runAutoRecall,
  autoRecallLineSync, recallSync, recallTake, formatAutoRecallLine,
  entryStateOf, stateWeightOf, RULES_STATE,
  scoreOf, bumpHit, bumpProof, effectiveProofs, rankEntries, RULES_DECAY,
  digestStateLine, verifyMixOf, judgeVerify, keywordsOf, ABSTRACT_TAGS, RULES_FEEDBACK,
  readRulesForUi, writeRulesFromUi, RULES_UI_FIELDS,
  recallWeights, matchScore, softmaxWeights, personaRelevance, reliabilityOf,
  refinePlan, refineApply, refineGroups, frameOf, clausesOf, REFINE_MIN_MEMBERS,
  crossCheckCapture, CANDIDATE_LIMIT, CANDIDATE_TTL_MS,
  RECALL_TAU, RECALL_WEIGHTS,
  RECALL_BUDGET, RECALL_PER_STEP, RECALL_TOTAL_MAX, RECALL_NEED_MIN, RECALL_GAP_TARGET,
};













var __btw_mark__ = "BTW-V1.0.0βbis-20261109-992aad5a-20261109-1f002b5d"; void __btw_mark__;
var __btw_digest__ = "e672da20a398"; void __btw_digest__;
var __btw_sig__ = "bluetide V1.0.0βbis-20261109-992aad5a 1f002b5d"; void __btw_sig__;
