# 建课 Agent：Lesson IR + 确定性编译器实施上下文（临时交接文档）

> 创建日期：2026-06-23
>
> 文档性质：临时实施上下文，不是产品规格文件。
>
> 权威产品规格仍是 `temple/feature_specification.md`。实现前必须重新阅读该文件的最新工作区版本，且不要直接修改它。

## 1. 文档目的

本文档用于让一个完全没有此前对话记忆的开发者或 AI，能够理解并继续实现以下需求：

1. 重构当前建课 Agent，使它按 Lesson 生成教学内容。
2. 一个 Lesson 通常覆盖一个 KG Topic 内的 4–5 个 Concept。
3. 一个 Lesson 目标产出约 15–18 个教学 Block，而不是当前的 3 或 4–7 个。
4. LLM 不直接生成最终、冗长、重复字段很多的 Lesson JSON。
5. LLM 先生成紧凑的 Lesson 中间表示（IR）和各 Block 的核心语义内容。
6. 由确定性的 TypeScript 编译器将 IR 与核心内容组装、校验并编译为系统现有的 `CourseBlock[]` JSON。
7. 单个 Block 失败时只重试该 Block，不重新生成整个 Lesson。

本文档明确区分：

- 已经确定的产品/技术决策；
- 当前代码已经实现的行为；
- 仍未实现的目标架构；
- 实现前需要产品负责人确认的决策。

## 2. 一句话目标

将当前“一次 LLM 调用生成完整 Lesson JSON”的建课方式，重构为：

```text
KG Topic 上下文
  → Lesson Planner LLM 生成紧凑 LessonPlan IR
  → 确定性编译器校验并拆成 Block 任务
  → Block Writer LLM 分批生成核心内容
  → 确定性编译器生成最终 CourseBlock JSON
  → Lesson 级覆盖校验
  → 保存 Course/Lesson
```

主要收益是生成可靠性、局部重试、教学结构可验证和后续适应性扩展。节省 output token 是次要但真实的收益。

## 3. 产品背景与必须遵守的规格

### 3.1 Adaptive Learning 总目标

Primoria 的目标是根据不同用户的学习情况形成个性化课程路径。Course 不是一次性静态文档，而是会随着用户表现插入复习、补救或新 Lesson 的活容器。

### 3.2 Course、Lesson、Block、KG 的关系

- 一个 Course 对应一个学科 KG。
- 每个用户每个学科最多一个 Course 实例。
- Course 保存不变的目标锚点 `anchorConceptId`。
- 一个 Course 包含多个 Lesson。
- 一个 Lesson 通常对应 KG 中的一个 Topic。
- 一个 Topic 通常包含 4–5 个 Concept。
- Block 与 Concept 不要求一一对应：
  - 一个 Concept 可以由多个 Block 教授；
  - 一个综合 Block 可以覆盖多个 Concept。
- Lesson 引用 KG 的 Topic/Concept ID，不复制 KG 结构。
- KG 是全局稳定结构，不被用户数据修改。
- Topic 的 `defaultOrder` 决定默认学习顺序。

### 3.3 当前课程路径规则

用户学习目标完成 KG 定位后：

1. 根据入口 Topic 所属 KG 的 `defaultOrder` 建立从入口 Topic 开始的剩余 Topic 大纲。
2. 立即生成大纲中的第一个 Lesson。
3. 其他 Lesson 保持 `planned` 状态，等待 LazyGeneration。
4. 如果用户已有同一 KG 的 Course，应复用旧 Course，而不是创建第二个 Course。

### 3.4 后续会进入 Lesson Prompt、但本任务暂不实现的数据

- 用户画像/学习偏好；
- Concept mastery：`untested / weak / learning / mastered`；
- 当前 Topic Concept 的入边先修节点及 mastery；
- 复习、补救和跨图补救决策；
- episodic memory 与完美笔记。

IR 与编译器设计必须为这些输入保留扩展位置，但本次不要顺带实现这些产品功能。

## 4. 已经确定的决策

### 4.1 暂停三种 Block 的新生成

以下类型已经决定暂停产出：

- `mind_map`
- `slide`
- `worksheet`

目前允许新生成的类型只有：

- `text`
- `analogy`
- `transfer`
- `visual`
- `code`
- `quiz`

产品负责人明确表示：当前不需要为了历史课程数据做兼容设计。

当前工作区已经有未提交代码实现了这项暂停：

- Web 主生成器 Prompt、Zod、normalizer 已移除这三类；
- 单 Block 新增/转换 API 已不再允许这三类；
- Course UI 的新增/转换工具已不再暴露这三类；
-旧 Agent 生成器也已移除这三类的新生成能力。

