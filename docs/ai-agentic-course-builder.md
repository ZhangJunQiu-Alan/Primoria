# AI Agentic Course Builder

Primoria AI 课程生成功能的三阶段规划与接口文档。

---

## Milestone 1: MVP — 一次性生成

### A. 前端

- [x] 在 Builder Dashboard → Course Manage 顶部新增 "一句话生成课程（Beta）" 入口
- [x] 弹出对话框：文本输入框（用户自然语言描述），Placeholder：`用一句话描述你想要的课程，例如'教Python基础编程，适合初学者，带互动练习'`
- [x] 用户输入文字后，输入框扩展，出现附加选项：难度（初学者 / 中级 / 高级）、动画风格（卡通 / 简约 / 真实）
- [x] 输入框底部右侧：「生成课程」按钮
- [x] 点击按钮后调用后端 `POST /ai/generate-course-json`
- [x] 显示基础加载状态（生成中 / 成功 / 失败）
- [x] JSON 校验通过：调用现有"导入 Course JSON"逻辑，渲染到画布
- [x] 失败：弹出错误信息（后端返回的错误摘要）

### B. 后端

- [x] 新增接口 `POST /ai/generate-course-json`（入参：用户描述 + 可选参数；出参：Course JSON 或错误）
- [x] 在 Prompt 中列出允许的 block 类型及字段（text / image / codeBlock / codePlayground / multipleChoice / fillBlank / video）
- [x] 修改生成课程专属 Prompt，支持产出一个或多个 lesson
- [x] 调用 LLM（Gemini 等），要求返回严格 JSON
- [x] 使用现有 JSON Schema 校验函数校验 LLM 输出
- [x] 校验通过：返回 JSON 给前端
- [x] 校验失败：收集错误路径和错误信息，生成友好错误摘要返回前端

### C. QA

- [x] 用不同的自然语言描述试 5–10 次，验证能否基本生成可导入的课程

---

## Milestone 2: 规划 + 生成

### A. 规划结构（已设计定稿）

**CoursePlanJson TypeScript 类型定义**

```typescript
// supabase/functions/_shared/types/course_plan.ts

type SubjectName =
  | "Mathematics"
  | "Physics"
  | "Chemistry"
  | "Biology"
  | "Computer Science"
  | "Engineering"
  | "Data Science & AI"
  | "Earth & Space Science";

type AnimationStyle  = "cartoon" | "minimal" | "realistic";
type Difficulty      = "beginner" | "intermediate" | "advanced";
type LessonType      = "interactive" | "quiz" | "video" | "article";
type ContentLanguage = "zh" | "en";

interface CoursePlanLesson {
  order:             number;    // 1-based；写入 DB 时 × 1000 → lessons.sort_key
  title:             string;
  objective:         string;    // Phase 2C 生成 blocks 时注入 prompt
  key_points:        string[];  // 3–6 个；Phase 2C 注入 prompt
  type:              LessonType;
  estimated_minutes: number;
  xp_reward:         number;
}

interface CoursePlanJson {
  schema_version: "plan-1.0";
  course: {
    title:                   string;
    description:             string;
    subject:                 SubjectName;   // AI 从枚举中选
    difficulty:              Difficulty;
    target_audience:         string;        // e.g. "零基础初学者，无编程经验"
    estimated_total_minutes: number;
    tags:                    string[];
    animation_style:         AnimationStyle;
    language:                ContentLanguage;
  };
  lessons: CoursePlanLesson[];
}
```

**CoursePlanJson → 数据库映射**

