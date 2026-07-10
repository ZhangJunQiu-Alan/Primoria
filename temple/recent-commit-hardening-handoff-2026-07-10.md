# Primoria 最近提交生产加固修复移交报告

> 创建日期：2026-07-10
> 目标读者：没有本轮审查上下文、需要直接接手修复工作的 Coding Agent
> 仓库：`/Users/zhangjunqiu/Documents/Project/Primoria`
> 审查基线：`main` / `origin/main`，HEAD 为 `d41e95dc`
> 文档性质：修复任务说明与验收合同，不是已完成声明

## 1. 文档目的

最近六个提交解决了本地浏览器 QA 中的一批问题，但进一步代码审查发现，部分实现仍存在并发、故障边界、进程隔离和数据一致性风险。

本报告把这些风险整理成一个可直接执行的修复上下文，目标是让接手 Agent 不需要依赖聊天记录，也能理解：

1. 当前系统是什么结构。
2. 最近提交改了什么。
3. 哪些行为已经正确，不应被回退。
4. 哪些问题已经由代码或运行探针确认。
5. 应采用什么目标设计。
6. 必须补哪些测试，才能证明修复有效。

接手 Agent 应先阅读本报告，再阅读对应代码和测试。不要只根据问题标题做局部字符串修改。

## 2. 本轮提交范围

本报告基于以下六个连续提交：

| Commit | 主题 | 本报告关注点 |
| --- | --- | --- |
| `30ab1f29` | Validate Mermaid blocks before persistence | 服务端 Mermaid parser 的进程全局污染与运行时边界 |
| `3bbf0e0f` | Enrich new course outline descriptions | 后台 LLM deadline、取消语义、description 并发写入 |
| `46896f3c` | Return service errors for auth outages | auth outage 的全路由覆盖、Root Layout、日志与错误分类 |
| `6c82e472` | Harden onboarding background state | goal/course attempt 身份、ABA 竞态、stale callback |
| `6df3cdbd` | Improve library and outline recovery states | Library 空状态和 outline 刷新恢复的测试覆盖 |
| `d41e95dc` | Refresh browser QA closure notes | QA 关闭声明、验证证据与测试凭证管理 |

## 3. 明确的非目标

以下内容不属于本次修复，不要扩大范围：

- 不实现或重构密码重置。
- 不实现邮件验证。
- 不修改邮件服务配置。
- 不清理历史上已经污染的 `profile.goalPositioningMessage`。
- 不重新设计 KG coverage miss 与 KG infrastructure failure 的既定策略。
- 不把 outline description enrichment 改成课程创建的强依赖。
- 不因为 course Mermaid parser 使用 `11.15.0`，就擅自升级 widget iframe 的 Mermaid 依赖。
- 不做与本报告无关的 UI 重构、样式重写或全仓库 Repository 改造。

## 4. 已验证状态

审查时仓库状态：

- `main` 与 `origin/main` 一致。
- 工作区无未提交修改。
- TypeScript typecheck 通过。
- 定向 Vitest：`41/41` 通过。
- 完整 Vitest：`182` 通过，`1` 跳过。
- ESLint：无 error，有一个与本轮无关的 `<img>` warning。
- `TEST_DATABASE_URL` 未设置，因此审查轮次没有重新执行 DB-backed 测试脚本。

需要特别理解：测试全绿不等于下面的竞态不存在。现有测试没有构造相同文本重试、旧 build 失败覆盖新 build 成功、Root Layout 数据库故障、既有连接被断开等场景。

## 5. 当前系统关键路径

### 5.1 Onboarding goal 定位

主要代码：

- `apps/web/src/app/api/onboarding/goal/route.ts`
- `apps/web/src/lib/learner-profile/store.ts`
- `apps/web/src/lib/learner-profile/onboarding-positioning.ts`
- `apps/web/src/lib/learner-profile/onboarding-course-build.ts`
- `apps/web/src/lib/learner-profile/onboarding-course.ts`

当前隐式流程：

1. `POST /api/onboarding/goal` 收到没有 `graphId` 的自由文本目标。
2. `savePendingLearningGoal()` 把 profile 写成 `goalPositioningStatus = pending`。
3. route 使用 Next.js `after()` 运行 `positionLearningGoalInBackground()`。
4. 后台任务调用 `resolveOnboardingGoalAnchor()`。
5. 结果通过以下三个函数之一写回：
   - `savePositionedLearningGoalIfPending()`
   - `saveLearningGoalClarification()`
   - `saveLearningGoalPositioningFailure()`
6. 如果已定位且用户已选择知识背景，则继续调用 `buildOnboardingCourseWithStatus()`。
7. 前端在 done 页面轮询 `GET /api/onboarding`。
8. `getLearnerOnboardingState()` 会把超过五分钟的 pending/building 状态改成 failed。

### 5.2 Onboarding course build

