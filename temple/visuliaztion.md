# Lesson Visual Block 生成链路改造说明

## 背景

当前 Primoria 的 lesson 生成流程里，`visual` block 不是走首页或聊天中的 visualization 专用路径，而是被当作普通课程 block 的一种类型，直接由 Course Block Writer 生成。

这意味着它能产出可渲染的 visual payload，但它不是一个独立的视觉生成链路。它和 `text`、`analogy`、`code` 等 block 在同一套写作逻辑中生成。

## 当前实现路径

### 1. Lesson generation processor

文件：

```text
apps/web/src/lib/courses/lesson-generation-processor.ts
```

当前阶段大致是：

1. `planning`
2. `writing`
3. `validating`
4. `saving`

关键流程：

```text
processLessonGenerationJob()
  -> loadOrCreatePlan()
  -> batchBlockJobs(plan.jobs)
  -> writeMissingBatches()
  -> generateBlockBatch()
  -> validateLessonBlocks()
  -> publishLessonAndCompleteJob()
```

也就是说，当前没有单独的 `visualizing` 阶段。

### 2. Lesson Planner 只规划结构

文件：

```text
apps/web/src/lib/ai/course-generation/lesson-planner.ts
```

Planner 的职责是把 KG topic context 转成 compact LessonPlan IR。

它输出的是：

- block 顺序
- block 类型
- pedagogical role
- conceptIds
- one-line goal

它不负责写完整课程内容，也不负责生成完整 visual payload。

当前 Planner 会读取 KG concept 上的 `visual` affordance。如果某个 concept 有 `visual`，Planner 会要求为它生成一个 `V=visual` block。

关键规则：

```text
For EACH concept listed under VISUAL CONCEPTS above,
exactly one V=visual block with role "deepening" whose conceptIds is [that one concept].
```

### 3. Block Writer 同时生成普通 block 和 visual block

文件：

```text
apps/web/src/lib/ai/course-generation/block-writer.ts
```

当前 `batchBlockJobs()` 会把同一个 concept 下的 block 按最多 3 个分到一个 batch。

例如，同一个 concept 下可能出现：

```text
6:text
7:visual
```

或者：

```text
11:text
12:text
13:visual
```

这些会进入同一次 Block Writer model call。

当前 `VISUAL_ENGINE_HINTS` 会要求 Block Writer 直接输出完整 engine payload，例如：

- `algorithmViz`
- `mathExplorer`
- `physicsScene`
- `echartsOption`
- `mermaidDefinition`
- `html`

所以当前 visual payload 是由普通 Block Writer 顺手写出来的，而不是由 visualization 专用 builder 生成。

### 4. 首页/聊天里的 visualization 路径是另一套能力

文件：

```text
apps/agent/src/graph.mjs
```

首页或聊天里的 visualization 相关路径包括：

- `plan_visualization`
- `render_algorithm`
- `render_math_explorer`
- `render_3d_scene`
- chart renderer
- diagram renderer
- physics renderer
- wave renderer
- graph renderer
- molecule renderer
- general widget renderer

这套路径的特点是：

- 先判断视觉类型
- 再走专门 renderer
- 产出结构化 artifact
- 不依赖普通课程 block writer 顺手生成 payload

## 当前问题

### 1. visual 和普通文字 block 抢同一个上下文窗口

当前 visual 经常和同一个 concept 下的 `text` block 一起进入同一次 writer batch。

这会导致 visual 的生成质量受普通文字 block 影响。模型既要写正文，又要写复杂 visual payload，注意力和输出预算会混在一起。

之前对最近一次 lesson generation 的估算显示：

- 总模型调用约 10 次
- 总 token 约 14,817
- visual writer 调用 2 次
- visual 相关 token 约 4,760

这个数量本身不算夸张，说明 `maxTokens` 不是最明显的瓶颈。更大的问题是 visual 没有独立上下文和独立生成目标。

### 2. visual 没有基于最终课程正文生成

当前 visual 主要基于：

- KG concept
- concept 上的 `visual`
- concept 上的 `visualHint`
- Planner 给出的 goal
- neighbor goals

但它通常看不到已经生成好的正文 block 内容。

因此 visual 可能和 lesson 的真实叙述不够贴合。

### 3. visual 没有走专门 visualization builder

