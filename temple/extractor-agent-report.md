# Extractor Agent — 工作报告(供代码评估）

实现范围:feature_specification.md §90 的"异步蒸馏 Extractor Agent" + §101 分层记忆的
核心层(用户描述/画像)。lesson 完成 → 后台蒸馏 learner facts → 回流建课/对话 →
用户可在 Settings 管理。设计与决策见 `temple/extractor-agent-plan.md`。

> 注:本次工作区里 `CLAUDE.md` / `README.md` / `docs/architecture.md` /
> `qa/batch-visual-mode-client.tsx` 的改动**不属于本任务**(你其它在途修改),下表不含。

---

## 1. 改动清单(本任务）

### 新增文件
| 文件 | 作用 |
|---|---|
| `lib/db/schema.ts`(改) | `learner_facts` + `extractor_jobs` 两表 |
| `drizzle/0031_small_wildside.sql` | 迁移(纯新增,已应用正式库) |
| `lib/learner-facts/store.ts` | facts CRUD + 纯函数 `planFactMutations`/`normalizeFactText` |
| `lib/courses/extractor-jobs.ts` | lease/fence 可恢复 job 存储 |
| `lib/courses/extractor-processor.ts` | 蒸馏管线(取事件→summary→distill→apply) |
| `lib/ai/extractor/distill.ts` | `buildDistillPrompt` + `parseDistillResult` + `distillFacts` |
| `workers/extractor-worker.ts` | 长驻 worker(`pnpm worker:extractor`) |
| `app/api/learning-events/feedback/route.ts` | 记录 `chat.feedback` |
| `app/api/learner-facts/route.ts` | Settings GET(列 active)/ DELETE(dismiss) |
| `components/profile/facts-about-you.tsx` | Settings facts 列表(可删) |
| 6 个 `tests/*.unit.ts` | 见 §4 |

### 改动文件
| 文件 | 改动 |
|---|---|
| `lib/learner-profile/types.ts` | `FACT_CATEGORIES`/`LearnerFact`/`factsDirective` 等 |
| `lib/learning-events/store.ts` | `chat.question` 补 lessonId;新增 `chat.feedback`;导出 `toRow` |
| `lib/courses/lesson-generation-context.ts` | 载 active facts → `selectPlannerFacts` → `kg.facts` |
| `lib/ai/deepagent/course-kg-context.ts` | `CourseContext.facts` 字段 |
| `lib/ai/course-generation/lesson-planner.ts` | Planner prompt 注入 `factsDirective` |
| `app/api/copilotkit/route.ts` | Tutor hidden context 注入 facts |
| `app/api/courses/[id]/quiz/route.ts` | 完成门入队 extractor job |
| `app/api/copilot-threads/[id]/messages/route.ts` | `chat.question` 带 lesson/course |
| `copilot-chat-surface.tsx` / `copilot-thread-history.ts` | 👍/👎 反馈条 + 透传 |
| `settings/page.tsx` / `globals.css` | Settings facts 卡 + 样式 |
| `package.json` | `worker:extractor` 脚本 |

约 +460 行(不含新文件)。

---

## 2. 数据模型

**`learner_facts`**(一行一条事实):`id, ownerId, text, category(preference|
prior_knowledge|learning_gap|goal), status(active|dismissed), confidence, evidence
(jsonb [{lessonId,eventIds[],at}]), occurrences, sourceLessonId, lastSeenAt,
createdAt, updatedAt`。索引 `(owner,status)`、`(owner,category)`。

**`extractor_jobs`**:镜像 `learning_progress_jobs` 的 lease/fence,去掉 stage/decision。
`lessonId` 唯一(幂等)、`leaseToken` 唯一。

二者均 `ownerId → users` cascade。

---

## 3. 控制流(端到端)

```
学完 lesson(quiz 全做完)
  └─ quiz/route.ts: recordLearningEvent(lesson.completed)
                   + enqueueLearningProgressJob   (既有)
                   + enqueueExtractorJob          (本任务, best-effort)
extractor-worker（独立进程, lease/心跳/重试）
  └─ processExtractorJob:
       载 course/lesson/topic
       取 WHERE owner & lessonId 的 chat.feedback / chat.question / quiz.submit
       批量 join copilot_chat_messages 取聊天正文 → DistillEvent[] 摘要
       载现有 facts(active+dismissed)
       distillFacts → invokeJson(平台模型) → parseDistillResult
       applyExtractionResult(planFactMutations → insert/reinforce/skip)
       completeExtractorJob(fenced)
消费(facts 自动生效)
  ├─ 建课: lesson-generation-context 载 active facts → selectPlannerFacts(去 goal,
  │        top-8) → kg.facts → lesson-planner prompt → 烘焙进 writerInstruction
  └─ 对话: copilotkit/route 载 active facts → 同一 selectPlannerFacts → hidden context
Settings "Facts About You"
  └─ GET 列 active;DELETE → dismissFact(墓碑,不再复提)
```

---

## 4. 测试与验证