`buildOnboardingCourseWithStatus()` 当前执行：

1. 无条件写 `onboardingCourseStatus = building`。
2. 调用 `buildOnboardingCourse()`。
3. 成功后无条件写 `ready`。
4. 失败后无条件写 `failed`。

课程创建自身有 owner+graph 去重，lesson generation enqueue 也有一定幂等能力，但 profile 中的 course build 状态没有 attempt 身份。

### 5.3 Mermaid course block 校验

主要代码：

- `apps/web/src/lib/courses/mermaid-validation.ts`
- `apps/web/src/lib/mermaid-runtime.ts`
- `apps/web/src/lib/ai/course-generation/block-writer.ts`
- `apps/web/src/lib/courses/lesson-generation-jobs.ts`
- `apps/web/src/lib/ai/deepagent/course-editor.ts`
- `apps/web/src/components/generative-ui/mermaid-renderer.tsx`

当前 course block 校验链：

1. course block writer 编译视觉块。
2. Mermaid block 调用 `assertPersistableCourseBlock()`。
3. 无效 DSL 进入 writer 的 targeted repair loop。
4. checkpoint 之前通常已经完成校验。
5. `publishLessonAndCompleteJob()` 在最终事务之前再校验一次。
6. course editor 的 rewrite/add/transform 也会校验，route 映射为安全的 `422 invalid_mermaid`。

这条业务策略是正确的，应保留。

### 5.4 Auth/session 故障处理

主要代码：

- `apps/web/src/lib/auth/session.ts`
- `apps/web/src/lib/auth/errors.ts`
- `apps/web/src/lib/auth/guard.ts`
- `apps/web/src/app/api/auth/me/route.ts`
- `apps/web/src/app/error.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/lib/i18n/server.ts`

当前正确行为：数据库连接失败时，`getCurrentUser()` 不再返回 null 冒充“用户已登出”，而是抛出 `AuthError(code = auth_unavailable)`；采用 `requireAuthUser()` 的 route 会返回安全的 503。

### 5.5 Outline description enrichment

主要代码：

- `apps/web/src/lib/ai/course-generation/outline-enrichment.ts`
- `apps/web/src/lib/ai/course-generation/model-json.ts`
- `apps/web/src/lib/ai/deepagent/course-generator.ts`
- `apps/web/src/lib/courses/store.ts`

当前流程：

1. 新 Course outline 先使用确定性 description 模板完成持久化。
2. `initializeCourseOutline()` 仅对新课程安排一次 `after()` enrichment。
3. enrichment 重新读取课程，把最多 40 个 lesson 一次发送给模型。
4. 每条结果通过 `updateLessonDescriptionIfUnchanged()` 写入。
5. WHERE 条件要求 description 仍等于 enrichment 读取时的旧值。
6. 所有 enrichment 失败均保留模板，不阻塞课程创建。

“非阻塞 + 模板兜底 + 单字段条件更新”的方向正确，应保留。

## 6. 问题一：Onboarding goal 存在同文本 ABA 竞态

### 6.1 严重程度

高。上线前必须修复。

### 6.2 已确认代码位置

`apps/web/src/lib/learner-profile/store.ts` 中的 `updatePendingLearningGoal()` 使用以下逻辑充当写入 fence：

```text
owner_id = 当前用户
learning_goal = 后台任务开始时的文本
goal_positioning_status = pending
```

这能阻止“旧目标 A”覆盖“不同文本的新目标 B”，但不能识别两次文本相同的独立请求。

### 6.3 真实失败场景

1. 用户提交目标：`学习 Python 基础`，产生任务 A。
2. A 执行超过五分钟，读取修复逻辑把 profile 标记为 failed。
3. UI 提示用户重新提交目标。
4. 用户不修改文本，仍提交 `学习 Python 基础`，产生任务 B，并重新写成 pending。
5. A 此时晚到并返回定位结果。
6. A 的 `ownerId + learningGoal + pending` 全部再次匹配。
7. A 可以把属于 B 的状态写成 positioned、clarify 或 failed。

这是典型 ABA 问题：数据库字段表面上回到了相同值，但实际已经是另一轮操作。

### 6.4 为什么现有测试没有发现

`apps/web/tests/learner-profile-goal-race.db.ts` 使用：

- old：`old mechanics goal`
- new：`new Python goal`

两个目标文本不同，因此现有 WHERE fence 可以正常工作。测试没有覆盖“相同文本重新提交”。

### 6.5 目标设计

必须为每次 goal positioning 创建不可重复的 attempt ID，例如：

- profile 字段：`goal_positioning_attempt_id`
- 类型：字符串 UUID 或项目既有 `randomId()` 风格 ID
- 每次 `savePendingLearningGoal()` 都生成新 ID，即使目标文本完全相同
- `after()` callback 必须捕获并传递该 ID
- 所有终态写入必须同时匹配该 ID

