# Learning App Types — Capability Library 的应用类型设计

本文档是 [`capability-library.md`](./capability-library.md) 的姊妹篇，专门定义 lib 里可以存在的**应用类型**。

> **重要修订**：本文档第一版采用固定 7 个 category enum，已被证明过于刚性。当前版本改用 **开集 tag + 个性化 style profile + course 去中心化** 的模型。下文反映的是修订版。

## 1. 为什么 lib 不能只是 course

目前 Primoria 只有两种产出形态：**course**（结构化课程）和 **html_widget**（一次性可视化）。这远远不够，因为它把"学习"压缩成了两种动作：读一遍 / 看一个 demo。

真实学习是多种模式交织的过程：吸收 / 练习 / 探索 / 产出 / 反思 / 规划。如果 lib 只沉淀 course，等于只让 agent 反复做"讲解员"。但学习者卡在记不住、写不出、不会用、没计划的时候，agent 应该有别的工具去匹配。

**所以 lib 的真正价值是：覆盖学习闭环的多种 app 形态，让 agent 根据学习者当下处于哪个环节，选择合适的形态产出。**

## 2. 设计原则：开集 + 去中心化 + 个性化

### 2.1 用 tag 替代固定 category

**反例（第一版的错误）**：

```ts
category: "drill" | "explainer" | "simulation" | "reader" | "composer" | "reflector" | "planner" | "other";
```

这是闭集 enum，问题是：
- 真实学习方式是连续光谱，硬归一类会失真
- Agent 想引入新形态（"morning-routine"、"5min-only"、"before-exam"）时没有出口
- 同一类型内部还有大量子风格变化（解释派 / 形式派 / 苏格拉底派），enum 表达不了

**修订**：用开集 `tags: string[]` 替代。

```ts
type LearningApp = {
  ...
  tags: string[];   // 例: ["practice", "vocab", "audio", "srs", "morning"]
  ...
};
```

Agent 和用户都能引入新 tag，系统不维护白名单。Router 用 embedding 做语义检索 + 周期性 tag canonicalization（合并语义相近的 tag，避免 `flashcard` / `flash-cards` / `card-drill` 同义词地狱）。

### 2.2 用 style profile 承载个性化

风格（不是结构）应该跨 app 共享，存在用户 memory 里，而不是写在每个 app 内：

```ts
// 用户级 memory（不是 app 级 manifest）
type UserStyleProfile = {
  dislikes: string[];            // 例: ["analogy"]
  prefers: string[];             // 例: ["formal", "code-example"]
  modality: Record<string, number>;  // 例: { visual: 0.8, audio: 0.2 }
  pacing?: "gentle" | "intense" | string;
  // 任意开集 key，agent 可以自由扩展
};
```

Agent 生成或召唤 app 时，**先读 style profile，再决定怎么填模板**。同一个 explainer 模板，给类比党用户和形式党用户，产出完全不同。

**关键**：用户不主动配置 style profile，靠隐式信号学习：
- 用户秒切走某种解释方式 → `dislikes` 累计 +1
- 用户停留长 / 追问 → `prefers` 累计 +1
- 多次同向信号才更新；旧偏好做时间衰减
- 留一个语义后门："你最近讲的方式我不喜欢" → 触发重置

### 2.3 Course 不是顶层，是 composite app

第一版隐含 course 是中心、其他 app 是从属。这是错的——**很多用户从来不上 course，只靠每天刷 drill / 读 reader / 做 composer 就能学得很好**。

修订后的心智模型：

```
旧（错的）:
  Course (顶层)
    ├─ Block: explainer
    ├─ Block: drill
    └─ Block: simulation

新（对的）:
  User's Capability Library
    ├─ App: 背词 drill         ← 独立可用
    ├─ App: 英语故事 reader    ← 独立可用
    ├─ App: 算法可视化 sim     ← 独立可用
    ├─ App: 写作工坊 composer  ← 独立可用
    └─ App: 微积分入门 (composite) ← 这才是 course，只是恰好串了多个 app
```

Course 退化成一种特殊的 composite app（其 template 里 `embeds` 字段引用了一组其他 app），没有任何特权。**Lib 是一堆独立可用的工具，course 只是其中一种把工具串起来的形态。**

## 3. 常见学习形态（不是分类，是常见 tag 组合）

下面列出常见的 app 形态。**这不是 enum，是 tag 组合的快捷示例**——agent 完全可以混搭出列表里没有的形态。

