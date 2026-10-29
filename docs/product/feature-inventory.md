# Primoria 当前功能总览

核对日期：2026-10-25（Asia/Singapore）。代码基线：`703dfe73` 及当前工作区。

2026-10-29 发布前补充核对：更新下方 KG 审批状态、默认定位门禁和路由用例数。
后续生产发布与验收记录见 [部署记录](../supabase-deployment.md) 和
[回归记录](../integration-regression-testing.md)；§5 保留原始文档核对时的证据。

本记录按页面、API、运行时模块、共享目录和测试文件核对当前实现，用于回答
“项目目前有哪些功能”。“已实现”表示存在可追踪的代码路径，不代表本次已完成
真实模型、浏览器、线上数据库或生产部署验收。功能行为以代码为准；详细约束见
[产品规格](feature_specification.md) 和 [文档优先级](../README.md)。

## 1. 用户可用功能

| 模块 | 当前功能 | 入口与主要代码依据 |
| --- | --- | --- |
| 账号与认证 | 邮箱密码注册、登录、退出、服务端会话、认证频率限制；密码找回和一次性重置令牌；修改显示名称 | `/welcome`、`/login`、`/signup`、`/forgot`、`/reset-password`、`/account`；`apps/web/src/lib/auth/`、`apps/web/src/app/api/auth/`、`apps/web/src/app/api/profile/route.ts` |
| 初次使用引导 | 输入学习目标，定位知识图谱；确认学段与课程体系；可跳过的个人背景输入；选择 Tutor 风格；准备首门课程 | 首页引导；`apps/web/src/components/onboarding/onboarding-client.tsx`、`apps/web/src/app/api/onboarding/`、`apps/web/src/lib/learner-profile/` |
| AI Tutor 对话 | 流式问答、新建和恢复聊天、保存历史、回答赞踩；根据当前课程和选中内容回答；临时互动测验 | `/`、课程侧栏；`apps/web/src/components/tutor/copilot-chat-surface.tsx`、`apps/web/src/app/api/copilot-threads/`、`apps/web/src/app/api/copilotkit/route.ts`、`apps/agent/src/tools/quiz.mjs` |
| 三种教学风格 | 苏格拉底式引导、费曼式类比与复述、欧几里得式定义与推导；默认费曼式，可在设置中修改 | `/settings`；`packages/contracts/src/tutor-style*.mjs`、`apps/agent/src/middleware.mjs` |
| 聊天附件 | 图片及 PDF、DOCX、Markdown、TXT 作为消息上下文；图片需要所选模型支持视觉；文档抽取有截断预算 | `apps/web/src/components/tutor/copilot-chat-surface.tsx`、`apps/web/src/lib/ai/{attachments,copilot-attachments,document-text}.ts` |
| 学习目标定位 | 全图课程、主题/概念先修闭包、按目标裁剪的课程范围；跨学科先修目标；课程体系澄清；覆盖不足时生成或复用 `gen_*` 图谱 | `apps/web/src/lib/knowledge-graph/position-learning-goal.ts`、`goal-routing-policy.ts`、`goal-scope-selector.ts`、`curriculum-routing.ts`、`generated-graph.ts` |
| 课程库 | 课程列表、搜索、状态筛选、排序、分页、生成状态、打开课程和大纲、删除课程、分享管理 | `/library`；`apps/web/src/components/library/course-library-grid.tsx`、`apps/web/src/app/api/courses/` |
| 课程与课时生成 | 以概念先修关系规划大纲，创建时跳过已掌握概念；通常每课 2–3 个概念；大纲标题/描述后台润色；首课入队，后续按需生成、跳学与下一课预热；失败恢复 | `/course/[id]/outline`、`/course/[id]`；`apps/web/src/lib/knowledge-graph/concept-frontier.ts`、`apps/web/src/lib/courses/lesson-generation-*`、`apps/web/src/lib/ai/course-generation/` |
| 课时学习 | 一次阅读一个内容块，课程进度和当前课时导航，侧栏 Tutor，选中文本提问；讲解、类比、图片、交互图、测验、代码、迁移应用、思维导图、幻灯片、练习单共 10 种块 | `apps/web/src/components/course/{course-detail-client,course-ai-assistant-panel,block-renderer}.tsx`、`apps/web/src/lib/courses/types.ts` |
| 课程内容编辑 | 自然语言改写选中块/文字；添加、转换、删除、移动块；代码和思维导图编辑持久化 | `apps/web/src/components/course/course-ai-assistant-panel.tsx`、`code-block-view.tsx`、`mind-map-block-renderer.tsx`；`POST /api/courses/[id]/edit`、`PATCH /api/courses/[id]/blocks/[blockId]` |
| 浏览器代码运行 | 编辑并执行 Python、JavaScript，显示输出/错误；Web Worker 串行运行，执行超时中止；Python 使用 Pyodide | `apps/web/src/components/course/code-block-view.tsx`、`apps/web/src/lib/code-runner/` |
| 交互可视化 | 49 个目录组件，支持自然语言创建/调整和控件操作；聊天配置保存与恢复；课程内复用同一组件；结构化渲染器与自定义沙箱作为回退 | `data/visualization-components/catalog.v1.json`、`apps/web/src/lib/interactive/`、`apps/web/src/components/generative-ui/`、`apps/agent/src/tools/{interactive,renderers,visualization}.mjs` |
| 测验与自适应进度 | 幂等提交课程测验、重试恢复；规则计算概念掌握度；继续、复习或补救建议；确认建议后生成/进入目标课时 | `apps/web/src/app/api/courses/[id]/quiz/route.ts`、`apps/web/src/lib/mastery/`、`apps/web/src/lib/courses/learning-progress-*` |
| 学习者背景与偏好 | 手动添加、编辑、忽略 Facts；界面移除会保留 dismissed 标记；背景文本后台提取；保留证据；供 Tutor 和后续课时规划使用 | `/settings/facts`；`apps/web/src/lib/learner-facts/`、`apps/web/src/lib/ai/extractor/`、`apps/web/src/app/api/learner-facts/` |
| 个人成长 | 服务端 XP 账本、8 个等级、3 项每日任务、连续任务天数、10 项成就、当前课程任务图；课程测验/课时成功写入后展示奖励提示 | `/profile`；`apps/web/src/lib/gamification/{catalog,store,time}.ts`、`apps/web/src/components/profile/gamification-hub.tsx` |
| 学习统计 | 今日课时/题目/事件/XP，30 日活跃热图、连续天数、累计课时/题目/XP、课程预计学习时长 | `/stats`；`apps/web/src/lib/profile/stats.ts` |
| 学习周报 | 本周课时/题目/事件/XP、涉及课程、每日活动分布、活跃天数、最佳学习日、学习过的课程 | `/weekly-report`；`apps/web/src/app/weekly-report/page.tsx`、`apps/web/src/lib/profile/stats.ts` |
| 课程分享 | 不可变脱敏快照、公开预览、发布新版本、撤销、导入自己的课程库；同一分享系列幂等导入 | `/share/[token]`；`apps/web/src/lib/courses/share-store.ts`、`apps/web/src/app/api/courses/[id]/share/route.ts`、`apps/web/src/app/api/share/[token]/import/route.ts` |
| 资料与科目文件夹 | 新建/重命名/删除科目文件夹，Unsorted 收件箱；上传、重命名、移动、删除资料；区分讲义/参考资料；按讲次、模型建议或手动排序 | `/materials`、`/materials/[folderId]`；`apps/web/src/components/materials/`、`apps/web/src/lib/materials/{folders,ordering,lecture-order}.ts`、`apps/web/src/app/api/folders/` |
| 资料知识图谱 | 后台逐讲分析、复用已有概念、先修关系、失败重试；按讲次组装私有文件夹图谱；按讲展示概念及掌握度 | `apps/web/src/lib/materials/{lecture-kg-jobs,lecture-kg-processor,folder-graph,folder-graph-store,folder-overview}.ts` |
| 资料课程 | 选 1–5 份资料建课；科目文件夹另有一个整图课程，可同步后续讲义新增概念；生成内容附概念级资料来源；删除讲义时协调尚未生成的课时 | `apps/web/src/lib/materials/{material-graph,material-graph-store,folder-course,folder-course-reconcile,grounding}.ts`、`apps/web/src/app/api/materials/courses/route.ts`、`apps/web/src/app/api/folders/[id]/course/` |
| 资料问答 | 资料课程侧栏按问题检索原文：BM25 + 可用时的向量检索 + 当前课时引用融合；最多 6 段；回答标明出处，资料外内容要求独立标为补充 | `apps/web/src/lib/materials/{retrieval,semantic-index,tutor-context}.ts`、`apps/web/src/app/api/copilotkit/route.ts` |
| 文件夹测验 | 请求 10 或 20 道单选题，按薄弱程度抽题，已掌握概念少量复习；资料支撑的可复用题库，展示解析与来源；首答计入掌握度 | `apps/web/src/components/materials/folder-quiz.tsx`、`apps/web/src/lib/materials/folder-quiz*.ts`、`apps/web/src/app/api/folders/[id]/quizzes/` |
| 语言与偏好 | 中文/英文界面，独立的内容语言偏好，Tutor 风格、显示名称；每日任务使用已验证的 IANA 时区，缺失时 UTC | `/settings`、`/account`；`apps/web/src/lib/i18n/`、`apps/web/src/lib/settings/user-settings.ts` |

