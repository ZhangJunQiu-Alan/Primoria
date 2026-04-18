# Primoria 技术债总账（中文主档）

最后更新：2026-04-19

## 使用方式

- 本文件是 Primoria 唯一的技术债、半成品功能和产品待办总账。
- 每个条目统一记录：标题、优先级、状态、背景、会导致什么、解决方案、实施步骤、验证方式、相关文件/系统、提交记录。
- 已经完成的事项会从“当前未解决问题”里移走，只保留在已解决区或提交记录中。

## 当前质量基线（2026-04-19）

- `pnpm --filter @primoria/viewer-react typecheck`：通过
- `pnpm --filter @primoria/viewer-react lint`：通过，当前有 `0 errors / 52 warnings`
- `pnpm --filter @primoria/viewer-react test`：通过，当前工作区 `141/141` 通过
- `deno test --allow-env supabase/functions/`：`62/62` 通过
- `cd agent-service && uv run pytest -q`：`2/2` 通过

## 已解决

### TD-01 文档体系失真与重复

- 标题：文档体系失真与重复
- 优先级：高
- 状态：已解决（2026-04-19）
- 背景：`docs/` 里同时维护中英两套文档、课程作业模板页、单独的 `todo` 页和已经失真的状态说明，导致同一个问题在多个地方重复出现，而且说法不一致。
- 会导致什么：团队很容易先看到过期文档，再按错误信息做决定；新人接手时也会花很多时间分辨哪份才算数。
- 解决方案：收敛为“中文主档 + 活文档优先”结构，把所有未完成事项合并进本总账，删除英文重复页和模板页。
- 实施步骤：
  1. 删除英文重复文档、assignment/rubric 模板页和独立 `todo` 页。
  2. 重写 `docs/README-zh.md`，改成唯一文档入口。
  3. 重写本文件，作为唯一技术债总账。
  4. 修正运行手册和交互清单里的失真描述，移除旧绝对路径和占位信息。
- 验证方式：
  - 文档关键字清理检查通过
  - 人工检查 `docs/README-zh.md` 只链接保留后的活文档
- 相关文件/系统：`docs/README-zh.md`、`docs/technical-debt-register-zh.md`、`docs/viewer-react-cutover-runbook.md`、`docs/viewer-react-interactions.md`
- 提交记录：本次提交 `docs: 收敛中文文档体系与技术债总账`

### HX-01 Edge Function 自动部署闭环

- 标题：Edge Function 自动部署闭环
- 优先级：历史已解决
- 状态：已解决（保留历史参考）
- 背景：旧债务单曾写“Edge Function 仍依赖手工部署”，但当前 `viewer-react-ci.yml` 已包含 `deploy-supabase-functions` 作业，能在 `main` 分支推送后自动部署变更函数。
- 会导致什么：如果继续把它写成未解决问题，会浪费排期，也会让后续治理方向跑偏。
- 解决方案：从未解决区移除，作为历史参考保留。
- 实施步骤：后续只在自动部署失效或覆盖范围不足时重新入账。
- 验证方式：检查 `.github/workflows/viewer-react-ci.yml` 和 `scripts/deploy-supabase-functions.sh`
- 相关文件/系统：`.github/workflows/viewer-react-ci.yml`、`scripts/deploy-supabase-functions.sh`
- 提交记录：历史实现，非本次提交

## 高优先级

### TD-02 前端质量门禁未恢复到稳定绿

- 标题：前端质量门禁未恢复到稳定绿
- 优先级：高
- 状态：已解决（2026-04-19）
- 背景：`viewer-react` 一度处于“类型检查通过，但 lint 和测试仍在报错”的状态，问题集中在 Dashboard 条件调用 Hook、AI Tutor/Mind Map hooks 在 render 阶段读 ref，以及 Mind Map 编辑器撤销/重做链路不稳定。
- 会导致什么：团队会误以为“能跑就算稳定”，但一旦合并到主线，明显问题就会跟着进入后续发布流程，人工补救成本会越来越高。
- 解决方案：先恢复 `lint`、`typecheck`、`test` 的阻塞失败，再把剩余结构性 warning 归并回后续技术债继续治理。
- 实施步骤：
  1. 修复 `DashboardPage.tsx` 条件调用 Hook。
  2. 修复 `useAiTutorSession.ts` 和 `useMindMapAutosave.ts` 在 render 阶段读 ref 的问题。
  3. 修复 Mind Map 查询回写会清空历史栈、导致撤销/重做失效的问题。
  4. 加固 `useMindMapHistory.ts` 的历史 ref 同步，避免交互期间读到过期快照。
  5. 重新跑前端质量门禁并把结果回填本总账。
