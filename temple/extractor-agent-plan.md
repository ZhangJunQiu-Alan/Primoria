# Extractor Agent 实现计划

> 异步蒸馏 Agent:lesson 完成时从 `learning_events` 蒸馏出 learner facts,回流给
> 建课 Planner 与 Tutor 对话,并在 Settings "Facts About You" 展示(用户可删)。
> 本计划由设计讨论锁定,落地分 8 个阶段,每阶段独立可交付+验证。

## 锁定的设计决策

- **触发**:lesson 完成(全部 quiz 答完)时,在 `enqueueLearningProgressJob` 旁
  入队独立的 `extractor_jobs`。独立 job/worker,慢 LLM 不拖累 progress 推荐。
- **作业模型**:镜像 `learning_progress_jobs` 的 lease/fence 可恢复模型,但更简单
  (无 stage、无 decision)。`lessonId` 唯一 → 重跑幂等。
- **事件窗口**:给 `chat.question` / `chat.feedback` 补 `lessonId`,蒸馏按
  `WHERE lessonId = 本 lesson` 取事件(与 `quiz.submit` 一致)。
- **facts 数据模型**:`learner_facts` 表,结构化条目 + 证据。
  - `category` 四档:`preference | prior_knowledge | learning_gap | goal`
  - `status`:`active`(直接生效)| `dismissed`(用户删,永久墓碑)
- **去重**:与 active 语义重合→reinforce;与 dismissed 语义相似→skip(绝不复提
  用户删过的同类)。代码层兜底 exact-text dismissed skip,语义层靠 LLM。
- **消费分流**:

  | category | 喂 Planner | 喂 Tutor | 作用 |
  |---|---|---|---|
  | `preference` | ✅ | ✅ | 改怎么教/怎么解释 |
  | `prior_knowledge` | ✅ | ✅ | 哪些可略讲、抬高起点 |
  | `learning_gap` | ✅ | ✅ | 主动补前置/加练习/加类比 |
  | `goal` | ❌ 默认 | ❌ 默认 | 长期画像/推荐/首页;避免历史目标污染当前课程 |

- **建课消费点 = Planner 唯一**:Planner 消化 facts,烘焙进每个 block 的
  `writerInstruction`;Block Writer 不动、不见原始 facts。
- **Tutor 消费点 = `copilotkit/route.ts` 唯一**(默认 tutor 已统一为 CopilotKit;
  `primoria-deep-agent.ts` 已移除)。graph.mjs 不动。
- **注入截断**:被注入集合按 `confidence × recency` 取 top-8。
- **Settings v1**:展示 active facts,可删除(→ dismissed),不支持新增/编辑。

## 约定

- `typecheck = pnpm --filter @primoria/web typecheck`,`lint = pnpm lint`。
- tsx:在 `apps/web` 下用 `./node_modules/.bin/tsx`。
- 所有 `db:migrate` 只对本地独立 Postgres(spec §18,禁碰正式库)。

---

## Phase 0 — Schema & migration(无行为变化)

**文件**
- `apps/web/src/lib/db/schema.ts`:新增 `learnerFacts`、`extractorJobs` 两表 + 类型导出。
  - `extractorJobs` 镜像 `learningProgressJobs`,去掉 `stage/decision/decisionStatus`;
    `lessonId` uniqueIndex、`leaseToken` uniqueIndex、`status+leaseExpiresAt` index。

**验证**
```bash
cd apps/web && pnpm db:generate   # 生成 0031_*.sql,人工 review DDL
pnpm db:migrate                    # 仅本地独立 Postgres
pnpm --filter @primoria/web typecheck
```

## Phase 1 — chat 事件补 lessonId(窗口前置)

**文件**
- `apps/web/src/lib/learning-events/store.ts`:`chat.question`/`chat.feedback` 加
  `lessonId?: string | null`,`toRow` 写入。
- `apps/web/src/app/api/copilot-threads/[id]/messages/route.ts`:记录时传 `lessonId`
  (无课内上下文传 null)。

**测试点**:`tests/learning-events-lesson-id.unit.ts` — 带 lessonId 落列;null 不报错。
**验证**
```bash
cd apps/web && ./node_modules/.bin/tsx tests/learning-events-lesson-id.unit.ts && pnpm typecheck
```

## Phase 2 — Facts store + categories + directive

**文件**
- `apps/web/src/lib/learner-profile/types.ts`:`FACT_CATEGORIES`、`LearnerFact`、
  `factsDirective(facts: {text;category}[])`(只渲染传入集合,调用方过滤+截断)。
- `apps/web/src/lib/learner-facts/store.ts`(新):`listActiveFacts`、
  `listAllFactsForExtraction`(active+dismissed)、`applyExtractionResult`
  (insert / reinforce:occurrences+1 + 证据按 eventId 去重 + lastSeenAt / 兜底 skip
  exact-text dismissed)、`dismissFact`。

