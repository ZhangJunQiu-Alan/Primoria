# CLAUDE.md

Guidance for Claude Code working in the Primoria repository. Deliver workable, testable, rollbackable changes without breaking existing architecture or data constraints.

## 当前最高优先级：Interactive Visualization Block

`interactive-visual` 是 Primoria 最关键的 Block 类型，是产品差异化的核心。目标对齐 Brilliant 式互动学习：学习者通过 **操作 → 观察 → 反馈 → 推理** 理解概念，而不是看静态图文。

**工作排序原则**：任何能直接推进 `interactive-visual` 生成质量、渲染稳定性、编辑器面板、可观测性或测试覆盖的工作，优先级高于其他改动。在该 Block 达到生产稳定前，不要做与之无关的大规模重构，除非用户明确要求。

相关位置：
- 渲染：`packages/viewer-react/src/shared/interactive-visual/`、`shared/interactive/`
- 生成：`agent-service/` + Supabase 表 `interactive_visual_generation_jobs`
- 迁移：`supabase/migrations/20260505000001_interactive_visual_analytics.sql`、`20260511000001_interactive_visual_generation_jobs.sql`
- 已知问题样本：仓库根 `visualization_error.md`

## 指令澄清原则

任务存在高风险或会影响架构 / 数据 / 用户行为的歧义时，必须先澄清再执行：

- 数据库结构、迁移、权限策略、认证
- 大量删除、重命名、覆盖文件
- 改变核心业务流程、路由结构、课程 JSON schema
- 验收标准或影响范围明显不清楚

低风险歧义可基于现有代码与最小改动原则做假设，并在 plan/assumptions 中写明。

## Project Overview

Primoria 是 AI 原生的「自然语言 → 完整互动课程」平台。课程结构统一为 `Course → Lesson → Page → Block`。

- `packages/schema/` — 课程 JSON schema、fixtures、迁移
- `packages/viewer-react/` — 统一 React app（Learner Viewer + Builder Workspace）
- `agent-service/` — AI 课程生成与 AI Tutor
- `supabase/` — Postgres、迁移、RLS、RPC、Edge Functions
- `external-tests/` — 独立 Python 黑盒 API 测试

### Architecture

```
Builder Workspace --export JSON--> Supabase (lessons.content_json) --fetch--> Learner Viewer
```

- **Builder routes**：`/builder/dashboard`、`/builder/editor`、`/builder/editor/:courseId`
- **Block 类型**（12 种，注册于 `features/editor/blockRegistry.ts`）：
  `text`、`image`、`code-block`、`code-playground`、`code-execution`、`function-flow`、`multiple-choice`、`fill-blank`、`true-false`、`matching`、**`interactive-visual`**、`video`
- **State**：Redux Toolkit + React Query（`shared/state`, `shared/api`）
- **Theme**：Tailwind token 层 + `shared/layout` + `shared/theme/copy.ts`
- **Builder 设计系统**：`features/editor/editor.css`、`pages/dashboard/dashboard.css`

### Database

活跃表：`profiles`、`subjects`、`courses`、`lessons`、`content_blocks`、`enrollments`、`lesson_completions`、`block_interactions`、`user_stats`、`daily_activity_log`、`xp_transactions`、`achievements`、`user_achievements`、`daily_tasks`、`follows`、`course_feedback`、`parent_child_binding_codes`、`parent_child_links`、`app_versions`、`subscriptions`、`interactive_visual_generation_jobs`。

- 课程内容存在 `lessons.content_json`
- `course_versions` 表存在但未在当前流程使用
- `chapters` 表已移除（迁移 `20260223000003`）

## 关键文档（开工前根据任务需求扫瞄相关章节）

| 用途 | 路径 |
| --- | --- |
| 文档入口 | `docs/README-zh.md` |
| 产品基线与范围 | `docs/prd-zh.md` |
| 数据库 schema | `docs/database-schema-zh.md` |
| 课程 JSON 规范 | `docs/course-json-guide-zh.md` |
| Dashboard 设计 | `docs/dashboard-zh.md` |
| 测试 checklist | `docs/test-checklist-zh.md` |
| Cutover runbook | `docs/viewer-react-cutover-runbook.md` |
| Viewer 交互清单 | `docs/viewer-react-interactions.md` |

## Common Commands

```bash
pnpm install

# Viewer + Builder（同一 app）
pnpm --filter @primoria/viewer-react dev
pnpm --filter @primoria/viewer-react build
pnpm --filter @primoria/viewer-react typecheck
pnpm --filter @primoria/viewer-react test

# Schema
pnpm --filter @primoria/schema exec vitest run test/blocks.test.ts test/migrations.test.ts

# Supabase（本地需 Docker）
cd supabase && supabase start
cd supabase && supabase db push
cd supabase && supabase migration new <name>

# Edge Function 本地语法检查
cd supabase/functions/<fn> && deno check index.ts
```

## Quality Gates（强制执行）

完成功能代码后，自动执行下列流程，无需用户提示。范围判定：只改 `schema/` 跑相关 schema tests；改 `viewer-react/` 跑 typecheck + test；只改 `supabase/` 做 deno check + 部署后冒烟。

1. **静态检查**：`pnpm --filter @primoria/viewer-react typecheck` → 0 error；新增 warning 修复；info 可忽略。
2. **测试**：`pnpm --filter @primoria/viewer-react test` → 除已记录的 pre-existing/flaky 外必须全过。
3. **修复循环**：失败 → 修复 → 重跑完整 suite（不允许只跑单个文件绕过其他失败）。3 轮内仍未修复需向用户说明并提供选项。
4. **Edge Function**：修改 `supabase/functions/` 后 `deno check index.ts`；部署后用 `curl` 做关键路径冒烟。

## Task Input Template（可选）

用户可用以下字段提交任务，你需要能识别并执行；缺失字段从代码与 docs 推导并写进 plan/assumptions：

`TASK` / `CONTEXT` / `ACCEPTANCE` / `OUT_OF_SCOPE` / `NOTES`

## Requirements

- Node.js + pnpm
- Supabase CLI + Docker（本地后端）
- Chrome（Web 调试）