首页/聊天里已经有更细分的 renderer 能力，例如：

- algorithm visualization
- math explorer
- 3D scene
- interactive widget
- chart
- diagram

但 lesson visual 现在没有复用这套专门路径，而是让 Block Writer 直接按照 schema 写 payload。

这样做短期简单，但长期会限制 visual 的质量和可维护性。

### 4. 失败隔离不够好

当前 checkpoint 的主要单位是：

- plan checkpoint
- batch checkpoint

如果 visual payload 失败，它所在的 batch 会失败，可能影响同 batch 里的普通 text block。

更理想的是：

- 普通课程内容先成功 checkpoint
- visual 单独 checkpoint
- visual 失败只重试 visual
- 不应该因为一个 visual payload 错误导致普通正文被重写

### 5. 不利于后续统计和质量控制

因为 visual 没有独立阶段，所以很难单独记录：

- visual prompt tokens
- visual output tokens
- visual engine
- renderer success/failure
- fallback path
- validation error

这会影响后续对 visual 质量的优化。

## 推荐方案

不要复制完整聊天 Agent，也不要让建课流程调用整个聊天 Agent。

推荐抽出一个可被 lesson generation 调用的 visualization builder，只复用创建 visualization 的路径和 renderer 能力。

核心思路：

```text
Lesson Planner
  -> Block Writer writes normal content and lightweight visualSpec
  -> Visual Builder generates real visual payload
  -> Validate
  -> Save lesson
```

## 新链路设计

### 1. Planner 继续决定哪些 concept 需要 visual

Planner 仍然根据 KG concept 上的 `visual` affordance 决定是否需要 visual block。

这部分不需要大改。

### 2. Block Writer 不再直接生成完整 visual payload

Block Writer 对 visual block 只生成轻量 `visualSpec`。

例如：

```ts
type VisualSpec = {
  title: string;
  description: string;
  conceptId: string;
  goal: string;
  visualKind: string;
  interaction?: string;
  constraints?: string[];
};
```

它不再直接写完整的：

- `algorithmViz`
- `mathExplorer`
- `physicsScene`
- `html`
- `echartsOption`
- `mermaidDefinition`

### 3. 普通 block 先生成完成

普通 block 包括：

- text
- analogy
- transfer
- code
- quiz
- summary

这些继续走现有 Block Writer。

### 4. 新增 Visual Builder 阶段

在 `writing` 后、`validating` 前增加一个阶段：

```text
planning
writing
visualizing
validating
saving
```

Visual Builder 输入：

```ts
type GenerateLessonVisualBlockInput = {
  lessonId: string;
  lessonTitle: string;
  language: string | null;
  graphId: string;
  topicId: string;
  topicName: string;
  conceptId: string;
  conceptName: string;
  visualKind: string;
  visualHint?: string | null;
  visualSpec: {
    title: string;
    description: string;
    goal: string;
    interaction?: string;
  };
  surroundingBlocks: Array<{
    order: number;
    type: string;
    title?: string;
    textPreview: string;
  }>;
};
```

Visual Builder 输出：

```ts
type GenerateLessonVisualBlockOutput = CourseBlock;
```

### 5. Visual Builder 复用专门 visualization renderer 思路

Visual Builder 不应该调用完整聊天 Agent。

它应该是一个确定性的 service/function，例如：

```ts
generateLessonVisualBlock(input): Promise<CourseBlock>
```

内部可以根据 `visualKind` 或 concept metadata 路由到不同 renderer prompt/schema：

```text
algorithm -> algorithm visualization payload
function/math -> math explorer payload
simulation -> physics scene payload
diagram -> mermaid payload
chart -> echarts payload
interactive/general -> html widget payload
3d -> 3D scene payload
```

## 为什么这是更好的方案

### 1. visual 有独立上下文和输出预算

visual 不再和普通 text block 混在一个 batch 里。

模型调用可以专注于：

- 如何表达这个概念
- 用什么视觉结构
- 如何设计交互
- 如何满足 renderer schema

这比让普通 Block Writer 同时写正文和 visual payload 更可靠。

### 2. visual 能贴合真实 lesson 内容

Visual Builder 可以读取已经生成好的相邻 block 内容。

例如：

- 前一个 explanation block 讲了什么
- 后一个 example block 要接什么
- 当前 lesson 的核心叙事是什么