## 2. 关键状态与限制

- **知识图谱**：31 个库内运行时图谱源均已批准，其中 10 个中国/新加坡图谱于
  2026-10-25 获得批准。运行时注册、数据库导入、源批准、课程映射批准、教学知识批准是
  不同状态。当前构建/导入不会自动以 `review_status` 阻止发布。见
  [KG 清单](../knowledge-graph/catalog.md)。
  新目标的冷启动定位默认启用审批门禁，`PRIMORIA_REQUIRE_APPROVED_KG=0` 可关闭；
  启用时有已批准图谱就只从它们选择锚点，已有课程与直接图谱读取仍可解析；若没有任何
  已批准图谱，当前 helper 会保留全库候选，不能描述为绝对禁止未审图谱。
- **可视化**：49 个目录条目均标为 `implemented`，覆盖理工、人文、语言、音乐、艺术等。
  超过 40 个时 Agent 先查目录，再发出组件信号；具体配置由 Web 生成、校验、保存。
  组件数不表示全部参考站点场景已覆盖，也不替代逐项真人验收。
- **目标路由**：永久中英双语数据集当前有 1,726 条用例，保留 1,718 条最低覆盖要求，
  保护所有 31 个运行时图谱。
  确定性验证和真实模型评估是两个关卡。
- **掌握度与成长**：至少 3 条概念题结果且正确率达到 80% 才能掌握；文件夹测验按最近
  5 条首答滚动计算。聊天临时测验不写课程掌握度；文件夹测验不发答题 XP，但其
  掌握度变化可满足成就/每日任务条件。自述 Facts、XP、掌握度相互独立。