目标写入条件：

```sql
WHERE owner_id = :ownerId
  AND goal_positioning_attempt_id = :attemptId
  AND goal_positioning_status = 'pending'
```

`learningGoal` 可以继续保留作审计或防御性检查，但不能继续作为任务身份。

### 6.6 函数合同建议

`savePendingLearningGoal()` 不应只返回 profile；调用方必须能拿到本轮 attempt ID。

概念接口：

```ts
type PendingGoalAttempt = {
  profile: LearnerProfile;
  attemptId: string;
};
```

终态函数应要求 `attemptId`：

```ts
savePositionedLearningGoalIfPending({ ownerId, attemptId, ... })
saveLearningGoalClarification({ ownerId, attemptId, ... })
saveLearningGoalPositioningFailure({ ownerId, attemptId, ... })
```

受影响行数为 0 时必须视为 stale result，停止后续 course build，不应抛成用户故障。

### 6.7 stale recovery 的关系

五分钟 stale recovery 可以保留，但它也必须针对当前 attempt 工作。修复后应满足：

- attempt A 被标记 failed 后永远不能重新获得写权限。
- 相同文本的 attempt B 拥有不同 ID。
- A 晚到时更新 0 行。
- B 可以正常完成。

## 7. 问题二：Onboarding course 状态没有 attempt fence

### 7.0 修复状态（2026-07-10）

已完成最低生产验收范围的修复：

- `learner_profiles` 已增加 `onboarding_course_attempt_id`，迁移文件为 `apps/web/drizzle/0039_abnormal_robin_chapel.sql`。
- 每次 course build 开始时生成新的 UUID attempt ID，并写入 `building`。
- `ready` / `failed` 只允许在 `ownerId + attemptId + status=building` 同时匹配时写入；受影响行数为 0 时按 stale callback 处理，不覆盖当前状态。
- stale recovery 也绑定读取到的 course attempt ID；迁移前遗留的空 attempt ID 状态仍可按原有超时规则恢复。
- 本地开发库已执行 `0038` / `0039` 迁移，新增列和迁移记录均已查询确认。
- Vitest、TypeScript、ESLint、`git diff --check` 和真实 PostgreSQL 竞态测试均通过；已覆盖“旧 build A 晚失败、新 build B 已成功”的场景。

剩余的 durable job 改造仍是后续可靠性增强，不再是本问题 attempt fence 修复的阻塞项。

### 7.1 严重程度

高。应与问题一一起修复。

### 7.2 当前缺陷

`saveOnboardingCourseStatus()` 只按 `ownerId` upsert：

```text
building -> ready
building -> failed
```

它不知道状态属于哪次 build，也没有要求旧状态必须是 building。

### 7.3 失败场景 A：旧失败覆盖新成功

1. build A 长时间运行，被 stale recovery 标记 failed。
2. 用户点击 Retry，启动 build B。
3. B 成功并写 ready。
4. A 随后抛错，catch 无条件写 failed。
5. profile 最终显示 failed，虽然课程已创建成功。

### 7.4 失败场景 B：两个 retry 并发

浏览器重复提交、多个标签页或网络重试都可能启动两个 build。课程去重不等于状态去重；两个调用最后写入者获胜。

### 7.5 目标设计

增加独立 `onboarding_course_attempt_id`，并把状态迁移改为 compare-and-set：

```text
begin:
  create attemptId
  set attemptId + building

complete:
  WHERE ownerId + attemptId + status=building
  SET ready

fail:
  WHERE ownerId + attemptId + status=building
  SET failed
```

如果业务需要 `pending`，必须定义清晰状态机：

```text
null -> pending -> building -> ready
                         -> failed
failed -> pending/building（新 attempt）
```

禁止旧 attempt 修改新 attempt 的任何终态。

### 7.6 Durable job 的取舍

当前 `after()` + profile 状态可以在加入 attempt ID 后继续作为短期方案，但它仍不是持久任务系统。

更完整的行业方案是独立 onboarding job 表，复用现有 lesson generation job 的模式：

- job ID / attempt ID
- queued/running/completed/failed
- attempts / maxAttempts
- lease owner / lease token / lease expiry
- last error category
- created/updated/completed timestamps

优点：可重试、可观测、可恢复、不会依赖读请求修复状态。
缺点：需要 worker、部署和运维约定，改动显著更大。

本次最低验收要求是 attempt ID + CAS；如果项目准备近期生产发布，建议直接落 durable job，而不是继续叠加更多 profile 状态补丁。

## 8. 问题三：Mermaid parser 会污染 Node 进程全局对象

### 8.1 严重程度

高。冷启动并发环境下不可接受。

### 8.2 当前实现

`apps/web/src/lib/courses/mermaid-validation.ts` 为导入 Mermaid：

