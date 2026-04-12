# 待办（TODO）

最后更新：2026-04-04

## 1. 高优先级

1. [ ] 补齐粉丝管理后端能力：回复、标记重点、批量通知、导出。
2. [ ] 接入真实收入/结算数据源，替换收入预留卡片派生值。

## 2. 中优先级

1. [ ] 若未来引入多人协作，设计明确的草稿冲突处理策略。
2. [ ] 扩展 Viewer 离线缓存与断网播放能力。
3. [ ] 增加 AI 生成成功率/失败类型的观测面板。
4. [ ] 补齐挑战类成就计数后端字段（`perfect_*`、`speed_lesson`、`daily_tasks_30`），替换当前临时进度回退逻辑。
5. [ ] 将设置中心中的支持入口与隐私开关接入真实后端策略和正式链接。

## 3. 低优先级

1. [ ] 在 Dashboard 主壳中增加创作者通知中心。
2. [ ] 增加学员分群与 cohort 分析能力。
3. [ ] 增加创作者与学习者之间的私信能力。

## 4. 最近已完成

1. [x] Dashboard analytics 已切换为真实 Supabase 事件级数据：课程浏览、学员活跃增长、完成率时间线、已发布课程排行均不再走 fallback。
2. [x] Course Management 已接入真实 `student` / `comments` 排序，并在课程卡片上展示对应指标芯片。
3. [x] 修复 Interactive Visual HTML 生成归一化：模型返回带代码围栏的 HTML 时，后端会先剥离围栏再回给 Builder。
4. [x] 新增真实 Supabase cloud smoke：覆盖 Builder 发布 -> Viewer 课时标题回读一致性，并引入专用 smoke 作者账号与复用 smoke 课程。
5. [x] Dashboard 首页/课程管理/数据中心/粉丝管理四页重设计完成（响应式 + 模块化 tabs/widgets/providers）。
6. [x] Builder 画布内联编辑：Text / Code Block / Code Playground。
7. [x] 可见性默认规则统一（首块 `always`，后续 `afterPreviousCorrect`）。
8. [x] Viewer lesson 标题与 markdown 渲染修复。
9. [x] Logo 跳转 Dashboard 路径统一。
10. [x] 为重构后的课程管理新增关键状态与回调的 Widget 测试。
11. [x] Viewer 页面宽度策略集中化（共享布局组件 + 响应式测试）。
12. [x] Viewer 个人页成长体系体验重构（菜单优先的设置入口、置顶成就徽章条、待解锁进度卡片）。
13. [x] 成就墙重设计：徽章图片、进度展示、派生解锁回写、加载/空状态处理。
14. [x] 新增统一的 `AchievementDisplayService` 与成就徽章资源包，统一个人页与成就墙展示逻辑。
15. [x] Viewer 设置页重构为多分类设置中心（侧栏切换单一内容面板 + 偏好持久化 + 家长模式/支持模块整合）。
16. [x] 新增 Builder 设置中心（分类切换单一面板），并打通 Dashboard/头像入口及工作流、AI、通知、发布、隐私等偏好的本地持久化。
17. [x] 修复 Viewer 鉴权/社区/首页回归问题：登录页溢出、社交图标正确性与对比度、滚动条右贴边、首页每日任务移除、课程库选中主题重复展示清理。
18. [x] 完成 Viewer 核心学习链路中英文适配（登录/注册/主页/课程库/社区/课时/结果/AI 导师/设置等），并确保与用户语言设置联动切换。
19. [x] 完成 Builder 全链路中英文适配（鉴权、Dashboard、Builder 画布、Viewer 预览、交互模块组件），并确保跟随设置中心语言切换。
20. [x] 完成 Viewer Landing Page 中英文适配，保证公开入口文案与语言设置一致。
21. [x] 全面重设计 Viewer 落地页（以学习者为核心，11 个区块，浮动英雄模拟卡片，980px 响应式，移除 Builder 相关内容）。
22. [x] 全面重设计 Viewer 登录页（双栏桌面布局，Google/Apple/WeChat 社交登录，动态输入框，暗色模式修复，品牌资产 Logo）。
23. [x] 全面重设计 Viewer 注册页（镜像双栏布局，用户名字段，密码强度条，动效服务条款复选框，品牌栏统计数字）。
24. [x] GitHub Pages 部署从 hackathon/ 迁移至 Viewer；删除 hackathon/ 项目；通过 CNAME 保留 primoria.dpdns.org 域名。
25. [x] React Builder 完成视觉一致性升级：Dashboard / Auth / Editor 全部切到 botanical 视觉语言，不再保留早期 plain Tailwind 外观。
26. [x] React Builder 完成 block 可见性流：每页首块固定 `always`，后续 block 默认 `afterPreviousCorrect`，learner preview 在答对并点击 `Check` 后再解锁后续内容。
27. [x] Builder 画布编辑体验升级：`text`、`code-block`、`code-playground` 直接在 block 上编辑，`image` 接入 Supabase 上传，冗余 properties 编辑器移除。
28. [x] React learner preview 按 Flutter viewer 结构重做：居中 lesson stage、页进度、`Prev / Check / Next` 导航，以及 landing-style 呈现。
29. [x] React Builder 文案统一为英文；旧的中文 dashboard/auth 选择器与无效语言值已清理。
30. [x] React `packages/builder` 已成为唯一创作端实现，相关 docs 已同步更新。
31. [x] Builder 稳定性加固完成：显式远端保存、保存失败时阻止发布、author/admin 角色门禁、移除本地草稿/autosave，并删除与 `visibilityRule` 冲突的 `requiredForProgress`。
