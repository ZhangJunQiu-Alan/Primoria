# Capability Library — 个性化学习应用库

## 1. 背景与目标

Primoria 目前的能力交付方式是：用户提问 → tutor agent 现场生成一个 HTML widget 或一节课程。每次都是一次性的，下次同类问题还要重新生成，模型既看不到"上次这个用户用过什么"，也无法复用过去的成功产出。

本 feature 引入 **Capability Library**：让 agent 把值得复用的产出沉淀为有身份、可被命名召唤的"学习应用"（LearningApp），每个用户拥有一个**专属能力库**。库随着使用自动生长，agent 在后续对话中优先复用库内应用，而不是每次重新生成。

目标：

- 同一个用户用得越久，agent 调用越快、越个性化、越准确
- 形成单用户层面的护城河：可迁移走的不是 prompt 或 UI，而是"只属于这个用户的能力集合 + 学习画像"
- 为后续接入 memory（mem0 等）预留声明式的数据访问接口

## 2. 核心原则

**会自我沉淀的 AI 学习伙伴，不是学习应用商店。**

- 用户全程只与一个 chat 入口交互
- Library 是 agent 在后台构建的能力索引，不是用户的管理界面
- 沉淀、fork、复用都由 agent 在后台静默完成
- 用户感知到的只是"这个 AI 越用越懂我"

明确**反对**的产品形态：

- 不做小程序商店心智（"挑一个 app 打开使用"）
- 不让用户手动 fork、命名、整理 lib
- 不做公开 registry 与用户互相分享（Phase 4 之前不实现）

## 3. 数据模型

### 3.1 LearningApp（能力单元）

```ts
type LearningApp = {
  id: string;
  name: string;             // agent 可读的语义名，例如 "flashcard_session"
  displayName: string;      // 用户可读的展示名
  category: "drill" | "explainer" | "simulation" | "reader" | "planner" | "other";
  version: string;
  author:
    | { kind: "agent_generated"; sourceSessionId: string }
    | { kind: "user_forked"; parentAppId: string }
    | { kind: "system_seed"; seedId: string };

  inputs: ZodSchema;        // agent 调用时要传的参数
  capabilities: string[];   // 声明需要的 memory 读写权限
                            // 例如 "read:vocab.weak", "write:vocab.progress"

  template:
    | { type: "html"; source: string }
    | { type: "generator"; prompt: string };

  stateSchema?: ZodSchema;  // 这个 app 跨 session 会持久化什么进度

  metadata: {
    createdAt: string;
    lastUsedAt: string;
    usageCount: number;
    successRate?: number;   // 后续接评分时填
  };
};
```

`template.type` 有两种：

- `html`：模板写死，调用便宜稳定
- `generator`：保存 prompt 模板，调用时让 LLM 填充，灵活但贵

同一个 app 可以从 generator 退火成 html（用得多就缓存生成产物）。

### 3.2 UserCapabilityLibrary

每个用户一份：

```ts
type UserCapabilityLibrary = {
  userId: string;
  apps: LearningApp[];
  usage: Record<
    string,
    { totalCalls: number; lastUsedAt: string; avgDwellMs: number }
  >;
  pinned: string[];         // 用户手动 pin 到 home 的 appId
};
```

### 3.3 SessionInstance

```ts
type SessionInstance = {
  sessionId: string;
  appId: string;
  state: unknown;           // 受 app.stateSchema 校验
  startedAt: string;
  endedAt?: string;
};
```

## 4. Agent 编排（两阶段路由）

为避免把所有 installed apps 都注入主 agent 的 tool 列表（会显著降低选择准确度），采用两阶段：

```
用户消息
   ↓
[Router Agent]
   - 只看 manifest 的 name / category / inputs schema
   - 输出：A. 命中候选 app（top 3-5）
           B. 无合适 app → 走现场生成
           C. 不需要 app → 闲聊
   ↓
[Main Tutor Agent]
   - 只暴露 router 选出的 ≤5 个 app 作为 tool
   - 加上现有的 plan_visualization / render_interactive_widget / generate_course
   - 执行选中的工具
   ↓
[Sedimentation Pass]（异步、后台）
   - 这次现场生成的 widget 值不值得沉淀成 app？
   - 是 → save_as_app({ provenance: "agent_generated", ... })
   - 否 → 丢弃
```

Router 与 main agent 之间通过 shared state 传递候选集，不增加额外网络往返。

## 5. 沉淀机制（Sedimentation Pass）

每次 main agent 完成一次"现场生成"路径后，触发一次轻量评估：

判据（信号组合，不需要全部满足）：

- 用户在该 widget 上停留 / 交互时长是否超过阈值（默认 30s）
- 用户后续是否追加同类提问（"再来一个" / "类似的"）
- 模型自评：生成结构是否规整、参数是否可抽象（让 LLM 给一个 0-1 分）
- 用户是否点了 widget 内的"再做一次"按钮