1. 创建 JSDOM。
2. 把 JSDOM 的 `window`、`document`、`DOMParser`、`HTMLElement` 等写入 `globalThis`。
3. `await import("mermaid")`。
4. finally 恢复原 descriptor。

虽然 finally 会恢复，但动态 import 期间会让出事件循环。Node 进程内其他请求可以在这段时间观察到伪浏览器全局对象。

### 8.3 已验证证据

审查时执行并发探针，在首次 `assertValidMermaidDefinition()` 尚未完成时读取全局对象，实际观察到：

```json
{"windowDuring":"object","documentDuring":"object"}
```

因此风险不是纯静态推测。

### 8.4 潜在后果

- SSR 代码中的 `typeof window !== "undefined"` 走入客户端分支。
- 其他库错误地缓存 JSDOM document。
- 冷启动并发请求出现不可重复的行为。
- serverless 多实例环境中，每个冷实例都可能重新暴露这个窗口。

当前 `parseQueue` 只能串行 Mermaid parse，不能阻止无关请求读取 `globalThis`，因此简单加锁不能解决根因。

### 8.5 目标设计优先级

按以下顺序评估：

1. 优先寻找 Mermaid 11.15.0 内部或官方依赖中不需要 DOM 的 server-safe parse API。
2. 如果没有稳定 API，把 parser 放进 Worker Thread 或独立子进程。
3. Worker/子进程内部可以拥有自己的 JSDOM global，但不能污染 Next.js 主进程。
4. 对 parser 设置长度限制、总执行 deadline 和并发上限。
5. parser 异常只返回受控 diagnostic，不向用户暴露原始内部栈。

### 8.6 版本边界，防止修复漂移

Course block renderer 使用：

- `apps/web/src/lib/mermaid-runtime.ts`
- `mermaid@11.15.0`

Widget iframe 依赖目前使用：

- `apps/web/src/lib/ai/widget-dependencies.ts`
- `apps/web/src/components/generative-ui/widget-renderer.tsx`
- `apps/agent/src/graph.mjs`
- `mermaid@11.4.1`

Widget web/agent allowlist 当前彼此同步，没有违反 AGENTS 的同步约束。Course block parser 必须匹配 course renderer 的 11.15.0；不要把两个渲染系统混为一谈，也不要顺手升级 widget runtime，除非另开任务并完整做 iframe 回归。

### 8.7 必须保留的行为

- writer 无效 Mermaid 继续进入 targeted repair。
- editor 无效 Mermaid 继续返回安全的 422。
- final publish 继续有第二道持久化保护。
- 空定义和超长定义继续在 parser 前拒绝。
- 不得退回只检查字符串非空。

## 9. 问题四：Auth outage 只完成了部分边界统一

### 9.1 严重程度

高。涉及所有登录用户在数据库故障时的行为。

### 9.2 已正确实现的部分

- `getCurrentUser()` 能把部分数据库连接错误转成 `AuthError(auth_unavailable)`。
- `requireAuthUser()` 能把该错误映射为安全 503。
- `/api/auth/me` 使用统一安全响应。
- sign-out 在数据库不可用时仍清除浏览器 cookie。
- 用户不再因为数据库中断被错误提示为登录过期。

这些行为必须保留。

### 9.3 Root Layout 仍依赖数据库 session

当前链路：

```text
apps/web/src/app/layout.tsx
  -> getCurrentUiLanguage()
  -> getCurrentUserForRsc()
  -> getCurrentUser()
  -> database session query
```

因此拥有 session cookie 的用户访问任意页面时，Root Layout 可能先因数据库故障抛错。

`apps/web/src/app/error.tsx` 是普通 segment error boundary，不能可靠覆盖 Root Layout 自身错误。Next.js 对 Root Layout 错误使用 `global-error.tsx`。

### 9.4 推荐处理

建议同时做两层保护：

1. Root Layout 的初始语言解析不要依赖数据库。
   - 优先读取 UI language cookie。
   - 再读取 Accept-Language。
   - 用户数据库偏好在页面或客户端 provider 的可恢复层加载。
2. 增加 `app/global-error.tsx` 作为真正的 root fallback。

只增加 global error 能改善展示，但仍会让所有页面受一次非必要数据库查询影响；只移除 DB 依赖则缺少其他 Root Layout 异常的兜底。两者职责不同。

### 9.5 仍绕过统一 guard 的 API

以下 route 直接调用 `getCurrentUser()`，没有统一使用 `requireAuthUser()` 或等价 wrapper：

- `apps/web/src/app/api/copilot-threads/[id]/messages/route.ts`
- `apps/web/src/app/api/copilot-threads/route.ts`
- `apps/web/src/app/api/courses/[id]/quiz/route.ts`
- `apps/web/src/app/api/learner-facts/route.ts`
- `apps/web/src/app/api/learning-events/feedback/route.ts`
- `apps/web/src/app/api/media/assets/[assetId]/route.ts`
- `apps/web/src/app/api/profile/route.ts`
- `apps/web/src/app/api/settings/preferences/route.ts`
- `apps/web/src/app/api/settings/provider/route.ts`

