# Viewer React 关键交互清单

最后更新：2026-04-19

## 说明

- 本页只记录当前仍有价值的关键交互，不再维护过度细碎的逐按钮清单。
- `fixture` 只用于开发和测试，不代表真实后端链路。
- 正常运行模式默认依赖真实 Supabase；AI Tutor 聊天在配置 `VITE_AGENT_SERVICE_URL` 时优先走 `agent-service`，否则走 `viewer-ai-tutor` Edge Function。

## 核心交互

| 模块 | 关键交互 | 前置条件 | 主要反馈 | 数据/后端 | 路由变化 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 公共入口 | 落地页 CTA、登录、注册、OAuth 回调 | 未登录 | 表单校验、跳转、成功或失败提示 | Supabase Auth | `/`、`/login`、`/register`、`/auth/callback` | WeChat 仍保持“即将支持”语义 |
| 路由守卫 | 未登录进入受保护页面会被重定向；家长进入学习者首页会被归一到 `/parent` | 访问受保护路由 | 自动重定向 | Auth 状态 | 受保护路由 -> `/login` 或 `/parent` | 统一入口逻辑 |
| 首页 | 继续学习、推荐入口、主导航切换 | 已登录学习者 | 卡片状态、推荐提示、导航切换 | Viewer API / 本地偏好 | `/home` 与主导航页之间切换 | 当前有本地偏好持久化 |
| 课程库 | 搜索、学科筛选、课程详情、已拥有课程区块 | 已登录学习者 | 加载、筛选结果、空状态 | `subjects`、`courses`、相关查询接口 | `/library` -> `/course/:courseId` | fixture 模式仅用于开发 |
| 课程详情 | 报名、进入课时 | 已登录学习者；未报名时可报名 | CTA loading、报名后状态刷新 | `enrollments`、课程详情读取 | `/course/:courseId` -> `/lesson/:lessonId` | 报名是幂等 upsert |
| 课程学习 | 翻页、答题、`Check`、完课、结果页 | 已报名学习者 | 正误反馈、区块解锁、结果页总结 | 课时快照、进度/完课写入 | `/lesson/:lessonId` -> `/lesson/:lessonId/result` | 采用多页学习流 |
| 社区 | 切换分区、消息、学习房间、讨论、学习笔记 | 已登录学习者 | 列表刷新、未读变化、编辑反馈 | 社区表、消息表、讨论、房间与笔记相关 RPC/表 | `/community` | 语音/通话仍保持占位语义 |
| AI Tutor 聊天 | 发送消息、流式回复、保存会话、覆盖 API key | 已登录学习者 | 聊天气泡、流式文本、错误提示 | `agent-service` 或 `viewer-ai-tutor` | `/ai-tutor` | 聊天后端按环境变量选择 |
| AI Tutor 工具 | 上传 PDF/DOCX、生成 quiz、生成 mind map、打开 notebook 项目 | 已登录学习者 | 上传提示、生成进度、跳转或新标签页打开 | `tutor_documents`、`viewer-ai-quiz-from-docs`、`viewer-ai-mindmap-from-docs` | `/ai-tutor`、`/library`、独立导图路由 | quiz 和 mind map 仍走 Edge Function |
| 个人中心 | 查看资料、XP、成就摘要 | 已登录学习者 | 资料面板与成就卡片渲染 | profile/stats/achievements 相关查询 | `/profile` | 学习者主个人页 |
| 成就墙 | 管理置顶成就 | 已登录学习者 | 选择态、保存态 | `achievements`、`user_achievements`、置顶字段写入 | `/achievements` | 这里只管理展示，不定义解锁规则 |
| 设置中心 | 修改资料、切换本地偏好、生成绑定码、退出登录 | 已登录学习者或家长 | 保存提示、开关即时反馈、会话清理 | `profiles`、用户设置、RPC、本地存储 | `/settings` -> `/login` 等 | 一部分开关仍是本地偏好 |
| 家长面板 | 查看孩子报告、绑定/解绑孩子、切换孩子 | 已登录家长 | 报告刷新、绑定结果提示 | 家长相关 RPC | `/parent` | 家长专属首页 |
| Builder Dashboard | 查看首页、课程管理、数据中心、粉丝管理 | 已登录用户 | 仪表盘、弹窗、通知条 | 课程查询、analytics RPC、本地偏好 | `/builder/dashboard` | 当前重点是统一工作台体验 |
| Builder 编辑器 | 打开课程、编辑 block、保存、发布、导入导出 | 已登录用户 | 保存状态、发布反馈、画布与预览同步 | 编辑器 store、课程 mutation、图片上传 | `/builder/editor`、`/builder/editor/:courseId` | 学习端预览链路已接通 |
| Release / Ops | CI、预览、生产发布、恢复 | 发布负责人 | 工作流状态、烟测结果、恢复记录 | GitHub Actions、Cloudflare、Supabase | 无用户态路由 | 详细步骤见 `viewer-react-cutover-runbook.md` |

## 当前仍保留的占位语义

- 登录页的 WeChat 登录
- 社区中的语音/通话延展能力
- Dashboard 中依赖真实结算与粉丝后端的能力

这些未完成项统一在 [technical-debt-register-zh.md](./technical-debt-register-zh.md) 维护。
