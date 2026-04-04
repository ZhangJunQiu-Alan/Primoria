# Dashboard 架构说明

最后更新：2026-03-20

## 范围

Builder 的 Dashboard 现在位于统一的 Viewer React 应用中，对外路由为 `/builder/dashboard`。
它是创作者工作台主壳，包含侧边导航、顶部操作区和四个核心 Tab。

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
- `packages/viewer-react/src/components/account/AccountMenu.tsx`
  - 头像菜单入口，承接统一设置、支持与会话动作
- `packages/viewer-react/src/services/StorageService.ts`
  - 本地偏好持久化

## Tab 说明

### 1）Home

- 按时间段显示问候语
- 快捷操作：创建、继续编辑、查看数据
- 概览 KPI 与趋势卡片
- 重点课程列表与直接打开入口
- 最近活动流
- 紧凑的系统提示与状态反馈

### 2）Course Management

- 负责课程生产操作：
  - 创建课程
  - 编辑元数据
  - 删除课程
  - 复制课程
  - 添加课时
  - 删除课时
  - 直接打开指定课程/课时进入 Builder 工作台
- 控制栏：搜索、状态筛选、排序方式
- 摘要条：课程数 / 课时数 / 已发布 / 草稿 / 待补内容
- 覆盖状态：
  - 未登录提示
  - 加载态
  - 空状态
  - 无结果
  - 可恢复错误

### 3）Data Center

- KPI 行
- 学习趋势图与时间范围切换
- 课程表现图
- 地域分布
- 学习时段热力图
- 明细表
- 导出入口

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
- 收入/高级分析等尚未接后端的域继续使用派生占位值
- 工作流偏好由本地存储负责

## 响应式策略

- Desktop：侧边栏主壳 + 多列 dashboard 区块
- Tablet：卡片自动换行，图表/表格密度下调
- Mobile：单列堆叠，主操作保留，交互更多依赖弹窗

课程管理补充：
- 内容区保持居中并有最大宽度约束
- 课程卡片与课时行在小屏上自然换行
- 动作区折行但不隐藏主流程按钮

## 已知缺口

1. 收入与高级分析仍然依赖 fallback 派生值。
2. 粉丝回复/通知/导出仍是前端预留位，后端接口未接入。
3. 部分排序方式仍基于轻量占位指标，而不是真实事件级事实。