**单测(`tsx tests/*.unit.ts`,纯逻辑,全过):**
- `learning-events-lesson-id` — chat.question/feedback toRow 落列 + payload
- `facts-directive` — directive 渲染/空集/不泄露 evidence
- `learner-facts-plan` — `planFactMutations` 8 组(新增/active 重复/dismissed 墓碑/
  批内重复/reinforce 升级/同 lesson 幂等/dismissed·缺失跳过/跨 lesson 累积）
- `distill-prompt` — prompt 含 4 档/dismissed 禁复提/证据要求 + parse 映射/丢无效证据/
  malformed 不抛
- `facts-consumption` — `selectPlannerFacts` 去 goal/按 confidence 排序/cap 8
- `lesson-planner`(扩展)— 无 facts 无 header、有 facts 渲染 + writerInstruction 指引
- `profile-pages-static`(扩展)— Settings/组件/路由/样式静态断言

**DB harness 测试:** `extractor-jobs.db.ts`(无 `TEST_DATABASE_URL` 时跳过)。

**一次性 live 自清理脚本验证(已跑过即删,未留仓库):**
- extractor-jobs 生命周期:enqueue 幂等 / 并发 claim 唯一 / 心跳续租 / 过期回收+换 token /
  stale fence 无效 / 完成 / completed 不重跑 / retryable 重排队→耗尽失败。
- processor 端到端(注入假 distill,不调 LLM):取两类事件 + join 聊天正文进 summary +
  quiz distractor_tag 进 summary → 落 active fact → job completed。
- facts store:list/dismiss/拒绝复提墓碑/owner 隔离。
- 每个脚本结束 cleanup 校验 0 残留。

**回归命令(全量):**
```bash
cd apps/web
pnpm test:extractor      # 本任务 6 个单测(脚本入口)
pnpm test:progress && pnpm test:lesson-jobs && pnpm test:kg
pnpm --filter @primoria/web typecheck
node --check ../agent/src/graph.mjs    # 确认 graph.mjs 未误改
# 可选(需 TEST_DATABASE_URL):pnpm test:extractor:db
```
最后一次结果:`test:extractor` 6 个全过;`test:progress` / `test:lesson-jobs` /
`test:kg` 全过;typecheck 干净;`graph.mjs` 未改;`pnpm lint` 0 error,2 warning
(既有 `course-detail-client.tsx:915`,非本次引入)。

### ⚠️ 尚未验证
- **真实 LLM 路径**(`distillFacts` 的 `invokeJson`)未跑过——前述 processor 验证用的是
  注入的假 distill。需启 `worker:extractor` 真学一节才会触发真实蒸馏。
- 反馈 UI / Settings 删除的**浏览器端**交互未做端到端点击验证(仅静态 + API 逻辑验证)。

---

## 5. 评审重点 / 已知取舍

1. **幂等性**:写 facts 与 fenced-complete 在**同一事务**(`extractor-processor.ts`),lease 丢
   则整事务回滚、不写任何 fact ⇒ 重跑前无脏数据,根除了"complete 失败→重跑→重复"。
   job `lessonId` 唯一 + evidence 按 eventId 去重 + `planFactMutations` normalized 文本去重
   为多层兜底。残留风险仅:两 worker 完全并发且措辞不同——已由 fenced UPDATE 串行化
   (仅当前 lease 持有者能提交)。【P2 已修】
2. **dismissed 去重靠 LLM 语义判断**,代码只兜底 exact-text。若线上发现复提,需强化 prompt
   或加相似度过滤。
3. **chat 事件窗口按 lessonId**:课外闲聊 lessonId=null,不进任何 per-lesson 蒸馏(预期)。
4. **`chat.feedback` 仅 thumb**;`via:"text"`("懂了/没懂")归一化未实现(类型已预留)。
5. **facts 注入 token**:Planner 与 Tutor 各 top-8(confidence×recency);goal 不进生成。
6. **best-effort 入队**:extractor 入队失败只 log,不影响 quiz 响应与 progress job(解耦)。
7. **Settings v1**:仅删除(→dismissed),无新增/编辑。

## 6. 上线前 TODO
- [ ] 启 `worker:extractor`,真学一节验证真实 LLM 蒸馏 + facts 落库 + 注入。
- [ ] 浏览器端验证 👍/👎 与 Settings 删除。
- [ ] 部署需常驻运行 extractor worker(与 lesson-generation / learning-progress worker 并列)。

---

## 7. 评审第二轮修复记录

| # | 问题 | 修复 |
|---|---|---|
| P1 | extractor worker 未接进 `pnpm dev` | 根 `package.json` 加 `dev:extractor` |
| P2 | facts 写入不在 lease fence 内,丢 lease 可能写脏/重复 | `extractor-processor` 把 fenced-complete + 写 facts 收进**单事务**(`completeExtractorJobTx` + `applyFactPlan`),丢 lease 整体回滚 |
| P2 | `parseDistillResult` 未真正强制证据(过滤后 `eventIds=[]` 仍落库) | 加 `if (eventIds.length===0) continue`,add/reinforce 均强制 |
| P2 | 反馈切换留两条事件,Extractor 见正负矛盾 | processor `pickLatestFeedbackEventIds`(每 target 取最新)+ UI 改 switch-only |
| P2 | feedback/message route 过度信任客户端 scope | `verifyEventScope`:lessonId 必属 `(courseId, ownerId)`,否则 scope 归 null |
| P2/P3 | durable facts 原样进 prompt = 持久注入 | 入库前 `looksLikeInjection` 拒绝指令式 fact;`factsDirective` 用 `<learner_facts>` data block + sanitize 隔离 |
| P3 | 新单测无脚本入口 | 加 `test:extractor` / `test:extractor:db`,纳入全量回归 |

新增/更新测试:`feedback-latest.unit`(新)、`distill-prompt.unit`(证据强制 + 注入拒绝)、
`facts-directive.unit`(data block + 恶意 fact 隔离)、`lesson-planner.unit`(data block 断言)。
