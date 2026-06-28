# New User Onboarding — 工作报告

日期：2026-06-28

工作目录：`/Users/zhangjunqiu/Desktop/primoria`

## 1. 背景

本轮目标是把新用户冷启动改成常见 SaaS 产品里的 Onboarding 流程：

- 每个用户只需要完成一次。
- 每一步都可以跳过，跳过后进入下一步。
- Onboarding 不做成长期学习页面，而是首次进入产品前的画像采集。
- 学习目标和知识背景影响建课；导师风格只影响 AI Tutor 对话方式。

确认后的三步流程：

1. 学习目标：输入框，例如“我想学数据结构和算法”。
2. 当前知识背景：高中、大学、研究生。
3. 喜欢的导师风格：苏格拉底型、费曼型、欧几里得型，单选。

## 2. 产品行为

### 2.1 进入条件

登录用户进入首页时，系统会读取 learner profile：

- 如果 onboarding 已完成或整体跳过，则进入原有工作台。
- 如果 onboarding 未完成，则展示 onboarding 界面。
- 未登录用户仍然看到原有 landing / auth 入口。

实现位置：

- `apps/web/src/app/page.tsx`
- `apps/web/src/components/onboarding/onboarding-client.tsx`
- `apps/web/src/app/globals.css`

### 2.2 Step 1：学习目标

用户输入学习目标后，后台会做 KG 定位：

- 如果目标比较宽泛，但能匹配到 KG subject，例如“数据结构和算法”，则从该 KG 的第一个 `default_order` topic 开始。
- 如果目标能精准落到某个 topic / concept，则从这个精确锚点开始。
- 如果用户跳过学习目标，则只记录跳过状态，不建课。

实现位置：

- `apps/web/src/app/api/onboarding/goal/route.ts`
- `apps/web/src/lib/learner-profile/onboarding-positioning.ts`
- `apps/web/src/lib/learner-profile/store.ts`

### 2.3 Step 2：知识背景

知识背景选项：

- `high_school`：高中
- `undergraduate`：大学
- `graduate`：研究生

选择或跳过知识背景后，如果前一步已经有可用学习目标锚点，后台会立即创建课程 outline 并入队 lesson generation job。

知识背景会进入课程生成提示词，用来控制讲解深度：

- 高中：更少默认大学先修，更多直觉和补充解释。
- 大学：默认本科基础，术语和例子平衡。
- 研究生：更快进入严谨定义、符号和边界情况。

实现位置：

- `apps/web/src/app/api/onboarding/background/route.ts`
- `apps/web/src/lib/learner-profile/onboarding-course.ts`
- `apps/web/src/lib/courses/lesson-generation-context.ts`
- `apps/web/src/lib/ai/course-generation/lesson-planner.ts`
- `apps/web/src/lib/ai/course-generation/block-writer.ts`

### 2.4 Step 3：导师风格

导师风格选项：

- 苏格拉底型：通过问题引导用户发现矛盾、补全推理。
- 费曼型：强调简单语言、类比、反复压缩概念。
- 欧几里得型：强调定义、公理、命题、证明链条。

导师风格只注入 AI Tutor 的隐藏上下文，不参与课程 lesson 内容生成。代码里也明确写了边界：`This style affects AI Tutor dialogue only. Do not use it to create or modify course lesson content.`

实现位置：

- `apps/web/src/app/api/onboarding/style/route.ts`
- `apps/web/src/app/api/copilotkit/route.ts`
- `apps/web/src/components/tutor/copilot-chat-surface.tsx`
- `apps/web/src/lib/learner-profile/types.ts`

## 3. 接口

新增 onboarding API：

```text
GET  /api/onboarding
POST /api/onboarding/goal
POST /api/onboarding/background
POST /api/onboarding/style
```

### 3.1 `/api/onboarding/goal`

请求：

```json
{
  "learningGoal": "我想学数据结构和算法"
}
```

或：

```json
{
  "skip": true
}
```

行为：

- 保存学习目标。
- 保存 KG 定位结果。
- 返回下一步 onboarding state。

### 3.2 `/api/onboarding/background`

请求：

```json
{
  "knowledgeBackground": "undergraduate"
}
```

或：

```json
{
  "skip": true
}
```

行为：

- 保存或跳过知识背景。
- 如果已有学习目标锚点，则创建课程并入队生成任务。
- 返回课程信息和下一步 onboarding state。

### 3.3 `/api/onboarding/style`

请求：

```json
{
  "tutorStyle": "socratic"
}
```