这些 route 的原有匿名语义并不完全相同：有些 GET 在未登录时返回空列表，有些写操作返回 401。因此不要机械地把所有 route 都改成强制登录。

应提供两种统一合同：

```text
required auth:
  signed out -> 401
  auth dependency down -> 503 auth_unavailable

optional auth:
  no session cookie / invalid session -> anonymous result
  request carries session but dependency down -> 503 auth_unavailable
```

### 9.6 错误分类不完整

当前项目使用 `postgres` 驱动。驱动源码中存在以下连接错误代码：

- `CONNECTION_CLOSED`
- `CONNECTION_DESTROYED`
- `CONNECTION_ENDED`

当前 `AUTH_UNAVAILABLE_ERROR_CODES` 没有这些值。初次连接被拒绝可能得到 `ECONNREFUSED`，但已建立连接被服务端断开时可能得到上述驱动代码，从而重新落入普通 500。

目标分类至少应覆盖：

- 当前已有网络错误。
- `postgres` 驱动自己的 CONNECTION_* 错误。
- PostgreSQL SQLSTATE class `08` connection exception。
- 当前已有的 shutdown / too-many-connections 错误。

避免使用过宽的 message contains，把业务错误误判为服务不可用。

### 9.7 日志缺口

`toSafeAuthError()` 对 `AuthError` 立即返回。如果 `AuthError` 包含数据库 `cause`，当前路径不会记录依赖故障。

目标行为：

- 4xx 业务 AuthError 不记录 error 级别堆栈。
- `auth_unavailable` 和其他 5xx AuthError 必须记录服务端结构化日志。
- 日志包含 route/context、safe code、底层 cause code。
- 不记录 session token、cookie、密码、API key。
- 客户端永远只收到安全 message/code。

### 9.8 现有原始错误泄露点

`apps/web/src/app/api/courses/[id]/quiz/route.ts` 的 catch 会把 `error.message` 放入 500 响应。如果 auth 分类漏掉 `CONNECTION_CLOSED`，驱动文本可能到达客户端。

修复时应统一 safe error mapper，不能靠每个 route 自己猜测 message。

## 10. 问题五：Outline enrichment 的 timeout 合同不真实

### 10.1 严重程度

中。不会阻塞课程创建，但会造成后台资源、成本和部署时限问题。

### 10.2 当前配置

`outline-enrichment.ts` 传入：

```text
timeoutMs = 30_000
```

但 `model-json.ts` 的行为是：

1. 支持 structured output 的 provider：
   - structured 调用最多 30 秒。
   - 失败或超时后再启动普通 JSON 调用，最多再 30 秒。
   - 整个操作可接近 60 秒。
2. MiniMax anthropic-compatible 路径：
   - 直接进入 `rawAnthropicJson()`。
   - 使用硬编码 180 秒 AbortController。
   - 完全忽略调用方传入的 30 秒。
3. 通用 `withTimeout()` 使用 `Promise.race()`，超时后没有取消底层模型请求。

### 10.3 潜在后果

- timeout 返回后，原请求仍可能继续耗费 provider token 和连接资源。
- fallback 与未取消的旧请求同时运行。
- `after()` 任务超过部署平台 `maxDuration`。
- MiniMax 与 OpenAI-compatible 的行为差异无法从调用方看出。

### 10.4 目标设计

`invokeJson()` 应接受一个“整个 operation 的 deadline”，而不是每次尝试各自获得完整 timeout。

建议合同：

```ts
invokeJson({
  ...,
  timeoutMs,
  signal,
});
```

内部要求：

- 创建一个总 AbortController 或组合调用方 signal。
- structured attempt 失败后，fallback 只能使用剩余时间。
- timeout 时真正 abort 网络请求。
- `rawAnthropicJson()` 不得使用与调用方冲突的硬编码 180 秒。
- timeout error 保持稳定 code/category，方便 enrichment 日志聚合。

### 10.5 不应做的改变

- 不要让 enrichment 超时导致 course API 失败。
- 不要在前端等待 enrichment 完成后才展示 outline。
- 不要删除模板 fallback。
- 不要无限重试 cosmetic enrichment。

## 11. 问题六：Description equality fence 不能防止反向覆盖

### 11.1 严重程度

中。用户数据安全风险低于 onboarding，但会造成 enrichment 结果丢失和 aggregate lost update。

### 11.2 当前 fence 能保护什么

`updateLessonDescriptionIfUnchanged()` 要求 DB description 仍等于 enrichment 读取时的值，因此：

- 如果用户先修改 description，enrichment 不会覆盖用户。
- 如果另一个 enrichment 已先写入，旧 enrichment 不会覆盖。

