# Lesson Generation LLM Architecture Handoff

这份文档用于移交给 Claude Code，实现 **当前 Lesson Generation LLM 架构调整**。

本任务只改 lesson generation 内部的 Planner / Block Writer 职责边界。不要做 Facts About You、Extractor Agent、Tutor 对话个性化、Settings memory、建课入口注入、DB schema 画像字段等内容。

## 本任务目标

当前架构已经有两类 LLM：

```text
Lesson Generation Worker
  ↓
Planner LLM
  ↓
Block Writer LLM
```

但现在 Planner 输出的 block outline 还比较薄，Block Writer 仍然需要自己从整体 lesson context 中推断“这个 block 应该怎么写”。

本任务要把架构调整为：

```text
Worker
  ↓
Planner LLM
  负责更完整的教学设计
  为每个 block 产出明确 writerInstruction
  ↓
Block Writer LLM
  不再承担教学策略决策
  只根据 block outline + writerInstruction 写具体内容
```

一句话：

> Planner 负责设计，Block Writer 负责执行。

## 不做的事情

Claude Code 不要实现这些：

- 不新增 `learner_facts` 表。
- 不新增 Extractor Agent。
- 不新增 extractor jobs / worker。
- 不做 Facts About You 的真实后端。
- 不改 Settings memory UI。
- 不把 facts 注入 Tutor 对话。
- 不把 facts 注入建课入口。
- 不改 `/api/learning/course` 的建课入口逻辑。
- 不改 learner profile 的 3 个声明式字段：
  - `learningGoal`
  - `knowledgeBackground`
  - `tutorStyle`

这次只改 Lesson Generation 的 Planner / Block Writer 之间的 contract。

## 当前代码路径

主要文件：

- `apps/web/src/lib/courses/lesson-generation-processor.ts`
  - 后台 worker processor。
  - 调用 `planLesson(...)`。
  - 调用 `generateBlockBatch(...)`。

- `apps/web/src/lib/ai/course-generation/lesson-planner.ts`
  - `buildPlannerPrompt(kg)`。
  - Planner LLM 生成 LessonPlan IR。
  - 目前只输出 block 的 `order/type/role/conceptIds/goal`。

- `apps/web/src/lib/ai/course-generation/lesson-plan-ir.ts`
  - LessonPlan IR schema / block schema。

- `apps/web/src/lib/ai/course-generation/lesson-plan-compiler.ts`
  - 把 Planner IR 编译成 writer jobs。

- `apps/web/src/lib/ai/course-generation/block-writer.ts`
  - `buildBatchPrompt(batch, plan, kg)`。
  - Block Writer LLM 生成具体 block 内容。

- `apps/web/src/lib/ai/course-generation/block-content-compiler.ts`
  - 校验/编译 writer 输出内容。

## 当前问题

Planner 现在主要决定：

- block 数量
- block 类型
- block 顺序
- block role
- conceptIds
- 简短 goal

但 `goal` 太短，不能稳定表达具体写作策略。

结果是 Block Writer 在写内容时仍然要自己推断：

- 应该先直觉还是先定义？
- 应该用什么例子？
- 这个 block 和前后 block 如何避免重复？
- visual / quiz / analogy 的具体教学角度是什么？
- 哪些概念需要更谨慎地解释？

这会让 Writer 负担过重，也更容易跑题或重复。

## 目标架构

Planner 输出每个 block 时，除了原有字段，还要新增一个 **writerInstruction**。

示例：

```json
{
  "order": 3,
  "type": "T",
  "role": "explanation",
  "conceptIds": ["entropy"],
  "goal": "explain entropy as uncertainty reduction",
  "writerInstruction": "Start with a guessing-game intuition, then introduce the formula only after the learner understands why uncertainty matters. Avoid repeating the roadmap block."
}
```

`goal` 仍然保留，用于短目标和 validation。

`writerInstruction` 是给 Block Writer 的具体执行 brief，用于告诉 Writer：

- 这个 block 应该怎么展开。
- 用什么角度讲。
- 要避免什么重复。
- 是否需要例子、反例、类比、直觉铺垫。
- visual / quiz / code block 需要突出什么交互或检查点。

## 字段命名

使用：

```ts
writerInstruction
```

不要用：

- `writerPrompt`
- `personalizationHint`
- `prompt`

原因：

- `writerPrompt` 容易让人误以为这是完整 prompt。
- `personalizationHint` 太窄，这次不是只做个性化。
- `prompt` 语义过宽。

`writerInstruction` 更明确：这是 Planner 给 Writer 的一段执行说明。

## 实现要求

### 1. 扩展 LessonPlan IR

在 `lesson-plan-ir.ts` 中给每个 planned block 增加：

```ts
writerInstruction: z.string().trim().min(...).max(...)
```

建议限制：

- min: 10 或 12
- max: 280 或 320

要求：

- 必填。
- 不能是空字符串。
- 输出语言应该跟 lesson 语言一致，或至少能被 Writer理解。
- 不需要持久化到最终 CourseBlock；它是 generation-time instruction。

### 2. 修改 Planner prompt

在 `lesson-planner.ts` 中更新 `buildPlannerPrompt(...)`。

Planner 输出格式必须新增 `writerInstruction`：

