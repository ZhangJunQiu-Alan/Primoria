# Dashboard 架构说明

## 概览

Dashboard（`/dashboard`）是登录用户的工作台主页，由「侧边栏 + 顶栏 + Tab 内容区」组成。

```
┌────────────┬─────────────────────────────┐
│  侧边栏    │  顶栏（头像 / 排序）         │
│            ├─────────────────────────────┤
│  [Logo]    │                             │
│  [Build]   │  Tab 内容区（可滚动）        │
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
| `features/dashboard/dashboard_screen.dart` | 主页面：侧边栏、Tab 切换、内容渲染 |
| `widgets/user_avatar.dart` | 共享圆形头像组件（Dashboard + Builder） |
| `app/router.dart` | 鉴权守卫与自动重定向 |

## Tab 说明

**Home Page（首页）**：课程数据卡、收入概览卡、评论卡；在 700px 断点处切换行/列布局。

**Course Manage（课程管理）**：通过 `getMyCourses()` 拉取课程；支持排序下拉 + Create Course。每个课程卡包含：标题、相对时间、编辑/删除、课时盒子（异步加载）、新增课时入口。包含 loading、未登录提示、空状态、列表状态。

**Data Center / Fans Manage**：当前为占位页（渲染 Home Page 内容）。

## 数据流

```
initState → _loadCourses() → getMyCourses() → _courses → rebuild
卡片渲染 → _loadCourseLessons(id) → getCourseLessonTitles(id) → _courseLessons cache → rebuild
```

`_loadCourseLessons` 现已按 `course_id` 直接查询 `lessons`，不走 `getCourseContent`，因此未保存课程内容时能正确显示 0 节课。

## 导航行为

| 操作 | 跳转/结果 |
|------|----------|
| Build Course | `/builder` |
| Create Course | 弹窗 → `createCourseRow()` → 停留在 Course Manage 并刷新 |
| Edit / Lesson box / Add lesson | `/builder?courseId=<id>` |
| Delete | 二次确认 → `deleteCourse()` → 刷新列表 |

在 Builder 中改标题并 Save 后会更新 DB 的 `courses.title`；返回 Dashboard 时重新拉取，确保标题同步。

## 鉴权守卫

受保护路由：`/dashboard`、`/builder`。未登录访问会重定向到 `/`；已登录访问 `/` 会自动重定向到 `/dashboard`。

实现依赖 `_GoRouterRefreshStream`，用于把 Supabase 的 auth stream 桥接到 GoRouter 的 `refreshListenable`。

## 已知限制

1. 每张课程卡都异步调用 `getCourseLessonTitles()`，课程多时可能变慢。
2. 按 student/comments 排序当前仍是占位行为。
3. Data Center / Fans Manage 仍是占位页。
4. “Learned X times” 当前显示的是课时数量，不是真实学习人数。