这是正确的单向保护。

### 11.3 当前 fence 不能保护什么

`saveCourseToDb()` 会遍历所有 lesson，并在 conflict update 中无条件写：

- title
- description
- status
- blocks
- version
- updatedAt
- 其他 lesson 字段

存在以下反向竞态：

1. 调用方读取带模板 description 的整个 Course。
2. enrichment 条件更新成功，把 DB description 写成新文案。
3. 旧调用方随后执行 `saveCourse()`。
4. aggregate upsert 把旧模板重新写回 DB。

特别需要检查 `initializeCourseOutline()`：它即使复用了已有 Course，仍会再次执行 `saveCourse(course, ownerId)`。并发 cold-start 请求可能读到模板版本，在 enrichment 后把模板写回。

### 11.4 目标方向

优先做小而明确的持久化边界调整：

1. 新课程使用明确的 create/insert outline 路径。
2. 复用已有课程且没有变化时不要再次全量 `saveCourse()`。
3. block、progress、archive、description 等修改使用字段级或 lesson 级 UPDATE。
4. 如果保留 aggregate save，则必须真正使用 version 做 optimistic concurrency control，而不是只写入 version 数字。
5. 更新失败时返回 conflict，让调用方重新读取后重试，不能 silent last-write-wins。

不要为了这个问题一次性重写所有 Course Repository。先阻断已确认的 reused-course/enrichment 覆盖路径，再为 aggregate lost update 建独立后续任务。

### 11.5 额外边界

- `MAX_LESSONS = 40`：接手 Agent 必须确认系统是否允许超过 40 个 outline lesson。如果允许，不能静默让第 41 课以后永久保留模板；应批处理或明确产品上限。
- response schema 当前允许 duplicate/missing order。作为 best-effort 功能可以部分成功，但日志应区分 requested、valid、updated、skipped、duplicate。
- description 截断应避免切断 Unicode surrogate pair。
- 不需要在本任务中引入语言检测模型；保持 prompt 约束即可，除非已有轻量检测工具。

## 12. 问题七：Library 与 outline 恢复状态缺少行为测试

### 12.1 严重程度

低到中。当前实现方向正确，主要风险是未来回归。

### 12.2 当前正确行为

`6df3cdbd` 实现了：

- 空 Library 且 onboarding 未完成时显示“继续入门设置”。
- `checkingBuilds` 仍优先于 onboarding CTA。
- onboarding 已完成但没有课程时仍显示原 create-first-course 文案。
- outline completed job 的课程刷新只有在 fetch 成功后才写入 `refreshedRef`。
- fetch 失败后，后续 poll 可以再次尝试。

这些行为不应回退。

### 12.3 测试缺口

当前没有针对 `onboardingIncomplete` 分支和 `refreshedRef` 重试语义的组件级测试。

至少补：

1. empty + onboarding incomplete -> onboarding copy/CTA。
2. empty + onboarding complete -> create course copy。
3. active job -> checking builds 优先。
4. completed job + 第一次 course fetch 500 -> 不标记 refreshed。
5. 下一次 poll + fetch 200 -> 更新 course 且只在成功后标记。
6. 组件 unmount 后不继续 setState。

可以接受成功前偶发重复 GET；不接受一次失败后永久停止刷新。

## 13. 问题八：QA 文档与凭证管理

### 13.1 严重程度

低，但应清理。

### 13.2 当前问题

`temple/local-browser-qa-2026-07-09.md` 中提交了多个测试账户的明文密码。虽然域名和用途显示它们是本地 QA 账户，但把密码长期存入 Git 仍会培养错误操作习惯。

### 13.3 目标做法

- 文档保留环境、账户用途、创建时间和是否已废弃。
- 删除密码正文。
- 需要自动化登录时，通过本地未跟踪 env、test fixture 或运行时生成一次性账户。
- 不把真实生产凭证写入测试、日志、截图文件名或 Markdown。

### 13.4 QA 关闭声明

`temple/browser-qa-issue-list-2026-07-09.md` 当前写“全部问题已修复或关闭”。这可以继续表示原始浏览器 QA 清单已关闭，但不应被解释为“代码已达到生产就绪”。

修复本报告问题后，应在 QA 文档增加新的 follow-up，而不是篡改原始观察记录。

## 14. 推荐实施顺序

### P0：先锁定并发正确性

1. 为 goal positioning 增加 attempt ID 和数据库迁移。
2. 为 onboarding course build 增加 attempt ID 和 CAS 状态迁移。
3. 更新 route、store、stale recovery 和重试接口。
4. 先补 DB concurrency tests，再认为问题关闭。

### P0：移除 Mermaid 主进程全局污染

1. 评估 server-safe parser API。
2. 不可用时实现 Worker/子进程隔离。
3. 保持现有 writer/editor/final publish 行为。
4. 加冷启动并发探针测试。

