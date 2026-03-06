# 回归测试清单（Builder + Viewer）

最后更新：2026-03-06

## A. 构建与静态检查

- [ ] `cd Builder && flutter pub get`
- [ ] `cd Builder && flutter analyze lib/features/dashboard`
- [ ] `cd Builder && flutter test`
- [ ] `cd Viewer && flutter pub get`
- [ ] `cd Viewer && flutter analyze`
- [ ] `cd Viewer && flutter test`

## B. Builder 路由与权限

- [ ] 未登录访问 `/dashboard` 会被重定向到 `/`
- [ ] 未登录访问 `/builder` 会被重定向到 `/`
- [ ] 已登录 author/admin 访问 `/` 会跳转 `/dashboard`
- [ ] 非 author 角色无法访问 Builder 受保护路由

## C. Builder 编辑器核心能力

- [ ] 在 `/builder` 创建空白 lesson
- [ ] 使用规范 `lessons` 键导入 JSON 成功
- [ ] 使用历史 `pages` 键导入 JSON 并验证迁移成功
- [ ] 保存与发布流程在无阻断错误时可完成
- [ ] text block 的 markdown/plain 模式在预览中正确渲染
- [ ] `text`、`code-block`、`code-playground` 支持画布内联编辑
- [ ] 可见性默认规则正确：
  - 首个 block = `always`
  - 非首个 block = `afterPreviousCorrect`

## D. Dashboard Tab 测试

### D1. 首页（已重设计）
- [ ] 按时间段显示问候语
- [ ] 快捷按钮可用（创建/继续编辑/查看数据）
- [ ] 学习概览 KPI 与完成率趋势可渲染
- [ ] 热门课程 Top3 列表可渲染并可点击
- [ ] 最近活动时间线可渲染
- [ ] 无课程时显示空状态

### D2. 课程管理（行为不变）
- [ ] loading / empty / list 状态正常
- [ ] 创建/编辑/删除课程正常
- [ ] 添加课时入口正常
- [ ] 删除课时确认流程与保底保护正常

### D3. 数据中心（已重设计）
- [ ] KPI 行可渲染
- [ ] 趋势图可渲染，时间范围切换可用（7/30/90/全部）
- [ ] 课程表现柱状图和排序切换可渲染
- [ ] 地域饼图可渲染
- [ ] 热力图可渲染
- [ ] 详情表可渲染
- [ ] 导出可将 CSV 文本复制到剪贴板

### D4. 粉丝管理（已重设计）
- [ ] 粉丝 KPI 与增长趋势可渲染
- [ ] 搜索/筛选/分页可用
- [ ] 互动时间线可渲染
- [ ] 标签创建/删除 UI 可用
- [ ] 批量操作入口可达并显示“预留能力”提示

## E. Viewer 核心验证

- [ ] 登录/注册流程正常
- [ ] 课程报名流程正常
- [ ] 课时页顶部标题显示当前 lesson 名（不是 course 名）
- [ ] text 内容支持 markdown 渲染
- [ ] 个人页 XP/连续学习/成就相关数据可加载
- [ ] logo/入口跳转可回到预期 dashboard/home

## F. 数据一致性

- [ ] 在 Builder 改 lesson 名并保存，回 Dashboard 能看到新名
- [ ] lesson 改名后发布，再进 Viewer 验证标题一致
- [ ] 对快照内容不完整的课程，Viewer fallback 仍可打开

## G. 当前非阻断缺口

1. Dashboard 收入数据目前是 fallback 派生值。
2. 部分分析/粉丝操作只有前端入口，后端接口未接入。
3. Course Manage 的 student/comments 排序仍为占位逻辑。