- 验证方式：
  - `pnpm --filter @primoria/viewer-react lint`：通过，`0 errors / 65 warnings`
  - `pnpm --filter @primoria/viewer-react typecheck`：通过
  - `pnpm --filter @primoria/viewer-react test`：通过，`137/137`
- 相关文件/系统：`packages/viewer-react/src/pages/dashboard/`、`packages/viewer-react/src/features/ai-tutor/`
- 提交记录：本次提交 `fix: 恢复 viewer-react 质量门禁`

### TD-03 编辑器状态同步模型脆弱

- 标题：编辑器状态同步模型脆弱
- 优先级：高
- 状态：已解决（2026-04-19）
- 背景：编辑器属性面板之前多处靠 `eslint-disable react-hooks/exhaustive-deps` 压住依赖检查，不同 block 面板都在重复实现“外部数据变化后重置表单，再把用户输入写回 store”的逻辑。
- 会导致什么：页面上看起来像“偶发没同步”或“刚改完又被覆盖”，这种问题通常不好复现，排查起来也很耗时间。
- 解决方案：抽出共享表单同步 hook，让面板只关心各自字段，不再各写一套脆弱的重置逻辑；对特殊字段再补受控适配，避免旁路 dispatch。
- 实施步骤：
  1. 梳理属性面板共同的“外部快照 -> 表单 reset -> watch -> dispatch”流程。
  2. 抽出 `useSyncedInspectorForm` 共享 hook。
  3. 替换 `MetadataPanel`、`MultipleChoicePanel`、`TrueFalsePanel`、`FillBlankPanel`、`MatchingPanel`、`VideoPanel`、`InteractiveVisualPanel`、`FunctionFlowPanel`。
  4. 把 `FillBlankPanel` 的 alternatives 输入改成受控字段，不再旁路 dispatch。
  5. 补共享 hook 回归测试，验证本地输入不会触发 reset 回环，外部快照变化会正确回填。
- 验证方式：
  - `pnpm --filter @primoria/viewer-react lint`：通过，`0 errors / 60 warnings`
  - `pnpm --filter @primoria/viewer-react typecheck`：通过
  - `pnpm --filter @primoria/viewer-react test`：通过，当前工作区 `141/141`
  - `pnpm --filter @primoria/viewer-react exec vitest run test/editorInspectorFormSync.test.tsx`：通过
- 相关文件/系统：`packages/viewer-react/src/features/editor/properties/`、`packages/viewer-react/test/editorInspectorFormSync.test.tsx`
- 提交记录：本次提交 `refactor: 收敛编辑器属性面板状态同步模型`

### TD-04 AI Tutor / Mind Map 状态流过度依赖 effect 中同步 setState

- 标题：AI Tutor / Mind Map 状态流过度依赖 effect 中同步 setState
- 优先级：高
- 状态：已解决（2026-04-19）
- 背景：AI Tutor 会话页、会话 hook 和 Mind Map 编辑器里曾存在一批“effect 一跑就立刻 setState”的纠偏逻辑，典型表现是欢迎态依赖 effect 回写、页面 effect 依赖 session/tools 对象属性、导图选中态和菜单状态靠 effect 兜底修正。
- 会导致什么：界面更容易出现连锁刷新、选中状态突然跳走、工具栏状态跟不上内容等问题，用户只会感到“不稳定”。
- 解决方案：把欢迎态、选中态、聚焦态、Notebook 运行态这些可以直接推导出来的值改成派生逻辑，只保留真正必要的外部同步 effect。
- 实施步骤：
  1. 在 `useAiTutorSession.ts` 中把欢迎消息改成派生值，不再靠 effect 回写 `messages`。
  2. 在 `AiTutorPage.tsx` 中拆开 `session` / `tools` 依赖，避免 effect 依赖被对象包装放大。
  3. 在 `AiTutorMindMapEditorPage.tsx` 中把选中节点、聚焦节点、打开菜单节点改成派生回退逻辑，不再用 effect 做同步纠偏。
  4. 回归 AI Tutor 对话、Mind Map 编辑器、Notebook 与自动保存主链路。
