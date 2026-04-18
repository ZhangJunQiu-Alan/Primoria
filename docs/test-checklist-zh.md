# Viewer React 回归与烟测分层清单

最后更新：2026-04-19

## 使用说明

| 验证层 | 推荐命令 | 验证什么 | 不验证什么 | 前提 |
| --- | --- | --- | --- | --- |
| 本地静态检查 | `pnpm --filter @primoria/viewer-react lint` / `typecheck` / `test` | 代码质量、类型、单测与组件回归 | 浏览器端真实部署、真实 Supabase smoke | 本地依赖已安装 |
| fixture 浏览器回归 | `pnpm --filter @primoria/viewer-react e2e:fixture` | `VITE_VIEWER_DEMO_MODE=1` 下的本地 UI 主链路 | 真实鉴权、真实数据写入、真实 analytics | 本地可启动 Playwright 与 Vite |
| preview smoke | `VIEWER_PREVIEW_URL=... pnpm --filter @primoria/viewer-react verify:preview` | 已部署预览环境的 SPA shell、静态资源、缓存与安全响应头 | 真实业务数据、真实账号写入 | 需要已部署的预览 URL |
| cloud smoke | `VIEWER_BASE_URL=... SUPABASE_URL=... SUPABASE_SECRET_KEY=... pnpm --filter @primoria/viewer-react verify:cloud` | 真实 Supabase、真实账号、真实浏览器读写与发布后读回 | 全量回归；这里只做核心 smoke | 需要 smoke 账号和相关 secrets |

- 兼容入口保留：
  - `pnpm --filter @primoria/viewer-react e2e`
  - `pnpm --filter @primoria/viewer-react smoke:preview`
  - `pnpm --filter @primoria/viewer-react smoke:cloud`
- 默认判断原则：
  - 想确认“本地 UI 有没有坏”，优先跑 fixture 浏览器回归。
  - 想确认“预览部署有没有坏”，跑 preview smoke。
  - 想确认“真实后端链路是不是还通”，跑 cloud smoke。

## A. 本地静态检查

- [ ] `pnpm install`
- [ ] `pnpm --filter @primoria/viewer-react lint`
- [ ] `pnpm --filter @primoria/viewer-react typecheck`
- [ ] `pnpm --filter @primoria/viewer-react test`
- [ ] `pnpm --filter @primoria/viewer-react build`
- [ ] `deno test --allow-env supabase/functions/`
- [ ] `pnpm --filter @primoria/schema exec vitest run test/blocks.test.ts test/migrations.test.ts`

这层主要负责：

- 代码规范、类型安全和组件/页面回归
- Viewer + Builder 的本地单测
- Edge Functions 的本地 Deno 测试

这层不负责：

- 真实浏览器部署质量
- 真实 Supabase 鉴权、写入与 analytics

## B. Fixture 浏览器回归

推荐命令：

```bash
pnpm --filter @primoria/viewer-react e2e:fixture
```

这层固定运行在本地 fixture/demo 模式，当前重点覆盖：

- [ ] 落地页、登录页、受保护路由重定向
- [ ] demo learner 从课程库进入课时并完成结果页
- [ ] demo parent 归一到 `/parent`
- [ ] demo learner 从设置中心退出登录
- [ ] demo learner 在 AI Tutor 中走 fixture 对话与工具入口
- [ ] demo learner 在社区中的消息持久化跨刷新仍存在

这层不负责：

- 真实账号登录
- 真实 Supabase 表写入 / RPC / RLS
- 真实 Dashboard analytics 读数
- 真实 Edge Function / agent-service 联机表现

## C. Preview Smoke

推荐命令：

```bash
VIEWER_PREVIEW_URL=https://<preview-url> pnpm --filter @primoria/viewer-react verify:preview
```

这层只验证“部署出来的前端壳层有没有坏”，当前重点覆盖：

- [ ] `/` 能返回 Primoria SPA shell
- [ ] `/login` 能返回正确的 auth route shell
- [ ] 入口 HTML 与登录页引用同一份 bootstrap asset
- [ ] HTML 响应头满足 `cache-control: no-cache`
- [ ] 静态资源响应头满足 `cache-control: immutable`
- [ ] 关键安全响应头（如 `x-content-type-options: nosniff`）存在

这层不负责：

- 真实业务写入
- 真实登录、报名、发布、analytics
- smoke 账号和真实 Supabase 可用性

## D. Cloud Smoke

推荐命令：

```bash
VIEWER_BASE_URL=https://<viewer-url> SUPABASE_URL=... SUPABASE_SECRET_KEY=... pnpm --filter @primoria/viewer-react verify:cloud
```

这层是最接近真实产品链路的浏览器 smoke，当前重点覆盖：

- [ ] 真实学习者登录、首页/课程库/课时主链路
- [ ] 真实家长登录与 `/parent` 报告主链路
- [ ] 真实创作者进入 `/builder/dashboard` 与 `/builder/editor/:courseId`
- [ ] smoke 课程 lesson 改名、保存、发布
- [ ] 发布后从 Viewer 课程库读回 smoke 课程与 lesson 标题
- [ ] AI Tutor 基础回复链路可用
- [ ] 社区笔记/消息至少一条真实持久化路径可用
- [ ] Dashboard 的 `weekly learners` / `published viewers` / 重点课程 analytics 能读到真实结果

这层不负责：

- 覆盖所有页面的全量回归
- 替代本地静态检查和 fixture 回归

## 补充说明

- 如果没有 `VIEWER_PREVIEW_URL`，就不要跑 preview smoke。
- 如果没有真实 Supabase secrets 或 smoke 账号，就不要跑 cloud smoke；CI 应明确输出“跳过原因”，而不是制造假失败。
- 本清单只描述“应该跑哪类验证”；详细发布、恢复和工作流职责见 [viewer-react-cutover-runbook.md](./viewer-react-cutover-runbook.md)。
