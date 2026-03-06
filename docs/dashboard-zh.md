# Dashboard 架构说明

## 概览

Dashboard（`/dashboard`）是登录创作者的工作台主页，由「侧边栏 + 顶栏 + Tab 内容区」组成。

```
┌────────────┬─────────────────────────────┐
│  侧边栏    │  顶栏（头像 / 排序）         │
│            ├─────────────────────────────┤
│  [Brand]   │  Tab 内容区（可滚动）        │
│            │                             │
│  首页       │                             │
│  课程管理   │                             │
│  数据中心   │                             │
│  粉丝管理   │                             │
└────────────┴─────────────────────────────┘
```

## 关键文件

| 文件 | 作用 |
|------|------|
| `features/dashboard/dashboard_screen.dart` | 主框架：侧边栏、顶栏、Tab 切换，以及 Course Manage（保持原逻辑） |
| `features/dashboard/dashboard_localizations.dart` | Dashboard 额外多语言文案扩展（基于 `BuilderLocalizations`） |
| `features/dashboard/tabs/home_tab.dart` | 首页重设计实现 |
| `features/dashboard/tabs/data_center_tab.dart` | 数据中心重设计实现 |
| `features/dashboard/tabs/fans_manage_tab.dart` | 粉丝管理重设计实现 |
| `features/dashboard/providers/dashboard_provider.dart` | 首页聚合数据状态 |
| `features/dashboard/providers/analytics_provider.dart` | 数据中心/粉丝管理分析状态 |
| `features/dashboard/widgets/*.dart` | 可复用卡片、图表、时间线、表格组件 |
| `widgets/user_avatar.dart` | 共享圆形头像组件（Dashboard + Builder） |
| `app/router.dart` | 鉴权守卫与自动重定向 |

## Tab 说明

**Home Page（首页，已重设计）**  
包含个性化问候、快捷操作、学习概览 KPI、完成率趋势图、热门课程 Top3、最近活动时间线、收入预留卡片，并支持桌面/平板/移动端响应式布局。

**Course Manage（课程管理，行为保持不变）**  
保留既有流程：`getMyCourses()` 拉取课程、排序、创建/编辑/删除课程、课时卡片、添加课时及相关弹窗/校验逻辑。

**Data Center（数据中心，已重设计）**  
包含顶部 4 个 KPI（学员/浏览/完成率/评分）、时间范围切换趋势图、课程表现柱状图、地域分布饼图、学习时段热力图、课程数据表与 CSV 导出操作。

**Fans Manage（粉丝管理，已重设计）**  
包含粉丝概览与增长趋势、搜索/筛选/分页粉丝表、互动中心时间线、学员标签管理（含批量打标入口）和消息中心预留模块。

## 数据流

```
DashboardScreen init → _loadCourses()（Course Manage 数据）
首页挂载 → dashboardHomeProvider
  ├─ getMyCourses()
  ├─ getDashboardMetrics()
  └─ getRecentComments()

数据中心/粉丝管理挂载 → analyticsDashboardProvider / fansDashboardProvider
  ├─ getMyCourses()
  ├─ getDashboardMetrics()
  ├─ follows + profiles
  └─ 统计派生（缺少后端表时使用 fallback/mock）
```

## 导航行为

| 操作 | 跳转/结果 |
|------|----------|
| 侧边栏品牌区点击 | `/dashboard` |
| Create Course | 弹窗 → `createCourseRow()` → 停留在 Course Manage 并刷新 |
| Edit / Lesson box / Add lesson | `/builder?courseId=<id>` |
| Delete | 二次确认 → `deleteCourse()` → 刷新列表 |

在 Builder 中改标题并 Save 后会更新 DB 的 `courses.title`；返回 Dashboard 时重新拉取，确保标题同步。

## 鉴权守卫

受保护路由：`/dashboard`、`/builder`。未登录访问会重定向到 `/`；已登录访问 `/` 会自动重定向到 `/dashboard`。

实现依赖 `_GoRouterRefreshStream`，用于把 Supabase 的 auth stream 桥接到 GoRouter 的 `refreshListenable`。

## 已知限制

1. 部分分析指标当前是派生/fallback mock 数据，待事件级数据表补齐后可替换为真实统计。
2. 粉丝回复、批量通知、导出等操作目前只有前端入口，后端能力待接入。
3. Course Manage 里按 student/comments 排序仍沿用原有占位逻辑。
