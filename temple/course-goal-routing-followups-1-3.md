# Course Goal Routing Follow-ups 1-3

本文档给后续 Coding Agent 使用，目标是修复“库外课程目标”路由链路的前三个行动项。请把这里当作任务上下文，不要只看单个文件后凭直觉改。

## 背景

Primoria 的课程创建有两类目标：

- 库内目标：用户输入能定位到现有知识图谱。课程应锚定已有 `graphId`、`topicId`，并复用 KG 上的 topic/concept 结构。
- 库外目标：用户输入是真实可学习主题，但当前课程库没有覆盖。系统应生成并持久化一个 `gen_*` topic graph，再像库内图谱一样创建课程。

当前相关入口和路径：

- `apps/web/src/lib/knowledge-graph/position-learning-goal.ts`
  - `positionLearningGoal()` 是目标定位总入口。
  - 当前先调用 `searchKnowledgeGraphNodes()` 做 KG 召回。
  - 如果召回为空或最高相似度低于 `params.floor`，会在 `position-learning-goal.ts:87` 直接返回 `fallback`。
  - 只有通过 floor gate 后，才会调用 `runStage2Positioning()`。
- `apps/web/src/lib/knowledge-graph/positioning-llm.ts`
  - `runStage2Positioning()` 让 LLM 在 `positioned | clarify_subject | out_of_library | fallback` 之间做决定。
  - 目前 `input.graphs.length === 0` 时直接返回 `null`。
- `apps/web/src/lib/knowledge-graph/generated-graph.ts`
  - `getOrCreateGeneratedGraph()` 负责按 normalized topic 复用或生成 `gen_*` graph。
  - 生成结果写入 `generated_topic_graphs`，用于后续沉淀和人工 promotion。
- `apps/web/src/app/api/learning/course/route.ts`
  - Home 页直接创建课程的 API。
  - 传入 `{ topic }` 时走库外/freeform 请求。
  - 当前即使 `getOrCreateGeneratedGraph()` 返回 `null`，也会继续调用 `initializeCourseOutline()`，只是 `generatedGraph` 变成 `undefined`。
- `apps/web/src/lib/learner-profile/onboarding-positioning.ts`
  - Onboarding 目标定位入口。
  - 当前库外目标生成图谱失败时会 throw。

本轮不处理密码重置和邮件验证。鉴权错误脱敏已经有独立提交和测试，除非它直接影响课程目标路由，否则不要扩大范围。

## 术语约定

本任务里用户明确要求：“第二点策略是 fail-open，就是报错，因为目前是开发阶段。”

注意：这和业界常用术语不完全一致。通常“fail-open”指失败后继续放行或降级，“fail-closed/fail-fast”才更接近显式报错。为了避免和用户口径冲突，本任务按以下定义执行：

> 开发期 fail-open = 不静默降级，不创建弱化 freeform course，直接暴露明确错误，让问题尽早被发现。

后续 Coding Agent 不要把这个策略自动改回“生成失败时继续创建无图谱课程”。

## 行动 1：修复低相似度目标被提前 fallback

### 当前问题

`positionLearningGoal()` 在 KG 召回为空或低于 floor 时直接 fallback：

```ts
if (search.results.length === 0 || maxSimilarity < params.floor) {
  return {
    result: {
      branch: "fallback",
      graphId: search.graphId,
      params,
      diagnostics: buildDiagnostics(maxSimilarity, []),
    },
    search,
  };
}
```

这会导致真正的库外学习目标没有机会进入 `out_of_library`。例如：

- `MCP 和 Agent 架构`
- `Claude Code subagent 设计`
- `WebGPU shader 入门`
- 其他现有 KG 没覆盖但明显可教学的技术主题

如果 embedding 召回分数低，它们会被当作“太模糊/不可处理”。

### 目标行为

低相似度不应该直接等于 fallback。建议把目标路由拆成更明确的决策：

```ts
type GoalRoute =
  | { kind: "library_match"; result: PositioningResult }
  | { kind: "clarify"; candidates: SubjectCandidate[]; message: string }
  | { kind: "custom_course"; topic: string; message: string }
  | { kind: "reject"; message: string };
```

合理流程：

1. 先做 KG recall。
2. 如果 recall 足够可信，继续走现有 Stage 2 定位。
3. 如果 recall 为空或低于 floor，不要立即 fallback。
4. 对低相似度输入做一次“是否是真实学习主题”的判断。
5. 如果是真实学习主题，返回 `out_of_library/custom_course`。
6. 如果太短、太泛、不是学习目标，再 fallback/reject。

### 可接受实现方向

优先选择小改动：

- 新增一个轻量函数，例如 `runOutOfLibraryGoalGate()` 或 `classifyFreeformGoal()`。
- 输入包括 `query`, `language`, `librarySubjects`。
- 输出只需要 `out_of_library` 或 `fallback`，不要重新发明完整课程生成。
- 在 `positionLearningGoal()` 的 floor gate 分支中调用它。

也可以扩展 `runStage2Positioning()` 支持空 `graphs`，但要注意它现在的 prompt 是围绕 candidate graph topic lists 设计的。若强行传空候选，容易让 prompt 语义变弱。更清晰的做法是单独的 freeform gate。

### 不要做的事