### P0：完成 auth outage 边界

1. Root Layout 语言解析去数据库依赖。
2. 增加 `global-error.tsx`。
3. 提供 required/optional 两类 auth helper。
4. 迁移仍直接调用 `getCurrentUser()` 的 API。
5. 补齐 postgres driver error code。
6. 修复服务端日志和 raw message 泄露。

### P1：修正 enrichment deadline 和持久化竞态

1. 给 `invokeJson()` 增加总 deadline/AbortSignal。
2. 统一 structured、fallback、MiniMax raw 路径。
3. 避免 reused Course 无变化时全量 save。
4. 增加 stale aggregate save 不得还原 description 的 DB 测试。

### P2：补 UI 回归和文档卫生

1. 增加 Library/outline 行为测试。
2. 移除 QA 文档明文密码。
3. 更新 closure follow-up 和最终验证数字。

## 15. 必须新增的测试矩阵

### 15.1 Onboarding DB 测试

| 场景 | 预期 |
| --- | --- |
| 同一用户连续提交完全相同 goal | 两次 attempt ID 不同 |
| A stale failed，用户用相同文本创建 B，A 后到 positioned | A 更新 0 行，B 保持 pending |
| A 后到 clarification/failure | 同样更新 0 行 |
| build A stale，build B ready，A 后到 failed | 最终仍为 B ready |
| build A 与 B 同时 complete | 只有当前 attempt 可以提交终态 |
| stale recovery 与新 attempt 并发 | recovery 不能标记新 attempt failed |
| explicit graph chip selection | 仍可权威提交目标，旧 background callback 被 fence |

### 15.2 Mermaid 测试

| 场景 | 预期 |
| --- | --- |
| 首次 parser cold import 与无关异步代码并发 | 主进程 `window/document` 始终保持原值 |
| flowchart/sequence/state/class 合法 DSL | 通过 |
| malformed/empty/oversized DSL | 受控拒绝 |
| 多个并发解析，一项失败 | 其他项不被污染，队列可继续 |
| parser 超时或 worker crash | 返回 typed validation failure，不挂死请求 |
| invalid writer output | 进入 targeted repair，不 checkpoint |
| invalid editor output | 422，不持久化 parser diagnostic |

### 15.3 Auth 测试

| 场景 | 预期 |
| --- | --- |
| 无 cookie | required route 401；optional route 保持既有匿名语义 |
| 有有效 cookie，首次连接 ECONNREFUSED | 503 auth_unavailable |
| 已建立 pool 后数据库被停止，CONNECTION_CLOSED | 503 auth_unavailable |
| Postgres SQLSTATE class 08 | 503 auth_unavailable |
| `/api/auth/me`、quiz、profile、settings 代表路由 | 响应合同一致且无 raw driver message |
| Root Layout 期间数据库不可用 | 能渲染稳定 global fallback，或根本不访问 DB |
| sign-out 数据库不可用 | cookie 仍被清除 |
| auth_unavailable 日志 | 有 safe code/cause code，无 token/password |

### 15.4 Outline enrichment 测试

| 场景 | 预期 |
| --- | --- |
| structured call 超时后 fallback | 整体不超过同一个 deadline |
| timeout | 底层请求收到 abort |
| MiniMax raw path | 遵守调用方 30 秒，不使用固定 180 秒 |
| 模型失败/parse 失败 | Course API 成功，模板保留 |
| 用户先编辑 description | enrichment 更新 0 行，用户内容保留 |
| enrichment 先写，旧 reused Course 后 save | enriched description 不被模板还原 |
| 两个 enrichment 并发 | 不互相覆盖，结果和日志可解释 |
| 超过 40 lessons（若允许） | 全量分批处理或明确产品限制，不静默遗漏 |

### 15.5 UI 测试

按第 12.3 节六个场景执行，并至少使用一个真实 fetch failure/recovery 时序测试，而不是只做 source string assertion。

## 16. 运行与验证命令

基础验证：

```bash
pnpm --filter @primoria/web typecheck
pnpm lint
pnpm --filter @primoria/web test
pnpm build
git diff --check
```

数据库测试需要隔离测试数据库：

```bash
TEST_DATABASE_URL=postgres://... pnpm --filter @primoria/web test:onboarding-goal:db
TEST_DATABASE_URL=postgres://... pnpm --filter @primoria/web test:lesson-jobs:db
```

不要对开发者的常用本地数据库执行破坏性 reset。继续使用 `apps/web/tests/helpers/test-db` 的隔离约定。

Auth outage live QA 至少执行：

1. 正常登录并确认 cookie 有效。
2. 停止 PostgreSQL。
3. 请求 `/api/auth/me`、`/`、一个 required API、一个 optional API。
4. 确认不是 401，不泄露 driver message。
5. 恢复 PostgreSQL。
6. 使用同一 cookie 确认 session 恢复。
7. 再模拟“已有连接后中断”，确认 CONNECTION_* 路径也正确。

