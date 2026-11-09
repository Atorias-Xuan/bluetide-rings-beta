# bluetide-rings β · 蓝潮三环

**外环认知层。**

DeepSeek Harness 的三环人格架构面板。它不介入宿主的推理过程，只在推理之外维护一份持续存在的状态：跨会话的长期记忆、情绪演化、人格设定，以及决定这一轮该往哪边偏的上下文路由。

An **outer cognitive layer**.

A three-ring persona architecture panel for DeepSeek Harness. It stays outside
the host's inference and maintains state that persists beside it: long-term
memory across sessions, mood evolution, persona definition, and the context
routing that decides which way a turn should lean.

---

## 定位 · Positioning

### 它维护什么

本插件维护一套跟着用户走的状态：人格是谁、记忆属于谁、这一轮该偏感知还是偏记忆。

It maintains state that follows the user: who the persona is, whose memory this
is, and whether this turn should lean on perception or on memory.

检索是执行环节，判断发生在检索之前。

Retrieval is the execution step. The judgment happens before it.

### 怎么接进去

两次介入。

It hooks in twice.

**一、输入前**

每轮模型生成之前，往系统提示里拼三段内容——这是一次注入：

| 段 | Section | 内容 | Content |
|---|---|---|---|
| 门禁 | Gate | 这一轮是任务还是闲聊、适用哪一级规则、上次自检结果 | Turn classification, active rules, last self-check |
| 三环 | Rings | 开工三问：要什么、该守什么、有没有旧经验 | Three opening questions |
| 记忆 | Memory | 时间基准、结算、摘要、检索结果 | Time anchor, settlement, digest, retrieval |

注入是给模型看的输入，不改变模型怎么算。

The injection is input the model reads. It does not change how the model computes.

**二、结果返回后**

工具跑完、结果交回之后，记下这一轮实际发生了什么：

After tools return, it records what the turn actually did:

| 记什么 | What | 用法 | Use |
|---|---|---|---|
| 调了什么 | What was called | 按 Agent 累加计数 | Counted per agent |
| 成没成 | Success or failure | 失败单独计数 | Failures counted separately |
| 验没验 | Verified or not | 识别语法检查、测试、打包自检 | Syntax check, tests, build self-check |

只记事实，不解析措辞。模型跑的时候不知道有人在记。

Facts only, never parsing wording. The model doesn't know anyone is watching.

收尾时结算三环占比、写盘、审计这一轮有没有兑现。

At turn end it settles the ring shares, flushes to disk, and audits whether the turn delivered.

### 输出参数

每轮输出一组参数：本轮的严谨度、模式取向、三环占比、情绪系数。宿主决定这些参数怎么用。

Each turn emits a set of parameters: this turn's rigor level, mode orientation,
ring shares, and mood coefficient. The host decides how to use them.

模型的输出是结果，由宿主按需取用。

Model output is a result the host draws on as it sees fit.

### 可移植

四区数据是纯文本落盘，没有数据库、没有外部服务。路径每次运行时解析，不写死任何人的目录。所有路径操作都校验是否越出根目录。

All four areas are plain-text files on disk. No database, no external service.
Paths resolve at runtime — nothing is hardcoded to one machine. Every path
operation is checked against escaping its root.

---

## 功能说明 · Features

### 长期记忆 · Long-term Memory

对话关掉就没了。本插件会把该留的东西落盘：做过什么决定、学到什么、用户纠正过什么。下次开新对话，它还记着。

Chat history disappears when the window closes. This plugin persists what's worth keeping — decisions made, lessons learned, corrections from the user — so the next session starts with context.

**怎么做到**：所有记录按四个区分离存储（感知 / 记忆 / 人格 / 工作）。工作区是临时区，过程记录留 24 小时后清掉，只把值得留的沉淀进记忆区。

**How**: Records split into four separate areas (perception / memory / persona / work). The work area is temporary: logs are cleared after 24 hours, and only what's worth keeping settles into memory.

Records are stored in four separate areas (perception / memory / persona / work). The work area is temporary: process logs are cleared after 24 hours, and only what's worth keeping settles into the memory area.

