# AI Tutor 透明陪伴体验改造评估报告

生成时间：2026-07-08，Asia/Shanghai  
项目路径：`/Users/zhangjunqiu/Documents/Project/Primoria`  
报告范围：只覆盖本次由 Codex 实施的 AI Tutor 透明陪伴体验改造。

## 1. 结论摘要

本次改造已经落地到 `Documents/Project/Primoria` 项目中，目标是把 Primoria Tutor 从“学习者能看到强工具路由和工具名状态”的体验，调整为“透明但更像导师陪伴”的体验。

核心结果：

- Agent 系统提示词增加了全局导师表达规范，要求跟随学习者语言、先回应意图再行动、避免暴露工具名和实现细节。
- CopilotKit 工具运行状态改为中英文可本地化的人话状态，例如“正在整理图表”“正在拆解步骤”“正在搭建 3D 场景”。
- Assistant 空白等待态改为“Primoria 正在理解你的问题…”这类可理解状态，不再只显示空白或光标。
- 通用工具状态卡、课程卡、可视化规划卡、最终可视化卡片标题，都移除了 `render_*`、`generate_course`、`plan_visualization` 等内部工具名。
- 隐藏上下文逻辑没有改动。learner profile、facts、course detail context 仍只注入最后一条用户消息，并继续在 UI 层 strip。
- 没有新增后端 API，没有改数据库 schema，没有改 `TutorArtifact` union。

## 2. 与原计划的对应关系

### 2.1 SYSTEM_PROMPT 全局导师表达规范

已完成。

改动文件：

- `apps/agent/src/graph.mjs`

新增位置：

- `SYSTEM_PROMPT` 顶部，`You are Primoria...` 之后。

新增规范包含：

- 跟随学习者语言。中文输入用中文回答，否则跟随用户语言。
- 先回应学习者意图，再行动。
- 鼓励要具体，不做空泛夸奖。
- 可见文本面向学习者，不暴露工具名、JSON、schema、实现细节和路由决策。
- 调工具前最多只写一句短说明。
- 普通概念问题保持 1-2 句，除非用户要求深入。
- 需要澄清时只问一个聚焦问题。

评估：

- 这个改动位于最高层系统提示词，覆盖 COURSE / CHART / DIAGRAM / PHYSICS / ALGORITHM / MATH / WAVE / GRAPH / MOLECULE / 3D 等分支。
- 原有课程分支仍保留 `position_learning_goal` 的硬性要求，没有削弱课程生成路径。

### 2.2 工具状态人话化

已完成。

改动文件：

- `apps/web/src/lib/i18n/dictionaries.ts`
- `apps/web/src/lib/ai/tutor-tool-display.ts`
- `apps/web/src/hooks/use-primoria-copilot.tsx`
- `apps/web/src/components/generative-ui/tool-card.tsx`

新增 helper：

- `getTutorToolDisplay(name, status, t)`

行为：

- 根据工具名和运行状态，返回学习者可理解的 `title` 和 `detail`。
- `complete` 显示通用完成状态，例如中文“已准备好”、英文“Ready”。
- `fail/error` 显示可恢复失败文案，例如“这个学习组件没有生成成功，可以换一种描述再试。”。
- 执行中显示具体动作，例如“正在整理图表”“正在拆解步骤”。

覆盖的工具状态包括：

- `deep_agent`
- `write_todos`
- `plan_visualization`
- `render_interactive_widget`
- `generate_course`
- `get_course_card`
- `render_chart`
- `render_diagram`
- `render_physics_scene`
- `render_algorithm`
- `render_math_explorer`
- `render_wave`
- `render_graph`
- `render_molecule`
- `render_3d_scene`
- `widgetRenderer`
- `stemRenderer`

评估：

- 这个 helper 只用于 UI 展示，不改变 CopilotKit 工具结果 wire shape。
- 通用 `tool_status` 卡片现在不再直接展示 artifact 自带 description，避免 description 中夹带内部实现细节。
- `generate_course` / `get_course_card` / 可视化工具 fallback 状态都接入了同一套 helper，减少后续文案漂移。

### 2.3 i18n 字典扩展

已完成。

改动文件：

- `apps/web/src/lib/i18n/dictionaries.ts`

新增 tutor 文案包括：

- `assistantThinking`
- `toolComplete`
- `toolFailed`
- `courseCardReady`
- `courseCardPending`
- `courseCardMetaReady`
- `courseCardMetaPending`
- `todoTitle`
- `visualizationPlanTitle`
- `toolStatus.*`