这样生成出来的 visual 不只是“这个 concept 的通用图”，而是“这节课里真正需要的图”。

### 3. 复用 visualization 能力，但不引入聊天 Agent 的复杂性

完整聊天 Agent 包含：

- 对话状态
- 多轮 tool routing
- task delegation
- 用户即时意图判断
- UI artifact streaming

这些不适合直接塞进后台建课 pipeline。

建课 pipeline 需要的是：

- 输入确定
- 输出确定
- 可 checkpoint
- 可重试
- 可验证

所以应该只抽 visualization builder，而不是复制完整 Agent。

### 4. 失败隔离更清楚

普通正文写作成功后可以 checkpoint。

visual 失败时：

- 只重试该 visual
- 不重写正文
- 不影响同 lesson 的其他 block
- 可以有 fallback visual

### 5. 后续可观测性更好

visual 独立之后，可以记录：

- visual engine
- visual prompt tokens
- visual output tokens
- renderer success/failure
- fallback path
- validation errors

这对后续优化 visual 质量很重要。

## 建议实现路径

### Phase 1：最小可行改造

新增文件建议：

```text
apps/web/src/lib/ai/course-generation/visual-builder.ts
apps/web/src/lib/ai/course-generation/visual-spec.ts
apps/web/src/lib/ai/course-generation/visual-validator.ts
```

改造点：

1. 修改 `block-writer.ts`
   - visual block 不再要求 writer 直接输出完整 engine payload
   - 改为输出 `visualSpec`
   - 非 visual block 继续走现有 writer

2. 修改 `lesson-generation-processor.ts`
   - 在 `writing` 后、`validating` 前增加 `visualizing`
   - 调用 `generateLessonVisualBlock(...)`
   - 把生成结果拼回 lesson blocks

3. 修改 checkpoint
   - 简单方案：继续使用 `kind: "batch"`，但 checkpoint key 使用 `visual:<order>`
   - 更清晰方案：扩展 checkpoint kind 为 `plan | batch | visual`

推荐更清晰方案，但需要同步更新 DB type、store type、测试。

4. 增加 visual validation
   - 校验 engine payload 是否满足对应 renderer schema
   - 校验 visual block 是否仍保留 conceptIds、title、description、id 等课程 block 必需字段

### Phase 2：质量增强

1. visual fallback
   - algorithm 失败后可以降级为 simpler algorithm payload
   - html widget 失败后可以降级为 mermaid/diagram
   - 3D 失败后可以降级为 static diagram

2. token usage 记录
   - 当前真实 provider usage 没有落库，只能通过 prompt/checkpoint 估算
   - 后续可把 provider usage metadata 或本地估算写入 checkpoint metadata

3. visual QA
   - 对 algorithm/math/html/3D 增加静态 schema test
   - 第一版不强制浏览器视觉测试

## 非目标

这次不要做：

1. 不要复制完整聊天 Agent
2. 不要让 lesson generation 依赖对话状态
3. 不要把 course generation 变成多轮聊天式 agent
4. 不要一次性重写整个 lesson generation pipeline
5. 不要为了这个任务重做前端 BlockRenderer UI

## 验收标准

1. visual block 不再由普通 Block Writer 直接生成完整 payload
2. visual block 有独立生成函数或模块
3. visual 生成可以拿到相邻正文 block 内容
4. visual 有独立 checkpoint 或至少独立 checkpoint key
5. visual 失败不会导致普通 text block 重写
6. 原有 lesson generation tests 通过
7. 新增测试覆盖：
   - visual job 从 writer batch 中拆出
   - visual builder 被调用
   - visual payload 被拼回 lesson blocks
   - visual checkpoint 可复用
   - visual 失败时只影响 visual，不丢掉已生成 text blocks

## 总结

这个方案值得做，但第一版要控制边界。

正确方向不是“建课 Agent 调完整聊天 Agent”，而是抽出一个专门的 `Visual Builder`。

它应该复用现有 visualization renderer 的能力，但以后台建课 pipeline 需要的方式运行：

- 确定输入
- 确定输出
- 可 checkpoint
- 可重试
- 可验证

这样既能提升 lesson visual block 的质量，也不会把聊天 Agent 的复杂性引入建课流程。