通过则调用内部工具：

```ts
save_as_app({
  name: string;            // 由 LLM 起的语义名
  displayName: string;
  category: ...;
  inputs: ZodSchema;       // 从这次调用反推
  template: { type, source };
  capabilities: string[];
});
```

**关键**：这个工具不暴露在 main agent 的对话 tool 集合里，只由 sedimentation pass 调用。用户看不到这个动作。

## 6. Fork 机制

当用户提出"在 X 基础上改 Y"时，agent 不修改正在运行的 widget，而是：

1. 在用户 lib 里找到 X 对应的 LearningApp
2. 复制 manifest，应用差异
3. 存为新 app，`author.kind = "user_forked"`，`parentAppId = X.id`
4. 下次用户用类似措辞召唤时，router 命中 fork 版

Fork 流程对用户也是静默的，用户只感觉"它记住了我的偏好"。

## 7. Memory 集成（预留接口，不在本期实现）

Manifest 的 `capabilities` 字段定义 app 需要的 memory 权限：

```
"read:vocab.weak"          // 读取学习者画像里的薄弱词条
"read:learning.style"
"write:vocab.progress"     // 写入进度
"write:errors.recent"
```

后期接入 mem0 / 自建 memory 时：

- 实现一个 `MemoryGateway`，根据 capabilities 决定能传给 app 哪些数据、能写哪些字段
- App 本身代码不需要改

本期：先把 capabilities 字段定义、存起来，运行时直接 pass-through 不做权限校验。

## 8. UI 呈现

最小化改动：

- 主 chat 体验完全不变
- `apps/web/src/app/library` 已经存在，新增一个 tab"我的应用"
- 列表展示沉淀下来的 apps：displayName、category、最近使用、调用次数
- 每个 app 可以点击"在 chat 中使用"（生成一句 prompt 触发 router）
- 可以 pin 到 home（影响 router 的优先级，不影响主交互）
- **没有**"上传 app" / "发布 app" / "浏览社区 app"按钮

## 9. 明确推迟项

| 功能 | 推迟到 | 理由 |
|---|---|---|
| 公开 registry | Phase 4 | 单用户价值需先跑通 |
| 用户互相分享 lib | Phase 4 | 平台级脏活，moderation / 版本 / 权限 |
| 手动 fork UI | 可能永不做 | 让 agent 静默 fork 即可 |
| App 评分、举报 | Phase 4+ | 同上 |
| 跨用户搜索 app | Phase 4 | 同上 |

## 10. 落地阶段

### Phase 1（本期目标）

1. 定义 `LearningApp` schema 和数据库表（暂用 JSON 存，PostgreSQL 后续接入）
2. 在 `apps/web/src/lib/courses/` 旁新增 `apps/web/src/lib/capability-library/`
3. 在 `render_interactive_widget` 工具返回后挂 sedimentation pass：
   - 异步评估
   - 命中阈值则调用内部 `save_as_app`
4. Library 页加"我的应用"tab，纯只读展示

验收：

- 用户连续问 2-3 个同类可视化需求，能在 Library 看到自动沉淀的 1 个 app
- 主 chat 体验无任何回退

### Phase 2

5. 实现 Router Agent（独立的轻量 LangGraph 节点）
6. Installed apps 按 router 输出动态注入 main agent 的 tool 集合
7. App 命中时跳过现场生成路径，直接调用模板

验收：

- 重复同类请求时，从"现场生成 5-10s" 降到"app 调用 1-2s"
- Router 误判率（应命中而没命中）<10%

### Phase 3

8. 接入 memory（mem0 或自研），打通 capabilities 权限映射
9. App state 跨 session 持久化（背词进度、阅读位置等）
10. Fork 流程上线

### Phase 4（远期、可选）

11. 公开 registry + 分享

## 11. 关键设计决策与备注

- **Router vs 单 agent**：尝试过的同类系统（动态 tool 注入）在 tool 数 >20 后选择能力下降明显，必须做 router
- **静默沉淀 vs 用户主动保存**：Notion 模板、Raycast、GPT Store 均显示，普通用户不会主动组装工具；power user 才会
- **不做公开分享的代价**：放弃了网络效应，但保住了"用户专属"的纯度。后期若做，应作为可选项而非默认
- **iframe 沙箱已就位**：现有的 `WidgetRenderer` 沙箱、import map、resize bridge、widget-to-tutor prompt bridge 不需要改造，直接复用
- **不引入新依赖**：本期所有改动在现有 LangGraph + Next.js + iframe 架构内完成

## 12. 一句话总结

用户感知：一个 chat，越用越懂我。
系统真相：背后是一个不断自我扩充的、按用户私有的能力库 + 学习画像。
护城河：用户不能带走的不是 prompt、不是 UI，而是只属于他的 app 集合 + memory。