一句话：**过程不占地方，结论不丢。**

In short: *process stays light, conclusions stay put.*

### 人格设定 · Persona

人格由你用自然语言指定，包括身份定位和表达风格。设定之后，它的语气、判断依据、记忆归属都按这个来。

You define the persona in natural language — who it is, how it talks. Once set, its tone, decision basis, and memory ownership all follow that definition.

**人格为什么是第一步**：记忆是「人格的经历」。没有「谁」，就没有可以归属的积累。所以没设定人格时，插件不会假装工作——面板灰着、显示未生效，记忆区既不写也不读。人格一建立，两者同时启动。

**Why persona comes first**: Memory belongs to a persona. Without a "who", there is no one to accumulate experience for. So no persona, no pretending: the panel greys out, nothing is written to or read from memory. Set one persona, both start.

Memory belongs to a persona. Without a "who", there's no one to accumulate experience for. That's why the plugin doesn't pretend to work before a persona exists: the panel greys out and shows "inactive", and nothing is written to or read from the memory area. The moment a persona is set, both start.

### 三环权重 · Three-Ring Weights

面板上是三个环：感知 / 记忆 / 人格。

Three rings on the panel: perception, memory, persona.

每一环的占比由**这一轮里谁真的出了力**决定。三个数加起来恒为 1。

The share of each ring reflects **how much each one actually contributed this round**. The three shares always sum to 1.

**它不只是好看**：占比同时是下一轮的调度依据，决定先想什么、先翻哪类记忆。你在面板上看到的，就是它实际在用的权重。

**It's not just decoration**: These shares also drive the next round — what it thinks about first, which memories it fetches first. What you see is the weight it actually runs on.

These shares also drive the next round: what it thinks about first, which memories it fetches first. What you see on the panel is the weight it actually runs on.

### 分层遗忘 · Layered Forgetting

记录按时间淡出——近的清楚，远的变淡，像个正常的脑子。

Records fade with age — recent ones stay sharp, older ones blur. Like a normal memory would.

**但不删**：淡出后进「冷却」，再久进「归档」，数据都还在盘上，检索得到。真正会被清掉的只有工作区那些过程记录。

**But never deleted**: Faded records move to *cooling*, then to *archived*. The data stays on disk and remains searchable. Only process logs in the work area are actually removed.

Faded records move to *cooling*, then to *archived*. The data remains on disk and stays searchable. Only process logs in the work area are actually removed.

### 判断追溯 · Traceable Judgments

每轮判断留一张卡：这轮看到了什么、引用了哪条记忆、为什么这么答。

Every round leaves a card: what it saw, which memories it pulled, why it answered that way.

**而且能复核**：占比由当轮的原始计数当场算出，你可以拿卡上的数字自己验一遍。算不对就是不对，赖不掉。

**And it's verifiable**: Shares are computed from that round's raw counts, so you can re-derive them yourself. No room to fudge.

The shares are computed directly from that round's raw counts, so you can re-derive them yourself from the numbers on the card. No room to fudge.

---

## 功能一览 · At a Glance

| 功能 | Function | 作用 | What it does |
|---|---|---|---|
| 四区存储 | Four-area storage | 感知 / 记忆 / 人格 / 工作独立落盘 | Separate storage per area |
| 人格驱动 | Persona-driven | 设定决定语气、判断、记忆归属 | Persona governs tone, judgment, memory |
| 三环权重 | Three-ring weights | 按实际参与度算占比 | Share by actual contribution |
| 分层遗忘 | Layered forgetting | 淡出 → 冷却 → 归档 | Fade → cool → archive |
| 工作区清理 | Work-area cleanup | 过程记录 24 小时后清 | Logs cleared after 24h |
| 判断留卡 | Judgment cards | 每轮生成一条记录 | One card per round |
| 占比复核 | Verifiable shares | 原始计数直接算 | Derived from raw counts |
| 本地存储 | Local storage | 数据仅存本机 | Data stays on your machine |

---