**测试点**:`tests/learner-facts-store.db.ts`(reinforce 不双计、dismiss 后消失、
exact-text dismissed 兜底 skip);`tests/facts-directive.unit.ts`(空集空串、分类渲染、
不泄露 evidence)。
**验证**
```bash
cd apps/web && ./node_modules/.bin/tsx tests/facts-directive.unit.ts
./node_modules/.bin/tsx tests/learner-facts-store.db.ts && pnpm typecheck
```

## Phase 3 — Extractor job infra(镜像 learning-progress)

**文件**
- `apps/web/src/lib/courses/extractor-jobs.ts`(新):`enqueueExtractorJob`(lessonId
  幂等、failed→requeue)、`claimNextExtractorJob`、`renewExtractorLease`、
  `failExtractorJob`、`completeExtractorJob`、心跳常量、`ExtractorClaim`、`Fence`。

**测试点**:`tests/extractor-jobs.db.ts`(入队幂等、claim 上租约、过期可再 claim、
fence 失配拒写)。
**验证**
```bash
cd apps/web && ./node_modules/.bin/tsx tests/extractor-jobs.db.ts && pnpm typecheck
```

## Phase 4 — 蒸馏 processor + worker

**文件**
- `apps/web/src/lib/ai/extractor/distill-prompt.ts`(新):`buildDistillPrompt(...)`。
  输出 `{text,category,confidence,evidence:eventIds[],op:add|reinforce(factId)|skip}`;
  active 重合→reinforce;dismissed 语义相似→skip。
- `apps/web/src/lib/ai/extractor/distill.ts`(新):复用 `ai/course-generation/model-json.ts`
  的 JSON 模型助手(平台服务器模型,无 BYOK),解析 + zod 校验。
- `apps/web/src/lib/courses/extractor-processor.ts`(新):载上下文 → 取
  `WHERE ownerId & lessonId` 的 `chat.feedback/chat.question/quiz.submit` +
  join `copilotChatMessages.content` → 载现有 facts → `distill` → `applyExtractionResult`。
- `apps/web/src/workers/extractor-worker.ts`(新):克隆 `learning-progress-worker.ts`。
- `apps/web/package.json`:加 `"worker:extractor": "tsx src/workers/extractor-worker.ts"`。

**测试点**:`tests/distill-prompt.unit.ts`(含 4 档说明、dismissed 禁复提、证据要求);
`tests/extractor-processor.unit.ts`(stub LLM 注入假 ops,验 add/reinforce/skip 落库、
eventId 去重、dismissed 同类 skip)。
**验证**
```bash
cd apps/web && ./node_modules/.bin/tsx tests/distill-prompt.unit.ts
./node_modules/.bin/tsx tests/extractor-processor.unit.ts && pnpm typecheck && pnpm lint
```

## Phase 5 — 触发接线

**文件**
- `apps/web/src/app/api/courses/[id]/quiz/route.ts`(~line 126):`enqueueLearningProgressJob`
  之后加 `enqueueExtractorJob(...).catch(log)`(best-effort,不阻断响应)。

**测试点**:`tests/quiz-route-enqueue.unit.ts`(完成时两 job 入队;未完成都不入队)。
**验证**
```bash
cd apps/web && ./node_modules/.bin/tsx tests/quiz-route-enqueue.unit.ts && pnpm typecheck
```

## Phase 6 — 消费侧注入(Planner + Tutor)

**文件**
- `apps/web/src/lib/ai/deepagent/course-kg-context.ts`:`CourseContext` 加
  `facts?: {text;category}[]`。
- `apps/web/src/lib/courses/lesson-generation-context.ts`:并行 `listActiveFacts`,
  过滤 `preference/prior_knowledge/learning_gap`、top-8 → `kg.facts`(DB 失败降级空数组)。
- `apps/web/src/lib/ai/course-generation/lesson-planner.ts`(~line 116):
  `knowledgeBackgroundDirective` 旁注入 `factsDirective(kg.facts ?? [])`;prompt 说明
  "消化进每个 block 的 writerInstruction,Writer 不另见"。**block-writer.ts 不动**。
- `apps/web/src/app/api/copilotkit/route.ts`(~line 70 `formatLearnerProfileContextForAgent`):
  载 active facts(前 3 类 top-8)→ `tutorStyleDirective` 旁加 `factsDirective`。
  **graph.mjs 不动**。

**测试点**:`tests/lesson-planner.unit.ts`(扩展:kg.facts 含事实、不含 goal 类、空时不破坏);
`tests/copilotkit-profile-static.unit.ts`(hidden context 含 facts 段)。
**验证**
```bash
cd apps/web && ./node_modules/.bin/tsx tests/lesson-planner.unit.ts
./node_modules/.bin/tsx tests/copilotkit-profile-static.unit.ts && pnpm typecheck && pnpm lint
```