- 验证方式：
  - `pnpm --filter @primoria/viewer-react lint`：通过，`0 errors / 52 warnings`
  - `pnpm --filter @primoria/viewer-react typecheck`：通过
  - `pnpm --filter @primoria/viewer-react exec vitest run test/aiTutorPage.test.tsx test/mindMapEditorPage.test.tsx`：通过
  - `pnpm --filter @primoria/viewer-react test`：通过，当前工作区 `141/141`
- 相关文件/系统：`packages/viewer-react/src/features/ai-tutor/`
- 提交记录：本次提交 `refactor: 收敛 AI Tutor 与 Mind Map 派生状态流`

### TD-05 Demo / fixture 路径遮蔽真实后端

- 标题：Demo / fixture 路径遮蔽真实后端
- 优先级：高
- 状态：待实施
- 背景：`usesViewerFixtures()` 深入多个 API 模块，E2E 也主要覆盖本地 demo role 和 localStorage 路径。
- 会导致什么：本地看起来一切正常，不代表真实 Supabase、RLS、Edge Function 和浏览器环境真的可靠，很容易在发布前最后一步才发现问题。
- 解决方案：明确区分 fixture 回归、真实 Supabase smoke 和更接近生产的浏览器验收，不再把它们混成一件事。
- 实施步骤：
  1. 拆清测试分类和命名。
  2. 更新回归清单和运行说明。
  3. 把真实链路的最低验证路径固定下来。
- 验证方式：
  - 文档与脚本说明一致
  - 相关 smoke/e2e 命令能够区分 fixture 与真实环境
- 相关文件/系统：`packages/viewer-react/src/shared/api/viewer/`、`packages/viewer-react/test/e2e/`、`docs/test-checklist-zh.md`
- 提交记录：待后续提交

### TD-06 Agent Service 未纳入主线治理

- 标题：Agent Service 未纳入主线治理
- 优先级：高
- 状态：待实施
- 背景：仓库已经有 `agent-service/`，前端也支持 `VITE_AGENT_SERVICE_URL` 切换聊天后端，但主文档、主 CI 和发布说明还没有把它当成正式组成部分。
- 会导致什么：这部分能力虽然存在，但容易处于“有人知道、流程不知道”的状态，一出问题就不知道该先看哪里。
- 解决方案：把 agent service 补进主文档、质量入口和发布说明，并明确前端对聊天后端的选择顺序。
- 实施步骤：
  1. 在主文档和 runbook 中说明后端优先级。
  2. 给 agent service 增加最小 CI 入口。
  3. 补充必需环境变量和启动/验证方式。
- 验证方式：
  - `cd agent-service && uv run pytest -q`
  - 相关工作流能触发 agent service 校验
- 相关文件/系统：`agent-service/`、`.github/workflows/`、`packages/viewer-react/src/shared/api/geminiClient.ts`
- 提交记录：待后续提交

### TD-07 External tests 入口脆弱

- 标题：External tests 入口脆弱
- 优先级：高
- 状态：待实施
- 背景：`external-tests/` 目录本身可以工作，但从仓库根目录直接跑 `pytest` 会先因为导入路径不对而报错，文档里也还保留旧机器路径。
- 会导致什么：别人以为测试套件坏了，实际上只是入口不统一，结果是大家会更少去跑这套黑盒测试。
- 解决方案：固定标准入口为 `cd external-tests && pytest -q`，同步修正文档和必要的辅助脚本。
- 实施步骤：
  1. 修正文档里的旧绝对路径。
  2. 明确目录级运行方式和环境要求。
  3. 如有必要，补统一入口脚本或根目录提示。