中文示例：

- `assistantThinking`: `Primoria 正在理解你的问题…`
- `render_chart`: `正在整理图表`
- `render_algorithm`: `正在拆解步骤`
- `render_3d_scene`: `正在搭建 3D 场景`
- `courseCardReady`: `课程路径已准备好`
- `visualizationPlanTitle`: `可视化思路`

英文示例：

- `assistantThinking`: `Primoria is understanding your question…`
- `render_chart`: `Preparing the chart`
- `render_algorithm`: `Breaking the steps down`
- `render_3d_scene`: `Building the 3D scene`
- `courseCardReady`: `Course path is ready`
- `visualizationPlanTitle`: `Visualization plan`

评估：

- 中英字典结构一致性由 `apps/web/tests/i18n.unit.ts` 继续校验。
- 中文 pending 课程卡文案使用“课程库”，避免中文界面混入 `Library`。

### 2.4 聊天等待体验

已完成。

改动文件：

- `apps/web/src/components/tutor/copilot-chat-surface.tsx`
- `apps/web/src/app/globals.css`

行为变化：

- 过去：assistant 尚无文本且还没有工具调用时，该 assistant message 会直接返回 `null`，用户可能看到空白或只有流式光标。
- 现在：当 assistant 正在运行、但还没有文本和工具卡片时，显示本地化等待态：
  - 中文：`Primoria 正在理解你的问题…`
  - 英文：`Primoria is understanding your question…`

保留行为：

- 渐进显示逻辑保留。
- feedback bar 保留。
- hidden context strip 逻辑保留。
- 有工具卡时仍继续渲染工具卡区域。

### 2.5 ToolCard / status-card 展示逻辑

已完成，并额外扩大到最终可视化卡片。

改动文件：

- `apps/web/src/components/generative-ui/tool-card.tsx`
- `apps/web/src/components/generative-ui/echarts-renderer.tsx`
- `apps/web/src/components/generative-ui/mermaid-renderer.tsx`
- `apps/web/src/components/generative-ui/physics-scene-renderer.tsx`
- `apps/web/src/components/generative-ui/math-explorer-renderer.tsx`
- `apps/web/src/components/generative-ui/graph-visualizer.tsx`
- `apps/web/src/components/generative-ui/wave-visualizer.tsx`
- `apps/web/src/components/generative-ui/molecule-renderer.tsx`

移除或替换的可见内部文案：

- `tool_status`: 不再显示 `{artifact.name} · {artifact.status}`。
- 可视化 fallback 状态：不再显示 `{name} · executing/complete`。
- 课程卡：不再显示 `generate_course · ready/generating…`。
- 可视化规划卡：不再显示 `plan_visualization · complete` 或 `Plan · technology`。
- todo list：不再显示 `plan · tutor team`。
- 图表最终卡片：不再显示 `render_chart · title`。
- Mermaid 最终卡片：不再显示 `render_diagram · title`。
- 物理模拟最终卡片：不再显示 `render_physics_scene · title`。
- 函数探索器最终卡片：不再显示 `render_math_explorer · complete`。
- 关系图最终卡片：不再显示 `render_graph · complete`。
- 波形最终卡片：不再显示 `render_wave · complete`。
- 分子模型最终卡片：不再显示 `render_molecule · title`。

替换后的体验：

- 主标题显示学习者能理解的标题或内容标题。
- 工具内部技术信息只在少量辅助位置保留，例如可视化规划卡内部仍显示 `artifact.technology`，用于解释可视化方案，不作为主状态标题。

评估：

- 这部分超出了原计划里的 status-card 优化，把最终结果卡片也一起处理了。原因是用户看到的不是只有等待态，如果最终卡片继续显示 `render_chart · ...`，整体体验仍会暴露工具路由。

## 3. 文件级变更清单

### 3.1 Agent

`apps/agent/src/graph.mjs`

- 在 `SYSTEM_PROMPT` 顶部增加 `## Tutor Presence`。
- 保留现有 COURSE 分支和工具分支。
- 保留课程创建必须通过 `position_learning_goal` 的规则。
- 未改 LangGraph 架构。
- 未改工具 schema。

### 3.2 前端 UI 和状态展示

`apps/web/src/lib/ai/tutor-tool-display.ts`