## Phase 7 — Settings "Facts About You" 后端 + UI

**文件**
- `apps/web/src/app/api/learner-facts/route.ts`(新):`GET` 列 active(owner-scoped);
  `DELETE`(factId)→ `dismissFact`。
- `apps/web/src/app/settings/page.tsx`:"Facts About You" 段接真实数据,可删,无新增/编辑。

**测试点**:`tests/learner-facts-route.unit.ts`(鉴权、列 active、DELETE→dismissed);
`tests/profile-pages-static.unit.ts`(扩展:facts 段渲染)。
**验证**
```bash
cd apps/web && ./node_modules/.bin/tsx tests/learner-facts-route.unit.ts
./node_modules/.bin/tsx tests/profile-pages-static.unit.ts && pnpm typecheck && pnpm lint
```

---

## 全量回归(收尾)
```bash
cd apps/web && pnpm test:progress && pnpm test:lesson-jobs && pnpm test:kg
pnpm typecheck && pnpm lint
node --check ../agent/src/graph.mjs   # 确认未误改
```

## 依赖顺序
0 → 1 → 2 → 3 → 4 → 5 → 6;7 在 6 之后(都依赖 Phase 2 store)。

## 风险
- **幂等**:LLM 非确定,靠 evidence eventId 去重 + lessonId 唯一 job 达到"不双计",
  非字节级幂等。
- **dismissed 语义去重**靠 LLM,代码只兜底同文本;复提则强化 prompt 或加相似度过滤。
- **正式库**:`db:migrate` 只对本地独立 Postgres。

---

## 实际落地记录(与计划的偏离)

> 全部 8 阶段已实现。以下为实现时相对上面计划的偏离与新增,供审阅。

### 新增 Phase 3.5 — `chat.feedback` 埋点
计划只覆盖 `chat.question`,但 store 当时**没有 `chat.feedback`**(spec 规划但未埋点)。
为让蒸馏一上来就有最强的"讲法偏好"证据,插入此阶段:
- `learning-events/store.ts`:新增 `chat.feedback` 事件类型。
- `api/learning-events/feedback/route.ts`(新):记录端点,id 决定性 `cf_<msg>_<signal>`。
- `copilot-thread-history.ts` + `copilot-chat-surface.tsx`:👍/👎 反馈条 +
  `PrimoriaChatScopeContext`(把 course/lesson 透到 module 级消息组件)。
- 仅做 thumb;`via:"text"`(懂了/没懂)归一化未做,事件类型已预留。

### 测试策略偏离(贯穿 Phase 2/3/4/7)
正式库 `DATABASE_URL` 指向 Supabase,且标准 `.db.ts` harness 的 `resetTestDb()` 会
`truncate users cascade`(破坏性)。为兼顾验证与 spec §18:
- **核心逻辑抽成纯函数做 `.unit.ts`**:`planFactMutations`(去重/幂等)、
  `parseDistillResult` + `buildDistillPrompt`、`selectPlannerFacts`。
- **DB 接线用一次性自清理 live 脚本**验证(唯一前缀 seed → 跑 → 删自己的行,
  绝不 truncate),验证完即删。覆盖:job lease/fence 生命周期、processor 端到端
  (注入假 distill,不调 LLM)、facts store(list/dismiss/墓碑/owner 隔离)。
- 计划中的 `extractor-jobs.db.ts` 仍写入(harness 版),无 `TEST_DATABASE_URL` 时跳过。
- 计划中的 `extractor-processor.unit.ts`、`quiz-route-enqueue.unit.ts`、
  `copilotkit-profile-static.unit.ts`、`learner-facts-route.unit.ts` **未单独建**:
  其逻辑或已被纯函数单测覆盖,或是 Next route handler 需 session/DB 难直测且为镜像
  已证逻辑。改以静态 grep(`profile-pages-static`)+ live 脚本覆盖。

### Phase 0 迁移
`db:generate` 顺带生成了与本任务无关的 `courses_owner_graph_uidx` drop/重建(既有
drift),已手动从 `0031_small_wildside.sql` 剔除,迁移收窄为纯新增两表。已**经用户授权
对正式 Supabase 库应用**(纯新增、非破坏)。

### Phase 6 去重
Tutor 侧的 facts 选取直接复用 Phase 6 导出的 `selectPlannerFacts`(而非重复实现),
保证 Planner 与 Tutor 用同一套过滤(排除 goal)+ 排序 + top-8。

### 回归结果(最后一次全量)
- extractor 单测 7 个全过;`test:progress` / `test:lesson-jobs` / `test:kg` 全过。
- `typecheck` 干净;`graph.mjs` 未改(`node --check` OK)。
- `pnpm lint`:0 error,2 warning(均在 `course-detail-client.tsx:915` 既有
  `useEffect setState`,非本次引入)。