- 验证方式：
  - `cd external-tests && pytest -q`
  - 根目录相关说明不再误导到错误入口
- 相关文件/系统：`external-tests/README.md`、`external-tests/pytest.ini`
- 提交记录：待后续提交

## 中优先级

### TD-08 关键前端页面过于单体

- 标题：关键前端页面过于单体
- 优先级：中
- 状态：待实施
- 背景：`DashboardPage.tsx`、`AiTutorPage.tsx`、`AiTutorMindMapEditorPage.tsx`、`CommunityPage.tsx`、`SettingsPage.tsx` 同时承载数据请求、副作用、状态同步和 UI。
- 会导致什么：每次改动都像在碰一整块大玻璃，任何一点调整都可能影响别的区域，代码评审和问题定位都会变慢。
- 解决方案：按“页面壳层 / 数据逻辑 / 交互 hooks / 展示组件”拆分，先从 AI Tutor 和 Dashboard 开始。
- 实施步骤：
  1. 先拆 AI Tutor / Mind Map。
  2. 再拆 Dashboard。
  3. 最后处理 Community 和 Settings。
- 验证方式：
  - 拆分前后测试结果一致
  - 单文件体量明显下降
- 相关文件/系统：`packages/viewer-react/src/features/ai-tutor/`、`packages/viewer-react/src/pages/dashboard/`、`packages/viewer-react/src/features/community/`、`packages/viewer-react/src/features/profile/`
- 提交记录：待后续提交

### TD-09 Edge Function 共享能力抽取不足

- 标题：Edge Function 共享能力抽取不足
- 优先级：中
- 状态：待实施
- 背景：Quiz 和 Mind Map 两条函数链路里仍有重复的 env 读取、用户 client 构造、文档查询 fallback、错误文本抽取和长度校验。
- 会导致什么：同类修复要改两遍，改漏一处就会出现“这个功能修好了，那个功能还坏着”的情况。
- 解决方案：继续把公共逻辑下沉到 `supabase/functions/_shared/`，只在各自函数里保留业务差异。
- 实施步骤：
  1. 抽共享工具函数。
  2. 替换 quiz 和 mind map 的重复实现。
  3. 跑 Deno 测试确认行为不变。
- 验证方式：
  - `deno test --allow-env supabase/functions/`
- 相关文件/系统：`supabase/functions/_shared/`、`supabase/functions/viewer-ai-quiz-from-docs/`、`supabase/functions/viewer-ai-mindmap-from-docs/`
- 提交记录：待后续提交

### TD-10 服务端可观测性不足

- 标题：服务端可观测性不足
- 优先级：中
- 状态：待实施
- 背景：前端已有基础观测，Edge Function 和 agent service 还主要依赖零散的 `console.error`。
- 会导致什么：线上报错时只能靠人肉翻日志和猜上下文，定位时间会被放大。
- 解决方案：先补一层最小可用的错误分类、请求上下文和失败原因记录，再考虑更完整接入。
- 实施步骤：
  1. 定义统一的错误记录字段。
  2. 在 Edge Function 和 agent service 中接入。
  3. 补验证和运维说明。
- 验证方式：
  - 关键失败场景能输出稳定、可读的错误上下文
- 相关文件/系统：`supabase/functions/`、`agent-service/app/`
- 提交记录：待后续提交

### TD-11 DB types 校验未进入主线门禁

- 标题：DB types 校验未进入主线门禁
- 优先级：中
- 状态：待实施
- 背景：仓库已经有 `db:types` 和 `db:types:check`，但常规 CI 还没有把类型漂移当成默认门禁。
- 会导致什么：数据库结构已经变了，前端和函数层还在按旧字段工作，这类问题通常会在很后面才被发现。
- 解决方案：把 `db:types:check` 接进主线 CI。
- 实施步骤：
  1. 明确检查命令与依赖环境。
  2. 接入 GitHub Actions。
  3. 在文档和提交说明里注明失败处理方式。
- 验证方式：
  - 相关工作流能执行 `db:types:check`
