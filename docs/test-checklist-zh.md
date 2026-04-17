# 回归测试清单（统一 Viewer + Builder 工作台）

最后更新：2026-04-16

## A. 构建与静态检查

- [ ] `pnpm install`
- [ ] `pnpm --filter @primoria/viewer-react lint`
- [ ] `deno test --allow-env supabase/functions/`
- [ ] `pnpm --filter @primoria/schema exec vitest run test/blocks.test.ts test/migrations.test.ts`
- [ ] `pnpm --filter @primoria/viewer-react typecheck`
- [ ] `pnpm --filter @primoria/viewer-react test`
- [ ] `pnpm --filter @primoria/viewer-react build`
- [ ] `pnpm --filter @primoria/viewer-react e2e` 仅覆盖本地 fixture-mode 浏览器链路
- [ ] `pnpm --filter @primoria/viewer-react smoke:cloud` 只用于带 smoke 账号的真实 Supabase / 浏览器验收

## B. Builder 路由与权限

- [ ] 未登录访问 `/builder/dashboard` 会被重定向到带 `returnTo` 的 `/login`
- [ ] 未登录访问 `/builder/editor` 会被重定向到带 `returnTo` 的 `/login`
- [ ] 已登录用户访问 `/dashboard` 会跳转 `/builder/dashboard`
- [ ] 任何已登录角色都可以访问 Builder 受保护路由

## C. Builder 编辑器核心能力

- [ ] 在 `/builder/editor` 创建空白 lesson
- [ ] 使用规范 `lessons` 键导入 JSON 成功
- [ ] 使用历史 `pages` 键导入 JSON 并验证迁移成功
- [ ] 显式保存流程可在无远端错误时完成
- [ ] 如果保存失败，发布流程会中止
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
- [ ] 最近 7 天学习者 / 累计学习时长卡片来自真实 analytics
- [ ] 最近 7 天完成率趋势来自 analytics payload
- [ ] 重点课程列表展示真实浏览量 + 学员数，并可点击进入
- [ ] 最近活动流能显示学习者和最新课程信号
- [ ] 无课程时显示空状态

### D2. Course Management
- [ ] loading / empty / list 状态正常
- [ ] 摘要条可渲染（课程数/课时数/已发布/草稿/待补内容）
- [ ] 搜索与状态筛选联动正常（`all` / `draft` / `published`）
- [ ] 无结果状态正确出现，清空筛选可恢复列表
- [ ] `student` / `comments` 排序按真实指标生效
- [ ] 课程卡片展示可见的 `students` / `comments` 指标芯片
- [ ] 创建/编辑/删除课程正常
- [ ] 复制课程可生成新的草稿课程
- [ ] 打开课程可正确带着上下文跳转到 builder
- [ ] 添加课时与删除课时流程正常

### D3. Data Center
- [ ] KPI 行可渲染，并显示真实已发布浏览量与平均完成率
- [ ] 课程体量趋势图基于 `created_at` / `published_at` 渲染
- [ ] 课程类型分布环图可渲染
- [ ] 收入趋势图以预估语义渲染
- [ ] 学习进度趋势图可渲染月度活跃学习者 + 完成率
- [ ] 已发布课程浏览量排行列表可渲染
- [ ] 导出入口可达

### D4. Fan Management
- [ ] 粉丝 KPI 与趋势可渲染
- [ ] 搜索/筛选/分页可用
- [ ] 互动时间线可渲染
- [ ] 标签相关操作可达
- [ ] 预留批量操作会显示占位反馈

### D5. Dashboard 账号 / 设置集成
- [ ] 账号摘要可从 Supabase 正常加载
- [ ] Workflow 设置可正常本地保存
- [ ] 设置入口会进入统一 Viewer 设置页
- [ ] 退出登录会走共享 Viewer 鉴权流程

## E. Viewer React 核心验证

- [ ] 登录/注册流程正常
- [ ] 课程报名流程正常
- [ ] Home / Library / Community / Profile 使用统一页面宽度壳层
- [ ] Viewer React 桌面布局较平板/移动更宽，且内容仍居中可读
- [ ] 课时页顶部标题显示当前 lesson 名（不是 course 名）
- [ ] text 内容在学习链路中仍正确渲染
- [ ] 个人页 XP/连续学习/成就相关数据可加载
- [ ] logo/入口跳转可回到预期 builder/home
- [ ] `packages/viewer-react/test/` 中的 learner shell 导航测试通过
- [ ] `packages/viewer-react/test/` 中的设置与个人页测试通过

## F. 数据一致性

- [ ] 在 Builder 改 lesson 名并保存，回 `/builder/dashboard` 能看到新名
- [ ] `smoke:cloud` 会在 lesson 改名后发布复用 smoke 课程，进入 Viewer React 验证标题一致，并回作者 Dashboard 验证 `weekly learners` / `published viewers` / 重点课程 analytics
- [ ] 对快照内容不完整的课程，React viewer fallback 仍可打开

## G. 当前非阻断缺口

1. Dashboard 收入数据仍是 fallback 派生值。
2. 部分分析/粉丝操作只有前端入口，后端接口未接入。
3. Cloud smoke 的 analytics 验证仍依赖已配置的真实 Supabase smoke 凭据。
