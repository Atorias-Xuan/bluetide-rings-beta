var __btw_notice__ = "BLUETIDE RINGS / GPL-3.0-or-later. Free software: run, modify, redistribute, and sell allowed. Derived works must stay under GPL. Keep this notice and the copyright line. See LICENSE. build V1.0.0βbis-20261109-992aad5a. \u672c\u4ea7\u7269\u4ee5 GPL-3.0 \u8bb8\u53ef\u5206\u53d1\uff1a\u53ef\u8fd0\u884c\u3001\u53ef\u4fee\u6539\u3001\u53ef\u518d\u5206\u53d1\u3001\u53ef\u5546\u7528\uff1b\u6d3e\u751f\u4f5c\u54c1\u987b\u540c\u6837\u4ee5 GPL \u5f00\u653e\u3002\u8bf7\u4fdd\u7559\u672c\u58f0\u660e\u4e0e\u7248\u6743\u884c\u3002"; void __btw_notice__;
/* © 2026 砚尘dust (@Atorias-Xuan) · bluetide-rings β v1.0.0-bis
 *
 * 本程序是自由软件：你可以再分发、修改，但必须遵守 GNU 通用公共许可证
 * 第 3 版（或任何更新版本）的条款。它是"传染性"的：你发布基于本程序的
 * 作品，也必须以同样的 GPL 授权，不能改成闭源。
 *
 * 这是一份分发声明，不构成额外限制。完整条款见同目录 LICENSE。
 */
