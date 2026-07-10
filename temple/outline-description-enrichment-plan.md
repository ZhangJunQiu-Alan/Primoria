# 大纲描述 LLM Enrich 实现方案（QA 问题 9）

状态：已实现（2026-07-10，未提交工作区）。来源：`temple/browser-qa-issue-list-2026-07-09.md` 问题 9。
落地文件：`src/lib/ai/course-generation/outline-enrichment.ts`（模块）、
`src/lib/courses/store.ts`（`updateLessonDescriptionIfUnchanged` fence）、
`src/lib/ai/deepagent/course-generator.ts`（`initializeCourseOutline` 内 `after()` 触发，仅新课）、
`tests/outline-enrichment.spec.ts`（9 例）。实测课程 `crs_zhieif4vmreoylfc` 全部描述被改写。

## 背景与目标

大纲 lesson 描述目前是硬编码模板（`course-generator.ts` 的 `plannedLessonDescription`：
"Builds the core understanding of … / 围绕 … 建立「…」的核心理解"），outline 从不经过
LLM——这是刻意设计（快、免费、可预测），不改变。本方案在课程创建**之后**用一次后台
LLM 调用批量改写全部 lesson 描述；任何一步失败都回退模板，课程功能不受影响。

## 已确认的代码事实（2026-07-10 调研）

1. 描述存储在 `lessons.description`（text, not null, default ""）；创建时由
   `buildOutlineCourse` → `plannedLessonDescription` 逐条生成。
2. `initializeCourseOutline`（`course-generator.ts:188`）是所有建课路径的唯一汇聚点，
   且已有 `isNewCourse` 标志。调用方共 4 条，全部在请求生命周期内（`after()` 可用）：
   - `POST /api/learning/course`（Home 输入路径）
   - `POST /api/onboarding/background`（请求内同步建课）
   - `POST /api/onboarding/course`（重试端点）
   - goal 路由的 `after()` 后台定位回调（Next 允许 after 内再调 after）
3. lesson 生成的发布路径 `store.publish` 只写 `title/blocks/estimatedMinutes/status`，
   **不写 description**——enrich 的逐行 UPDATE 与首课生成并发是安全的。
4. 整课覆盖写 `saveCourse`（会重写全部 lesson 的 description）只在
   `initializeCourseOutline` 内部调用一次；enrich 排在它完成之后，无覆盖竞争。
5. UI 读取：outline 视图（`course-outline-view.tsx:414`）和课程页
   （`course-detail-client.tsx:96`）都直接读 `lesson.description`，非空即显示。
   **零 UI 改动**。

## 设计

### 新模块 `src/lib/ai/course-generation/outline-enrichment.ts`

```
export async function enrichCourseOutlineDescriptions(input: {
  courseId: string;
  ownerId: string;
  settings?: TutorProviderSettings;
}): Promise<void>
```

流程：
1. `getCourse(courseId, ownerId)` 重新读库（不信任内存副本）。
2. 取前 N 条 lesson（N=40 上限，超出部分保留模板），构造单次 prompt：课程
   subject、learningGoal/topic、language、lesson 列表（order、title、当前模板描述、
   该 topic 的前 3 个 concept 名——复用 `outlineFromGraphTopics` 已有的取法）。
3. 一次 `createTutorModel(settings).withStructuredOutput(zod)` 调用（与
   `generateBlock` 同模式），输出 `{ items: [{ order, description }] }`：
   - description 限长（≤160 字符，zod `max` + 截断兜底）；
   - 要求与 lesson 标题同语言（prompt 中声明，按 `course.language` 给出示例）；
   - 缺条目、order 对不上直接跳过该条，不报错。
4. 持久化：**逐行带 fence 的 UPDATE**（新 store 函数
   `updateLessonDescriptionIfUnchanged`）：

```sql
UPDATE lessons SET description = $new, updated_at = now()
WHERE id = $lessonId AND course_id = $courseId AND owner_id = $ownerId
  AND description = $expectedTemplate   -- 读到的旧值作 fence
```

   fence 语义与 N-2/N-3 一致：只有描述仍是我们读到的模板原文才改写。用户手动
   编辑过、或并发任务改过的行自然落空（0 行），永不覆盖。

### 触发点（一处）

`initializeCourseOutline` 内，`saveCourse` 成功且 `isNewCourse === true` 之后：

```ts
after(() => enrichCourseOutlineDescriptions({ courseId: course.id, ownerId, settings }));
```

- 一行覆盖全部 4 条建课路径；老课程复用（`isNewCourse === false`）不触发。
- `after()` 调用本身包 try/catch：万一在非请求上下文被调用（未来 worker 复用），
  跳过 enrich 而不是抛错。

### 失败与运维策略

- 全程 best-effort：LLM 超时（沿用现有 20s 模式，单次不重试）、解析失败、DB 失败
  都只 `console.error("[course] outline enrichment failed", { courseId })` 并保留模板。
  不引入任何状态字段、不入 job 表、不重试。
- kill switch：`PRIMORIA_DISABLE_OUTLINE_ENRICHMENT=1` 直接短路（成本/故障时可关）。
  默认开启。
- 成本：每门新课恰好 1 次 LLM 调用（library 图谱典型 10–30 条 lesson，一次结构化
  输出即可）。

### UI 时序（接受的 v1 限制）

- onboarding 场景：enrich（约 2–5s）在用户还停留在 background/style 步骤时就已落库，
  进入 outline 时看到的即是 enrich 后的描述。
- 用户恰好停在 outline 页且无活跃生成任务时不轮询，需刷新才能看到新描述——接受，
  记入 v1 限制（outline 在有生成任务时本来就会轮询并 refetch）。

## 测试

1. `tests/outline-enrichment.spec.ts`（vitest，CI）：
   - mock model：返回合法/超长/缺 order/错 order 的 items，断言规范化与跳过逻辑；
   - mock db：断言 UPDATE 只发给描述未变的行（fence），编辑过的行不动；
   - kill switch 生效；LLM 抛错时不抛出、模板保留。
2. `initializeCourseOutline` 集成断言（沿用现有 mock `next/server` 捕获 after 回调的
   模式）：新课触发一次 enrich、复用课程不触发。
3. 本地实测：新账号走 onboarding 建课，确认 outline 描述被改写、语言正确；再手动
   编辑一条描述后强制重跑 enrich，确认 fence 挡住。

## 明确不做（v1）

- 不给已存在的课程回填（只对新建课程生效）。
- 不做分批/流式（>40 课保留模板尾部）。
- 不把 enrich 并入 lesson-generation job 表模型（与 N-3 备注的长期演进一并考虑）。
- 不改 `plannedLessonDescription` 模板本身（它仍是即时回退值）。