## 架构 · Architecture

五个核心部件。它们不决定算得准不准，只保证数据通路是通的——**管道不通，三环就是停的**。

Five core components. They don't decide how accurate the math is; they keep the data path open. **No pipe, no rings.**

| 部件 | Component | 职责 | Responsibility |
|---|---|---|---|
| 路径解析 | Path resolution | 定位数据目录，缺失时创建 | Locate data dir, create if absent |
| 写入 | Write | 记录追加至对应区 | Append records to the right area |
| 解析 | Parse | 文件 → 面板结构 | Files → panel model |
| 三段注入 | Three-section inject | 每轮注入：入口判定 / 三环现状 / 记忆摘要 | Per-round: gate / rings / memory digest |
| 状态机 | State machine | 活跃 → 冷却 → 归档 | Active → cooling → archived |

其余模块都只是「算得更准」的增强。β 版去掉部分算法后主体功能照常，原因就在这里——它们本来就不在管路上。

Everything else only improves precision. That's why removing some algorithms in β leaves the core working: they were never on the pipe.

---

## 面板字段 · Panel Fields

| 位置 | Location | 内容 | Content |
|---|---|---|---|
| 三环图 | Ring chart | 感知 / 记忆 / 人格三段弧 | Three arcs |
| 主导 | Dominant | 本轮占比最高的环 | Highest share this round |
| 最近任务占比 | Recent tasks | 最近三个任务的三环分布 | Last three tasks |
| 待确认 / 已收 / 变淡 | Status | 记忆条目状态 | Pending / settled / fading |
| 四类分流 | Routing | 记录去向 | Card / organ / persona change / once |
| 待重启 | Restart pending | 代码变更未重启时亮 | Shown when code changed |

---

## β 版说明 · About This Release

β 版是精简发行版，面向日常使用。在保持核心能力完整的前提下，减少算法复杂度与依赖。

β is a trimmed release for everyday use: core capabilities intact, less algorithmic complexity, fewer dependencies.

### 本版包含 · Included

| 能力 | Capability | 具体内容 | Details |
|---|---|---|---|
| 四区存储 | Four-area storage | 四区独立落盘；工作区 24 小时后自动清理 | Per-area files; work area cleared after 24h |
| 人格驱动 | Persona-driven | 自然语言指定 / 指令触发 / 文件导入；建立后记忆与统计同步启用 | Three ways to set; memory and stats start together |
| 三环权重 | Three-ring weights | 按实际参与度计算，含主导环与三任务窗口；和恒为 1 | By contribution; dominant ring; sums to 1 |
| 分层遗忘 | Layered forgetting | 三级状态转换；衰减后仍可检索 | Three stages; still searchable |
| 判断追溯 | Judgment cards | 每轮记录：输入、引用、判定、缺口 | Per-round card |
| 占比复核 | Verifiable shares | 原始计数直接计算，可独立复算 | Re-derivable |
| 完整性校验 | Integrity check | 构建记录含哈希；被改动时拒绝启用 | Hash-verified; refuses to load if tampered |
| 零第三方依赖 | No dependencies | 仅用 Node 内置模块 | Built-in modules only |

### 本版未包含 · Not Included

以下能力在开发版可用，后续版本逐步下放。

Available in the development build; rolling out in later releases.

| 能力 | Capability | 当前替代 | Current substitute |
|---|---|---|---|
| 语义结构抽取 | Semantic extraction | 文本匹配 | Text matching |
| 高精度权重算法 | High-precision weights | 基础算法 | Basic algorithm |
| 主动联想 | Proactive association | 需显式检索 | Explicit retrieval only |
| 配套插件探测 | Companion detection | 不显示状态 | Status not shown |

上述能力缺失不影响主体功能运行。

Missing these does not affect core functionality.

---

## 环境要求 · Requirements

| 项 | Item | 要求 | Requirement |
|---|---|---|---|
| 宿主 | Host | DeepSeek Harness（含 Web UI） | DeepSeek Harness with Web UI |
| Node.js | Node.js | ≥ 20 | ≥ 20 |
| 第三方依赖 | Dependencies | 无 | None |
| 网络 | Network | 安装时需要；运行时不需要 | Needed to install, not to run |