- 不要把 floor 直接调得很低来“碰运气”。这会把库内误定位和库外目标混在一起。
- 不要把所有低相似度输入都生成图谱。像“帮我随便学点东西”“asdf”“我不知道”应继续 fallback。
- 不要让 agent 侧 `apps/agent/src/graph.mjs` 直接操作 DB。AGENTS.md 明确说 DB access 只在 `apps/web/` server-side。

## 行动 2：统一 Home 和 Onboarding 的生成图谱失败策略

### 当前问题

Home 入口当前是静默降级：

```ts
const generated = await getOrCreateGeneratedGraph({ topic: parsed.topic, language: parsed.language ?? null });
outlineInput = {
  ownerId,
  topic: parsed.topic,
  source: "cold_start",
  language: parsed.language ?? null,
  generatedGraph: generated?.graph,
};
```

如果 `generated` 是 `null`，`initializeCourseOutline()` 会收到 `generatedGraph: undefined`，随后创建一个没有 `graphId` 的 freeform course。

Onboarding 入口当前是显式报错：

```ts
const generated = await getOrCreateGeneratedGraph({ topic: plan.topic, language });
if (!generated) {
  throw new Error(plan.message || "暂时无法为这个主题生成课程，请换个说法再试一次。");
}
```

这会导致同样的库外课程能力，在 Home 和 Onboarding 两个入口表现不一致。

### 目标策略

按用户要求，开发阶段采用显式报错策略：

- `getOrCreateGeneratedGraph()` 返回 `null` 时，不要继续创建无图谱 freeform course。
- Home 和 Onboarding 都应失败。
- 错误信息可以对用户友好，但日志里应保留足够上下文。
- 这不是最终产品策略，只是开发期为了暴露生成图谱失败的真实问题。

### 建议行为

Home API：

- 如果请求是 `{ topic }`。
- 先调用 `getOrCreateGeneratedGraph()`。
- 如果返回 `null`，throw 一个明确错误，例如 `Generated graph creation failed for out-of-library topic.`。
- catch 层仍然返回现有的安全用户消息即可，但日志必须保留 server-side error。

Onboarding：

- 现有 throw 行为可以保留。
- 只需要确认 Home 和 Onboarding 的错误语义一致。

### 取舍说明

显式报错的优点：

- 开发阶段能尽早发现 graph generation、LLM 输出、DB 写入、schema 解析问题。
- 不会悄悄产生质量较弱、不可沉淀、不可复用的课程。
- 不会绕过 `gen_*` graphId 的 per-owner dedup 和后续 promotion 数据。

显式报错的缺点：

- 模型临时失败或配额问题会直接挡住用户创建课程。
- 产品体验没有静默降级顺滑。

当前任务选择前者，因为用户明确说现在是开发阶段。

## 行动 3：补库外目标集成测试

### 当前测试缺口

已有 `apps/web/tests/out-of-library.spec.ts` 覆盖了：

- Stage 2 能解析 `out_of_library`。
- `planFromPositioning()` 能映射 out-of-library branch。
- `parseGeneratedGraph()` 和 `toTopicGraph()` 的基础行为。
- `codeEligible` 对 generated graph 生效。

但它没有覆盖最关键的 orchestration：

- `positionLearningGoal()` 在空召回时是否能进入库外逻辑。
- `positionLearningGoal()` 在低相似度时是否能进入库外逻辑。
- Home API 在 generated graph 失败时是否停止。
- Onboarding 和 Home 是否使用一致失败策略。

### 应补测试

至少补以下场景：

1. 空召回 + 明确可学习主题：
   - 输入：`MCP 和 Agent 架构`
   - Mock KG search 返回空结果。
   - Mock freeform gate 返回 out_of_library。
   - 断言 `positionLearningGoal()` 返回 `branch: "out_of_library"`。

2. 低相似度 + 明确可学习主题：
   - Mock search 返回结果，但 `maxSimilarity < floor`。
   - 断言不直接 fallback，而是调用 freeform gate。

3. Stage 2 明确返回 out_of_library：
   - 现有单测已有部分覆盖，但建议保留或扩展成更接近 `positionLearningGoal()` 的集成测试。

4. 生成图谱失败：
   - Home route `{ topic }` 请求中，mock `getOrCreateGeneratedGraph()` 返回 `null`。
   - 断言不会调用 `initializeCourseOutline()` 生成无图谱课程。
   - 断言返回错误状态。

### 测试实现提示

如果直接 mock ESM import 很麻烦，可以做一个小的依赖注入 seam，但不要把生产代码改成过度抽象。可接受方式：

- 给 `positionLearningGoal()` 增加可选 `deps` 参数，仅在测试注入 search/gate/stage2。
- 或者把 floor-gate 后的新 freeform classifier 做成独立纯函数，先单测 classifier，再用一两个集成测试覆盖总入口。

不要只写 source-string test。这里要验证真实行为，不是验证某段字符串存在。

## 验收命令

建议后续 Agent 完成修改后至少运行：

```bash
cd apps/web
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run tests/out-of-library.spec.ts
./node_modules/.bin/tsx tests/positioning.unit.ts
./node_modules/.bin/tsx tests/onboarding-static.unit.ts
```

再从仓库根目录运行：

```bash
node --check apps/agent/src/graph.mjs
git diff --check
```

如果修改了 API route，建议补充对应 route-level 测试或至少用 mock request 覆盖返回状态。

