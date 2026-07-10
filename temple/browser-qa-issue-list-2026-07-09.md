# Primoria 本地浏览器 QA 未解决问题清单

首轮测试：2026-07-09。最近复测：2026-07-10。

本文件只保留尚未解决、复测仍失败或需要继续确认的问题；已经修复且复测通过的项目不再记录。

## 当前问题

### N-6（中）Postgres 整体不可用时被表现为未登录

2026-07-10 复测中，停止 Postgres 后 `/api/health` 正确返回 `503 unhealthy`，但携带有效 cookie 请求 `/api/knowledge-graph/position` 时，session lookup 先失败并返回 `401 Unauthorized`。

这里没有泄露数据库内部错误，但用户会被误导为登录失效，而不是服务暂时不可用。需要统一 auth 层的数据库不可用错误映射，或由全局错误页展示明确的服务不可用提示。

### 4（P1，先测量再动手）onboarding 等待时间

- goal 定位已是 `after()` 后台异步，"45 秒 Locating"与当前代码矛盾，疑为 dev 首次编译期间测得。
- `background/route.ts` 仍在请求内同步 await `buildOnboardingCourse`（library 图谱路径无 LLM 调用，90 秒同样不能由这段代码解释）。

行动：先给两个 route 加 `Server-Timing`/结构化日志打点，复测拿到真实分布，再决定是否把 background 步骤改为 `after()` + 轮询对称模式。不要按旧数字立项优化。

### N-2（中）goal 重提交 TOCTOU 竞态

`saveLearningGoal` 仍是无条件 UPDATE，定位窗口期内旧目标可覆盖新目标。修法：UPDATE 加 `WHERE learning_goal = $goal AND goal_positioning_status = 'pending'`，受影响行数为 0 则放弃。

### N-3（中）`after()` 是无持久化单点

进程在后台回调完成前重启 → `goalPositioningStatus` 永久 pending，done 页轮询无超时。兜底：`goalPositioningUpdatedAt` 超时判 failed + 重试按钮；长期并入 job 表模型（有 lease/heartbeat）。

### N-5（低）outline 课程刷新失败后永不重试

`course-outline-view.tsx` 的 `refreshedRef` 在 fetch 前就去重，失败一次该 lessonId 就停留旧数据。把 `refreshedRef.current.add` 移到 fetch 成功后，一行修复。

### N-7（中）课程生成可持久化无效 Mermaid 定义

2026-07-10 在课程 `crs_b11mpv2tmrdiuk4l` 的第 2 课复测到：第 11 个 block 保存的 Mermaid 定义会被 11.x 解析器拒绝，课程页只能显示 `Diagram syntax error`。当前 `block-content-compiler.ts` 只确认 `mermaidDefinition` 非空，生成和编辑链路都没有在持久化前验证 DSL。

本次为了完成 Issue 2 回归，只把本地测试课程的该 block 改成等价的合法定义；产品生成链路仍未修。建议在发布 lesson 前解析 Mermaid，失败时重试该 block 或降级为安全的文本/HTML 图示，并增加无效 DSL 单测。

### 8（P3）Library 空状态偏弱

已有 `checkingBuilds` 分支，缺 onboarding 未完成时的引导 CTA。`LibraryPage` RSC 已能拿到 user，加一次 `getLearnerOnboardingState` 按状态分支文案即可。

### 9（P3）大纲描述模板化

`Builds the core understanding of ...` 是硬编码模板（`course-generator.ts` 的 `plannedLessonDescription`），outline 从未经过 LLM——这是刻意设计（快、免费、可预测）。改良是新功能而非修 bug：推荐课程创建后 `after()` 里一次 LLM 调用批量 enrich 全部 lesson 描述，未就绪回退模板。

---

## 建议处理顺序

1. 给 Mermaid 生成结果增加持久化前校验，关闭 N-7。
2. 处理 N-2、N-3 和 N-6 的并发、可恢复性与全库不可用错误映射。
3. 给 onboarding 路由补耗时打点，重新测量问题 4。

## 本地记录

测试账号、密码和截图路径见 `temple/local-browser-qa-2026-07-09.md`。