- **资料边界**：PDF/DOCX/Markdown/TXT，每份最多 8 MiB，每用户最多 50 份；抽取文本
  须为 200–400,000 字符，选资料建课最多 5 份且合计最多 600,000 字符。无文本层扫描件
  不支持 OCR。原始文件字节不保存。聊天附件与资料库独立，聊天附件不会自动转存。
- **私有资料**：`mat_*` 图谱、检索片段、生成课程与图片按 owner 隔离，不能分享或提升到
  公共库；主 Tutor 不直接检索个人资料库。缺少向量检索时可退化到词法及课时来源。
- **分享版本**：导入结果为独立课程；发布新分享版本不会自动更新已经导入的课程。
- **统计口径**：学习事件反映记录到的活动；预计学习时长来自课程计划，不是实测在线时长。
  当前周报为事件聚合页面，没有自动邮件推送或 AI 周总结功能。
- **外部配置**：密码邮件依赖配置邮件服务；图片生成、图谱语义能力和模型回答依赖相应
  服务端配置。界面存在不代表这些外部服务在当前环境已就绪。

## 3. 后端、运维和实验能力

| 能力 | 当前实现与边界 | 依据 |
| --- | --- | --- |
| Web/Agent 分工 | Web 拥有认证、课程、KG 和产品写入；Agent 负责 Tutor 编排，只写隔离的 `agent_runtime`，另有受限的课程卡读取 | `apps/web/src/app/api/copilotkit/route.ts`、`apps/agent/src/graph.mjs`、`apps/agent/src/runtime/` |
| 持久化 Agent | AG-UI 流事件、运行状态、租约、取消、重试、检查点；已有可见/工具输出后不自动重放；管理脚本可检查/取消/恢复/清理运行 | `apps/agent/src/runtime/`；根 `package.json` 的 `agent:runs:*` |
| 三个后台 Worker | 课时生成；学习进度与掌握度；Facts intake、课后提取及逐讲 KG 作业；有持久化队列、租约、心跳、恢复与失败状态 | `apps/web/src/workers/`、`apps/web/src/lib/courses/`、`apps/web/src/lib/materials/lecture-kg-jobs.ts` |
| 媒体存储 | 普通课程用全局语义图片缓存；资料课用私有缓存。配置 Storage 时图片字节在私有 `lesson-media` 桶，浏览器经 Web 媒体路由读取；未配置时支持数据库字节存储 | `apps/web/src/lib/ai/media/`、`apps/web/src/app/api/media/assets/[assetId]/route.ts` |
| 健康与部署 | 存活/就绪检查；就绪涵盖 DB、KG/embedding、队列、Worker 心跳和 Agent；选定 Supabase PostgreSQL + 应用服务器，另有自托管数据库 Compose | `apps/web/src/app/api/health/`、`apps/web/src/lib/health/readiness.ts`、`docker-compose.supabase.yml`、`docker-compose.prod.yml` |
| 可视化分析 | 渲染遥测、组件可靠性及沙箱需求统计；生产必须启用开关且登录邮箱在白名单 | `/internal/visualization-analytics`；`apps/web/src/lib/telemetry/` |
| 教学形式实验 | 课时生成可分配解释/媒体形式并记录事件、分析结果；默认关闭，需 `PRIMORIA_METHOD_ARMS=1` | `apps/web/src/lib/courses/lesson-generation-processor.ts`、`apps/web/src/lib/ai/course-generation/{method-arms,lesson-plan-compiler}.ts`、`apps/web/src/lib/analysis/method-outcomes.ts`；[实验约束](../teaching-method-experiment.md) |
| QA 与评估 | 独立 QA 页面、目录同步/覆盖检查、静态回放、路由用例、TutorBench、隔离 DB/浏览器回归；QA 页面/API 各自有环境门禁，不是常规学习入口 | `apps/web/src/app/qa/`、`apps/web/src/app/api/qa/`、`apps/agent/evals/`、`e2e/`、根及应用 `package.json` |