或：

```json
{
  "skip": true
}
```

行为：

- 保存或跳过导师风格。
- 标记 onboarding 完成。
- 如果已建课，则返回 course id，前端跳转到课程 outline。

## 4. 数据层

本轮未新增 migration，复用已有 `learner_profiles` 表。

新增 profile store 封装：

- `getLearnerProfile`
- `getLearnerOnboardingState`
- `saveLearningGoal`
- `skipLearningGoal`
- `saveKnowledgeBackground`
- `skipKnowledgeBackground`
- `saveTutorStyle`
- `skipTutorStyle`

实现位置：

- `apps/web/src/lib/learner-profile/store.ts`
- `apps/web/src/lib/learner-profile/types.ts`

## 5. 课程生成链路

建课触发点放在 Step 2 后：

1. Step 1 保存 learning goal 和 KG anchor。
2. Step 2 保存或跳过 knowledge background。
3. 系统调用 `buildOnboardingCourse`。
4. `buildOnboardingCourse` 根据保存的 graph/topic/concept anchor 创建 course outline。
5. 系统调用 `enqueueLessonGenerationJob`，进入现有 lesson generation job 系统。

这保持了一个边界：

- learning goal 和 knowledge background 决定课程起点与内容深度。
- tutor style 不影响 lesson generation，只影响用户之后和 AI Tutor 的对话。

## 6. 验证结果

已执行并通过：

```bash
./node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json
./node_modules/.bin/tsx apps/web/tests/onboarding-static.unit.ts
./node_modules/.bin/tsx apps/web/tests/lesson-planner.unit.ts
./node_modules/.bin/tsx apps/web/tests/lesson-generation-processor.unit.ts
./apps/web/node_modules/.bin/eslint <本轮触碰的目标文件>
git diff --check
```

补充说明：

- `pnpm --filter @primoria/web typecheck` 和 `pnpm --filter @primoria/web exec tsx ...` 在当前环境触发 pnpm ignored build scripts 策略问题，所以本轮改用仓库已有本地二进制执行校验。
- 本地前端 `http://127.0.0.1:3000/` 已正常响应。
- 浏览器 smoke test 已确认首页加载、注册入口跳转、控制台无 error/warn。
- 当前浏览器没有登录态，因此没有假装完成真实 onboarding 交互；真实完整 UI 流程仍需要一个已登录且 learner profile 未完成的账号验证。

## 7. 已覆盖的静态测试

新增测试文件：

- `apps/web/tests/onboarding-static.unit.ts`

覆盖点：

- 没有 profile 时下一步是 learning goal。
- learning goal 跳过后进入 knowledge background。
- knowledge background 跳过后进入 tutor style。
- 三步都完成或跳过后 onboarding complete。
- 首页有 onboarding gate。
- 三个 onboarding API 存在。
- 宽泛学习目标会走 `subject_start`，从 KG 第一个 topic 开始。
- lesson generation 会读取 learner profile / knowledge background。
- planner 和 writer 会注入 knowledge background directive。
- Copilot route 会注入 tutor style，并声明只影响 dialogue。

## 8. 风险和后续建议

### 8.1 需要真实账号验证

当前已做代码、类型、静态测试和未登录入口 smoke test。下一步建议用一个新测试账号完整跑：

1. 注册或登录一个未完成 onboarding 的账号。
2. 输入“我想学数据结构和算法”。
3. 选择“大学”。
4. 确认后台创建课程并跳转 outline。
5. 选择一种导师风格。
6. 打开 AI Tutor，确认风格只影响对话，不改课程内容。

### 8.2 需要确认 UX 文案语言

当前 UI 是 SaaS onboarding 风格，整体偏英文，部分选项保留中文标签。后续可以统一成全中文或中英双语，但不影响当前功能链路。

### 8.3 课程重复创建策略

当前建课使用已有 `getCourseByGraph` / `initializeCourseOutline` 体系。后续如果要支持同一个用户多次改 onboarding 目标，需要明确是否允许重新生成一门新课，还是覆盖旧课。

## 9. 主要文件清单

新增：

- `apps/web/src/app/api/onboarding/route.ts`
- `apps/web/src/app/api/onboarding/goal/route.ts`
- `apps/web/src/app/api/onboarding/background/route.ts`
- `apps/web/src/app/api/onboarding/style/route.ts`
- `apps/web/src/components/onboarding/onboarding-client.tsx`
- `apps/web/src/lib/learner-profile/types.ts`
- `apps/web/src/lib/learner-profile/store.ts`
- `apps/web/src/lib/learner-profile/onboarding-positioning.ts`
- `apps/web/src/lib/learner-profile/onboarding-course.ts`
- `apps/web/tests/onboarding-static.unit.ts`