- 相关文件/系统：`package.json`、`scripts/check-db-types.js`、`.github/workflows/`
- 提交记录：待后续提交

### TD-12 粉丝管理后端能力缺失

- 标题：粉丝管理后端能力缺失
- 优先级：中
- 状态：待拆分
- 背景：Dashboard 的粉丝管理已经有前端结构，但回复、重点标记、批量通知和导出仍缺真实后端能力。
- 会导致什么：页面看起来像“已经有这项能力”，但真正要用时只能停在界面层，用户会直接把它当成没做完。
- 解决方案：按功能拆成四个独立子债逐个完成。
- 实施步骤：
  1. 子债 A：回复
  2. 子债 B：标记重点
  3. 子债 C：批量通知
  4. 子债 D：导出
- 验证方式：
  - 每个子债都需要自己的接口验证和 Dashboard 回归
- 相关文件/系统：`packages/viewer-react/src/pages/dashboard/`、`supabase/`
- 提交记录：待后续提交

### TD-13 收入/结算真实数据源缺失

- 标题：收入/结算真实数据源缺失
- 优先级：中
- 状态：待实施
- 背景：Dashboard 收入卡片和趋势仍是预估值，不是实际结算数据。
- 会导致什么：创作者看到的收入数字不可靠，越是接近真实经营决策，误导成本越高。
- 解决方案：接入真实收入/结算数据源，并替换当前派生值。
- 实施步骤：
  1. 定义结算数据表或接口口径。
  2. 替换 Dashboard 收入读数与趋势图。
  3. 补验证和说明。
- 验证方式：
  - Dashboard 收入数据能回溯到真实数据源
- 相关文件/系统：`supabase/migrations/`、`packages/viewer-react/src/queries/dashboardAnalytics.ts`
- 提交记录：待后续提交

### TD-14 挑战类成就计数依赖临时回退逻辑

- 标题：挑战类成就计数依赖临时回退逻辑
- 优先级：中
- 状态：待实施
- 背景：`perfect_*`、`speed_lesson`、`daily_tasks_30` 等计数还没有完整后端字段，前端在用临时回退逻辑补空。
- 会导致什么：用户会看到成就进度忽快忽慢，甚至和实际完成情况对不上。
- 解决方案：补齐后端字段和读数口径，再切回正式计算链路。
- 实施步骤：
  1. 补数据库字段或 RPC。
  2. 替换前端临时回退逻辑。
  3. 回归成就墙和个人页。
- 验证方式：
  - 成就计数在关键场景下与后端结果一致
- 相关文件/系统：`supabase/`、`packages/viewer-react/src/features/profile/`
- 提交记录：待后续提交

### TD-15 设置中心支持入口与隐私开关未接真实策略

- 标题：设置中心支持入口与隐私开关未接真实策略
- 优先级：中
- 状态：待实施
- 背景：设置中心部分入口和开关仍是前端层面的展示或本地偏好，没有接真实链接、策略或后端读写。
- 会导致什么：用户以为自己已经改了隐私或支持设置，但实际系统并没有真正采纳。
- 解决方案：补正式链接、真实策略读写和验收说明。
- 实施步骤：
  1. 明确哪些是本地偏好，哪些必须落后端。
  2. 接入真实后端或正式链接。
  3. 更新文案和测试。
- 验证方式：
  - 设置页关键入口和开关均可追溯到真实行为
- 相关文件/系统：`packages/viewer-react/src/features/profile/`
- 提交记录：待后续提交

### TD-16 AI 生成成功率/失败类型缺少观测面板

- 标题：AI 生成成功率/失败类型缺少观测面板
- 优先级：中
- 状态：待实施
- 背景：AI Tutor、文档转 quiz、文档转 mind map 已有能力，但没有面向产品或运维的成功率/失败类型视图。
- 会导致什么：团队只能“感觉上觉得最近不稳定”，却很难说明到底是超时多、输入太长多，还是后端本身不稳。
- 解决方案：先补一个最小可用的观测面板，不和复杂 BI 系统绑定。
- 实施步骤：
  1. 定义最少统计字段。
  2. 采集成功/失败事件。
  3. 展示最近趋势和失败类型占比。