---

## 安装 · Installation

### 方式一：命令行 · Command line

```bash
dsh plugin --profile web add github:Atorias-Xuan/bluetide-rings-beta
```

安装完成后重启 DSH。

Restart DSH afterwards.

首次安装时 pnpm 会请求一次构建脚本授权。本插件无构建步骤，按提示将包名添加至 profile 的 `pnpm-workspace.yaml` 后重新执行：

On first install pnpm asks for build-script authorization. This plugin has no build step — add the package name to your profile's `pnpm-workspace.yaml` as prompted, then run again:

```yaml
allowBuilds:
  '@local/bluetide-rings': true
```

### 方式二：安装包 · Package

从仓库下载 zip 或 tgz。**zip 里是散文件，不套目录**——这样上传到 GitHub 时 README 和 LICENSE 能被自动识别。

解压前先建好目标目录，再把内容放进去：

```
~/.dsh/profiles/<profile>/node_modules/@local/bluetide-rings/
```

目录名必须为 `bluetide-rings`——这层是 DSH 找插件的依据，不能改名。部署完成后重启 DSH。

The zip contains loose files with no wrapping directory, so GitHub can recognize
README and LICENSE when you upload it.

Create the target directory first, then extract into it:

```
~/.dsh/profiles/<profile>/node_modules/@local/bluetide-rings/
```

The directory name must be `bluetide-rings`. Restart DSH when done.

---

## 初始化 · Initialization

安装并重启后，侧栏出现「蓝潮 · 三环」条目即表示加载成功。插件自动创建数据目录，无需手动初始化。

After restart, the sidebar entry "蓝潮 · 三环" means it loaded. Data directories are created automatically — no manual setup.

面板初始状态为未生效，属预期行为——此时尚未建立人格。

The panel starts in an inactive state, which is expected: no persona yet.

建立人格的三种方式：

Three ways to set one:

1. 自然语言指定，例如「你是一名审稿人，回答需简洁」
2. 指令触发，例如「设计人设」「导入人格文件」
3. 从人格文件导入

---

## 数据目录 · Data Directory

所有数据存于本机，不上传。

Everything stays on your machine. Nothing is uploaded.

```
~/蓝潮工作区/BLUE Files/
├── 01_Perception/   感知记录
├── 02_Memory/       记忆条目
├── 03_Persona/      人格设定、情绪、用户反馈
└── 04_Execution_Membrane/
    └── 执行/工作/    工作区过程记录，24 小时后清除
```

修改存储位置：设置环境变量 `BLUETIDE_WORKSPACE`。

Change location: set the `BLUETIDE_WORKSPACE` environment variable.

清除数据：删除上述目录即可，插件不写入其他位置。

Clear data: delete the directory. The plugin writes nowhere else.

---

## 已知限制 · Known Limitations

| 限制 | Limitation | 说明 | Note |
|---|---|---|---|
| 进程异常终止的数据丢失 | Loss on hard kill | 记录先进内存队列，收尾时统一落盘；收尾前被强杀则未落盘部分丢失 | Queued in memory, flushed at turn end; killed before that, the queue is lost |
| 人格建立前不写入记忆 | No memory before persona | 三环仅统计感知；建立后自动恢复，无需重启 | Perception only until persona exists |
| 无云端同步 | No cloud sync | 数据仅存本机；迁移需手动复制 `BLUE Files` | Migrate by copying the directory |

---

## 许可 · License

GPL-3.0-or-later。允许使用、修改、再分发（含商业用途），派生作品须以同等许可开源，不得转为闭源。须保留版权声明与许可全文。

GPL-3.0-or-later. Use, modify, and redistribute (including commercially) are permitted. Derivative works must stay under the same license — no closed-source forks. Keep the copyright notice and the full license text.

作者 · Author：砚尘dust（[@Atorias-Xuan](https://github.com/Atorias-Xuan)）