不要在 IR/编译器实现中重新加入这三种类型。

### 4.2 Lesson 的 Block 数量策略

对于 4–5 个 Concept 的正常 Topic：

- 目标范围：15–18 个 Block；
- 建议 Zod 硬范围：12–20 个 Block；
- 不使用 `exactly 15`；
- 叶子 Topic 或特殊简单 Topic 可以接近下限；
- 不允许为满足数量而生成重复、空泛内容。

### 4.3 推荐教学构成

| 阶段 | 数量 | 允许类型 | 目的 |
|---|---:|---|---|
| 激活与定位 | 2 | `text` | Hook、先修回顾、目标与路线 |
| Concept 核心教学 | 每个 Concept 2 个 | `text` + `text/code/visual` | 核心解释 + 示例/应用 |
| 重点深化 | 2–3 | `analogy`、`visual`、`text` | 难点类比、可视化、常见误区 |
| 综合迁移 | 1 | `transfer` | 跨 Concept 或跨领域应用 |
| 综合检测 | 1 | `quiz` | 检测所有 Concept 与一道综合应用 |
| 总结收束 | 1 | `text` | 概念连接、总结、下一 Lesson 预告 |

约束：

- 每个 Concept 至少获得“解释 + 示例/应用”两个教学步骤；
- Concept 顺序遵循 KG 中的 `defaultOrder`；
- 最难的 1–2 个 Concept 才优先使用 `analogy` 或 `visual`；
- `code` 只在确实帮助理解时使用；
- 通常只生成一个 `quiz` Block；
- Quiz 内部包含 4–6 题，每个 Concept 至少一题，并尽量包含一道综合题。

### 4.4 编译器必须是确定性的

“编译器”不能调用 LLM，也不能从自由文本中猜测缺失语义。

编译器可以：

- 扩展紧凑字段；
- 生成 ID、时间戳和版本；
- 合并 Planner 元数据与 Writer 内容；
- 设置非语义默认值；
- 排序；
- 校验；
- 输出最终 JSON。

编译器不可以：

- 编造缺失的教学解释；
- 自动编造 Quiz 正确答案；
- 用通用 fallback 替代缺失内容；
- 猜测一个 Block 覆盖哪个 Concept；
- 在 Planner 遗漏 Concept 时静默通过。

语义缺失必须触发定向补生成或失败，不得静默降级。

## 5. 当前代码的真实状态

### 5.1 当前主链路：Web-as-brain

当前真正的 KG 建课主链路是：

```text
用户向 Tutor 提出建课请求
  → apps/agent/src/graph.mjs 的 position_learning_goal
  → 浏览器 LearningGoalCard
  → POST /api/knowledge-graph/position
  → specific / broad / fallback 分支
  → specific 时 POST /api/learning/course
  → apps/web/src/lib/ai/deepagent/course-generator.ts::generateCourse()
  → 保存 Course + Lessons
```

关键文件：

- `apps/agent/src/graph.mjs`
  - `position_learning_goal` 只返回用户目标；
  - KG 定位和建课发生在 Web 侧；
  - 文件中仍存在旧 `generate_course` 后台任务工具。
- `apps/web/src/hooks/use-primoria-copilot.tsx`
  - `LearningGoalCard` 调定位 API；
  - specific 分支调用 `/api/learning/course`；
  - broad 菜单当前仍通过 Topic 名称重新定位。
- `apps/web/src/app/api/knowledge-graph/position/route.ts`
  - 执行定位；
  - 记录 `position.computed`。
- `apps/web/src/app/api/learning/course/route.ts`
  - 校验请求；
  - 调用 TypeScript `generateCourse()`；
  - 当前同步等待完整 Lesson 生成。
- `apps/web/src/lib/ai/deepagent/course-generator.ts`
  - 当前主生成器；
  - 本次重构的核心文件。

### 5.2 `course-generator.ts` 当前职责

该文件目前同时承担过多职责：

1. 定义所有生成用 Block Zod Schema；
2. 定义课程 System Prompt；
3. 构造 LLM Prompt；
4. 选择模型/provider；
5. structured output 与 JSON fallback；
6. JSON 提取与修复；
7. 内容 normalizer；
8. Course 复用；
9. KG Topic 大纲构造；
10. Lesson materialization；
11. Course/Lesson 保存；
12. `course.generated` 事件记录；
13. 单 Block 生成，供课程编辑器使用。

