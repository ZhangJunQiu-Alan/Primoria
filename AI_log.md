# AI_log

> 给 AI 读的工作日志，不是给人读的。每条记完成内容 + **重点是剩余任务**。最新在最上面。
> 关联文档：temple/feature_specification.md（迭代二第 2 点 = learning_events 自动沉淀）。

---

## 2026-06-22 (改造B+C) — 大纲生成 + LazyGeneration + Course 唯一复用

### 本次完成
**C. Course 按 (owner_id, graph_id) 唯一复用**
- schema：courses 加唯一索引 `courses_owner_graph_uidx (owner_id, graph_id)`；graph_id NULL（free-form 无 KG 课）因 NULL 互不相等而豁免。迁移 drizzle/0023_living_korath.sql（**未执行**）
- store：`getCourseByGraph(ownerId, graphId)` 查用户在某学科 KG 的唯一 Course

**B. 生成器走「大纲 + 懒生成」**（course-generator.ts 重构）
- `outlineTopicsFrom(graphId, startTopicId)`：从入口 topic 起、按 default_order 取 KG 剩余所有 topic（line 86「Topic Order 规划大纲」）
- `buildOutlineCourse`：新 Course = 学科级元信息（title/topic=subject）+ 一串 **planned 占位 lesson**（每 topic 一个，sortKey=default_order，blocks=null）
- `generateCourse` 改为编排：① C 先查 getCourseByGraph 复用，无则建大纲；② 只**物化入口 topic 那一节**（fillLesson 调 LLM 填 blocks、status→generated），其余留 planned；③ saveCourse；④ 仅新建 Course 时发 course.generated
- 复用幂等：已 generated 的节点再请求直接返回不重生成（line 91「已有大纲则在旧大纲下产出」）
- free-form（无 kgContext）：单 planned 节点→物化，行为同旧版单 lesson；course.title=topic
- `materializeLesson(courseId, lessonId|topicId)`：**懒生成入口**，从 KG 给该 topic 建单点 kgContext 再 fillLesson（B 的"按需物化"，已导出）
- 校验：typecheck 仅剩 3 个本分支既有无关文件；lint 通过

### 剩余任务
⭐ **执行迁移**：db:migrate（0020-0023 全未跑；0023 唯一索引若有历史重复 (owner,graph) 会失败，但 graph_id 是 0020 新加、存量全 NULL，安全）
**D. lesson.completed**（line 74）：完成=做完该 lesson 结尾全部 quiz，由 quiz 提交驱动；lesson_id 已就位
**E. 跨图补救编排**（line 130）：静默建 prereq 学科 Course + 跳转按钮；triggeredFrom 已支持，依赖 B/C（现已就绪）
- **materializeLesson 未接路由/UI**：懒生成函数就绪，但"用户点下一节→物化"的 route+UI 未建（依赖 Course UI 改版 Todo line 152-153）
- **大纲不在 UI 呈现**：planned lesson 在 courseBlocks() 里被跳过，当前课程页只渲染已物化节点；大纲/路径 UI 待 Course UI 改版
- 已知边界：复用 Course 时若请求的 topic 比原入口 default_order 更小（往回学），不在旧大纲内 → materializeTargetLesson 找不到目标、静默 no-op（常见前进流程不受影响）
- positioning 仍只产 path[0..1]；大纲的"剩余全部 topic"现在由生成器侧 outlineTopicsFrom 从 KG 直接算，不依赖 positioning 扩展

---

## 2026-06-22 (改造A) — lessons 支持「未生成占位」态（大纲/LazyGeneration 地基）

### 背景：spec 更新引入「大纲路径 + LazyGeneration」（迭代二.3 line 83-91）
Course = 入口 topic 起 KG 剩余所有 topic 的有序大纲，只立即生成首节，其余懒生成。我上一版落地的是「Course=单个已生成 lesson」，冲突最大的是**未生成占位节点无处存**（lessons.blocks NOT NULL、progress 无 planned 态）。本次只做这一块（A）。

### 本次完成
- Schema（schema.ts）+ 迁移 drizzle/0022_mute_moondragon.sql（**未执行**）
  - `lessons.blocks` 改可空、`estimated_minutes` 改可空
  - 新增 `status`（planned|generating|generated, default planned）——**第三条正交轴**，独立于 role/progress，表示「物化状态」：planned=大纲占位无 blocks；generating=防重复物化锁；generated=已有 blocks
- 类型（courses/types.ts）：`Lesson.blocks: CourseBlock[] | null`、`estimatedMinutes: number | null`、加 `status: LessonStatus`；`courseBlocks()` 跳过 blocks=null 的占位节点
- Store（courses/store.ts）：mapper 读写 status/可空 blocks；block 操作全部 null-safe（mutateBlocks/insert/remove/move/resolveInsertTarget 只认 blocks!=null 的已物化 lesson）
- 生成器：物化 lesson 设 `status:"generated"`
- null-safe 直读点：quiz/route.ts、course-editor.ts lessonIdForBlock
- 校验：typecheck 无 lesson/blocks 报错（剩 3 文件 molecule-renderer/use-primoria-copilot/graph-visualizer 本分支既有、未碰）；lint 通过

