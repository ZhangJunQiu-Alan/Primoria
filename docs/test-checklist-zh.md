# 回归测试清单（Builder + Viewer）

最后更新：2026-03-20

## A. 构建与静态检查

- [ ] `pnpm install`
- [ ] `pnpm --filter @primoria/schema exec vitest run test/blocks.test.ts test/migrations.test.ts`
- [ ] `pnpm --filter @primoria/builder typecheck`
- [ ] `pnpm --filter @primoria/builder test`
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
- [ ] text block 的 richtext 内容在 learner preview 中正确渲染
- [ ] `text`、`code-block`、`code-playground` 支持画布内联编辑
- [ ] `image` block 可上传到 Supabase，并回显在画布与预览中
- [ ] 可见性默认规则正确：
  - 首个 block = `always`
  - 非首个 block = `afterPreviousCorrect`
- [ ] 被 gating 的 block 只有在答对并点击 `Check` 后才解锁
- [ ] learner preview 支持页进度与 `Prev / Check / Next`

## D. Dashboard Tab 测试

### D1. Home
- [ ] 按时间段显示问候语
- [ ] 快捷按钮可用（创建/继续编辑/查看数据）
- [ ] 概览 KPI 与完成率趋势可渲染
- [ ] 重点课程列表可渲染并可点击
- [ ] 最近活动流可渲染
- [ ] 无课程时显示空状态

### D2. Course Management
- [ ] loading / empty / list 状态正常
- [ ] 摘要条可渲染（课程数/课时数/已发布/草稿/待补内容）
- [ ] 搜索与状态筛选联动正常（`all` / `draft` / `published`）
- [ ] 无结果状态正确出现，清空筛选可恢复列表
- [ ] 创建/编辑/删除课程正常
- [ ] 复制课程可生成新的草稿课程
- [ ] 打开课程可正确带着上下文跳转到 builder
- [ ] 添加课时与删除课时流程正常

### D3. Data Center
- [ ] KPI 行可渲染
- [ ] 趋势图与时间范围切换可用
- [ ] 课程表现图可渲染
- [ ] 地域分布可渲染
- [ ] 热力图可渲染
- [ ] 明细表可渲染
- [ ] 导出入口可达

### D4. Fan Management
- [ ] 粉丝 KPI 与趋势可渲染
- [ ] 搜索/筛选/分页可用
- [ ] 互动时间线可渲染
- [ ] 标签相关操作可达
- [ ] 预留批量操作会显示占位反馈

### D5. Dashboard 设置
- [ ] 账号设置可从 Supabase 正常加载
- [ ] Workflow 设置可正常本地保存
- [ ] Notification 设置可正常保存
- [ ] Data 分区可清除本地草稿且不影响远端课程
- [ ] React Builder 中语言值保持英文归一化

## E. Viewer 核心验证

- [ ] 登录/注册流程正常
- [ ] 课程报名流程正常
- [ ] Home / Library / Community / Profile 使用统一页面宽度壳层
- [ ] Viewer 桌面布局较平板/移动更宽，且内容仍居中可读
- [ ] 课时页顶部标题显示当前 lesson 名（不是 course 名）
- [ ] text 内容在学习链路中仍正确渲染
- [ ] 个人页 XP/连续学习/成就相关数据可加载
- [ ] logo/入口跳转可回到预期 dashboard/home
- [ ] `Viewer/test/viewer_layout_metrics_test.dart` 通过
- [ ] `Viewer/test/viewer_page_shell_test.dart` 通过

## F. 数据一致性

- [ ] 在 Builder 改 lesson 名并保存，回 Dashboard 能看到新名
- [ ] lesson 改名后发布，再进 Viewer 验证标题一致
- [ ] 对快照内容不完整的课程，Viewer fallback 仍可打开

## G. 当前非阻断缺口

1. Dashboard 收入数据仍是 fallback 派生值。
2. 部分分析/粉丝操作只有前端入口，后端接口未接入。
3. 少数排序方式仍使用占位排序逻辑。
