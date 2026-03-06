# Dashboard 架构说明

最后更新：2026-03-06

## 范围

Builder 的 Dashboard（`/dashboard`）是创作者工作台主壳，采用侧边栏 + Tab 内容区。

当前 Tab：
1. 首页（已重设计）
2. 课程管理（工作台已重设计，核心流程保留）
3. 数据中心（已重设计）
4. 粉丝管理（已重设计）

## 文件结构

- `Builder/lib/features/dashboard/dashboard_screen.dart`
  - 主壳、侧边栏、顶栏、Tab 切换
  - 负责课程/课时数据动作编排与 Tab 回调路由
- `Builder/lib/widgets/builder_settings_dialog.dart`
  - Builder 设置中心对话框（分类导航 + 单一激活面板渲染）
- `Builder/lib/widgets/user_avatar.dart`
  - 账号菜单中的 Profile 入口改为打开 Builder 设置中心
- `Builder/lib/services/storage_service.dart`
  - Builder 设置中心偏好项的本地持久化读写
- `Builder/lib/features/dashboard/dashboard_localizations.dart`
  - Dashboard 专用多语言扩展
- `Builder/lib/features/dashboard/tabs/home_tab.dart`
- `Builder/lib/features/dashboard/tabs/course_manage_tab.dart`
- `Builder/lib/features/dashboard/tabs/data_center_tab.dart`
- `Builder/lib/features/dashboard/tabs/fans_manage_tab.dart`
- `Builder/lib/features/dashboard/providers/dashboard_provider.dart`
- `Builder/lib/features/dashboard/providers/analytics_provider.dart`
- `Builder/lib/features/dashboard/widgets/`
  - `kpi_card.dart`
  - `trend_chart.dart`
  - `activity_timeline.dart`
  - `learner_table.dart`

## Tab 说明

### 1）首页

- 按时间段问候（早/午/晚）
- 快捷操作：
  - 创建新课程
  - 继续编辑
  - 查看数据
- 学习概览：
  - 本周学习人数
  - 总学习时长
  - 完成率趋势图 + 环比标记
- 热门课程 Top3：
  - 标题
  - 浏览量
  - 完成进度
  - 打开课程操作
- 最近活动时间线（最多 5 条）
- 收入预留卡片（后端结算表未接入前使用派生值）

### 2）课程管理

- 独立创作者工作台 Tab（`DashboardCourseManageTab`）：
  - 页面头部 + 主操作（创建课程、AI 生成、刷新）
  - 摘要条（课程数/课时数/已发布/草稿/待补内容）
  - 控制栏（搜索、状态筛选、排序菜单）
- 课程卡片增强：
  - 状态标签 + 更新时间 + 元数据标签
  - 清晰主次操作（打开编辑器、编辑、删除）
- 每个课程卡内部集成课时管理区：
  - 课时卡片快速打开
  - 添加课时卡
  - 删除入口（沿用原确认与保护流程）
- 状态覆盖：
  - 未登录提示
  - 骨架加载
  - 空状态
  - 无结果状态
  - 全页错误 + 内联可恢复错误
- 核心生产能力保持不变：
  - 创建/编辑/删除课程
  - 打开课程编辑器
  - 添加/删除课时
  - 原有弹窗、提示、保护逻辑

### 3）数据中心

- 顶部 4 个 KPI：
  - 总学员数
  - 总浏览量
  - 平均完成率
  - 平均评分
- 趋势图 + 时间范围切换：7D / 30D / 90D / 全部
- 课程表现柱状图（支持排序维度）
- 地域分布饼图
- 学习时段热力图
- 课程明细表
- 导出入口（CSV 文本复制到剪贴板）

### 4）粉丝管理

- 粉丝概览 KPI + 增长趋势
- 搜索/筛选 + 分页粉丝表
- 互动时间线
- 标签管理（创建/删除 + 批量打标入口）
- 消息中心预留
- 批量操作入口（发送通知/导出数据）

### 5）Builder 设置中心（全局对话框）

- 入口：
  - 右上角头像菜单 -> `Profile`
  - Dashboard 已登录用户的 `_showProfile` 流程
- 布局：
  - Desktop：左侧竖向分类导航 + 右侧激活面板
  - 窄屏：顶部横向分类导航 + 下方激活面板
- 信息架构分类：
  - 账号与品牌
  - 创作工作流
  - AI Studio
  - 通知策略
  - 发布与 SEO
  - 集成与 API
  - 安全与访问
  - 计费与计划
  - 数据控制
- 已接入真实能力：
  - 账号显示名与头像 URL 保存到 Supabase profile
  - 界面语言切换
  - 创作者偏好项本地持久化
  - 清理本地课程草稿
  - 退出登录
- 说明：
  - 部分动作仍为 UI 占位，待后端能力接入
    （如完整计费工作台、API 凭证签发、全设备登出）

## 数据策略

因部分分析域数据表尚未落地，当前 provider 采用混合策略：
- 能读真实数据的域优先使用 Supabase（`courses`、`follows`、`course_feedback`、`profiles`）
- 缺失域（如收入、事件级分析）使用派生/fallback mock
- provider 中保留了明确 TODO，方便后续替换为真实后端

## 响应式策略

- Desktop：多列卡片布局
- Tablet：卡片自动换行，图表/表格密度下调
- Mobile：单列堆叠 + 紧凑表格卡片

课程管理补充：
- 内容区居中并限制最大宽度（`maxWidth: 1440`）
- 卡片与课时网格在平板/移动端自动换行
- 窄宽度下操作区自动折行

## 已知缺口

1. 收入与高级分析目前仍是派生/fallback 数据。
2. 粉丝回复/通知/导出暂为 UI 占位，待接后端接口。
3. Course Manage 中按 student/comments 排序仍是占位逻辑。
4. Builder 设置中心仍有少量占位动作，待后端 API 接入。