重构时应拆分“模型生成”“IR 编译”“教学校验”“Course 编排”“持久化”，不要继续把全部逻辑堆进一个文件。

### 5.3 数量冲突已经在当前工作区解决

当前未提交代码已经统一为：

- TypeScript `CourseSchema.blocks` 使用 `.min(12).max(20)`；
- Prompt 明确按照本文档第 4.3 节的教学阶段构成 Lesson；
- 4 个 Concept 的目标为 15–16 个 Block；
- 5 个 Concept 的目标为 17–18 个 Block；
- 无明确 4–5 Concept context 时使用 hard range 12–20；
- `normalizeCourseDraft()` 不再执行 `.slice(0, 8)` 静默截断；
- TypeScript normalizer 会粗粒度检查 text/analogy/transfer/quiz/visual 数量；
- 旧 MJS 生成器的 Course、Outline、Fast Schema 和 Prompt 也已统一为 12–20 hard range、15–18 target；
- 旧 MJS 的 `.slice(0, 4)` 与 `.slice(0, 8)` 已移除；
- estimatedMinutes fallback 已按较长 Lesson 调整，最高允许 60 分钟；
- KG prompt 不再要求一次调用生成两个 Lesson；`nextTopic` 只作为最终收束中的预告上下文。

当前校验仍是过渡实现：由于现有 `CourseBlock` 没有 `pedagogicalRole` 与 `conceptIds` 元数据，代码还不能确定性验证每个教学阶段和每个 Concept 的覆盖。完整验证应由后续 IR/compiler 实现。

### 5.4 当前 Course/Lesson 模型

主要类型在：

- `apps/web/src/lib/courses/types.ts`

当前核心关系：

```text
Course
  lessons: Lesson[]

Lesson
  topicId
  role: new | review | remediation
  progress: not_started | in_progress | completed
  status: planned | generating | generated
  blocks: CourseBlock[] | null
```

现有 `CourseBlock` 类型仍包含历史的九种类型，但新生成入口只允许六种。

### 5.5 当前 LazyGeneration 状态

`course-generator.ts` 已导出：

- `materializeLesson({ courseId, lessonId | topicId })`

它能根据 Topic 构造单 Topic KG context 并生成该 Lesson，但当前没有 route/UI 真正调用它。因此：

- 后端函数存在；
- 用户点击 planned Lesson 后自动物化的完整产品链路尚未实现。

### 5.6 当前并发问题

Lesson 有 `generating` 状态，但当前 `fillLesson()` 没有在调用 LLM 前原子地将状态设为 `generating`。并发请求可能重复生成同一 Lesson。

另外，当前 `saveCourse()` 会以整组替换的方式写 Lessons。并发 Block/lesson 更新存在 last-write-wins 风险。

新 Job/编译流程需要明确 claim、lease 或数据库原子状态更新。

### 5.7 两套生成器并存

仓库还存在：

- `apps/agent/src/course-generator.mjs`
- `apps/agent/src/course-generation-jobs.mjs`
- `apps/agent/src/course-store.mjs`

旧 MJS 生成器已经有一个可借鉴的模式：

```text
generateCourseByBlocks()
  → 先生成 Course outline
  → 并发生成每个 Block
  → 组装 Course
```

但是它仍按旧的 Course 顶层 `blocks` 模型持久化，与现在的 `Course → lessons → blocks` 不一致。只能借鉴生成流程，不能直接当作新架构复用。

另外，Workspace Agent 的 `generate_course` 是另一种“生成模块草稿”的能力，不是 KG Course/Lesson 生成器，不应混为一套。

### 5.8 当前工作区未提交修改

创建本文档时，以下文件已有未提交修改：

- `apps/agent/src/course-generator.mjs`
- `apps/web/package.json`
- `apps/web/src/app/api/courses/[id]/edit/route.ts`
- `apps/web/src/components/course/course-detail-client.tsx`
- `apps/web/src/lib/ai/deepagent/course-editor.ts`
- `apps/web/src/lib/ai/deepagent/course-generator.ts`
- `apps/web/src/lib/ai/deepagent/course-kg-context.ts`
- `apps/web/tests/course-kg-context.unit.ts`
- `apps/web/tests/course-lesson-composition.unit.ts`
- `temple/feature_specification.md`
- `temple/course-agent-compiler-implementation-context.tmp.md`

其中：

- 前五个代码文件是“暂停 mind_map/slide/worksheet 新产出”的实现；
- `temple/feature_specification.md` 是用户已有修改，必须保留，不要覆盖或格式化。

## 6. JSON output token 测量结论

