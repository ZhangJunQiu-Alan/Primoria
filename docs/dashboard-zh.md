# Dashboard 架构说明

最后更新：2026-05-13

## 范围

Builder 的 Dashboard 现在位于统一的 Viewer React 应用中，对外路由为 `/builder/dashboard`。
它是创作者工作台主壳，最终要承接“自然语言生成完整互动课程”的入口、课程管理、数据反馈和用户关系管理。

当前 Tab：
1. Home
2. Course Management
3. Data Center
4. Fan Management

## 文件结构

- `packages/viewer-react/src/pages/dashboard/DashboardPage.tsx`
  - Dashboard 主壳、Tab 切换、提示条、弹窗、课程卡片与课时动作
- `packages/viewer-react/src/pages/dashboard/DashboardSettingsDialog.tsx`
  - Dashboard 账号摘要与工作台设置辅助逻辑
- `packages/viewer-react/src/pages/dashboard/dashboard.css`
  - botanical 视觉系统、布局、卡片、弹窗与响应式样式
- `packages/viewer-react/src/queries/courses.ts`
  - 课程列表读取，以及课程创建/更新/删除/复制、课时新增/删除等 mutation
- `packages/viewer-react/src/queries/dashboardAnalytics.ts`
  - 作者侧 Dashboard analytics RPC 查询、payload 归一化与空状态默认值
- `packages/viewer-react/src/components/account/AccountMenu.tsx`
  - 头像菜单入口，承接统一设置、支持与会话动作
- `packages/viewer-react/src/shared/api/viewer/analyticsEvents.ts`
  - 课程浏览与课时开始事件的前端 fire-and-forget 记录辅助
- `packages/viewer-react/src/services/StorageService.ts`
  - 本地偏好持久化

## Tab 说明

### 1）Home

- 按时间段显示问候语
- 快捷操作：用自然语言创建课程、继续编辑、查看数据
- 概览 KPI：最近 7 天学习者与累计学习时长
- 最近 7 天真实完成率趋势
- 按浏览量 / 学员数 / 完成质量排序的重点课程
- 基于课程更新和学习者活动的最近活动流
- 紧凑的系统提示与状态反馈

### 2）Course Management

- 负责课程生产操作：
  - 通过自然语言生成完整课程草稿
  - 创建空白课程
  - 编辑元数据
  - 删除课程
  - 复制课程
  - 添加课时
  - 删除课时
  - 直接打开指定课程/课时进入 Builder 工作台
- 课程生成目标：
  - 输出符合 `Course -> Lesson -> Page -> Block` 的结构
  - 每个 lesson 可以包含多个 page
  - Page 内包含多个 block
  - 优先生成有学习价值的 `interactive-visual` block，而不是只生成纯文本课程大纲
- 控制栏：搜索、状态筛选、排序方式
- 排序方式已接入真实 `student` / `comments` 指标
- 摘要条：课程数 / 课时数 / 已发布 / 草稿 / 待补内容
- 覆盖状态：
  - 未登录提示
  - 加载态
  - 空状态
  - 无结果
  - 可恢复错误

### 3）Data Center

- KPI 行：课程规模、已发布浏览量、平均完成率、预估收入
- 基于 `created_at` 与 `published_at` 的课程体量趋势
- 课程类型分布环图
- 保留预估语义的收入趋势卡
- 基于月度活跃学习者与完成率的学习进度趋势
- 已发布课程浏览量排行
- 导出入口占位

### 4）Fan Management

- 粉丝 KPI 与增长趋势
- 搜索 / 筛选 / 分页
- 互动时间线
- 标签管理
- 预留的批量操作与消息入口

### 5）Dashboard 设置辅助逻辑

- 分类：
  - Account
  - Workflow
  - Notifications
  - Data
- 已接入真实能力：
  - 从 Supabase `profiles` 读取账号摘要
  - 通过 `StorageService` 持久化本地工作流/数据偏好
  - 为统一 Viewer 设置与账号菜单提供辅助能力

## 数据策略

Dashboard 当前采用混合策略：
- 能用 Supabase 真实数据的域优先走真实数据
- 作者侧 analytics 通过 `viewer_analytics_events` + baseline 表 + RPC 聚合提供真实事实
- AI 课程生成应把自然语言请求、规划结果和生成出的 course JSON 关联起来，便于后续审校、失败诊断和质量分析
- 收入仍保留预估值，等待真实结算数据接入
- 工作流偏好由本地存储负责

## 响应式策略

- Desktop：侧边栏主壳 + 多列 dashboard 区块
- Tablet：卡片自动换行，图表/表格密度下调
- Mobile：单列堆叠，主操作保留，交互更多依赖弹窗

课程管理补充：
- 内容区保持居中并有最大宽度约束
- 课程卡片与课时行在小屏上自然换行
- 动作区折行但不隐藏主流程按钮

## 技术债边界

本页只描述 Dashboard 当前已经落地的结构与行为。

以下未完成项不再在本页重复维护，统一以 [technical-debt-register-zh.md](./technical-debt-register-zh.md) 为准：

1. 收入/结算真实数据源
2. 粉丝管理后端能力
3. 学员分群与 cohort 分析
4. AI 生成课程质量与 interactive visualization 质量观测