| 常见形态 | 典型 tags | 学习模式 | template 形态 |
|---|---|---|---|
| 讲解 / 短课 | `["explain", "concept"]` 或 `["explain", "course"]` | 吸收 | generator + block 列表 |
| 抽认卡 / 练习 | `["practice", "srs", "vocab"]` 或 `["practice", "mcq"]` | 练习 | html + 题库 generator |
| 互动模拟 | `["simulation", "interactive", "physics"]` | 探索 | html（沙箱 iframe）|
| 情境阅读 | `["reader", "story", "language:en"]` | 吸收 + 探索 | generator |
| 动手产出 | `["compose", "writing"]` 或 `["compose", "code"]` | 产出 | html shell + LLM 评估 |
| 反思 / 错题 | `["reflect", "errorbook"]` | 反思 | html + 跨 app state 聚合 |
| 路径规划 | `["plan", "schedule"]` | 规划 | html + 调度状态 |

下面对每种形态展开说一下结构和沉淀逻辑。形态之间没有硬边界——一个 app 完全可以是 `["practice", "compose", "audio"]` 这种组合。

### 3.1 讲解类（tags 包含 explain）

用途：把一个概念讲清楚。短答疑、单概念类比、一段推导，都属于这一类。Course 是它的"多 block 组合 + 入库"特例。

inputs 示例：
```ts
{ topic: string; depth: "quick"|"standard"|"deep"; audienceHint?: string }
```

template：`generator`，产出 block 序列。

state：通常无状态。沉淀信号：用户反复访问同一主题 → 升级为带练习的复合 app，而不是再生成一次讲解。

### 3.2 练习类（tags 包含 practice）

用途：反复检索强化记忆。**这是 Primoria 当前完全缺的、价值放大最大的形态。**

inputs 示例：
```ts
{ topic: string; itemCount: number; difficulty?: ...; drillKind: "flashcard"|"mcq"|"cloze"|"speak"|"dictation" }
```

template：`html`（题型 UI 稳定）+ `generator`（题目内容由 LLM 或 memory 抽取）。

stateSchema：必须有 SRS 状态（间隔重复）、错题历史。**state 必须跨 session 持久化，否则没意义。**

沉淀信号：用户主动"再来一组" / 准确率从低到高 / state 跨 session 复用——这一类几乎**首次召唤即落库**。

### 3.3 模拟类（tags 包含 simulation）

用途：建立直觉。Primoria 现在 `render_interactive_widget` 主要产出这一类。

template：`html`（复用 WidgetRenderer 沙箱 + import map）。

沉淀信号：长交互（>60s）、来回调参——这种最值得保存成可召唤 app。

### 3.4 阅读类（tags 包含 reader）

用途：嵌入语料、剧情或真实文本中学习。和讲解类的区别是**带语境**。

template：`generator`。产出长文 + 注释 + 内嵌小问题。

stateSchema：阅读位置、点过的注释、不会的词。

**Reader 是 lib 增长最快的形态**——每个用户的语料偏好都不一样。

### 3.5 产出类（tags 包含 compose）

用途：让学习者动手做。**与"只做被动消费"的同类产品拉开差距的关键形态。**

inputs 示例：
```ts
{ topic, task, rubric?, expectedFormat: "text"|"code"|"speech"|"math" }
```

template：`html` shell（输入框 / 编辑器 / 录音器）+ LLM 评估 endpoint。

stateSchema：所有提交 + 反馈 + 最佳作品。**错题/失败作业要存，给反思类用。**

### 3.6 反思类（tags 包含 reflect）

用途：聚合、对比、提炼。它的特殊性是**消费其他 app 的 state**。

依赖：memory + 跨 app state 读取权限。对接 capabilities 权限系统的优先级仅次于练习类。

### 3.7 规划类（tags 包含 plan）

用途：管理学习路径。**生产**其他 app 的调用计划——"明天用 X drill 刷 Y 词、用 Z reader 读一段"。

template：`html`（看板 / 甘特 / 清单）+ 调度状态。

## 4. App 之间的三种组合模式

不是 7 个孤立类型，是组合成网络。

**Sequential（顺序）**：Course 的本质——一组 app 按顺序排列。
```ts
type CompositeBlock =
  | { type: "text"; content: string }
  | { type: "embed"; appId: string; inputs: any };
```

**Triggered（触发）**：产出失败 → 自动调反思类把错点入错题本 → 触发规划类在明天加一道复习。

**Consumer-Producer（消费-生产）**：规划类生产任务 → 练习/阅读/产出类消费任务；练习/产出类生产 state → 反思类消费 state。

依赖关系通过 manifest 里的 composition 字段声明：
```ts
type LearningApp = {
  ...
  composition?: {
    consumes?: string[];   // 例: ["app:practice:*:state", "app:compose:*:state"]
    produces?: string[];   // 例: ["task:daily"]
    embeds?: string[];     // 内嵌哪些 app（course 用）
  };
};
```