使用当前六种 Block 构造了一个 15 Block 中文 Lesson，并用 `cl100k_base` 与 `o200k_base` 两种 tokenizer 作为近似测量。

结果：

| 输出 | compact token | 字段名 + JSON 语法估算占比 | Pretty JSON 额外开销 |
|---|---:|---:|---:|
| 15 Block 完整 Lesson | 1426–1760 | 约 16%–20% | 增加约 26%–32% |
| 15 Block LessonPlan | 572–612 | 约 36%–41% | 增加约 58%–59% |

解释：

- LessonPlan 的值较短，但每个 Block 重复 `type/order/role/conceptIds/goal`，结构占比很高；
- 完整 Lesson 中教学正文、代码、Quiz 和可视化内容占主要 token；
- 如果 text Block 真正写到 2–4 段，最终 JSON 结构占比还会下降；
- Pretty JSON 的换行与缩进浪费明显；
- tokenizer 可能把 `{"type"` 一类字符串合并编码，因此不能精确把 token 单独归因到某一个大括号。

结论：

- 使用紧凑 IR 对 Planner 很有价值；
- 编译器生成最终 JSON 不消耗 LLM output token；
- 但不要期待编译器消除主要内容 token；
- 架构的最大收益是可靠性与局部重试，而不是纯成本压缩。

## 7. 推荐目标架构

### 7.1 总流程

```text
1. Course Orchestrator 读取 Course、Lesson、KG 和用户上下文
2. Lesson Planner LLM 输出 compact LessonPlanIR
3. LessonPlan Compiler 确定性校验 IR
4. Compiler 将计划拆为 15–18 个 BlockGenerationJob
5. Block Writer 按 Concept 分批或按 Block 生成核心内容
6. Block Compiler 将核心内容与计划元数据合并为 CourseBlock
7. Lesson Validator 检查覆盖、顺序、数量、Quiz 和类型
8. 只定向补生成缺失或失败的 Block
9. Assembly 生成最终 Lesson
10. 保存 Lesson/Course，更新 job 状态，记录事件
```

### 7.2 不建议第一版做独立微服务

第一版推荐将“编译器”实现为 Web/Job Worker 内部的纯 TypeScript 模块，而不是独立网络服务。

原因：

- 编译器计算量很低；
- 不需要独立扩缩容；
- 网络边界会增加部署、认证、超时和版本兼容成本；
- 当前真正需要后台化的是 LLM 生成 Job，而不是编译计算。

未来出现以下情况时再拆独立服务：

- 多个产品共同消费同一 IR；
- 编译器需要独立发布与多版本托管；
- 编译包含重型渲染、代码执行或大量资产处理；
- 需要独立语言栈或横向扩缩容。

## 8. 推荐 IR 设计

### 8.1 使用紧凑 JSON IR，不使用自由文本 DSL

不建议使用完全自由的 Markdown/YAML/自定义文本作为编译器输入。主要风险：

- 分隔符可能出现在 Markdown 或代码正文；
- YAML 缩进和多行字符串容易失败；
- 自定义 DSL 需要自己处理 escaping；
- JSON 是 LLM 和模型 API 支持最稳定的结构化格式。

推荐使用“紧凑 JSON tuple IR”：保留 JSON 的确定性，但避免重复长字段名。

示例：

```json
{
  "v": 1,
  "lesson": ["导数：从变化率到局部线性", 42],
  "blocks": [
    [1, "T", "hook", ["c_derivative_definition"], "从真实变化率问题激活直觉"],
    [2, "T", "roadmap", ["c_derivative_definition", "c_geometric_meaning"], "说明学习路线与先修关系"],
    [3, "A", "explanation", ["c_derivative_definition"], "用局部放大类比导数"],
    [4, "V", "example", ["c_geometric_meaning"], "展示割线逼近切线"],
    [15, "Q", "assessment", ["c_derivative_definition", "c_geometric_meaning"], "检测所有概念和综合应用"]
  ]
}
```

建议短类型码：

| Code | Final type |
|---|---|
| `T` | `text` |
| `A` | `analogy` |
| `X` | `transfer` |
| `V` | `visual` |
| `C` | `code` |
| `Q` | `quiz` |

### 8.2 推荐 LessonPlanIR 逻辑字段

每个 Block Plan 至少包含：

- `order`
- `typeCode`
- `pedagogicalRole`
- `conceptIds[]`
- `goal`

Lesson 级至少包含：

- `irVersion`
- `title`
- `estimatedMinutes`
- `blocks[]`

Planner 不应生成：