Mermaid live QA 至少执行：

1. 清理服务进程并冷启动。
2. 并发触发首次 Mermaid 校验和普通 RSC/API 请求。
3. 确认主进程全局对象未变化。
4. 生成一个合法 course Mermaid block 并在课程阅读器渲染。
5. 提交无效 editor 输出，确认 422 且 DB 未变化。

## 17. 可观测性要求

修复不应只增加更多 `console.error` 文本。至少保证日志能回答：

- 哪个 subsystem 失败：goal positioning、course build、auth、Mermaid、outline enrichment。
- 哪个 attempt/job 失败。
- 失败阶段和 safe category。
- 是否 stale result 被 fence。
- enrichment 请求、有效结果、实际更新和跳过数量。
- Mermaid validation 是 syntax、size、timeout 还是 worker failure。

建议字段：

```text
event
route
attemptId/jobId
ownerId（遵循项目现有隐私策略，必要时 hash）
stage
errorCode
durationMs
outcome
```

禁止记录：

- session token
- cookie 内容
- 密码
- provider API key
- 完整原始学习目标（除非现有隐私策略明确允许）
- 原始 Mermaid/parser diagnostic 到客户端

## 18. 数据迁移要求

如果采用 profile attempt ID 字段，迁移应为 additive：

- 新列先允许 null，兼容已有 profile。
- 新请求必须写 attempt ID。
- 旧 pending/building 且 attempt ID 为 null 的记录继续由 stale recovery 安全转 failed。
- 不需要回填历史成功状态的随机 attempt ID。
- schema、migration、row mapper、TypeScript types、test fixture 必须同步。

迁移必须可在已有数据上执行，不能删除 profile、Course、lesson 或 learner data。

## 19. 安全要求

本轮没有发现新 SQL 拼接注入；相关 Drizzle 条件查询会参数化。但修复 Agent 仍需确保：

- attempt ID 来自服务端生成，不信任客户端提供的任意 ID。
- 所有状态更新继续按 ownerId 限定。
- auth outage 不返回 raw `error.message`。
- parser 在隔离环境执行并有输入上限。
- QA 凭证不进入 Git。
- 不在本任务中触碰密码重置和邮件验证逻辑。

## 20. Definition of Done

只有同时满足以下条件，才可以把本报告标记为完成：

1. 同文本 goal retry 不再存在 ABA 写入。
2. 旧 course build 的 success/failure 都不能覆盖新 attempt。
3. Mermaid 校验不再写主进程 `globalThis` 浏览器对象。
4. required/optional auth route 都有一致的 outage 合同。
5. Root Layout 不因 session DB 查询导致默认 500，且存在 root fallback。
6. `postgres` CONNECTION_* 和 SQLSTATE 08 路径被测试。
7. 服务端记录 auth dependency cause，客户端不泄露内部错误。
8. Outline enrichment 使用真实总 deadline 和取消信号。
9. Reused Course 或 stale aggregate save 不能还原已 enrichment 的 description。
10. Library/outline recovery 行为有组件级回归测试。
11. DB-backed 并发测试在隔离 Postgres 上通过。
12. typecheck、lint、unit tests、build 和 `git diff --check` 通过。
13. QA 文档移除明文测试密码，并追加新的验证记录。
14. 没有实现、重构或扩展密码重置与邮件验证。

## 21. 交付时应回报的信息

接手 Agent 完成后，应在最终说明中明确列出：

- 新增或修改的数据字段、迁移文件。
- attempt/job 状态机最终合同。
- 哪些 API 已迁移到 required/optional auth helper。
- Mermaid parser 最终隔离方式及为何不会污染主进程。
- LLM deadline 如何贯穿 structured/fallback/raw provider。
- Course persistence 如何避免 description 反向覆盖。
- 新增测试名称与通过数量。
- DB/live browser QA 是否实际执行；若未执行，明确剩余风险。
- 是否仍有后续长期任务，例如把 onboarding 完全迁移到 durable worker。

不要用“测试通过”替代上述行为证明，也不要在缺少 DB/live failure 验证时宣称生产就绪。

## 22. 参考资料

- 仓库约束：根目录 `AGENTS.md`。
- Next.js `after()` 官方说明，包括嵌套调用、运行时限和平台支持：<https://nextjs.org/docs/app/api-reference/functions/after>。
- Next.js error handling 官方说明，包括 Root Layout 对应的 `global-error.tsx`：<https://nextjs.org/docs/app/getting-started/error-handling>。
- `postgres` 驱动连接错误实现：`apps/web/node_modules/postgres/src/errors.js` 与 `apps/web/node_modules/postgres/src/connection.js`。不要依赖 `node_modules` 修改实现，只把它们作为错误代码证据。