```json
{"order":1,"type":"T","role":"hook","conceptIds":["c1"],"goal":"spark curiosity","writerInstruction":"Open with a surprising real-life situation and end by naming the concept. Do not explain the full definition yet."}
```

Prompt 需要明确：

- Planner 不写最终正文。
- `writerInstruction` 是给 Block Writer 的执行 brief。
- 每个 block 的 `writerInstruction` 必须具体，不能泛泛而谈。
- 不要重复 `goal`。
- 要说明这个 block 如何服务当前 role。
- 要提醒如何避免和相邻 block 重复。

可以加入规则：

```text
writerInstruction:
- 1-2 concise sentences.
- Give the writer the angle, example style, or constraint for this exact block.
- Do not write the block content.
- Do not include JSON schema instructions.
- Do not mention unrelated concepts.
```

### 3. 修改 Skeleton

`buildLessonSkeleton(...)` 现在只生成 type/role/conceptIds/note。

需要让 skeleton 或 prompt 明确每个 block 都要填 `writerInstruction`。

不一定要在 skeleton 文本里完整写 JSON，但要让 Planner 明白：

- skeleton 中的 note 是 planning hint。
- 最终 JSON block 必须包含 `writerInstruction`。

### 4. 修改 Compiler

在 `lesson-plan-compiler.ts` 中让 compiled job 携带 `writerInstruction`。

目标是让 `BlockGenerationJob` 里有：

```ts
writerInstruction: string;
```

这个字段应该来自 Planner IR。

编译时要继续校验：

- order 合法
- type 合法
- role 合法
- conceptIds 合法
- goal 合法
- writerInstruction 合法

如果旧 checkpoint 里没有 `writerInstruction`，不要默默兼容成空字符串。更安全的策略是：

- 让 checkpoint version / IR version 触发重新 planning。
- 或者 compiler 报错，processor 会丢弃旧 plan 并重新生成。

### 5. 修改 Block Writer prompt

在 `block-writer.ts` 的 `describeJob(...)` 中，把 `writerInstruction` 明确传给 Writer。

示例输出：

```text
- order 3: text (role explanation), concepts: Entropy [id=entropy].
  Goal: explain entropy as uncertainty reduction.
  Writer instruction: Start with a guessing-game intuition, then introduce the formula only after the learner understands why uncertainty matters.
  Fields: "title","markdown"...
```

要求：

- Writer 必须遵守 `writerInstruction`。
- Writer 不能改变 block type / role / conceptIds。
- Writer 不需要也不应该重新规划 lesson。

### 6. 不改最终 CourseBlock schema

`writerInstruction` 是 Planner -> Writer 的内部 contract。

不要把它保存到最终 lesson block 里，除非当前架构已经会保留 planner metadata。

本任务目标是改善生成链路，不是新增用户可见字段。

## 预期效果

修改后：

- Planner 更像教学设计师。
- Block Writer 更像执行写手。
- Writer prompt 更窄、更稳定。
- Writer 不需要自己推断每个 block 应该怎么写。
- 后续如果要接 learner facts，可以只让 Planner 消化 facts，再把结果写进 `writerInstruction`，不用全量塞给 Writer。

## 测试要求

至少更新/新增这些测试：

### Planner prompt / IR

- `buildPlannerPrompt(...)` 的输出格式要求包含 `writerInstruction`。
- Planner IR schema 要求每个 block 有 `writerInstruction`。
- 缺失 `writerInstruction` 的 plan 应该失败。
- 空 `writerInstruction` 应该失败。

### Compiler

- `compileLessonPlanIr(...)` 会把 `writerInstruction` 带到 `BlockGenerationJob`。
- invalid writerInstruction 会失败。
- 现有 block order/type/role/conceptIds 校验不被破坏。

### Block Writer

- `buildBatchPrompt(...)` / `describeJob(...)` 包含 `Writer instruction:`。
- Writer prompt 不包含完整 lesson 重新规划要求。
- Writer prompt 仍然包含：
  - `languageDirective(kg.language)`
  - `knowledgeBackgroundDirective(kg.knowledgeBackground)`
  - schema / fields hints

### Processor / checkpoint

- 如果有 checkpoint version 测试，需要确保旧 plan 不会在缺少 `writerInstruction` 时被错误复用。

## 推荐验证命令

按项目已有测试结构选择实际命令。优先跑：

```bash
cd apps/web
./node_modules/.bin/tsx tests/<relevant-lesson-generation-test>.ts
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint src/lib/ai/course-generation/lesson-planner.ts src/lib/ai/course-generation/lesson-plan-compiler.ts src/lib/ai/course-generation/block-writer.ts
```

如果已有 lesson generation processor / planner / compiler 静态测试，也要一起更新。

## 防跑偏规则

1. 不做 Facts About You。
2. 不做 Extractor Agent。
3. 不做 Tutor 对话个性化。
4. 不做建课入口注入。
5. 不新增 DB schema。
6. 不改最终用户可见 lesson block schema。
7. 只改 Planner -> Compiler -> Block Writer 的内部 LLM contract。
8. `writerInstruction` 由 Planner 生成，由 Writer 消费。
9. Planner 不写正文，Writer 不重新规划。