修改：

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/api/copilotkit/route.ts`
- `apps/web/src/components/tutor/copilot-chat-surface.tsx`
- `apps/web/src/lib/ai/deepagent/course-kg-context.ts`
- `apps/web/src/lib/courses/lesson-generation-context.ts`
- `apps/web/src/lib/ai/course-generation/lesson-planner.ts`
- `apps/web/src/lib/ai/course-generation/block-writer.ts`

## 10. 补充修复：Step 2 并发建课

发现的问题：

- Step 2 保存知识背景后会触发 `buildOnboardingCourse`。
- 两个并发请求可能同时进入 `initializeCourseOutline`。
- 两个请求都先查不到已有 course，然后各自生成不同的随机 course id。
- `saveCourse` 原本只按 `courses.id` 做 upsert，无法处理 `(owner_id, graph_id)` 的唯一索引冲突。
- 后到请求会触发 `courses_owner_graph_uidx` 唯一约束错误，导致接口返回错误。

修复方式：

- 在 `initializeCourseOutline` 中捕获 `courses_owner_graph_uidx` 的 Postgres `23505` 唯一约束冲突。
- 只在“本次确实是新建 course 且 graphId 存在”的情况下恢复。
- 冲突后重新读取已经由并发赢家创建的 owner + graph course。
- 用同样的 target topic 选择 first lesson，然后返回已有课程，避免前端看到错误。
- 其它数据库错误仍然原样抛出，不被误吞。

验证：

```bash
./node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json
./node_modules/.bin/tsx apps/web/tests/onboarding-static.unit.ts
./node_modules/.bin/tsx apps/web/tests/lesson-planner.unit.ts
./node_modules/.bin/tsx apps/web/tests/lesson-generation-processor.unit.ts
./node_modules/.bin/eslint src/lib/ai/deepagent/course-generator.ts
git diff --check
```

## 11. 补充修复：Archived course 不应被冷启动复用

发现的问题：

- `getCourseByGraph` 原本按 `owner_id + graph_id` 查找课程，没有过滤 `archived_at IS NULL`。
- 用户如果曾经学过某个 KG 并归档课程，重新跑 onboarding 选择同一科目时，会复用这门已归档课程。
- 这会把历史进度、已完成 lessons、旧 outline 一起带回新用户冷启动流程，不符合“重新开始一门干净课程”的直觉。

额外确认：

- 只改查询逻辑不够，因为数据库原本存在全局唯一索引 `courses_owner_graph_uidx`。
- 即使代码忽略 archived course，新建同一 `owner_id + graph_id` 的课程仍会被旧唯一索引挡住。

修复方式：

- `getCourseByGraph` 增加 `isNull(coursesTable.archivedAt)`，只复用活跃课程。
- schema 中 `courses_owner_graph_uidx` 改为 partial unique index：只约束 `archived_at IS NULL` 的课程。
- 新增迁移 `0030_active_course_graph_unique.sql`：删除旧全局唯一索引，并创建同名 active-only unique index。

迁移 SQL：

```sql
DROP INDEX IF EXISTS "courses_owner_graph_uidx";
CREATE UNIQUE INDEX "courses_owner_graph_uidx"
  ON "courses" USING btree ("owner_id","graph_id")
  WHERE "archived_at" IS NULL;
```

验证：

```bash
./node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json
./node_modules/.bin/tsx apps/web/tests/onboarding-static.unit.ts
./node_modules/.bin/tsx apps/web/tests/lesson-planner.unit.ts
./node_modules/.bin/tsx apps/web/tests/lesson-generation-processor.unit.ts
./node_modules/.bin/eslint src/lib/db/schema.ts src/lib/courses/store.ts src/lib/ai/deepagent/course-generator.ts
git diff --check
```

本地迁移执行状态：

- `pnpm --filter @primoria/web db:migrate` 被当前 pnpm ignored build scripts 策略阻塞。
- 直接运行 `./node_modules/.bin/tsx apps/web/scripts/migrate.ts` 时，本机没有配置 `DATABASE_URL`，因此没有实际应用到数据库。
- 有数据库连接的环境需要执行 `apps/web/drizzle/0030_active_course_graph_unique.sql` 对应迁移。