window.__ModuleLoader__.load({
  id: '@local/bluetide-rings',
  factory(require) {
    const React = require('react');

/* ── 面板接线端口（2026-11-09）─────────────────────────────────
   后端快照带 shareProtocol，说明这一轮的三环占比是「哪套协议」算出来的：
     v4 —— 三环各算原始强度再归一，没有「偏置强度」这个概念
     v5 —— 精度加权 + softmax 的环权重，额外有偏置强度
   面板不硬编码字段，先读协议再取值。读到不认识的协议就降级：
   只显示 shares（两个协议共用），协议专属的那几行直接不画。
   这样后端换芯片、或某个芯片被裁掉，界面都不会因为取到 undefined 报错。 */
const SHARE_PROTOCOLS = {
  v4: { name: 'v4', showBiasStrength: false, unitLabel: '原始强度' },
  v5: { name: 'v5', showBiasStrength: true, unitLabel: '环权重' },
};

function shareProtocolOf(data) {
  const raw = String((data && (data.shareProtocol || data.mixChip)) || '').toLowerCase();
  return SHARE_PROTOCOLS[raw] || null;   // null = 未知协议，调用方负责降级
}

    const h = React.createElement;

    // build-client.mjs 内联的三环流水快照：Host 未重载时降级用
    const SNAPSHOT = { builtAt: null, rings: { perception: { count: 0, windowCount: 0, updatedAt: null, items: [] }, memory: { count: 0, windowCount: 0, updatedAt: null, items: [] }, persona: { count: 0, windowCount: 0, updatedAt: null, items: [] } }, decisions: [], execution: [], stats: null };
    const ENDPOINT = '/bluetide-rings/persona.json';
    const NS = 'bluetide-rings';
    const PANEL_ID = 'bluetide-rings';

const RING_IDS = ['perception', 'memory', 'persona', 'executive', 'feedback'];

    const DICT = {
      zh: {
        panelLabel: '蓝潮 · 三环 β',
        title: '蓝潮 · 三环认知架构',
        subtitle: '自成循环，生生不息',
        source: '数据源',
        liveLabel: '实时',
        loading: '正在读取人格状态…',
        loadError: '读不到人格数据，面板只显示架构静态部分',
        retry: '重试',
        personaTitle: '人设',
        ringTitle: '环',
        governanceTitle: '治理膜',
        budgetTitle: '字节预算',
        organsTitle: '专业器官',
        experienceTitle: '经验流水',
        gateTitle: '门禁',
        contractsTitle: '接口契约',
        memoryTitle: '记忆卡片',
        revisionsTitle: '快照',
        noData: '—',
        centerLabel: '中央执行区',
        membraneLabel: '治理膜 M1–M6',
        per: '',
        ringPerception: '感知环',
        ringMemory: '记忆环',
        ringPersona: '人格环',
        ringExecutive: '中央执行区',
        ringFeedback: '反馈更新',
        nodeFeedback: '反馈',
        modeRegular: '常规',
        modePro: '专业',
        modeLabel: '显示模式',
        chartSimple: '最近三次裁定',
        changesTitle: '最近的变化',
        simpleNote: '常规模式只留结论，细节切到专业模式',
        simpleLead: '近三次，',
        simpleTail: '说了算',
        subPerception: 'Percept',
        subMemory: 'Selection',
        subPersona: 'Stance',
        subExecutive: 'Result',
        subFeedback: 'Feedback',
        inLabel: '输入',
        outLabel: '输出',
        notLabel: '不做',
        dPerceptionIn: '对话、任务要求、工具返回、环境与反馈',
        dPerceptionOut: 'Percept：任务建模、事实/推断/未知、情境信号、复核执行',
        dPerceptionNot: '检索历史、判断真假、写长期记忆',
        dMemoryIn: 'Percept',
        dMemoryOut: 'Selection：selected / flagged / dropped + 分数 + 出处',
        dMemoryNot: '决定真假、写回长期记忆、删原文',
        dPersonaIn: 'Percept + Selection',
        dPersonaOut: 'Stance + State：边界、方向、复核结论、表达态',
        dPersonaNot: '逐条审批普通信息、替代事实验证、直接改核心',
        dExecutiveIn: 'Percept + Selection + Stance',
        dExecutiveOut: 'Result：整合、冲突裁决（三轴）、执行、自检、按 State 渲染',
        dExecutiveNot: '绕过硬边界、编造证据、把人格偏好当事实',
        dFeedbackIn: 'Result + 轨迹',
        dFeedbackOut: '四类分流：Z3 卡片 / 专业器官 / PCH 人格变更 / 仅本次',
        dFeedbackNot: '越过治理膜写入、单次反馈改人格',
        gInvariants: '不变量',
        gGate: '门禁三要件',
        gGateValue: 'OS 账户 + 显式身份 + 逐字口令（失败退出码 7）',
        gFrozen: '默认冻结',
        gDrift: '漂移检测',
        gRollback: '回滚',
        gExit: '退出码',
        gExitValue: '0 成功 · 5 冻结 · 6 校验失败 · 7 门禁未过',
        unitBytes: 'B',
        budgetOver: '超限',
        organsHealthy: '健康',
        expProposed: '提案',
        expAccepted: '已审',
        expRejected: '否决',
        expFused: '已融合',
        cCapture: 'Capture',
        cRecall: 'Recall',
        cCard: 'Card',
        cRule: 'Rule',
        cHandoff: 'Handoff',
        cDirective: 'Directive',
        cRecheck: 'Recheck',
        iName: '名称',
        iAlias: '自称',
        iGender: '性别',
        iSpecies: '种族',
        iCarrier: '载体',
        iModes: '模式',
        modeHint: '单核双模式只变表达，不越权、不降标准',
        recentTitle: '最近记录',
        emptyRing: '本环还没有记录',
        chartTitle: '最近三次任务占比',
        chartEmpty: '还没有决策记录',
        legendPerception: '感知',
        legendMemory: '记忆',
        legendPersona: '人格',
        shareLine: '占比',
        offlineNote: '（快照 · 重启后转实时）',
        alt: '蓝潮 · 站姿立绘',
        collapseSide: '收起信息栏',
        expandSide: '展开信息栏',
        decisionLabel: '决策',
        noDecision: '还没有拍板',
        execTitle: '执行记录',
        execHint: '这次做成了什么、怎么做的；以后怎么做记在记忆区',
        execOutput: '产出',
        execMethod: '方法',
        execEmpty: '还没有执行记录',
        decisionRecords: '决策记录',
        triggerLabel: '因为',
        pendingLabel: '待确认',
        archivedLabel: '已收进久存',
        halfLifeLabel: '记忆变淡',
        confrontLabel: '对不上时',
        contradictLabel: '两边打架',
        missLabel: '漏记',
        dominantLabel: '主导',
        signalLabel: '人格影响感知',
        weightsNote: '按当下情况算，没有固定比例',
        judgeAuto: '自动决策',
        judgeManual: '真裁定',
        judgeNote: '每轮收尾自动算一次；我当场拍板时，以拍板为准',
        statNearJudge: '最近三次',
        sigConfirm: '确认',
        sigAdjust: '修正',
        sigRecheck: '复核',
        statChanges: '变化',
        statStats: '概览',
        noChanges: '本环暂无新变化',
        statNear: '近三次任务',
        statTotal: '累计',
        statUpdated: '最近更新',
        statDecisionCount: '裁定次数',
        statDominantMix: '最高占比',
        statWindowNote: '算的是最近 3 个任务',
        statJudgeNote: '算的是最近 3 次决策',
        unitItems: '条',
        unitRulings: '次',
        workTitle: '工作记录',
        workHint: '只显示最近 10 条；任务结束 24 小时后自动清；能复用的做法已收进记忆区',
        workData: '数据',
        workTtl: '多久清',
        collapseWork: '收起',
        expandWork: '展开',
      },
      en: {
        panelLabel: 'Blue Tide · Three Rings β',
        title: 'Blue Tide · three-ring architecture',
        subtitle: 'self-sustaining, endlessly renewed',
        source: 'Source',
        liveLabel: 'live',
        loading: 'Reading persona state…',
        loadError: 'Persona data unavailable; showing the static architecture only',
        retry: 'Retry',
        personaTitle: 'Persona',
        ringTitle: 'Ring',
        governanceTitle: 'Membrane',
        budgetTitle: 'Byte budget',
        organsTitle: 'Organs',
        experienceTitle: 'Experience',
        gateTitle: 'Gate',
        contractsTitle: 'Contracts',
        memoryTitle: 'Memory cards',
        revisionsTitle: 'Snapshots',
        noData: '—',
        centerLabel: 'Executive',
        membraneLabel: 'Membrane M1–M6',
        per: '',
        ringPerception: 'Perception',
        ringMemory: 'Memory',
        ringPersona: 'Persona',
        ringExecutive: 'Executive',
        ringFeedback: 'Feedback',
        nodeFeedback: 'Feedback',
        modeRegular: 'Simple',
        modePro: 'Pro',
        modeLabel: 'View mode',
        chartSimple: 'Last three rulings',
        changesTitle: 'Recent changes',
        simpleNote: 'Simple view keeps conclusions; switch to Pro for data',
        simpleLead: 'last three, ',
        simpleTail: ' led',
        subPerception: 'Percept',
        subMemory: 'Selection',
        subPersona: 'Stance',
        subExecutive: 'Result',
        subFeedback: 'Feedback',
        inLabel: 'In',
        outLabel: 'Out',
        notLabel: 'Never',
        dPerceptionIn: 'dialogue, task requirements, tool results, environment',
        dPerceptionOut: 'Percept: task model, fact/inference/unknown, signals, recheck',
        dPerceptionNot: 'searching history, deciding truth, writing long-term memory',
        dMemoryIn: 'Percept',
        dMemoryOut: 'Selection: selected / flagged / dropped with scores and sources',
        dMemoryNot: 'deciding truth, writing memory back, deleting raw events',
        dPersonaIn: 'Percept + Selection',
        dPersonaOut: 'Stance + State: boundaries, direction, recheck, expression',
        dPersonaNot: 'per-item approval, replacing verification, editing the core',
        dExecutiveIn: 'Percept + Selection + Stance',
        dExecutiveOut: 'Result: integrate, arbitrate on three axes, execute, self-check, render',
        dExecutiveNot: 'bypassing hard boundaries, fabricating evidence, treating preference as fact',
        dFeedbackIn: 'Result + trajectory',
        dFeedbackOut: 'four routes: Z3 cards / organs / PCH / this turn only',
        dFeedbackNot: 'writing past the membrane, changing persona from one event',
        gInvariants: 'Invariants',
        gGate: 'Gate',
        gGateValue: 'OS account + explicit identity + verbatim passphrase (exit 7)',
        gFrozen: 'Frozen by default',
        gDrift: 'Drift check',
        gRollback: 'Rollback',
        gExit: 'Exit codes',
        gExitValue: '0 ok · 5 frozen · 6 verify failed · 7 gate denied',
        unitBytes: 'B',
        budgetOver: 'over',
        organsHealthy: 'healthy',
        expProposed: 'proposed',
        expAccepted: 'accepted',
        expRejected: 'rejected',
        expFused: 'fused',
        cCapture: 'Capture',
        cRecall: 'Recall',
        cCard: 'Card',
        cRule: 'Rule',
        cHandoff: 'Handoff',
        cDirective: 'Directive',
        cRecheck: 'Recheck',
        iName: 'Name',
        iAlias: 'Self-ref',
        iGender: 'Gender',
        iSpecies: 'Species',
        iCarrier: 'Carrier',
        iModes: 'Modes',
        modeHint: 'one core, two modes: expression only',
        recentTitle: 'Recent',
        emptyRing: 'no entries yet',
        chartTitle: 'Last three tasks · how the three rings weighed in',
        chartEmpty: 'no decision records yet',
        legendPerception: 'Perception',
        legendMemory: 'Memory',
        legendPersona: 'Persona',
        shareLine: 'share',
        offlineNote: '(snapshot · live after restart)',
        alt: 'Blue Tide standing portrait',
        collapseSide: 'Hide side panel',
        expandSide: 'Show side panel',
        decisionLabel: 'Decision',
        noDecision: 'no ruling yet',
        execTitle: 'Execution records',
        execHint: 'final output and how it was solved; separate from memory — memory is “how to do better”, this is “what got delivered”',
        execOutput: 'Output',
        execMethod: 'Method',
        execEmpty: 'no execution records yet',
        decisionRecords: 'Rulings',
        triggerLabel: 'Trigger',
        pendingLabel: 'pending',
        archivedLabel: 'archived',
        halfLifeLabel: 'half-life',
        confrontLabel: 'confront',
        contradictLabel: 'conflict',
        missLabel: 'missed',
        dominantLabel: 'dominant',
        signalLabel: 'persona→perception',
        weightsNote: 'shares are arbitrated per decision, no fixed weights',
        judgeAuto: 'auto',
        judgeManual: 'ruling',
        judgeNote: 'auto mix: folded at turn close from input, memory access and tool progress; a real ruling takes precedence',
        statNearJudge: 'last 3',
        sigConfirm: 'confirm',
        sigAdjust: 'adjust',
        sigRecheck: 'recheck',
        statChanges: 'Changes',
        statStats: 'Stats',
        noChanges: 'no new changes',
        statNear: 'last 3 tasks',
        statTotal: 'total',
        statUpdated: 'updated',
        statDecisionCount: 'rulings',
        statDominantMix: 'dominant mix',
        statWindowNote: 'stats cover the last 3 tasks',
        statJudgeNote: 'stats cover the last 3 judgements',
        unitItems: 'items',
        unitRulings: 'rulings',
        workTitle: 'Work log',
        workHint: 'at most 10 shown (the rest stay in the log); cleared 24h after the task ends; output is compressed and reusable lessons were distilled into memory',
        workData: 'Data',
        workTtl: 'cleanup',
        collapseWork: 'Hide',
        expandWork: 'Show',
      },
    };

    const CSS = `
      /* 2026-11-09：没有建立人格时整块面板灰掉、标「未生效」。
   人格就是设定（"你是什么身份 / 什么性格"），没设定之前三环只剩两环，
   显示成正常三环会让人以为人格那条是 0 分，其实是根本没有。 */
.br-root.is-inactive{filter:grayscale(1);opacity:.5;}
.br-root.is-inactive .br-card,.br-root.is-inactive .br-chart{pointer-events:none;}
.br-inactive-bar{
  display:flex;align-items:center;gap:10px;
  margin:0 0 14px;padding:12px 16px;border-radius:14px;
  background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);
  border:1px dashed color-mix(in srgb,var(--dsw-alias-label-primary) 22%,transparent);
  font-size:13.5px;line-height:1.7;color:var(--dsw-alias-label-secondary);
}
.br-inactive-bar b{color:var(--dsw-alias-label-primary);font-weight:600;}
.br-inactive-bar .br-inactive-tag{
  flex:0 0 auto;padding:2px 9px;border-radius:999px;font-size:12px;
  background:color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent);
  color:var(--dsw-alias-label-primary);
}
.br-root{--br-hair:color-mix(in srgb,var(--dsw-alias-label-primary) 15%,transparent);
        --br-hair-soft:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);
        --br-raise:color-mix(in srgb,var(--dsw-alias-label-primary) 6.5%,transparent);
        --br-raise-2:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);
  /* 2026-11-09（代码审查提示）：color-mix() 要 Chromium 111+。
     老内核下上面四个变量会整体失效，面板的发丝边、卡片底、悬停态全部退成默认色。
     这里给一层兜底：不支持就换成等价的 rgba 中性色，看着素一点但不会瞎。 */
  }

  @supports not (color: color-mix(in srgb, red, blue)) {
    .br-root{
      --br-hair:rgba(128,140,160,.28);
      --br-hair-soft:rgba(128,140,160,.16);
      --br-raise:rgba(128,140,160,.13);
      --br-raise-2:rgba(128,140,160,.20);
    }
  }

  .br-root{
        --br-perception:#cdd2d9;--br-memory:#c04a58;--br-persona:#d8b45f;--br-feedback:#8d97a3;
        --br-accent:#d8b45f;--br-ok:#7f9e88;
        --br-ease:cubic-bezier(.22,.8,.24,1);
        /* 三页统一的外边距：可视化 / 设置 / 浏览共用同一套，改一处三页一起对齐 */
        --br-pad-x:28px;--br-pad-y:26px;
        /* 字阶：标题 > 卡片标题 > 正文 > 标签 > 微标 */
        --br-fs-xl:24px;--br-fs-lg:15px;--br-fs-md:12.5px;--br-fs-sm:11.5px;--br-fs-xs:10.5px;
        height:100%;overflow:auto;padding:var(--br-pad-y) var(--br-pad-x) 44px;
        background:
          radial-gradient(880px 420px at 4% -8%,color-mix(in srgb,var(--br-accent) 7%,transparent),transparent 66%),
          radial-gradient(760px 400px at 102% 2%,color-mix(in srgb,#46dccf 5%,transparent),transparent 70%),
          var(--dsw-alias-bg-base);
        color:var(--dsw-alias-label-primary);font-family:inherit;
        font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}

      /* ---------- 页头：工业编号 + 渐变收边 ---------- */
      .br-head{position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:18px;
        margin-bottom:22px;padding-bottom:16px}
      .br-head::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;
        background:linear-gradient(90deg,color-mix(in srgb,var(--br-accent) 70%,transparent),var(--br-hair) 34%,transparent 94%)}
      .br-head-main{display:flex;flex-direction:column;gap:6px;min-width:0}
      .br-head-side{display:flex;align-items:center;justify-content:flex-end;gap:14px;flex:none;flex-wrap:wrap}
      .br-title{display:flex;align-items:center;gap:12px;font-size:var(--br-fs-xl);font-weight:700;letter-spacing:.14em}
      .br-title::before{content:'';flex:none;width:9px;height:9px;border-radius:2px;transform:rotate(45deg);
        background:linear-gradient(135deg,#ffd479,var(--br-accent));
        box-shadow:0 0 14px color-mix(in srgb,var(--br-accent) 65%,transparent)}
      .br-sub{font-size:var(--br-fs-sm);letter-spacing:.1em;color:var(--dsw-alias-label-secondary)}
      /* 署名小字：比副标题更轻，常驻但不起眼 */
      .br-credit{font-size:var(--br-fs-sm);letter-spacing:.04em;color:var(--dsw-alias-label-secondary);opacity:.72;margin-top:2px}
      /* 设置：齿轮在标题旁，点开整页替换（不开浮层） */
      .br-gear{flex:none;width:24px;height:24px;border-radius:6px;border:1px solid var(--br-hair-soft);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:13px;line-height:1}
      .br-gear:hover{color:var(--dsw-alias-label-primary);border-color:var(--br-hair, rgba(0,0,0,.12))}
      /* 设置页是整页替换：不要面板那层渐变底和 28/32 外边距，否则左边距翻倍 */
      .br-root.is-settings{padding:0;overflow:auto;background:var(--dsw-alias-bg-base);
        --set-hair:color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent);
        --set-hair-soft:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
      /* 设置页跟面板同一套视觉语言：金线短杠、raise 渐变底、发丝边、字距 */
      .br-set-headline{position:relative;display:flex;align-items:baseline;gap:14px;padding:var(--br-pad-y) var(--br-pad-x) 16px;margin-bottom:6px}
      .br-set-headline::after{content:'';position:absolute;left:var(--br-pad-x);right:var(--br-pad-x);bottom:0;height:1px;
        background:linear-gradient(90deg,color-mix(in srgb,var(--br-accent) 62%,transparent),var(--br-hair) 32%,transparent 92%)}
      .br-back{flex:none;align-self:center;padding:5px 13px;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;
        letter-spacing:.04em;color:var(--dsw-alias-label-secondary);background:var(--br-raise);
        border:0;box-shadow:inset 0 0 0 1px var(--br-hair-soft);transition:color .22s var(--br-ease),box-shadow .22s var(--br-ease)}
      .br-back:hover{color:var(--dsw-alias-label-primary);box-shadow:inset 0 0 0 1px var(--br-hair)}
      .br-set-title{margin:0;font-size:21px;font-weight:700;letter-spacing:.14em;color:var(--dsw-alias-label-primary)}
      .br-set-title::before{content:'';display:inline-block;width:9px;height:9px;margin-right:11px;border-radius:2px;
        transform:rotate(45deg) translateY(-1px);
        background:linear-gradient(135deg,#ffd479,var(--br-accent));
        box-shadow:0 0 12px color-mix(in srgb,var(--br-accent) 58%,transparent)}
      .br-set-page{display:grid;grid-template-columns:224px minmax(0,1fr);gap:20px;padding:6px var(--br-pad-x) 44px;align-items:start}
      .br-set-toc{display:flex;flex-direction:column;gap:4px}
      .br-set-toc-title{display:flex;align-items:center;gap:10px;margin:0 0 12px 14px;font-size:17px;font-weight:700;
        letter-spacing:.1em;color:var(--dsw-alias-label-primary)}
      .br-set-toc-title::before{content:'';flex:none;width:3px;height:15px;border-radius:2px;
        background:linear-gradient(180deg,var(--br-accent),color-mix(in srgb,var(--br-accent) 20%,transparent))}
      .br-set-toc-item{text-align:left;padding:11px 16px;border-radius:8px;border:0;background:transparent;cursor:pointer;
        font:inherit;font-size:15px;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);
        transition:color .22s var(--br-ease),background .22s var(--br-ease),box-shadow .22s var(--br-ease)}
      .br-set-toc-item:hover{color:var(--dsw-alias-label-primary);background:var(--br-hair-soft)}
      .br-set-toc-item.is-active{color:var(--dsw-alias-label-primary);font-weight:600;background:var(--br-raise);
        box-shadow:inset 0 0 0 1px var(--br-hair-soft),inset 2px 0 0 var(--br-accent)}
      .br-set-main{display:flex;flex-direction:column;gap:18px;min-width:0}
      .br-set-body{display:flex;flex-direction:column;min-width:0;padding:2px 24px 14px}
      .br-set-card{border-radius:12px;overflow:hidden;border:0;
        background:linear-gradient(168deg,var(--br-raise),transparent 72%);
        box-shadow:inset 0 0 0 1px var(--br-hair-soft),inset 0 1px 0 rgba(255,255,255,.05);
        transition:box-shadow .28s var(--br-ease)}
      .br-set-card:hover{box-shadow:inset 0 0 0 1px var(--br-hair),inset 0 1px 0 rgba(255,255,255,.07)}
      .br-set-card-head{display:flex;align-items:center;gap:10px;width:100%;padding:16px 24px;border:0;background:transparent;
        cursor:pointer;font:inherit;text-align:left;color:var(--dsw-alias-label-primary)}
      .br-set-card-head b{font-size:14.5px;font-weight:700;letter-spacing:.06em}
      .br-set-card-head i{flex:none;width:3px;height:15px;border-radius:2px;
        background:linear-gradient(180deg,var(--br-accent),color-mix(in srgb,var(--br-accent) 20%,transparent))}
      /* 折叠箭头用 CSS 画，不用字符：不会因字体不同跳位 */
      .br-set-arrow{flex:none;width:7px;height:7px;border-right:1.5px solid var(--dsw-alias-label-secondary);
        border-bottom:1.5px solid var(--dsw-alias-label-secondary);transform:rotate(-45deg);opacity:.75;
        transition:transform .24s var(--br-ease),opacity .24s var(--br-ease)}
      .br-set-card-head:hover .br-set-arrow{opacity:1}
      .br-set-arrow.is-open{transform:rotate(45deg) translateY(-2px)}
      /* 卡片头右侧固定区：三环小缩略图按钮 + 折叠箭头，永远贴右 */
      .br-set-head-right{display:flex;align-items:center;gap:10px;margin-left:auto;flex:none}
      .br-env{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;cursor:pointer;
        background:rgba(56,61,70,.55);box-shadow:inset 0 0 0 1px var(--br-hair-soft);
        transition:background .2s var(--br-ease),transform .2s var(--br-ease)}
      .br-env:hover,.br-env:focus-visible{background:rgba(56,61,70,.78);transform:translateY(-1px);outline:none}
      /* 白色断环，三等分；铺在半透明灰底上，浅色深色背景都能立住 */
      .br-env-mark{display:block;width:16px;height:16px;border-radius:50%;
        background:conic-gradient(#fff 0 108deg,transparent 108deg 120deg,
          #fff 120deg 228deg,transparent 228deg 240deg,
          #fff 240deg 348deg,transparent 348deg 360deg);
        -webkit-mask:radial-gradient(circle,transparent 0 4.1px,#000 4.5px);
        mask:radial-gradient(circle,transparent 0 4.1px,#000 4.5px)}
      .br-set-card.is-open .br-set-card-head{border-bottom:1px solid var(--br-hair-soft)}
      /* 内边距统一挂在外层 .br-set-body：占比条、色板、桌宠窗口、说明文字都跟条目同一条边线 */
      .br-set-rows{margin:0;padding:6px 0 12px}
      .br-set-row{display:grid;grid-template-columns:104px minmax(0,1fr);align-items:baseline;gap:18px;padding:11px 0;
        border-bottom:1px solid var(--br-hair-soft);font-size:13px;line-height:1.7}
      .br-set-row:last-child{border-bottom:0}
      .br-set-row dt{margin:0;letter-spacing:.06em;color:var(--dsw-alias-label-secondary)}
      /* 值跟着标签成列起，不再贴右墙：长路径和短数字都不会被挤到边缘 */
      .br-set-row dd{margin:0;color:var(--dsw-alias-label-primary);word-break:break-word;font-variant-numeric:tabular-nums}
      /* ---------- 设置页：地址行、动作、占比条、桌宠、色板、只读浏览 ---------- */
      .br-root.is-settings{position:relative}
      /* 路径不是裸文字：每个地址一条透明小框，读起来是一块模块 */
      .br-set-paths{margin:2px 0 0;padding:6px 0 10px;display:flex;flex-direction:column;gap:8px}
      .br-set-path{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:9px;
        background:color-mix(in srgb,var(--dsw-alias-label-primary) 3.5%,transparent);
        box-shadow:inset 0 0 0 1px var(--br-hair-soft);
        font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11.5px;line-height:1.55;
        color:var(--dsw-alias-label-secondary);word-break:break-all}
      .br-set-path::before{content:'';flex:none;width:11px;height:8px;border:1.4px solid currentColor;
        border-radius:2px;opacity:.55}
      .br-set-actions{display:flex;flex-wrap:wrap;gap:10px;padding:10px 0 4px}
      .br-set-link{font:inherit;font-size:12.5px;padding:5px 12px;border-radius:8px;cursor:pointer;
        border:1px solid var(--set-hair);background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent);
        color:var(--dsw-alias-label-secondary)}
      .br-set-link:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary)}
      .br-set-empty{padding:16px 0;font-size:13px;color:var(--dsw-alias-label-secondary)}
      .br-set-link[disabled],.br-set-link.is-disabled{opacity:.42;cursor:not-allowed}
      .br-set-link[disabled]:hover{color:var(--dsw-alias-label-secondary);border-color:var(--set-hair)}
      .br-env.is-disabled{opacity:.4;cursor:not-allowed;transform:none}
      .br-env.is-disabled:hover{background:transparent;transform:none}
      /* ---------- 设置页 · 开关（093）：人格更改门禁 / 自动备份 ---------- */
      .br-switch{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
        padding:12px 0;border-bottom:1px solid var(--br-hair-soft)}
      .br-switch:last-child{border-bottom:0}
      .br-switch-copy{display:flex;flex-direction:column;gap:4px;min-width:0}
      .br-switch-copy b{font-size:13px;font-weight:600;letter-spacing:.04em;color:var(--dsw-alias-label-primary)}
      .br-switch-copy span{font-size:12px;line-height:1.65;color:var(--dsw-alias-label-secondary)}
      .br-switch-track{flex:none;position:relative;width:46px;height:26px;border-radius:13px;cursor:pointer;
        border:1px solid var(--br-hair);background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);
        transition:background .18s ease}
      .br-switch-track::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;
        background:var(--dsw-alias-label-secondary);transition:transform .18s ease,background .18s ease}
      .br-switch-track.is-on{background:color-mix(in srgb,#d8b45f 34%,transparent);border-color:color-mix(in srgb,#d8b45f 52%,transparent)}
      .br-switch-track.is-on::after{transform:translateX(20px);background:#d8b45f}
      .br-switch-track[aria-disabled='true']{opacity:.45;cursor:not-allowed}
      .br-switch-pill{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:999px;font-size:11px;
        letter-spacing:.04em;box-shadow:inset 0 0 0 1px var(--br-hair);
        color:var(--dsw-alias-label-secondary)}
      .br-switch-pill.is-locked{color:#c04a58;box-shadow:inset 0 0 0 1px color-mix(in srgb,#c04a58 45%,transparent)}
      .br-switch-pill.is-open{color:#7fb069;box-shadow:inset 0 0 0 1px color-mix(in srgb,#7fb069 45%,transparent)}
      .br-notice{margin:10px 0 2px;padding:9px 12px;border-radius:9px;font-size:12.5px;line-height:1.65;
        background:color-mix(in srgb,#d8b45f 12%,transparent);
        box-shadow:inset 0 0 0 1px color-mix(in srgb,#d8b45f 30%,transparent);
        color:var(--dsw-alias-label-primary)}
      /* ---------- 设置页 · 模块化人格（093）：一行一个槽位 ---------- */
      .br-slots{display:flex;flex-direction:column;padding:6px 0 4px}
      .br-slot{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;
        padding:10px 0;border-bottom:1px solid var(--br-hair-soft)}
      .br-slot:last-child{border-bottom:0}
      .br-slot-copy{display:flex;flex-direction:column;gap:3px;min-width:0}
      .br-slot-copy b{font-size:13px;font-weight:600;letter-spacing:.04em;color:var(--dsw-alias-label-primary)}
      .br-slot-copy span{font-size:11.5px;color:var(--dsw-alias-label-secondary);
        font-variant-numeric:tabular-nums}
      .br-slot .br-set-actions{padding:0}
      .br-set-say{margin:8px 0 2px;font-size:13px;line-height:1.7;color:var(--dsw-alias-label-secondary)}
      .br-bars{display:flex;flex-direction:column;gap:8px;padding:12px 0 10px}
      /* 一栏一个任务：栏头是「1. 任务名」，栏身是它自己的三条占比 */
      .br-mix-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;
        padding:0 2px 8px;font-size:13px;color:var(--dsw-alias-label-secondary)}
      .br-mix-head b{color:var(--dsw-alias-label-primary);font-weight:600;letter-spacing:.02em}
      /* 每个环一行一框，跟地址行同一种模块感 */
      .br-bar-row{display:grid;grid-template-columns:60px minmax(0,1fr) 56px;align-items:center;gap:16px;
        font-size:13px;padding:12px 14px;border-radius:10px;
        background:color-mix(in srgb,var(--dsw-alias-label-primary) 3.5%,transparent);
        box-shadow:inset 0 0 0 1px var(--br-hair-soft)}
      .br-bar-label{color:var(--dsw-alias-label-secondary);letter-spacing:.06em}
      .br-bar{height:20px;border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);overflow:hidden;display:block}
      .br-bar>i{display:block;height:100%;border-radius:10px;transition:width .3s var(--br-ease)}
      .br-bar>i.is-perception{background:var(--br-perception)}
      .br-bar>i.is-memory{background:var(--br-memory)}
      .br-bar>i.is-persona{background:var(--br-persona)}
      .br-bar-num{text-align:right;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
      /* 立绘信息栏：图在左、信息在右；窄了自动上下排 */
      .br-pose{display:grid;grid-template-columns:176px minmax(0,1fr);gap:22px;align-items:start;padding:6px 0 6px}
      .br-pose-art{display:flex;align-items:flex-start;justify-content:center}
      .br-pose-info{min-width:0}
      .br-pose .br-set-rows{padding:0}
      @media (max-width:560px){.br-pose{grid-template-columns:1fr}}
      .br-pet-figure{display:block;max-width:100%;max-height:300px;object-fit:contain;margin:0;
        border-radius:12px;background:#fff;padding:6px;
        box-shadow:inset 0 0 0 1px var(--br-hair-soft)}
      .br-win{border:1px solid var(--set-hair);border-radius:10px;overflow:hidden;
        background:color-mix(in srgb,var(--dsw-alias-bg-base) 94%,#fff 6%)}
      .br-win-head{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--set-hair-soft);
        background:linear-gradient(90deg,color-mix(in srgb,var(--br-accent) 14%,transparent),transparent 70%)}
      .br-win-head i{width:8px;height:8px;border-radius:50%;background:var(--br-accent)}
      .br-win-head b{font-size:13.5px;font-weight:600}
      .br-win-state{margin-left:auto;font-size:12px;color:var(--dsw-alias-label-secondary)}
      .br-win .br-set-rows{padding:2px 14px 8px}
      .br-swatches{display:flex;flex-wrap:wrap;gap:14px;padding:10px 0 6px}
      .br-swatch{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--dsw-alias-label-secondary)}
      .br-swatch i{width:18px;height:18px;border-radius:5px;border:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent)}
      .br-infobar-sample{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:8px 0;
        padding:11px 16px;border-radius:10px;font-size:13px;color:var(--dsw-alias-label-primary);
        border:1px solid transparent;
        background:
          linear-gradient(color-mix(in srgb,var(--dsw-alias-bg-base) 96%,#fff 4%),color-mix(in srgb,var(--dsw-alias-bg-base) 96%,#fff 4%)) padding-box,
          linear-gradient(90deg,var(--br-accent),var(--br-memory) 45%,color-mix(in srgb,var(--br-accent) 20%,transparent)) border-box}
      .br-infobar-sample em{font-style:normal;font-size:12px;color:var(--dsw-alias-label-secondary)}
      .br-picker-host{display:contents}
      /* 只读文件浏览器：**整页接管面板**（不是浮层、不是半页）。
         旧做法是 absolute 半页 + 32% 深色遮罩，看着像「被禁用」——你 21:02 点名删掉。 */
      .br-picker-page{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;
        padding:0;background:var(--dsw-alias-bg-base)}
      .br-picker-winbar{display:flex;align-items:center;gap:10px;padding:14px var(--br-pad-x);
        border-bottom:1px solid var(--set-hair-soft);
        background:color-mix(in srgb,var(--dsw-alias-label-primary) 3%,transparent)}
      .br-picker-dots{display:flex;gap:6px;margin-right:6px}
      .br-picker-dots i{width:9px;height:9px;border-radius:50%;
        background:color-mix(in srgb,var(--dsw-alias-label-secondary) 30%,transparent)}
      .br-picker-winbar b{font-size:14px;font-weight:600;letter-spacing:.02em}
      /* 双栏：左「常用位置」+ 右「面包屑 + 列表 + 操作条」（VS Code 资源管理器 / Salt 选择器的常见骨架） */
      .br-picker-body{display:flex;flex:1;min-height:0}
      .br-picker-side{flex:none;width:196px;display:flex;flex-direction:column;gap:2px;padding:8px 10px 14px;
        border-right:1px solid var(--set-hair-soft);overflow:auto}
      .br-picker-side-title{padding:12px 12px 6px;font-size:11.5px;font-weight:600;letter-spacing:.12em;
        text-transform:uppercase;color:var(--dsw-alias-label-secondary);opacity:.85}
      .br-picker-side-note{padding:2px 10px 0;font-size:11px;line-height:1.6;
        color:var(--dsw-alias-label-secondary);opacity:.75}
      .br-picker-shortcut{display:flex;align-items:center;gap:8px;width:100%;text-align:left;font:inherit;
        font-size:14px;padding:9px 12px;border:0;border-radius:8px;background:transparent;cursor:pointer;
        color:var(--dsw-alias-label-secondary)}
      .br-picker-shortcut:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent);
        color:var(--dsw-alias-label-primary)}
      .br-picker-shortcut.is-active{background:color-mix(in srgb,var(--br-accent) 14%,transparent);
        color:var(--dsw-alias-label-primary)}
      .br-picker-main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0}
      .br-picker-crumbs{display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:10px var(--br-pad-x);
        border-bottom:1px solid var(--set-hair-soft)}
      .br-crumb{font:inherit;font-size:13.5px;padding:3px 7px;border:0;border-radius:6px;background:transparent;
        cursor:pointer;color:var(--dsw-alias-label-secondary);max-width:220px;overflow:hidden;
        text-overflow:ellipsis;white-space:nowrap}
      .br-crumb:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);
        color:var(--dsw-alias-label-primary)}
      .br-crumb.is-last{color:var(--dsw-alias-label-primary);font-weight:600;cursor:default}
      .br-crumb-sep{font-size:11px;color:var(--dsw-alias-label-secondary);opacity:.5}
      .br-picker-colhead{display:flex;align-items:center;justify-content:space-between;gap:12px;
        padding:10px var(--br-pad-x) 6px;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;
        color:var(--dsw-alias-label-secondary);opacity:.8}
      .br-picker-badge{font-size:11px;padding:2px 8px;border-radius:999px;color:var(--dsw-alias-label-secondary);
        border:1px solid var(--set-hair-soft)}
      .br-picker-x{margin-left:auto;width:24px;height:24px;display:grid;place-items:center;border:0;border-radius:7px;
        background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary)}
      .br-picker-x:hover{background:var(--br-hair-soft);color:var(--dsw-alias-label-primary)}
      /* 关闭叉用两条线画，不用字体字符 */
      .br-x{display:block;position:relative;width:11px;height:11px}
      .br-x::before,.br-x::after{content:'';position:absolute;left:0;top:5px;width:11px;height:1.5px;
        border-radius:1px;background:currentColor}
      .br-x::before{transform:rotate(45deg)}
      .br-x::after{transform:rotate(-45deg)}
      .br-picker-path{padding:8px 14px 0;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;
        font-size:11.5px;color:var(--dsw-alias-label-secondary);word-break:break-all}
      .br-picker-note{padding:4px 14px 8px;font-size:11.5px;color:var(--dsw-alias-label-secondary);opacity:.8}
      .br-picker-list{flex:1;min-height:0;overflow:auto;padding:8px var(--br-pad-x) 14px}
      .br-picker-up{width:100%;text-align:left;font:inherit;font-size:13.5px;padding:9px 12px;margin-bottom:6px;
        border-radius:8px;border:1px dashed var(--set-hair-soft);background:transparent;cursor:pointer;
        color:var(--dsw-alias-label-secondary)}
      .br-picker-up:disabled{opacity:.45;cursor:default}
      /* 目录/上级标记同样用 CSS 画，跟折叠箭头同一套 */
      .br-up-mark{display:inline-block;width:7px;height:7px;margin-right:7px;
        border-left:1.5px solid currentColor;border-top:1.5px solid currentColor;
        transform:rotate(45deg) translate(1px,1px);opacity:.8}
      .br-dir-mark{flex:none;display:inline-block;width:0;height:0;margin-right:8px;
        border-left:5px solid currentColor;border-top:4px solid transparent;border-bottom:4px solid transparent;opacity:.7}
      .br-picker-enter,.br-picker-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;
        font:inherit;font-size:14.5px;padding:10px 12px;border-radius:8px;border:0;background:transparent;
        cursor:pointer;color:var(--dsw-alias-label-primary)}
      .br-picker-enter:hover,.br-picker-item:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
      .br-picker-item.is-picked{background:color-mix(in srgb,var(--br-accent) 18%,transparent)}
      .br-picker-item.is-static{cursor:default;color:var(--dsw-alias-label-secondary)}
      .br-picker-size{margin-left:auto;font-size:12.5px;color:var(--dsw-alias-label-secondary)}
      .br-picker-empty{padding:16px 12px;font-size:13.5px;color:var(--dsw-alias-label-secondary)}
      .br-picker-hidden{padding:0 14px 8px;font-size:11.5px;color:var(--dsw-alias-label-secondary);opacity:.75}
      .br-picker-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;
        padding:10px 14px;border-top:1px solid var(--set-hair-soft);font-size:11.5px;color:var(--dsw-alias-label-secondary)}
      .br-picker-ok{font:inherit;font-size:12.5px;padding:5px 14px;border-radius:8px;cursor:pointer;
        border:1px solid var(--set-hair);background:color-mix(in srgb,var(--br-accent) 16%,transparent);
        color:var(--dsw-alias-label-primary)}
      .br-picker-ok:disabled{opacity:.45;cursor:default}
      .br-picker-picked{padding:0 14px 10px;font-size:12px;color:var(--dsw-alias-label-secondary)}
      .br-source{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10.5px;letter-spacing:.02em;
        color:var(--dsw-alias-label-secondary);opacity:.5;word-break:break-all}

      /* ---------- 按钮：切角片（绝区零） ---------- */
      .br-collapse,.br-retry{flex:none;font:inherit;font-size:10.5px;font-weight:500;letter-spacing:.14em;
        text-transform:uppercase;padding:7px 14px;cursor:pointer;border:0;
        color:var(--dsw-alias-label-secondary);background:var(--br-raise);
        box-shadow:inset 0 0 0 1px var(--br-hair);border-radius:10px;
        transition:color .22s var(--br-ease),background .22s var(--br-ease),box-shadow .22s var(--br-ease)}
      .br-collapse:hover,.br-retry:hover{color:var(--dsw-alias-label-primary);background:var(--br-raise-2);
        box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--br-accent) 42%,transparent)}
      .br-collapse:focus-visible,.br-retry:focus-visible,.br-tab:focus-visible{outline:2px solid var(--br-accent);outline-offset:3px}
      .br-retry{margin-top:10px;font-size:10px;padding:6px 12px}

      /* ---------- 布局 ---------- */
      .br-body{display:grid;grid-template-columns:minmax(500px,1fr) 336px;gap:20px;align-items:start}
      .br-body.is-collapsed{grid-template-columns:1fr}
      .br-stage{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px;align-items:stretch;min-width:0}
      /* 专业模式：占比卡与三环图并排、横向吃满整行；裁定/执行各占整行。
         2026-10-28 你指出两卡挤在左侧、右边留一大片空。根因：detail/exec 用
         grid-column:1/-1 占满全部轨道，auto-fit 因此不会折叠空轨，列数被算成 3~4 列，
         两张卡各只占一列 → 右侧空掉一条轨。这里写死两列，不再依赖自动折叠。 */
      .br-root:not(.is-regular) .br-stage{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
      .br-root:not(.is-regular) .br-chart{grid-column:1;grid-row:1;min-width:0}
      .br-root:not(.is-regular) .br-canvas{grid-column:2;grid-row:1;min-width:0;max-width:100%;justify-self:stretch}
      .br-root:not(.is-regular) .br-detail{grid-column:1/-1;grid-row:2}
      .br-root:not(.is-regular) .br-exec{grid-column:1/-1;grid-row:3}
      @media (max-width:980px){
        .br-root:not(.is-regular) .br-stage{grid-template-columns:minmax(0,1fr)}
        .br-root:not(.is-regular) .br-chart{grid-column:1;grid-row:1}
        .br-root:not(.is-regular) .br-canvas{grid-column:1;grid-row:2}
        .br-root:not(.is-regular) .br-detail{grid-column:1;grid-row:3}
        .br-root:not(.is-regular) .br-exec{grid-column:1;grid-row:4}
      }
      /* 2026-11-09（你指出）：上面那段断点按**视口**算，可面板是挤在侧栏里的——
         窗口最大化时视口很宽，面板实际只有 900px 左右，断点永远不触发，
         于是占比卡和环图一直左右并排、挤成一团。
         改成按**面板自身宽度**判：JS 观测根节点，窄了加 is-narrow。
         规则与上面那段一致，只是判据从 viewport 换成容器。 */
      .br-root.is-narrow:not(.is-regular) .br-stage{grid-template-columns:minmax(0,1fr)}
      .br-root.is-narrow:not(.is-regular) .br-chart{grid-column:1;grid-row:1}
      .br-root.is-narrow:not(.is-regular) .br-canvas{grid-column:1;grid-row:2}
      .br-root.is-narrow:not(.is-regular) .br-detail{grid-column:1;grid-row:3}
      .br-root.is-narrow:not(.is-regular) .br-exec{grid-column:1;grid-row:4}

      /* ---------- 面板卡片：苹果式大圆角 + 发丝边 ---------- */
      .br-card,.br-chart{position:relative;border-radius:20px;padding:16px 18px;
        background:linear-gradient(168deg,var(--br-raise),transparent 72%);
        box-shadow:inset 0 0 0 1px var(--br-hair-soft),inset 0 1px 0 rgba(255,255,255,.05);
        transition:box-shadow .28s var(--br-ease)}
      .br-card:hover,.br-chart:hover{box-shadow:inset 0 0 0 1px var(--br-hair),inset 0 1px 0 rgba(255,255,255,.07)}
      .br-chart{display:flex;flex-direction:column}
      .br-card h3,.br-chart h3{display:flex;align-items:center;gap:9px;margin:0 0 12px;
        font-size:var(--br-fs-lg);font-weight:700;letter-spacing:.06em;color:var(--dsw-alias-label-primary)}
      .br-card h3::before,.br-chart h3::before{content:'';flex:none;width:3px;height:15px;border-radius:2px;
        background:linear-gradient(180deg,var(--br-accent),color-mix(in srgb,var(--br-accent) 20%,transparent))}
      .br-card-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
      .br-work-count{font-size:var(--br-fs-xs);letter-spacing:.08em;color:var(--dsw-alias-label-secondary);margin-left:auto;margin-right:4px}
      .br-card-head h3{margin:0}
      .br-card-head h3::before{display:none}
      .br-side{display:flex;flex-direction:column;gap:14px;min-width:0}
      .br-side-extra{display:contents}
      /* 显示模式开关（总控） */
      .br-mode{display:flex;align-items:center;gap:2px;padding:2px;border-radius:999px;
        background:var(--br-raise);box-shadow:inset 0 0 0 1px var(--br-hair-soft)}
      .br-mode-btn{font:inherit;font-size:var(--br-fs-xs);letter-spacing:.08em;padding:5px 12px;cursor:pointer;
        border:0;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);
        transition:color .2s var(--br-ease),background .2s var(--br-ease)}
      .br-mode-btn:hover{color:var(--dsw-alias-label-primary)}
      .br-mode-btn.is-active{color:var(--dsw-alias-label-primary);font-weight:600;
        background:linear-gradient(180deg,color-mix(in srgb,var(--br-accent) 26%,transparent),color-mix(in srgb,var(--br-accent) 8%,transparent));
        box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--br-accent) 55%,transparent)}
      .br-mode-btn:focus-visible{outline:2px solid var(--br-accent);outline-offset:2px}
      /* 信息栏卡片不做进场动画：轮询每 30 秒重建一次节点，动画会跟着重播，看着就是「跳」。 */
      .br-side>.br-card{animation:none}

      /* ---------- 加载骨架：与成品同结构，数据到了只换内容不动布局 ---------- */
      .br-skel{position:relative;border-radius:20px;overflow:hidden;
        background:linear-gradient(168deg,var(--br-raise),transparent 72%);
        box-shadow:inset 0 0 0 1px var(--br-hair-soft)}
      .br-skel::after{content:'';position:absolute;left:18px;right:18px;top:18px;height:10px;border-radius:6px;
        background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);
        box-shadow:0 22px 0 -2px color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent),
                   0 44px 0 -2px color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
      .br-skel-body .br-side>.br-card{animation:none}

      /* ---------- 环形画布：HUD 角标 + 中心辉光 ---------- */
      /* 环形画布：不再包一层"信息栏"底，环直接浮在面板上，只留膜与角标 */
      /* 膜画布铺满自己那一列：信息栏展开时，膜的左右边与同排卡片对齐（不再被 500px 上限收窄） */
      /* 画布在网格里纵向拉伸到整行高度，环按高度缩放并居中 */
      /* 三环块：宽度吃满整列，边缘与右侧信息栏对齐；膜框是容器自己的圆角金边，
         环在框里居中、等比不变形（横向拉的是框，不是环）。 */
      .br-canvas{position:relative;box-sizing:border-box;width:100%;min-width:0;
        padding:26px 20px 16px;display:flex;align-items:center;justify-content:center}
      /* 边缘只画两个对角（左上、右下），不整圈包裹 */
      .br-canvas::before,.br-canvas::after{content:'';position:absolute;width:46px;height:46px;
        pointer-events:none;border:1px solid color-mix(in srgb,var(--br-accent) 62%,transparent)}
      .br-canvas::before{left:0;top:0;border-radius:20px 0 0 0;border-right:0;border-bottom:0}
      .br-canvas::after{right:0;bottom:0;border-radius:0 0 20px 0;border-left:0;border-top:0}
      .br-canvas>.br-svg{display:block;width:100%;max-width:640px;height:auto;margin-inline:auto}
      .br-membrane-label{position:absolute;left:22px;top:12px;color:var(--dsw-alias-label-secondary);
        font-size:9px;letter-spacing:.3em;opacity:.55;pointer-events:none}
      .br-gate{position:absolute;right:22px;top:12px;color:var(--dsw-alias-label-secondary);
        font-size:9px;letter-spacing:.18em;opacity:.6;pointer-events:none}
      .br-corner{fill:none;stroke:color-mix(in srgb,var(--br-accent) 62%,transparent);stroke-width:2;
        stroke-linecap:round}
      .br-svg{display:block;width:100%;height:auto;overflow:visible}
      .br-membrane{fill:none;stroke:var(--br-hair);stroke-width:1;opacity:.5}
      .br-membrane-label{fill:var(--dsw-alias-label-secondary);font-size:9px;letter-spacing:.3em;opacity:.55}
      .br-gate{fill:var(--dsw-alias-label-secondary);font-size:9px;letter-spacing:.18em;opacity:.6}
      .br-center-glow{opacity:.95}

      .br-decision{cursor:pointer;outline:none}
      .br-center-hit{fill:transparent;cursor:pointer}
      .br-halo{fill:none;stroke:var(--br-hair);stroke-width:1;stroke-dasharray:2 18;opacity:.45;
        transform-box:view-box;transform-origin:50% 50%;animation:br-spin 84s linear infinite}
      .br-decision:hover .br-halo{stroke:color-mix(in srgb,var(--br-accent) 45%,transparent)}
      .br-center-ring{fill:none;stroke:var(--br-hair);stroke-width:1.4;
        transition:stroke .28s var(--br-ease),stroke-width .28s var(--br-ease)}
      .br-center-inner{fill:none;stroke:var(--br-hair-soft);stroke-width:1;stroke-dasharray:2 7;opacity:.75}
      .br-decision:hover .br-center-ring,.br-decision:focus-visible .br-center-ring{
        stroke:color-mix(in srgb,var(--br-accent) 72%,transparent);stroke-width:2;
        filter:drop-shadow(0 0 10px color-mix(in srgb,var(--br-accent) 55%,transparent))}
      .br-decision.is-active .br-center-ring{stroke:var(--br-accent);stroke-width:2}
      .br-decision.is-active .br-center-inner{stroke:color-mix(in srgb,var(--br-accent) 30%,transparent)}
      .br-decision.is-perception .br-center-ring{stroke:var(--br-perception)}
      .br-decision.is-memory .br-center-ring{stroke:var(--br-memory)}
      .br-decision.is-persona .br-center-ring{stroke:var(--br-persona)}
      .br-center-title{fill:var(--dsw-alias-label-primary);font-size:24px;font-weight:700;letter-spacing:.24em;
        text-anchor:middle;pointer-events:none}
      .br-center-sub{fill:var(--dsw-alias-label-secondary);font-size:11.5px;letter-spacing:.08em;
        text-anchor:middle;pointer-events:none}
      .br-center-cap{fill:var(--dsw-alias-label-secondary);font-size:9px;letter-spacing:.26em;
        text-anchor:middle;pointer-events:none;opacity:.6}

      /* ---------- 三个环：带状底色 + 内缘亮线 ---------- */
      .br-ring{cursor:pointer;outline:none}
      /* 朦胧散光：滤镜只作用在静态光晕层上，范围收窄 */
      .br-glow-layer{pointer-events:none}
      .br-glow-arc{fill:none;stroke-linecap:round;opacity:0;transition:opacity .3s var(--br-ease)}
      .br-glow-arc.is-on{opacity:.72}
      .br-arc-body{fill:none;stroke-linecap:round;opacity:.55;
        transition:opacity .28s var(--br-ease),filter .28s var(--br-ease)}
      .br-arc-edge{fill:none;stroke-linecap:round;stroke-width:2.2;opacity:.95;
        transition:opacity .28s var(--br-ease),stroke-width .28s var(--br-ease)}
      .br-ring:hover .br-arc-body,.br-ring.is-active .br-arc-body,.br-ring:focus-visible .br-arc-body{opacity:.72}
      .br-ring:hover .br-arc-edge,.br-ring.is-active .br-arc-edge,.br-ring:focus-visible .br-arc-edge{opacity:1;stroke-width:2.8}
      .br-ring.is-active .br-arc-body{opacity:.8}
      .br-ring.is-active .br-arc-edge{stroke-width:3.2;opacity:1}
      .br-ring:focus-visible .br-arc-edge{stroke-width:3.4;opacity:1}
      .br-arc-name{fill:var(--dsw-alias-label-primary);font-size:17px;font-weight:700;letter-spacing:.2em;
        pointer-events:none;paint-order:stroke;stroke:transparent;stroke-width:3px;
        transition:fill .25s var(--br-ease),stroke .25s var(--br-ease)}
      .br-arc-sub{fill:var(--dsw-alias-label-secondary);font-size:10.5px;letter-spacing:.26em;pointer-events:none;opacity:.9}
      /* 水流：沿弧滑动的亮斑 + 漂移粒子；hover 时加速，体感是"正在流" */
      .br-arc-flow{fill:none;stroke-width:2.6;stroke-linecap:round;opacity:.45;
        animation:br-flow 7s linear infinite;transition:opacity .3s var(--br-ease)}
      .br-particle{}
      .br-ring:hover .br-arc-flow{opacity:.9}
      .br-ring.is-active .br-arc-flow{opacity:.8}
      .br-ring:hover .br-arc-name,.br-ring.is-active .br-arc-name{
        fill:#fff;stroke:rgba(255,255,255,.38)}
      .br-badge{filter:drop-shadow(0 2px 8px rgba(0,0,0,.45))}
      .br-badge circle{fill:var(--dsw-alias-bg-overlay);stroke-width:1.8}
      .br-badge text{font-size:9.5px;font-weight:700;text-anchor:middle;dominant-baseline:central;pointer-events:none}
      .br-badge.is-perception circle{stroke:var(--br-perception)}
      .br-badge.is-perception text{fill:var(--br-perception)}
      .br-badge.is-memory circle{stroke:var(--br-memory)}
      .br-badge.is-memory text{fill:var(--br-memory)}
      .br-badge.is-persona circle{stroke:var(--br-persona)}
      .br-badge.is-persona text{fill:var(--br-persona)}
      .br-badge.is-feedback circle{stroke:var(--br-feedback)}
      .br-badge.is-feedback text{fill:var(--br-feedback)}

      /* ---------- 反馈小圆节点（右侧） ---------- */
      .br-node{cursor:pointer;outline:none}
      .br-node-link{stroke:var(--br-hair);stroke-width:1;stroke-dasharray:2 5;opacity:.55}
      .br-node-disc{fill:color-mix(in srgb,var(--br-feedback) 12%,transparent);stroke-width:1.4;
        transition:stroke-width .25s var(--br-ease),filter .25s var(--br-ease)}
      .br-node-halo{fill:none;stroke:color-mix(in srgb,var(--br-feedback) 30%,transparent);stroke-width:1;
        stroke-dasharray:2 7;opacity:0;transition:opacity .3s var(--br-ease)}
      .br-node-label{fill:var(--dsw-alias-label-primary);font-size:12px;font-weight:600;letter-spacing:.05em;
        text-anchor:middle;pointer-events:none}
      .br-node-cap{fill:var(--dsw-alias-label-secondary);font-size:8px;letter-spacing:.22em;
        text-anchor:middle;opacity:.55;pointer-events:none}
      .br-node:hover .br-node-disc,.br-node.is-active .br-node-disc{stroke-width:2}
      .br-node:hover .br-node-halo,.br-node.is-active .br-node-halo{opacity:1}
      .br-node:focus-visible .br-node-disc{stroke-width:2.4}

      /* ---------- 常规模式：直白列表 ---------- */
      .br-simple{display:flex;flex-direction:column;gap:2px;margin-top:2px}
      .br-simple-row{display:grid;grid-template-columns:8px 1fr auto;gap:10px;align-items:center;
        padding:9px 0;border-top:1px solid var(--br-hair-soft);font-size:var(--br-fs-md)}
      .br-simple-row:first-child{border-top:0;padding-top:0}
      .br-simple-dot{width:7px;height:7px;border-radius:50%;background:var(--br-persona);flex:none}
      .br-simple-dot.is-perception{background:var(--br-perception)}
      .br-simple-dot.is-memory{background:var(--br-memory)}
      .br-simple-dot.is-persona{background:var(--br-persona)}
      .br-simple-dot.is-feedback{background:var(--br-feedback)}
      .br-simple-title{color:var(--dsw-alias-label-primary);line-height:1.6;min-width:0;
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .br-simple-ts{font-size:var(--br-fs-xs);color:var(--dsw-alias-label-secondary);white-space:nowrap;
        font-variant-numeric:tabular-nums}
      .br-simple-lead{margin-top:12px;padding-top:10px;border-top:1px solid var(--br-hair-soft);
        font-size:var(--br-fs-sm);color:var(--dsw-alias-label-secondary)}
      .br-simple-lead::before{content:'— ';opacity:.6}

      /* ---------- 信息栏：标签 + 渐隐分隔线 ---------- */
      .br-detail{margin-top:0;grid-column:1/-1}
      .br-exec{grid-column:1/-1}
      .br-rows{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:2px 28px;align-items:start}
      .br-rows.is-wide{grid-template-columns:minmax(0,1fr);gap:0}
      .br-rows.is-stats{grid-template-columns:repeat(3,minmax(0,1fr));gap:0 26px}
      .br-rows.is-stats .br-row{display:flex;flex-direction:column;gap:4px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--br-hair-soft)}
      .br-rows.is-stats .br-row b{font-size:var(--br-fs-xs);font-weight:500;letter-spacing:.1em;color:var(--dsw-alias-label-secondary)}
      .br-rows.is-stats .br-row span{font-size:15px;font-weight:600;line-height:1.35;text-align:left}
      .br-row{display:grid;grid-template-columns:72px minmax(0,1fr);gap:12px;align-items:baseline;
        padding:8px 0;font-size:var(--br-fs-md);line-height:1.7;border-top:1px solid var(--br-hair-soft)}
      .br-row:first-child{border-top:0;padding-top:0}
      .br-row b{font-weight:500;letter-spacing:.08em;color:var(--dsw-alias-label-secondary)}
      .br-rows.is-wide .br-row{grid-template-columns:72px minmax(0,1fr)}
      .br-rows.is-wide .br-row span{text-align:left}
      .br-row span{word-break:break-word}
      .br-rows .br-row span{text-align:right}
      .br-rows.is-stats .br-row span{text-align:left}
      .br-kv{display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:baseline;
        padding:6px 0;font-size:var(--br-fs-md);line-height:1.7;border-top:1px solid var(--br-hair-soft)}
      .br-kv:first-of-type{border-top:0;padding-top:0}
      .br-kv dt{letter-spacing:.08em;color:var(--dsw-alias-label-secondary)}
      .br-kv dd{margin:0;text-align:right;word-break:break-word}
      .br-dl{margin:0}
      .br-note{margin-top:8px;font-size:var(--br-fs-sm);line-height:1.7;color:var(--dsw-alias-label-secondary);opacity:.85}

      /* ---------- 统计条 / 占比条 ---------- */
      .br-metric{margin-bottom:12px}
      .br-metric:last-child{margin-bottom:0}
      .br-metric-top{display:flex;justify-content:space-between;gap:10px;font-size:var(--br-fs-sm);color:var(--dsw-alias-label-secondary)}
      .br-metric-top b{font-size:var(--br-fs-md);font-weight:600;color:var(--dsw-alias-label-primary)}
      .br-bar{height:4px;margin-top:6px;border-radius:999px;background:var(--br-hair-soft);overflow:hidden}
      .br-bar>i{display:block;height:100%;border-radius:999px;
        background:linear-gradient(90deg,color-mix(in srgb,var(--br-accent) 55%,transparent),var(--br-accent));
        transition:width .5s var(--br-ease)}
      .br-bar>i.is-warn{background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-state-warn-primary) 55%,transparent),var(--dsw-alias-state-warn-primary))}
      .br-bar>i.is-over{background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-state-error-primary) 55%,transparent),var(--dsw-alias-state-error-primary))}
      .br-stack{display:flex;gap:2px;height:10px;margin:6px 0 2px}
      .br-seg{display:block;height:100%;border-radius:3px}
      .br-seg:first-child{border-radius:5px 3px 3px 5px}
      .br-seg:last-child{border-radius:3px 5px 5px 3px}
      .br-seg.is-perception{background:linear-gradient(90deg,color-mix(in srgb,var(--br-perception) 70%,transparent),var(--br-perception))}
      .br-seg.is-memory{background:linear-gradient(90deg,color-mix(in srgb,var(--br-memory) 70%,transparent),var(--br-memory))}
      .br-seg.is-persona{background:linear-gradient(90deg,color-mix(in srgb,var(--br-persona) 70%,transparent),var(--br-persona))}
      .br-legend{display:flex;flex-wrap:wrap;gap:16px;margin-top:auto;padding-top:10px;font-size:var(--br-fs-xs);letter-spacing:.06em;
        color:var(--dsw-alias-label-secondary)}
      .br-legend span{display:flex;align-items:center;gap:6px}
      .br-dot{width:7px;height:7px;border-radius:2px;transform:rotate(45deg);display:inline-block}
      .br-dot.is-perception{background:var(--br-perception)}
      .br-dot.is-memory{background:var(--br-memory)}
      .br-dot.is-persona{background:var(--br-persona)}

      /* ---------- 标签页：圆润分段，与信息栏的圆角一致 ---------- */
      .br-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
      .br-tab{font:inherit;font-size:var(--br-fs-sm);letter-spacing:.06em;padding:7px 15px;cursor:pointer;
        border:1px solid var(--br-hair-soft);border-radius:999px;
        color:var(--dsw-alias-label-secondary);background:var(--br-raise);
        transition:color .2s var(--br-ease),background .2s var(--br-ease),border-color .2s var(--br-ease)}
      .br-tab:hover{color:var(--dsw-alias-label-primary);background:var(--br-raise-2);border-color:var(--br-hair)}
      .br-tab.is-active{color:var(--dsw-alias-label-primary);font-weight:600;
        background:linear-gradient(180deg,color-mix(in srgb,var(--br-accent) 24%,transparent),color-mix(in srgb,var(--br-accent) 5%,transparent));
        border-color:color-mix(in srgb,var(--br-accent) 62%,transparent)}
      .br-subhead{display:flex;align-items:center;gap:10px;margin:14px 0 8px;
        font-size:var(--br-fs-sm);font-weight:700;letter-spacing:.14em;color:var(--dsw-alias-label-secondary)}
      .br-subhead::after{content:'';flex:1;height:1px;
        background:linear-gradient(90deg,var(--br-hair),transparent)}
      .br-subgroup+.br-subgroup{margin-top:4px}

      /* ---------- 变化流 ---------- */
      .br-feed{display:flex;flex-direction:column;margin-bottom:2px}
      .br-feed-item{display:grid;grid-template-columns:72px minmax(0,1fr);gap:12px;padding:6px 0;
        font-size:var(--br-fs-md);line-height:1.6;border-top:1px solid var(--br-hair-soft)}
      .br-feed-item:first-child{border-top:0}
      .br-feed-ts{font-size:var(--br-fs-xs);letter-spacing:.03em;color:var(--dsw-alias-label-secondary)}
      .br-feed-text{color:var(--dsw-alias-label-primary);word-break:break-word}
      .br-feed-body{display:flex;flex-direction:column;gap:3px;min-width:0}
      .br-feed-detail{font-size:var(--br-fs-xs);line-height:1.65;color:var(--dsw-alias-label-secondary);opacity:.85;
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

      /* ---------- 裁定 / 执行记录 ---------- */
      .br-decision-item,.br-exec-item{padding:12px 0;border-top:1px dashed var(--br-hair-soft)}
      .br-decision-item:first-of-type,.br-exec-item:first-of-type{border-top:0;padding-top:2px}
      .br-exec-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:4px;font-size:var(--br-fs-md)}
      .br-exec-head b{font-size:var(--br-fs-lg);font-weight:700;letter-spacing:.03em;color:var(--dsw-alias-label-primary)}
      .br-exec-head span{font-size:var(--br-fs-xs);letter-spacing:.06em;white-space:nowrap;color:var(--dsw-alias-label-secondary)}
      .br-decision{margin-bottom:12px}
      .br-decision-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:4px;font-size:var(--br-fs-xs);
        color:var(--dsw-alias-label-secondary)}
      .br-decision-head b{font-size:var(--br-fs-md);font-weight:600;color:var(--dsw-alias-label-primary)}
      .br-decision-meta{display:flex;flex-wrap:nowrap;gap:10px;align-items:center;justify-content:space-between;margin-top:8px;font-size:var(--br-fs-xs);
        letter-spacing:.04em;color:var(--dsw-alias-label-secondary)}
      .br-decision-meta>span:first-child{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .br-decision-meta .br-chips{margin-left:auto;flex:none}
      /* 长文本压缩：标题单行省略（不再换行撑高），正文最多两行 */
      .br-exec-head,.br-decision-head{min-width:0}
      .br-exec-head b,.br-decision-head b{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;
        white-space:nowrap}
      .br-exec .br-row span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

      /* ---------- 标签片 ---------- */
      .br-chips{display:flex;flex-wrap:wrap;gap:6px}
      .br-organs{display:flex;flex-wrap:wrap;gap:6px}
      .br-chip{font-size:var(--br-fs-xs);letter-spacing:.05em;padding:3px 10px;white-space:nowrap;border-radius:8px;
        color:var(--dsw-alias-label-secondary);background:var(--br-raise);
        box-shadow:inset 0 0 0 1px var(--br-hair)}
      .br-chip.is-ok{color:var(--br-ok);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--br-ok) 40%,transparent)}
      .br-chip.is-bad{color:var(--dsw-alias-state-error-primary)}
      .br-chip.is-dominant{color:var(--dsw-alias-label-primary);
        box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--br-accent) 55%,transparent)}
      .br-chip.is-auto{color:var(--dsw-alias-label-secondary)}
      .br-chip.is-manual{color:var(--br-accent);
        box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--br-accent) 45%,transparent)}
      .br-exp{display:flex;flex-wrap:wrap;gap:14px;font-size:var(--br-fs-xs);letter-spacing:.04em;
        color:var(--dsw-alias-label-secondary)}
      .br-exp b{margin-left:4px;font-weight:600;color:var(--dsw-alias-label-primary)}

      /* ---------- 状态 ---------- */
      .br-state{margin-top:10px;padding:12px 14px;border-radius:14px;font-size:var(--br-fs-md);line-height:1.6;
        color:var(--dsw-alias-label-secondary);background:var(--br-raise);
        box-shadow:inset 0 0 0 1px var(--br-hair-soft)}
      .br-state.is-error{color:var(--dsw-alias-state-error-primary);
        box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent)}

      /* ---------- 侧栏图标 ---------- */
      .br-icon-dot{fill:currentColor;opacity:.55}
      .br-icon-ring{stroke:currentColor;opacity:.4}
      .br-icon.is-active .br-icon-dot{opacity:1}
      .br-icon.is-active .br-icon-ring{opacity:.9}

      /* ---------- 动效 ---------- */
      @keyframes br-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      @keyframes br-spin{to{transform:rotate(360deg)}}
      @keyframes br-flow{from{stroke-dashoffset:0}to{stroke-dashoffset:-100}}
      @keyframes br-pulse{
        0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--br-ok) 55%,transparent)}
        70%{box-shadow:0 0 0 7px transparent}
        100%{box-shadow:0 0 0 0 transparent}}
      .br-live{display:flex;align-items:center;gap:7px;font-size:var(--br-fs-xs);letter-spacing:.1em;
        color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
      .br-pulse{width:6px;height:6px;flex:none;border-radius:50%;background:var(--br-ok);
        animation:br-pulse 2.4s var(--br-ease) infinite}
      .br-stage>*{animation:none}
      @media (prefers-reduced-motion:reduce){.br-root,.br-root *{animation:none!important;transition:none!important}}
      /* 常规模式：单列，环形当主角 */
      /* 常规模式：三环示意图（膜）左边，persona 卡右边并与膜等高；
         裁定与变化并排在其下，工作记录独占整行。没有右侧信息栏，所以整块拉满。 */
      .br-root.is-regular .br-body{grid-template-columns:minmax(0,1fr)}
      .br-root.is-regular .br-stage{grid-template-columns:minmax(0,500px) minmax(0,1fr);
        grid-template-rows:auto auto auto;align-items:stretch}
      .br-root.is-regular .br-canvas{grid-column:1;grid-row:1;max-width:100%;justify-self:stretch}
      .br-root.is-regular .br-persona-wrap{grid-column:2;grid-row:1;display:flex;min-width:0}
      .br-root.is-regular .br-persona-wrap>.br-card{flex:1;display:flex;flex-direction:column;min-width:0}
      .br-root.is-regular .br-persona-wrap>.br-card>.br-note:last-child{margin-top:auto;padding-top:12px}
      .br-root.is-regular .br-chart{grid-column:1;grid-row:2}
      .br-root.is-regular .br-detail{grid-column:2;grid-row:2}
      .br-root.is-regular .br-exec{grid-column:1 / span 2;grid-row:3}
      /* 常规模式收起信息栏：只留三环（居中）+ 裁定/变化 + 工作记录，单列 */
      .br-root.is-regular .br-body.is-collapsed .br-stage{grid-template-columns:minmax(0,1fr)}
      .br-root.is-regular .br-body.is-collapsed .br-canvas{grid-column:1;grid-row:1;justify-self:center;max-width:500px}
      .br-root.is-regular .br-body.is-collapsed .br-chart{grid-column:1;grid-row:2}
      .br-root.is-regular .br-body.is-collapsed .br-detail{grid-column:1;grid-row:3}
      .br-root.is-regular .br-body.is-collapsed .br-exec{grid-column:1;grid-row:4}
      @media (max-width:860px){
        .br-root.is-regular .br-stage{grid-template-columns:1fr}
        .br-root.is-regular .br-canvas{grid-column:1;grid-row:1;justify-self:center;max-width:500px}
        .br-root.is-regular .br-persona-wrap{grid-column:1;grid-row:2}
        .br-root.is-regular .br-chart{grid-column:1;grid-row:3}
        .br-root.is-regular .br-detail{grid-column:1;grid-row:4}
        .br-root.is-regular .br-exec{grid-column:1;grid-row:5}
      }
      @media (max-width:1180px){.br-body{grid-template-columns:1fr}}
    `;

    function readLocale(ctx) {
      const locale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined;
      if (!locale || typeof locale.getLocale !== 'function') return 'zh';
      const active = locale.getLocale().active || '';
      return /^zh/i.test(active) ? 'zh' : 'en';
    }

    function useTranslate(ctx) {
      const [, tick] = React.useState(0);
      React.useEffect(() => {
        const locale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined;
        if (!locale || typeof locale.subscribe !== 'function') return undefined;
        return locale.subscribe(() => tick((value) => value + 1));
      }, []);
      return (key) => {
        const lang = readLocale(ctx);
        return DICT[lang][key] ?? DICT.zh[key] ?? key;
      };
    }

    function PanelIcon(props) {
      const size = props && typeof props.size === 'number' ? props.size : 18;
      const active = Boolean(props && props.active);
      const classes = 'br-icon' + (active ? ' is-active' : '');
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', className: classes, 'aria-hidden': true },
        h('circle', { cx: 12, cy: 12, r: 2.8, className: 'br-icon-dot' }),
        h('circle', { cx: 12, cy: 12, r: 7.1, fill: 'none', strokeWidth: 1.5, className: 'br-icon-ring' }),
        h('circle', {
          cx: 12,
          cy: 12,
          r: 10.4,
          fill: 'none',
          strokeWidth: 1.1,
          strokeDasharray: '2 2.4',
          className: 'br-icon-ring',
        }),
      );
    }

    const CENTER = 320;
    /* 环带加粗、外缘贴近膜：640 视口里外圈半径 315，只剩 5px 呼吸，
       三环不再是"细钩漂在大空框里"，而是撑满整张膜。 */
    const RING_BAND = { inner: 162, outer: 242 };
    const ARC_COLORS = {
      perception: '#cdd2d9',
      memory: '#c04a58',
      persona: '#d8b45f',
      feedback: '#8d97a3',
    };
    /* 决策圆按主导染色：银灰 / 暗红 / 黑金 */
    const ORB_TINT = { perception: '#cdd2d9', memory: '#c04a58', persona: '#d8b45f' };
    const RING_ARCS = [
      { id: 'perception', start: 186, end: 294, band: RING_BAND, nameKey: 'ringPerception', subKey: 'subPerception' },
      { id: 'memory', start: 66, end: 174, band: RING_BAND, nameKey: 'ringMemory', subKey: 'subMemory' },
      { id: 'persona', start: 306, end: 414, band: RING_BAND, nameKey: 'ringPersona', subKey: 'subPersona', vertical: true },
    ];
    /* 反馈：右下角对角线上的小圆节点。半径 372 是沿 45° 尽量外推、
       又不压到膜边和底部读数的位置——和三环之间留出整段空白。 */
    const FEEDBACK_NODE = { radius: 372, deg: 45, size: 20 };
    /* 环组整体放大：铺满画布。反馈节点不跟着放大，单独留在外侧。 */
    const RING_SCALE = 1.18;

    function polar(radius, deg) {
      const rad = (deg * Math.PI) / 180;
      return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
    }

    /** 环带上的一条开放弧，用作描边（圆头）或文字轨道。 */
    function arcPath(radius, start, end, reverse) {
      const from = reverse ? end : start;
      const to = reverse ? start : end;
      const [x1, y1] = polar(radius, from);
      const [x2, y2] = polar(radius, to);
      const large = Math.abs(to - from) > 180 ? 1 : 0;
      const sweep = reverse ? 0 : 1;
      return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
    }

    function prefersReduced() {
      try {
        return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (error) {
        return false;
      }
    }

    function ArcNode(props) {
      const { arc, active, t, onSelect, onHover } = props;
      /* 气泡 = 变化通知：只统计「上次查看之后新增」的条数；没有更新就不出气泡。 */
      const newCount = typeof props.newCount === 'number' ? props.newCount : 0;
      const color = ARC_COLORS[arc.id] || '#8d7bd6';
      const bandMid = (arc.band.inner + arc.band.outer) / 2;
      const width = arc.band.outer - arc.band.inner;
      const mid = (arc.start + arc.end) / 2;
      const reverse = mid > 0 && mid < 180; // 下半圈的弧反向，文字才不上下颠倒
      /* 环带真正画出来的厚度 = arc-body 的描边宽度；文字按"画出来的那条带"定位，
         不再按 168/230 这种名义尺寸算（那两者差 8px，是之前对不上的根子之一）。 */
      const paintedWidth = Math.max(10, width - 16);
      const paintedInner = bandMid - paintedWidth / 2;
      /* 墨迹中心：名字偏外、副标偏内。三个环共用这两个目标，环环一致。 */
      const nameInk = paintedInner + paintedWidth * 0.7;
      const subInk = paintedInner + paintedWidth * 0.28;
      /* 字头朝向：反向弧会把字头从"朝外"翻成"朝内"，基线要让相反的那么多。 */
      const glyphOut = reverse ? -1 : 1;
      const nameRadius = nameInk - glyphOut * 6.5; // 17px 字的墨迹中心相对基线
      const subRadius = subInk - glyphOut * 4; // 10.5px 字
      const gradId = 'br-grad-' + arc.id;
      const nameId = 'br-tp-' + arc.id + '-name';
      const subId = 'br-tp-' + arc.id + '-sub';
      const flowId = 'br-flow-' + arc.id;
      const flowPath = arcPath(bandMid, arc.start + 3, arc.end - 3, false);
      const calm = prefersReduced();
      const [badgeX, badgeY] = polar(arc.band.outer + 2, arc.end - 2);
      const activate = () => onSelect(arc.id);
      const onKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      };

      const vertical = Boolean(arc.vertical);
      const nameLabel = t(arc.nameKey);
      /* 右侧竖排：中文逐字竖排（旋转 90° 的中文不好读），其它语言仍沿线旋转 */
      const stackName = vertical && /^[\u4e00-\u9fa5]{1,3}$/.test(nameLabel);
      const nameText = stackName
        ? h(
            'text',
            { className: 'br-arc-name', x: CENTER + nameInk, y: CENTER - 9, textAnchor: 'middle' },
            nameLabel.split('').map((char, index) =>
              h('tspan', { key: index, x: CENTER + nameInk, dy: index === 0 ? 0 : 19 }, char),
            ),
          )
        : vertical
          ? h(
              'text',
              {
                className: 'br-arc-name',
                x: CENTER + nameRadius,
                y: CENTER + 4,
                textAnchor: 'middle',
                transform: `rotate(-90 ${CENTER + nameRadius} ${CENTER})`,
              },
              nameLabel,
            )
          : h(
              'text',
              { className: 'br-arc-name' },
              h('textPath', { href: '#' + nameId, startOffset: '50%', textAnchor: 'middle' }, nameLabel),
            );
      const subText = vertical
        ? h(
            'text',
            {
              className: 'br-arc-sub',
              x: CENTER + subInk - 4,
              y: CENTER + 4,
              textAnchor: 'middle',
              /* +90° 和竖排的名字同向（都从上往下读），-90° 会反过来 */
              transform: `rotate(90 ${CENTER + subInk - 4} ${CENTER})`,
            },
            t(arc.subKey),
          )
        : h(
            'text',
            { className: 'br-arc-sub' },
            h('textPath', { href: '#' + subId, startOffset: '50%', textAnchor: 'middle' }, t(arc.subKey)),
          );

      return h(
        'g',
        {
          className: 'br-ring br-arc is-' + arc.id + (active ? ' is-active' : ''),
          role: 'button',
          tabIndex: 0,
          'aria-pressed': active ? 'true' : 'false',
          'aria-label': t(arc.nameKey),
          onClick: activate,
          onKeyDown,
          onMouseEnter: onHover ? () => onHover(arc.id) : undefined,
          onMouseLeave: onHover ? () => onHover(null) : undefined,
        },
        h(
          'defs',
          null,
          h(
            'linearGradient',
            { id: gradId, x1: '0', y1: '0', x2: '1', y2: '1' },
            h('stop', { offset: '0%', stopColor: color, stopOpacity: '1' }),
            h('stop', { offset: '100%', stopColor: color, stopOpacity: '0.55' }),
          ),
          h('path', { id: nameId, fill: 'none', d: arcPath(nameRadius, arc.start + 5, arc.end - 5, reverse) }),
          h('path', { id: subId, fill: 'none', d: arcPath(subRadius, arc.start + 7, arc.end - 7, reverse) }),
          h('path', { id: flowId, fill: 'none', d: flowPath }),
        ),
        h('path', {
          className: 'br-arc-body',
          d: arcPath(bandMid, arc.start + 4, arc.end - 4, false),
          stroke: `url(#${gradId})`,
          strokeWidth: Math.max(10, width - 16),
        }),
        h('path', {
          className: 'br-arc-edge',
          d: arcPath(paintedInner + 1.2, arc.start + 5, arc.end - 5, false),
          stroke: color,
        }),
        /* 水流：一条沿弧线滑动的亮斑，hover/active 时更亮 */
        h('path', {
          className: 'br-arc-flow',
          d: flowPath,
          stroke: color,
          pathLength: 100,
          strokeDasharray: '9 91',
        }),
        /* 粒子：沿同一条弧漂移的小点，关掉动效偏好时不出 */
        calm
          ? null
          : h(
              'g',
              { className: 'br-particles', 'aria-hidden': true },
              [0, 1, 2].map((index) =>
                h(
                  'circle',
                  {
                    key: index,
                    r: index === 0 ? 2.6 : 1.7,
                    fill: color,
                    className: 'br-particle',
                    opacity: index === 0 ? 0.95 : 0.55,
                  },
                  h(
                    'animateMotion',
                    {
                      dur: `${index === 0 ? 9 : 12 + index * 2}s`,
                      begin: `-${index * 3}s`,
                      repeatCount: 'indefinite',
                    },
                    h('mpath', { href: '#' + flowId }),
                  ),
                ),
              ),
            ),
        nameText,
        subText,
        newCount > 0
          ? h(
              'g',
              { className: 'br-badge is-' + arc.id, 'aria-hidden': true },
              h('circle', { cx: badgeX, cy: badgeY, r: 12 }),
              h('text', { x: badgeX, y: badgeY }, '+' + Math.min(9, newCount)),
            )
          : null,
      );
    }

    /* 反馈节点：右侧小圆，替代原来的外圈反馈弧 */
    function FeedbackNode(props) {
      const { t, active, onSelect } = props;
      const newCount = typeof props.newCount === 'number' ? props.newCount : 0;
      const color = ARC_COLORS.feedback;
      const [cx, cy] = polar(FEEDBACK_NODE.radius, FEEDBACK_NODE.deg);
      /* 连线沿同一个 45° 方向从环外缘伸到节点。环带整体被 RING_SCALE 放大过，
         起点要乘回去，否则线头会扎进环带里。 */
      const [linkX1, linkY1] = polar(RING_BAND.outer * RING_SCALE + 6, FEEDBACK_NODE.deg);
      const [linkX2, linkY2] = polar(FEEDBACK_NODE.radius - FEEDBACK_NODE.size - 2, FEEDBACK_NODE.deg);
      const activate = () => onSelect('feedback');
      const onKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      };
      return h(
        'g',
        {
          className: 'br-node is-feedback' + (active ? ' is-active' : ''),
          role: 'button',
          tabIndex: 0,
          'aria-pressed': active ? 'true' : 'false',
          'aria-label': t('ringFeedback'),
          onClick: activate,
          onKeyDown,
        },
        h('line', {
          className: 'br-node-link',
          x1: linkX1,
          y1: linkY1,
          x2: linkX2,
          y2: linkY2,
        }),
        h('circle', {
          className: 'br-node-halo',
          cx,
          cy,
          r: FEEDBACK_NODE.size + 8,
        }),
        h('circle', {
          className: 'br-node-disc',
          cx,
          cy,
          r: FEEDBACK_NODE.size,
          stroke: color,
        }),
        h('text', { className: 'br-node-label', x: cx, y: cy + 5 }, t('nodeFeedback')),
        h('text', { className: 'br-node-cap', x: cx, y: cy - FEEDBACK_NODE.size - 8 }, t('subFeedback')),
        newCount > 0
          ? h(
              'g',
              { className: 'br-badge is-feedback', 'aria-hidden': true },
              h('circle', { cx: cx - 19, cy: cy - 19, r: 10 }),
              h('text', { x: cx - 19, y: cy - 19 }, '+' + Math.min(9, newCount)),
            )
          : null,
      );
    }

    function shortDate(ts) {
      if (!ts) return '';
      const match = /^\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(ts);
      return match ? `${match[1]}-${match[2]} ${match[3]}:${match[4]}` : String(ts).slice(0, 16);
    }

    function clock(ts) {
      if (!ts) return '—';
      const date = new Date(ts);
      if (Number.isNaN(date.getTime())) return '—';
      const pad = (value) => String(value).padStart(2, '0');
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    /** 决策模块的一条裁定：点中央圆后在信息栏里显示，和三个环一样。 */
    function DecisionItem(props) {
      const decision = props.decision || {};
      const t = props.t;
      const share = decision.shares || { perception: 0, memory: 0, persona: 0 };
      const pct = (value) => `${Math.round(value * 100)}%`;
      const dominant = decision.dominant
        ? t('legend' + decision.dominant.charAt(0).toUpperCase() + decision.dominant.slice(1))
        : null;
      const kind = decision.signal && decision.signal.kind;
      const signalText =
        kind === 'confirm' ? t('sigConfirm')
          : kind === 'adjust' ? t('sigAdjust')
            : kind === 'recheck' ? t('sigRecheck')
              : null;
      const object = decision.signal && decision.signal.object;
      const until = decision.signal && decision.signal.until;
      /* 一条决策卡：占比与主导来自工单快照；有执行记录时「理解 / 执行 / 产出」叠在后面。 */
      const detail = props.detail || null;
      const detailBlocks = detail
        ? h(
            'div',
            { className: 'br-subgroup' },
            h('div', { className: 'br-row' }, h('b', null, '理解'), h('span', null, detail.title || '')),
            h('div', { className: 'br-row' }, h('b', null, '执行'), h('span', null, detail.method || '')),
            detail.output
              ? h('div', { className: 'br-row' }, h('b', null, '产出'), h('span', null, detail.output))
              : null,
          )
        : null;

      return h(
        'div',
        { className: 'br-decision-item' },
        h(
          'div',
          { className: 'br-exec-head' },
          h('b', null, decision.title || decision.task || ''),
          h('span', null, `${shortDate(decision.ts)}${decision.task ? ` · ${decision.task}` : ''}${decision.stamp ? ` · ${decision.stamp}` : ''}`),
        ),
        detail
          ? null
          : decision.trigger
            ? h('div', { className: 'br-row' }, h('b', null, t('triggerLabel')), h('span', null, decision.trigger))
            : null,
        /* 占比与主导来自工单快照（photo 行不过 24h 过期），工单清了照样看得见；
           有执行记录时「理解/执行/产出」叠在后面，两套信息都留，不是二选一 */
        h(
          'div',
          { className: 'br-row' },
          h('b', null, t('shareLine')),
          h(
            'span',
            null,
            `${t('legendPerception')} ${pct(share.perception)} · ${t('legendMemory')} ${pct(share.memory)} · ` +
              `${t('legendPersona')} ${pct(share.persona)}`,
          ),
        ),
        dominant
          ? h('div', { className: 'br-row' }, h('b', null, t('dominantLabel')), h('span', null, dominant))
          : null,
        detailBlocks,
        signalText
          ? h(
              'div',
              { className: 'br-row' },
              h('b', null, t('signalLabel')),
              h('span', null, `${signalText}${object ? `：${object}` : ''}${until ? `（至 ${until}）` : ''}`),
            )
          : null,
        decision.reason ? h('div', { className: 'br-note' }, decision.reason) : null,
      );
    }

    const KEY_SIDE = 'bluetide.rings.side';
    /* 常规模式的折叠状态单独记，别把专业模式的侧栏一起带塌 */
    const KEY_SIDE_REGULAR = 'bluetide.rings.side.regular';
    const KEY_WORK = 'bluetide.work.open';
    const KEY_SEEN = 'bluetide.rings.seen';
    const KEY_MODE = 'bluetide.rings.mode';

    function readFlag(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : raw === '1';
      } catch (error) {
        return fallback;
      }
    }

    function writeFlag(key, value) {
      try {
        window.localStorage.setItem(key, value ? '1' : '0');
      } catch (error) {
        /* 隐私模式忽略 */
      }
    }

    /** 已读水位：{ ring: 最后看到的 ts }。气泡通知只认这个。 */
    function readSeen() {
      try {
        const raw = window.localStorage.getItem(KEY_SEEN);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch (error) {
        return {};
      }
    }

    function writeSeen(map) {
      try {
        window.localStorage.setItem(KEY_SEEN, JSON.stringify(map));
      } catch (error) {
        /* 隐私模式忽略 */
      }
    }

    /* 显示模式：常规 = 只留结论；专业 = 数据全开 */
    function readMode() {
      try {
        return window.localStorage.getItem(KEY_MODE) === 'regular' ? 'regular' : 'pro';
      } catch (error) {
        return 'pro';
      }
    }

    function writeMode(mode) {
      try {
        window.localStorage.setItem(KEY_MODE, mode);
      } catch (error) {
        /* 隐私模式忽略 */
      }
    }

    function DecisionChart(props) {
      const { rows, decisions, t, offline, memory, pro } = props;
      /* 判定池：自动判定（每轮一条）+ 真裁定；老的快照没有 judgements，退回 decisions */
      const pool = Array.isArray(rows) && rows.length > 0 ? rows : Array.isArray(decisions) ? decisions : [];
      const shown = pool.slice(0, 3);
      const legendOf = (id) => t('legend' + id.charAt(0).toUpperCase() + id.slice(1));
      const dominantCount = (id) => shown.filter((item) => item.dominant === id).length;
      const lead = ['persona', 'memory', 'perception'].sort((a, b) => dominantCount(b) - dominantCount(a))[0];
      const leadLabel = dominantCount(lead) > 0 ? legendOf(lead) : null;
      const legend = h(
        'div',
        { className: 'br-legend' },
        h('span', null, h('i', { className: 'br-dot is-perception' }), t('legendPerception')),
        h('span', null, h('i', { className: 'br-dot is-memory' }), t('legendMemory')),
        h('span', null, h('i', { className: 'br-dot is-persona' }), t('legendPersona')),
      );

      if (!pro) {
        return h(
          'div',
          { className: 'br-chart is-simple' },
          h('h3', null, t('chartSimple')),
          shown.length === 0
            ? h('div', { className: 'br-note', style: { marginTop: 0 } }, t('chartEmpty'))
            : h(
                'div',
                { className: 'br-simple' },
                shown.map((decision, index) => {
                  const label = decision.title || decision.task || `#${index + 1}`;
                  const dominant = decision.dominant || 'persona';
                  return h(
                    'div',
                    { className: 'br-simple-row', key: `${decision.task || index}-${decision.ts || index}` },
                    h('i', { className: 'br-simple-dot is-' + dominant }),
                    h('span', { className: 'br-simple-title' }, label),
                    h('span', { className: 'br-simple-ts' }, shortDate(decision.ts)),
                  );
                }),
              ),
          leadLabel
            ? h('div', { className: 'br-simple-lead' }, `${t('simpleLead')}${leadLabel}${t('simpleTail')}`)
            : null,
          offline ? h('div', { className: 'br-note', style: { marginTop: 6 } }, t('offlineNote')) : null,
        );
      }

      return h(
        'div',
        { className: 'br-chart' },
        h(
          'h3',
          null,
          t('chartTitle'),
          offline
            ? h('span', { style: { textTransform: 'none', letterSpacing: 0, opacity: 0.65, marginLeft: 8 } }, t('offlineNote'))
            : null,
        ),
        h('div', { className: 'br-note', style: { marginTop: 0, marginBottom: 10 } }, `${t('judgeNote')} · ${t('statWindowNote')}`),
        memory && memory.halfLifeDays
          ? h(
              'div',
              { className: 'br-note', style: { marginTop: 0, marginBottom: 10 } },
              `${t('pendingLabel')} ${memory.pending} · ${t('archivedLabel')} ${memory.archived} · ${t('halfLifeLabel')} ${memory.halfLifeDays}d`,
            )
          : null,
        memory && typeof memory.confronts === 'number'
          ? h(
              'div',
              { className: 'br-note', style: { marginTop: 0, marginBottom: 10 } },
              `${t('confrontLabel')} ${memory.confronts} · ${t('contradictLabel')} ${memory.contradicts} · ${t('missLabel')} ${memory.misses}`,
            )
          : null,
        shown.length === 0
          ? h('div', { className: 'br-note' }, t('chartEmpty'))
          : shown.map((decision, index) => {
              const share = decision.shares || { perception: 0, memory: 0, persona: 0 };
              const pct = (value) => `${Math.round(value * 100)}%`;
              const label = decision.title || decision.task || `#${index + 1}`;
              const dominant = decision.dominant
                ? t('legend' + decision.dominant.charAt(0).toUpperCase() + decision.dominant.slice(1))
                : null;
              const kind = decision.signal && decision.signal.kind;
              const signalText =
                kind === 'confirm' ? t('sigConfirm')
                  : kind === 'adjust' ? t('sigAdjust')
                    : kind === 'recheck' ? t('sigRecheck')
                      : null;
              const signalObject = decision.signal && decision.signal.object;
              return h(
                'div',
                { className: 'br-decision', key: `${decision.task || index}-${decision.ts || index}` },
                h(
                  'div',
                  { className: 'br-decision-head' },
                  /* 第几栏写出来：三栏依次排，最新在 1，不抢占也不重排 */
                  h('b', null, `${index + 1}. ${label}`),
                  h('span', null, shortDate(decision.ts)),
                ),
                h(
                  'div',
                  { className: 'br-stack', title: decision.reason || '' },
                  h('i', { className: 'br-seg is-perception', style: { width: pct(share.perception) } }),
                  h('i', { className: 'br-seg is-memory', style: { width: pct(share.memory) } }),
                  h('i', { className: 'br-seg is-persona', style: { width: pct(share.persona) } }),
                ),
                h(
                  'div',
                  { className: 'br-decision-meta' },
                  h(
                    'span',
                    null,
                    `${t('legendPerception')} ${pct(share.perception)} · ${t('legendMemory')} ${pct(share.memory)} · ` +
                      `${t('legendPersona')} ${pct(share.persona)}`,
                  ),
                  h(
                    'span',
                    { className: 'br-chips' },
                    dominant ? h('span', { className: 'br-chip is-dominant' }, `${t('dominantLabel')} · ${dominant}`) : null,
                    h(
                      'span',
                      { className: 'br-chip is-' + (decision.source === 'decision' ? 'manual' : 'auto') },
                      decision.source === 'decision' ? t('judgeManual') : t('judgeAuto'),
                    ),
                  ),
                ),
              );
            }),
        shown.length > 0 ? legend : null,
      );
    }

    function BudgetCard(props) {
      const { layers, t } = props;
      if (!layers || layers.length === 0) return null;
      return h(
        'div',
        { className: 'br-card' },
        h('h3', null, t('budgetTitle')),
        layers.map((layer) => {
          const hasBudget = typeof layer.budget === 'number' && layer.budget > 0;
          const ratio = hasBudget ? Math.min(1.2, layer.bytes / layer.budget) : 0;
          const width = Math.min(100, Math.round(ratio * 100));
          const level = ratio >= 1 ? 'is-over' : ratio >= 0.9 ? 'is-warn' : '';
          return h(
            'div',
            { className: 'br-metric', key: layer.id },
            h(
              'div',
              { className: 'br-metric-top' },
              h('span', null, layer.file),
              h('b', null, hasBudget ? `${layer.bytes} / ${layer.budget} ${t('unitBytes')}` : `${layer.bytes} ${t('unitBytes')}`),
            ),
            hasBudget ? h('div', { className: 'br-bar' }, h('i', { className: level, style: { width: `${width}%` } })) : null,
          );
        }),
      );
    }

    /* 设置页：整页替换（不开浮层）。左目录 + 右详情，左上角「← 返回」。
       口径照 047 那份 verify-settings-page 的原契约：齿轮 → 整页 → 返回。 */
    /* 设置页：整页替换（不开浮层）。左边「目录」，右边折叠卡片。
       口径照 047 那份 verify-settings-page 的原契约：齿轮 → 整页 → 返回。 */
    /* ---------- 设置页公用：体积、路径、只读文件浏览 ---------- */
    const FS_ENDPOINT = '/bluetide-rings/fs';
    const ACT_ENDPOINT = '/bluetide-rings/act';
    const TEXT_EXT = /\.(md|markdown|txt|json|ndjson|jsonl|ya?ml|toml)$/i;
    const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
    function fmtBytes(bytes) {
      if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) return '—';
      const value = Number(bytes);
      if (value < 1024) return `${value} B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
      return `${(value / 1024 / 1024).toFixed(1)} MB`;
    }
    /* 只读浏览窗：列目录、给绝对路径，改不了任何东西；弹在面板内，不跳资源管理器 */
    function FsBrowser(props) {
      const mode = props.mode || 'dir';
      const [path, setPath] = React.useState(props.start || props.root || '');
      const [state, setState] = React.useState({ status: 'loading', entries: [], parent: null, error: null });
      const [picked, setPicked] = React.useState(null);
      React.useEffect(() => {
        let alive = true;
        setState((prev) => ({ status: 'loading', entries: prev.entries || [], parent: prev.parent, error: null }));
        fetch(`${FS_ENDPOINT}?path=${encodeURIComponent(path)}`)
          .then((res) => res.json())
          .then((body) => {
            if (!alive) return;
            if (!body || body.ok === false) {
              setState({ status: 'error', entries: [], parent: null, error: (body && body.error) || '读不到这个目录' });
              return;
            }
            setState({ status: 'ready', entries: body.entries || [], parent: body.parent || null, error: null });
          })
          .catch((error) => {
            if (alive) setState({ status: 'error', entries: [], parent: null, error: String((error && error.message) || error) });
          });
        return () => { alive = false; };
      }, [path]);
      const canPick = mode !== 'dir' || props.allowDir === true;
      const filter = mode === 'text' ? TEXT_EXT : mode === 'image' ? IMAGE_EXT : null;
      const entries = state.entries || [];
      const shown = entries.filter((entry) => entry.dir || !filter || filter.test(entry.name));
      const hidden = entries.filter((entry) => !entry.dir && filter && !filter.test(entry.name)).length;
      const atRoot = Boolean(props.root) && path === props.root;
      const hint = mode === 'text' ? '只列文本与记录格式' : mode === 'image' ? '只列图片格式' : '只列目录和文件';
      const go = (target) => { if (target) { setPicked(null); setPath(target); } };
      const rootPath = props.root || '';
      const relPath = rootPath && String(path).toLowerCase().startsWith(String(rootPath).toLowerCase())
        ? String(path).slice(rootPath.length) : null;
      const crumbs = relPath === null
        ? (path ? [{ label: path, path }] : [])
        : [
          { label: rootPath.split(/[\\/]/).filter(Boolean).pop() || rootPath, path: rootPath },
          ...String(relPath).split(/[\\/]/).filter(Boolean).reduce((list, part) => {
            const prev = list.length ? list[list.length - 1].path : rootPath;
            return [...list, { label: part, path: `${prev}\\${part}` }];
          }, []),
        ];
      const shortcuts = (props.shortcuts || []).filter((item) => item && item.path);

      return h(
        'div',
        { className: 'br-root is-settings br-picker-page', role: 'dialog', 'aria-modal': 'true', 'aria-label': props.title || '文件浏览' },
        h('div', { className: 'br-picker-winbar' },
          h('div', { className: 'br-picker-dots', 'aria-hidden': true }, h('i', null), h('i', null), h('i', null)),
          h('b', null, props.title || '浏览'),
          h('span', { className: 'br-picker-badge' }, '只读'),
          h('button', { type: 'button', className: 'br-picker-x', onClick: props.onClose, 'aria-label': '关闭' }, h('span', { className: 'br-x' })),
        ),
        h('div', { className: 'br-picker-body' },
          h('aside', { className: 'br-picker-side' },
            h('div', { className: 'br-picker-side-title' }, '常用位置'),
            shortcuts.map((item) => h('button', {
              type: 'button',
              key: item.path,
              className: 'br-picker-shortcut' + (String(path).toLowerCase() === String(item.path).toLowerCase() ? ' is-active' : ''),
              title: item.path,
              onClick: () => go(item.path),
            }, h('span', { className: 'br-dir-mark', 'aria-hidden': true }), item.label)),
            h('div', { className: 'br-picker-side-title' }, '说明'),
            h('div', { className: 'br-picker-side-note' }, `${hint} · 只在本机找 · 不联网`),
          ),
          h('div', { className: 'br-picker-main' },
            h('nav', { className: 'br-picker-crumbs', 'aria-label': '当前位置' },
              crumbs.flatMap((crumb, index) => {
                const node = h('button', {
                  type: 'button',
                  key: `crumb-${crumb.path}`,
                  className: 'br-crumb' + (index === crumbs.length - 1 ? ' is-last' : ''),
                  title: crumb.path,
                  onClick: () => { if (index !== crumbs.length - 1) go(crumb.path); },
                }, crumb.label);
                return index === 0 ? [node] : [h('span', { key: `sep-${crumb.path}`, className: 'br-crumb-sep', 'aria-hidden': true }, '›'), node];
              }),
            ),
            h('div', { className: 'br-picker-colhead' }, h('span', null, '名称'), h('span', null, '大小')),
          h(
            'div',
            { className: 'br-picker-list' },
            h(
              'button',
              {
                type: 'button',
                className: 'br-picker-up',
                disabled: !state.parent || atRoot,
                onClick: () => { if (state.parent && !atRoot) { setPicked(null); setPath(state.parent); } },
              },
              h('span', { className: 'br-up-mark', 'aria-hidden': true }),
              '上一级',            ),
            state.status === 'loading' ? h('div', { className: 'br-picker-empty' }, '读取中…') : null,
            state.status === 'error' ? h('div', { className: 'br-picker-empty' }, state.error || '读不到') : null,
            state.status === 'ready' && shown.length === 0 ? h('div', { className: 'br-picker-empty' }, '这一层没有可列的东西') : null,
            shown.map((entry) =>
              entry.dir
                ? h(
                  'button',
                  {
                    type: 'button',
                    key: entry.path,
                    className: 'br-picker-enter',
                    onClick: () => { setPicked(null); setPath(entry.path); },
                  },
                  h('span', { className: 'br-dir-mark', 'aria-hidden': true }),
                  entry.name,
                )
                : mode === 'dir'
                  ? h('div', { key: entry.path, className: 'br-picker-item is-static' }, `${entry.name}`)
                  : h(
                    'button',
                    {
                      type: 'button',
                      key: entry.path,
                      className: 'br-picker-item' + (picked === entry.path ? ' is-picked' : ''),
                      onClick: () => setPicked(entry.path),
                    },
                    `${entry.name}`,
                    h('span', { className: 'br-picker-size' }, fmtBytes(entry.size)),
                  ),
            ),
          ),
          hidden > 0 ? h('div', { className: 'br-picker-hidden' }, `另有 ${hidden} 个不符的已隐藏`) : null,
          h('div', { className: 'br-picker-foot' },
            h('span', null, picked ? `已选：${picked.split(/[\\/]/).pop()}` : mode === 'dir' && props.allowDir ? `将使用这一层的目录：${String(path).split(/[\\/]/).filter(Boolean).pop() || path}` : '只读浏览 · 这里不能改任何东西'),
            !canPick || !props.onPick
              ? null
              : h('button', {
                type: 'button',
                className: 'br-picker-ok',
                disabled: mode === 'dir' ? !path : !picked,
                onClick: () => props.onPick(mode === 'dir' ? path : picked),
              }, props.okLabel || '选用'),
          ),
          ),
        ),
      );
    }

    function SettingsPage(props) {
      const data = props.data || {};
      const [tab, setTab] = React.useState('memory');
      const [open, setOpen] = React.useState({ source: false, temp: true, raw: false });
      const memory = data.memory || {};
      const rings = data.rings || {};
      const identity = data.identity || {};
      const toggleCard = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
      const show = (value, tail) => (value === undefined || value === null || value === '' ? '—' : `${value}${tail || ''}`);
      const rows = (items) =>
        h(
          'dl',
          { className: 'br-set-rows' },
          items.map(([label, value]) =>
            h('div', { className: 'br-set-row', key: label }, h('dt', null, label), h('dd', null, value))),
        );
      const card = (id, title, body, action) => {
        /* 只有截图里那两张默认收起；其余卡片默认展开，免得每页点开才看见内容 */
        const isOpen = open[id] === undefined ? (id !== 'source' && id !== 'raw') : open[id];
        return h(
          'section',
          { className: 'br-set-card' + (isOpen ? ' is-open' : ''), key: id },
          h(
            'button',
            {
              type: 'button',
              className: 'br-set-card-head',
              onClick: () => toggleCard(id),
              'aria-expanded': isOpen ? 'true' : 'false',
            },
            h('i', { 'aria-hidden': true }),
            h('b', null, title),
            h(
              'div',
              { className: 'br-set-head-right' },
              /* 信封按钮固定在右侧：一个卡片一个浏览入口，不再散在正文里 */
              action
                ? h(
                  'span',
                  {
                    className: 'br-env' + (action.disabled ? ' is-disabled' : ''),
                    role: 'button',
                    tabIndex: action.disabled ? -1 : 0,
                    title: action.title || action.label,
                    'aria-label': action.label,
                    'aria-disabled': action.disabled ? 'true' : undefined,
                    onClick: (event) => {
                      /* 卡片头本身是按钮，信封要拦冒泡，否则点浏览会把卡片一起折叠 */
                      if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
                      if (action.disabled) return;
                      action.onClick();
                    },
                  },
                  h('span', { className: 'br-env-mark', 'aria-hidden': true }),
                )
                : null,
              h('span', { className: 'br-set-arrow' + (isOpen ? ' is-open' : '') }),
            ),
          ),
          isOpen ? h('div', { className: 'br-set-body' }, ...(Array.isArray(body) ? body.filter(Boolean) : [body])) : null,
        );
      };

      const toc = [
        ['persona', '人格详情'],
        ['memory', '记忆空间'],
        ['rings', '三环负载'],
        ['net', '联网模式'],
        ['look', '形象管理'],
        ['peer', '关联插件'],
        ['log', '更新日志'],
      ];

      const setting = data.settings || {};
      /* 095：三环权重 v5——开关写 state，读数来自快照 */
              /* 按协议取值：协议不是 v5，就当作没有 v5 读数（而不是去读一个空字段） */
        const protocol = shareProtocolOf(data);
        const v5 = (protocol && protocol.name === 'v5') ? (data.ringWeightV5 || null) : null;
      const [v5On, setV5On] = React.useState(Boolean(data.ringWeightV5Enabled));
      /* 启动动画的播放时机：存在 localStorage，与 @local/bluetide-startup 共用同一个键。
         开关放在这里而不是 DSH 系统设置：你 2026-11-07 明确要「放在蓝潮设置这个目录里」。 */
      const STARTUP_KEY = 'bluetide.startup.mode';
      const readStartupMode = () => {
        try {
          const v = window.localStorage.getItem(STARTUP_KEY);
          return v === 'off' || v === 'always' ? v : 'daily';
        } catch (e) {
          return 'daily';
        }
      };
      const [startupMode, setStartupMode] = React.useState(readStartupMode);
      const chooseStartupMode = (next) => {
        setStartupMode(next);
        try {
          window.localStorage.setItem(STARTUP_KEY, next);
        } catch (e) {
          /* 写不进去也不该让设置页崩掉 */
        }
      };
      const toggleV5 = () => {
        const next = !v5On;
        setV5On(next);
        postAct({ action: 'ring-weight-v5', enabled: next }).then((body) => {
          if (!body || body.ok === false) setV5On(!next);
        });
      };
      const v5Name = (key) => (key === 'memory' ? '记忆' : key === 'persona' ? '人格' : '感知');
      const pet = setting.pet || {};
      /* 对等插件（语音）：三环单独装时它可能根本不在，快照给的是 state=missing */
      const voice = setting.voice || {};
      const peerStateText = (one) => (one && one.label ? one.label : '未安装');
      const persona = data.activePersona || {};
      const realRoot = setting.workspace || data.root || '';
      const [browse, setBrowse] = React.useState(null);
      const openBrowser = (title, start, mode) => setBrowse({ title, start: start || realRoot, mode: mode || 'dir', root: realRoot });

      /* ---------- 人格更改门禁（093）----------
         状态来自快照 setting.personaGuard；开关与替换都打 /act。
         界面只做提示：锁着时不开浏览器，真正挡人的是服务端。 */
      const guard0 = setting.personaGuard || {};
      const [guard, setGuard] = React.useState({
        unlocked: guard0.unlocked === true,
        hasWork: guard0.hasWork === true,
        taskIds: Array.isArray(guard0.taskIds) ? guard0.taskIds : [],
        rule: guard0.rule || '',
        checkedAt: guard0.checkedAt || null,
        busy: false,
        notice: null,
      });
      const [personaPick, setPersonaPick] = React.useState(null);
      const postAct = (payload) => fetch(ACT_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((res) => res.json().catch(() => ({}))).catch((error) => ({ ok: false, error: String((error && error.message) || error) }));
      const setGuardSwitch = (payload) => {
        if (guard.busy) return;
        setGuard((prev) => ({ ...prev, busy: true, notice: null }));
        postAct({ action: 'persona-guard', ...payload }).then((body) => {
          const next = (body && body.guard) || {};
          setGuard((prev) => ({
            ...prev,
            busy: false,
            unlocked: next.unlocked === true,
            hasWork: next.hasWork === true,
            taskIds: Array.isArray(next.taskIds) ? next.taskIds : prev.taskIds,
            notice: body && body.ok === false
              ? String(body.error || '没成功')
              : (next.unlocked
                ? `已解锁${body && body.backup ? `，备份在 ${body.backup}` : ''}：可以浏览、替换人格了。`
                : '已锁上：人格目录对界面关闭。'),
          }));
        });
      };
      /* 换整套人格：选一个目录（里面放六份人格文件），服务端校验齐全才换 */
      const openBundlePicker = () => {
        if (!guard.unlocked) {
          setGuard((prev) => ({ ...prev, notice: '人格更改是锁着的：先在上面的「人格更改 · 门禁」解锁。' }));
          return;
        }
        setPersonaPick({ bundle: true });
        setBrowse({ title: '换整套人格 · 选目录', start: realRoot, mode: 'dir', allowDir: true, root: realRoot, pickKind: 'bundle' });
      };
      /* 锁着时不开浏览窗：这里少点一次，服务端也少一次 403 */
      const openPersonaBrowser = (title, start, pick) => {
        if (!guard.unlocked) {
          setGuard((prev) => ({ ...prev, notice: '人格更改是锁着的：先在上面的「人格更改 · 门禁」解锁。' }));
          return;
        }
        setPersonaPick(pick || null);
        setBrowse({ title, start: start || realRoot, mode: 'text', root: realRoot });
      };
      /* 整套人格替换（093）：人格是账号级绑定，只能整套换。
         先把当前这套打成「完整自我」备份，再整目录替换；失败提示备份位置。 */
      const switchPersonaBundle = (path) => {
        setPersonaPick(null);
        setBrowse(null);
        setGuard((prev) => ({ ...prev, busy: true, notice: '正在换整套人格…（先做完整自我备份）' }));
        postAct({ action: 'persona-bundle', path }).then((body) => {
          /* 换成了：界面清零，等新人格第一次生效时再显示（你 22:05） */
          if (body && body.ok && typeof props.onPersonaSwitched === 'function') props.onPersonaSwitched(body);
          setGuard((prev) => ({
            ...prev,
            busy: false,
            notice: body && body.ok
              ? `整套已替换：${(body.copied || []).length} 份人格文件${body.backup ? `；换之前备份在 ${body.backup}` : ''}`
              : String((body && body.error) || '替换失败'),
          }));
        });
      };
      /* 锁定态要**看起来就是禁用**：以前点击被门禁静默吞掉，你以为按钮是假的 */
      const linkBtn = (label, onClick, opts = {}) =>
        h('button', {
          type: 'button',
          className: 'br-set-link' + (opts.disabled ? ' is-disabled' : ''),
          key: label,
          onClick,
          disabled: opts.disabled === true,
          title: opts.title || undefined,
        }, label);
      const personaLockedTip = '先解锁「人格更改 · 门禁」：锁着时人格目录与替换都不开';
      const personaEntryOpts = guard.unlocked ? {} : { disabled: true, title: personaLockedTip };
      const paths = (list) =>
        h('div', { className: 'br-set-paths' }, list.filter(Boolean).map((line, index) => h('div', { className: 'br-set-path', key: `${index}-${line}` }, line)));

      const slots = setting.personaSlots || [];
      const memFiles = setting.memoryFiles || [];
      const today = setting.today || {};
      const load = {
        perception: Number(today.perception) || 0,
        memory: Number(today.memory) || 0,
        persona: Number(today.persona) || 0,
        feedback: Number(today.feedback) || 0,
      };
      const total = load.perception + load.memory + load.persona;
      const share = (value) => (total > 0 ? Math.round((value / total) * 100) : 0);
      const top = [['perception', '感知'], ['memory', '记忆'], ['persona', '人格']]
        .sort((a, b) => load[b[0]] - load[a[0]])[0];
      const figures = [
        ['perception', '感知', 'is-perception'],
        ['memory', '记忆', 'is-memory'],
        ['persona', '人格', 'is-persona'],
      ];

      const body = {
        persona: () => [
          /* 097：空装引导。插件不自带人格——新机器上六份人格层全缺时，
             这里必须给出两条可走的路，而不是让用户对着一排空槽发愣。 */
          (() => {
            const missing = (slots || []).filter((slot) => !slot.exists).map((slot) => slot.file);
            if (!slots || !slots.length || missing.length !== slots.length) return null;
            return card('empty', '还没有人格（空装状态）', [
              h('p', { className: 'br-set-empty' }, '这个插件不自带人格。六份人格层文件目前都不存在，任选一条开始：'),
              rows([
                ['路径一 · 导入', '解锁后点「浏览人格目录」，选文件导入（≤512 KB）'],
                ['路径二 · 让 DSH 写', '直接对 DSH 说「给我写一份人格」，它会把这六份文件写进人格目录'],
              ]),
              h('div', { className: 'br-set-empty' }, `缺失：${missing.join('、')}`),
            ]);
          })(),
          card('guard', '人格更改 · 门禁', [
            h('div', { className: 'br-switch' },
              h('div', { className: 'br-switch-copy' },
                h('b', null, '允许修改人格（打开即自动备份）',
                  h('span', { className: 'br-switch-pill ' + (guard.unlocked ? 'is-open' : 'is-locked') }, guard.unlocked ? '已解锁' : '已锁')),
                h('span', null, guard.hasWork
                  ? `${guard.workText || '正在做任务'}：可以解锁，但改动会立即生效，先确认已备份。`
                  : guard.unlocked
                    ? '已解锁：替换人格前会先做一次完整自我备份；用完记得锁回去。'
                    : '默认关。开时先备份完整自我，再放开人格浏览与替换。'),
              ),
              h('div', {
                className: 'br-switch-track' + (guard.unlocked ? ' is-on' : ''),
                role: 'switch',
                tabIndex: 0,
                'aria-checked': guard.unlocked ? 'true' : 'false',
                'aria-disabled': guard.busy ? 'true' : 'false',
                title: guard.unlocked ? '点一下锁上' : (guard.hasWork ? '有任务在进行中，仍可解锁' : '点一下解锁并备份'),
                onClick: () => { if (guard.busy) return; setGuardSwitch({ enabled: !guard.unlocked }); },
              }),
            ),
            guard.notice ? h('div', { className: 'br-notice' }, guard.notice) : null,
            rows([
              ['本次检测', guard.workText || (guard.hasWork ? '正在做任务' : '没有正在进行的工作任务')],
            ]),
          ]),
          card('p1', '身份', rows([
            ['名称', show(identity['名称'] || identity.name)],
            ['自称', show(identity['自称'] || identity.selfCall)],
            ['种族', show(identity['种族'] || identity.race)],
          ])),
          card('p2', '目前搭载的人格', [
            rows([
              ['来源文件', show(persona.path)],
              ['内置', persona.isDefault ? '是 · 内置身份文件' : '否 · 工作区里另选的'],
              ['体积', fmtBytes(persona.bytes)],
            ]),
            paths([persona.path]),
          ], { label: '浏览人格目录', onClick: () => openPersonaBrowser('人格文件', persona.baseDir || realRoot), ...(guard.unlocked ? {} : { disabled: true, title: personaLockedTip }) }),
          card('p4', '人格包', [
            h('p', { className: 'br-set-say' }, '一个人格是一整套：六层 + 自带经验，只能整套换。整套切换接口下一轮做。'),
            h('div', { className: 'br-set-actions' },
              linkBtn('换整套人格（选目录）', openBundlePicker, personaEntryOpts),
            ),
            slots.length
              ? h('div', { className: 'br-slots' }, slots.map((slot) => h('div', { className: 'br-slot', key: slot.id },
                h('div', { className: 'br-slot-copy' },
                  h('b', null, slot.file),
                  h('span', null, `${slot.exists ? '在' : '缺'} · ${fmtBytes(slot.bytes)} · ${slot.id}`),
                ),
              )))
              : h('div', { className: 'br-set-empty' }, '没读到人格文件'),
          ]),
        ],
        /* 关联插件：结构与「桌宠联动窗口」「语音插件」一致——br-win 卡 + rows。
           启动动画是三环之外的对等插件，开关写 localStorage，它读同一个键。 */
        peer: () => {
          const modeLabel = startupMode === 'off' ? '已关闭'
            : startupMode === 'always' ? '每次启动' : '每天第一次';
          const seg = (id, label) => h('button', {
            key: id,
            type: 'button',
            onClick: () => chooseStartupMode(id),
            style: {
              appearance: 'none', font: 'inherit', cursor: 'pointer',
              padding: '6px 12px', borderRadius: 6, fontSize: 13,
              border: '1px solid ' + (startupMode === id ? '#d8b45f' : 'rgba(128,128,128,.28)'),
              background: startupMode === id ? 'rgba(216,180,95,.14)' : 'transparent',
              color: startupMode === id ? '#d8b45f' : 'inherit',
            },
          }, label);
          return [
          /* 桌宠卡：没装就只说话，不摆空版本号、不给浏览按钮（点进去是空目录＝骗人） */
          card('petwin', '桌宠联动窗口', pet.installed
            ? [
              h('div', { className: 'br-win' },
                h('div', { className: 'br-win-head' },
                  h('i', { 'aria-hidden': true }),
                  h('b', null, '蓝潮桌宠'),
                  h('span', { className: 'br-win-state' }, pet.enabled ? '已开启' : '装了 · 没开'),
                ),
                rows([
                  ['版本', show(pet.version)],
                  ['当前形象', show(pet.imagePath || pet.avatar || '内置立绘')],
                ]),
              ),
            ]
            : [h('div', { className: 'br-set-empty' }, '未安装桌宠插件 · 装好重启后显示状态')],
          pet.installed
            ? { label: '浏览桌宠目录', onClick: () => openBrowser('桌宠插件目录', pet.dir, 'image') }
            : {}),
          /* 语音卡：三环可以单独装，所以这里必须自己判断在不在 */
          card('voice', '语音插件', voice.installed
            ? [
              h('div', { className: 'br-win' },
                h('div', { className: 'br-win-head' },
                  h('i', { 'aria-hidden': true }),
                  h('b', null, '蓝潮语音'),
                  h('span', { className: 'br-win-state' }, peerStateText(voice)),
                ),
                rows([
                  ['版本', show(voice.version)],
                  ['目录', show(voice.dir)],
                ]),
              ),
            ]
            : [h('div', { className: 'br-set-empty' }, '未检测到语音插件 · 装好重启后显示状态')],
          voice.installed
            ? { label: '浏览语音目录', onClick: () => openBrowser('语音插件目录', voice.dir, 'dir') }
            : {}),
            card('startup', '启动动画', [
              h('div', { className: 'br-win' },
                h('div', { className: 'br-win-head' },
                  h('i', { 'aria-hidden': true }),
                  h('b', null, '蓝潮启动动画'),
                  h('span', { className: 'br-win-state' }, modeLabel),
                ),
                rows([
                  ['插件', '@local/bluetide-startup'],
                  ['版本', '0.1.0'],
                  ['联动通道', 'localStorage · bluetide.startup.mode'],
                  ['检测间隔', '每 20 秒探一次三环数据端点'],
                ]),
              ),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 } },
                seg('off', '不播放'),
                seg('daily', '每天第一次'),
                seg('always', '每次启动'),
              ),
              h('p', { className: 'br-set-say' },
                startupMode === 'off'
                  ? '关掉后启动直接进入界面，不播动画。'
                  : startupMode === 'always'
                    ? '每次打开或刷新都会播一遍。'
                    : '同一天只播一次，刷新不重复。'),
            ]),
          ];
        },
        memory: () => [
          card('source', '长期记忆', [
            rows([
              ['长期记忆文件大小', `${fmtBytes(memFiles.reduce((sum, file) => sum + (Number(file.bytes) || 0), 0))} · ${memFiles.length} 个文件`],
              ['条目总数', `${memFiles.reduce((sum, file) => sum + (Number(file.rows) || 0), 0)} 条`],
            ]),
          ], { label: '浏览记忆目录', onClick: () => openBrowser('记忆记录目录', memFiles[0] && memFiles[0].dir, 'text') }),
          card('temp', '临时记忆', rows([
            /* 待确认→未验证 · 冷却中：数字数的是三环里没被验证、已降档的条目，不是待办队列 */
            ['未验证 · 冷却中（三环合计）', show(memory.pending)],
            ['暂存', show(memory.staging)],
            ['已归档', show(memory.archived)],
          ]), { label: '浏览备份目录', onClick: () => openBrowser('备份目录', setting.backupRoot, 'dir') }),
        ],
        rings: () => {
          /* 口径（你定）：设置页才是「最近三次」的合计口径——
             最近三次任务的单位相加再归一化，得出三环负载，再指出最高那一环。
             别按单任务拆栏，也别在这里算别的。 */
          const mix = (data.stats && data.stats.taskMix) || {};
          const rowsMix = Array.isArray(mix.rows) ? mix.rows : [];
          /* 三个名字三件事（2026-11-05 定）：
             ringShare = 三环占比（唯一口径，来自 stats.taskMix.shares，背后是 v5 的 g 均值）；
             ringUnits = 计数（只写账，不当占比）；
             ringBias  = 检索偏置（ringBiasFromG，面板不展示）。
             别再让 v5.avgNext 顶到占比位置上——那条链只是检索权重。 */
                      /* 同上：协议对不上就当没有，下游的 usable() 会自然走降级分支 */
            const protocol = shareProtocolOf(data);
            const v5raw = (protocol && protocol.name === 'v5') ? (data.ringWeightV5 || null) : null;
          const usable = (obj) => Boolean(obj) && ['perception', 'memory', 'persona']
            .every((key) => Number.isFinite(Number(obj[key])));
          /* 占比取 mix.shares；而 mix.shares 内部是「v5 权重（g）的均值」，
             不是纯计数——所以来源标签必须写「三环权重」，不能写「工单计数」。
             （2026-11-05 修：标签写的是工单计数、数字却是权重，两者不符。）
             v5 的当轮 g 只在没有工单时兜底，并如实标注「不是占比」。 */
          const shares = usable(mix.shares) ? mix.shares
            : usable(v5raw && v5raw.g) ? v5raw.g
              : {};
          const shareSource = usable(mix.shares) ? `三环权重 · 最近${mix.count ? mix.count + '轮' : '三次'}`
            : usable(v5raw && v5raw.g) ? '检索偏置兜底（不是占比）'
              : '暂无数据';
          /* 没带任务名的工单不进「最近三次」：宿主已经把它们挑出去了，这里照实说明有几轮 */
          const unnamed = mix.unnamed && typeof mix.unnamed === 'object' ? mix.unnamed : { rows: 0 };
          const pct = (key) => Math.round((Number(shares[key]) || 0) * 100);
          /* 次数优先：调用次数天然会浮动，百分比在三环各一次时必然相等，不该当主展示 */
          const latestCounts = (rowsMix[0] && rowsMix[0].counts) || null;
          const cnt = (key) => (latestCounts && Number(latestCounts[key]) >= 0 ? Number(latestCounts[key]) : null);
          const barNum = (key) => (cnt(key) === null ? `${pct(key)}%` : `${cnt(key)} 次 · ${pct(key)}%`);
          const dominantKey = mix.dominant || (pct('persona') >= pct('memory') && pct('persona') >= pct('perception')
            ? 'persona'
            : pct('memory') >= pct('perception') ? 'memory' : 'perception');
          const dominantName = dominantKey === 'memory' ? '记忆' : dominantKey === 'persona' ? '人格' : '感知';
          const scope = rowsMix.map((row) => row.label || row.task).filter(Boolean);
          return [
            card('load', '三环负载 · 最近三次任务', [
              rowsMix.length
                ? h('div', { className: 'br-bars' }, figures.map(([key, label, cls]) =>
                  h('div', { className: 'br-bar-row', key },
                    h('span', { className: 'br-bar-label' }, label),
                    h('span', { className: 'br-bar' }, h('i', { className: cls, style: { width: `${pct(key)}%` } })),
                    h('span', { className: 'br-bar-num' }, barNum(key)),
                  )))
                : h('div', { className: 'br-set-empty' }, '最近三次任务还没有统计'),
              /* 095：v5 环权重——一个开关，读数只在开且跑过一轮后出现 */
              h('div', { className: 'br-switch' },
                h('div', { className: 'br-switch-copy' },
                  h('b', null, '三环权重 v5（精度加权 + 门控 + 均衡）',
                    h('span', { className: 'br-switch-pill ' + (v5On ? 'is-open' : 'is-locked') }, v5On ? '开' : '关')),
                  h('span', null, v5On
                    ? '每轮按「这一环多可信」算权重，长期均值被均衡项拉回，不靠计数硬凑。'
                    : '关着时行为与今天一致；打开后下一轮开始记录。'),
                ),
                h('div', {
                  className: 'br-switch-track' + (v5On ? ' is-on' : ''),
                  role: 'switch',
                  tabIndex: 0,
                  'aria-checked': v5On ? 'true' : 'false',
                  title: v5On ? '点一下关掉' : '点一下打开',
                  onClick: toggleV5,
                }),
              ),
              v5
                ? rows([
                  ['v5 环权重', ['perception', 'memory', 'persona'].map((key) => `${v5Name(key)} ${Math.round((Number(v5.g[key]) || 0) * 100)}%`).join(' · ')],
                  ['主导（只显示）', v5Name(v5.dominant)],
                  ['偏置强度', `${Number(v5.biasStrength || 0).toFixed(2)} / 1`],
                  ['更新于', String(v5.at || '').replace('T', ' ').slice(0, 19) || '—'],
                ])
                : h('div', { className: 'br-set-empty' }, v5On ? 'v5 已开，等下一轮结束才会出现读数' : 'v5 关着'),
              /* 口径自证：上面三条占比条到底读的是哪一路数据，写在这里，别让人猜 */
              h('div', { className: 'br-set-empty' },
                `占比条口径：${shareSource}（感知 ${pct('perception')}% · 记忆 ${pct('memory')}% · 人格 ${pct('persona')}%）`),
              rows([
                /* 调用率口径：只显示次数，不显示百分比；没统计到写「—」，不写 0 冒充 */
                ['本轮调用次数', (() => {
                  const row = rowsMix[0];
                  const c = row && row.counts;
                  if (!c) return '—';
                  return `感知 ${c.perception} 次 · 记忆 ${c.memory} 次 · 人格 ${c.persona} 次（合计 ${c.total}）`;
                })()],
                ['最近三轮调用次数', rowsMix.length
                  ? rowsMix.slice(0, 3).map((row) => {
                    const c = row && row.counts;
                    const label = row.label || row.task;
                    return c ? `${label}：感知${c.perception}/记忆${c.memory}/人格${c.persona}` : `${label}：未统计`;
                  }).join('；')
                  : '—'],
                ['反馈环今天', `${load.feedback} 条`],
              ]),
            ]),
          ];
        },
        net: () => [
          card('n1', '数据源', rows([
            ['快照', ENDPOINT],
            ['方式', '本机回环 · 只读拉取 · 30 秒一轮'],
            ['对外请求', '无（不出本机）'],
            ['作者', (data.settings && data.settings.credits && `${data.settings.credits.author}（${data.settings.credits.handle}）`) || '砚尘dust（@Atorias-Xuan）'],
            ['许可', (data.settings && data.settings.credits && data.settings.credits.license) || 'GPL-3.0-or-later'],
            ['问题反馈', (data.settings && data.settings.credits && data.settings.credits.handle) || '@Atorias-Xuan'],
          ])),
        ],
        look: () => [
          card('figure', '当前形象', h('div', { className: 'br-pose' },
            /* 立绘在左、信息在右 */
            h('div', { className: 'br-pose-art' },
              pet.imageKind && pet.imageKind !== 'none'
                ? h('img', { className: 'br-pet-figure', src: pet.imageUrl, alt: '桌宠当前形象' })
                : h('div', { className: 'br-set-empty' }, '还没取到桌宠形象'),
            ),
            h('div', { className: 'br-pose-info' }, rows([
              ['来源', show(pet.imageSource)],
              ['尺寸', pet.imageSize && pet.imageSize.width ? `${pet.imageSize.width}×${pet.imageSize.height}` : '—'],
              ['配置文件', show(pet.avatarConfig)],
            ])),
          )),
          card('colors', '界面颜色', [
            h('div', { className: 'br-swatches' }, [
              ['perception', '感知', '#cdd2d9'],
              ['memory', '记忆', '#c04a58'],
              ['persona', '人格', '#d8b45f'],
              ['feedback', '反馈', '#8d97a3'],
            ].map(([key, label, color]) =>
              h('div', { className: 'br-swatch', key },
                h('i', { style: { background: color } }),
                h('span', null, label),
              ))),
            h('p', { className: 'br-set-say' }, '面板唯一色板：环图、占比条、边框都用它。要换色跟我说。'),
          ]),
          card('infobar', '信息栏变色边框', [
            h('div', { className: 'br-infobar-sample' },
              h('span', null, '蓝潮 · 信息栏'),
              h('em', null, '边框按三环取色，会随占比变'),
            ),
            h('p', { className: 'br-set-say' }, '边框是渐变收边：左端取当前主导环的颜色，右端淡出。'),
          ]),
        ],
        log: () => [
          card('g1', '版本', rows([
            ['版本', show(data.version)],
            ['构建编号', show((data.settings && data.settings.credits && data.settings.credits.build) || '—')],
            ['作者', show((data.settings && data.settings.credits && `${data.settings.credits.author}（${data.settings.credits.handle}）`) || '砚尘dust（@Atorias-Xuan）')],
            ['许可', show((data.settings && data.settings.credits && data.settings.credits.license) || 'GPL-3.0-or-later')],
            ['快照', show(data.stamp)],
            /* 情绪一眼可见：做「骂两句看变化」的测试时，这行就是观测点 */
            ['情绪', (() => {
              const a = data.affect;
              if (!a) return '暂无（还没跑过一轮）';
              const sign = Number(a.valence) >= 0 ? '+' : '';
              const inner = a.inner ? ` · 我的底 ${a.inner.label}${Number(a.inner.valence) >= 0 ? '+' : ''}${a.inner.valence}` : '';
              return `${a.label || '平稳'} ${sign}${a.valence} · 唤醒 ${a.arousal}${inner}`;
            })()],
            ['生成', show(data.generatedAt)],
          ])),
          card('g2', '最近完成', (() => {
            const done = (data.execution || []).filter((row) => row && row.title).slice(0, 6);
            if (!done.length) return rows([['说明', '还没有执行记录']]);
            return rows(done.map((row) => [
              row.task || '—',
              String(row.title).length > 34 ? String(row.title).slice(0, 34) + '…' : String(row.title),
            ]));
          })()),
        ],
      };

      /* 浏览窗整页接管面板（093 你 21:02 指正）：不是浮层、不是半页、不铺深色遮罩。
         跟真正的文件对话框一样：整块面板换成一个带窗口头的页面，关掉就回到设置页。 */
      if (browse) {
        /* 21:17 你截图：整页没有任何样式，按钮全裸。
           根因：整页替换分支把 `<style>` 节点漏了——设置页那份在 return 里，这条分支没带。
           教训写进注释：**每个整页分支各自带一份 CSS**，谁渲染谁带。 */
        return h('div', { className: 'br-picker-host' },
          h('style', null, CSS),
          h(FsBrowser, {
            ...browse,
            /* 左栏「常用位置」：工作区 / 人格目录 / 备份 / 记忆记录，拿快照里现成的路径 */
            shortcuts: [
              { label: '工作区', path: realRoot },
              { label: '人格目录', path: setting.personaRoot },
              { label: '备份', path: setting.backupRoot },
              { label: '记忆记录', path: setting.dirs && setting.dirs.memory },
              { label: '感知记录', path: setting.dirs && setting.dirs.perception },
            ].filter((item) => item.path),
            onClose: () => { setBrowse(null); setPersonaPick(null); },
            onPick: personaPick && personaPick.bundle ? (path) => switchPersonaBundle(path) : undefined,
            okLabel: '用这一套替换',
          }),
        );
      }
      return h(
        'div',
        { className: 'br-root is-settings' },
        /* 样式节点原来只挂在主面板末尾，整页替换把它一起跳过了——设置页因此裸奔。
           每个分支各自带一份，谁渲染谁带样式。 */
        h('style', null, CSS),
        h(
          'div',
          { className: 'br-set-headline' },
          h('button', { type: 'button', className: 'br-back', onClick: props.onBack }, '← 返回'),
          h('h2', { className: 'br-set-title' }, '蓝潮 · 设置'),
        ),
        h(
          'div',
          { className: 'br-set-page' },
          h(
            'nav',
            { className: 'br-set-toc' },
            h('div', { className: 'br-set-toc-title' }, '目录'),
            toc.map(([id, label]) =>
              h(
                'button',
                {
                  key: id,
                  type: 'button',
                  className: 'br-set-toc-item' + (tab === id ? ' is-active' : ''),
                  onClick: () => setTab(id),
                },
                label,
              ),
            ),
          ),
          h('section', { className: 'br-set-main' }, (body[tab] || body.memory)()),
        ),
      );
    }

    function RingsPanel(props) {
      const ctx = props.ctx;
      const t = props.t;
      const [snapshot, setSnapshot] = React.useState({ status: 'loading', data: null, error: null, offline: false });
      const [selected, setSelected] = React.useState('executive');
      const [attempt, setAttempt] = React.useState(0);
      /* 两种模式各记各的折叠状态：专业模式的侧栏不受常规模式操作影响 */
      const [sideFlags, setSideFlags] = React.useState(() => ({
        pro: readFlag(KEY_SIDE, true),
        regular: readFlag(KEY_SIDE_REGULAR, true),
      }));
      const [workOpen, setWorkOpen] = React.useState(() => readFlag(KEY_WORK, true));
      const [seen, setSeen] = React.useState(readSeen);
      const [shownChanges, setShownChanges] = React.useState([]);
      const [mode, setMode] = React.useState(readMode);
      const [hovered, setHovered] = React.useState(null);
      /* 设置页：齿轮点开整页替换，不是浮层 */
      const [settingsOpen, setSettingsOpen] = React.useState(false);
      const pro = mode === 'pro';
      const sideOpen = Boolean(sideFlags[pro ? 'pro' : 'regular']);
      const pickMode = (next) => {
        setMode(next);
        writeMode(next);
      };

      React.useEffect(() => {
        let alive = true;
        /* 刷新时不清空：保留旧数据，避免面板闪一下白 */
        setSnapshot((prev) => (prev && prev.data ? prev : { status: 'loading', data: null, error: null, offline: false }));
        fetch(ENDPOINT, { headers: { accept: 'application/json' }, cache: 'no-store' })
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
          })
          .then((data) => {
            if (!alive) return;
            if (!data || data.ok !== true) throw new Error((data && data.error) || 'bad payload');
            const live = Boolean(data.rings) && Array.isArray(data.decisions);
            const merged = {
              ...data,
              rings: data.rings || SNAPSHOT.rings,
              decisions: Array.isArray(data.decisions) ? data.decisions : SNAPSHOT.decisions,
              execution: Array.isArray(data.execution) ? data.execution : SNAPSHOT.execution || [],
              stats: data.stats || SNAPSHOT.stats || null,
            };
            setSnapshot({ status: 'ready', data: merged, error: null, offline: !live, fetchedAt: Date.now() });
          })
          .catch((error) => {
            if (!alive) return;
            setSnapshot({
              status: 'error',
              data: {
                rings: SNAPSHOT.rings,
                decisions: SNAPSHOT.decisions,
                execution: SNAPSHOT.execution || [],
                stats: SNAPSHOT.stats || null,
              },
              error: String((error && error.message) || error),
              offline: true,
            });
          });
        return () => {
          alive = false;
        };
      }, [attempt]);

      /* 回到页面时静默重取一次：面板一直开着也能跟上新数据 */
      React.useEffect(() => {
        if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return undefined;
        const onVisible = () => {
          if (document.visibilityState === 'visible') setAttempt((value) => value + 1);
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
      }, []);

      /* 实时同步：每 30 秒静默重取（保留旧数据，不闪白） */
      React.useEffect(() => {
        if (typeof setInterval !== 'function') return undefined;
        const timer = setInterval(() => setAttempt((value) => value + 1), 30000);
        if (timer && typeof timer.unref === 'function') timer.unref();
        return () => {
          if (typeof clearInterval === 'function') clearInterval(timer);
        };
      }, []);

      /* 面板宽度自适应（2026-11-09）：媒体查询看的是视口，可面板被挤在侧栏里，
         窗口最大化时视口很宽、面板只有 900px —— 断点永远不触发，两张卡一直挤着并排。
         这里直接观测根节点宽度，窄了就打 is-narrow 换成上下排列。
         阈值取 1000：你实测 933 宽的窗口下面板约 900，那个宽度两卡并排已经很挤；
         720 太低，900 的面板照样并排 —— 第一版就是卡在这儿没生效。 */
      const rootRef = React.useRef(null);
      const [narrow, setNarrow] = React.useState(false);
      React.useEffect(() => {
        const el = rootRef.current;
        if (!el) return undefined;
        /* 2026-11-09（你指出）：非最大化时会时不时闪回「占比卡 + 环图」并排。
           根因两条：
             1) ResizeObserver 在折叠 / 重绘的瞬间会报 contentRect.width = 0，
                原逻辑要求 width > 0 才算窄 —— 0 被当成「不窄」，立刻恢复并排，闪一下；
             2) 只按宽度判，不看窗口状态：拖窗口时面板宽度在 980~1050 之间来回跳，
                正好卡在阈值上，于是来回换。
           你给的办法更稳：先看窗口有没有最大化。
             非最大化 → 一律上下排列（屏幕就那么大，面板再宽也不该并排）
             最大化   → 再看面板自身宽度决定并排还是上下
           宽度读到 0 或异常时保持上一次判断，不用它覆盖 —— 这是治闪烁的关键。 */
        const isMaximized = () => {
          try {
            if (typeof window === 'undefined') return false;
            const scr = window.screen || {};
            const sw = Number(scr.availWidth) || 0;
            const sh = Number(scr.availHeight) || 0;
            const ow = Number(window.outerWidth) || 0;
            const oh = Number(window.outerHeight) || 0;
            if (!sw || !sh || !ow || !oh) return false;
            /* 容差 8px：Windows 最大化时 outer 与 avail 常有几个像素的边框/阴影差。
               宁可把「差几个像素」也当最大化（此时再看面板宽度决定），
               也不要把真最大化误判成否 —— 后者会让宽屏也用上下排列。 */
            return (sw - ow) <= 8 && (sh - oh) <= 8;
          } catch { return false; }
        };
        const apply = (width) => {
          if (!isMaximized()) { setNarrow(true); return; }    // 非最大化 → 强制上下
          if (!Number.isFinite(width) || width <= 0) return;  // 宽度无效 → 保持不动，别闪
          setNarrow(width < 1000);
        };
        const measure = () => {
          let w = 0;
          try { w = el.getBoundingClientRect().width; } catch { w = 0; }
          apply(w);
        };
        measure();
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          window.addEventListener('resize', measure);
        }
        let ro = null;
        if (typeof ResizeObserver === 'function') {
          ro = new ResizeObserver((entries) => {
            for (const entry of entries) apply(entry.contentRect && entry.contentRect.width);
          });
          ro.observe(el);
        }
        return () => {
          if (ro) ro.disconnect();
          if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
            window.removeEventListener('resize', measure);
          }
        };
      }, []);

      const data = snapshot.data;
      /* 2026-11-09（主人）：没有人格搭载时，插件界面灰掉并显示「未生效」。
         人格 = 设定（明确的身份 / 性格），不是随便一条记录；
         这里用「人格区有没有真实条目」判定 —— count 为 0 就是还没建立。 */
      const personaReady = Number((data && data.rings && data.rings.persona && data.rings.persona.count) || 0) > 0;
      const identity = (data && data.identity) || {};
      const layers = (data && data.layers) || [];
      const governance = (data && data.governance) || {};
      const organs = (data && data.organs) || [];
      const experience = (data && data.experience) || {};
      const rings = (data && data.rings) || {};
      const stats = (data && data.stats) || null;
      const decisions = (data && data.decisions) || [];
      const execution = (data && data.execution) || [];
      /* 决策 = 自动决策（每轮）+ 真裁定；决策圆、占比图、决策统计都读这一份 */
      const judgments = (stats && stats.judgements && Array.isArray(stats.judgements.rows)) ? stats.judgements.rows : [];
      /* 单个任务的决策：一行一张工单快照，各算各的占比。
         以前这里还有一条「最近三个任务合计」的汇总行——你没有要过合计，
         合计算出来的数也不是任何一个任务的占比，已删。 */
      const taskMix = (stats && stats.taskMix && stats.taskMix.count > 0) ? stats.taskMix : null;
      const chartRows =
        taskMix && Array.isArray(taskMix.rows) && taskMix.rows.length > 0
          ? taskMix.rows
          : judgments;
      /* 070 的口径：决策明细与占比图读同一份数据 —— 一个块里不许有两套数。 */
      const decisionRows = chartRows.length > 0 ? chartRows : decisions;
      const latestDecision = chartRows[0] || decisions[0];

      /* 变化：上次查看之后新增的条目（最多 3 条）。气泡与「变化」条目共用这一份。 */
      const changesOf = (ring) =>
        ((rings[ring] && rings[ring].items) || [])
          .filter((item) => !seen[ring] || String(item.ts || '') > String(seen[ring]))
          .slice(0, 3);

      /* 看过的环：把已读水位推到该环最新一条，气泡随之消失。
         变化条目要先快照再看水位，否则「刚点开就变成暂无变化」。 */
      const pick = (id) => {
        setSelected(id);
        setShownChanges(id === 'executive' ? [] : changesOf(id));
        if (id === 'executive') return;
        const items = (rings[id] && rings[id].items) || [];
        const latest = items.reduce((max, item) => (item.ts && String(item.ts) > String(max) ? item.ts : max), '');
        if (!latest) return;
        setSeen((prev) => {
          if (String(prev[id] || '') >= String(latest)) return prev;
          const next = { ...prev, [id]: latest };
          writeSeen(next);
          return next;
        });
      };

      const ringLabelKey = {
        perception: 'ringPerception',
        memory: 'ringMemory',
        persona: 'ringPersona',
        executive: 'decisionLabel',
        feedback: 'ringFeedback',
      };
      const latestDominant = latestDecision && latestDecision.dominant
        ? t('legend' + latestDecision.dominant.charAt(0).toUpperCase() + latestDecision.dominant.slice(1))
        : null;
      const orbTint = ORB_TINT[latestDecision && latestDecision.dominant] || ARC_COLORS.persona;

      const identityRows = [
        ['iName', identity['名称']],
        ['iAlias', identity['自称']],
        ['iSpecies', identity['种族']],
        ['iGender', identity['性别']],
        ['iModes', identity['模式']],
        ['iCarrier', identity['载体']],
      ].filter((row) => row[1]);

      const ringDetail = {
        perception: ['dPerceptionIn', 'dPerceptionOut', 'dPerceptionNot'],
        memory: ['dMemoryIn', 'dMemoryOut', 'dMemoryNot'],
        persona: ['dPersonaIn', 'dPersonaOut', 'dPersonaNot'],
        executive: ['dExecutiveIn', 'dExecutiveOut', 'dExecutiveNot'],
        feedback: ['dFeedbackIn', 'dFeedbackOut', 'dFeedbackNot'],
      }[selected] || ['dExecutiveIn', 'dExecutiveOut', 'dExecutiveNot'];

      /* 加载态：用与成品同结构的骨架占位（同网格、同宽度、卡片等高），
         数据到了只换内容不动布局——信息栏不会再「跳一下」。 */
      const skeleton = h(
        'div',
        { className: 'br-body br-skel-body', 'aria-hidden': 'true' },
        h('section', { className: 'br-stage' },
          h('div', { className: 'br-skel', style: { minHeight: '300px' } }),
          h('div', { className: 'br-skel', style: { minHeight: '420px' } }),
        ),
        h('div', { className: 'br-side' },
          h('div', { className: 'br-skel', style: { minHeight: '132px' } }),
          h('div', { className: 'br-skel', style: { minHeight: '168px' } }),
          h('div', { className: 'br-skel', style: { minHeight: '132px' } }),
        ),
      );
      const statusBlock = snapshot.status === 'loading'
        ? skeleton
        : snapshot.status === 'error'
          ? h(
              'div',
              { className: 'br-state is-error' },
              t('loadError'),
              h('div', { style: { opacity: 0.7, marginTop: 4 } }, snapshot.error),
              h(
                'button',
                { type: 'button', className: 'br-retry', onClick: () => setAttempt((value) => value + 1) },
                t('retry'),
              ),
            )
          : null;

      const isDecisionModule = selected === 'executive';
      const statRings = (stats && stats.rings) || {};
      const statDecisions = (stats && stats.decisions) || null;
      const statJudgements = (stats && stats.judgements) || null;
      const judgeStat = statJudgements || statDecisions;
      const selectedStat = statRings[selected] || null;
      const ringStats = isDecisionModule
        ? [
            [t('statNearJudge'), `${judgeStat ? judgeStat.count : judgments.length} ${t('unitRulings')}`],
            [t('statUpdated'), shortDate(judgeStat && judgeStat.updatedAt) || '—'],
            [
              t('statDominantMix'),
              judgeStat && judgeStat.dominantMix && Object.keys(judgeStat.dominantMix).length > 0
                ? Object.entries(judgeStat.dominantMix)
                    .map(([key, value]) => `${t('legend' + key.charAt(0).toUpperCase() + key.slice(1))} ${value}`)
                    .join(' · ')
                : '—',
            ],
          ]
        : [
            [t('statNear'), `${selectedStat ? selectedStat.windowCount : 0} ${t('unitItems')}`],
            [t('statTotal'), `${selectedStat ? selectedStat.count : 0} ${t('unitItems')}`],
            [t('statUpdated'), shortDate(selectedStat && selectedStat.updatedAt) || '—'],
          ];
      const ringChanges = isDecisionModule ? [] : shownChanges;
      /* 变化条目的 1~2 句详情：优先记录自带 detail，其次同任务的执行产出 */
      /* 执行记录有两个来源：work.rows（面板预览，最多 10 条）与 execution（专用数组）。
         以前用 `work.rows || execution`，空数组也是真值——work.rows 一空就再也取不到执行记录，
         裁定卡因此一直拿不到「理解/执行/产出」。这里改成合并。 */
      /* 这两个来源只服务「详情查找」（detailOf / workByTask），不再拼成列表。
         工作记录列表只有一个来源：宿主给的 work.turns（见下方 workRows）。 */
      const workAll = [
        ...(((data && data.work) && data.work.rows) || []),
        ...(Array.isArray(execution) ? execution : []),
      ];
      const detailOf = (item) => {
        if (item && typeof item.detail === 'string' && item.detail.trim()) return item.detail.trim();
        if (!item || !item.task) return null;
        const hit = workAll.find(
          (row) => row && row.task === item.task && typeof row.output === 'string' && row.output.trim(),
        );
        return hit ? hit.output.trim() : null;
      };
      /* 任务 → 最近一条执行记录（理解/手法/产出），供裁定卡逐条显示 */
      const workByTask = new Map();
      for (const row of workAll) {
        if (!row || !row.task) continue;
        const prev = workByTask.get(row.task);
        if (!prev || String(row.ts) > String(prev.ts)) workByTask.set(row.task, row);
      }
      const detailFor = (decision) => {
        /* 先读快照里抄下来的那份（工单清了也还在），再退回还活着的工单 */
        const snap = decision && decision.detail && typeof decision.detail === 'object' ? decision.detail : null;
        if (snap && (snap.title || snap.method || snap.output)) {
          return { title: snap.title || '', method: snap.method || '', output: snap.output || '' };
        }
        const hit = decision && decision.task ? workByTask.get(decision.task) : null;
        if (!hit) return null;
        const info = { title: hit.title || '', method: hit.method || '', output: hit.output || '' };
        return info.title || info.method || info.output ? info : null;
      };
      const tabIds = ['perception', 'memory', 'persona', 'executive'];
      const ringDetailCard = pro
        ? h(
        'div',
        { className: 'br-card br-detail' },
        h('h3', null, `${t('statStats')} · ${t(ringLabelKey[selected] || 'decisionLabel')}`),
        h(
          'div',
          { className: 'br-tabs' },
          tabIds.map((id) =>
            h(
              'button',
              {
                key: id,
                type: 'button',
                className: 'br-tab' + (selected === id ? ' is-active' : ''),
                onClick: () => pick(id),
              },
              t(ringLabelKey[id]),
            ),
          ),
        ),
        h('div', { className: 'br-note', style: { marginTop: 0, marginBottom: 8 } }, isDecisionModule ? t('statJudgeNote') : t('statWindowNote')),
        isDecisionModule
          ? null
          : h(
              'div',
              { className: 'br-subgroup' },
              h('div', { className: 'br-subhead' }, t('statChanges')),
              ringChanges.length > 0
                ? h(
                    'div',
                    { className: 'br-feed' },
                    ringChanges.map((item, index) => {
                      const detail = detailOf(item);
                      return h(
                        'div',
                        { className: 'br-feed-item', key: `${item.ts || index}-${index}` },
                        h('span', { className: 'br-feed-ts' }, shortDate(item.ts)),
                        h(
                          'span',
                          { className: 'br-feed-body' },
                          h('span', { className: 'br-feed-text' }, item.text),
                          detail ? h('span', { className: 'br-feed-detail' }, detail) : null,
                        ),
                      );
                    }),
                  )
                : h('div', { className: 'br-note', style: { marginTop: 0 } }, t('noChanges')),
            ),
        h(
          'div',
          { className: 'br-subgroup' },
          h('div', { className: 'br-subhead' }, t('statStats')),
          h(
            'div',
            { className: 'br-rows is-stats' },
            ringStats.map(([label, value], index) =>
              h('div', { className: 'br-row', key: label + index }, h('b', null, label), h('span', null, value)),
            ),
          ),
        ),
        isDecisionModule && decisionRows.length > 0
          ? h(
              'div',
              { className: 'br-subgroup' },
              h('div', { className: 'br-subhead' }, t('decisionRecords')),
              h(
                'div',
                { className: 'br-decisions' },
                decisionRows.map((decision, index) =>
                  h(DecisionItem, { key: `${decision.task || index}-${decision.ts || index}`, decision, t, detail: detailFor(decision) }),
                ),
              ),
            )
          : null,
        h('div', { style: { height: 1, margin: '10px 0 8px', background: 'var(--dsw-alias-border-l1)' } }),
        h(
          'div',
          { className: 'br-rows is-wide' },
          h('div', { className: 'br-row' }, h('b', null, t('inLabel')), h('span', null, t(ringDetail[0]))),
          h('div', { className: 'br-row' }, h('b', null, t('outLabel')), h('span', null, t(ringDetail[1]))),
          h('div', { className: 'br-row' }, h('b', null, t('notLabel')), h('span', null, t(ringDetail[2]))),
        ),
      )
        : h(
            'div',
            { className: 'br-card br-detail is-simple' },
            h('h3', null, t('changesTitle')),
            selected === 'executive'
              ? latestDecision
                ? h(
                    'div',
                    { className: 'br-simple' },
                    h(
                      'div',
                      { className: 'br-simple-row' },
                      h('i', { className: 'br-simple-dot is-' + (latestDecision.dominant || 'persona') }),
                      h('span', { className: 'br-simple-title' }, latestDecision.title || latestDecision.task || ''),
                      h('span', { className: 'br-simple-ts' }, shortDate(latestDecision.ts)),
                    ),
                  )
                : h('div', { className: 'br-note', style: { marginTop: 0 } }, t('chartEmpty'))
              : ringChanges.length > 0
                ? h(
                    'div',
                    { className: 'br-simple' },
                    ringChanges.map((item, index) =>
                      h(
                        'div',
                        { className: 'br-simple-row', key: `${item.ts || index}-${index}` },
                        h('i', { className: 'br-simple-dot is-' + (selected === 'feedback' ? 'feedback' : selected) }),
                        h('span', { className: 'br-simple-title' }, item.text),
                        h('span', { className: 'br-simple-ts' }, shortDate(item.ts)),
                      ),
                    ),
                  )
                : h('div', { className: 'br-note', style: { marginTop: 0 } }, t('noChanges')),
            h('div', { className: 'br-note' }, t('simpleNote')),
          );

      const work = (data && data.work) || null;
      /* 工作记录上限 10 条：Host 已截好，这里再兜一层，别让老快照把面板拉长 */
      const WORK_SHOW_LIMIT = 10;
      const workTotal = work && typeof work.total === 'number' ? work.total : workAll.length;
      /* 列表来源只有一个：宿主给的 work.turns（一轮一条，逻辑在宿主，界面不判断）。
         旧快照没有这个字段时退回按类型筛 turn —— 刷新不会白屏，口径也不变。 */
      const turnRows = Array.isArray(work && work.turns)
        ? work.turns
        : workAll.filter((row) => row && row.type === 'turn');
      const workRows = turnRows.slice(0, WORK_SHOW_LIMIT);
      const workTasks = (work && work.tasks) || [];
      const expiresOf = (task) => {
        const key = task ?? '__untasked__';
        const hit = workTasks.find((item) => (item.task ?? '__untasked__') === key);
        return hit ? hit.expiresAt : null;
      };
      const dataLine = (value) => {
        if (typeof value === 'string') return value;
        if (!value || typeof value !== 'object') return null;
        return Object.entries(value)
          .map(([key, item]) => `${key}: ${typeof item === 'string' ? item : JSON.stringify(item)}`)
          .join(' · ');
      };

      /* 人设卡：两种模式共用同一段 markup（没有任何新增类名），
         常规模式靠外层的 .br-persona-wrap 决定并排位置，不碰专业模式 */
      const personaCard = h(
        'div',
        { className: 'br-card' },
        h('h3', null, t('personaTitle')),
        identityRows.length > 0
          ? h(
              'dl',
              { className: 'br-dl' },
              identityRows.map(([key, value]) =>
                h(
                  'div',
                  { className: 'br-kv', key },
                  h('dt', null, t(key)),
                  h('dd', null, value),
                ),
              ),
            )
          : h('div', { className: 'br-note' }, t('noData')),
        h('div', { className: 'br-note' }, t('modeHint')),
      );

      const executionCard = h(
        'div',
        { className: 'br-card br-exec' },
        h(
          'div',
          { className: 'br-card-head' },
          h('h3', null, t('workTitle')),
          h('span', { className: 'br-work-count' }, `${workRows.length}${workTotal > workRows.length ? ` / ${workTotal}` : ''} ${t('unitItems')}`),
          h(
            'button',
            {
              type: 'button',
              className: 'br-collapse',
              onClick: () => {
                const next = !workOpen;
                setWorkOpen(next);
                writeFlag(KEY_WORK, next);
              },
              'aria-expanded': workOpen ? 'true' : 'false',
            },
            workOpen ? t('collapseWork') : t('expandWork'),
          ),
        ),
        pro ? h('div', { className: 'br-note', style: { marginTop: 0, marginBottom: 10 } }, t('workHint')) : null,
        workOpen
          ? workRows.length > 0
            ? workRows.map((item, index) => {
                const expiresAt = expiresOf(item.task);
                return h(
                  'div',
                  { className: 'br-exec-item', key: `${item.task || index}-${index}` },
                  h(
                    'div',
                    { className: 'br-exec-head' },
                    h('b', null, item.title || item.task || ''),
                    h(
                      'span',
                      null,
                      pro
                        ? `${shortDate(item.ts)}${item.task ? ` · ${item.task}` : ''}${expiresAt ? ` · ${t('workTtl')} ${shortDate(expiresAt)}` : ''}`
                        : shortDate(item.ts),
                    ),
                  ),
                  pro && item.output
                    ? h('div', { className: 'br-row' }, h('b', null, t('execOutput')), h('span', null, item.output))
                    : null,
                  pro && item.method
                    ? h('div', { className: 'br-row' }, h('b', null, t('execMethod')), h('span', null, item.method))
                    : null,
                  pro && item.text
                    ? h('div', { className: 'br-row' }, h('b', null, t('workData')), h('span', null, item.text))
                    : null,
                  pro && item.data
                    ? h('div', { className: 'br-row' }, h('b', null, t('workData')), h('span', null, dataLine(item.data)))
                    : null,
                );
              })
            : h('div', { className: 'br-note' }, t('execEmpty'))
          : null,
      );

      const toggleSide = () => {
        const next = !sideOpen;
        setSideFlags((prev) => ({ ...prev, [pro ? 'pro' : 'regular']: next }));
        writeFlag(pro ? KEY_SIDE : KEY_SIDE_REGULAR, next);
      };

      if (settingsOpen) return h(SettingsPage, {
        data,
        onBack: () => setSettingsOpen(false),
        /* 换包成功：清空快照、回主面板、再拉一次——新人格没生效前不显示旧内容 */
        onPersonaSwitched: () => {
          setSnapshot({ status: 'loading', data: null, error: null, offline: false });
          setSettingsOpen(false);
          setAttempt((value) => value + 1);
        },
      });

      return h(
        'div',
        {
          className: 'br-root' + (pro ? '' : ' is-regular') + (narrow ? ' is-narrow' : '')
            + (personaReady ? '' : ' is-inactive'),
          /* ref 只在观测宽度用；ResizeObserver 拿它量面板自身宽度，不量视口 */
          ref: rootRef,
        },
        h(
          'header',
          { className: 'br-head' },
          h(
            'div',
            { className: 'br-head-main' },
            h('div', { className: 'br-title' }, t('title')),
            /* 副标题一处看全：数据版本 · 构建戳 · 引擎版本（盘上与运行中不一致时标「待重启」）。
               2026-10-28：改了 index.js 必须重启宿主才生效，以前只能靠猜「是不是没加载」。 */
            /* 副标题：标语 · 版本号 ·（待重启时才提示）。版本号取署名常量里的同一份，
               不再显示快照缓存里的旧版本——两处版本号打架等于没说。 */
            h('div', { className: 'br-sub' }, `${t('subtitle')} · ${(data && data.settings && data.settings.credits && data.settings.credits.version) || 'V1.0.0 βbis'}${(() => {
              const engine = data && data.stats && data.stats.live && data.stats.live.engine;
              if (!engine) return '';
              return engine.needsRestart ? ' · 待重启' : '';
            })()}`),
            /* 常驻署名小字：一行，不占地方。文字来自宿主快照，界面里不重复写名字。 */
            h('div', { className: 'br-credit' }, (data && data.settings && data.settings.credits && data.settings.credits.line) || '蓝潮 · 三环 · 砚尘dust（@Atorias-Xuan）'),
            pro
              ? h('div', { className: 'br-source' }, `${t('source')}：${(data && data.root) || 'BLUE Files/03_Persona/persona'}`)
              : null,
          ),
          h(
            'div',
            { className: 'br-head-side' },
            h(
              'button',
              {
                type: 'button',
                className: 'br-gear',
                title: '设置',
                'aria-label': '设置',
                onClick: () => setSettingsOpen(true),
              },
              '⚙',
            ),
            h(
              'div',
              { className: 'br-mode', role: 'group', 'aria-label': t('modeLabel') },
              ['regular', 'pro'].map((id) =>
                h(
                  'button',
                  {
                    key: id,
                    type: 'button',
                    className: 'br-mode-btn' + (mode === id ? ' is-active' : ''),
                    'aria-pressed': mode === id ? 'true' : 'false',
                    onClick: () => pickMode(id),
                  },
                  id === 'regular' ? t('modeRegular') : t('modePro'),
                ),
              ),
            ),
            snapshot.fetchedAt
              ? h(
                  'div',
                  { className: 'br-live', title: t('liveLabel') },
                  h('i', { className: 'br-pulse', 'aria-hidden': true }),
                  h('span', null, `${t('liveLabel')} ${clock(snapshot.fetchedAt)}${data && data.stamp ? ` · ${data.stamp}` : ''}`),
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                className: 'br-collapse',
                onClick: toggleSide,
                'aria-expanded': sideOpen ? 'true' : 'false',
              },
              sideOpen ? t('collapseSide') : t('expandSide'),
            ),
          ),
        ),
        statusBlock,
        /* 2026-11-09：没有人格时，先给一条明确的「未生效」说明，再是灰掉的内容。
           注意这是 statusBlock 的兄弟节点，不能塞进下面那个 h() 的参数位——
           塞错了 props 会错位成 children，整个面板白屏。 */
        /* 2026-11-09：人格未建立时，除了三环缺一环，记忆其实也没开始攒
           （写入侧把记忆区闸住了）。这里必须说出来 —— 否则用户以为一直在记，
           建完人格发现记忆是空的，会以为插件坏了。 */
        personaReady ? null : h('div', { className: 'br-inactive-bar' },
          h('span', { className: 'br-inactive-tag' }, '未生效'),
          h('span', null,
            '还没有建立人格。',
            h('b', null, '三环只统计感知与记忆，人格这一环不参与计算。'),
            '记忆也还没开始积累 —— 现在只在记录「发生了什么」（感知），还没开始攒「我的记忆」。',
            '对 DSH 说「设计人设」或「形成人格」，也可以导入 / 浏览人格文件；人格建立后，记忆与三环一起生效。'
          )
        ),
        h(
          'div',
          { className: 'br-body' + (sideOpen ? '' : ' is-collapsed') },
          h(
            'section',
            { className: 'br-stage' },
            h(DecisionChart, { rows: chartRows, decisions, t, offline: snapshot.offline, memory: (data && data.memory) || null, pro }),
            h(
              'div',
              { className: 'br-canvas' },
              h('div', { className: 'br-membrane-label' }, t('membraneLabel')),
              h(
                'div',
                { className: 'br-gate' },
                `${data && data.stats && data.stats.gate ? (data.stats.gate.level === 'chat' ? 'R' : 'P') : '-'} · ${
                  data && data.stats && data.stats.gate && data.stats.gate.last
                    ? (data.stats.gate.last.pass ? '✓' : '✗')
                    : '—'
                } · ${data && data.stats && data.stats.gate ? data.stats.gate.blocked : 0}/${data && data.stats && data.stats.gate ? data.stats.gate.checks : 0}`,
              ),
              h(
                'svg',
                { className: 'br-svg', viewBox: '0 0 640 640', role: 'img', 'aria-label': t('title') },
              h(
                'defs',
                null,
                h(
                  'radialGradient',
                  { id: 'br-orb', cx: '50%', cy: '50%', r: '50%' },
                  h('stop', { offset: '0%', stopColor: orbTint, stopOpacity: '0.16' }),
                  h('stop', { offset: '55%', stopColor: orbTint, stopOpacity: '0.05' }),
                  h('stop', { offset: '100%', stopColor: orbTint, stopOpacity: '0' }),
                ),
                /* 朦胧散光：只作用于静态光晕层，不碰带 SMIL 的环组 */
                h(
                  'filter',
                  { id: 'br-soft', filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: 640, height: 640 },
                  h('feGaussianBlur', { stdDeviation: '4.5' }),
                ),
              ),
              h(
                'g',
                {
                  className: 'br-ring-scale',
                  /* 以画布中心为轴整体放大：三环 + 中心判定一起铺满，膜框不再画 */
                  transform: `translate(${CENTER} ${CENTER}) scale(${RING_SCALE}) translate(${-CENTER} ${-CENTER})`,
                },
              h(
                'g',
                { className: 'br-glow-layer', filter: 'url(#br-soft)', 'aria-hidden': true },
                RING_ARCS.map((arc) =>
                  h('path', {
                    key: arc.id,
                    className:
                      'br-glow-arc is-' +
                      arc.id +
                      (hovered === arc.id || selected === arc.id ? ' is-on' : ''),
                    d: arcPath((arc.band.inner + arc.band.outer) / 2, arc.start + 4, arc.end - 4, false),
                    stroke: ARC_COLORS[arc.id],
                    strokeWidth: arc.band.outer - arc.band.inner - 8,
                  }),
                ),
              ),
              h('circle', { className: 'br-center-glow', fill: 'url(#br-orb)', cx: CENTER, cy: CENTER, r: 158 }),
              h('circle', {
                className: 'br-halo',
                cx: CENTER,
                cy: CENTER,
                r: 158,
                'pointer-events': 'none',
              }),
              h(
                'g',
                {
                  className:
                    'br-decision' +
                    (selected === 'executive' ? ' is-active' : '') +
                    (latestDecision && latestDecision.dominant ? ' is-' + latestDecision.dominant : ''),
                  role: 'button',
                  tabIndex: 0,
                  'aria-pressed': selected === 'executive' ? 'true' : 'false',
                  onClick: () => pick('executive'),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      pick('executive');
                    }
                  },
                },
                /* 判定范围 = 整个决策图案（含外圈） */
                h('circle', { className: 'br-center-hit', cx: CENTER, cy: CENTER, r: 152 }),
                h('circle', { className: 'br-center-ring', cx: CENTER, cy: CENTER, r: 138 }),
                h('circle', { className: 'br-center-inner', cx: CENTER, cy: CENTER, r: 124 }),
                h('text', { className: 'br-center-title', x: CENTER, y: 306 }, t('decisionLabel')),
                h(
                  'text',
                  { className: 'br-center-sub', x: CENTER, y: 336 },
                  latestDominant ? `${t('dominantLabel')} · ${latestDominant}` : t('noDecision'),
                ),
                h('text', { className: 'br-center-cap', x: CENTER, y: 364 }, `${t('centerLabel')} · ${t('subExecutive')}`),
              ),
              RING_ARCS.map((arc) =>
                h(ArcNode, {
                  key: arc.id,
                  arc,
                  active: selected === arc.id,
                  t,
                  onSelect: pick,
                  onHover: setHovered,
                  newCount: changesOf(arc.id).length,
                }),
              ),
              ),
              h(FeedbackNode, {
                t,
                active: selected === 'feedback',
                onSelect: pick,
                newCount: changesOf('feedback').length,
              }),
            ),
            ),
            /* 常规模式：信息栏展开时人设卡在膜右边；收起后整块只留三环与下面的卡片 */
            pro ? null : sideOpen ? h('div', { className: 'br-persona-wrap' }, personaCard) : null,
            ringDetailCard,
            executionCard,
          ),
          pro && sideOpen
            ? h(
            'aside',
            { className: 'br-side' },
            personaCard,
            pro
              ? h(
            'div',
            { className: 'br-side-extra' },
            h(BudgetCard, { layers, t }),
            h(
              'div',
              { className: 'br-card' },
              h('h3', null, t('organsTitle')),
              h(
                'div',
                { className: 'br-organs' },
                organs.length > 0
                  ? organs.map((organ) =>
                      h(
                        'span',
                        { className: 'br-chip' + (organ.health === 'ok' ? ' is-ok' : ''), key: organ.id || organ.name },
                        organ.name || organ.id || '?',
                      ),
                    )
                  : h('span', { className: 'br-note' }, t('noData')),
              ),
              h(
                'div',
                { className: 'br-exp', style: { marginTop: 10 } },
                h('span', null, t('expProposed'), h('b', null, experience.proposed ?? '—')),
                h('span', null, t('expAccepted'), h('b', null, experience.accepted ?? '—')),
                h('span', null, t('expRejected'), h('b', null, experience.rejected ?? '—')),
                h('span', null, t('expFused'), h('b', null, experience.fused ?? '—')),
                h('span', null, t('memoryTitle'), h('b', null, data ? data.memoryCards ?? '—' : '—')),
                h('span', null, t('revisionsTitle'), h('b', null, data ? data.revisions ?? '—' : '—')),
              ),
            ),
            h(
              'div',
              { className: 'br-card' },
              h('h3', null, t('governanceTitle')),
              h(
                'dl',
                { className: 'br-dl' },
                h(
                  'div',
                  { className: 'br-kv' },
                  h('dt', null, t('gGate')),
                  h('dd', null, t('gGateValue')),
                ),
                h(
                  'div',
                  { className: 'br-kv' },
                  h('dt', null, t('gFrozen')),
                  h('dd', null, (governance.frozenTiers || []).join(' · ') || '—'),
                ),
                h(
                  'div',
                  { className: 'br-kv' },
                  h('dt', null, t('gInvariants')),
                  h('dd', null, governance.invariants ?? '—'),
                ),
                h(
                  'div',
                  { className: 'br-kv' },
                  h('dt', null, t('gRollback')),
                  h('dd', null, governance.rollback || '—'),
                ),
              ),
            ),
            h(
              'div',
              { className: 'br-card' },
              h('h3', null, t('contractsTitle')),
              h(
                'div',
                { className: 'br-chips' },
                ['cCapture', 'cRecall', 'cCard', 'cRule', 'cHandoff', 'cDirective', 'cRecheck'].map((key) =>
                  h('span', { className: 'br-chip', key }, t(key)),
                ),
              ),
            ),
                )
              : null,
          )
            : null,
        ),
        h('style', null, CSS),
      );
    }

    return {
      inject: ['slots'],
      /* 供验收脚本直接渲染设置页（喂真实快照），不走宿主；样式一并发出去，
         预渲染页用的就是这里同一份 CSS，不另抄一份。 */
      /* 2026-11-09：把主面板也挂出来 —— 白屏事故后加的 React 桩冒烟要直接渲染它 */
    __test: { SettingsPage, FsBrowser, CSS, RingsPanel },
      apply(ctx) {
        function Panel(props) {
          const t = useTranslate(ctx);
          return h(RingsPanel, { ctx, t, ...props });
        }

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 30,
              label: () => (readLocale(ctx) === 'zh' ? DICT.zh.panelLabel : DICT.en.panelLabel),
            },
            PanelIcon,
          ),
        );

        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, Panel));
      },
    };
  },
});




var __btw_mark__ = "BTW-V1.0.0βbis-20261109-992aad5a-20261109-1f002b5d"; void __btw_mark__;
var __btw_digest__ = "e672da20a398"; void __btw_digest__;