- Block ID；
- createdAt/updatedAt；
- Course ID/Lesson ID；
- 完整教学正文；
- 重复的 Topic/Concept 名称。

这些信息由上下文或编译器提供。

### 8.3 Block Writer 输出建议采用“每类最小对象”

Planner 适合 tuple IR；Block 内容不建议强行全部 tuple 化，因为不同 Block 字段差异大。推荐每个 Writer 只返回该类型特有字段。

示例：

```json
{"title":"用局部放大理解导数","source":"不断放大弯曲道路","target":"函数在一点的导数","mapping":"观察范围足够小时曲线近似直线，其斜率对应导数"}
```

不要重复输出：

- `type`
- `order`
- `conceptIds`
- `pedagogicalRole`
- `lessonId`
- `courseId`

这些字段已经存在于 `BlockGenerationJob`。

### 8.4 各类型核心语义字段

#### text

- `title`
- `markdown`

#### analogy

- `title`
- `source`
- `target`
- `mapping`

#### transfer

- `title`
- `fromDomain`
- `toDomain`
- `explanation`
- `example`

#### visual

- `title`
- `description`
- `engine`
- engine 对应 payload

Visual 的 IR/编译策略仍需产品负责人确认，见“待决策事项”。

#### code

- `title`
- `language`
- `code`
- `explanation`

#### quiz

- `title`
- `questions[]`
- 每题显式包含 question、choices/correct answer、explanation

Quiz 的正确答案属于语义内容，编译器不能推断。

## 9. 推荐编译器模块边界

建议新增一个清晰目录，例如：

```text
apps/web/src/lib/ai/course-generation/
  lesson-plan-ir.ts
  lesson-planner.ts
  lesson-plan-compiler.ts
  block-writer.ts
  block-content-compiler.ts
  lesson-assembler.ts
  lesson-validator.ts
  generation-errors.ts
```

也可以暂时放在 `deepagent/` 下，但不建议继续扩大单个 `course-generator.ts`。

### 9.1 `lesson-plan-ir.ts`

职责：

- 定义短类型码；
- 定义 `PedagogicalRole`；
- 定义 tuple Zod Schema；
- 从 tuple 解码为内部可读对象；
- 只做语法级解析，不做教学覆盖判断。

### 9.2 `lesson-planner.ts`

职责：

- 构造 Planner Prompt；
- 传入 Topic、ordered Concepts、targetConcept、prerequisite context；
- 请求 compact JSON；
- 返回未经信任的 `unknown`。

### 9.3 `lesson-plan-compiler.ts`

职责：

- Zod parse；
- 类型码展开；
- 校验 order 唯一且递增；
- 校验 Concept ID 均来自当前 KG context；
- 校验 12–20 个 Block；
- 校验每个 Concept 的解释与示例覆盖；
- 校验只允许六种类型；
- 校验 Quiz、transfer、summary 等 Lesson 级要求；
- 输出 `CompiledLessonPlan` 和 `BlockGenerationJob[]`。

### 9.4 `block-writer.ts`

职责：

- 根据 Block type 选择对应 Prompt 和 Zod Schema；
- 只传当前 Block 所需的 KG/前后文；
- 不重复传整个 Lesson 的全部内容；
- 支持并发限制、超时、单 Block 重试；
- 返回未经最终编译的核心内容。

### 9.5 `block-content-compiler.ts`

职责：

- 按 Block type 严格解析核心内容；
- 合并 Planner 元数据；
- 生成 `id`；
- 生成最终 `CourseBlock`；
- 对 semantic missing 抛出可分类错误；
- 不生成通用 fallback 教学内容。

### 9.6 `lesson-validator.ts`

职责：

- 最终数量检查；
- Concept coverage；
- 顺序；
- Quiz 覆盖；
- 重复标题/重复内容检测；
- 空泛内容检测；
- Block 类型和 Visual engine 合法性；
- 返回缺失项，供定向补生成。

### 9.7 `lesson-assembler.ts`

职责：

- 按 order 排序；
- 组装 `Lesson.blocks`；
- 设置 `status: generated`；
- 设置 estimatedMinutes/version/updatedAt；
- 不负责数据库写入。

## 10. Prompt 工程范围

至少需要以下 Prompt，而不是继续使用一个巨大 System Prompt：

### 10.1 Lesson Planner Prompt

输入：

- Topic ID/name；
- ordered Concept ID/name/defaultOrder；
- targetConceptId；
- 当前 Topic 入边先修信息；
- 后续用户画像/mastery 扩展槽位；
- 可用 Block 类型；
- 教学结构约束。

输出：