### 剩余任务（spec 冲突 B/C/D/E 仍未做）
⭐ **执行迁移**：db:migrate（0020/0021/0022 全未跑）
**B. 生成器按大纲走 lazy**：现仍「所有 block 塞一个 lesson」，要改成「建 N 个 lesson 占位（planned）+ 只物化首节」+ 单独的「物化某 planned 节点」入口
**C. Course 按 (owner_id, graph_id) 唯一复用**：spec line 131 每用户每学科唯一 Course；现无唯一索引、generateCourse 每次新建不去重；需加唯一约束 + 「查 KG 是否已有大纲则复用」
**D. lesson.completed 重定义**（line 74）：完成=做完该 lesson 结尾全部 quiz（非显式按钮）；由 quiz 提交驱动，所有 quiz block 提交后发事件。lesson_id 列已就位
**E. 跨图补救编排**（line 130）：静默初始化 prereq 学科 Course + 建大纲 + 当前 Course 留跳转按钮节点；triggeredFrom 列已支持回链，依赖 B/C
- 旁支：line 88 宽泛目标菜单改语义相似度 top5（属定位/菜单链路）；line 155 lesson 的 block 规范未拍

---

## 2026-06-22 11:34 CST — lesson 实体 + 独立 lessons 表（feature_spec line 67/116-119·解锁蒸馏链最底层）

### 设计决策（已与用户逐条拍定）
- Course = 该学科 KG 上惰性物化、随适应性插课生长的个性化子图；每用户每学科至多一个 Course 实例
- lesson 引用 KG 的 topic/concept ID，不复制 KG 结构；block 与 concept **不**一一对应
- 数据模型：**独立 lessons 表**（非内嵌 jsonb）；旧数据可丢弃；block 仍 jsonb 挂 lesson 上
- 字段决策：status 拆成 `role`(new|review|remediation) + `progress`(not_started|in_progress|completed)；排序用浮点 `sort_key`（插课不重排）；只存 `topic_id`（concept/graph 从 KG 派生）；`triggered_from` 跨图补救回链

### 本次完成
- Schema（apps/web/src/lib/db/schema.ts）+ 迁移（**未执行**，需 db:migrate）
  - 新增 `lessons` 表：id / course_id(FK cascade) / owner_id / topic_id / title / role / progress / sort_key(double) / triggered_from / blocks(jsonb) / estimated_minutes / version / timestamps；索引 (course_id,sort_key) + owner_id
  - `courses` 去掉 `blocks`，加 `anchor_concept_id` / `graph_id`（Course 级目标锚点）
  - `learning_events` / `quiz_attempts` / `course_edit_events` 各补 `lesson_id`
  - 迁移拆两个：drizzle/0020_dizzy_silk_fever.sql（全部新增）+ drizzle/0021_round_jetstream.sql（单独 drop courses.blocks）。拆两步是绕开 drizzle rename 交互提示（无 TTY）
- 类型（apps/web/src/lib/courses/types.ts）
  - 新增 `Lesson` / `LessonRole` / `LessonProgress`；`Course.blocks`→`Course.lessons` + anchorConceptId?/graphId?
  - 新增 `courseBlocks(course)`：按 sortKey 拍平所有 lesson 的 blocks，供只读消费方
- Store（apps/web/src/lib/courses/store.ts）：读写双表，saveCourse 用事务整组替换 lessons；block 操作（update/insert/remove/move）改 lesson-aware（定位 block 所属 lesson 就地改）
- 生成器（course-generator.ts）：generateCourse 把产出 blocks 包成**单个 lesson**（role=new, sortKey=1, topicId 来自 kgContext.startTopic）；course 带 anchorConceptId/graphId
- lesson_id 落数据：quiz.submit 事件 + quiz_attempts + course_edit_events 都按 block 反查所属 lesson 写入 lesson_id（learning-events/store.ts、quiz/route.ts、course-edit-events.ts、course-editor.ts）
- 消费方扫尾：chat/quiz route、course page、course-editor、course-detail-client 全切到 courseBlocks() / lesson-aware
- 校验：typecheck 无 blocks/lessons 相关报错（剩余 3 文件 molecule-renderer / use-primoria-copilot / graph-visualizer 是本分支既有、未碰）；lint 通过