- 验证方式：
  - 能看见基本成功率和失败分类
- 相关文件/系统：`packages/viewer-react/`、`supabase/functions/`、可能的 analytics 存储
- 提交记录：待后续提交

### TD-17 Viewer 离线缓存与断网播放缺失

- 标题：Viewer 离线缓存与断网播放缺失
- 优先级：中
- 状态：待拆分
- 背景：当前体验默认依赖在线环境，缺少更稳的资源缓存和断网时的播放兜底。
- 会导致什么：网络一差，学习流程就容易中断，用户会把问题归因为“产品不稳定”。
- 解决方案：先拆成资源缓存和断网回放两个子债。
- 实施步骤：
  1. 子债 A：资源缓存
  2. 子债 B：断网回放
- 验证方式：
  - 每个子债都要补对应的浏览器和回归验证
- 相关文件/系统：`packages/viewer-react/`
- 提交记录：待后续提交

### TD-18 多人协作草稿冲突策略缺失

- 标题：多人协作草稿冲突策略缺失
- 优先级：中
- 状态：待拆分
- 背景：如果后续引入多人协作，目前还没有明确的草稿冲突检测和提示方案。
- 会导致什么：两个人改同一份内容时，很可能互相覆盖，最终谁改掉了什么都说不清。
- 解决方案：先拆成冲突检测和冲突提示/处理两个子债。
- 实施步骤：
  1. 子债 A：冲突检测
  2. 子债 B：冲突提示与处理
- 验证方式：
  - 需要多用户场景下的编辑冲突回归
- 相关文件/系统：`packages/viewer-react/src/features/editor/`、未来协作后端
- 提交记录：待后续提交

## 低优先级

### TD-19 创作者通知中心缺失

- 标题：创作者通知中心缺失
- 优先级：低
- 状态：待实施
- 背景：Dashboard 主壳里还没有完整的创作者通知中心。
- 会导致什么：创作者需要频繁切换页面或依赖别的渠道才能知道重要事件，工作流不连贯。
- 解决方案：增加统一通知入口和基础通知模型。
- 实施步骤：
  1. 确定通知种类和优先级。
  2. 接入 Dashboard 主壳。
  3. 补读/未读与跳转行为。
- 验证方式：
  - Dashboard 内能完成基础通知查看与跳转
- 相关文件/系统：`packages/viewer-react/src/pages/dashboard/`
- 提交记录：待后续提交

### TD-20 学员分群与 cohort 分析缺失

- 标题：学员分群与 cohort 分析缺失
- 优先级：低
- 状态：待拆分
- 背景：当前 Dashboard 只覆盖基础分析，没有更深入的学员分群和 cohort 视图。
- 会导致什么：创作者能看到“整体怎么样”，但很难知道是哪一类学员在掉队、留存或完成率变化。
- 解决方案：先拆成数据口径/API 和 Dashboard 展示两个子债。
- 实施步骤：
  1. 子债 A：数据口径与 API
  2. 子债 B：Dashboard 展示
- 验证方式：
  - 数据口径和前端展示分别回归
- 相关文件/系统：`supabase/`、`packages/viewer-react/src/queries/dashboardAnalytics.ts`
- 提交记录：待后续提交

### TD-21 创作者与学习者私信能力缺失

- 标题：创作者与学习者私信能力缺失
- 优先级：低
- 状态：待拆分
- 背景：社区已有一定消息和讨论能力，但创作者与学习者之间的正式私信系统还不存在。
- 会导致什么：一旦需要做课程答疑、售后或个别沟通，只能绕路，平台承载不了完整关系链。
- 解决方案：拆成数据模型/RLS、消息 API、前端 UI 三个子债逐步完成。
- 实施步骤：
  1. 子债 A：数据模型与 RLS
  2. 子债 B：消息 API
  3. 子债 C：前端 UI
- 验证方式：
  - 三个子债分别完成数据、安全和界面回归
- 相关文件/系统：`supabase/`、`packages/viewer-react/src/features/community/`
- 提交记录：待后续提交