- compact LessonPlanIR；
- 不输出完整正文。

### 10.2 各 Block Writer Prompt

建议按类型拆 Prompt：

- Text Writer；
- Analogy Writer；
- Transfer Writer；
- Visual Writer；
- Code Writer；
- Quiz Writer。

每个 Writer 接收：

- 当前 Block plan；
- 当前 Concept 上下文；
- 相邻 Block 的 title/goal，避免重复；
- Lesson 的语言和受众；
- 必要的用户信息。

### 10.3 Repair Prompt

只用于：

- LLM 返回的单 Block JSON 无法解析；
- 缺失明确字段；
- 某个 Concept 的特定教学角色缺失。

禁止把整个 Lesson 再发给 Repair Prompt 重写。

## 11. Job、并发与重试建议

### 11.1 推荐生成粒度

建议按 Concept 分批，每批生成 2–3 个 Block，而不是并发 18 个完全独立请求。

原因：

- 同一 Concept 的解释、示例和误区需要局部一致；
- 18 个完全独立请求容易重复；
- 一次生成整节又容易截断；
- 以 Concept 为批次是质量、成本和并发的折中。

Quiz、transfer、summary 建议作为 Lesson 级独立任务，在 Concept 批次完成后生成。

### 11.2 重试原则

- 传输错误：单任务重试；
- JSON 语法错误：一次 repair 或重新生成当前任务；
- Zod 字段缺失：只补当前 Block；
- Concept coverage 缺失：Planner 或缺失角色定向补生成；
- 不允许无限重试；
- 必须记录 promptVersion、irVersion、compilerVersion、attempts 和 error category。

### 11.3 幂等与状态

- Lesson 从 `planned` 原子转为 `generating`；
- 同一 Lesson 只能有一个有效 generation job；
- 每个 Block job 使用稳定 ID；
- 重试不能创建重复 Block；
- 全部通过验证后才将 Lesson 设为 `generated`；
- 部分失败时保留中间结果供重试，但不要向用户展示半成品 Lesson。

## 12. 建议实施顺序

### Phase 0：确认决策

确认本文档第 15 节中的待决策事项。

### Phase 1：建立纯 IR 与编译器

1. 定义 `LessonPlanIRSchema`；
2. 定义短类型码与 pedagogical roles；
3. 实现纯 `compileLessonPlanIR()`；
4. 实现 Concept coverage 验证；
5. 用手写 fixtures 测试，不连接 LLM 和数据库。

### Phase 2：实现 Planner

1. 编写 Planner Prompt；
2. 接入现有 provider/model adapter；
3. 输出 compact JSON；
4. 用 20 个 KG Topic fixture 做结构评估；
5. 不生成完整 Block 内容。

### Phase 3：实现 Block Writer 与 Block Compiler

1. 为六种类型建立最小 Zod Schema；
2. 按 Concept 批次生成；
3. 编译为最终 `CourseBlock`；
4. 实现单 Block/批次重试；
5. 删除通用教学 fallback。

### Phase 4：组装 Lesson 并接入 Course 编排

1. 替换 `generateLessonDraft()` 当前整节生成方式；
2. `fillLesson()` 使用新 pipeline；
3. 保留 Course outline、Course reuse、anchor 和事件行为；
4. 接入原子 `planned → generating → generated`；
5. 明确保存边界和并发策略。

### Phase 5：接 LazyGeneration route/UI

1. 为 `materializeLesson()` 建安全 API；
2. planned Lesson 打开时触发 job；
3. UI 展示 generating/failed/retry；
4. 防止重复触发。

### Phase 6：收敛旧生成器

1. 将 TypeScript Web pipeline 设为唯一事实来源；
2. 旧 MJS job 要么调用 Web pipeline，要么删除/禁用；
3. 不再维护两套 Prompt、Schema 和 normalizer。

## 13. 验收标准

### 13.1 结构

- 新 Lesson 只包含六种允许类型；
- 正常 4–5 Concept Topic 的 Block 目标为 15–18；
- 最终硬范围为 12–20；
- 不存在 `.slice(0, 8)` 静默截断；
- 每个 Block 有稳定 ID；
- Block 顺序确定且可重现。

### 13.2 教学覆盖

- 每个 Concept 至少有 explanation；
- 每个 Concept 至少有 example/application；
- 概念按 defaultOrder 组织；
- 至少有一个 transfer；
- 有一个总结 Block；
- Quiz 覆盖全部 Concept；
- 不允许重复 Block 用来凑数量。

### 13.3 可靠性