- 新增本地 UI helper。
- 只负责把工具状态映射为学习者文案。
- 不影响后端结果结构。

`apps/web/src/hooks/use-primoria-copilot.tsx`

- `CourseCardTool` 使用本地化状态。
- `GetCourseCardTool` 使用本地化状态。
- `VisualizerToolRender` 使用本地化状态。
- fallback 状态卡不再裸露工具名。

`apps/web/src/components/tutor/copilot-chat-surface.tsx`

- assistant 正在运行但没有文本和工具卡时，显示 `assistantThinking`。
- 保留原先的文本清洗和隐藏上下文移除。

`apps/web/src/app/globals.css`

- 新增 `.primoria-copilot-thinking` 样式。

`apps/web/src/components/generative-ui/tool-card.tsx`

- 使用 `useT()` 和 `getTutorToolDisplay()`。
- 课程卡标题改成本地化文案。
- pending/ready 课程卡 meta 改成本地化文案。
- 可视化规划卡标题改成本地化文案。
- todo 标题改成本地化文案。
- `tool_status` 主标题和副标题都改成人话化状态。

### 3.3 最终可视化卡片标题

以下文件只改可见标题，不改变渲染逻辑：

- `apps/web/src/components/generative-ui/echarts-renderer.tsx`
- `apps/web/src/components/generative-ui/mermaid-renderer.tsx`
- `apps/web/src/components/generative-ui/physics-scene-renderer.tsx`
- `apps/web/src/components/generative-ui/math-explorer-renderer.tsx`
- `apps/web/src/components/generative-ui/graph-visualizer.tsx`
- `apps/web/src/components/generative-ui/wave-visualizer.tsx`
- `apps/web/src/components/generative-ui/molecule-renderer.tsx`

改动方式：

- 删除 `render_* ·` 前缀。
- 优先展示 artifact 自己的标题。

### 3.4 i18n

`apps/web/src/lib/i18n/dictionaries.ts`

- 新增中英 tutor 文案。
- 保持 zh/en key 结构一致。

### 3.5 测试

`apps/web/tests/chat-quiz-static.unit.ts`

- 增加 `SYSTEM_PROMPT` 是否包含全局导师表达规范的断言。

`apps/web/tests/course-generation-ui-static.unit.ts`

- 增加 assistant thinking 等待态断言。
- 增加工具状态 helper 接入断言。
- 增加裸工具名主文案移除断言。
- 增加课程卡、规划卡、本地化状态文案断言。
- 增加最终可视化卡片不显示 `render_* ·` 的断言。

`apps/web/tests/i18n.unit.ts`

- 保持 zh/en 字典结构一致性测试。
- 增加新增 tutor 状态文案的断言。

## 4. 明确没有改的内容

本次没有修改：

- 后端 API。
- 数据库 schema。
- Drizzle migration。
- `TutorArtifact` union 类型。
- CopilotKit 工具结果 wire shape。
- LangGraph / CopilotKit 架构。
- learner profile / facts / course detail context 注入机制。
- UI 层 strip hidden context 的逻辑。
- 认证、腾讯云 PostgreSQL、KG embedding、mastery 等既有改动。

## 5. 验证结果

### 5.1 远端同步状态

执行过非破坏性远端引用刷新：

```bash
git fetch origin main
git rev-list --left-right --count main...origin/main
```

结果：

```text
0 0
```

含义：

- 当前本地 `main` 与 `origin/main` 没有 ahead/behind 差异。
- 只刷新远端引用，没有执行会改变工作区的 merge/rebase/reset。

### 5.2 静态和单元验证

已执行并通过：

```bash
./node_modules/.bin/tsx tests/chat-quiz-static.unit.ts
./node_modules/.bin/tsx tests/course-generation-ui-static.unit.ts
./node_modules/.bin/tsx tests/i18n.unit.ts
node --check apps/agent/src/graph.mjs
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit
git diff --check
```

关键结果：

- `chat-quiz-static.unit.ts`: ALL CHECKS PASSED
- `course-generation-ui-static.unit.ts`: ALL CHECKS PASSED
- `i18n.unit.ts`: ALL CHECKS PASSED
- `node --check apps/agent/src/graph.mjs`: 通过
- `vitest run`: 1 test file passed，44 tests passed
- `tsc --noEmit`: 通过
- `git diff --check`: 通过

### 5.3 Lint

已执行：

```bash
./node_modules/.bin/eslint .
```

结果：

- 0 errors
- 2 warnings