### 剩余任务（紧接本项，蒸馏链继续往上）
⭐ **执行迁移**：`pnpm --filter @primoria/web db:migrate`（0020+0021 未跑）；旧 courses 行迁后变空课，按「旧数据可丢」需手动 DELETE FROM courses 或重建
⭐ **`lesson.completed` 事件 + 课尾「完成本节」按钮**（"怎么算完成"本期定义：显式按钮→前端 event_id→按 (owner_id, lesson_id) 幂等、每节触发一次蒸馏）。lesson_id 列已就位，下一个独立切片
2. **Extractor Agent（line 72）** — 依赖上面的 lesson.completed 触发器+窗口
3. **lesson 的 block 规范（feature_spec line 141 / Todo）** — 定了才能开「多 lesson 生成 + 分节 UI」；本次仍是「一个 course=一个 lesson」，UI 不分节、生成器不产多 lesson
4. **画像事实卡片表（④）/ 画像沉淀触发（line 75）** — 同上次，等 Extractor 落地

### 已知遗留点
- 本次范围边界：未做多 lesson 生成、未做分节 UI、未做 lesson.completed（均依赖 line 141 或属下一切片）
- cross-graph 补救 lesson 落 prereq 所属 Course + 当前 Course 留跳转按钮：已写进 spec（line 116），消费端代码未实现
- import-local-data.ts 读旧 JSON 仍按 Course[] 类型，旧 blocks 形状运行时会失配（旧数据丢弃，暂不处理）

---

## 2026-06-21 23:44 CST — learning_events 事件表 + 4 类写入（迭代二第2点·地基）

### 本次完成
- 建表 `learning_events`（apps/web/src/lib/db/schema.ts，迁移 drizzle/0019_luxuriant_trish_tilby.sql，**已执行**）
  - 列：id / owner_id / type / course_id / block_id / graph_id / concept_id / payload(jsonb) / created_at
  - 索引：(owner_id,created_at) 蒸馏窗口扫描；(owner_id,type)；(owner_id,concept_id) 将来 mastery
- 写入 helper `apps/web/src/lib/learning-events/store.ts`
  - `recordLearningEvent(event)`，typed union 强约束每类 payload
  - best-effort：hasDatabaseUrl 门控 + try/catch 吞错，绝不打断主流程
  - onConflictDoNothing(id) + id 可由调用方传 → 重发只算一次
- 已接 4 类真实写入：
  - `chat.question` → apps/web/src/app/api/copilot-threads/[id]/messages/route.ts POST(role=user)，id=cq_<msgId> 幂等；concept_id 留空待蒸馏补
  - `quiz.submit` → apps/web/src/app/api/courses/[id]/quiz/route.ts POST，一题一条，服务端 gradeAnswer 判对错；concept_id 留空（题未挂概念）
  - `course.generated` → apps/web/src/lib/ai/deepagent/course-generator.ts saveCourse 后，owner 容错解析，带 graph/concept 定位落点；source 暂恒为 cold_start
  - `position.computed` → apps/web/src/app/api/knowledge-graph/position/route.ts POST，复用 PositioningLogRecord 形状，带 targetConceptId
- 校验：db:generate 干净（仅新表）、typecheck 通过、lint 无新增问题（4 个旧 error 在未碰文件）

### 剩余任务（按依赖深浅，⭐=最底层先做）

⭐ **lesson 实体 + 「怎么算完成」（feature_spec line 67）— 最底层，卡住整条蒸馏链**
   - 现状：系统无 lesson 实体，course 直接装 block（apps/web/src/lib/courses/types.ts）
   - 依赖链：画像沉淀 ← Extractor(line72) ← lesson.completed 触发器+窗口 ← 此项
   - 没有它：lesson.completed 发不出、蒸馏窗口无边界、Extractor 无从触发
   - 做完此项才能接 `lesson.completed` 事件写入（payload 已设计为 {}）

2. **Extractor Agent 实现（line 72）** — 蒸馏引擎，依赖上面的触发器与窗口定义
   - 输入：某 lesson 期间的 learning_events（按 owner_id + 时间窗扫描）
   - 输出：画像事实卡片（④ 事实卡片列表，已选定格式）

3. **画像事实卡片表（④）** — 本次按用户要求**未建**，只建了事件表
   - 等 Extractor 落地时一起建：每条 {dim, value, confidence, evidence(event_id), updated_at}

4. **画像沉淀触发时机·关键偏好（line 75）** — 用户明确「先不做」，增强项非地基

### 旁支任务（独立，不挡蒸馏主链）
- 冷启动页面设计（line 40/87 TODO1）
- `position.menu_select` 写入 — 阻塞于「菜单→建课链路」未建（feature_spec Todo line 132）
- `chat.feedback` / `chat.code_copied` 写入 — 阻塞于 👍/👎、复制埋点 UI 未做
- `distractor_tag`（line 52）— 用户自己做 quiz prompt 工程，产出后补进 quiz.submit payload
- `quiz.hint` / `quiz.retry` / `chat.code_run` — 迭代三

### 已知遗留点（写入侧）
- `course.generated` 的 source 恒为 "cold_start"；等「有画像走建课」链路（迭代二第3点）做了再传 "profile"
- `quiz.submit` 的 concept_id 留空；等 quiz 出题给题目挂 concept 后可回填