`packages/memory` 的可选 Mem0 接口仅在保留的 `POST /api/courses/[id]/chat`
独立接口中有调用。当前课程侧栏走 CopilotKit → `POST /api/copilotkit` → Agent，
不能据包的存在就把向量情景记忆列为当前主 Tutor 功能。

## 4. 尚未实现或不能据本次核查认定完成

- 教师布置任务、班级分析、协作课堂、Agent 市场、自建 Tutor、跨用户集体记忆、Goal Space。
- 社交排行榜、组队任务、Teach-Back Boss 或配对小游戏。
- 任意沙箱 Widget 自动保存并复用为独立应用。
- OCR、通用音视频输入，以及资料页直接“问资料”。
- 完整跨图谱补救后回到原学习路径、间隔复习调度等仍在完善或规划，已有部分补救建议
  不应描述为全部长期自适应闭环完成。
- 本次只更新文档并执行明确记录的静态检查；未执行真实模型调用、线上迁移、生产部署，
  也未重新完成全部真人或端到端验收。已有历史测试证据保留其原日期。

## 5. 本次核对记录（2026-10-25）

- `pnpm catalog:validate`：通过，49 个条目，全部 `implemented`，共享目录与生产注册同步。
- `pnpm test:learning-goal-routing`：通过，生成一致性及 validate-only 校验均为 1,718 条。
- 本次修改的 Markdown 本地链接及代码依据路径另作静态存在性检查；`git diff --check`
  用于检查补丁格式。这些检查不连接线上数据库，也不调用真实模型。
- 未重跑完整 `pnpm test:regression`、真实模型评估或浏览器流程；本次修改限文档。

## 6. 相关文档

- [产品规格](feature_specification.md)：行为、数据归属与规则。
- [Web 实现状态](../web-implementation-status.md)：开发侧能力与验证入口。
- [架构](../product-architecture.md)：运行路径、队列和部署分工。
- [资料学习](learning-materials.md)、[科目文件夹](subject-folders.md)：资料建课、检索、题库与同步。
- [成长系统](gamification.md)：XP、等级、每日任务和成就。
- [回归契约](../integration-regression-testing.md)：测试范围、历史证据与外部关卡。