warning 内容为既有问题，不是本次改动引入：

1. `apps/web/src/components/course/block-renderer.tsx`
   - Next.js 提醒 `<img>` 可考虑换成 `<Image />`。
2. `apps/web/src/components/course/course-detail-client.tsx`
   - React hooks lint 提醒 effect 内同步 setState 可能造成级联渲染。

### 5.4 裸工具名残留搜索

已执行源码目录搜索：

```bash
rg "render_[a-z_]+ ·|generate_course ·|get_course_card ·|plan_visualization ·|plan · tutor team|\{name\} ·|\{artifact.name\} ·" apps/web/src -n
```

结果：

- 源码目录无匹配。

说明：

- `apps/web/tests/course-generation-ui-static.unit.ts` 中仍有这些字符串，但它们是“确认源码不包含这些字符串”的测试断言，不是 UI 文案。

## 6. 未执行的验证

未执行 4 条真实 prompt 的手动验收。

原因：

- 真实验收需要同时启动 Web app、LangGraph agent、模型 provider 和当前本地环境配置。
- 报告生成时工作区有多组并行改动，且本次目标是代码层实现与静态/类型验证；当时没有强行启动完整会话，避免改变或依赖不明确的本地运行状态。

建议后续手动验收 prompt：

1. 普通概念解释：
   - `用中文解释一下傅里叶变换为什么能把信号拆成频率。`
   - 关注：回答是否中文、是否先回应意图、是否 1-2 句内讲清一个核心概念。
2. 生成课程：
   - `我想系统学习线性代数，帮我生成一门课程。`
   - 关注：是否先用导师口吻说明正在定位学习目标，课程卡状态是否是“正在构建课程路径 / 课程路径已准备好”。
3. 生成图表或可视化：
   - `给我画一个二次函数 y=x^2 和 y=2x+1 的交点图。`
   - 关注：等待态是否显示“正在整理图表”，最终图表标题是否不出现 `render_chart`。
4. 课程详情页内练习请求：
   - 在课程详情页输入：`根据当前这一节给我出一道练习。`
   - 关注：隐藏上下文是否不出现在 UI，回答是否围绕当前课程内容，是否不误触发新课程生成。

## 7. 当前工作区注意事项

报告生成时工作区中存在多组改动，不全是本次改造产生。

本次改造相关文件主要是：