| CoursePlanJson 字段 | 目标表.字段 | 说明 |
|---|---|---|
| `course.title` | `courses.title` | 直接写入 |
| `course.description` | `courses.description` | 直接写入 |
| `course.subject` | `courses.subject_id` | `SELECT id FROM subjects WHERE name = $subject` |
| `course.difficulty` | `courses.difficulty_level` | 值域完全一致 |
| `course.estimated_total_minutes` | `courses.estimated_minutes` | 直接写入 |
| `course.tags` | `courses.tags` | 直接写入 |
| `course.animation_style` | `courses.animation_style` | 新字段（见 Migration） |
| `course.language` | `courses.content_language` | 新字段（见 Migration） |
| 整个 CoursePlanJson | `courses.planning_json` | 新字段（见 Migration），Phase 2C 按 order 取 objective/key_points |
| — | `courses.status` | 固定写 `'draft'` |
| — | `courses.author_id` | 当前登录用户 UUID |
| `lesson.title` | `lessons.title` | 直接写入 |
| `lesson.type` | `lessons.type` | 直接写入 |
| `lesson.order × 1000` | `lessons.sort_key` | 留间隙方便后续插入 |
| `lesson.estimated_minutes × 60` | `lessons.duration_seconds` | 单位换算 |
| `lesson.xp_reward` | `lessons.xp_reward` | 直接写入 |
| — | `lessons.course_id` | 上一步插入 course 得到的 UUID |
| — | `lessons.content_json` | 先写 `{}`，Phase 2C 填充 |
| — | `lessons.is_locked` | 第 1 课 `false`，其余 `true` |

> `lesson.objective` 和 `lesson.key_points` 不单独写入 `lessons` 表，
> 存在 `courses.planning_json` 中，Phase 2C 生成 blocks 时按 `lesson.order` 读取。

**需要的 DB Migration（courses 表新增 3 列）**

```sql
ALTER TABLE courses
  ADD COLUMN animation_style  text CHECK (animation_style IN ('cartoon', 'minimal', 'realistic')),
  ADD COLUMN content_language text CHECK (content_language IN ('zh', 'en')),
  ADD COLUMN planning_json    jsonb;
```

- [x] 设计 "课程规划 JSON" 结构定稿（见上方）
- [x] 设计 `lessons[]`，每项包含：`title`, `objective`, `key_points[]`
- [x] 写一个 TS 类型定义（见上方）
- [x] 确定 CoursePlanJson → DB 字段映射表
- [x] 在 `supabase/functions/_shared/types/course_plan.ts` 中落地类型定义文件
- [x] 执行 Migration：`courses` 表新增 `animation_style` / `content_language` / `planning_json`（`20260304000005_add_ai_agentic_columns_to_courses.sql`）

### B. 规划接口

- [x] 新增接口 `POST /ai/plan-course`（`supabase/functions/ai-plan-course/index.ts`）
- [x] 规划 Prompt：引导模型确定学科、目标人群、难度、课时数
- [x] 规划 Prompt：按合理学习顺序生成 `lessons[]`（每课 title + objective + key_points）
- [x] 对规划 JSON 做基础校验（schema_version / 字段存在性 / lessons 长度 3-8 / order 连续性）

### C. 生成接口

- [x] 新增接口 `POST /ai/generate-lesson-blocks`（`supabase/functions/ai-generate-lesson-blocks/index.ts`）
- [x] 生成 Prompt：注入课程对象、难度、目标人群、语言
- [x] 生成 Prompt：注入本课 objective + key_points
- [x] 生成 Prompt：包含全部 10 种 block 类型定义，按学科自动选策略
- [x] 生成 Prompt：约束每课 4–8 个 blocks，至少 2 个互动块
- [x] 块 ID 自动加 `l{order}-` 前缀，保证跨课全局唯一
- [x] 为多课循环调用（在 Phase 2D orchestrator `agentic-generate-course` 中实现）
- [x] 收集所有 pages 的结果（在 Phase 2D orchestrator 中实现）

### D. 组装校验 + 数据库写入