- 一个 Block 失败不会导致已成功 Block 全部重生成；
- 编译器不会编造语义 fallback；
- 非法 Concept ID 会失败；
- 非法类型码会失败；
- 并发请求不会生成两份同一 Lesson；
- 最终写库只发生在 Lesson 完整通过验证后。

### 13.4 Token 与输出

- Planner 使用 compact IR；
- 明确要求 `compact JSON, no indentation`；
- Writer 不重复 Lesson/Course 元数据；
- 最终 JSON 由代码生成，不占 LLM output token；
- 记录每个阶段 input/output token，便于后续评估。

## 14. 测试计划

### 14.1 纯单元测试

- tuple IR 正常解析；
- 版本不支持；
- 数量低于 12/高于 20；
- order 重复或乱序；
- 非法 type code；
- 非法 Concept ID；
- 某 Concept 缺 explanation；
- 某 Concept 缺 example/application；
- Quiz 遗漏 Concept；
- suspended Block 类型被拒绝；
- compiler 输出满足现有 `CourseBlock` 类型。

### 14.2 集成测试

- mocked Planner + mocked Writer 生成完整 Lesson；
- 单 Concept 批次失败后只重试该批次；
- Quiz 失败后不重跑 Concept 内容；
- duplicate job 不生成重复 Block；
- Course reuse 不新建第二个 Course；
- `course.generated` 只在新 Course 时记录。

### 14.3 真实模型评估

建议至少从 20 个学科 KG 中选取 20 个 Topic，覆盖：

- 数学公式；
- 物理可视化；
- 编程代码；
- 生物/化学概念解释；
- 宽泛与具体 targetConcept；
- 叶子 Topic。

评估指标：

- IR parse success；
- Block compile success；
- Concept coverage；
- 重复率；
- 单 Lesson token；
- 总耗时；
- 重试次数；
- 人工教学质量评分。

### 14.4 当前验证基线注意事项

创建本文档前，暂停 Block 类型的改动已经通过：

- 相关文件定向 ESLint；
- Agent `course-generator.mjs` 语法检查；
- Course UI 静态测试；
- scoped `git diff --check`。

数量冲突修复后，以下验证也已通过：

- `pnpm test:kg`，包括新增的 `course-lesson-composition.unit.ts`；
- 4 Concept 接受 15–16、拒绝范围外数量；
- 5 Concept 接受 17–18、拒绝范围外数量；
- Lesson 缺少唯一 Quiz 时被拒绝；
- `course-kg-context.unit.ts` 验证每次只生成一个 Lesson，`nextTopic` 仅用于预告；
- 修改文件的定向 ESLint（测试目录因项目 ignore 规则只产生 ignored warning，无 error）；
- Agent MJS 语法检查；
- 修改范围 `git diff --check`。

全量 Web typecheck 当前仍被未修改文件中的既有错误阻塞，主要位于：

- `graph-visualizer.tsx`
- `molecule-renderer.tsx`
- `use-primoria-copilot.tsx`

实现本任务时不要把这些无关错误误归因于 IR/编译器；但最终合并前仍需明确基线或修复策略。

## 15. 需要产品负责人决策的事项

以下事项会实质影响实现，建议在写核心代码前确认。

### 已确认决策 1：唯一事实来源

选项：

- A. TypeScript Web pipeline 成为唯一正式实现，旧 MJS generator 禁用/删除；
- B. 同时迁移并长期维护 Web 与 Agent 两套生成器。

已确认：A。TypeScript Web pipeline 是唯一正式实现，旧 MJS generator 应在新链路完成后禁用或删除，不再长期双维护。

原因：两套 Prompt、Schema、normalizer 和持久化模型已经漂移，继续双维护会重复产生冲突。

### 已确认决策 2：`conceptIds` 与 `pedagogicalRole` 持久化到最终 Block

选项：

- A. 只存在生成 IR/job 中，最终 `CourseBlock` 不保存；
- B. 最终 Block 保存 `conceptIds: string[]` 和 `pedagogicalRole`。

已确认：B。最终 Block 保存 `conceptIds: string[]` 和 `pedagogicalRole`。

原因：

- 后续 Quiz、mastery、lesson.completed、补救决策需要 Concept 证据；
- Block 与 Concept 不是一一对应，数组正好表达多对多；
- 能支持覆盖审计、编辑影响范围和学习事件关联。

影响：需要修改 `CourseBlock` base 类型、持久化 JSON 和相关 UI/编辑逻辑。

### 已确认决策 3：Writer 按 Concept 批量生成

选项：