- `apps/agent/src/graph.mjs`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/generative-ui/echarts-renderer.tsx`
- `apps/web/src/components/generative-ui/graph-visualizer.tsx`
- `apps/web/src/components/generative-ui/math-explorer-renderer.tsx`
- `apps/web/src/components/generative-ui/mermaid-renderer.tsx`
- `apps/web/src/components/generative-ui/molecule-renderer.tsx`
- `apps/web/src/components/generative-ui/physics-scene-renderer.tsx`
- `apps/web/src/components/generative-ui/tool-card.tsx`
- `apps/web/src/components/generative-ui/wave-visualizer.tsx`
- `apps/web/src/components/tutor/copilot-chat-surface.tsx`
- `apps/web/src/hooks/use-primoria-copilot.tsx`
- `apps/web/src/lib/ai/tutor-tool-display.ts`
- `apps/web/src/lib/i18n/dictionaries.ts`
- `apps/web/tests/chat-quiz-static.unit.ts`
- `apps/web/tests/course-generation-ui-static.unit.ts`
- `apps/web/tests/i18n.unit.ts`

已有但不属于本次工作范围的变更包括但不限于：

- auth / account / Tencent PostgreSQL 相关文件。
- KG embedding / scripts 相关文件。
- mastery store。
- `README.md`、`pnpm-lock.yaml`、`docs/supabase-cloud.md` 等。

评估或提交时建议按主题拆分文件，不要把不同风险面的改动混入同一个提交。

## 8. 风险和取舍

### 8.1 SYSTEM_PROMPT 是软约束

系统提示词可以显著影响模型输出风格，但它不是编译期强约束。真实模型仍可能偶尔输出过长、过技术化或带 markdown。

缓解方式：

- 已通过 SYSTEM_PROMPT 明确禁止可见工具名、JSON、schema、实现细节。
- UI 层也移除了主要工具状态标题里的内部工具名。
- 后续真实 prompt 验收时，可以继续根据模型实际输出收紧分支 prompt。

### 8.2 完成态统一显示“已准备好 / Ready”

当前 `getTutorToolDisplay` 对 `complete` 状态统一显示完成文案，detail 仍保留具体动作。

优点：

- 完成态短、稳定，不泄露工具状态。

可能的问题：

- 如果用户同时看到多个工具完成卡，主标题可能都叫“已准备好”。

后续可选优化：

- 改为 `图表已准备好`、`步骤已拆解好`、`3D 场景已准备好` 这类 per-tool complete 文案。
- 这需要扩展 i18n 为 `toolCompleteStatus.*`，本次没有做，避免字典膨胀。

### 8.3 可视化规划卡仍显示 technology

规划卡内部仍显示 `artifact.technology`，例如 Mermaid、D3、Three.js 等。

原因：

- 计划中允许“透明过程”，不是完全隐藏工具过程。
- 本次只把主标题从工具路由改为学习者可理解的“可视化思路”。

如果产品希望更强隐藏技术实现：

- 可把 `artifact.technology` 改成“互动图示”“结构图”“动态演示”等学习者语言，或只在开发模式显示。

### 8.4 没有做真实会话视觉验收

本次通过静态测试、类型检查、lint 和源码搜索验证了可见文案路径，但没有打开真实 Tutor 对话跑模型。

原因见第 6 节。

真实验收仍建议在合并前做一次。

## 9. 建议评估 checklist

评估时建议重点看这些点：

- 普通问答是否更像导师，而不是工具调度器。
- 用户输入中文时，等待态和工具态是否全部中文。
- 用户输入英文时，等待态和工具态是否全部英文。
- 课程生成时是否仍然正常走 `position_learning_goal`。
- 图表、算法、3D、物理、波形、分子等状态是否不显示 `render_*`。
- 最终可视化卡片标题是否不显示 `render_* · complete`。
- 课程详情页隐藏上下文是否没有出现在 UI。
- 错误状态是否是可恢复表达，而不是 stack trace 或工具失败名。

## 10. 回滚建议

如果只想回滚本次体验改造，可以按文件范围回滚本报告第 7 节列出的相关文件。

注意：

- 报告生成时工作区还有其他既有改动，不建议直接执行全仓库 reset。
- 新增文件 `apps/web/src/lib/ai/tutor-tool-display.ts` 是本次新增，回滚时需要删除。
- 其余 auth、Postgres、KG、mastery 等文件不属于本次改造，不应一起回滚。

## 11. 评估后追加修复：失败状态无限 Spinner

追加时间：2026-07-08，Asia/Shanghai

### 11.1 问题确认

评估中指出的问题属实。

受影响位置：

- `apps/web/src/hooks/use-primoria-copilot.tsx`
  - `VisualizerToolRender`
  - `CourseCardTool`
  - `GetCourseCardTool`
  - 同文件中 `ChatQuizTool` fallback 也存在同类 spinner 判断。
- `apps/web/src/components/generative-ui/tool-card.tsx`
  - 通用 `tool_status` 卡片
  - `course_card` pending/ready 指示器

原问题写法：

```tsx
<span className={status === "complete" ? "tool-dot" : "tool-spinner"} />
```

隐患判断：

- 如果工具状态进入 `failed`、`error`、`timeout` 等失败状态，它不等于 `complete`，因此仍会使用 `tool-spinner`。
- 这会造成失败文案和加载动画同时出现。
- 用户会误以为系统仍在加载、卡死或没有完成失败恢复。

### 11.2 修复方式

修复文件：

- `apps/web/src/lib/ai/tutor-tool-display.ts`
- `apps/web/src/hooks/use-primoria-copilot.tsx`
- `apps/web/src/components/generative-ui/tool-card.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/lib/i18n/dictionaries.ts`
- `apps/web/tests/course-generation-ui-static.unit.ts`
- `apps/web/tests/i18n.unit.ts`

新增状态判断 helper：

```ts
getTutorToolIndicatorClass(status)
```

行为规则：

- 只有明确执行中的状态才显示 spinner：
  - `inProgress`
  - `executing`
  - `running`
  - `loading`
  - `pending`
  - `generating`
- 失败类状态显示静态失败点：
  - `failed`
  - `error`
  - `timeout`
  - `cancelled`
- 其他完成或未知状态显示普通静态点。

新增 CSS：

```css
.tool-dot-failed {
  background: #b56474;
}
```

额外处理：

- `ChatQuizTool` fallback 从硬编码 `Quiz ready / Preparing quiz` 改为走 `getTutorToolDisplay`。
- i18n 增加 `render_chat_quiz` 状态文案：
  - 中文：`正在准备练习题`
  - 英文：`Preparing the quiz`

### 11.3 修复后验证

追加验证已通过：

```bash
./node_modules/.bin/tsx tests/course-generation-ui-static.unit.ts
./node_modules/.bin/tsx tests/i18n.unit.ts
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/eslint .
git diff --check
```

结果：

- `course-generation-ui-static.unit.ts`: ALL CHECKS PASSED
- `i18n.unit.ts`: ALL CHECKS PASSED
- `tsc --noEmit`: 通过
- `vitest run`: 3 test files passed，54 tests passed
- `eslint .`: 0 errors，仍为既有 2 warnings
- `git diff --check`: 通过

追加源码搜索：

```bash
rg "status === \"complete\" \\? \"tool-dot\" : \"tool-spinner\"|artifact.status === \"executing\" \\? \"tool-spinner\" : \"tool-dot\"" apps/web/src -n
```

结果：

- 源码目录无匹配。

### 11.4 影响范围

这个追加修复只影响状态指示器和对应文案，不改变：

- 工具调用流程。
- 工具返回结构。
- 后端 API。
- 数据库 schema。
- `TutorArtifact` 类型。
- 隐藏上下文注入和 strip 逻辑。

## 12. 评估后追加修复：完成态主标题过于单一

追加时间：2026-07-08，Asia/Shanghai

### 12.1 问题确认

评估中指出的问题属实。

原逻辑位于：

- `apps/web/src/lib/ai/tutor-tool-display.ts`

原行为：

```ts
if (status === "complete") {
  return { title: t.tutor.toolComplete, detail: action };
}
```

隐患判断：

- 所有工具完成后主标题都会显示中文“已准备好”或英文“Ready”。
- 在复杂问答中，如果同时出现课程、图表、算法、3D 场景等多个状态卡，多个卡片主标题会高度重复。
- 这会降低用户快速扫描能力，让工具区看起来像一组无法区分的完成提示。

### 12.2 修复方式

修复文件：

- `apps/web/src/lib/ai/tutor-tool-display.ts`
- `apps/web/src/lib/i18n/dictionaries.ts`
- `apps/web/tests/course-generation-ui-static.unit.ts`
- `apps/web/tests/i18n.unit.ts`

新增 i18n 字典：

```ts
tutor.toolCompleteStatus
```

完成态现在按工具名返回具体标题，例如：

- `render_chart`
  - 中文：`图表已整理好`
  - 英文：`Chart is ready`
- `render_algorithm`
  - 中文：`步骤已拆解好`
  - 英文：`Steps are broken down`
- `render_3d_scene`
  - 中文：`3D 场景已搭建好`
  - 英文：`3D scene is ready`
- `generate_course`
  - 中文：`课程路径已准备好`
  - 英文：`Course path is ready`
- `render_chat_quiz`
  - 中文：`练习题已准备好`
  - 英文：`Quiz is ready`

未知工具回退：

- 中文：`学习组件已准备好`
- 英文：`Learning component is ready`

保留项：

- `tutor.toolComplete` 仍保留，作为兼容性通用文案。
- 工具 wire shape 不变。
- 只改变 UI 主标题文案。

### 12.3 修复后验证

追加验证已通过：

```bash
./node_modules/.bin/tsx tests/i18n.unit.ts
./node_modules/.bin/tsx tests/course-generation-ui-static.unit.ts
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/eslint .
git diff --check
```

结果：

- `i18n.unit.ts`: ALL CHECKS PASSED
- `course-generation-ui-static.unit.ts`: ALL CHECKS PASSED
- `tsc --noEmit`: 通过
- `vitest run`: 3 test files passed，54 tests passed
- `eslint .`: 0 errors，仍为既有 2 warnings
- `git diff --check`: 通过

追加源码搜索：

```bash
rg "status === \"complete\"[\\s\\S]{0,120}t\\.tutor\\.toolComplete|return \\{ title: t\\.tutor\\.toolComplete" apps/web/src -n
```

结果：

- 源码目录无匹配。

### 12.4 影响范围

这个追加修复只影响完成态主标题，不改变：

- 执行中状态文案。
- 失败状态文案。
- 状态指示器逻辑。
- 工具调用流程。
- 后端 API。
- 数据库 schema。
- `TutorArtifact` 类型。