- [x] 新总接口 `POST /ai/agentic-generate-course`（`supabase/functions/agentic-generate-course/index.ts`）
- [x] 写函数：`buildCourseJson(planJson, lessonPages) -> CourseJson`
- [x] 填充课程级别元信息（title、description、difficulty、estimatedMinutes）
- [x] 按顺序构造 `pages[]`，每页挂 `blocks[]`，设置 `schemaVersion`
- [x] 调用 `validateAssembledCourse()` 做最终校验
- [x] 写入 `courses` 表（含 animation_style / content_language / planning_json 三列）
- [x] 写入 `lessons` 表（content_json = { blocks: [...] }，第 1 课 is_locked=false）
- [x] 用户 JWT 鉴权（401 if unauthenticated）
- [x] 错误响应带 `stage` 字段，便于前端定位失败阶段

### E. 前端升级

- [x] `AICourseGenerator.generateCourseAgentViaApi()` 方法调用 `agentic-generate-course`
- [x] `AgentCourseResult` 数据类（success / message / courseId / lessonCount）
- [x] Builder UI 生成按钮改为调用 `generateCourseAgentViaApi()`
- [x] 支持显示进度："正在规划课程结构..."（0-15%）
- [x] 支持显示进度："正在生成课程内容..."（15-82%，模拟多课推进）
- [x] 支持显示进度："正在校验课程结构..."（82-92%）
- [x] `LinearProgressIndicator` 动画进度条
- [x] 成功 SnackBar 显示实际 lessonCount（例："课程已生成，共 5 课"）
- [x] 成功后直接刷新 Course Manage 列表，无需 import JSON

---

## Milestone 3: 自检 + 迭代 + 质量检查

### A. Schema 工具

- [x] 新增内部工具接口 `POST /utils/validate-course-json`（入参：Course JSON；出参：`passed: boolean` + `errors: [{path, message}]`）
- [x] 将该接口作为 agent 流程中可调用的"工具"

### B. 自动重试

- [x] 针对单个 lesson：生成 page 临时 JSON 片段并做局部校验
- [x] 针对单个 lesson：校验失败时，根据错误信息拼 Prompt，让 LLM 重新生成或修正该课（最多 2 次/model）
- [x] 在 `ai-generate-lesson-blocks` 中实现 `buildCorrectionPrompt()` + `MAX_RETRIES_PER_MODEL = 2` 重试循环
- [x] 支持接收 `qualityHints?: string[]` 并注入 prompt

### C. 质量检查

- [x] 质量规则：每课至少 1 个互动块（`MISSING_INTERACTIVE`）
- [x] 质量规则：整门课至少 N 道题目（`LOW_QUESTION_COUNT`）
- [x] 质量规则：文本块长度不超过 600 字符（`TEXT_TOO_LONG`）
- [x] 质量规则：初级课避免使用高级概念关键词（`BEGINNER_KEYWORD`，简单关键词列表）
- [x] 实现 `POST /utils/evaluate-course-quality`（入参：Course JSON；出参：`score` + `issues: [{type, message, location, lessonIndex, qualityHint}]`）
- [x] 在 `agentic-generate-course` Stage 3.5 中调用质量检查，自动重新生成有问题的课（一次优化 pass）
- [x] 共享逻辑提取到 `supabase/functions/_shared/quality.ts`

### D. 人机协同

- [x] 前端生成完成后弹出提示："检测到本课程练习题偏少，是否让 AI 自动补充？"
- [x] 前端生成完成后弹出提示："是否自动添加期末测验页？"
- [x] 用户点击「是」时：调 `ai-enhance-course` 接口，更新 DB 中对应 lessons，刷新课程列表
- [x] `AgentCourseResult` 新增 `qualityScore`、`qualityPassed`、`qualityIssues` 字段
- [x] `AICourseGenerator.enhanceCourseViaApi()` 方法（type: add-interactive | add-final-quiz）

---

## 工程管理

- [ ] 将每个 Level 拆成 Milestone（已完成，见本文档）
- [ ] 每个接口 / 功能点建对应 issue，按优先级逐个完成
- [x] 在 repo 里新建本文档 `docs/ai-agentic-course-builder.md`