- A. 每个 Block 一个请求；
- B. 每个 Concept 一批 2–3 个 Block；
- C. 一次生成整个 Lesson。

已确认：B。每个 Concept 一批生成 2–3 个 Block；Quiz、transfer 和 summary 作为 Lesson 级任务生成。

原因：局部一致性优于 A，截断和整节重试风险低于 C。

### 决策 4：Visual 的第一版策略

选项：

- A. Writer 直接输出完整 HTML/ECharts/Mermaid/physics payload；
- B. Writer 输出高层 VisualSpec，由编译器套用确定性模板；
- C. 第一版只允许 Mermaid 或 ECharts 等少数确定性 engine。

推荐：第一版采用 B，并限制 engine；具体允许哪些 engine 需要确认。

原因：完整 HTML/JS output token 高、校验复杂且容易产生不可运行内容。高层 VisualSpec 更符合“核心内容 + 编译器”的方向。

### 决策 5：严格失败与 repair 次数

选项：

- A. 语义缺失立即失败；
- B. 当前 Block 允许一次定向 repair，仍失败则 job 失败；
- C. 无限或多轮自动修复。

推荐：B。

### 已确认：Planner 的数量约束

产品负责人已经确认：

- 正常目标 15–18；
- 4 Concept 对应 15–16；
- 5 Concept 对应 17–18；
- hard min/max 12–20；
- 使用本文档第 4.3 节的阶段构成。

仍待确认的细节：是否允许编译器在缺少教学角色时自动插入“生成任务占位”，然后由 Writer 补齐。推荐允许，但不能编造内容。

### 决策 7：编译器部署形态

选项：

- A. 现有 Web/Job Worker 内的纯 TypeScript 模块；
- B. 独立后台微服务。

推荐：A，后续有明确扩缩容需求再拆 B。

### 决策 8：是否本轮同时接通 LazyGeneration UI

选项：

- A. 本轮只替换 Lesson 生成内核；
- B. 同时完成 planned Lesson 点击、job、状态 UI 和 retry。

推荐：先 A，再作为独立切片做 B。

原因：生成内核与 UI/job 状态链都较大，拆分更容易验证真实质量和故障边界。

## 16. 如果产品负责人暂时不回复，建议采用的默认值

为了避免实现停滞，可采用以下默认值，但在产生大范围代码改动前仍建议确认：

1. Web TypeScript pipeline 为唯一正式实现；
2. `conceptIds[]` 和 `pedagogicalRole` 持久化到 Block；
3. 按 Concept 批量生成 2–3 个 Block；
4. Planner 使用 compact JSON tuple IR；
5. Compiler 是现有 Job Worker 内的纯 TypeScript 模块；
6. 单任务允许一次 repair；
7. 第一版 Visual 使用高层 VisualSpec，限制 engine；
8. 本轮只完成生成内核，不同时做 LazyGeneration UI。

## 17. 明确不在本任务范围内

- 用户画像自动沉淀；
- mastery 更新规则；
- Extractor Agent；
- lesson.completed 触发器；
- 跨图补救 Course；
- 完美笔记；
- Course 星系 UI；
- broad menu provenance 修复；
- 历史课程兼容迁移；
- 无关的 generative UI typecheck 错误。

## 18. 未来实施者的工作纪律

1. 开始前读取最新 `temple/feature_specification.md`；
2. 不直接修改该规格文件；
3. 先执行 `git status --short`，保留用户已有修改；
4. 不覆盖当前未提交的 suspended Block 改动；
5. 先实现纯 IR/compiler 单元测试，再接 LLM；
6. 不在 compiler 中引入 LLM；
7. 不用 generic fallback 掩盖教学语义失败；
8. 不一次性重写整个 Course 系统；
9. 不在未经确认的情况下执行数据库迁移或删除数据；
10. 每个阶段记录生成耗时、token、失败分类和重试次数。

## 19. 完成定义

本任务完成时，应当能够用一个 KG Topic fixture 完成以下闭环：

```text
ordered 4–5 Concepts
  → Planner compact IR
  → deterministic compile
  → 15–18 Block plans
  → Concept-batched Writer outputs
  → deterministic CourseBlock compile
  → final coverage validation
  → generated Lesson
```

并且满足：

- 最终没有 `mind_map/slide/worksheet`；
- 每个 Concept 有解释与应用；
- Quiz 覆盖每个 Concept；
- 缺失内容只重试对应任务；
- compiler 不编造教学语义；
- 最终 Lesson 能被现有 Course 页面读取和渲染；
- 新架构不再依赖旧的 3/4–7/8/15 个 Block 冲突规则。