## 5. Agent 怎么选择形态

Router agent 不靠关键字匹配，**靠 LLM 看上下文 + 检索用户 lib 里 tag 最匹配的 3-5 个候选 app**：

```
用户消息 + style profile
   ↓
[Router Agent]
   ├─ 检索：embedding 命中 tags
   ├─ 候选：top-K apps
   └─ 决策：
      ├─ A. 命中 → 主 agent 只暴露这 K 个 app 作为 tool
      ├─ B. 没有合适的 → 走现场生成
      └─ C. 不需要 → 闲聊
```

隐式信号也会影响选择：
- 用户刚消费完讲解类 → 推荐练习/产出类
- 练习准确率高 → 推荐升级到产出
- 产出失败多 → 推荐反思 / 回看讲解

关键：**Router 不暴露给用户**，用户始终只看到一个 chat。

## 6. 沉淀策略按形态差异化

不是所有形态都需要"现场生成 → 评估后沉淀"。区分两类：

| Tags 含 | 沉淀方式 | 阈值 |
|---|---|---|
| `simulation` / `explain` | 现场生成 → 异步评估 → 是/否落库 | 中等：长度 / 用户停留 / 重复访问 |
| `practice` / `compose` / `reflect` / `plan` | **首次召唤即落库** | 无阈值，类似 install |
| `reader` | 现场生成 → 几乎总落库（沉淀成本低） | 低 |

也就是说：练习 / 产出 / 反思 / 规划这四种实际上不是"agent 自由生成的临时产物"，而是"用户首次触发就成为长期的 app 实例"。

## 7. MVP 优先级

Phase 1A 不可能做 7 种形态。建议：

### Phase 1A（当前）
1. **静默沉淀 simulation 类**：现有 `render_interactive_widget` 产出的 widget，自动判断是否沉淀，落到用户 lib。这是本期目标。
2. **My Apps tab**：纯只读展示沉淀下来的 apps。

### Phase 1B
3. **practice 形态**（最高优先级新形态）——开启"练习"能力，是 lib 价值放大的关键。
4. **reader 形态**——高频、高个性化。

### Phase 2
5. **compose 形态**——引入"动手"维度，与同类产品拉开差距。
6. Router agent + 动态 tool 注入。

### Phase 3
7. Memory + style profile 隐式学习闭环。
8. **reflect / plan 形态**（依赖前面的 state 才有意义）。

### Phase 4（远期可选）
9. 公开 registry + 跨用户分享。

## 8. 数据模型小结

```ts
type LearningApp = {
  id: string;
  name: string;             // agent 可读的语义名
  displayName: string;      // 用户可读的展示名
  tags: string[];           // 开集，靠 embedding 检索 + 周期合并

  inputs?: unknown;         // Zod / JSON schema，agent 调用参数
  template:
    | { type: "html"; source: string }
    | { type: "generator"; prompt: string };
  stateSchema?: unknown;

  origin:
    | { kind: "agent_generated"; sourceQuestion?: string; sourceSessionId?: string }
    | { kind: "user_forked"; parentAppId: string }
    | { kind: "system_seed"; seedId: string };

  composition?: {
    consumes?: string[];
    produces?: string[];
    embeds?: string[];
  };

  capabilities?: string[];  // memory 读写声明（Phase 3 才用）

  metadata: {
    createdAt: number;
    lastUsedAt: number;
    usageCount: number;
  };
};
```

注意：原 `category` 字段已删除。形态信息全部进 `tags`。

## 9. 关键设计原则

- **Tag 不是 enum**：开集、靠语义检索、周期合并。Agent 可以自由加新 tag。
- **Style 在用户层不在 app 层**：同一个 app 给不同用户产出不同风格，靠隐式学习的 style profile。
- **Course 不是顶层**：它只是 `composition.embeds` 非空的特殊 composite app。
- **形态不是 UI 风格，是行为**：practice 和 simulation 的视觉可以很像，但 stateSchema 和沉淀策略完全不同。
- **跨形态协作比单形态完美更重要**：reflect 没 practice 的 state 就没意义。Phase 1A 先打通最小闭环再扩。
- **不做"通用 app 容器"**：iframe 留给 simulation/reader 的自由 HTML；practice/compose/reflect/plan 用原生组件，体验更稳。

## 10. 一句话总结

**Lib 是一堆独立可用、靠 tag 索引、靠 style profile 个性化的辅助学习工具。Course 只是其中一种把多个工具串起来的特殊 composite 形态，不是顶层。**
