# Dashboard 架构说明

最后更新：2026-03-06

## 范围

Builder 的 Dashboard（`/dashboard`）是创作者工作台主壳，采用侧边栏 + Tab 内容区。

当前 Tab：
1. 首页（已重设计）
2. 课程管理（保留现有生产逻辑）
3. 数据中心（已重设计）
4. 粉丝管理（已重设计）

## 文件结构

- `Builder/lib/features/dashboard/dashboard_screen.dart`
  - 主壳、侧边栏、顶栏、Tab 切换
  - 继续承载既有 Course Manage 逻辑
- `Builder/lib/features/dashboard/dashboard_localizations.dart`
  - Dashboard 专用多语言扩展
- `Builder/lib/features/dashboard/tabs/home_tab.dart`
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

### 2）课程管理（行为不变）

- 课程列表来自 `SupabaseService.getMyCourses()`
- 排序下拉
- 创建/编辑/删除课程
- 课时卡片 + 添加课时
- 相关弹窗、提示、保护逻辑保持原实现

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

## 数据策略

因部分分析域数据表尚未落地，当前 provider 采用混合策略：
- 能读真实数据的域优先使用 Supabase（`courses`、`follows`、`course_feedback`、`profiles`）
- 缺失域（如收入、事件级分析）使用派生/fallback mock
- provider 中保留了明确 TODO，方便后续替换为真实后端

## 响应式策略

- Desktop：多列卡片布局
- Tablet：卡片自动换行，图表/表格密度下调
- Mobile：单列堆叠 + 紧凑表格卡片

## 已知缺口

1. 收入与高级分析目前仍是派生/fallback 数据。
2. 粉丝回复/通知/导出暂为 UI 占位，待接后端接口。
3. Course Manage 中按 student/comments 排序仍是占位逻辑。
